// ============================================================
//  استعادة مبنى "سكن الموظفين (السكن الإداري)" من النسخة الاحتياطية:
//  - المبنى وغرفه سليمان في السحابة لكن سجلات حذف قديمة (tombstones)
//    وقائمة الحذف الدائمة lineh_hard_deletes كانت تطرده محلياً
//    بعد كل سحب/دفع فاختفي من تبويب السكن مع أسماء ساكنيه.
//  - هنا: تنظيف كل سجلات الحذف الخاصة به من الأجهزة، وإعادة
//    غرفه الـ15 وسعتها كما في نسخة 2026-08-20، وإرجاع تعيينات
//    الموظفين التي فرّغها الطرد (من كان مبناه/غرفته فارغة فقط،
//    حتى لا نلغي أي نقل جديد تم عمداً).
//  - يعمل عند الإقلاع وبعد كل سحب/دفع ودورياً، ولا يحذف شيئاً أبداً.
// ============================================================
(function () {
  const BUILDING = 'سكن الموظفين (السكن الإداري)';
  // الغرف من النسخة الاحتياطية LINAHSYSTEM_Full_Backup_2026-08-20
  const ROOMS = [
    { number: 'ادارى', beds: 1 },
    { number: 'غرفة إداري 2', beds: 2 },
    { number: 'غرفة إداري 3', beds: 4 },
    { number: 'غرفة إداري 4', beds: 4 },
    { number: 'غرفة إداري 5', beds: 3 },
    { number: 'غرفة إداري 6', beds: 4 },
    { number: 'غرفة إداري 7', beds: 3 },
    { number: 'غرفة إداري 8', beds: 3 },
    { number: 'غرفة إداري 9', beds: 3 },
    { number: 'غرفة إداري 10', beds: 3 },
    { number: 'غرفة إداري 11', beds: 3 },
    { number: 'غرفة إداري 12', beds: 3 },
    { number: 'غرفة إداري 13', beds: 3 },
    { number: 'غرفة إداري 14', beds: 2 },
    { number: 'غرفة إداري 15 (ضيافة)', beds: 2 }
  ];
  // سكان المبنى من النسخة الاحتياطية (يُستخدمون فقط لإصلاح حقول فرّغها الطرد)
  const RESIDENTS = [
    { id: 'emp_2vdrmj4w1_1779020350362', code: '2131', name: 'احمد جابر السيد سيد', room: 'غرفة إداري 9' },
    { id: 'emp_x152nnrhe_1779020350362', code: '3121', name: 'احمد سلام محمد عبد الجليل', room: 'غرفة إداري 12' },
    { id: 'emp_8f0w3v7lf_1779020350362', code: '2896', name: 'احمد عاطف محمد على', room: 'غرفة إداري 10' },
    { id: 'emp_hxq4te05h_1779020350362', code: '2564', name: 'احمد عبد المجيد احمد عقيله', room: 'غرفة إداري 11' },
    { id: 'emp_35dungn23_1779020350362', code: '2951', name: 'احمد على الضوى', room: 'غرفة إداري 5' },
    { id: 'emp_1lmw6l6qx_1779020350362', code: '955', name: 'احمد فتحى السيد محمد', room: 'غرفة إداري 3' },
    { id: '1782478077872', code: '3156', name: 'احمد محمد  احمد متولى عمار', room: 'غرفة إداري 2' },
    { id: 'emp_ja1pmi5d9_1779020350362', code: '974', name: 'احمد محمد صالح اسماعيل', room: 'غرفة إداري 4' },
    { id: '1781864984675', code: '', name: 'احمد محمد متولى عمار', room: 'غرفة إداري 2' },
    { id: 'emp_18al0egf7_1779020350362', code: '2015', name: 'احمد مهدى سيد عبد السلام', room: 'غرفة إداري 13' },
    { id: 'emp_g3hrzwf3t_1779020350362', code: '2385', name: 'اسامه شحاته  السيد احمد', room: 'غرفة إداري 12' },
    { id: 'emp_xcl4pp9jj_1779020350362', code: '2787', name: 'اسلام عنتر يوسف عبد اللاه', room: 'غرفة إداري 8' },
    { id: 'emp_no432r7xc_1779020350362', code: '3045', name: 'السيد رضا العطافى جاد', room: 'غرفة إداري 7' },
    { id: 'emp_0wooy0ohh_1779020350362', code: '31', name: 'السيد على  محمد على جلهوم', room: 'غرفة إداري 4' },
    { id: 'emp_9l8s8ye4x_1779020350362', code: '96', name: 'تهامى ثابت محمد احمد', room: 'غرفة إداري 6' },
    { id: 'emp_49e7skny3_1779020350362', code: '80', name: 'جابر حسين عطيه حسن', room: 'غرفة إداري 3' },
    { id: 'emp_0wzu0j2dc_1779020350362', code: '32', name: 'جمال السيد رفاعى عامر', room: 'غرفة إداري 3' },
    { id: '1787230634077', code: '', name: 'حسان السيد حسان على العمريطى', room: 'غرفة إداري 14' },
    { id: 'emp_6cj0dvvi8_1779020350362', code: '1988', name: 'حسن احمد حسن سليمان', room: 'غرفة إداري 12' },
    { id: 'emp_10pixod74_1779020350362', code: '2954', name: 'حسين دومه عبد العظيم محمد', room: 'غرفة إداري 8' },
    { id: '1787154771595', code: '', name: 'حسين سيد عبيد', room: 'غرفة إداري 9' },
    { id: 'emp_t8f21cszy_1779020350362', code: '1762', name: 'حمدى صلاح محمد الفقى', room: 'غرفة إداري 10' },
    { id: 'emp_40z08r2lu_1779020350362', code: '21', name: 'خالد عمر السيد عمر', room: 'غرفة إداري 4' },
    { id: 'emp_zpsn7h9q6_1779020350362', code: '2566', name: 'خالد عوض محمد محمود', room: 'غرفة إداري 10' },
    { id: 'emp_ouo3zsriw_1779020350362', code: '2678', name: 'سعيد محمد رفاعى محمد موسى', room: 'غرفة إداري 7' },
    { id: 'emp_zabsb7lb7_1779020350362', code: '1802', name: 'طارق مصطفى عباس محمد', room: 'غرفة إداري 11' },
    { id: 'emp_wilcnhy2n_1779020350362', code: '3083', name: 'طه فرج عبد الغنى محمود', room: 'غرفة إداري 6' },
    { id: 'emp_l5onk8dgh_1779020350362', code: '986', name: 'عبد السلام عوض ربيع عبد الجواد', room: 'غرفة إداري 6' },
    { id: 'emp_7r4fsqyxi_1779020350362', code: '2184', name: 'عبد المجيد متولى عبد المجيد المرسى', room: 'غرفة إداري 5' },
    { id: 'emp_eker6t03t_1779020350362', code: '42', name: 'عبده صابر عبده عطوه', room: 'غرفة إداري 3' },
    { id: 'emp_nioips831_1779020350362', code: '1198', name: 'عرفات صابر ياسين ابراهيم', room: 'غرفة إداري 7' },
    { id: 'emp_cl0lx8ghc_1779020350362', code: '3065', name: 'عماد عبد الحميد  عيد عبد الحميد', room: 'غرفة إداري 11' },
    { id: 'emp_hko3hnwdh_1779020350363', code: '2925', name: 'محمد صلاح السيد إبراهيم', room: 'غرفة إداري 5' },
    { id: '1785676066963', code: '', name: 'محمد فريد', room: 'غرفة إداري 13' },
    { id: 'emp_lsua19yi2_1779020350363', code: '2186', name: 'محمود احمد حسين سيد', room: 'غرفة إداري 13' },
    { id: 'emp_jgs7m44kx_1779020350363', code: '2955', name: 'محمود حسن النادى على', room: 'غرفة إداري 8' },
    { id: 'emp_kiyy221y3_1779020350363', code: '2953', name: 'محمود مأمون جمال الدين مصطفى', room: 'غرفة إداري 15 (ضيافة)' },
    { id: 'emp_izr21e6lr_1779020350363', code: '3118', name: 'محمود مصطفى محمد صالح', room: 'غرفة إداري 14' },
    { id: 'emp_jl3pntiyu_1779020350363', code: '67', name: 'محمود ياسر محمد', room: 'غرفة إداري 6' },
    { id: '1781187098235', code: '3160', name: 'مصطفى سعيد محمود احمد غراب', room: 'غرفة إداري 9' },
    { id: 'emp_907setclu_1779020350363', code: '1249', name: 'ممدوح ابوعياد محمد محمد', room: 'غرفة إداري 4' },
    { id: 'emp_a0zpibbuw_1779020350363', code: '2780', name: 'هانى ناصر صابر محمود', room: 'غرفة إداري 9' },
    { id: '1786430465545', code: '2881', name: 'هشام احمد على طه', room: 'غرفة إداري 14' },
    { id: 'emp_j5tzgh3ul_1779020350363', code: '2994', name: 'هيثم محمد الشازلى عبد الوهاب', room: 'غرفة إداري 15 (ضيافة)' }
  ];

  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }
  const N_BUILDING = _norm(BUILDING);
  const N_ROOMS = {};
  ROOMS.forEach(function (r) { N_ROOMS[_norm(r.number)] = r; });

  function _readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) { return fallback; }
  }

  // 1) إخراج المبنى وغرفه من قائمة الحذف الدائمة
  function clearHardDeletes() {
    let changed = false;
    const kill = _readJSON('lineh_hard_deletes', null);
    if (kill && typeof kill === 'object') {
      ['sectors', 'rooms'].forEach(function (kind) {
        if (!kill[kind]) return;
        Object.keys(kill[kind]).forEach(function (k) {
          if (k === N_BUILDING || N_ROOMS[k]) { delete kill[kind][k]; changed = true; }
        });
      });
      if (changed) { try { localStorage.setItem('lineh_hard_deletes', JSON.stringify(kill)); } catch (e) {} }
      if (typeof window.hardDeleteAllowAgain === 'function') {
        window.hardDeleteAllowAgain('sector', BUILDING);
        ROOMS.forEach(function (r) { window.hardDeleteAllowAgain('room', r.number); });
      }
    }
    return changed;
  }

  // 2) تنظيف سجلات الحذف القديمة الخاصة بالمبنى (tombstones)
  function purgeTombstones() {
    let changed = false;
    const isBuildingTomb = function (d) {
      if (!d || d.key == null) return false;
      const k = String(d.key);
      const nk = _norm(k);
      if (d.entity === 'dynamicSectors' && nk === N_BUILDING) return true;
      if (d.entity === 'roomsCapacity' && k.indexOf('|') === -1 && nk === N_BUILDING) return true;
      if (d.entity === 'roomsCapacity' && k.indexOf('|') > -1) {
        const sec = _norm(k.split('|')[0]);
        const rm = _norm(k.split('|').slice(1).join('|'));
        return sec === N_BUILDING && !!N_ROOMS[rm];
      }
      return false;
    };
    const log = _readJSON('lineh_sync_deletions', []);
    if (Array.isArray(log)) {
      const f = log.filter(function (d) { return !isBuildingTomb(d); });
      if (f.length !== log.length) {
        try { localStorage.setItem('lineh_sync_deletions', JSON.stringify(f)); changed = true; } catch (e) {}
      }
    }
    try {
      if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) {
        const before = syncDeletions.length;
        for (let i = syncDeletions.length - 1; i >= 0; i--) {
          if (isBuildingTomb(syncDeletions[i])) syncDeletions.splice(i, 1);
        }
        if (syncDeletions.length !== before) changed = true;
      }
    } catch (e) {}
    return changed;
  }

  // 3) إعادة الغرف والمبنى إن كانت مفقودة
  function restoreRooms() {
    let changed = false;
    try {
      if (typeof roomsCapacity === 'undefined' || !Array.isArray(roomsCapacity)) return changed;
      ROOMS.forEach(function (r) {
        const exists = roomsCapacity.some(function (x) {
          return x && _norm(x.sector) === N_BUILDING && _norm(x.number) === _norm(r.number);
        });
        if (!exists) { roomsCapacity.push({ sector: BUILDING, number: r.number, beds: r.beds }); changed = true; }
      });
      if (typeof dynamicSectors !== 'undefined' && Array.isArray(dynamicSectors)) {
        const has = dynamicSectors.some(function (s) { return s && _norm(s) === N_BUILDING; });
        if (!has) { dynamicSectors.push(BUILDING); changed = true; }
      }
    } catch (e) {}
    return changed;
  }

  // 4) إصلاح تعيينات الموظفين التي فرّغها الطرد (فقط الفارغة)
  function healEmployees() {
    let changed = false;
    try {
      if (typeof employees === 'undefined' || !Array.isArray(employees)) return changed;
      RESIDENTS.forEach(function (res) {
        let e = null;
        if (res.id) e = employees.find(function (x) { return x && x.id === res.id; });
        if (!e && res.code) e = employees.find(function (x) { return x && x.code && String(x.code) === String(res.code); });
        if (!e) e = employees.find(function (x) { return x && _norm(x.name) === _norm(res.name); });
        if (!e) return;
        if ((!e.sector || !String(e.sector).trim()) || (!e.room || !String(e.room).trim())) {
          if (_norm(e.sector || '') !== N_BUILDING || _norm(e.room || '') !== _norm(res.room)) {
            e.sector = BUILDING;
            e.room = res.room;
            changed = true;
          }
        }
      });
    } catch (e) {}
    return changed;
  }

  function refreshUI() {
    try { if (typeof renderHousingLayout === 'function') renderHousingLayout(); } catch (e) {}
    try { if (typeof updateHousingStats === 'function') updateHousingStats(); } catch (e) {}
    try { if (typeof rebuildAllDropdowns === 'function') rebuildAllDropdowns(); } catch (e) {}
    try { if (typeof populateRoomSectorDropdown === 'function') populateRoomSectorDropdown(); } catch (e) {}
  }

  function run() {
    let changed = false;
    if (clearHardDeletes()) changed = true;
    if (purgeTombstones()) changed = true;
    if (restoreRooms()) changed = true;
    if (healEmployees()) changed = true;
    if (changed) {
      try { if (typeof syncStorage === 'function') syncStorage(); } catch (e) {}
      refreshUI();
    }
    return changed;
  }

  const _origPull = window.pullFromSupabase;
  if (typeof _origPull === 'function') {
    window.pullFromSupabase = function () {
      const res = _origPull.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (v) { try { run(); } catch (e) {} return v; });
      }
      try { run(); } catch (e) {}
      return res;
    };
  }
  const _origPush = window.pushToSupabase;
  if (typeof _origPush === 'function') {
    window.pushToSupabase = function () {
      const res = _origPush.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (v) { try { run(); } catch (e) {} return v; });
      }
      try { run(); } catch (e) {}
      return res;
    };
  }

  function boot() { try { run(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { try { boot(); setTimeout(boot, 3000); } catch (e) {} });
  setInterval(function () { try { run(); } catch (e) {} }, 20000);

  window.restoreAdminBuilding = run;
})();
