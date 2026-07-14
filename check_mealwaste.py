import json, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)

mw = data.get('mealWaste', [])
print(f"mealWaste type: {type(mw).__name__}, count: {len(mw)}")
if isinstance(mw, list):
    for i, entry in enumerate(mw[:5]):
        print(f"\nEntry {i}:")
        if isinstance(entry, dict):
            for k, v in entry.items():
                print(f"  {k}: {v}")
        else:
            print(f"  value: {entry}")

# Also check mealLogs
ml = data.get('mealLogs', [])
print(f"\nmealLogs type: {type(ml).__name__}, count: {len(ml)}")
if isinstance(ml, list) and len(ml) > 0:
    for i, entry in enumerate(ml[:3]):
        print(f"\nmealLog {i}:")
        if isinstance(entry, dict):
            for k, v in entry.items():
                print(f"  {k}: {v}")
