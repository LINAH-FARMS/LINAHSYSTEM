// ============================================================
// حماية مقاولي الخبز من المسح التلقائي:
// - السبب: عند كل سحب/دمج للبيانات من السحابة كان الكود يرشّح قائمة
//   مقاولي الخبز ليقتصر على 7 أسماء ثابتة فقط ويرمي أي اسم مضاف
//   يدوياً (مثل أبو عمار) فيظهر كأنه "يُمسح لوحده" بعد كل مزامنة
// - الحل: مرآة محلية بأسماء المقاولين كما أدخلها المستخدم لا تمسحها
//   المزامنة + قائمة حذف دائمة مطبَّعة، وبعد كل سحب/دفع/إقلاع/دورياً
//   تُعاد القائمة إلى (المرآة ناقص المحذوف نهائياً)
// - إعادة الإضافة المتعمدة من خانة الإضافة تُلغي حذف الاسم تلقائياً
// ============================================================
(function () {
  const KILL_KEY = 'lineh_bakery_ctr_killed';
  const MIRROR_KEY = 'lineh_bakery_ctr_mirror';
  const SEED_FLAG = 'lineh_bakery_ctr_killed_seeded';

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
  try { kill = JSON.parse(localStorage.getItem(KILL_KEY) || '{}') || {}; } catch (e) { kill = {}; }
  if (typeof kill !== 'object' || !kill) kill = {};

  let mirror = null;
  try {
    const m = JSON.parse(localStorage.getItem(MIRROR_KEY) || 'null');
    if (Array.isArray(m)) mirror = m.filter(function (x) { return typeof x === 'string'; });
  } catch (e) {}

  function _saveKill() { try { localStorage.setItem(KILL_KEY, JSON.stringify(kill)); } catch (e) {} }
  function _saveMirror() { try { localStorage.setItem(MIRROR_KEY, JSON.stringify(mirror || [])); } catch (e) {} }
  function _addKill(name) {
    const n = _norm(name);
    if (!n || n.length < 2) return false;
    if (kill[n]) return false;
    kill[n] = new Date().toISOString();
    _saveKill();
    return true;
  }
  function _removeKill(name) {
    const n = _norm(name);
    if (kill[n]) { delete kill[n]; _saveKill(); return true; }
    return false;
  }

  // ---- المرآة: تحتفظ بكل الأسماء التي رآها المستخدم ----
  function _adopt(cur) {
    let changed = false;
    if (!Array.isArray(mirror)) mirror = [];
    const seen = {};
    mirror.forEach(function (n) { seen[_norm(n)] = true; });
    cur.forEach(function (n) {
      if (typeof n !== 'string') return;
      const k = _norm(n);
      if (!k || seen[k] || kill[k]) return;
      mirror.push(n);
      seen[k] = true;
      changed = true;
    });
    if (changed) _saveMirror();
    return changed;
  }

  // ---- الطرد والترميم: القائمة الصحيحة = المرآة ناقص المحذوف دائماً ----
  function sweep() {
    let arr;
    try { arr = bakeryContractorsNames; } catch (e) { return false; }
    if (!Array.isArray(arr)) return false;
    _adopt(arr);
    const desired = (mirror || []).filter(function (n) { return !_isKilled(n); });
    const curKeys = arr.map(_norm).join('\u0001');
    const wantKeys = desired.map(_norm).join('\u0001');
    if (curKeys === wantKeys) return false;
    arr.splice(0, arr.length);
    desired.forEach(function (n) { arr.push(n); });
    try { localStorage.setItem('linah_bakery_contractors_names', JSON.stringify(arr)); } catch (e) {}
    return true;
  }
  function _isKilled(name) { const n = _norm(name); return !!(n && kill[n]); }

  let refreshing = false;
  function refreshUI() {
    if (refreshing) return;
    refreshing = true;
    setTimeout(function () {
      try { if (typeof renderDynamicLists === 'function') renderDynamicLists(); } catch (e) {}
      try { if (typeof populateBctrDatalist === 'function') populateBctrDatalist(); } catch (e) {}
      refreshing = false;
    }, 50);
  }

  function run(withUI) {
    try { if (sweep() && typeof syncStorage === 'function') { try { syncStorage(); } catch (e) {} } } catch (e) {}
    if (withUI) refreshUI();
  }

  // ---- بذر آمن لمرة واحدة من سجل الحذف القديم ----
  function seedFromLogOnce() {
    if (localStorage.getItem(SEED_FLAG)) return;
    let dels = [];
    try { const d0 = JSON.parse(localStorage.getItem('lineh_sync_deletions') || '[]'); if (Array.isArray(d0)) dels = d0.slice(); } catch (e) {}
    try { if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) dels = dels.concat(syncDeletions); } catch (e) {}
    let arr = null;
    try { if (typeof bakeryContractorsNames !== 'undefined' && Array.isArray(bakeryContractorsNames)) arr = bakeryContractorsNames; } catch (e) {}
    dels.forEach(function (d) {
      if (!d || d.entity !== 'bakeryContractorsNames' || d.key == null) return;
      if (arr) {
        const n = _norm(String(d.key));
        for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === n) return; } // موجود حالياً = لا نطرده تلقائياً
      }
      _addKill(String(d.key));
    });
    try { localStorage.setItem(SEED_FLAG, new Date().toISOString()); } catch (e) {}
  }

  // ---- التقاط الحذف: نسجل فقط إذا حُذف فعلاً (وليس إلغاء تأكيد) ----
  const _origDel = window.deleteDynamicItem;
  if (typeof _origDel === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      let item = null;
      if (listId === 'bakery-ctr') {
        try {
          const src = bakeryContractorsNames;
          if (Array.isArray(src) && src[idx] != null) item = typeof src[idx] === 'string' ? src[idx] : (src[idx].name || null);
        } catch (e) {}
      }
      const r = _origDel.apply(this, arguments);
      if (listId === 'bakery-ctr' && item) {
        let still = false;
        try {
          const arr = bakeryContractorsNames;
          const ni = _norm(item);
          for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === ni) { still = true; break; } }
        } catch (e) {}
        if (!still) { _addKill(item); run(true); }
      }
      return r;
    };
  }

  // ---- إعادة الإضافة المتعمدة تُلغي الحذف (قبل أن تمسح الخانة) ----
  document.addEventListener('click', function (ev) {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (!t.closest('#btn-bakery-ctr')) return;
    const inp = document.getElementById('new-bakery-ctr');
    const val = inp ? String(inp.value || '').trim() : '';
    if (val && _removeKill(val)) run(false);
  }, true);

  // ---- زر إعادة التعيين الأساسيين: نقبل اختياره ونبدأ صفحة جديدة ----
  const _origFix = window.fixBakeryContractors;
  if (typeof _origFix === 'function') {
    window.fixBakeryContractors = function () {
      const r = _origFix.apply(this, arguments);
      try {
        kill = {};
        _saveKill();
        mirror = Array.isArray(bakeryContractorsNames) ? bakeryContractorsNames.slice() : [];
        _saveMirror();
      } catch (e) {}
      return r;
    };
  }

  // ---- بعد السحب والدفع والاكتشاف وإعادة البناء ----
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

  function boot() {
    try { seedFromLogOnce(); } catch (e) {}
    run(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { try { run(false); setTimeout(function () { run(false); }, 3000); } catch (e) {} });
  setInterval(function () { try { run(false); } catch (e) {} }, 10000);

  // ---- أدوات الكونسول ----
  window.bakeryCtrDeleteForever = function (name) { if (_addKill(name)) run(true); };
  window.bakeryCtrAllowAgain = function (name) { if (_removeKill(name)) run(true); };
})();
