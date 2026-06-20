function doGet(e) {
  var action = e.parameter.action || "getReports";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  
  if (action == "getReports") {
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({success:true,count:0,reports:[],headers:[]})).setMimeType(ContentService.MimeType.JSON);
    }
    var headers = [];
    for (var j = 0; j < data[0].length; j++) {
      headers.push(String(data[0][j]).trim());
    }
    var reports = [];
    for (var i = 1; i < data.length; i++) {
      var report = {_row: i};
      for (var j = 0; j < headers.length; j++) {
        if (headers[j]) {
          report[headers[j]] = data[i][j] != null ? String(data[i][j]) : "";
        }
      }
      reports.push(report);
    }
    reports.reverse();
    return ContentService.createTextOutput(JSON.stringify({success:true,count:reports.length,headers:headers,reports:reports})).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({error:"Invalid action"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(ex) {
    var params = {};
    var parts = e.postData.contents.split("&");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split("=");
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    }
    data = params;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  
  if (data.action == "addReport") {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length == 0 || !headers[0]) {
      sheet.getRange(1, 1, 1, 7).setValues([["Timestamp", "رقم الموبايل", "اسم العامل", "نوع العطل", "وصف العطل", "الموقع", "الأولوية"]]);
      headers = sheet.getRange(1, 1, 1, 7).getValues()[0];
    }
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      if (h == "Timestamp" || h == "التاريخ") row.push(data.date || new Date().toLocaleString());
      else if (h.indexOf("موبايل") >= 0 || h.indexOf("هاتف") >= 0 || h.indexOf("phone") >= 0) row.push(data.phone || "");
      else if (h.indexOf("اسم") >= 0 || h.indexOf("الاسم") >= 0 || h.indexOf("name") >= 0) row.push(data.name || "");
      else if (h.indexOf("نوع") >= 0 || h.indexOf("الطلب") >= 0 || h.indexOf("type") >= 0) row.push(data.type || "");
      else if (h.indexOf("وصف") >= 0 || h.indexOf("البيان") >= 0 || h.indexOf("desc") >= 0) row.push(data.desc || "");
      else if (h.indexOf("موقع") >= 0 || h.indexOf("المبنى") >= 0 || h.indexOf("location") >= 0) row.push(data.location || "");
      else if (h.indexOf("أولوية") >= 0 || h.indexOf("priorit") >= 0) row.push(data.priority || "");
      else if (h.indexOf("الحالة") >= 0 || h.indexOf("Status") >= 0) row.push("جديد");
      else row.push("");
    }
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (data.action == "updateStatus") {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var statusCol = -1;
    for (var j = 0; j < headers.length; j++) {
      if (String(headers[j]).indexOf("الحالة") >= 0) {
        statusCol = j;
        break;
      }
    }
    if (statusCol == -1) {
      statusCol = headers.length;
      sheet.getRange(1, statusCol + 1).setValue("الحالة");
    }
    var rowNum = parseInt(data.id);
    if (rowNum >= 1 && rowNum < sheet.getLastRow()) {
      sheet.getRange(rowNum + 1, statusCol + 1).setValue(data.status);
      return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({error:"Invalid"})).setMimeType(ContentService.MimeType.JSON);
}
