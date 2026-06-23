import requests, json, sys
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def fetch():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    raw = r.json()[0]['data']
    return json.loads(raw) if isinstance(raw, str) else raw

def last_saturday():
    today = datetime.now()
    return today - timedelta(days=(today.weekday() + 1) % 7 + 1)

def fmt(d):
    return d.strftime('%Y-%m-%d')

def style_sheet(ws, headers, rows, col_widths=None, title=None):
    thin = Side(style='thin'); border = Border(top=thin, left=thin, right=thin, bottom=thin)
    alt_fill = PatternFill('solid', fgColor='F5F5F5')
    if title:
        ws.cell(row=1, column=1, value=title).font = Font(bold=True, size=13, color='1B5E20')
    r = 2 if title else 1
    hf = Font(bold=True, color='FFFFFF', size=10)
    hfill = PatternFill('solid', fgColor='1B5E20')
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=r, column=c, value=h)
        cell.font = hf; cell.fill = hfill; cell.alignment = Alignment(horizontal='center'); cell.border = border
    for ri, row_data in enumerate(rows, r + 1):
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=ri, column=c, value=v)
            cell.border = border; cell.alignment = Alignment(horizontal='center')
            if ri % 2 == 0: cell.fill = alt_fill
    if col_widths:
        for c, w in enumerate(col_widths, 1):
            ws.column_dimensions[get_column_letter(c)].width = w

print('[جاري سحب البيانات...]')
data = fetch()
sun, sat = last_saturday(), last_saturday() + timedelta(days=6)
date_str = f'{fmt(sun)}_الى_{fmt(sat)}'
print(f'[الفترة] {fmt(sun)} إلى {fmt(sat)}')

sync_del = data.get('syncDeletions', [])
def filt(arr, entity):
    if not sync_del or not arr: return arr
    keys = set(d['key'] for d in sync_del if d.get('entity') == entity)
    if not keys: return arr
    key_fns = {
        'employees': lambda e: e.get('code') or e.get('name'),
        'hospitalities': lambda h: f"{h.get('name','')}|{h.get('arrival','')}|{h.get('type','')}",
        'maintenanceRecords': lambda m: f"{m.get('category','')}|{m.get('task','')}|{m.get('date','')}",
        'bakeryProductions': lambda p: f"{p.get('date','')}|{p.get('breadCount','')}",
        'bakeryContractorSupplies': lambda s: f"{s.get('name','')}|{s.get('date','')}|{s.get('count','')}",
        'septicRecords': lambda s: f"{s.get('date','')}|{s.get('name',s.get('sector',''))}|{s.get('trips',s.get('quantity',''))}",
        'teaSugarDisbursements': lambda t: f"{t.get('date','')}|{t.get('period',t.get('type',''))}|{t.get('empCode','')}|{t.get('teaPacks',t.get('quantity',''))}|{t.get('sugarKg','')}"
    }
    fn = key_fns.get(entity)
    if not fn: return arr
    return [x for x in arr if fn(x) not in keys]

for ent in ['employees','hospitalities','maintenanceRecords','bakeryProductions','bakeryContractorSupplies','septicRecords','teaSugarDisbursements']:
    if data.get(ent): data[ent] = filt(data[ent], ent)

emps = data.get('employees', [])
p_count = sum(1 for e in emps if e.get('status') == 'P')
v_count = sum(1 for e in emps if e.get('status') == 'V')
hosp = [h for h in data.get('hospitalities', []) if h.get('arrival','')[:10] >= fmt(sun) and h.get('arrival','')[:10] <= fmt(sat)]
prods = [p for p in data.get('bakeryProductions', []) if p.get('date','') >= fmt(sun) and p.get('date','') <= fmt(sat)]
ctr_sup = [c for c in data.get('bakeryContractorSupplies', []) if c.get('date','') >= fmt(sun) and c.get('date','') <= fmt(sat)]
meals = [m for m in data.get('mealLogs', []) if m.get('date','') >= fmt(sun) and m.get('date','') <= fmt(sat)]
maint = [m for m in data.get('maintenanceRecords', []) if m.get('date','') >= fmt(sun) and m.get('date','') <= fmt(sat)]
septic = [s for s in data.get('septicRecords', []) if s.get('date','') >= fmt(sun) and s.get('date','') <= fmt(sat)]
incidents = [i for i in data.get('incident_reports', []) if i.get('date','')[:10] >= fmt(sun) and i.get('date','')[:10] <= fmt(sat)]
tea_sugar = [t for t in data.get('teaSugarDisbursements', []) if t.get('date','') >= fmt(sun) and t.get('date','') <= fmt(sat)]

today_str = datetime.now().strftime('%Y-%m-%d')
filename = f'C:\\Users\\Salem Magdy\\Desktop\\Lina_Weekly_{today_str}.xlsx'
wb = Workbook()

# Sheet 1: Summary
ws = wb.active; ws.title = 'Summary'
style_sheet(ws, ['Item', 'Count'], [
    ['Total Employees', len(emps)], ['Present (P)', p_count], ['Vacation (V)', v_count],
    ['Hospitality', len(hosp)], ['Bakery Production', len(prods)],
    ['Contractor Supply', len(ctr_sup)], ['Meals', len(meals)],
    ['Maintenance', len(maint)], ['Septic', len(septic)],
    ['Incidents', len(incidents)], ['Tea & Sugar', len(tea_sugar)]
], [25, 12], title=f'Weekly Report {fmt(sun)} to {fmt(sat)}')

# Sheet 2: Bakery Production
if prods:
    ws2 = wb.create_sheet('Bakery')
    style_sheet(ws2, ['Date', 'Bread', 'Flour', 'Bran', 'Salt', 'Yeast', 'Diesel'], [
        [p.get('date',''), p.get('breadCount',0), p.get('flourUsed',0), p.get('branUsed',0), p.get('saltUsed',0), p.get('yeastUsed',0), p.get('dieselUsed',0)]
        for p in sorted(prods, key=lambda x: x.get('date',''))
    ], [14,10,10,10,10,10,10], title='Bakery Production')
    ws2.cell(row=2, column=1, value='Total').font = Font(bold=True)
    for ci, sf in [(2,'breadCount'),(3,'flourUsed'),(4,'branUsed'),(5,'saltUsed'),(6,'yeastUsed'),(7,'dieselUsed')]:
        ws2.cell(row=2, column=ci, value=round(sum(float(p.get(sf,0)or 0) for p in prods),1))

# Sheet 3: Contractor Supply
if ctr_sup:
    ws3 = wb.create_sheet('Contractors')
    rows = [[c.get('date',''), c.get('name',''), c.get('count',0), c.get('price',0),
             int(c.get('count',0)or 0)*float(c.get('price',0)or 0)] for c in sorted(ctr_sup, key=lambda x: x.get('date',''))]
    style_sheet(ws3, ['Date', 'Name', 'Loaves', 'Price', 'Total'], rows, [14,20,10,10,12], title='Contractor Supply')
    ws3.cell(row=2, column=1, value='Total').font = Font(bold=True)
    ws3.cell(row=2, column=3, value=sum(r[2] for r in rows))
    ws3.cell(row=2, column=5, value=round(sum(r[4] for r in rows),2))

# Sheet 4: Hospitality
if hosp:
    ws4 = wb.create_sheet('Hospitality')
    style_sheet(ws4, ['Name', 'Arrival', 'Departure', 'Guests'], [
        [h.get('name',''), h.get('arrival','')[:10], (h.get('departure','')[:10] if h.get('departure') else ''), h.get('guests',1)]
        for h in sorted(hosp, key=lambda x: x.get('arrival',''))
    ], [25,14,14,10], title='Hospitality')

# Sheet 5: Maintenance
if maint:
    ws5 = wb.create_sheet('Maintenance')
    style_sheet(ws5, ['Date', 'Category', 'Task', 'Cost', 'Responsible'], [
        [m.get('date',''), m.get('category',''), m.get('task',''), m.get('cost',0), m.get('responsible','')]
        for m in sorted(maint, key=lambda x: x.get('date',''))
    ], [14,15,30,10,20], title='Maintenance')

# Sheet 6: Meals
if meals:
    ws6 = wb.create_sheet('Meals')
    rows = [[m.get('date',''), m.get('breakfast',0), m.get('lunch',0), m.get('dinner',0),
             int(m.get('breakfast',0)or 0)+int(m.get('lunch',0)or 0)+int(m.get('dinner',0)or 0)]
            for m in sorted(meals, key=lambda x: x.get('date',''))]
    style_sheet(ws6, ['Date', 'Breakfast', 'Lunch', 'Dinner', 'Total'], rows, [14,10,10,10,12], title='Meals')

# Sheet 7: Septic
if septic:
    ws7 = wb.create_sheet('Septic')
    style_sheet(ws7, ['Date', 'Name', 'Trips', 'Quantity'], [
        [s.get('date',''), s.get('name',s.get('sector','')), s.get('trips',0), s.get('quantity',0)]
        for s in sorted(septic, key=lambda x: x.get('date',''))
    ], [14,20,10,10], title='Septic')

# Sheet 8: Incidents
if incidents:
    ws8 = wb.create_sheet('Incidents')
    style_sheet(ws8, ['Date', 'Location', 'Category', 'Description', 'Status'], [
        [i.get('date','')[:10], i.get('location',''), i.get('category',''), i.get('description',''), i.get('status','')]
        for i in sorted(incidents, key=lambda x: x.get('date',''))
    ], [14,15,15,40,10], title='Incidents')

# Sheet 9: Tea & Sugar
if tea_sugar:
    ws9 = wb.create_sheet('TeaSugar')
    style_sheet(ws9, ['Date', 'Employee', 'Tea', 'Sugar', 'Period'], [
        [t.get('date',''), t.get('empCode',t.get('name','')), t.get('teaPacks',0), t.get('sugarKg',0), t.get('period',t.get('type',''))]
        for t in sorted(tea_sugar, key=lambda x: x.get('date',''))
    ], [14,20,10,10,12], title='Tea & Sugar')

wb.save(filename)
print(f'[تم] {filename}')
