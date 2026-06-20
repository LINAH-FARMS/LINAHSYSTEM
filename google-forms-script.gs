// ============================================
// Google Apps Script - API بلاغات الأعطال
// ============================================
// الخطوات:
// 1. افتح Google Forms → ردود → ربط بشيت
// 2. في الشيت: Extensions → Apps Script
// 3. الصق هذا الكود بالكامل
// 4. اضغط Deploy → New Deployment → Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. انسخ الرابط الجديد وحطه في مكان URL_API في index.html

function doGet(e) {
  var action = e.parameter.action || 'getReports';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getReports') {
    return getReports(ss);
  } else if (action === 'updateStatus') {
    return updateReportStatus(ss, e.parameter.id, e.parameter.status);
  } else if (action === 'getStats') {
    return getReportStats(ss);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({error: 'Invalid action'})
  ).setMimeType(ContentService.MimeType.JSON);
}

function getReports(ss) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(
      JSON.stringify({success: true, count: 0, reports: [], headers: []})
    ).setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var reports = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var report = { _row: i };
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        report[headers[j]] = row[j] != null ? String(row[j]) : '';
      }
    }
    reports.push(report);
  }
  
  reports.reverse();
  
  return ContentService.createTextOutput(
    JSON.stringify({success: true, count: reports.length, headers: headers, reports: reports})
  ).setMimeType(ContentService.MimeType.JSON);
}

function updateReportStatus(ss, rowId, newStatus) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  
  var statusCol = -1;
  for (var j = 0; j < headers.length; j++) {
    if (headers[j].includes('الحالة') || headers[j].includes('Status') || headers[j].includes('حالة البلاغ')) {
      statusCol = j;
      break;
    }
  }
  
  if (statusCol === -1) {
    statusCol = headers.length;
    sheet.getRange(1, statusCol + 1).setValue('الحالة');
  }
  
  var rowNum = parseInt(rowId);
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

function getReportStats(ss) {
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(
      JSON.stringify({success: true, stats: {total: 0, byType: {}, byStatus: {}}})
    ).setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0].map(function(h) { return String(h).trim(); });
  
  var stats = { total: data.length - 1, byType: {}, byStatus: {} };
  
  var typeCol = -1, statusCol = -1;
  for (var j = 0; j < headers.length; j++) {
    var h = headers[j];
    if (h.includes('القسم') || h.includes('نوع') || h.includes('الطلب')) typeCol = j;
    if (h.includes('الحالة') || h.includes('Status')) statusCol = j;
  }
  
  for (var i = 1; i < data.length; i++) {
    if (typeCol >= 0) {
      var type = String(data[i][typeCol] || 'غير محدد');
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
    if (statusCol >= 0) {
      var status = String(data[i][statusCol] || 'جديد');
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    }
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({success: true, stats: stats})
  ).setMimeType(ContentService.MimeType.JSON);
}

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
