import json, sys, urllib.request, datetime
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)

rc = data['roomsCapacity']
new_ds = sorted(set(r['sector'] for r in rc))

print("=== OLD dynamicSectors ===")
for s in sorted(data.get('dynamicSectors', [])):
    print(f"  {s}")

print(f"\n=== NEW dynamicSectors (from roomsCapacity) ===")
for s in new_ds:
    print(f"  {s}")

data['dynamicSectors'] = new_ds

ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{datetime.datetime.now(datetime.timezone.utc).microsecond // 1000:03d}+00:00'
req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata',
    data=json.dumps({'data': data, 'updated_at': ts}).encode('utf-8'),
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
    method='PATCH')
with urllib.request.urlopen(req, timeout=15) as r:
    print(f"\nSaved: {r.status}")
