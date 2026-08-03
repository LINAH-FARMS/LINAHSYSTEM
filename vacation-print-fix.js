// vacation-print-fix.js — في بيان الإجازات المطبوع (📄 طباعة إجازة) يظهر عمود
// «الرصيد» فارغاً لأن الرصيد يُدخل يدوياً بعد الطباعة بدلاً من تعبئته تلقائياً.
// الطريقة: إعادة بناء الدالة الأصلية من مصدرها مع تعديل نقطتين فقط —
// لا يتم لمس app.js الأصلي.

(function () {
  'use strict';
  var orig = window.printVacationForm;
  if (typeof orig !== 'function') return;
  try {
    var src = orig.toString();
    var changed = 0;
    src = src.replace(
      /var vacBalance = emp && typeof emp\.vacationBalance === 'number' \? emp\.vacationBalance : '';/,
      function () { changed++; return "var vacBalance = '';"; }
    );
    src = src.replace(
      /\+ \(r\.balance \|\| '—'\) \+/,
      function () { changed++; return "+ (r.balance || '') +"; }
    );
    if (changed === 2) {
      window.printVacationForm = Function('return (' + src + ')')();
    }
  } catch (e) { /* يبقى الشكل الأصلي عند أي خطأ */ }
})();