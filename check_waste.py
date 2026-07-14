import json, re
with open(r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
m = re.search(r'let mealWaste\s*=\s*(.*?);', content, re.DOTALL)
if m:
    init_val = m.group(1)[:300]
    print('mealWaste init:', init_val[:150])
    print('...')
else:
    print('mealWaste init not found')
