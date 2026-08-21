// ============================================================
//  زر حذف المبنى في تبويب السكن:
//  - دالة deleteBuilding كانت معرفة في النظام لكن لا يوجد أي زر
//    في الواجهة يستدعيها — هنا نضيف زر حذف أحمر في عنوان كل مبنى
//  - الحذف يمر عبر دالة النظام نفسها (تأكيد/نقل الموظفين/تسجيل الحذف)
//  - ويسجل المبنى وغرفه في قائمة الحذف الدائمة حتى لا يرجعا أبداً
// ============================================================
(function () {
  // 1) تسجيل المبنى وغرفه في قائمة الحذف الدائمة قبل تنفيذ حذف النظام
  var _origDeleteBuilding = window.deleteBuilding;
  if (typeof _origDeleteBuilding === 'function') {
    window.deleteBuilding = function (sector) {
      try {
        if (typeof hardDeleteItem === 'function') {
          hardDeleteItem('sectors', sector);
          if (Array.isArray(roomsCapacity)) {
            roomsCapacity.forEach(function (r) { if (r && r.sector === sector && r.number) hardDeleteItem('rooms', r.number); });
          }
        }
      } catch (e) {}
      return _origDeleteBuilding.apply(this, arguments);
    };
  }

  // 2) حقن زر الحذف في عنوان كل مبنى بعد كل رسم للتبويب
  function _inject() {
    var layout = document.getElementById('housing-layout');
    if (!layout) return;
    layout.querySelectorAll('.sector-block').forEach(function (block) {
      var title = block.querySelector('.sector-title');
      if (!title || title.querySelector('.hd-del-building')) return;
      var name = (title.textContent || '').replace(/^\s*المبنى:\s*/, '').trim();
      if (!name) return;
      var btn = document.createElement('button');
      btn.className = 'hd-del-building';
      btn.type = 'button';
      btn.setAttribute('data-sector', name);
      btn.title = 'حذف المبنى وكل غرفه';
      btn.textContent = '🗑 حذف';
      btn.style.cssText = 'background:#ffebee;color:#c62828;border:1px solid #ef9a9a;border-radius:8px;padding:4px 12px;font-size:12px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;flex-shrink:0;margin-right:8px;';
      btn.onmouseenter = function () { btn.style.background = '#c62828'; btn.style.color = '#fff'; };
      btn.onmouseleave = function () { btn.style.background = '#ffebee'; btn.style.color = '#c62828'; };
      title.appendChild(btn);
    });
  }
  var _origRender = window.renderHousingLayout;
  if (typeof _origRender === 'function') {
    window.renderHousingLayout = function () {
      var r = _origRender.apply(this, arguments);
      try { _inject(); } catch (e) {}
      return r;
    };
  }

  // 3) تفويض نقرة واحد يصمد بعد إعادة الرسم (أأمن من onclick داخل أسماء عربية)
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var btn = (t && t.closest) ? t.closest('.hd-del-building') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    try { if (typeof requireAdmin === 'function' && !requireAdmin()) return; } catch (e) {}
    var sector = btn.getAttribute('data-sector');
    if (!sector) return;
    if (typeof window.deleteBuilding === 'function') window.deleteBuilding(sector);
    else alert('تعذر فتح أداة حذف المبنى.');
  });

  // 4) أول حقن عند جاهزية الصفحة (لو كان الرسم تم قبل تحميل هذا الملف)
  function boot() { try { if (typeof renderHousingLayout === 'function' && typeof _origRender !== 'function') _inject(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
