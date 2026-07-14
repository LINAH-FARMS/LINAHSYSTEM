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

# Check specific employees with their new sector/room
checks = [
    (124, 'سكن العاملين الجديد 2025 (F)', 'غرفه F3'),
    (1648, 'سكن العاملين (سكن الجيزوارين)', 'غرفه 1'),
    (1046, 'سكن العاملين (سكن النخالين)', 'غرفه نخاليين 1'),
    (2499, 'سكن القطاعات', 'قطاع رقم ( 17 )'),
    (1983, 'سكن القطاعات', 'قطاع رقم ( 21 )'),
]
for code, exp_sector, exp_room in checks:
    emp = next((e for e in emps if str(e.get('code','')) == str(code)), None)
    if emp:
        ok = emp.get('sector') == exp_sector and emp.get('room') == exp_room
        print(f"{'✅' if ok else '❌'} code={code}: sector={emp.get('sector')} | room={emp.get('room')}")
    else:
        print(f"❌ code={code}: not found")

# Check roomsCapacity has entries for these sectors
print("\n--- roomsCapacity for new sectors ---")
sectors_to_check = ['سكن العاملين الجديد 2025 (F)', 'سكن العاملين (سكن الجيزوارين)', 'سكن العاملين (سكن النخالين)', 'سكن القطاعات']
for s in sectors_to_check:
    rooms = [r for r in rc if r.get('sector') == s]
    print(f"  {s}: {len(rooms)} rooms: {[r.get('number') for r in rooms[:5]]}{'...' if len(rooms)>5 else ''}")

# Check supabase connection count
print(f"\nTotal Supabase rows: ", end='')
req2 = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?select=id',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req2, timeout=15) as r2:
    rows = json.loads(r2.read())
    print(len(rows))
