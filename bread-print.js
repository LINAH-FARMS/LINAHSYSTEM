function printBreadStatement() {
  var fromDate = document.getElementById('filt-ctr-from')?.value || '';
  var toDate = document.getElementById('filt-ctr-to')?.value || '';
  if (!fromDate || !toDate) { alert('⚠️ حدد الفترة أولاً (من تاريخ — إلى تاريخ) من الفلاتر أعلاه'); return; }
  if (!_selectedContractors || _selectedContractors.length === 0) { alert('⚠️ اختر مقاولاً واحداً على الأقل من فلتر المقاولين'); return; }

  var records = bakeryContractorSupplies.filter(function(r) {
    return r.date >= fromDate && r.date <= toDate && _selectedContractors.indexOf(r.name) !== -1;
  });
  if (!records.length) { alert('⚠️ لا توجد توريدات للمقاولين المختارين في هذه الفترة'); return; }

  records.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  var isLandscape = confirm('اختر اتجاه الطباعة:\n\nOK ← أفقي (Landscape)\nCancel ← عمودي (Portrait)');
  var orientation = isLandscape ? 'landscape' : 'portrait';

  var grouped = {};
  records.forEach(function(r) {
    if (!grouped[r.name]) grouped[r.name] = [];
    grouped[r.name].push(r);
  });

  var logoSrc = '';
  var logoEl = document.querySelector('img[alt="Logo"]');
  if (logoEl) logoSrc = logoEl.src;

  var invDate = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

  var tableRows = '', grandTotalLoaves = 0, grandTotalRevenue = 0, grandTotalPaid = 0;
  var ctrNames = Object.keys(grouped);

  ctrNames.forEach(function(ctrName) {
    var items = grouped[ctrName];
    var ctrTotalLoaves = 0, ctrTotalRevenue = 0, ctrTotalPaid = 0;

    items.forEach(function(r) {
      ctrTotalLoaves += r.count || 0;
      ctrTotalRevenue += (r.count || 0) * (r.price || 0);
      ctrTotalPaid += parseFloat(r.paid) || 0;
    });

    grandTotalLoaves += ctrTotalLoaves;
    grandTotalRevenue += ctrTotalRevenue;
    grandTotalPaid += ctrTotalPaid;

    tableRows += '<tr class="ctr-group"><td colspan="8" class="ctr-header">' + ctrName + '</td></tr>';

    items.forEach(function(r, i) {
      var rev = (r.count || 0) * (r.price || 0);
      var paid = parseFloat(r.paid) || 0;
      var rem = rev - paid;
      tableRows += '<tr>' +
        '<td class="c">' + (i + 1) + '</td>' +
        '<td class="c">' + r.date + '</td>' +
        '<td class="c b">' + r.count + '</td>' +
        '<td class="c">' + parseFloat(r.price || 0).toFixed(2) + '</td>' +
        '<td class="c b">' + rev.toFixed(2) + '</td>' +
        '<td class="c">' + paid.toFixed(2) + '</td>' +
        '<td class="c">' + rem.toFixed(2) + '</td>' +
        '<td class="c">' + (r.responsible || '—') + '</td>' +
      '</tr>';
    });

    var ctrRem = ctrTotalRevenue - ctrTotalPaid;
    tableRows += '<tr class="ctr-subtotal">' +
      '<td class="c b" colspan="2">إجمالي ' + ctrName + '</td>' +
      '<td class="c b">' + ctrTotalLoaves + '</td>' +
      '<td></td>' +
      '<td class="c b">' + ctrTotalRevenue.toFixed(2) + '</td>' +
      '<td class="c b">' + ctrTotalPaid.toFixed(2) + '</td>' +
      '<td class="c b">' + ctrRem.toFixed(2) + '</td>' +
      '<td></td></tr>';
  });

  var grandRem = grandTotalRevenue - grandTotalPaid;

  var w = window.open('', '_blank');
  var pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>بيان توريد خبز — LINAHSYSTEM</title>' +
    '<style>' +
      '@page{size:' + pageSize + ';margin:8mm 10mm;}' +
      'body{font-family:Cairo,"Traditional Arabic","Segoe UI",sans-serif;padding:0;margin:0;color:#333;}' +
      '.page{width:100%;max-width:100%;box-sizing:border-box;padding:5px 0;}' +
      '.logo-section{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #1b5e20;padding-bottom:6px;margin-bottom:8px;}' +
      '.logo-section .right{display:flex;align-items:center;gap:8px;}' +
      '.logo-section .right img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #1b5e20;padding:2px;}' +
      '.logo-section .right .co-name{font-weight:900;color:#1b5e20;font-size:15px;line-height:1.3;}' +
      '.logo-section .right .co-sub{font-size:10px;color:#888;}' +
      '.logo-section .badge{background:#1b5e20;color:#fff;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;}' +
      '.title{text-align:center;font-size:20px;font-weight:900;color:#1b5e20;margin:4px 0 8px;letter-spacing:1px;}' +
      '.meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:8px;padding:6px 10px;background:#f5f5f5;border-radius:4px;font-size:11px;}' +
      '.meta-item{text-align:center;}' +
      '.meta-label{display:block;color:#888;font-size:10px;}' +
      '.meta-val{font-weight:700;color:#333;font-size:12px;}' +
      'table{width:100%;border-collapse:collapse;font-size:10px;margin:6px 0;}' +
      'thead th{background:#1b5e20;color:#fff;padding:4px 3px;border:1px solid #1b5e20;text-align:center;font-size:10px;}' +
      'tbody td{padding:3px 3px;border:1px solid #c8e6c9;text-align:right;}' +
      'tbody tr:nth-child(even):not(.ctr-group):not(.ctr-subtotal){background:#f1f8e9;}' +
      '.ctr-group td{padding:0;}' +
      '.ctr-header{background:#e8f5e9;color:#1b5e20;font-weight:900;font-size:11px;padding:4px 6px !important;border:1px solid #a5d6a7;}' +
      '.ctr-subtotal td{background:#e8f5e9;font-weight:700;font-size:10px;border-top:2px solid #1b5e20;}' +
      '.c{text-align:center !important;}' +
      '.b{font-weight:700;}' +
      '.totals{margin:8px 0;padding:8px 14px;background:#f5f5f5;border-radius:6px;border:1px solid #e0e0e0;}' +
      '.total-row{display:flex;justify-content:space-between;padding:2px 0;font-size:11px;}' +
      '.total-row .num{font-weight:700;}' +
      '.total-due{font-size:14px;font-weight:900;color:#1b5e20;border-top:2px solid #1b5e20;margin-top:3px;padding-top:5px;}' +
      '.footer{text-align:center;margin-top:10px;font-size:9px;color:#999;border-top:1px solid #e0e0e0;padding-top:6px;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{margin:0;padding:0;box-shadow:none;}}' +
    '</style></head><body><div class="page">' +
      '<div class="logo-section">' +
        '<div class="right">' +
          (logoSrc ? '<img src="' + logoSrc + '" alt="شعار لينه فارمز">' : '') +
          '<div><div class="co-name">شركة لينة للتنمية السياحية والعمرانية</div><div class="co-sub">مخبز آلية — توريد خبز للمقاولين</div></div>' +
        '</div>' +
        '<div class="badge">بيان توريد</div>' +
      '</div>' +
      '<div class="title">📋 بيان توريد خبز للمقاولين</div>' +
      '<div class="meta-row">' +
        '<div class="meta-item"><span class="meta-label">تاريخ الطباعة</span><span class="meta-val">' + invDate + '</span></div>' +
        '<div class="meta-item"><span class="meta-label">فترة التوريد</span><span class="meta-val">' + fromDate + ' → ' + toDate + '</span></div>' +
        '<div class="meta-item"><span class="meta-label">عدد المقاولين</span><span class="meta-val">' + ctrNames.length + '</span></div>' +
        '<div class="meta-item"><span class="meta-label">إجمالي الأرغفة</span><span class="meta-val">' + grandTotalLoaves + '</span></div>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th style="width:24px;">م</th><th>التاريخ</th><th style="width:50px;">عدد الأرغفة</th><th style="width:42px;">السعر</th><th style="width:50px;">الإجمالي</th><th style="width:50px;">المدفوع</th><th style="width:50px;">المتبقي</th><th>المسؤول</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody>' +
      '</table>' +
      '<div class="totals">' +
        '<div class="total-row"><span>إجمالي الأرغفة</span><span class="num">' + grandTotalLoaves + ' رغيف</span></div>' +
        '<div class="total-row"><span>إجمالي قيمة التوريدات</span><span class="num" style="color:#1b5e20;">' + grandTotalRevenue.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row"><span>إجمالي المدفوع</span><span class="num" style="color:#1565c0;">' + grandTotalPaid.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row total-due"><span>إجمالي المتبقي</span><span class="num" style="color:#c62828;">' + grandRem.toFixed(2) + ' ج.م</span></div>' +
      '</div>' +
      '<div class="footer">بيان توريد خبز — لينه فارمز © ' + new Date().getFullYear() + '</div>' +
    '</div></body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
}
