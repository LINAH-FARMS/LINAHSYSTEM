// ====== Professional PDF Export ======
(function() {
  if (typeof html2pdf === 'undefined') return;

  window.exportPdfStyled = function(title, dataRows, headers, sheetName) {
    var today = new Date().toLocaleDateString('ar-EG');
    var cols = headers.length;

    var html = '<html dir="rtl"><head><meta charset="UTF-8">';
    html += '<style>';
    html += 'body { font-family: "Cairo", sans-serif; padding: 20px; color: #222; direction: rtl; }';
    html += '.header { text-align: center; border-bottom: 3px solid #1b5e20; padding-bottom: 12px; margin-bottom: 20px; }';
    html += '.header h1 { color: #1b5e20; margin: 0; font-size: 22px; }';
    html += '.header .sub { color: #666; font-size: 13px; margin-top: 4px; }';
    html += '.info { display: flex; justify-content: space-between; font-size: 12px; padding: 10px 14px; background: #f5f5f5; border-radius: 6px; margin-bottom: 18px; }';
    html += 'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; direction: rtl; }';
    html += 'th { background: #1b5e20; color: #fff; padding: 10px 8px; font-size: 12px; text-align: center; font-weight: 700; }';
    html += 'td { padding: 7px 8px; border: 1px solid #ddd; text-align: center; font-size: 11px; }';
    html += 'tr:nth-child(even) td { background: #f1f8e9; }';
    html += '.footer { margin-top: 25px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #888; text-align: center; }';
    html += '.page-number { float: left; }';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<h1>' + title + '</h1>';
    html += '<div class="sub">' + sheetName + ' | ' + today + '</div>';
    html += '</div>';

    html += '<div class="info">';
    html += '<span><b>تاريخ التقرير:</b> ' + today + '</span>';
    html += '<span><b>عدد السجلات:</b> ' + dataRows.length + '</span>';
    html += '<span><b>لينة فارمز</b></span>';
    html += '</div>';

    html += '<table>';
    html += '<thead><tr>';
    headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    dataRows.forEach(function(row) {
      html += '<tr>';
      row.forEach(function(cell) { html += '<td>' + (cell !== undefined && cell !== null ? cell : '') + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';

    html += '<div class="footer">تم الإنشاء بواسطة نظام لينة فارمز — ' + today + ' <span class="page-number">صفحة 1/1</span></div>';
    html += '</body></html>';

    var element = document.createElement('div');
    element.innerHTML = html;

    html2pdf().set({
      margin: 1,
      filename: title.replace(/[\/\\?%*:|"<>]/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'landscape' }
    }).from(element).save();
  };

  // Add button to toolbar
  var interval = setInterval(function() {
    var toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.cssText = 'padding:5px 12px;font-size:12px;background:#c62828;color:white;border:none;border-radius:6px;cursor:pointer;';
      btn.textContent = '\u{1F5A8}\uFE0F PDF \u0645\u062D\u062A\u0631\u0641';
      btn.onclick = function() {
        var tables = document.querySelectorAll('.tab-content.active table');
        if (!tables.length) { alert('لا توجد بيانات للتصدير'); return; }
        var headers = [];
        tables[0].querySelectorAll('thead th, thead td').forEach(function(th) {
          var txt = th.textContent.trim().replace(/[^ \u0600-\u06FF\u0660-\u0669\w]/g, '');
          if (txt) headers.push(txt);
        });
        if (!headers.length) {
          tables[0].querySelectorAll('tr:first-child th, tr:first-child td').forEach(function(td) {
            var txt = td.textContent.trim().replace(/[^ \u0600-\u06FF\u0660-\u0669\w]/g, '');
            if (txt) headers.push(txt);
          });
          if (!headers.length) { alert('لم يتم التعرف على عناوين الجدول'); return; }
        }
        var rows = [];
        tables[0].querySelectorAll('tbody tr').forEach(function(tr) {
          var cells = [];
          tr.querySelectorAll('td').forEach(function(td) { cells.push(td.textContent.trim()); });
          if (cells.length) rows.push(cells);
        });
        var tabName = (document.querySelector('.tab-btn.active')?.textContent || '').replace(/[^ \u0600-\u06FF\u0660-\u0669\w]/g, '').trim();
        exportPdfStyled(tabName || 'تقرير', rows, headers, 'بيانات');
      };
      toolbar.appendChild(btn);
      clearInterval(interval);
    }
  }, 600);
})();
