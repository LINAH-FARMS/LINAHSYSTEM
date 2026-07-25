// Excel styling utilities for professional reports
var ExcelStyle = {
  // Color palette
  green: '1b5e20',
  greenLight: 'e8f5e9',
  greenMedium: '4caf50',
  dark: '263238',
  grey: '78909c',
  white: 'FFFFFF',
  headerBg: '1b5e20',
  headerFg: 'FFFFFF',
  altRow: 'f1f8e9',

  createStyle: function(opts) {
    return {
      font: { bold: opts.bold, sz: opts.size || 11, color: opts.color ? { rgb: opts.color } : undefined, name: 'Cairo' },
      fill: opts.bgColor ? { fgColor: { rgb: opts.bgColor } } : undefined,
      alignment: { horizontal: opts.align || 'right', vertical: 'center', wrapText: opts.wrap },
      border: opts.border ? {
        top: { style: 'thin', color: { rgb: 'cfd8dc' } },
        bottom: { style: 'thin', color: { rgb: 'cfd8dc' } },
        left: { style: 'thin', color: { rgb: 'cfd8dc' } },
        right: { style: 'thin', color: { rgb: 'cfd8dc' } }
      } : undefined
    };
  },

  headerStyle: function() {
    return this.createStyle({ bold: true, size: 12, color: this.white, bgColor: this.headerBg, border: true });
  },

  titleStyle: function() {
    return this.createStyle({ bold: true, size: 14, color: this.headerBg, align: 'center' });
  },

  dataStyle: function(border) {
    return this.createStyle({ size: 11, border: border });
  },

  numberStyle: function(border) {
    return this.createStyle({ size: 11, align: 'center', border: border });
  },

  kpiLabelStyle: function() {
    return this.createStyle({ bold: true, size: 11, color: this.dark, bgColor: this.greenLight, border: true });
  },

  kpiValueStyle: function() {
    return this.createStyle({ bold: true, size: 11, color: this.headerBg, bgColor: this.greenLight, align: 'center', border: true });
  },

  // Apply header row styling
  styleHeaderRow: function(ws, rowIndex, count) {
    for (var c = 0; c < count; c++) {
      var addr = XLSX.utils.encode_cell({ r: rowIndex, c: c });
      if (ws[addr]) ws[addr].s = this.headerStyle();
    }
  },

  // Apply title row styling (merged)
  styleTitleRow: function(ws, rowIndex) {
    var addr = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
    if (ws[addr]) ws[addr].s = this.titleStyle();
  },

  // Auto-fit column widths based on content
  autoColWidth: function(ws, minWidth) {
    if (minWidth === undefined) minWidth = 10;
    var colWidths = {};
    var range = XLSX.utils.decode_range(ws['!ref']);
    for (var R = range.s.r; R <= range.e.r; R++) {
      for (var C = range.s.c; C <= range.e.c; C++) {
        var addr = XLSX.utils.encode_cell({ r: R, c: C });
        var cell = ws[addr];
        if (!cell) continue;
        var len = 0;
        if (cell.v !== undefined && cell.v !== null) {
          len = String(cell.v).length;
          // Arabic chars are wider
          var arCount = (String(cell.v).match(/[\u0600-\u06FF]/g) || []).length;
          len += arCount * 0.4;
        }
        var hdr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        var hdrLen = ws[hdr] ? String(ws[hdr].v).length : 0;
        if (R === range.s.r) len = hdrLen;
        if (!colWidths[C] || colWidths[C] < len) colWidths[C] = len;
      }
    }
    ws['!cols'] = [];
    for (var C = range.s.c; C <= range.e.c; C++) {
      ws['!cols'].push({ wch: Math.max(minWidth, Math.min(50, Math.ceil((colWidths[C] || minWidth) + 2))) });
    }
  },

  // Add auto-filter
  addFilter: function(ws, headerRow, colCount) {
    var range = XLSX.utils.decode_range(ws['!ref']);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: range.e.r, c: colCount - 1 } }) };
  },

  // Freeze rows
  freezeRow: function(ws, row) {
    ws['!freeze'] = { xSplit: 0, ySplit: row };
  },

  // Create a professional sheet from array of arrays with header styling
  makeSheet: function(data, opts) {
    var ws = XLSX.utils.aoa_to_sheet(data);
    var headerRow = opts.headerRow || 0;
    var colCount = 0;
    if (data.length > headerRow) {
      colCount = data[headerRow].length;
      this.styleHeaderRow(ws, headerRow, colCount);
    }
    if (opts.titleRow !== undefined) {
      this.styleTitleRow(ws, opts.titleRow);
    }
    if (opts.colWidths) {
      ws['!cols'] = opts.colWidths;
    } else {
      this.autoColWidth(ws);
    }
    if (opts.filter) {
      this.addFilter(ws, headerRow, colCount);
    }
    if (opts.freeze) {
      this.freezeRow(ws, opts.freeze);
    }
    return ws;
  },

  // Create a KPI summary section (array of arrays for aoa_to_sheet)
  makeKPIRows: function(kpis) {
    var rows = [];
    rows.push(['ملخص إحصائي', '']);
    kpis.forEach(function(k) {
      rows.push([k.label, String(k.value)]);
    });
    rows.push([]);
    return rows;
  }
};
