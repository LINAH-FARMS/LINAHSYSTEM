import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')
SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
raw = r.json()[0]['data']
data = json.loads(raw) if isinstance(raw, str) else raw

# Check all dynamic arrays for corruption
check_keys = ['dynamicVisitorTypes', 'dynamicDepts', 'dynamicTitles', 'dynamicSectors', 'dynamicSeptics', 'dynamicRooms', 'contractorSectors', 'bakeryContractorsNames']
for k in check_keys:
    v = data.get(k, [])
    if isinstance(v, list):
        bad = [x for x in v if isinstance(x, dict) or (isinstance(x, str) and ('[object' in x or 'Object' in x))]
        if bad:
            print(f'{k}: CORRUPTED - {len(bad)} bad entries out of {len(v)}')
            print(f'  Sample: {bad[:3]}')
        else:
            print(f'{k}: OK ({len(v)} entries)')
            if len(v) <= 10 and k == 'dynamicVisitorTypes':
                print(f'  Values: {v}')
    else:
        print(f'{k}: NOT A LIST - type={type(v).__name__} val={str(v)[:100]}')

# Fix corrupted arrays
defaults = {
    'dynamicVisitorTypes': ["مورد", "مفتش", "ضيف", "مقاول", "موظف حكومي", "ممثل جهة خارجية"],
}

changed = False
for k, default_val in defaults.items():
    v = data.get(k, [])
    if isinstance(v, list):
        bad = [x for x in v if isinstance(x, dict) or (isinstance(x, str) and ('[object' in x or 'Object' in x))]
        if bad:
            print(f'\nFixing {k}...')
            data[k] = default_val
            changed = True

if changed:
    r2 = requests.put(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata', 
        json={'data': json.dumps(data, ensure_ascii=False)}, 
        headers={
            'apikey': SUPABASE_KEY, 
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        })
    print(f'Update status: {r2.status_code} {r2.text[:200] if r2.text else "OK"}')
else:
    print('\nNo corrupt arrays found')
