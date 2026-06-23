import requests, json, sys
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def fetch():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.alldata&select=data', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    raw = r.json()[0]['data']
    return json.loads(raw) if isinstance(raw, str) else raw

def last_sunday():
    today = datetime.now()
    return today - timedelta(days=(today.weekday() + 1) % 7)

def date_range_str(sun):
    sat = sun + timedelta(days=6)
    return sun.strftime('%Y-%m-%d'), sat.strftime('%Y-%m-%d')

def style_header(ws, row, headers, fill_color='1B5E20'):
    hf = Font(bold=True, color='FFFFFF', size=10)
    hfill = PatternFill('solid', fgColor=fill_color)
    thin = Side(style='thin'); border = Border(top=thin, left=thin, right=thin, bottom=thin)
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=c, value=h)
        cell.font = hf; cell.fill = hfill; cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border

def write_rows(ws, start_row, data, widths=None):
    thin = Side(style='thin'); border = Border(top=thin, left=thin, right=thin, bottom=thin)
    alt_fill = PatternFill('solid', fgColor='F5F5F5')
    for r, row_data in enumerate(data, start_row):
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.border = border; cell.alignment = Alignment(horizontal='center', vertical='center')
            if r % 2 == 0: cell.fill = alt_fill
    if widths:
        for c, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(c)].width = w

print('[جاري سحب البيانات...]')
data = fetch()
sun, sat = date_range_str(last_sunday())
print(f'[الفترة] {sun} ← {sat}')

wb = Workbook()

# ===== شيت 1: ملخص الأسبوع =====
ws = wb.active; ws.title = 'ملخص الأسبوع'
title_fill = PatternFill('solid', fgColor='1B5E20')
title_cell = ws.cell(row=1, column=1, value=f'تقرير لينة الأسبوعي — {sun} إلى {sat}')
title_cell.font = Font(bold=True, color='FFFFFF', size=14)
title_cell.fill = title_fill; ws.merge_cells('A1:F1')
ws.row_dimensions[1].height = 35

# إحصائيات سريعة
emps = data.get('employees', [])
total = len(emps)
p_count = sum(1 for e in emps if e.get('status') == 'P')
v_count = sum(1 for e in emps if e.get('status') == 'V')
hosp = [h for h in data.get('hospitalities', []) if h.get('arrival','')[:10] >= sun and h.get('arrival','')[:10] <= sat]
prods = [p for p in data.get('bakeryProductions', []) if p.get('date','') >= sun and p.get('date','') <= sat]
ctr_sup = [c for c in data.get('bakeryContractorSupplies', []) if c.get('date','') >= sun and c.get('date','') <= sat]
meals = [m for m in data.get('mealLogs', []) if m.get('date','') >= sun and m.get('date','') <= sat]
maint = [m for m in data.get('maintenanceRecords', []) if m.get('date','') >= sun and m.get('date','') <= sat]

summary = [
    ['إجمالي الموظفين', total], ['P (متواجد)', p_count], ['V (إجازات)', v_count],
    ['الضيافة (الأسبوع)', len(hosp)], ['إنتاج الفرن (الأسبوع)', len(prods)],
    ['توريد مقاولين (الأسبوع)', len(ctr_sup)], ['وجبات (الأسبوع)', len(meals)],
    ['بلاغات صيانة (الأسبوع)', len(maint)]]
style_header(ws, 3, ['البيان', 'العدد'])
write_rows(ws, 4, summary, [30, 15])

# ===== شيت 2: إنتاج الفرن =====
if prods:
    ws2 = wb.create_sheet('إنتاج الفرن')
    total_bread = sum(int(p.get('breadCount',0) or 0) for p in prods)
    total_flour = sum(float(p.get('flourUsed',0) or 0) for p in prods)
    total_bran = sum(float(p.get('branUsed',0) or 0) for p in prods)
    total_salt = sum(float(p.get('saltUsed',0) or 0) for p in prods)
    total_yeast = sum(float(p.get('yeastUsed',0) or 0) for p in prods)
    total_diesel = sum(float(p.get('dieselUsed',0) or 0) for p in prods)
    r = 1
    c = ws2.cell(row=r, column=1, value=f'إنتاج الفرن — {sun} إلى {sat}')
    c.font = Font(bold=True, size=13, color='FFFFFF'); c.fill = title_fill; ws2.merge_cells(f'A{r}:G{r}')
    ws2.row_dimensions[r].height = 30
    r += 1
    totals = [['إجمالي الخبز', total_bread, 'رغيف'],
              ['إجمالي الدقيق', round(total_flour,1), 'كجم'],
              ['إجمالي الردة', round(total_bran,1), 'كجم'],
              ['إجمالي الملح', round(total_salt,1), 'كجم'],
              ['إجمالي الخميرة', round(total_yeast,1), 'كجم'],
              ['إجمالي السولار', round(total_diesel,1), 'لتر']]
    style_header(ws2, r, ['البيان', 'الإجمالي', 'الوحدة'], '37474F')
    r += 1; write_rows(ws2, r, totals, [20, 15, 10]); r += len(totals) + 1
    style_header(ws2, r, ['التاريخ', 'عدد الأرغفة', 'دقيق', 'ردة', 'ملح', 'خميرة', 'سولار'])
    r += 1
    write_rows(ws2, r, [[p.get('date',''), p.get('breadCount',0), p.get('flourUsed',0),
        p.get('branUsed',0), p.get('saltUsed',0), p.get('yeastUsed',0), p.get('dieselUsed',0)] for p in sorted(prods, key=lambda x: x.get('date',''))],
        [14,12,10,10,10,10,10])

# ===== شيت 3: توريد مقاولين =====
if ctr_sup:
    ws3 = wb.create_sheet('توريد مقاولين')
    total_loaves = sum(int(c.get('count',0) or 0) for c in ctr_sup)
    total_cost = sum(int(c.get('count',0) or 0) * float(c.get('price',0) or 0) for c in ctr_sup)
    c = ws3.cell(row=1, column=1, value=f'توريد مقاولين — {sun} إلى {sat}')
    c.font = Font(bold=True, size=13, color='FFFFFF'); c.fill = title_fill; ws3.merge_cells('A1:E1')
    ws3.row_dimensions[1].height = 30
    style_header(ws3, 3, ['إجمالي الخبز', total_loaves, 'رغيف'], '37474F')
    ws3.merge_cells('A3:B3'); ws3.cell(row=4, column=1, value='إجمالي التكلفة').font = Font(bold=True, size=11)
    ws3.cell(row=4, column=2, value=round(total_cost,2))
    style_header(ws3, 6, ['التاريخ', 'المقاول', 'عدد الأرغفة', 'سعر الوحدة', 'الإجمالي'])
    write_rows(ws3, 7, [[c.get('date',''), c.get('name',''), c.get('count',0), c.get('price',0),
        int(c.get('count',0) or 0) * float(c.get('price',0) or 0)] for c in sorted(ctr_sup, key=lambda x: x.get('date',''))],
        [14,20,12,10,12])

# ===== شيت 4: الضيافة =====
if hosp:
    ws4 = wb.create_sheet('الضيافة')
    c = ws4.cell(row=1, column=1, value=f'الضيافة — {sun} إلى {sat}')
    c.font = Font(bold=True, size=13, color='FFFFFF'); c.fill = title_fill; ws4.merge_cells('A1:D1')
    ws4.row_dimensions[1].height = 30
    total_guests = sum(int(h.get('guests',1) or 1) for h in hosp)
    style_header(ws4, 3, ['إجمالي الضيوف', total_guests], '37474F')
    ws4.merge_cells('A3:B3')
    style_header(ws4, 5, ['الاسم', 'تاريخ الوصول', 'تاريخ المغادرة', 'عدد الضيوف'])
    write_rows(ws4, 6, [[h.get('name',''), h.get('arrival','')[:10], h.get('departure','')[:10] if h.get('departure') else '', h.get('guests',1)] for h in sorted(hosp, key=lambda x: x.get('arrival',''))],
        [25,14,14,10])

# ===== شيت 5: الصيانة =====
if maint:
    ws5 = wb.create_sheet('الصيانة')
    c = ws5.cell(row=1, column=1, value=f'بلاغات الصيانة — {sun} إلى {sat}')
    c.font = Font(bold=True, size=13, color='FFFFFF'); c.fill = title_fill; ws5.merge_cells('A1:E1')
    ws5.row_dimensions[1].height = 30
    style_header(ws5, 3, ['التاريخ', 'التصنيف', 'المهمة', 'التكلفة', 'المسؤول'])
    write_rows(ws5, 4, [[m.get('date',''), m.get('category',''), m.get('task',''), m.get('cost',0), m.get('responsible','')] for m in sorted(maint, key=lambda x: x.get('date',''))],
        [14,15,30,10,20])

# ===== شيت 6: الوجبات =====
if meals:
    ws6 = wb.create_sheet('الوجبات')
    c = ws6.cell(row=1, column=1, value=f'الوجبات اليومية — {sun} إلى {sat}')
    c.font = Font(bold=True, size=13, color='FFFFFF'); c.fill = title_fill; ws6.merge_cells('A1:E1')
    ws6.row_dimensions[1].height = 30
    total_bf = sum(int(m.get('breakfast',0) or 0) for m in meals)
    total_lh = sum(int(m.get('lunch',0) or 0) for m in meals)
    total_dn = sum(int(m.get('dinner',0) or 0) for m in meals)
    style_header(ws6, 3, ['الإفطار', total_bf, 'الغداء', total_lh, 'العشاء', total_dn], '37474F')
    style_header(ws6, 5, ['التاريخ', 'الإفطار', 'الغداء', 'العشاء', 'الإجمالي'])
    write_rows(ws6, 6, [[m.get('date',''), m.get('breakfast',0), m.get('lunch',0), m.get('dinner',0),
        int(m.get('breakfast',0) or 0) + int(m.get('lunch',0) or 0) + int(m.get('dinner',0) or 0)] for m in sorted(meals, key=lambda x: x.get('date',''))],
        [14,10,10,10,12])

path = 'C:\\Users\\Salem Magdy\\Desktop\\تقرير_لينة_الأسبوعي.xlsx'
wb.save(path)
print(f'[تم] التقرير الأسبوعي — {sun} إلى {sat}')
