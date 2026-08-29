// ============================================================
//  زر حذف غرفة واحدة من تبويب السكن:
//  - زر ✕ أحمر في بطاقة كل غرفة يحذف الغرفة نهائياً بعد تأكيد.
//  - المقيمون فيها يُفك ارتباطهم من السكن فقط (بدون حذفهم من القوة)
//    وإلا أعادتهم rebuildRoomsFromEmployees من تعييناتهم.
//  - تسجيل الحذف بمفاتيح النظام الصحيحة (roomsCapacity بمفتاح
//    مبنى|غرفة و dynamicRooms بالاسم) فلا تظهر الغرفة بعد التحميل
//    ولا بعد السحب/الدفع، ولا يظهر اسمها في تبويب الإدارة المرنة.
//  - قائمة حذف دائمة محلية بمفتاح مبنى|غرفة (مطابقة مُطبَّعة) تمنع
//    أي رجوع، وتُلغى تلقائياً عند إعادة إضافة نفس الغرفة عمداً من
//    نموذج "إضافة / تعديل غرفة وسعتها" أو عبر allowRoomAgain().
// ============================================================
(function () {
  let STORE_KEY = 'lineh_room_hard_deletes';

  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }
  function _pairKey(sector, number) { return _norm(sector) + '|' + _norm(number); }
  function _load() {
    try { const v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; }
  }
  function _save(kill) { try { localStorage.setItem(STORE_KEY, JSON.stringify(kill)); } catch (e) {} }
  function _addKill(sector, number) {
    const kill = _load();
    const k = _pairKey(sector, number);
    if (!kill[k]) { kill[k] = new Date().toISOString(); _save(kill); }
  }
  function _clearKill(sector, number) {
    const kill = _load();
    const k = _pairKey(sector, number);
    if (kill[k]) { delete kill[k]; _save(kill); return true; }
    return false;
  }
  function _isKilled(sector, number) { return !!_load()[_pairKey(sector, number)]; }

  // ---- تنفيذ الحذف ----
  function deleteSingleRoom(sector, number) {
    if (!requireAdmin()) return;
    // مطابقة مُطبَّعة: قد يكون الرقم مخزناً كرقم لا نص أو باختلاف مسافات،
    // والمطابقة الحرفية تفشل فتظهر رسالة "لم يتم العثور على الغرفة"
    const NS = _norm(sector), NN = _norm(number);
    const matches = (roomsCapacity || []).filter(function (r) { return r && _norm(r.sector) === NS && _norm(r.number) === NN; });
    if (!matches.length) return alert('لم يتم العثور على الغرفة.');
    const rec = matches[0];
    const cSector = String(rec.sector), cNumber = String(rec.number);
    const isMatch = function (v1, v2) { return _norm(v1) === NS && _norm(v2) === NN; };
    const residents = (employees || []).filter(function (e) { return e && isMatch(e.sector, e.room); });
    let msg = 'هل أنت متأكد من حذف الغرفة "' + cNumber + '" من مبنى "' + cSector + '" نهائياً؟';
    if (residents.length) msg += '\n\nالغرفة بها ' + residents.length + ' مقيم — سيتم فك ارتباطهم بهذه الغرفة والمبنى (بدون حذفهم من القوة).';
    if (matches.length > 1) msg += '\nملاحظة: توجد ' + matches.length + ' سجلات مكررة لهذه الغرفة وسيتم حذفها كلها.';
    msg += '\nلن تعود الغرفة بعد التحديث أو المزامنة وسيختفي اسمها من الإدارة المرنة.';
    if (!confirm(msg)) return;

    try {
      if (typeof _logDeletion === 'function') {
        _logDeletion('roomsCapacity', cSector + '|' + cNumber);
        _logDeletion('dynamicRooms', cNumber);
      }
    } catch (e) {}
    _addKill(cSector, cNumber);

    roomsCapacity = roomsCapacity.filter(function (r) { return !(r && isMatch(r.sector, r.number)); });
    residents.forEach(function (e) { e.sector = ''; e.room = ''; });
    try {
      if (Array.isArray(dynamicRooms)) dynamicRooms = dynamicRooms.filter(function (x) { return _norm(x) !== NN; });
    } catch (e) {}

    syncStorage();
    renderHousingLayout();
    updateHousingStats();
    try { rebuildAllDropdowns(); } catch (e) {}
    alert('تم حذف الغرفة "' + cNumber + '" بنجاح' + (residents.length ? ' وفك ارتباط ' + residents.length + ' مقيم.' : '.'));
  }

  // ---- حقن زر الحذف في بطاقة كل غرفة بعد كل رسم ----
  function _inject() {
    const layout = document.getElementById('housing-layout');
    if (!layout) return;
    layout.querySelectorAll('.room-card').forEach(function (card) {
      if (card.querySelector('.rd-del-room')) return;
      const header = card.querySelector('.room-header');
      const numEl = card.querySelector('.room-number-edit');
      const block = card.closest('.sector-block');
      if (!header || !numEl || !block) return;
      const titleEl = block.querySelector('.sector-title');
      if (!titleEl) return;
      const sector = (titleEl.textContent || '').replace(/^\s*المبنى:\s*/, '').trim();
      const number = (numEl.textContent || '').trim();
      if (!sector || !number) return;
      const btn = document.createElement('button');
      btn.className = 'rd-del-room';
      btn.type = 'button';
      btn.setAttribute('data-sector', sector);
      btn.setAttribute('data-number', number);
      btn.title = 'حذف هذه الغرفة نهائياً';
      btn.textContent = '✕';
      btn.style.cssText = 'background:#ffebee;color:#c62828;border:1px solid #ef9a9a;border-radius:50%;width:22px;height:22px;line-height:1;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;padding:0;margin-right:6px;';
      btn.onmouseenter = function () { btn.style.background = '#c62828'; btn.style.color = '#fff'; };
      btn.onmouseleave = function () { btn.style.background = '#ffebee'; btn.style.color = '#c62828'; };
      header.appendChild(btn);
    });
  }
  const _origRender = window.renderHousingLayout;
  if (typeof _origRender === 'function') {
    window.renderHousingLayout = function () {
      const r = _origRender.apply(this, arguments);
      try { _inject(); } catch (e) {}
      return r;
    };
  }

  document.addEventListener('click', function (ev) {
    const t = ev.target;
    const btn = (t && t.closest) ? t.closest('.rd-del-room') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    deleteSingleRoom(btn.getAttribute('data-sector'), btn.getAttribute('data-number'));
  }, true);

  // ---- مرشح دائم: يطرد الغرفة المحذوفة بعد السحب/الاكتشاف/دورياً ----
  function prune() {
    let changed = false;
    try {
      if (Array.isArray(roomsCapacity)) {
        const f = roomsCapacity.filter(function (r) { return !(r && _isKilled(r.sector, r.number)); });
        if (f.length !== roomsCapacity.length) { roomsCapacity = f; changed = true; }
      }
    } catch (e) {}
    return changed;
  }

  // ---- إعادة الإضافة المتعمدة تُلغي الحذف ----
  const _origSave = window.saveRoomCapacity;
  if (typeof _origSave === 'function') {
    window.saveRoomCapacity = function () {
      let pending = null;
      try {
        const sector = (document.getElementById('form-room-sector') || {}).value || '';
        const existing = (document.getElementById('form-room-number') || {}).value || '';
        const added = (document.getElementById('form-room-new') || {}).value || '';
        const number = (added || existing || '').trim();
        if (sector && number) pending = [sector, number];
      } catch (e) {}
      const res = _origSave.apply(this, arguments);
      if (pending) {
        try {
          if (_clearKill(pending[0], pending[1])) {
            if (typeof _removeDeletion === 'function') {
              _removeDeletion('roomsCapacity', pending[0] + '|' + pending[1]);
              _removeDeletion('dynamicRooms', pending[1]);
            }
            if (typeof syncStorage === 'function') syncStorage();
          }
        } catch (e) {}
      }
      return res;
    };
  }

  function refreshUI() {
    try { if (typeof renderHousingLayout === 'function') renderHousingLayout(); } catch (e) {}
    try { if (typeof updateHousingStats === 'function') updateHousingStats(); } catch (e) {}
  }

  // ---- إصلاح: إعادة البناء من العاملين لا تعيد الغرف المحذوفة نهائياً ----
  // rebuildRoomsFromEmployees() يعيد إنشاء roomsCapacity بالكامل من تعيينات
  // العاملين، فيتجاوز قائمة الحذف ويعيد الغرفة المشغولة التي حُذفت. هنا نغلفها
  // لطرد أي غرفة في قائمة الحذف الدائم وفك ارتباط سكانها بعد كل إعادة بناء.
  function _rebuildCleanup() {
    try {
      const kill = _load();
      const keys = Object.keys(kill);
      if (!keys.length) return;
      keys.forEach(function (k) {
        const sep = k.indexOf('|');
        if (sep < 0) return;
        const ns = k.slice(0, sep), nn = k.slice(sep + 1);
        if (Array.isArray(employees)) {
          employees.forEach(function (e) {
            if (e && _norm(e.sector) === ns && _norm(e.room) === nn) { e.sector = ''; e.room = ''; }
          });
        }
      });
      if (Array.isArray(roomsCapacity)) {
        roomsCapacity = roomsCapacity.filter(function (r) { return !(r && _isKilled(r.sector, r.number)); });
        dynamicSectors = dynamicSectors.filter(function (s) { return roomsCapacity.some(function (r) { return r.sector === s; }); });
      }
    } catch (e) {}
  }
  const _origRebuild = window.rebuildRoomsFromEmployees;
  if (typeof _origRebuild === 'function') {
    window.rebuildRoomsFromEmployees = function () {
      const n = _origRebuild.apply(this, arguments);
      try { _rebuildCleanup(); } catch (e) {}
      return n;
    };
  }

  const _origPull = window.pullFromSupabase;
  if (typeof _origPull === 'function') {
    window.pullFromSupabase = function () {
      const res = _origPull.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (v) { try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {} return v; });
      }
      try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {}
      return res;
    };
  }
  const _origPush = window.pushToSupabase;
  if (typeof _origPush === 'function') {
    window.pushToSupabase = function () {
      const res = _origPush.apply(this, arguments);
      if (res && typeof res.then === 'function') {
        return res.then(function (v) { try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {} return v; });
      }
      try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {}
      return res;
    };
  }

  function boot() {
    try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {}
    try { _inject(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { try { boot(); setTimeout(boot, 3000); } catch (e) {} });
  setInterval(function () { try { if (prune()) { syncStorage(); refreshUI(); } } catch (e) {} }, 20000);

  window.deleteSingleRoom = deleteSingleRoom;
  window.allowRoomAgain = function (sector, number) { return _clearKill(sector, number); };
})();
