$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
$sel = $word.Selection
$doc.PageSetup.RightMargin = 28.35
$doc.PageSetup.LeftMargin = 28.35
$doc.PageSetup.TopMargin = 28.35
$doc.PageSetup.BottomMargin = 28.35

function AddStyleText {
  param($text, $size, $bold, $color)
  $sel.Font.Size = $size
  $sel.Font.Bold = $bold
  $sel.Font.Name = 'Arial'
  $sel.Font.Color = $color
  $sel.TypeText($text)
}

function AddHeading {
  param($text, $size, $color)
  AddStyleText -text $text -size $size -bold $true -color $color
  $sel.TypeParagraph()
}

function AddPara {
  param($text, $size)
  AddStyleText -text $text -size $size -bold $false -color 0
  $sel.TypeParagraph()
}

function AddBullet {
  param($text)
  $sel.Font.Size = 11
  $sel.Font.Bold = $false
  $sel.Font.Name = 'Arial'
  $sel.Font.Color = 0
  $sel.ParagraphFormat.LeftIndent = 28
  $sel.TypeText("  $text")
  $sel.TypeParagraph()
  $sel.ParagraphFormat.LeftIndent = 0
}

function AddLine {
  $sel.Font.Size = 10
  $sel.Font.Bold = $false
  $sel.TypeText("_" * 80)
  $sel.TypeParagraph()
}

function AddTable {
  param($headers, $rows)
  $tbl = $doc.Tables.Add($sel.Range, $rows.Count + 1, $headers.Count)
  $tbl.Borders.Enable = 1
  for ($c = 0; $c -lt $headers.Count; $c++) {
    $cell = $tbl.Cell(1, $c + 1)
    $cell.Range.Font.Size = 10
    $cell.Range.Font.Bold = $true
    $cell.Range.Font.Name = 'Arial'
    $cell.Range.Text = $headers[$c]
    $cell.Shading.BackgroundPatternColor = 57
    $cell.Range.Font.Color = 16777215
  }
  for ($r = 0; $r -lt $rows.Count; $r++) {
    for ($c = 0; $c -lt $rows[$r].Count; $c++) {
      $cell = $tbl.Cell($r + 2, $c + 1)
      $cell.Range.Font.Size = 10
      $cell.Range.Font.Name = 'Arial'
      $cell.Range.Font.Color = 0
      $cell.Range.Text = $rows[$r][$c]
    }
  }
  $sel.EndKey(6)
  $sel.TypeParagraph()
}

# ========== TITLE ==========
$sel.TypeParagraph()
$sel.TypeParagraph()
$sel.TypeParagraph()

AddHeading -text "Biogas Plant 100m3 - Fixed Dome Design" -size 28 -color 0x333399
AddHeading -text "Neutral Egyptian Arabic + English - Detailed Engineering Report" -size 18 -color 0x993300
$sel.TypeParagraph()
AddPara -text "مشروع إنتاج الغاز الحيوي من المخلفات العضوية - السعة: 100 م3" -size 14
AddPara -text "Capacity: 100m3 | HRT: 35-40 days | Gas: 60-70 m3/day | Methane: 55-65%" -size 12
$sel.TypeParagraph()
AddLine
$sel.TypeParagraph()

# ========== 1. SYSTEM OVERVIEW ==========
AddHeading -text "1. System Overview / نظرة عامة" -size 18 -color 0x003366
$sel.TypeParagraph()
AddPara -text "English: The 100m3 fixed dome biogas plant processes organic waste (animal manure, agricultural residues, food waste) under mesophilic conditions (30-40 C) to produce biogas (60-70 m3/day) and nutrient-rich digestate fertilizer. The system operates at 25-30 mbar pressure with 35-40 day retention time." -size 11
$sel.TypeParagraph()
AddPara -text "بالعربي: محطة البيوجاز 100 م3 بنظام القبة الثابتة لمعالجة المخلفات العضوية (روث حيواني - مخلفات زراعية - طعام) في ظروف ميزوفيليكية (30-40 درجة مئوية) لإنتاج الغاز الحيوي (60-70 م3/يوم) والسماد العضوي الغني. تعمل بضغط 25-30 ملي بار وزمن احتجاز 35-40 يوم." -size 11
$sel.TypeParagraph()

# ========== 2. KEY PARAMETERS ==========
AddHeading -text "2. Key Design Parameters / معايير التصميم" -size 18 -color 0x003366
$sel.TypeParagraph()

AddTable -headers @("Parameter / المعيار", "Value / القيمة", "Notes / ملاحظات") -rows @(
  @("Total volume / الحجم الكلي", "100 m3", "Fixed dome RC/HDPE"),
  @("Active volume / منطقة الطي", "75 m3", "Waste + water"),
  @("Gas dome / قبة الغاز", "25 m3", "Gas storage"),
  @("HRT / زمن العلاج", "35-40 days / يوم", "Inside digester"),
  @("Depth / العمق", "5-7 m / متر", "Underground / تحت الارض"),
  @("Diameter / القطر", "6-8 m / متر", "Cylindrical / اسطواني"),
  @("Temperature / درجة الحرارة", "30-40 C / م", "Mesophilic / ميزوفيليكي"),
  @("Material / مادة البناء", "RC C30 / HDPE", "Acid resistant / مقاوم"),
  @("Feed rate / معدل التغذية", "3.0-3.5 kg VS/m3/day", "Volatile solids"),
  @("Gas output / انتاج الغاز", "60-70 m3/day / م3/يوم", "Daily / يوميا"),
  @("Methane / الميثان", "55-65%", "CH4 content"),
  @("Raw H2S / H2S خام", "500-3000 ppm", "Needs treatment / يحتاج تنقية"),
  @("Final H2S / H2S نهائي", "<=5 ppm", "After treatment / بعد التنقية"),
  @("Operating pressure / ضغط", "25-30 mbar / ملي بار", "Inside digester"),
  @("Estimated cost / التكلفة", "USD 12,000-18,000", "Varies by location")
)

# ========== 3. COMPONENTS ==========
AddHeading -text "3. Component Details / شرح المكونات" -size 18 -color 0x003366
$sel.TypeParagraph()

$comps = @(
  @{t="(1) Mixing Pit / حفرة الخلط"; d="Receives organic waste, mixes with water 1:1 to 1:3 before feeding the digester. / تستقبل المخلفات العضوية وتخلطها بالماء قبل التغذية.";
    b=@("Volume / السعة: 4-5 m3","Motor / المحرك: Electric auger 1.5-3 kW","Material / الخامة: RC coated with epoxy / خرسانة مطلية ايبوكسي","Mixing time / وقت الخلط: 15-30 min before each feed")},
  @{t="(2) Inlet Chamber / غرفة المدخل"; d="PVC pipe connecting mixing pit to digester bottom, prevents gas escape. / انبوب يصل حفرة الخلط بقاع المفاعل ويمنع خروج الغاز.";
    b=@("Pipe / الانبوب: PVC 200 mm diameter","Slope / الميل: 15 degrees towards digester","Gate valve / صمام بوابة: For maintenance / للصيانة","Length / الطول: 5-8 m depending on depth")},
  @{t="(3) Fixed Dome Digester / هضم القبة الثابتة"; d="Anaerobic reactor where bacteria decompose organic matter to produce biogas. / مفاعل لاهوائي تتحلل فيه المواد بواسطة البكتيريا.";
    b=@("Total / الكلي: 100 m3 (75 m3 liquid + 25 m3 gas dome)","Depth / العمق: 5-7 m underground","Diameter / القطر: 6-8 m cylindrical with dome","Temperature / الحرارة: 30-40 C mesophilic","HRT / المدة: 35-40 days","Material / الخامة: RC C30 or HDPE welded","Pressure / الضغط: 25-30 mbar","Gas outlet / مخرج الغاز: PE 50 mm pipe from top")},
  @{t="(4) Condensate Trap / مصيدة المكثفات"; d="Removes condensed water vapor from raw gas line. / تصريف بخار الماء المتكثف من خط الغاز.";
    b=@("Volume / الحجم: 100 liter","Material / الخامة: PVC or PP","U-trap: 30 cm water column","Drain / التصريف: Manual, weekly / يدوي اسبوعيا","Prevents water reaching treatment stages")},
  @{t="(5) Iron Sponge / اسفنجة الحديد (H2S Removal / ازالة H2S)"; d="First treatment stage - removes hydrogen sulfide using iron oxide. / المرحلة الأولى لازالة كبريتيد الهيدروجين.";
    b=@("Media / الوسائط: Fe2O3 on wood chips 300-400 kg","Efficiency / الكفاءة: 85-95% H2S removal","Outlet / المخرج: <=100 ppm H2S","Vessel / الوعاء: 60 cm dia x 120 cm H","Media life / العمر: 6-8 months","Regeneration / التجدد: Air exposure 24-48 hrs","Regeneration cycles: 3-5 times before replacement")},
  @{t="(6) Activated Carbon / مفعل الكربون"; d="Polishing stage - removes remaining H2S and odors. / مرحلة تلميع نهائي لازالة H2S والروائح.";
    b=@("Media / الوسائط: Impregnated AC 80-120 kg","Final H2S: <=5 ppm","Vessel / الوعاء: 40 cm dia x 100 cm H","Life / العمر: 8-12 months","Low flow configuration for contact time")},
  @{t="(7) Silica Gel Dryer / مجفف سيليكا جل"; d="Dual bed dryer removes moisture to protect final equipment. / تجفيف الغاز لازالة الرطوبة وحماية المعدات.";
    b=@("System / النظام: Dual bed / سرير مزدوج","Each bed / كل سرير: 60-80 liter silica gel","Dew point / نقطة الندى: -20 to -40 C","Regeneration / التجدد: Heat 120 C for 3 hrs","Cycle / الدورة: Every 2-3 weeks","Transparent body for color check - blue=dry, pink=wet")},
  @{t="(8) Gas Storage / خزان تخزين الغاز"; d="Double membrane storage for clean dry gas. / تخزين الغاز النظيف الجاف.";
    b=@("Type / النوع: Double membrane / غشاء مزدوج","Volume / الحجم: 25-30 m3","Size / المقاس: 6 m dia x 4 m height","Material / الخامة: Reinforced PVC 2 mm","Pressure / الضغط: 25-30 mbar","Safety valve / صمام امان: At 40 mbar")},
  @{t="(9) Pressure Regulator / منظم الضغط"; d="Reduces and regulates gas pressure for end-use appliances. / تخفيض وتنظيم ضغط الغاز للاستخدام.";
    b=@("Output / الخرج: 15-25 mbar","With pressure gauge / بمقياس ضغط","Safety shut-off / صمام امان","Gas filter before regulator")}
)

foreach ($c in $comps) {
  AddHeading -text $c.t -size 14 -color 0x004d00
  AddPara -text $c.d -size 11
  $sel.TypeParagraph()
  AddPara -text "Details / التفاصيل الفنية:" -size 11
  $sel.TypeParagraph()
  foreach ($bb in $c.b) {
    AddBullet -text $bb
  }
  $sel.TypeParagraph()
}

# ========== 4. END USES ==========
AddHeading -text "4. End Uses / استخدامات الغاز" -size 18 -color 0x003366
$sel.TypeParagraph()

$uses = @(
  @{t="Cooking / الطبخ"; d="8-10 hrs/day, 4-6 burners ~30 m3/day";
    b=@("Biogas stoves / مواقد بيوجاز","Oven for baking / فرن للخبز","Consumption: 0.3-0.5 m3/hr per burner")},
  @{t="Water Heating / تسخين المياه"; d="Gas water heater ~10 m3/day";
    b=@("Instant or tank heaters / سخانات فورية أو خزانات","For domestic and industrial use / للاستخدام المنزلي والصناعي","Water temp: 50-70 C")},
  @{t="Electricity / الكهرباء"; d="15-20 kW generator ~20-30 m3/day for 6-8 hrs";
    b=@("Dual fuel generator (gas/diesel) / مولد مزدوج","Covers plant and nearby facilities","Efficiency: 30-40% electric + 40-50% heat (CHP)")},
  @{t="Fertilizer / السماد العضوي"; d="5 m3/day liquid digestate rich in NPK";
    b=@("Liquid: NPK rich fertilizer / سماد سائل غني NPK","Solid: Can be dried as soil conditioner","Dilute 1:3 with water before irrigation","Chemical-free / خال من المواد الكيميائية - مناسب للزراعة العضوية")}
)

foreach ($u in $uses) {
  AddHeading -text $u.t -size 14 -color 0x004d00
  AddPara -text $u.d -size 11
  $sel.TypeParagraph()
  foreach ($bb in $u.b) {
    AddBullet -text $bb
  }
  $sel.TypeParagraph()
}

# ========== 5. EQUIPMENT LIST ==========
AddHeading -text "5. Equipment List / قائمة المعدات" -size 18 -color 0x003366
$sel.TypeParagraph()

AddTable -headers @("#","Equipment / المعدة","Specifications / المواصفات","Qty") -rows @(
  @("1","Mixing pit / حفرة خلط","4-5 m3 with auger 1.5-3 kW","1"),
  @("2","Inlet chamber / غرفة مدخل","PVC 200 mm + gate valve","1"),
  @("3","Fixed dome digester / مفاعل","100 m3 RC/HDPE","1"),
  @("4","Condensate trap / مصيدة مكثفات","100 L PVC","1"),
  @("5","Iron sponge / اسفنجة حديد","60x120 cm, 300-400 kg Fe2O3","1"),
  @("6","Activated carbon / كربون منشط","40x100 cm, 80-120 kg","1"),
  @("7","Silica gel dryer / مجفف سيليكا","60-80 L per bed","2"),
  @("8","Gas storage / خزان غاز","25-30 m3, 6x4 m, PVC 2mm","1"),
  @("9","Pressure regulator / منظم ضغط","Output 15-25 mbar","1"),
  @("10","Feed pump / مضخة تغذية","Centrifugal 2-3 kW","1"),
  @("11","Raw gas pipeline / خط غاز خام","PE 50 mm","As needed"),
  @("12","Clean gas pipeline / خط غاز نظيف","PE 40 mm","As needed"),
  @("13","Valves and fittings / صمامات","Various","Set"),
  @("14","Electrical panel / لوحة تحكم","Switches and automation","1")
)

# ========== 6. PIPING ==========
AddHeading -text "6. Piping Network / شبكة الانابيب" -size 18 -color 0x003366
$sel.TypeParagraph()

$pipes = @(
  "Raw gas (from dome to treatment): PE 50 mm - 30 mbar rating",
  "Clean gas (after treatment to storage): PE 40 mm - 25 mbar rating",
  "Feed inlet (to digester): PVC 200 mm - 15 degree slope",
  "Digestate outlet: PVC 150 mm from digester bottom",
  "Safety valve on gas line: at 40 mbar",
  "Pressure gauges: digital at each outlet (4 points)",
  "Gas meter: digital flow meter (m3/hr)",
  "Gate valves: at each main connection point"
)
foreach ($p in $pipes) { AddBullet -text $p }
$sel.TypeParagraph()

# ========== 7. AUTOMATION ==========
AddHeading -text "7. Automation & Control / التحكم والاتمتة" -size 18 -color 0x003366
$sel.TypeParagraph()

$auto = @(
  "Temperature sensors (PT100): 3 points in digester",
  "Pressure sensors (4-20 mA): at dome and after each stage",
  "Hot-wire gas flow sensor",
  "H2S sensor (electrochemical): after iron sponge and carbon",
  "Humidity sensor after dryer",
  "PLC or microcontroller (Arduino Industrial / Siemens Logo)",
  "HMI display 7-10 inch for data visualization",
  "Audio and visual alarms for threshold exceedance",
  "Data logging via SD Card or IoT"
)
foreach ($a in $auto) { AddBullet -text $a }
$sel.TypeParagraph()

# ========== 8. SAFETY ==========
AddHeading -text "8. Safety Measures / اجراءات السلامة" -size 18 -color 0x003366
$sel.TypeParagraph()

$safe = @(
  "Pressure Relief Valve on digester dome at 40 mbar",
  "Safety valve on storage tank at 35 mbar",
  "Flame Arrestor on all gas lines at usage points",
  "Gas detector (CH4 + H2S) in equipment room",
  "Natural and forced ventilation in equipment room",
  "Fire extinguishers (CO2 + dry powder)",
  "Warning signs and safety instructions in Arabic and English",
  "Emergency shutdown and evacuation plan"
)
foreach ($s in $safe) { AddBullet -text $s }
$sel.TypeParagraph()

# ========== 9. MAINTENANCE ==========
AddHeading -text "9. Maintenance Schedule / الصيانة الدورية" -size 18 -color 0x003366
$sel.TypeParagraph()

AddTable -headers @("Activity / النشاط","Frequency / الدورية","Responsible / المسؤول") -rows @(
  @("Drain condensate trap / تصريف المكثفات","Weekly / اسبوعيا","Operator / مشغل"),
  @("Check gas pressure all points / فحص الضغط","Daily / يوميا","Operator / مشغل"),
  @("Check digester temperature / فحص الحرارة","Daily / يوميا","Operator / مشغل"),
  @("Lubricate mixer motor bearings / تزييت","Monthly / شهريا","Mechanic / فني ميكانيكا"),
  @("Inspect safety valves / فحص صمامات الامان","Monthly / شهريا","Mechanic / فني ميكانيكا"),
  @("Regenerate iron sponge / تجديد اسفنجة حديد","2-3 months","Chemist / فني كيميائي"),
  @("Check and regenerate silica gel / تجديد سيليكا","2-3 weeks","Operator / مشغل"),
  @("Replace activated carbon / استبدال كربون","8-12 months","Chemist / فني كيميائي"),
  @("Inspect storage tank for leaks / فحص خزان","Monthly / شهريا","Operator / مشغل"),
  @("Clean mixing pit and pump / تنظيف","Weekly / اسبوعيا","Worker / عامل"),
  @("Review control system / مراجعة تحكم","Quarterly / ربع سنوي","Electrician / فني كهرباء"),
  @("Inspect piping network / فحص انابيب","Monthly / شهريا","Mechanic / فني ميكانيكا")
)

# ========== 10. COST ==========
AddHeading -text "10. Cost Estimate / تقدير التكاليف" -size 18 -color 0x003366
$sel.TypeParagraph()

AddTable -headers @("Item / البند","Cost USD / التكلفة","%") -rows @(
  @("Mixing pit and motor / حفرة خلط ومحرك","800-1,200","6%"),
  @("Digester (RC + excavation + insulation) / مفاعل","5,000-7,000","38%"),
  @("Treatment system (sponge + carbon + dryer) / تنقية","1,500-2,500","14%"),
  @("Gas storage tank / خزان تخزين غاز","1,200-2,000","11%"),
  @("Pipes, valves, fittings / انابيب وصمامات","1,000-1,500","8%"),
  @("Pressure regulator and gas meter / منظم وعداد","400-700","4%"),
  @("Control and automation / تحكم واتمتة","800-1,500","8%"),
  @("Installation and commissioning / تركيب وتشغيل","1,300-1,600","11%"),
  @("Total estimated / الاجمالي التقديري","12,000-18,000","100%")
)

$sel.TypeParagraph()
AddPara -text "Note / ملاحظة: Prices are estimates and vary by location, material availability, and labor costs. / الاسعار تقديرية وتختلف حسب الموقع والمواد والعمالة." -size 10

# ========== SAVE ==========
$desktop = [Environment]::GetFolderPath('Desktop')
$path = "$desktop\biogas_100m3.docx"
$doc.SaveAs([ref]$path, [ref]16)
$doc.Close()
$word.Quit()
Write-Output "OK: $path"
