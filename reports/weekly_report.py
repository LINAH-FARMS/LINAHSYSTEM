import requests, json, sys, os, re, argparse
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

_ARABIC_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
_EMOJI_PATTERN = re.compile(r'[\U00002600-\U000027BF\U0001F300-\U0001FAFF\U0000FE00-\U0000FE0F]')

def norm_date(s):
    if not s or not isinstance(s, str): return s or ''
    s = s[:10]
    s = s.translate(_ARABIC_DIGITS)
    s = s.replace('\u200f', '').replace('\u200e', '').strip()
    parts = s.split('/')
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 4:
            return f'{y}-{m.zfill(2)}-{d.zfill(2)}'
    return s

def strip_emoji(s):
    return _EMOJI_PATTERN.sub('', s).strip() if isinstance(s, str) else (s or '')

def fetch():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    raw = r.json()[0]['data']
    return json.loads(raw) if isinstance(raw, str) else raw

def last_completed_friday():
    today = datetime.now()
    days_since_friday = (today.weekday() - 4) % 7
    if days_since_friday == 0:
        days_since_friday = 7
    return today - timedelta(days=days_since_friday)

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

def norm_filter(arr, key):
    return [x for x in arr if norm_date(x.get(key,'')) >= fmt(start) and norm_date(x.get(key,'')) <= fmt(end)]

print('[جاري سحب البيانات...]')
data = fetch()

sync_del = data.get('syncDeletions', [])
def filt(arr, entity):
    if not sync_del or not arr: return arr
    keys = set(d['key'] for d in sync_del if d.get('entity') == entity)
    if not keys: return arr
    key_fns = {
        'employees': lambda e: str(e.get('id','')) or e.get('code') or e.get('name'),
        'hospitalities': lambda h: f"{h.get('name','')}|{h.get('arrival','')}|{h.get('type','')}",
        'maintenanceRecords': lambda m: f"{m.get('category','')}|{m.get('task','')}|{m.get('date','')}",
        'bakeryProductions': lambda p: f"{p.get('date','')}|{p.get('breadCount','')}",
        'bakeryContractorSupplies': lambda s: f"{s.get('name','')}|{s.get('date','')}|{s.get('count','')}",
        'septicRecords': lambda s: f"{s.get('date','')}|{s.get('name',s.get('sector',''))}|{s.get('trips',s.get('quantity',''))}",
        'teaSugarDisbursements': lambda t: f"{t.get('date','')}|{t.get('period',t.get('type',''))}|{t.get('empCode','')}|{t.get('teaPacks',t.get('quantity',''))}|{t.get('sugarKg','')}",
        'incident_reports': lambda r: str(r.get('id','')) or r.get('name','')
    }
    fn = key_fns.get(entity)
    if not fn: return arr
    return [x for x in arr if fn(x) not in keys]

for ent in ['employees','hospitalities','maintenanceRecords','bakeryProductions','bakeryContractorSupplies','septicRecords','teaSugarDisbursements','incident_reports']:
    if data.get(ent): data[ent] = filt(data[ent], ent)

parser = argparse.ArgumentParser()
parser.add_argument('--from', dest='from_date')
parser.add_argument('--to', dest='to_date')
args = parser.parse_args()

if args.from_date and args.to_date:
    start = datetime.strptime(args.from_date, '%Y-%m-%d')
    end = datetime.strptime(args.to_date, '%Y-%m-%d')
else:
    end = last_completed_friday()
    start = end - timedelta(days=6)
print(f'[الفترة] {fmt(start)} إلى {fmt(end)}')

emps = data.get('employees', [])
p_count = sum(1 for e in emps if e.get('status') == 'P')
v_count = sum(1 for e in emps if e.get('status') == 'V')
hosp = norm_filter(data.get('hospitalities', []), 'arrival')
prods = norm_filter(data.get('bakeryProductions', []), 'date')
ctr_sup = norm_filter(data.get('bakeryContractorSupplies', []), 'date')
meals = norm_filter(data.get('mealLogs', []), 'date')
maint = norm_filter(data.get('maintenanceRecords', []), 'date')
septic = norm_filter(data.get('septicRecords', []), 'date')
ts_batches = norm_filter(data.get('teaSugarBatches', []), 'date')
tea_sugar = norm_filter(data.get('teaSugarDisbursements', []), 'date')
# Fetch incident reports (stored under a separate sync_data id)
try:
    ri = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.incident_reports&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    ri_raw = ri.json()
    if isinstance(ri_raw, list) and len(ri_raw) > 0:
        ri_d = ri_raw[0]
        ri_data = json.loads(ri_d['data']) if isinstance(ri_d.get('data',''), str) else ri_d.get('data', [])
        if not isinstance(ri_data, list): ri_data = []
    else:
        ri_data = []
except Exception:
    ri_data = []
ri_data = filt(ri_data, 'incident_reports')
incidents = norm_filter(ri_data, 'opened_at')
# Also include tea sugar by matching period of batches found this week
# Fetch meal waste entries (stored under a separate sync_data id)
try:
    rw = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.meal_waste_entries&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    mw_raw = rw.json()
    if isinstance(mw_raw, list) and len(mw_raw) > 0:
        mw_d = mw_raw[0]
        mw_data = json.loads(mw_d['data']) if isinstance(mw_d.get('data',''), str) else mw_d.get('data', [])
        if not isinstance(mw_data, list): mw_data = []
    else:
        mw_data = []
except Exception:
    mw_data = []
mw_data = norm_filter(mw_data, 'date')

today_str = datetime.now().strftime('%Y-%m-%d')
filename = f'C:\\Users\\Salem Magdy\\Desktop\\Lina_Weekly_{today_str}.xlsx'

base = filename.replace('.xlsx','')
i = 1
while os.path.exists(filename):
    filename = f'{base}_{i}.xlsx'
    i += 1

wb = Workbook()

ws = wb.active; ws.title = 'Summary'
style_sheet(ws, ['Item', 'Count'], [
    ['Total Employees (القوة)', len(emps)], ['Present (P)', p_count], ['Vacation (V)', v_count],
    ['Hospitality', len(hosp)], ['Bakery Production', len(prods)],
    ['Contractor Supply', len(ctr_sup)], ['Meals', len(meals)],
    ['Maintenance', len(maint)], ['Septic', len(septic)],
    ['Incidents', len(incidents)], ['Tea & Sugar (Batches)', len(ts_batches)], ['Tea & Sugar (Disbursed)', len(tea_sugar)],
    ['Meal Waste', len(mw_data)]
], [28, 12], title=f'Weekly Report {fmt(start)} to {fmt(end)}')

if prods:
    ws2 = wb.create_sheet('Bakery')
    style_sheet(ws2, ['Date', 'Bread', 'Flour', 'Bran', 'Salt', 'Yeast', 'Diesel'], [
        [norm_date(p.get('date','')), p.get('breadCount',0), p.get('flourUsed',0), p.get('branUsed',0), p.get('saltUsed',0), p.get('yeastUsed',0), p.get('dieselUsed',0)]
        for p in sorted(prods, key=lambda x: norm_date(x.get('date','')))
    ], [14,10,10,10,10,10,10], title='Bakery Production')
    data_end = 3 + len(prods)
    ws2.cell(row=data_end, column=1, value='الإجمالي').font = Font(bold=True, size=11, color='1B5E20')
    ws2.cell(row=data_end, column=2, value=round(sum(float(p.get('breadCount',0)or 0) for p in prods)))
    ws2.cell(row=data_end, column=3, value=round(sum(float(p.get('flourUsed',0)or 0) for p in prods),1))
    ws2.cell(row=data_end, column=4, value=round(sum(float(p.get('branUsed',0)or 0) for p in prods),1))
    ws2.cell(row=data_end, column=5, value=round(sum(float(p.get('saltUsed',0)or 0) for p in prods),1))
    ws2.cell(row=data_end, column=6, value=round(sum(float(p.get('yeastUsed',0)or 0) for p in prods),1))
    ws2.cell(row=data_end, column=7, value=round(sum(float(p.get('dieselUsed',0)or 0) for p in prods),1))

if ctr_sup:
    ws3 = wb.create_sheet('Contractors')
    rows = [[norm_date(c.get('date','')), c.get('name',''), c.get('count',0), c.get('price',0),
             int(c.get('count',0)or 0)*float(c.get('price',0)or 0)] for c in sorted(ctr_sup, key=lambda x: norm_date(x.get('date','')))]
    style_sheet(ws3, ['Date', 'Name', 'Loaves', 'Price', 'Total'], rows, [14,20,10,10,12], title='Contractor Supply')
    data_end = 3 + len(ctr_sup)
    ws3.cell(row=data_end, column=1, value='الإجمالي').font = Font(bold=True, size=11, color='1B5E20')
    ws3.cell(row=data_end, column=3, value=sum(r[2] for r in rows))
    ws3.cell(row=data_end, column=5, value=round(sum(r[4] for r in rows),2))

if hosp:
    ws4 = wb.create_sheet('Hospitality')
    style_sheet(ws4, ['Name', 'Arrival', 'Departure', 'Guests'], [
        [h.get('name',''), norm_date(h.get('arrival','')), norm_date(h.get('departure','')) if h.get('departure') else '', h.get('guests',1)]
        for h in sorted(hosp, key=lambda x: norm_date(x.get('arrival','')))
    ], [25,14,14,10], title='Hospitality')

if maint:
    ws5 = wb.create_sheet('Maintenance')
    style_sheet(ws5, ['Date', 'Category', 'Task', 'Cost', 'Responsible'], [
        [norm_date(m.get('date','')), m.get('category',''), m.get('task',''), m.get('cost',0), m.get('responsible','')]
        for m in sorted(maint, key=lambda x: norm_date(x.get('date','')))
    ], [14,15,30,10,20], title='Maintenance')

if meals:
    ws6 = wb.create_sheet('Meals')
    rows = [[norm_date(m.get('date','')), m.get('breakfast',0), m.get('lunch',0), m.get('dinner',0),
             int(m.get('breakfast',0)or 0)+int(m.get('lunch',0)or 0)+int(m.get('dinner',0)or 0)]
            for m in sorted(meals, key=lambda x: norm_date(x.get('date','')))]
    style_sheet(ws6, ['Date', 'Breakfast', 'Lunch', 'Dinner', 'Total'], rows, [14,10,10,10,12], title='Meals')

if septic:
    ws7 = wb.create_sheet('Septic')
    style_sheet(ws7, ['Date', 'Name', 'Trips', 'Quantity (m³)'], [
        [norm_date(s.get('date','')), s.get('name',s.get('sector','')), s.get('trips',0),
         s.get('quantity',s.get('pumpQty',s.get('amount',s.get('حجم',(s.get('trips',0) or 0)*5))))]
        for s in sorted(septic, key=lambda x: norm_date(x.get('date','')))
    ], [14,20,10,12], title='Septic')

if incidents:
    ws8 = wb.create_sheet('Incidents')
    style_sheet(ws8, ['Date', 'Location', 'Category', 'Description', 'Status', 'Priority', 'Reporter'], [
        [(i.get('opened_at','') or i.get('date',''))[:10], i.get('location',''), i.get('type', i.get('category', '')), i.get('desc','') or i.get('description',''), i.get('status',''), i.get('priority',''), i.get('name','')]
        for i in sorted(incidents, key=lambda x: x.get('opened_at','') or x.get('date',''))
    ], [14,15,15,40,10,12,20], title='Incidents')

if tea_sugar:
    ws9 = wb.create_sheet('TeaSugar')
    style_sheet(ws9, ['Date', 'Code', 'Name', 'Tea', 'Sugar', 'Period'], [
        [norm_date(t.get('date','')), t.get('empCode',''), strip_emoji(t.get('empName',t.get('name',''))),
         t.get('teaPacks',0), t.get('sugarKg',0), t.get('period',t.get('type',''))]
        for t in sorted(tea_sugar, key=lambda x: norm_date(x.get('date','')))
    ], [14,12,25,10,10,20], title='Tea & Sugar')

if ts_batches:
    ws10 = wb.create_sheet('TeaSugarBatches')
    style_sheet(ws10, ['Date', 'Period', 'Tea Qty', 'Sugar Qty'], [
        [norm_date(b.get('date','')), b.get('period',''), b.get('teaQty',0), b.get('sugarQty',0)]
        for b in sorted(ts_batches, key=lambda x: norm_date(x.get('date','')))
    ], [14,20,10,10], title='Tea Sugar Batches')

if mw_data:
    ws11 = wb.create_sheet('MealWaste')
    rows = []
    for m in sorted(mw_data, key=lambda x: (norm_date(x.get('date','')), str(x.get('meal','')))):
        waste = float(m.get('wasteEng',0)or 0) + float(m.get('wasteWrk',0)or 0) + float(m.get('wasteGuests',0)or 0)
        ppl = (int(m.get('engAte',0)or 0) + int(m.get('wrkAte',0)or 0) + int(m.get('guests',0)or 0)) or 1
        cost = float(m.get('cost',0)or 0)
        wp_g = round(waste / ppl * 1000) if ppl > 0 else 0
        rows.append([norm_date(m.get('date','')), m.get('meal',''), m.get('chef',m.get('responsible','')),
                      ppl, round(waste, 1), wp_g, round(cost)])
    style_sheet(ws11, ['Date', 'Meal', 'Chef', 'Meals Count', 'Waste (kg)', 'Waste/Person (g)', 'Cost (ج.م)'],
                rows, [14,10,20,12,12,16,12], title='Meal Waste')
    data_end = 3 + len(rows)
    ws11.cell(row=data_end, column=1, value='الإجمالي').font = Font(bold=True, size=11, color='1B5E20')
    ws11.cell(row=data_end, column=4, value=sum(r[3] for r in rows))
    ws11.cell(row=data_end, column=5, value=round(sum(r[4] for r in rows), 1))
    total_ppl = sum(r[3] for r in rows)
    ws11.cell(row=data_end, column=6, value=round(sum(r[4] for r in rows) / max(total_ppl, 1) * 1000))
    ws11.cell(row=data_end, column=7, value=round(sum(r[6] for r in rows)))

wb.save(filename)
print(f'[تم] {filename}')
