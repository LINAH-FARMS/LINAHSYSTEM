import json, urllib.parse, requests, collections, glob, datetime

K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'
H = {'apikey': K, 'Authorization': 'Bearer ' + K}

def cloud(rid):
    u = 'https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?' + urllib.parse.urlencode({'id': 'eq.' + rid, 'select': 'data'})
    j = requests.get(u, headers=H).json()
    d = j[0]['data'] if j else []
    return json.loads(d) if isinstance(d, str) else (d if isinstance(d, list) else [])

ENT = [dict(x, _src='ENT') for x in cloud('ent:bakeryContractorSupplies')]
PLAIN = [dict(x, _src='PLAIN') for x in cloud('bakeryContractorSupplies')]
LOC = []
for p in glob.glob(r'C:\Users\Salem Magdy\Desktop\New folder\*.json'):
    try:
        d = json.load(open(p, encoding='utf-8'))
        v = d.get('bakeryContractorSupplies', [])
        if isinstance(v, list):
            LOC += [dict(x, _src='LOC') for x in v]
    except Exception:
        pass

def dkey(x):
    return '{}|{}|{}|{}'.format(x.get('name', ''), x.get('date', ''), x.get('count', ''), x.get('price', ''))

RAW = ENT + PLAIN + LOC
SEEN = set(); MERGED = []
for x in RAW:
    k = dkey(x)
    if k in SEEN: continue
    SEEN.add(k); MERGED.append(x)

print('merged rows', len(MERGED))
start = datetime.date(2026, 8, 23)
by = collections.defaultdict(list)
for x in MERGED: by[str(x.get('date', ''))].append(x)
for i in range(14):
    day = (start + datetime.timedelta(days=i)).isoformat()
    rows = by.get(day, [])
    grp = collections.defaultdict(list)
    for r in rows: grp[str(r.get('name', ''))].append(r)
    dups = {n: v for n, v in grp.items() if len(v) > 1}
    if dups:
        print('---', day, '---')
        for n, v in dups.items():
            info = ['{} count={} price={} src={}'.format(r['_src'], r.get('count'), r.get('price')) for r in v]
            print('   ', n, '|', len(v), '|', ' || '.join(info))
print('done')