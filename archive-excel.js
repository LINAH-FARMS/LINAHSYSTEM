// ============================================================
//  تصدير احترافي شامل لأرشيف المخازن (الشئون الإدارية)
//  5 شيتات: ملخص + وارد + صادر + المخزون الحالي + إدارة المخازن
//  يستخدم ExcelStyle (ترويسة خضراء، فلتر، تجميد، عرض تلقائي)
// ============================================================
function exportArchiveExcelFull() {
  if (typeof XLSX === 'undefined' || typeof ExcelStyle === 'undefined') { alert('⚠️ مكتبة XLSX أو ExcelStyle غير متاحة'); return; }
  if (!archiveData || !archiveData.length) return alert('لا توجد عهدات للتصدير');
  var wb = XLSX.utils.book_new();
  var todayAr = new Date().toLocaleDateString('ar-EG');
  var dateFile = new Date().toISOString().split('T')[0];

  var _c = function(s) { return String(s == null ? '' : s).replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\u066A-\u066D\u066E-\u06FF\s]/g, '').trim(); };
  var _cl = function(s) { return String(s == null ? '' : s).trim(); };
  var _arcRem = function(a) { return Math.max(0, (parseInt(a.qty) || 0) - (parseInt(a.issuedQty) || 0)); };
  var _arcIssued = function(a) { return (a.issuedate && a.issuedate.trim()) || (a.issueto && a.issueto.trim()); };
  var _issueStatus = function(a) {
    if (!_arcIssued(a)) return 'متاح';
    var rem = _arcRem(a);
    if (rem <= 0) return 'مصروف بالكامل';
    return 'صرف جزئي (متبقي ' + rem + ')';
  };

  // ── إحصائيات عامة ──
  var inItems = 0, inQty = 0, outCount = 0, outQty = 0, avail = 0;
  archiveData.forEach(function(a) {
    if (!a) return;
    inItems++;
    inQty += parseInt(a.qty) || 0;
    avail += _arcRem(a);
    if (_arcIssued(a)) { outCount++; outQty += parseInt(a.issuedQty) || 0; }
  });

  // ── المخازن (اتحاد dynamicStores + المواقع في البيانات) ──
  var stores = [], seen = {};
  (dynamicStores || []).forEach(function(s) { var t = _cl(s); if (t && !seen[t]) { seen[t] = true; stores.push(t); } });
  archiveData.forEach(function(a) { var t = _cl(a && a.location); if (t && !seen[t]) { seen[t] = true; stores.push(t); } });
  var storeRows = stores.map(function(s) {
    var c0 = 0, q0 = 0, out = 0, rem = 0;
    archiveData.forEach(function(a) { if (!a || _cl(a.location) !== s) return; c0++; q0 += parseInt(a.qty) || 0; out += parseInt(a.issuedQty) || 0; rem += _arcRem(a); });
    return [s, c0, q0, out, rem];
  }).sort(function(x, y) { return x[0].localeCompare(y[0], 'ar'); });

  // ── المخزون الحالي (تجميع صنف|مخزن) ──
  var groups = {};
  archiveData.forEach(function(a) {
    if (!a) return;
    var k = _cl(a.item) + '|' + _cl(a.location);
    if (!groups[k]) groups[k] = { item: _cl(a.item), location: _cl(a.location), inQty: 0, outQty: 0 };
    groups[k].inQty += parseInt(a.qty) || 0;
    groups[k].outQty += parseInt(a.issuedQty) || 0;
  });
  var stockRows = Object.keys(groups).map(function(k) { return groups[k]; });
  var low = 0, empty = 0;
  stockRows.forEach(function(g) { g.rem = Math.max(0, g.inQty - g.outQty); if (g.rem <= 0) empty++; else if (g.rem <= 3) low++; });
  stockRows.sort(function(a, b) { return (b.rem - a.rem) || (a.item || '').localeCompare(b.item || '', 'ar'); });

  // ── Sheet 1: ملخص ──
  var s1 = [];
  s1.push(['لينه فارمز — أرشيف المخازن (الشئون الإدارية)', '', '', '', '']);
  s1.push(['تاريخ التقرير: ' + todayAr, '', '', '', '']);
  s1.push([]);
  s1.push(['إجمالي العهدات (وارد)', inItems, '', '', '']);
  s1.push(['إجمالي الكميات الواردة', inQty, '', '', '']);
  s1.push(['عدد حركات الصرف', outCount, '', '', '']);
  s1.push(['إجمالي الكميات المصروفة', outQty, '', '', '']);
  s1.push(['المتاح للصرف حالياً', avail, '', '', '']);
  s1.push(['عدد المخازن', stores.length, '', '', '']);
  s1.push(['أصناف منخفضة (≤3)', low, '', '', '']);
  s1.push(['أصناف نافدة', empty, '', '', '']);
  s1.push([]);
  s1.push(['ملخص المخازن', '', '', '', '']);
  s1.push(['المخزن', 'عدد العهدات', 'إجمالي الوارد', 'إجمالي الصادر', 'المتبقي']);
  storeRows.forEach(function(r) { s1.push([r[0], r[1], r[2], r[3], r[4]]); });
  var ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 12, c: 0 }, e: { r: 12, c: 4 } }];
  ExcelStyle.styleTitleRow(ws1, 0);
  ExcelStyle.styleHeaderRow(ws1, 13, 5);
  s1.forEach(function(r, i) {
    if (r && r.length === 1) return;
    if (r && r[0] === 'ملخص المخازن') {
      var addr = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (ws1[addr]) ws1[addr].s = ExcelStyle.titleStyle();
    }
  });
  ExcelStyle.autoColWidth(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, 'ملخص');

  // ── Sheet 2: وارد (كل العهدات) ──
  var s2 = [['اسم العهدة', 'البيان', 'العدد الوارد', 'المخزن', 'الحالة', 'تاريخ الوارد', 'حالة الصرف']];
  archiveData.forEach(function(a) {
    if (!a) return;
    s2.push([_c(a.item), _c(a.desc), parseInt(a.qty) || 0, _cl(a.location), _cl(a.condition) || '—', _cl(a.date) || '—', _issueStatus(a)]);
  });
  var ws2 = ExcelStyle.makeSheet(s2, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws2, 'وارد');

  // ── Sheet 3: صادر ──
  var s3 = [['اسم العهدة', 'العدد المصروف', 'المخزن', 'جهة الصرف', 'تاريخ الصرف', 'القائم على الصرف', 'المستلم']];
  archiveData.filter(function(a) { return a && _arcIssued(a); }).forEach(function(a) {
    s3.push([_c(a.item), parseInt(a.issuedQty) || 0, _cl(a.location), _c(a.issueto), _cl(a.issuedate) || '—', _c(a.issueby) || '—', _c(a.receiver) || '—']);
  });
  var ws3 = ExcelStyle.makeSheet(s3, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws3, 'صادر');

  // ── Sheet 4: المخزون الحالي ──
  var s4 = [['اسم الصنف', 'المخزن', 'إجمالي الوارد', 'إجمالي الصادر', 'المتبقي الحالي', 'الحالة']];
  stockRows.forEach(function(g) {
    var badge = g.rem <= 0 ? 'نافد' : (g.rem <= 3 ? 'منخفض' : 'متوفر');
    s4.push([g.item, g.location, g.inQty, g.outQty, g.rem, badge]);
  });
  var ws4 = ExcelStyle.makeSheet(s4, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws4, 'المخزون الحالي');

  // ── Sheet 5: إدارة المخازن ──
  var s5 = [['اسم المخزن', 'عدد العهدات', 'إجمالي الكميات', 'إجمالي الصادر', 'المتبقي']];
  storeRows.forEach(function(r) { s5.push([r[0], r[1], r[2], r[3], r[4]]); });
  var ws5 = ExcelStyle.makeSheet(s5, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws5, 'المخازن');

  XLSX.writeFile(wb, 'ارشيف_المخازن_' + dateFile + '.xlsx');
  if (typeof logAction === 'function') { try { logAction('تصدير', 'أرشيف المخازن', 'Excel شامل', 'الشئون الإدارية'); } catch (e) {} }
}