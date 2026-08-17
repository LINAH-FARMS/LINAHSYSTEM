// ====== Excel Export Enhancer ======
// Replaces key export functions with styled versions
// Data variables (employees, mealLogs, etc.) are in the shared global lexical scope.
(function() {
  if (typeof XLSX === 'undefined' || typeof ExcelStyle === 'undefined') return;

  var _t = function() { return new Date().toISOString().split('T')[0]; };
  var _c = function(s) { return (s||'').replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\u066A-\u066D\u066E-\u06FF\s]/g,'').trim(); };
  var _mk = function(name, data, opts) {
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ExcelStyle.makeSheet(data, opts || {}), name);
    XLSX.writeFile(wb, name + '_' + _t().replace(/-/g, '') + '.xlsx');
  };

  // ── Employees (preserves original structure with sections + summary) ──
  window.exportEmployeesToExcel = function() {
    if (typeof employees === 'undefined' || !employees.length) { alert('لا توجد بيانات'); return; }
    var today = _t();
    var todayAr = new Date().toLocaleDateString('ar-EG');
    var wb = XLSX.utils.book_new();
    var permP = employees.filter(function(e) { return (e.contract || 'دائم') === 'دائم' && e.status === 'P'; });
    var permV = employees.filter(function(e) { return (e.contract || 'دائم') === 'دائم' && e.status === 'V'; });
    var casP = employees.filter(function(e) { return (e.contract || 'دائم') === 'كاجول' && e.status === 'P'; });
    var casV = employees.filter(function(e) { return (e.contract || 'دائم') === 'كاجول' && e.status === 'V'; });
    var cols = ['الكود', 'الاسم', 'نوع التعاقد', 'رقم الموبايل', 'تاريخ التعيين', 'الإدارة', 'الوظيفة', 'المحافظة', 'المبنى', 'الغرفة', 'الموقف'];
    var allRows = [], merges = [];

    function addSec(title, emps) {
      var out = [[title + ' (' + emps.length + ')'], cols];
      emps.sort(function(a,b) { return (a.name||'').localeCompare(b.name||'', 'ar'); }).forEach(function(e) {
        out.push([e.code||'', _c(e.name), e.contract||'دائم', e.nationalId||'—', e.hireDate||'—', _c(e.dept), _c(e.title), _c(e.gov), e.sector||'—', e.room||'—', e.status === 'P' ? 'متواجد' : (e.status === 'V' ? 'في إجازة' : 'غائب')]);
      });
      out.push([]);
      var sr = allRows.length;
      out.forEach(function(r) { allRows.push(r); });
      if (out.length >= 3) merges.push({ s: { r: sr, c: 0 }, e: { r: sr, c: cols.length - 1 } });
    }
    addSec('القوة الدائمة — متواجدون', permP);
    addSec('القوة الدائمة — في إجازة', permV);
    addSec('القوة كاجول — متواجدون', casP);
    addSec('القوة كاجول — في إجازة', casV);

    // Summary
    allRows.push(['ملخص إحصائي — ' + todayAr]);
    merges.push({ s: { r: allRows.length - 1, c: 0 }, e: { r: allRows.length - 1, c: 3 } });
    [[employees.length, 'إجمالي القوة'],[permP.length,'دائم متواجد'],[permV.length,'دائم في إجازة'],[casP.length,'كاجول متواجد'],[casV.length,'كاجول في إجازة']].forEach(function(p) { allRows.push([p[1], p[0]]); });

    var ws = XLSX.utils.aoa_to_sheet(allRows);
    ws['!merges'] = merges;
    // Style title rows
    allRows.forEach(function(r, i) {
      if (r && r.length === 1 && typeof r[0] === 'string' && r[0].indexOf('—') > 0) {
        var addr = XLSX.utils.encode_cell({ r: i, c: 0 });
        if (ws[addr]) ws[addr].s = ExcelStyle.titleStyle();
      }
    });
    // Style header rows (second row of each section)
    allRows.forEach(function(r, i) {
      if (r && r.length === cols.length && r[0] === 'الكود' && r[1] === 'الاسم') {
        ExcelStyle.styleHeaderRow(ws, i, cols.length);
      }
    });
    ExcelStyle.autoColWidth(ws);
    XLSX.utils.book_append_sheet(wb, ws, 'القوة');
    XLSX.writeFile(wb, 'القوة_' + today.replace(/-/g, '') + '.xlsx');
  };

  // ── Simple data exports: wrap in ExcelStyle.makeSheet ──
  function _simpleOverride(name, varName, headers, mapper) {
    var fnName = 'export' + name.charAt(0).toUpperCase() + name.slice(1) + 'ToExcel';
    if (typeof window[fnName] !== 'function') return;
    window[fnName] = function() {
      try {
        var data = eval(varName);
        if (!data || !data.length) { alert('لا توجد بيانات'); return; }
        var rows = [headers];
        (Array.isArray(data) ? data : []).forEach(function(item) { rows.push(mapper(item)); });
        _mk(name, rows, { headerRow: 0, filter: true, freeze: 1 });
      } catch(e) { alert('خطأ في تصدير ' + name + ': ' + e.message); }
    };
  }

  _simpleOverride('MealLog', 'mealLogs', ['التاريخ', 'إفطار', 'غداء', 'عشاء', 'الشيف', 'ملاحظات'], function(m) {
    return [m.date||'', Number(m.breakfast)||0, Number(m.lunch)||0, Number(m.dinner)||0, m.chef||'', m.notes||''];
  });

  _simpleOverride('Inventory', 'inventoryItems', ['الكود', 'الصنف', 'الكمية', 'الوحدة', 'الحد الأدنى', 'القسم'], function(item) {
    return [item.code||'', item.name||'', Number(item.qty)||0, item.unit||'', Number(item.min)||0, item.dept||''];
  });

  _simpleOverride('Vacations', 'vacations', ['بداية', 'نهاية', 'الكود', 'الاسم', 'البيان', 'عدد الأيام', 'تاريخ السفر', 'آخر يوم', 'تاريخ العودة', 'ملاحظات'], function(v) {
    return [v.start||'', v.end||'', v.code||'', _c(v.name), _c(v.info), Number(v.days)||0, v.travelDate||'', v.lastWorkDay||'', v.returnDate||'', _c(v.notes)];
  });

  _simpleOverride('Hospitality', 'hospitalities', ['الاسم', 'النوع', 'اللقب', 'عدد الأفراد', 'تاريخ الوصول', 'تاريخ المغادرة', 'الوجبات'], function(h) {
    return [_c(h.name), h.type||'', _c(h.title), Number(h.guests)||1, h.arrival||'', h.departure||'', Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '')];
  });

  _simpleOverride('Excluded', 'excludedEmployees', ['تاريخ الاستبعاد', 'الاسم', 'الكود', 'نوع العقد', 'رقم الموبايل', 'تاريخ التعيين', 'الإدارة', 'الوظيفة', 'المحافظة', 'المبنى', 'الغرفة', 'الموقف', 'السبب'], function(e) {
    return [e.date||'', _c(e.name), e.code||'', e.contract||'', e.nationalId||'', e.hireDate||'', _c(e.dept), _c(e.title), _c(e.gov), e.sector||'', e.room||'', e.status === 'P' ? 'موجود' : 'إجازة', _c(e.reason)];
  });

  _simpleOverride('TeaSugar', 'teaSugarDisbursements', ['كود الموظف', 'اسم الموظف', 'الإدارة', 'الشاي (باكيت)', 'السكر (كجم)', 'الدورة', 'التاريخ'], function(t) {
    return [t.empCode||t.empId||'', _c(t.empName), _c(t.empDept), Number(t.teaPacks)||0, Number(t.sugarKg)||0, t.period||'', t.date||''];
  });

  _simpleOverride('Septic', 'septicRecords', ['التاريخ', 'اسم البيارة', 'عدد النقلات', 'الصرف', 'المشرف', 'ملاحظات'], function(s) {
    return [s.date||'', _c(s.name), Number(s.trips)||0, Number(s.quantity)||(Number(s.trips)||0)*5, _c(s.supervisor), _c(s.notes)];
  });

  _simpleOverride('PeriodicMaint', 'periodicMaintenance', ['المهمة', 'الدورية', 'تاريخ البداية', 'آخر تنفيذ', 'التالي', 'الحالة'], function(p) {
    return [_c(p.name), p.freq||'', p.startDate||'', p.lastDone||'', p.nextDue||'', _c(p.status)];
  });

  _simpleOverride('Contractors', 'contractors', ['اسم المقاول', 'رقم الهاتف', 'القطاع', 'الغرفة', 'الأجر اليومي', 'تاريخ البداية', 'تاريخ النهاية', 'ملاحظات'], function(c) {
    return [_c(c.name), c.phone||'', c.sector||'', c.room||'', Number(c.dailyRate)||0, c.startDate||'', c.endDate||'', _c(c.notes)];
  });

  _simpleOverride('BakeryProduction', 'bakeryProductions', ['التاريخ', 'عدد الأرغفة', 'دقيق (كجم)', 'خميرة (كجم)', 'ملح (كجم)', 'ردة (كجم)', 'سولار (لتر)', 'تكلفة التشغيل', 'ملاحظات'], function(p) {
    return [p.date||'', Number(p.breadCount)||0, Number(p.flourUsed)||0, Number(p.yeastUsed)||0, Number(p.saltUsed)||0, Number(p.branUsed)||0, Number(p.dieselUsed)||0, Number(p.operatingCost)||0, _c(p.notes)];
  });

  _simpleOverride('BakeryContractorSupplies', 'bakeryContractorSupplies', ['التاريخ', 'المقاول', 'عدد الأرغفة', 'سعر الرغيف', 'الإجمالي', 'المدفوع', 'المتبقي', 'المسؤول', 'ملاحظات'], function(c) {
    var total = (Number(c.count)||0) * (Number(c.price)||0);
    return [c.date||'', _c(c.name), Number(c.count)||0, Number(c.price)||0, total.toFixed(2), Number(c.paid||0).toFixed(2), (total - (Number(c.paid)||0)).toFixed(2), _c(c.responsible), _c(c.notes)];
  });

  _simpleOverride('BakeryIngredients', 'bakeryIngredients', ['الكود', 'الاسم', 'الوحدة', 'الكمية الحالية', 'الحد الأدنى', 'سعر الوحدة'], function(i) {
    return [i.id||i.code||'', _c(i.name), i.unit||'', Number(i.currentQty)||0, Number(i.minQty)||0, Number(i.pricePerUnit)||0];
  });

  _simpleOverride('BakeryInvoices', 'bakeryInvoices', ['رقم الفاتورة', 'التاريخ', 'العميل', 'عدد الأرغفة', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي', 'ملاحظات'], function(i) {
    var total = (Number(i.count)||0) * (Number(i.unitPrice)||0);
    return [i.number||'', i.date||'', _c(i.customer), Number(i.count)||0, Number(i.unitPrice)||0, total.toFixed(2), Number(i.paid||0).toFixed(2), (total - (Number(i.paid)||0)).toFixed(2), _c(i.notes)];
  });

  _simpleOverride('Evaluations', 'evaluations', ['الموظف', 'المسمى', 'الإدارة', 'الشهر', 'السنة', 'النتيجة', 'التقدير', 'ملاحظات'], function(e) {
    return [_c(e.empName), _c(e.empTitle), _c(e.empDept), e.month||'', e.year||'', e.totalScore||e.percentage||'', _c(e.grade), e.notes||''];
  });

  // ── Housing Capacity ──
  window.exportHousingToExcel = function() {
    if (typeof roomsCapacity === 'undefined' || !roomsCapacity.length) { alert('لا توجد بيانات'); return; }
    var data = [['القطاع', 'الغرفة', 'عدد الأسرّة', 'المقيمين', 'شاغر', 'نسبة الإشغال']];
    var emps = typeof employees !== 'undefined' ? employees : [];
    var sectors = typeof dynamicSectors !== 'undefined' ? dynamicSectors : [];
    var sectorList = sectors.length ? sectors : roomsCapacity.reduce(function(acc, r) { var s = r.sector||'عام'; if (acc.indexOf(s) === -1) acc.push(s); return acc; }, []);
    sectorList.forEach(function(sec) {
      var rooms = roomsCapacity.filter(function(r) { return (r.sector||'عام') === sec; });
      rooms.forEach(function(r) {
        var residents = emps.filter(function(e) { return e.sector === sec && e.room === (r.number||r.room); });
        var totalRes = residents.length;
        var vacant = (Number(r.beds)||0) - totalRes;
        var pct = Number(r.beds) ? Math.round((totalRes / Number(r.beds)) * 100) + '%' : '-';
        data.push([sec, r.number||r.room||'', Number(r.beds)||0, totalRes, Math.max(0, vacant), pct]);
      });
    });
    _mk('السكن', data, { headerRow: 0, filter: true, freeze: 1 });
  };
})();
