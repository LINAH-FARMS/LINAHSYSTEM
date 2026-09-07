import requests, json, sys, re
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://cwqghiqykohefaggedjl.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def get(rid):
    x = requests.get(URL + '/rest/v1/sync_data', params={'id': 'eq.' + rid}, headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY}, timeout=20).json()[0]['data']
    return json.loads(x) if isinstance(x, str) else x

def norm_name(n):
    if not isinstance(n, str): return ''
    n = n.replace('\u200f', '').replace('\u200e', '').strip()
    return re.sub(r'\s+', ' ', n)

def norm_date(s):
    if not isinstance(s, str): return ''
    return s.replace('\u200f', '').replace('\u200e', '').strip()[:10]

ent = get('ent:bakeryContractorSupplies')
plain = get('bakeryContractorSupplies')
print('ent:', len(ent), ' plain:', len(plain))

for rid, arr in (('ent:bakeryContractorSupplies', ent), ('bakeryContractorSupplies', plain)):
    groups = defaultdict(list)
    for x in arr:
        if not isinstance(x, dict): continue
        groups[(norm_name(x.get('name', '')), norm_date(x.get('date', '')))].append(x)
    dups = {k: v for k, v in groups.items() if len(v) > 1 and k[0]}
    print(f'\n=== {rid}: مجموعات مكررة (اسم,تاريخ) بـ اكتر من سجل = {len(dups)} ===')
    tot_extra = sum(len(v) - 1 for v in dups.values())
    print('عدد السجلات الزائدة الممكن دمجها:', tot_extra)
    for k in sorted(dups):
        v = dups[k]
        desc = []
        for x in v:
            ing = x.get('ingredients') or {}
            ing_keys = list(ing.keys())[:6]
            desc.append(f"count={x.get('count')} price={x.get('price')} paid={x.get('paid')} resp={x.get('responsible')!r} ing={ing_keys} id={x.get('id')}")
        print(f'  {k[0]} | {k[1]} x{len(v)}:')
        for d in desc: print('     -', d)