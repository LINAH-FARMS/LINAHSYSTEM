// ============================================================
//  إصلاح الحذف المتزامن لقوائم الأسماء (الإدارة المرنة وغيرها):
//  - _applyDeletions الأصلية كانت تتخطى قوائم الأسماء عمداً
//    (dynamicSectors/dynamicRooms/dynamicDepts/dynamicTitles...)
//    فأي مبنى/غرفة/وظيفة تُحذف كانت تعود بعد إعادة الفتح.
//  - هنا نُطبق حذف قوائم الأسماء + الحذف المتتابع (cascade):
//    حذف مبنى يمسح غرفه من roomsCapacity و من الموظفين،
//    وحذف إدارة/وظيفة يُمسح المرجع من الموظفين.
// ============================================================
(function () {
  var NL_ENTITIES = ['dynamicSectors','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSeptics','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames','dynamicStores','deptTitles'];

  function _delByEntity() {
    var m = {};
    var dels = (typeof syncDeletions !== 'undefined') ? syncDeletions : (window.syncDeletions || []);
    (Array.isArray(dels) ? dels : []).forEach(function (d) {
      if (!d || !d.entity) return;
      var k = String(d.key == null ? '' : d.key);
      if (!k) return;
      if (!m[d.entity]) m[d.entity] = {};
      m[d.entity][k] = true;
    });
    return m;
  }

  function _nlKey(item) {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string') return item.trim();
    if (typeof item === 'object') return String(item.name || item.title || item.id || item) || '';
    return String(item);
  }

  function applyNameListDeletions() {
    var map = _delByEntity();
    NL_ENTITIES.forEach(function (ent) {
      var keys = map[ent];
      if (!keys) return;
      var arr = getEntityVar(ent);
      if (!Array.isArray(arr)) return;
      var filtered = arr.filter(function (x) { return !keys[_nlKey(x)]; });
      if (filtered.length !== arr.length) setEntityVar(ent, filtered);
    });
  }

  function applyCascade() {
    var map = _delByEntity();
    if (map.dynamicSectors) {
      var secKeys = map.dynamicSectors;
      if (Array.isArray(roomsCapacity)) roomsCapacity = roomsCapacity.filter(function (r) { return !secKeys[String((r && r.sector) || '')]; });
      if (Array.isArray(employees)) employees.forEach(function (e) { if (e && secKeys[String(e.sector || '')]) { e.sector = ''; e.room = ''; } });
    }
    if (map.dynamicRooms) {
      var rmKeys = map.dynamicRooms;
      if (Array.isArray(roomsCapacity)) roomsCapacity = roomsCapacity.filter(function (r) { return !rmKeys[String((r && r.number) || '')]; });
      if (Array.isArray(employees)) employees.forEach(function (e) { if (e && rmKeys[String(e.room || '')]) { e.room = ''; } });
    }
    if (map.dynamicDepts) {
      var dpKeys = map.dynamicDepts;
      if (Array.isArray(employees)) employees.forEach(function (e) { if (e && dpKeys[String(e.dept || '')]) { e.dept = ''; } });
    }
    if (map.dynamicTitles) {
      var tKeys = map.dynamicTitles;
      if (Array.isArray(employees)) employees.forEach(function (e) { if (e && tKeys[String(e.title || '')]) { e.title = ''; } });
    }
  }

  function applyDeletionCleanup() {
    applyNameListDeletions();
    applyCascade();
  }

  // توسيع _applyDeletions الأصلية (التي كانت تتخطى قوائم الأسماء)
  var _origApply = window._applyDeletions || function () {};
  window._applyDeletions = function () {
    try { _origApply(); } catch (e) {}
    try { applyDeletionCleanup(); } catch (e) {}
  };

  // بعد المزامنة (دفعاً وسحباً) نعيد التنظيف حتى لا يرجع المحذوف من السحابة
  var _origPush = window.pushToSupabase;
  if (typeof _origPush === 'function') {
    window.pushToSupabase = async function () {
      try { await _origPush.apply(this, arguments); }
      catch (e) {}
      try { applyDeletionCleanup(); } catch (e) {}
      return true;
    };
  }
  var _origPull = window.pullFromSupabase;
  if (typeof _origPull === 'function') {
    window.pullFromSupabase = async function () {
      try { await _origPull.apply(this, arguments); }
      catch (e) {}
      try { applyDeletionCleanup(); } catch (e) {}
      try { if (typeof syncStorage === 'function') syncStorage(true, true); } catch (e) {}
    };
  }
  window.applyDeletionCleanup = applyDeletionCleanup;
})();