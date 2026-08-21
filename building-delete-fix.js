// ============================================================
//  إصلاح حذف المباني من "الإدارة المرنة":
//  - كان حذف المبنى يسجل حذف غرفه من roomsCapacity بمفتاح خاطئ
//    (اسم المبنى فقط بدل sector|number كما في _getItemKey)
//    فيرجع من السحابة بعد السحب/الدفع لأنه لا يطابق مفاتيح الغرف.
//  - كما كان autoDiscoverDynamicData / السحب يعيدان المباني
//    المحذوفة من roomsCapacity أو من القوائم الافتراضية.
//  هنا: تسجيل مفاتيح صحيحة لكل غرفة + مرشحات ثابتة تمنع أي
//  إعادة ظهور للمباني المحذوفة بعد الاكتشاف أو السحب أو الدفع.
// ============================================================
(function () {
  function _norm(s) {
    return String(s == null ? '' : s).trim().replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD?]/g, '').trim();
  }
  function _deletedSectorKeys() {
    const out = {};
    try {
      (window.syncDeletions || syncDeletions || []).forEach(function (d) {
        if (d && d.entity === 'dynamicSectors' && d.key) out[String(d.key).trim()] = true;
      });
      // أيضاً أي حذف غرف بالمفتاح القديم (اسم المبنى فقط) يمنع عودة المبنى
      (window.syncDeletions || syncDeletions || []).forEach(function (d) {
        if (d && d.entity === 'roomsCapacity' && d.key && d.key.indexOf('|') === -1) out[String(d.key).trim()] = true;
      });
    } catch (e) {}
    return out;
  }
  function _isSectorDeleted(sector) {
    const k = _norm(sector);
    if (!k) return false;
    return _deletedSectorKeys()[k] === true;
  }

  // ------------------------------------------------------------
  // 1) تصحيح تسجيل حذف الغرف عند حذف مبنى/غرفة من الإدارة المرنة
  // ------------------------------------------------------------
  const _origDeleteDynamicItem = window.deleteDynamicItem;
  if (typeof _origDeleteDynamicItem === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      if (listId === 'sector') {
        const item = (dynamicSectors && dynamicSectors[idx]) || null;
        if (item && Array.isArray(roomsCapacity) && typeof _logDeletion === 'function') {
          roomsCapacity.forEach(function (r) {
            if (r && _norm(r.sector) === _norm(item)) {
              _logDeletion('roomsCapacity', String(r.sector) + '|' + String(r.number));
            }
          });
          // حذف الغرف من السجلات أيضاً إن وجدت منفصلة (dynamicRooms تُدار باسم الرقم فقط)
        }
      } else if (listId === 'room') {
        const item = (dynamicRooms && dynamicRooms[idx]) || null;
        if (item && Array.isArray(roomsCapacity) && typeof _logDeletion === 'function') {
          roomsCapacity.forEach(function (r) {
            if (r && _norm(r.number) === _norm(item)) {
              _logDeletion('roomsCapacity', String(r.sector) + '|' + String(r.number));
            }
          });
          if (typeof _logDeletion === 'function') _logDeletion('dynamicRooms', String(item).trim());
        }
      }
      return _origDeleteDynamicItem(listId, idx);
    };
  }

  // ------------------------------------------------------------
  // 2) مرشح عام: أي مبنى محذوف يُطرد من dynamicSectors وroomsCapacity
  //    والموظفين — يستخدم بعد الاكتشاف التلقائي وأي سحب/دفع
  // ------------------------------------------------------------
  function pruneDeletedSectors() {
    try {
      const del = _deletedSectorKeys();
      const keys = Object.keys(del);
      if (!keys.length) return false;
      let changed = false;
      if (Array.isArray(dynamicSectors)) {
        const before = dynamicSectors.length;
        dynamicSectors = dynamicSectors.filter(function (s) { return !del[_norm(s)]; });
        if (dynamicSectors.length !== before) changed = true;
      }
      if (Array.isArray(roomsCapacity)) {
        const before = roomsCapacity.length;
        roomsCapacity = roomsCapacity.filter(function (r) {
          return !(r && del[_norm(r.sector)]);
        });
        if (roomsCapacity.length !== before) changed = true;
      }
      if (Array.isArray(employees)) {
        // تفريغ حقول المبنى/الغرفة فقط — لا نحذف سجل الموظف نفسه
        employees.forEach(function (e) {
          if (e && e.sector && del[_norm(e.sector)]) { e.sector = ''; e.room = ''; changed = true; }
        });
      }
      return changed;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------
  // 3) بعد الاكتشاف التلقائي: لا تعيد المباني المحذوفة أبداً
  // ------------------------------------------------------------
  const _origAutoDiscover = window.autoDiscoverDynamicData;
  if (typeof _origAutoDiscover === 'function') {
    window.autoDiscoverDynamicData = function () {
      _origAutoDiscover.apply(this, arguments);
      if (pruneDeletedSectors()) syncStorage();
    };
  }

  // ------------------------------------------------------------
  // 4) بعد السحب من السحابة: إعادة التطبيق حتى لا يرجع المحذوف
  // ------------------------------------------------------------
  const _origPull = window.pullFromSupabase;
  if (typeof _origPull === 'function') {
    window.pullFromSupabase = function () {
      const res = _origPull.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (r) {
          try { if (pruneDeletedSectors()) { syncStorage(); try { renderHousingLayout(); } catch (e) {} } } catch (e) {}
          return r;
        });
      }
      try { if (pruneDeletedSectors()) syncStorage(); } catch (e) {}
      return res;
    };
  }

  // ------------------------------------------------------------
  // 5) بعد الدفع للسحابة: نفس التنظيف (حماية من دمج يرجّع المباني)
  // ------------------------------------------------------------
  const _origPush = window.pushToSupabase;
  if (typeof _origPush === 'function') {
    window.pushToSupabase = function () {
      const res = _origPush.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (r) {
          try { if (pruneDeletedSectors()) syncStorage(); } catch (e) {}
          return r;
        });
      }
      return res;
    };
  }

  // ------------------------------------------------------------
  // 6) عند بدء التشغيل: طرد أي مبنى محذوف سابقاً بعد اكتشاف init-data
  // ------------------------------------------------------------
  function runOnReady() {
    try {
      if (pruneDeletedSectors()) syncStorage();
      try { if (typeof applyDeletionCleanup === 'function') applyDeletionCleanup(); } catch (e) {}
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOnReady);
  } else {
    runOnReady();
  }
  window.addEventListener('load', function () { try { runOnReady(); } catch (e) {} });

  window.pruneDeletedSectors = pruneDeletedSectors;
  window._deletedSectorKeys = _deletedSectorKeys;
})();