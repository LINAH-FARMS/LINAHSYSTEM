import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)
rc = data['roomsCapacity']

# Show ALL sectors and their rooms
sectors = {}
for r in rc:
    s = r.get('sector','')
    if s not in sectors: sectors[s] = []
    sectors[s].append(r.get('number',''))

# Check for anything related to جيزوارين or جزوار or جيزو
keywords = ['جيز', 'جزو', 'جزا', 'جيزو']
for s in sorted(sectors.keys()):
    for kw in keywords:
        if kw in s:
            print(f"  MATCH kw='{kw}': sector='{s}' -> rooms: {sectors[s]}")
            break

# Show all sectors with their room counts
print("\n--- All sectors in roomsCapacity ---")
for s in sorted(sectors.keys()):
    print(f"  {s}: {len(sectors[s])} rooms -> {sectors[s]}")
