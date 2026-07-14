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

# Check fixed employees
codes = [41, 78, 208, 1629, 2643]
print("=== Fixed employees ===")
for c in codes:
    e = next((x for x in emps if str(x.get('code','')) == str(c)), None)
    if e:
        print(f"  {c}: sector='{e.get('sector')}' room='{e.get('room')}'")

# Check new sectors in roomsCapacity
print("\n=== New roomsCapacity entries ===")
for r in rc:
    if r['sector'] in ('فندق خارجى', 'البوابه'):
        print(f"  sector='{r['sector']}' room='{r['number']}' beds={r['beds']}")

# Check new قطاعات
new_q = ['قطاع رقم ( 17 )', 'قطاع رقم ( 24 )', 'قطاع رقم ( 25 )', 'قطاع رقم ( 27 )', 'قطاع رقم ( 29 )', 'قطاع رقم ( 30 )', 'قطاع رقم ( 33 )']
print("\n=== القطاعات الجديدة ===")
for r in rc:
    if r['sector'] == 'سكن القطاعات' and r['number'] in new_q:
        print(f"  room='{r['number']}' beds={r['beds']}")

# Check dynamicSectors
print(f"\n=== DynamicSectors has فندق خارجى: {'فندق خارجى' in ds} ===")
print(f"=== DynamicSectors has البوابه: {'البوابه' in ds} ===")

# Summary
total_beds = sum(int(r.get('beds',0)) for r in rc)
housed = sum(1 for e in emps if e.get('sector') in set(x['sector'] for x in rc) and e.get('room') in set(x['number'] for x in rc if x['sector'] == e.get('sector','')))
print(f"\nTotal beds: {total_beds}")
print(f"Housed employees: {housed}")
print(f"Total employees: {len(emps)}")
