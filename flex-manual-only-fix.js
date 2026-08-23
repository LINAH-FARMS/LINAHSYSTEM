// ============================================================
// منع الكتابة التلقائية للبيارات والإدارات في الإدارة المرنة:
// - الإدارات كانت تعود تلقائياً لأن rebuildAllDropdowns يدفع إدارة
//   كل موظف إلى القائمة عند أي إعادة بناء (وأي صيغة قريبة لاسم
//   محذوف على أي موظف تعيد إنشاءه) — لم يكن لها حماية مطلقاً
// - البيارات كان ملف الحماية القديم يمحو حذفها عند الإقلاع إذا وُجد
//   الاسم في القوائم (والاكتشاف التلقائي يعيده من السجلات قبله)
// - الحل: قائمة حذف دائمة مطبَّعة (مسافات/همزات/تاء مربوطة/أرقام)
//   تطرد الاسم من القائمة ومن مصدره (سجلات البيارات وإدارات الموظفين)
//   بعد كل: إقلاع، اكتشاف تلقائي، إعادة بناء قوائم، سحب، دفع، ودورياً
// - إعادة الإضافة المتعمدة من خانة الإضافة تُلغي الحذف تلقائياً
// - لا شفاء وجودي عند الإقلاع — عودة الاسم تعني رجوعاً من السحابة ويُطرد
// ============================================================
(function () {
  const STORE_KEY = 'lineh_flex_killed';
  const SEED_FLAG = 'lineh_flex_killed_seeded';
  const KINDS = { dept: 1, septic: 1 };
  const LIST_OF = { dept: 'dynamicDepts', septic: 'dynamicSeptics' };

  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .normalize('NFC')
      .replace(/[ة]/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/[ى]/g, 'ي')
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }

  let kill = {};
  try { kill = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { kill = {}; }
  if (typeof kill !== 'object' || !kill) kill = {};

  function _save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(kill)); } catch (e) {} }
  function _add(kind, name) {
    const n = _norm(name);
    if (!n || n.length < 2 || !KINDS[kind]) return false;
    if (!kill[kind]) kill[kind] = {};
    if (kill[kind][n]) return false;
    kill[kind][n] = new Date().toISOString();
    _save();
    return true;
  }
  function _remove(kind, name) {
    const n = _norm(name);
    if (kill[kind] && kill[kind][n]) { delete kill[kind][n]; _save(); return true; }
    return false;
  }
  function _isKilled(kind, name) {
    const n = _norm(name);
    return !!(n && kill[kind] && kill[kind][n]);
  }

  // ---- الوصول الآمن لمصفوفات النظام ----
  function _arrOf(kind) {
    try {
      const nm = LIST_OF[kind];
      if (nm && typeof window[nm] !== 'undefined' && Array.isArray(window[nm])) return window[nm];
      if (nm && typeof eval(nm) !== 'undefined') return eval(nm);
    } catch (e) {}
    return null;
  }

  // ---- الطرد من القائمة ومن المصدر ----
  function sweep() {
    let changed = false;
    ['dept', 'septic'].forEach(function (kind) {
      const arr = _arrOf(kind);
      if (!Array.isArray(arr)) return;
      for (let i = arr.length - 1; i >= 0; i--) {
        const v = typeof arr[i] === 'string' ? arr[i] : (arr[i] && (arr[i].name || arr[i].label));
        if (v && _isKilled(kind, v)) { arr.splice(i, 1); changed = true; }
      }
    });
    // مصدر البيارات: سجلات بأي صيغة قريبة من اسم محذوف تُمسح حتى لا
    // يعيد اكتشافها التلقائي إنشائها من جديد
    try {
      if (typeof septicRecords !== 'undefined' && Array.isArray(septicRecords)) {
        for (let i = septicRecords.length - 1; i >= 0; i--) {
          const s = septicRecords[i];
          if (s && _isKilled('septic', s.name || s.sector)) { septicRecords.splice(i, 1); changed = true; }
        }
      }
    } catch (e) {}
    // مصدر الإدارات: إدارة الموظف باسم محذوف (أو صيغة قريبة) تُفرَّغ
    try {
      if (typeof employees !== 'undefined' && Array.isArray(employees)) {
        employees.forEach(function (e) {
          if (e && e.dept && _isKilled('dept', e.dept)) { e.dept = ''; changed = true; }
        });
      }
    } catch (e) {}
    if (changed) {
      try {
        const d = _arrOf('dept'), sp = _arrOf('septic');
        if (Array.isArray(d)) localStorage.setItem('dyn_depts', JSON.stringify(d.filter(function (x) { return typeof x === 'string'; })));
        if (Array.isArray(sp)) localStorage.setItem('dyn_septics', JSON.stringify(sp.filter(function (x) { return typeof x === 'string'; })));
      } catch (e) {}
    }
    return changed;
  }

  // ---- تحديث الواجهة بحارس ضد التداخل ----
  let refreshing = false;
  function refreshUI() {
    if (refreshing) return;
    refreshing = true;
    setTimeout(function () {
      try { if (typeof renderDynamicLists === 'function') renderDynamicLists(); } catch (e) {}
      try { if (typeof rebuildAllDropdowns === 'function') rebuildAllDropdowns(); } catch (e) {}
      refreshing = false;
    }, 50);
  }

  function run(withUI) {
    try { if (sweep() && typeof syncStorage === 'function') { try { syncStorage(); } catch (e) {} } } catch (e) {}
    if (withUI) refreshUI();
  }

  // ---- بذر آمن لمرة واحدة من سجل الحذف القديم ----
  // الأسماء غير الموجودة حالياً في القوائم = حذف سابق صحيح يبقى ميتاً،
  // والأسماء الموجودة = قد تكون مستخدمة فعلياً فلا تُطرد تلقائياً
  // (تحذيرها يحذفها نهائياً من الآن فصاعداً عبر زر الحذف)
  function seedFromLogOnce() {
    if (localStorage.getItem(SEED_FLAG)) return;
    let dels = [];
    try { const d0 = JSON.parse(localStorage.getItem('lineh_sync_deletions') || '[]'); if (Array.isArray(d0)) dels = d0.slice(); } catch (e) {}
    try { if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) dels = dels.concat(syncDeletions); } catch (e) {}
    dels.forEach(function (d) {
      if (!d || d.key == null) return;
      const kind = d.entity === 'dynamicDepts' ? 'dept' : d.entity === 'dynamicSeptics' ? 'septic' : null;
      if (!kind) return;
      const arr = _arrOf(kind);
      if (arr) {
        const n = _norm(String(d.key));
        for (let i = 0; i < arr.length; i++) {
          const v = typeof arr[i] === 'string' ? arr[i] : (arr[i] && arr[i].name);
          if (v && _norm(v) === n) return; // موجود حالياً = لا نطرده تلقائياً
        }
      }
      _add(kind, String(d.key));
    });
    try { localStorage.setItem(SEED_FLAG, new Date().toISOString()); } catch (e) {}
  }

  // ---- التقاط الحذف: نسجل فقط إذا حُذف فعلاً (وليس إلغاء تأكيد) ----
  const DEL_KIND = { dept: 'dept', septic: 'septic' };
  const _origDel = window.deleteDynamicItem;
  if (typeof _origDel === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      let item = null;
      const kind = DEL_KIND[listId];
      if (kind) {
        const src = _arrOf(kind);
        if (Array.isArray(src) && src[idx] != null) item = typeof src[idx] === 'string' ? src[idx] : (src[idx].name || src[idx].label || null);
      }
      const r = _origDel.apply(this, arguments);
      if (kind && item != null) {
        const arr = _arrOf(kind);
        let still = false;
        if (Array.isArray(arr)) {
          const ni = _norm(item);
          for (let i = 0; i < arr.length; i++) {
            const v = typeof arr[i] === 'string' ? arr[i] : (arr[i] && arr[i].name);
            if (v && _norm(v) === ni) { still = true; break; }
          }
        }
        if (!still) { _add(kind, item); run(true); }
      }
      return r;
    };
  }

  // ---- إعادة الإضافة المتعمدة تُلغي الحذف (قبل أن تمسح الخانة) ----
  const ADD_MAP = [
    { btn: 'btn-septic', input: 'new-septic', kind: 'septic' },
    { btn: 'btn-dept', input: 'new-dept', kind: 'dept' }
  ];
  document.addEventListener('click', function (ev) {
    const t = ev.target;
    if (!t || !t.closest) return;
    ADD_MAP.forEach(function (m) {
      if (!t.closest('#' + m.btn)) return;
      const inp = document.getElementById(m.input);
      const val = inp ? String(inp.value || '').trim() : '';
      if (val && _remove(m.kind, val)) run(false);
    });
  }, true);

  // ---- بعد الاكتشاف التلقائي وإعادة البناء والسحب والدفع ----
  ['autoDiscoverDynamicData', 'rebuildAllDropdowns'].forEach(function (fn) {
    const orig = window[fn];
    if (typeof orig === 'function') {
      window[fn] = function () { const r = orig.apply(this, arguments); run(true); return r; };
    }
  });
  ['pullFromSupabase', 'pushToSupabase', 'syncStorage'].forEach(function (fn) {
    const orig = window[fn];
    if (typeof orig === 'function') {
      window[fn] = function () {
        let res;
        try { res = orig.apply(this, arguments); } catch (e) { run(false); throw e; }
        if (res && typeof res.then === 'function') return res.then(function (v) { run(true); return v; });
        run(true);
        return res;
      };
    }
  });

  window.addEventListener('storage', function () { run(false); });

  // ---- الإقلاع ----
  function boot() {
    try { seedFromLogOnce(); } catch (e) {}
    run(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { try { run(false); setTimeout(function () { run(false); }, 3000); } catch (e) {} });
  setInterval(function () { try { run(false); } catch (e) {} }, 10000);

  // ---- أدوات الكونسول ----
  window.flexDeleteForever = function (kind, name) { if (_add(kind, name)) run(true); };
  window.flexAllowAgain = function (kind, name) { if (_remove(kind, name)) run(true); };
})();
