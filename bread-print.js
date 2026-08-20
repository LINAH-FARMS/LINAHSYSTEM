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

  var rowCount = records.length;
  var baseFont = 13, tFont = 13, sFont = 11, pFont = 10, rowPad = 5;
  if (orientation === 'landscape') {
    if (rowCount > 12) { baseFont = 11; tFont = 11; sFont = 10; pFont = 9; rowPad = 4; }
    if (rowCount > 20) { baseFont = 9; tFont = 9; sFont = 8; pFont = 7; rowPad = 3; }
    if (rowCount > 30) { baseFont = 7; tFont = 7; sFont = 6; pFont = 6; rowPad = 2; }
  } else {
    if (rowCount > 18) { baseFont = 11; tFont = 11; sFont = 10; pFont = 9; rowPad = 4; }
    if (rowCount > 28) { baseFont = 9; tFont = 9; sFont = 8; pFont = 7; rowPad = 3; }
    if (rowCount > 40) { baseFont = 7; tFont = 7; sFont = 6; pFont = 6; rowPad = 2; }
  }

  var logoSrc = '';
  var logoEl = document.querySelector('img[alt="Logo"]');
  if (logoEl) logoSrc = logoEl.src;

  var invDate = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

  var tableRows = '', grandTotalLoaves = 0, grandTotalRevenue = 0, grandTotalPaid = 0;

  records.forEach(function(r, i) {
    var rev = (r.count || 0) * (r.price || 0);
    var paid = parseFloat(r.paid) || 0;
    var rem = rev - paid;
    grandTotalLoaves += r.count || 0;
    grandTotalRevenue += rev;
    grandTotalPaid += paid;
    tableRows += '<tr>' +
      '<td class="c">' + (i + 1) + '</td>' +
      '<td class="c">' + r.date + '</td>' +
      '<td class="c b ctr-name">' + r.name + '</td>' +
      '<td class="c b">' + r.count + '</td>' +
      '<td class="c">' + parseFloat(r.price || 0).toFixed(2) + '</td>' +
      '<td class="c b">' + rev.toFixed(2) + '</td>' +
      '<td class="c">' + paid.toFixed(2) + '</td>' +
      '<td class="c">' + rem.toFixed(2) + '</td>' +
      '<td class="c">' + (r.responsible || '—') + '</td>' +
    '</tr>';
  });

  var grandRem = grandTotalRevenue - grandTotalPaid;

  var w = window.open('', '_blank', 'width=1100,height=780');
  var pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  var pageW = orientation === 'landscape' ? 277 : 190;
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>بيان توريد خبز — LINAHSYSTEM</title>' +
    '<style>' +
      '@page{size:' + (orientation === 'landscape' ? '297mm 210mm' : '210mm 297mm') + ';margin:8mm 10mm;}' +
      'html,body{width:auto;direction:rtl;}' +
      'body{font-family:Cairo,"Traditional Arabic","Segoe UI",sans-serif;padding:0;margin:0;color:#000;}' +
      '.page{width:' + pageW + 'mm;max-width:100%;box-sizing:border-box;padding:2px 0;margin:0 auto;}' +
      '.logo-section{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #000;padding-bottom:4px;margin-bottom:6px;}' +
      '.logo-section .right{display:flex;align-items:center;gap:6px;}' +
      '.logo-section .right img{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #000;padding:1px;}' +
      '.logo-section .right .co-name{font-weight:900;color:#000;font-size:' + sFont + 'px;line-height:1.2;}' +
      '.logo-section .right .co-sub{font-size:' + pFont + 'px;color:#000;}' +
      '.logo-section .badge{background:#000;color:#fff;padding:2px 12px;border-radius:16px;font-size:' + pFont + 'px;font-weight:700;}' +
      '.title{text-align:center;font-size:' + tFont + 'px;font-weight:900;color:#000;margin:3px 0 6px;}' +
      '.meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px;margin-bottom:5px;padding:4px 8px;background:#fff;border:2px solid #000;border-radius:4px;font-size:' + pFont + 'px;}' +
      '.meta-item{text-align:center;}' +
      '.meta-label{display:block;color:#000;font-size:' + (pFont-1) + 'px;}' +
      '.meta-val{font-weight:900;color:#000;font-size:' + baseFont + 'px;}' +
      'table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:' + baseFont + 'px;margin:4px 0;}' +
      'thead th{background:#6c757d;color:#fff;padding:3px 2px;border:2px solid #6c757d;text-align:center;font-size:' + baseFont + 'px;font-weight:700;overflow:hidden;}' +
      'tbody td{padding:' + rowPad + 'px 2px;border:1px solid #000;text-align:right;background:#fff;word-wrap:break-word;overflow:hidden;}' +
      '.ctr-name{font-size:' + (baseFont+1) + 'px;font-weight:900;}' +
      '.c{text-align:center !important;}' +
      '.b{font-weight:900;}' +
      '.totals{margin:4px 0;padding:4px 10px;background:#fff;border:2px solid #000;border-radius:4px;}' +
      '.total-row{display:flex;justify-content:space-between;padding:1px 0;font-size:' + baseFont + 'px;}' +
      '.total-row .num{font-weight:900;}' +
      '.total-due{font-size:' + (baseFont+1) + 'px;font-weight:900;color:#000;border-top:2px solid #000;margin-top:2px;padding-top:3px;}' +
      '.sign-row{text-align:right;margin-top:10px;padding-top:6px;border-top:1px solid #000;font-size:' + baseFont + 'px;font-weight:700;}' +
      '.footer{text-align:center;font-size:' + (pFont-1) + 'px;color:#000;margin-top:4px;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#000;}.page{margin:0;padding:0;box-shadow:none;}}' +
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
        '<div class="meta-item"><span class="meta-label">إجمالي الأرغفة</span><span class="meta-val">' + grandTotalLoaves + '</span></div>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th style="width:3%;">م</th><th style="width:9%;">التاريخ</th><th style="width:18%;">المقاول</th><th style="width:9%;">عدد الأرغفة</th><th style="width:9%;">السعر</th><th style="width:11%;">الإجمالي</th><th style="width:11%;">المدفوع</th><th style="width:11%;">المتبقي</th><th style="width:18%;">المسؤول</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody>' +
      '</table>' +
      '<div class="totals">' +
        '<div class="total-row"><span>إجمالي الأرغفة</span><span class="num">' + grandTotalLoaves + ' رغيف</span></div>' +
        '<div class="total-row"><span>إجمالي قيمة التوريدات</span><span class="num">' + grandTotalRevenue.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row"><span>إجمالي المدفوع</span><span class="num">' + grandTotalPaid.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row total-due"><span>إجمالي المتبقي</span><span class="num">' + grandRem.toFixed(2) + ' ج.م</span></div>' +
      '</div>' +
      '<div class="sign-row">اعتماد إدارة الشئون الإدارية :  ______________________</div>' +
      '<div class="footer">بيان توريد خبز — لينه فارمز © ' + new Date().getFullYear() + '</div>' +
    '</div></body></html>');
  w.document.close();
  try { w.resizeTo(1100, 780); w.focus(); } catch (e) {}
  setTimeout(function() { w.print(); }, 600);
}
