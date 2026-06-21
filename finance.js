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
  try {
    localStorage.setItem('fin_transactions', JSON.stringify(finTransactions));
    localStorage.setItem('fin_budgets', JSON.stringify(finBudgets));
  } catch(e) {
    /* localStorage full — try removing oldest transactions */
    while (finTransactions.length > 500) {
      finTransactions.shift();
      try { localStorage.setItem('fin_transactions', JSON.stringify(finTransactions)); return; } catch(e2) {}
    }
    alert('⚠️ مساحة التخزين ممتلية. تم الاحتفاظ بأحدث 500 معاملة فقط.');
  }
  if (typeof syncStorage === 'function') syncStorage();
}

function finExcelSerial(dateStr) {
  if (!dateStr) return 0;
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((d.getTime() / 86400000) + 25569);
}

function finParseDate(dateVal) {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;
  if (typeof dateVal === 'number' && dateVal > 30000 && dateVal < 60000) {
    return new Date((dateVal - 25569) * 86400 * 1000);
  }
  if (typeof dateVal === 'string') {
    var trimmed = dateVal.trim();
    if (!trimmed) return null;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      var parts = trimmed.split('/');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      return new Date(trimmed);
    }
  }
  var d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  var asNum = parseFloat(dateVal);
  if (!isNaN(asNum) && asNum > 30000 && asNum < 60000) {
    return new Date((asNum - 25569) * 86400 * 1000);
  }
  return null;
}

function finMonthFromExcelDate(serial) {
  if (serial === null || serial === undefined) return 0;
  var d = (serial instanceof Date) ? serial : finParseDate(serial);
  if (!d || isNaN(d.getTime())) return 0;
  return d.getMonth() + 1;
}

function finYearFromExcelDate(serial) {
  if (serial === null || serial === undefined) return 0;
  var d = (serial instanceof Date) ? serial : finParseDate(serial);
  if (!d || isNaN(d.getTime())) return 0;
  return d.getFullYear();
}

function finExcelDate(serial) {
  if (serial === null || serial === undefined) return '';
  var d = (serial instanceof Date) ? serial : finParseDate(serial);
  if (!d || isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function finClearAll() {
  if (!confirm('⚠️ سيتم مسح جميع المعاملات والميزانيات المالية.\nهل أنت متأكد؟')) return;
  if (!confirm('تأكيد أخير: مسح كل البيانات المالية؟')) return;
  finTransactions = [];
  finBudgets = [];
  finSave();
  finPopulateYearSelect();
  finRenderAll();
  alert('✅ تم مسح كل البيانات المالية.');
}

function finImportReport(evt) {
  var files = evt.target.files;
  if (!files || !files.length) return;
  var fileArr = Array.from(files);
  var totalImported = 0, totalBudget = 0, totalFiles = fileArr.length, done = 0;
  var debugLog = [];
  fileArr.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var result = finProcessWorkbook(workbook, file.name);
        totalImported += result.imported;
        totalBudget += result.budgetSheets;
        debugLog.push(file.name + ': sheets=' + workbook.SheetNames.join(',') + (result.budgetInfo ? ' | month=' + result.budgetInfo.month + ' year=' + result.budgetInfo.year : ''));
      } catch(err) { console.error('Import error:', file.name, err); debugLog.push(file.name + ': ERROR ' + err.message); }
      done++;
      if (done === totalFiles) {
        finSave();
        finPopulateYearSelect();
        finRenderAll();
        var msg = '✅ تم استيراد ' + totalFiles + ' ملفات\n📦 ' + totalImported + ' معاملة\n📊 ' + totalBudget + ' شيت ميزانية\n\n--- تفاصيل ---\n' + debugLog.join('\n');
        alert(msg);
      }
    };
    reader.readAsArrayBuffer(file);
  });
  evt.target.value = '';
}

function finProcessWorkbook(workbook, fileName) {
  var imported = 0, budgetSheets = 0;
  var budgetInfo = null;
  try {
    var importedBudget = 0;
    var _dbgKeys = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var sheet = workbook.Sheets[sheetName];

        /* ── first pass: detect if budget sheet by reading raw with header:1 ── */
        var rawArr = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rawArr.length) return;
        /* find the header row (first row with "Overhead" and "Budget") */
        var headerRowIdx = -1;
        for (var ri = 0; ri < Math.min(rawArr.length, 5); ri++) {
          var cells = rawArr[ri] || [];
          var hasOH = cells.some(function(c) { return String(c || '').trim() === 'Overhead'; });
          var hasBG = cells.some(function(c) { return String(c || '').trim() === 'Budget'; });
          if (hasOH && hasBG) { headerRowIdx = ri; break; }
        }

        /* ── Budget sheet (Sheet2 style) ── */
        if (headerRowIdx >= 0) {
          var headerCells = rawArr[headerRowIdx] || [];
          var monthMapShort = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12};
          var monthMapFull = {'january':1,'february':2,'march':3,'april':4,'june':6,'july':7,'august':8,'september':9,'october':10,'november':11,'december':12};
          var monthMapAr = {'يناير':1,'فبراير':2,'مارس':3,'أبريل':4,'مايو':5,'يونيو':6,'يوليو':7,'أغسطس':8,'سبتمبر':9,'أكتوبر':10,'نوفمبر':11,'ديسمبر':12};
          var detectedMonth = 0;

          /* 1st: detect from sheet name */
          var snLower = sheetName.toLowerCase();
          for (var mk in monthMapShort) { if (snLower.indexOf(mk) >= 0) { detectedMonth = monthMapShort[mk]; break; } }
          if (!detectedMonth) { for (var mk in monthMapFull) { if (snLower.indexOf(mk) >= 0) { detectedMonth = monthMapFull[mk]; break; } } }
          if (!detectedMonth) { for (var mk in monthMapAr) { if (sheetName.indexOf(mk) >= 0) { detectedMonth = monthMapAr[mk]; break; } } }

          /* 2nd: detect from row above header (row 0) or first non-empty row */
          if (!detectedMonth) {
            var scanRows = [rawArr[0], rawArr[1]];
            for (var ri = 0; ri < scanRows.length && !detectedMonth; ri++) {
              var monthRow = scanRows[ri] || [];
              for (var ci = 0; ci < monthRow.length && !detectedMonth; ci++) {
                var mv = String(monthRow[ci] || '').trim().toLowerCase();
                for (var mk in monthMapShort) { if (mv.indexOf(mk) >= 0) { detectedMonth = monthMapShort[mk]; break; } }
                if (!detectedMonth) { for (var mk in monthMapFull) { if (mv.indexOf(mk) >= 0) { detectedMonth = monthMapFull[mk]; break; } } }
                if (!detectedMonth) {
                  var mvOrig = String(monthRow[ci] || '').trim();
                  for (var mk in monthMapAr) { if (mvOrig.indexOf(mk) >= 0) { detectedMonth = monthMapAr[mk]; break; } }
                }
              }
            }
          }

          if (!detectedMonth) detectedMonth = 1;

          var detectedYear = new Date().getFullYear();
          /* detect year from sheet name first */
          var yearMatch = sheetName.match(/(\d{4})/);
          if (yearMatch) detectedYear = parseInt(yearMatch[1]);
          /* also try row 0/1 for year */
          if (!yearMatch) {
            for (var ri = 0; ri < 2 && !yearMatch; ri++) {
              var yRow = rawArr[ri] || [];
              for (var ci = 0; ci < yRow.length && !yearMatch; ci++) {
                var ym = String(yRow[ci] || '').match(/(\d{4})/);
                if (ym) { detectedYear = parseInt(ym[1]); yearMatch = ym; }
              }
            }
          }

          /* build key->index map from header row */
          var keyIdx = {};
          headerCells.forEach(function(c, ci) { keyIdx[String(c || '').trim()] = ci; });
          var overheadIdx = keyIdx['Overhead'];
          var budgetIdx = keyIdx['Budget'];
          var actualIdx = keyIdx['Actual'];
          var varianceIdx = keyIdx['Variance'];
          var ytdBudgetIdx = keyIdx['YTD Budget'];
          var ytdActualIdx = keyIdx['YTD Actual'];
          var ytdVarianceIdx = keyIdx['YTD Variance'];
          /* fallback: scan all header cells for YTD columns */
          if (ytdBudgetIdx === undefined || ytdActualIdx === undefined) {
            var ytdCols = [];
            headerCells.forEach(function(c, ci) {
              var s = String(c || '').trim();
              if (s.indexOf('YTD') >= 0) ytdCols.push({ label: s, idx: ci });
            });
            ytdCols.forEach(function(yc) {
              if (yc.label.indexOf('Budget') >= 0 && ytdBudgetIdx === undefined) ytdBudgetIdx = yc.idx;
              if (yc.label.indexOf('Actual') >= 0 && ytdActualIdx === undefined) ytdActualIdx = yc.idx;
              if (yc.label.indexOf('Variance') >= 0 && ytdVarianceIdx === undefined) ytdVarianceIdx = yc.idx;
            });
          }

          /* data rows start after header */
          for (var dri = headerRowIdx + 1; dri < rawArr.length; dri++) {
            var row = rawArr[dri] || [];
            if (overheadIdx === undefined) continue;
            var overheadName = String(row[overheadIdx] || '').trim();
            if (!overheadName || overheadName === 'Total' || overheadName === 'total') continue;
            var code = String(row[0] || '').trim();
            if (!code || code === 'Total') continue;
            var budget = budgetIdx !== undefined ? parseFloat(row[budgetIdx]) || 0 : 0;
            var actual = actualIdx !== undefined ? parseFloat(row[actualIdx]) || 0 : 0;
            var variance = varianceIdx !== undefined ? parseFloat(row[varianceIdx]) || 0 : (budget - actual);
            var pct = budget ? Math.round((actual / budget) * 100) : 0;
            var ytdB = ytdBudgetIdx !== undefined ? parseFloat(row[ytdBudgetIdx]) || 0 : 0;
            var ytdA = ytdActualIdx !== undefined ? parseFloat(row[ytdActualIdx]) || 0 : 0;
            var ytdV = ytdVarianceIdx !== undefined ? parseFloat(row[ytdVarianceIdx]) || 0 : (ytdB - ytdA);
            var ytdP = ytdB ? Math.round((ytdA / ytdB) * 100) : 0;
            var existingIdx = finBudgets.findIndex(function(b) { return b.code === code && b.month === detectedMonth && b.year === detectedYear; });
            var entry = {
              code: code, name: overheadName, month: detectedMonth, year: detectedYear,
              budget: budget, actual: actual, variance: variance, percent: pct,
              ytdBudget: ytdB, ytdActual: ytdA, ytdVariance: ytdV, ytdPercent: ytdP,
              modifiedAt: new Date().toISOString()
            };
            if (existingIdx >= 0) finBudgets[existingIdx] = entry; else finBudgets.push(entry);
          }
          importedBudget++;
          budgetInfo = { month: detectedMonth, year: detectedYear, sheet: sheetName };
        }

        /* ── Transactions sheet (المصروفات) ── AGGREGATE by task+item+month ── */
        var json = XLSX.utils.sheet_to_json(sheet);
        if (!json.length) return;
        var firstRow = json[0];
        var keys = Object.keys(firstRow);
        if (_dbgKeys.length === 0) _dbgKeys = keys.slice(0, 20);
        var trimmedKeys = keys.map(function(k) { return k.trim(); });
        var hasTaskCol = trimmedKeys.some(function(k) { return k === 'Task'; });
        var hasValueCol = trimmedKeys.some(function(k) { return k === 'القيمة' || k === 'Value'; });
        if (hasTaskCol && hasValueCol) {
          /* first pass: collect all rows into a temp map, aggregated by task+item+month */
          var aggMap = {};
          json.forEach(function(row) {
            var taskVal = '', dateVal = '', itemName = '', taskDesc = '';
            var qty = 0, price = 0, value = 0, costCenterDesc = '';
            for (var origK in row) {
              var tk = origK.trim();
              if (tk === 'Task') taskVal = row[origK];
              if (tk === 'التاريخ' || tk === 'Date') dateVal = row[origK];
              if (tk === 'اسم الصـــنف' || tk === 'اسم الصنف') itemName = row[origK];
              if (tk === 'كمية الصرف' || tk === 'الكمية' || tk === 'Qty') qty = parseFloat(row[origK]) || 0;
              if (tk === 'السعر' || tk === 'Price') price = parseFloat(row[origK]) || 0;
              if (tk === 'القيمة' || tk === 'Value') value = parseFloat(row[origK]) || 0;
              if (tk === 'Cost center Description' || tk === 'Cost Center Description') costCenterDesc = row[origK];
              if (tk === 'Task Description') taskDesc = row[origK];
            }
            var overheadCode = String(taskVal).trim();
            if (!overheadCode) return;
            var parsed = finParseDate(dateVal);
            var txMonth = finMonthFromExcelDate(parsed);
            var txYear = finYearFromExcelDate(parsed);
            if (isNaN(value) || value === 0) value = qty * price;
            if (!value || value === 0) return;
            itemName = String(itemName || '').trim() || 'غير محدد';
            var key = overheadCode + '|' + itemName + '|' + txYear + '|' + txMonth;
            if (!aggMap[key]) aggMap[key] = { task: overheadCode, taskDesc: String(taskDesc || '').trim(), itemName: itemName, year: txYear, month: txMonth, totalQty: 0, totalValue: 0, count: 0, costCenterDesc: String(costCenterDesc || '').trim() };
            aggMap[key].totalQty += qty;
            aggMap[key].totalValue += value;
            aggMap[key].count++;
          });
          /* second pass: push aggregated records */
          for (var key in aggMap) {
            var a = aggMap[key];
            var txObj = {
              task: a.task, taskDesc: a.taskDesc, itemName: a.itemName,
              year: a.year, month: a.month,
              qty: Math.round(a.totalQty * 100) / 100,
              value: Math.round(a.totalValue * 100) / 100,
              count: a.count,
              costCenterDesc: a.costCenterDesc
            };
            var existsIdx = finTransactions.findIndex(function(t) { return t.task === a.task && t.itemName === a.itemName && t.year === a.year && t.month === a.month; });
            if (existsIdx >= 0) {
              finTransactions[existsIdx].qty += txObj.qty;
              finTransactions[existsIdx].value += txObj.value;
              finTransactions[existsIdx].count += txObj.count;
            } else {
              finTransactions.push(txObj);
            }
          }
          imported += Object.keys(aggMap).length;
        }
      });
      budgetSheets = importedBudget;
    return { imported: imported, budgetSheets: budgetSheets, budgetInfo: budgetInfo };
  } catch(err) { console.error('finProcessWorkbook error:', err); return { imported: 0, budgetSheets: 0 }; }
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
  /* select the latest year from data, not current calendar year */
  var sortedYears = Array.from(years).sort();
  sel.value = sortedYears[sortedYears.length - 1];
}

function finFiltered(month, year) {
  var yr = Number(year);
  var mo = Number(month);
  var tx = finTransactions.filter(function(t) { return Number(t.year) === yr && (mo === 0 || Number(t.month) === mo); });
  var bg = finBudgets.filter(function(b) { return Number(b.year) === yr && (mo === 0 || Number(b.month) === mo); });
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
    if (!groups[code].items[itemName]) groups[code].items[itemName] = { name: itemName, total: 0, count: 0 };
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
    merged[code].actual = groups[code].total;
  }
  var rows = Object.values(merged).sort(function(a, b) { return (b.actual || 0) - (a.actual || 0); });
  rows.forEach(function(r) { r.variance = r.budget - r.actual; });
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
    if (!itemGroups[name]) itemGroups[name] = { name: name, total: 0, count: 0 };
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
  var tableHtml = '<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="background:#1b5e20;color:white;"><th>الصنف</th><th>الكمية</th><th>عدد مرات الصرف</th><th>إجمالي القيمة</th><th>مركز التكلفة</th></tr></thead><tbody>';
  filtered.sort(function(a, b) { return (b.value || 0) - (a.value || 0); }).forEach(function(t) {
    tableHtml += '<tr><td>' + t.itemName + '</td><td style="text-align:center;">' + (t.qty || 0) + '</td><td style="text-align:center;">' + (t.count || 0) + '</td><td style="text-align:center;font-weight:700;color:#1565c0;">' + (t.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '</td><td>' + (t.costCenterDesc || '') + '</td></tr>';
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

function finShowDeptConsumption() {
  var sec = document.getElementById('fin-dept-section');
  if (!sec) return;
  sec.style.display = 'block';
  var sel = document.getElementById('fin-dept-select');
  if (!sel) return;
  var tasks = {};
  finTransactions.forEach(function(t) {
    var code = t.task || 'غير محدد';
    if (!tasks[code]) tasks[code] = t.taskDesc || code;
  });
  sel.innerHTML = '<option value="">الكل</option>';
  Object.keys(tasks).sort().forEach(function(code) {
    sel.innerHTML += '<option value="' + code + '">' + code + ' — ' + tasks[code] + '</option>';
  });
  var dates = finTransactions.map(function(t) { return t.date || ''; }).filter(Boolean).sort();
  if (dates.length) {
    document.getElementById('fin-dept-from').value = dates[0];
    document.getElementById('fin-dept-to').value = dates[dates.length - 1];
  }
  finRenderDeptConsumption();
}

function finRenderDeptConsumption() {
  var el = document.getElementById('fin-dept-result');
  if (!el) return;
  var taskCode = document.getElementById('fin-dept-select').value;
  var from = document.getElementById('fin-dept-from').value || '';
  var to = document.getElementById('fin-dept-to').value || '';
  var filtered = finTransactions.filter(function(t) {
    if (taskCode && t.task !== taskCode) return false;
    if (from && t.date && t.date < from) return false;
    if (to && t.date && t.date > to) return false;
    return true;
  });
  if (!filtered.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">لا توجد بيانات في هذه الفترة</div>'; return; }
  var items = {};
  filtered.forEach(function(t) {
    var name = t.itemName || 'غير محدد';
    if (!items[name]) items[name] = { name: name, total: 0, count: 0, task: t.task || '' };
    items[name].total += t.value || 0;
    items[name].count += t.count || 0;
  });
  var rows = Object.values(items).sort(function(a, b) { return b.total - a.total; });
  var grandTotal = rows.reduce(function(s, r) { return s + r.total; }, 0);
  var html = '<div style="background:#e0f2f1;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">';
  html += '<b>إجمالي الاستهلاك:</b> <span style="color:#00695c;font-weight:700;font-size:16px;">' + grandTotal.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' ج.م</span>';
  html += ' | <b>عدد البندات:</b> ' + rows.length;
  html += ' | <b>عدد المعاملات:</b> ' + filtered.length;
  html += '</div>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
  html += '<thead><tr style="background:#00695c;color:white;"><th style="padding:8px;text-align:right;">البند</th><th style="padding:8px;">الإدارة</th><th style="padding:8px;">العدد</th><th style="padding:8px;">الإجمالي</th><th style="padding:8px;">النسبة</th></tr></thead><tbody>';
  rows.forEach(function(r) {
    var pct = grandTotal > 0 ? Math.round(r.total / grandTotal * 100) : 0;
    html += '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:600;">' + r.name + '</td><td style="padding:8px;color:#666;">' + r.task + '</td><td style="padding:8px;text-align:center;">' + r.count + '</td><td style="padding:8px;text-align:center;font-weight:700;color:#00695c;">' + r.total.toLocaleString(undefined, {maximumFractionDigits: 0}) + '</td><td style="padding:8px;text-align:center;"><div style="display:flex;align-items:center;gap:4px;justify-content:center;"><div style="width:50px;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:#00695c;border-radius:3px;"></div></div>' + pct + '%</div></td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}
