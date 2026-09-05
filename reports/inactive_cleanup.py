import requests, json, sys
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'

def norm_date(s):
    if not s or not isinstance(s, str): return s or ''
    return s.strip()[:10]

def get_row(rid):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/sync_data', params={'id': 'eq.' + rid}, headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}, timeout=20)
    j = r.json()
    if isinstance(j, list) and len(j) > 0:
        raw = j[0].get('data')
        return json.loads(raw) if isinstance(raw, str) else raw
    return []

def patch_row(rid, data):
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/sync_data?id=eq.' + rid,
        json={'data': data, 'updated_at': datetime.now().isoformat()},
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}, timeout=25)
    return r.status_code

CUTOFF = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
print(f'[cutoff النشاط] {CUTOFF}')

ent = get_row('ent:bakeryContractorSupplies')
plain = get_row('bakeryContractorSupplies')
del_ent = get_row('ent:syncDeletions')
del_plain = get_row('syncDeletions')
print(f'سحب: ent={len(ent)} plain={len(plain)} del_ent={len(del_ent)} del_plain={len(del_plain)}')

# نسخة احتياطية قبل أي تعديل
backup = {
    'generated_at': datetime.now().isoformat(),
    'cutoff': CUTOFF,
    'ent:bakeryContractorSupplies': ent,
    'bakeryContractorSupplies': plain,
    'ent:syncDeletions': del_ent,
    'syncDeletions': del_plain,
}
bak_path = r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports\cloud_backup_before_inactive_cleanup.json'
with open(bak_path, 'w', encoding='utf-8') as f:
    json.dump(backup, f, ensure_ascii=False, indent=2)
print(f'[حفظ] نسخة احتياطية → {bak_path}')

# تحديد النشطين خلال آخر 30 يوم على الصفين معًا (بدون تكرار)
merged = {}
for arr in (ent, plain):
    for x in arr:
        if not isinstance(x, dict): continue
        k = f"{x.get('name','')}|{x.get('date','')}|{x.get('count','')}|{x.get('price','')}"
        merged[k] = x
active = set()
for x in merged.values():
    d = norm_date(str(x.get('date','')))
    if d and d >= CUTOFF and x.get('name'):
        active.add(x.get('name'))

def filter_row(arr, deleted_keys):
    kept = []
    for x in arr:
        if not isinstance(x, dict) or not x.get('name') or x.get('name') in active:
            kept.append(x)
        else:
            deleted_keys.add(f"{x.get('name','')}|{x.get('date','')}|{x.get('count','')}")
            deleted_keys.add(f"{x.get('name','')}|{norm_date(str(x.get('date','')))}|{x.get('count','')}")
    return kept

removed = set()
new_ent = filter_row(ent, removed)
new_plain = filter_row(plain, removed)
print(f'مفاتيح حذف ستُسجّل: {len(removed)}')

# تحديث syncDeletions بإضافة مفاتيح جديدة (بدون تكرار)
def merge_del(old, new_keys):
    seen = set()
    out = []
    for d in old:
        if isinstance(d, dict):
            k = f"{d.get('entity','')}|{d.get('key','')}"
            if k in seen: continue
            seen.add(k)
            out.append(d)
    for k in sorted(new_keys):
        e, _, key = k.partition('|')
        # key الحقيقي (بعد الجزء الأول) محفوظ؛ نبني كائن {entity, key} بالمفتاح كامل
        kk = k
        skey = kk
        full = f"bakeryContractorSupplies|{skey}"
        if full in seen: continue
        seen.add(full)
        out.append({'entity': 'bakeryContractorSupplies', 'key': skey})
    return out

new_del_ent = merge_del(del_ent, removed)
new_del_plain = merge_del(del_plain, removed)

print('\n[الكتابة للسحابة]')
for rid, newdata in (('ent:bakeryContractorSupplies', new_ent),
                     ('bakeryContractorSupplies', new_plain)):
    code = patch_row(rid, newdata)
    print(f'  PATCH {rid}: status={code} -> {len(newdata)}')
for rid, newdata in (('ent:syncDeletions', new_del_ent),
                     ('syncDeletions', new_del_plain)):
    code = patch_row(rid, newdata)
    print(f'  PATCH {rid}: status={code} -> {len(newdata)}')

# تحقق
v_ent = get_row('ent:bakeryContractorSupplies')
v_plain = get_row('bakeryContractorSupplies')
rem_after = [x['name'] for x in v_ent if isinstance(x, dict) and x.get('name') and x['name'] not in active]
rem_after += [x['name'] for x in v_plain if isinstance(x, dict) and x.get('name') and x['name'] not in active]
print(f'\n[تحقق] ent={len(v_ent)} plain={len(v_plain)} | باقي سجلات غير نشطة: {len(rem_after)}')
if rem_after:
    print('  متبقٍ:', sorted(set(rem_after)))
else:
    print('  ✔ تم مسح كل سجلات المقاولين غير النشطين')

summary = {'removed_keys': sorted(removed), 'active_kept': sorted(active)}
with open(r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports\inactive_cleanup_result.json', 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
print('[تم] النتيجة محفوظة في reports/inactive_cleanup_result.json')