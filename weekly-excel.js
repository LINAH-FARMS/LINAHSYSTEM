// weekly-excel.js — تقرير الأسبوع Excel مباشرة من المتصفح (بدون بايثون)
// يطابق مخرجات reports/weekly_report.py: نفس الشيتات ونفس الحسابات، باستخدام البيانات المحلية.

(function () {
  'use strict';

  var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  function normDate(s) {
    if (!s) return '';
    s = String(s).slice(0, 10);
    s = s.replace(/[٠-٩]/g, function (d) { return String(AR_DIGITS.indexOf(d)); });
    s = s.replace(/[\u200f\u200e]/g, '').trim();
    var parts = s.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
    return s;
  }

  function isEmoji(ch) {
    var c = ch.codePointAt(0);
    return (c >= 0x2600 && c <= 0x27BF) || (c >= 0x1F300 && c <= 0x1FAFF) || (c >= 0xFE00 && c <= 0xFE0F);
  }

  function stripEmoji(s) {
    return Array.from(String(s == null ? '' : s)).filter(function (ch) { return !isEmoji(ch); }).join('').trim();
  }

  function lastCompletedFriday() {
    var t = new Date();
    var since = (t.getDay() - 5 + 7) % 7;
    if (since === 0) since = 7;
    var end = new Date(t);
    end.setDate(t.getDate() - since);
    return end;
  }

  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function loadIncidentReports() {
    try {
      var raw = localStorage.getItem('linah_reports');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function inRange(arr, key, start, end) {
    return (arr || []).filter(function (x) {
      var d = normDate(x[key] || '');
      return d && d >= start && d <= end;
    });
  }

  function computeDailyStats(dateStr) {
    var active = [];
    employees.forEach(function (e) {
      var hd = normDate(e.hireDate || '');
      if (hd && hd > dateStr) return;
      var excluded = false;
      excludedEmployees.forEach(function (x) {
        var xkey = String(x.code || '') || String(x.name || '');
        var ekey = String(e.code || '') || String(e.name || '');
        if (xkey !== ekey) return;
        var xd = normDate(x.date || '');
        if (xd && xd <= dateStr) excluded = true;
      });
      if (!excluded) active.push(e);
    });
    var total = active.length, permP = 0, permV = 0, casP = 0, casV = 0;
    active.forEach(function (e) {
      var onVac = false;
      vacations.forEach(function (v) {
        var vs = normDate(v.start || v.startDate || v.dateFrom || '');
        var ve = normDate(v.end || v.endDate || v.dateTo || '');
        if (!vs || !ve) return;
        var id = v.code || v.employeeCode;
        var nm = v.employeeName || v.name;
        var match = (id && String(id) === String(e.code)) || (nm && String(nm) === String(e.name));
        if (match && vs <= dateStr && ve >= dateStr) onVac = true;
      });
      var present = e.status !== 'V' && !onVac;
      if ((e.contract || 'دائم') === 'دائم') { if (present) permP++; else permV++; }
      else { if (present) casP++; else casV++; }
    });
    var guests = 0;
    hospitalities.forEach(function (h) {
      var arr = normDate(h.arrival || '');
      if (!arr) return;
      var dep = normDate(h.departure || h.arrival || '');
      if (arr <= dateStr && dateStr <= dep) guests += parseInt(h.guests || 1, 10) || 1;
    });
    function pct(n) { return total > 0 ? Math.round(n / total * 100) : 0; }
    return [dateStr, total, permP, pct(permP) + '%', permV, pct(permV) + '%', casP, pct(casP) + '%', guests];
  }

  function totalsRow(ws, rowIdx, values) {
    values.forEach(function (v, i) {
      var addr = XLSX.utils.encode_cell({ r: rowIdx, c: i });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].v = v;
      ws[addr].s = { font: { bold: true, size: 11, color: { rgb: ExcelStyle.headerBg } } };
    });
  }

  function exportWeeklyExcel() {
    var start, end;
    var fromEl = document.getElementById('custom-report-from');
    var toEl = document.getElementById('custom-report-to');
    var from = fromEl ? fromEl.value : '';
    var to = toEl ? toEl.value : '';
    if (from && to && from <= to) {
      start = new Date(from + 'T00:00:00');
      end = new Date(to + 'T00:00:00');
    } else {
      end = lastCompletedFriday();
      start = new Date(end);
      start.setDate(end.getDate() - 6);
      if (from || to) return alert('⚠️ اختر تاريخ البداية والنهاية صحيحين (من <= إلى)');
    }
    var startStr = fmt(start), endStr = fmt(end);

    var hosp = inRange(hospitalities, 'arrival', startStr, endStr);
    var prods = inRange(bakeryProductions, 'date', startStr, endStr);
    var ctrSup = inRange(bakeryContractorSupplies, 'date', startStr, endStr);
    var meals = inRange(mealLogs, 'date', startStr, endStr);
    var maint = inRange(maintenanceRecords, 'date', startStr, endStr);
    var septic = inRange(septicRecords, 'date', startStr, endStr);
    var tsBatches = inRange(teaSugarBatches, 'date', startStr, endStr);
    var teaSugar = inRange(teaSugarDisbursements, 'date', startStr, endStr);
    var incidents = inRange(loadIncidentReports(), 'opened_at', startStr, endStr);
    var mw = inRange(mealWaste, 'date', startStr, endStr);

    var pCount = employees.filter(function (e) { return e.status === 'P'; }).length;
    var vCount = employees.filter(function (e) { return e.status === 'V'; }).length;

    var wb = XLSX.utils.book_new();

    var summaryRows = [
      ['Total Employees (القوة)', employees.length],
      ['Present (P)', pCount],
      ['Vacation (V)', vCount],
      ['Hospitality', hosp.length],
      ['Bakery Production', prods.length],
      ['Contractor Supply', ctrSup.length],
      ['Meals', meals.length],
      ['Maintenance', maint.length],
      ['Septic', septic.length],
      ['Incidents', incidents.length],
      ['Tea & Sugar (Batches)', tsBatches.length],
      ['Tea & Sugar (Disbursed)', teaSugar.length],
      ['Meal Waste', mw.length]
    ];
    var wsSum = ExcelStyle.makeSheet(summaryRows, { headerRow: 0, colWidths: [{ wch: 28 }, { wch: 12 }] });
    var sumTitle = XLSX.utils.encode_cell({ r: 0, c: 0 });
    wsSum[sumTitle].v = 'Weekly Report ' + startStr + ' to ' + endStr;
    wsSum[sumTitle].s = ExcelStyle.titleStyle();
    XLSX.utils.book_append_sheet(wb, wsSum, 'Summary');

    var dsRows = [];
    var cur = new Date(start);
    while (cur <= end) {
      dsRows.push(computeDailyStats(fmt(cur)));
      cur.setDate(cur.getDate() + 1);
    }
    if (dsRows.length) {
      function avg(idx) { return Math.round(dsRows.reduce(function (s, r) { return s + parseInt(r[idx], 10); }, 0) / dsRows.length); }
      var dsData = [['Date', 'Total', 'Perm Present', 'Perm Present %', 'Perm Leave', 'Perm Leave %', 'Casual Present', 'Casual Present %', 'Guests']].concat(dsRows);
      if (dsRows.length > 1) {
        dsData.push(['معدل', avg(1), avg(2), '', avg(4), '', avg(6), '', avg(8)]);
      }
      var wsDs = ExcelStyle.makeSheet(dsData, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }] });
      if (dsRows.length > 1) totalsRow(wsDs, dsData.length - 1, ['معدل', avg(1), avg(2), '', avg(4), '', avg(6), '', avg(8)]);
      XLSX.utils.book_append_sheet(wb, wsDs, 'DailyStats');
    }

    if (prods.length) {
      var bkRows = prods.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (p) {
        return [normDate(p.date || ''), p.breadCount || 0, p.flourUsed || 0, p.branUsed || 0, p.saltUsed || 0, p.yeastUsed || 0, p.dieselUsed || 0];
      });
      bkRows.unshift(['Date', 'Bread', 'Flour', 'Bran', 'Salt', 'Yeast', 'Diesel']);
      var bkTotal = ['الإجمالي',
        Math.round(prods.reduce(function (s, p) { return s + (+p.breadCount || 0); }, 0)),
        Math.round(prods.reduce(function (s, p) { return s + (+p.flourUsed || 0); }, 0) * 10) / 10,
        Math.round(prods.reduce(function (s, p) { return s + (+p.branUsed || 0); }, 0) * 10) / 10,
        Math.round(prods.reduce(function (s, p) { return s + (+p.saltUsed || 0); }, 0) * 10) / 10,
        Math.round(prods.reduce(function (s, p) { return s + (+p.yeastUsed || 0); }, 0) * 10) / 10,
        Math.round(prods.reduce(function (s, p) { return s + (+p.dieselUsed || 0); }, 0) * 10) / 10];
      bkRows.push(bkTotal);
      var wsBk = ExcelStyle.makeSheet(bkRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }] });
      totalsRow(wsBk, bkRows.length - 1, bkTotal);
      XLSX.utils.book_append_sheet(wb, wsBk, 'Bakery');
    }

    if (ctrSup.length) {
      var cRows = ctrSup.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (c) {
        return [normDate(c.date || ''), c.name || '', c.count || 0, c.price || 0, Math.round((+(c.count || 0) || 0) * (+(c.price || 0) || 0) * 100) / 100];
      });
      var cTotal = cRows.reduce(function (s, r) { return s + r[2]; }, 0);
      var cPrice = Math.round(cRows.reduce(function (s, r) { return s + r[4]; }, 0) * 100) / 100;
      cRows.unshift(['Date', 'Name', 'Loaves', 'Price', 'Total']);
      cRows.push(['الإجمالي', '', cTotal, '', cPrice]);
      var wsCtr = ExcelStyle.makeSheet(cRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }] });
      totalsRow(wsCtr, cRows.length - 1, ['الإجمالي', '', cTotal, '', cPrice]);
      XLSX.utils.book_append_sheet(wb, wsCtr, 'Contractors');
    }

    if (hosp.length) {
      var hRows = hosp.slice().sort(function (a, b) { return normDate(a.arrival).localeCompare(normDate(b.arrival)); }).map(function (h) {
        return [h.name || '', normDate(h.arrival || ''), h.departure ? normDate(h.departure) : '', h.guests || 1];
      });
      hRows.unshift(['Name', 'Arrival', 'Departure', 'Guests']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(hRows, { headerRow: 0, colWidths: [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 10 }] }), 'Hospitality');
    }

    if (maint.length) {
      var mRows = maint.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (m) {
        return [normDate(m.date || ''), m.category || '', m.task || '', m.cost || 0, m.responsible || ''];
      });
      mRows.unshift(['Date', 'Category', 'Task', 'Cost', 'Responsible']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(mRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 20 }] }), 'Maintenance');
    }

    if (meals.length) {
      var mlRows = meals.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (m) {
        return [normDate(m.date || ''), m.breakfast || 0, m.lunch || 0, m.dinner || 0, (+m.breakfast || 0) + (+m.lunch || 0) + (+m.dinner || 0)];
      });
      mlRows.unshift(['Date', 'Breakfast', 'Lunch', 'Dinner', 'Total']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(mlRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }] }), 'Meals');
    }

    if (septic.length) {
      var sRows = septic.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (s) {
        var qty = s.quantity || s.pumpQty || s.amount || s['حجم'] || ((+s.trips || 0) * 5);
        return [normDate(s.date || ''), s.name || s.sector || '', s.trips || 0, qty];
      });
      sRows.unshift(['Date', 'Name', 'Trips', 'Quantity (m³)']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(sRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 12 }] }), 'Septic');
    }

    if (incidents.length) {
      var iRows = incidents.slice().sort(function (a, b) { return String(a.opened_at || a.date || '').localeCompare(String(b.opened_at || b.date || '')); }).map(function (i) {
        return [String(i.opened_at || i.date || '').slice(0, 10), i.location || '', i.type || i.category || '', i.desc || i.description || '', i.status || '', i.priority || '', i.name || ''];
      });
      iRows.unshift(['Date', 'Location', 'Category', 'Description', 'Status', 'Priority', 'Reporter']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(iRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 20 }] }), 'Incidents');
    }

    if (teaSugar.length) {
      var tsRows = teaSugar.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (t) {
        return [normDate(t.date || ''), t.empCode || '', stripEmoji(t.empName || t.name || ''), t.teaPacks || 0, t.sugarKg || 0, t.period || t.type || ''];
      });
      tsRows.unshift(['Date', 'Code', 'Name', 'Tea', 'Sugar', 'Period']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(tsRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 20 }] }), 'TeaSugar');
    }

    if (tsBatches.length) {
      var tbRows = tsBatches.slice().sort(function (a, b) { return normDate(a.date).localeCompare(normDate(b.date)); }).map(function (b) {
        return [normDate(b.date || ''), b.period || '', b.teaQty || 0, b.sugarQty || 0];
      });
      tbRows.unshift(['Date', 'Period', 'Tea Qty', 'Sugar Qty']);
      XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(tbRows, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 10 }] }), 'TeaSugarBatches');
    }

    if (mw.length) {
      var dayNames = { 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' };
      var byDate = {};
      mw.forEach(function (m) { var d = normDate(m.date || ''); (byDate[d] = byDate[d] || []).push(m); });
      var wRows = [];
      var cur2 = new Date(start);
      while (cur2 <= end) {
        var d2 = fmt(cur2);
        var entries = byDate[d2] || [];
        if (!entries.length) {
          wRows.push([d2, dayNames[cur2.getDay()], 'لا توجد بيانات', '', '', '', '']);
        } else {
          entries.slice().sort(function (a, b) { return String(a.meal || '').localeCompare(String(b.meal || ''), 'ar'); }).forEach(function (m) {
            var waste = Math.round(((+m.wasteEng || 0) + (+m.wasteWrk || 0) + (+m.wasteGuests || 0)) * 10) / 10;
            var ppl = ((+m.engAte || 0) + (+m.wrkAte || 0) + (+m.guests || 0)) || 1;
            var wp = ppl > 0 ? Math.round(waste / ppl * 1000) : 0;
            wRows.push([d2, m.meal || '', m.chef || m.responsible || '', ppl, waste, wp, Math.round(+m.cost || 0)]);
          });
        }
        cur2.setDate(cur2.getDate() + 1);
      }
      var realRows = wRows.filter(function (r) { return typeof r[3] === 'number'; });
      var sumPpl = realRows.reduce(function (s, r) { return s + r[3]; }, 0);
      var sumWaste = Math.round(realRows.reduce(function (s, r) { return s + r[4]; }, 0) * 10) / 10;
      var sumCost = Math.round(realRows.reduce(function (s, r) { return s + r[6]; }, 0));
      var wTotal = ['الإجمالي', '', '', sumPpl, sumWaste, Math.round(sumWaste / Math.max(sumPpl, 1) * 1000), sumCost];
      var wData = [['Date', 'Meal', 'Chef', 'Meals Count', 'Waste (kg)', 'Waste/Person (g)', 'Cost (ج.م)']].concat(wRows);
      wData.push(wTotal);
      var wsW = ExcelStyle.makeSheet(wData, { headerRow: 0, colWidths: [{ wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }] });
      totalsRow(wsW, wData.length - 1, wTotal);
      XLSX.utils.book_append_sheet(wb, wsW, 'MealWaste');
    }

    var todayStr = fmt(new Date());
    XLSX.writeFile(wb, 'Lina_Weekly_' + todayStr + '.xlsx');
  }

  window.exportWeeklyExcel = exportWeeklyExcel;
  window.WeeklyExcel = { normDate: normDate, stripEmoji: stripEmoji, lastCompletedFriday: lastCompletedFriday, computeDailyStats: computeDailyStats };
})();
