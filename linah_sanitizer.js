/* ============================================================
   linah_sanitizer.js
   حماية دفاعية لكل عمليات استيراد Excel في لينه سيستم
   تمنع دخول الرمز التالف ∩┐╜ إلى قاعدة البيانات.

   طريقة التركيب (نقطة واحدة آمنة):
   الصق هذا السكريبت مباشرة بعد سطر تحميل مكتبة SheetJS
   (الـ <script src="...xlsx...">) وقبل أي كود استيراد.
   مثال:
     <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
     <script src="linah_sanitizer.js"></script>   <-- الصق هنا
   ============================================================ */

(function () {
  // ينظّف الرمز التالف ∩┐╜ :
  //  - بين رقمين متبوعين بـ =  => علامة ضرب ×
  //  - لوحده (خلية فاضية تالفة) => نص فاضي
  function cleanMojibake(v) {
    if (v === null || v === undefined) return v;
    var s = String(v);
    var BAD = "∩┐╜";
    if (s.indexOf(BAD) === -1) return v;
    if (/[0-9]+\s*∩┐╜\s*[0-9]+\s*=/.test(s)) {
      return s.split(BAD).join("×");
    }
    return s.split(BAD).join("");
  }
  window.cleanMojibake = cleanMojibake;

  // monkeypatch عام على كل قراءات SheetJS
  function patchXLSX() {
    if (typeof XLSX === "undefined" || !XLSX.utils || !XLSX.utils.sheet_to_json) {
      setTimeout(patchXLSX, 200); // المكتبة لسه ما تحمّلتش
      return;
    }
    var orig = XLSX.utils.sheet_to_json;
    XLSX.utils.sheet_to_json = function (sheet, opts) {
      var rows = orig.call(XLSX.utils, sheet, opts);
      if (Array.isArray(rows)) {
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          if (Array.isArray(row)) {
            for (var j = 0; j < row.length; j++) row[j] = cleanMojibake(row[j]);
          } else if (row && typeof row === "object") {
            for (var k in row) {
              if (Object.prototype.hasOwnProperty.call(row, k)) {
                row[k] = cleanMojibake(row[k]);
              }
            }
          }
        }
      }
      return rows;
    };
    console.log("✅ linah_sanitizer: تم تفعيل تنظيف الاستيراد");
  }
  patchXLSX();
})();
