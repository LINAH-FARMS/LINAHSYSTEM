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

total_beds = sum(int(r.get('beds', 0)) for r in rc)

# Count by status in valid rooms
p_count = 0
v_count = 0
no_room = 0
for e in emps:
    s = e.get('sector', '')
    r = e.get('room', '')
    st = e.get('status', '')
    if s and r and s in rc_rooms and r in rc_rooms[s]:
        if st == 'P':
            p_count += 1
        elif st == 'V':
            v_count += 1
    else:
        no_room += 1

print(f"Total beds: {total_beds}")
print(f"Employees with status P in valid rooms: {p_count}")
print(f"Employees with status V in valid rooms: {v_count}")
print(f"Employees without valid room: {no_room}")
print(f"Vacant beds: {total_beds - p_count}")
print(f"")
print(f"EXPLANATION:")
print(f"  Program counts P+V with any room (line 6692), NOT just P in valid rooms.")
print(f"  P+V with any room = {p_count + v_count}, vacant = {total_beds - p_count - v_count}")
