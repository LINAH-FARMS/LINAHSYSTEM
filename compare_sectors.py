import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)

ds = data.get('dynamicSectors', [])
rc = data.get('roomsCapacity', [])
rc_sectors = sorted(set(r['sector'] for r in rc))

print("=== DynamicSectors (الإدارة المرنة) ===")
for s in sorted(ds):
    in_rc = "✅" if s in rc_sectors else "❌"
    print(f"  {in_rc} {s}")

print(f"\n=== roomsCapacity (السكن) ===")
for s in rc_sectors:
    in_ds = "✅" if s in ds else "❌"
    print(f"  {in_ds} {s}")
