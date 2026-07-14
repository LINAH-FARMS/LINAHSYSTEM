import json, sys, urllib.request, datetime
sys.stdout.reconfigure(encoding='utf-8')
apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

# Master ingredient list with price and water factor
ingredient_master = [
    # فول و عدس
    {"name": "فول جاف", "price": 80, "factor": 2.0, "unit": "كجم"},
    {"name": "عدس", "price": 60, "factor": 2.5, "unit": "كجم"},
    # ارز
    {"name": "ارز مصري", "price": 35, "factor": 2.5, "unit": "كجم"},
    {"name": "ارز بسمتي", "price": 55, "factor": 2.8, "unit": "كجم"},
    # خضار مطبوخ
    {"name": "بطاطس", "price": 20, "factor": 1.3, "unit": "كجم"},
    {"name": "جزر", "price": 15, "factor": 1.2, "unit": "كجم"},
    {"name": "بسلة", "price": 40, "factor": 1.5, "unit": "كجم"},
    {"name": "طماطم", "price": 10, "factor": 1.1, "unit": "كجم"},
    {"name": "بصل", "price": 8, "factor": 1.1, "unit": "كجم"},
    # لحوم و فراخ
    {"name": "فراخ", "price": 110, "factor": 0.8, "unit": "كجم"},
    {"name": "لحمة بقر", "price": 250, "factor": 0.75, "unit": "كجم"},
    {"name": "لحمة غنم", "price": 300, "factor": 0.75, "unit": "كجم"},
    # خبز
    {"name": "خبز بلدي", "price": 5, "factor": 1.0, "unit": "كجم"},
    {"name": "خبزعيش", "price": 8, "factor": 1.0, "unit": "كجم"},
    # جبنة و بيض
    {"name": "جبنة بيضاء", "price": 60, "factor": 1.0, "unit": "كجم"},
    {"name": "جبنة رومي", "price": 100, "factor": 1.0, "unit": "كجم"},
    {"name": "بيض", "price": 1.5, "factor": 0.75, "unit": "عدد"},
    # مربي و دهون
    {"name": "مربي", "price": 30, "factor": 1.0, "unit": "كجم"},
    {"name": "زيت", "price": 60, "factor": 1.0, "unit": "لتر"},
    {"name": "سمن", "price": 100, "factor": 1.0, "unit": "كجم"},
    # توابل
    {"name": "ملح", "price": 5, "factor": 1.0, "unit": "كجم"},
    {"name": "كمون", "price": 80, "factor": 1.0, "unit": "كجم"},
    {"name": "كمون مطحون", "price": 100, "factor": 1.0, "unit": "كجم"},
    {"name": "كركم", "price": 60, "factor": 1.0, "unit": "كجم"},
    {"name": "فلفل اسود", "price": 120, "factor": 1.0, "unit": "كجم"},
    {"name": "بهارات", "price": 80, "factor": 1.0, "unit": "كجم"},
    # مشروبات
    {"name": "شاي", "price": 200, "factor": 1.0, "unit": "كجم"},
    {"name": "سكر", "price": 30, "factor": 1.0, "unit": "كجم"},
    {"name": "قهوة", "price": 300, "factor": 1.0, "unit": "كجم"},
    # خضار طازج
    {"name": "خس", "price": 15, "factor": 1.0, "unit": "كجم"},
    {"name": "خيار", "price": 12, "factor": 1.0, "unit": "كجم"},
    {"name": "فلفل حار", "price": 20, "factor": 1.0, "unit": "كجم"},
    {"name": "ثوم", "price": 60, "factor": 1.0, "unit": "كجم"},
    {"name": "ليمون", "price": 20, "factor": 1.0, "unit": "كجم"},
    {"name": "ملفوف", "price": 10, "factor": 1.0, "unit": "كجم"},
    # صوصات
    {"name": "كاتشب", "price": 30, "factor": 1.0, "unit": "كجم"},
    {"name": "مايونيز", "price": 40, "factor": 1.0, "unit": "كجم"},
    # مسقعة و اطباق
    {"name": "مسقعة", "price": 40, "factor": 1.2, "unit": "كجم"},
    {"name": "مكرونة", "price": 25, "factor": 2.5, "unit": "كجم"},
    {"name": "شوفان", "price": 40, "factor": 2.0, "unit": "كجم"},
]

# Save to Supabase
req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata&select=data',
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}'})
with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())
data = result[0]['data']
if isinstance(data, str): data = json.loads(data)

data['ingredientMaster'] = ingredient_master

ts = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{datetime.datetime.now(datetime.timezone.utc).microsecond // 1000:03d}+00:00'
req = urllib.request.Request('https://cwqghiqykohefaggedjl.supabase.co/rest/v1/sync_data?id=eq.alldata',
    data=json.dumps({'data': data, 'updated_at': ts}).encode('utf-8'),
    headers={'apikey': apiKey, 'Authorization': f'Bearer {apiKey}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
    method='PATCH')
with urllib.request.urlopen(req, timeout=15) as r:
    print(f"Saved {len(ingredient_master)} ingredients to Supabase: {r.status}")
