import json, openpyxl, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\SALEMM~1\AppData\Local\Temp\hr_data.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'HR Data'

headers = ['الكود', 'اسم الموظف', 'الاداره', 'الوظيفه', 'تاريخ التعين']
ws.append(headers)

for row in data:
    ws.append([
        row.get('كود', ''),
        row.get('اسم الموظف', '').strip(),
        row.get('الاداره', '').strip(),
        row.get('الوظيفه', '').strip(),
        row.get('تاريخ التعين', '')
    ])

for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col) + 2
    ws.column_dimensions[chr(64 + col[0].column)].width = min(max_len * 1.3, 40)

out = r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\HR_Data.xlsx'
wb.save(out)
print(f'تم إنشاء الملف: {out}')
print(f'عدد الصفوف: {len(data)}')
