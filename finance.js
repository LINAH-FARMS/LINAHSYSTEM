/* ====== Finance & Budget Module ====== */
var finTransactions = [];
var finBudgets = [];
var finCharts = {};

function finInit() {
  try { finTransactions = JSON.parse(localStorage.getItem('fin_transactions') || '[]'); } catch(e) { finTransactions = []; }
  try { finBudgets = JSON.parse(localStorage.getItem('fin_budgets') || '[]'); } catch(e) { finBudgets = []; }
  finPopulateYearSelect();
}

function finSave() {
  localStorage.setItem('fin_transactions', JSON.stringify(finTransactions));
  localStorage.setItem('fin_budgets', JSON.stringify(finBudgets));
  if (typeof syncStorage === 'function') syncStorage();
}

function finExcelDate(serial) {
  if (!serial || serial < 1) return '';
  var d = new Date((serial - 25569) * 86400 * 1000);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function finExcelSerial(dateStr) {
  if (!dateStr) return 0;
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((d.getTime() / 86400000) + 25569);
}

function finMonthFromExcelDate(serial) {
  var d = new Date((serial - 25569) * 86400 * 1000);
  return d.getMonth() + 1;
}

function finYearFromExcelDate(serial) {
  var d = new Date((serial - 25569) * 86400 * 1000);
  return d.getFullYear();
}

function finImportReport(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var imported = 0;
      workbook.SheetNames.forEach(function(sheetName) {
        var sheet = workbook.Sheets[sheetName];
        var json = XLSX.utils.sheet_to_json(sheet);
        if (!json.length) return;
        var firstRow = json[0];
        var keys = Object.keys(firstRow);
        var hasTaskCol = keys.some(function(k) { return k.toLowerCase().indexOf('task') >= 0 && k.toLowerCase().indexOf('desc') < 0; });
        var hasValueCol = keys.some(function(k) { return k === 'القيمة' || k.toLowerCase() === 'value'; });
        if (hasTaskCol && hasValueCol) {
          json.forEach(function(row) {
            var taskVal = row['Task'] || row['task'] || '';
            var overheadCode = String(taskVal).trim();
            var dateVal = row['التاريخ'] || row['Date'] || '';
            var serial = typeof dateVal === 'number' ? dateVal : parseFloat(dateVal);
            var txMonth = finMonthFromExcelDate(serial);
            var txYear = finYearFromExcelDate(serial);
            var txDate = finExcelDate(serial);
            var orderNum = String(row['رقم اذن الصرف'] || row['رقم البون'] || '').trim();
            var itemName = String(row['اسم الصـــنف'] || row['اسم الصنف'] || '').trim();
            var existsIdx = finTransactions.findIndex(function(t) { return t.date === txDate && t.task === overheadCode && t.orderNum === orderNum && t.itemName === itemName; });
            var qty = parseFloat(row['كمية الصرف'] || row['الكمية'] || row['Qty'] || 0);
            var price = parseFloat(row['السعر'] || row['Price'] || 0);
            var value = parseFloat(row['القيمة'] || row['Value'] || 0);
            if (isNaN(value)) value = qty * price;
            var txObj = {
              date: txDate, month: txMonth, year: txYear,
              orderNum: orderNum,
              itemCode: String(row['كود الصنف'] || '').trim(),
              storeName: String(row['اسم المخزن'] || '').trim(),
              itemName: itemName,
              unit: String(row['الوحدة'] || '').trim(),
              qty: qty,
              costCenter: String(row['Cost center'] || row['Cost Center'] || '').trim(),
              costCenterDesc: String(row['Cost center Description'] || row['Cost Center Description'] || '').trim(),
              segment: String(row['Segment'] || '').trim(),
              task: overheadCode,
              taskDesc: String(row['Task Description'] || '').trim(),
              notes: String(row['ملاحظات'] || '').trim(),
              price: price, value: value,
              modifiedAt: new Date().toISOString()
            };
            if (existsIdx >= 0) finTransactions[existsIdx] = txObj; else finTransactions.push(txObj);
          });
          imported += json.length;
        }
        var hasBudgetCol = keys.some(function(k) { return k === 'Overhead' || k.indexOf('Overhead') >= 0; });
        var hasBudgetAmt = keys.some(function(k) { return k === 'Budget'; });
        if (hasBudgetCol && hasBudgetAmt) {
          var overheadRow = null;
          json.forEach(function(row) {
            if (row['Overhead'] === 'Total' || row['Overhead'] === 'total') { overheadRow = row; return; }
            var code = String(row[keys[0]] || '').trim();
            var name = String(row['Overhead'] || '').trim();
            if (!code || !name || code === 'Total') return;
            var budget = parseFloat(row['Budget']) || 0;
            var actual = parseFloat(row['Actual']) || 0;
            var variance = parseFloat(row['Variance']) || (budget - actual);
            var pct = budget ? Math.round((actual / budget) * 100) : 0;
            var ytdB = parseFloat(row['YTD Budget']) || 0;
            var ytdA = parseFloat(row['YTD Actual']) || 0;
            var ytdV = parseFloat(row['YTD Variance']) || (ytdB - ytdA);
            var ytdP = ytdB ? Math.round((ytdA / ytdB) * 100) : 0;
            var monthLabel = '';
            var aprKeys = keys.filter(function(k) { return k.indexOf('Apr') >= 0 || k.indexOf('Jan') >= 0 || k.indexOf('Feb') >= 0 || k.indexOf('Mar') >= 0 || k.indexOf('May') >= 0 || k.indexOf('Jun') >= 0 || k.indexOf('Jul') >= 0 || k.indexOf('Aug') >= 0 || k.indexOf('Sep') >= 0 || k.indexOf('Oct') >= 0 || k.indexOf('Nov') >= 0 || k.indexOf('Dec') >= 0; });
            if (aprKeys.length > 0) monthLabel = aprKeys[0];
            var monthMap = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12};
            var detectedMonth = 1;
            for (var mk in monthMap) { if (monthLabel.indexOf(mk) >= 0) { detectedMonth = monthMap[mk]; break; } }
            var detectedYear = 2026;
            var yearMatch = sheetName.match(/(\d{4})/);
            if (yearMatch) detectedYear = parseInt(yearMatch[1]);
            var existingIdx = finBudgets.findIndex(function(b) { return b.code === code && b.month === detectedMonth && b.year === detectedYear; });
            var entry = {
              code: code, name: name, month: detectedMonth, year: detectedYear,
              budget: budget, actual: actual, variance: variance, percent: pct,
              ytdBudget: ytdB, ytdActual: ytdA, ytdVariance: ytdV, ytdPercent: ytdP,
              modifiedAt: new Date().toISOString()
            };
            if (existingIdx >= 0) finBudgets[existingIdx] = entry; else finBudgets.push(entry);
          });
        }
      });
      finSave();
      finPopulateYearSelect();
      finRenderAll();
      alert('✅ تم استيراد ' + imported + ' معاملة بنجاح.');
    } catch(err) { alert('❌ خطأ في الاستيراد: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
  evt.target.value = '';
}

function finPopulateYearSelect() {
  var sel = document.getElementById('fin-year-select');
  if (!sel) return;
  var years = new Set();
  finTransactions.forEach(function(t) { if (t.year) years.add(t.year); });
  finBudgets.forEach(function(b) { if (b.year) years.add(b.year); });
  if (years.size === 0) years.add(new Date().getFullYear());
  sel.innerHTML = '';
  Array.from(years).sort().forEach(function(y) {
    sel.innerHTML += '<option value="' + y + '">' + y + '</option>';
  });
  sel.value = new Date().getFullYear();
}

function finFiltered(month, year) {
  var tx = finTransactions.filter(function(t) { return t.year == year && (month == 0 || t.month == month); });
  var bg = finBudgets.filter(function(b) { return b.year == year && (month == 0 || b.month == month); });
  return { transactions: tx, budgets: bg };
}

function finGroupByTask(txList) {
  var groups = {};
  txList.forEach(function(t) {
    var code = t.task || 'غير محدد';
    if (!groups[code]) groups[code] = { code: code, name: t.taskDesc || code, total: 0, count: 0, items: {} };
    groups[code].total += t.value || 0;
    groups[code].count++;
    var itemName = t.itemName || 'غير محدد';
    if (!groups[code].items[itemName]) groups[code].items[itemName] = { name: itemName, total: 0, count: 0, unit: t.unit };
    groups[code].items[itemName].total += t.value || 0;
    groups[code].items[itemName].count++;
  });
  return groups;
}

function finRenderAll() {
  try {
    var yearEl = document.getElementById('fin-year-select');
    var year = (yearEl && yearEl.value) ? yearEl.value : String(new Date().getFullYear());
    var monthEl = document.getElementById('fin-month-select');
    var month = monthEl ? (parseInt(monthEl.value) || 0) : 0;
    var data = finFiltered(month, year);
    finRenderStats(data);
    finRenderBudgetTable(data);
    if (typeof Chart !== 'undefined') {
      try { finRenderCharts(data, month, year); } catch(e) { console.error('finRenderCharts error:', e); }
    }
  } catch(e) { console.error('finRenderAll error:', e); }
}

function finRenderStats(data) {
  var el = document.getElementById('fin-stats');
  if (!el) return;
  var totalBudget = 0, totalActual = 0;
  data.budgets.forEach(function(b) { totalBudget += b.budget; totalActual += b.actual; });
  var variance = totalBudget - totalActual;
  var pct = totalBudget ? Math.round((totalActual / totalBudget) * 100) : 0;
  var txCount = data.transactions.length;
  var txTotal = 0;
  data.transactions.forEach(function(t) { txTotal += t.value || 0; });
  el.innerHTML =
    '<div class="stat-card"><h3>الميزانية</h3><div class="value" style="font-size:22px;color:#1b5e20;">' + totalBudget.toLocaleString() + '</div></div>' +
    '<div class="stat-card blue"><h3>الفعلي</h3><div class="value" style="font-size:22px;color:#1565c0;">' + totalActual.toLocaleString() + '</div></div>' +
    '<div class="stat-card ' + (variance >= 0 ? '' : 'orange') + '"><h3>الانحراف</h3><div class="value" style="font-size:22px;color:' + (variance >= 0 ? '#2e7d32' : '#e65100') + ';">' + Math.abs(variance).toLocaleString() + (variance >= 0 ? ' ✅' : ' ⚠️') + '</div></div>' +
    '<div class="stat-card"><h3>نسبة التنفيذ</h3><div class="value" style="font-size:22px;color:' + (pct <= 100 ? '#2e7d32' : '#d32f2f') + ';">' + pct + '%</div></div>' +
    '<div class="stat-card"><h3>عدد المعاملات</h3><div class="value" style="font-size:22px;">' + txCount.toLocaleString() + '</div></div>' +
    '<div class="stat-card"><h3>إجمالي الصرف الفعلي</h3><div class="value" style="font-size:22px;color:#1565c0;">' + txTotal.toLocaleString(undefined,{maximumFractionDigits:0}) + '</div></div>';
}

function finRenderBudgetTable(data) {
  var tbody = document.getElementById('fin-budget-body');
  if (!tbody) return;
  var groups = finGroupByTask(data.transactions);
  var merged = {};
  data.budgets.forEach(function(b) {
    if (!merged[b.code]) merged[b.code] = { code: b.code, name: b.name, budget: 0, actual: 0, variance: 0, ytdBudget: 0, ytdActual: 0 };
    merged[b.code].budget += b.budget;
    merged[b.code].actual += b.actual;
    merged[b.code].variance += b.variance;
    merged[b.code].ytdBudget += b.ytdBudget;
    merged[b.code].ytdActual += b.ytdActual;
  });
  for (var code in groups) {
    if (!merged[code]) merged[code] = { code: code, name: groups[code].name, budget: 0, actual: 0, variance: 0, ytdBudget: 0, ytdActual: 0 };
    if (merged[code].actual === 0) merged[code].actual = groups[code].total;
  }
  var rows = Object.values(merged).sort(function(a, b) { return (b.actual || 0) - (a.actual || 0); });
  tbody.innerHTML = '';
  if (rows.length === 0) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#888;">لا توجد بيانات. قم باستيراد تقرير شهري أولاً.</td></tr>'; return; }
  rows.forEach(function(r) {
    var pct = r.budget ? Math.round((r.actual / r.budget) * 100) : (r.actual > 0 ? '∞' : 0);
    var barColor = pct <= 80 ? '#2e7d32' : pct <= 100 ? '#f57c00' : '#d32f2f';
    var ytdPct = r.ytdBudget ? Math.round((r.ytdActual / r.ytdBudget) * 100) : 0;
    var tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = function() { finShowDetail(r.code); };
    tr.innerHTML =
      '<td style="font-weight:700;">' + r.code + '</td>' +
      '<td style="font-weight:600;">' + r.name + '</td>' +
      '<td style="text-align:center;">' + (r.budget ? r.budget.toLocaleString() : '-') + '</td>' +
      '<td style="text-align:center;font-weight:700;color:#1565c0;">' + r.actual.toLocaleString(undefined,{maximumFractionDigits:0}) + '</td>' +
      '<td style="text-align:center;color:' + (r.variance >= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (r.variance >= 0 ? '+' : '') + r.variance.toLocaleString() + '</td>' +
      '<td style="text-align:center;"><div style="display:flex;align-items:center;gap:6px;justify-content:center;"><div style="width:60px;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;"><div style="width:' + Math.min(pct, 150) + '%;height:100%;background:' + barColor + ';border-radius:4px;"></div></div><span style="font-weight:700;color:' + barColor + ';">' + pct + '%</span></div></td>' +
      '<td style="text-align:center;">' + (r.ytdBudget ? r.ytdBudget.toLocaleString() : '-') + '</td>' +
      '<td style="text-align:center;font-weight:700;">' + (r.ytdActual ? r.ytdActual.toLocaleString() : '-') + '</td>' +
      '<td style="text-align:center;"><button class="btn" style="padding:2px 8px;font-size:11px;background:#1565c0;color:#fff;">📋</button></td>';
    tbody.appendChild(tr);
  });
}

function finRenderCharts(data, month, year) {
  var ctxMonthly = document.getElementById('fin-chart-monthly');
  var ctxPie = document.getElementById('fin-chart-pie');
  var ctxVar = document.getElementById('fin-chart-variance');
  if (finCharts.monthly) finCharts.monthly.destroy();
  if (finCharts.pie) finCharts.pie.destroy();
  if (finCharts.variance) finCharts.variance.destroy();
  var budgetMap = {};
  data.budgets.forEach(function(b) { budgetMap[b.code] = (budgetMap[b.code] || 0) + b.budget; });
  if (month == 0) {
    var monthLabels = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var budgetByMonth = new Array(12).fill(0);
    var actualByMonth = new Array(12).fill(0);
    data.budgets.forEach(function(b) {
      if (b.month >= 1 && b.month <= 12) {
        budgetByMonth[b.month - 1] += b.budget;
        actualByMonth[b.month - 1] += b.actual;
      }
    });
    finCharts.monthly = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'الميزانية', data: budgetByMonth, backgroundColor: 'rgba(46,125,50,0.3)', borderColor: '#2e7d32', borderWidth: 2 },
          { label: 'الفعلي', data: actualByMonth, backgroundColor: 'rgba(21,101,192,0.5)', borderColor: '#1565c0', borderWidth: 2 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
  } else {
    var txGroups = finGroupByTask(data.transactions);
    var codes = Object.keys(txGroups).sort();
    finCharts.monthly = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: codes.map(function(c) { return txGroups[c].name || c; }),
        datasets: [
          { label: 'الميزانية', data: codes.map(function(c) { return budgetMap[c] || 0; }), backgroundColor: 'rgba(46,125,50,0.3)', borderColor: '#2e7d32', borderWidth: 2 },
          { label: 'الفعلي', data: codes.map(function(c) { return txGroups[c].total; }), backgroundColor: 'rgba(21,101,192,0.5)', borderColor: '#1565c0', borderWidth: 2 }
        ]
      },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { position: 'top' } }, scales: { x: { beginAtZero: true } } }
    });
  }
  var pieData = finGroupByTask(data.transactions);
  var pieCodes = Object.keys(pieData).sort(function(a, b) { return pieData[b].total - pieData[a].total; });
  var pieColors = ['#1b5e20','#1565c0','#e65100','#6a1b9a','#c62828','#00695c','#f57f17','#283593','#ad1457','#4e342e'];
  finCharts.pie = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: pieCodes.map(function(c) { return pieData[c].name || c; }),
      datasets: [{ data: pieCodes.map(function(c) { return pieData[c].total; }), backgroundColor: pieColors }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } } }
  });
  var varCodes = Object.keys(pieData).sort(function(a, b) { return (budgetMap[b] ? pieData[b].total / budgetMap[b] : 0) - (budgetMap[a] ? pieData[a].total / budgetMap[a] : 0); });
  finCharts.variance = new Chart(ctxVar, {
    type: 'bar',
    data: {
      labels: varCodes.map(function(c) { return pieData[c].name || c; }),
      datasets: [{
        label: 'نسبة التنفيذ %',
        data: varCodes.map(function(c) { return budgetMap[c] ? Math.round((pieData[c].total / budgetMap[c]) * 100) : 0; }),
        backgroundColor: varCodes.map(function(c) {
          var p = budgetMap[c] ? (pieData[c].total / budgetMap[c]) * 100 : 0;
          return p <= 80 ? 'rgba(46,125,50,0.5)' : p <= 100 ? 'rgba(245,124,0,0.5)' : 'rgba(211,47,47,0.5)';
        }),
        borderColor: varCodes.map(function(c) {
          var p = budgetMap[c] ? (pieData[c].total / budgetMap[c]) * 100 : 0;
          return p <= 80 ? '#2e7d32' : p <= 100 ? '#f57c00' : '#d32f2f';
        }),
        borderWidth: 2
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function finShowDetail(code) {
  var year = document.getElementById('fin-year-select')?.value || new Date().getFullYear();
  var month = parseInt(document.getElementById('fin-month-select')?.value || 0);
  var filtered = finTransactions.filter(function(t) { return t.task === code && t.year == year && (month == 0 || t.month == month); });
  var section = document.getElementById('fin-detail-section');
  section.style.display = 'block';
  document.getElementById('fin-detail-title').textContent = 'تفاصيل البند: ' + (filtered[0]?.taskDesc || code);
  var monthNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var byMonth = {};
  filtered.forEach(function(t) {
    var m = t.month;
    if (!byMonth[m]) byMonth[m] = 0;
    byMonth[m] += t.value || 0;
  });
  var months = Object.keys(byMonth).sort(function(a, b) { return a - b; });
  var ctx = document.getElementById('fin-detail-chart');
  if (finCharts.detail) finCharts.detail.destroy();
  finCharts.detail = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(function(m) { return monthNames[m]; }),
      datasets: [{ label: 'الصرف', data: months.map(function(m) { return byMonth[m]; }), borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,0.1)', fill: true, tension: 0.3 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  var itemGroups = {};
  filtered.forEach(function(t) {
    var name = t.itemName || 'غير محدد';
    if (!itemGroups[name]) itemGroups[name] = { name: name, total: 0, count: 0, unit: t.unit };
    itemGroups[name].total += t.value || 0;
    itemGroups[name].count++;
  });
  var sorted = Object.values(itemGroups).sort(function(a, b) { return b.total - a.total; });
  var topHtml = '<div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#1b5e20;">🏆 أعلى 10 أصناف صرفاً</div>';
  sorted.slice(0, 10).forEach(function(item, i) {
    var maxVal = sorted[0].total || 1;
    var pct = (item.total / maxVal * 100).toFixed(0);
    topHtml += '<div style="margin-bottom:6px;"><div style="display:flex;justify-content:space-between;font-size:11px;"><span>' + (i + 1) + '. ' + item.name + '</span><span style="font-weight:700;">' + item.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</span></div><div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:#1565c0;border-radius:3px;"></div></div></div>';
  });
  document.getElementById('fin-detail-top-items').innerHTML = topHtml;
  var tableHtml = '<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="background:#1b5e20;color:white;"><th>التاريخ</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>القيمة</th><th>المخزن</th><th>ملاحظات</th></tr></thead><tbody>';
  filtered.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function(t) {
    tableHtml += '<tr><td>' + t.date + '</td><td>' + t.itemName + '</td><td style="text-align:center;">' + t.qty + ' ' + t.unit + '</td><td style="text-align:center;">' + t.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '</td><td style="text-align:center;font-weight:700;color:#1565c0;">' + t.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '</td><td>' + t.storeName + '</td><td>' + t.notes + '</td></tr>';
  });
  tableHtml += '</tbody></table>';
  document.getElementById('fin-detail-table-wrap').innerHTML = tableHtml;
  section.scrollIntoView({ behavior: 'smooth' });
}

function finShowCompare() {
  var el = document.getElementById('fin-compare-section');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function finRunCompare() {
  var fm = parseInt(document.getElementById('fin-cmp-from-m').value);
  var fy = parseInt(document.getElementById('fin-cmp-from-y').value);
  var tm = parseInt(document.getElementById('fin-cmp-to-m').value);
  var ty = parseInt(document.getElementById('fin-cmp-to-y').value);
  var monthNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var fromData = finFiltered(fm, fy);
  var toData = finFiltered(tm, ty);
  var fromGroups = finGroupByTask(fromData.transactions);
  var toGroups = finGroupByTask(toData.transactions);
  var allCodes = new Set();
  Object.keys(fromGroups).forEach(function(c) { allCodes.add(c); });
  Object.keys(toGroups).forEach(function(c) { allCodes.add(c); });
  var html = '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
  html += '<tr style="background:#6a1b9a;color:white;"><th>البند</th><th>' + monthNames[fm] + ' ' + fy + '</th><th>' + monthNames[tm] + ' ' + ty + '</th><th>التغير</th><th>النسبة</th></tr>';
  var totalFrom = 0, totalTo = 0;
  var codes = Array.from(allCodes).sort();
  codes.forEach(function(code) {
    var fromVal = fromGroups[code] ? fromGroups[code].total : 0;
    var toVal = toGroups[code] ? toGroups[code].total : 0;
    totalFrom += fromVal;
    totalTo += toVal;
    var change = toVal - fromVal;
    var pct = fromVal ? Math.round((change / fromVal) * 100) : (toVal > 0 ? '∞' : 0);
    var name = (fromGroups[code] || toGroups[code] || {}).name || code;
    html += '<tr style="border-bottom:1px solid #eee;"><td style="font-weight:600;">' + name + '</td><td style="text-align:center;">' + fromVal.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td><td style="text-align:center;font-weight:700;color:#1565c0;">' + toVal.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td><td style="text-align:center;color:' + (change <= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (change >= 0 ? '+' : '') + change.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td><td style="text-align:center;font-weight:700;color:' + (change <= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (typeof pct === 'number' ? (pct >= 0 ? '+' : '') + pct + '%' : pct) + '</td></tr>';
  });
  html += '<tr style="background:#f5f5f5;font-weight:700;"><td>الإجمالي</td><td style="text-align:center;">' + totalFrom.toLocaleString() + '</td><td style="text-align:center;color:#1565c0;">' + totalTo.toLocaleString() + '</td><td style="text-align:center;color:' + (totalTo - totalFrom <= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (totalTo - totalFrom >= 0 ? '+' : '') + (totalTo - totalFrom).toLocaleString() + '</td><td style="text-align:center;">' + (totalFrom ? Math.round(((totalTo - totalFrom) / totalFrom) * 100) + '%' : '-') + '</td></tr>';
  html += '</table>';
  document.getElementById('fin-compare-result').innerHTML = html;
}

function finShowPredict() {
  var el = document.getElementById('fin-predict-section');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function finRunPredict() {
  var targetMonth = parseInt(document.getElementById('fin-pred-target-m').value);
  var targetYear = parseInt(document.getElementById('fin-pred-target-y').value);
  var results = [];
  var allCodes = new Set();
  finTransactions.forEach(function(t) { if (t.task) allCodes.add(t.task); });
  var monthNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  allCodes.forEach(function(code) {
    var monthlyTotals = {};
    var txByCode = finTransactions.filter(function(t) { return t.task === code; });
    txByCode.forEach(function(t) {
      var key = t.year + '-' + String(t.month).padStart(2, '0');
      if (!monthlyTotals[key]) monthlyTotals[key] = 0;
      monthlyTotals[key] += t.value || 0;
    });
    var points = Object.entries(monthlyTotals).sort().map(function(e) { return e[1]; });
    if (points.length === 0) return;
    var sum = 0;
    points.forEach(function(v) { sum += v; });
    var avg = sum / points.length;
    var n = points.length;
    var sumXY = 0, sumX2 = 0, sumX = 0, sumY = 0;
    points.forEach(function(v, i) { sumXY += i * v; sumX2 += i * i; sumX += i; sumY += v; });
    var trendSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    var trendIntercept = (sumY - trendSlope * sumX) / n;
    var seasonal = new Array(12).fill(0);
    var seasonalCount = new Array(12).fill(0);
    txByCode.forEach(function(t) {
      seasonal[t.month - 1] += t.value || 0;
      seasonalCount[t.month - 1]++;
    });
    var seasonalAvg = new Array(12).fill(0);
    for (var i = 0; i < 12; i++) {
      seasonalAvg[i] = seasonalCount[i] > 0 ? seasonal[i] / seasonalCount[i] : avg;
    }
    var targetIdx = n;
    var predTrend = trendIntercept + trendSlope * targetIdx;
    var predAvg = avg;
    var predSeasonal = seasonalAvg[targetMonth - 1];
    var predCombined = predTrend * 0.4 + predAvg * 0.3 + predSeasonal * 0.3;
    if (predCombined < 0) predCombined = 0;
    var name = txByCode[0]?.taskDesc || code;
    results.push({
      code: code, name: name, avg: avg, trend: predTrend, seasonal: predSeasonal, combined: predCombined,
      dataPoints: points.length
    });
  });
  results.sort(function(a, b) { return b.combined - a.combined; });
  var totalPred = 0;
  results.forEach(function(r) { totalPred += r.combined; });
  var html = '<div style="background:#fff;padding:12px;border-radius:8px;margin-bottom:10px;"><b style="font-size:16px;color:#e65100;">🔮 توقعات ' + monthNames[targetMonth] + ' ' + targetYear + '</b><br><span style="font-size:12px;color:#888;">بناءً على ' + finTransactions.length + ' معاملة سابقة — 3 معايير: متوسط حسابي + اتجاه (Regression) + موسمية</span></div>';
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
  html += '<tr style="background:#e65100;color:white;"><th>البند</th><th>المتوسط</th><th>الاتجاه</th><th>الموسمية</th><th style="background:#bf360c;">التوقع المدمج</th><th>نقاط البيانات</th></tr>';
  results.forEach(function(r) {
    html += '<tr style="border-bottom:1px solid #eee;">';
    html += '<td style="font-weight:600;">' + r.name + '</td>';
    html += '<td style="text-align:center;">' + Math.round(r.avg).toLocaleString() + '</td>';
    html += '<td style="text-align:center;">' + Math.round(r.trend).toLocaleString() + '</td>';
    html += '<td style="text-align:center;">' + Math.round(r.seasonal).toLocaleString() + '</td>';
    html += '<td style="text-align:center;font-weight:700;color:#e65100;background:#fff3e0;">' + Math.round(r.combined).toLocaleString() + '</td>';
    html += '<td style="text-align:center;color:#888;">' + r.dataPoints + '</td>';
    html += '</tr>';
  });
  html += '<tr style="background:#fff3e0;font-weight:700;"><td>الإجمالي المتوقع</td><td></td><td></td><td></td><td style="text-align:center;color:#e65100;font-size:16px;">' + Math.round(totalPred).toLocaleString() + '</td><td></td></tr>';
  html += '</table>';
  document.getElementById('fin-predict-result').innerHTML = html;
}

function finExportChoice() {
  var choice = prompt('اختر نوع التصدير:\n1 = Excel\n2 = PDF\nاكتب 1 أو 2:');
  if (choice === '1') finExportExcel();
  else if (choice === '2') finExportPDF();
}

function finShowYearlyBudget() {
  var el = document.getElementById('fin-yearly-section');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function finRunYearlyBudget() {
  var fromYear = parseInt(document.getElementById('fin-yr-from').value) || new Date().getFullYear();
  var toYear = parseInt(document.getElementById('fin-yr-to').value) || (fromYear + 1);
  var pctIncrease = parseFloat(document.getElementById('fin-yr-pct').value) || 0;
  var multiplier = 1 + (pctIncrease / 100);
  var fromData = finFiltered(0, fromYear);
  var fromGroups = finGroupByTask(fromData.transactions);
  var fromBudgetMap = {};
  fromData.budgets.forEach(function(b) { fromBudgetMap[b.code] = b; });
  var allCodes = new Set();
  Object.keys(fromGroups).forEach(function(c) { allCodes.add(c); });
  Object.keys(fromBudgetMap).forEach(function(c) { allCodes.add(c); });
  var results = [];
  var totalCurrent = 0, totalNew = 0, totalCurrentBudget = 0;
  allCodes.forEach(function(code) {
    var g = fromGroups[code] || {};
    var b = fromBudgetMap[code] || {};
    var currentActual = Math.round(g.total || 0);
    var currentBudget = Math.round(b.budget || 0);
    var base = currentActual || currentBudget;
    var newBudget = Math.round(base * multiplier);
    var name = g.name || b.name || code;
    results.push({ code: code, name: name, currentActual: currentActual, currentBudget: currentBudget, base: base, newBudget: newBudget });
    totalCurrent += currentActual;
    totalNew += newBudget;
    totalCurrentBudget += currentBudget;
  });
  results.sort(function(a, b) { return b.newBudget - a.newBudget; });
  var html = '<div style="background:#fff;padding:12px;border-radius:8px;margin-bottom:10px;"><b style="font-size:16px;color:#0d47a1;">📐 ميزانية ' + toYear + '</b><br><span style="font-size:12px;color:#888;">بناءً على بيانات ' + fromYear + ' + نسبة زيادة ' + pctIncrease + '% — عدد البنود: ' + results.length + '</span></div>';
  if (results.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#888;">لا توجد بيانات للسنة ' + fromYear + '. قم باستيراد تقارير أولاً.</div>';
    document.getElementById('fin-yearly-result').innerHTML = html;
    return;
  }
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
  html += '<tr style="background:#0d47a1;color:white;"><th>الكود</th><th>البند</th><th>فعلي ' + fromYear + '</th><th>ميزانية ' + fromYear + '</th><th>الأساس</th><th>نسبة الزيادة</th><th style="background:#1565c0;">ميزانية ' + toYear + '</th></tr>';
  results.forEach(function(r) {
    html += '<tr style="border-bottom:1px solid #eee;">';
    html += '<td style="font-weight:700;">' + r.code + '</td>';
    html += '<td style="font-weight:600;">' + r.name + '</td>';
    html += '<td style="text-align:center;">' + (r.currentActual ? r.currentActual.toLocaleString() : '-') + '</td>';
    html += '<td style="text-align:center;">' + (r.currentBudget ? r.currentBudget.toLocaleString() : '-') + '</td>';
    html += '<td style="text-align:center;font-weight:600;">' + r.base.toLocaleString() + '</td>';
    html += '<td style="text-align:center;color:#2e7d32;">+' + pctIncrease + '%</td>';
    html += '<td style="text-align:center;font-weight:700;color:#0d47a1;background:#e3f2fd;">' + r.newBudget.toLocaleString() + '</td>';
    html += '</tr>';
  });
  html += '<tr style="background:#e3f2fd;font-weight:700;"><td>الإجمالي</td><td></td><td style="text-align:center;">' + totalCurrent.toLocaleString() + '</td><td style="text-align:center;">' + totalCurrentBudget.toLocaleString() + '</td><td style="text-align:center;">' + totalCurrent.toLocaleString() + '</td><td></td><td style="text-align:center;color:#0d47a1;font-size:16px;">' + totalNew.toLocaleString() + '</td></tr>';
  html += '</table>';
  document.getElementById('fin-yearly-result').innerHTML = html;
}

function finShowOverview() {
  var el = document.getElementById('fin-overview-section');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  var sel = document.getElementById('fin-ov-year');
  var years = new Set();
  finTransactions.forEach(function(t) { if (t.year) years.add(t.year); });
  finBudgets.forEach(function(b) { if (b.year) years.add(b.year); });
  if (years.size === 0) years.add(new Date().getFullYear());
  sel.innerHTML = '';
  Array.from(years).sort().forEach(function(y) {
    sel.innerHTML += '<option value="' + y + '">' + y + '</option>';
  });
  sel.value = new Date().getFullYear();
  finRunOverview();
}

function finRunOverview() {
  var year = parseInt(document.getElementById('fin-ov-year').value) || new Date().getFullYear();
  var monthNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var monthsData = [];
  var totalBudget = 0, totalActual = 0;
  for (var m = 1; m <= 12; m++) {
    var d = finFiltered(m, year);
    var mBudget = 0, mActual = 0;
    d.budgets.forEach(function(b) { mBudget += b.budget; });
    d.transactions.forEach(function(t) { mActual += t.value || 0; });
    monthsData.push({ month: m, name: monthNames[m], budget: Math.round(mBudget), actual: Math.round(mActual), variance: Math.round(mBudget - mActual), txCount: d.transactions.length });
    totalBudget += mBudget;
    totalActual += mActual;
  }
  var importedMonths = monthsData.filter(function(m) { return m.budget > 0 || m.actual > 0; });
  var avgMonthly = importedMonths.length > 0 ? Math.round(totalActual / importedMonths.length) : 0;
  var projected = avgMonthly * 12;
  var html = '<div style="background:#fff;padding:12px;border-radius:8px;margin-bottom:10px;"><b style="font-size:16px;color:#2e7d32;">📋 ملخص شامل — ' + year + '</b><br><span style="font-size:12px;color:#888;">أشهر مسجلة: ' + importedMonths.length + '/12 — إجمالي المعاملات: ' + finTransactions.length + '</span></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;">';
  html += '<div style="background:#e8f5e9;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#666;">إجمالي الميزانية</div><div style="font-size:18px;font-weight:700;color:#2e7d32;">' + Math.round(totalBudget).toLocaleString() + '</div></div>';
  html += '<div style="background:#e3f2fd;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#666;">إجمالي الفعلي</div><div style="font-size:18px;font-weight:700;color:#1565c0;">' + Math.round(totalActual).toLocaleString() + '</div></div>';
  html += '<div style="background:#fff3e0;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#666;">متوسط شهري</div><div style="font-size:18px;font-weight:700;color:#e65100;">' + avgMonthly.toLocaleString() + '</div></div>';
  html += '<div style="background:#f3e5f5;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#666;">المتوقع للسنة</div><div style="font-size:18px;font-weight:700;color:#6a1b9a;">' + projected.toLocaleString() + '</div></div>';
  html += '</div>';
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
  html += '<tr style="background:#2e7d32;color:white;"><th>الشهر</th><th>الميزانية</th><th>الفعلي</th><th>الانحراف</th><th>نسبة التنفيذ</th><th>عدد المعاملات</th></tr>';
  monthsData.forEach(function(m) {
    var pct = m.budget ? Math.round((m.actual / m.budget) * 100) : (m.actual > 0 ? '-' : 0);
    var rowBg = m.budget > 0 || m.actual > 0 ? '' : 'background:#f5f5f5;';
    var pctColor = typeof pct === 'number' ? (pct <= 100 ? '#2e7d32' : '#d32f2f') : '#888';
    html += '<tr style="border-bottom:1px solid #eee;' + rowBg + '">';
    html += '<td style="font-weight:600;">' + m.name + '</td>';
    html += '<td style="text-align:center;">' + (m.budget ? m.budget.toLocaleString() : '-') + '</td>';
    html += '<td style="text-align:center;font-weight:700;color:#1565c0;">' + (m.actual ? m.actual.toLocaleString() : '-') + '</td>';
    html += '<td style="text-align:center;color:' + (m.variance >= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (m.actual ? (m.variance >= 0 ? '+' : '') + m.variance.toLocaleString() : '-') + '</td>';
    html += '<td style="text-align:center;font-weight:700;color:' + pctColor + ';">' + (typeof pct === 'number' ? pct + '%' : pct) + '</td>';
    html += '<td style="text-align:center;color:#888;">' + m.txCount + '</td>';
    html += '</tr>';
  });
  html += '<tr style="background:#e8f5e9;font-weight:700;"><td>الإجمالي</td><td style="text-align:center;">' + Math.round(totalBudget).toLocaleString() + '</td><td style="text-align:center;color:#1565c0;">' + Math.round(totalActual).toLocaleString() + '</td><td style="text-align:center;color:' + (totalBudget - totalActual >= 0 ? '#2e7d32' : '#d32f2f') + ';">' + (totalBudget - totalActual >= 0 ? '+' : '') + Math.round(totalBudget - totalActual).toLocaleString() + '</td><td style="text-align:center;">' + (totalBudget ? Math.round((totalActual / totalBudget) * 100) + '%' : '-') + '</td><td style="text-align:center;">' + importedMonths.reduce(function(s, m) { return s + m.txCount; }, 0) + '</td></tr>';
  html += '</table>';
  document.getElementById('fin-overview-result').innerHTML = html;
}

function finExportExcel() {
  var year = document.getElementById('fin-year-select')?.value || new Date().getFullYear();
  var month = parseInt(document.getElementById('fin-month-select')?.value || 0);
  var data = finFiltered(month, year);
  var groups = finGroupByTask(data.transactions);
  var monthNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var budgetMap = {};
  data.budgets.forEach(function(b) { budgetMap[b.code] = b; });
  var rows = [];
  for (var code in groups) {
    var g = groups[code];
    var b = budgetMap[code] || {};
    rows.push({
      'الكود': code, 'البند': g.name,
      'الميزانية': b.budget || 0, 'الفعلي': Math.round(g.actual || g.total),
      'الانحراف': (b.budget || 0) - Math.round(g.actual || g.total),
      'نسبة التنفيذ': b.budget ? Math.round((g.total / b.budget) * 100) + '%' : '-',
      'ميزانية YTD': b.ytdBudget || 0, 'فعلي YTD': b.ytdActual || 0
    });
  }
  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الميزانية');
  XLSX.writeFile(wb, 'تقرير_الميزانية_' + year + '.xlsx');
}

function finExportPDF() {
  var year = document.getElementById('fin-year-select')?.value || new Date().getFullYear();
  var month = parseInt(document.getElementById('fin-month-select')?.value || 0);
  var data = finFiltered(month, year);
  var groups = finGroupByTask(data.transactions);
  var budgetMap = {};
  data.budgets.forEach(function(b) { budgetMap[b.code] = b; });
  var html = '<div style="font-family:Cairo,sans-serif;padding:20px;direction:rtl;"><h2 style="text-align:center;color:#1b5e20;">تقرير المركز المالي — ' + year + '</h2>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1b5e20;color:white;"><th>الكود</th><th>البند</th><th>الميزانية</th><th>الفعلي</th><th>الانحراف</th><th>نسبة التنفيذ</th><th>ميزانية YTD</th><th>فعلي YTD</th></tr></thead><tbody>';
  for (var code in groups) {
    var g = groups[code];
    var b = budgetMap[code] || {};
    var pct = b.budget ? Math.round((g.total / b.budget) * 100) : '-';
    html += '<tr style="border-bottom:1px solid #ddd;"><td>' + code + '</td><td>' + g.name + '</td><td style="text-align:center;">' + (b.budget || '-').toLocaleString() + '</td><td style="text-align:center;font-weight:700;">' + Math.round(g.total).toLocaleString() + '</td><td style="text-align:center;">' + ((b.budget || 0) - Math.round(g.total)).toLocaleString() + '</td><td style="text-align:center;">' + pct + '%</td><td style="text-align:center;">' + (b.ytdBudget || '-').toLocaleString() + '</td><td style="text-align:center;">' + (b.ytdActual || '-').toLocaleString() + '</td></tr>';
  }
  html += '</tbody></table></div>';
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set({ margin: 1, filename: 'تقرير_الميزانية_' + year + '.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'cm', format: 'a4', orientation: 'landscape' } }).from(html).save();
  }
}

setTimeout(finInit, 200);
