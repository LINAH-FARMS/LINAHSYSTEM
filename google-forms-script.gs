// ============================================
// Google Apps Script - API بلاغات الأعطال
// ============================================
// الخطوات:
// 1. افتح Google Forms → روابط الاستجابة (Spreadsheet)
// 2. من الشيت: Extensions → Apps Script
// 3. الصق هذا الكود بالكامل
// 4. اضغط Deploy → New Deployment → Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. انسخ الرابط الجديد وحطه في مكان URL_API في index.html

// === الفункциة الرئيسية: تخدم الطلبات ===
function doGet(e) {
  var action = e.parameter.action || 'getReports';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getReports') {
    return getReports(ss);
  } else if (action === 'getReport') {
    return getReport(ss, e.parameter.id);
  } else if (action === 'updateStatus') {
    return updateReportStatus(ss, e.parameter.id, e.parameter.status);
  } else if (action === 'getStats') {
    return getReportStats(ss);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({error: 'Invalid action'})
  ).setMimeType(ContentService.MimeType.JSON);
}

// === جلب جميع البلاغات ===
function getReports(ss) {
  var sheet = ss.getSheets()[0]; // أول شيت
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var reports = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var report = {};
    for (var j = 0; j < headers.length; j++) {
      report[headers[j]] = row[j];
    }
    report.id = i; // رقم البلاغ
    reports.push(report);
  }
  
  // ترتيب من الأحدث للأقدم
  reports.reverse();
  
  return ContentService.createTextOutput(
    JSON.stringify({success: true, count: reports.length, reports: reports})
  ).setMimeType(ContentService.MimeType.JSON);
}

// === جلب بلاغ واحد ===
function getReport(ss, id) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var rowNum = parseInt(id);
  if (rowNum >= 1 && rowNum < data.length) {
    var report = {};
    for (var j = 0; j < headers.length; j++) {
      report[headers[j]] = data[rowNum][j];
    }
    report.id = rowNum;
    return ContentService.createTextOutput(
      JSON.stringify({success: true, report: report})
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({success: false, error: 'Report not found'})
  ).setMimeType(ContentService.MimeType.JSON);
}

// === تحديث حالة البلاغ ===
function updateReportStatus(ss, id, newStatus) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // ابحث عن عمود "الحالة" أو "Status"
  var statusCol = -1;
  for (var j = 0; j < headers.length; j++) {
    if (headers[j].toString().includes('الحالة') || headers[j].toString().includes('Status')) {
      statusCol = j;
      break;
    }
  }
  
  if (statusCol === -1) {
    // أضف عمود الحالة إذا لم يكن موجوداً
    statusCol = headers.length;
    sheet.getRange(1, statusCol + 1).setValue('الحالة');
  }
  
  var rowNum = parseInt(id);
  if (rowNum >= 1 && rowNum < data.length) {
    sheet.getRange(rowNum + 1, statusCol + 1).setValue(newStatus);
    return ContentService.createTextOutput(
      JSON.stringify({success: true, message: 'Status updated'})
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({success: false, error: 'Report not found'})
  ).setMimeType(ContentService.MimeType.JSON);
}

// === إحصائيات البلاغات ===
function getReportStats(ss) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var stats = {
    total: data.length - 1,
    byType: {},
    byPriority: {},
    byStatus: {}
  };
  
  // ابحث عن الأعمدة
  var typeCol = -1, priorityCol = -1, statusCol = -1;
  for (var j = 0; j < headers.length; j++) {
    var h = headers[j].toString();
    if (h.includes('نوع') || h.includes('Type')) typeCol = j;
    if (h.includes('أولوية') || h.includes('Priority')) priorityCol = j;
    if (h.includes('الحالة') || h.includes('Status')) statusCol = j;
  }
  
  for (var i = 1; i < data.length; i++) {
    if (typeCol >= 0) {
      var type = data[i][typeCol] || 'غير محدد';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
    if (priorityCol >= 0) {
      var priority = data[i][priorityCol] || 'غير محدد';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }
    if (statusCol >= 0) {
      var status = data[i][statusCol] || 'جديد';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    }
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({success: true, stats: stats})
  ).setMimeType(ContentService.MimeType.JSON);
}

// === دعم POST للتحديثات ===
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  if (data.action === 'updateStatus') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return updateReportStatus(ss, data.id, data.status);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({error: 'Invalid action'})
  ).setMimeType(ContentService.MimeType.JSON);
}
