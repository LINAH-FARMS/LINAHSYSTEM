// vacation-print-fix.js — تحسينات طباعة بيان الإجازات (📄 طباعة إجازة):
// 1) عمود «الرصيد» يظهر فارغاً لأن الرصيد يُدخل يدوياً بعد الطباعة.
// 2) إصلاح خروج المحتوى خارج منطقة الطباعة: كانت .page بعرض 210mm ثابت
//    فوق هوامش @page (1.5cm/2cm) فيتجاوز عرض الورقة، وmin-height 297mm
//    مع الهوامش ينتج ورقة ثانية فاضية. الحل: @page بلا هوامش +
//    box-sizing + عرض كامل في الطباعة.
// 3) إصلاح اختفاء آخر جزء من البيان في الطباعة: min-height 296mm يُجبر
//    الصفحة على ملء كامل الورقة فيصل المحتوى السفلي (التواقيع/الترويسة)
//    لمنطقة لا تقدر الطابعة على الطباعة فيها فيُبتَر. الحل: في الطباعة
//    ارتفاع تلقائي (min-height:0) بحيث لا يتجاوز المحتوى حدود الورقة.
// 4) إضافة مسافة 2 سم من كل جانب (padding:2cm) قبل الهوامش.
// الطريقة: إعادة بناء الدالة الأصلية من مصدرها مع تعديلات نقطية —
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
    src = src.replace(
      /'@page\{size:A4 portrait;margin:1\.5cm 2cm;\}'/,
      function () { changed++; return "'@page{size:A4 portrait;margin:0;}'"; }
    );
    src = src.replace(
      /'\.page\{width:210mm;min-height:297mm;margin:10px auto;background:#fff;padding:20px 25px;box-shadow:0 2px 20px rgba\(0,0,0,0\.1\);page-break-after:always;\}'/,
      function () { changed++; return "'.page{box-sizing:border-box;width:210mm;min-height:296mm;margin:10px auto;background:#fff;padding:20px 25px;box-shadow:0 2px 20px rgba(0,0,0,0.1);page-break-after:always;}'"; }
    );
    src = src.replace(
      /'@media print\{body\{background:#fff;\}\.page\{margin:0;box-shadow:none;padding:15px 20px;\}\}'/,
      function () { changed++; return "'@media print{body{background:#fff;}.page{box-sizing:border-box;width:100%;margin:0;box-shadow:none;min-height:0;height:auto;padding:2cm;}}'"; }
    );
    if (changed === 5) {
      window.printVacationForm = Function('return (' + src + ')')();
    }
  } catch (e) { /* يبقى الشكل الأصلي عند أي خطأ */ }
})();