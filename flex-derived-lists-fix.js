// ============================================================
// الإدارة المرنة من مصدر الحقيقة:
// - كل قائمة تُحسب لحظياً من سجلات التبويبات الفعلية:
//     الإدارات والوظائف من سجلات الموظفين
//     البيارات من سجلات البيارات
//     المباني والغرف من سجلات السكن roomsCapacity
//     تصنيفات الزوار من سجلات الضيافة hospitalities
//     قطاعات المقاولين (الفنيون) يدوية التغذية فقط
// - زائد ما أضفته أنت يدوياً من خانات الإضافة (محفوظ دائماً)
// - ناقص ما حذفته نهائياً (قائمة منع موحدة مورَّثة من كل الأنظمة السابقة)
// - لا تخترع شيئاً من نفسها: أي اسم يعود من السحابة أو الاكتشاف
//   التلقائي ويجده غير موجود في المصادر يُمسح خلال ثانية كحد أقصى
// - إعادة إضافة الاسم من خانة الإضافة تلغي منعه تلقائياً
// ============================================================
(function () {
  const MANUAL_KEY = 'lineh_flex_manual_v2';
  const KILLS_KEY = 'lineh_flex_kills_v2';
  const SEED_FLAG = 'lineh_flex_derived_seeded';

  // النوع: { arr: المصفوفة العامة, ls: مفتاح الحفظ, src: دالة المصدر }
  const TYPES = {
    'dept':         { arr: () => typeof dynamicDepts === 'undefined' ? null : dynamicDepts,        ls: 'dyn_depts',        src: () => recNames(() => employees, e => e.dept) },
    'title':        { arr: () => typeof dynamicTitles === 'undefined' ? null : dynamicTitles,      ls: 'dyn_titles',       src: () => recNames(() => employees, e => e.title) },
    'septic':       { arr: () => typeof dynamicSeptics === 'undefined' ? null : dynamicSeptics,    ls: 'dyn_septics',      src: () => recNames(() => septicRecords, s => s && (s.name || s.sector)) },
    'sector':       { arr: () => typeof dynamicSectors === 'undefined' ? null : dynamicSectors,    ls: 'dyn_sectors',      src: () => recNames(() => roomsCapacity, r => r && r.sector) },
    'room':         { arr: () => typeof dynamicRooms === 'undefined' ? null : dynamicRooms,        ls: 'dyn_rooms',        src: () => recNames(() => roomsCapacity, r => r && r.number) },
    'visitor-type': { arr: () => typeof dynamicVisitorTypes === 'undefined' ? null : dynamicVisitorTypes, ls: 'dyn_visitor_types', src: () => recNames(() => hospitalities, h => h && h.type) },
    'ctr-sector':   { arr: () => typeof contractorSectors === 'undefined' ? null : contractorSectors, ls: 'ctr_sectors',   src: () => [] }
  };
  function recNames(getArr, pick) {
    const out = [];
    try {
      const a = getArr();
      if (Array.isArray(a)) a.forEach(x => { const n = x ? pick(x) : null; if (n != null && String(n).trim()) out.push(String(n).trim()); });
    } catch (e) {}
    return out;
  }

  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .normalize('NFC')
      .replace(/[ة]/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/[ى]/g, 'ي')
      .toLowerCase().replace(/\s+/g, '').trim();
  }

  let manual = {};
  try { manual = JSON.parse(localStorage.getItem(MANUAL_KEY) || '{}') || {}; } catch (e) { manual = {}; }
  let kills = {};
  try { kills = JSON.parse(localStorage.getItem(KILLS_KEY) || '{}') || {}; } catch (e) { kills = {}; }

  const _saveManual = () => { try { localStorage.setItem(MANUAL_KEY, JSON.stringify(manual)); } catch (e) {} };
  const _saveKills = () => { try { localStorage.setItem(KILLS_KEY, JSON.stringify(kills)); } catch (e) {} };

  function _isKilled(type, name) { const n = _norm(name); return !!(n && kills[type] && kills[type][n]); }
  function _addKill(type, name) {
    const n = _norm(name);
    if (!n || n.length < 2) return false;
    if (!kills[type]) kills[type] = {};
    if (kills[type][n]) return false;
    kills[type][n] = new Date().toISOString();
    _saveKills();
    return true;
  }
  function _removeKill(type, name) {
    const n = _norm(name);
    if (kills[type] && kills[type][n]) { delete kills[type][n]; _saveKills(); return true; }
    return false;
  }
  function _markManual(type, name) {
    const v = String(name || '').trim();
    if (!v) return;
    if (!manual[type]) manual[type] = [];
    if (!manual[type].some(x => _norm(x) === _norm(v))) { manual[type].push(v); _saveManual(); }
  }

  // ---- الإقلاع: تبنّي الأسماء الموجودة حالياً حتى لا يختفي شيء اليوم ----
  function adoptOnce() {
    if (localStorage.getItem(SEED_FLAG)) return;
    Object.keys(TYPES).forEach(t => {
      const arr = TYPES[t].arr();
      if (Array.isArray(arr)) arr.forEach(n => { if (typeof n === 'string') _markManual(t, n); });
    });
    try { localStorage.setItem(SEED_FLAG, new Date().toISOString()); } catch (e) {}
  }

  // ---- وراثة قوائم المنع القديمة (حذف سابق = يبقى محذوفاً) ----
  function seedKillsOnce() {
    let dels = [];
    try { const d0 = JSON.parse(localStorage.getItem('lineh_sync_deletions') || '[]'); if (Array.isArray(d0)) dels = d0.slice(); } catch (e) {}
    try { if (typeof syncDeletions !== 'undefined' && Array.isArray(syncDeletions)) dels = dels.concat(syncDeletions); } catch (e) {}
    const ENT = { dynamicDepts: 'dept', dynamicSeptics: 'septic', dynamicTitles: 'title', dynamicVisitorTypes: 'visitor-type', dynamicSectors: 'sector', dynamicRooms: 'room', contractorSectors: 'ctr-sector' };
    dels.forEach(d => {
      if (!d || d.key == null || !ENT[d.entity]) return;
      const t = ENT[d.entity];
      const arr = TYPES[t].arr();
      if (arr) {
        const n = _norm(String(d.key));
        for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === n) return; } // موجود حالياً = مستخدم فعلياً
      }
      _addKill(t, String(d.key));
    });
    // من ملف الحماية القديم للمباني/الغرف/البيارات
    try {
      const hd = JSON.parse(localStorage.getItem('lineh_hard_deletes') || '{}') || {};
      const KIND = { sectors: 'sector', rooms: 'room', septics: 'septic' };
      Object.keys(KIND).forEach(k => {
        if (!hd[k] || typeof hd[k] !== 'object') return;
        Object.keys(hd[k]).forEach(n => {
          const arr = TYPES[KIND[k]].arr();
          if (arr) { for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === n) return; } }
          if (!kills[KIND[k]]) kills[KIND[k]] = {};
          if (!kills[KIND[k]][n]) { kills[KIND[k]][n] = hd[k][n] || new Date().toISOString(); }
        });
      });
      _saveKills();
    } catch (e) {}
  }

  // ---- الحساب اللحظي لكل قائمة: مصادر + يدوي − محذوف ----
  let syncing = false;
  function syncDerived(withUI) {
    if (syncing) return;
    syncing = true;
    let changedAny = false;
    Object.keys(TYPES).forEach(t => {
      const cfg = TYPES[t];
      const arr = cfg.arr();
      if (!Array.isArray(arr)) return;
      const seen = {};
      const desired = [];
      const push = name => {
        if (typeof name !== 'string') return;
        const k = _norm(name);
        if (!k || k.length < 2 || seen[k] || _isKilled(t, name)) return;
        seen[k] = true;
        desired.push(name);
      };
      cfg.src().forEach(push);
      (manual[t] || []).forEach(push);
      const curKey = arr.map(_norm).join('\u0001');
      const wantKey = desired.map(_norm).join('\u0001');
      if (curKey !== wantKey) {
        arr.splice(0, arr.length);
        desired.forEach(n => arr.push(n));
        try { localStorage.setItem(cfg.ls, JSON.stringify(desired)); } catch (e) {}
        changedAny = true;
      }
    });
    syncing = false;
    if (changedAny && withUI) refreshUI();
    return changedAny;
  }

  let refreshing = false;
  let refreshTimer = null;
  function refreshUI() {
    if (refreshing) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refreshing = true;
      try { if (typeof renderDynamicLists === 'function') window.renderDynamicLists(); } catch (e) {}
      refreshing = false;
    }, 250);
  }
  function run(withUI) {
    try {
      if (syncDerived(false) && typeof syncStorage === 'function') { try { syncStorage(); } catch (e) {} }
    } catch (e) {}
    if (withUI) refreshUI();
  }

  // ---- التقاط الحذف: تسجيل مسبق + تراجع عند الإلغاء ----
  const _origDel = window.deleteDynamicItem;
  if (typeof _origDel === 'function') {
    window.deleteDynamicItem = function (listId, idx) {
      let item = null;
      const t = TYPES[listId] ? listId : null;
      if (t) {
        const src = TYPES[t].arr();
        if (Array.isArray(src) && src[idx] != null) item = typeof src[idx] === 'string' ? src[idx] : ((src[idx] && (src[idx].name || src[idx].label)) || null);
      }
      if (t && item != null) _addKill(t, item); // مسبقاً حتى لا يعاده شيء أثناء التنفيذ
      const r = _origDel.apply(this, arguments);
      if (t && item != null) {
        const arr = TYPES[t].arr();
        let still = false;
        if (Array.isArray(arr)) {
          const ni = _norm(item);
          for (let i = 0; i < arr.length; i++) { if (_norm(arr[i]) === ni) { still = true; break; } }
        }
        if (still) { _removeKill(t, item); run(true); } // ألغى المستخدم التأكيد
        else run(true);
      }
      return r;
    };
  }

  // ---- الإضافة من الخانات = تعليم الاسم يدوياً (قبل مسح الخانة) ----
  const ADD_MAP = [
    { btn: 'btn-dept', input: 'new-dept', type: 'dept' },
    { btn: 'btn-title', input: 'new-title', type: 'title' },
    { btn: 'btn-septic', input: 'new-septic', type: 'septic' },
    { btn: 'btn-sector', input: 'new-sector', type: 'sector' },
    { btn: 'btn-room', input: 'new-room', type: 'room' },
    { btn: 'btn-visitor-type', input: 'new-visitor-type', type: 'visitor-type' },
    { btn: 'btn-ctr-sector', input: 'new-ctr-sector', type: 'ctr-sector' }
  ];
  document.addEventListener('click', ev => {
    const t = ev.target;
    if (!t || !t.closest) return;
    ADD_MAP.forEach(m => {
      if (!t.closest('#' + m.btn)) return;
      const inp = document.getElementById(m.input);
      const val = inp ? String(inp.value || '').trim() : '';
      if (!val) return;
      _markManual(m.type, val);
      if (_removeKill(m.type, val)) run(false);
    });
  }, true);

  // ---- بعد السحب والدفع وإعادة البناء والرسم (النداءات الخارجية) ----
  ['autoDiscoverDynamicData', 'rebuildAllDropdowns'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig === 'function') {
      window[fn] = function () { syncDerived(false); const r = orig.apply(this, arguments); run(true); return r; };
    }
  });
  ['pullFromSupabase', 'pushToSupabase', 'syncStorage'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig === 'function') {
      window[fn] = function () {
        let res;
        try { res = orig.apply(this, arguments); } catch (e) { run(false); throw e; }
        if (res && typeof res.then === 'function') return res.then(v => { run(true); return v; });
        run(true);
        return res;
      };
    }
  });

  window.addEventListener('storage', () => { run(false); });

  // ---- الإقلاع + نبضة كل ثانية تضمن عدم ثبات أي اسم مخترع ----
  function boot() {
    try { adoptOnce(); } catch (e) {}
    try { seedKillsOnce(); } catch (e) {}
    run(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', () => { try { run(false); setTimeout(() => run(false), 3000); } catch (e) {} });
  setInterval(() => { try { run(false); } catch (e) {} }, 1000);

  // ---- أدوات الكونسول ----
  window.flexAllowAgain = (type, name) => { if (_removeKill(type, name)) run(true); };
  window.flexDeleteForever = (type, name) => { if (_addKill(type, name)) run(true); };
  window.flexSources = () => {
    const o = {};
    Object.keys(TYPES).forEach(t => { o[t] = { sources: TYPES[t].src(), manual: manual[t] || [] }; });
    return o;
  };
})();
