// ============================================================
// حماية اختيار البيارة في شاشة البيانات:
// عند إعادة بناء القوائم المشتقة (كل ثانية) قد يختفي الخيار الذي
// اختاره المستخدم من السيلكت (مثل بيارة لا يوجد لها سجلات بعد، أو
// أثناء إعادة البناء). هذا الملف يحفظ آخر اختيار فعلي ويدعم إعادة
// إظهاره وتحديده حتى يُضاف سجله — وبعدها تبقيه القوائم المشتقة
// بشكل دائم لأنه صار في مصادرها.
// الإصدار الحر: لا يفرض أي اختيار إذا أُفرغ السيلكت عمداً من النظام
// (بعد الحفظ مثلأ) ولا إذا اختار المستخدم العنصر الفارغ صراحة.
// ============================================================
(function () {
  const SELECT_ID = 'septic-name-select';
  let last = null;

  function getSelect() { return document.getElementById(SELECT_ID); }
  function findOption(sel, value) {
    for (let i = 0; i < sel.options.length; i++) if (String(sel.options[i].value) === String(value)) return sel.options[i];
    return null;
  }

  function tick() {
    const sel = getSelect();
    if (!sel) return;
    if (!last) {
      if (sel.value) last = sel.value; // التقاط قيمة موجودة (إعادة بناء أنقذتها)
      return;
    }
    const opt = findOption(sel, last);
    if (opt) {
      // الأصل: الخيار موجود. لا نتدخل — النظام قد أفرغ السيلكت عمداً.
      if (sel.value && String(sel.value) !== String(last)) { if (findOption(sel, sel.value)) last = sel.value; }
      return;
    }
    // الخيار اختفى بعد إعادة البناء — أعد إظهاره وأعد تحديده
    const fresh = document.createElement('option');
    fresh.value = last;
    fresh.textContent = last;
    sel.appendChild(fresh);
    sel.value = last;
  }

  document.addEventListener('change', function (ev) {
    if (!ev.target || ev.target.id !== SELECT_ID) return;
    if (ev.target.value) last = ev.target.value;
    else last = null; // اختار الفارغ صراحة = تحرير الاختيار
  }, true);

  window.addEventListener('DOMContentLoaded', function () { try { tick(); } catch (e) {} });
  window.addEventListener('load', function () { try { tick(); setTimeout(tick, 1500); } catch (e) {} });
  setInterval(function () { try { tick(); } catch (e) {} }, 600);
})();