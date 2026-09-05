import json, sys, requests
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

b = json.load(open(r'reports/cloud_backup_before_inactive_cleanup.json', encoding='utf-8'))
orig = b['ent:syncDeletions']
seen = set()
for x in orig:
    seen.add(x.get('entity', '') + '|' + x.get('key', ''))
print('original rows:', len(orig), ' unique (entity|key):', len(seen))
c = Counter(x.get('entity') for x in orig)
print('entities in orig deletions:', dict(list(c.items())[:60]))

r = requests.get(SUPABASE_URL + '/rest/v1/sync_data', params={'id': 'eq.ent:syncDeletions'},
                 headers={'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}, timeout=20)
cur_raw = r.json()[0]['data']
cur = json.loads(cur_raw) if isinstance(cur_raw, str) else cur_raw
c2 = Counter(x.get('entity') for x in cur)
curkeys = set()
for x in cur:
    curkeys.add(x.get('entity', '') + '|' + x.get('key', ''))
print('current rows:', len(cur), ' unique:', len(curkeys))
print('entities in current:', dict(list(c2.items())[:60]))

missing = [k for k in seen if k not in curkeys]
print('من الفريدات الأصلية غير موجودة حاليا:', len(missing))
for m in missing[:30]:
    print('  MISSING:', m)