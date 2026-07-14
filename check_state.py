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
ds = data.get('dynamicSectors', [])

# Check current state of employees from بدون سكن
codes_to_check = [29, 41, 78, 138, 181, 208, 210, 438, 607, 880, 1133, 1127, 1250, 1453, 1629, 1969, 1976, 2428, 2478, 2499, 2643, 2743, 2932, 2957, 3078, 3080, 3100, 40103, 1976]
print("=== Employee current state in Supabase ===")
for c in codes_to_check:
    e = next((x for x in emps if str(x.get('code','')) == str(c)), None)
    if e:
        s = e.get('sector','') or '(empty)'
        r = e.get('room','') or '(empty)'
        st = e.get('status','')
        nm = e.get('name','')
        print(f"  {c:>6} | {nm[:30]:<30} | {st} | sector='{s}' | room='{r}'")
    else:
        print(f"  {c:>6} | NOT FOUND")

# Check sectors in roomsCapacity
print("\n=== RoomsCapacity sectors ===")
for s in sorted(set(r['sector'] for r in rc)):
    rooms = [r for r in rc if r['sector'] == s]
    print(f"  {s}: {len(rooms)} rooms")

# Check dynamicSectors
print(f"\n=== DynamicSectors ({len(ds)}) ===")
print(f"  {ds}")
