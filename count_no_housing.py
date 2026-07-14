import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)
emps = data['employees']
rc = data['roomsCapacity']

rc_rooms = {}
for r in rc:
    if r['sector'] not in rc_rooms: rc_rooms[r['sector']] = set()
    rc_rooms[r['sector']].add(r['number'])

no_housing = []
for e in emps:
    s = e.get('sector', '')
    r = e.get('room', '')
    if not s or not r:
        no_housing.append(e)
    elif s not in rc_rooms or r not in rc_rooms[s]:
        no_housing.append(e)

print(f"Total employees: {len(emps)}")
print(f"Without housing: {len(no_housing)}")
print()
for e in no_housing:
    print(f"  {e.get('code',''):>6} | {e.get('name','')[:35]:<35} | sector='{e.get('sector','')}' | room='{e.get('room','')}' | status={e.get('status','')}")
