import requests, json, random, sys
from collections import Counter
from datetime import datetime, timedelta
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

ARABIC_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

def norm_date(s):
    if not s or not isinstance(s, str): return s or ''
    s = s.replace('\u200f', '').replace('\u200e', '').strip()
    s = s.translate(ARABIC_DIGITS)
    s = s[:10]
    parts = s.split('/')
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 4:
            try:
                return f'{y}-{int(m):02d}-{int(d):02d}'
            except Exception:
                return s
    try:
        return datetime.strptime(s[:10], '%Y-%m-%d').strftime('%Y-%m-%d')
    except Exception:
        pass
    return s[:10]

def fetchtable(idval):
    url = SUPABASE_URL + '/rest/v1/sync_data?' + urllib.parse.urlencode({'select': 'id,data,updated_at', 'id': 'eq.' + idval})
    r = requests.get(url, headers={'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY})
    if r.status_code != 200:
        print('GET', idval, 'HTTP', r.status_code, r.text[:120])
        return None
    rows = r.json()
    if not rows: return None
    data = rows[0].get('data')
    if isinstance(data, str):
        try: data = json.loads(data)
        except Exception: data = None
    return data

def merge_by_key(arrays):
    bykey = {}
    for arr in arrays:
        if not isinstance(arr, list): continue
        for it in arr:
            if not isinstance(it, dict): continue
            key = '|'.join(str(it.get('date','')) or '' for _ in [0]) + '|' + str(it.get('name', it.get('sector',''))) + '|' + str(it.get('trips', it.get('quantity','')))
            it = dict(it)
            it['_k'] = key
            if key in bykey:
                a = bykey[key]; b = it
                ta = a.get('modifiedAt','') or a.get('createdAt','') or ''
                tb = b.get('modifiedAt','') or b.get('createdAt','') or ''
                bykey[key] = b if tb >= ta else a
            else:
                bykey[key] = it
    out = []
    for _, it in bykey.items():
        it = {k: v for k, v in it.items() if k != '_k'}
        out.append(it)
    return out

def main(apply):
    ents = fetchtable('ent:septicRecords')
    plains = fetchtable('septicRecords')
    print('ent  count:', len(ents) if isinstance(ents, list) else ents)
    print('plain count:', len(plains) if isinstance(plains, list) else plains)

    merged = merge_by_key([ents, plains])
    # تسوية كل التواريخ إلى ISO ثم دمج مجدداً بالمفتاح الطبيعي (date|name|trips)
    byk = {}
    for it in merged:
        it = dict(it)
        nd = norm_date(it.get('date',''))
        if not nd: continue
        it['date'] = nd
        key = nd + '|' + str(it.get('name', it.get('sector',''))) + '|' + str(it.get('trips',''))
        if key in byk:
            ta = byk[key].get('modifiedAt','') or byk[key].get('createdAt','') or ''
            tb = it.get('modifiedAt','') or it.get('createdAt','') or ''
            if tb >= ta: byk[key] = it
        else:
            byk[key] = it
    merged = list(byk.values())
    merged.sort(key=lambda x: (x.get('date',''), str(x.get('name',''))))
    print('merged total (normalized):', len(merged))

    start = datetime(2026, 8, 20)
    end = datetime(2026, 9, 4)
    day = start
    cov = {}
    formats = Counter()
    while day <= end:
        ds = day.strftime('%Y-%m-%d')
        c = 0
        for it in merged:
            if norm_date(it.get('date','')) == ds: c += 1
        cov[ds] = c
        day += timedelta(days=1)
    for it in merged[:500]:
        d = str(it.get('date',''))
        formats[d[:4] + ('|' + d[4:6] if len(d) > 4 else '')] += 1
    print('--- coverage ---')
    for ds, c in cov.items():
        print(ds, ':', c)

    print('--- raw date prefix distribution (sample) ---')
    for f_, c in formats.most_common(10):
        print(repr(f_), c)

    missing = [ds for ds, c in cov.items() if c == 0]
    print('missing days needing pattern-fill:', missing)

    new_est = []
    now_iso = '2026-09-05T12:00:00.000Z'
    for ds in missing:
        y, m, d = int(ds[:4]), int(ds[5:7]), int(ds[8:10])
        target = datetime(y, m, d)
        m1 = datetime(y, m, 1)
        m0 = (m1 - timedelta(days=1)).replace(day=1)
        pat = []
        for it in merged:
            nd = norm_date(it.get('date',''))
            if not nd: continue
            try: pd = datetime.strptime(nd, '%Y-%m-%d')
            except Exception: continue
            if m0 <= pd < m1:
                pat.append((pd, it.get('name', it.get('sector','')), int(it.get('trips',0) or 0), float(it.get('quantity',0) or 0)))
        if not pat: continue
        active_days = Counter(_pd.date() for _pd, _nm, _tp, _qt in pat)
        avg_per_day = int(round(sum(active_days.values()) / len(active_days))) if active_days else 1
        cnt = Counter(); tr_all = Counter(); qt_all = Counter()
        for _pd, _nm, _tp, _qt in pat:
            cnt[_nm] += 1; tr_all[_nm] += _tp; qt_all[_nm] += _qt
        typical = {}
        for _nm in cnt:
            ta = round(tr_all[_nm] / cnt[_nm])
            ratio = (qt_all[_nm] / tr_all[_nm]) if tr_all[_nm] else 5.0
            if ratio == 0: ratio = 5.0
            typical[_nm] = (max(1, ta), round(ratio, 2))
        if not typical: continue
        rng = random.Random('st-' + ds + '-' + '2026-09-05')
        k = max(1, min(avg_per_day + rng.choice([-1, 0, 1]), len(typical)))
        names = rng.sample(list(typical.keys()), k)
        for _nm in names:
            _ta, _rt = typical[_nm]
            _tp = max(1, _ta + rng.choice([-1, 0, 0, 1]))
            _qt = round(_tp * _rt, 1)
            _nm = ' '.join(str(_nm).split())
            new_est.append({'date': ds, 'name': _nm, 'trips': _tp, 'quantity': _qt,
                            'supervisor': '—', 'notes': 'تقديري', 'isEstimate': True,
                            'createdAt': now_iso, 'modifiedAt': now_iso})

    report = []
    report.append('merged total (normalized): %d' % len(merged))
    report.append('--- coverage ---')
    for ds, c in cov.items():
        report.append('%s : %d' % (ds, c))
    report.append('missing days needing pattern-fill: %s' % missing)
    report.append('generated estimates: %d' % len(new_est))
    for e in new_est:
        report.append('  %s | %s | trips %d | qty %s' % (e['date'], e['name'], e['trips'], e['quantity']))

    final = merge_by_key([merged, new_est])
    final.sort(key=lambda x: (norm_date(x.get('date','')), str(x.get('name',''))))

    dry = {
        'kind': 'septic-feed',
        'generated_at': '2026-09-05T12:00:00',
        'total': len(final),
        'estimates_added': len(new_est),
        'records': final,
    }
    outpath = r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports\septic_feed_dryrun.json'
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(dry, f, ensure_ascii=False, indent=1)
    print('dry-run saved:', outpath)

    # آخر تواريخ بعد التغذية
    final_days = sorted({norm_date(x.get('date','')) for x in final if norm_date(x.get('date',''))})
    report.append('last days after feed: %s' % final_days[-12:])
    report.append('final total: %d' % len(final))
    report.append('estimates in final: %d' % sum(1 for x in final if x.get('isEstimate')))

    rptpath = r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports\septic_feed_report.txt'
    with open(rptpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    print('report saved:', rptpath)

    if apply:
        body = {'p_entity': 'septicRecords', 'p_data': final}
        hh = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Content-Type': 'application/json'}
        r = requests.post(SUPABASE_URL + '/rest/v1/rpc/sync_upsert_entity', headers=hh, json=body)
        report.append('RPC push HTTP %d %s' % (r.status_code, r.text[:120]))
        print('RPC push HTTP', r.status_code, r.text[:120])
        if r.status_code not in (200, 201, 204):
            url = SUPABASE_URL + '/rest/v1/sync_data?' + urllib.parse.urlencode({'id': 'eq.ent:septicRecords'})
            r2 = requests.patch(url, headers=hh, json={'data': final, 'updated_at': now_iso})
            report.append('PATCH fallback HTTP %d %s' % (r2.status_code, r2.text[:120]))
            print('PATCH fallback HTTP', r2.status_code, r2.text[:120])
        with open(rptpath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    main(apply)