import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

# Fetch all rows
req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?select=id,data&limit=50',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    rows = json.loads(r.read())

for row in rows:
    rid = row['id']
    d = row['data']
    if isinstance(d, str): d = json.loads(d)
    if isinstance(d, dict):
        keys = list(d.keys())
        print(f"id={rid}: keys={keys[:10]}{'...' if len(keys)>10 else ''}")
    else:
        print(f"id={rid}: type={type(d).__name__}")
