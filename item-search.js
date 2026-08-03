// item-search.js — إظهار قائمة اقتراحات حقل "اسم الصنف والمواصفات" فور الضغط على الحقل
// مثل حقل "اسم الموظف المستلم" تماماً: قائمة كاملة عند الفتح، وفلترة أثناء الكتابة.
// ملاحظة: يتم التركيب عند window load حتى تعمل القائمة فوق setupItemNameSearch الموجودة في app.js.

(function () {
  'use strict';

  function getItems() {
    try {
      if (typeof inventoryItems !== 'undefined' && Array.isArray(inventoryItems)) return inventoryItems;
    } catch (e) {}
    return window.inventoryItems || [];
  }

  function renderSuggestions(inp, hid, sug, q) {
    sug.innerHTML = '';
    let list = getItems();
    if (q) {
      list = list.filter(function (i) {
        return (i.code || '').toLowerCase().indexOf(q) !== -1 ||
               (i.name || '').toLowerCase().indexOf(q) !== -1 ||
               (i.store || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    list = list.slice(0, 10);
    if (!list.length) { sug.style.display = 'none'; return; }
    sug.style.display = 'block';
    list.forEach(function (item) {
      let d = document.createElement('div');
      d.innerText = '[' + (item.code || '') + '] ' + (item.name || '') + ' — الاسم: ' + (item.store || '—');
      d.onclick = function () {
        inp.value = item.name;
        hid.value = item.code;
        let unitSel = document.getElementById('inv-unit-select');
        if (unitSel && item.unit) unitSel.value = item.unit;
        sug.style.display = 'none';
      };
      sug.appendChild(d);
    });
  }

  function init() {
    let inp = document.getElementById('inv-item-name');
    let hid = document.getElementById('inv-item-code');
    let sug = document.getElementById('inv-item-suggestions');
    if (!inp || !hid || !sug) return;
    inp.addEventListener('focus', function () {
      if (!inp.value.trim()) renderSuggestions(inp, hid, sug, '');
    });
    inp.addEventListener('input', function () {
      renderSuggestions(inp, hid, sug, inp.value.trim().toLowerCase());
    });
    inp.addEventListener('blur', function () {
      setTimeout(function () { sug.style.display = 'none'; }, 200);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && sug.style.display === 'block' && sug.firstChild) {
        e.preventDefault();
        sug.firstChild.click();
      }
    });
  }

  if (window.addEventListener) {
    window.addEventListener('load', init);
  } else {
    window.onload = init;
  }
})();
