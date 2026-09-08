// ====== Supabase Free Plan Quota Meter (Egress عبر كل الأجهزة) ======
// النسبة الأساسية = الصادر Egress الذي ينزّله النظام من السحابة (يُحسب لكل جهاز محلياً)
// ثم يجمع كل جهاز عدّاده في صف سحابي واحد (ent:egressMeters) بحيث يرى أي جهاز
// المجموع الكلي من كل الأجهزة. ودورة الفاتورة تُحسب من يوم التجديد (الافتراضي 9).

const _qEGRESS_MAX = 5 * 1024 * 1024 * 1024;
const _qSTORAGE_MAX = 500 * 1024 * 1024;
const _qROW_ID = 'ent:egressMeters';
const _qSB_URL = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://cwqghiqykohefaggedjl.supabase.co';
const _qSB_KEY = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
let _qCloudTotal = -1;

function _qToday() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function _qCycleDay() {
  let d = parseInt(localStorage.getItem('linah_quota_cycle_day'), 10);
  if (!d || d < 1) d = 9;
  return Math.min(d, 28);
}
function _qCycleStart() {
  const day = _qCycleDay(), today = _qToday();
  let start = new Date(today.getFullYear(), today.getMonth(), day);
  if (start.getTime() > today.getTime()) start = new Date(today.getFullYear(), today.getMonth() - 1, day);
  return start;
}
function _qNextRenewal() {
  const day = _qCycleDay(), today = _qToday();
  let n = new Date(today.getFullYear(), today.getMonth(), day);
  if (n.getTime() <= today.getTime()) n = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return n;
}
function _qDeviceId() {
  try {
    let id = localStorage.getItem('lineh_device_id');
    if (!id) { id = 'd' + Date.now() + Math.random().toString(36).slice(2, 9); localStorage.setItem('lineh_device_id', id); }
    return id;
  } catch (e) { return 'd' + Date.now(); }
}
function _qEgressRec() {
  const cycle = _qCycleStart().getTime();
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem('linah_egress_meter') || 'null'); } catch (e) {}
  if (!rec || rec.cycle !== cycle) rec = { cycle: cycle, bytes: 0 };
  return rec;
}
function _qAddEgress(bytes) {
  const rec = _qEgressRec();
  rec.bytes += bytes;
  try { localStorage.setItem('linah_egress_meter', JSON.stringify(rec)); } catch (e) {}
  return rec.bytes;
}

// عدّاد صادر حقيقي: يلتف على fetch ويحصي كل نزول GET من السحابة في هذا المتصفح
(function () {
  const orig = window.fetch;
  if (typeof orig !== 'function') return;
  window.fetch = function () {
    const input = arguments[0], init = arguments[1];
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = (init && init.method) || (input && input.method) || 'GET';
    if (url.indexOf('cwqghiqykohefaggedjl.supabase.co') !== -1 && method === 'GET') {
      return orig.apply(this, arguments).then(function (res) {
        try {
          if (res && res.ok && res.clone) {
            res.clone().arrayBuffer().then(function (buf) { _qAddEgress(buf.byteLength); }, function () {});
          }
        } catch (e) {}
        return res;
      });
    }
    return orig.apply(this, arguments);
  };
})();

function _qSyncHeaders() { return { apikey: _qSB_KEY, Authorization: 'Bearer ' + _qSB_KEY }; }

// يرحّب عدّاد هذا الجهاز في السحابة ويُلغي دورات قديمة ثم يعيد مجموع كل الأجهزة
function _qCloudSync() {
  const me = _qDeviceId(), cyc = _qCycleStart().getTime();
  const myBytes = _qEgressRec().bytes;
  return fetch(_qSB_URL + '/rest/v1/sync_data?id=eq.' + encodeURIComponent(_qROW_ID) + '&select=data', { headers: _qSyncHeaders() })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      let data = (rows && rows.length && rows[0] && rows[0].data) || {};
      data = data || {};
      const keep = {};
      for (const k in data) {
        if (!data[k] || data[k].c !== cyc || typeof data[k].b !== 'number') continue;
        if (!data[k].u || Date.now() - data[k].u > 40 * 24 * 3600 * 1000) continue;
        keep[k] = { c: cyc, b: data[k].b, u: data[k].u };
      }
      keep[me] = { c: cyc, b: myBytes, u: Date.now() };
      let total = 0;
      for (const k2 in keep) total += keep[k2].b;
      const body = { id: _qROW_ID, data: JSON.parse(JSON.stringify(keep)), updated_at: new Date().toISOString() };
      const h = _qSyncHeaders(); h['Content-Type'] = 'application/json'; h['Prefer'] = 'resolution=merge-duplicates';
      return fetch(_qSB_URL + '/rest/v1/sync_data', { method: 'POST', headers: h, body: JSON.stringify(body) })
        .then(function () { return total; })
        .catch(function () { return total; });
    })
    .catch(function () { return null; });
}

// مجموع سحابي آخر معروف (لوقت عدم الاتصال)
function _qCloudCachedTotal(cyc) {
  try {
    const c = JSON.parse(localStorage.getItem('linah_egress_cloud_total') || 'null');
    if (c && c.cycle === cyc) return c.bytes;
  } catch (e) {}
  return -1;
}

// حجم التخزين في السحابة (مرة في اليوم فقط حتى لا يحرق الكوتة بنفسه)
function _qStorageBytes(cb) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const c = JSON.parse(localStorage.getItem('linah_quota_storage') || 'null');
    if (c && c.day === day) { cb(c.bytes); return; }
  } catch (e) {}
  fetch(_qSB_URL + '/rest/v1/sync_data?select=data&limit=1000', { headers: _qSyncHeaders() })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      let bytes = 0;
      if (Array.isArray(rows)) {
        rows.forEach(function (row) {
          const d = row && row.data;
          if (d !== null && d !== undefined) bytes += (JSON.stringify(d) || '').length * 2;
        });
      }
      if (bytes > 0) { try { localStorage.setItem('linah_quota_storage', JSON.stringify({ day: day, bytes: bytes })); } catch (e) {} }
      cb(bytes);
    })
    .catch(function () { cb(-1); });
}

function _qPaint(el, egress, storageBytes) {
  const ePct = (egress / _qEGRESS_MAX) * 100;
  const sPct = storageBytes >= 0 ? (storageBytes / _qSTORAGE_MAX) * 100 : -1;
  const daysLeft = Math.max(0, Math.round((_qNextRenewal().getTime() - new Date().getTime()) / 86400000));
  const eTxt = ePct > 0 && ePct < 0.01 ? '<0.01' : ePct.toFixed(2);
  const sTxt = sPct >= 0 ? (sPct > 0 && sPct < 0.01 ? '<0.01' : sPct.toFixed(2)) : '?';
  el.textContent = '☁️ صادر ' + eTxt + '% · تخزين ' + sTxt + '% · فاضل ' + daysLeft + ' يوم';
  el.title = 'صادر (Egress) من كل الأجهزة: ' + (egress / 1048576).toFixed(2) + ' MB من 5GB شهريًا (يُحسب من الآن).\n' +
    (storageBytes >= 0 ? 'تخزين السحابة (مقاس فعلي): ' + (storageBytes / 1048576).toFixed(2) + ' MB من 500MB.\n' : 'تعذر قياس التخزين.\n') +
    'يوم التجديد (تقديري): ' + _qCycleDay() + ' — اضغط لتغييره لو عارفه.\n' +
    '⚡ مهم: المشروع خُطط لإيقافه مؤقتًا بسبب قلة النشاط (إيميل 4 سبتمبر). افتح النظام كل ~5 أيام عشان يفضل شغال، أو ارتقِ لـ Pro من لوحة Supabase.';
  const bg = ePct >= 90 ? '#ffebee' : ePct >= 70 ? '#fff8e1' : '#e8f5e9';
  const fg = ePct >= 90 ? '#c62828' : ePct >= 70 ? '#e65100' : '#1b5e20';
  const bd = ePct >= 90 ? '#ef9a9a' : ePct >= 70 ? '#ffe082' : '#a5d6a7';
  el.style.background = bg; el.style.color = fg; el.style.borderColor = bd;
}

function _qLastRefresh() {
  try { return localStorage.getItem('linah_quota_lastrefresh') || ''; } catch (e) { return ''; }
}

function updateQuotaMeter() {
  const el = document.getElementById('quota-meter');
  if (!el) return;
  if (!navigator.onLine) { el.textContent = '☁️ غير متصل'; el.title = 'لا يوجد اتصال — اضغط للتحديث'; return; }
  const cyc = _qCycleStart().getTime();
  const today = new Date().toISOString().slice(0, 10);
  const cachedTotal = _qCloudCachedTotal(cyc);
  if (_qLastRefresh() === today && cachedTotal >= 0) {
    _qStorageBytes(function (storageBytes) { _qPaint(el, cachedTotal, storageBytes); });
    return;
  }
  el.textContent = '☁️ جارٍ…';
  _qStorageBytes(function (storageBytes) {
    _qCloudSync().then(function (total) {
      let final = total;
      if (final === null) {
        final = _qCloudCachedTotal(cyc);
        if (final < 0) final = _qEgressRec().bytes;
      } else {
        try { localStorage.setItem('linah_egress_cloud_total', JSON.stringify({ cycle: cyc, bytes: final })); } catch (e) {}
        try { localStorage.setItem('linah_quota_lastrefresh', today); } catch (e) {}
      }
      _qCloudTotal = final;
      _qPaint(el, final, storageBytes);
    });
  });
}

function quotaClick() {
  const cur = _qCycleDay();
  const val = prompt('يوم تجديد كوتة Supabase في الشهر؟ (1-28)\n(يظهر في لوحة Supabase > Usage — اختبرنا أنه يوم 9)', cur);
  if (val === null) { updateQuotaMeter(); return; }
  const d = parseInt(val, 10);
  if (!d || d < 1 || d > 28) { alert('اكتب رقم من 1 إلى 28'); return; }
  try { localStorage.setItem('linah_quota_cycle_day', String(d)); } catch (e) {}
  updateQuotaMeter();
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(updateQuotaMeter, 1500);
  setInterval(function () { if (document.visibilityState === 'visible') updateQuotaMeter(); }, 24 * 60 * 60 * 1000);
});