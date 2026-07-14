import json, sys, urllib.request, datetime
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def get_supabase():
    req = urllib.request.Request(
        'https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
        headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.loads(r.read())
    data = result[0]['data']
    if isinstance(data, str): data = json.loads(data)
    return data

def save_supabase(data):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{datetime.datetime.now(datetime.timezone.utc).microsecond // 1000:03d}+00:00'
    payload = json.dumps({'data': data, 'updated_at': ts})
    req = urllib.request.Request(
        'https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata',
        data=payload.encode('utf-8'),
        headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        method='PATCH')
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status

data = get_supabase()
rc = data['roomsCapacity']
emps = data['employees']

old_name = 'الجزورين'
new_name = 'سكن العاملين (سكن الجيزوارين)'

# Fix roomsCapacity: rename sector
fixed_rc = 0
for r in rc:
    if r.get('sector') == old_name:
        r['sector'] = new_name
        # Normalize غرفة -> غرفه
        if 'غرفة' in r.get('number', ''):
            r['number'] = r['number'].replace('غرفة', 'غرفه')
            fixed_rc += 1
        fixed_rc += 1
print(f"Fixed roomsCapacity: {fixed_rc} changes")

# Fix employees: rename sector from old_name to new_name (if any remain)
fixed_emps = 0
for e in emps:
    if e.get('sector') == old_name:
        e['sector'] = new_name
        fixed_emps += 1
print(f"Fixed employees (old->new sector): {fixed_emps}")

# Also normalize room names (غرفة -> غرفه) for all rooms in roomsCapacity
fixed_normalize = 0
for r in rc:
    if 'غرفة' in r.get('number', ''):
        r['number'] = r['number'].replace('غرفة', 'غرفه')
        fixed_normalize += 1
print(f"Normalized غرفة -> غرفه in roomsCapacity: {fixed_normalize}")

data['roomsCapacity'] = rc
data['employees'] = emps

# Check how many employees now have the new sector
count_new = len([e for e in emps if e.get('sector') == new_name])
print(f"Employees with '{new_name}': {count_new}")

status = save_supabase(data)
print(f"Saved to Supabase: {status}")
