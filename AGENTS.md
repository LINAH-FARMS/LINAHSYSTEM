# لينة فارمز - نظام إداري متكامل

## بنية المشروع
نظام إداري متكامل للمزرعة يعمل بالكامل في المتصفح (SPA). يستخدم LocalStorage/IndexedDB للتخزين، مع دعم Supabase للمزامنة السحابية.

## ملفات تطبيق سطح المكتب (Electron)
| الملف | الدور |
|-------|-------|
| `package.json` | إعدادات المشروع: اسم، إصدار، سكريبتات (`npm start` للتشغيل، `npm run dist` للبناء) |
| `main.js` | عملية Electron الرئيسية: إنشاء النافذة، القوائم (ملف، عرض، مساعدة)، IPC للنسخ الاحتياطي والتصدير |
| `preload.js` | جسر بين المتصفح و Node.js: يعرض `electronAPI.isDesktop`, `saveFile`, `readBackup` |
| `setup.ps1` | سكريبت تثبيت: يشغل `npm install` لتثبيت Electron |
> ⚠️ يتطلب اتصال إنترنت لتشغيل `setup.ps1` أو `npm install` لأول مرة. بعدها يشغل بـ `npm start`.

## الملفات الأساسية

| الملف | الدور | الحجم |
|-------|-------|-------|
| `index.html` | الهيكل الرئيسي (شريط أدوات، لوحة تحكم، كل التابات) | 2850 سطر / 262 KB |
| `styles.css` | جميع الأنماط (40 KB) | |
| `core.js` | طبقة التخزين: `_lsGet`, `_lsSet`, `_lsRemove`, `_idbCache`, `_migrateAllToIDB` | 2.5 KB |
| `database.js` | طبقة IndexedDB: `_openIDB`, `_idbGet`, `_idbPut`, `_idbDelete`, الترحيل | 11 KB |
| `init-data.js` | البيانات الثابتة: الموظفون، الرواتب، الغرف، المخازن، إلخ | 82 KB |
| `app.js` | منطق التطبيق الرئيسي: لوحة التحكم، الموظفون، الإسكان، الإجازات، الضيافة، الوجبات، المخازن، الصيانة، البيارات، المخابز، قيود الصرف | 12,837 سطر / 915 KB |
| `app-extra.js` | دوال إضافية: تقارير إضافية، `exportDailyStatsToExcel`، `exportPdfActiveTab`، accessibility | 71 KB |
| `charts-init.js` | يحوّل رسومات Canvas 2D في لوحة التحكم إلى Charts.js متفاعلة مع Tooltips و Hover و Animation | 4 KB |
| `pdf-export.js` | تصدير PDF احترافي عبر html2pdf.js مع ترويسة خضراء وتنسيق كامل وزر في شريط الأدوات | 5 KB |
| `excel-style.js` | أدوات تنسيق Excel احترافية: `ExcelStyle` object مع `makeSheet`, `autoColWidth`, `styleHeaderRow`, `addFilter`, `freezeRow` | 4 KB |
| `excel-enhancer.js` | يحسن دوال التصدير الموجودة: يغلف دوال `exportXxxToExcel` مع `ExcelStyle.makeSheet` للترويسة الخضراء والفلتر والتجميد. يطبق على: Employees, MealLog, Inventory, Vacations, Hospitality, Excluded, TeaSugar, Septic, PeriodicMaint, Contractors, BakeryProduction, BakeryContractorSupplies, BakeryIngredients, BakeryInvoices, Evaluations, Housing | 8 KB |
| `reports-enhanced.js` | تقرير شامل 7 شيتات + `exportComprehensiveReport()` + زر يُضاف تلقائياً في toolbar | 6 KB |
| `finance.js` | التقارير المالية: `finExportExcel` (4 sheets), `finExportPDF`, `finExportProfessional` (5 sheets) — تمت إضافة تنسيق ExcelStyle | 1402 سطر |
| `script.js` | سكريبتات تشغيل عند التحميل (defer) | |
| `linah_sanitizer.js` | تطهير البيانات من XSS | |
| `hr_fill.js` | تعبئة بيانات HR | |
| `stores_import.js` | استيراد بيانات المخازن | |

## ترتيب تحميل السكريبتات
1. `core.js` ← `database.js` ← `init-data.js` ← `app.js` (في `<head>`)
2. `excel-style.js` ← `reports-enhanced.js` ← `app-extra.js` ← `hr_fill.js` ← `stores_import.js` (قبل `</body>`)
3. `xlsx.full.min.js`, `html2pdf.bundle.min.js`, `chart.js`, `script.js`, `finance.js` (في `<head>` مع `defer`)

## المتغيرات العامة الهامة (window.*)
- `employees` — مصفوفة الموظفين
- `roomsCapacity` — مصفوفة الغرف/السكن
- `mealLog` — سجل الوجبات
- `inventoryItems` — أصناف المخازن
- `hospitalities` — الضيافة
- `vacations` — الإجازات
- `maintenanceTasks` — مهام الصيانة
- `bakeryProductions` — إنتاج المخبز
- `bakeryContractorSupplies` — توريد المخابز
- `teaSugarStock` / `teaSugarLog` — مخزون الشاي والسكر

## دوال التصدير (Excel)
- `exportComprehensiveReport()` — تقرير شامل 7 شيتات (reports-enhanced.js)
- `exportStyledExcel(title, sheets)` — دالة مساعدة لإنشاء Excel مُنسّق
- `exportDailyStatsToExcel()` — إحصائيات يومية (app-extra.js)
- `exportSelectedToExcel()` — تصدير التاب النشط (app.js ~12400)
- `exportPdfActiveTab()` — تصدير PDF للتاب النشط
- `exportEmployeesToExcel()` — تصدير الموظفين (app.js ~7529)
- `exportHousingToExcel()` — تصدير السكن (app.js ~7688)
- `exportMealsToExcel()` — تصدير الوجبات (app.js ~8266)
- دوال تصدير المخبز (app.js ~10160+)
- `finExportExcel()`, `finExportPDF()`, `finExportProfessional()` (finance.js)

## تطبيق سطح المكتب (Electron)
- `main.js` يتطلب Electron package — شغّل `setup.ps1` أو `npm install` لتثبيته
- بعد التثبيت، `npm start` يفتح التطبيق في نافذة سطح مكتب
- `preload.js` يعرض `window.electronAPI` للمتصفح:
  - `electronAPI.isDesktop` — `true` داخل Electron
  - `electronAPI.saveFile(filePath, data)` — حفظ ملف على القرص
  - `electronAPI.readBackup(filePath)` — قراءة ملف JSON
- القوائم: ملف (فتح نسخة احتياطية، تصدير بيانات، طباعة)، عرض (تكبير، أدوات مطور)، مساعدة

## قواعد للذكاء المساعد
1. لا تستخدم `var` في الكود الجديد — استخدم `let`/`const`
2. التطبيق يعمل بالعربية (RTL) — كل واجهة المستخدم والإبلاغ بالعربية
3. الملفات كبيرة (app.js 12,837 سطر) — تجنب تعديلها، أضف ملفات جديدة بدلاً من ذلك
4. `stripEmoji()` موجودة في app.js كدالة محلية — إذا احتجتها في ملف خارجي، عرّف نسختك الخاصة
5. `showAlert()` غير موجودة — استخدم `alert()` مباشرة أو `_reportAlert`
6. SheetJS v0.18.5 (community) — `XLSX.utils.aoa_to_sheet()`, `XLSX.utils.book_new()`, `XLSX.writeFile()`
7. Chart.js v4.4.1 متاح — لوحة التحكم تستخدم `charts-init.js` لتحويل الرسومات Canvas 2D إلى Charts.js. لأي رسوم بيانية جديدة استخدم Chart.js دائماً
8. استخدم `ExcelStyle` من excel-style.js لجميع تصديرات Excel الجديدة
9. لا تخلق ملفات README.md أو توثيق إلا بطلب صريح
10. الملفات القديمة `LINAHSYSTEM.html` و `index.html.backup*` هي نسخ احتياطية — أهملها