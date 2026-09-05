import requests, json, sys
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'
OLD_SUPABASE_URL = 'https://idejmgmftmrniviftcce.supabase.co'
OLD_SUPABASE_KEY = 'sb_publishable_AvMTa-zmQ4hgA1hJNpYc3g_gu8rlirz'

def get_row(rid, url=SUPABASE_URL, key=SUPABASE_KEY):
    try:
        r = requests.get(f'{url}/rest/v1/sync_data', params={'id': 'eq.' + rid}, headers={'apikey': key, 'Authorization': f'Bearer {key}'}, timeout=20)
        j = r.json()
        if isinstance(j, list) and len(j) > 0:
            raw = j[0].get('data')
            return j[0].get('id'), json.loads(raw) if isinstance(raw, str) else raw
        return None, None
    except Exception as e:
        return None, None

def norm_date(s):
    if not s or not isinstance(s, str): return s or ''
    return s.strip()[:10]

CUTOFF = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
print(f'[الفترة المرجعية للنشاط] آخر 30 يوم من {CUTOFF}')

rows = {}
for rid in ('ent:bakeryContractorSupplies', 'bakeryContractorSupplies'):
    i, v = get_row(rid)
    rows[rid] = (i, v)
    print(f'  {rid}: row={i} records={len(v) if isinstance(v, list) else 0}')

# check unified alldata too
i, v = get_row('alldata')
if v is not None:
    keys = v.keys() if isinstance(v, dict) else []
    print(f'  alldata: row={i} contains entities={list(keys) if isinstance(v, dict) else "not dict"}')

# merged safe view (both rows de-duped) for activity measurement
merged = {}
for (i, v) in rows.values():
    if isinstance(v, list):
        for x in v:
            if not isinstance(x, dict): continue
            k = f"{x.get('name','')}|{x.get('date','')}|{x.get('count','')}|{x.get('price','')}"
            merged[k] = x

all_recs = list(merged.values())
active = set()
for x in all_recs:
    d = norm_date(str(x.get('date', '')))
    if d and d >= CUTOFF and x.get('name'):
        active.add(x.get('name'))

by_name = {}
for x in all_recs:
    by_name.setdefault(x.get('name',''), []).append(x)

print(f'\n[الإجمالي] مقاولون فريدون = {len(by_name)} | نشطون (ظهر خلال آخر 30 يوم) = {len(active)}')

inactive = {n: recs for n, recs in by_name.items() if n and n not in active}
print(f'[سيتم مسحهم] مقاولون غير نشطين = {len(inactive)}')

removed_by_row = {}
drop_keys_merged = set()
for n, recs in sorted(inactive.items(), key=lambda kv: -len(kv[1])):
    dates = sorted(r.get('date','') for r in recs)
    total = sum(int(r.get('count',0) or 0) for r in recs)
    print(f'  - {n}  |  سجلات={len(recs)}  |  رغيف={total:,}  |  {dates[0][:10]} → {dates[-1][:10]}')
    for r in recs:
        drop_keys_merged.add(r.get('name','') + '|' + norm_date(str(r.get('date',''))) + '|' + str(r.get('count','')))
    # count how many from each actual row in the new cloud
    for rid, (i, v) in rows.items():
        if isinstance(v, list):
            for r in v:
                if isinstance(r, dict) and r.get('name') == n:
                    removed_by_row[rid] = removed_by_row.get(rid, 0) + 1

print('\n[التوزيع على صفوف السحابة الجديدة]')
for rid, c in removed_by_row.items():
    row_has = len(rows[rid][1]) if isinstance(rows[rid][1], list) else 0
    print(f'  {rid}: سيُحذف {c} من أصل {row_has}')

out = {
    'cutoff': CUTOFF,
    'total_unique_contractors': len(by_name),
    'active': sorted(active),
    'inactive_count': len(inactive),
    'inactive': sorted(inactive.keys()),
    'merged_drop_keys_count': len(drop_keys_merged),
    'per_row_removal': removed_by_row,
    'generated_at': datetime.now().isoformat(),
}
with open(r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports\inactive_contractors_dryrun.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f'\n[تم] الحفظ في reports/inactive_contractors_dryrun.json')