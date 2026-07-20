import json, openpyxl, sys
sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r'C:\Users\Salem Magdy\Desktop\المخازن.xlsx')
archive = []

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(min_row=3, values_only=True))  # skip title row and header row
    
    for row in rows:
        if not row or len(row) < 5:
            continue
        num = str(row[0] or '').strip()
        item = str(row[1] or '').strip()
        qty_str = str(row[2] or '').strip()
        condition = str(row[3] or '').strip()
        notes = str(row[4] or '').strip()
        
        if not item or not num.isdigit():
            continue
        
        # Handle __ as unknown qty
        if qty_str == '__' or qty_str == '':
            qty = 0
        else:
            try:
                qty = int(float(qty_str))
            except:
                qty = 0
        
        if qty == 0:
            continue
        
        archive.append({
            'item': item,
            'desc': notes,
            'qty': qty,
            'location': sheet_name.strip(),
            'condition': condition,
            'date': '',
            'issueto': '',
            'issuedate': '',
            'issueby': '',
            'receiver': ''
        })

out_path = r'C:\Users\SALEMM~1\AppData\Local\Temp\stores_archive_data.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(archive, f, ensure_ascii=False)
print(f'إجمالي العهدات: {len(archive)}')
print(f'محفوظ في: {out_path}')
for a in archive:
    print(f'  {a["item"]} - {a["qty"]} - {a["location"]} - {a["condition"]}')
