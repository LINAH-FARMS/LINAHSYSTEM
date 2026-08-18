// Auto-associate labels with inputs to fix accessibility warnings
(function(){
  let c = 0;
  document.querySelectorAll('label:not([for])').forEach(function(lbl){
    let inp = lbl.closest('.form-group, .form-floating, td, div');
    if (!inp) inp = lbl.parentElement;
    if (!inp) return;
    inp = inp.querySelector('input:not([type=hidden]), select, textarea');
    if (!inp || inp.id) { if(inp && inp.id) lbl.setAttribute('for',inp.id); return; }
    inp.id = 'auto-label-' + (++c);
    lbl.setAttribute('for', inp.id);
  });
})();

// ====== AI Assistant (Gemini 2.0 Flash) with Function Calling ======
function _safeJsonParse(val, fallback) { try { var r = JSON.parse(val); return (r !== null && r !== undefined) ? r : fallback; } catch(e) { return fallback; } }


// بيانات الوصفات المستوردة من ملف الريسبي.xlsx (وُلّدت تلقائياً)
var RECIPES_DEFAULT = [
  { name:"كشري", base:380, items:[{ q:40, u:"كجم", n:"مكرونة" }, { q:10, u:"كجم", n:"اسباجيتي" }, { q:15, u:"كجم", n:"ارز" }, { q:10, u:"كجم", n:"شعرية" }, { q:8, u:"كيس", n:"ملح" }, { q:5, u:"لتر", n:"زيت طبخ" }, { q:250, u:"جم", n:"شطة" }, { q:4, u:"لتر", n:"خل" }, { q:1, u:"كجم", n:"عدس اصفر" }, { q:4, u:"كجم", n:"حمص" }, { q:4, u:"كجم", n:"عدس بجبة" }, { q:70, u:"جم", n:"فلفل اسمر" }, { q:70, u:"جم", n:"كسبرة مطحونة" }, { q:80, u:"جم", n:"كمون" }, { q:1, u:"كجم", n:"ثوم" }, { q:20, u:"كجم", n:"طماطم" }, { q:4, u:"وحدة", n:"علبة صلصة" }, { q:25, u:"كجم", n:"بصل" }, { q:12, u:"لتر", n:"زيت تحمير" }, { q:2, u:"كجم", n:"دقيق" }] },
  { name:"فراخ مشوية", base:380, items:[{ q:95, u:"عدد", n:"دجاجة" }, { q:15, u:"كجم", n:"بصل" }, { q:10, u:"كجم", n:"طماطم" }, { q:550, u:"جم", n:"ثوم" }, { q:1, u:"كجم", n:"فلفل حار" }, { q:2, u:"كجم", n:"فلفل بارد" }, { q:1, u:"كجم", n:"جزر" }, { q:80, u:"جم", n:"فلفل اسمر" }, { q:150, u:"جم", n:"كسبرة ناعمة" }, { q:200, u:"جم", n:"بهارات شوي" }, { q:50, u:"جم", n:"كاري" }, { q:50, u:"جم", n:"بابريكا" }, { q:120, u:"جم", n:"ثوم بودر" }, { q:40, u:"جم", n:"بصل بودرة" }, { q:7, u:"لتر", n:"خل" }, { q:2, u:"لتر", n:"زيت طبخ" }, { q:9.5, u:"كيس", n:"ملح" }, { q:2, u:"شيكارة", n:"فحم" }, { q:30, u:"متر", n:"سيلفر حراري" }, { q:8, u:"كجم", n:"طحينة" }, { q:80, u:"جم", n:"13 بهار" }, { q:30, u:"جم", n:"شطة" }, { q:1, u:"زجاجة", n:"زيت زيتون" }, { q:1, u:"كجم", n:"ليمون" }, { q:1, u:"كجم", n:"دقيق" }] },
  { name:"فراخ فرن", base:380, items:[{ q:95, u:"عدد", n:"دجاجة" }, { q:3, u:"كجم", n:"بصل" }, { q:3, u:"كجم", n:"طماطم" }, { q:50, u:"جم", n:"ورق لاورا" }, { q:50, u:"جم", n:"حبهان" }, { q:70, u:"جم", n:"13 بهار" }, { q:50, u:"جم", n:"بهارات دجاج" }, { q:50, u:"جم", n:"فلفل اسمر" }, { q:1, u:"وحدة", n:"علبة صلصة" }, { q:3, u:"كيس", n:"ملح" }, { q:12, u:"كجم", n:"بطاطس" }, { q:8, u:"كجم", n:"طماطم" }, { q:5, u:"كجم", n:"بصل" }, { q:200, u:"جم", n:"ثوم" }, { q:10, u:"جم", n:"7 بهارات" }, { q:20, u:"جم", n:"شطة" }, { q:50, u:"جم", n:"بابريكا" }] },
  { name:"ورقة لحمة", base:380, items:[{ q:57, u:"كجم", n:"لحم" }, { q:5, u:"كجم", n:"بصل" }, { q:3, u:"كجم", n:"طماطم" }, { q:3, u:"كجم", n:"بطاطس" }, { q:100, u:"جم", n:"ورق لاورا" }, { q:70, u:"جم", n:"13 بهار" }, { q:70, u:"جم", n:"7 بهارات" }, { q:50, u:"جم", n:"بهارات لحم" }, { q:60, u:"جم", n:"فلفل اسمر" }, { q:2, u:"كيس", n:"ملح" }, { q:2, u:"لفة", n:"سلفر" }] },
  { name:"سلطة خضراء", base:100, items:[{ q:12, u:"كجم", n:"طماطم" }, { q:4, u:"كجم", n:"خيار" }, { q:3, u:"كجم", n:"فلفل" }, { q:1, u:"كجم", n:"جزر" }, { q:1, u:"كجم", n:"ليمون" }, { q:0.5, u:"كجم", n:"فلفل حار" }, { q:1, u:"كجم", n:"بصل" }, { q:0.5, u:"زجاجة", n:"زيت زيتون" }, { q:0.25, u:"لتر", n:"خل" }, { q:5, u:"ربطة", n:"خضرة" }, { q:50, u:"جم", n:"ملح" }, { q:50, u:"جم", n:"كمون" }] },
  { name:"ارز باللسان عصفور والشعرية", base:380, items:[{ q:10, u:"كجم", n:"لسان عصفور" }, { q:2, u:"كجم", n:"شعرية" }, { q:50, u:"كجم", n:"ارز" }, { q:2, u:"لتر", n:"زيت طبخ" }, { q:5, u:"كجم", n:"سمنة" }, { q:2, u:"كيس", n:"ملح" }, { q:50, u:"جم", n:"13 بهار" }, { q:50, u:"جم", n:"فلفل اسمر" }, { q:50, u:"جم", n:"ورق لاورا" }] },
  { name:"ملوخيه", base:380, items:[{ q:10, u:"كجم", n:"ملوخية" }, { q:1, u:"علبة", n:"مرقة دجاج" }, { q:21, u:"كجم", n:"ثوم" }, { q:250, u:"جم", n:"كسبرة ناعمة" }, { q:5, u:"كجم", n:"طماطم" }, { q:2, u:"كيس", n:"ملح" }, { q:20, u:"جم", n:"شطة" }, { q:4, u:"ربطة", n:"كسبرة خضراء" }] },
  { name:"شوربة عدس", base:380, items:[{ q:15, u:"كجم", n:"عدس" }, { q:1.5, u:"كجم", n:"سمن" }, { q:4, u:"كجم", n:"بصل" }, { q:2, u:"كجم", n:"بطاطس" }, { q:1, u:"كجم", n:"جزر" }, { q:500, u:"جم", n:"ثوم" }, { q:200, u:"جم", n:"كمون" }] },
  { name:"مسقعة", base:380, items:[{ q:40, u:"كجم", n:"باذنجان رومي" }, { q:40, u:"كجم", n:"بطاطس" }, { q:8, u:"كجم", n:"فلفل" }, { q:1, u:"وحدة", n:"علبة صلصة" }, { q:7, u:"كجم", n:"طماطم" }, { q:500, u:"جم", n:"ثوم" }, { q:1.5, u:"لتر", n:"زيت" }, { q:20, u:"جم", n:"شطة" }, { q:30, u:"جم", n:"كمون" }, { q:50, u:"جم", n:"كسبرة ناعمة" }, { q:10, u:"وحدة", n:"مرقة داج" }, { q:1, u:"كيس", n:"ملح" }] },
  { name:"طعمية", base:380, items:[{ q:20, u:"كجم", n:"مدشوش" }, { q:20, u:"لتر", n:"زيت" }, { q:10, u:"ربطة", n:"كرات" }, { q:500, u:"جم", n:"ثوم" }, { q:250, u:"جم", n:"كسبرة نصف دشة" }, { q:250, u:"جم", n:"سمسم" }] },
  { name:"فول", base:380, items:[{ q:15, u:"كجم", n:"فول حصي" }, { q:1.5, u:"كجم", n:"فول مدشوش" }, { q:3, u:"كجم", n:"ارز" }, { q:1, u:"كجم", n:"عدس اصفر" }, { q:2.5, u:"كجم", n:"طحينة" }, { q:2, u:"لتر", n:"زيت" }, { q:1, u:"كجم", n:"زيت حار" }, { q:1, u:"زجاجة", n:"زيت زيتون" }, { q:2, u:"كيس", n:"ملح" }, { q:200, u:"جم", n:"كمون" }, { q:300, u:"جم", n:"كسبرة ناعمة" }] },
  { name:"ارز بلبن", base:380, items:[{ q:40, u:"لتر", n:"لبن" }, { q:12, u:"كجم", n:"سكر" }, { q:3, u:"كجم", n:"نشا" }, { q:1, u:"كجم", n:"زبيب" }, { q:1, u:"كجم", n:"زبيب" }, { q:1, u:"كجم", n:"جوز هند" }, { q:5, u:"كجم", n:"ارز" }, { q:380, u:"وحدة", n:"علبة بلاستيك" }] },
  { name:"بطاطس مهروسة", base:380, items:[{ q:60, u:"كجم", n:"بطاطس" }, { q:2, u:"كجم", n:"سمنة" }, { q:1.5, u:"لتر", n:"زيت" }, { q:100, u:"جم", n:"كركم" }, { q:50, u:"جم", n:"فلفل اسمر" }, { q:2, u:"كيس", n:"ملح" }, { q:300, u:"جم", n:"كسبرة ناعمة" }, { q:100, u:"جم", n:"شطة" }] },
  { name:"بطاطس مقليه", base:380, items:[{ q:85, u:"كجم", n:"بطاطس" }, { q:15, u:"لتر", n:"زيت" }, { q:250, u:"جم", n:"توابل الشرق الاقصي" }, { q:2, u:"كيس", n:"ملح" }] },
  { name:"بيض مسلوق", base:1, items:[{ q:1, u:"عدد", n:"بيضة" }] },
  { name:"مربي", base:1, items:[{ q:1, u:"عدد", n:"علبة مربي 20 جرام" }] },
  { name:"جبنه", base:1, items:[{ q:1, u:"عدد", n:"علبة جبنة 125 جرام" }] },
  { name:"حلاوة", base:1, items:[{ q:1, u:"عدد", n:"كيس حلاوة" }] },
  { name:"لحمة بالصوص", base:380, items:[{ q:56.5, u:"كجم", n:"لحم" }, { q:15, u:"كجم", n:"بصل" }, { q:10, u:"كجم", n:"طماطم" }, { q:3, u:"كجم", n:"فلفل رومي" }, { q:40, u:"جم", n:"فلفل اسمر" }, { q:30, u:"جم", n:"كسبرة ناعمة" }, { q:150, u:"جم", n:"ورق لاورا" }, { q:40, u:"جم", n:"حبهان" }, { q:1, u:"كيس", n:"كيس ملح" }] },
  { name:"لوبيا", base:380, items:[{ q:1, u:"كجم", n:"سمن" }, { q:5, u:"كجم", n:"بصل" }, { q:200, u:"جم", n:"ثوم" }, { q:3, u:"وحدة", n:"علبة صلصة" }, { q:1, u:"كيس", n:"ملح" }, { q:5, u:"جم", n:"فلفل اسمر" }, { q:50, u:"جم", n:"كسبرة ناعمة" }, { q:40, u:"جم", n:"7 بهارات" }, { q:40, u:"جم", n:"13 بهار" }, { q:5, u:"كجم", n:"طماطم" }, { q:15, u:"وحدة", n:"مرقة دجاج" }, { q:1, u:"لتر", n:"زيت طبخ" }] },
  { name:"ارز", base:380, items:[{ q:48, u:"كجم", n:"ارز" }, { q:25, u:"كجم", n:"شعرية" }, { q:4, u:"كجم", n:"سمن" }, { q:2, u:"لتر", n:"زيت طبخ" }, { q:2, u:"كيس", n:"ملح" }, { q:15, u:"جم", n:"13 بهار" }, { q:10, u:"جم", n:"7 بهارات" }, { q:10, u:"جم", n:"فلفل اسمر" }] },
  { name:"فاصوليا", base:380, items:[{ q:1, u:"كجم", n:"سمن" }, { q:5, u:"كجم", n:"بصل" }, { q:200, u:"جم", n:"ثوم" }, { q:3, u:"وحدة", n:"علبة صلصة" }, { q:1, u:"كيس", n:"ملح" }, { q:5, u:"جم", n:"فلفل اسمر" }, { q:50, u:"جم", n:"كسبرة ناعمة" }, { q:40, u:"جم", n:"7 بهارات" }, { q:40, u:"جم", n:"13 بهار" }, { q:5, u:"كجم", n:"طماطم" }, { q:15, u:"وحدة", n:"مرقة دجاج" }, { q:1, u:"لتر", n:"زيت طبخ" }] },
  { name:"خضار  مشكل فريش", base:380, items:[{ q:35, u:"كجم", n:"كوسة" }, { q:10, u:"كجم", n:"بصل" }, { q:250, u:"جم", n:"ثوم" }, { q:10, u:"كجم", n:"طماطم" }, { q:2.5, u:"وحدة", n:"علبة صلصة" }, { q:1, u:"كيس", n:"ملح" }, { q:50, u:"جم", n:"فلفل اسمر" }, { q:50, u:"جم", n:"كسبرة ناعمة" }, { q:20, u:"جم", n:"كمون" }, { q:10, u:"جم", n:"كبابة صيني" }, { q:1, u:"كجم", n:"سمن" }, { q:1, u:"لتر", n:"زيت طبخ" }, { q:10, u:"وحدة", n:"مرقة دجاج" }] },
  { name:"بطاطس صنية", base:380, items:[{ q:50, u:"كجم", n:"بطاطس" }, { q:10, u:"كجم", n:"بصل" }, { q:250, u:"جم", n:"ثوم" }, { q:10, u:"كجم", n:"طماطم" }, { q:2.5, u:"وحدة", n:"علبة صلصة" }, { q:1, u:"كيس", n:"ملح" }, { q:50, u:"جم", n:"فلفل اسمر" }, { q:50, u:"جم", n:"كسبرة ناعمة" }, { q:20, u:"جم", n:"كمون" }, { q:10, u:"جم", n:"كبابة صيني" }, { q:1, u:"كجم", n:"سمن" }, { q:1, u:"لتر", n:"زيت طبخ" }, { q:10, u:"وحدة", n:"مرقة دجاج" }] },
  { name:"بسلة بالخضار", base:380, items:[{ q:45, u:"كيس", n:"بسلة" }, { q:15, u:"كجم", n:"طماطم" }, { q:10, u:"كجم", n:"بصل" }, { q:15, u:"كجم", n:"بطاطس" }, { q:40, u:"جم", n:"فلفل اسمر" }, { q:30, u:"جم", n:"13 بهار" }, { q:10, u:"جم", n:"كبابة صيني" }, { q:40, u:"جم", n:"كسبرة ناعمة" }, { q:1, u:"كيس", n:"ملح" }, { q:200, u:"جم", n:"ثوم" }, { q:15, u:"جم", n:"ثوم بودرة" }, { q:15, u:"جم", n:"بصل بودرة" }, { q:1, u:"لتر", n:"زيت طبخ" }, { q:1, u:"كجم", n:"سمن" }, { q:15, u:"وحدة", n:"مرقة دجاج" }] }
];

// ===== طبقة بيانات الوصفات (قابلة للتعديل + مدمجة بتكلفة الخامات) =====
function loadChefRecipes() {
  try { var s = JSON.parse(localStorage.getItem('chef_recipes')); if (Array.isArray(s) && s.length) return s; } catch(e){}
  return JSON.parse(JSON.stringify(RECIPES_DEFAULT));
}
var RECIPES = loadChefRecipes();
function saveChefRecipes() { try { localStorage.setItem('chef_recipes', JSON.stringify(RECIPES)); } catch(e){} }
function getRecipeByName(nm) { return RECIPES.find(function(r){ return r.name === nm; }); }
function getRecipeWeightPerPerson(recipeName) {
  var r = getRecipeByName(recipeName); if (!r || !r.items || !r.base) return 0;
  var totalKg = 0;
  r.items.forEach(function(it) {
    var q = it.q || 0;
    if (it.u === 'كجم' || it.u === 'لتر') totalKg += q;
    else if (it.u === 'جم' || it.u === 'جرام') totalKg += q / 1000;
    else if (it.u === 'كيس' || it.u === 'ربطة' || it.u === 'وحدة' || it.u === 'زجاجة' || it.u === 'شيكارة' || it.u === 'لفة' || it.u === 'متر') totalKg += q * 0.05;
    else totalKg += q * 0.05;
  });
  return totalKg / r.base;
}
var WEEKLY_MENU_DAYS = ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
var _weeklyMenu = {};
function loadWeeklyMenu() {
  try { var s = JSON.parse(localStorage.getItem('lineh_weekly_menu')); if (s && typeof s === 'object') return s; } catch(e){}
  return {};
}
function saveWeeklyMenuData() { try { localStorage.setItem('lineh_weekly_menu', JSON.stringify(_weeklyMenu)); } catch(e){} }
function getRecipeNames() { return RECIPES.map(function(r){ return r.name; }); }
function openWeeklyMenu() {
  _weeklyMenu = loadWeeklyMenu();
  renderWeeklyMenu();
  updateWeeklyWeights();
  openModal('modal-weekly-menu');
}
function renderWeeklyMenu() {
  var tbody = document.getElementById('weekly-menu-body');
  if (!tbody) return;
  var names = getRecipeNames();
  var meals = ['فطار','غداء','عشاء'];
  var html = '';
  WEEKLY_MENU_DAYS.forEach(function(day) {
    html += '<tr style="border-bottom:1px solid #e0e0e0;">';
    html += '<td style="padding:8px;border:1px solid #e0e0e0;font-weight:700;background:#f5f5f5;">' + day + '</td>';
    meals.forEach(function(meal) {
      var key = day + '|' + meal;
      var selected = _weeklyMenu[key] || [];
      html += '<td style="padding:4px;border:1px solid #e0e0e0;">';
      html += '<select multiple size="4" style="width:100%;font-size:11px;padding:2px;border:1px solid #bbb;border-radius:4px;font-family:Cairo;" onchange="updateWeeklyMeal(this,\'' + key + '\')">';
      names.forEach(function(n) {
        var sel = selected.indexOf(n) >= 0 ? ' selected' : '';
        html += '<option value="' + n.replace(/"/g,'&quot;') + '"' + sel + '>' + n + '</option>';
      });
      html += '</select>';
      html += '</td>';
    });
    html += '</tr>';
  });
  tbody.innerHTML = html;
}
function updateWeeklyMeal(sel, key) {
  _weeklyMenu[key] = Array.from(sel.selectedOptions).map(function(o) { return o.value; });
  updateWeeklyWeights();
}
function updateWeeklyWeights() {
  var el = document.getElementById('wm-weights-display');
  if (!el) return;
  var meals = ['فطار','غداء','عشاء'];
  var mealIcons = {'فطار':'🌅','غداء':'☀️','عشاء':'🌙'};
  var parts = [];
  meals.forEach(function(meal) {
    var totalW = 0, count = 0;
    WEEKLY_MENU_DAYS.forEach(function(day) {
      var dishes = _weeklyMenu[day + '|' + meal] || [];
      dishes.forEach(function(d) {
        var w = getRecipeWeightPerPerson(d);
        if (w > 0) { totalW += w; count++; }
      });
    });
    if (count > 0) {
      var avgW = (totalW / count * 1000).toFixed(0);
      parts.push(mealIcons[meal] + ' ' + meal + ': ~' + avgW + ' جم/فرد');
    }
  });
  el.innerHTML = parts.length ? parts.join(' | ') : '— حدد أصناف لكل وجبة';
}
function saveWeeklyMenu() {
  saveWeeklyMenuData();
  closeModal('modal-weekly-menu');
}

// ===== تخطيط وجبات الغد =====
function getPlanDishList(prefix) {
  var list = document.getElementById('plan-' + prefix + '-list');
  if (!list) return [];
  var dishes = [];
  list.querySelectorAll('.plan-dish-item').forEach(function(item) {
    var name = item.getAttribute('data-name');
    var hissa = parseInt(item.getAttribute('data-hissa')) || 1;
    if (name) dishes.push({ name: name, hissa: hissa });
  });
  return dishes;
}
function populatePlanDishSelects() {
  var names = getRecipeNames();
  ['plan-bf-add','plan-lh-add','plan-dn-add'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— اختر صنف —</option>' + names.map(function(n) { return '<option value="' + n.replace(/"/g,'&quot;') + '">' + n + '</option>'; }).join('');
  });
}
function addPlanDish(prefix) {
  var sel = document.getElementById('plan-' + prefix + '-add');
  var hissaInput = document.getElementById('plan-' + prefix + '-hissa');
  var list = document.getElementById('plan-' + prefix + '-list');
  if (!sel || !list) return;
  var name = sel.value, hissa = parseInt(hissaInput ? hissaInput.value : 1) || 1;
  if (!name) return;
  if (list.querySelector('[data-name="' + name.replace(/"/g,'&quot;') + '"]')) return;
  var div = document.createElement('div');
  div.className = 'plan-dish-item';
  div.setAttribute('data-name', name);
  div.setAttribute('data-hissa', hissa);
  div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;padding:3px 6px;background:#fff;border:1px solid #e0e0e0;border-radius:4px;';
  div.innerHTML = '<span style="flex:1;font-size:12px;">' + name + ' <span style="color:#888;font-size:10px;">(x' + hissa + ')</span></span>' +
    '<select onchange="updatePlanDishHissa(this)" style="width:45px;padding:1px 2px;border:1px solid #ddd;border-radius:3px;font-size:10px;font-family:Cairo;">' +
    [1,2,3,4,5,6,8,10].map(function(n) { return '<option value="' + n + '"' + (n === hissa ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
    '</select><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:0 5px;font-size:10px;line-height:1.5;">✕</button>';
  list.appendChild(div);
  sel.value = '';
  if (hissaInput) hissaInput.value = '1';
}
function updatePlanDishHissa(sel) {
  var item = sel.closest('.plan-dish-item');
  if (item) item.setAttribute('data-hissa', sel.value);
}
function resetPlan() {
  ['plan-date','plan-bf-count','plan-lh-count','plan-dn-count'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { if (el.type === 'date') el.value = ''; else el.value = ''; }
  });
  ['plan-bf-list','plan-lh-list','plan-dn-list'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  var res = document.getElementById('plan-results');
  if (res) res.style.display = 'none';
}
function loadPlanFromWeeklyMenu() {
  _weeklyMenu = loadWeeklyMenu();
  var dateInput = document.getElementById('plan-date');
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (!dateInput.value) dateInput.value = tomorrow.toISOString().split('T')[0];
  var dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var dayName = dayNames[tomorrow.getDay()];
  var meals = ['فطار','غداء','عشاء'];
  var prefixes = ['bf','lh','dn'];
  prefixes.forEach(function(p) { var el = document.getElementById('plan-' + p + '-list'); if (el) el.innerHTML = ''; });
  meals.forEach(function(meal, i) {
    var key = dayName + '|' + meal;
    var dishes = _weeklyMenu[key] || [];
    dishes.forEach(function(d) {
      var sel = document.getElementById('plan-' + prefixes[i] + '-add');
      var list = document.getElementById('plan-' + prefixes[i] + '-list');
      if (!sel || !list) return;
      if (list.querySelector('[data-name="' + d.replace(/"/g,'&quot;') + '"]')) return;
      var div = document.createElement('div');
      div.className = 'plan-dish-item';
      div.setAttribute('data-name', d);
      div.setAttribute('data-hissa', '1');
      div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;padding:3px 6px;background:#fff;border:1px solid #e0e0e0;border-radius:4px;';
      div.innerHTML = '<span style="flex:1;font-size:12px;">' + d + ' <span style="color:#888;font-size:10px;">(x1)</span></span>' +
        '<select onchange="updatePlanDishHissa(this)" style="width:45px;padding:1px 2px;border:1px solid #ddd;border-radius:3px;font-size:10px;font-family:Cairo;">' +
        [1,2,3,4,5,6,8,10].map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('') +
        '</select><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:0 5px;font-size:10px;line-height:1.5;">✕</button>';
      list.appendChild(div);
    });
  });
  var s = getTodayMealStats();
  ['plan-bf-count','plan-lh-count','plan-dn-count'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.value) el.value = s.pCount;
  });
}
function calcPlanIngredients() {
  var date = document.getElementById('plan-date').value;
  if (!date) { alert('⚠️ اختر التاريخ أولاً'); return; }
  var mealConfigs = [
    { prefix:'bf', label:'🌅 إفطار' },
    { prefix:'lh', label:'☀️ غداء' },
    { prefix:'dn', label:'🌙 عشاء' }
  ];
  var totals = {}, mealSummaries = [], hasAny = false;
  mealConfigs.forEach(function(m) {
    var sel = document.getElementById('plan-' + m.prefix + '-add');
    if (sel && sel.value) {
      var list = document.getElementById('plan-' + m.prefix + '-list');
      if (list && !list.querySelector('[data-name="' + sel.value.replace(/"/g,'&quot;') + '"]')) addPlanDish(m.prefix);
    }
    var count = parseInt(document.getElementById('plan-' + m.prefix + '-count').value) || 0;
    var dishes = getPlanDishList(m.prefix);
    if (count > 0 && dishes.length > 0) {
      hasAny = true;
      mealSummaries.push(m.label + ': ' + count + ' فرد ← ' + dishes.map(function(d) { return d.name + '(x' + d.hissa + ')'; }).join('، '));
    }
    dishes.forEach(function(d) {
      var r = getRecipeByName(d.name);
      if (!r) return;
      var factor = (count / (r.base || 1)) * d.hissa;
      (r.items || []).forEach(function(it) {
        var key = it.n + '|' + (it.u || 'كجم');
        if (!totals[key]) totals[key] = { name: it.n, unit: it.u || 'كجم', qty: 0 };
        totals[key].qty += it.q * factor;
      });
    });
  });
  if (!hasAny) { alert('⚠️ حدد الأفراد وأضف صنفاً واحداً على الأقل'); return; }
  renderPlanResults(totals, mealSummaries);
}
function renderPlanResults(totals, mealSummaries) {
  var el = document.getElementById('plan-results');
  if (!el) return;
  var totalCost = 0, missingCost = 0;
  var sorted = Object.keys(totals).sort().map(function(key) {
    var t = totals[key];
    var unitPrice = getIngCost(t.name, t.unit);
    var lineCost = unitPrice !== undefined ? (unitPrice * t.qty) : undefined;
    if (lineCost !== undefined) totalCost += lineCost; else missingCost++;
    var unitPriceHtml = unitPrice !== undefined ? '<span style="color:#555;">' + unitPrice.toFixed(2) + ' ج</span>' : '<span style="color:#b71c1c;">—</span>';
    var costHtml = lineCost !== undefined ? '<span style="font-weight:700;color:#2e7d32;">' + formatQty(lineCost) + ' ج.م</span>' : '<span style="color:#b71c1c;cursor:pointer;" onclick="openRecipeManager()">⚠️</span>';
    return '<tr><td>' + t.name + '</td><td style="text-align:center;">' + t.unit + '</td><td style="text-align:center;font-weight:700;color:#1565c0;">' + formatQty(t.qty) + '</td><td style="text-align:center;">' + unitPriceHtml + '</td><td style="text-align:center;">' + costHtml + '</td></tr>';
  }).join('');
  el.style.display = 'block';
  var mealIcon = {'bf':'🌅','lh':'☀️','dn':'🌙'};
  el.innerHTML = '<div style="background:#fff;border:2px solid #2e7d32;border-radius:10px;overflow:hidden;">' +
    '<div style="background:#2e7d32;color:#fff;padding:10px 15px;font-weight:700;display:flex;justify-content:space-between;flex-wrap:wrap;"><span>📋 الخامات المطلوبة ـ ' + Object.keys(totals).length + ' خامة</span>' +
    '<span style="font-weight:400;font-size:12px;">' + (document.getElementById('plan-date').value || '') + '</span></div>' +
    '<div style="padding:10px;max-height:350px;overflow-y:auto;">' +
    (mealSummaries.length ? '<div style="font-size:12px;color:#555;margin-bottom:10px;padding:8px;background:#f5f5f5;border-radius:6px;">' + mealSummaries.join('<br>') + '</div>' : '') +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e8f5e9;">' +
    '<th style="padding:5px 6px;border:1px solid #c8e6c9;text-align:right;">الخامة</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">الوحدة</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">الكمية</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">سعر الوحدة</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">التكلفة</th></tr></thead><tbody>' + sorted + '</tbody></table>' +
    (missingCost > 0 ? '<div style="text-align:center;padding:6px;background:#ffebee;font-size:12px;color:#b71c1c;">⚠️ ' + missingCost + ' خامة بدون سعر — افتح ⚙️ إدارة الوصفات > تحديث الأسعار</div>' : '') +
    (totalCost > 0 ? '<div style="text-align:left;padding:8px;background:#e8f5e9;border-top:2px solid #2e7d32;font-weight:700;font-size:16px;color:#1b5e20;">الإجمالي التقديري: ' + formatQty(totalCost) + ' ج.م</div>' : '') +
    '</div></div>';
}
function exportPlanToExcel() {
  var el = document.getElementById('plan-results');
  if (!el || el.style.display === 'none') { alert('⚠️ احسب الخامات المطلوبة أولاً'); return; }
  var rows = [], totals = {};
  var mealConfigs = [
    { prefix:'bf', meal:'إفطار' },
    { prefix:'lh', meal:'غداء' },
    { prefix:'dn', meal:'عشاء' }
  ];
  mealConfigs.forEach(function(m) {
    var count = parseInt(document.getElementById('plan-' + m.prefix + '-count').value) || 0;
    var dishes = getPlanDishList(m.prefix);
    var recipeNames = dishes.map(function(d) { var r = getRecipeByName(d.name); return r ? r.name : d.name; });
    if (count > 0 && recipeNames.length > 0) {
      rows.push({ 'الوجبة': m.meal, 'عدد الأفراد': count, 'الأصناف': recipeNames.join(', ') });
    }
    dishes.forEach(function(d) {
      var r = getRecipeByName(d.name);
      if (!r) return;
      var factor = (count / (r.base || 1)) * d.hissa;
      (r.items || []).forEach(function(it) {
        var key = it.n + '|' + (it.u || 'كجم');
        if (!totals[key]) totals[key] = { name: it.n, unit: it.u || 'كجم', qty: 0 };
        totals[key].qty += it.q * factor;
      });
    });
  });
  Object.keys(totals).sort().forEach(function(key) {
    var t = totals[key];
    rows.push({ 'الوجبة': '', 'عدد الأفراد': '', 'الأصناف': '', 'الخامة': t.name, 'الوحدة': t.unit, 'الكمية': formatQty(t.qty) });
  });
  if (rows.length === 0) return;
  try {
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حاسبة_الوجبات');
    XLSX.writeFile(wb, 'حاسبة_وجبات_' + (document.getElementById('plan-date').value || '').replace(/-/g,'') + '.xlsx');
  } catch(e) { alert('خطأ في التصدير: ' + e.message); }
}
function printPlanResults() {
  var el = document.getElementById('plan-results');
  if (!el || el.style.display === 'none') { alert('⚠️ احسب الخامات المطلوبة أولاً'); return; }
  var content = el.innerHTML;
  var date = document.getElementById('plan-date').value || '';
  var w = window.open('', '_blank');
  w.document.write('<html dir="rtl"><head><meta charset="UTF-8"><title>تقرير حاسبة الوجبات</title>' +
    '<style>' +
    'body{font-family:Cairo,"Traditional Arabic",sans-serif;padding:20px;color:#222;}' +
    'h2{color:#1b5e20;text-align:center;margin-bottom:5px;}' +
    '.date{text-align:center;color:#666;margin-bottom:20px;font-size:14px;}' +
    'table{width:100%;border-collapse:collapse;margin-top:10px;}' +
    'th{background:#2e7d32;color:#fff;padding:8px;border:1px solid #2e7d32;text-align:center;font-size:13px;}' +
    'td{padding:8px;border:1px solid #c8e6c9;text-align:center;font-size:12px;}' +
    'tr:nth-child(even){background:#f5f5f5;}' +
    '.total{text-align:left;padding:10px;background:#e8f5e9;font-weight:700;font-size:16px;border-top:2px solid #2e7d32;}' +
    '.meal-summary{font-size:13px;color:#555;margin-bottom:10px;padding:10px;background:#f5f5f5;border-radius:6px;}' +
    '.footer{text-align:center;margin-top:30px;color:#999;font-size:11px;}' +
    '@media print{body{padding:10px;}}' +
    '</style></head><body>' +
    '<h2>📋 حاسبة الوجبات المتكاملة</h2>' +
    '<div class="date">' + date + '</div>' + content +
    '<div class="footer">تم الإنشاء بواسطة LINAHSYSTEM</div>' +
    '</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
}
// ===== نهاية تخطيط وجبات الغد =====

function getExpectedWeightPerMeal(meal, pCount, dateStr) {
  _weeklyMenu = loadWeeklyMenu();
  var dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var dayName;
  if (dateStr) {
    var d = new Date(dateStr + (dateStr.indexOf('T') === -1 ? 'T12:00:00' : ''));
    dayName = dayNames[d.getDay()];
  } else {
    dayName = dayNames[new Date().getDay()];
  }
  var dishes = _weeklyMenu[dayName + '|' + meal] || [];
  var totalWpp = 0;
  dishes.forEach(function(d) { totalWpp += getRecipeWeightPerPerson(d); });
  return { perPersonKg: totalWpp, expectedKg: totalWpp * pCount, dishes: dishes };
}

// تكلفة الخامات: مفتاح "الاسم|الوحدة" -> سعر الوحدة (ج.م)
var CHEF_ING_COST_DEFAULT = {};
[['13بهارات','جم',0.48],['ارز','كجم',34.0],['بابريكا','جم',0.48],['بصل بودرة','جم',0.36],['بصل','كجم',10.0],['بطاطس','كجم',25.0],['بقسماط مطحون','كجم',42.0],['بهارات 7','جم',0.0005],['بهارات الشوى','جم',0.48],['بيض','عدد',3.5],['ثوم بودرة','جم',0.36],['ثوم','كجم',180.0],['جبنة','عدد',13.0],['جزر','كجم',28.0],['جوز هند','كجم',380.0],['حبهان','جم',2.8],['حلاوة قطع','عدد',5.75],['حمص','كجم',80.0],['خضرة','ربطة',3.0],['خل','عدد',30.0],['خيار','كجم',25.0],['زبيب','كجم',330.0],['زيت حار','لتر',150.0],['زيت','لتر',100.0],['سمسم','جم',0.22],['سمنة','عدد',112.0],['سودانى','كجم',180.0],['سيلفر','عدد',305.0],['شطة حمراء','جم',0.18],['شعريه','كجم',26.0],['شيكارة فحم','عدد',741.0],['صلصلة','جم',0.1],['طحينة','كجم',160.0],['عدس اصفر','كجم',50.0],['عدس بجبه','كجم',48.0],['فاصوليا','كجم',70.0],['فرخة','عدد',210.0],['فلفل اسود','جم',0.58],['فول مدشوش','كجم',36.0],['فول مدمس','كجم',90.0],['فيجيتار','كجم',80.0],['قرنفل','جم',0.98],['كرات','ربطة',3.0],['كركم','جم',0.36],['كسبرة','جم',0.14],['كسبره ناعمه','جم',0.14],['كمون','جم',0.4],['كوسة','كجم',30.0],['كيس مخلل','عدد',273.6],['لحم','كجم',340.0],['لسان عصفور','كجم',26.0],['لوبيا','كجم',70.0],['ليمون','كجم',50.0],['مربى','عدد',3.99],['مرقه دجاج','عدد',1.5],['مكرونة اسباكيتى','كجم',26.0],['مكرونة','كجم',26.0],['ملح','عدد',1.75],['ملوخية','كجم',200.0],['موز','كجم',45.0],['نشا','كجم',40.0],['ورق لوري','جم',0.24],['سمن','كجم',100],['عدس','كجم',60],['علبة صلصة','وحدة',300],['علبة بلاستيك','وحدة',1],['كسبرة ناعمة','جم',30],['فلفل اسمر','جم',20],['طماطم','كجم',10],['دقيق','كجم',36],['زيت زيتون','زجاجة',1050],['فلفل','كجم',20],['سكر','كجم',33.5],['ارز بلبن','لتر',55],['بيضة','عدد',1.5],['علبة مربي 20 جرام','عدد',30],['علبة جبنة 125 جرام','عدد',13],['كيس حلاوة','عدد',5.75],['خبز بلدي','عدد',5],['ماء','لتر',5]].forEach(function(x){ CHEF_ING_COST_DEFAULT[x[0]+'|'+x[1]] = x[2]; });
// معامل امتصاص الماء/فقدان الوزن أثناء الطبخ
var INGREDIENT_FACTOR_MAP = {
  'ارز':2.5,'ارز بلبن':2.5,'ارز مصري':2.5,'أرز ابو الذهب':2.5,
  'عدس اصفر':2.5,'عدس بجبه':2.5,'عدس':2.5,'فول مدشوش':2,'فول مدمس':2,'فول':2,
  'حمص':2,'فاصوليا':2,'لوبيا':2,'بسلة':1.5,
  'مكرونة':2.5,'مكرونة اسباكيتى':2.5,'لسان عصفور':2.5,'شعريه':2.5,
  'بطاطس':1.3,'جزر':1.2,'كوسة':1.2,
  'طماطم':1.1,'بصل':1.1,
  'ملوخية':2,'جوز هند':1,
  'فرخة':0.8,'فراخ':0.8,'لحم':0.75,'لحمة':0.75,'بيض':0.75,'بيضة':0.75,
  'ماء':1,'زيت':1,'سمن':1,'سمنة':1,'زيت حار':1
};
function getIngredientFactor(name) {
  if (!name) return 1;
  var key = name.trim();
  if (INGREDIENT_FACTOR_MAP[key]) return INGREDIENT_FACTOR_MAP[key];
  for (var k in INGREDIENT_FACTOR_MAP) {
    if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return INGREDIENT_FACTOR_MAP[k];
  }
  return 1;
}
function loadChefIngCosts() {
  try { var s = JSON.parse(localStorage.getItem('chef_ing_costs')); if (s && typeof s === 'object') return s; } catch(e){}
  var merged = JSON.parse(JSON.stringify(CHEF_ING_COST_DEFAULT));
  // دمج الأسعار من ingredientMaster للخامات المستخدمة في الوصفات فقط
  if (typeof ingredientMaster !== 'undefined' && ingredientMaster.length) {
    var recipeIngs = {};
    if (typeof RECIPES !== 'undefined') {
      RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ recipeIngs[it.n+'|'+it.u] = true; }); });
    }
    ingredientMaster.forEach(function(ing) {
      var key = ing.name + '|' + (ing.unit || 'كجم');
      if (recipeIngs[key] && ing.price > 0) merged[key] = ing.price;
    });
  }
  return merged;
}
var CHEF_ING_COSTS = loadChefIngCosts();
function saveChefIngCosts() { try { localStorage.setItem('chef_ing_costs', JSON.stringify(CHEF_ING_COSTS)); } catch(e){} }
function getIngCost(n, u) { return CHEF_ING_COSTS[n+'|'+u]; }
function getIngCostInput(n, u) {
  var v = getIngCost(n, u);
  var missing = (v === undefined);
  return '<span style="display:inline-flex;align-items:center;gap:4px;">' +
    (missing ? '<span style="color:#c62828;font-weight:700;" title="سعر مفقود">⚠️</span>' : '') +
    '<input type="number" step="0.01" min="0" value="' + (v!==undefined?v:'') + '" placeholder="سعر/'+u+'" data-cost="'+n+'|'+u+'" style="width:80px;padding:3px;border:1px solid ' + (missing ? '#c62828' : '#cfd8dc') + ';border-radius:5px;font-size:12px;" onchange="updateIngCost(this)">' +
    '</span>';
}
function updateIngCost(inp) {
  var key = inp.getAttribute('data-cost');
  var val = parseFloat(inp.value);
  if (!isNaN(val)) {
    CHEF_ING_COSTS[key] = val; saveChefIngCosts();
    var parts = key.split('|');
    var ing = ingredientMaster.find(function(i) { return i.name === parts[0]; });
    if (ing) { ing.price = val; saveIngredientMaster(); }
  }
}

function setupAutocomplete(inp) {
  var wrap = inp.closest('.ac-wrap');
  var drop = wrap.querySelector('.ac-dropdown');
  function getOpts() {
    var names = {};
    RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ names[it.n.trim()]=1; }); });
    Object.keys(CHEF_ING_COSTS).forEach(function(k){ names[k.split('|')[0].trim()]=1; });
    return Object.keys(names).sort();
  }
  function filter(v) {
    var q = v.trim().toLowerCase();
    if (!q) { drop.style.display = 'none'; return; }
    var all = getOpts();
    var matches = all.filter(function(n){ return n.toLowerCase().includes(q); });
    if (!matches.length) { drop.style.display = 'none'; return; }
    drop.innerHTML = matches.map(function(n){
      var b = n.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), function(m){ return '<b>'+m+'</b>'; });
      return '<div class="ac-item" data-name="'+n+'" style="padding:5px 8px;cursor:pointer;font-size:13px;border-bottom:1px solid #eee;">'+b+'</div>';
    }).join('');
    drop.style.display = 'block';
  }
  function pick(n) {
    inp.value = n; drop.style.display = 'none';
  }
  inp.addEventListener('input', function(){ filter(this.value); });
  inp.addEventListener('focus', function(){ filter(this.value); });
  inp.addEventListener('blur', function(){ setTimeout(function(){ drop.style.display = 'none'; }, 200); });
  drop.addEventListener('mousedown', function(e){ e.preventDefault(); });
  drop.addEventListener('click', function(e){
    var item = e.target.closest('.ac-item');
    if (item) { pick(item.getAttribute('data-name')); inp.focus(); }
  });
  inp.addEventListener('keydown', function(e){
    var items = drop.querySelectorAll('.ac-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (!sel) { items[0].classList.add('ac-sel'); items[0].style.background = '#e3f2fd'; } else { var n = Array.prototype.indexOf.call(items, sel); sel.classList.remove('ac-sel'); sel.style.background = ''; if (n+1 < items.length) { items[n+1].classList.add('ac-sel'); items[n+1].style.background = '#e3f2fd'; } } }
    if (e.key === 'ArrowUp') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (sel) { var n = Array.prototype.indexOf.call(items, sel); sel.classList.remove('ac-sel'); sel.style.background = ''; if (n>0) { items[n-1].classList.add('ac-sel'); items[n-1].style.background = '#e3f2fd'; } } }
    if (e.key === 'Enter') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (sel) { pick(sel.getAttribute('data-name')); } }
    if (e.key === 'Escape') { drop.style.display = 'none'; }
  });
}

function exportCompareHTML() {
  if (!RECIPES.length) return alert('لا توجد وصفات.');
  var rows = '';
  RECIPES.forEach(function(r){
    var totalCost = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
    });
    var costPerPerson = totalCost / (r.base || 1);
    rows += '<tr><td style="padding:8px;border:1px solid #ccc;text-align:right;font-weight:700;">' + r.name + '</td><td style="padding:8px;border:1px solid #ccc;text-align:center;">' + totalItems + '</td><td style="padding:8px;border:1px solid #ccc;text-align:center;font-weight:700;color:#2e7d32;">' + (costPerPerson > 0 ? costPerPerson.toFixed(2) + ' ج.م' : '—') + '</td></tr>';
  });
  var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>مقارنة الوصفات</title><style>body{font-family:Cairo,Arial,sans-serif;margin:30px;}h2{color:#00796b;}table{width:100%;border-collapse:collapse;}th{background:#00796b;color:#fff;padding:10px;border:1px solid #00796b;}td{padding:8px;border:1px solid #ccc;}.footer{margin-top:20px;color:#888;font-size:12px;text-align:center;}</style></head><body><h2>📊 مقارنة تكلفة الوصفات</h2><table><thead><tr><th style="text-align:right;">الوصفة</th><th>عدد الخامات</th><th>تكلفة الفرد</th></tr></thead><tbody>' + rows + '</tbody></table><div class="footer">تم الإنشاء: ' + new Date().toLocaleString('ar-EG') + '</div></body></html>';
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'مقارنة_الوصفات_' + new Date().toISOString().split('T')[0] + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function exportCompareReport() {
  if (!RECIPES.length) return alert('لا توجد وصفات.');
  var rows = [['الوصفة','عدد الخامات','تكلفة الفرد']];
  RECIPES.forEach(function(r){
    var totalCost = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
    });
    var costPerPerson = totalCost / (r.base || 1);
    rows.push([r.name, totalItems, parseFloat(costPerPerson.toFixed(2))]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:25},{wch:10},{wch:12}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'مقارنة الوصفات');
  XLSX.writeFile(wb, 'مقارنة_الوصفات_' + new Date().toISOString().split('T')[0] + '.xlsx');
}

function compareRecipes() {
  if (!RECIPES.length) { alert('لا توجد وصفات للمقارنة.'); return; }
  _compareRecipesData = RECIPES.slice();
  renderCompareTable();
  openModal('modal-compare-recipes');
}
var _compareRecipesData = [];
function renderCompareTable() {
  var html = '<table id="compare-recipes-table" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#e0f2f1;color:#004d40;"><th style="padding:8px;border:1px solid #b2dfdb;text-align:right;">الوصفة</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;">عدد الخامات</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;">تكلفة الفرد</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;width:60px;"></th></tr></thead><tbody>';
  _compareRecipesData.forEach(function(r){
    var totalCost = 0, missing = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
      else missing++;
    });
    var costPerPerson = totalCost / (r.base || 1);
    html += '<tr style="border-bottom:1px solid #e0e0e0;"><td style="padding:8px;border:1px solid #e0e0e0;text-align:right;font-weight:700;">' + r.name + '</td><td style="padding:8px;border:1px solid #e0e0e0;text-align:center;">' + totalItems + '</td><td style="padding:8px;border:1px solid #e0e0e0;text-align:center;font-weight:700;color:#2e7d32;font-size:15px;">' + (costPerPerson > 0 ? formatQty(costPerPerson) + ' ج.م' : (missing > 0 ? '⚠️' : '—')) + '</td>' +
      '<td style="padding:8px;border:1px solid #e0e0e0;text-align:center;"><button class="btn" onclick="analyzeRecipe(\'' + r.name.replace(/'/g,"\\'") + '\')" style="padding:2px 8px;font-size:11px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;">🔍 تحليل</button></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('compare-recipes-table-wrap').innerHTML = html;
}
function analyzeRecipe(name) {
  var r = RECIPES.find(function(x){ return x.name === name; });
  if (!r) return;
  var totalCost = 0, missing = 0;
  var rows = (r.items||[]).map(function(it){
    var cost = getIngCost(it.n, it.u);
    var lineCost = cost !== undefined ? cost * it.q : undefined;
    if (lineCost !== undefined) totalCost += lineCost; else missing++;
    return '<tr><td style="padding:6px;border:1px solid #e0e0e0;">' + it.n + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + it.u + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + formatQty(it.q) + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + (cost !== undefined ? cost.toFixed(2) : '<span style="color:#c62828;">⚠️</span>') + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;font-weight:700;' + (lineCost !== undefined ? 'color:#1565c0;' : 'color:#c62828;') + '">' + (lineCost !== undefined ? formatQty(lineCost) + ' ج.م' : '⚠️') + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;color:#2e7d32;font-weight:700;">' + (lineCost !== undefined ? (lineCost / (r.base || 1)).toFixed(2) + ' ج.م' : '—') + '</td></tr>';
  }).join('');
  var base = r.base || 1;
  var html =
    '<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<button class="btn" onclick="renderCompareTable()" style="padding:4px 12px;background:#546e7a;color:#fff;border:none;border-radius:5px;cursor:pointer;">🔙 رجوع</button>' +
    '<span style="font-weight:700;font-size:16px;">' + r.name + '</span>' +
    '<span style="color:#888;font-size:13px;">(أساس ' + base + ' فرد)</span>' +
    '</div>' +
    '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e0f2f1;">' +
    '<th style="padding:6px;border:1px solid #b2dfdb;text-align:right;">الخامة</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">الوحدة</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">الكمية</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">سعر الوحدة</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">التكلفة الكلية</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">تكلفة الفرد</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="margin-top:10px;padding:10px;background:#e8f5e9;border-radius:8px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;flex-wrap:wrap;">' +
    '<span>إجمالي التكلفة: ' + formatQty(totalCost) + ' ج.م</span>' +
    '<span style="color:#2e7d32;">تكلفة الفرد: ' + (totalCost / base).toFixed(2) + ' ج.م</span>' +
    (missing > 0 ? '<span style="color:#c62828;">⚠️ ' + missing + ' خامة بدون سعر</span>' : '') +
    '</div>';
  document.getElementById('compare-recipes-table-wrap').innerHTML = html;
}

// ===== إدارة الوصفات (إضافة / تعديل / حذف) =====
function openRecipeManager() {
  if (!requireAdmin()) return;
  renderRecipeManager();
  resetRecipeForm();
  renderChefCostEditor();
  openModal('modal-recipe-manager');
}
function renderRecipeManager() {
  var el = document.getElementById('recipe-manager-list');
  if (!el) return;
  el.innerHTML = RECIPES.map(function(r, i){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:6px;background:#fff;">'+
      '<div style="font-weight:700;">' + r.name + ' <span style="color:#888;font-size:11px;">(أساس '+r.base+' فرد)</span></div>'+
      '<div style="display:flex;gap:6px;">'+
        '<button class="btn btn-secondary" style="padding:3px 10px;font-size:12px;" onclick="editRecipe('+i+')">✏️ تعديل</button>'+
        '<button class="btn btn-danger" style="padding:3px 10px;font-size:12px;" onclick="deleteRecipe('+i+')">🗑️ حذف</button>'+
      '</div></div>';
  }).join('');
}
function deleteRecipe(i) {
  if (!confirm('حذف وصفة "' + RECIPES[i].name + '"؟')) return;
  RECIPES.splice(i, 1); saveChefRecipes(); renderRecipeManager(); refreshChefDishOptions();
}
function editRecipe(i) {
  var r = RECIPES[i];
  document.getElementById('rm-name').value = r.name;
  document.getElementById('rm-base').value = r.base;
  document.getElementById('rm-edit-idx').value = i;
  var ingWrap = document.getElementById('rm-ingredients');
  ingWrap.innerHTML = '';
  (r.items||[]).forEach(function(it){ addRecipeIngredientRow(it.n, it.u, it.q); });
  document.getElementById('rm-title').textContent = 'تعديل وصفة';
  document.getElementById('rm-save-btn').textContent = '💾 حفظ التعديلات';
}
function addRecipeIngredientRow(n, u, q) {
  var wrap = document.getElementById('rm-ingredients');
  var div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:5px;align-items:center;flex-wrap:wrap;';
  div.innerHTML =
    '<div class="ac-wrap" style="flex:2;min-width:130px;position:relative;">'+
    '<input type="text" class="rm-ing-name ac-input" value="'+(n||'')+'" placeholder="الخامة" autocomplete="off" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'+
    '<div class="ac-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ccc;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div></div>'+
    '<select class="rm-ing-unit" style="padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;"><option>كجم</option><option>جم</option><option>لتر</option><option>عدد</option><option>وحدة</option><option>كيس</option><option>ربطة</option><option>زجاجة</option><option>شيكارة</option><option>متر</option><option>لفة</option></select>'+
    '<input type="number" class="rm-ing-qty" value="'+(q!==undefined?q:'')+'" placeholder="الكمية" min="0" step="0.01" style="width:90px;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;">'+
    '<button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:3px 8px;font-size:11px;">✕</button>';
  var sel = div.querySelector('.rm-ing-unit');
  if (u) sel.value = u;
  wrap.appendChild(div);
  setupAutocomplete(div.querySelector('.ac-input'));
}
function saveRecipe() {
  var name = document.getElementById('rm-name').value.trim();
  var base = parseInt(document.getElementById('rm-base').value) || 1;
  if (!name) { alert('ادخل اسم الوصفة.'); return; }
  var items = [];
  document.querySelectorAll('#rm-ingredients > div').forEach(function(row){
    var inp = row.querySelector('.rm-ing-name');
    if (!inp) return;
    var n = inp.value.trim();
    if (!n) return;
    var u = (row.querySelector('.rm-ing-unit') || {}).value || '';
    var q = parseFloat((row.querySelector('.rm-ing-qty') || {}).value);
    if (isNaN(q)) q = 0;
    items.push({ n:n, u:u, q:q });
  });
  var idx = parseInt(document.getElementById('rm-edit-idx').value);
  if (idx >= 0 && RECIPES[idx]) { RECIPES[idx].name = name; RECIPES[idx].base = base; RECIPES[idx].items = items; }
  else {
    if (RECIPES.some(function(r){ return r.name === name; })) { alert('الوصفة موجودة بالفعل.'); return; }
    RECIPES.push({ name:name, base:base, items:items });
  }
  saveChefRecipes();
  closeModal('modal-recipe-manager');
  refreshChefDishOptions();
  alert('تم حفظ الوصفة بنجاح.');
}
function refreshChefDishOptions() {
  document.querySelectorAll('#chef-dishes-list .chef-dish-select').forEach(function(sel){
    var cur = sel.value;
    sel.innerHTML = '<option value="">— اختر الصنف —</option>' + RECIPES.map(function(r,i){ return '<option value="'+i+'">'+r.name+'</option>'; }).join('');
    if (cur) sel.value = cur;
  });
  // تحديث قائمة الاكتمال التلقائي للخامات
  var dl = document.getElementById('chef-ing-master');
  if (dl) {
    var names = {};
    RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ names[it.n]=1; }); });
    Object.keys(CHEF_ING_COSTS).forEach(function(k){ names[k.split('|')[0]]=1; });
    dl.innerHTML = Object.keys(names).map(function(n){ return '<option value="'+n+'">'; }).join('');
  }
}
function exportRecipes() {
  var rows = [['اسم الوصفة','أساس (فرد)','الخامة','الوحدة','الكمية']];
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      rows.push([r.name, r.base, it.n, it.u, it.q]);
    });
  });
  var ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1['!cols'] = [{wch:25},{wch:10},{wch:20},{wch:8},{wch:10}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'الوصفات');
  // الأسعار
  var priceRows = [['الخامة','الوحدة','السعر']];
  Object.keys(CHEF_ING_COSTS).sort().forEach(function(k){
    var parts = k.split('|');
    priceRows.push([parts[0], parts[1]||'', CHEF_ING_COSTS[k]]);
  });
  var ws2 = XLSX.utils.aoa_to_sheet(priceRows);
  ws2['!cols'] = [{wch:25},{wch:8},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws2, 'الأسعار');
  // بدون سعر: خامات في الوصفات مش لاقيالهاش سعر
  var missingKeys = {}, missingRows = [['الخامة','الوحدة','الوصفات اللي فيها']];
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      var k = it.n+'|'+it.u;
      if (CHEF_ING_COSTS[k] === undefined) {
        if (!missingKeys[k]) missingKeys[k] = [];
        if (missingKeys[k].indexOf(r.name) === -1) missingKeys[k].push(r.name);
      }
    });
  });
  Object.keys(missingKeys).sort().forEach(function(k){
    var parts = k.split('|');
    missingRows.push([parts[0], parts[1]||'', missingKeys[k].join('، ')]);
  });
  if (missingRows.length > 1) {
    var ws3 = XLSX.utils.aoa_to_sheet(missingRows);
    ws3['!cols'] = [{wch:25},{wch:8},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws3, 'بدون سعر');
  }
  XLSX.writeFile(wb, 'وصفات_الطباخ_' + new Date().toISOString().slice(0,10) + '.xlsx');
}
function importRecipes(inp) {
  if (!inp.files || !inp.files[0]) return;
  if (!confirm('استيراد الوصفات سيحل محل الوصفات الحالية. هل أنت متأكد؟')) { inp.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'array'});
      var newRecipes = [];

      // محاولة قراءة من الصيغة القديمة (كل وصفة sheet + اسعار)
      var priceSheet = wb.Sheets['اسعار'] || wb.Sheets['الأسعار'];
      wb.SheetNames.forEach(function(sn){
        if (sn === 'اسعار' || sn === 'الأسعار' || sn === 'الوصفات') return;
        var ws = wb.Sheets[sn];
        var rows = XLSX.utils.sheet_to_json(ws, {header:1});
        if (!rows || rows.length < 2) return;
        var name = rows[0][0] ? String(rows[0][0]).trim() : sn.trim();
        var base = 380;
        if (rows[0][1]) { var m = String(rows[0][1]).match(/\d+/); if (m) base = parseInt(m[0]); }
        var items = [];
        for (var i = 1; i < rows.length; i++) {
          var r = rows[i];
          if (r[2]) { items.push({ n:String(r[2]).trim(), u:(r[1]||'').toString().trim(), q:parseFloat(r[0])||0 }); }
        }
        if (items.length) newRecipes.push({ name:name, base:base, items:items });
      });

      // لو مفيش حاجة، جرب صيغة التصدير (الوصفات sheet واحد)
      if (newRecipes.length === 0) {
        var ws1 = wb.Sheets['الوصفات'];
        if (ws1) {
          var data = XLSX.utils.sheet_to_json(ws1, {header:1});
          var recipesByName = {};
          data.forEach(function(row, i){
            if (i === 0) return;
            if (!row || !row.length) return;
            var name = row[0], base = row[1], ing = row[2], unit = row[3], qty = row[4];
            if (name && typeof name === 'string' && name.trim()) {
              if (!recipesByName[name.trim()]) recipesByName[name.trim()] = { name:name.trim(), base:parseInt(base)||380, items:[] };
              if (ing && typeof ing === 'string' && ing.trim()) {
                recipesByName[name.trim()].items.push({ n:ing.trim(), u:(unit||'').toString().trim(), q:parseFloat(qty)||0 });
              }
            } else if (ing && typeof ing === 'string' && ing.trim()) {
              // لو مفيش اسم جديد، ضيف آخر وصفة (للتنسيق القديم)
              var keys = Object.keys(recipesByName);
              if (keys.length) recipesByName[keys[keys.length-1]].items.push({ n:ing.trim(), u:(unit||'').toString().trim(), q:parseFloat(qty)||0 });
            }
          });
          Object.keys(recipesByName).forEach(function(k){ newRecipes.push(recipesByName[k]); });
        }
      }

      if (newRecipes.length) {
        RECIPES.length = 0; newRecipes.forEach(function(r){ RECIPES.push(r); });
        saveChefRecipes();
        renderRecipeManager(); refreshChefDishOptions();
        alert('تم استيراد ' + newRecipes.length + ' وصفة من Excel.');
      } else { alert('لم يتم العثور على وصفات في الملف.'); }

      // الأسعار
      if (priceSheet) {
        var priceData = XLSX.utils.sheet_to_json(priceSheet, {header:1});
        var imported = 0;
        priceData.forEach(function(row, i){
          if (i === 0) return;
          if (row[1] && row[3] !== undefined && row[3] !== null) {
            CHEF_ING_COSTS[String(row[1]).trim()+'|'+(row[2]||'').toString().trim()] = parseFloat(row[3]);
            imported++;
          } else if (row[0] && row[2] !== undefined && row[2] !== null) {
            CHEF_ING_COSTS[String(row[0]).trim()+'|'+(row[1]||'').toString().trim()] = parseFloat(row[2]);
            imported++;
          }
        });
        if (imported) { saveChefIngCosts(); renderChefCostEditor(); }
      }
    } catch(err) { alert('فشل قراءة الملف: ' + err.message); }
    inp.value = '';
  };
  reader.readAsArrayBuffer(inp.files[0]);
}
function resetRecipeForm() {
  document.getElementById('rm-name').value = '';
  document.getElementById('rm-base').value = 380;
  document.getElementById('rm-edit-idx').value = -1;
  document.getElementById('rm-ingredients').innerHTML = '';
  document.getElementById('rm-title').textContent = '⚙️ إضافة وصفة جديدة';
  document.getElementById('rm-save-btn').textContent = '💾 حفظ الوصفة';
}
function renderChefCostEditor() {
  var el = document.getElementById('chef-cost-editor');
  if (!el) return;
  var ingMap = {};
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      var key = it.n+'|'+it.u;
      if (!ingMap[key]) ingMap[key] = { name: it.n, unit: it.u };
    });
  });
  var keys = Object.keys(ingMap).sort();
  el.innerHTML = keys.map(function(k){
    var item = ingMap[k];
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #eee;font-size:13px;">'+
      '<span>'+item.name+' <span style="color:#888;font-size:11px;">('+item.unit+')</span></span>'+
      '<span>'+getIngCostInput(item.name, item.unit)+'</span></div>';
  }).join('');
}


function formatQty(q){
  if(!isFinite(q)) return '0';
  var r=Math.round(q*1000)/1000;
  return (Math.abs(r-Math.round(r))<0.001)? String(Math.round(r)) : (Math.round(q*100)/100).toFixed(2);
}
