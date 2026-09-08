// ====== Supabase Free Plan Quota Meter ======
// يقيس حجم بيانات sync_data في السحابة ويعرض نسبة الاستهلاك من حد 500MB المجاني.

const QUOTA_FREE_BYTES = 500 * 1024 * 1024;
const _qSB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
const _qSB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyMDQ0NjgsImV4cCI6MjA1NDc4MDQ2OH0.5mH2Za1AscfPb3G7g3vMe2Zz2cMSI4xyMJpBkuVVDno';

function _qSizeOf(value) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch (e) {
    return String(value || '').length;
  }
}

function updateQuotaMeter() {
  const el = document.getElementById('quota-meter');
  if (!el) return;
  if (!navigator.onLine) { el.textContent = '☁️ غير متصل'; el.title = 'لا يوجد اتصال بالإنترنت لعرض نصيب الاستهلاك'; return; }

  el.textContent = '☁️ جارٍ الحساب…';
  const headers = { apikey: _qSB_KEY, Authorization: 'Bearer ' + _qSB_KEY };
  const fetchRows = function(table) {
    return fetch(_qSB_URL + '/rest/v1/' + table + '?select=data&limit=1000', { headers: headers })
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function() { return null; });
  };

  Promise.all([fetchRows('sync_data'), fetchRows('employee_photos')])
    .then(function(res) {
      let bytes = 0;
      res.forEach(function(list) {
        if (!Array.isArray(list)) return;
        list.forEach(function(row) { bytes += _qSizeOf(row.data); });
      });
      if (!bytes && res[0] === null && res[1] === null) {
        el.textContent = '☁️ ؟%';
        el.title = 'تعذر قراءة السحابة — افحص الاتصال واضغط للتحديث';
        return;
      }
      const pct = (bytes / QUOTA_FREE_BYTES) * 100;
      const shown = pct < 0.01 ? (bytes > 0 ? '<0.01' : '0') : pct.toFixed(2);
      el.textContent = '☁️ ' + shown + '%';
      el.title = 'استهلاك مجانية Supabase: ' + (bytes / 1024 / 1024).toFixed(2) + ' MB من 500 MB — اضغط للتحديث';
      el.style.background = pct >= 90 ? '#ffebee' : pct >= 70 ? '#fff8e1' : '#e8f5e9';
      el.style.color = pct >= 90 ? '#c62828' : pct >= 70 ? '#e65100' : '#1b5e20';
      el.style.borderColor = pct >= 90 ? '#ef9a9a' : pct >= 70 ? '#ffe082' : '#a5d6a7';
    });
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(updateQuotaMeter, 1500);
  setInterval(function() {
    updateQuotaMeter();
  }, 30 * 60 * 1000);
});