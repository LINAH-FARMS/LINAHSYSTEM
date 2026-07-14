import sys, json, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'
req = urllib.request.Request(SUPABASE_URL + '/rest/v1/sync_data?id=eq.alldata&select=data')
req.add_header('apikey', SUPABASE_KEY)
req.add_header('Authorization', 'Bearer ' + SUPABASE_KEY)
with urllib.request.urlopen(req, timeout=30) as resp:
    rows = json.loads(resp.read())
d = rows[0]['data']
if isinstance(d, str): d = json.loads(d)

ws = d.get('waterStations', [])
print('Water stations:')
for w in ws:
    print(f'  - {w.get("station")} | {w.get("type")} | {w.get("date")}')
print(f'Total: {len(ws)}')

wd = d.get('waterDocs', [])
print(f'Water docs: {len(wd)}')
if wd:
    for doc in wd:
        print(f'  - {doc.get("station")} | {doc.get("fileName")}')
