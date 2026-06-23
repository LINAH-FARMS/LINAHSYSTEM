import requests, json, sys
sys.path.insert(0, 'C:\\Users\\Salem Magdy\\Desktop\\LINAHSYSTEM\\reports')
from report_bakery import make_bakery_report
from report_employees import make_employee_report

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

import sys; sys.stdout.reconfigure(encoding='utf-8')  # noqa
print('[جاري سحب البيانات من Supabase...]')
r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
raw = r.json()[0]['data']
if isinstance(raw, str): raw = json.loads(raw)
print(f'[تم سحب البيانات] {len(raw.get("employees",[]))} موظف، {len(raw.get("bakeryProductions",[]))} إنتاج فرن')
make_bakery_report(raw)
make_employee_report(raw)
print(f'\n[تم] جميع التقارير على سطح المكتب')
