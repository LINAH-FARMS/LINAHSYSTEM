/* استهلاك خامات الفرن والمقاولين بالتفصيل — يستبدل compute/render/export الخاصة
   بـ استهلاك الخامات في app.js ليُظهر خامات الفرن (من الإنتاج) + خامات المقاولين
   (من ingredients في توريد المقاولين) والإجماليات مضبوطة في الكروت والجدول والرسم. */
(function () {
  'use strict';

  var _bakeryChart = null;

  function _ndz(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function _r2(n) { return Math.round(n * 100) / 100; }
  function _ds(s) { return String(s === null || s === undefined ? '' : s).slice(0, 10); }
  function _isum(data, key) { var s = 0; data.forEach(function (x) { s += parseInt(x[key], 10) || 0; }); return s; }
  function _sum(data, key) { var s = 0; data.forEach(function (x) { s += _ndz(x[key]); }); return s; }

  window.computeBakeryConsumptionForRange = function (fromDate, toDate) {
    var results = [];
    var d = new Date(fromDate + 'T00:00:00');
    var end = new Date(toDate + 'T00:00:00');
    if (isNaN(d.getTime()) || isNaN(end.getTime())) return results;
    while (d <= end) {
      var dateStr = d.toISOString().split('T')[0];
      var prods = (window.bakeryProductions || []).filter(function (p) { return _ds(p.date) === dateStr; });
      var ctrs = (window.bakeryContractorSupplies || []).filter(function (c) { return _ds(c.date) === dateStr; });
      var f = { flour: 0, bran: 0, salt: 0, yeast: 0, diesel: 0 };
      var cf = { flour: 0, bran: 0, salt: 0, yeast: 0, diesel: 0 };
      var breadFarm = 0, breadCtr = 0;
      prods.forEach(function (p) {
        f.flour += _ndz(p.flourUsed); f.bran += _ndz(p.branUsed); f.salt += _ndz(p.saltUsed);
        f.yeast += _ndz(p.yeastUsed); f.diesel += _ndz(p.dieselUsed);
        breadFarm += parseInt(p.breadCount, 10) || 0;
      });
      ctrs.forEach(function (c) {
        breadCtr += parseInt(c.count, 10) || 0;
        var ing = c.ingredients || {};
        cf.flour += _ndz(ing.flour); cf.bran += _ndz(ing.bran); cf.salt += _ndz(ing.salt);
        cf.yeast += _ndz(ing.yeast); cf.diesel += _ndz(ing.diesel);
      });
      results.push({
        date: dateStr,
        breadFarm: breadFarm, breadCtr: breadCtr, breadTotal: breadFarm + breadCtr, ctrCount: ctrs.length,
        flour: _r2(f.flour), bran: _r2(f.bran), salt: _r2(f.salt), yeast: _r2(f.yeast), diesel: _r2(f.diesel),
        ctrFlour: _r2(cf.flour), ctrBran: _r2(cf.bran), ctrSalt: _r2(cf.salt), ctrYeast: _r2(cf.yeast), ctrDiesel: _r2(cf.diesel),
        totalFlour: _r2(f.flour + cf.flour), totalBran: _r2(f.bran + cf.bran), totalSalt: _r2(f.salt + cf.salt),
        totalYeast: _r2(f.yeast + cf.yeast), totalDiesel: _r2(f.diesel + cf.diesel)
      });
      d.setDate(d.getDate() + 1);
    }
    return results;
  };

  function _card(color, main, label, sub) {
    return '<div style="background:' + color + ';color:white;padding:6px 12px;border-radius:8px;font-size:12px;text-align:center;min-width:120px;">'
      + '<div style="font-weight:700;font-size:15px;">' + main + '</div>'
      + '<div style="font-size:10px;opacity:0.95;">' + label + '</div>'
      + (sub ? '<div style="font-size:9px;opacity:0.8;margin-top:2px;">' + sub + '</div>' : '')
      + '</div>';
  }

  var _MATS = [
    { key: 'flour', label: 'دقيق', ov: 'flour', ctr: 'ctrFlour', tot: 'totalFlour' },
    { key: 'bran', label: 'ردة', ov: 'bran', ctr: 'ctrBran', tot: 'totalBran' },
    { key: 'salt', label: 'ملح', ov: 'salt', ctr: 'ctrSalt', tot: 'totalSalt' },
    { key: 'yeast', label: 'خميرة', ov: 'yeast', ctr: 'ctrYeast', tot: 'totalYeast' },
    { key: 'diesel', label: 'سولار', ov: 'diesel', ctr: 'ctrDiesel', tot: 'totalDiesel' }
  ];

  window.renderBakeryConsumptionTable = function () {
    var thead = document.getElementById('bakery-consumption-thead');
    var tbody = document.getElementById('bakery-consumption-tbody');
    if (!thead || !tbody) return;
    var fromEl = document.getElementById('bakeryConsFrom');
    var toEl = document.getElementById('bakeryConsTo');
    var fromDate = fromEl ? fromEl.value : '';
    var toDate = toEl ? toEl.value : '';
    if (!fromDate || !toDate) { if (tbody) tbody.innerHTML = ''; return; }
    var data = window.computeBakeryConsumptionForRange(fromDate, toDate);
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="19" style="padding:15px;color:#888;">لا توجد بيانات استهلاك في هذا النطاق</td></tr>'; return; }

    var t = {
      breadFarm: _isum(data, 'breadFarm'), breadCtr: _isum(data, 'breadCtr'), breadTotal: _isum(data, 'breadTotal')
    };
    _MATS.forEach(function (m) { t[m.ov] = _sum(data, m.ov); t[m.ctr] = _sum(data, m.ctr); t[m.tot] = _sum(data, m.tot); });

    var cards = document.getElementById('bakery-summary-cards');
    if (cards) {
      cards.innerHTML = [
        _card('#1b5e20', _r2(t.breadTotal).toLocaleString('en-US'), 'إجمالي الأرغفة', 'المزرعة ' + t.breadFarm.toLocaleString('en-US') + ' | المقاولين ' + t.breadCtr.toLocaleString('en-US'))
      ];
      _MATS.forEach(function (m) {
        cards.innerHTML += _card(m.key === 'diesel' ? '#0d47a1' : (m.key === 'bran' ? '#6d4c00' : '#37474f'),
          _r2(t[m.tot]), m.label + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)'),
          'فرن ' + _r2(t[m.ov]) + ' | مقاولين ' + _r2(t[m.ctr]));
      });
    }

    function th(html, bg, extra) {
      return '<th style="padding:6px;background:' + bg + ';color:white;border:1px solid #ddd;font-size:11px;white-space:nowrap;' + (extra || '') + '">' + html + '</th>';
    }
    thead.innerHTML = '<tr>'
      + th('التاريخ', '#263238', 'rowspan:2;')
      + th('خبز المزرعة', '#1b5e20', 'rowspan:2;')
      + th('خبز المقاولين', '#1b5e20', 'rowspan:2;')
      + th('إجمالي الأرغفة', '#1b5e20', 'rowspan:2;')
      + th('خامات الفرن', '#37474f', 'colspan:5;')
      + th('خامات المقاولين', '#00695c', 'colspan:5;')
      + th('الإجمالي', '#1b5e20', 'colspan:5;')
      + '</tr><tr>'
      + _MATS.map(function (m) { return th(m.label, '#455a64'); }).join('')
      + _MATS.map(function (m) { return th(m.label, '#00796b'); }).join('')
      + _MATS.map(function (m) { return th(m.label, '#2e7d32'); }).join('')
      + '</tr>';

    var rows = '';
    data.slice().reverse().forEach(function (s) {
      rows += '<tr>'
        + '<td style="padding:5px;border:1px solid #ddd;font-weight:700;font-family:monospace;">' + s.date + '</td>'
        + '<td style="padding:5px;border:1px solid #ddd;">' + s.breadFarm + '</td>'
        + '<td style="padding:5px;border:1px solid #ddd;">' + s.breadCtr + (s.ctrCount ? ' <span style="color:#888;font-size:10px;">(' + s.ctrCount + ')</span>' : '') + '</td>'
        + '<td style="padding:5px;border:1px solid #ddd;font-weight:700;">' + s.breadTotal + '</td>'
        + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #ddd;background:#fafafa;">' + s[m.ov] + '</td>'; }).join('')
        + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #ddd;background:#f1faf8;">' + s[m.ctr] + '</td>'; }).join('')
        + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #ddd;font-weight:700;background:#e8f5e9;">' + s[m.tot] + '</td>'; }).join('')
        + '</tr>';
    });
    rows += '<tr style="font-weight:900;background:#c8e6c9;">'
      + '<td style="padding:5px;border:1px solid #999;">الإجمالي</td>'
      + '<td style="padding:5px;border:1px solid #999;">' + t.breadFarm + '</td>'
      + '<td style="padding:5px;border:1px solid #999;">' + t.breadCtr + '</td>'
      + '<td style="padding:5px;border:1px solid #999;">' + t.breadTotal + '</td>'
      + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #999;">' + _r2(t[m.ov]) + '</td>'; }).join('')
      + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #999;">' + _r2(t[m.ctr]) + '</td>'; }).join('')
      + _MATS.map(function (m) { return '<td style="padding:5px;border:1px solid #999;">' + _r2(t[m.tot]) + '</td>'; }).join('')
      + '</tr>';
    tbody.innerHTML = rows;
    window.renderBakeryChart(data);
  };

  window.renderBakeryChart = function (data) {
    var canvas = document.getElementById('bakery-chart');
    if (!canvas) return;
    if (_bakeryChart) { _bakeryChart.destroy(); _bakeryChart = null; }
    if (!data || data.length < 2) { canvas.parentElement.style.height = '0'; return; }
    canvas.parentElement.style.height = '250px';
    var ctx = canvas.getContext('2d');
    var labels = data.map(function (s) {
      var d = s.date.split('-');
      return d[1] + '/' + d[2];
    });
    _bakeryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'خبز المزرعة (رغيف)',
            data: data.map(function (s) { return s.breadFarm; }),
            backgroundColor: '#e65100',
            borderRadius: 3,
            order: 2
          },
          {
            label: 'خبز المقاولين (رغيف)',
            data: data.map(function (s) { return s.breadCtr; }),
            backgroundColor: '#ff8a65',
            borderRadius: 3,
            order: 2
          },
          {
            label: 'دقيق الفرن (كجم)',
            data: data.map(function (s) { return s.flour; }),
            type: 'line',
            borderColor: '#1565c0',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointBackgroundColor: '#1565c0',
            pointRadius: 3,
            tension: 0.2,
            order: 1,
            yAxisID: 'y1'
          },
          {
            label: 'دقيق المقاولين (كجم)',
            data: data.map(function (s) { return s.ctrFlour; }),
            type: 'line',
            borderColor: '#00838f',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderDash: [5, 3],
            pointBackgroundColor: '#00838f',
            pointRadius: 3,
            tension: 0.2,
            order: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, usePointStyle: true } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            position: 'left',
            title: { display: true, text: 'عدد الأرغفة', font: { size: 11 } },
            ticks: { font: { size: 10 } }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            title: { display: true, text: 'دقيق (كجم)', font: { size: 11 } },
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  };

  window.exportBakeryConsumptionToExcel = function () {
    var fromEl = document.getElementById('bakeryConsFrom');
    var toEl = document.getElementById('bakeryConsTo');
    var fromDate = fromEl ? fromEl.value : '';
    var toDate = toEl ? toEl.value : '';
    if (!fromDate || !toDate) return alert('الرجاء تحديد نطاق التاريخ');
    var data = window.computeBakeryConsumptionForRange(fromDate, toDate);
    if (!data.length) return alert('لا توجد بيانات في هذا النطاق');
    var xlData = data.map(function (s) {
      var o = { 'التاريخ': s.date, 'خبز المزرعة': s.breadFarm, 'خبز المقاولين': s.breadCtr, 'إجمالي الأرغفة': s.breadTotal };
      _MATS.forEach(function (m) {
        o[m.label + ' الفرن' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = s[m.ov];
        o[m.label + ' المقاولين' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = s[m.ctr];
        o[m.label + ' الإجمالي' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = s[m.tot];
      });
      return o;
    });
    var t = { breadFarm: _isum(data, 'breadFarm'), breadCtr: _isum(data, 'breadCtr'), breadTotal: _isum(data, 'breadTotal') };
    _MATS.forEach(function (m) { t[m.ov] = _sum(data, m.ov); t[m.ctr] = _sum(data, m.ctr); t[m.tot] = _sum(data, m.tot); });
    var row = { 'التاريخ': 'الإجمالي', 'خبز المزرعة': t.breadFarm, 'خبز المقاولين': t.breadCtr, 'إجمالي الأرغفة': t.breadTotal };
    _MATS.forEach(function (m) {
      row[m.label + ' الفرن' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = _r2(t[m.ov]);
      row[m.label + ' المقاولين' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = _r2(t[m.ctr]);
      row[m.label + ' الإجمالي' + (m.key === 'diesel' ? ' (لتر)' : ' (كجم)')] = _r2(t[m.tot]);
    });
    xlData.push(row);
    var ws = XLSX.utils.json_to_sheet(xlData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bakery Consumption');
    XLSX.writeFile(wb, 'BakeryConsumption_' + (fromDate + '_to_' + toDate).replace(/-/g, '') + '_' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '.xlsx');
  };

  document.addEventListener('DOMContentLoaded', function () {
    var f = document.getElementById('bakeryConsFrom');
    var t = document.getElementById('bakeryConsTo');
    if (f && t && f.value && t.value) window.renderBakeryConsumptionTable();
  });
})();