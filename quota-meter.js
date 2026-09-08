// ====== Supabase Free Plan Quota Meter (Egress + Renewal Days) ======
// النسبة الأساسية = الصادر Egress (5GB شهرياً — هو اللي وصل 100% فعلّياً)
// تُحسب من البايتات التي ينزّلها هذا الجهاز فعلياً من السحابة وتُحفظ محلياً
// وتترجم تلقائياً أول يوم من دورة الفاتورة (يوم التجديد).

var _qEGRESS_MAX = 5 * 1024 * 1024 * 1024;
var _qSTORAGE_MAX = 500 * 1024 * 1024;
var _qSB_URL = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://cwqghiqykohefaggedjl.supabase.co';
var _qSB_KEY = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';

function _qToday() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function _qCycleDay() {
  var d = parseInt(localStorage.getItem('linah_quota_cycle_day'), 10);
  if (!d || d < 1) d = 9;
  return Math.min(d, 28);
}
function _qCycleStart() {
  var day = _qCycleDay(), today = _qToday();
  var start = new Date(today.getFullYear(), today.getMonth(), day);
  if (start.getTime() > today.getTime()) start = new Date(today.getFullYear(), today.getMonth() - 1, day);
  return start;
}
function _qNextRenewal() {
  var day = _qCycleDay(), today = _qToday();
  var n = new Date(today.getFullYear(), today.getMonth(), day);
  if (n.getTime() <= today.getTime()) n = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return n;
}
function _qEgressRec() {
  var cycle = _qCycleStart().getTime(), rec = null;
  try { rec = JSON.parse(localStorage.getItem('linah_egress_meter') || 'null'); } catch (e) {}
  if (!rec || rec.cycle !== cycle) rec = { cycle: cycle, bytes: 0 };
  return rec;
}
function _qAddEgress(bytes) {
  var rec = _qEgressRec();
  rec.bytes += bytes;
  try { localStorage.setItem('linah_egress_meter', JSON.stringify(rec)); } catch (e) {}
  return rec.bytes;
}

// عدّاد صادر حقيقي: يلتف على fetch ويحصي كل نزول GET من السحابة في هذا المتصفح
(function () {
  var orig = window.fetch;
  if (typeof orig !== 'function') return;
  window.fetch = function () {
    var input = arguments[0], init = arguments[1];
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = (init && init.method) || (input && input.method) || 'GET';
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

// حجم التخزين في السحابة (لكي/كيله مرة في اليوم فقط حتى لا يحرق الكوتة بنفسه)
function _qStorageBytes(cb) {
  var day = new Date().toISOString().slice(0, 10);
  try {
    var c = JSON.parse(localStorage.getItem('linah_quota_storage') || 'null');
    if (c && c.day === day) { cb(c.bytes); return; }
  } catch (e) {}
  fetch(_qSB_URL + '/rest/v1/sync_data?select=data&limit=1000', { headers: { apikey: _qSB_KEY, Authorization: 'Bearer ' + _qSB_KEY } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      var bytes = 0;
      if (Array.isArray(rows)) {
        rows.forEach(function (row) {
          var d = row && row.data;
          if (d !== null && d !== undefined) bytes += (JSON.stringify(d) || '').length * 2;
        });
      }
      if (bytes > 0) { try { localStorage.setItem('linah_quota_storage', JSON.stringify({ day: day, bytes: bytes })); } catch (e) {} }
      cb(bytes);
    })
    .catch(function () { cb(-1); });
}

function updateQuotaMeter() {
  var el = document.getElementById('quota-meter');
  if (!el) return;
  if (!navigator.onLine) { el.textContent = '☁️ غير متصل'; el.title = 'لا يوجد اتصال — اضغط للتحديث'; return; }
  el.textContent = '☁️ جارٍ…';
  var rec = _qEgressRec();
  _qStorageBytes(function (storageBytes) {
    var egress = rec.bytes;
    var ePct = (egress / _qEGRESS_MAX) * 100;
    var sPct = storageBytes >= 0 ? (storageBytes / _qSTORAGE_MAX) * 100 : -1;
    var daysLeft = Math.max(0, Math.round((_qNextRenewal().getTime() - new Date().getTime()) / 86400000));
    var eTxt = ePct > 0 && ePct < 0.01 ? '<0.01' : ePct.toFixed(2);
    var sTxt = sPct >= 0 ? (sPct > 0 && sPct < 0.01 ? '<0.01' : sPct.toFixed(2)) : '?';
    el.textContent = '☁️ صادر ' + eTxt + '% · تخزين ' + sTxt + '% · فاضل ' + daysLeft + ' يوم';
    el.title = 'صادر (Egress) من هذا الجهاز: ' + (egress / 1048576).toFixed(2) + ' MB من 5GB شهريًا (تقريبي، يُحسب من الآن).\n' +
      (storageBytes >= 0 ? 'تخزين السحابة (مقاس فعلي): ' + (storageBytes / 1048576).toFixed(2) + ' MB من 500MB.\n' : 'تعذر قياس التخزين.\n') +
      'يوم التجديد: ' + _qCycleDay() + ' (افتراضي من تاريخ إنشاء المشروع) — لو غير دقيق اضغط واذكر اليوم.\n' +
      '📌 أنا مش بقرا الأرقام الرسمية لـ Supabase (استهلاك الشهر الماضي وتاريخ التجديد الصحيح) إلا من لوحة التحكم بتاعهم — أول ما تقدر افتح supabase.com > Dashboard > Usage واقصلي الحالة.';
    var bg = ePct >= 90 ? '#ffebee' : ePct >= 70 ? '#fff8e1' : '#e8f5e9';
    var fg = ePct >= 90 ? '#c62828' : ePct >= 70 ? '#e65100' : '#1b5e20';
    var bd = ePct >= 90 ? '#ef9a9a' : ePct >= 70 ? '#ffe082' : '#a5d6a7';
    el.style.background = bg; el.style.color = fg; el.style.borderColor = bd;
  });
}

function quotaClick() {
  var cur = _qCycleDay();
  var val = prompt('يوم تجديد كوتة Supabase في الشهر؟ (1-28)\n(يظهر في لوحة Supabase > Usage، أو في إيميل إشعار الكوتة — اختبرنا أنه يوم 9)', cur);
  if (val === null) { updateQuotaMeter(); return; }
  var d = parseInt(val, 10);
  if (!d || d < 1 || d > 28) { alert('اكتب رقم من 1 إلى 28'); return; }
  try { localStorage.setItem('linah_quota_cycle_day', String(d)); } catch (e) {}
  updateQuotaMeter();
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(updateQuotaMeter, 1500);
  setInterval(function () { if (document.visibilityState === 'visible') updateQuotaMeter(); }, 30 * 60 * 1000);
});