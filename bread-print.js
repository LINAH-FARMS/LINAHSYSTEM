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
      '<td class="c">' + r.name + '</td>' +
      '<td class="c b">' + r.count + '</td>' +
      '<td class="c">' + parseFloat(r.price || 0).toFixed(2) + '</td>' +
      '<td class="c b">' + rev.toFixed(2) + '</td>' +
      '<td class="c">' + paid.toFixed(2) + '</td>' +
      '<td class="c">' + rem.toFixed(2) + '</td>' +
      '<td class="c">' + (r.responsible || '—') + '</td>' +
    '</tr>';
  });

  var grandRem = grandTotalRevenue - grandTotalPaid;

  var w = window.open('', '_blank');
  var pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>بيان توريد خبز — LINAHSYSTEM</title>' +
    '<style>' +
      '@page{size:' + pageSize + ';margin:10mm 12mm;}' +
      'body{font-family:Cairo,"Traditional Arabic","Segoe UI",sans-serif;padding:0;margin:0;color:#000;}' +
      '.page{width:100%;max-width:100%;box-sizing:border-box;padding:2px 0;}' +
      '.logo-section{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:10px;}' +
      '.logo-section .right{display:flex;align-items:center;gap:10px;}' +
      '.logo-section .right img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #000;padding:2px;}' +
      '.logo-section .right .co-name{font-weight:900;color:#000;font-size:18px;line-height:1.3;}' +
      '.logo-section .right .co-sub{font-size:13px;color:#000;}' +
      '.logo-section .badge{background:#000;color:#fff;padding:4px 18px;border-radius:20px;font-size:13px;font-weight:700;}' +
      '.title{text-align:center;font-size:24px;font-weight:900;color:#000;margin:6px 0 12px;}' +
      '.meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px;padding:8px 12px;background:#fff;border:2px solid #000;border-radius:6px;font-size:13px;}' +
      '.meta-item{text-align:center;}' +
      '.meta-label{display:block;color:#000;font-size:12px;}' +
      '.meta-val{font-weight:900;color:#000;font-size:14px;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;}' +
      'thead th{background:#000;color:#fff;padding:6px 4px;border:2px solid #000;text-align:center;font-size:13px;font-weight:700;}' +
      'tbody td{padding:5px 4px;border:1px solid #000;text-align:right;}' +
      'tbody tr:nth-child(even){background:#f5f5f5;}' +
      '.c{text-align:center !important;}' +
      '.b{font-weight:900;}' +
      '.totals{margin:10px 0;padding:10px 16px;background:#fff;border:2px solid #000;border-radius:6px;}' +
      '.total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;}' +
      '.total-row .num{font-weight:900;}' +
      '.total-due{font-size:16px;font-weight:900;color:#000;border-top:3px solid #000;margin-top:5px;padding-top:7px;}' +
      '.footer{text-align:center;margin-top:12px;font-size:11px;color:#000;border-top:1px solid #000;padding-top:6px;}' +
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
        '<div class="meta-item"><span class="meta-label">عدد المقاولين</span><span class="meta-val">' + _selectedContractors.length + '</span></div>' +
        '<div class="meta-item"><span class="meta-label">إجمالي الأرغفة</span><span class="meta-val">' + grandTotalLoaves + '</span></div>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th style="width:20px;">م</th><th>التاريخ</th><th>المقاول</th><th style="width:44px;">عدد الأرغفة</th><th style="width:36px;">السعر</th><th style="width:44px;">الإجمالي</th><th style="width:44px;">المدفوع</th><th style="width:44px;">المتبقي</th><th>المسؤول</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody>' +
      '</table>' +
      '<div class="totals">' +
        '<div class="total-row"><span>إجمالي الأرغفة</span><span class="num">' + grandTotalLoaves + ' رغيف</span></div>' +
        '<div class="total-row"><span>إجمالي قيمة التوريدات</span><span class="num">' + grandTotalRevenue.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row"><span>إجمالي المدفوع</span><span class="num">' + grandTotalPaid.toFixed(2) + ' ج.م</span></div>' +
        '<div class="total-row total-due"><span>إجمالي المتبقي</span><span class="num">' + grandRem.toFixed(2) + ' ج.م</span></div>' +
      '</div>' +
      '<div class="footer">بيان توريد خبز — لينه فارمز © ' + new Date().getFullYear() + '</div>' +
    '</div></body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
}
