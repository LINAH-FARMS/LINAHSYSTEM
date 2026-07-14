import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)

dr = data.get('dynamicRooms', [])
rc = data.get('roomsCapacity', [])

print(f"=== dynamicRooms type: {type(dr).__name__}, len: {len(dr)} ===")
for r in dr[:20]:
    print(f"  type={type(r).__name__} | {r}")

print(f"\n=== roomsCapacity unique ===")
seen = set()
for r in rc:
    key = (r.get('sector',''), r.get('number',''))
    if key not in seen:
        seen.add(key)
        print(f"  {key}")
