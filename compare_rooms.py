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

print("=== dynamicRooms (الإدارة المرنة) ===")
for r in sorted(dr, key=lambda x: (x.get('sector',''), x.get('number',''))):
    print(f"  sector='{r.get('sector','')}' | room='{r.get('number','')}'")

print(f"\nrooms: {len(dr)}")

print("\n=== roomsCapacity (السكن) — unique sector+room ===")
seen = set()
for r in sorted(rc, key=lambda x: (x.get('sector',''), x.get('number',''))):
    key = (r.get('sector',''), r.get('number',''))
    if key not in seen:
        seen.add(key)
        print(f"  sector='{r.get('sector','')}' | room='{r.get('number','')}'")

print(f"\nrooms: {len(seen)}")

# Find differences
rc_set = set((r['sector'], r['number']) for r in rc)
dr_set = set((r['sector'], r['number']) for r in dr)

in_rc_not_dr = rc_set - dr_set
in_dr_not_rc = dr_set - rc_set

print(f"\n=== In roomsCapacity but NOT in dynamicRooms: {len(in_rc_not_dr)} ===")
for s, r in sorted(in_rc_not_dr):
    print(f"  sector='{s}' | room='{r}'")

print(f"\n=== In dynamicRooms but NOT in roomsCapacity: {len(in_dr_not_rc)} ===")
for s, r in sorted(in_dr_not_rc):
    print(f"  sector='{s}' | room='{r}'")
