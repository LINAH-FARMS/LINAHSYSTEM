import json, sys, urllib.request, openpyxl, datetime
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def get_supabase():
    req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
        headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.loads(r.read())
    data = result[0]['data']
    if isinstance(data, str): data = json.loads(data)
    return data

def save_supabase(data):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{datetime.datetime.now(datetime.timezone.utc).microsecond // 1000:03d}+00:00'
    payload = json.dumps({'data': data, 'updated_at': ts})
    req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata',
        data=payload.encode('utf-8'),
        headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='PATCH')
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status

data = get_supabase()
emps = data['employees']
rc = data['roomsCapacity']
ds = data.get('dynamicSectors', [])

# Read the corrected report
wb = openpyxl.load_workbook(r'C:\Users\Salem Magdy\Desktop\تقرير_السكن.xlsx')

# Parse بدون سكن sheet
ws2 = wb['موظفين بدون سكن']
unhoused = []
for r in range(2, ws2.max_row + 1):
    name = str(ws2.cell(r, 1).value or '').strip()
    code = str(ws2.cell(r, 2).value or '').strip()
    status = str(ws2.cell(r, 3).value or '').strip()
    sector = str(ws2.cell(r, 4).value or '').strip()
    room = str(ws2.cell(r, 5).value or '').strip()
    if name and code:
        unhoused.append({'name': name, 'code': code, 'sector': sector, 'room': room})

# Read السكن حسب القطاعات for the full corrected data
ws1 = wb['السكن حسب القطاعات']
all_assignments = []
current_sector = ''
for r in range(2, ws1.max_row + 1):
    name = str(ws1.cell(r, 1).value or '').strip()
    code = str(ws1.cell(r, 2).value or '').strip()
    status = str(ws1.cell(r, 3).value or '').strip()
    sector_cell = str(ws1.cell(r, 4).value or '').strip()
    room = str(ws1.cell(r, 5).value or '').strip()
    beds = str(ws1.cell(r, 6).value or '').strip()
    if sector_cell:
        current_sector = sector_cell
    if name and code:
        all_assignments.append({'name': name, 'code': code, 'status': status, 'sector': current_sector, 'room': room, 'beds': beds})

print(f"Read {len(unhoused)} from بدون سكن")
print(f"Read {len(all_assignments)} from السكن حسب القطاعات")

# ===== STEP 1: Fix employee sector/room from the report =====
fixes = []
# From بدون سكن sheet, fix employees that have sector/room assigned
for u in unhoused:
    if not u['sector'] or not u['room']:
        continue  # skip ones without sector/room (the 3 employees)
    emp = next((e for e in emps if str(e.get('code','')) == u['code']), None)
    if emp:
        old_s = emp.get('sector','')
        old_r = emp.get('room','')
        if old_s != u['sector'] or old_r != u['room']:
            fix = f"  {u['code']:>6} | {u['name'][:30]:<30} | '{old_s}'/'{old_r}' -> '{u['sector']}'/'{u['room']}'"
            emp['sector'] = u['sector']
            emp['room'] = u['room']
            fixes.append(fix)

# Also check employees from السكن حسب القطاعات that might differ
for a in all_assignments:
    emp = next((e for e in emps if str(e.get('code','')) == a['code']), None)
    if emp:
        old_s = emp.get('sector','')
        old_r = emp.get('room','')
        if old_s != a['sector'] or old_r != a['room']:
            if a['sector']:
                fix = f"  {a['code']:>6} | {a['name'][:30]:<30} | '{old_s}'/'{old_r}' -> '{a['sector']}'/'{a['room']}'"
                emp['sector'] = a['sector']
                emp['room'] = a['room']
                fixes.append(fix)

print(f"\n=== Employee fixes: {len(fixes)} ===")
for f in fixes: print(f)

# ===== STEP 2: Add missing rooms to roomsCapacity =====
# Get current valid rooms
valid_rc = {}
for r in rc:
    key = (r['sector'], r['number'])
    valid_rc[key] = r

# For each employee, check if their room exists in roomsCapacity
rooms_to_add = []
for e in emps:
    s = e.get('sector','')
    r = e.get('room','')
    if s and r:
        key = (s, r)
        if key not in valid_rc:
            # Check if this sector exists in roomsCapacity at all
            sector_rooms = [x for x in rc if x['sector'] == s]
            # Count employees in this room for bed capacity
            emp_count = sum(1 for x in emps if x.get('sector') == s and x.get('room') == r and x.get('status') in ('P','V'))
            rooms_to_add.append({'sector': s, 'number': r, 'beds': max(emp_count, 1)})

# Deduplicate rooms_to_add
seen_rooms = set()
unique_rooms = []
for rt in rooms_to_add:
    key = (rt['sector'], rt['number'])
    if key not in seen_rooms:
        seen_rooms.add(key)
        unique_rooms.append(rt)

print(f"\n=== Rooms to add: {len(unique_rooms)} ===")
for rt in unique_rooms:
    print(f"  sector='{rt['sector']}' | room='{rt['number']}' | beds={rt['beds']}")
    rc.append({'sector': rt['sector'], 'number': rt['number'], 'beds': rt['beds']})

# ===== STEP 3: Add missing sectors to dynamicSectors =====
sectors_needed = set()
for rt in unique_rooms:
    if rt['sector'] not in ds:
        sectors_needed.add(rt['sector'])

print(f"\n=== Sectors to add to dynamicSectors: {len(sectors_needed)} ===")
for s in sorted(sectors_needed):
    if s not in ds:
        ds.append(s)
        print(f"  + '{s}'")

data['employees'] = emps
data['roomsCapacity'] = rc
data['dynamicSectors'] = ds

status = save_supabase(data)
print(f"\n=== Saved: {status} ===")
