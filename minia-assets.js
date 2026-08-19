// ============================================================
//  كشف أصول مزرعة المنيا — تسليم مزرعة الواحات
//  كيان جديد متزامن (ent:miniaAssets) في تبويب المخازن + الفورم الخارجية
//  السجلات: { id, item, desc, unit, qty, receiver, date, notes, modifiedAt }
// ============================================================
if (typeof miniaAssets === 'undefined') { window.miniaAssets = []; }
function _maLoad() {
  try { var d = localStorage.getItem('lineh_minia_assets'); if (d) miniaAssets = JSON.parse(d); } catch (e) { miniaAssets = []; }
  if (!Array.isArray(miniaAssets)) miniaAssets = [];
  _maEnsureIds();
}
function _maStableId(a) {
  var s = String((a.item || '') + '|' + (a.unit || '') + '|' + (a.qty || '') + '|' + (a.receiver || '') + '|' + (a.date || ''));
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
  return 'ma_' + h.toString(36);
}
function _maEnsureIds() {
  var changed = false;
  (miniaAssets || []).forEach(function (a) { if (a && !a.id) { a.id = _maStableId(a); changed = true; } });
  return changed;
}
function _maSave() {
  _maEnsureIds();
  try { localStorage.setItem('lineh_minia_assets', JSON.stringify(miniaAssets)); } catch (e) {}
  if (typeof syncStorage === 'function') syncStorage();
  if (typeof renderMiniaAssets === 'function' && typeof document !== 'undefined' && document.getElementById('minia-table-body')) renderMiniaAssets();
  if (typeof renderMiniaMobile === 'function') { try { renderMiniaMobile(); } catch (e) {} }
  if (typeof debouncedSyncToSupabase === 'function') debouncedSyncToSupabase();
}
function _maParseDate(v) {
  if (v === null || v === undefined || v === '') return '';
  var s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) {
    var d = new Date((parseFloat(s) - 25569) * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return s;
}
function _maCell(row, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = row[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}
function _maEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---------- بيانات الكشف المعتمد (52 صنف) ----------
var MINIA_ASSETS_SEED = [
  { item: 'تلفزيون lg 32 بوصة بالريموت', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'سرير حديد فردي 120', unit: 'عدد', qty: 4, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'سرير حديد دوبل 90', unit: 'عدد', qty: 6, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مرتبة سوست 120', unit: 'عدد', qty: 4, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مرتبة قطن 90', unit: 'عدد', qty: 12, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مخدة قطن', unit: 'عدد', qty: 16, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'دولاب صاج فردي', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'منظم غاز إيطالي', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مفتاح انبوبة غاز', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'طبق ستلايت كامل بالقاعدة', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'عدسة لاقط إشارة 4 مخرج', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'لفة سلك دش', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'صامولة توصيل', unit: 'عدد', qty: 10, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'سخان مياه كهربائي', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'منشر غسيل', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مكواة ملابس بخار', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'ترابيزة مكواة', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'كاتل شاي', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'شعلة حديد 3 عين', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'انبوبة بوتاجاز', unit: 'عدد', qty: 4, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'منظم انبوبة غاز', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'ديسبنسر مياه شرب', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'جركن مياه 20 لتر', unit: 'عدد', qty: 30, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'خلاط مطبخ 1100 وات', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'حلة مطبخ الومنيوم', unit: 'عدد', qty: 6, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'اطباق ارز استانلس ستيل', unit: 'عدد', qty: 16, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'اطباق شوربة ستانلس ستيل', unit: 'عدد', qty: 6, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'كبشة غرف ستانلس ستيل', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'ريسيفر نايل سات', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'بوتاجاز 3 عين بالفرن', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'صينية فرن مقاسات', unit: 'عدد', qty: 3, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'صينيه شاي ستانلس', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مروحة توشيبا حائط', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'اطباق خضار ستانلس', unit: 'عدد', qty: 16, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'اطباق سلطة ستانلس', unit: 'عدد', qty: 16, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'ملاعق ستانلس ستيل', unit: 'عدد', qty: 16, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مطبقيه اتانلس ستيل', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'مصفاة الومنيوم', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'طاسة تيفال', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'طاسة الومنيوم', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-10-03' },
  { item: 'فلاشة انترنت بالخط', unit: 'عدد', qty: 1, receiver: 'حسين سيد عبيد', date: '2024-09-22' },
  { item: 'ثلاجة كريازي 12 قدم 2 باب', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'غسالة ملابس نصف اتوماتيك', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'مكيف اسبليت 3 حصان', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'مرتبة طبي سوست 120', unit: 'عدد', qty: 4, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'مخدة فايبر 120', unit: 'عدد', qty: 4, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'مثبت تيار الترا 2 كيلو', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'كرسي بلاستيك', unit: 'عدد', qty: 20, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'لوحة حديد شعار شركة لينة', unit: 'عدد', qty: 3, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'شاشة lg 32 بوصة مستعملة', unit: 'عدد', qty: 1, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'ثلاجة كريازي 2 باب', unit: 'عدد', qty: 2, receiver: 'محمود حسين', date: '2024-11-07' },
  { item: 'دولاب 4 ضلفة', unit: 'عدد', qty: 1, receiver: 'احمد سلام', date: '2026-08-17' }
];

function _maSeedRecord(s) {
  var rec = { item: s.item, desc: '', unit: s.unit || 'عدد', qty: parseInt(s.qty) || 1, receiver: s.receiver || '', date: s.date || '', notes: '', modifiedAt: new Date().toISOString() };
  rec.id = _maStableId(rec);
  return rec;
}

// ---------- سكشن تبويب المخازن (سطح المكتب) ----------
var _maEditIdx = -1;
function openMiniaAssets() {
  if (typeof switchTab === 'function') switchTab('tab-inventory');
  var panel = document.getElementById('minia-panel');
  var arrow = document.getElementById('minia-arrow');
  var h3 = document.getElementById('minia-section-title');
  if (panel) panel.style.display = 'block';
  if (arrow) arrow.textContent = '▼';
  if (typeof renderMiniaAssets === 'function') renderMiniaAssets();
  var el = document.getElementById('minia-section');
  if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
}
function renderMiniaAssets() {
  var q = (document.getElementById('search-minia') ? document.getElementById('search-minia').value : '').toLowerCase();
  var filtered = (miniaAssets || []).filter(function (a) {
    return !q || (a.item || '').toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q) || (a.receiver || '').toLowerCase().includes(q) || (a.unit || '').toLowerCase().includes(q);
  });
  var tbody = document.getElementById('minia-table-body');
  if (!tbody) return;
  var items = miniaAssets.length, qty = 0;
  miniaAssets.forEach(function (a) { qty += parseInt(a.qty) || 0; });
  var receivers = {};
  miniaAssets.forEach(function (a) { if (a.receiver) receivers[a.receiver] = true; });
  var last = '';
  miniaAssets.forEach(function (a) { if (a.date && a.date > last) last = a.date; });
  var sEl = document.getElementById('ma-stat-items'); if (sEl) sEl.textContent = items;
  var qEl = document.getElementById('ma-stat-qty'); if (qEl) qEl.textContent = qty;
  var rEl = document.getElementById('ma-stat-receivers'); if (rEl) rEl.textContent = Object.keys(receivers).length;
  var lEl = document.getElementById('ma-stat-last'); if (lEl) lEl.textContent = last || '—';
  var dl = document.getElementById('ma-receivers');
  if (dl) dl.innerHTML = Object.keys(receivers).map(function (r) { return '<option value="' + _maEsc(r) + '">'; }).join('');
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">لا توجد أصول مسجلة — اضغط «📥 استيراد الكشف» أو سجل أصلاً جديداً</td></tr>'; return; }
  tbody.innerHTML = filtered.map(function (a, i) {
    var idx = miniaAssets.indexOf(a);
    return '<tr><td>' + (i + 1) + '</td><td><b>' + _maEsc(a.item) + '</b></td><td>' + _maEsc(a.desc || '') + '</td><td>' + _maEsc(a.unit || '') + '</td><td><b>' + (parseInt(a.qty) || 0) + '</b></td><td>' + _maEsc(a.receiver || '—') + '</td><td>' + _maEsc(a.date || '—') + '</td><td class="no-print"><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:2px 6px;font-size:11px;margin-left:4px;" onclick="editMiniaAsset(' + idx + ')">✏️</button><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteMiniaAsset(' + idx + ')">🗑️</button></td></tr>';
  }).join('');
}
function _maResetForm() {
  var ids = ['ma-item', 'ma-desc', 'ma-unit', 'ma-qty', 'ma-receiver', 'ma-date', 'ma-notes'];
  ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = (id === 'ma-unit') ? 'عدد' : (id === 'ma-qty') ? '1' : ''; });
  _maEditIdx = -1;
  var b = document.getElementById('btn-save-minia'); if (b) b.textContent = '➕ تسجيل أصل جديد';
  var c = document.getElementById('btn-cancel-minia'); if (c) c.style.display = 'none';
}
function saveMiniaAsset() {
  var item = (document.getElementById('ma-item').value || '').trim();
  if (!item) return alert('اكتب اسم الأصل (الصنف)');
  var desc = (document.getElementById('ma-desc').value || '').trim();
  var unit = (document.getElementById('ma-unit').value || '').trim() || 'عدد';
  var qty = parseInt(document.getElementById('ma-qty').value) || 0;
  var receiver = (document.getElementById('ma-receiver').value || '').trim();
  var date = document.getElementById('ma-date').value || '';
  var notes = (document.getElementById('ma-notes').value || '').trim();
  if (qty <= 0) return alert('ادخل كمية صحيحة (أكبر من صفر)');
  var isEdit = _maEditIdx >= 0 && !!miniaAssets[_maEditIdx];
  if (isEdit) {
    var a = miniaAssets[_maEditIdx];
    a.item = item; a.desc = desc; a.unit = unit; a.qty = qty; a.receiver = receiver; a.date = date; a.notes = notes;
    a.modifiedAt = new Date().toISOString();
  } else {
    var rec = { item: item, desc: desc, unit: unit, qty: qty, receiver: receiver, date: date, notes: notes, modifiedAt: new Date().toISOString() };
    rec.id = _maStableId(rec);
    var dup = miniaAssets.some(function (x) { return x.id === rec.id; });
    if (dup) return alert('هذا الأصل مسجل بالفعل (نفس الصنف والكمية والمستلم والتاريخ)');
    miniaAssets.push(rec);
    if (typeof logAction === 'function') { try { logAction('تسجيل', 'أصل', item, 'كشف أصول المنيا'); } catch (e) {} }
  }
  _maSave();
  _maResetForm();
  alert('تم ' + (isEdit ? 'تعديل' : 'تسجيل') + ' الأصل «' + item + '» ✅');
}
function editMiniaAsset(idx) {
  var a = miniaAssets[idx];
  if (!a) return;
  _maEditIdx = idx;
  function sv(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? '' : v; }
  sv('ma-item', a.item); sv('ma-desc', a.desc); sv('ma-unit', a.unit); sv('ma-qty', a.qty); sv('ma-receiver', a.receiver); sv('ma-date', a.date); sv('ma-notes', a.notes);
  var b = document.getElementById('btn-save-minia'); if (b) b.textContent = '💾 حفظ التعديلات';
  var c = document.getElementById('btn-cancel-minia'); if (c) c.style.display = 'block';
  var el = document.getElementById('ma-item'); if (el) el.focus();
}
function cancelMiniaEdit() { _maResetForm(); }
function deleteMiniaAsset(idx) {
  var a = miniaAssets[idx];
  if (!a) return;
  if (typeof requireAdmin === 'function' && !requireAdmin()) return;
  if (!confirm('حذف الأصل «' + a.item + '» من كشف أصول المنيا؟')) return;
  if (typeof _logDeletion === 'function') _logDeletion('miniaAssets', a.id || _maStableId(a));
  miniaAssets.splice(idx, 1);
  _maSave();
  if (_maEditIdx === idx) _maResetForm();
}

// ---------- الاستيراد من Excel ----------
function importMiniaAssetsExcel(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json || !json.length) return alert('الملف فارغ أو لا يحتوي على بيانات صالحة.');
      var added = 0, skipped = 0, updated = 0;
      json.forEach(function (row) {
        var item = String(_maCell(row, ['الصنف', 'اسم البند', 'البند', 'الصنف', 'الاسم', 'item', 'Item', 'ITEM'])).trim();
        if (!item) return;
        if (/^(م |رقم|اسم|أو|كشف|تسليم)/.test(item)) { if (isNaN(parseInt(_maCell(row, ['الكمية', 'العدد'])))) return; }
        var unit = String(_maCell(row, ['الوحدة', 'unit', 'Unit'])).trim() || 'عدد';
        var qtyRaw = String(_maCell(row, ['الكمية', 'العدد', 'كمية', 'qty', 'Qty', 'QTY'])).trim();
        if (qtyRaw === '__' || qtyRaw === '') qtyRaw = '1';
        var qty = parseInt(qtyRaw) || 1;
        var receiver = String(_maCell(row, ['المستلم', 'receiver', 'Receiver', 'المسلم'])).trim();
        var date = _maParseDate(_maCell(row, ['التاريخ', 'تاريخ', 'date', 'Date']));
        var desc = String(_maCell(row, ['البيان', 'ملاحظات', 'notes', 'Notes', 'الحالة'])).trim();
        var rec = { item: item, desc: desc, unit: unit, qty: qty, receiver: receiver, date: date, notes: '', modifiedAt: new Date().toISOString() };
        var id = _maStableId(rec);
        var existing = miniaAssets.find(function (x) { return x.id === id; });
        if (existing) {
          existing.item = item; existing.desc = desc || existing.desc; existing.unit = unit; existing.qty = qty;
          existing.receiver = receiver || existing.receiver; existing.date = date || existing.date;
          existing.modifiedAt = new Date().toISOString();
          updated++;
        } else {
          rec.id = id;
          miniaAssets.push(rec);
          added++;
        }
      });
      _maSave();
      _maResetForm();
      alert('تم الاستيراد: ' + added + ' أصل جديد' + (updated ? '، تحديث ' + updated : '') + (skipped ? '، تخطي ' + skipped : '') + '.');
    } catch (err) { alert('فشل الاستيراد: ' + err.message); }
    evt.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}
function importMiniaAssetsSeed() {
  if (!confirm('إضافة كشف أصول مزرعة المنيا المعتمد (52 صنف) إلى السجلات؟ سيتم تخطي المكرر.')) return;
  var added = 0, skipped = 0;
  MINIA_ASSETS_SEED.forEach(function (s) {
    var rec = _maSeedRecord(s);
    if (miniaAssets.some(function (x) { return x.id === rec.id; })) { skipped++; return; }
    miniaAssets.push(rec);
    added++;
  });
  _maSave();
  _maResetForm();
  alert(added > 0 ? ('تمت إضافة ' + added + ' أصل' + (skipped ? ' (تخطي ' + skipped + ' موجود مسبقاً)' : '') + ' ✅') : 'جميع أصول الكشف موجودة بالفعل (' + skipped + ').');
}

// ---------- التصدير والطباعة ----------
function exportMiniaAssetsExcel() {
  if (!miniaAssets.length) return alert('لا توجد أصول للتصدير');
  var rows = [['م', 'الصنف', 'البيان', 'الوحدة', 'الكمية', 'المستلم', 'التاريخ']];
  miniaAssets.forEach(function (a, i) {
    rows.push([i + 1, a.item || '', a.desc || '', a.unit || '', parseInt(a.qty) || 0, a.receiver || '', a.date || '']);
  });
  try {
    if (typeof ExcelStyle !== 'undefined' && typeof ExcelStyle.makeSheet === 'function') {
      var sws = ExcelStyle.makeSheet(rows, { filter: true, freeze: 1 });
      var swb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(swb, sws, 'كشف أصول المنيا');
      XLSX.writeFile(swb, 'كشف_أصول_المنيا.xlsx');
      return;
    }
  } catch (e) {}
  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'كشف أصول المنيا');
  XLSX.writeFile(wb, 'كشف_أصول_المنيا.xlsx');
}
function printMiniaAssets() {
  if (typeof showPrintChoice === 'function') { showPrintChoice('table-minia'); return; }
  if (!miniaAssets.length) return alert('لا توجد أصول للطباعة');
  var w = window.open('', '_blank');
  var rows = miniaAssets.map(function (a, i) {
    return '<tr><td>' + (i + 1) + '</td><td>' + _maEsc(a.item) + '</td><td>' + _maEsc(a.desc || '') + '</td><td>' + _maEsc(a.unit || '') + '</td><td>' + (parseInt(a.qty) || 0) + '</td><td>' + _maEsc(a.receiver || '—') + '</td><td>' + _maEsc(a.date || '—') + '</td></tr>';
  }).join('');
  w.document.write('<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>كشف أصول مزرعة المنيا</title><style>body{font-family:Cairo,Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 10px;font-size:13px;text-align:center}th{background:#1b5e20;color:#fff}h2{text-align:center;color:#1b5e20}h4{text-align:center}</style></head><body><h2>كشف أصول خاصة بمزرعة المنيا</h2><h4>تم تسليمها عن طريق مزرعة الواحات</h4><table><thead><tr><th>م</th><th>الصنف</th><th>البيان</th><th>الوحدة</th><th>الكمية</th><th>المستلم</th><th>التاريخ</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>');
  w.document.close();
  w.focus();
  w.print();
}

// ---------- الفورم الخارجية (daily-data.html) ----------
function renderMiniaMobile() {
  var list = document.getElementById('dd-minia-list');
  var dl = document.getElementById('dd-ma-receivers');
  if (!list) return;
  var receivers = {};
  miniaAssets.forEach(function (a) { if (a.receiver) receivers[a.receiver] = true; });
  if (dl) dl.innerHTML = Object.keys(receivers).map(function (r) { return '<option value="' + _maEsc(r) + '">'; }).join('');
  if (!miniaAssets.length) { list.innerHTML = '<div style="padding:14px;text-align:center;color:#999;font-size:13px;">لا توجد أصول مسجلة</div>'; return; }
  list.innerHTML = miniaAssets.map(function (a, i) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;"><span><b>' + _maEsc(a.item) + '</b><br><small style="color:#888;">x' + (parseInt(a.qty) || 0) + ' ' + _maEsc(a.unit || '') + (a.receiver ? ' — ' + _maEsc(a.receiver) : '') + (a.date ? ' — ' + _maEsc(a.date) : '') + '</small></span><span><button type="button" style="background:#757575;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-family:Cairo,sans-serif;font-size:11px;cursor:pointer;margin-left:4px;" onclick="deleteMiniaMobile(' + i + ')">🗑️</button></span></div>';
  }).join('');
}
function addMiniaMobile() {
  var item = (document.getElementById('dd-ma-item').value || '').trim();
  if (!item) { showMsg('اكتب اسم الأصل.', true); return; }
  var qty = parseInt(document.getElementById('dd-ma-qty').value) || 0;
  if (qty <= 0) { showMsg('ادخل كمية صحيحة.', true); return; }
  var unit = (document.getElementById('dd-ma-unit').value || '').trim() || 'عدد';
  var receiver = (document.getElementById('dd-ma-receiver').value || '').trim();
  var date = document.getElementById('dd-ma-date').value || '';
  var rec = { item: item, desc: '', unit: unit, qty: qty, receiver: receiver, date: date, notes: '', modifiedAt: new Date().toISOString() };
  rec.id = _maStableId(rec);
  if (miniaAssets.some(function (x) { return x.id === rec.id; })) { showMsg('هذا الأصل مسجل بالفعل.', true); return; }
  miniaAssets.push(rec);
  _maSave();
  document.getElementById('dd-ma-item').value = ''; document.getElementById('dd-ma-qty').value = 1;
  document.getElementById('dd-ma-unit').value = 'عدد'; document.getElementById('dd-ma-receiver').value = ''; document.getElementById('dd-ma-date').value = '';
  showMsg('✅ تم تسجيل الأصل «' + item + '» (' + qty + ')', false);
}
function deleteMiniaMobile(idx) {
  var a = miniaAssets[idx];
  if (!a) return;
  if (!confirm('حذف الأصل «' + a.item + '»؟')) return;
  if (typeof _logDeletion === 'function') _logDeletion('miniaAssets', a.id || _maStableId(a));
  miniaAssets.splice(idx, 1);
  _maSave();
  showMsg('🗑️ تم حذف «' + a.item + '»', false);
}

// ---------- ترقيّة معرّفات للبيانات الواردة من السحابة ----------
function _maBackfillIds() {
  var changed = _maEnsureIds();
  if (changed) {
    try { localStorage.setItem('lineh_minia_assets', JSON.stringify(miniaAssets)); } catch (e) {}
    if (typeof syncStorage === 'function') syncStorage();
  }
  return changed;
}

_maLoad();
if (typeof window.addEventListener === 'function') {
  window.addEventListener('load', function () {
    _maBackfillIds();
    if (document.getElementById('minia-table-body')) renderMiniaAssets();
    if (document.getElementById('dd-minia-list')) { try { renderMiniaMobile(); } catch (e) {} }
  });
}