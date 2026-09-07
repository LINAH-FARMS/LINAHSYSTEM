import requests, json, sys, re, argparse
from datetime import datetime
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8'
REPORTS = r'C:\Users\Salem Magdy\Desktop\LINAHSYSTEM\reports'

H = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}

def get_row(rid):
    r = requests.get(SUPABASE_URL + '/rest/v1/sync_data', params={'id': 'eq.' + rid, 'select': 'data,updated_at'}, headers=H, timeout=60)
    j = r.json()
    if not isinstance(j, list) or not j:
        return None
    raw = j[0].get('data')
    return json.loads(raw) if isinstance(raw, str) else raw

def patch_row(rid, data):
    r = requests.patch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.' + rid,
        json={'data': data, 'updated_at': datetime.now().isoformat()},
        headers={**H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}, timeout=60)
    return r.status_code

def nn(s):
    if s is None: return ''
    return re.sub(r'\s+', ' ', str(s).replace('\u200f', '').replace('\u200e', '').strip())

def nd(s):
    if s is None: return ''
    return str(s).replace('\u200f', '').replace('\u200e', '').strip()[:10]

def row_key(r):
    return (r.get('name', '') or '') + '|' + nd(r.get('date')) + '|' + str(r.get('count', '') or '')

def choose_keep(group):
    def rank(r):
        paid = float(r.get('paid') or 0)
        resp = 1 if (r.get('responsible') or '').strip() else 0
        cnt = int(r.get('count') or 0)
        ids = 0
        try: ids = int(r.get('id', '0').replace('CTR', '')) if r.get('id') else 0
        except Exception: ids = 0
        return (-cnt, -paid, -resp, ids)
    return min(group, key=rank)

def dedup_array(arr):
    groups = defaultdict(list)
    for r in arr:
        if isinstance(r, dict) and (r.get('name') or '').strip():
            groups[(nn(r.get('name')), nd(r.get('date')))].append(r)
    kept_list = []
    removed = []
    for gk, items in groups.items():
        keep = choose_keep(items)
        kept_list.append(keep)
        for r in items:
            if r is keep: continue
            removed.append({'removed': r, 'kept': keep, 'same_value': row_key(r) == row_key(keep)})
    kept_dates = [r for r in arr if not (isinstance(r, dict) and (r.get('name') or '').strip())]
    kept_dates.extend(kept_list)
    return kept_dates, removed

parser = argparse.ArgumentParser()
parser.add_argument('--commit', action='store_true')
args = parser.parse_args()

alldata = get_row('alldata')
ent = get_row('ent:bakeryContractorSupplies')
plain = get_row('bakeryContractorSupplies')
entity_legacy = get_row('entity_bakeryContractorSupplies') or []
del_ent = get_row('ent:syncDeletions') or []
del_plain = get_row('syncDeletions') or []
del_legacy = get_row('entity_syncDeletions') or []

print(f'سحب: alldata={len(alldata and alldata.get("bakeryContractorSupplies") or [])} ent={len(ent)} plain={len(plain)} entity_legacy={len(entity_legacy)}')
print(f'      syncDeletions: ent={len(del_ent)} plain={len(del_plain)} legacy={len(del_legacy)}')

backup = {
    'generated_at': datetime.now().isoformat(),
    'alldata': alldata,
    'ent:bakeryContractorSupplies': ent,
    'bakeryContractorSupplies': plain,
    'entity_bakeryContractorSupplies': entity_legacy,
    'ent:syncDeletions': del_ent,
    'syncDeletions': del_plain,
    'entity_syncDeletions': del_legacy,
}
bak = REPORTS + r'\cloud_backup_before_dup_cleanup.json'
with open(bak, 'w', encoding='utf-8') as f:
    json.dump(backup, f, ensure_ascii=False, indent=2)
print('[حفظ] نسخة احتياطية -> ' + bak)

new_alldata_ctr, rem_ald = dedup_array(alldata.get('bakeryContractorSupplies') or [])
new_ent, rem_ent = dedup_array(ent)
new_plain, rem_plain = dedup_array(plain)
new_legacy, rem_legacy = dedup_array(entity_legacy)

total_removed = len(rem_ald) + len(rem_ent) + len(rem_plain) + len(rem_legacy)

# مفاتيح الحذف: فقط السجلات المكتوبة قيمتها مختلفة عن المحفوظ (غير مطابقة في name|date|count)
del_keys = {}
for rm in rem_ald + rem_ent + rem_plain + rem_legacy:
    if not rm['same_value']:
        del_keys[row_key(rm['removed'])] = rm['removed']
del_keys = {k: v for k, v in sorted(del_keys.items())}

print(f'\nإجمالي سجلات مرشحة للحذف: {total_removed}')
print(f'  - قيم مكررة متطابقة (لا تحتاج syncDeletion): {total_removed - len(del_keys)}')
print(f'  - قيم مختلفة (الأصغر سيُحذف ويُسجَّل): {len(del_keys)}')
for k, v in del_keys.items():
    print(f'    DEL {k}  (respons=%r paid=%r)' % (v.get('responsible'), v.get('paid')))

print(f'\nبعد التنظيف: alldata={len(new_alldata_ctr)} ent={len(new_ent)} plain={len(new_plain)} legacy={len(new_legacy)}')

if not args.commit:
    print('\n[DRY RUN] لا تغيير على السحابة. أعد التشغيل بـ --commit للتنفيذ.')
    sys.exit(0)

# تحديث صفوف الحذف
def merge_del(old, new_keys):
    seen = set()
    out = []
    for d in old:
        if isinstance(d, dict):
            k = f"{d.get('entity', '')}|{d.get('key', '')}"
            if k in seen: continue
            seen.add(k)
            out.append(d)
    for k in new_keys:
        full = 'bakeryContractorSupplies|' + k
        if full in seen: continue
        seen.add(full)
        out.append({'entity': 'bakeryContractorSupplies', 'key': k, 'deletedAt': datetime.now().isoformat()})
    return out

nd_ent = merge_del(del_ent, del_keys.keys())
nd_plain = merge_del(del_plain, del_keys.keys())
nd_legacy = merge_del(del_legacy, del_keys.keys())

print('\n[الكتابة للسحابة]')
for rid, newdata in (
    ('ent:bakeryContractorSupplies', new_ent),
    ('bakeryContractorSupplies', new_plain),
    ('entity_bakeryContractorSupplies', new_legacy),
):
    code = patch_row(rid, newdata)
    print(f'  PATCH {rid}: {code} -> {len(newdata)}')

if alldata is not None:
    alldata['bakeryContractorSupplies'] = new_alldata_ctr
    if del_keys:
        cur = alldata.get('syncDeletions') or []
        alldata['syncDeletions'] = merge_del(cur, del_keys.keys())
    code = patch_row('alldata', alldata)
    print(f'  PATCH alldata: {code} (bakeryContractorSupplies={len(new_alldata_ctr)}, syncDeletions={len(alldata.get("syncDeletions") or [])})')

for rid, newdata in (
    ('ent:syncDeletions', nd_ent),
    ('syncDeletions', nd_plain),
    ('entity_syncDeletions', nd_legacy),
):
    code = patch_row(rid, newdata)
    print(f'  PATCH {rid}: {code} -> {len(newdata)}')

# تحقق
v_ald = get_row('alldata').get('bakeryContractorSupplies') or []
v_ent = get_row('ent:bakeryContractorSupplies') or []
v_plain = get_row('bakeryContractorSupplies') or []

def count_dup(arr):
    g = defaultdict(int)
    for r in arr:
        if isinstance(r, dict) and (r.get('name') or '').strip():
            g[(nn(r.get('name')), nd(r.get('date')))] += 1
    return {k: v for k, v in g.items() if v > 1}

print('\n[تحقق]')
for lbl, arr in (('alldata', v_ald), ('ent:bakeryContractorSupplies', v_ent), ('bakeryContractorSupplies', v_plain)):
    d = count_dup(arr)
    print(f'  {lbl}: {len(arr)} سجل | تكرارات متبقية (اسم,يوم): {len(d)}')
    if d:
        for k in list(d)[:10]:
            print('     باقي:', k, d[k])

# تحقق احترام قاعدة "القيمة الأكبر"
kept_bigger = True
for arr in (v_ald, v_ent, v_plain):
    g = defaultdict(list)
    for r in arr:
        if isinstance(r, dict) and (r.get('name') or '').strip():
            g[(nn(r.get('name')), nd(r.get('date')))].append(r)
    out = []
    for k, items in g.items():
        if len(items) > 1:
            out.append((k, [it.get('count') for it in items]))
    if out:
        print('  ⚠ قاعدة "سجل واحد/يوم" مكسورة:', out[:5])
        kept_bigger = False
print('  ✔ كل مقاول مرة واحدة في اليوم بقيمة أكبر' if kept_bigger else '')

res = {
    'generated_at': datetime.now().isoformat(),
    'removed_total': total_removed,
    'same_value_dups': total_removed - len(del_keys),
    'diff_value_removed': len(del_keys),
    'deletion_keys': sorted(del_keys.keys()),
    'after_counts': {'alldata': len(v_ald), 'ent': len(v_ent), 'plain': len(v_plain)},
}
with open(REPORTS + r'\dup_cleanup_result.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=2)
print('\n[تم] النتيجة محفوظة في reports/dup_cleanup_result.json')