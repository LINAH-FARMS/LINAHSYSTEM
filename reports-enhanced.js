// ====== Enhanced Excel Reports Module ======
// Professional multi-sheet comprehensive reports with styling

var __stripEmoji = function(s) { return (s||'').replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\u066A-\u066D\u066E-\u06FF\s]/g,'').trim(); };
var _reportAlert = (typeof showAlert === 'function') ? showAlert : function(m) { alert(m); };

// Inject comprehensive report button into toolbar on load
(function() {
  var interval = setInterval(function() {
    var toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.cssText = 'padding:5px 12px;font-size:12px;background:#1b5e20;color:white;border:none;border-radius:6px;cursor:pointer;';
      btn.textContent = '\u{1F4CA} \u062A\u0642\u0631\u064A\u0631 \u0634\u0627\u0645\u0644';
      btn.onclick = exportComprehensiveReport;
      toolbar.insertBefore(btn, toolbar.querySelector('span'));
      clearInterval(interval);
    }
  }, 500);
})();

function exportComprehensiveReport() {
  if (typeof XLSX === 'undefined' || typeof ExcelStyle === 'undefined') {
    alert('⚠️ مكتبة XLSX أو ExcelStyle غير متاحة');
    return;
  }
  var wb = XLSX.utils.book_new();
  var dateStr = new Date().toLocaleDateString('ar-EG');

  // ── Sheet 1: Executive Summary ──
  var totalEmp = (window.employees || []).length;
  var permP = (window.employees || []).filter(function(e) { return e.status === 'P' && (e.contract || 'دائم') === 'دائم'; }).length;
  var permV = (window.employees || []).filter(function(e) { return e.status === 'V' && (e.contract || 'دائم') === 'دائم'; }).length;
  var casP = (window.employees || []).filter(function(e) { return e.status === 'P' && (e.contract || 'دائم') === 'كاجول'; }).length;
  var casV = (window.employees || []).filter(function(e) { return e.status === 'V' && (e.contract || 'دائم') === 'كاجول'; }).length;

  var summaryData = [
    ['لينه فارمز - تقرير شامل', '', '', ''],
    ['', '', '', ''],
    ['تاريخ التقرير', dateStr, '', ''],
    ['', '', '', ''],
    ['الموظفون', '', '', ''],
    ['إجمالي القوة', totalEmp, '', ''],
    ['دائم متواجد', permP, '', ''],
    ['دائم إجازة', permV, '', ''],
    ['كاجول متواجد', casP, '', ''],
    ['كاجول إجازة', casV, '', ''],
    ['', '', '', ''],
  ];

  // Housing stats
  var sectors = {};
  (window.roomsCapacity || []).forEach(function(r) {
    var sec = r.sector || 'عام';
    if (!sectors[sec]) sectors[sec] = { sector: sec, rooms: 0, beds: 0, residents: 0 };
    sectors[sec].rooms++;
    sectors[sec].beds += Number(r.beds) || 0;
    if (r.users) sectors[sec].residents += (typeof r.users === 'string' ? r.users.split(',').filter(Boolean).length : (r.users.length || 0));
  });
  var sectorCount = Object.keys(sectors).length;
  var totalBeds = 0, totalResidents = 0;
  Object.keys(sectors).forEach(function(k) { totalBeds += sectors[k].beds; totalResidents += sectors[k].residents; });
  summaryData.push(['الإسكان', '', '', '']);
  summaryData.push(['عدد القطاعات', sectorCount, '', '']);
  summaryData.push(['إجمالي الأسرّة', totalBeds, '', '']);
  summaryData.push(['إجمالي المقيمين', totalResidents, '', '']);
  summaryData.push(['نسبة الإشغال', totalBeds ? Math.round((totalResidents / totalBeds) * 100) + '%' : '-', '', '']);
  summaryData.push(['', '', '', '']);

  // Meals stats
  var today = new Date().toISOString().split('T')[0];
  var todayMeals = (window.mealLog || []).filter(function(m) { return (m.date || '').startsWith(today); });
  var mealCounts = {};
  todayMeals.forEach(function(m) {
    (m.meals || []).forEach(function(ml) { mealCounts[ml] = (mealCounts[ml] || 0) + Number(m.count || 1); });
  });
  summaryData.push(['الوجبات - اليوم', '', '', '']);
  summaryData.push(['إجمالي المسجلين', todayMeals.length, '', '']);
  Object.keys(mealCounts).forEach(function(k) {
    summaryData.push(['  ' + k, mealCounts[k], '', '']);
  });

  var ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  ExcelStyle.styleTitleRow(ws1, 0);
  ExcelStyle.styleHeaderRow(ws1, 0, 4);
  ExcelStyle.autoColWidth(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, 'ملخص تنفيذي');

  // ── Sheet 2: Employees ──
  var empData = [];
  empData.push(['كود', 'الاسم', 'القسم', 'الوظيفة', 'الحالة', 'نوع العقد', 'رقم الموبايل', 'تاريخ التعيين', 'المحافظة', 'المبنى', 'الغرفة']);
  (window.employees || []).sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'ar'); }).forEach(function(e) {
    empData.push([
      e.code || '', __stripEmoji(e.name), __stripEmoji(e.dept || ''), __stripEmoji(e.title || ''),
      e.status === 'P' ? 'موجود' : 'إجازة', e.contract || 'دائم',
      e.nationalId || '', e.hireDate || '', __stripEmoji(e.gov || ''),
      e.sector || '', e.room || ''
    ]);
  });
  var ws2 = ExcelStyle.makeSheet(empData, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws2, 'الموظفون');

  // ── Sheet 3: Housing ──
  var houseData = [];
  houseData.push(['القطاع', 'الغرفة', 'عدد الأسرّة', 'المقيمين', 'نسبة الإشغال']);
  (window.roomsCapacity || []).forEach(function(r) {
    var residents = 0;
    if (r.users) residents = typeof r.users === 'string' ? r.users.split(',').filter(Boolean).length : (r.users.length || 0);
    var pct = Number(r.beds) ? Math.round((residents / Number(r.beds)) * 100) : 0;
    houseData.push([r.sector || 'عام', r.room || '', Number(r.beds) || 0, residents, pct + '%']);
  });
  var ws3 = ExcelStyle.makeSheet(houseData, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws3, 'الإسكان');

  // ── Sheet 4: Meals ──
  var mealData = [];
  mealData.push(['التاريخ', 'الاسم', 'الوجبات', 'عدد الأفراد', 'ملاحظات']);
  (window.mealLog || []).slice().reverse().forEach(function(m) {
    var meals = Array.isArray(m.meals) ? m.meals.join(' - ') : (m.meals || '');
    var eName = '';
    if (m.id) {
      var found = (window.employees || []).find(function(emp) { return emp.code === m.id || emp.id === m.id; });
      if (found) eName = __stripEmoji(found.name);
    }
    mealData.push([m.date || '', eName || m.name || '', meals, Number(m.count) || 1, m.notes || '']);
  });
  var ws4 = ExcelStyle.makeSheet(mealData, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws4, 'الوجبات');

  // ── Sheet 5: Inventory ──
  var invData = [];
  invData.push(['الكود', 'الصنف', 'الكمية', 'الوحدة', 'الحد الأدنى', 'القسم']);
  (window.inventoryItems || []).forEach(function(item) {
    invData.push([item.code || '', item.name || '', Number(item.qty) || 0, item.unit || '', Number(item.min) || 0, item.dept || '']);
  });
  var ws5 = ExcelStyle.makeSheet(invData, { headerRow: 0, filter: true, freeze: 1 });
  XLSX.utils.book_append_sheet(wb, ws5, 'المخازن');

  // ── Sheet 6: Hospitality (Active) ──
  var hospData = [];
  hospData.push(['الاسم', 'النوع', 'اللقب', 'عدد الضيوف', 'تاريخ الوصول', 'تاريخ المغادرة']);
  (window.hospitalities || []).filter(function(h) {
    return h.arrival && h.arrival <= today && (h.departure || '2099-12-31') >= today;
  }).forEach(function(h) {
    hospData.push([__stripEmoji(h.name), h.type || '', __stripEmoji(h.title || ''), Number(h.guests) || 1, h.arrival || '', h.departure || '']);
  });
  if (hospData.length > 1) {
    var ws6 = ExcelStyle.makeSheet(hospData, { headerRow: 0, filter: true, freeze: 1 });
    XLSX.utils.book_append_sheet(wb, ws6, 'الضيافة النشطة');
  }

  // ── Sheet 7: Vacations ──
  var vacData = [];
  vacData.push(['الموظف', 'نوع الإجازة', 'من', 'إلى', 'ملاحظات']);
  (window.vacations || []).filter(function(v) {
    return !v.endDate || v.endDate >= today;
  }).forEach(function(v) {
    var eName = '';
    if (v.empId) {
      var found = (window.employees || []).find(function(emp) { return emp.code === v.empId || emp.id === v.empId; });
      if (found) eName = __stripEmoji(found.name);
    }
    vacData.push([eName || v.empId || '', v.type || '', v.startDate || '', v.endDate || '', v.notes || '']);
  });
  if (vacData.length > 1) {
    var ws7 = ExcelStyle.makeSheet(vacData, { headerRow: 0, filter: true, freeze: 1 });
    XLSX.utils.book_append_sheet(wb, ws7, 'الإجازات');
  }

  // Save
  XLSX.writeFile(wb, 'تقرير_لينة_فارمز_شامل_' + today + '.xlsx');
  _reportAlert('✅ تم تصدير التقرير الشامل بنجاح');
}

function exportStyledExcel(title, sheets) {
  if (typeof XLSX === 'undefined' || typeof ExcelStyle === 'undefined') {
    alert('⚠️ المكتبات غير متاحة');
    return;
  }
  var wb = XLSX.utils.book_new();
  sheets.forEach(function(s) {
    var ws = ExcelStyle.makeSheet(s.data, s.opts || {});
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  XLSX.writeFile(wb, title + '.xlsx');
}
