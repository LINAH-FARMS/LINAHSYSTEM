// ============================================================
//  ترتيب البيارات حسب عدد مرات الاستخدام (عدد السجلات):
//  - يُعاد الترتيب قبل رسم قائمة الإدارة المرنة وقبل بناء القوائم
//    المنسدلة، وبعد كل سحب/دفع، وعند الإقلاع ودورياً كل دقيقة
//  - المطابقة مطبعة (مسافات/حالة أحرف) فتُحسب الأسماء المتشابهة معاً
//  - التعادل في الاستخدام يُرتب أبجدياً عربياً
// ============================================================
(function () {
  function _key(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .trim();
  }
  function _usageCounts() {
    var counts = {};
    try {
      if (typeof septicRecords !== 'undefined' && Array.isArray(septicRecords)) {
        septicRecords.forEach(function (s) {
          var n = s ? String(s.name || s.sector || '').trim() : '';
          if (!n) return;
          var k = _key(n);
          counts[k] = (counts[k] || 0) + 1;
        });
      }
    } catch (e) {}
    return counts;
  }
  function sortSeptics() {
    try {
      if (typeof dynamicSeptics === 'undefined' || !Array.isArray(dynamicSeptics) || dynamicSeptics.length < 2) return false;
      var counts = _usageCounts();
      var before = dynamicSeptics.join('\u0001');
      dynamicSeptics.sort(function (a, b) {
        var ca = counts[_key(a)] || 0;
        var cb = counts[_key(b)] || 0;
        if (cb !== ca) return cb - ca;
        return String(a).localeCompare(String(b), 'ar');
      });
      return dynamicSeptics.join('\u0001') !== before;
    } catch (e) { return false; }
  }

  // قبل رسم قائمة الإدارة المرنة وقبل بناء القوائم المنسدلة
  ['renderDynamicLists', 'rebuildAllDropdowns'].forEach(function (fnName) {
    var orig = window[fnName];
    if (typeof orig === 'function') {
      window[fnName] = function () {
        try { sortSeptics(); } catch (e) {}
        return orig.apply(this, arguments);
      };
    }
  });

  // بعد السحب والدفع: أعد الترتيب واحفظ إن تغير الترتيب
  ['pullFromSupabase', 'pushToSupabase'].forEach(function (fnName) {
    var orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function () {
      var res;
      try { res = orig.apply(this, arguments); } catch (e) {}
      var after = function () {
        try { if (sortSeptics() && typeof syncStorage === 'function') syncStorage(); } catch (e) {}
      };
      if (res && typeof res.then === 'function') return res.then(function (v) { after(); return v; });
      after();
      return res;
    };
  });

  function boot() { try { if (sortSeptics() && typeof syncStorage === 'function') syncStorage(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setInterval(function () { try { sortSeptics(); } catch (e) {} }, 60000);
})();
