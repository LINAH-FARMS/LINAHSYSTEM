// ============================================================
// حماية مقاولي الخبز من المسح التلقائي:
// - السبب: عند كل سحب/دمج للبيانات من السحابة كان الكود يرشّح قائمة
//   مقاولي الخبز ليقتصر على 7 أسماء ثابتة فقط ويرمي أي اسم مضاف
//   يدوياً (مثل أبو عمار) فيظهر كأنه "يُمسح لوحده" بعد كل مزامنة
// - الحل: مرآة محلية بأسماء المقاولين كما أدخلها المستخدم لا تمسحها
//   المزامنة + قائمة حذف دائمة مطبَّعة، وبعد كل سحب/دفع/إقلاع/دورياً
//   تُعاد القائمة إلى (المرآة ناقص المحذوف نهائياً)
// - إعادة الإضافة المتعمدة من خانة الإضافة تُلغي حذف الاسم تلقائياً
// - زر "مسح غير النشطين": يحذف نهائياً من ليس له توريد خلال آخر شهر
//   (أو المدة التي تحددها) مع مراعاة المضاف حديثاً يدوياً
// ============================================================
(function () {
  const KILL_KEY = 'lineh_bakery_ctr_killed';
  const MIRROR_KEY = 'lineh_bakery_ctr_mirror';
  const ADDS_KEY = 'lineh_bakery_ctr_added';
  const SEED_FLAG = 'lineh_bakery_ctr_killed_seeded';
  const BTN_ID = 'btn-prune-inactive-ctrs';

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

  let added = {};
  try { added = JSON.parse(localStorage.getItem(ADDS_KEY) || '{}') || {}; } catch (e) { added = {}; }
  if (typeof added !== 'object' || !added) added = {};

  function _saveKill() { try { localStorage.setItem(KILL_KEY, JSON.stringify(kill)); } catch (e) {} }
  function _saveMirror() { try { localStorage.setItem(MIRROR_KEY, JSON.stringify(mirror || [])); } catch (e) {} }
  function _saveAdded() { try { localStorage.setItem(ADDS_KEY, JSON.stringify(added)); } catch (e) {} }

  function _isKilled(name) { const n = _norm(name); return !!(n && kill[n]); }
  function _addKill(name) {
    const n = _norm(name);
    if (!n || n.length < 2 || kill[n]) return false;
    kill[n] = new Date().toISOString();
    _saveKill();
    return true;
  }
  function _removeKill(name) {
    const n = _norm(name);
    if (kill[n]) { delete kill[n]; _saveKill(); return true; }
    return false;
  }
  function _markAdded(name) {
    const n = _norm(name);
    if (!n) return;
    if (!added[n]) { added[n] = new Date().toISOString(); _saveAdded(); }
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

  function _arr() {
    try { if (Array.isArray(bakeryContractorsNames)) return bakeryContractorsNames; } catch (e) {}
    return null;
  }

  // ---- الطرد والترميم: القائمة الصحيحة = المرآة ناقص المحذوف دائماً ----
  function sweep() {
    const arr = _arr();
    if (!arr) return false;
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

  // ---- حساب آخر نشاط لكل مقاول من تواريخ التوريدات ----
  function _parseDate(v) {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    let d = new Date(v);
    if (!isNaN(d)) return d;
    const m = String(v).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }
  function lastActivityMap() {
    const map = {};
    try {
      if (typeof bakeryContractorSupplies !== 'undefined' && Array.isArray(bakeryContractorSupplies)) {
        bakeryContractorSupplies.forEach(function (r) {
          if (!r || !r.name) return;
          const d = _parseDate(r.date) || _parseDate(r.createdAt);
          if (!d) return;
          const k = _norm(r.name);
          if (!map[k] || d > map[k]) map[k] = d;
        });
      }
    } catch (e) {}
    return map;
  }

  // ---- غير النشطين: بلا توريد خلال المدة وليس مضافاً حديثاً ----
  function inactiveNames(days) {
    const D = days || 31;
    const cutoff = new Date(Date.now() - D * 86400000);
    const act = lastActivityMap();
    const out = [];
    const seen = {};
    const cur = _arr() || [];
    cur.concat(mirror || []).forEach(function (n) {
      if (typeof n !== 'string') return;
      const k = _norm(n);
      if (!k || seen[k]) return;
      seen[k] = true;
      const lastSup = act[k] || null;
      const addedAt = added[k] ? _parseDate(added[k]) : null;
      const isActive = (lastSup && lastSup >= cutoff) || (addedAt && addedAt >= cutoff);
      if (!isActive) out.push(n);
    });
    return out;
  }
  function pruneInactive(days) {
    const list = inactiveNames(days);
    let c = 0;
    list.forEach(function (n) { if (_addKill(n)) c++; });
    if (c) run(true);
    return c;
  }

  // ---- بذر آمن لمرة واحدة من سجل الحذف القديم ----
  function seedFromLogOnce() {
    if (localStorage.getItem(SEED_FLAG)) return;
    let dels = [];
    try { const d0 = JSON.parse(localStorage.getItem('lineh_sync_deletions') || '[]'); if (Array.isArray(d0)) dels = d0.slice(); } catch (e) {}
    try { if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) dels = dels.concat(syncDeletions); } catch (e) {}
    const arr = _arr();
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

  // ---- التقاط الحذف: نسجل الحذف قبل التنفيذ حتى لا تعيده المرآة
  //      أثناء إعادة بناء القوائم داخل الزر نفسه، ونتراجع عند الإلغاء ----
  const _origDel = window.deleteDynamicItem;
  if (typeof _origDel === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      let item = null;
      const isCtr = listId === 'bakery-ctr';
      if (isCtr) {
        try {
          const src = bakeryContractorsNames;
          if (Array.isArray(src) && src[idx] != null) item = typeof src[idx] === 'string' ? src[idx] : (src[idx].name || null);
        } catch (e) {}
      }
      if (isCtr && item) _addKill(item); // مسبقاً: أي ترميم أثناء التنفيذ يطرده
      const r = _origDel.apply(this, arguments);
      if (isCtr && item) {
        let still = false;
        try {
          const arr = bakeryContractorsNames;
          const ni = _norm(item);
          for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === ni) { still = true; break; } }
        } catch (e) {}
        if (still) { _removeKill(item); run(true); } // ألغى المستخدم التأكيد
        else run(true);
      }
      return r;
    };
  }

  // ---- إعادة الإضافة المتعمدة تُلغي الحذف (قبل أن تمسح الخانة) ----
  document.addEventListener('click', function (ev) {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('#btn-bakery-ctr')) {
      const inp = document.getElementById('new-bakery-ctr');
      const val = inp ? String(inp.value || '').trim() : '';
      if (!val) return;
      _markAdded(val);
      if (_removeKill(val)) run(false);
    }
    if (t.closest('#' + BTN_ID)) {
      ev.preventDefault();
      ev.stopPropagation();
      const list = inactiveNames(31);
      if (!list.length) { alert('كل المقاولين نشطين خلال آخر شهر.'); return; }
      if (!confirm('سيتم الحذف نهائياً (' + list.length + ' مقاول) لم يسجل لهم توريد خلال آخر شهر:\n\n' + list.join('، ') + '\n\nهل تريد المتابعة؟')) return;
      const c = pruneInactive(31);
      alert('تم حذف ' + c + ' مقاول غير نشط.');
    }
  }, true);

  // ---- زر إعادة التعيين الأساسيين: نقبل اختياره ونبدأ صفحة جديدة ----
  const _origFix = window.fixBakeryContractors;
  if (typeof _origFix === 'function') {
    window.fixBakeryContractors = function () {
      const r = _origFix.apply(this, arguments);
      try {
        kill = {};
        added = {};
        _saveKill();
        _saveAdded();
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

  // ---- حقن زر مسح غير النشطين بجوار زر إضافة المقاول ----
  function injectBtn() {
    if (document.getElementById(BTN_ID)) return true;
    const anchor = document.getElementById('btn-bakery-ctr');
    if (!anchor || !anchor.parentNode) return false;
    const b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.textContent = '🧹 مسح غير النشطين (شهر)';
    b.title = 'حذف نهائي للمقاولين الذين لم يسجل لهم توريد خلال آخر شهر';
    b.style.cssText = 'background:#e67e22;color:#fff;border:none;border-radius:6px;padding:5px 12px;margin-right:6px;cursor:pointer;font-family:inherit;font-size:13px;';
    anchor.parentNode.insertBefore(b, anchor.nextSibling);
    return true;
  }
  let injectTries = 0;
  const injectTimer = setInterval(function () {
    if (injectBtn() || ++injectTries > 60) clearInterval(injectTimer);
  }, 500);

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
  window.bakeryCtrDeleteForever = function (name) { if (_addKill(name)) run(true); };
  window.bakeryCtrAllowAgain = function (name) { if (_removeKill(name)) run(true); };
  window.bakeryCtrPruneInactive = function (days) { return pruneInactive(days || 31); };
})();
