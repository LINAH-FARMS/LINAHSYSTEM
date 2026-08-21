// ============================================================
//  حماية نهائية ضد رجوع المحذوف (مباني / غرف / بيارات):
//  - قائمة حذف دائمة في localStorage لا تنتهي ولا تمسحها المزامنة
//  - تُبذر من سجل الحذف القديم بشكل آمن: أي اسم ما زال موجوداً
//    في البيانات الحالية لا يُطرد أبداً (حماية للمباني المعاد إضافتها)
//  - مطابقة مُطبَّعة (مسافات/أرقام عربية/محارف خفية) فلا يرجع
//    العنصر باسم شبه متطابق مثل "بيارة ق 6" و"بيارة ق6"
//  - تعمل بعد كل: تحميل، اكتشاف تلقائي، سحب، دفع، ودورياً
//  - إعادة الإضافة المتعمدة تُلغي الحذف تلقائياً حتى لا تُطرد
// ============================================================
(function () {
  var STORE_KEY = 'lineh_hard_deletes';
  var KINDS = { sectors: 1, rooms: 1, septics: 1 };
  var LIST_OF = { sectors: 'dynamicSectors', rooms: 'dynamicRooms', septics: 'dynamicSeptics' };
  var armed = false;

  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }

  var kill = {};
  try { kill = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { kill = {}; }
  if (typeof kill !== 'object' || !kill) kill = {};

  function _save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(kill)); } catch (e) {} }
  function _add(kind, name) {
    var n = _norm(name);
    if (!n || !KINDS[kind]) return false;
    if (!kill[kind]) kill[kind] = {};
    if (kill[kind][n]) return false;
    kill[kind][n] = new Date().toISOString();
    _save();
    return true;
  }
  function _remove(kind, name) {
    var n = _norm(name);
    if (kill[kind] && kill[kind][n]) { delete kill[kind][n]; _save(); return true; }
    return false;
  }
  function _killed(kind, name) {
    var n = _norm(name);
    return !!(n && kill[kind] && kill[kind][n]);
  }

  // ---- بذر آمن من سجل الحذف القديم ----
  // الأمان أولاً: لا نبذر حذفاً لأي اسم ما زال موجوداً في البيانات الحالية،
  // فقد يكون المستخدم أعاد إضافته عمداً بعد حذف قديم — وبذلك لا تُمسح مبانٍ نشطة
  function _isPresent(kind, name) {
    var arr = _arrOf(kind);
    if (!arr) return true; // البيانات غير جاهزة = نعتبره موجوداً ولا نبذر (الأمان أولاً)
    var n = _norm(name);
    if (!n) return true;
    for (var i = 0; i < arr.length; i++) { if (_norm(arr[i]) === n) return true; }
    return false;
  }
  function _seedFromLog() {
    var dels = [];
    try { var d0 = JSON.parse(localStorage.getItem('lineh_sync_deletions') || '[]'); if (Array.isArray(d0)) dels = d0.slice(); } catch (e) {}
    try { if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) dels = dels.concat(syncDeletions); } catch (e) {}
    dels.forEach(function (d) {
      if (!d || d.key == null) return;
      var k = String(d.key);
      var kind = null;
      if (d.entity === 'dynamicSectors') kind = 'sectors';
      else if (d.entity === 'roomsCapacity' && k.indexOf('|') === -1) kind = 'sectors'; // صيغة قديمة: اسم المبنى فقط
      else if (d.entity === 'dynamicRooms') kind = 'rooms';
      else if (d.entity === 'dynamicSeptics') kind = 'septics';
      if (!kind) return;
      if (_isPresent(kind, k)) return; // موجود حالياً = مستخدم فعلياً — لا يُطرد
      _add(kind, k);
    });
  }

  // ---- الوصول الآمن لمصفوفات النظام (let عامة لا تظهر على window) ----
  function _arrOf(kind) {
    try {
      if (kind === 'sectors' && typeof dynamicSectors !== 'undefined' && Array.isArray(dynamicSectors)) return dynamicSectors;
      if (kind === 'rooms' && typeof dynamicRooms !== 'undefined' && Array.isArray(dynamicRooms)) return dynamicRooms;
      if (kind === 'septics' && typeof dynamicSeptics !== 'undefined' && Array.isArray(dynamicSeptics)) return dynamicSeptics;
    } catch (e) {}
    return null;
  }

  // ---- إلغاء الحذف عند إعادة الإضافة المتعمدة ----
  // إن وُجد الاسم المحذوف موجوداً محلياً فهذا يعني أن المستخدم أعاده عمداً
  function _unkillReAdded() {
    Object.keys(LIST_OF).forEach(function (kind) {
      var arr = _arrOf(kind);
      if (!Array.isArray(arr) || !kill[kind]) return;
      Object.keys(kill[kind]).forEach(function (n) {
        for (var i = 0; i < arr.length; i++) {
          if (_norm(arr[i]) === n) { delete kill[kind][n]; _save(); break; }
        }
      });
    });
  }

  // ---- الطرد الدائم من كل مكان ----
  function prune() {
    var changed = false;
    function filt(kind, arr) {
      var f = arr.filter(function (x) { return !_killed(kind, x); });
      if (f.length !== arr.length) { changed = true; return f; }
      return arr;
    }
    try {
      if (Array.isArray(dynamicSectors)) dynamicSectors = filt('sectors', dynamicSectors);
      if (Array.isArray(dynamicRooms)) dynamicRooms = filt('rooms', dynamicRooms);
      if (Array.isArray(dynamicSeptics)) dynamicSeptics = filt('septics', dynamicSeptics);
      if (Array.isArray(roomsCapacity)) {
        var f4 = roomsCapacity.filter(function (r) { return !(r && (_killed('sectors', r.sector) || _killed('rooms', r.number))); });
        if (f4.length !== roomsCapacity.length) { roomsCapacity = f4; changed = true; }
      }
      if (Array.isArray(septicRecords)) {
        var f5 = septicRecords.filter(function (s) { return !(s && _killed('septics', s.name || s.sector)); });
        if (f5.length !== septicRecords.length) { septicRecords = f5; changed = true; }
      }
      // تفريغ حقول الموظفين المرتبطة بالمحذوف (بدون حذف الموظف نفسه)
      if (Array.isArray(employees)) {
        employees.forEach(function (e) {
          if (!e) return;
          if (e.sector && _killed('sectors', e.sector)) { e.sector = ''; e.room = ''; changed = true; }
          if (e.room && _killed('rooms', e.room)) { e.room = ''; changed = true; }
        });
      }
    } catch (e) {}
    return changed;
  }

  function _refreshUI() {
    try { if (typeof renderDynamicLists === 'function') renderDynamicLists(); } catch (e) {}
    try { if (typeof renderHousingLayout === 'function') renderHousingLayout(); } catch (e) {}
    try { if (typeof rebuildAllDropdowns === 'function') rebuildAllDropdowns(); } catch (e) {}
  }

  // تشغيل بعد الأحداث: إلغاء الحذف للمُعاد إضافته ثم طرد الباقي
  function run() {
    try { if (armed) _unkillReAdded(); } catch (e) {}
    try { if (prune()) { if (typeof syncStorage === 'function') syncStorage(); _refreshUI(); } } catch (e) {}
  }
  // تشغيل عند الإقلاع: طرد فقط بدون إلغاء (حتى لا تُشرعن استعادة الافتراضيات)
  function bootPrune() {
    try { if (prune()) { if (typeof syncStorage === 'function') syncStorage(); _refreshUI(); } } catch (e) {}
  }

  // ---- التقاط الحذف من زر الحذف وتسجيله دائماً ----
  var _origDel = window.deleteDynamicItem;
  if (typeof _origDel === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      try {
        var kind = { sector: 'sectors', room: 'rooms', septic: 'septics' }[listId];
        var src = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics }[listId];
        if (kind && Array.isArray(src) && src[idx] != null) {
          _add(kind, typeof src[idx] === 'string' ? src[idx] : (src[idx].name || src[idx]));
        }
      } catch (e) {}
      return _origDel.apply(this, arguments);
    };
  }

  // ---- بعد الاكتشاف التلقائي والسحب والدفع ----
  var _origAuto = window.autoDiscoverDynamicData;
  if (typeof _origAuto === 'function') {
    window.autoDiscoverDynamicData = function () { var r = _origAuto.apply(this, arguments); run(); return r; };
  }
  var _origPull = window.pullFromSupabase;
  if (typeof _origPull === 'function') {
    window.pullFromSupabase = function () {
      var res;
      try { res = _origPull.apply(this, arguments); } catch (e) {}
      if (res && typeof res.then === 'function') return res.then(function (v) { run(); return v; });
      run();
      return res;
    };
  }
  var _origPush = window.pushToSupabase;
  if (typeof _origPush === 'function') {
    window.pushToSupabase = function () {
      var res;
      try { res = _origPush.apply(this, arguments); } catch (e) {}
      if (res && typeof res.then === 'function') return res.then(function (v) { run(); return v; });
      run();
      return res;
    };
  }

  // ---- الإقلاع ----
  function boot() {
    // شفاء ذاتي: أي اسم في قائمة الحذف وما زال موجوداً في البيانات = إعادة إضافة عمداً
    try { _unkillReAdded(); } catch (e) {}
    try { _seedFromLog(); } catch (e) {}
    bootPrune();
    armed = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { try { bootPrune(); } catch (e) {} });
  setInterval(function () { try { run(); } catch (e) {} }, 30000);

  // أدوات مساعدة يدوية (للكونسول)
  window.hardDeleteItem = function (kind, name) {
    var k = ({ sector: 'sectors', room: 'rooms', septic: 'septics', building: 'sectors' })[kind] || kind;
    _add(k, name);
    armed = false; bootPrune(); armed = true;
  };
  window.hardDeleteAllowAgain = function (kind, name) {
    var k = ({ sector: 'sectors', room: 'rooms', septic: 'septics', building: 'sectors' })[kind] || kind;
    _remove(k, name);
  };
})();
