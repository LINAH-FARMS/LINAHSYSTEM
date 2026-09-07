'use strict';
const fs = require('fs');
const path = require('path');

function makeEl() {
  return { innerHTML: '', value: '', style: {}, parentElement: { style: {} }, getContext: () => ({}) };
}
const els = Object.create(null);
global.window = {};
global.document = {
  getElementById: (id) => (els[id] || (els[id] = makeEl())),
  addEventListener: () => {},
};
global.Chart = function () { this.destroy = () => {}; };
global.alert = (m) => { throw new Error('alert: ' + m); };
global.XLSX = { utils: { json_to_sheet: () => ({}), book_new: () => ({}), book_append_sheet: () => {} }, writeFile: () => {} };

// محاكاة let globals: متاحة بالاسم المباشر فقط، غير موجودة على window
global.bakeryProductions = [
  { date: '2026-09-05', breadCount: 3000, flourUsed: 150, branUsed: 8, saltUsed: 1.2, yeastUsed: 3.5, dieselUsed: 30 },
  { date: '2026-09-05', breadCount: 2500, flourUsed: 130, branUsed: 6, saltUsed: 1.0, yeastUsed: 3.0, dieselUsed: 25 },
];
global.bakeryContractorSupplies = [
  { date: '2026-09-05', name: 'محمد', count: 500, ingredients: { flour: 25, bran: 1.5, salt: 0.2, yeast: 0.5, diesel: 5.5 } },
  { date: '2026-09-06', name: 'سعيد', count: 700, ingredients: { ING001: 35, ING004: 2.1, ING003: 0.3, ING002: 0.7, ING007: 7.7 } },
  { date: '2026-09-07', name: 'علي', count: 300, ingredients: {} },
];

console.log('window.bakeryProductions undefined?', typeof window.bakeryProductions === 'undefined');

eval(fs.readFileSync(path.join(__dirname, 'bakery-consumption-detail.js'), 'utf8'));

// بدون تحديد التواريخ أولاً => المفروض يضبط المدى تلقائياً (آخر 7 أيام)
window.renderBakeryConsumptionTable();
console.log('after render: from=', els['bakeryConsFrom'].value, 'to=', els['bakeryConsTo'].value);

const data = window.computeBakeryConsumptionForRange('2026-09-01', '2026-09-07');
const d0506 = data.filter(s => s.date === '2026-09-05' || s.date === '2026-09-06');
console.log('data rows:', data.length, '| 09-05:', JSON.stringify(d0506[0]), '| 09-06:', JSON.stringify(d0506[1]));

const thead = els['bakery-consumption-thead'].innerHTML;
console.log('has rowspan="2":', thead.includes('rowspan="2"'));
console.log('has colspan="5":', thead.includes('colspan="5"'));
console.log('bad style-rowspan gone:', !thead.includes(';rowspan:'));
console.log('cols in header row1:', (thead.split('<tr>')[1].match(/<th/g) || []).length,
  '| row2:', (thead.match(/<tr>/g) || []).length >= 2 ? (thead.split('<tr>')[2].match(/<th/g) || []).length : 0);

const tbody = els['bakery-consumption-tbody'].innerHTML;
console.log('tbody has الإجمالي row:', tbody.includes('الإجمالي'));
console.log('tbody has real numbers (dقيق):', tbody.includes('280'), tbody.includes('25'));

window.renderBakeryChart(data);
const d07 = data.filter(s => s.date === '2026-09-07');
const d06 = data.filter(s => s.date === '2026-09-06');
const d01 = data.filter(s => s.date === '2026-09-01');
console.log('CHART OK');
console.log('range includes 09-01?', d01.length === 1, '| 09-07 included?', d07.length === 1);
console.log('ING-mapped 09-06 ctr:', d06[0] && JSON.stringify({ flour: d06[0].ctrFlour, bran: d06[0].ctrBran, salt: d06[0].ctrSalt, yeast: d06[0].ctrYeast, diesel: d06[0].ctrDiesel }));
console.log('empty ingredients 09-07 breadCtr:', d07[0] && d07[0].breadCtr, 'ctrFlour:', d07[0] && d07[0].ctrFlour);