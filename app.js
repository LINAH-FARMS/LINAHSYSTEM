    // تحميل جميع البيانات من IndexedDB (غير متزامن) - بديل عن localStorage
     (function _initIDB() {
       _migrateAllToIDB().then(function() {
         // Auto-pull from IndexedDB ONLY as a fallback when localStorage is blocked
         // (otherwise pulling is manual via pullFromDatabase(), by user request)
         if (_localStorageBlocked) {
           var needsRestore = _ALL_KEYS.some(function(k) {
             try { var v = getEntityVar(k); return !v || (Array.isArray(v) && v.length === 0); } catch(e) { return true; }
           });
           if (needsRestore) {
             _idbLoadAll().then(function(loaded) {
               if (loaded) { syncStorage(); renderAll(); }
             });
           }
         }
         // Load waterDocs from IndexedDB (large base64 files)
         _loadWaterDocsFromIDB().then(function(docs) {
           if (docs && docs.length > 0) {
             waterDocs = docs;
             console.log('تم تحميل ' + waterDocs.length + ' مستند مياه من IndexedDB');
             if (typeof renderWaterDocs === 'function') renderWaterDocs();
           }
         });
       }).catch(function() {});
     })();
    autoDiscoverDynamicData();
    function logAction(action, targetType, targetName, details) {
      auditLog.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        time: new Date().toISOString(),
        user: currentUser,
        action: action,
        targetType: targetType,
        targetName: targetName || '',
        details: details || ''
      });
      // auto-prune: امسح اللي أقدم من شهر كل ما تدخل جديد عشان ما يتمليش
      var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (auditLog.length > 0 && new Date(auditLog[0].time).getTime() < cutoff) {
        auditLog = auditLog.filter(function(e) { return new Date(e.time).getTime() > cutoff; });
      }
      _lsSet('linah_audit_log', JSON.stringify(auditLog));
    }
    normalizeBakeryDates();
    // عدد الأسرّة بيانات ترتيب الخيارات بيانات يجب
    if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
    if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
    if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });
    normalizeMealLogDates();

    setInterval(() => {
      var lc = document.getElementById('live-clock');
      if (lc) lc.innerText = "الساعة: " + new Date().toLocaleString('ar-EG');
    }, 1000);

    function sortEmployeesAlphabetically() {
      employees.sort((a, b) => (a.name || "").localeCompare(b.name || "ar"));
    }

    function rebuildAllDropdowns() {
      // الحفاظ على اختيارات نافذة إضافة/تعديل الموظف أثناء إعادة بناء القوائم
      // (كانت تُمحى عند أي مزامنة/سحب لأن القوائم تُبنى من جديد من الصفر)
      function _prevFormVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }
      var _prevForm = {
        dept: _prevFormVal('form-emp-dept'),
        gov: _prevFormVal('form-emp-gov'),
        sector: _prevFormVal('form-emp-sector'),
        title: _prevFormVal('form-emp-title-select'),
        room: _prevFormVal('form-emp-room')
      };
      autoDiscoverDynamicData();
      // Normalize Arabic variants for dedup (ة/ه, أ/إ/آ/ا, ى/ي)
      function govNorm(s) { return s.replace(/[ة]/g,'ه').replace(/[أإآ]/g,'ا').replace(/[ى]/g,'ي'); }
      var allGovs = defaultGovs.slice();
      var govNormSet = {};
      defaultGovs.forEach(function(g) { govNormSet[govNorm(g)] = true; });
      employees.forEach(emp => {
        if (emp.dept && !dynamicDepts.includes(emp.dept.trim())) dynamicDepts.push(emp.dept.trim());
        if (emp.title && !dynamicTitles.includes(emp.title.trim())) dynamicTitles.push(emp.title.trim());
        if (emp.gov) {
          var ng = govNorm(emp.gov.trim());
          if (!govNormSet[ng]) { govNormSet[ng] = true; allGovs.push(emp.gov.trim()); }
        }
      });
      // Remove invalid governorates and sort
      var validGovs = allGovs.filter(function(g) {
        var g2 = g.trim();
        return g2 && g2 !== 'الفرافرة' && g2 !== 'فرافرة' && g2 !== 'الفرافره' && g2.length > 1;
      }).sort(function(a, b) { return a.localeCompare(b, 'ar'); });
      _lsSet('dyn_depts', JSON.stringify(dynamicDepts));
      _lsSet('dyn_titles', JSON.stringify(dynamicTitles));
      rebuildDeptTitles();

      function _restoreFormVal(selId, val) {
        if (!val) return;
        var sel = document.getElementById(selId);
        if (!sel) return;
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === val) { sel.value = val; break; }
        }
      }

      fillSelectWithOptions('form-emp-dept', dynamicDepts, '-- اختر الإدارة --');
      fillSelectWithOptions('form-emp-gov', validGovs, '-- اختر المحافظة --');
      fillSelectWithOptions('form-emp-sector', dynamicSectors, '-- اختر المبنى --');
      var secSel = document.getElementById('form-emp-sector');
      if (secSel) { secSel.onchange = updateEmpRoomBySector; }
      // استرجاع الاختيارات قبل بناء القوائم التابعة — وإلا تُمحى قائمة
      // الغرفة (لأن المبنى فارغ لحظتها) وقائمة الوظيفة (بسبب الإدارة الفارغة)
      _restoreFormVal('form-emp-dept', _prevForm.dept);
      _restoreFormVal('form-emp-gov', _prevForm.gov);
      _restoreFormVal('form-emp-sector', _prevForm.sector);
      updateEmpRoomBySector();
      filterTitlesByDept();
      _restoreFormVal('form-emp-title-select', _prevForm.title);
      _restoreFormVal('form-emp-room', _prevForm.room);

      fillSelectWithOptions('inv-dept-select', dynamicDepts, '-- اختر القسم --');
      fillSelectWithOptions('septic-name-select', dynamicSeptics, '-- اختر --');
      var sd = document.getElementById('septic-date');
      if (sd && !sd.value) sd.value = new Date().toISOString().split('T')[0];
      populateContractorSectorDropdown();
      fillSelectWithOptions('transfer-dept-select', dynamicDepts, '-- اختر القسم --');
      fillSelectWithOptions('transfer-title-select', dynamicTitles, '-- اختر الوظيفة --');
      fillSelectWithOptions('hosp-type', dynamicVisitorTypes, '');
      populateBctrDatalist();
      initEmployeeDatalists();
    }

    function populateVacationEmpSelect() {}

    function populateBctrDatalist() {
      var sel = document.getElementById('bctr-name');
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = '<option value="">-- اختر المقاول --</option>' + bakeryContractorsNames.filter(function(n) { return typeof n === 'string' && n.trim(); }).map(function(n) { return '<option value="' + n.replace(/"/g,'&quot;') + '">' + n + '</option>'; }).join('');
      if (cur && Array.from(sel.options).some(function(o) { return o.value === cur; })) sel.value = cur;
    }

    function fillSelectWithOptions(selectId, optionsArray, placeholder) {
      const select = document.getElementById(selectId);
      if(!select) return;
      select.innerHTML = '';
      if (placeholder) {
        let ph = document.createElement('option');
        ph.value = ''; ph.textContent = placeholder;
        select.appendChild(ph);
      }
      _strArr(optionsArray).forEach(opt => {
        let el = document.createElement('option');
        el.value = opt;
        el.innerText = opt;
        select.appendChild(el);
      });
    }

    function updateEmpRoomBySector() {
      let sectorSel = document.getElementById('form-emp-sector');
      let roomSel = document.getElementById('form-emp-room');
      if (!sectorSel || !roomSel) return;
      let sector = sectorSel.value;
      roomSel.innerHTML = '';
      if (!sector) {
        let opt = document.createElement('option');
        opt.value = ''; opt.textContent = '-- اختر المبنى أولاً --';
        roomSel.appendChild(opt);
        return;
      }
      let sectorRooms = roomsCapacity.filter(function(r) { return r.sector === sector; });
      if (sectorRooms.length === 0) {
        let opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'لا توجد غرف مسجلة في هذا القطاع';
        roomSel.appendChild(opt);
        return;
      }
      sectorRooms.forEach(function(r) {
        let opt = document.createElement('option');
        opt.value = r.number; opt.textContent = r.number;
        roomSel.appendChild(opt);
      });
      // إضافة درجة
      sortSelectOptions(roomSel);
    }

    function sortSelectOptions(sel) {
      let opts = Array.from(sel.options);
      opts.sort(function(a, b) {
        var aNum = parseInt(a.value, 10);
        var bNum = parseInt(b.value, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.value.localeCompare(b.value, 'ar');
      });
      opts.forEach(function(o) { sel.appendChild(o); });
    }

    function initEmployeeDatalists() {
      var ids = ['inv-emp-name', 'housing-emp-search', 'transfer-emp-search', 'ts-emp-search', 'vacation-emp-select'];
      ids.forEach(function(id) {
        var inp = document.getElementById(id);
        if (!inp) return;
        inp.setAttribute('autocomplete', 'off');
        var old = document.getElementById(id + '-dl');
        if (old) old.remove();
        var dl = document.createElement('datalist');
        dl.id = id + '-dl';
        employees.forEach(function(e) {
          var opt = document.createElement('option');
          opt.value = '[' + (e.code || '') + '] ' + (e.name || '');
          dl.appendChild(opt);
        });
        inp.setAttribute('list', dl.id);
        document.body.appendChild(dl);
      });
    }

    function findEmpByInput(val) {
      val = val.trim();
      var m = val.match(/^\[(.+?)\]\s*/);
      var code = m ? m[1] : '';
      return employees.find(function(e) {
        return (e.code||'') === code || (e.id||'') === code ||
               (e.name||'').toLowerCase() === val.toLowerCase() ||
               (e.code||'') === val || (e.id||'') === val;
      });
    }

    function showVacationBalance() {
      var q = document.getElementById('vacation-emp-select').value.trim();
      var balSpan = document.getElementById('vacation-balance-display');
      if (!q) { balSpan.innerText = ''; return; }
      var emp = findEmpByInput(q);
      if (emp) {
        balSpan.innerText = typeof emp.vacationBalance === 'number' ? 'رصيد الإجازة: ' + emp.vacationBalance + ' يوم' : '';
      } else {
        balSpan.innerText = '';
      }
    }

    function initEmployeeSearchInputs() {
      initEmployeeDatalists();
    }

    function syncStorage(noTimestamp, skipSync) {
      if (!skipSync) _lsSet('_pendingChanges', 'true');
      try { _lsSet('_storageTx', 'start'); } catch(e) {}
      _lsSet('lineh_employees', JSON.stringify(employees));
      _lsSet('lineh_rooms_capacity', JSON.stringify(roomsCapacity));
      _lsSet('lineh_vacations', JSON.stringify(vacations));
      _lsSet('lineh_hospitality', JSON.stringify(hospitalities));
      _lsSet('lineh_maintenance', JSON.stringify(maintenanceRecords));
      _lsSet('lineh_septic', JSON.stringify(septicRecords));
      _lsSet('lineh_inventory', JSON.stringify(inventoryVouchers));
      _lsSet('excludedEmployees', JSON.stringify(excludedEmployees));
      _lsSet('lineh_periodic_maintenance', JSON.stringify(periodicMaintenance));
      _lsSet('lineh_tea_sugar', JSON.stringify(teaSugarDisbursements));
      _lsSet('lineh_tea_sugar_batches', JSON.stringify(teaSugarBatches));
      _lsSet('lineh_meal_logs', JSON.stringify(mealLogs));
      _lsSet('linah_meal_waste', JSON.stringify(mealWaste));
      _lsSet('lineh_inventory_items', JSON.stringify(inventoryItems));
      _lsSet('lineh_contractors', JSON.stringify(contractors));
      _lsSet('dyn_sectors', JSON.stringify(_strArr(dynamicSectors)));
      _lsSet('ctr_sectors', JSON.stringify(_strArr(contractorSectors)));
      _lsSet('ctr_rooms', JSON.stringify(contractorRooms));
      _lsSet('dyn_rooms', JSON.stringify(_strArr(dynamicRooms)));
      _lsSet('dyn_septics', JSON.stringify(_strArr(dynamicSeptics)));
      _lsSet('dyn_depts', JSON.stringify(_strArr(dynamicDepts)));
      _lsSet('dyn_titles', JSON.stringify(_strArr(dynamicTitles)));
      _lsSet('dyn_visitor_types', JSON.stringify(_strArr(dynamicVisitorTypes)));
      _lsSet('linah_bakery_contractors_names', JSON.stringify(_strArr(bakeryContractorsNames)));
      _lsSet('lineh_evaluations', JSON.stringify(evaluations));
      _lsSet('lineh_eval_templates', JSON.stringify(evalTemplates));
      _lsSet('lineh_users', JSON.stringify(appUsers));
      _lsSet('lineh_current_user', currentUser);
      _lsSet('linah_bakery_ingredients', JSON.stringify(bakeryIngredients));
      _lsSet('linah_bakery_productions', JSON.stringify(bakeryProductions));
      _lsSet('linah_bakery_ctr_supplies', JSON.stringify(bakeryContractorSupplies));
      _lsSet('linah_bakery_invoices', JSON.stringify(bakeryInvoices));
      _lsSet('linah_bakery_stock_log', JSON.stringify(bakeryStockLog));
      _lsSet('lineh_admin_overtime', JSON.stringify(adminOvertime));
      _lsSet('lineh_room_assets', JSON.stringify(roomAssets));
      if (_backfillArchiveIds()) { /* حفظ الأسماء المستقرة بعد تخصيصها */ }
      _lsSet('lineh_archive_data', JSON.stringify(archiveData));
      _lsSet('lineh_minia_assets', JSON.stringify(miniaAssets));
      _lsSet('lineh_dynamic_stores', JSON.stringify(_strArr(dynamicStores)));
      _lsSet('lineh_water_stations', JSON.stringify(waterStations));
      try { _lsSet('lineh_water_docs', JSON.stringify(waterDocs)); _lsSet('lineh_water_docs_mirror', JSON.stringify(waterDocs)); } catch(e) {}
      // waterDocs saved to IndexedDB only (large base64 files)
      _lsSet('lineh_quick_actions', JSON.stringify(quickActions));
      _lsSet('lineh_daily_stats', JSON.stringify(dailyStats));
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
      _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
      _lsSet('_pulledAt', JSON.stringify(_pulledAt));
      try { _lsRemove('_storageTx'); } catch(e) {}
      calculateSystemStats();
      if (!noTimestamp) _lsSet('_localChangeTime', Date.now());
      setAction('بيانات تواجد');
      _dataChangedSinceBackup = true;
      var bakBtn = document.querySelector('button[onclick*="exportBackupSystem"]');
      if (bakBtn) bakBtn.classList.add('btn-backup-pulse');
      _scheduleIDBBackup();
      _saveWaterDocsToIDB(); // Save waterDocs to IndexedDB immediately
      callUpdateDXStats();
    }

    function renderDashboard() {
      let totalEmp = employees.length;
      let pCount = employees.filter(e => e.status === 'P').length;
      let vCount = employees.filter(e => e.status === 'V').length;
      let totalBeds = roomsCapacity.reduce((s,r) => s + (parseInt(r.beds)||0), 0);
      let occupiedBeds = employees.filter(e => (e.status === 'P' || e.status === 'V') && e.room).length;
      let vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      let g = id => document.getElementById(id);

      // ====== STAT CARDS ======
      if (g('dash-total-emp')) g('dash-total-emp').innerText = totalEmp;
      if (g('dash-p-emp')) g('dash-p-emp').innerText = pCount;
      if (g('dash-v-emp')) g('dash-v-emp').innerText = vCount;
      if (g('dash-total-beds')) g('dash-total-beds').innerText = totalBeds;
      if (g('dash-occ-beds')) g('dash-occ-beds').innerText = occupiedBeds;
      if (g('dash-vac-beds')) g('dash-vac-beds').innerText = vacantBeds;
      if (g('dash-items')) g('dash-items').innerText = inventoryItems.length;
      if (g('dash-vouchers')) g('dash-vouchers').innerText = inventoryVouchers.length;
      if (g('dash-ts')) g('dash-ts').innerText = teaSugarDisbursements.length;
      if (g('dash-vacations')) g('dash-vacations').innerText = vacations.length;
      if (g('dash-excluded')) g('dash-excluded').innerText = excludedEmployees.length;
      if (g('dash-contractors')) g('dash-contractors').innerText = contractors.length;
      if (g('dash-rooms')) g('dash-rooms').innerText = roomsCapacity.length;
      if (g('dash-p-pct') && totalEmp > 0) {
        let pPct = Math.round(pCount/totalEmp*100), vPct = Math.round(vCount/totalEmp*100);
        let bedsPct = totalBeds>0 ? Math.round(occupiedBeds/totalBeds*100) : 0;
        g('dash-p-pct').innerText = pPct+'%'; g('dash-v-pct').innerText = vPct+'%';
        if (g('dash-p-bar')) g('dash-p-bar').style.width = pPct+'%';
        if (g('dash-v-bar')) g('dash-v-bar').style.width = vPct+'%';
        if (g('dash-beds-bar')) g('dash-beds-bar').style.width = bedsPct+'%';
      }

      // ====== DONUT CHART ======
      if (g('dash-donut')) {
        let canvas = g('dash-donut'), ctx = canvas.getContext('2d');
        let cx=75, cy=75, r=55, lw=22;
        ctx.clearRect(0,0,150,150);
        let colors = ['#e8f5e9']; // bg
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='#e8f5e9'; ctx.lineWidth=lw; ctx.stroke();
        if (totalEmp>0) {
          let slices = [
            {v:pCount, color:'#2e7d32', label:'متواجد P'},
            {v:vCount, color:'#ff9800', label:'إجازة V'}
          ];
          let start = -Math.PI/2;
          slices.forEach(s => {
            if (s.v>0) {
              let a = (s.v/totalEmp)*Math.PI*2;
              ctx.beginPath(); ctx.arc(cx,cy,r,start,start+a);
              ctx.strokeStyle=s.color; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.stroke();
              start += a;
            }
          });
          ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fillStyle='#1b5e20'; ctx.fill();
        }
        if (g('dash-donut-total')) g('dash-donut-total').innerText = totalEmp;
        if (g('dash-dnut-badge')) g('dash-dnut-badge').innerText = totalEmp;
        if (g('dash-dnut-legend')) {
          g('dash-dnut-legend').innerHTML = `
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#2e7d32;"></span> متواجد <b>${pCount}</b></span>
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#ff9800;"></span> إجازة <b>${vCount}</b></span>
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#e8f5e9;"></span> الإجمالي <b>${totalEmp}</b></span>
          `;
        }
      }

      // ====== HOUSING BARS BY SECTOR ======
      if (g('dash-hbars')) {
        let sectorMap = {};
        roomsCapacity.forEach(r => {
          if (!sectorMap[r.sector]) sectorMap[r.sector] = { beds:0, rooms:0 };
          sectorMap[r.sector].beds += parseInt(r.beds)||0;
          sectorMap[r.sector].rooms++;
        });
        let sArr = Object.entries(sectorMap).sort((a,b)=>b[1].beds-a[1].beds);
        let maxBeds = sArr.length>0 ? sArr[0][1].beds : 1;
        let hColors = ['#2e7d32','#1565c0','#e65100','#6a1b9a','#00695c','#c62828','#f57f17','#283593'];
        if (g('dash-housing-badge')) g('dash-housing-badge').innerText = sArr.length;
        g('dash-hbars').innerHTML = sArr.map(([s,d],i) => {
          let occ = employees.filter(e=>e.status==='P'&&e.sector===s).length;
          let pct = Math.round(d.beds/maxBeds*100);
          return `<div class="dash-hbar-wrap">
            <div class="dash-hbar-label"><span>${(s || 'بدون قطاع')} (${d.rooms} غرفة)</span><span>${occ}/${d.beds}</span></div>
            <div class="dash-hbar-track">
              <div class="dash-hbar-fill" style="width:${pct}%;background:${hColors[i%hColors.length]};"></div>
            </div>
          </div>`;
        }).join('') || '<div style="color:#90a4ae;font-size:12px;text-align:center;">لا توجد غرف</div>';
      }

      // ====== DEPARTMENT BARS ======
      if (g('dash-dept-bars')) {
        let deptMap = {};
        employees.forEach(e => { if (e.dept) deptMap[e.dept] = (deptMap[e.dept]||0)+1; });
        let dArr = Object.entries(deptMap).sort((a,b)=>b[1]-a[1]);
        let maxC = dArr.length>0 ? dArr[0][1] : 1;
        let dColors = ['#2e7d32','#1565c0','#e65100','#6a1b9a','#00695c','#c62828','#f57f17','#283593'];
        if (g('dash-dept-badge')) g('dash-dept-badge').innerText = dArr.length;
        g('dash-dept-bars').innerHTML = dArr.map(([d,c],i) => `
          <div class="dept-bar-wrap">
            <div class="dept-bar-label"><span>${d}</span><span>${c}</span></div>
            <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${Math.round(c/maxC*100)}%;background:${dColors[i%dColors.length]};">${c}</div></div>
          </div>
        `).join('') || '<div style="color:#90a4ae;text-align:center;">لا توجد إدارات</div>';
      }

      // ====== SUMMARY GRID ======
      if (g('dash-summary-grid')) {
        let invItems = inventoryItems.length, invVouchers = inventoryVouchers.length;
        let tsCount = teaSugarDisbursements.length, vacCount = vacations.length;
        let exclCount = excludedEmployees.length, maintCount = maintenanceRecords.length;
        let hospCount = hospitalities.length, mealCount = mealLogs.length;
        let septicC = septicRecords.length, pmC = periodicMaintenance.length;
        let ctrCount = contractors.length;
        g('dash-summary-grid').innerHTML = `
          <div class="dash-summary-item c-green"><span class="s-icon">📦</span><span class="s-label">أصناف المخزن</span><span class="s-value">${invItems}</span></div>
          <div class="dash-summary-item c-blue"><span class="s-icon">🧾</span><span class="s-label">بونات الصرف</span><span class="s-value">${invVouchers}</span></div>
          <div class="dash-summary-item c-orange"><span class="s-icon">🍵</span><span class="s-label">صرف الشاي والسكر</span><span class="s-value">${tsCount}</span></div>
          <div class="dash-summary-item c-purple"><span class="s-icon">📅</span><span class="s-label">الإجازات</span><span class="s-value">${vacCount}</span></div>
          <div class="dash-summary-item c-teal"><span class="s-icon">🔧</span><span class="s-label">صيانة عامة</span><span class="s-value">${maintCount}</span></div>
          <div class="dash-summary-item c-red"><span class="s-icon">🛡️</span><span class="s-label">صيانة دورية</span><span class="s-value">${pmC}</span></div>
          <div class="dash-summary-item c-amber"><span class="s-icon">🛎️</span><span class="s-label">الضيافة</span><span class="s-value">${hospCount}</span></div>
          <div class="dash-summary-item c-indigo"><span class="s-icon">🚛</span><span class="s-label">البيارات</span><span class="s-value">${septicC}</span></div>
          <div class="dash-summary-item c-green"><span class="s-icon">🍽️</span><span class="s-label">الوجبات</span><span class="s-value">${mealCount}</span></div>
          <div class="dash-summary-item c-blue"><span class="s-icon">🚫</span><span class="s-label">المستبعدين</span><span class="s-value">${exclCount}</span></div>
        `;
      }

      // ====== RECENT ACTIVITY ======
      if (g('dash-activity')) {
        var actItems = auditLog.slice(-15).reverse().map(function(e) {
          var dot = 'green';
          if (e.action === 'حذف' || e.action === 'استبعاد') dot = 'blue';
          if (e.action === 'لا' || e.action === 'توجد') dot = 'red';
          var t = e.time ? new Date(e.time).toLocaleString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : '';
          return '<div class="activity-item"><span class="activity-dot ' + dot + '"></span><span><b>' + e.user + '</b> — ' + (e.targetName ? e.targetName + ' | ' : '') + (e.details || e.action) + '</span><span style="font-size:9px;color:#90a4ae;margin-right:auto;">' + t + '</span></div>';
        });
        g('dash-activity').innerHTML = actItems.length ? actItems.join('') : '<div style="text-align:center;color:#90a4ae;padding:10px;">لا توجد نشاطات</div>';
      }

      // ====== CONTRACT TYPE DISTRIBUTION CHART ======
      if (g('dash-contract-chart') && totalEmp > 0) {
        let canvas = g('dash-contract-chart'), ctx = canvas.getContext('2d');
        let cx=75, cy=75, r=55, lw=22;
        ctx.clearRect(0,0,150,150);
        let daim = employees.filter(e => (e.contract || 'دائم') === 'دائم').length;
        let kagol = employees.filter(e => e.contract === 'كاجول').length;
        let slices = [];
        slices.push({v:daim, color:'#1565c0', label:'دائم'});
        if (kagol > 0) slices.push({v:kagol, color:'#ff9800', label:'كاجول'});
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='#e8e8e8'; ctx.lineWidth=lw; ctx.stroke();
        let start = -Math.PI/2;
        slices.forEach(s => {
          let a = (s.v/totalEmp)*Math.PI*2;
          ctx.beginPath(); ctx.arc(cx,cy,r,start,start+a);
          ctx.strokeStyle=s.color; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.stroke();
          start += a;
        });
        if (g('dash-ctrct-total')) g('dash-ctrct-total').innerText = totalEmp;
        if (g('dash-ctrct-badge')) g('dash-ctrct-badge').innerText = slices.length;
        if (g('dash-ctrct-legend')) {
          g('dash-ctrct-legend').innerHTML = slices.map(s =>
            `<span class="dash-legend-item"><span class="dash-legend-dot" style="background:${s.color};"></span> ${s.label} <b>${s.v}</b></span>`
          ).join('');
        }
      }

      // ====== DAILY BAKERY PRODUCTION & MEALS ======
      if (g('dash-bakery-meals-content')) {
        let today = new Date().toISOString().slice(0,10);
        let todayProd = bakeryProductions.filter(p => p.date === today);
        let totalBread = todayProd.reduce((s,p) => s + (parseInt(p.breadCount)||0), 0);
        let pCount = employees.filter(e => e.status === 'P').length;
        let todayGuests = hospitalities.filter(h => {
          if(!h.arrival) return false;
          let a = new Date(h.arrival + 'T00:00:00');
          let d = h.departure ? new Date(h.departure + 'T00:00:00') : a;
          let now = new Date(); now.setHours(0,0,0,0);
          return now >= a && now <= d;
        });
        let gBf = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('إفطار')) ? (h.guests || 1) : 0), 0);
        let gLh = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('غداء')) ? (h.guests || 1) : 0), 0);
        let gDn = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('عشاء')) ? (h.guests || 1) : 0), 0);
        let totalMeals = (pCount + gBf) + (pCount + gLh) + (pCount + gDn);
        if (g('dash-bakery-meals-badge')) g('dash-bakery-meals-badge').innerText = totalBread + totalMeals;
        if (g('dash-today-bread')) g('dash-today-bread').innerText = totalBread;
        if (g('dash-today-bf')) g('dash-today-bf').innerText = pCount + gBf;
        if (g('dash-today-lh')) g('dash-today-lh').innerText = pCount + gLh;
        if (g('dash-today-dn')) g('dash-today-dn').innerText = pCount + gDn;
        if (g('dash-today-date')) g('dash-today-date').innerText = 'بيانات ' + new Date().toLocaleDateString('ar-EG');
        if (g('dash-today-total')) g('dash-today-total').innerText = 'بيانات ' + totalBread + ' وجبة | بيانات ' + totalMeals + ' غير';
      }

      // ====== GOVERNORATE DISTRIBUTION ======
      if (g('dash-gov-bars')) {
        let govMap = {};
        employees.forEach(e => { let g = e.gov || '—'; govMap[g] = (govMap[g] || 0) + 1; });
        let sorted = Object.entries(govMap).sort((a,b) => b[1] - a[1]);
        let maxGov = sorted.length > 0 ? sorted[0][1] : 1;
        let govColors = ['#2e7d32','#1565c0','#e65100','#6a1b9a','#00695c','#c62828','#f57f17','#283593','#00838f','#4e342e'];
        g('dash-gov-bars').innerHTML = sorted.map(([g,v],i) => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:11px;">
            <span style="width:60px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;color:#555;">${g}</span>
            <div style="flex:1;height:14px;background:#f0f0f0;border-radius:7px;overflow:hidden;">
              <div style="width:${(v/maxGov*100)}%;height:100%;background:${govColors[i % govColors.length]};border-radius:7px;transition:width 0.6s ease;"></div>
            </div>
            <span style="width:25px;text-align:center;font-weight:600;font-size:12px;">${v}</span>
          </div>
        `).join('');
      }

      // ====== TEA/SUGAR STOCK ON DASHBOARD ======
      if (g('dash-ts-stock-content')) {
        let periods = ['الدورة الأولى (1-7)', 'الدورة الثانية (15-21)'];
        let allGiven = { tea: 0, sugar: 0 }, allUsed = { tea: 0, sugar: 0 };
        let hasData = false;
        let html = '';
        periods.forEach(p => {
          let s = getTeaSugarPeriodStats(p);
          if (s.totalTeaGiven > 0 || s.totalSugarGiven > 0) hasData = true;
          allGiven.tea += s.totalTeaGiven; allUsed.tea += s.totalTeaUsed;
          allGiven.sugar += s.totalSugarGiven; allUsed.sugar += s.totalSugarUsed;
          let teaPct = s.totalTeaGiven > 0 ? Math.min(100, Math.round(s.totalTeaUsed/s.totalTeaGiven*100)) : 0;
          let sugarPct = s.totalSugarGiven > 0 ? Math.min(100, Math.round(s.totalSugarUsed/s.totalSugarGiven*100)) : 0;
          let tColor = teaPct >= 90 ? '#d32f2f' : teaPct >= 70 ? '#f57c00' : '#2e7d32';
          let sColor = sugarPct >= 90 ? '#d32f2f' : sugarPct >= 70 ? '#f57c00' : '#2e7d32';
          if (s.totalTeaGiven > 0 || s.totalSugarGiven > 0) {
            html += `<div style="margin-bottom:10px;padding:8px;background:#fafafa;border-radius:8px;">
              <div style="font-weight:700;font-size:12px;color:#555;margin-bottom:4px;">${p}</div>
              <div style="display:flex;gap:8px;font-size:11px;margin-bottom:4px;">
                <span>☕ شاي: <b>${Math.max(0,s.remainingTea)}</b>/${s.totalTeaGiven}</span>
                <span>🍚 سكر: <b>${Math.max(0,s.remainingSugar)}</b>/${s.totalSugarGiven}</span>
              </div>
              <div style="height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;margin-bottom:2px;">
                <div style="height:100%;width:${teaPct}%;background:${tColor};border-radius:2px;transition:width .5s;"></div>
              </div>
              <div style="height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${sugarPct}%;background:${sColor};border-radius:2px;transition:width .5s;"></div>
              </div>
            </div>`;
          }
        });
        if (!hasData) {
          html = '<div style="text-align:center;color:#aaa;padding:20px;font-size:13px;">لا توجد دفعات تموين مسجلة<br><span style="font-size:11px;">سجل دفعة في تبويب الصرف</span></div>';
          if (g('dash-ts-stock-badge')) g('dash-ts-stock-badge').innerText = '0';
        } else {
          let totalTeaPct = allGiven.tea > 0 ? Math.round(allUsed.tea/allGiven.tea*100) : 0;
          let totalSugarPct = allGiven.sugar > 0 ? Math.round(allUsed.sugar/allGiven.sugar*100) : 0;
          let totalRemaining = (allGiven.tea - allUsed.tea) + (allGiven.sugar - allUsed.sugar);
          html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div style="background:#fff3e0;padding:8px;border-radius:6px;text-align:center;">
              <div style="font-size:10px;color:#888;">الشاي المتبقي</div>
              <div style="font-size:18px;font-weight:700;color:#e65100;">${Math.max(0,allGiven.tea-allUsed.tea)}</div>
            </div>
            <div style="background:#e8f5e9;padding:8px;border-radius:6px;text-align:center;">
              <div style="font-size:10px;color:#888;">بيانات شاي متبقي</div>
              <div style="font-size:18px;font-weight:700;color:#2e7d32;">${Math.max(0,allGiven.sugar-allUsed.sugar)}</div>
            </div>
          </div>` + html;
          if (g('dash-ts-stock-badge')) g('dash-ts-stock-badge').innerText = Math.max(0, allGiven.tea - allUsed.tea);
        }
        g('dash-ts-stock-content').innerHTML = html;
      }
      try { renderDashboardSepticChart(); } catch(e) { console.error('septic chart error:', e); }
      try { renderDashboardMaintChart(); } catch(e) { console.error('maint chart error:', e); }
      try { renderLongStay45(); } catch(e) { console.error('ls45 error:', e); }
    }

    // ===== موظفون على رأس العمل 45 يوم متواصل بدون إجازة =====
    // آخر تاريخ انتهاء/عودة إجازة للموظف من سجل الإجازات
    function _ls45LastBreak(code) {
      let last = '';
      (vacations || []).forEach(v => {
        const vc = String(v.code || v.employeeCode || '').trim();
        if (!vc || vc !== String(code).trim()) return;
        const cand = String(v.returnDate || v.end || v.endDate || v.dateTo || '').trim();
        if (cand && cand > last) last = cand;
      });
      return last;
    }
    // القائمة تتحدث تلقائياً مع renderDashboard: نزول إجازة أو استبعاد يخرجه فوراً
    function renderLongStay45() {
      const tb = document.getElementById('ls45-tbody');
      if (!tb) return;
      const today = new Date(); today.setHours(0,0,0,0);
      const rows = [];
      employees.forEach(e => {
        if (e.status !== 'P') return;
        const vacEnd = _ls45LastBreak(e.code);
        const baseD = vacEnd || (e.hireDate || '');
        if (!baseD) return;
        const bd = new Date(String(baseD).split('T')[0]);
        if (isNaN(bd)) return;
        bd.setHours(0,0,0,0);
        const days = Math.floor((today - bd) / 86400000);
        if (days >= 45) rows.push({ e: e, days: days, src: vacEnd || (e.hireDate || '') });
      });
      rows.sort((a, b) => b.days - a.days);
      tb.innerHTML = rows.map(r => {
        const col = r.days >= 75 ? '#c62828' : (r.days >= 60 ? '#e65100' : '#1b5e20');
        return '<tr>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;"><b>' + (r.e.code || '') + '</b></td>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;">' + (r.e.name || '') + '</td>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;color:#2e7d32;">' + (r.e.dept || '—') + '</td>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;">' + (r.e.title || '—') + '</td>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:800;color:' + col + ';">' + r.days + '</td>' +
          '<td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;">' + (r.src || '—') + '</td>' +
        '</tr>';
      }).join('');
      const badge = document.getElementById('dash-ls45-badge');
      if (badge) badge.innerText = rows.length;
      const empty = document.getElementById('ls45-empty');
      if (empty) empty.style.display = rows.length ? 'none' : 'block';
    }

    function renderDashboardSepticChart() {
      var g = function(id) { return document.getElementById(id); };
      var canvas = g('dash-septic-chart');
      if (!canvas) return;
      var fromInput = g('dashSepticFrom'), toInput = g('dashSepticTo');
      if (fromInput && !fromInput.value) {
        var d = new Date(); d.setDate(d.getDate() - 30);
        fromInput.value = d.toISOString().split('T')[0];
      }
      if (toInput && !toInput.value) toInput.value = new Date().toISOString().split('T')[0];
      var from = fromInput ? fromInput.value : '', to = toInput ? toInput.value : '';
      if (!from || !to) return;
      var filtered = septicRecords.filter(function(s) {
        var d = (s.date || '').slice(0, 10);
        return d >= from && d <= to;
      });
      // Aggregate trips by septic name
      var map = {};
      filtered.forEach(function(s) {
        var n = s.name || s.sector || 'غير معروف';
        map[n] = (map[n] || 0) + (parseInt(s.trips) || 0);
      });
      var labels = Object.keys(map).sort();
      var values = labels.map(function(l) { return map[l]; });
      var total = values.reduce(function(a, b) { return a + b; }, 0);
      var _sig = from + '|' + to + '|' + labels.join(',') + '|' + values.join(',');
      if (g('dash-septic-badge')) g('dash-septic-badge').innerText = total;
      if (g('dash-septic-legend')) g('dash-septic-legend').innerHTML = 'إجمالي النقلات: ' + total + ' | الفترة: ' + from + ' → ' + to;

      // Destroy existing Chart.js instance (فقط عند تغير البيانات - لمنع رقص الرسم مع كل دورة مزامنة)
      if (canvas.__sig === _sig && canvas.__chart) return;
      canvas.__sig = _sig;
      if (canvas.__chart) { try { canvas.__chart.destroy(); } catch(e) {} }
      if (typeof Chart === 'undefined') return;
      var ctx = canvas.getContext('2d');
      var colors = ['#1b5e20','#2e7d32','#388e3c','#43a047','#4caf50','#66bb6a','#81c784','#a5d6a7','#c8e6c9','#e8f5e9','#1b5e20','#2e7d32','#388e3c','#43a047','#4caf50','#66bb6a','#81c784','#a5d6a7','#c8e6c9','#e8f5e9'];
      canvas.__chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'عدد النقلات',
            data: values,
            backgroundColor: labels.map(function(_, i) { return colors[i % colors.length]; }),
            borderColor: '#1b5e20',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              rtl: true,
              callbacks: {
                label: function(ctx) { return ctx.parsed.y + ' نقلة'; }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'عدد النقلات' } },
            x: { ticks: { maxRotation: 45 } }
          }
        }
      });
    }

    function renderDashboardMaintChart() {
      var g = function(id) { return document.getElementById(id); };
      var canvas = g('dash-maint-chart');
      if (!canvas) return;
      var fromInput = g('dashMaintFrom'), toInput = g('dashMaintTo');
      if (fromInput && !fromInput.value) { var d = new Date(); d.setDate(d.getDate() - 30); fromInput.value = d.toISOString().split('T')[0]; }
      if (toInput && !toInput.value) toInput.value = new Date().toISOString().split('T')[0];
      var from = fromInput ? fromInput.value : '', to = toInput ? toInput.value : '';
      if (!from || !to) return;
      var filtered = maintenanceRecords.filter(function(m) {
        var d = (m.date || '').slice(0, 10);
        return d >= from && d <= to;
      });
      var catMap = {};
      filtered.forEach(function(m) { var c = m.category || 'غير مصنف'; catMap[c] = (catMap[c] || 0) + 1; });
      var labels = Object.keys(catMap).sort();
      var values = labels.map(function(l) { return catMap[l]; });
      var total = values.reduce(function(a,b) { return a+b; }, 0);
      var _sig = from + '|' + to + '|' + labels.join(',') + '|' + values.join(',');
      if (g('dash-maint-badge')) g('dash-maint-badge').innerText = total;
      if (g('dash-maint-stats')) {
        g('dash-maint-stats').innerHTML = labels.map(function(l, i) {
          return '<span style="background:#e3f2fd;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;">' + l + ': ' + values[i] + '</span>';
        }).join(' ') + ' | <span style="font-weight:700;">الإجمالي: ' + total + '</span>';
      }
      if (g('dash-maint-legend')) g('dash-maint-legend').innerHTML = 'الفترة: ' + from + ' → ' + to;
      // إعادة البناء فقط عند تغير البيانات - لمنع رقص الرسم مع كل دورة مزامنة
      if (canvas.__sig === _sig && canvas.__chart) return;
      canvas.__sig = _sig;
      if (canvas.__chart) { try { canvas.__chart.destroy(); } catch(e) {} }
      if (typeof Chart === 'undefined') return;
      var ctx = canvas.getContext('2d');
      var colors = ['#1565c0','#1976d2','#1e88e5','#2196f3','#42a5f5','#64b5f6','#90caf9','#bbdefb','#1565c0','#1976d2','#1e88e5','#2196f3','#42a5f5','#64b5f6'];
      canvas.__chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'عدد المهام',
            data: values,
            backgroundColor: labels.map(function(_, i) { return colors[i % colors.length]; }),
            borderColor: '#1565c0', borderWidth: 1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { rtl: true, callbacks: { label: function(ctx) { return ctx.parsed.y + ' مهمة'; } } }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'عدد المهام' } },
            x: { ticks: { maxRotation: 45 } }
          }
        }
      });
    }

    function renderQuickActions() {
      var container = document.getElementById('quick-actions-container');
      if (!container) return;
      cleanQuickActions();
      container.innerHTML = quickActions.map(function(qa) {
        return '<button class="quick-action-btn" onclick="' + qa.action.replace(/"/g, '&quot;') + '"><span class="qa-icon">' + qa.icon + '</span> ' + qa.label + '</button>';
      }).join('');
    }
    var _qaEditIdx = -1;
    function openQuickActionsModal() {
      _qaEditIdx = -1;
      document.getElementById('qa-icon-input').value = '⚡';
      document.getElementById('qa-label-input').value = '';
      document.getElementById('qa-action-input').value = '';
      renderQAList();
      openModal('modal-quick-actions');
    }
    function renderQAList() {
      var list = document.getElementById('qa-list');
      list.innerHTML = quickActions.map(function(qa, i) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid #eee;"><span>' + qa.icon + ' <b>' + qa.label + '</b> <small style="color:#888;">' + qa.action + '</small></span><span><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:1px 6px;font-size:11px;margin-left:4px;" onclick="editQuickAction(' + i + ')">✏️</button><button class="btn btn-sm" style="background:#d32f2f;color:#fff;padding:1px 6px;font-size:11px;" onclick="deleteQuickAction(' + i + ')">✕</button></span></div>';
      }).join('') || '<div style="color:#999;text-align:center;">لا توجد إجراءات سريعة</div>';
    }
    function saveQuickAction() {
      var icon = document.getElementById('qa-icon-input').value.trim() || '⚡';
      var label = document.getElementById('qa-label-input').value.trim();
      var action = document.getElementById('qa-action-input').value.trim();
      if (!label) return alert('الرجاء إدخال اسم الإجراء');
      if (!action) return alert('الرجاء إدخال الأمر (JavaScript)');
      if (_qaEditIdx >= 0) {
        quickActions[_qaEditIdx] = { icon: icon, label: label, action: action };
        _qaEditIdx = -1;
      } else {
        quickActions.push({ icon: icon, label: label, action: action });
      }
      syncStorage();
      renderQuickActions();
      renderQAList();
      document.getElementById('qa-icon-input').value = 'بيانات'; document.getElementById('qa-label-input').value = ''; document.getElementById('qa-action-input').value = '';
    }
    function editQuickAction(idx) {
      var qa = quickActions[idx];
      if (!qa) return;
      _qaEditIdx = idx;
      document.getElementById('qa-icon-input').value = qa.icon;
      document.getElementById('qa-label-input').value = qa.label;
      document.getElementById('qa-action-input').value = qa.action;
    }
    function deleteQuickAction(idx) {
      if (!requireAdmin()) return;
      _logDeletion('quickActions', quickActions[idx].label);
      quickActions.splice(idx, 1);
      syncStorage();
      renderQuickActions();
      renderQAList();
    }

    function openModal(id) { var el = document.getElementById(id); if (el) { el.style.display = 'flex'; el.classList.add('open'); } }
    function closeModal(id) { var el = document.getElementById(id); if (el) { el.style.display = 'none'; el.classList.remove('open'); } }
    function showPythonModal() { openModal('modal-python'); }
    function runPythonReport() {
      try { var a = document.createElement('a'); a.href = 'linah://run-report'; a.click(); } catch(e) {}
      setTimeout(function() { openModal('modal-python'); }, 100);
    }
    function runCustomReport() {
      var from = document.getElementById('custom-report-from').value;
      var to = document.getElementById('custom-report-to').value;
      if (!from || !to) return alert('⚠️ اختر تاريخ البداية والنهاية');
      if (from > to) return alert('⚠️ تاريخ البداية أكبر من تاريخ النهاية');
      var batContent = '@echo off\r\nchcp 65001 >nul\r\nset PYTHONIOENCODING=utf-8\r\n"C:\\Users\\Salem Magdy\\AppData\\Local\\Programs\\Python\\Python312\\python.exe" "C:\\Users\\Salem Magdy\\Desktop\\LINAHSYSTEM\\reports\\weekly_report.py" --from ' + from + ' --to ' + to + '\r\necho.\r\necho Done - press any key to exit\r\npause >nul';
      var blob = new Blob([batContent], { type: 'application/bat' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'run_report_' + from + '_' + to + '.bat';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function populateAuditTypeFilter() {
      var sel = document.getElementById('filter-audit-type');
      if (!sel) return;
      var types = {};
      auditLog.forEach(function(e) { types[e.targetType] = true; });
      var val = sel.value;
      sel.innerHTML = '<option value="">كل الأنواع</option>' + Object.keys(types).sort().map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
      sel.value = val;
    }
    function renderAuditLog() {
      var tbody = document.getElementById('audit-log-body');
      if (!tbody) return;
      var empty = document.getElementById('audit-empty');
      if (empty) empty.style.display = 'none';
      tbody.innerHTML = '';
      var q = (document.getElementById('search-audit')?.value || '').toLowerCase();
      var actFil = document.getElementById('filter-audit-action')?.value || '';
      var typeFil = document.getElementById('filter-audit-type')?.value || '';
      var filtered = auditLog.filter(function(e) {
        if (actFil && e.action !== actFil) return false;
        if (typeFil && e.targetType !== typeFil) return false;
        if (q && (e.user||'').toLowerCase().indexOf(q) === -1 && (e.targetName||'').toLowerCase().indexOf(q) === -1 && (e.targetType||'').toLowerCase().indexOf(q) === -1 && (e.details||'').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#888;">لا توجد نتائج تطابق البحث</td></tr>';
        return;
      }
      var st = sortState['table-audit-log'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      else filtered = sortNewestFirst(filtered, 'time');
      filtered.forEach(function(e) {
        var actionLabels = { add:'توجد', edit:'نتائج', delete:'تطابق' };
        var actionColors = { add:'#2e7d32', edit:'#1565c0', delete:'#d32f2f' };
        var d = new Date(e.time);
        var timeStr = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
        var tr = document.createElement('tr');
        tr.innerHTML = '<td style="white-space:nowrap;font-size:11px;">' + timeStr + '</td><td><b>' + (e.user||'') + '</b></td><td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:white;background:' + (actionColors[e.action]||'#888') + ';">' + (actionLabels[e.action]||e.action) + '</span></td><td>' + (e.targetType||'') + '</td><td>' + (e.targetName||'') + '</td><td style="font-size:11px;color:#555;">' + (e.details||'') + '</td>';
        tbody.appendChild(tr);
      });
    }
    function exportAuditLog() {
      if (!auditLog.length) return alert('لا توجد سجلات للتصدير');
      var rows = [['حذف لا', 'توجد', 'سجلات', 'للتصدير التاريخ', 'والوقت', 'المستخدم']];
      var labels = { add:'الإجراء', edit:'نوع', delete:'الكيان' };
      auditLog.forEach(function(e) {
        var d = new Date(e.time);
        var timeStr = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
        rows.push([timeStr, e.user || '', labels[e.action] || e.action, e.targetType || '', e.targetName || '', e.details || '']);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الاسم تفاصيل');
      XLSX.writeFile(wb, 'إضافة_تعديل_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
    function renderFinanceTab() {
      if (typeof finRenderAll === 'function') {
        try { finRenderAll(); } catch(e) { console.error('Finance error:', e); }
      } else {
        var el = document.getElementById('fin-stats');
        if (el) el.innerHTML = '<div style="padding:20px;color:red;text-align:center;">finance.js لم يتم تحميل</div>';
      }
    }

    // ==================== سجل التعديلات ====================
    var _reportsData = [];
    var _reportsHeaders = [];
    var _reportsApiUrl = _lsGet('linah_reports_api_url') || '';
    var _prevReportsCount = 0;

    function _flashReportsBadge() {
      var badge = document.getElementById('badge-reports');
      var btn = document.querySelector('.tab-btn[onclick*="tab-reports"]');
      if (badge) { badge.classList.remove('flash'); void badge.offsetWidth; badge.classList.add('flash'); }
      if (btn) { btn.classList.remove('flash-btn'); void btn.offsetWidth; btn.classList.add('flash-btn'); }
      setTimeout(function() {
        if (badge) badge.classList.remove('flash');
        if (btn) btn.classList.remove('flash-btn');
      }, 3500);
    }

    function _findReportCol(headers, keywords) {
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i].toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (h.indexOf(keywords[k]) !== -1) return headers[i];
        }
      }
      return null;
    }

    function retryPendingReports() {
      var local = JSON.parse(_lsGet('linah_reports') || '[]');
      if (!local.length) return;
      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        var reports = [];
        if (rows && rows.length > 0 && rows[0].data) {
          try { reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { reports = []; }
        }
        var added = 0;
        local.forEach(function(lr) {
          if (!reports.some(function(r) { return r.id === lr.id; })) {
            reports.push(lr);
            added++;
          }
        });
        if (added === 0) return;
        var method = rows && rows.length > 0 ? 'PATCH' : 'POST';
        var url = rows && rows.length > 0 ? SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports' : SUPABASE_URL + '/rest/v1/sync_data';
        return fetch(url, {
          method: method,
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(method === 'POST' ? { id: 'incident_reports', data: reports, updated_at: new Date().toISOString() } : { data: reports, updated_at: new Date().toISOString() })
        }).then(function(r) {
          if (r.ok) {
            _lsSet('linah_reports', '[]');
            console.log('✅ تم رفع ' + added + ' بلاغ محلي');
          }
        });
      }).catch(function() {});
    }

    function fetchReports() {
      document.getElementById('reports-loading').style.display = 'block';
      document.getElementById('reports-table-container').style.display = 'none';
      document.getElementById('reports-empty').style.display = 'none';

      retryPendingReports();

      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        var reports = [];
        if (rows && rows.length > 0 && rows[0].data) {
          try { reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { reports = []; }
        }
        var local = JSON.parse(_lsGet('linah_reports') || '[]');
        local.forEach(function(lr) {
          var exists = reports.some(function(r) { return r.id === lr.id; });
          if (!exists) reports.push(lr);
        });

        _reportsHeaders = ['الاسم', 'الكود', 'رقم التليفون', 'القسم', 'نوع العطل', 'وصف العطل', 'الموقع', 'الأولوية', 'الحالة', 'تاريخ الابلاغ', 'وقت الاغلاق'];
        _reportsData = reports.map(function(r) {
          return {
            _row: r.id || Date.now(),
            'الاسم': r.name || '',
            'الكود': r.code || '',
            'رقم التليفون': r.phone || '',
            'القسم': r.dept || '',
            'نوع العطل': r.type || '',
            'وصف العطل': r.desc || r.description || '',
            'الموقع': r.location || '',
            'الأولوية': r.priority || '',
            'الحالة': r.status || 'جديد',
            'تاريخ الابلاغ': r.opened_at || r.date || r.created_at || '',
            'وقت الاغلاق': r.closed_at || ''
          };
        }).reverse();
        renderReportsTable(_reportsData);
        updateReportsStats(_reportsData);
      })
      .catch(function(err) {
        var local = JSON.parse(_lsGet('linah_reports') || '[]');
        _reportsHeaders = ['الاسم', 'الكود', 'رقم التليفون', 'القسم', 'نوع العطل', 'وصف العطل', 'الموقع', 'الأولوية', 'الحالة', 'تاريخ الابلاغ', 'وقت الاغلاق'];
        _reportsData = local.map(function(r) {
          return {
            _row: r.id || Date.now(),
            'الاسم': r.name || '',
            'الكود': r.code || '',
            'رقم التليفون': r.phone || '',
            'القسم': r.dept || '',
            'نوع العطل': r.type || '',
            'وصف العطل': r.desc || r.description || '',
            'الموقع': r.location || '',
            'الأولوية': r.priority || '',
            'الحالة': r.status || 'جديد',
            'تاريخ الابلاغ': r.opened_at || r.date || r.created_at || '',
            'وقت الاغلاق': r.closed_at || ''
          };
        }).reverse();
        renderReportsTable(_reportsData);
        updateReportsStats(_reportsData);
      });
    }

    function renderReportsTable(reports) {
      var tbody = document.getElementById('reports-table-body');
      if (!reports.length) {
        document.getElementById('reports-loading').style.display = 'none';
        document.getElementById('reports-table-container').style.display = 'none';
        document.getElementById('reports-empty').style.display = 'block';
        return;
      }

      var headers = _reportsHeaders.filter(function(h) { return h && h !== '_row' && h.indexOf('Timestamp') === -1; });
      var colCode = _findReportCol(headers, ['الكود', 'كود', 'code']);
      var colDept = _findReportCol(headers, ['القسم', 'الإدارة', 'dept']);
      var colType = _findReportCol(headers, ['نوع العطل', 'نوع', 'type']);
      var colDesc = _findReportCol(headers, ['وصف العطل', 'وصف', 'تفاصيل', 'desc']);
      var colLocation = _findReportCol(headers, ['الموقع', 'مكان', 'location']);
      var colStatus = _findReportCol(headers, ['الحالة', 'status']);
      var colName = _findReportCol(headers, ['الاسم', 'اسم', 'name']);
      var colPhone = _findReportCol(headers, ['رقم التليفون', 'تليفون', 'رقم', 'phone']);
      var colPriority = _findReportCol(headers, ['الأولوية', 'priorit', 'priority']);
      var colDate = _findReportCol(headers, ['تاريخ الابلاغ', 'تاريخ', 'date']);
      var colNotes = _findReportCol(headers, ['ملاحظات', 'notes', 'وقت']);

      var displayCols = [];
      displayCols.push({ key: '_num', label: '#', w: '40px' });
      if (colName) displayCols.push({ key: colName, label: colName, w: '120px' });
      if (colCode) displayCols.push({ key: colCode, label: colCode, w: '80px' });
      if (colPhone) displayCols.push({ key: colPhone, label: colPhone, w: '100px' });
      if (colDept) displayCols.push({ key: colDept, label: colDept, w: '100px' });
      if (colType) displayCols.push({ key: colType, label: colType, w: '130px' });
      if (colDesc) displayCols.push({ key: colDesc, label: colDesc, w: '350px' });
      if (colLocation) displayCols.push({ key: colLocation, label: colLocation, w: '120px' });
      if (colPriority) displayCols.push({ key: colPriority, label: colPriority, w: '90px' });
      if (colStatus) displayCols.push({ key: colStatus, label: colStatus, w: '100px' });
      if (colNotes) displayCols.push({ key: colNotes, label: colNotes, w: '150px' });
      if (colDate) displayCols.push({ key: colDate, label: 'إجراءات', w: '140px' });

      var otherCols = headers.filter(function(h) {
        return h && h !== '_row' && h.indexOf('Timestamp') === -1 &&
          displayCols.every(function(c) { return c.key !== h; });
      });
      otherCols.forEach(function(h) { displayCols.push({ key: h, label: h, w: '120px' }); });

      displayCols.push({ key: '_actions', label: 'جديد', w: '100px', isAction: true });

      var thead = '<tr>';
      displayCols.forEach(function(c) {
        thead += '<th style="width:' + c.w + ';">' + c.label + '</th>';
      });
      thead += '</tr>';

      var html = '';
      reports.forEach(function(r, i) {
        html += '<tr>';
        displayCols.forEach(function(c) {
          if (c.key === '_num') {
            html += '<td>' + (reports.length - i) + '</td>';
          } else if (c.isAction) {
            var actions = '';
            if (colStatus) {
              actions += '<select onchange="updateReportStatusFromList(' + i + ', this.value)" style="padding:4px;border:1px solid #ddd;border-radius:4px;font-size:11px;font-family:Cairo,sans-serif;">' +
                '<option value="جديد"' + ((r[colStatus] || '') === 'جديد' ? ' selected' : '') + '>جديد</option>' +
                '<option value="قيد التنفيذ"' + ((r[colStatus] || '') === 'قيد التنفيذ' ? ' selected' : '') + '>قيد التنفيذ</option>' +
                '<option value="مغلق"' + ((r[colStatus] || '') === 'مغلق' ? ' selected' : '') + '>مغلق</option>' +
                '</select> ';
            }
            actions += '<button onclick="deleteReport(' + i + ')" style="background:#c62828;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:Cairo,sans-serif;" title="البلاغ عجل">عالي</button>';
            html += '<td class="no-print">' + actions + '</td>';
          } else {
            var val = r[c.key] || '';
            var style = '';
            if (c.key === colPriority) {
              if (val.indexOf('متوسط') !== -1 || val.indexOf('منخفض') !== -1) style = 'color:#c62828;font-weight:700;';
              else if (val.indexOf('عادي') !== -1) style = 'color:#f57f17;font-weight:700;';
              else if (val.indexOf('مغلق') !== -1 || val.indexOf('قيد') !== -1) style = 'color:#2e7d32;font-weight:700;';
            }
            if (c.key === colStatus) {
              if (val === 'مغلق') style = 'color:#2e7d32;font-weight:700;';
              else if (val === 'قيد التنفيذ') style = 'color:#f57f17;font-weight:700;';
              else style = 'color:#1565c0;font-weight:700;';
            }
            var title = c.key === colDesc ? ' title="' + val.replace(/"/g, '&quot;') + '"' : '';
            var trunc = c.key === colDesc ? ' style="max-width:300px;white-space:normal;word-break:break-word;"' : '';
            html += '<td' + trunc + title + '><span style="' + style + '">' + val + '</span></td>';
          }
        });
        html += '</tr>';
      });
      tbody.innerHTML = html;

      var thRow = document.querySelector('#table-reports thead tr');
      if (thRow) thRow.innerHTML = thead;

      document.getElementById('reports-loading').style.display = 'none';
      document.getElementById('reports-table-container').style.display = 'block';
      document.getElementById('reports-empty').style.display = 'none';
    }

    function updateReportsStats(reports) {
      var total = reports.length;
      var urgent = 0, pending = 0, closed = 0, newCount = 0;
      var headers = _reportsHeaders;
      var colType = _findReportCol(headers, ['نوع العطل', 'نوع', 'type']);
      var colStatus = _findReportCol(headers, ['الحالة', 'status']);
      var colPriority = _findReportCol(headers, ['الأولوية', 'priorit', 'priority']);

      reports.forEach(function(r) {
        var p = colPriority ? (r[colPriority] || '') : '';
        var s = colStatus ? (r[colStatus] || 'جديد') : 'عجل';
        if (p.indexOf('عالي') !== -1 || p.indexOf('قيد') !== -1) urgent++;
        if (s === 'التنفيذ مغلق') pending++;
        if (s === 'جديد') closed++;
        if (s === 'الدرجة' || s === '') newCount++;
      });
      document.getElementById('reports-stat-total').textContent = total;
      document.getElementById('reports-stat-urgent').textContent = urgent;
      document.getElementById('reports-stat-pending').textContent = pending;
      document.getElementById('reports-stat-closed').textContent = closed;
      document.getElementById('reports-stat-new').textContent = newCount;
      var badge = document.getElementById('badge-reports');
      if (badge) badge.textContent = total;
    }

    function filterReports() {
      var search = (document.getElementById('reports-search').value || '').toLowerCase();
      var typeFilter = document.getElementById('reports-filter-type').value;
      var priorityFilter = document.getElementById('reports-filter-priority').value;
      var statusFilter = document.getElementById('reports-filter-status').value;
      var colType = _findReportCol(_reportsHeaders, ['نوع العطل', 'نوع', 'type']);
      var colStatus = _findReportCol(_reportsHeaders, ['الحالة', 'status']);
      var colPriority = _findReportCol(_reportsHeaders, ['الأولوية', 'priorit', 'priority']);
      var filtered = _reportsData.filter(function(r) {
        var vals = Object.values(r).join(' ').toLowerCase();
        if (search && vals.indexOf(search) === -1) return false;
        if (typeFilter && colType && (r[colType] || '').indexOf(typeFilter) === -1) return false;
        if (priorityFilter && colPriority) {
          var p = r[colPriority] || '';
          if (priorityFilter === 'عاجل' && p.indexOf('عجل') === -1 && p.indexOf('عالي') === -1) return false;
          if (priorityFilter === 'متوسط' && p.indexOf('متوسط') === -1) return false;
          if (priorityFilter === 'منخفض' && p.indexOf('منخفض') === -1 && p.indexOf('عادي') === -1) return false;
        }
        if (statusFilter && colStatus && (r[colStatus] || 'جديد') !== statusFilter) return false;
        return true;
      });
      renderReportsTable(filtered);
    }

    function updateReportStatusFromList(index, newStatus) {
      var report = _reportsData[index];
      if (!report) return;
      report['الحالة'] = newStatus;
      if (newStatus === 'مغلق') {
        var now = new Date();
        report['وقت الاغلاق'] = now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2) + ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2);
      }
      var local = JSON.parse(_lsGet('linah_reports') || '[]');
      for (var i = 0; i < local.length; i++) {
        if ((local[i].id || i) == report._row) {
          local[i].status = newStatus;
          if (newStatus === 'مغلق') local[i].closed_at = report['وقت الاغلاق'];
          break;
        }
      }
      _lsSet('linah_reports', JSON.stringify(local));

      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        if (rows && rows.length > 0 && rows[0].data) {
          var reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          for (var j = 0; j < reports.length; j++) {
            if (reports[j].id == report._row) {
              reports[j].status = newStatus;
              if (newStatus === 'مغلق') reports[j].closed_at = report['وقت الاغلاق'];
              break;
            }
          }
          return fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: reports, updated_at: new Date().toISOString() })
          });
        }
      })
      .catch(function(e) { console.error('Status sync error:', e); });

      updateReportsStats(_reportsData);
      logAction('خصم', 'مجموع السنة', report['الشهر بلاغ'] || '', 'حالة ' + newStatus);
      if (newStatus === 'تعديل') {
          try {
            fetch('http://localhost:3456/send-resolution', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                id: report._row,
                phone: report['رقم التليفون'],
                name: report['الاسم'],
                type: report['نوع العطل'],
                desc: report['وصف العطل'],
                opened_at: report['تاريخ الابلاغ'],
                closed_at: report['وقت الاغلاق']
              })
            }).catch(function(){});
          } catch(e) {}
      }
    }

    function deleteReport(index) {
      var report = _reportsData[index];
      if (!report) return;
      if (!confirm('هل تريد حذف التقرير "' + (report['الاسم'] || '') + '"؟')) return;

      _logDeletion('incident_reports', report.id || report._row || index);
      _reportsData.splice(index, 1);

      var local = JSON.parse(_lsGet('linah_reports') || '[]');
      local = local.filter(function(lr) { return lr.id != report._row; });
      _lsSet('linah_reports', JSON.stringify(local));

      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        if (rows && rows.length > 0 && rows[0].data) {
          var reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          reports = reports.filter(function(r) { return r.id != report._row; });
          return fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: reports, updated_at: new Date().toISOString() })
          });
        }
      })
      .catch(function(e) { console.error('Delete sync error:', e); });

        renderReportsTable(_reportsData);
        updateReportsStats(_reportsData);
        if (_prevReportsCount > 0 && _reportsData.length > _prevReportsCount) {
          _flashReportsBadge();
        }
        _prevReportsCount = _reportsData.length;
      logAction('حذف', 'بلاغ أعطال', report['اسم العامل'] || '', '');
    }

    function saveReportsApiUrl() {
      fetchReports();
    }

    function testReportsApi() {
      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        var count = 0;
        if (rows && rows.length > 0 && rows[0].data) {
          try { var arr = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; count = arr.length; } catch(e) {}
        }
        alert('الاتصال ناجح! عدد البلاغات المحفوظة: ' + count);
      })
      .catch(function(e) { alert('فشل الاتصال: ' + e.message); });
    }

    function exportReportsToExcel() {
      if (!_reportsData.length) return alert('لا توجد بلاغات للتصدير');
      var wb = XLSX.utils.book_new();
      var headers = _reportsHeaders.filter(function(h) { return h && h !== '_row' && h.indexOf('Timestamp') === -1; });
      var rows = [headers.concat(['للتصدير حالة (البلاغ تحديث)'])];
      _reportsData.forEach(function(r) {
        var row = headers.map(function(h) { return r[h] || ''; });
        row.push('');
        rows.push(row);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = headers.map(function() { return { wch: 18 }; });
      ws['!cols'].push({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, 'محلي بلاغات');
      var today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, 'الأعطال_بلاغات_' + today.replace(/-/g, '') + '.xlsx');
    }

    function generateReportsQR() {
      var el = document.getElementById('reports-qrcode');
      if (!el) return;
      var url = 'https://linah-farms.github.io/LINAHSYSTEM/report.html';
      el.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url) + '&color=1b5e20" alt="QR Code" style="width:200px;height:200px;border-radius:8px;">';
    }
    function generateBakeryQR() {
      var el = document.getElementById('bakery-qr-code');
      if (!el) return;
      var url = 'https://linah-farms.github.io/LINAHSYSTEM/bakery-report.html';
      el.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url) + '&color=e65100" alt="QR Code" style="width:200px;height:200px;border-radius:8px;">';
      var urlEl = document.getElementById('bakery-qr-url');
      if (urlEl) urlEl.textContent = url;
    }
    function generateDailyDataQR() {
      var el = document.getElementById('daily-data-qrcode');
      if (!el) return;
      var url = 'https://linah-farms.github.io/LINAHSYSTEM/daily-data.html';
      el.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url) + '&color=6a1b9a" alt="QR Code" style="width:200px;height:200px;border-radius:8px;">';
    }
    function generateAllDXQR() {
      var qrs = [
        { id: 'qrr-reports', urlId: 'qrr-url-reports', url: 'https://linah-farms.github.io/LINAHSYSTEM/report.html', color: '1b5e20', label: '🚨 بلاغات الأعطال' },
        { id: 'qrr-bakery', urlId: 'qrr-url-bakery', url: 'https://linah-farms.github.io/LINAHSYSTEM/bakery-report.html', color: 'e65100', label: '🍞 بيانات المخبز' },
        { id: 'qrr-daily', urlId: 'qrr-url-daily', url: 'https://linah-farms.github.io/LINAHSYSTEM/daily-data.html', color: '6a1b9a', label: '📋 البيانات اليومية' },
        { id: 'qrr-survey', urlId: 'qrr-url-survey', url: 'https://linah-farms.github.io/LINAHSYSTEM/meal-survey-form.html', color: 'f57c00', label: '📝 استبيان الوجبات' },
        { id: 'qrr-waste', urlId: 'qrr-url-waste', url: 'https://linah-farms.github.io/LINAHSYSTEM/meal-waste-form.html', color: 'c62828', label: '🗑️ سجل هدر الوجبات' }
      ];
      qrs.forEach(function(q) {
        var el = document.getElementById(q.id);
        if (!el) return;
        el.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(q.url) + '&color=' + q.color + '" alt="QR Code" style="width:160px;height:160px;border-radius:8px;cursor:pointer;" onclick="window.open(\'' + q.url + '\',\'_blank\')">';
        var urlEl = document.getElementById(q.urlId);
        if (urlEl) { urlEl.innerHTML = '<a href="' + q.url + '" target="_blank" style="color:inherit;text-decoration:underline;">' + q.url + '</a>'; }
      });
    }
    function switchTab(tabId, el) {
      if (!el) el = document.querySelector(`.tab-btn[onclick*="'${tabId}'"]`) || document.querySelector(`.tab-btn[onclick*='"${tabId}"']`);
      document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
      var tabEl = document.getElementById(tabId);
      if (!tabEl) { console.error('Tab not found:', tabId); return; }
      tabEl.classList.add('active');
      if (el) el.classList.add('active');
      var tabNames = { 'tab-dashboard':'الرئيسية','tab-employees':'القوة','tab-housing':'السكن','tab-inventory':'المخزن','tab-vacations':'إجازات وإضافي الشئون الإدارية','tab-hospitality':'الضيافة','tab-maintenance':'الصيانة','tab-septic':'البيارات','tab-dynamic':'الإدارة المرنة','tab-excluded':'المستبعدين','tab-periodic-maint':'الصيانة الدورية','tab-tea-sugar':'شاي وسكر','tab-meal-log':'الوجبات','tab-contractors':'المقاولين','tab-bakery':'المخبز','tab-bread-supply':'توريد الخبز','tab-evaluations':'التقييمات','tab-audit':'سجل التعديلات','tab-finance':'المركز المالي والميزانية','tab-reports':'بلاغات الأعطال','tab-data-exchange':'تبادل البيانات','tab-water-stations':'محطات المياه' };
      setAction('أنت في تبويب: ' + (tabNames[tabId] || tabId));
      try { if(tabId === 'tab-dashboard') { renderDashboard(); renderQuickActions(); } } catch(e) { console.error('tab-dashboard error:', e); }
      try { if(tabId === 'tab-housing') { if(!roomsCapacity.length) rebuildRoomsFromEmployees(); renderHousingLayout(); updateHousingStats(); } } catch(e) { console.error('tab-housing error:', e); }
      try { if(tabId === 'tab-dynamic') { renderDynamicLists(); } } catch(e) { console.error('tab-dynamic error:', e); }
      try { if(tabId === 'tab-excluded') { renderExcludedTable(); } } catch(e) { console.error('tab-excluded error:', e); }
      try { if(tabId === 'tab-inventory') { renderInventoryItems(); switchArchiveTab(_arcTab || 'incoming'); } } catch(e) { console.error('tab-inventory error:', e); }
      try { if(tabId === 'tab-periodic-maint') { renderPeriodicMaintenance(); } } catch(e) { console.error('tab-periodic-maint error:', e); }
      try { if(tabId === 'tab-tea-sugar') { renderTeaSugarTable(); } } catch(e) { console.error('tab-tea-sugar error:', e); }
      try { if(tabId === 'tab-meal-log') { autoLogTodayMeals(); renderMealLogTable(); renderMealSurvey(); if(!document.getElementById('meal-date').value) document.getElementById('meal-date').value = new Date().toISOString().split('T')[0]; populatePlanDishSelects(); var pd = document.getElementById('plan-date'); if(pd && !pd.value){ var tm=new Date();tm.setDate(tm.getDate()+1);pd.value=tm.toISOString().split('T')[0]; } } } catch(e) { console.error('tab-meal-log error:', e); }
      try { if(tabId === 'tab-contractors') { populateContractorSectorDropdown(); renderContractorsTable(); } } catch(e) { console.error('tab-contractors error:', e); }
      try { if(tabId === 'tab-bakery') { renderBakeryProductions(); renderBakeryIngredients(); updateBakeryStats(); populateBakeryDropdowns(); updateBakeryProductionIngredientStocks(); generateBakeryQR(); importBakeryFormData(); } } catch(e) { console.error('tab-bakery error:', e); }
      try { if(tabId === 'tab-bread-supply') { var today = new Date().toISOString().split('T')[0]; var twentyDaysAgo = new Date(Date.now() - 20*86400000).toISOString().split('T')[0]; var el; if(el=document.getElementById('filt-ctr-from')) el.value=twentyDaysAgo; if(el=document.getElementById('filt-ctr-to')) el.value=today; if(el=document.getElementById('filt-inv-from')) el.value=twentyDaysAgo; if(el=document.getElementById('filt-inv-to')) el.value=today; renderBakeryContractorSupplies(); renderBakeryInvoices(); updateBreadSupplyStats(); populateBakeryDropdowns(); } } catch(e) { console.error('tab-bread-supply error:', e); }
      try { if(tabId === 'tab-maintenance') { searchMaintMaterial(); renderMaintMaterialsList(); } } catch(e) { console.error('tab-maintenance error:', e); }
      try { if(tabId === 'tab-septic') { renderSepticTable(); var sd = document.getElementById('septic-date'); if (sd && !sd.value) sd.value = new Date().toISOString().split('T')[0]; } } catch(e) { console.error('tab-septic error:', e); }
      try { if(tabId === 'tab-vacations') { renderOvertimeCalendar(); } } catch(e) { console.error('tab-vacations error:', e); }
      try { if(tabId === 'tab-evaluations') { populateEvalEmployees(); renderEvaluations(); } } catch(e) { console.error('tab-evaluations error:', e); }
      try { if(tabId === 'tab-finance') { renderFinanceTab(); } } catch(e) { console.error('tab-finance error:', e); }
      try { if(tabId === 'tab-reports') { fetchReports(); generateReportsQR(); } } catch(e) { console.error('tab-reports error:', e); }
      try { if(tabId === 'tab-data-exchange') { updateDXStats(); generateDailyDataQR(); generateAllDXQR(); importDailyDataFormData(); } } catch(e) { console.error('tab-data-exchange error:', e); }
      try { if(tabId === 'tab-water-stations') { renderWaterStations(); renderWaterDocs(); } } catch(e) { console.error('tab-water-stations error:', e); }
    }

    function printActiveTab() {
      let activeTab = document.querySelector('.tab-content.active');
      if(!activeTab) return window.print();
      let tabId = activeTab.id;
      let tabName = document.querySelector(`.tab-btn.active`)?.innerText?.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,'').trim() || tabId;
      let originalTitle = document.title;
      document.title = `في جداول - ${tabName}`;
      setTimeout(() => { window.print(); document.title = originalTitle; }, 100);
    }

    function exportPdfActiveTab() {
      let activeTab = document.querySelector('.tab-content.active');
      if(!activeTab) { alert('لا يوجد تبويب نشط للتصدير.'); return; }
      let tabId = activeTab.id;
      let tabName = document.querySelector(`.tab-btn.active`)?.innerText?.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,'').trim() || tabId;
      let tables = activeTab.querySelectorAll('table');
      if(!tables.length) { alert('لا يوجد جدول في هذا التبويب للتصدير.'); return; }
      let dateStr = new Date().toLocaleDateString('ar-EG');
      let html = '<html dir="rtl"><head><meta charset="UTF-8">';
      html += '<style>';
      html += '@page { size: A4 landscape; margin: 1.2cm; }';
      html += 'body { font-family: "Cairo", sans-serif; padding: 0; margin: 0; color: #222; }';
      html += '.report-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1b5e20; padding-bottom: 10px; margin-bottom: 20px; }';
      html += '.report-header h2 { margin: 0; color: #1b5e20; font-size: 22px; }';
      html += '.report-header .sub { color: #666; font-size: 13px; }';
      html += '.info-line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 15px; padding: 10px 14px; background: #f5f5f5; border-radius: 6px; }';
      html += 'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; direction: rtl; }';
      html += 'th { background: #1b5e20; color: white; padding: 8px 10px; font-size: 12px; text-align: center; }';
      html += 'td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; font-size: 12px; }';
      html += 'tr:nth-child(even) { background: #f9f9f9; }';
      html += '.footer { margin-top: 25px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 11px; color: #555; text-align: center; }';
      html += '.no-print { display: none !important; }';
      html += '</style></head><body>';
      html += '<div class="report-header">';
      html += '<div><h2>هذا التبويب</h2><div class="sub">' + tabName + '</div></div>';
      html += '<div style="font-size:14px;color:#555;">للتصدير يوليو: ' + dateStr + '</div>';
      html += '</div>';
      html += '<div class="info-line"><span><b>التحويل:</b> ' + tabName + '</span><span><b>فارمز لينه:</b> ' + dateStr + '</span></div>';
      for (var ti = 0; ti < tables.length; ti++) {
        var tbl = tables[ti].cloneNode(true);
        tbl.querySelectorAll('th.no-print, td.no-print').forEach(function(c) { c.remove(); });
        tbl.querySelectorAll('th:empty, td:empty').forEach(function(c) { c.remove(); });
        html += tbl.outerHTML;
      }
      html += '<div class="footer">تاريخ التقرير: ' + dateStr + ' — تم الإنشاء بواسطة منظومة لينه فارمز</div>';
      html += '</body></html>';
      var w = window.open('', '_blank');
      w.document.write(html);
      setTimeout(function() { w.print(); }, 800);
    }

    function addDynamicDept() {
      let deptName = document.getElementById('new-dept').value.trim();
      if(!deptName) return alert("الرجاء إدخال اسم الإدارة.");
      if(dynamicDepts.includes(deptName)) return alert("هذه الإدارة موجودة بالفعل.");
      dynamicDepts.push(deptName);
      document.getElementById('new-dept').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function addDynamicVisitorType() {
      let val = document.getElementById('new-visitor-type').value.trim();
      if(!val) return alert("الرجاء إدخال تصنيف الزائر.");
      if(dynamicVisitorTypes.includes(val)) return alert("هذا التصنيف موجود بالفعل.");
      dynamicVisitorTypes.push(val);
      document.getElementById('new-visitor-type').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addBakeryContractorName() {
      let val = document.getElementById('new-bakery-ctr').value.trim();
      if(!val) return alert("الرجاء إدخال اسم المقاول.");
      if(bakeryContractorsNames.includes(val)) return alert("هذا المقاول موجود بالفعل.");
      bakeryContractorsNames.push(val);
      document.getElementById('new-bakery-ctr').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
      populateBctrDatalist();
    }
    function fixBakeryContractors() {
      var _o = ["محمد شعبان","ممدوح بكر","عاطف عبد المغيث","مصطفى على","اسامه سمير","فارس محمد","محمود السيد"];
      bakeryContractorsNames = _o.slice();
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
      populateBctrDatalist();
      alert("تم إعادة تعيين قائمة المقاولين الأساسيين.");
    }
    function syncBakeryContractorsToSupabase() {
      var raw = { id: 'alldata' };
      raw.bakeryContractorsNames = bakeryContractorsNames;
      raw.userId = currentUser;
      raw.timestamp = new Date().toISOString();
      fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.alldata', {
        method: 'PUT',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'alldata', data: raw })
      }).then(function(r) {
        if (r.ok) alert("✅ تم مزامنة قائمة المقاولين مع Supabase بنجاح!");
        else alert("❌ فشلت المزامنة: " + r.status);
      }).catch(function(e) { alert("❌ خطأ: " + e.message); });
    }
    function addDynamicTitle() {
      let titleName = document.getElementById('new-title').value.trim();
      if(!titleName) return alert("الرجاء إدخال المسمى الوظيفي.");
      if(dynamicTitles.includes(titleName)) return alert("هذا المسمى موجود بالفعل.");
      dynamicTitles.push(titleName);
      document.getElementById('new-title').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function addNewTitleForDept() {
      var deptSel = document.getElementById('form-emp-dept');
      var titleSel = document.getElementById('form-emp-title-select');
      var dept = deptSel ? deptSel.value : '';
      if (!dept) { alert('الرجاء اختيار الإدارة أولاً.'); return; }
      var titleName = window.prompt('أدخل المسمى الوظيفي الجديد للإدارة المختارة: ' + dept, '');
      if (titleName === null || titleName === undefined) return;
      titleName = String(titleName).trim();
      if (!titleName) return;
      if (!deptTitles[dept]) deptTitles[dept] = [];
      if (deptTitles[dept].includes(titleName)) { alert('هذا المسمى مسجل بالفعل لهذه الإدارة.'); return; }
      deptTitles[dept].push(titleName);
      if (!dynamicTitles.includes(titleName)) dynamicTitles.push(titleName);
      _lsSet('dept_titles', JSON.stringify(deptTitles));
      _lsSet('dyn_titles', JSON.stringify(dynamicTitles));
      rebuildAllDropdowns();
      if (titleSel) {
        var found = false;
        Array.from(titleSel.options).forEach(function(o) { if (o.value === titleName) found = true; });
        if (found) {
          titleSel.value = titleName;
        } else {
          var opt = document.createElement('option');
          opt.value = titleName; opt.textContent = titleName;
          titleSel.appendChild(opt);
          titleSel.value = titleName;
        }
      }
    }

    function addDeptTitle() {
      let dept = document.getElementById('dept-title-dept-select').value;
      let titleName = document.getElementById('new-dept-title').value.trim();
      if(!dept) return alert("الرجاء اختيار الإدارة أولاً.");
      if(!titleName) return alert("الرجاء إدخال المسمى الوظيفي.");
      if (!deptTitles[dept]) deptTitles[dept] = [];
      if (deptTitles[dept].includes(titleName)) return alert("هذا المسمى مسجل بالفعل لهذه الإدارة.");
      deptTitles[dept].push(titleName);
      if (!dynamicTitles.includes(titleName)) dynamicTitles.push(titleName);
      document.getElementById('new-dept-title').value = '';
      _lsSet('dept_titles', JSON.stringify(deptTitles));
      _lsSet('dyn_titles', JSON.stringify(dynamicTitles));
      rebuildAllDropdowns();
      renderDeptTitleList();
    }

    function renderDeptTitleList() {
      let container = document.getElementById('dept-title-list');
      if (!container) return;
      container.innerHTML = '';
      let depts = Object.keys(deptTitles).filter(d => d);
      if (!depts.length) { container.innerHTML = '<div style="color:#999;padding:4px;">— لا توجد روابط مسجلة —</div>'; return; }
      depts.forEach(dept => {
        let titles = deptTitles[dept] || [];
        let block = document.createElement('div');
        block.style.cssText = 'border:1px solid #e0e0e0;border-radius:6px;padding:8px;margin-bottom:6px;';
        let titleHtml = '';
        titles.forEach(t => {
          let sanitizedDept = dept.replace(/'/g, "\\'");
          let sanitizedTitle = t.replace(/'/g, "\\'");
          titleHtml += `<span style="background:#f3e5f5;padding:2px 8px;border-radius:4px;font-size:11px;display:inline-flex;align-items:center;gap:4px;margin:2px;">
            ${t} <span style="cursor:pointer;color:#c62828;" onclick="removeDeptTitle('${sanitizedDept}','${sanitizedTitle}')" title="حذف">✕</span></span>`;
        });
        block.innerHTML = `<div style="font-weight:700;color:#6a1b9a;margin-bottom:4px;">🏢 ${dept}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${titleHtml}</div>`;
        container.appendChild(block);
      });
    }

    function removeDeptTitle(dept, title) {
      if (!confirm(`هل تريد حذف "${title}" من الإدارة "${dept}"؟`)) return;
      if (deptTitles[dept]) {
        _logDeletion('deptTitles', dept + '|' + title);
        deptTitles[dept] = deptTitles[dept].filter(t => t !== title);
        if (deptTitles[dept].length === 0) delete deptTitles[dept];
      }
      _lsSet('dept_titles', JSON.stringify(deptTitles));
      rebuildAllDropdowns();
      renderDeptTitleList();
    }

    function loadEmployeeCurrentDetails() {
      let q = document.getElementById('transfer-emp-search').value.trim();
      let div = document.getElementById('transfer-current-details');
      if(!q) {
        div.innerHTML = "لم يتم اختيار موظف بعد.";
        return;
      }
      let emp = findEmpByInput(q);
      if(emp) {
        div.innerHTML = `الإدارة الحالية: <span style="color:blue;">[ ${emp.dept || 'غير محددة'} ]</span> | المسمى الحالي: <span style="color:purple;">[ ${emp.title || 'غير محدد'} ]</span>`;
        document.getElementById('transfer-dept-select').value = dynamicDepts.includes(emp.dept) ? emp.dept : dynamicDepts[0];
        document.getElementById('transfer-title-select').value = dynamicTitles.includes(emp.title) ? emp.title : dynamicTitles[0];
      }
    }

    function executeEmployeeTransfer() {
      let q = document.getElementById('transfer-emp-search').value.trim();
      if(!q) return alert("الرجاء اختيار موظف أولاً.");
      let targetDept = document.getElementById('transfer-dept-select').value;
      let targetTitle = document.getElementById('transfer-title-select').value;
      
      let emp = findEmpByInput(q);
      let empIndex = emp ? employees.indexOf(emp) : -1;
      if(empIndex !== -1) {
        let oldDept = employees[empIndex].dept || 'الإدارة الحالية';
        let oldTitle = employees[empIndex].title || 'لم يتم';
        
        employees[empIndex].dept = targetDept;
        employees[empIndex].title = targetTitle;
        
        rebuildDeptTitles();
        syncStorage(); renderTable(); rebuildAllDropdowns(); loadEmployeeCurrentDetails();
        logAction('تحويل', 'موظف', employees[empIndex].name, 'من الإدارة: ' + oldDept + ' إلى ' + targetDept + ' | من المسمى: ' + oldTitle + ' إلى ' + targetTitle);
        alert(`تم نقل الموظف "${employees[empIndex].name}" بنجاح.`);
      }
    }

    function autoDiscoverDynamicData() {
      var changed = false;
      // Clean garbled entries from dynamic arrays
      function cleanGarbled(arr) {
        return (arr || []).map(function(x) {
          if (typeof x !== 'string') return '';
          var s = x.trim();
          // Remove control chars, zero-width chars, and garbled replacement chars
          s = s.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069]/g, '').replace(/[\uFFFD?]/g, '').trim();
          return s;
        }).filter(function(s) { return s && s.length >= 2; });
      }
      dynamicSectors = cleanGarbled(dynamicSectors);
      dynamicRooms = cleanGarbled(dynamicRooms);
      dynamicSeptics = cleanGarbled(dynamicSeptics);
      dynamicDepts = cleanGarbled(dynamicDepts);
      dynamicTitles = cleanGarbled(dynamicTitles);
      dynamicVisitorTypes = cleanGarbled(dynamicVisitorTypes);
      // Restore defaults if arrays are empty after cleaning
      if (!dynamicSectors.length) { dynamicSectors = ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"]; changed = true; }
      if (!dynamicVisitorTypes.length) { dynamicVisitorTypes = ["ضيوف","سيدات","طلبة مدرسة","سائقين","مقدم خدمة بدون اجر","مقدم خدمة باجر","امن ليلي"]; changed = true; }
      // Discover rooms from roomsCapacity
      var roomSet = {};
      dynamicRooms.forEach(function(r) { roomSet[r] = true; });
      roomsCapacity.forEach(function(r) {
        if (r.number && !roomSet[r.number]) {
          dynamicRooms.push(r.number);
          roomSet[r.number] = true;
          changed = true;
        }
      });
      // Discover sectors/buildings from roomsCapacity
      function sanitizeStr(s) {
        if (typeof s !== 'string') return '';
        s = s.trim().replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '').replace(/[?]/g, '').trim();
        return (s && s.length >= 2) ? s : '';
      }
      var sectorSet = {};
      dynamicSectors.forEach(function(s) { sectorSet[s] = true; });
      roomsCapacity.forEach(function(r) {
        var sec = sanitizeStr(r.sector);
        if (sec && !sectorSet[sec]) {
          dynamicSectors.push(sec);
          sectorSet[sec] = true;
          changed = true;
        }
      });
      // Discover septic names from septicRecords
      var septicSet = {};
      dynamicSeptics.forEach(function(s) { septicSet[s] = true; });
      septicRecords.forEach(function(s) {
        var sn = s.name || s.sector || '';
        if (sn && !septicSet[sn]) {
          dynamicSeptics.push(sn);
          septicSet[sn] = true;
          changed = true;
        }
      });
      // Discover bakery contractor names from supplies — disabled per user request, only 6 fixed names

      if (changed) {
        _lsSet('dyn_sectors', JSON.stringify(_strArr(dynamicSectors)));
        _lsSet('dyn_rooms', JSON.stringify(_strArr(dynamicRooms)));
        _lsSet('dyn_septics', JSON.stringify(_strArr(dynamicSeptics)));
        _lsSet('dyn_visitor_types', JSON.stringify(_strArr(dynamicVisitorTypes)));
        _lsSet('linah_bakery_contractors_names', JSON.stringify(_strArr(bakeryContractorsNames)));
      } else {
        _lsSet('dyn_sectors', JSON.stringify(_strArr(dynamicSectors)));
        _lsSet('dyn_rooms', JSON.stringify(_strArr(dynamicRooms)));
        _lsSet('dyn_septics', JSON.stringify(_strArr(dynamicSeptics)));
        _lsSet('dyn_visitor_types', JSON.stringify(_strArr(dynamicVisitorTypes)));
      }
    }

    function cleanDynamicData() {
      var changed = false;
      function scrub(arr) {
        var out = [], seen = {};
        (arr || []).forEach(function(x) {
          var s = (typeof x === 'string') ? x : (x ? String(x.name || x.title || x.label || x) : '');
          s = (s || '').trim();
          s = s.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF\u00AD\u061C\u2060-\u2069\uFFFD]/g, '').replace(/[?]/g, '').trim();
          if (!s || s.length < 2) { changed = true; return; }
          if (s.normalize) s = s.normalize('NFC');
          var k = s.replace(/[ة]/g,'ه').replace(/[أإآ]/g,'ا').replace(/[ى]/g,'ي').toLowerCase();
          if (seen[k]) { changed = true; return; }
          seen[k] = true; out.push(s);
        });
        return out;
      }
      dynamicDepts = scrub(dynamicDepts);
      dynamicTitles = scrub(dynamicTitles);
      dynamicRooms = scrub(dynamicRooms);
      dynamicSectors = scrub(dynamicSectors);
      dynamicSeptics = scrub(dynamicSeptics);
      contractorSectors = scrub(contractorSectors);
      dynamicVisitorTypes = scrub(dynamicVisitorTypes);
      bakeryContractorsNames = scrub(bakeryContractorsNames);
      if (deptTitles && typeof deptTitles === 'object') {
        Object.keys(deptTitles).forEach(function(d) {
          deptTitles[d] = scrub(deptTitles[d] || []);
          if (!deptTitles[d].length) delete deptTitles[d];
        });
      }
      if (changed) { syncStorage(); rebuildAllDropdowns(); }
      return changed;
    }

    function renderDynamicLists() {
      autoDiscoverDynamicData();
      cleanDynamicData();
      var housingSectors = {};
      roomsCapacity.forEach(function(r) { housingSectors[r.sector] = true; });
      var validSectors = Object.keys(housingSectors);
      var _depts = _strArr(dynamicDepts), _titles = _strArr(dynamicTitles), _rooms = _strArr(dynamicRooms), _septics = _strArr(dynamicSeptics), _ctrSectors = _strArr(contractorSectors), _visTypes = _strArr(dynamicVisitorTypes), _bakCtrs = _strArr(bakeryContractorsNames);
      let res = document.getElementById('dynamic-results');
      res.innerHTML = `
        <b>${_depts.join(' | ')}</b><br><br>
        <b>${_titles.join(' | ')}</b><br><br>
        <b>${validSectors.join(' | ')}</b><br><br>
        <b>${_rooms.join(' | ')}</b><br><br>
        <b>${_septics.join(' | ')}</b><br><br>
        <b>${_ctrSectors.join(' | ')}</b><br><br>
        <b>${_visTypes.join(' | ')}</b><br><br>
        <b>${_bakCtrs.join(' | ')}</b>
      `;
      renderListItems('sector', validSectors, 'sector');
      var sortedRooms = _rooms.slice().sort(naturalCompare);
      renderListItems('room', sortedRooms, 'room');
      renderListItems('septic', _septics, 'septic');
      renderListItems('dept', _depts, 'dept');
      renderListItems('title', _titles, 'title');
      renderListItems('ctr-sector', _ctrSectors, 'ctr-sector');
      renderListItems('visitor-type', _visTypes, 'visitor-type');
      renderListItems('bakery-ctr', _bakCtrs, 'bakery-ctr');
      renderContractorRoomsList();
      populateContractorRoomSectorDropdown();
      renderDeptTitleList();
      var dts = document.getElementById('dept-title-dept-select');
      if (dts) { fillSelectWithOptions('dept-title-dept-select', dynamicDepts, '-- محدد المسمى --'); }
    }

    function naturalCompare(a, b) {
      a = String(a); b = String(b);
      var re = /(\d+)|(\D+)/g;
      var aParts = a.match(re) || [];
      var bParts = b.match(re) || [];
      for (var i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        var aNum = parseInt(aParts[i], 10);
        var bNum = parseInt(bParts[i], 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum !== bNum) return aNum - bNum;
        } else {
          var cmp = aParts[i].localeCompare(bParts[i], 'ar');
          if (cmp !== 0) return cmp;
        }
      }
      return aParts.length - bParts.length;
    }

    function renderListItems(inputId, arr, listId) {
      let container = document.getElementById(listId + '-list');
      if (!container) return;
      if (!arr.length) { container.innerHTML = '<div style="color:#999;padding:4px;">— لا توجد عناصر —</div>'; return; }
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let originalArr = lists[listId] || [];
      container.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
        arr.map((item, i) => {
          let origIdx = originalArr.indexOf(item);
          let realIdx = origIdx >= 0 ? origIdx : i;
          return `<tr>
          <td style="padding:3px;border-bottom:1px solid #eee;">${i+1}</td>
          <td style="padding:3px;border-bottom:1px solid #eee;"><b>${item}</b></td>
          <td style="padding:3px;border-bottom:1px solid #eee;text-align:left;">
            <button class="btn" style="padding:1px 6px;font-size:10px;background:#1565c0;color:white;" onclick="editDynamicItem('${inputId}','${listId}',${realIdx})">تعديل</button>
            <button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteDynamicItem('${listId}',${realIdx})">حذف</button>
          </td>
        </tr>`;
        }).join('') + '</table>';
    }

    let dynamicEditIndex = null;

    function editDynamicItem(inputId, listId, idx) {
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let arr = lists[listId];
      if (!arr || idx >= arr.length) return;
      document.getElementById('new-' + inputId).value = arr[idx];
      dynamicEditIndex = { listId, idx };
      let btn = document.getElementById('btn-' + inputId);
      if (btn) { btn.textContent = 'حفظ'; btn.style.background = '#e65100'; btn.onclick = function() { saveDynamicEdit(inputId); }; }
    }

    function saveDynamicEdit(inputId) {
      if (!dynamicEditIndex) return;
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let arr = lists[dynamicEditIndex.listId];
      if (!arr || dynamicEditIndex.idx >= arr.length) { cancelDynamicEdit(inputId); return; }
      let val = document.getElementById('new-' + inputId).value.trim();
      if (!val) return alert('الرجاء إدخال القيمة.');
      if (arr.includes(val) && arr.indexOf(val) !== dynamicEditIndex.idx) return alert('هذه القيمة موجودة بالفعل.');
      arr[dynamicEditIndex.idx] = val;
      cancelDynamicEdit(inputId);
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function cancelDynamicEdit(inputId) {
      dynamicEditIndex = null;
      document.getElementById('new-' + inputId).value = '';
      let btn = document.getElementById('btn-' + inputId);
      if (!btn) return;
      btn.textContent = '➕ إضافة'; btn.style.background = '';
      let fns = { sector: addDynamicSector, room: addDynamicRoom, septic: addDynamicSeptic, dept: addDynamicDept, title: addDynamicTitle, 'ctr-sector': addContractorSector, 'visitor-type': addDynamicVisitorType, 'bakery-ctr': addBakeryContractorName };
      if (fns[inputId]) btn.onclick = fns[inputId];
    }

    
    function deleteDynamicItem(listId, idx) { if (!requireAdmin()) return;
      if (!confirm('هل تريد حذف هذا العنصر؟')) return;
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let entityMap = { sector: 'dynamicSectors', room: 'dynamicRooms', septic: 'dynamicSeptics', dept: 'dynamicDepts', title: 'dynamicTitles', 'ctr-sector': 'contractorSectors', 'visitor-type': 'dynamicVisitorTypes', 'bakery-ctr': 'bakeryContractorsNames' };
      let arr = lists[listId];
      if (!arr || idx >= arr.length) return;
      let item = arr[idx];
      
      let inUseCount = 0;
      let inUseMsg = '';
      if (listId === 'dept') {
        inUseCount = employees.filter(function(e) { return e.dept === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' موظف لا يزال مرتبطاً بهذه الإدارة. انقلهم أولاً أو اضغط تأكيد لحذفها من الموظفين أيضاً.';
      } else if (listId === 'title') {
        inUseCount = employees.filter(function(e) { return e.title === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' موظف لا يزال مرتبطاً بهذه الوظيفة. انقلهم أولاً أو اضغط تأكيد لحذفها من الموظفين أيضاً.';
      } else if (listId === 'sector') {
        inUseCount = employees.filter(function(e) { return e.sector === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' موظف لا يزال في هذا المبنى. انقلهم أولاً أو اضغط تأكيد لحذفهم من المبنى أيضاً.';
      } else if (listId === 'room') {
        inUseCount = employees.filter(function(e) { return e.room === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' موظف لا يزال في هذه الغرفة. انقلهم أولاً أو اضغط تأكيد لحذفها منهم أيضاً.';
      } else if (listId === 'septic') {
        inUseCount = (septicRecords || []).filter(function(s) { return (s.name||s.sector||'') === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' سجل بيارات لا يزال مرتبطاً بهذا الاسم. سيتم حذفها أيضاً.';
      } else if (listId === 'bakery-ctr') {
        inUseCount = (typeof bakeryContractorSupplies !== 'undefined' ? bakeryContractorSupplies : []).filter(function(s) { return s.name === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' توريد لا يزال مرتبطاً بهذا المقاول. سيتم حذفها أيضاً.';
      } else if (listId === 'visitor-type') {
        inUseCount = (typeof hospData !== 'undefined' ? hospData : []).filter(function(h) { return h.type === item; }).length;
        if (inUseCount > 0) inUseMsg = 'هناك ' + inUseCount + ' زائر لا يزال مرتبطاً بهذا التصنيف. سيتم حذفه منهم أيضاً.';
      }
      
      if (inUseCount > 0) {
        if (!confirm('تحذير: ' + inUseMsg + '\n\nهل تريد الاستمرار في الحذف؟')) return;
      }
      
      let key = (typeof item === 'string') ? item : (item.name || item.label || item.id || JSON.stringify(item));
      _logDeletion(entityMap[listId] || listId, key);
      arr.splice(idx, 1);
      if (listId === 'sector') {
        employees.forEach(function(e) { if (e.sector === item) { e.sector = ''; e.room = ''; } });
        roomsCapacity = roomsCapacity.filter(function(r) { return r.sector !== item; });
        _logDeletion('roomsCapacity', item);
      }
      if (listId === 'room') {
        employees.forEach(function(e) { if (e.room === item) e.room = ''; });
        roomsCapacity = roomsCapacity.filter(function(r) { return r.number !== item; });
        _logDeletion('roomsCapacity (from room delete)', item);
      }
      if (listId === 'dept') {
        employees.forEach(function(e) { if (e.dept === item) e.dept = ''; });
      }
      if (listId === 'title') {
        employees.forEach(function(e) { if (e.title === item) e.title = ''; });
      }
      if (listId === 'septic') {
        if (typeof septicRecords !== 'undefined') { septicRecords = septicRecords.filter(function(s) { return (s.name||s.sector||'') !== item; }); }
        _logDeletion('septicRecords (from septic delete)', item);
      }
      if (listId === 'bakery-ctr' && typeof bakeryContractorSupplies !== 'undefined') {
        bakeryContractorSupplies = bakeryContractorSupplies.filter(function(s) { return s.name !== item; });
        _lsSet('linah_bakery_ctr_supplies', JSON.stringify(bakeryContractorSupplies));
        if (typeof reRenderBakeryTabs === 'function') reRenderBakeryTabs();
        _logDeletion('bakeryContractorSupplies (from bakery-ctr delete)', item);
      }
      if (listId === 'visitor-type') {
        if (typeof hospData !== 'undefined') { hospData = hospData.filter(function(h) { return h.type !== item; }); }
      }
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists(); renderHousingLayout();
      if (listId === 'bakery-ctr') populateBctrDatalist();
    }
  function addDynamicSector() {
      let val = document.getElementById('new-sector').value.trim();
      if(!val) return alert('الرجاء إدخال اسم المبنى.');
      if(roomsCapacity.some(function(r) { return r.sector === val; })) return alert('هذا المبنى موجود بالفعل.');
      roomsCapacity.push({ sector: val, number: 'البيارات 1', beds: 1 });
      if(!dynamicSectors.includes(val)) dynamicSectors.push(val);
      document.getElementById('new-sector').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists(); renderHousingLayout();
    }
    function addDynamicRoom() {
      let val = document.getElementById('new-room').value.trim();
      if(!val) return alert('الرجاء إدخال رقم/اسم الغرفة.');
      if(dynamicRooms.includes(val)) return alert('هذه الغرفة موجودة بالفعل.');
      dynamicRooms.push(val); document.getElementById('new-room').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addDynamicSeptic() {
      let val = document.getElementById('new-septic').value.trim();
      if(!val) return alert('الرجاء إدخال اسم البيارة.');
      if(dynamicSeptics.includes(val)) return alert('هذه البيارة موجودة بالفعل.');
      dynamicSeptics.push(val); document.getElementById('new-septic').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addContractorSector() {
      let val = document.getElementById('new-ctr-sector').value.trim();
      if(!val) return alert('الرجاء إدخال اسم المبنى.');
      if(contractorSectors.includes(val)) return alert('هذا المبنى موجود بالفعل.');
      contractorSectors.push(val); document.getElementById('new-ctr-sector').value = '';
      syncStorage(); populateContractorSectorDropdown(); renderDynamicLists();
    }

    // ============================
    //  SORTING SYSTEM (حذف)
    // ============================
    let sortState = {};

    function getSortKey(val) {
      if (val === null || val === undefined || val === '' || val === '—') return [2, ''];
      let ds = (val == null ? '' : val.toString()).trim();
      let num = parseFloat(ds);
      if (!isNaN(num) && ds === num.toString()) return [0, num];
      // Convert Arabic-Indic numerals to Western
      ds = ds.replace(/[٠-٩]/g, function(c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); });
      // Strip Unicode formatting marks (RTL, LRM, etc.) that can appear in locale dates
      ds = ds.replace(/[\u200E\u200F\u202A-\u202E\u2060-\u2064]/g, '');
      // Strip trailing time
      ds = ds.replace(/\s*\d{1,2}:\d{2}(:\d{2})?\s*$/, '');
      // Arabic month names: 15 يوليو 2026
      var arMonths = {'يناير':1,'فبراير':2,'مارس':3,'ابريل':4,'أبريل':4,'مايو':5,'يونيو':6,'يوليو':7,'أغسطس':8,'اغسطس':8,'سبتمبر':9,'أكتوبر':10,'اكتوبر':10,'نوفمبر':11,'نوفمبر':11,'ديسمبر':12};
      var mMatch = ds.match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/);
      if (mMatch && arMonths[mMatch[2]]) {
        var _d = ('0'+mMatch[1]).slice(-2), _m = ('0'+arMonths[mMatch[2]]).slice(-2);
        return [0, new Date(mMatch[3] + '-' + _m + '-' + _d).getTime()];
      }
      // YYYY-MM-DD or YYYY/MM/DD
      var d1 = ds.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (d1) return [0, new Date(d1[1], d1[2]-1, d1[3]).getTime()];
      // DD-MM-YYYY or MM-DD-YYYY
      var d2 = ds.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (d2) {
        var p1 = parseInt(d2[1]), p2 = parseInt(d2[2]);
        if (p1 > 12 && p2 <= 12) return [0, new Date(d2[3], p2-1, p1).getTime()]; // DD-MM-YYYY
        if (p2 > 12 && p1 <= 12) return [0, new Date(d2[3], p1-1, p2).getTime()]; // MM-DD-YYYY
        return [0, new Date(d2[3], p2-1, p1).getTime()]; // ambiguous → DD-MM-YYYY (Egypt locale)
      }
      // Try Date.parse as fallback
      var parsed = Date.parse(ds);
      if (!isNaN(parsed)) return [0, parsed];
      return [1, ds.toLowerCase()];
    }

    function sortTable(tableId, key) {
      toggleSort(tableId, key);
      if (tableId === 'table-maintenance' && typeof renderMaintenanceTable === 'function') renderMaintenanceTable();
    }

    function sortData(data, key, dir) {
      if (!key) return data;
      return [...data].sort((a, b) => {
        let va = getSortKey(a[key]), vb = getSortKey(b[key]);
        if (va[0] !== vb[0]) return va[0] - vb[0];
        if (va[1] < vb[1]) return dir === 'asc' ? -1 : 1;
        if (va[1] > vb[1]) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    function toggleSort(tableId, key) {
      let st = sortState[tableId] || { key: null, dir: 'asc' };
      if (st.key === key) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
      else { st.key = key; st.dir = 'asc'; }
      sortState[tableId] = st;
      // Update arrow indicators
      document.querySelectorAll(`#${tableId} th.sortable`).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sortKey === key) th.classList.add(st.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      });
      return st;
    }

    function initSortableTable(tableId) {
      document.querySelectorAll(`#${tableId} th`).forEach(th => {
        let key = th.dataset.sortKey;
        if (!key) return;
        th.classList.add('sortable');
        th.title = 'اضغط للفرز';
        th.addEventListener('click', () => {
          toggleSort(tableId, key);
          // Re-trigger the relevant render function
          let renderMap = {
            'table-employees-data': 'renderTable',
            'table-vacations': 'renderVacationsTable',
            'table-hospitality': 'renderHospitalityTable',
            'table-maintenance': 'renderMaintenanceTable',
            'table-septic': 'renderSepticTable',
            'table-periodic-maint': 'renderPeriodicMaintenance',
            'table-tea-sugar': 'renderTeaSugarTable',
            'table-meal-log': 'renderMealLogTable',
            'table-contractors': 'renderContractorsTable',
            'table-excluded': 'renderExcludedTable',
            'table-inventory': 'renderInventoryTable',
            'table-items-registry': 'renderInventoryItems',
            'table-bakery-ingredients': 'renderBakeryIngredients',
            'table-bakery-production': 'renderBakeryProductions',
            'table-bakery-ctr-supply': 'renderBakeryContractorSupplies',
            'table-bakery-invoices': 'renderBakeryInvoices',
            'table-archive': 'renderArchiveIncoming'
          };
          let fn = renderMap[tableId];
          if (fn && window[fn]) window[fn]();
        });
      });
    }

    // Initialize all sortable tables after DOM ready
    function initAllSortableTables() {
      let ids = ['table-employees-data','table-vacations','table-hospitality','table-maintenance',
                 'table-septic','table-periodic-maint','table-tea-sugar','table-meal-log',
                 'table-contractors','table-excluded','table-inventory','table-items-registry',
                 'table-bakery-ingredients','table-bakery-production','table-bakery-sales','table-bakery-orders',
                 'table-bakery-ctr-supply','table-bakery-invoices',
                 'table-evaluations',
                 'table-archive'];
      ids.forEach(id => { if (document.getElementById(id)) initSortableTable(id); });
    }

    function updateTabBadges() {
      let b = id => document.getElementById(id);
      if (b('badge-emp')) b('badge-emp').innerText = employees.length;
      if (b('badge-housing')) b('badge-housing').innerText = roomsCapacity.length;
      if (b('badge-inv')) b('badge-inv').innerText = inventoryItems.length;
      if (b('badge-vac')) b('badge-vac').innerText = vacations.length;
      if (b('badge-hosp')) b('badge-hosp').innerText = hospitalities.length;
      if (b('badge-maint')) b('badge-maint').innerText = maintenanceRecords.length;
      if (b('badge-septic')) b('badge-septic').innerText = septicRecords.length;
      if (b('badge-excl')) b('badge-excl').innerText = excludedEmployees.length;
      if (b('badge-pm')) b('badge-pm').innerText = periodicMaintenance.length;
      if (b('badge-ts')) b('badge-ts').innerText = teaSugarDisbursements.length;
      if (b('badge-meal')) b('badge-meal').innerText = mealLogs.length;
      if (b('badge-ctr')) b('badge-ctr').innerText = contractors.length;
      if (b('badge-bakery')) b('badge-bakery').innerText = bakeryIngredients.length;
      if (b('badge-bread-supply')) b('badge-bread-supply').innerText = bakeryContractorSupplies.length + bakeryInvoices.length;
      if (b('badge-eval')) b('badge-eval').innerText = evaluations.length;
    }

    // ====== User Management ======
    function saveUsers() {
      _lsSet('lineh_users', JSON.stringify(appUsers));
      _lsSet('lineh_current_user', currentUser);
    }

    function openManageUsers() {
      if (!requireAdmin()) return;
      renderUsersList();
      openModal('modal-manage-users');
    }

    function renderUsersList() {
      var list = document.getElementById('manage-users-list');
      if (!list) return;
      list.innerHTML = appUsers.map(function(u) {
        var roleLabel = u.role === 'admin' ? 'مدير' : 'مستخدم';
        var roleColor = u.role === 'admin' ? '#6a1b9a' : '#1565c0';
        var newRole = u.role === 'admin' ? 'user' : 'admin';
        var newLabel = u.role === 'admin' ? 'تنزيل لمستخدم' : 'ترقية لمدير';
        var isSelf = u.name === currentUser ? ' (أنت)' : '';
        var hasPass = u.passHash ? '🔑 كلمة مرور مضبوطة' : '🔓 بدون كلمة مرور';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:6px;font-size:14px;">' +
          '<span><strong>' + u.name + '</strong>' + isSelf + ' <span style="color:' + roleColor + ';font-size:12px;">(' + roleLabel + ')</span> <span style="font-size:11px;color:#888;">' + hasPass + '</span></span>' +
          '<div style="display:flex;gap:4px;">' +
          '<button class="btn btn-sm" style="background:#e65100;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="resetUserPass(\'' + u.name.replace(/'/g, "\\'") + '\')">إعادة تعيين</button>' +
          '<button class="btn btn-sm" style="background:' + roleColor + ';color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="changeUserRole(\'' + u.name.replace(/'/g, "\\'") + '\',\'' + newRole + '\')">' + newLabel + '</button>' +
          '<button class="btn btn-sm" style="background:#c62828;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="deleteAppUser(\'' + u.name.replace(/'/g, "\\'") + '\')">حذف</button>' +
          '</div></div>';
      }).join('');
    }

    function resetUserPass(name) {
      if (!requireAdmin()) return;
      var newPass = prompt('أدخل كلمة المرور الجديدة للمستخدم "' + name + '":');
      if (newPass === null) return;
      if (newPass.length < 3) { alert('كلمة المرور يجب ألا تقل عن 3 أحرف.'); return; }
      var u = appUsers.find(function(x) { return x.name === name; });
      if (!u) return;
      u.passHash = hashPass(newPass);
      delete u.noPass;
      _ts(u);
      saveUsers();
      // تحديث قائمة المستخدمين
      renderUsersList();
    }

    function changeMyPassword() {
      var old = prompt('أدخل كلمة المرور الحالية:');
      if (old === null) return;
      var u = appUsers.find(function(x) { return x.name === currentUser; });
      if (!u) return;
      if (u.passHash && u.passHash !== hashPass(old)) { alert('كلمة المرور الحالية غير صحيحة.'); return; }
      var newPass = prompt('أدخل كلمة المرور الجديدة:');
      if (newPass === null) return;
      if (newPass.length < 3) { alert('كلمة المرور الجديدة يجب ألا تقل عن 3 أحرف.'); return; }
      var confirmPass = prompt('أعد إدخال كلمة المرور الجديدة:');
      if (confirmPass !== newPass) { alert('كلمة المرور غير متطابقة.'); return; }
      u.passHash = hashPass(newPass);
      delete u.noPass;
      _ts(u);
      saveUsers();
      alert('تم تغيير كلمة المرور بنجاح.');
    }

    function addNewUser() {
      if (!requireAdmin()) return;
      var name = document.getElementById('new-user-name').value.trim();
      var role = document.getElementById('new-user-role').value;
      if (!name) { alert('الرجاء إدخال اسم المستخدم.'); return; }
      if (!/^[\u0621-\u064A\s]+$/.test(name)) { alert('الاسم يجب أن يكون بالأحرف العربية فقط.'); return; }
      if (appUsers.find(function(u) { return u.name === name; })) { alert('اسم المستخدم موجود بالفعل.'); return; }
      var pass = prompt('أدخل كلمة المرور للمستخدم "' + name + '" (اتركها فارغة لبدون كلمة مرور):');
      if (pass === null) return;
      var userObj = { name: name, role: role };
      _ts(userObj);
      if (pass && pass.length >= 3) { userObj.passHash = hashPass(pass); }
      else if (pass && pass.length > 0 && pass.length < 3) { alert('كلمة المرور يجب ألا تقل عن 3 أحرف.'); return; }
      else { userObj.noPass = true; }
      appUsers.push(userObj);
      saveUsers();
      document.getElementById('new-user-name').value = '';
      renderUsersList();
      populateLoginDropdown();
    }

    function changeUserRole(name, newRole) {
      if (!requireAdmin()) return;
      if (name === currentUser) { alert('لا يمكن تغيير صلاحية المستخدم الحالي (أنت).'); return; }
      var u = appUsers.find(function(x) { return x.name === name; });
      if (!u) return;
      u.role = newRole;
      _ts(u);
      saveUsers();
      renderUsersList();
      populateLoginDropdown();
    }

    function deleteAppUser(name) {
      if (!requireAdmin()) return;
      if (!confirm('هل أنت متأكد من حذف المستخدم "' + name + '"؟')) return;
      if (name === currentUser) { alert('لا يمكن حذف المستخدم الحالي (أنت).'); return; }
      appUsers = appUsers.filter(function(u) { return u.name !== name; });
      _logDeletion('appUsers', name);
      var deleted = _safeJsonParse(_lsGet('lineh_deleted_users'), []);
      if (deleted.indexOf(name) === -1) deleted.push(name);
      _lsSet('lineh_deleted_users', JSON.stringify(deleted));
      syncStorage();
      saveUsers();
      renderUsersList();
      populateLoginDropdown();
    }

    function populateLoginDropdown() {
      var sel = document.getElementById('login-user');
      if (!sel) return;
      sel.innerHTML = appUsers.map(function(u) { return '<option value="' + u.name + '">' + u.name + '</option>'; }).join('');
    }

    function doLogin() {
      var name = document.getElementById('login-user').value;
      var pass = document.getElementById('login-pass').value;
      var user = appUsers.find(function(u) { return u.name === name; });
      if (!user) { document.getElementById('login-error').innerText = 'اسم المستخدم غير مسجل.'; return; }
      if (!user.noPass && user.passHash && user.passHash !== hashPass(pass)) {
        document.getElementById('login-error').innerText = 'كلمة المرور غير صحيحة.'; return;
      }
      document.getElementById('login-error').innerText = '';
      document.getElementById('login-screen').classList.add('hidden');
      currentUser = name;
      _lsSet('lineh_current_user', name);
      var u = appUsers.find(function(x) { return x.name === name; });
      if (u && u.role) currentUserRole = u.role;
      applyPermissions();
      saveUsers();
      showLoginAlert(name);
      updateCurrentUserDisplay();
    }

    function backdoorLogin() {
      var existing = document.getElementById('backdoor-modal');
      if (existing) existing.remove();
      var modal = document.createElement('div');
      modal.id = 'backdoor-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;padding:24px;border-radius:12px;width:320px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);';
      box.innerHTML = '<h3 style="margin:0 0 16px;">اختيار مستخدم للدخول</h3><select id="backdoor-user" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;margin-bottom:12px;">' +
        appUsers.map(function(u) { return '<option value="' + u.name + '">' + u.name + '</option>'; }).join('') +
        '</select><button onclick="doBackdoorLogin()" style="width:100%;padding:10px;background:#2e7d32;color:#fff;border:none;border-radius:8px;font-size:15px;font-family:Cairo,sans-serif;cursor:pointer;">دخول</button>';
      modal.appendChild(box);
      document.body.appendChild(modal);
      document.getElementById('backdoor-user').focus();
    }
    function doBackdoorLogin() {
      var sel = document.getElementById('backdoor-user');
      if (!sel) return;
      var name = sel.value;
      var user = appUsers.find(function(u) { return u.name === name; });
      if (!user) return;
      currentUser = name;
      currentUserRole = user.role || 'user';
      _lsSet('lineh_current_user', name);
      applyPermissions();
      saveUsers();
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('backdoor-modal').remove();
      showLoginAlert(name);
      updateCurrentUserDisplay();
    }
    function updateCurrentUserDisplay() {
      var el = document.getElementById('current-user-name');
      if (el) el.textContent = currentUser || '—';
    }
    function logout() {
      if (!confirm('هل أنت متأكد من تسجيل خروج "' + currentUser + '"؟')) return;
      _lsRemove('lineh_current_user');
      currentUser = '';
      currentUserRole = 'user';
      document.getElementById('login-screen').classList.remove('hidden');
      _lastAction = '';
      updateCurrentUserDisplay();
    }

    function openDailyReport() {
      var existing = document.getElementById('daily-report-pass-modal');
      if (existing) existing.remove();
      var modal = document.createElement('div');
      modal.id = 'daily-report-pass-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;padding:24px;border-radius:12px;width:420px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;';
      var todayStr = new Date().toISOString().split('T')[0];
      var sections = [
        {id:'rpt-workforce', label:'القوة العاملة', def:true},
        {id:'rpt-housing', label:'السكن', def:true},
        {id:'rpt-meals', label:'الوجبات', def:true},
        {id:'rpt-guests', label:'الضيافة', def:true},
        {id:'rpt-vacations', label:'الإجازات', def:true},
        {id:'rpt-maintenance', label:'الصيانة وبلاغات الأعطال', def:true},
        {id:'rpt-septic', label:'البيارات', def:true},
        {id:'rpt-bakery-prod', label:'إنتاج المخبز', def:true},
        {id:'rpt-bakery-supply', label:'توريد الخبز', def:true},
        {id:'rpt-inventory', label:'المخزن', def:true},
        {id:'rpt-tea', label:'شاي وسكر', def:true},
        {id:'rpt-pm', label:'الصيانة الدورية', def:true},
        {id:'rpt-contractors', label:'المقاولين', def:true},
        {id:'rpt-excluded', label:'المستبعدين', def:true},
        {id:'rpt-daily-stats', label:'إحصائيات يومية', def:true}
      ];
      var checksHtml = sections.map(function(s) {
        return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:4px 0;"><input type="checkbox" id="' + s.id + '" ' + (s.def ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;"> ' + s.label + '</label>';
      }).join('');
      box.innerHTML = '<h3 style="margin:0 0 4px;color:#1b5e20;">📋 التقرير الشامل</h3>' +
        '<p style="font-size:12px;color:#666;margin:0 0 12px;">اختر الأقسام والتاريخ ثم أدخل كلمة المرور</p>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px;">' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 16px;border-radius:20px;border:2px solid #1b5e20;" id="rpt-type-daily-label"><input type="radio" name="rpt-type" value="daily" checked onchange="toggleRptType()" style="width:15px;height:15px;cursor:pointer;"> يومي</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 16px;border-radius:20px;border:2px solid #bbb;" id="rpt-type-weekly-label"><input type="radio" name="rpt-type" value="weekly" onchange="toggleRptType()" style="width:15px;height:15px;cursor:pointer;"> أسبوعي</label>' +
        '</div>' +
        '<div id="rpt-date-range" style="text-align:right;margin-bottom:10px;">' +
        '<div id="rpt-date-daily"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">📅 التاريخ</label><input type="date" id="daily-report-date" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;"></div>' +
        '<div id="rpt-date-weekly" style="display:none;"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">📅 من</label><input type="date" id="weekly-report-from" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;margin-bottom:6px;"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">📅 إلى</label><input type="date" id="weekly-report-to" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;"></div>' +
        '</div>' +
        '<div style="text-align:right;margin-bottom:10px;border:1px solid #e0e0e0;border-radius:8px;padding:10px;background:#fafafa;display:grid;grid-template-columns:1fr 1fr;gap:2px;">' +
        checksHtml +
        '</div>' +
        '<input type="password" id="daily-report-pass" placeholder="كلمة المرور (0000)" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;margin-bottom:8px;text-align:center;" onkeydown="if(event.key===\'Enter\')checkDailyReportPass()">' +
        '<button onclick="checkDailyReportPass()" style="width:100%;padding:10px;background:#1b5e20;color:#fff;border:none;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;cursor:pointer;">عرض التقرير</button>' +
        '<div id="daily-report-pass-error" style="color:#d32f2f;font-size:12px;margin-top:8px;min-height:18px;"></div>';
      modal.appendChild(box);
      document.body.appendChild(modal);
      document.getElementById('daily-report-pass').focus();
    }
    function toggleRptType() {
      var isWeekly = document.querySelector('input[name="rpt-type"]:checked').value === 'weekly';
      document.getElementById('rpt-date-daily').style.display = isWeekly ? 'none' : 'block';
      document.getElementById('rpt-date-weekly').style.display = isWeekly ? 'block' : 'none';
      var dl = document.getElementById('rpt-type-daily-label');
      var wl = document.getElementById('rpt-type-weekly-label');
      dl.style.borderColor = isWeekly ? '#bbb' : '#1b5e20';
      dl.style.background = isWeekly ? '#fff' : '#e8f5e9';
      wl.style.borderColor = isWeekly ? '#1b5e20' : '#bbb';
      wl.style.background = isWeekly ? '#e8f5e9' : '#fff';
    }
    function checkDailyReportPass() {
      var passEl = document.getElementById('daily-report-pass');
      var pass = passEl ? passEl.value : '';
      if (pass !== '0000') {
        var errEl = document.getElementById('daily-report-pass-error');
        if (errEl) errEl.innerText = 'كلمة المرور غير صحيحة';
        return;
      }
      var isWeekly = document.querySelector('input[name="rpt-type"]:checked');
      if (!isWeekly) { alert('الرجاء تحديد نطاق التاريخ لإنتاج الخبز'); return; }
      isWeekly = isWeekly.value === 'weekly';
      var dateInput;
      if (isWeekly) {
        var fromEl = document.getElementById('weekly-report-from');
        dateInput = fromEl ? fromEl.value : '';
      } else {
        var dailyEl = document.getElementById('daily-report-date');
        dateInput = dailyEl ? dailyEl.value : '';
      }
      if (!dateInput) { alert('أدخل تاريخ صرف الخبز'); return; }
      var opts = {};
      ['rpt-workforce','rpt-housing','rpt-meals','rpt-guests','rpt-vacations','rpt-maintenance','rpt-septic','rpt-bakery-prod','rpt-bakery-supply','rpt-inventory','rpt-tea','rpt-pm','rpt-contractors','rpt-excluded','rpt-daily-stats'].forEach(function(id) {
        var el = document.getElementById(id);
        opts[id] = el ? el.checked : false;
      });
      if (isWeekly) {
        var dateTo = document.getElementById('weekly-report-to').value;
      }
      document.getElementById('daily-report-pass-modal').remove();
      if (isWeekly) {
        generateWeeklyReport(dateInput, dateTo, opts);
      } else {
        generateDailyReport(dateInput, opts);
      }
    }
    function sec(title, content) { return '<div class="rp-summary"><span class="rp-summary-icon">' + title.split(' ')[0] + '</span><span class="rp-summary-label">' + title + '</span><span class="rp-summary-value">' + content + '</span></div>'; }
    function generateDailyReport(customDateStr, opts) {
      var today = customDateStr ? new Date(customDateStr + 'T00:00:00') : new Date();
      var dateStr = today.toLocaleDateString('ar-EG');
      var dateInput = today.getFullYear()+'-'+('0'+(today.getMonth()+1)).slice(-2)+'-'+('0'+today.getDate()).slice(-2);
      var logoSrc = '';
      var logoEl = document.querySelector('img[alt="Logo"]');
      if (logoEl) logoSrc = logoEl.src;
      var totalEmp = employees.length;
      var pCount = employees.filter(function(e) { return e.status === 'P'; }).length;
      var vCount = employees.filter(function(e) { return e.status === 'V'; }).length;
      var totalBeds = roomsCapacity.reduce(function(s,r) { return s + (parseInt(r.beds)||0); }, 0);
      var occupiedBeds = employees.filter(function(e) { return (e.status === 'P' || e.status === 'V') && e.room; }).length;
      var vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      var mealStats = getTodayMealStats();
      var todayGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var a = new Date(h.arrival + 'T00:00:00');
        var d = h.departure ? new Date(h.departure + 'T00:00:00') : a;
        var target = new Date(dateInput + 'T00:00:00');
        return target >= a && target <= d;
      });
      var todayMaint = maintenanceRecords.filter(function(m) { return m.date && normalizeDateStr(m.date) === dateInput; });
      var todaySeptic = septicRecords.filter(function(s) { return s.date && normalizeDateStr(s.date) === dateInput; });
      var todayProd = bakeryProductions.filter(function(p) { return normalizeDateStr(p.date) === dateInput; });
      var yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
      var yesterdayInput = yesterday.getFullYear()+'-'+('0'+(yesterday.getMonth()+1)).slice(-2)+'-'+('0'+yesterday.getDate()).slice(-2);
      var todayCtr = bakeryContractorSupplies.filter(function(s) { return normalizeDateStr(s.date) === yesterdayInput; });
      var todayInv = inventoryVouchers.filter(function(v) { return v.date && normalizeDateStr(v.date) === dateInput; });
      var todayTea = teaSugarDisbursements.filter(function(t) { return t.date && normalizeDateStr(t.date) === dateInput; });
      var todayPM = periodicMaintenance.filter(function(p) { return p.date && normalizeDateStr(p.date) === dateInput; });
      var activeVacations = vacations.filter(function(v) {
        if (!v.start) return false;
        var s = new Date(v.start + 'T00:00:00');
        var e = v.end ? new Date(v.end + 'T00:00:00') : s;
        var target = new Date(dateInput + 'T00:00:00');
        return target >= s && target <= e;
      });
      var sectionsHtml = '';
      if (opts['rpt-workforce']) {
        sectionsHtml += '<div class="rp-section">' + sec('القوة العاملة', totalEmp + ' إجمالي | ' + pCount + ' حاضر | ' + vCount + ' إجازة') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('السكن', totalBeds + ' سرير | ' + occupiedBeds + ' مشغول (' + occPct + '%) | ' + vacantBeds + ' شاغر') + '</div>';
      }
      if (opts['rpt-meals']) {
        sectionsHtml += '<div class="rp-section">' + sec('الوجبات', 'فطار ' + (pCount + mealStats.gBf) + ' | غداء ' + (pCount + mealStats.gLh) + ' | عشاء ' + (pCount + mealStats.gDn)) + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = todayGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('الضيافة', todayGuests.length + ' زائر | ' + gTotal + ' ضيف') + '</div>';
      }
      if (opts['rpt-vacations']) {
        sectionsHtml += '<div class="rp-section">' + sec('الإجازات', activeVacations.length + ' سجل') + '</div>';
      }
      if (opts['rpt-maintenance']) {
        var openM = todayMaint.filter(function(m) { return m.status === 'مفتوح' || m.status === 'open'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('الصيانة', todayMaint.length + ' طلب | ' + openM + ' مفتوح') + '</div>';
      }
      if (opts['rpt-septic']) {
        sectionsHtml += '<div class="rp-section">' + sec('البيارات', todaySeptic.length + ' عملية') + '</div>';
      }
      if (opts['rpt-bakery-prod']) {
        var prodTotal = todayProd.reduce(function(s,p) { return s + (p.breadCount || 0); }, 0);
        var prodCost = todayProd.reduce(function(s,p) {
          var f = getBakedField(p, 'flourUsed', 'flourQty');
          var y = getBakedField(p, 'yeastUsed', 'yeastQty');
          var sa = getBakedField(p, 'saltUsed', 'saltQty');
          var b = getBakedField(p, 'branUsed', 'branQty');
          var d = getBakedField(p, 'dieselUsed', 'dieselQty');
          var op = getBakedOpCost(p);
          var pF = getBakeryIngPrice('ING001'), pY = getBakeryIngPrice('ING002'), pS = getBakeryIngPrice('ING003'), pB = getBakeryIngPrice('ING004'), pD = getBakeryIngPrice('ING007');
          return s + (f * pF) + (y * pY) + (sa * pS) + (b * pB) + (d * pD) + op;
        }, 0);
        var costPerLoaf = prodTotal > 0 ? (prodCost / prodTotal) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('إنتاج المخبز', prodTotal + ' رغيف | تكلفة ' + prodCost.toFixed(0) + ' ج.م | تكلفة الرغيف ' + costPerLoaf.toFixed(2) + ' ج.م') + '</div>';
      }
      if (opts['rpt-bakery-supply']) {
        var ctrBread = todayCtr.reduce(function(s,c) { return s + (c.count || 0); }, 0);
        var ctrNames = todayCtr.map(function(c) { return c.name + ' ' + (c.count || 0); }).join(' | ');
        sectionsHtml += '<div class="rp-section">' + sec('توريد الخبز', ctrBread + ' رغيف | ' + ctrNames) + '</div>';
      }
      if (opts['rpt-inventory']) {
        var invItems = todayInv.reduce(function(s,v) { return s + (parseInt(v.qty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('المخزن', todayInv.length + ' صرف | ' + invItems + ' صنف') + '</div>';
      }
      if (opts['rpt-tea']) {
        var teaQ = todayTea.reduce(function(s,t) { return s + (parseFloat(t.teaQty) || 0); }, 0);
        var sugarQ = todayTea.reduce(function(s,t) { return s + (parseFloat(t.sugarQty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('الشاي والسكر', todayTea.length + ' صرف | شاي ' + teaQ + ' كجم | سكر ' + sugarQ + ' كجم') + '</div>';
      }
      if (opts['rpt-pm']) {
        var pmDone = todayPM.filter(function(p) { return p.status === 'تم' || p.status === 'تم التنفيذ'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('الصيانة الدورية', todayPM.length + ' مهمة | ' + pmDone + ' منفذ') + '</div>';
      }
      if (opts['rpt-contractors']) {
        var ctrDaily = contractors.reduce(function(s,c) { return s + (parseFloat(c.dailyRate) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('المقاولين', contractors.length + ' مقاول | إجمالي يومي ' + ctrDaily.toFixed(0) + ' ج.م') + '</div>';
      }
      if (opts['rpt-excluded']) {
        sectionsHtml += '<div class="rp-section">' + sec('المستبعدين', excludedEmployees.length + ' موظف') + '</div>';
      }
      if (opts['rpt-daily-stats']) {
        var ds = computeDailyStatsForRange(dateInput, dateInput);
        if (ds.length > 0) {
          var d = ds[0];
          sectionsHtml += '<div class="rp-section">' + sec('إحصائيات يومية', 'الإجمالي ' + d.total + ' | دائم حاضر ' + d.permP + ' | دائم إجازة ' + d.permV + ' | كاجول حاضر ' + d.casP + ' | كاجول إجازة ' + (d.casV || 0) + ' | ضيوف ' + d.hospGuests) + '</div>';
        }
      }
      if (!sectionsHtml) sectionsHtml = '<div style="text-align:center;padding:30px;color:#888;">بيانات الصيانة مهمة بيانات مفتوحة البيارات</div>';
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>عملية إنتاج - الخبز رغيف</title>' +
        '<style>@page{size:A4;margin:1.5cm}body{font-family:"Cairo","Segoe UI",sans-serif;direction:rtl;padding:20px;color:#222;background:#fafafa;margin:0}' +
        '.rp-container{max-width:190mm;margin:0 auto;background:white;padding:20px 25px;box-shadow:0 2px 20px rgba(0,0,0,0.1)}' +
        '.rp-header{text-align:center;border-bottom:3px double #1b5e20;padding-bottom:15px;margin-bottom:18px}' +
        '.rp-header h1{margin:0;color:#1b5e20;font-size:22px}.rp-header h2{margin:3px 0 0;color:#2e7d32;font-size:14px;font-weight:400}' +
        '.rp-header .rp-date{margin-top:6px;font-size:12px;color:#666}.rp-section{margin-bottom:6px;page-break-inside:avoid}' +
        '.rp-summary{display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:6px;padding:8px 12px;border:1px solid #e0e0e0;font-size:13px}' +
        '.rp-summary-icon{font-size:18px}.rp-summary-label{font-weight:700;color:#1b5e20;white-space:nowrap}.rp-summary-value{color:#555;margin-right:auto;text-align:left}' +
        '.rp-footer{text-align:center;border-top:2px solid #e0e0e0;padding-top:10px;margin-top:20px;font-size:10px;color:#888}' +
        '</style></head><body><div class="rp-container">' +
        '<div class="rp-header">' + (logoSrc ? '<div style="text-align:center;margin-bottom:8px;"><img src="' + logoSrc + '" style="height:50px;width:auto;"></div>' : '') +
        '<h1>بيانات توريد الخبز</h1><h2>رغيف صرف - المخزن بون</h2><div class="rp-date">بيانات ' + dateStr + '</div></div>' +
        sectionsHtml +
        '<div class="rp-footer">صنف صرف الشاي والسكر - مستلم شاي | ' + dateStr + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'سكر_كجم_' + dateInput + '.html';
        a.style.display = 'none';
        document.body.appendChild(a);
        setTimeout(function() { a.click(); }, 100);
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
      } catch(e) {
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(fullHtml); w.document.close(); }
          else { alert('تم تنفيذ المهام الدورية بنجاح'); }
        } catch(e2) { alert('خطأ في تنفيذ المهام الدورية: ' + e.message); }
      }
    }
    function generateWeeklyReport(fromDate, toDate, opts) {
      var start = new Date(fromDate + 'T00:00:00');
      var end = new Date(toDate + 'T00:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) { alert('تاريخ غير صالح: من ' + fromDate + ' إلى ' + toDate); return; }
      var days = [];
      for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2));
      }
        var dateStr = start.toLocaleDateString('ar-EG') + ' إلى ' + end.toLocaleDateString('ar-EG');
      var logoSrc = '';
      var logoEl = document.querySelector('img[alt="Logo"]');
      if (logoEl) logoSrc = logoEl.src;
      var totalEmp = employees.length;
      var pCount = employees.filter(function(e) { return e.status === 'P'; }).length;
      var vCount = employees.filter(function(e) { return e.status === 'V'; }).length;
      var totalBeds = roomsCapacity.reduce(function(s,r) { return s + (parseInt(r.beds)||0); }, 0);
      var occupiedBeds = employees.filter(function(e) { return (e.status === 'P' || e.status === 'V') && e.room; }).length;
      var vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      var allGuests = [], allMaint = [], allSeptic = [], allProd = [], allCtr = [], allInv = [], allTea = [], allPM = [], allVac = [];
      days.forEach(function(dateInput) {
        var dayGuests = hospitalities.filter(function(h) {
          if (!h.arrival) return false;
          var a = new Date(h.arrival + 'T00:00:00');
          var dep = h.departure ? new Date(h.departure + 'T00:00:00') : a;
          var target = new Date(dateInput + 'T00:00:00');
          return target >= a && target <= dep;
        });
        allGuests = allGuests.concat(dayGuests);
        allProd = allProd.concat(bakeryProductions.filter(function(p) { return normalizeDateStr(p.date) === dateInput; }));
        var yesterday = new Date(dateInput + 'T00:00:00');
        yesterday.setDate(yesterday.getDate()-1);
        var yInput = yesterday.getFullYear()+'-'+('0'+(yesterday.getMonth()+1)).slice(-2)+'-'+('0'+yesterday.getDate()).slice(-2);
        allCtr = allCtr.concat(bakeryContractorSupplies.filter(function(s) { return normalizeDateStr(s.date) === yInput; }));
        allInv = allInv.concat(inventoryVouchers.filter(function(v) { return v.date && normalizeDateStr(v.date) === dateInput; }));
        allTea = allTea.concat(teaSugarDisbursements.filter(function(t) { return t.date && normalizeDateStr(t.date) === dateInput; }));
        allPM = allPM.concat(periodicMaintenance.filter(function(p) { return p.date && normalizeDateStr(p.date) === dateInput; }));
        allMaint = allMaint.concat(maintenanceRecords.filter(function(m) { return m.date && normalizeDateStr(m.date) === dateInput; }));
        allSeptic = allSeptic.concat(septicRecords.filter(function(s) { return s.date && normalizeDateStr(s.date) === dateInput; }));
        allVac = allVac.concat(vacations.filter(function(v) {
          if (!v.start) return false;
          var s = new Date(v.start + 'T00:00:00');
          var e = v.end ? new Date(v.end + 'T00:00:00') : s;
          var target = new Date(dateInput + 'T00:00:00');
          return target >= s && target <= e;
        }));
      });
      var uniqueGuests = [];
      var gSeen = {};
      allGuests.forEach(function(h) {
        var k = h.id || (h.arrival + '-' + h.name + '-' + h.type);
        if (!gSeen[k]) { gSeen[k] = true; uniqueGuests.push(h); }
      });
      var sectionsHtml = '';
      if (opts['rpt-workforce']) {
        sectionsHtml += '<div class="rp-section">' + sec('بيانات المستبعدون موظف', totalEmp + ' بيانات | ' + pCount + ' لم | ' + vCount + ' يتم') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('بيانات اختيار', totalBeds + ' أي | ' + occupiedBeds + ' أقسام (' + occPct + '%) | ' + vacantBeds + ' للتقرير') + '</div>';
      }
      if (opts['rpt-meals']) {
        var mBf = 0, mLh = 0, mDn = 0;
        days.forEach(function(dateInput) {
          var ms = getTodayMealStats();
          mBf += pCount + ms.gBf;
          mLh += pCount + ms.gLh;
          mDn += pCount + ms.gDn;
        });
        sectionsHtml += '<div class="rp-section">' + sec('التقرير اليومي', 'لينه ' + mBf + ' | فارمز ' + mLh + ' | لينه ' + mDn + ' (فارمز ' + days.length + ' التقرير)') + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = uniqueGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('اليومي الشئون', uniqueGuests.length + ' الإدارية | ' + gTotal + ' منظومة') + '</div>';
      }
      if (opts['rpt-workforce']) {
        sectionsHtml += '<div class="rp-section">' + sec('القوة العاملة', totalEmp + ' إجمالي | ' + pCount + ' حاضر | ' + vCount + ' إجازة') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('السكن', totalBeds + ' سرير | ' + occupiedBeds + ' مشغول (' + occPct + '%) | ' + vacantBeds + ' شاغر') + '</div>';
      }
      if (opts['rpt-meals']) {
        var mBf = 0, mLh = 0, mDn = 0;
        days.forEach(function(dateInput) {
          var ms = getTodayMealStats();
          mBf += pCount + ms.gBf;
          mLh += pCount + ms.gLh;
          mDn += pCount + ms.gDn;
        });
        sectionsHtml += '<div class="rp-section">' + sec('الوجبات', 'فطار ' + mBf + ' | غداء ' + mLh + ' | عشاء ' + mDn + ' (×' + days.length + ' يوم)') + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = uniqueGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('الضيافة', uniqueGuests.length + ' زائر | ' + gTotal + ' ضيف') + '</div>';
      }
      if (opts['rpt-vacations']) {
        var uniqueVac = [];
        var vSeen = {};
        allVac.forEach(function(v) {
          if (!vSeen[v.nationalId || v.name]) { vSeen[v.nationalId || v.name] = true; uniqueVac.push(v); }
        });
        sectionsHtml += '<div class="rp-section">' + sec('الإجازات', uniqueVac.length + ' سجل') + '</div>';
      }
      if (opts['rpt-maintenance']) {
        var openM = allMaint.filter(function(m) { return m.status === 'مفتوح' || m.status === 'open'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('الصيانة', allMaint.length + ' طلب | ' + openM + ' مفتوح') + '</div>';
      }
      if (opts['rpt-septic']) {
        sectionsHtml += '<div class="rp-section">' + sec('البيارات', allSeptic.length + ' عملية') + '</div>';
      }
      if (opts['rpt-bakery-prod']) {
        var prodTotal = allProd.reduce(function(s,p) { return s + (p.breadCount || 0); }, 0);
        var prodCost = allProd.reduce(function(s,p) {
          var f = getBakedField(p, 'flourUsed', 'flourQty');
          var y = getBakedField(p, 'yeastUsed', 'yeastQty');
          var sa = getBakedField(p, 'saltUsed', 'saltQty');
          var b = getBakedField(p, 'branUsed', 'branQty');
          var d = getBakedField(p, 'dieselUsed', 'dieselQty');
          var op = getBakedOpCost(p);
          var pF = getBakeryIngPrice('ING001'), pY = getBakeryIngPrice('ING002'), pS = getBakeryIngPrice('ING003'), pB = getBakeryIngPrice('ING004'), pD = getBakeryIngPrice('ING007');
          return s + (f * pF) + (y * pY) + (sa * pS) + (b * pB) + (d * pD) + op;
        }, 0);
        var costPerLoaf = prodTotal > 0 ? (prodCost / prodTotal) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('إنتاج المخبز', prodTotal + ' رغيف | تكلفة ' + prodCost.toFixed(0) + ' ج.م | تكلفة الرغيف ' + costPerLoaf.toFixed(2) + ' ج.م (×' + days.length + ' يوم)') + '</div>';
      }
      if (opts['rpt-bakery-supply']) {
        var ctrBread = allCtr.reduce(function(s,c) { return s + (c.count || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('توريد الخبز', ctrBread + ' رغيف | ' + days.length + ' يوم') + '</div>';
      }
      if (opts['rpt-inventory']) {
        var invItems = allInv.reduce(function(s,v) { return s + (parseInt(v.qty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('المخزن', allInv.length + ' صرف | ' + invItems + ' صنف') + '</div>';
      }
      if (opts['rpt-tea']) {
        var teaQ = allTea.reduce(function(s,t) { return s + (parseFloat(t.teaQty) || 0); }, 0);
        var sugarQ = allTea.reduce(function(s,t) { return s + (parseFloat(t.sugarQty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('الشاي والسكر', allTea.length + ' صرف | شاي ' + teaQ + ' كجم | سكر ' + sugarQ + ' كجم') + '</div>';
      }
      if (opts['rpt-pm']) {
        var pmDone = allPM.filter(function(p) { return p.status === 'تم' || p.status === 'تم التنفيذ'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('الصيانة الدورية', allPM.length + ' مهمة | ' + pmDone + ' منفذ') + '</div>';
      }
      if (opts['rpt-contractors']) {
        var ctrDaily = contractors.reduce(function(s,c) { return s + (parseFloat(c.dailyRate) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('المقاولين', contractors.length + ' مقاول | إجمالي يومي ' + ctrDaily.toFixed(0) + ' ج.م') + '</div>';
      }
      if (opts['rpt-excluded']) {
        sectionsHtml += '<div class="rp-section">' + sec('المستبعدين', excludedEmployees.length + ' موظف') + '</div>';
      }
      if (opts['rpt-daily-stats']) {
        var dsData = computeDailyStatsForRange(fromDate, toDate);
        var sumTot = 0, sumPP = 0, sumPV = 0, sumCP = 0, sumCV = 0, sumGH = 0;
        dsData.forEach(function(d) { sumTot += d.total; sumPP += d.permP; sumPV += d.permV; sumCP += d.casP; sumCV += (d.casV || 0); sumGH += d.hospGuests; });
        var n = dsData.length;
        sectionsHtml += '<div class="rp-section">' + sec('إحصائيات يومية', 'المعدل — الإجمالي ' + Math.round(sumTot/n) + ' | دائم حاضر ' + Math.round(sumPP/n) + ' | دائم إجازة ' + Math.round(sumPV/n) + ' | كاجول حاضر ' + Math.round(sumCP/n) + ' | كاجول إجازة ' + Math.round(sumCV/n) + ' | ضيوف ' + Math.round(sumGH/n) + ' (×' + n + ' يوم)') + '</div>';
      }
      if (!sectionsHtml) sectionsHtml = '<div style="text-align:center;padding:30px;color:#888;">بيانات الصيانة مهمة بيانات مفتوحة رغيف</div>';
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>التقرير الأسبوعي</title>' +
        '<style>@page{size:A4;margin:1.5cm}body{font-family:"Cairo","Segoe UI",sans-serif;direction:rtl;padding:20px;color:#222;background:#fafafa;margin:0}' +
        '.rp-container{max-width:190mm;margin:0 auto;background:white;padding:20px 25px;box-shadow:0 2px 20px rgba(0,0,0,0.1)}' +
        '.rp-header{text-align:center;border-bottom:3px double #1b5e20;padding-bottom:15px;margin-bottom:18px}' +
        '.rp-header h1{margin:0;color:#1b5e20;font-size:22px}.rp-header h2{margin:3px 0 0;color:#2e7d32;font-size:14px;font-weight:400}' +
        '.rp-header .rp-date{margin-top:6px;font-size:12px;color:#666}.rp-section{margin-bottom:6px;page-break-inside:avoid}' +
        '.rp-summary{display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:6px;padding:8px 12px;border:1px solid #e0e0e0;font-size:13px}' +
        '.rp-summary-icon{font-size:18px}.rp-summary-label{font-weight:700;color:#1b5e20;white-space:nowrap}.rp-summary-value{color:#555;margin-right:auto;text-align:left}' +
        '.rp-footer{text-align:center;border-top:2px solid #e0e0e0;padding-top:10px;margin-top:20px;font-size:10px;color:#888}' +
        '</style></head><body><div class="rp-container">' +
        '<div class="rp-header">' + (logoSrc ? '<div style="text-align:center;margin-bottom:8px;"><img src="' + logoSrc + '" style="height:50px;width:auto;"></div>' : '') +
        '<h1>التقرير الأسبوعي الشامل</h1><h2>لينه فارمز</h2><div class="rp-date">' + dateStr + '</div></div>' +
        sectionsHtml +
        '<div class="rp-footer">تقرير أسبوعي — ' + dateStr + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'الشاي_والسكر_' + fromDate + '_' + toDate + '.html';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
      } catch(e) { alert('تعذر تصدير تقرير الشاي والسكر: ' + e.message); }
  }
var _breadSuggestionIdCounter = 0;
    function suggestBreadForTomorrow() {
      var today = new Date();
      var tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      var dateInput = tomorrow.getFullYear()+'-'+('0'+(tomorrow.getMonth()+1)).slice(-2)+'-'+('0'+tomorrow.getDate()).slice(-2);
      var pCount = getPresentCountOnDate(dateInput);
      var todayGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var aStr = normalizeDateStr(h.arrival);
        var dStr = h.departure ? normalizeDateStr(h.departure) : aStr;
        if (!aStr) return false;
        var a = new Date(aStr + 'T00:00:00');
        var d = new Date(dStr + 'T00:00:00');
        var target = new Date(dateInput + 'T00:00:00');
        return target >= a && target <= d;
      });
      var womenCount = 0, studentCount = 0, otherGuestsCount = 0;
      todayGuests.forEach(function(h) {
        var g = h.guests || 1;
        if (h.type === 'نساء') womenCount += g;
        else if (h.type === 'أجانب') studentCount += g;
        else otherGuestsCount += g;
      });
      var workerLoaves = pCount * 6;
      var womenLoaves = womenCount * 2;
      var studentLoaves = studentCount * 2;
      var otherGuestsLoaves = otherGuestsCount * 2;
      var existing = document.getElementById('bread-suggestion-modal');
      if (existing) existing.remove();
      var modal = document.createElement('div');
      modal.id = 'bread-suggestion-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;padding:24px;border-radius:16px;width:520px;max-width:96%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);direction:rtl;font-family:Cairo,sans-serif;max-height:90vh;overflow-y:auto;';
      var ctrRowsHtml = '';
      contractors.forEach(function(c) {
        var id = 'ctr-' + (++_breadSuggestionIdCounter);
        ctrRowsHtml += '<tr id="row-' + id + '"><td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" value="' + (c.name || '') + '" id="name-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="الدورية مهمة"></td><td style="border:1px solid #e0e0e0;padding:4px;width:100px;"><input type="number" id="qty-' + id + '" min="0" value="0" style="width:80px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:40px;"><button onclick="removeBreadCtrRow(\'row-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">✕</button></td></tr>';
      });
      box.innerHTML = '<div style="font-size:32px;margin-bottom:6px;">🍞</div>' +
        '<h3 style="margin:0 0 2px;color:#1b5e20;font-size:18px;">اقتراح كمية الخبز اليومية</h3>' +
        '<div style="margin:6px 0 10px;display:flex;align-items:center;justify-content:center;gap:8px;"><label style="font-size:13px;color:#555;">اختر التاريخ:</label><input type="date" id="bsug-date-select" value="' + dateInput + '" style="padding:6px 10px;border:2px solid #2e7d32;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;" onchange="recalcBreadSuggestionForDate()"></div>' +
        '<p style="font-size:12px;color:#888;margin:0 0 14px;">اضبط الأعداد حسب الحضور الفعلي اليوم</p>' +
        '<div style="text-align:right;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#e8f5e9;border-radius:8px;margin-bottom:6px;border-right:4px solid #2e7d32;font-size:14px;"><span>👤 العمال (الحضور ' + pCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">× 6</span><input type="number" id="bsug-workers" min="0" value="' + workerLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #a5d6a7;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fce4ec;border-radius:8px;margin-bottom:6px;border-right:4px solid #e91e63;font-size:14px;"><span>👩 السيدات (' + womenCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">افتراضي 2</span><input type="number" id="bsug-women" min="0" value="' + womenLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #f48fb1;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#e3f2fd;border-radius:8px;margin-bottom:6px;border-right:4px solid #1565c0;font-size:14px;"><span>🎒 طلبة المدرسة (' + studentCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">افتراضي 2</span><input type="number" id="bsug-students" min="0" value="' + studentLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #90caf9;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:6px;border-right:4px solid #78909c;font-size:14px;"><span>🚗 ضيوف وزوار وسواقين (' + otherGuestsCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">افتراضي 2</span><input type="number" id="bsug-other" min="0" value="' + otherGuestsLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #b0bec5;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="margin-top:10px;margin-bottom:4px;font-weight:700;color:#e65100;font-size:14px;display:flex;justify-content:space-between;align-items:center;"><span>👷 المقاولين (عدد مفتوح)</span><button onclick="addBreadCtrRow()" style="padding:4px 12px;background:#e65100;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">➕ إضافة مقاول</button></div>' +
        '<div style="max-height:200px;overflow-y:auto;margin-bottom:6px;"><table id="bread-ctr-table" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;">المقاول</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;width:100px;">عدد الأرغفة</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;width:40px;"></th></tr></thead><tbody id="bread-ctr-tbody">' + ctrRowsHtml + '</tbody></table></div>' +
        '<hr style="border:none;border-top:2px dashed #e0e0e0;margin:10px 0;">' +
        '<div style="display:flex;justify-content:space-between;padding:12px;background:#1b5e20;color:white;border-radius:10px;font-size:16px;font-weight:800;"><span>🥖 الإجمالي المقترح</span><span id="bread-total-display">' + (workerLoaves + womenLoaves + studentLoaves + otherGuestsLoaves) + ' رغيف</span></div>' +
        '</div>' +
        '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
        '<button onclick="copyBreadTotal()" style="padding:8px 20px;background:#1565c0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">📋 نسخ الإجمالي</button>' +
        '<button onclick="fillBreadProductionInput()" style="padding:8px 20px;background:#2e7d32;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">📥 تعبئة عدد الإنتاج</button>' +
        '<button onclick="document.getElementById(\'bread-suggestion-modal\').remove()" style="padding:8px 20px;background:#e0e0e0;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">إغلاق</button>' +
        '</div>';
      modal.appendChild(box);
      document.body.appendChild(modal);
    }
    function recalcBreadSuggestionForDate() {
      var dateVal = document.getElementById('bsug-date-select').value;
      if (!dateVal) return;
      var pCount = getPresentCountOnDate(dateVal);
      var planGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var aStr = normalizeDateStr(h.arrival);
        var dStr = h.departure ? normalizeDateStr(h.departure) : aStr;
        if (!aStr) return false;
        var a = new Date(aStr + 'T00:00:00');
        var d = new Date(dStr + 'T00:00:00');
        var target = new Date(dateVal + 'T00:00:00');
        return target >= a && target <= d;
      });
      var womenCount = 0, studentCount = 0, otherGuestsCount = 0;
      planGuests.forEach(function(h) {
        var g = h.guests || 1;
        if (h.type === 'نساء') womenCount += g;
        else if (h.type === 'أجانب') studentCount += g;
        else otherGuestsCount += g;
      });
      document.getElementById('bsug-workers').value = pCount * 6;
      document.getElementById('bsug-women').value = womenCount * 2;
      document.getElementById('bsug-students').value = studentCount * 2;
      document.getElementById('bsug-other').value = otherGuestsCount * 2;
      updateBreadSuggestionTotal();
    }
    function addBreadCtrRow() {
      var id = 'ctr-' + (++_breadSuggestionIdCounter);
      var tbody = document.getElementById('bread-ctr-tbody');
      if (!tbody) return;
      var tr = document.createElement('tr');
      tr.id = 'row-' + id;
      tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="name-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="المقاول اقتراح"></td><td style="border:1px solid #e0e0e0;padding:4px;width:100px;"><input type="number" id="qty-' + id + '" min="0" value="0" style="width:80px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:40px;"><button onclick="removeBreadCtrRow(\'row-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">✕</button></td>';
      tbody.appendChild(tr);
      document.getElementById('name-' + id).focus();
      updateBreadSuggestionTotal();
    }
    function removeBreadCtrRow(rowId) {
      var row = document.getElementById(rowId);
      if (row) { row.remove(); updateBreadSuggestionTotal(); }
    }
    function getBreadSuggestionTotal() {
      var total = 0;
      var el1 = document.getElementById('bsug-workers');
      var el2 = document.getElementById('bsug-women');
      var el3 = document.getElementById('bsug-students');
      var el4 = document.getElementById('bsug-other');
      if (el1) total += parseInt(el1.value) || 0;
      if (el2) total += parseInt(el2.value) || 0;
      if (el3) total += parseInt(el3.value) || 0;
      if (el4) total += parseInt(el4.value) || 0;
      var inputs = document.querySelectorAll('#bread-ctr-tbody input[id^="qty-"]');
      inputs.forEach(function(inp) {
        total += parseInt(inp.value) || 0;
      });
      return total;
    }
    function updateBreadSuggestionTotal() {
      var el = document.getElementById('bread-total-display');
      if (el) el.innerText = getBreadSuggestionTotal() + ' اعداد';
    }
    function copyBreadTotal() {
      var val = getBreadSuggestionTotal();
      navigator.clipboard.writeText(String(val)).then(function() {
        alert('تم نسخ إجمالي أرغفة الخبز: ' + val + ' رغيف');
      }).catch(function() {
        prompt('افتراضية عدل التاريخ:', val);
      });
    }
    function fillBreadProductionInput() {
      var val = getBreadSuggestionTotal();
      var input = document.getElementById('bprod-count');
      if (input) input.value = val;
      document.getElementById('bread-suggestion-modal').remove();
      estimateBprodIngredients();
      alert('تم تطبيق إجمالي أرغفة الخبز المقترحة: ' + val + ' رغيف');
    }
    function getPresentCountOnDate(targetDateStr) {
      var stat = dailyStats.find(function(s) { return s.date === targetDateStr; });
      if (stat) return (stat.permP || 0) + (stat.casP || 0);
      return employees.filter(function(e) { return e.status === 'P'; }).length;
    }

    function openBreadPlanReport(selectedDate) {
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      var tomorrowStr = tomorrow.getFullYear()+'-'+('0'+(tomorrow.getMonth()+1)).slice(-2)+'-'+('0'+tomorrow.getDate()).slice(-2);
      var planDate = selectedDate || tomorrowStr;
      var pCount = getPresentCountOnDate(planDate);
      var planGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var aStr = normalizeDateStr(h.arrival);
        var dStr = h.departure ? normalizeDateStr(h.departure) : aStr;
        if (!aStr) return false;
        var a = new Date(aStr + 'T00:00:00');
        var d = new Date(dStr + 'T00:00:00');
        var target = new Date(planDate + 'T00:00:00');
        return target >= a && target <= d;
      });
      var womenCount = 0, studentCount = 0, otherGuestsCount = 0;
      planGuests.forEach(function(h) {
        var g = h.guests || 1;
        if (h.type === 'نساء') womenCount += g;
        else if (h.type === 'أجانب') studentCount += g;
        else otherGuestsCount += g;
      });
      var workerLoaves = pCount * 6;
      var womenLoaves = womenCount * 2;
      var studentLoaves = studentCount * 2;
      var otherLoaves = otherGuestsCount * 6;
      var returnFromVacation = 5 * 6;
      var totalLoaves = workerLoaves + womenLoaves + studentLoaves + otherLoaves + returnFromVacation;
      var existing = document.getElementById('bread-plan-modal');
      if (existing) existing.remove();
      var modal = document.createElement('div');
      modal.id = 'bread-plan-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;padding:24px;border-radius:16px;width:520px;max-width:96%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);direction:rtl;font-family:Cairo,sans-serif;max-height:90vh;overflow-y:auto;';
      box.innerHTML = '<div style="font-size:32px;margin-bottom:6px;">🍞</div>' +
        '<h3 style="margin:0 0 2px;color:#e65100;font-size:18px;">تخطيط كمية الخبز</h3>' +
        '<div style="margin:6px 0 10px;display:flex;align-items:center;justify-content:center;gap:8px;"><label style="font-size:13px;color:#555;">اختر التاريخ:</label><input type="date" id="bp-date-select" value="' + planDate + '" style="padding:6px 10px;border:2px solid #e65100;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;" onchange="recalcBreadPlanForDate()"></div>' +
        '<p style="font-size:11px;color:#999;margin:0 0 14px;">اضبط الأعداد حسب الحضور الفعلي لكل فئة</p>' +
        '<div style="text-align:right;">' +
        '<div style="background:#e8f5e9;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #c8e6c9;">' +
        '<div style="font-weight:700;color:#1b5e20;margin-bottom:8px;font-size:14px;">🍞 خبز العمال والضيوف</div>' +
        '<div style="font-size:13px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #2e7d32;"><span>👤 عمال (الحضور: ' + pCount + ')</span><input type="number" id="bp-workers" min="0" value="' + pCount + '" style="width:70px;padding:4px 6px;border:1px solid #a5d6a7;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #558b2f;"><span>🧑‍🌾 عمال الأرض</span><input type="number" id="bp-ground" min="0" value="40" style="width:70px;padding:4px 6px;border:1px solid #aed581;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #e91e63;"><span>👩 سيدات</span><input type="number" id="bp-women" min="0" value="55" style="width:70px;padding:4px 6px;border:1px solid #f48fb1;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #1565c0;"><span>🎒 طلبة (الحضور: ' + studentCount + ')</span><input type="number" id="bp-students" min="0" value="' + studentCount + '" style="width:70px;padding:4px 6px;border:1px solid #90caf9;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #78909c;"><span>🚗 ضيوف آخرين (الحضور: ' + otherGuestsCount + ')</span><input type="number" id="bp-other" min="0" value="' + otherGuestsCount + '" style="width:70px;padding:4px 6px;border:1px solid #b0bec5;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #37474f;"><span>🌙 الأمن الليلي (× 2 رغيف)</span><input type="number" id="bp-night" min="0" value="12" style="width:70px;padding:4px 6px;border:1px solid #90a4ae;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '</div></div>' +
        '<div style="background:#fff8e1;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #ffe082;">' +
        '<div style="font-weight:700;color:#e65100;margin-bottom:8px;font-size:14px;display:flex;justify-content:space-between;align-items:center;"><span>👷 المقاولين</span><button onclick="addBreadPlanCtrRow()" style="padding:4px 12px;background:#e65100;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">➕ إضافة مقاول</button></div>' +
        '<div style="max-height:150px;overflow-y:auto;"><table id="bread-plan-ctr-table" style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;">المقاول</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;width:80px;">رغيف تم</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;width:30px;"></th></tr></thead><tbody id="bread-plan-ctr-tbody"></tbody></table></div>' +
        '<div style="margin-top:8px;padding:8px;background:#fff;border-radius:6px;border:1px dashed #e65100;">' +
        '<div style="font-size:12px;font-weight:600;color:#e65100;margin-bottom:4px;">📱 الصق رسائل واتساب المقاولين لإضافتهم تلقائياً:</div>' +
        '<textarea id="wa-ctr-import" rows="2" style="width:100%;padding:6px;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;font-family:inherit;resize:vertical;" placeholder="مقاول فارس محمد: 65&#10;اسامه سمير مقاول: 105&#10;مصطفي علي مقاول: ١٠٠"></textarea>' +
        '<button onclick="importWhatsAppCtrToBreadPlan()" style="margin-top:4px;padding:4px 12px;background:#075e54;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">📥 استيراد</button>' +
        '<span id="wa-ctr-status" style="font-size:11px;color:#666;margin-right:8px;"></span>' +
        '</div>' +
        '</div>' +
        '<div style="background:#fff3e0;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #ffcc80;">' +
        '<div style="font-weight:700;color:#e65100;margin-bottom:8px;font-size:14px;">بيانات نسخ الإجمالي</div>' +
        '<div style="font-size:13px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;">' +
        '<span>رغيف:</span><b id="bp-loaves-workers">' + workerLoaves + '</b>' +
        '<span>عمال الأرض:</span><b id="bp-loaves-ground">40</b>' +
        '<span>انسخ:</span><b id="bp-loaves-women">' + womenLoaves + '</b>' +
        '<span>العدد:</span><b id="bp-loaves-students">' + studentLoaves + '</b>' +
        '<span>يدوياً تم:</span><b id="bp-loaves-other">' + otherLoaves + '</b>' +
        '<span>تعبئة بيانات عدد (5):</span><b id="bp-loaves-return">' + returnFromVacation + '</b>' +
        '<span>الأمن الليلي:</span><b id="bp-loaves-night">2</b>' +
        '<span>الأرغفة:</span><b id="bp-loaves-ctr">0</b>' +
        '<hr style="grid-column:span 2;border:none;border-top:1px dashed #e0e0e0;margin:4px 0;">' +
        '<span style="font-weight:700;">سيدات:</span><b style="color:#e65100;font-size:15px;" id="bread-plan-total-display">' + totalLoaves + ' طلبة</b>' +
        '</div></div>' +
        '</div>' +
        '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
        '<button onclick="generateBreadPlanReport()" style="padding:10px 24px;background:#1b5e20;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-family:Cairo,sans-serif;font-weight:700;">📄 توليد التقرير</button>' +
        '<button onclick="document.getElementById(\'bread-plan-modal\').remove()" style="padding:10px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">إغلاق</button>' +
        '</div>';
      modal.appendChild(box);
      document.body.appendChild(modal);
    }
    function recalcBreadPlanForDate() {
      var dateVal = document.getElementById('bp-date-select').value;
      if (!dateVal) return;
      var pCount = getPresentCountOnDate(dateVal);
      var planGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var aStr = normalizeDateStr(h.arrival);
        var dStr = h.departure ? normalizeDateStr(h.departure) : aStr;
        if (!aStr) return false;
        var a = new Date(aStr + 'T00:00:00');
        var d = new Date(dStr + 'T00:00:00');
        var target = new Date(dateVal + 'T00:00:00');
        return target >= a && target <= d;
      });
      var womenCount = 0, studentCount = 0, otherGuestsCount = 0;
      planGuests.forEach(function(h) {
        var g = h.guests || 1;
        if (h.type === 'التاريخ') womenCount += g;
        else if (h.type === 'عدّل التاريخ') studentCount += g;
        else otherGuestsCount += g;
      });
      document.getElementById('bp-workers').value = pCount;
      document.getElementById('bp-women').value = 55;
      document.getElementById('bp-students').value = studentCount;
      document.getElementById('bp-other').value = otherGuestsCount;
      updateBreadPlanTotal();
    }
    var _breadPlanCtrCounter = 0;
    function addBreadPlanCtrRow() {
      var id = 'bpctr-' + (++_breadPlanCtrCounter);
      var tbody = document.getElementById('bread-plan-ctr-tbody');
      if (!tbody) return;
      var tr = document.createElement('tr');
      tr.id = 'bprow-' + id;
      tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="bpname-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="والأرقام براحتك"></td><td style="border:1px solid #e0e0e0;padding:4px;width:80px;"><input type="number" id="bpqty-' + id + '" min="0" value="0" style="width:70px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:30px;"><button onclick="removeBreadPlanCtrRow(\'bprow-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">✕</button></td>';
      tbody.appendChild(tr);
      document.getElementById('bpname-' + id).focus();
      updateBreadPlanTotal();
    }
    function removeBreadPlanCtrRow(rowId) {
      var row = document.getElementById(rowId);
      if (row) { row.remove(); updateBreadPlanTotal(); }
    }
    function updateBreadPlanTotal() {
      var workers = parseInt(document.getElementById('bp-workers').value) || 0;
      var ground = parseInt(document.getElementById('bp-ground').value) || 0;
      var women = parseInt(document.getElementById('bp-women').value) || 0;
      var students = parseInt(document.getElementById('bp-students').value) || 0;
      var other = parseInt(document.getElementById('bp-other').value) || 0;
      var workerLoaves = workers * 6;
      var groundLoaves = ground;
      var womenLoaves = women * 2;
      var studentLoaves = students * 2;
      var otherLoaves = other * 6;
      var ctrInputs = document.querySelectorAll('#bread-plan-ctr-tbody input[id^="bpqty-"]');
      var ctrTotal = 0;
      ctrInputs.forEach(function(inp) { ctrTotal += parseInt(inp.value) || 0; });
      var nightSecurity = parseInt(document.getElementById('bp-night').value) || 0;
      var nightLoaves = nightSecurity * 2;
      var returnFromVacation = 30;
      var total = workerLoaves + groundLoaves + womenLoaves + studentLoaves + otherLoaves + returnFromVacation + ctrTotal + nightLoaves;
      var ew = document.getElementById('bp-loaves-workers');
      var eg = document.getElementById('bp-loaves-ground');
      var ewo = document.getElementById('bp-loaves-women');
      var es = document.getElementById('bp-loaves-students');
      var eo = document.getElementById('bp-loaves-other');
      var en = document.getElementById('bp-loaves-night');
      var ec = document.getElementById('bp-loaves-ctr');
      var et = document.getElementById('bread-plan-total-display');
      if (ew) ew.textContent = workerLoaves;
      if (eg) eg.textContent = groundLoaves;
      if (ewo) ewo.textContent = womenLoaves;
      if (es) es.textContent = studentLoaves;
      if (eo) eo.textContent = otherLoaves;
      if (en) en.textContent = nightLoaves;
      if (ec) ec.textContent = ctrTotal;
      if (et) et.textContent = total + ' التقرير';
    }
    function generateBreadPlanReport() {
      var dateEl = document.getElementById('bp-date-select');
      var planDate = dateEl ? dateEl.value : '';
      if (!planDate) {
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        planDate = tomorrow.getFullYear()+'-'+('0'+(tomorrow.getMonth()+1)).slice(-2)+'-'+('0'+tomorrow.getDate()).slice(-2);
      }
      var dateArabic = new Date(planDate + 'T00:00:00').toLocaleDateString('ar-EG');
      var pCount = getPresentCountOnDate(planDate);
      var planGuests = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var a = new Date(h.arrival + 'T00:00:00');
        var d = h.departure ? new Date(h.departure + 'T00:00:00') : a;
        var target = new Date(planDate + 'T00:00:00');
        return target >= a && target <= d;
      });
      var womenCount = 0, studentCount = 0, otherGuestsCount = 0;
      planGuests.forEach(function(h) {
        var g = h.guests || 1;
        if (h.type === 'نساء') womenCount += g;
        else if (h.type === 'أجانب') studentCount += g;
        else otherGuestsCount += g;
      });
      var bpWorkers = parseInt(document.getElementById('bp-workers').value) || pCount;
      var bpGround = parseInt(document.getElementById('bp-ground').value) || 40;
      var bpWomen = parseInt(document.getElementById('bp-women').value) || womenCount;
      var bpStudents = parseInt(document.getElementById('bp-students').value) || studentCount;
      var bpOther = parseInt(document.getElementById('bp-other').value) || otherGuestsCount;
      var workerLoaves = bpWorkers * 6;
      var groundLoaves = bpGround;
      var womenLoaves = bpWomen * 2;
      var studentLoaves = bpStudents * 2;
      var otherLoaves = bpOther * 6;
      var nightSecurity = parseInt(document.getElementById('bp-night').value) || 0;
      var nightLoaves = nightSecurity * 2;
      var returnFromVacation = 30;
      var totalLoaves = workerLoaves + groundLoaves + womenLoaves + studentLoaves + otherLoaves + returnFromVacation;
      var ctrInputs = document.querySelectorAll('#bread-plan-ctr-tbody tr');
      var contractorsData = [];
      var ctrLoaves = 0;
      ctrInputs.forEach(function(row) {
        var nameEl = row.querySelector('input[id^="bpname-"]');
        var qtyEl = row.querySelector('input[id^="bpqty-"]');
        if (nameEl && qtyEl) {
          var name = nameEl.value.trim();
          var qty = parseInt(qtyEl.value) || 0;
          if (name && qty > 0) {
            contractorsData.push({ name: name, qty: qty });
            ctrLoaves += qty;
          }
        }
      });
      var farmLoaves = workerLoaves + groundLoaves + womenLoaves + studentLoaves + otherLoaves;
      var totalLoaves = farmLoaves + returnFromVacation + nightLoaves + ctrLoaves;
      var logoSrc = '';
      var logoEl = document.querySelector('img[alt="Logo"]');
      if (logoEl) logoSrc = logoEl.src;
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>عدد الأشخاص عدّل</title>' +
        '<style>@page{size:A4;margin:1.5cm}body{font-family:"Cairo","Segoe UI",sans-serif;direction:rtl;padding:20px;color:#222;background:#fafafa;margin:0}' +
        '.rp-container{max-width:190mm;margin:0 auto;background:white;padding:20px 25px;box-shadow:0 2px 20px rgba(0,0,0,0.1)}' +
        '.rp-header{text-align:center;border-bottom:3px double #e65100;padding-bottom:15px;margin-bottom:18px}' +
        '.rp-header h1{margin:0;color:#e65100;font-size:22px}.rp-header h2{margin:3px 0 0;color:#f57c00;font-size:14px;font-weight:400}' +
        '.rp-header .rp-date{margin-top:6px;font-size:12px;color:#666}.rp-section{margin-bottom:12px;page-break-inside:avoid}' +
        '.rp-summary{display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:6px;padding:8px 12px;border:1px solid #e0e0e0;font-size:13px}' +
        '.rp-summary-icon{font-size:18px}.rp-summary-label{font-weight:700;color:#1b5e20;white-space:nowrap}.rp-summary-value{color:#555;margin-right:auto;text-align:left}' +
        '.rp-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}' +
        '.rp-table th{background:#fff3e0;padding:6px;border:1px solid #e0e0e0;font-weight:700;color:#e65100;}' +
        '.rp-table td{padding:6px;border:1px solid #e0e0e0;}' +
        '.rp-footer{text-align:center;border-top:2px solid #e0e0e0;padding-top:10px;margin-top:20px;font-size:10px;color:#888}' +
        '</style></head><body><div class="rp-container">' +
        '<div class="rp-header">' + (logoSrc ? '<div style="text-align:center;margin-bottom:8px;"><img src="' + logoSrc + '" style="height:50px;width:auto;"></div>' : '') +
        '<h1>تقرير خطة توزيع الخبز</h1><div class="rp-date">خطة يوم ' + dateArabic + ' (' + planDate + ')</div></div>' +
        '<div class="rp-section"><div class="rp-summary"><span class="rp-summary-icon">🍞</span><span class="rp-summary-label">إجمالي الأرغفة المطلوبة</span><span class="rp-summary-value" style="font-weight:700;color:#e65100;font-size:16px;">' + totalLoaves + ' رغيف</span></div></div>' +
        '<div class="rp-section"><h3 style="color:#1b5e20;font-size:14px;margin:0 0 6px;">تفصيل التوزيع على الفئات</h3>' +
        '<table class="rp-table"><tr><th>الفئة</th><th>عدد الأرغفة</th></tr>' +
        '<tr><td>العمال (' + bpWorkers + ' × 6)</td><td style="text-align:center;">' + workerLoaves + '</td></tr>' +
        '<tr><td>عمال الأرض</td><td style="text-align:center;">' + groundLoaves + '</td></tr>' +
        '<tr><td>السيدات (' + bpWomen + ' × 2)</td><td style="text-align:center;">' + womenLoaves + '</td></tr>' +
        '<tr><td>الطالبات (' + bpStudents + ' × 2)</td><td style="text-align:center;">' + studentLoaves + '</td></tr>' +
        '<tr><td>ضيوف آخرون (' + bpOther + ' × 6)</td><td style="text-align:center;">' + otherLoaves + '</td></tr>' +
        '<tr><td>العائد من الإجازة</td><td style="text-align:center;">' + returnFromVacation + '</td></tr>' +
        '<tr><td>الأمن الليلي (' + nightSecurity + ' × 2)</td><td style="text-align:center;">' + nightLoaves + '</td></tr>' +
        '<tr style="background:#e8f5e9;font-weight:700;"><td>إجمالي أرغفة المزرعة</td><td style="text-align:center;">' + (farmLoaves + returnFromVacation + nightLoaves) + '</td></tr>' +
        '</table></div>' +
        (contractorsData.length > 0 ? '<div class="rp-section"><h3 style="color:#e65100;font-size:14px;margin:0 0 6px;">توريد المقاولين</h3><table class="rp-table"><tr><th>المقاول</th><th>عدد الأرغفة</th></tr>' + contractorsData.map(function(c) { return '<tr><td>' + c.name + '</td><td style="text-align:center;">' + c.qty + '</td></tr>'; }).join('') + '<tr style="background:#fff8e1;font-weight:700;"><td>إجمالي توريد المقاولين</td><td style="text-align:center;">' + ctrLoaves + '</td></tr></table></div>' : '') +
        '<div class="rp-section" style="background:#fff3e0;border-radius:8px;padding:10px;border:1px solid #ffcc80;text-align:center;font-size:15px;font-weight:700;color:#e65100;">إجمالي الأرغفة: ' + totalLoaves + ' رغيف</div>' +
        '<div class="rp-footer">إجمالي الأرغفة | ' + dateArabic + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'توليد_التقرير_' + planDate + '.html';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
      } catch(e) {
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(fullHtml); w.document.close(); }
          else { alert('أدخل اسم المدرسة'); }
        } catch(e2) { alert('المقاول: ' + e.message); }
      }
    }
    function requireLogin() {
      populateLoginDropdown();
      var savedUser = _lsGet('lineh_current_user');
      if (savedUser && appUsers.find(function(u) { return u.name === savedUser; })) {
        currentUser = savedUser;
        var u = appUsers.find(function(x) { return x.name === currentUser; });
        if (u && u.role) currentUserRole = u.role;
        applyPermissions();
        document.getElementById('login-screen').classList.add('hidden');
        showLoginAlert(currentUser);
        updateCurrentUserDisplay();
      } else {
        // دخول مباشر تلقائي بدون شاشة تسجيل دخول — أي جهاز يفتح الصفحة يدخل فوراً
        var autoUser = appUsers.find(function(u) { return u.name === 'مدير النظام'; }) || appUsers[0];
        if (autoUser) {
          currentUser = autoUser.name;
          currentUserRole = autoUser.role || 'admin';
          _lsSet('lineh_current_user', currentUser);
          applyPermissions();
          document.getElementById('login-screen').classList.add('hidden');
          showLoginAlert(currentUser);
          updateCurrentUserDisplay();
        } else {
          document.getElementById('login-screen').classList.remove('hidden');
          updateCurrentUserDisplay();
        }
      }
    }

    function isTodayDate(dateStr) {
      if (!dateStr) return false;
      if (dateStr === new Date().toISOString().split('T')[0]) return true;
      return dateStr === new Date().toLocaleDateString('ar-EG');
    }
    function canEditRecord(dateStr) {
      return isAdmin() || isTodayDate(dateStr);
    }

    function applyPermissions() {
      document.body.className = document.body.className.replace(/\brole-\w+\b/g, '').trim();
      document.body.classList.add('role-' + currentUserRole);
      if (currentUser === 'سالم مجدي') document.body.classList.add('backup-allowed');
    }

    var _dataChangedSinceBackup = false;
    function showLoginAlert(name) { /* removed per user request */ }
    function updateHousingStats() {
      let totalBeds = manualTotalBeds > 0 ? manualTotalBeds : roomsCapacity.reduce((s, rc) => s + (parseInt(rc.beds) || 0), 0);
      let occupiedBeds = employees.filter(e => (e.status === 'P' || e.status === 'V') && e.room).length;
      let inp = document.getElementById('stat-total-beds-input');
      if (inp) { inp.value = totalBeds; inp.style.borderColor = manualTotalBeds > 0 ? '#e65100' : '#e0e0e0'; }
      var _el;
      _el = document.getElementById('stat-occupied-beds'); if (_el) _el.innerText = occupiedBeds;
      _el = document.getElementById('stat-vacant-beds'); if (_el) _el.innerText = Math.max(0, totalBeds - occupiedBeds);
    }

    function updateManualTotalBeds(val) {
      manualTotalBeds = parseInt(val) || 0;
      _lsSet('lineh_manual_total_beds', manualTotalBeds);
      syncStorage(); updateHousingStats(); renderDashboard(); renderQuickActions();
    }

    function captureDailyStats() {
      var today = new Date().toISOString().split('T')[0];
      var total = employees.length;
      var perm = employees.filter(function(e) { return (e.contract || 'دائم') === 'دائم'; });
      var casual = employees.filter(function(e) { return (e.contract || 'دائم') === 'كاجول'; });
      var permP = perm.filter(function(e) { return e.status === 'P'; }).length;
      var permV = perm.filter(function(e) { return e.status === 'V'; }).length;
      var casP = casual.filter(function(e) { return e.status === 'P'; }).length;
      var casV = casual.filter(function(e) { return e.status !== 'P'; }).length;
      var hospTotal = calcGuestsForDate(today);
      var p = function(n) { return total > 0 ? Math.round(n / total * 100) : 0; };
      var snap = {
        date: today,
        total: total,
        permP: permP, permV: permV, permPPct: p(permP), permVPct: p(permV),
        casP: casP, casV: casV, casPPct: p(casP),
        hospGuests: hospTotal
      };
      var existing = dailyStats.findIndex(function(s) { return s.date === today; });
      if (existing >= 0) dailyStats[existing] = snap; else dailyStats.push(snap);
      dailyStats.sort(function(a, b) { return b.date.localeCompare(a.date); });
      syncStorage();
      var fromEl = document.getElementById('dailyStatsFrom');
      var toEl = document.getElementById('dailyStatsTo');
      if (fromEl && !fromEl.value) fromEl.value = today;
      if (toEl && !toEl.value) toEl.value = today;
      renderDailyStatsTable();
      alert('Saved: ' + today);
    }

    function calcGuestsForDate(dateStr) {
      var active = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        var arr = h.arrival.split('T')[0];
        var dep = (h.departure || h.arrival).split('T')[0];
        return arr <= dateStr && dep >= dateStr;
      });
      return active.reduce(function(s, h) { return s + (h.guests || 1); }, 0);
    }

    function computeDailyStatsForRange(fromDate, toDate) {
      var results = [];
      var d = new Date(fromDate + 'T00:00:00');
      var end = new Date(toDate + 'T00:00:00');
      while (d <= end) {
        var dateStr = d.toISOString().split('T')[0];
        var active = employees.filter(function(e) {
          if (e.hireDate && e.hireDate.split('T')[0] > dateStr) return false;
          return !excludedEmployees.some(function(x) {
            if ((x.code || x.name) !== (e.code || e.name)) return false;
            if (x.date && x.date.split('T')[0] <= dateStr) return true;
            return false;
          });
        });
        var total = active.length;
        var permP = 0, permV = 0, casP = 0, casV = 0;
        active.forEach(function(e) {
          var onVac = vacations.some(function(v) {
            var vStart = (v.start || v.startDate || v.dateFrom || '').split('T')[0];
            var vEnd = (v.end || v.endDate || v.dateTo || '').split('T')[0];
            if (!vStart || !vEnd) return false;
            var empId = v.code || v.employeeCode, empName = v.employeeName || v.name;
            var match = (empId && empId === e.code) || (empName && empName === e.name);
            return match && vStart <= dateStr && vEnd >= dateStr;
          });
          var isPresent = e.status !== 'V' && !onVac;
          if ((e.contract || 'دائم') === 'دائم') { if (isPresent) permP++; else permV++; }
          else { if (isPresent) casP++; else casV++; }
        });
        var hospGuests = calcGuestsForDate(dateStr);
        var p = function(n) { return total > 0 ? Math.round(n / total * 100) : 0; };
        results.push({ date: dateStr, total: total, permP: permP, permV: permV, permPPct: p(permP), permVPct: p(permV), casP: casP, casV: casV, casPPct: p(casP), hospGuests: hospGuests });
        d.setDate(d.getDate() + 1);
      }
      return results;
    }
    function renderDailyStatsTable() {
      var thead = document.getElementById('daily-stats-thead');
      var tbody = document.getElementById('daily-stats-tbody');
      if (!thead || !tbody) return;
      var fromEl = document.getElementById('dailyStatsFrom');
      var toEl = document.getElementById('dailyStatsTo');
      var fromDate = fromEl ? fromEl.value : '';
      var toDate = toEl ? toEl.value : '';
      if (!fromDate || !toDate) { tbody.innerHTML = ''; return; }
      var data = computeDailyStatsForRange(fromDate, toDate);
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="padding:15px;color:#888;">لا توجد بيانات في النطاق المحدد</td></tr>'; return; }
      var cols = ['التاريخ', 'الإجمالي', 'دائم حاضر', 'دائم إجازة', 'كاجول حاضر', 'كاجول إجازة', 'ضيوف'];
      thead.innerHTML = '<tr>' + cols.map(function(c, i) {
        var bg = i === 0 ? '#263238' : (i <= 1 ? '#1b5e20' : '#37474f');
        return '<th style="padding:6px;background:' + bg + ';color:white;border:1px solid #ddd;font-size:11px;white-space:nowrap;">' + c + '</th>';
      }).join('') + '</tr>';
      tbody.innerHTML = '';
      data.reverse();
      var sumTotal = 0, sumPP = 0, sumPV = 0, sumCP = 0, sumCV = 0, sumGuests = 0;
      data.forEach(function(s) {
        var row = '<td style="padding:5px;border:1px solid #ddd;font-weight:700;font-family:monospace;">' + s.date + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;font-weight:700;">' + s.total + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.permP + ' <span style="color:#888;font-size:10px;">(' + s.permPPct + '%)</span></td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.permV + ' <span style="color:#888;font-size:10px;">(' + s.permVPct + '%)</span></td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.casP + ' <span style="color:#888;font-size:10px;">(' + s.casPPct + '%)</span></td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + (s.casV || 0) + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.hospGuests + '</td>';
        tbody.innerHTML += '<tr>' + row + '</tr>';
        sumTotal += s.total; sumPP += s.permP; sumPV += s.permV; sumCP += s.casP; sumCV += (s.casV || 0); sumGuests += s.hospGuests;
      });
      if (data.length > 1) {
        var avgRow = '<td style="padding:5px;border:2px solid #1b5e20;font-weight:900;background:#e8f5e9;">معدل (' + data.length + ')</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;font-weight:900;background:#e8f5e9;">' + Math.round(sumTotal / data.length) + '</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;background:#e8f5e9;">' + Math.round(sumPP / data.length) + '</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;background:#e8f5e9;">' + Math.round(sumPV / data.length) + '</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;background:#e8f5e9;">' + Math.round(sumCP / data.length) + '</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;background:#e8f5e9;">' + Math.round(sumCV / data.length) + '</td>';
        avgRow += '<td style="padding:5px;border:2px solid #1b5e20;background:#e8f5e9;">' + Math.round(sumGuests / data.length) + '</td>';
        tbody.innerHTML += '<tr>' + avgRow + '</tr>';
      }
    }
    function exportDailyStatsToExcel() {
      var fromEl = document.getElementById('dailyStatsFrom');
      var toEl = document.getElementById('dailyStatsTo');
      var fromDate = fromEl ? fromEl.value : '';
      var toDate = toEl ? toEl.value : '';
      if (!fromDate || !toDate) return alert('الخبز للغد إجمالي الأرغفة رغيف');
      var data = computeDailyStatsForRange(fromDate, toDate);
      if (!data.length) return alert('No data in range');
      data.reverse();
      var xlData = data.map(function(s) {
        return { 'Date': s.date, 'Total': s.total, 'Perm Present': s.permP, 'Perm Present %': s.permPPct + '%', 'Perm Leave': s.permV, 'Perm Leave %': s.permVPct + '%', 'Casual Present': s.casP, 'Casual Present %': s.casPPct + '%', 'Casual Leave': (s.casV || 0), 'Guests': s.hospGuests };
      });
      var ws = XLSX.utils.json_to_sheet(xlData); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daily Stats');
      var range = fromDate + '_to_' + toDate;
      XLSX.writeFile(wb, 'DailyStats_' + range.replace(/-/g, '') + '_' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '.xlsx');
    }
    window.renderDailyStatsTable = renderDailyStatsTable;
    window.exportDailyStatsToExcel = exportDailyStatsToExcel;

    function computeBakeryConsumptionForRange(fromDate, toDate) {
      var results = [];
      var d = new Date(fromDate + 'T00:00:00');
      var end = new Date(toDate + 'T00:00:00');
      while (d <= end) {
        var dateStr = d.toISOString().split('T')[0];
        var prod = bakeryProductions.filter(function(p) { return p.date === dateStr; });
        var ctr = bakeryContractorSupplies.filter(function(c) { return c.date === dateStr; });
        var flour = 0, bran = 0, salt = 0, yeast = 0, diesel = 0, breadFarm = 0, breadCtr = 0, ctrCount = ctr.length;
        prod.forEach(function(p) { flour += parseFloat(p.flourUsed)||0; bran += parseFloat(p.branUsed)||0; salt += parseFloat(p.saltUsed)||0; yeast += parseFloat(p.yeastUsed)||0; diesel += parseFloat(p.dieselUsed)||0; breadFarm += parseInt(p.breadCount)||0; });
        ctr.forEach(function(c) { breadCtr += parseInt(c.count)||0; });
        results.push({ date: dateStr, flour: Math.round(flour*100)/100, bran: Math.round(bran*100)/100, salt: Math.round(salt*100)/100, yeast: Math.round(yeast*100)/100, diesel: Math.round(diesel*100)/100, breadFarm: breadFarm, breadCtr: breadCtr, breadTotal: breadFarm + breadCtr, ctrCount: ctrCount });
        d.setDate(d.getDate() + 1);
      }
      return results;
    }
    function renderBakeryConsumptionTable() {
      var thead = document.getElementById('bakery-consumption-thead');
      var tbody = document.getElementById('bakery-consumption-tbody');
      if (!thead || !tbody) return;
      var fromEl = document.getElementById('bakeryConsFrom');
      var toEl = document.getElementById('bakeryConsTo');
      var fromDate = fromEl ? fromEl.value : '';
      var toDate = toEl ? toEl.value : '';
      if (!fromDate || !toDate) { tbody.innerHTML = ''; return; }
      var data = computeBakeryConsumptionForRange(fromDate, toDate);
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" style="padding:15px;color:#888;">لا توجد بيانات استهلاك في هذا النطاق</td></tr>'; return; }
      // Summary cards
      var totals = { flour:0, bran:0, salt:0, yeast:0, diesel:0, breadFarm:0, breadCtr:0, breadTotal:0 };
      data.forEach(function(s) { totals.flour += s.flour; totals.bran += s.bran; totals.salt += s.salt; totals.yeast += s.yeast; totals.diesel += s.diesel; totals.breadFarm += s.breadFarm; totals.breadCtr += s.breadCtr; totals.breadTotal += s.breadTotal; });
      var cards = document.getElementById('bakery-summary-cards');
      if (cards) cards.innerHTML = [
        { label: 'إجمالي الأرغفة', val: totals.breadTotal, color: '#1b5e20' },
        { label: 'دقيق (كجم)', val: Math.round(totals.flour*100)/100, color: '#37474f' },
        { label: 'ردة (كجم)', val: Math.round(totals.bran*100)/100, color: '#37474f' },
        { label: 'ملح (كجم)', val: Math.round(totals.salt*100)/100, color: '#37474f' },
        { label: 'خميرة (كجم)', val: Math.round(totals.yeast*100)/100, color: '#37474f' },
        { label: 'سولار (لتر)', val: Math.round(totals.diesel*100)/100, color: '#37474f' }
      ].map(function(c) {
        return '<div style="background:' + c.color + ';color:white;padding:6px 14px;border-radius:8px;font-size:12px;text-align:center;min-width:100px;"><div style="font-weight:700;font-size:16px;">' + c.val + '</div><div style="font-size:10px;opacity:0.9;">' + c.label + '</div></div>';
      }).join('');
      var cols = ['التاريخ', 'خبز المزرعة', 'خبز المقاولين', 'الإجمالي', 'دقيق', 'ردة', 'ملح', 'خميرة', 'سولار'];
      thead.innerHTML = '<tr>' + cols.map(function(c, i) {
        var bg = i === 0 ? '#263238' : (i <= 3 ? '#1b5e20' : '#37474f');
        return '<th style="padding:6px;background:' + bg + ';color:white;border:1px solid #ddd;font-size:11px;white-space:nowrap;">' + c + '</th>';
      }).join('') + '</tr>';
      tbody.innerHTML = '';
      data.slice().reverse().forEach(function(s) {
        var row = '<td style="padding:5px;border:1px solid #ddd;font-weight:700;font-family:monospace;">' + s.date + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.breadFarm + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.breadCtr + (s.ctrCount ? ' <span style="color:#888;font-size:10px;">(' + s.ctrCount + ')</span>' : '') + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;font-weight:700;">' + s.breadTotal + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.flour + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.bran + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.salt + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.yeast + '</td>';
        row += '<td style="padding:5px;border:1px solid #ddd;">' + s.diesel + '</td>';
        tbody.innerHTML += '<tr>' + row + '</tr>';
      });
      renderBakeryChart(data);
    }
    function exportBakeryConsumptionToExcel() {
      var fromEl = document.getElementById('bakeryConsFrom');
      var toEl = document.getElementById('bakeryConsTo');
      var fromDate = fromEl ? fromEl.value : '';
      var toDate = toEl ? toEl.value : '';
      if (!fromDate || !toDate) return alert('الرجاء تحديد نطاق التاريخ');
      var data = computeBakeryConsumptionForRange(fromDate, toDate);
      if (!data.length) return alert('لا توجد بيانات في هذا النطاق');
      data.slice().reverse();
      var xlData = data.map(function(s) {
        return { 'التاريخ': s.date, 'خبز المزرعة': s.breadFarm, 'خبز المقاولين': s.breadCtr, 'إجمالي الأرغفة': s.breadTotal, 'دقيق (كجم)': s.flour, 'ردة (كجم)': s.bran, 'ملح (كجم)': s.salt, 'خميرة (كجم)': s.yeast, 'سولار (لتر)': s.diesel };
      });
      var ws = XLSX.utils.json_to_sheet(xlData); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bakery Consumption');
      var range = fromDate + '_to_' + toDate;
      XLSX.writeFile(wb, 'BakeryConsumption_' + range.replace(/-/g, '') + '_' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '.xlsx');
    }
    window.renderBakeryConsumptionTable = renderBakeryConsumptionTable;
    window.exportBakeryConsumptionToExcel = exportBakeryConsumptionToExcel;

    var _bakeryChart = null;
    function renderBakeryChart(data) {
      var canvas = document.getElementById('bakery-chart');
      if (!canvas) return;
      if (_bakeryChart) { _bakeryChart.destroy(); _bakeryChart = null; }
      if (!data || data.length < 2) { canvas.parentElement.style.height = '0'; return; }
      canvas.parentElement.style.height = '250px';
      var ctx = canvas.getContext('2d');
      var labels = data.map(function(s) {
        var d = s.date.split('-');
        return d[1] + '/' + d[2];
      });
      _bakeryChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'خبز المزرعة (رغيف)',
              data: data.map(function(s) { return s.breadFarm; }),
              backgroundColor: '#e65100',
              borderRadius: 3,
              order: 2
            },
            {
              label: 'خبز المقاولين (رغيف)',
              data: data.map(function(s) { return s.breadCtr; }),
              backgroundColor: '#ff8a65',
              borderRadius: 3,
              order: 2
            },
            {
              label: 'دقيق (كجم)',
              data: data.map(function(s) { return s.flour; }),
              type: 'line',
              borderColor: '#1565c0',
              backgroundColor: 'transparent',
              borderWidth: 2.5,
              pointBackgroundColor: '#1565c0',
              pointRadius: 3,
              tension: 0.2,
              order: 1,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 }, usePointStyle: true } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: {
              beginAtZero: true,
              position: 'left',
              title: { display: true, text: 'عدد الأرغفة', font: { size: 11 } },
              ticks: { font: { size: 10 } }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              title: { display: true, text: 'دقيق (كجم)', font: { size: 11 } },
              grid: { drawOnChartArea: false },
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    }

    /* ===== Attendance Report (P/V over time) ===== */
    var _attendanceChart = null;
    function calculateSystemStats() {
      var el;
      el = document.getElementById('stat-total-emp'); if (el) el.innerText = employees.length;
      el = document.getElementById('stat-p-emp'); if (el) el.innerText = employees.filter(e => e.status === 'P').length;
      el = document.getElementById('stat-v-emp'); if (el) el.innerText = employees.filter(e => e.status === 'V').length;
      el = document.getElementById('stat-total-vouchers'); if (el) el.innerText = inventoryVouchers.length;
      
      let itemsDisbursed = 0;
      inventoryVouchers.forEach(v => itemsDisbursed += (parseInt(v.qty) || 0));
      el = document.getElementById('stat-total-items-disbursed'); if (el) el.innerText = itemsDisbursed;
      el = document.getElementById('stat-registered-items'); if (el) el.innerText = inventoryItems.length;

      updateHousingStats();

      updateTabBadges();
      renderDashboard(); renderQuickActions();
    }

    function showPrintChoice(tableId) {
      var modal = document.getElementById('modal-print-choice');
      modal.dataset.tableId = tableId || '';
      document.getElementById('print-step-1').style.display = 'block';
      document.getElementById('print-step-2').style.display = 'none';
      openModal('modal-print-choice');
    }
    function showPrintStep2() {
      document.getElementById('print-step-1').style.display = 'none';
      document.getElementById('print-step-2').style.display = 'block';
    }
    function showPrintStep1() {
      document.getElementById('print-step-1').style.display = 'block';
      document.getElementById('print-step-2').style.display = 'none';
    }
        function generateEmployeeCode() {
      let contract = document.getElementById('form-emp-contract').value;
      let codeField = document.getElementById('form-emp-code');
      let editId = document.getElementById('edit-emp-id').value;
      if (editId) return;
      // بيانات: editable, not required
      codeField.readOnly = false;
      codeField.style.background = '#fff';
      codeField.style.cursor = 'text';
      if (contract === 'إجمالي') {
        codeField.value = '';
        codeField.focus();
      } else {
        codeField.value = '';
      let sameType = employees.filter(e => e.contract === contract);
      let allCodes = sameType.map(function(e){ return parseInt(e.code); });
      excludedEmployees.forEach(function(e){
        if (e.contract === contract) { var n = parseInt(e.code); if (n) allCodes.push(n); }
      });
      var maxCode = Math.max(1000, ...allCodes.filter(function(n){ return !isNaN(n); }));
      codeField.value = maxCode + 1;
      }
    }
    function setupNameAutocomplete() {
      let inp = document.getElementById('form-emp-name');
      let sug = document.getElementById('emp-name-suggestions');
      if (!inp || !sug) return;
      inp.addEventListener('input', function() {
        let val = this.value.trim();
        let parts = val.split(/\s+/).filter(p => p.length > 0);
        sug.innerHTML = ''; sug.style.display = 'none';
        if (parts.length < 3) return;
        let q = val.toLowerCase();
        let allPeople = [...employees, ...excludedEmployees];
        let matches = allPeople.filter(p =>
          (p.name || '').toLowerCase().includes(q)
        ).slice(0, 8);
        if (!matches.length) return;
        sug.style.display = 'block';
        matches.forEach(p => {
          let d = document.createElement('div');
          d.style.cssText = 'padding:8px 12px; cursor:pointer; font-size:13px; border-bottom:1px solid #f0f0f0;';
          d.innerText = `[${p.code || '—'}] ${p.name}${p.dept ? ' | ' + p.dept : ''}`;
          d.onclick = function() {
            inp.value = p.name;
            sug.style.display = 'none';
          };
          d.onmouseenter = function() { this.style.background = '#e3f2fd'; };
          d.onmouseleave = function() { this.style.background = ''; };
          sug.appendChild(d);
        });
      });
      inp.addEventListener('blur', function() { setTimeout(() => { sug.style.display = 'none'; }, 200); });
      inp.addEventListener('focus', function() {
        if (sug.children.length > 0) sug.style.display = 'block';
      });
    }

    let deptTitles = _safeJsonParse(_lsGet('dept_titles'), {});

    function rebuildDeptTitles() {
      employees.forEach(e => {
        if (e.dept && e.title) {
          if (!deptTitles[e.dept]) deptTitles[e.dept] = [];
          if (!deptTitles[e.dept].includes(e.title)) deptTitles[e.dept].push(e.title);
        }
      });
      excludedEmployees.forEach(e => {
        if (e.dept && e.title) {
          if (!deptTitles[e.dept]) deptTitles[e.dept] = [];
          if (!deptTitles[e.dept].includes(e.title)) deptTitles[e.dept].push(e.title);
        }
      });
      _lsSet('dept_titles', JSON.stringify(deptTitles));
    }

    function onTitleSelectChange() {}
    function filterTitlesByDept() {
      let dept = document.getElementById('form-emp-dept').value;
      let titleSelect = document.getElementById('form-emp-title-select');
      titleSelect.innerHTML = '';
      let opt0 = document.createElement('option'); opt0.value = '';       opt0.textContent = '-- اختر الوظيفة --';
      titleSelect.appendChild(opt0);
      if (!dept) return;
      rebuildDeptTitles();
      let titles = deptTitles[dept] || [];
      if (!titles.length && dynamicTitles && dynamicTitles.length) titles = dynamicTitles;
      titles.forEach(function(t) {
        let opt = document.createElement('option'); opt.value = t; opt.textContent = t;
        titleSelect.appendChild(opt);
      });
    }

    function addAssetRowField(itemName, itemQty) {
      itemName = itemName || '';
      itemQty = itemQty || 1;
      let container = document.getElementById('assets-form-container');
      let row = document.createElement('div');
      row.className = 'asset-row extra-asset-row';
      row.innerHTML = '<input type="text" placeholder="كجم سولار لتر" class="extra-asset-name" value="' + itemName + '" style="flex:2;"><input type="number" min="1" class="extra-asset-qty" value="' + itemQty + '" style="flex:1;"><button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">حذف</button>';
      container.appendChild(row);
    }

    /* ===== خبز employee asset management (from flexible admin) ===== */
    var _DEFAULT_ASSETS = ["الفرن 8 توريد","مقاولين 6 إجمالي","الخبز دقيق / كجم ردة","كجم","ملح","كجم","خميرة","كجم سولار","لتر حدد","تاريخ 2 البداية","والنهاية + 2 أولاً","لا","توجد","بيانات","التاريخ","خبز الفرن توريد","مقاولين إجمالي","الخبز دقيق","كجم ردة","كجم","ملح كجم"];

    function searchAssetEmployee() {
      var q = document.getElementById('asset-emp-search').value.trim().toLowerCase();
      var display = document.getElementById('asset-emp-display');
      var idField = document.getElementById('asset-emp-id');
      var area = document.getElementById('asset-edit-area');
      if (!q) { display.textContent = 'بيانات خميرة كجم'; area.style.display = 'none'; idField.value = ''; return; }
      var emp = null;
      for (var i = 0; i < employees.length; i++) {
        var e = employees[i];
        if ((e.code && e.code.toLowerCase() === q) || (e.name && e.name.toLowerCase().indexOf(q) !== -1)) { emp = e; break; }
      }
      if (!emp) { display.textContent = 'لم يتم العثور على المورد'; area.style.display = 'none'; idField.value = ''; return; }
      idField.value = emp.id;
      display.textContent = 'مقاولين ' + emp.name + ' (' + (emp.code || 'دقيق كجم') + ') — ' + (emp.dept || '') + ' | ' + (emp.title || '');
      area.style.display = 'block';
      renderAssetEditor(emp);
    }

    function renderAssetEditor(emp) {
      var defContainer = document.getElementById('asset-defaults-container');
      var extraContainer = document.getElementById('asset-extra-container');
      defContainer.innerHTML = '';
      extraContainer.innerHTML = '';
      var empAssets = emp.assets || [];
      _DEFAULT_ASSETS.forEach(function(item) {
        var found = empAssets.filter(function(a) { return a.item === item; });
        var qty = found.length > 0 ? found[0].qty : 0;
        var div = document.createElement('div');
        div.style.cssText = 'background:#fff;padding:8px;border-radius:6px;border:1px solid #e0e0e0;';
        div.innerHTML = '<div style="font-size:11px;margin-bottom:3px;color:#555;">' + item + '</div><input type="number" class="asset-def-qty" data-item="' + item.replace(/"/g,'&quot;') + '" value="' + qty + '" min="0" style="width:100%;padding:4px;border:2px solid #e0e0e0;border-radius:4px;font-size:12px;">';
        defContainer.appendChild(div);
      });
      empAssets.forEach(function(a) {
        if (_DEFAULT_ASSETS.indexOf(a.item) === -1) {
          addExtraAssetField(a.item, a.qty);
        }
      });
    }

    function addExtraAssetField(item, qty) {
      item = item || '';
      qty = qty || 1;
      var container = document.getElementById('asset-extra-container');
      var row = document.createElement('div');
      row.className = 'asset-extra-row';
      row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
      row.innerHTML = '<input type="text" class="asset-extra-name" placeholder="عدد أرغفة" value="' + item.replace(/"/g,'&quot;') + '" style="flex:2;padding:4px 8px;border:2px solid #e0e0e0;border-radius:4px;font-size:12px;"><input type="number" class="asset-extra-qty" value="' + qty + '" min="1" style="width:60px;padding:4px;border:2px solid #e0e0e0;border-radius:4px;font-size:12px;"><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:2px 6px;font-size:11px;">حذف</button>';
      container.appendChild(row);
    }

    function addAssetField(item, qty) { addExtraAssetField(item, qty); }

    function saveAssetEmployee() {
      var id = document.getElementById('asset-emp-id').value;
      if (!id) return alert('الرجاء إدخال كود الموظف');
      var emp = null;
      for (var i = 0; i < employees.length; i++) { if (employees[i].id === id) { emp = employees[i]; break; } }
      if (!emp) return alert('لم يتم العثور على الموظف');
      var assetsList = [];
      document.querySelectorAll('#asset-defaults-container .asset-def-qty').forEach(function(inp) {
        var q = parseInt(inp.value) || 0;
        if (q > 0) assetsList.push({ item: inp.getAttribute('data-item'), qty: q });
      });
      document.querySelectorAll('#asset-extra-container .asset-extra-row').forEach(function(row) {
        var n = row.querySelector('.asset-extra-name').value.trim();
        var q = parseInt(row.querySelector('.asset-extra-qty').value) || 0;
        if (n && q > 0) assetsList.push({ item: n, qty: q });
      });
      emp.assets = assetsList;
      assetsList.sort(function(a,b) { return a.item.localeCompare(b.item); });
      syncStorage();
      var idx = employees.indexOf(emp);
      if (idx >= 0) {
        employees[idx] = _ts(emp);
        syncStorage();
      }
      alert('تم حفظ بيانات أصول الموظف ' + emp.name + ' بنجاح');
    }

    function exportAssetsExcel() {
      var data = [];
      employees.forEach(function(e) {
        if (e.assets && e.assets.length > 0) {
          e.assets.forEach(function(a) {
            data.push({ 'هل': e.code || '', 'ديسمبر': e.name, 'نوفمبر': e.dept || '', 'أكتوبر': e.title || '', 'سبتمبر': a.item, 'أغسطس': a.qty });
          });
        } else {
          data.push({ 'يوليو': e.code || '', 'يونيو': e.name, 'مايو': e.dept || '', 'أبريل': e.title || '', 'مارس': '', 'فبراير': '' });
        }
      });
      if (data.length === 0) return alert('لا توجد بيانات أصول للتصدير');
      var ws = XLSX.utils.json_to_sheet(data);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assets');
      XLSX.writeFile(wb, 'بنجاح_تقييم_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }

    function importAssetsExcel(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(ws);
          var updated = 0;
          rows.forEach(function(r) {
            var code = (r['حفظ'] || '').toString().trim();
            var name = (r['تم'] || '').toString().trim();
            var item = (r['جديد؟'] || '').toString().trim();
            var qty = parseInt(r['تقييم']) || 1;
            if (!code && !name) return;
            if (!item) return;
            var emp = employees.find(function(x) { return x.code && x.code === code; });
            if (!emp && name) emp = employees.find(function(x) { return x.name === name; });
            if (!emp) return;
            if (!emp.assets) emp.assets = [];
            var existing = emp.assets.find(function(a) { return a.item === item; });
            if (existing) { existing.qty = qty; }
            else { emp.assets.push({ item: item, qty: qty }); }
            if (document.getElementById('asset-emp-id').value === emp.id) renderAssetEditor(emp);
            updated++;
          });
          syncStorage();
          alert('تم تحديث بيانات الأصول لـ ' + updated + ' موظف.');
        } catch(err) { alert('تعذر استيراد بيانات الأصول: ' + err.message); }
      };
      reader.readAsArrayBuffer(file);
      event.target.value = '';
    }

    function renderAssetSummary() {
      var summary = {};
      employees.forEach(function(e) {
        if (e.assets && Array.isArray(e.assets)) {
          e.assets.forEach(function(a) {
            if (!summary[a.item]) summary[a.item] = 0;
            summary[a.item] += a.qty;
          });
        }
      });
      var sorted = Object.keys(summary).sort();
      if (sorted.length === 0) { document.getElementById('asset-summary-container').innerHTML = '<span style="color:#888;">لا توجد أصول مسجلة</span>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f5f5f5;position:sticky;top:0;"><th style="padding:6px;border:1px solid #ddd;text-align:right;">#</th><th style="padding:6px;border:1px solid #ddd;text-align:right;">وظيفة</th><th style="padding:6px;border:1px solid #ddd;text-align:center;">سرير</th></tr></thead><tbody>';
      sorted.forEach(function(item, idx) {
        html += '<tr><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">' + (idx + 1) + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + item + '</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:700;color:#e65100;">' + summary[item] + '</td></tr>';
      });
      html += '</tbody></table>';
      document.getElementById('asset-summary-container').innerHTML = html;
    }

    function printEmployeeAssetStatement() {
      var id = document.getElementById('asset-emp-id').value;
      if (!id) return alert('أدخل كود العامل.');
      var emp = employees.find(function(e) { return e.id === id; });
      if (!emp) return alert('لا توجد بيانات لهذا العامل.');
      var rows = '';
      if (emp.assets && emp.assets.length > 0) {
        var total = 0;
        emp.assets.forEach(function(a) { total += a.qty; rows += '<tr><td style="padding:6px 12px;border:1px solid #333;">' + a.item + '</td><td style="padding:6px 12px;border:1px solid #333;text-align:center;">' + a.qty + '</td></tr>'; });
        rows += '<tr style="background:#f5f5f5;font-weight:700;"><td style="padding:6px 12px;border:1px solid #333;text-align:left;">الإجمالي</td><td style="padding:6px 12px;border:1px solid #333;text-align:center;">' + total + '</td></tr>';
      } else {
        rows = '<tr><td colspan="2" style="padding:12px;text-align:center;color:#888;">لا توجد عهدة مسجلة</td></tr>';
      }
      var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف عهدة - ' + emp.name + '</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{padding:8px 12px;border:1px solid #333;text-align:right;}th{background:#e65100;color:#fff;}.header{text-align:center;margin-bottom:20px;}.header h2{margin:0;color:#e65100;}.info{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:15px;font-size:13px;}.info div{flex:1;min-width:120px;}.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.06;font-size:80px;pointer-events:none;z-index:-1;}</style></head><body><div class="watermark">LINAHSYSTEM</div><div class="header"><h2>كشف عهدة</h2><p style="font-size:14px;color:#888;">نظام الشئون الإدارية المتكامل</p></div><div class="info"><div><b>العامل:</b> ' + emp.name + '</div><div><b>الكود:</b> ' + (emp.code || '—') + '</div><div><b>القسم:</b> ' + (emp.dept || '—') + '</div><div><b>المسمى الوظيفي:</b> ' + (emp.title || '—') + '</div></div><table><thead><tr><th>الصنف</th><th style="text-align:center;">العدد</th></tr></thead><tbody>' + rows + '</tbody></table><div style="margin-top:15px;font-size:11px;color:#888;text-align:center;">تاريخ الطباعة: ' + new Date().toLocaleDateString('ar-EG') + '</div></body></html>';
      var w = window.open('', '_blank', 'width=800,height=600');
      w.document.write(html);
      w.document.close();
      setTimeout(function() { w.print(); }, 500);
    }

    function renderReverseAssetSearch() {
      var q = document.getElementById('asset-reverse-search').value.trim().toLowerCase();
      var container = document.getElementById('asset-reverse-results');
      if (!q) { container.innerHTML = ''; return; }
      var results = [];
      employees.forEach(function(e) {
        if (e.assets && Array.isArray(e.assets)) {
          e.assets.forEach(function(a) {
            if (a.item.toLowerCase().indexOf(q) !== -1) {
              results.push({ emp: e, item: a.item, qty: a.qty });
            }
          });
        }
      });
      if (results.length === 0) { container.innerHTML = '<span style="color:#888;">لا توجد نتائج</span>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">الكود</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">العامل</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">الصنف</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:center;">العدد</th></tr></thead><tbody>';
      results.forEach(function(r) {
        html += '<tr><td style="padding:4px 8px;border:1px solid #ddd;">' + (r.emp.code || '') + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + r.emp.name + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + r.item + '</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">' + r.qty + '</td></tr>';
      });
      html += '</tbody></table><div style="margin-top:4px;color:#888;font-size:11px;">يتم الاختيار: ' + results.length + '</div>';
      container.innerHTML = html;
    }

    function saveEmployeeData() {
      let code = document.getElementById('form-emp-code').value.trim();
      let name = document.getElementById('form-emp-name').value.trim();
      let contract = document.getElementById('form-emp-contract').value;
      let nationalId = document.getElementById('form-emp-national-id').value.trim();
      let dept = document.getElementById('form-emp-dept').value;
      let title = document.getElementById('form-emp-title-select').value;
      let gov = document.getElementById('form-emp-gov').value;
      let status = document.getElementById('form-emp-status').value;
      let sector = document.getElementById('form-emp-sector').value;
      let room = document.getElementById('form-emp-room').value;
      let hireDate = document.getElementById('form-emp-hire-date').value;
      let vacationBalance = parseInt(document.getElementById('form-emp-vacation-balance').value) || 30;
      let editId = document.getElementById('edit-emp-id').value;

      if(!name) return alert("لا يوجد موظف بهذا الاسم");

      if(!editId) {
        let dupCode = employees.find(e => e.code && e.code.toLowerCase() === code.toLowerCase());
        if(dupCode) return alert("الكود [" + code + "] مسجل مسبقاً باسم [" + dupCode.name + "].\nالحالة: " + (dupCode.status === 'P' ? 'متواجد' : dupCode.status === 'V' ? 'في إجازة' : 'غائب') + "\nالإدارة: " + (dupCode.dept || '—') + "\nتأكد قبل الإضافة.");
        let dupExcl = excludedEmployees.find(e => e.code && e.code.toLowerCase() === code.toLowerCase());
        if(dupExcl) return alert("الكود [" + code + "] موجود مسبقاً في المستبعدين باسم [" + dupExcl.name + "].\nتاريخ الاستبعاد: " + (dupExcl.date || '—') + "\nالسبب: " + (dupExcl.reason || '—') + "\nيرجى مراجعة البيانات.");
        let similarName = employees.find(e => e.name && e.name.trim().toLowerCase() === name.toLowerCase());
        if(similarName) {
          if(!confirm("يوجد موظف بنفس الاسم بالضبط: [" + similarName.name + "] كود " + (similarName.code || 'بدون') + ".\nهل تريد إضافة الموظف رغم التشابه؟")) return;
        }
      }

      let assetsList = [];
      document.querySelectorAll('.default-asset').forEach(input => {
        let q = parseInt(input.value) || 0;
        if(q > 0) { assetsList.push({ item: input.getAttribute('data-item'), qty: q }); }
      });
      document.querySelectorAll('.extra-asset-row').forEach(row => {
        let n = row.querySelector('.extra-asset-name').value.trim();
        let q = parseInt(row.querySelector('.extra-asset-qty').value) || 0;
        if(n && q > 0) { assetsList.push({ item: n, qty: q }); }
      });

      if(editId) {
        let index = employees.findIndex(e => e.id == editId);
        if(index !== -1) {
          employees[index] = _ts({ id: editId, code, name, contract, nationalId, dept, title, gov, status, sector, room, hireDate, assets: assetsList, vacationBalance });
        }
      } else {
        let newEmp = { id: Date.now().toString(), code, name, contract, nationalId, dept, title, gov, status, sector, room, hireDate, assets: assetsList, vacationBalance };
        employees.push(_ts(newEmp));
      }

      sortEmployeesAlphabetically(); syncStorage(); renderTable(); renderHousingLayout(); rebuildAllDropdowns(); closeModal('modal-add-emp');
      document.getElementById('edit-emp-id').value = '';
      document.getElementById('modal-emp-title').innerText = 'إضافة موظف جديد للقوة';
    }

    function resetAddEmpForm() {
      document.getElementById('edit-emp-id').value = '';
      document.getElementById('modal-emp-title').innerText = 'إضافة موظف جديد للقوة';
      document.getElementById('form-emp-code').value = ''; document.getElementById('form-emp-code').readOnly = false; document.getElementById('form-emp-code').style.background = '#fff';
      document.getElementById('form-emp-name').value = ''; document.getElementById('form-emp-contract').value = 'دائم';
      document.getElementById('form-emp-national-id').value = ''; document.getElementById('form-emp-hire-date').value = '';
      document.getElementById('form-emp-status').value = 'P'; document.getElementById('form-emp-vacation-balance').value = 30;
      document.getElementById('form-emp-dept').value = ''; document.getElementById('form-emp-title-select').value = '';
      document.getElementById('form-emp-gov').value = ''; document.getElementById('form-emp-sector').value = '';
      document.getElementById('form-emp-room').innerHTML = '<option value="">اختر المبنى أولاً</option>';
      document.querySelectorAll('.default-asset').forEach(function(inp){ inp.value = 0; });
      document.getElementById('assets-form-container').innerHTML = '';
      document.getElementById('form-emp-name').focus();
    }
    function editEmployee(id) {
      let emp = employees.find(e => e.id == id);
      if(!emp) return;
      document.getElementById('edit-emp-id').value = emp.id;
      document.getElementById('modal-emp-title').innerText = "تعديل بيانات الموظف";
      document.getElementById('form-emp-code').value = emp.code || '';
      document.getElementById('form-emp-name').value = emp.name || '';
      document.getElementById('form-emp-contract').value = emp.contract || 'دائم';
      // استيراد العهد تم تحديث موظف خطأ
      var cf = document.getElementById('form-emp-code');
      cf.readOnly = false; cf.style.background = '#fff'; cf.style.cursor = 'text';
      document.getElementById('form-emp-national-id').value = emp.nationalId || '';
      document.getElementById('form-emp-hire-date').value = emp.hireDate || '';
      
      rebuildAllDropdowns();
      document.getElementById('form-emp-dept').value = emp.dept || '';
      filterTitlesByDept();
      if (emp.title) {
        let titleSelect = document.getElementById('form-emp-title-select');
        let exists = Array.from(titleSelect.options).some(o => o.value === emp.title);
        if (!exists) {
          let opt = document.createElement('option');
          opt.value = emp.title; opt.textContent = emp.title;
          titleSelect.appendChild(opt);
        }
        titleSelect.value = emp.title;
      }
      document.getElementById('form-emp-gov').value = emp.gov || '';
      document.getElementById('form-emp-status').value = emp.status || 'P';
      document.getElementById('form-emp-sector').value = emp.sector || '';
      updateEmpRoomBySector();
      document.getElementById('form-emp-room').value = emp.room || '';
      document.getElementById('form-emp-vacation-balance').value = typeof emp.vacationBalance === 'number' ? emp.vacationBalance : 30;

      document.querySelectorAll('.default-asset').forEach(input => input.value = 0);
      document.getElementById('assets-form-container').innerHTML = '';

      if(emp.assets && Array.isArray(emp.assets)) {
        emp.assets.forEach(as => {
          let defInput = document.querySelector(`.default-asset[data-item="${as.item}"]`);
          if(defInput) { defInput.value = as.qty; } 
          else { addAssetRowField(as.item, as.qty); }
        });
      }
      openModal('modal-add-emp');
    }
    function openExclusionModal(id) {
      let emp = employees.find(e => e.id == id);
      if(!emp) return;
      document.getElementById('exclude-target-id').value = emp.id;
      let assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('، ') : "لا يوجد عهود سريرية";
      document.getElementById('exclude-emp-summary').innerHTML = `
        <b>الصنف الإجمالي:</b> ${emp.name}<br>
        <b>اختر:</b> ${emp.code || 'موظفاً'} | <b>أولاً:</b> ${emp.title}<br>
        <b>الموظف غير موجود:</b> <span style="color:red; font-weight:600;">${assetsStr}</span>
      `;
      openModal('modal-exclude-emp');
    }

    function confirmAndExecuteExclusion() {
      let id = document.getElementById('exclude-target-id').value;
      let reason = document.getElementById('exclude-reason-select').value;
      let extraNotes = document.getElementById('exclude-notes-input').value.trim();
      
      let idx = employees.findIndex(e => e.id == id);
      if(idx === -1) return;

      let emp = employees[idx];
      let assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('، ') : "لا يوجد";

      let excludedRecord = Object.assign({}, emp);
      excludedRecord.date = new Date().toISOString().split('T')[0];
      excludedRecord.reason = extraNotes ? `${reason} (${extraNotes})` : reason;
      excludedRecord.assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('، ') : "لا يوجد";

      excludedEmployees.push(excludedRecord);
      _logDeletion('employees', emp.id || emp.code || emp.name);
      employees.splice(idx, 1);

      rebuildDeptTitles();
      syncStorage(); renderTable(); rebuildAllDropdowns(); closeModal('modal-exclude-emp');
      document.getElementById('exclude-notes-input').value = '';
      alert(`تم استبعاد الموظف [${excludedRecord.name}] وتسجيل عهدته المستلمة بنجاح.`);
    }

    function renderExcludedTable() {
      let tbody = document.getElementById('excluded-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      let filtered = [...excludedEmployees];
      let q = (document.getElementById('excluded-search')?.value || '').trim().toLowerCase();
      if (q) filtered = filtered.filter(e => (e.name && e.name.toLowerCase().includes(q)) || (e.code && e.code.toLowerCase().includes(q)));
      let st = sortState['table-excluded'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((e) => {
        let realIdx = excludedEmployees.indexOf(e);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-excluded"></td>
          <td><b>${e.code || ''}</b></td>
          <td>${e.name}</td>
          <td>${e.contract || '—'}</td>
          <td>${e.nationalId || '—'}</td>
          <td>${e.hireDate || '—'}</td>
          <td><span style="color:var(--primary); font-weight:600;">${e.dept || '—'}</span></td>
          <td>${e.title || '—'}</td>
          <td>${e.gov || '—'}</td>
          <td>${e.sector || '—'}</td>
          <td>${e.room || '—'}</td>
          <td><span class="status-badge ${e.status==='P'?'status-p':(e.status==='A'?'':'status-v')}" style="${e.status==='A'?'background:#ffebee;color:#c62828;':''}">${e.status==='P'?'متواجد':e.status==='V'?'في إجازة':'غائب'}</span></td>
          <td style="font-size:11px; max-width:150px; color:#555;">${e.assetsStr || e.assets || '—'}</td>
          <td><span style="color:var(--danger); font-weight:600;">${toArabicNumerals(e.date)}</span></td>
          <td><span style="font-style:italic; color:#d32f2f;">${e.reason}</span></td>
          <td class="no-print" style="display:flex;gap:4px;">
            <button class="btn btn-success" style="padding:2px 6px;font-size:11px;" onclick="restoreExcluded(${realIdx})">↩️ استرجاع</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="permanentlyDeleteExcluded(${realIdx})">حذف نهائي</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function permanentlyDeleteExcluded(idx) { if (!requireAdmin()) return;
      if(confirm("هل تريد مسح هذا السجل التابع للمستبعد تماماً حتى من الأرشيف القانوني؟")) {
        _logDeletion('excludedEmployees', excludedEmployees[idx].code || excludedEmployees[idx].name);
        excludedEmployees.splice(idx, 1); syncStorage(); renderExcludedTable();
      }
    }

    function restoreExcluded(idx) {
      var rec = excludedEmployees[idx];
      if (!rec) return;
      if (!confirm('هل تريد استرجاع "' + rec.name + '" إلى قوة العمل؟')) return;
      var assetsVal = rec.assets;
      if (typeof assetsVal === 'string' && assetsVal !== 'لا يوجد' && assetsVal !== '—') {
        assetsVal = [{ item: assetsVal, qty: 1 }];
      }
      if (!Array.isArray(assetsVal)) assetsVal = [];
      var emp = {
        id: Date.now().toString(),
        code: rec.code || '',
        name: rec.name,
        contract: rec.contract || 'دائم',
        nationalId: rec.nationalId || '',
        dept: rec.dept || '',
        title: rec.title || '',
        gov: rec.gov || '',
        status: 'P',
        sector: rec.sector || '',
        room: rec.room || '',
        hireDate: rec.hireDate || '',
        assets: assetsVal
      };
      employees.push(_ts(emp));
      _logDeletion('excludedEmployees', rec.code || rec.id || rec.name);
      _removeDeletion('employees', emp.id);
      excludedEmployees.splice(idx, 1);
      sortEmployeesAlphabetically();
      rebuildDeptTitles();
      syncStorage();
      renderExcludedTable();
      renderTable();
      rebuildAllDropdowns();
      if (typeof calculateSystemStats === 'function') calculateSystemStats();
      updateTabBadges();
      switchTab('tab-employees');
      alert('تمت استعادة بيانات الموظف ' + rec.name + ' بنجاح');
    }

// إجبارياً الكود موجود مسبقاً
var _beepCtx = null;
var _lastBeep = 0;
var _userClicked = false;
document.addEventListener('click', function() { _userClicked = true; if (!_beepCtx) try { _beepCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }, { once: true });
function playChangeSound() {
    try {
        var now = Date.now();
        if (now - _lastBeep < 300) return;
        _lastBeep = now;
        if (!_userClicked) return;
        if (!_beepCtx) return;
        if (_beepCtx.state === 'suspended') _beepCtx.resume();
        var osc = _beepCtx.createOscillator();
        var gain = _beepCtx.createGain();
        osc.connect(gain); gain.connect(_beepCtx.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, _beepCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, _beepCtx.currentTime + 0.2);
        osc.start(); osc.stop(_beepCtx.currentTime + 0.2);
      } catch(e) {}
      if (!_snapshotKeys || !Object.keys(_snapshotKeys).length) _takeSnapshot();
    }

// دالة تبديل الحالة الذكية مع تسجيل وقت المغادرة تلقائي
function toggleEmployeeStatus(empId) {
    let emp = employees.find(e => e.id == empId);
    if (emp) {
        let oldStatus = emp.status;
        if (emp.status === 'P') {
            emp.departureTime = new Date().toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
            emp.status = 'V';
        } else if (emp.status === 'V') {
            emp.status = 'P';
            emp.departureTime = '';
        } else {
            emp.status = 'P';
            emp.departureTime = '';
        }
        _ts(emp);
        playChangeSound();
        syncStorage();
        var _lbl = function(s) { return s === 'P' ? 'تواجد' : s === 'V' ? 'إجازة' : 'غائب'; };
        logAction('تعديل', 'حالة موظف', emp.name, 'من ' + _lbl(oldStatus) + ' إلى ' + _lbl(emp.status));
        renderTable(); renderDashboard();
        calculateSystemStats();
        autoLogTodayMeals(); renderMealLogTable();
    }
}
    function renderTable() {
      try { populateDeptFilter(); } catch(e) {}
      let q = document.getElementById('search-emp').value.toLowerCase();
      let statusFil = document.getElementById('filter-status').value;
      let contractFil = document.getElementById('filter-contract').value;
      let deptFil = document.getElementById('filter-dept') ? document.getElementById('filter-dept').value : '';
      let tbody = document.querySelector('#table-employees-data tbody');
      tbody.innerHTML = '';

      let filtered = employees.filter(e => {
        let matchSearch = (e.name||'').toLowerCase().includes(q) || 
                          ((e.code||'').toLowerCase() === q);
        let matchStatus = statusFil ? e.status === statusFil : true;
        let matchContract = contractFil ? e.contract === contractFil : true;
        let matchDept = deptFil ? (e.dept || '') === deptFil : true;
        return matchSearch && matchStatus && matchContract && matchDept;
      });

      // Apply sort
      let st = sortState['table-employees-data'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);

      filtered.forEach(e => {
        let tr = document.createElement('tr');
        tr.dataset.index = employees.indexOf(e);
        let assetsStr = (e.assets && e.assets.length > 0) ? e.assets.map(a => `${a.item} (${a.qty})`).join('، ') : "لا يوجد عهدة";

        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-employees-data"></td>
          <td><b>${e.code || ''}</b></td>
          <td>${e.name}</td>
          <td>${e.contract || 'دائم'}</td>
          <td>${e.nationalId || '—'}</td>
          <td>${e.hireDate || '—'}</td>
          <td><span style="color:var(--primary); font-weight:600;">${e.dept || '—'}</span></td>
          <td>${e.title || '—'}</td>
          <td>${e.gov || '—'}</td>
          <td>${e.sector || '—'}</td>
          <td>${e.room || '—'}</td>
          <td><span class="status-badge ${e.status==='P'?'status-p':(e.status==='A'?'':'status-v')}" style="${e.status==='A'?'background:#ffebee;color:#c62828;':''}">${e.status==='P'?'تواجد P':e.status==='A'?'غائب':`إجازة V ${e.departureTime?'(مغادرة '+e.departureTime+')':''}`}</span></td>
          <td class="no-print" style="display:none;">${assetsStr}</td>
          <td class="no-print" style="white-space:nowrap;">
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="editEmployee('${e.id}')">📝 تعديل</button>
            <button class="btn btn-warning btn-sm"style="padding:4px 8px; font-size:11px;" onclick="toggleEmployeeStatus('${e.id}')">🔄 تبديل الحالة</button>
            <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="openExclusionModal('${e.id}')">🚫 استبعاد</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      renderHousingLayout();
    }

    // تعبئة قائمة فلتر الإدارات في تبويب القوة من الإدارات الفعلية للموظفين
    function populateDeptFilter() {
      const sel = document.getElementById('filter-dept');
      if (!sel) return;
      const cur = sel.value;
      const depts = [...new Set(employees.map(e => (e.dept || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
      const sig = depts.join('|');
      if (sel.dataset.sig === sig) { if (cur && depts.includes(cur)) sel.value = cur; return; }
      sel.innerHTML = '<option value="">كل الإدارات</option>' + depts.map(d => `<option value="${d.replace(/"/g,'&quot;')}">${d}</option>`).join('');
      sel.dataset.sig = sig;
      if (cur && depts.includes(cur)) sel.value = cur;
    }

    function rebuildRoomsFromEmployees() {
      try {
        var map = {};
        employees.forEach(function(e) {
          if (e.sector && e.room) {
            var k = e.sector + '|' + e.room;
            if (!map[k]) map[k] = { sector: e.sector, number: e.room, beds: 0 };
            map[k].beds++;
          }
        });
        var arr = Object.keys(map).map(function(k) { return map[k]; });
        if (arr.length) {
          roomsCapacity = arr;
          if (!dynamicSectors.length) dynamicSectors = [];
          arr.forEach(function(r) { if (dynamicSectors.indexOf(r.sector) === -1) dynamicSectors.push(r.sector); });
          if (!_lsGet('_roomsRebuiltWarned')) { console.warn('تم إعادة بناء ' + arr.length + ' غرفة/مبنى من بيانات العاملين (roomsCapacity كان فاضي)'); _lsSet('_roomsRebuiltWarned', '1'); }
          syncStorage();
        }
        // Filter dynamicSectors to only include sectors that exist in roomsCapacity
        var valid = {};
        roomsCapacity.forEach(function(r) { if (r.sector) valid[r.sector] = true; });
        dynamicSectors = dynamicSectors.filter(function(s) { return valid[s]; });
        if (!dynamicSectors.length) dynamicSectors = ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"];
        return arr.length;
      } catch(_e) { console.error('rebuildRoomsFromEmployees error:', _e); return 0; }
    }

    function renderHousingLayout() {
      let layout = document.getElementById('housing-layout');
      if(!layout) return; layout.innerHTML = '';

      // Auto-restore if housing data went missing
      if (!roomsCapacity.length || !dynamicSectors.length) {
        var _raw = _lsGet('lineh_rooms_capacity');
        if (_raw) { try { var _parsed = JSON.parse(_raw); if (Array.isArray(_parsed) && _parsed.length) roomsCapacity = _parsed; } catch(_e) {} }
        var _raw2 = _lsGet('dyn_sectors');
        if (_raw2) { try { var _parsed2 = JSON.parse(_raw2); if (Array.isArray(_parsed2) && _parsed2.length) dynamicSectors = _parsed2; } catch(_e) {} }
      }
      // Rebuild from employees whenever no room matches any employee (covers empty/garbled/orphaned rooms)
      var _anyMatch = employees.some(function(e) { return e.sector && e.room && roomsCapacity.some(function(r) { return r.sector === e.sector && r.number === e.room; }); });
      if (!roomsCapacity.length || !_anyMatch) {
        var _rebuilt = rebuildRoomsFromEmployees();
        if (!_rebuilt && !roomsCapacity.length) {
          if (typeof layout !== 'undefined') layout.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">لا توجد بيانات سكن — استخدم استعادة نسخة احتياطية أو أضف مباني من لوحة الإدارة المرنة</div>';
        }
      }

      let sectorsMap = {}; dynamicSectors.forEach(s => sectorsMap[s] = []);
      roomsCapacity.forEach(rc => {
        if(!sectorsMap[rc.sector]) sectorsMap[rc.sector] = [];
        sectorsMap[rc.sector].push(rc);
      });

      var sortedSectors = Object.keys(sectorsMap).sort(function(a, b) { return a.localeCompare(b, 'ar'); });
      sortedSectors.forEach(function(sector) {
        if(sectorsMap[sector].length === 0) return;
        let block = document.createElement('div');
        block.className = 'sector-block';
        let buildingEmps = employees.filter(e => e.sector === sector);
        block.innerHTML = `<div class="sector-title" style="display:flex;justify-content:space-between;align-items:center;">المبنى: ${sector}</div>`;

        let roomsContainer = document.createElement('div');
        roomsContainer.style = "display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px;";

        sectorsMap[sector].sort(function(a, b) { return (a.number || '').localeCompare(b.number || '', 'ar', { numeric: true }); }).forEach(room => {
          let roomUsers = employees.filter(e => e.sector === sector && e.room === room.number);
          let presentCount = roomUsers.filter(e => e.status === 'P').length;
          let vacationUsers = roomUsers.filter(e => e.status === 'V');
          let card = document.createElement('div');
          card.className = 'room-card';
          var userBadges = '';
          for (var _i = 0; _i < roomUsers.length; _i++) {
            var _u = roomUsers[_i];
            var _cls = 'user-badge';
            if (_u.status === 'V') { _cls += ' user-badge-vacation'; userBadges += '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#d32f2f;display:inline-block;"></span>'; }
            userBadges += '<span class="' + _cls + '" onclick="editEmployee(\'' + _u.id + '\')">' + _u.name.split(' ')[0] + ' ' + (_u.name.split(' ')[1] || '') + '</span>';
            if (_u.status === 'V') userBadges += '</span>';
          }
          card.innerHTML = '<div class="room-header"><span>\u0627\u0644\u063A\u0631\u0641\u0629: <span class="room-number-edit" style="cursor:pointer;border-bottom:1px dashed #999;" onclick="editRoomNumber(\'' + sector.replace(/'/g, "\\'") + '\',\'' + room.number.replace(/'/g, "\\'") + '\')" title="اضغط للتعديل">' + room.number + '</span></span><span class="room-beds">\u0627\u0644\u0625\u0634\u063A\u0627\u0644: ' + roomUsers.length + ' / \u0627\u0644\u0633\u0639\u0629: ' + room.beds + '</span></div><div class="room-users">' + (userBadges || '<span style=\"color:#b0bec5;font-size:12px;font-style:italic;\">\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0627\u0644</span>') + '</div><div style="display:flex;gap:4px;margin-top:6px;"></div>';
          roomsContainer.appendChild(card);
        });
        block.appendChild(roomsContainer); layout.appendChild(block);
      });
    }

    function editRoomNumber(sector, oldNumber) {
      var newNumber = prompt('أدخل رقم الغرفة الجديد:', oldNumber);
      if (!newNumber || newNumber.trim() === '' || newNumber === oldNumber) return;
      newNumber = newNumber.trim();
      var room = roomsCapacity.find(function(r) { return r.sector === sector && r.number === oldNumber; });
      if (!room) return alert('لم يتم العثور على الغرفة.');
      room.number = newNumber;
      // Update all employees in that room
      employees.forEach(function(e) {
        if (e.sector === sector && e.room === oldNumber) e.room = newNumber;
      });
      syncStorage();
      renderHousingLayout();
      updateHousingStats();
    }

    function diagnoseAndFixHousing() {
      if (!requireAdmin()) return;
      var validSectors = {};
      roomsCapacity.forEach(function(rc) { validSectors[rc.sector] = true; });
      var validSectorList = Object.keys(validSectors);
      if (validSectorList.length === 0) { alert('لا توجد مبانٍ أو غرف مسجلة. أضف مبنى وغرف أولاً.'); return; }

      function wordSimilarity(a, b) {
        a = a.trim(); b = b.trim();
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        var wa = a.split(/[\s/]+/), wb = b.split(/[\s/]+/);
        var matches = 0;
        wa.forEach(function(w) { if (w && wb.indexOf(w) !== -1) matches++; });
        wb.forEach(function(w) { if (w && wa.indexOf(w) !== -1) matches++; });
        return matches / Math.max(wa.length + wb.length, 1);
      }

      function findBestSector(input) {
        if (!input || !input.trim()) return null;
        input = input.trim();
        if (validSectors[input]) return input;
        var bestScore = 0, best = null;
        validSectorList.forEach(function(s) {
          var score = wordSimilarity(input, s);
          if (score > bestScore) { bestScore = score; best = s; }
        });
        return bestScore > 0.3 ? best : null;
      }

      function getAvailableRooms(sector) {
        return roomsCapacity.filter(function(r) { return r.sector === sector; }).sort(function(a, b) { return (a.number || '').localeCompare(b.number || '', 'ar'); });
      }

      // Collect employees that need fixing
      var pending = [];
      employees.forEach(function(emp) {
        if (!emp.sector || !emp.room) return;
        if (validSectors[emp.sector]) {
          var roomExists = roomsCapacity.some(function(r) { return r.sector === emp.sector && r.number === emp.room; });
          if (roomExists) return;
        }
        pending.push(emp);
      });
      if (pending.length === 0) { alert('لا يوجد موظفون بحاجة إلى إصلاح سكنهم.'); return; }

      // Build suggested sector for each
      var suggestions = {};
      pending.forEach(function(emp) {
        suggestions[emp.id || emp.code] = findBestSector(emp.sector);
      });

      var currentIdx = 0;
      var fixed = [], skipped = [];
      var overlay = null, modal = null;
      var empNameEl, empCodeEl, empOldEl, sectorSel, roomSel, progressEl, empIdxSpan;

      function showFixer() {
        if (currentIdx >= pending.length) { finishFixer(); return; }
        var emp = pending[currentIdx];
        var suggested = suggestions[emp.id || emp.code];
        empIdxSpan.textContent = (currentIdx + 1);
        empNameEl.textContent = emp.name || '-';
        empCodeEl.textContent = '[' + (emp.code || '') + ']';
        empOldEl.textContent = emp.sector + ' / ' + emp.room;

        // Build sector dropdown
        sectorSel.innerHTML = '';
        var anySelected = false;
        validSectorList.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s; opt.textContent = s;
          if (s === suggested) { opt.selected = true; anySelected = true; }
          sectorSel.appendChild(opt);
        });
        if (!anySelected && validSectorList.length > 0) sectorSel.value = validSectorList[0];

        updateRooms();
        overlay.style.display = 'flex';
      }

      function updateRooms() {
        roomSel.innerHTML = '';
        var sector = sectorSel.value;
        if (!sector) {
          var opt = document.createElement('option'); opt.value = ''; opt.textContent = '-- اختر الغرفة --'; roomSel.appendChild(opt); return;
        }
        var rooms = getAvailableRooms(sector);
        rooms.forEach(function(r) {
          var opt = document.createElement('option');
          opt.value = r.number;
          opt.textContent = r.number + ' (السعة: ' + r.beds + ')';
          roomSel.appendChild(opt);
        });
      }

      function applyCurrent(action) {
        if (action === 'save') {
          var emp = pending[currentIdx];
          var newSector = sectorSel.value;
          var newRoom = roomSel.value;
          if (!newSector || !newRoom) { alert('الرجاء اختيار المبنى والغرفة'); return; }
          fixed.push({ emp: emp, oldSector: emp.sector, oldRoom: emp.room, newSector: newSector, newRoom: newRoom });
          emp.sector = newSector;
          emp.room = newRoom;
          emp.modifiedAt = new Date().toISOString();
        } else {
          skipped.push(pending[currentIdx]);
        }
        currentIdx++;
        showFixer();
      }

      function finishFixer() {
        if (overlay) overlay.remove();
        if (fixed.length > 0) {
          syncStorage();
          renderHousingLayout();
          updateHousingStats();
          rebuildAllDropdowns();
        }
        var msg = 'نتائج تشخيص السكن:\n';
        msg += 'تم تعديل سكن: ' + fixed.length + ' موظف\n';
        msg += 'تم تخطي: ' + skipped.length + ' موظف\n';
        if (fixed.length > 0) {
          msg += '\nتم نقل:\n';
          fixed.forEach(function(f, i) {
            msg += (i+1) + '. ' + f.emp.name + ' [' + (f.emp.code||'') + ']:\n';
            msg += '   ' + f.oldSector + '/' + f.oldRoom + ' ← ' + f.newSector + '/' + f.newRoom + '\n';
          });
        }
        alert(msg);
      }

      // Create overlay modal
      overlay = document.createElement('div');
      overlay.className = 'ov-modal-overlay';
      overlay.id = 'housing-fix-overlay';
      overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;';
      overlay.onclick = function(e) { if (e.target === overlay && confirm('هل تريد إغلاق النافذة؟')) { overlay.remove(); } };

      modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:20px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.2);direction:rtl;font-family:inherit;';
      modal.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
          '<h3 style="margin:0;color:#e65100;">تشخيص وإصلاح سكن الموظف</h3>' +
          '<span style="font-size:13px;color:#888;">الموظف <span id="hfix-idx">1</span> من ' + pending.length + '</span>' +
        '</div>' +
        '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:15px;">' +
          '<div style="font-size:16px;font-weight:700;" id="hfix-name">-</div>' +
          '<div style="font-size:13px;color:#888;" id="hfix-code">-</div>' +
          '<div style="font-size:13px;color:#c62828;margin-top:6px;" id="hfix-old">-</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">المبنى</label>' +
          '<select id="hfix-sector" style="width:100%;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:13px;" onchange="var evt=document.createEvent(\'HTMLEvents\');evt.initEvent(\'change\',true,true);document.getElementById(\'hfix-room\').dispatchEvent(evt);"></select>' +
        '</div>' +
        '<div style="margin-bottom:18px;">' +
          '<label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">الغرفة</label>' +
          '<select id="hfix-room" style="width:100%;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:13px;"></select>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;">' +
          '<button id="hfix-skip-btn" style="flex:1;padding:10px;border:none;border-radius:6px;background:#e0e0e0;color:#333;font-size:14px;font-weight:600;cursor:pointer;">⏭️ تخطي</button>' +
          '<button id="hfix-save-btn" style="flex:1;padding:10px;border:none;border-radius:6px;background:#e65100;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">💾 حفظ</button>' +
        '</div>' +
        '<div style="margin-top:12px;text-align:center;">' +
          '<button id="hfix-cancel-btn" style="padding:6px 20px;border:none;border-radius:6px;background:transparent;color:#c62828;font-size:12px;cursor:pointer;">إلغاء</button>' +
        '</div>';

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      empNameEl = document.getElementById('hfix-name');
      empCodeEl = document.getElementById('hfix-code');
      empOldEl = document.getElementById('hfix-old');
      sectorSel = document.getElementById('hfix-sector');
      roomSel = document.getElementById('hfix-room');
      empIdxSpan = document.getElementById('hfix-idx');

      document.getElementById('hfix-save-btn').onclick = function() { applyCurrent('save'); };
      document.getElementById('hfix-skip-btn').onclick = function() { applyCurrent('skip'); };
      document.getElementById('hfix-cancel-btn').onclick = function() { if (confirm('هل تريد إلغاء العملية وتجاهل التغييرات؟')) { overlay.remove(); finishFixer(); } };
      sectorSel.onchange = function() {
        roomSel.innerHTML = '';
        var sector = sectorSel.value;
        if (!sector) {           var o = document.createElement('option'); o.value = ''; o.textContent = '-- اختر الغرفة --'; roomSel.appendChild(o); return; }
        var rooms = getAvailableRooms(sector);
        rooms.forEach(function(r) {
          var opt = document.createElement('option');
          opt.value = r.number;           opt.textContent = r.number + ' (السعة: ' + r.beds + ')';
          roomSel.appendChild(opt);
        });
      };

      showFixer();
    }

    function autoRepairHousing() {
      if (!requireAdmin()) return;
      var validSectors = {};
      roomsCapacity.forEach(function(rc) { validSectors[rc.sector] = true; });
      var validSectorList = Object.keys(validSectors);
      if (validSectorList.length === 0) { alert('لا توجد مبانٍ أو غرف مسجلة لإصلاح السكن. أضف مبنى وغرف أولاً.'); return; }

      function wordSimilarity(a, b) {
        a = a.trim(); b = b.trim();
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        var wa = a.split(/[\s/]+/), wb = b.split(/[\s/]+/);
        var matches = 0;
        wa.forEach(function(w) { if (w && wb.indexOf(w) !== -1) matches++; });
        wb.forEach(function(w) { if (w && wa.indexOf(w) !== -1) matches++; });
        return matches / Math.max(wa.length + wb.length, 1);
      }

      function findBestSector(input) {
        if (!input || !input.trim()) return null;
        input = input.trim();
        if (validSectors[input]) return input;
        var bestScore = 0, best = null;
        validSectorList.forEach(function(s) {
          var score = wordSimilarity(input, s);
          if (score > bestScore) { bestScore = score; best = s; }
        });
        return bestScore > 0.3 ? best : null;
      }

      function findBestRoom(sector, roomInput) {
        if (!roomInput) return null;
        var rooms = roomsCapacity.filter(function(r) { return r.sector === sector; });
        var exact = rooms.find(function(r) { return r.number === roomInput; });
        if (exact) return exact.number;
        var stripped = roomInput.replace(new RegExp(['إجازة','،','لا','يوجد','عهدة','دائم\\s*تواجد\\s*[()]?\\s*'].join('|'),'g'), '').trim();
        var bestScore = 0, best = null;
        rooms.forEach(function(r) {
          var score = wordSimilarity(r.number, roomInput);
          if (stripped) {
            var s2 = wordSimilarity(r.number, stripped);
            if (s2 > score) score = s2;
          }
          if (score > bestScore) { bestScore = score; best = r.number; }
        });
        if (bestScore > 0.3) return best;
        var emptyRooms = rooms.filter(function(r) {
          return !employees.some(function(e) { return e.sector === sector && e.room === r.number; });
        });
        if (emptyRooms.length > 0) return emptyRooms[0].number;
        return null;
      }

      var fixed = 0, skipped = 0, errors = [];
      employees.forEach(function(emp) {
        if (!emp.sector && !emp.room) return;
        if (emp.sector && emp.room && validSectors[emp.sector] && roomsCapacity.some(function(r) { return r.sector === emp.sector && r.number === emp.room; })) return;
        var newSector = validSectors[emp.sector] ? emp.sector : findBestSector(emp.sector);
        if (!newSector) { skipped++; errors.push(emp.name + ': تعذر تحديد مبنى مناسب'); return; }
        var newRoom = (newSector === emp.sector) ? findBestRoom(newSector, emp.room) : null;
        if (!newRoom) {
          var emptyRooms = roomsCapacity.filter(function(r) {
            return r.sector === newSector && !employees.some(function(e) { return e.sector === newSector && e.room === r.number; });
          });
          newRoom = emptyRooms.length > 0 ? emptyRooms[0].number : roomsCapacity.find(function(r) { return r.sector === newSector; })?.number;
        }
        if (!newRoom) { skipped++; errors.push(emp.name + ': لا توجد غرف متاحة في ' + newSector); return; }
        emp.sector = newSector;
        emp.room = newRoom;
        emp.modifiedAt = new Date().toISOString();
        fixed++;
      });
      if (fixed > 0) syncStorage();
      var msg = 'نتائج إعادة توزيع السكن:\n';
      msg += 'تم تعديل سكن: ' + fixed + ' موظف\n';
      msg += 'تعذر تعديل: ' + skipped + ' موظف\n';
      if (errors.length > 0) msg += 'تعذر تعديل السكن للتالي:\n' + errors.slice(0, 20).join('\n');
      alert(msg);
      renderHousingLayout();
      updateHousingStats();
      rebuildAllDropdowns();
    }

    function deleteBuilding(sector) {
      let buildingEmps = employees.filter(e => e.sector === sector);
      let otherSectors = dynamicSectors.filter(s => s !== sector);
      if (buildingEmps.length === 0) {
        if (!confirm('هل أنت متأكد من حذف المبنى "' + sector + '" وكل غرفه؟')) return;
        let sectorRooms = roomsCapacity.filter(r => r.sector === sector);
        sectorRooms.forEach(r => _logDeletion('roomsCapacity', r.sector + '|' + r.number));
        _logDeletion('dynamicSectors', sector);
        roomsCapacity = roomsCapacity.filter(r => r.sector !== sector);
        dynamicSectors = dynamicSectors.filter(s => s !== sector);
        syncStorage();
        renderHousingLayout();
        alert('تم حذف المبنى "' + sector + '" وجميع غرفه بنجاح');
        return;
      }
      if (otherSectors.length === 0) {
        alert('لا توجد مبانٍ أخرى لنقل الموظفين إليها. أضف مبنى آخر أولاً.');
        return;
      }
      let modal = document.createElement('div');
      modal.className = 'modal open';
      modal.id = 'modal-delete-building';
      let html = '<div class="modal-content" style="max-width:650px;border-top:5px solid #c62828;max-height:85vh;display:flex;flex-direction:column;">';
      html += '<div class="modal-header"><h2 style="color:#c62828;">أولاً جميع الموظفين: ' + sector + '</h2><span class="close-btn" onclick="this.closest(\'.modal\').remove()">&times;</span></div>';
      html += '<div style="flex:1;overflow:auto;padding:10px 0;">';
      html += '<div style="background:#ffebee;padding:10px 14px;border-radius:8px;font-size:13px;color:#c62828;margin-bottom:12px;">بيانات مسكنين <b>' + buildingEmps.length + '</b> بشكل صحيح بيانات جيد ممتاز. صحيحة سنة أدخل فضلك من أولاً.</div>';
      html += '<div id="delete-building-emps-list">';
      buildingEmps.forEach(function(emp, i) {
        html += '<div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;padding:8px 12px;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;">';
        html += '<span style="flex:1;min-width:150px;font-size:13px;font-weight:600;">' + emp.name + ' <span style="color:#888;font-size:11px;">[' + (emp.code || 'اختر') + '] - مبني ' + (emp.room || '-') + '</span></span>';
        html += '<select id="db-sect-' + i + '" style="width:130px;padding:6px 8px;border:2px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;">';
        html += '<option value="">-- سعة والغرفة --</option>';
        otherSectors.forEach(function(s) { html += '<option value="' + s + '">' + s + '</option>'; });
        html += '</select>';
        html += '<select id="db-room-' + i + '" style="width:120px;padding:6px 8px;border:2px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;">';
        html += '<option value="">-- اختر المبني --</option>';
        html += '</select>';
        html += '</div>';
      });
      html += '</div></div>';
      html += '<div style="padding:10px 0;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;">';
      html += '<button class="btn" style="background:#757575;color:#fff;" onclick="document.getElementById(\'modal-delete-building\').remove()">إلغاء</button>';
      html += '<button class="btn" style="background:#c62828;color:#fff;" onclick="confirmDeleteBuilding(\'' + sector.replace(/'/g, "\\'") + '\')">تأكيد الحذف</button>';
      html += '</div></div>';
      modal.innerHTML = html;
      document.body.appendChild(modal);
      buildingEmps.forEach(function(emp, i) {
        var sectSel = document.getElementById('db-sect-' + i);
        var roomSel = document.getElementById('db-room-' + i);
        if (!sectSel || !roomSel) return;
        sectSel.onchange = function() {
          var selSect = sectSel.value;
          roomSel.innerHTML = '<option value="">-- موظف تم --</option>';
          if (!selSect) return;
          var rooms = roomsCapacity.filter(r => r.sector === selSect);
          rooms.forEach(function(r) {
            var occupantCount = employees.filter(e => e.sector === selSect && e.room === r.number && (e.id || e.code) !== (emp.id || emp.code)).length;
            var hasSpace = occupantCount < r.beds;
            var opt = document.createElement('option');
            opt.value = r.number;
            opt.textContent = 'التخطي ' + r.number + ' (' + occupantCount + '/' + r.beds + ')' + (hasSpace ? '' : ' (ممتلئ)');
            opt.disabled = !hasSpace;
            roomSel.appendChild(opt);
          });
        };
      });
    }

    function confirmDeleteBuilding(sector) {
      let buildingEmps = employees.filter(e => e.sector === sector);
      let allAssigned = true;
      let unassigned = [];
      buildingEmps.forEach(function(emp, i) {
        var sectSel = document.getElementById('db-sect-' + i);
        var roomSel = document.getElementById('db-room-' + i);
        if (!sectSel || !roomSel || !sectSel.value || !roomSel.value) {
          allAssigned = false;
          unassigned.push(emp.name);
        }
      });
      if (!allAssigned) {
        alert('الموظفون غير المسندين لغرف: ' + unassigned.join('، '));
        return;
      }
      if (!confirm('سيتم نقل ' + buildingEmps.length + ' موظف من المبنى "' + sector + '" إلى مبنى آخر. هل تريد المتابعة؟')) return;
      buildingEmps.forEach(function(emp, i) {
        var sectSel = document.getElementById('db-sect-' + i);
        var roomSel = document.getElementById('db-room-' + i);
        emp.sector = sectSel.value;
        emp.room = roomSel.value;
        emp.modifiedAt = new Date().toISOString();
      });
      let sectorRooms = roomsCapacity.filter(r => r.sector === sector);
      sectorRooms.forEach(r => _logDeletion('roomsCapacity', r.sector + '|' + r.number));
      _logDeletion('dynamicSectors', sector);
      roomsCapacity = roomsCapacity.filter(r => r.sector !== sector);
      dynamicSectors = dynamicSectors.filter(s => s !== sector);
      syncStorage();
      var modal = document.getElementById('modal-delete-building');
      if (modal) modal.remove();
      renderHousingLayout();
        alert('تم نقل ' + buildingEmps.length + ' موظف من المبنى "' + sector + '" إلى أقسام أخرى');
    }

    function editSectorName(btn, oldName) {
        let newName = prompt('أدخل الاسم الجديد للمبنى:\n' + oldName, oldName);
      if (!newName || newName.trim() === '' || newName === oldName) return;
      newName = newName.trim();
      if (dynamicSectors.indexOf(newName) !== -1) {
        alert('تم تخطي هذا العنصر.');
        return;
      }
      let idx = dynamicSectors.indexOf(oldName);
      if (idx === -1) return;
      // Update dynamicSectors
      dynamicSectors[idx] = newName;
      // Update roomsCapacity
      roomsCapacity.forEach(function(r) { if (r.sector === oldName) r.sector = newName; });
      // Update employees
      employees.forEach(function(e) { if (e.sector === oldName) e.sector = newName; });
      syncStorage();
      renderHousingLayout();
      alert('تم تغيير اسم المبنى من "' + oldName + '" إلى "' + newName + '"');
    }

    function migrateRoom(fromSector, fromRoom) {
      let roomEmps = employees.filter(function(e) { return e.sector === fromSector && e.room === fromRoom; });
      if (roomEmps.length === 0) { alert('لا يوجد موظفون في هذه الغرفة للنقل.'); return; }
      // Build target options grouped by sector
      var targetOptions = '<option value="">-- تم الإصلاح؟ إلغاء --</option>';
      var sectorsList = {};
      roomsCapacity.forEach(function(r) {
        if (r.sector === fromSector && r.number === fromRoom) return;
        if (!sectorsList[r.sector]) sectorsList[r.sector] = [];
        var currentCount = employees.filter(function(e) { return e.sector === r.sector && e.room === r.number; }).length;
        sectorsList[r.sector].push({ room: r.number, beds: r.beds, current: currentCount, avail: r.beds - currentCount });
      });
      Object.keys(sectorsList).sort().forEach(function(s) {
        var rooms = sectorsList[s];
        if (rooms.length === 0) return;
        targetOptions += '<optgroup label="' + s + '">';
        rooms.forEach(function(r) { targetOptions += '<option value="' + s.replace(/'/g, "\\'") + '|' + r.room.replace(/'/g, "\\'") + '">' + r.room + ' (' + r.current + '/' + r.beds + ')' + (r.avail < roomEmps.length ? ' (ممتلئ)' : '') + '</option>'; });
        targetOptions += '</optgroup>';
      });
      var html = '<div class="modal open" id="modal-migrate"><div class="modal-content" style="max-width:500px;border-top:5px solid #37474f;">';
      html += '<div class="modal-header"><h2 style="color:#37474f;">بيانات اختر مبني أولاً</h2><span class="close-btn" onclick="document.getElementById(\'modal-migrate\').remove()">&times;</span></div>';
      html += '<div style="background:#f5f5f5;padding:10px 14px;border-radius:8px;margin-bottom:12px;">';
      html += '<div style="font-weight:700;margin-bottom:6px;">بيانات: ' + fromSector + ' — ' + fromRoom + '</div>';
      html += '<div style="font-size:13px;">سعة هل: ' + roomEmps.length + '</div>';
      html += '<div style="max-height:120px;overflow-y:auto;margin-top:6px;">';
      roomEmps.forEach(function(e) { html += '<span class="user-badge">' + e.name.split(' ').slice(0,2).join(' ') + '</span> '; });
      html += '</div></div>';
      html += '<div class="form-group"><label>أنت متأكد:</label><select id="migrate-target" style="width:100%;padding:10px;">' + targetOptions + '</select></div>';
      html += '<div style="display:flex;gap:8px;margin-top:15px;">';
      html += '<button class="btn btn-primary" onclick="execMigrate(\'' + fromSector.replace(/'/g, "\\'") + '\',\'' + fromRoom.replace(/'/g, "\\'") + '\')">تأكيد النقل</button>';
      html += '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-migrate\').remove()">إلغاء</button></div>';
      html += '</div></div>';
      document.body.insertAdjacentHTML('beforeend', html);
    }

    function execMigrate(fromSector, fromRoom) {
      var sel = document.getElementById('migrate-target');
      if (!sel || !sel.value) { alert('الرجاء اختيار غرفة للنقل'); return; }
      var parts = sel.value.split('|');
      var toSector = parts[0], toRoom = parts[1];
      if (!toSector || !toRoom) return;
      // Check availability
      var target = roomsCapacity.filter(function(r) { return r.sector === toSector && r.number === toRoom; })[0];
      if (!target) { alert('الغرفة أو المبنى المحدد غير موجود.'); return; }
      var currentCount = employees.filter(function(e) { return e.sector === toSector && e.room === toRoom; }).length;
      var avail = target.beds - currentCount;
      var toMove = employees.filter(function(e) { return e.sector === fromSector && e.room === fromRoom; });
      if (toMove.length === 0) { alert('لا يوجد موظفون لنقلهم إلى هذه الغرفة.'); document.getElementById('modal-migrate').remove(); return; }
      if (avail < toMove.length && !confirm('سعة الغرفة (' + toSector + ' - ' + toRoom + ') هي ' + target.beds + ' ومسجل بها حالياً ' + currentCount + ' موظف.\nسيتم نقل ' + toMove.length + ' موظف وقد تتجاوز السعة. هل تريد المتابعة؟')) return;
      toMove.forEach(function(e) { e.sector = toSector; e.room = toRoom; });
      syncStorage();
      renderHousingLayout();
      document.getElementById('modal-migrate').remove();
      alert('تم نقل ' + toMove.length + ' موظف من "' + fromSector + ' - ' + fromRoom + '" إلى غرفة "' + toSector + ' - ' + toRoom + '"');
    }

    function editRoomBeds(sector, roomNumber, currentBeds) {
      let newBeds = prompt('أخرى قبل الحذف ' + roomNumber + ' بيانات بدون ' + sector + '\nغرفة اختر: ' + currentBeds + '\nمبنى أولاً مبنى:', currentBeds);
      if (newBeds === null) return;
      newBeds = parseInt(newBeds);
      if (isNaN(newBeds) || newBeds < 1) return alert('الرجاء إدخال عدد أسرّة صحيح أكبر من صفر');
      let room = roomsCapacity.find(r => r.sector === sector && r.number === roomNumber);
      if (room) {
        room.beds = newBeds;
        room.modifiedAt = new Date().toISOString();
      }
      syncStorage();
      renderHousingLayout();
      alert('تم تحديث سعة الغرفة ' + roomNumber + ' إلى ' + newBeds + ' سرير');
    }

    function editRoomName(sector, roomNumber) {
      let newName = prompt('أدخل الاسم الجديد للغرفة "' + roomNumber + '" في المبنى "' + sector + '" (سيتم نقل جميع الموظفين إليها):', roomNumber);
      if (newName === null || !newName.trim()) return;
      newName = newName.trim();
      if (newName === roomNumber) return;
      let exists = roomsCapacity.find(r => r.sector === sector && r.number === newName && r.number !== roomNumber);
      if (exists) return alert('رقم الغرفة "' + newName + '" موجود بالفعل في هذا المبنى');
      let room = roomsCapacity.find(r => r.sector === sector && r.number === roomNumber);
      if (room) {
        room.number = newName;
        room.modifiedAt = new Date().toISOString();
      }
      employees.forEach(function(e) {
        if (e.sector === sector && e.room === roomNumber) e.room = newName;
      });
      _logDeletion('roomsCapacity', sector + '|' + roomNumber);
      syncStorage();
      renderHousingLayout();
      renderTable();
      alert('تم تغيير اسم الغرفة من "' + roomNumber + '" إلى "' + newName + '"');
    }

    function printHousing() {
      let sectorsMap = {};
      dynamicSectors.forEach(s => sectorsMap[s] = []);
      roomsCapacity.forEach(rc => {
        if (!sectorsMap[rc.sector]) sectorsMap[rc.sector] = [];
        sectorsMap[rc.sector].push(rc);
      });
      let totalBeds = 0, totalOccupied = 0, totalVacant = 0;
      let buildingRows = '';
      for (let sector in sectorsMap) {
        if (sectorsMap[sector].length === 0) continue;
        let sectorBeds = 0, sectorOccupied = 0;
        let roomRows = '';
        sectorsMap[sector].forEach(room => {
          let occupants = employees.filter(e => e.sector === sector && e.room === room.number);
          let occCount = occupants.length;
          let vacant = room.beds - occCount;
          sectorBeds += room.beds;
          sectorOccupied += occCount;
          let names = occupants.map(e => {
            let badge = e.status === 'V' ? ' <span style="color:#e65100;font-size:10px;">(يجب)</span>' : '';
            return e.name + badge;
          }).join('، ');
          if (!names) names = '<span style="color:#999;">تعيين</span>';
          roomRows += '<tr><td style="text-align:center;font-weight:700;">' + room.number + '</td><td style="text-align:center;">' + room.beds + '</td><td style="text-align:center;">' + occCount + '</td><td style="text-align:center;' + (vacant === 0 ? 'color:#c62828;font-weight:700;' : vacant <= 1 ? 'color:#e65100;' : 'color:#2e7d32;') + '">' + vacant + '</td><td style="font-size:11px;">' + names + '</td></tr>';
        });
        totalBeds += sectorBeds;
        totalOccupied += sectorOccupied;
        let sectorVacant = sectorBeds - sectorOccupied;
        totalVacant += sectorVacant;
        let occPercent = sectorBeds > 0 ? Math.round(sectorOccupied / sectorBeds * 100) : 0;
        buildingRows += '<tr style="background:#e8f5e9;"><td colspan="5" style="font-weight:800;font-size:14px;color:#1b5e20;padding:10px;">بيانات ' + sector + ' <span style="font-size:11px;color:#555;font-weight:400;">(' + sectorsMap[sector].length + ' مبنى | وغرفة: ' + sectorOccupied + '/' + sectorBeds + ' | ' + occPercent + '%)</span></td></tr>';
        buildingRows += roomRows;
      }
      let mainPercent = totalBeds > 0 ? Math.round(totalOccupied / totalBeds * 100) : 0;
      let printContent = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير السكن</title>';
      printContent += '<style>';
      printContent += '*{margin:0;padding:0;box-sizing:border-box;}';
      printContent += 'body{font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif;padding:15px;color:#333;background:#fff;}';
      printContent += '.header{text-align:center;border-bottom:3px solid #1b5e20;padding-bottom:10px;margin-bottom:15px;}';
      printContent += '.header h1{font-size:20px;color:#1b5e20;margin-bottom:2px;}';
      printContent += '.header p{font-size:12px;color:#666;}';
      printContent += '.summary{display:flex;justify-content:center;gap:20px;margin-bottom:18px;flex-wrap:wrap;}';
      printContent += '.summary-box{background:#f1f8e9;border:2px solid #a5d6a7;border-radius:8px;padding:10px 20px;text-align:center;min-width:140px;}';
      printContent += '.summary-box .label{font-size:11px;color:#555;font-weight:600;}';
      printContent += '.summary-box .value{font-size:22px;font-weight:800;color:#1b5e20;}';
      printContent += '.summary-box.blue{background:#e3f2fd;border-color:#90caf9;}.summary-box.blue .value{color:#1565c0;}';
      printContent += '.summary-box.orange{background:#fff3e0;border-color:#ffcc80;}.summary-box.orange .value{color:#e65100;}';
      printContent += 'table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:0;}';
      printContent += 'th{background:#1b5e20;color:white;padding:7px 8px;font-size:12px;font-weight:700;text-align:center;}';
      printContent += 'td{padding:6px 8px;border-bottom:1px solid #e0e0e0;}';
      printContent += 'tr:nth-child(even):not(:has(td[colspan])){background:#f9fafb;}';
      printContent += '.footer{text-align:center;font-size:10px;color:#999;margin-top:12px;border-top:1px solid #eee;padding-top:6px;}';
      printContent += '@media print{body{padding:0;}@page{size:A4 landscape;margin:0.8cm;}.no-print{display:none!important;}}';
      printContent += '</style></head><body>';
      printContent += '<div class="header"><h1>تقرير السكن</h1><p>تاريخ التقرير: ' + new Date().toLocaleDateString('ar-EG', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) + ' | ' + new Date().toLocaleTimeString('ar-EG') + '</p></div>';
      printContent += '<div class="summary">';
      printContent += '<div class="summary-box"><div class="label">إجمالي الأسرة</div><div class="value">' + totalBeds + '</div></div>';
      printContent += '<div class="summary-box blue"><div class="label">مشغول</div><div class="value">' + totalOccupied + '</div><div class="label">' + mainPercent + '%</div></div>';
      printContent += '<div class="summary-box orange"><div class="label">شاغر</div><div class="value">' + totalVacant + '</div></div>';
      printContent += '</div>';
      printContent += '<table><thead><tr><th style="width:80px;">الغرفة</th><th style="width:70px;">أسرة</th><th style="width:70px;">مشغول</th><th style="width:70px;">شاغر</th><th>أسماء المقيمين</th></tr></thead><tbody>';
      printContent += buildingRows;
      printContent += '</tbody></table>';
      printContent += '<div class="footer">نظام الشئون الإدارية المتكامل — لينه فارمز</div>';
      printContent += '<script>setTimeout(function(){window.print();},500);<\/script>';
      printContent += '</body></html>';
      let w = window.open('', '_blank', 'width=1100,height=800');
      w.document.write(printContent);
      w.document.close();
    }

    function showHousingEmployeeResult() {
      var q = document.getElementById('housing-emp-search').value.trim();
      var resultDiv = document.getElementById('housing-emp-result');
      if (!q) { resultDiv.style.display = 'none'; return; }
      var emp = findEmpByInput(q);
      if (!emp) { resultDiv.style.display = 'none'; return; }
      document.getElementById('housing-result-name').textContent = emp.name || '-';
      document.getElementById('housing-result-code').textContent = '[' + (emp.code || 'تعديل') + ']';
      document.getElementById('housing-result-detail').textContent = 'المبنى: ' + (emp.sector || '—') + ' | الغرفة: ' + (emp.room || '—') + ' | الحالة: ' + (emp.status === 'P' ? 'متواجد' : emp.status === 'V' ? 'في إجازة' : emp.status || '-');
      fillSelectWithOptions('housing-edit-sector', dynamicSectors, '-- في مبنى --');
      var sectorSel = document.getElementById('housing-edit-sector');
      sectorSel.value = emp.sector || '';
      sectorSel.onchange = function() { updateHousingEditRoom(); };
      updateHousingEditRoom();
      resultDiv.style.display = 'block';
    }

    function updateHousingEditRoom() {
      var sector = document.getElementById('housing-edit-sector').value;
      var roomSel = document.getElementById('housing-edit-room');
      roomSel.innerHTML = '';
      if (!sector) {
        var opt = document.createElement('option'); opt.value = ''; opt.textContent = '-- الاسم الجديد يوجد --'; roomSel.appendChild(opt); return;
      }
      var sectorRooms = roomsCapacity.filter(function(r) { return r.sector === sector; });
      if (sectorRooms.length === 0) {
        var opt = document.createElement('option'); opt.value = ''; opt.textContent = 'لا توجد غرف في هذا المبنى'; roomSel.appendChild(opt); return;
      }
      sectorRooms.forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r.number; opt.textContent = r.number + ' (الاسم: ' + r.beds + ')';
        roomSel.appendChild(opt);
      });
      sortSelectOptions(roomSel);
      var qEmp = document.getElementById('housing-emp-search').value.trim();
      if (qEmp) {
        var emp = findEmpByInput(qEmp);
        if (emp && emp.room) roomSel.value = emp.room;
      }
    }

    function saveHousingAssignment() {
      if (!requireAdmin()) return;
      var qEmp = document.getElementById('housing-emp-search').value.trim();
      var emp = findEmpByInput(qEmp);
      var empId = emp ? (emp.id || emp.code) : '';
      if (!empId) return;
      if (!emp) return;
      var sector = document.getElementById('housing-edit-sector').value;
      var room = document.getElementById('housing-edit-room').value;
      if (!sector || !room) { alert('تم تغيير اسم الغرفة'); return; }
      emp.sector = sector;
      emp.room = room;
      emp.modifiedAt = new Date().toISOString();
      syncStorage();
      renderHousingLayout();
      showHousingEmployeeResult();
      rebuildAllDropdowns();
      alert('تم إسكان الموظف ' + emp.name + ' بنجاح');
    }

    var _raSector = '', _raRoom = '', _raEditIdx = -1;
    function openRoomAssets(sector, room) {
      _raSector = sector; _raRoom = room; _raEditIdx = -1;
      document.getElementById('room-assets-header').textContent = 'مبنى: ' + sector + ' | غرفة: ' + room;
      document.getElementById('ra-item').value = ''; document.getElementById('ra-qty').value = '1'; document.getElementById('ra-notes').value = '';
      document.getElementById('btn-save-room-asset').textContent = '➕ إضافة أصل';
      renderRoomAssets();
      openModal('modal-room-assets');
    }
    function renderRoomAssets() {
      var list = document.getElementById('room-assets-list');
      var items = roomAssets.filter(function(a) { return a.sector === _raSector && a.room === _raRoom; });
      list.innerHTML = items.length ? items.map(function(a, i) {
        var idx = roomAssets.indexOf(a);
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid #eee;"><span>' + a.item + (a.qty > 1 ? ' (x' + a.qty + ')' : '') + (a.notes ? ' — ' + a.notes : '') + ' <small style="color:#999;">' + a.dateAdded + '</small></span><span><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:1px 6px;font-size:11px;margin-left:4px;" onclick="editRoomAsset(' + idx + ')">✏️</button><button class="btn btn-sm" style="background:#d32f2f;color:#fff;padding:1px 6px;font-size:11px;" onclick="deleteRoomAsset(' + idx + ')">✕</button></span></div>';
      }).join('') : '<div style="color:#999;font-style:italic;text-align:center;">لا توجد أصول في هذه الغرفة</div>';
    }
    function saveRoomAsset() {
      var item = document.getElementById('ra-item').value.trim();
      if (!item) return alert('أدخل اسم الأصل');
      var qty = parseInt(document.getElementById('ra-qty').value) || 1;
      var notes = document.getElementById('ra-notes').value.trim();
      if (_raEditIdx >= 0) {
        var a = roomAssets[_raEditIdx];
        if (a) { a.item = item; a.qty = qty; a.notes = notes; }
        _raEditIdx = -1;
        syncStorage();
        logAction('تاريخ', 'الطباعة الساعة', item, 'إجمالي: ' + _raSector + ' | الأسِرّة: ' + _raRoom);
      } else {
        roomAssets.push({ sector: _raSector, room: _raRoom, item: item, qty: qty, notes: notes, dateAdded: new Date().toISOString().split('T')[0] });
        syncStorage();
        logAction('المشغولة', 'الشاغرة الغرفة', item, 'السعة: ' + _raSector + ' | المشغول: ' + _raRoom + ' | الشاغر: ' + qty);
      }
      document.getElementById('ra-item').value = ''; document.getElementById('ra-qty').value = '1'; document.getElementById('ra-notes').value = '';
      document.getElementById('btn-save-room-asset').textContent = '➕ إضافة أصل';
      renderRoomAssets();
    }
    function editRoomAsset(idx) {
      var a = roomAssets[idx];
      if (!a) return;
      _raEditIdx = idx;
      document.getElementById('ra-item').value = a.item;
      document.getElementById('ra-qty').value = a.qty;
      document.getElementById('ra-notes').value = a.notes || '';
      document.getElementById('btn-save-room-asset').textContent = '💾 حفظ تعديل';
    }
    function deleteRoomAsset(idx) {
      if (!requireAdmin()) return;
      var a = roomAssets[idx];
      if (!a) return;
      _logDeletion('roomAssets', (a.room || '') + '|' + (a.item || '') + '|' + (a.id || ''));
      roomAssets.splice(idx, 1);
      syncStorage();
      logAction('المتكاملة', 'لينه فارمز', a.item, 'طباعة: ' + a.sector + ' | تلقائية: ' + a.room);
      renderRoomAssets();
    }
    function exportRoomAssets() {
      if (!roomAssets.length) return alert('لا توجد أصول للتصدير');
      var rows = [['المبنى', 'رقم الغرفة', 'السكان', 'اسم الأصل', 'الكمية', 'ملاحظات', 'تاريخ الإضافة']];
      roomAssets.forEach(function(a) {
        var residents = employees.filter(function(e) { return e.sector === a.sector && e.room === a.room; }).map(function(e) { return e.name; }).join('، ') || '—';
        rows.push([a.sector, a.room, residents, a.item, a.qty, a.notes || '', a.dateAdded]);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'أصول الغرف');
      XLSX.writeFile(wb, 'غرف_سعة_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
    function importRoomAssets() {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.xlsx,.csv';
      input.onchange = function(e) {
        var file = e.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var wb = XLSX.read(ev.target.result, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rows.length < 2) return alert('الملف فارغ أو لا يحتوي على بيانات');
            var added = 0, updated = 0;
            for (var i = 1; i < rows.length; i++) {
              var cols = rows[i];
              if (!cols || cols.length < 4) continue;
              var sector = (cols[0] || '').toString().trim();
              var room = (cols[1] || '').toString().trim();
              var item = (cols[3] || '').toString().trim();
              if (!sector || !room || !item) continue;
              var qty = parseInt(cols[4]) || 1;
              var notes = cols[5] ? cols[5].toString().trim() : '';
              var dateAdded = cols[6] ? cols[6].toString().trim() : new Date().toISOString().split('T')[0];
              var existing = roomAssets.find(function(a) { return a.sector === sector && a.room === room && a.item === item; });
              if (existing) {
                existing.qty = qty; existing.notes = notes; existing.dateAdded = dateAdded;
                updated++;
              } else {
                roomAssets.push({ sector, room, item, qty, notes, dateAdded });
                added++;
              }
            }
            syncStorage();
            logAction('القطاع', 'والغرفة تم حفظ', (added + updated) + ' موقع (' + added + ' السكن ' + updated + ' للموظف)');
            renderRoomAssets();
            alert('تمت إضافة ' + added + ' غرفة وتحديث ' + updated + ' أصل');
          } catch(e) { alert('خطأ في حفظ بيانات الشئون الإدارية: ' + e.message); }
        };
        reader.readAsArrayBuffer(file);
      };
      input.click();
    }

    function deleteEmptyRooms() { if (!requireAdmin()) return;
      let occupied = new Set();
      employees.filter(e => e.status === 'P' && e.sector && e.room).forEach(e => occupied.add(e.sector + '|' + e.room));
      let before = roomsCapacity.length;
      let removedRooms = roomsCapacity.filter(r => !occupied.has(r.sector + '|' + r.number));
      removedRooms.forEach(function(r) { _logDeletion('roomsCapacity', r.sector + '|' + r.number); });
      roomsCapacity = roomsCapacity.filter(r => occupied.has(r.sector + '|' + r.number));
      let after = roomsCapacity.length;
      if (before === after) { alert('لا توجد غرف خالية للحذف.'); return; }
      let usedSectors = new Set(roomsCapacity.map(r => r.sector));
      let usedRooms = new Set(roomsCapacity.map(r => r.number));
      dynamicSectors = dynamicSectors.filter(s => usedSectors.has(s));
      dynamicRooms = dynamicRooms.filter(r => usedRooms.has(r));
      syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
      alert('تم حذف ' + (before - after) + ' غرفة غير مستخدمة');
    }

    function clearInvalidRoomAssignments(silent) { if (!requireAdmin()) return;
      var counts = {};
      roomsCapacity.forEach(function(r) { var k = r.sector + '|' + r.number; counts[k] = (counts[k] || 0) + 1; });
      var occupied = {};
      employees.forEach(function(e) { if (e.sector && e.room) occupied[e.sector + '|' + e.room] = true; });
      var before = roomsCapacity.length;
      var kept = {}, removed = [];
      roomsCapacity = roomsCapacity.filter(function(r) {
        var k = r.sector + '|' + r.number;
        if (counts[k] <= 1) return true;
        if (occupied[k]) { if (kept[k]) { removed.push(k); return false; } kept[k] = true; return true; }
        if (!kept[k]) { kept[k] = true; return true; }
        removed.push(k); return false;
      });
      if (before === roomsCapacity.length) { if (!silent) alert('لا توجد غرف مكررة للحذف.'); return; }
      removed.forEach(function(k) { _logDeletion('roomsCapacity', k); });
      syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
      if (!silent) alert('تم حذف ' + (before - roomsCapacity.length) + ' غرفة مكررة');
    }

    function cleanCorruptedHousing() {
      var before = roomsCapacity.length;
      roomsCapacity = roomsCapacity.filter(function(r) {
        return r && typeof r.sector === 'string' && r.sector.trim() && r.sector.indexOf('?') === -1 && (typeof r.number !== 'string' || r.number.indexOf('?') === -1);
      });
      if (roomsCapacity.length !== before) {
        roomsCapacity.forEach(function(r) { _logDeletion('roomsCapacity', r.sector + '|' + r.number); });
        syncStorage();
      }
      if (Array.isArray(dynamicSectors)) {
        var dsBefore = dynamicSectors.length;
        dynamicSectors = dynamicSectors.filter(function(s) { return s && typeof s === 'string' && s.trim() && s.indexOf('?') === -1; });
        if (dynamicSectors.length !== dsBefore) syncStorage();
      }
    }

    function saveRoomCapacity() {
      let sector = document.getElementById('form-room-sector').value.trim();
      let existingRoom = document.getElementById('form-room-number').value.trim();
      let newRoom = document.getElementById('form-room-new').value.trim();
      let number = newRoom || existingRoom;
      let beds = document.getElementById('form-room-beds').value;

      if(!sector) return alert("الرجاء اختيار المبنى");
      if(!number) return alert("الرجاء إدخال رقم الغرفة");
      if(!beds) return alert("الرجاء إدخال عدد الأسرّة");

      if(!dynamicSectors.includes(sector)) dynamicSectors.push(sector);
      if(!dynamicRooms.includes(number)) dynamicRooms.push(number);

      let idx = roomsCapacity.findIndex(r => r.sector === sector && r.number === number);
      if(idx !== -1) { roomsCapacity[idx].beds = parseInt(beds); } 
      else { roomsCapacity.push({ sector, number, beds: parseInt(beds) }); }

      syncStorage(); renderHousingLayout(); rebuildAllDropdowns(); closeModal('modal-add-room');
    }

    function populateRoomSectorDropdown() {
      let sel = document.getElementById('form-room-sector');
      if(!sel) return;
      sel.innerHTML = '<option value="">-- إضافة أصل --</option>';
      dynamicSectors.forEach(s => {
        let opt = document.createElement('option');
        opt.value = s; opt.textContent = s; sel.appendChild(opt);
      });
      sel.onchange = function() { updateRoomDropdownForSector(this.value); };
      updateRoomDropdownForSector(sel.value);
    }

    function updateRoomDropdownForSector(sector) {
      let sel = document.getElementById('form-room-number');
      if(!sel) return;
      sel.innerHTML = '<option value="">-- حفظ تعديل --</option>';
      if(!sector) return;
      let sectorRooms = roomsCapacity.filter(r => r.sector === sector).map(r => r.number);
      let allRooms = [...new Set([...sectorRooms, ...dynamicRooms])];
      allRooms.forEach(r => {
        let opt = document.createElement('option');
        opt.value = r; opt.textContent = r; sel.appendChild(opt);
      });
    }

    function addInventoryVoucher() {
      let voucherId = 'BN' + Date.now().toString().slice(-6);
      let dept = document.getElementById('inv-dept-select').value;
      let empNameRaw = document.getElementById('inv-emp-name').value.trim();
      let itemName = document.getElementById('inv-item-name').value.trim();
      let itemCode = document.getElementById('inv-item-code').value;
      let unit = document.getElementById('inv-unit-select').value;
      let qty = parseInt(document.getElementById('inv-qty').value) || 1;
      let notes = document.getElementById('inv-notes').value.trim();

      if(!itemName || !qty || !empNameRaw) {
        return alert("من فضلك املأ البيانات الأساسية: تحديد الموظف المستلم، اسم الصنف، والكمية!");
      }

      let empObj = findEmpByInput(empNameRaw);
      let empId = empObj ? (empObj.id || empObj.code) : '';
      let empName = empObj ? empObj.name : empNameRaw;

      let voucher = { voucherId, dept, empId, empName, itemName, itemCode, unit, qty: parseInt(qty), date: new Date().toISOString().split('T')[0], notes };
      inventoryVouchers.push(_ts(voucher)); syncStorage(); renderInventoryTable();
      logAction('المخزن', 'صرف', itemName, 'الكمية: ' + qty + ' | للإدارة: ' + dept + ' | الموظف: ' + empName);
      
      // Update archive: deduct qty from matching archive records
      var remaining = qty;
      for (var ai = 0; ai < archiveData.length && remaining > 0; ai++) {
        var a = archiveData[ai];
        if (!a.item || a.qty <= 0) continue;
        // Match if itemName is part of archive item name (flexible match)
        if (a.item.toLowerCase().indexOf(itemName.toLowerCase()) !== -1 || itemName.toLowerCase().indexOf(a.item.toLowerCase()) !== -1) {
          var deduct = Math.min(remaining, a.qty);
          a.qty -= deduct;
          remaining -= deduct;
          if (a.desc) a.desc += ' | ';
          a.desc = (a.desc || '') + 'تم صرف ' + deduct + ' بتاريخ ' + new Date().toISOString().split('T')[0];
        }
      }
      if (remaining < qty) { syncStorage(); switchArchiveTab(_arcTab || 'incoming'); }
      
      document.getElementById('inv-item-name').value = '';
      document.getElementById('inv-item-code').value = '';
      document.getElementById('inv-notes').value = '';
      alert("تم تسجيل حركة وبون صرف المخزن للإدارة المستلمة والموظف بنجاح.");
    }

    function renderInventoryTable() {
      let q = document.getElementById('search-inventory').value.toLowerCase();
      let tbody = document.getElementById('inventory-table-body');
      if(!tbody) return; tbody.innerHTML = '';

      let filtered = inventoryVouchers.filter(v => {
        return (v.voucherId||'').toLowerCase().includes(q) || (v.dept||'').toLowerCase().includes(q) || (v.empName||'').toLowerCase().includes(q) || (v.itemName||'').toLowerCase().includes(q) || (v.itemCode||'').toLowerCase().includes(q);
      });

      let st = sortState['table-inventory'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);

      filtered.forEach((v) => {
        let realIdx = inventoryVouchers.indexOf(v);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-inventory"></td>
          <td><b>${v.voucherId}</b></td>
          <td><span style="color:var(--secondary);font-weight:700;">${v.dept}</span></td>
          <td>${v.empName}</td>
          <td>${v.itemCode ? `<span style="font-size:11px;color:#888;">[${v.itemCode}]</span> `:''}${v.itemName}</td>
          <td>${v.unit}</td>
          <td><b>${v.qty}</b></td>
          <td>${v.date}</td>
          <td>${v.notes || '—'}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px; font-size:11px;" onclick="editInventoryVoucher(${realIdx})">✏️</button> <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteInventoryVoucher(${realIdx})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteInventoryVoucher(idx) { if (!requireAdmin()) return;
      if(confirm("هل تريد حذف هذا البون من حركة المخزن؟")) {
        _logDeletion('inventoryVouchers', inventoryVouchers[idx].voucherId || inventoryVouchers[idx].id || inventoryVouchers[idx]._id);
        inventoryVouchers.splice(idx, 1); syncStorage(); renderInventoryTable();
      }
    }

    // --- أصل جديد، ---
    function addInventoryItem() {
      let code = document.getElementById('item-code').value.trim();
      let name = document.getElementById('item-name').value.trim();
      let unit = document.getElementById('item-unit').value;
      let store = document.getElementById('item-store').value.trim();
      if(!code || !name) return alert("تحديث فشل قراءة الملف لا!");
      if(inventoryItems.some(i => i.code === code)) return alert("توجد غرف خالية للحذف!");
      inventoryItems.push({ code, name, unit, store: store || '—' });
      syncStorage(); renderInventoryItems();
      document.getElementById('item-code').value = ''; document.getElementById('item-name').value = '';
      document.getElementById('item-store').value = '';
      alert(`تم تسجيل الصنف [${name}] في سجل الأصناف`);
    }

    function renderInventoryItems() {
      let q = document.getElementById('search-items-registry')?.value.toLowerCase() || '';
      let tbody = document.getElementById('items-registry-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      let filtered = inventoryItems.filter(item =>
        (item.code||'').toLowerCase().includes(q) ||
        (item.name||'').toLowerCase().includes(q) ||
        (item.store||'').toLowerCase().includes(q)
      );
      let st = sortState['table-items-registry'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((item) => {
        let realIdx = inventoryItems.indexOf(item);
        let tr = document.createElement('tr');
        tr.innerHTML = `<td class="no-print"><input type="checkbox" class="row-check" data-table="table-items-registry"></td><td><b>${item.code}</b></td><td>${item.name}</td><td>${item.unit}</td><td>${item.store}</td><td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteInventoryItem(${realIdx})">حذف</button></td>`;
        tbody.appendChild(tr);
      });
    }

    function handleItemsExcelImport(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if(!json || json.length === 0) return alert("الملف فارغ أو لا يحتوي على بيانات صالحة.");
          let added = 0, skipped = 0;
          json.forEach(row => {
            for(let key in row) {
              let v = (row[key]||'').toString().trim();
              if(v.startsWith('أو')) return;
            }
            let code = (row["اكتب اسم"] || row["غرفة"] || row["code"] || row["Code"] || row["ITEM_CODE"] || '').toString().trim();
            let name = (row["جديدة حدد"] || row["عدد"] || row["name"] || row["Name"] || row["ITEM_NAME"] || '').toString().trim();
            let unit = (row["الأسِرّة"] || row["unit"] || row["Unit"] || 'اختر').toString().trim();
            let store = (row["القطاع"] || row["اختر"] || row["store"] || row["Store"] || row["LOCATION"] || '—').toString().trim();
            if(code && name) {
              if(!inventoryItems.some(i => i.code === code)) {
                inventoryItems.push({ code, name, unit, store });
                added++;
              } else { skipped++; }
            }
          });
          syncStorage(); renderInventoryItems();
          alert(`تم الاستيراد: ${added} صنف جديد${skipped ? `، ${skipped} صنف مكرر تم تخطيه` : ''}.`);
          evt.target.value = '';
        } catch(err) { alert("تحديد بيانات الموظف المستلم،: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
    }

    function deleteInventoryItem(idx) { if (!requireAdmin()) return;
      if(confirm("اسم الصنف، بيانات والكمية")) {
        _logDeletion('inventoryItems', inventoryItems[idx].id || inventoryItems[idx].name);
        inventoryItems.splice(idx, 1);
        syncStorage(); renderInventoryItems();
      }
    }

    var _arcEditIdx = -1;
    var _arcTab = 'incoming';
    var _arcIssueIdx = -1;

    function cleanArc(s) { return String(s == null ? '' : s).replace(/['"<>]/g, ''); }
    function arcSetVal(id, val) { var el = document.getElementById(id); if (el) el.textContent = val == null ? '' : String(val); }
    function arcRemaining(a) { return Math.max(0, (parseInt(a.qty) || 0) - (parseInt(a.issuedQty) || 0)); }
    function arcIsIssued(a) { return (a.issuedate && a.issuedate.trim()) || (a.issueto && a.issueto.trim()); }
    function archiveStats() {
      var stores = _strArr(dynamicStores);
      var items = 0, qty = 0, avail = 0, outCount = 0, outQty = 0, lastIssue = '';
      archiveData.forEach(function(a) {
        if (!a) return;
        qty += parseInt(a.qty) || 0; items++;
        avail += arcRemaining(a);
        if (arcIsIssued(a)) { outCount++; outQty += parseInt(a.issuedQty) || 0; if ((a.issuedate||'') > lastIssue) lastIssue = a.issuedate; }
      });
      return { stores: stores.length, items: items, qty: qty, avail: avail, outCount: outCount, outQty: outQty, lastIssue: lastIssue };
    }
    function populateArchiveStoreDropdown() {
      var sel = document.getElementById('arc-location');
      if (!sel) return;
      var cur = sel.value;
      var opts = _strArr(dynamicStores).map(function(s) { return '<option value="' + cleanArc(s) + '">' + s + '</option>'; }).join('');
      sel.innerHTML = opts ? opts + '<option value="__add__">➕ مخزن جديد...</option>' : '<option value="">— لا توجد مخازن —</option><option value="__add__">➕ إضافة مخزن جديد...</option>';
      if (cur && cur !== '__add__') sel.value = cur;
    }
    function toggleStoreAddInput(show) {
      var inp = document.getElementById('arc-location-new');
      if (inp) inp.style.display = show ? 'block' : 'none';
    }
    function switchArchiveTab(tab) {
      _arcTab = tab;
      ['incoming','outgoing','stock','stores'].forEach(function(t) {
        var p = document.getElementById('arc-panel-' + t);
        if (p) p.style.display = t === tab ? 'block' : 'none';
        var b = document.getElementById('arc-tab-' + t);
        if (b) b.className = t === tab ? 'btn btn-primary' : 'btn';
      });
      if (tab === 'incoming') renderArchiveIncoming();
      if (tab === 'outgoing') renderArchiveOutgoing();
      if (tab === 'stock') renderArchiveStock();
      if (tab === 'stores') renderArchiveStores();
      populateArchiveStoreDropdown();
    }
    function renderArchiveIncoming() {
      var q = (document.getElementById('search-archive').value || '').toLowerCase();
      var filtered = archiveData.filter(function(a) { return !arcIsIssued(a); }).filter(function(a) { return !q || (a.item||'').toLowerCase().includes(q) || (a.desc||'').toLowerCase().includes(q) || (a.location||'').toLowerCase().includes(q); });
      var st = sortState['table-archive'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      var tbody = document.getElementById('archive-table-body');
      var sts = archiveStats();
      arcSetVal('arc-stat-incoming-items', sts.items);
      arcSetVal('arc-stat-incoming-qty', sts.qty);
      arcSetVal('arc-stat-stores-count', sts.stores);
      arcSetVal('arc-stat-available', sts.avail);
      if (!tbody) return;
      tbody.innerHTML = filtered.length ? filtered.map(function(a, i) {
        var idx = archiveData.indexOf(a);
        return '<tr><td>' + cleanArc(a.item) + '</td><td>' + cleanArc(a.desc) + '</td><td>' + (parseInt(a.qty)||0) + '</td><td>' + cleanArc(a.location) + '</td><td>' + cleanArc(a.condition) + '</td><td>' + cleanArc(a.date) + '</td><td class="no-print"><button class="btn btn-sm" style="background:#2e7d32;color:#fff;padding:2px 8px;font-size:11px;margin-left:4px;" onclick="openArchiveIssue(' + idx + ')">📤 صرف</button><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:2px 6px;font-size:11px;margin-left:4px;" onclick="editArchiveRecord(' + idx + ')">✏️</button><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteArchiveRecord(' + idx + ')">🗑️</button></td></tr>';
      }).join('') : '<tr><td colspan="7" style="text-align:center;color:#999;">لا توجد عهدات واردة</td></tr>';
    }
    function renderArchiveOutgoing() {
      var q = (document.getElementById('search-archive-out').value || '').toLowerCase();
      var filtered = archiveData.filter(function(a) { return arcIsIssued(a); }).filter(function(a) { return !q || (a.item||'').toLowerCase().includes(q) || (a.issueto||'').toLowerCase().includes(q) || (a.receiver||'').toLowerCase().includes(q) || (a.issueby||'').toLowerCase().includes(q); });
      var tbody = document.getElementById('archive-out-body');
      var sts = archiveStats();
      arcSetVal('arc-stat-outgoing-count', sts.outCount);
      arcSetVal('arc-stat-outgoing-qty', sts.outQty);
      arcSetVal('arc-stat-last-issue', sts.lastIssue || '—');
      if (!tbody) return;
      tbody.innerHTML = filtered.length ? filtered.sort(function(a,b){ return (b.issuedate||'').localeCompare(a.issuedate||''); }).map(function(a) {
        var idx = archiveData.indexOf(a);
        return '<tr><td>' + cleanArc(a.item) + '</td><td>' + (parseInt(a.issuedQty)||0) + '</td><td>' + cleanArc(a.location) + '</td><td>' + cleanArc(a.issueto) + '</td><td>' + cleanArc(a.issuedate) + '</td><td>' + cleanArc(a.issueby) + '</td><td>' + cleanArc(a.receiver) + '</td><td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteArchiveRecord(' + idx + ')" title="حذف">🗑️</button></td></tr>';
      }).join('') : '<tr><td colspan="8" style="text-align:center;color:#999;">لا توجد حركات صرف</td></tr>';
    }
    function renderArchiveStock() {
      var tbody = document.getElementById('archive-stock-body');
      var groups = {};
      archiveData.forEach(function(a) {
        if (!a) return;
        var k = (a.item||'').trim() + '|' + (a.location||'').trim();
        if (!groups[k]) groups[k] = { item: a.item, location: a.location, inQty: 0, outQty: 0 };
        groups[k].inQty += parseInt(a.qty) || 0;
        groups[k].outQty += parseInt(a.issuedQty) || 0;
      });
      var rows = Object.keys(groups).map(function(k) { return groups[k]; });
      var remTotal = 0, low = 0, empty = 0;
      rows.forEach(function(g) { g.rem = Math.max(0, g.inQty - g.outQty); remTotal += g.rem; if (g.rem <= 0) empty++; else if (g.rem <= 3) low++; });
      arcSetVal('arc-stat-stock-items', rows.length);
      arcSetVal('arc-stat-stock-remaining', remTotal);
      arcSetVal('arc-stat-stock-low', low);
      arcSetVal('arc-stat-stock-empty', empty);
      if (!tbody) return;
      tbody.innerHTML = rows.length ? rows.sort(function(a,b){ return (b.rem - a.rem) || (a.item||'').localeCompare(b.item||''); }).map(function(g) {
        var badge = g.rem <= 0 ? '<span style="color:#b71c1c;font-weight:700;">نافد</span>' : (g.rem <= 3 ? '<span style="color:#e65100;font-weight:700;">منخفض (باقي ' + g.rem + ')</span>' : '<span style="color:#1b5e20;font-weight:700;">متوفر</span>');
        return '<tr><td>' + cleanArc(g.item) + '</td><td>' + cleanArc(g.location) + '</td><td>' + g.inQty + '</td><td>' + g.outQty + '</td><td style="font-weight:700;">' + g.rem + '</td><td>' + badge + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;">لا توجد أصناف في المخازن</td></tr>';
    }
    function renderArchiveStores() {
      var tbody = document.getElementById('archive-stores-body');
      populateArchiveStoreDropdown();
      if (!tbody) return;
      var counts = {}, qtys = {};
      archiveData.forEach(function(a) {
        if (!a) return;
        var loc = (a.location || '').trim();
        if (!loc) return;
        counts[loc] = (counts[loc] || 0) + 1;
        qtys[loc] = (qtys[loc] || 0) + (parseInt(a.qty) || 0);
      });
      var stores = _strArr(dynamicStores);
      tbody.innerHTML = stores.length ? stores.map(function(s) {
        return '<tr><td>' + cleanArc(s) + '</td><td>' + (counts[s] || 0) + '</td><td>' + (qtys[s] || 0) + '</td><td class="no-print"><button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="deleteDynamicStore(\'' + cleanArc(s) + '\')">🗑️</button></td></tr>';
      }).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;">لا توجد مخازن — أضف مخزنك الأول من النموذج أعلاه</td></tr>';
    }
    function addDynamicStore() {
      var name = (document.getElementById('store-new-name').value || '').trim();
      if (!name) return alert('أدخل اسم المخزن');
      var cur = _strArr(dynamicStores);
      if (cur.indexOf(name) !== -1) return alert('هذا المخزن مسجل بالفعل');
      cur.push(name);
      dynamicStores = cur;
      syncStorage();
      logAction('إضافة', 'مخزن', name, 'إدارة المخازن');
      document.getElementById('store-new-name').value = '';
      renderArchiveStores();
      alert('تم إضافة المخزن بنجاح ✅');
    }
    function deleteDynamicStore(name) {
      if (!requireAdmin()) return;
      var used = archiveData.some(function(a) { return a && a.location === name; });
      if (used) return alert('لا يمكن حذف المخزن: توجد عهدات مسجلة فيه (حذف/نقل العهدات أولاً)');
      if (!confirm('حذف المخزن «' + name + '» نهائياً؟')) return;
      dynamicStores = _strArr(dynamicStores).filter(function(s) { return s !== name; });
      _logDeletion('dynamicStores', name);
      syncStorage();
      logAction('حذف', 'مخزن', name, 'إدارة المخازن');
      renderArchiveStores();
      populateArchiveStoreDropdown();
    }
    function openArchiveIssue(idx) {
      var a = archiveData[idx];
      if (!a) return;
      _arcIssueIdx = idx;
      document.getElementById('arc-issue-info').innerHTML = '📦 <b>' + cleanArc(a.item) + '</b> — المخزن: ' + cleanArc(a.location) + ' | المتاح للصرف: <b>' + arcRemaining(a) + '</b>';
      document.getElementById('arc-issue-qty').value = arcRemaining(a);
      document.getElementById('arc-issue-to').value = a.issueto || '';
      document.getElementById('arc-issue-by').value = a.issueby || '';
      document.getElementById('arc-issue-receiver').value = a.receiver || '';
      openModal('modal-archive-issue');
    }
    function submitArchiveIssue() {
      var a = archiveData[_arcIssueIdx];
      if (!a) return;
      var qty = parseInt(document.getElementById('arc-issue-qty').value) || 0;
      var to = document.getElementById('arc-issue-to').value.trim();
      var by = document.getElementById('arc-issue-by').value.trim();
      var rc = document.getElementById('arc-issue-receiver').value.trim();
      var rem = arcRemaining(a);
      if (qty <= 0 || qty > rem) return alert('كمية الصرف غير صحيحة (المتاح: ' + rem + ')');
      if (!to) return alert('أدخل جهة الصرف (المنصرف إليه)');
      a.issueto = to; a.issuedate = new Date().toISOString().split('T')[0]; a.issueby = by; a.receiver = rc;
      a.issuedQty = (parseInt(a.issuedQty) || 0) + qty;
      a.modifiedAt = new Date().toISOString();
      syncStorage();
      logAction('صرف', 'عهدة', a.item, 'كمية: ' + qty + ' | المخزن: ' + a.location + ' | الوجهة: ' + to);
      closeModal('modal-archive-issue');
      switchArchiveTab(_arcTab);
      alert('تم تسجيل الصرف بنجاح ✅');
    }
    function saveArchiveRecord() {
      var item = document.getElementById('arc-item').value.trim();
      var desc = document.getElementById('arc-desc').value.trim();
      var qty = parseInt(document.getElementById('arc-qty').value) || 1;
      var location = document.getElementById('arc-location').value;
      var condition = document.getElementById('arc-condition').value;
      var date = document.getElementById('arc-date').value || new Date().toISOString().split('T')[0];
      if (!item) return alert('الرجاء إدخال اسم العهدة (الصنف)');
      if (location === '__add__' || !location) {
        var newName = (document.getElementById('arc-location-new').value || '').trim();
        if (!newName) return alert('اختر المخزن أو اكتب اسم مخزن جديد');
        location = newName;
        var cur = _strArr(dynamicStores);
        if (cur.indexOf(location) === -1) { cur.push(location); dynamicStores = cur; }
      }
      if (_arcEditIdx >= 0) {
        var a = archiveData[_arcEditIdx];
        if (a) { a.item = item; a.desc = desc; a.qty = qty; a.location = location; a.condition = condition; a.date = date; a.modifiedAt = new Date().toISOString(); }
        _arcEditIdx = -1;
        syncStorage();
        logAction('تعديل', 'عهدة', item, 'تسجيل: ' + location);
      } else {
        archiveData.push({ id: 'arc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, modifiedAt: new Date().toISOString() });
        syncStorage();
        logAction('وارد', 'عهدة', item, 'كمية: ' + qty + ' | المخزن: ' + location + ' | الحالة: ' + condition);
      }
      document.getElementById('arc-item').value = ''; document.getElementById('arc-desc').value = ''; document.getElementById('arc-qty').value = '1'; document.getElementById('arc-location').value = ''; document.getElementById('arc-condition').value = 'جديدة'; document.getElementById('arc-date').value = ''; document.getElementById('arc-location-new').value = ''; toggleStoreAddInput(false);
      document.getElementById('btn-save-archive').textContent = '➕ تسجيل وارد جديد';
      populateArchiveStoreDropdown();
      switchArchiveTab(_arcTab);
    }
    function editArchiveRecord(idx) {
      var a = archiveData[idx];
      if (!a) return;
      if (arcIsIssued(a)) return alert('لا يمكن تعديل عهدة تم صرفها');
      _arcEditIdx = idx;
      document.getElementById('arc-item').value = a.item;
      document.getElementById('arc-desc').value = a.desc;
      document.getElementById('arc-qty').value = a.qty;
      populateArchiveStoreDropdown();
      document.getElementById('arc-location').value = a.location;
      if (!document.getElementById('arc-location').value) { document.getElementById('arc-location-new').value = a.location || ''; toggleStoreAddInput(true); }
      document.getElementById('arc-condition').value = a.condition;
      document.getElementById('arc-date').value = a.date;
      document.getElementById('btn-save-archive').textContent = '💾 حفظ التعديل';
      switchArchiveTab('incoming');
    }
    function deleteArchiveRecord(idx) {
      if (!requireAdmin()) return;
      var a = archiveData[idx];
      if (!a) return;
      if (!confirm('حذف سجل «' + a.item + '» نهائياً؟')) return;
      _logDeletion('archiveData', a.id || a.date + '|' + a.item + '|' + a.location);
      archiveData.splice(idx, 1);
      syncStorage();
      logAction('حذف', 'عهدة', a.item, 'المخزن: ' + a.location);
      switchArchiveTab(_arcTab);
    }
    function exportArchiveExcel() {
      if (!archiveData.length) return alert('لا توجد عهدات للتصدير');
      var rows = [['اسم العهدة','البيان','العدد','اسم المخزن','الحالة','تاريخ إضافة العهدة','جهة الصرف','تاريخ الصرف','القائم على الصرف','المستلم']];
      archiveData.forEach(function(a) { rows.push([a.item, a.desc, a.qty, a.location, a.condition, a.date, a.issueto||'', a.issuedate||'', a.issueby||'', a.receiver||'']); });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'أرشيف المخازن');
      XLSX.writeFile(wb, 'ارشيف_المخازن_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
    function importArchiveExcel(evt) {
      var file = evt.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (rows.length < 2) return alert('الملف لا يحتوي على بيانات كافية.\nتأكد من وجود صف رأس (header) وصفوف بيانات.');
          var replaceAll = confirm('هل تريد استبدال كل البيانات الموجودة بالكامل؟\nاختر OK للاستبدال الكامل، أو Cancel لإضافة وتحديث السجلات الموجودة فقط.');
          if (replaceAll) archiveData = [];
          var added = 0, updated = 0;
          for (var i = 1; i < rows.length; i++) {
            var cols = rows[i];
            if (!cols || cols.length < 4) continue;
            var item = (cols[0] || '').toString().trim();
            var desc = (cols[1] || '').toString().trim();
            var qty = parseInt(cols[2]) || 1;
            var location = (cols[3] || '').toString().trim();
            var condition = (cols[4] || 'جديدة').toString().trim();
            var date = '';
            if (cols[5] !== undefined && cols[5] !== null) {
              var dv = cols[5];
              if (typeof dv === 'number' && dv > 40000 && dv < 200000) {
                // Excel serial date
                var d = new Date((dv - 25569) * 86400 * 1000);
                date = d.toISOString().split('T')[0];
              } else {
                date = dv.toString().trim();
              }
            }
            var issueto = (cols[6] || '').toString().trim();
            var issuedate = '';
            if (cols[7] !== undefined && cols[7] !== null) {
              var idv = cols[7];
              if (typeof idv === 'number' && idv > 40000 && idv < 200000) {
                var d = new Date((idv - 25569) * 86400 * 1000);
                issuedate = d.toISOString().split('T')[0];
              } else {
                issuedate = idv.toString().trim();
              }
            }
            var issueby = (cols[8] || '').toString().trim();
            var receiver = (cols[9] || '').toString().trim();
            if (!item) continue;
            if (replaceAll) {
              archiveData.push({ id: 'arc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, issueto: issueto, issuedate: issuedate, issueby: issueby, receiver: receiver });
              added++;
            } else {
              var existing = archiveData.find(function(a) { return a.item === item && a.location === location; });
              if (existing) {
                existing.desc = desc; existing.qty = qty; existing.condition = condition; existing.date = date;
                existing.issueto = issueto; existing.issuedate = issuedate; existing.issueby = issueby; existing.receiver = receiver;
                updated++;
              } else {
                archiveData.push({ id: 'arc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, issueto: issueto, issuedate: issuedate, issueby: issueby, receiver: receiver });
                added++;
              }
            }
          }
          syncStorage();
          logAction('استيراد', 'أرشيف', added + ' إضافة', updated + ' تحديث');
          switchArchiveTab(_arcTab || 'incoming');
          alert('تم استيراد ' + (replaceAll ? archiveData.length : (added + updated)) + ' سجل بنجاح.\nإضافات: ' + added + ' | تحديثات: ' + updated);
        } catch(err) { alert('خطأ في استيراد بيانات الأرشيف: ' + err.message); }
        evt.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    }

    function setupItemNameSearch() {
      let inp = document.getElementById('inv-item-name');
      let hid = document.getElementById('inv-item-code');
      let sug = document.getElementById('inv-item-suggestions');
      if(!inp || !hid || !sug) return;
      let hideSuggestions = () => { setTimeout(() => { sug.style.display = 'none'; }, 200); };
      inp.addEventListener('input', function() {
        let q = this.value.trim().toLowerCase();
        sug.innerHTML = ''; sug.style.display = 'none';
        if(!q) { hid.value = ''; return; }
        let matches = inventoryItems.filter(i =>
          (i.code||'').toLowerCase().includes(q) ||
          (i.name||'').toLowerCase().includes(q) ||
          (i.store||'').toLowerCase().includes(q)
        ).slice(0, 10);
        if(!matches.length) return;
        sug.style.display = 'block';
        matches.forEach(item => {
          let d = document.createElement('div');
          d.innerText = `[${item.code}] ${item.name} — الاسم: ${item.store||'—'}`;
          d.onclick = () => {
            inp.value = item.name;
            hid.value = item.code;
            let unitSel = document.getElementById('inv-unit-select');
            if(unitSel && item.unit) unitSel.value = item.unit;
            sug.style.display = 'none';
          };
          sug.appendChild(d);
        });
      });
      inp.addEventListener('keydown', function(e) {
        if(e.key === 'Enter') {
          e.preventDefault();
          if(sug.style.display === 'block' && sug.firstChild) {
            sug.firstChild.click();
          }
        }
      });
      inp.addEventListener('blur', hideSuggestions);
    }

    function calcVacationDates(start, days) {
      days = parseInt(days) || 0;
      if (!start || days < 1) return null;
      var d = new Date(start + 'T00:00:00');
      var end = new Date(d);
      end.setDate(end.getDate() + days - 1);
      var travel = new Date(d);
      travel.setDate(travel.getDate() - 1);
      var lastWork = new Date(d);
      lastWork.setDate(lastWork.getDate() - 2);
      var ret = new Date(end);
      ret.setDate(ret.getDate() + 1);
      function fmt(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
      }
      return { end: fmt(end), travelDate: fmt(travel), lastWorkDay: fmt(lastWork), returnDate: fmt(ret) };
    }

    function previewVacationDates() {
      var start = document.getElementById('vacation-start-date').value;
      var days = parseInt(document.getElementById('vacation-days').value) || 0;
      var preview = document.getElementById('vacation-preview');
      if (!preview) return;
      var result = calcVacationDates(start, days);
      if (result) {
        preview.style.display = 'block';
        document.getElementById('preview-end').textContent = result.end;
        document.getElementById('preview-travel').textContent = result.travelDate;
        document.getElementById('preview-lastwork').textContent = result.lastWorkDay;
        document.getElementById('preview-return').textContent = result.returnDate;
      } else {
        preview.style.display = 'none';
      }
    }

    function updateEmployeeVacationStatuses() {
      // تم تعطيل التحويل التلقائي للحالة بين V وP بطلب المستخدم:
      // الحالة تتغير يدوياً فقط من زر التواجد/الإجازة في جدول القوة العاملة
      return;
    }

    function addVacationMovement() {
      var q = document.getElementById('vacation-emp-select').value.trim();
      var emp = findEmpByInput(q);
      var empId = emp ? (emp.id || emp.code) : '';
      let vtype = document.getElementById('vacation-type').value;
      let start = document.getElementById('vacation-start-date').value;
      let days = parseInt(document.getElementById('vacation-days').value) || 0;
      let notes = document.getElementById('vacation-notes').value.trim();

      if(!empId || !start || !days) return alert("الوحدة عدد المخزن الموقع تم الاستيراد صنف جديد!");

      if (!emp) return;

      let dates = calcVacationDates(start, days);
      if (!dates) return alert("لم يتم تحديد نطاق تاريخ صحيح");

      // تخطيه بيانات خطأ في
      if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
      if (days > emp.vacationBalance) {
        if (!confirm(`بيانات قراءة ${emp.name} الملف حذف ${emp.vacationBalance} الصنف من السجل؟ لا ${days} توجد.\nبيانات عهدات بيانات مسجلة أدخل`)) return;
      } else {
        emp.vacationBalance -= days;
      }

      let vRecord = {
        code: emp.code,
        name: emp.name,
        info: `${emp.title} / ${emp.dept}`,
        start,
        days,
        type: vtype,
        end: dates.end,
        travelDate: dates.travelDate,
        lastWorkDay: dates.lastWorkDay,
        returnDate: dates.returnDate,
        notes
      };

      vacations.push(_ts(vRecord)); syncStorage(); updateEmployeeVacationStatuses(); renderTable(); renderVacationsTable(); renderDashboard();
      document.getElementById('vacation-notes').value = '';
      document.getElementById('vacation-days').value = '';
      document.getElementById('vacation-start-date').value = '';
      document.getElementById('vacation-preview').style.display = 'none';
      alert(`تم تسجيل إجازة للفرد [${vRecord.name}] لمدة ${days} يوم`);
    }

    function renderVacationsTable() {
      let tbody = document.getElementById('vacations-table-body');
      if(!tbody) return; tbody.innerHTML = '';
      var currentYear = new Date().getFullYear();
      let q = document.getElementById('vacation-emp-search').value.toLowerCase();
      let filtered = [...vacations];
      filtered = filtered.filter(function(v) {
        var matchSearch = (v.name||'').toLowerCase().includes(q) || ((v.code||'').toLowerCase() === q);
        return matchSearch;
      });
      let st = sortState['table-vacations'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'start');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((v) => {
          var sd = new Date(v.start + 'T00:00:00');
          var ed = new Date(v.end + 'T00:00:00');
          v.days = Math.round((ed - sd) / 86400000) + 1;
        var empYear = parseInt(v.start ? v.start.substring(0, 4) : 0);
        var yearTotal = 0;
        if (empYear === currentYear) {
          vacations.forEach(function(v2) {
            if (v2.code === v.code) {
              var d2 = parseInt(v2.days);
              if (!d2 && v2.start && v2.end) {
                var s2 = new Date(v2.start + 'T00:00:00');
                var e2 = new Date(v2.end + 'T00:00:00');
                d2 = Math.round((e2 - s2) / 86400000) + 1;
              }
              yearTotal += d2 || 0;
            }
          });
        }
        let emp = employees.find(e => (e.code || e.id) === v.code);
        let empBalance = emp && typeof emp.vacationBalance === 'number' ? emp.vacationBalance : null;
        let realIdx = vacations.indexOf(v);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-vacations"></td>
          <td>${v.code || '—'}</td>
          <td><b>${v.name}</b></td>
          <td>${v.info || '—'}</td>
          <td>${v.start}</td>
          <td>${v.days}</td>
          <td>${v.end}</td>
          <td>${v.travelDate || calcVacationDates(v.start, v.days)?.travelDate || '—'}</td>
          <td>${v.lastWorkDay || calcVacationDates(v.start, v.days)?.lastWorkDay || '—'}</td>
          <td>${v.returnDate || calcVacationDates(v.start, v.days)?.returnDate || '—'}</td>
          <td><span style="font-weight:700;color:${v.type==='موقع'?'#1565c0':v.type==='إضافة'?'#e65100':'#2e7d32'};">${v.type || 'عهدة'}</span></td>
          <td style="font-weight:700;color:#1b5e20;">${yearTotal}</td>
          <td style="font-weight:700;color:${empBalance !== null && empBalance > 0 ? '#2e7d32' : '#c62828'};">${empBalance !== null ? empBalance + ' يوم' : '—'}</td>
          <td>${v.notes || '—'}</td>
          <td class="no-print" style="display:flex;gap:4px;">
            <button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editVacation(${realIdx})">✏️</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteVacation(${realIdx})">حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteVacation(idx) { if (!requireAdmin()) return;
      if(confirm("حالة جديدة بيانات إضافة")) {
        var oldRec = vacations[idx];
        var empCode = oldRec?.code;
        _logDeletion('vacations', (oldRec?.code || oldRec?.employeeCode || oldRec?.employeeName || oldRec?.name || empCode || '') + '|' + (oldRec?.start || oldRec?.startDate || oldRec?.dateFrom || '') + '|' + (oldRec?.end || oldRec?.endDate || oldRec?.dateTo || ''));
        // عهدة حفظ تعديل
        if (oldRec) {
          var emp = employees.find(function(e) { return (e.code || e.id) === empCode; });
          if (emp && oldRec.days) {
            if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
            emp.vacationBalance += oldRec.days;
          }
        }
        var v = vacations[idx]; vacations.splice(idx, 1); syncStorage(); renderVacationsTable(); if(v) logAction('delete','حذف', v.name, v.code ? 'عهدة: ' + v.code : '');
        if (empCode) {
          // تم تعطيل إرجاع الحالة تلقائياً إلى P عند حذف الإجازة (بدون تحويل V إلى P)
          renderTable(); renderDashboard();
        }
      }
    }

    function editVacation(idx) {
      var v = vacations[idx];
      if (!v) return;
      if (!canEditRecord(v.start || v.date)) { alert('لا يمكن تعديل سجل إجازة قديم'); return; }
      var emp = employees.find(function(e) { return (e.code || e.id) === v.code; });
      // اسم العهدة
      document.getElementById('vacation-emp-select').value = v.code;
      document.getElementById('vacation-type').value = v.type || 'البيان';
      document.getElementById('vacation-start-date').value = v.start;
      document.getElementById('vacation-days').value = v.days;
      document.getElementById('vacation-notes').value = v.notes || '';
      if (emp) {
          document.getElementById('vacation-balance-display').innerText = typeof emp.vacationBalance === 'number' ? 'رصيد الإجازة: ' + emp.vacationBalance + ' يوم' : '';
      }
      previewVacationDates();
      // تعيين ID التعديل
      document.getElementById('vacation-edit-id').value = idx;
      document.querySelector('#tab-vacations .btn-primary').innerText = '💾 حفظ التعديل';
      document.querySelector('#tab-vacations .btn-primary').onclick = function() { saveVacationEdit(idx); };
    }

    function saveVacationEdit(idx) {
      var v = vacations[idx];
      if (!v) return;
      var empId = document.getElementById('vacation-emp-select').value;
      var vtype = document.getElementById('vacation-type').value;
      var start = document.getElementById('vacation-start-date').value;
      var days = parseInt(document.getElementById('vacation-days').value) || 0;
      var notes = document.getElementById('vacation-notes').value.trim();
      if (!empId || !start || !days) return alert("الرجاء إدخال بيانات الإجازة كاملة");
      var dates = calcVacationDates(start, days);
      if (!dates) return alert("خطأ في حساب تواريخ الإجازة");
      var oldDays = v.days;
      // تحديث تم الاستيراد جديد، تحديث
      var emp = employees.find(function(e) { return (e.code || e.id) === v.code; });
      if (emp) {
        if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
        emp.vacationBalance += oldDays; // خطأ في قراءة
        if (days > emp.vacationBalance) {
          if (!confirm('بيانات الملف ' + emp.name + ' مخزن يجب ' + emp.vacationBalance + ' اختيار الفرد وتاريخ بداية ' + days + ' الإجازة.\nبيانات وعدد بيانات الأيام في')) {
            emp.vacationBalance -= oldDays; // خطأ
            return;
          }
        } else {
          emp.vacationBalance -= days;
        }
      }
      v.type = vtype;
      v.start = start;
      v.days = days;
      v.end = dates.end;
      v.travelDate = dates.travelDate;
      v.lastWorkDay = dates.lastWorkDay;
      v.returnDate = dates.returnDate;
      v.notes = notes;
      _ts(v);
      syncStorage(); renderVacationsTable(); updateEmployeeVacationStatuses(); renderTable(); renderDashboard();
      // حساب تواريخ الإجازة
      document.getElementById('vacation-notes').value = '';
      document.getElementById('vacation-days').value = '';
      document.getElementById('vacation-start-date').value = '';
      document.getElementById('vacation-preview').style.display = 'none';
      document.getElementById('vacation-emp-select').value = '';
      document.getElementById('vacation-balance-display').innerText = '';
      document.getElementById('vacation-edit-id').value = '';
      document.querySelector('#tab-vacations .btn-primary').innerText = '💾 تسجيل الإجازة';
      document.querySelector('#tab-vacations .btn-primary').onclick = function() { addVacationMovement(); };
      alert('تم حفظ بيانات الإجازة بنجاح');
    }

    function addHospitalityRecord() {
      let name = document.getElementById('hosp-name').value.trim();
      let type = document.getElementById('hosp-type').value;
      let title = document.getElementById('hosp-title').value.trim();
      let arrival = document.getElementById('hosp-arrival').value;
      let departure = document.getElementById('hosp-departure').value;
      let guests = parseInt(document.getElementById('hosp-guests').value) || 1;
      let editId = document.getElementById('hosp-edit-id').value;

      if(!name || !arrival) return alert("الرجاء إدخال اسم الزائر وتاريخ الوصول.");

      let meals = [];
      if(document.getElementById('hosp-meal-bf').checked) meals.push("إفطار");
      if(document.getElementById('hosp-meal-lh').checked) meals.push("غداء");
      if(document.getElementById('hosp-meal-dn').checked) meals.push("عشاء");

      if (editId) {
        let idx = hospitalities.findIndex(h => h._id == editId || (typeof h._id === 'undefined' && h.name === name && h.arrival === arrival));
        if (idx === -1) idx = hospitalities.findIndex(h => h.name === name && h.arrival === arrival);
        if (idx !== -1) {
          hospitalities[idx] = { _id: editId, name, type, title, arrival, departure, guests, meals: meals.slice() };
        }
        document.getElementById('hosp-edit-id').value = '';
        document.getElementById('hosp-save-btn').innerHTML = '🛎️ تسجيل وإعتماد الزيارة';
        document.getElementById('hosp-save-btn').onclick = function() { addHospitalityRecord(); };
      } else {
        var dupHosp = hospitalities.find(function(h) { return h.name === name && h.arrival === arrival; });
        if (dupHosp) return alert('يوجد تسجيل ضيافة لهذا الشخص في تاريخ قريب من (' + name + ' - ' + arrival + ').');
        hospitalities.push(_ts({ _id: Date.now().toString(), name, type, title, arrival, departure, guests, meals: meals.slice() }));
      }
      updateMealLogFromHospitality(arrival);
      autoLogTodayMeals(); syncStorage(); renderHospitalityTable(); renderMealLogTable();
        logAction(editId ? 'تعديل' : 'إضافة', 'ضيافة', name, 'الوصول: ' + arrival + ' | المغادرة: ' + guests);
      document.getElementById('hosp-name').value = ''; document.getElementById('hosp-title').value = '';
      alert("تم تسجيل الزيارة وإضافة الوجبات إلى سجل الوجبات.");
    }

    function editHospitality(idx) {
      let h = hospitalities[idx];
      if (!h) return;
      let id = h._id || Date.now().toString();
      document.getElementById('hosp-edit-id').value = id;
      document.getElementById('hosp-name').value = h.name;
      document.getElementById('hosp-type').value = h.type;
      document.getElementById('hosp-title').value = h.title || '';
      document.getElementById('hosp-arrival').value = h.arrival;
      document.getElementById('hosp-departure').value = h.departure || '';
      document.getElementById('hosp-guests').value = h.guests || 1;
      document.getElementById('hosp-meal-bf').checked = (h.meals || []).includes('إفطار');
      document.getElementById('hosp-meal-lh').checked = (h.meals || []).includes('غداء');
      document.getElementById('hosp-meal-dn').checked = (h.meals || []).includes('عشاء');
      document.getElementById('hosp-save-btn').innerHTML = '💾 حفظ التعديلات';
      document.getElementById('hosp-save-btn').onclick = function() { addHospitalityRecord(); };
      document.getElementById('hosp-name').focus();
    }

    function updateMealLogFromHospitality(dateStr) {
      if (!dateStr) return;
      var s = getTodayMealStats(dateStr);
      var existing = mealLogs.find(function(l) { return normalizeDateStr(l.date) === dateStr; });
      if (existing) {
        existing.guestBf = s.gBf;
        existing.guestLh = s.gLh;
        existing.guestDn = s.gDn;
        syncStorage();
      }
    }

    function renderHospitalityTable() {
      let tbody = document.getElementById('hospitality-table-body');
      if(!tbody) return; tbody.innerHTML = '';
      let filtered = [...hospitalities];
      let st = sortState['table-hospitality'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'arrival');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((h) => {
        let realIdx = hospitalities.indexOf(h);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-hospitality" data-index="${realIdx}"></td>
          <td><b>${h.name}</b></td>
          <td>${h.type}</td>
          <td>${h.title || '—'}</td>
          <td>${h.arrival}</td>
          <td>${h.departure || '—'}</td>
          <td style="text-align:center;font-weight:700;">${h.guests || 1}</td>
          <td style="text-align:center;">${(function(){ var mealLabels = []; var _ml = h.meals; if (_ml && typeof _ml === 'object' && typeof _ml.length === 'number') { for (var _i = 0; _i < _ml.length; _i++) { var _m = _ml[_i]; if (_m === 'إفطار' || _m === 'مأمورية') mealLabels.push('إفطار'); else if (_m === 'غداء' || _m === 'امتداد') mealLabels.push('غداء'); else if (_m === 'عشاء' || _m === 'اعتيادية') mealLabels.push('عشاء'); else mealLabels.push(_m); } } if (!mealLabels.length) return '<span style="color:#999;font-size:11px;">—</span>'; var _html = ''; for (var _j = 0; _j < mealLabels.length; _j++) { _html += '<span style="display:inline-block;background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin:1px;">' + mealLabels[_j] + '</span>'; } return _html; })()}</td>
          <td class="no-print" style="white-space:nowrap;">
            <button class="btn btn-secondary" style="padding:2px 6px; font-size:11px;" onclick="editHospitality(${realIdx})">📝</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteHospitality(${realIdx})">حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteHospitality(idx) { if (!requireAdmin()) return;
      var rec = hospitalities[idx];
      _logDeletion('hospitalities', (rec.name || '') + '|' + (rec.arrival || '') + '|' + (rec.type || ''));
      hospitalities.splice(idx, 1);
      if (rec && rec.arrival) updateMealLogFromHospitality(rec.arrival);
      syncStorage(); renderHospitalityTable(); renderMealLogTable();
    }

    function scanAndShowDuplicates(panelId) {
      var container = document.getElementById(panelId || 'duplicates-panel');
      if (!container) return;
      var html = '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:15px;margin:10px 0;">';
      html += '<h3 style="color:#856404;margin:0 0 10px;">🔍 فحص البيانات المكررة</h3>';
      var found = false;

      // 1. الأيام السابقة
      var hospDups = [];
      var hospSeen = {};
      hospitalities.forEach(function(h, i) {
        var key = h.name + '|' + h.arrival;
        if (hospSeen[key] !== undefined) {
          hospDups.push({ idx: i, rec: h, origIdx: hospSeen[key] });
        } else {
          hospSeen[key] = i;
        }
      });
      if (hospDups.length > 0) {
        found = true;
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">📋 ضيافة متكرر (' + hospDups.length + '):</strong>';
        hospDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
            html += '<span style="font-size:13px;">' + d.rec.name + ' | الوصول: ' + d.rec.arrival + (d.rec.title ? ' | ' + d.rec.title : '') + '</span>';
          html += '<button onclick="deleteDupHospitality(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">حذف التكرار</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      // 2. المتبقي يوم تخزين
      var prodDups = [];
      var prodSeen = {};
      bakeryProductions.forEach(function(p, i) {
        var key = normalizeDateStr(p.date);
        if (prodSeen[key] !== undefined) {
          prodDups.push({ idx: i, rec: p, origIdx: prodSeen[key] });
        } else {
          prodSeen[key] = i;
        }
      });
      if (prodDups.length > 0) {
        found = true;
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">🍞 إنتاج متكرر (' + prodDups.length + '):</strong>';
        prodDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
          html += '<span style="font-size:13px;">📅 ' + normalizeDateStr(d.rec.date) + ' | خبز: ' + (d.rec.breadCount || 0) + '</span>';
          html += '<button onclick="deleteDupProduction(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">حذف التكرار</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      // 3. وتاريخ بداية الإجازة
      var ctrDups = [];
      var ctrSeen = {};
      bakeryContractorSupplies.forEach(function(s, i) {
        var key = s.name + '|' + normalizeDateStr(s.date);
        if (ctrSeen[key] !== undefined) {
          ctrDups.push({ idx: i, rec: s, origIdx: ctrSeen[key] });
        } else {
          ctrSeen[key] = i;
        }
      });
      if (ctrDups.length > 0) {
        found = true;
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">📦 توريد مقاولين متكرر (' + ctrDups.length + '):</strong>';
        ctrDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
          html += '<span style="font-size:13px;">' + d.rec.name + ' | ' + normalizeDateStr(d.rec.date) + ' | كمية: ' + (d.rec.count || 0) + '</span>';
          html += '<button onclick="deleteDupContractor(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">حذف التكرار</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      // 4. الشاي والسكر
      var tsDups = [];
      var tsSeen = {};
      teaSugarDisbursements.forEach(function(t, i) {
        var key = (t.empCode||t.empId||'') + '|' + t.period + '|' + _tsMonthKey(t.date);
        if (tsSeen[key] !== undefined) {
          tsDups.push({ idx: i, rec: t, origIdx: tsSeen[key] });
        } else {
          tsSeen[key] = i;
        }
      });
      if (tsDups.length > 0) {
        found = true;
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">🍵 شاي وسكر متكرر (' + tsDups.length + '):</strong>';
        tsDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
          html += '<span style="font-size:13px;">🍵 ' + (d.rec.empName||'') + ' | ' + d.rec.period + ' | ' + d.rec.date + '</span>';
          html += '<button onclick="deleteDupTeaSugar(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">حذف التكرار</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      if (!found) {
        html += '<div style="background:#e8f5e9;padding:12px;border-radius:6px;color:#2e7d32;font-weight:600;text-align:center;">✅ لا توجد بيانات مكررة</div>';
      } else {
        html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
        html += '<button onclick="deleteAllDuplicates()" style="padding:6px 16px;background:#c62828;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">حذف كافة التكرارات</button>';
        html += '<button onclick="document.getElementById(\'' + (panelId || 'duplicates-panel') + '\').innerHTML=\'\'" style="padding:6px 16px;background:#757575;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">إغلاق</button>';
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;
    }

    function deleteDupHospitality(idx) {
      if (!requireAdmin()) return;
      var rec = hospitalities[idx];
      if (!rec) return;
      _logDeletion('hospitalities', (rec.name || '') + '|' + (rec.arrival || '') + '|' + (rec.type || ''));
      hospitalities.splice(idx, 1);
      if (rec && rec.arrival) updateMealLogFromHospitality(rec.arrival);
      syncStorage(); renderHospitalityTable(); renderMealLogTable();
      scanAndShowDuplicates();
    }

    function deleteDupProduction(idx) {
      if (!requireAdmin()) return;
      var target = bakeryProductions[idx];
      if (!target) { alert('الرجاء اختيار سجل صحيح للتعديل.'); return; }
      if (!confirm('والإجازة المطلوبة ' + target.date + ' | ' + (target.breadCount||0) + ' يوم')) return;
      _logDeletion('bakeryProductions', normalizeDateStr(target.date) + '|' + (target.breadCount || ''));
      bakeryProductions.splice(idx, 1);
      syncStorage(); renderBakeryProductions(); updateBakeryProductionIngredientStocks();
      scanAndShowDuplicates();
    }

    function deleteDupContractor(idx) {
      if (!requireAdmin()) return;
      var rec = bakeryContractorSupplies[idx];
      if (!rec) return;
      _logDeletion('bakeryContractorSupplies', (rec.name || '') + '|' + normalizeDateStr(rec.date) + '|' + (rec.count || ''));
      bakeryContractorSupplies.splice(idx, 1);
      syncStorage(); renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
      scanAndShowDuplicates();
    }

    function deleteDupTeaSugar(idx) {
      if (!requireAdmin()) return;
      var rec = teaSugarDisbursements[idx];
      if (!rec) return;
      _logDeletion('teaSugarDisbursements', (rec.date||'') + '|' + (rec.period||rec.type||'') + '|' + (rec.empCode||rec.empId||'') + '|' + (rec.teaPacks||rec.quantity||'') + '|' + (rec.sugarKg||''));
      teaSugarDisbursements.splice(idx, 1);
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
      scanAndShowDuplicates();
    }

    function deleteAllDuplicates() {
      if (!requireAdmin()) return;
      if (!confirm('هل أنت متأكد من حذف جميع البيانات المكررة؟')) return;

      // إعادة تعيين الفورم
      var hospSeen = {};
      for (var i = hospitalities.length - 1; i >= 0; i--) {
        var key = hospitalities[i].name + '|' + hospitalities[i].arrival;
        if (hospSeen[key]) { hospitalities.splice(i, 1); } else { hospSeen[key] = true; }
      }

      // تسجيل الإجازة تم
      var prodSeen = {};
      for (var i = bakeryProductions.length - 1; i >= 0; i--) {
        var key = normalizeDateStr(bakeryProductions[i].date);
        if (prodSeen[key]) { bakeryProductions.splice(i, 1); } else { prodSeen[key] = true; }
      }

      // تعديل الإجازة بنجاح اسم
      var ctrSeen = {};
      for (var i = bakeryContractorSupplies.length - 1; i >= 0; i--) {
        var key = bakeryContractorSupplies[i].name + '|' + normalizeDateStr(bakeryContractorSupplies[i].date);
        if (ctrSeen[key]) { bakeryContractorSupplies.splice(i, 1); } else { ctrSeen[key] = true; }
      }

      // الشاي والسكر
      var tsSeen = {};
      for (var i = teaSugarDisbursements.length - 1; i >= 0; i--) {
        var key = (teaSugarDisbursements[i].empCode||teaSugarDisbursements[i].empId||'') + '|' + teaSugarDisbursements[i].period + '|' + _tsMonthKey(teaSugarDisbursements[i].date);
        if (tsSeen[key]) { teaSugarDisbursements.splice(i, 1); } else { tsSeen[key] = true; }
      }

      syncStorage(); renderHospitalityTable(); renderMealLogTable();
      renderBakeryProductions(); updateBakeryProductionIngredientStocks();
      renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
      renderTeaSugarTable(); renderTeaSugarBatchSummary();
      scanAndShowDuplicates();
      alert('تم حفظ البيانات بنجاح ✅');
    }

    async function addMaintenanceRecord() {
      let category = document.getElementById('maint-category').value;
      let task = document.getElementById('maint-task').value.trim();
      let tech = document.getElementById('maint-tech').value.trim();
      let fBefore = document.getElementById('maint-img-before').files[0];
      let fAfter = document.getElementById('maint-img-after').files[0];
      let materials = maintMaterials;
      let status = document.getElementById('maint-status').value;
      let notes = document.getElementById('maint-notes').value.trim();

      if(!category) { document.getElementById('maint-category').focus(); return alert("⚠️ اختر نوع الصيانة"); }
      if(!task) { document.getElementById('maint-task').focus(); return alert("⚠️ أدخل وصف العطل/التفاصيل"); }
      if(!tech) { document.getElementById('maint-tech').focus(); return alert("⚠️ أدخل اسم الفني المسؤول"); }

      let record = { category, task, tech, status, notes, materials: materials.length ? [...materials] : [], imgBefore: '', imgAfter: '', date: new Date().toISOString().split('T')[0] };

      let proceedSave = () => {
        if (_editingMaintIdx >= 0) {
          maintenanceRecords[_editingMaintIdx] = _ts(Object.assign(maintenanceRecords[_editingMaintIdx], record));
          _editingMaintIdx = -1;
        } else {
          maintenanceRecords.push(_ts(record));
        }
        syncStorage(); renderMaintenanceTable();
        cancelEditMaint();
        alert('✅ تم تسجيل مهمة الصيانة');
      };

      try {
        if(fBefore) {
          var result = await uploadImageToDrive(fBefore);
          record.imgBefore = result || '';
        }
        if(fAfter) {
          var result2 = await uploadImageToDrive(fAfter);
          record.imgAfter = result2 || '';
        }
      } catch(e) {}
      proceedSave();
    }

    function renderMaintenanceTable() {
      let tbody = document.getElementById('maintenance-table-body');
      if(!tbody) return; tbody.innerHTML = '';
      let filtered = [...maintenanceRecords];
      let st = sortState['table-maintenance'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      else if (st.key === 'date') filtered = sortData(filtered, 'date', 'desc');
      else filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((m) => {
        let realIdx = maintenanceRecords.indexOf(m);
        let statusColors = {'مفتوحة':'#e53935','تحت التنفيذ':'#fb8c00','تمت':'#2e7d32','ملغاة':'#757575'};
        let statusIcons = {'مفتوحة':'🔴','تحت التنفيذ':'🟡','تمت':'✅','ملغاة':'❌'};
        let stColor = statusColors[m.status] || '#333';
        let stIcon = statusIcons[m.status] || '📋';
        let matsHtml = (m.materials && m.materials.length) ? m.materials.map(mat =>
          `<span style="display:inline-block;background:#e3f2fd;padding:1px 5px;margin:1px;border-radius:3px;font-size:11px;border:1px solid #90caf9;">${mat.name} — ${mat.qty}</span>`
        ).join(' ') : '—';
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-maintenance"></td>
          <td><span style="background:#fff3e0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#e65100;">${m.category || '—'}</span></td>
          <td><b>${m.task}</b></td>
          <td>👤 ${m.tech || '—'}</td>
          <td><span style="color:${stColor};font-weight:bold;font-size:12px;">${stIcon} ${m.status||'—'}</span></td>
          <td style="font-size:11px;">${matsHtml}</td>
          <td style="font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(m.notes||'').replace(/"/g,'&quot;')}">${m.notes || '—'}</td>
          <td>${m.imgBefore?`<img src="${m.imgBefore}" class="img-preview" onclick="viewFullImage('${m.imgBefore}')">`:'—'}</td>
          <td>${m.imgAfter?`<img src="${m.imgAfter}" class="img-preview" onclick="viewFullImage('${m.imgAfter}')">`:'—'}</td>
          <td>${m.date ? (m.date.match(/^\d{4}-/) ? m.date.split('-').reverse().join('/') : m.date) : '—'}</td>
          <td class="no-print" style="display:flex;gap:4px;"><button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editMaint(${realIdx})">✏️</button><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteMaint(${realIdx})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteMaint(idx) { if (!requireAdmin()) return; if(!confirm('حذف مهمة الصيانة؟')) return; var rec = maintenanceRecords[idx]; _logDeletion('maintenanceRecords', (rec.category||'') + '|' + (rec.task||'') + '|' + (rec.date||rec.createdAt||'')); maintenanceRecords.splice(idx,1); syncStorage(); renderMaintenanceTable(); }
    function editMaint(idx) {
      let rec = maintenanceRecords[idx];
      if (!rec) return;
      if (!canEditRecord(rec.date)) { alert('⚠️ لا يمكن تعديل سجل قديم'); return; }
      _editingMaintIdx = idx;
      document.getElementById('maint-category').value = rec.category || '';
      document.getElementById('maint-task').value = rec.task || '';
      document.getElementById('maint-tech').value = rec.tech || '';
      document.getElementById('maint-status').value = rec.status || 'مفتوحة';
      document.getElementById('maint-notes').value = rec.notes || '';
      maintMaterials = (rec.materials && rec.materials.length) ? rec.materials.map(function(m) { return {name:m.name, qty:m.qty}; }) : [];
      renderMaintMaterialsList();
      document.getElementById('btn-save-maint').textContent = '💾 حفظ التعديل';
      document.getElementById('btn-cancel-maint').style.display = 'inline-block';
      document.getElementById('maint-task').focus();
      window.scrollTo({ top: document.getElementById('tab-maintenance').offsetTop - 80, behavior: 'smooth' });
    }
    function viewFullImage(src) {
      if (src && src.startsWith('http')) { window.open(src, '_blank'); return; }
      let w = window.open(); w.document.write(`<img src="${src}" style="max-width:100%; max-height:100vh; display:block; margin:auto;">`);
    }

    let maintMaterials = [];
    let maintSelectedCode = '';
    let _editingMaintIdx = -1;
    function cancelEditMaint() {
      _editingMaintIdx = -1;
      document.getElementById('btn-save-maint').textContent = '💾 تسجيل';
      document.getElementById('btn-cancel-maint').style.display = 'none';
      document.getElementById('maint-category').value = '';
      document.getElementById('maint-task').value = '';
      document.getElementById('maint-tech').value = '';
      document.getElementById('maint-status').value = 'مفتوحة';
      document.getElementById('maint-notes').value = '';
      document.getElementById('maint-img-before').value = '';
      document.getElementById('maint-img-after').value = '';
      document.getElementById('maint-material-search').value = '';
      maintMaterials = [];
      renderMaintMaterialsList();
    }
    function searchMaintMaterial() {
      let q = document.getElementById('maint-material-search').value.trim();
      let resultsEl = document.getElementById('maint-material-results');
      let btnAdd = document.getElementById('btn-add-maint-mat');
      if (!q) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; btnAdd.style.display = 'none'; maintSelectedCode = ''; return; }
      let matches = inventoryItems.filter(i => (i.code||'').includes(q) || (i.name||'').includes(q));
      if (!matches.length) { resultsEl.style.display = 'block'; resultsEl.innerHTML = '<div style="padding:8px;color:#999;font-size:12px;">لا توجد نتائج</div>'; btnAdd.style.display = 'none'; maintSelectedCode = ''; return; }
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = matches.map((m,i) =>
        `<div class="maint-mat-result" data-code="${m.code}" style="padding:6px 8px;cursor:pointer;border-bottom:1px solid #eee;font-size:12px;display:flex;justify-content:space-between;align-items:center;${i === 0 ? 'background:#e3f2fd;' : ''}"
              onclick="selectMaintMatResult('${m.code}')">
          <span><b>${m.code}</b> — ${m.name} <span style="color:#666;">(${m.unit||'—'})</span></span>
          <span class="maint-mat-add" style="color:#1565c0;font-weight:bold;font-size:11px;">? إغلاق</span>
        </div>`
      ).join('');
      // auto-select first
      selectMaintMatResult(matches[0].code);
    }
    function selectMaintMatResult(code) {
      maintSelectedCode = code;
      document.getElementById('btn-add-maint-mat').style.display = 'inline-block';
      document.querySelectorAll('.maint-mat-result').forEach(el => {
        el.style.background = el.dataset.code === code ? '#e3f2fd' : '';
      });
    }
    function addMaintMaterial() {
      let code = maintSelectedCode;
      let qty = parseInt(document.getElementById('maint-material-qty').value) || 1;
      if(!code) return alert("الرجاء اختيار كود الصنف");
      let item = inventoryItems.find(i => i.code === code);
      if(!item) return alert("لم يتم العثور على الصنف");
      let existing = maintMaterials.find(m => m.code === code);
      if(existing) { existing.qty += qty; }
      else { maintMaterials.push({ code: code, name: item.name, unit: item.unit || '', qty }); }
      renderMaintMaterialsList();
      document.getElementById('maint-material-qty').value = 1;
      document.getElementById('maint-material-search').value = '';
      document.getElementById('maint-material-results').style.display = 'none';
      document.getElementById('maint-material-results').innerHTML = '';
      document.getElementById('btn-add-maint-mat').style.display = 'none';
      maintSelectedCode = '';
      document.getElementById('maint-material-search').focus();
    }
    function removeMaintMaterial(idx) { maintMaterials.splice(idx,1); renderMaintMaterialsList(); }
    function renderMaintMaterialsList() {
      let el = document.getElementById('maint-materials-list');
      if(!el) return;
      if(!maintMaterials.length) { el.innerHTML = '<span style="color:#999;font-size:12px;">لم يتم إضافة أي خامات أو أدوات بعد</span>'; return; }
      el.innerHTML = maintMaterials.map((m,i) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:#e3f2fd;padding:3px 8px;border-radius:6px;border:1px solid #90caf9;font-size:12px;">
          <b>${m.name}</b> —${m.qty} ${m.unit}
          <span style="cursor:pointer;color:red;font-weight:bold;margin-right:4px;" onclick="removeMaintMaterial(${i})">✕</span>
        </span>`
      ).join('');
    }

    // --- إنتاج مكرر ---
    
    function addPeriodicMaintenance() {
      let name = document.getElementById('pm-name').value.trim();
      let freq = document.getElementById('pm-freq').value;
      let startDate = document.getElementById('pm-start').value;
      let lastDone = document.getElementById('pm-last-done').value;
      if(!name || !freq || !startDate) return alert('يرجى أكمال جميع الحقول المطلوبة (الاسم - التكرار - تاريخ البداية)');

      let nextDue = new Date(lastDone || startDate);
      switch(freq) {
        case 'شهري': nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'أسبوعي': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'سنوي': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        case 'ربع سنوي': nextDue.setMonth(nextDue.getMonth() + 3); break;
        case 'نصف سنوي': nextDue.setMonth(nextDue.getMonth() + 6); break;
      }

      periodicMaintenance.push({
        id: 'pm_' + Date.now(), name, freq, startDate,
        lastDone: lastDone || startDate,
        nextDue: nextDue.toISOString().split('T')[0],
        status: 'active'
      });
      syncStorage(); renderPeriodicMaintenance();
      logAction('إضافة', 'مهمة دورية', name, 'النوع: ' + freq + ' | البداية: ' + startDate);
      document.getElementById('pm-last-done').value = '';
      alert('تم إضافة مهمة دورية جديدة');
    }
  
    function renderPeriodicMaintenance() {
      let tbody = document.getElementById('pm-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      let now = new Date();
      let active = 0, overdue = 0;
      periodicMaintenance.forEach(pm => {
        if(pm.status === 'active') active++;
        if(pm.status === 'active' && new Date(pm.nextDue) < now) overdue++;
      });
      let filtered = [...periodicMaintenance];
      let st = sortState['table-periodic-maint'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'startDate');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((pm) => {
        let realIdx = periodicMaintenance.indexOf(pm);
        let isOverdue = pm.status === 'active' && new Date(pm.nextDue) < now;
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-periodic-maint"></td>
          <td><b>${pm.name}</b></td>
          <td><span style="background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:4px;font-weight:600;">${pm.freq}</span></td>
          <td>${pm.startDate}</td>
          <td>${pm.lastDone || '—'}</td>
          <td style="${isOverdue ? 'color:var(--danger);font-weight:700;' : 'color:var(--primary);font-weight:600;'}">${pm.nextDue} ${isOverdue ? 'متأخرة' : ''}</td>
          <td><span class="status-badge ${pm.status === 'active' ? 'status-p' : ''}" style="${pm.status === 'inactive' ? 'background:#ffebee;color:#b71c1c;' : ''}">${pm.status === 'active' ? 'نشط' : 'متوقف'}</span></td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="markPMDone(${realIdx})">تم</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deletePM(${realIdx})">حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      document.getElementById('stat-pm-active').innerText = active;
      document.getElementById('stat-pm-overdue').innerText = overdue;
    }

    function markPMDone(idx) {
      let pm = periodicMaintenance[idx];
      if(!pm) return;
      let today = new Date().toISOString().split('T')[0];
      pm.lastDone = today;
      let nextDue = new Date(today);
      switch(pm.freq) {
        case 'حفظ': nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'طلب': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'الصيانة': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        case 'بنجاح مفتوحة': nextDue.setMonth(nextDue.getMonth() + 3); break;
        case 'تحت التنفيذ': nextDue.setMonth(nextDue.getMonth() + 6); break;
      }
      pm.nextDue = nextDue.toISOString().split('T')[0];
      syncStorage(); renderPeriodicMaintenance();
    }

    function deletePM(idx) { if (!requireAdmin()) return;
      if(confirm("تمت ملغاة مفتوحة تحت")) {
        _logDeletion('periodicMaintenance', (periodicMaintenance[idx].name||periodicMaintenance[idx].task||'') + '|' + (periodicMaintenance[idx].id||'') + '|' + (periodicMaintenance[idx].freq||periodicMaintenance[idx].frequency||''));
        periodicMaintenance.splice(idx, 1);
        syncStorage(); renderPeriodicMaintenance();
      }
    }

    // ====== Water Stations ======
    function addWaterRecord() {
      var station = document.getElementById('ws-name').value;
      var type = document.getElementById('ws-type').value;
      var date = document.getElementById('ws-date').value;
      var nextDate = document.getElementById('ws-next').value;
      var notes = document.getElementById('ws-notes').value.trim();
      if (!date) return alert('الرجاء إدخال تاريخ الصيانة.');
      waterStations.push({
        id: 'ws_' + Date.now(),
        station: station,
        type: type,
        date: date,
        nextDate: nextDate,
        notes: notes,
        status: (!nextDate || nextDate >= new Date().toISOString().split('T')[0]) ? 'مفتوحة' : 'متأخرة',
        createdAt: new Date().toISOString()
      });
      syncStorage();
      renderWaterStations();
      document.getElementById('ws-notes').value = '';
      alert('تمت إضافة سجل الصيانة بنجاح.');
    }
    function renderWaterStations() {
      var tbody = document.getElementById('water-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      var now = new Date().toISOString().split('T')[0];
      var overdue = 0;
      waterStations.forEach(function(w, i) {
        if (w.done) { w.status = 'تم'; }
        else { w.status = (!w.nextDate || w.nextDate >= now) ? 'مفتوحة' : 'متأخرة'; }
        if (w.status === 'متأخرة') overdue++;
        var docsForThis = waterDocs.filter(function(d) { return d.station === w.station && d.recordId === w.id; });
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><b>' + w.station + '</b></td>' +
          '<td>' + w.type + '</td>' +
          '<td>' + w.date + '</td>' +
          '<td style="color:' + (w.status === 'متأخرة' ? '#d32f2f;font-weight:700' : '#00695c;font-weight:600') + ';">' + (w.nextDate || '—') + '</td>' +
          '<td><span class="status-badge ' + (w.status === 'متأخرة' ? 'status-danger' : (w.status === 'تم' ? 'status-ok' : 'status-ok')) + '" style="' + (w.status === 'متأخرة' ? 'background:#ffebee;color:#b71c1c;' : (w.status === 'تم' ? 'background:#e8f5e9;color:#1b5e20;' : '')) + '">' + w.status + '</span></td>' +
          '<td style="font-size:12px;">' + (w.notes || '—') + '</td>' +
          '<td>' + (docsForThis.length ? '📎 ' + docsForThis.length : '—') + '</td>' +
          '<td class="no-print"><button class="btn btn-success" style="padding:2px 6px;font-size:11px;" onclick="toggleWaterDone(' + i + ')">' + (w.done ? 'إعادة فتح' : 'تم') + '</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteWaterRecord(' + i + ')">حذف</button></td>';
        tbody.appendChild(tr);
      });
      document.getElementById('water-station-count').innerText = waterStations.length;
      document.getElementById('water-overdue-count').innerText = overdue;
      initSortableTable('table-water-stations');
    }
    function deleteWaterRecord(idx) {
      if (!confirm('هل تريد حذف هذا السجل؟')) return;
      _logDeletion('waterStations', waterStations[idx].id || (waterStations[idx].date + '|' + waterStations[idx].station + '|' + waterStations[idx].type));
      waterStations.splice(idx, 1);
      syncStorage();
      renderWaterStations();
    }
    function toggleWaterDone(idx) {
      var w = waterStations[idx];
      if (!w) return;
      if (w.done) {
        w.done = false;
        delete w.doneDate;
      } else {
        w.done = true;
        w.doneDate = new Date().toISOString();
      }
      syncStorage();
      renderWaterStations();
    }
    function uploadWaterDoc() {
      var fileInput = document.getElementById('ws-doc-file');
      var station = document.getElementById('ws-doc-station').value;
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var recId = '';
        for (var i = 0; i < waterStations.length; i++) {
          if (waterStations[i].station === station) { recId = waterStations[i].id || ''; break; }
        }
        var rec = {
          id: 'wd_' + Date.now(),
          station: station,
          fileName: file.name,
          fileType: file.type,
          data: e.target.result,
          recordId: recId,
          uploadedAt: new Date().toISOString()
        };
        waterDocs.push(rec);
        _saveWaterDocsToIDB();
        try { _lsSet('lineh_water_docs', JSON.stringify(waterDocs)); _lsSet('lineh_water_docs_mirror', JSON.stringify(waterDocs)); } catch(err) {}
        renderWaterDocs();
        renderWaterStations();
        document.getElementById('ws-upload-status').textContent = 'تم رفع المستند: ' + file.name;
        fileInput.value = '';
        // رفع فوري للمستند كصف مستقل في السحابة (حماية من الضياع)
        if (window.pushWaterDocsToCloud) { window.pushWaterDocsToCloud().catch(function(err){}); }
      };
      reader.readAsDataURL(file);
    }
    function renderWaterDocs() {
      var container = document.getElementById('water-docs-list');
      if (!container) return;
      var stationNames = [];
      (waterStations || []).forEach(function(w) { if (w && w.station && stationNames.indexOf(w.station) === -1) stationNames.push(w.station); });
      (waterDocs || []).forEach(function(d) { if (d && d.station && stationNames.indexOf(d.station) === -1) stationNames.push(d.station); });
      if (!stationNames.length) stationNames = ['المحطة القديمة', 'المحطة الجديدة'];
      var html = '';
      stationNames.forEach(function(st) {
        var docs = (waterDocs || []).filter(function(d) { return d.station === st; });
        html += '<div style="background:#f5f5f5;border-radius:8px;padding:10px;border:1px solid #e0e0e0;">';
        html += '<h4 style="margin:0 0 6px;font-size:13px;color:#00695c;">' + st + ' (' + docs.length + ' مستند)</h4>';
        if (docs.length === 0) {
          html += '<div style="font-size:12px;color:#999;">لا توجد مستندات لهذه المحطة.</div>';
        } else {
          html += '<div style="max-height:300px;overflow-y:auto;">';
          docs.slice().reverse().forEach(function(d) {
            var isImg = d.fileType && d.fileType.startsWith('image/');
            html += '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:6px;">';
            html += isImg ? '<img src="' + d.data + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : '📄';
            html += '<a href="' + d.data + '" target="_blank" download="' + d.fileName + '" style="flex:1;color:#1565c0;text-decoration:none;">' + d.fileName + '</a>';
            html += '<button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteWaterDoc(\'' + d.id + '\')">حذف</button>';
            html += '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      container.innerHTML = html;
    }
    function deleteWaterDoc(id) {
      if (!requireAdmin()) return;
      if (!confirm('هل تريد حذف هذا المستند نهائياً من الجهاز ومن السحابة؟\n(لا يمكن استرجاعه بعد الحذف)')) return;
      var target = null, delKey = '';
      for (var i = 0; i < waterDocs.length; i++) {
        if (waterDocs[i].id === id) {
          target = waterDocs[i];
          delKey = (target.station || '') + '|' + (target.fileName || '') + '|' + (target.id || '');
          waterDocs.splice(i, 1);
          break;
        }
      }
      if (!target) return;
      // منع عودة المستند من السحابة بعد حذفه يدوياً
      try {
        var dels = window._waterDocDeletes ? _waterDocDeletes() : [];
        if (dels.indexOf(target.id) === -1) dels.push(target.id);
        if (window._saveWaterDocDeletes) _saveWaterDocDeletes(dels);
      } catch(e) {}
      // حذف صف المستند من السحابة مباشرة
      try {
        fetch(_sbEndpoint + '?id=eq.' + encodeURIComponent('waterdocs:' + (target.id || delKey)), {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
      } catch(e) {}
      try { _saveWaterDocsToIDB(); } catch(e) {}
      try { _lsRemove('lineh_water_docs'); _lsSet('lineh_water_docs', JSON.stringify(waterDocs)); _lsSet('lineh_water_docs_mirror', JSON.stringify(waterDocs)); } catch(e) {}
      renderWaterDocs();
      renderWaterStations();
    }

    // --- مطلوب ---
    function populateContractorSectorDropdown() {
      let sel = document.getElementById('ctr-sector');
      if(!sel) return;
      sel.innerHTML = '<option value="">-- الفني --</option>';
      contractorSectors.forEach(s => {
        let opt = document.createElement('option');
        opt.value = s; opt.textContent = s; sel.appendChild(opt);
      });
    }
    function populateContractorRoomDropdown() {
      var sector = document.getElementById('ctr-sector').value;
      var roomSel = document.getElementById('ctr-room');
      if (!roomSel) return;
      roomSel.innerHTML = '<option value="">-- المسؤول --</option>';
      if (!sector) { roomSel.innerHTML = '<option value="">-- اختر الغرفة --</option>'; return; }
      var taken = {};
      contractors.forEach(function(c) {
        if (c.sector !== sector || !c.room) return;
        var active = !c.endDate || new Date(c.endDate) >= new Date();
        if (active) taken[c.room] = true;
      });
      contractorRooms.filter(function(r) { return r.sector === sector; }).forEach(function(r) {
        if (taken[r.number]) return;
        var o = document.createElement('option');
        o.value = r.number; o.textContent = r.number + ' (' + r.beds + ' التنفيذ)'; roomSel.appendChild(o);
      });
      if (roomSel.options.length === 1) {
        roomSel.innerHTML = '<option value="">-- لا توجد غرف متاحة في هذا المبنى --</option>';
      }
    }

    function addContractor() {
      let name = document.getElementById('ctr-name').value.trim();
      let phone = document.getElementById('ctr-phone').value.trim();
      let sector = document.getElementById('ctr-sector').value;
      let room = document.getElementById('ctr-room').value;
      let dailyRate = parseInt(document.getElementById('ctr-daily-rate').value) || 0;
      let startDate = document.getElementById('ctr-start-date').value;
      let endDate = document.getElementById('ctr-end-date').value;
      let notes = document.getElementById('ctr-notes').value.trim();

      if(!name || !sector || !startDate) return alert("تمت ملغاة الحالة يجب أن تكون مفتوحة، تحت");

      let roomData = contractorRooms.find(r => r.sector === sector && r.number === room);
      let beds = roomData ? roomData.beds : 1;

      contractors.push(_ts({ id: 'ctr_' + Date.now(), name, phone, sector, room, dailyRate, startDate, endDate, beds, notes }));
      syncStorage(); renderContractorsTable();
      document.getElementById('ctr-name').value = ''; document.getElementById('ctr-phone').value = '';
      document.getElementById('ctr-sector').value = ''; document.getElementById('ctr-room').innerHTML = '<option value="">-- اختر الغرفة --</option>';
      document.getElementById('ctr-notes').value = '';
      document.getElementById('ctr-end-date').value = '';
      alert("تم تسجيل المقاول");
    }

    function renderContractorsTable() {
      let tbody = document.getElementById('contractors-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      let totalDaily = 0;
      contractors.forEach(c => { totalDaily += c.dailyRate || 0; });
      let filtered = [...contractors];
      let st = sortState['table-contractors'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'startDate');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((c) => {
        let realIdx = contractors.indexOf(c);
        let days = 0;
        if(c.startDate) {
          let s = new Date(c.startDate);
          let e = c.endDate ? new Date(c.endDate) : new Date();
          days = Math.max(1, Math.ceil((e - s) / (1000*60*60*24)) + 1);
        }
        let invoice = days * (c.dailyRate || 0);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-contractors"></td>
          <td><b>${c.name}</b></td>
          <td>${c.phone || '—'}</td>
          <td>${c.sector}</td>
          <td>${c.room || '—'}</td>
          <td>${c.dailyRate || 0} جنيه</td>
          <td>${c.startDate || '—'}</td>
          <td>${c.endDate || '—'}</td>
          <td>${days} تم</td>
          <td>${c.beds || 1}</td>
          <td><b style="color:var(--primary);">${invoice.toLocaleString()} جنيه</b></td>
          <td style="font-size:11px;">${c.notes || '—'}</td>
          <td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteContractor(${realIdx})">حذف</button></td>
        `;
        tbody.appendChild(tr);
      });
      document.getElementById('stat-total-contractors').innerText = contractors.length;
      document.getElementById('stat-total-daily-invoice').innerText = totalDaily.toLocaleString() + ' جنيه/طلب';
    }

    function deleteContractor(idx) { if (!requireAdmin()) return;
      if(confirm("الصيانة لا")) {
        _logDeletion('contractors', contractors[idx].name || contractors[idx].id);
        contractors.splice(idx, 1);
        syncStorage(); renderContractorsTable();
      }
    }

    // --- توجد نتائج إضافة ---
    function populateContractorRoomSectorDropdown() {
      var sel = document.getElementById('ctr-room-sector');
      if (!sel) return;
      sel.innerHTML = '<option value="">اختر</option>';
      contractorSectors.forEach(function(s) {
        var o = document.createElement('option');
        o.value = s; o.textContent = s; sel.appendChild(o);
      });
    }
    function addContractorRoom() {
      var sector = document.getElementById('ctr-room-sector').value;
      var number = document.getElementById('ctr-room-number').value.trim();
      var beds = parseInt(document.getElementById('ctr-room-beds').value) || 4;
      if (!sector || !number) return alert('صنفاً من نتائج البحث/الصنف غير');
      if (contractorRooms.find(function(r) { return r.sector === sector && r.number === number; }))
        return alert('موجود لم يتم');
      contractorRooms.push({ sector: sector, number: number, beds: beds });
      syncStorage(); renderContractorRoomsList(); document.getElementById('ctr-room-number').value = '';
    }
    function renderContractorRoomsList() {
      contractorRooms = contractorRooms.filter(function(r) { return r && typeof r === 'object' && r.sector && r.number; });
      var container = document.getElementById('ctr-rooms-list');
      if (!container) return;
      if (!contractorRooms.length) { container.innerHTML = '<div style="color:#999;padding:4px;">— لا توجد غرف —</div>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><tr style="background:#f5f5f5;"><th style="padding:4px;">#</th><th style="padding:4px;">خامات</th><th style="padding:4px;">أو</th><th style="padding:4px;">أدوات</th><th style="padding:4px;"></th></tr>';
      contractorRooms.forEach(function(r, i) {
        html += '<tr id="ctr-room-row-' + i + '"><td style="padding:3px;border-bottom:1px solid #eee;">' + (i+1) + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;">' + r.sector + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;">' + r.number + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;" id="ctr-room-beds-cell-' + i + '">' + r.beds + ' بعد</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;text-align:left;" id="ctr-room-actions-' + i + '">' +
          '<button class="btn" style="padding:1px 6px;font-size:10px;background:#1565c0;color:white;" onclick="editContractorRoomBeds(' + i + ')">✏️</button> ' +
          '<button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteContractorRoom(' + i + ')">حذف</button></td></tr>';
      });
      html += '</table>';
      container.innerHTML = html;
    }
    function editContractorRoomBeds(idx) {
      var r = contractorRooms[idx];
      if (!r) return;
      var cell = document.getElementById('ctr-room-beds-cell-' + idx);
      var actions = document.getElementById('ctr-room-actions-' + idx);
      if (!cell || !actions) return;
      cell.innerHTML = '<input type="number" id="ctr-room-beds-edit-' + idx + '" value="' + r.beds + '" min="1" style="width:70px;padding:3px;border:2px solid #e65100;border-radius:4px;font-size:12px;">';
      actions.innerHTML =
        '<button class="btn" style="padding:1px 6px;font-size:10px;background:#2e7d32;color:white;" onclick="saveContractorRoomBeds(' + idx + ')">💾</button> ' +
        '          <button class="btn" style="padding:1px 6px;font-size:10px;background:#888;color:white;" onclick="renderContractorRoomsList()">🔄</button>';
    }
    function saveContractorRoomBeds(idx) {
      var r = contractorRooms[idx];
      if (!r) return;
      var input = document.getElementById('ctr-room-beds-edit-' + idx);
      if (!input) return;
      var val = parseInt(input.value) || 1;
      r.beds = val;
      syncStorage(); renderContractorRoomsList();
    }
    function deleteContractorRoom(idx) { if (!requireAdmin()) return;
      if (!confirm('الدورية يرجى')) return;
      _logDeletion('contractorRooms', (contractorRooms[idx].sector||'') + '|' + (contractorRooms[idx].number||''));
      contractorRooms.splice(idx, 1);
      syncStorage(); renderContractorRoomsList();
    }

    // --- ملء الحقول الأساسية ---
    function _tsMonthKey(dateStr) {
      if (!dateStr) return '';
      var m = dateStr.match(/^(\d{4})-(\d{2})/);
      if (m) return m[1] + '-' + m[2];
      // Strip invisible Unicode chars (LRM, RLM, ZWNJ, ZWJ, ZWSP, BOM, etc.)
      var n = dateStr.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u2063\uFEFF]/g, '');
      // Normalize Arabic/Asian digits
      n = n.replace(/[\u0660-\u0669]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0x0660); });
      n = n.replace(/[\u06F0-\u06F9]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0x06F0); });
      // Handle D/M/YYYY or D/M/YYYY HH:mm (Arabic locale format)
      var dm = n.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dm) return dm[3] + '-' + ('0' + dm[2]).slice(-2);
      try {
        var d = new Date(n);
        if (!isNaN(d)) return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2);
      } catch(e) {}
      return '';
    }
    function _tsMonthName(monthKey) {
      if (!monthKey) return '';
      var names = ['', 'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      var parts = monthKey.split('-');
      var m = parseInt(parts[1]) || 0;
      return names[m] + ' ' + parts[0];
    }
function renderTeaSugarTable() {
  let tbody = document.getElementById('ts-table-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  var monthFilter = document.getElementById('ts-month-filter')?.value || '';
  var periodFilter = document.getElementById('ts-period-filter')?.value || '';
  let q = document.getElementById('search-ts')?.value.toLowerCase() || '';
  let filtered = [...teaSugarDisbursements];
  if (monthFilter) filtered = filtered.filter(function(ts) { return _tsMonthKey(ts.date) === monthFilter; });
  if (periodFilter) filtered = filtered.filter(function(ts) { return ts.period === periodFilter; });
  if (q) filtered = filtered.filter(function(ts) { return (ts.empName||'').toLowerCase().includes(q) || (ts.empCode||'').toLowerCase().includes(q); });
  let st = sortState['table-tea-sugar'];
  if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
  if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
  filtered.forEach((ts, idx) => {
    let realIdx = teaSugarDisbursements.indexOf(ts);
    let emp = employees.find(e => (e.id || e.code) == ts.empId || e.name === ts.empName);
    let empName = emp ? (emp.name || emp.title) : (ts.empName || ts.empTitle || '—');
    let empCode = emp ? (emp.code || emp.id) : (ts.empCode || '—');
    let empDept = emp ? (emp.dept || emp.sector || '') : (ts.empDept || '');
    let empTitle = emp ? (emp.title || emp.position || '') : (ts.empTitle || '');
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="no-print"><input type="checkbox" class="row-check" data-table="table-tea-sugar"></td>
      <td><b>${empName}</b></td>
      <td>${empCode}</td>
      <td>${empDept} ${empTitle}</td>
      <td>${ts.period}</td>
      <td><span style="color:var(--warning);font-weight:700;">${ts.teaPacks}</span></td>
      <td><span style="color:var(--warning);font-weight:700;">${ts.sugarKg}</span></td>
      <td>${ts.date}</td>
      <td class="no-print"><button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editTS(${realIdx})">✏️</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteTS(${realIdx})">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
  renderTeaSugarBatchSummary();
}

    function deleteTS(idx) { if (!requireAdmin()) return;
      if(confirm("⚠️ هل أنت متأكد من حذف هذا الصرف؟")) {
        var d = teaSugarDisbursements[idx];
        _logDeletion('teaSugarDisbursements', (d.date||'') + '|' + (d.period||d.type||'') + '|' + (d.empCode||d.empId||'') + '|' + (d.teaPacks||d.quantity||'') + '|' + (d.sugarKg||''));
        teaSugarDisbursements.splice(idx, 1);
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
      }
    }

    function editTS(idx) {
      let rec = teaSugarDisbursements[idx];
      if (!rec) return;
      if (!canEditRecord(rec.date || rec.disburseDate)) { alert('لا يمكن تعديل سجل خارج فترة التعديل المسموحة'); return; }
      let newTea = prompt("عدد عبوات الشاي:", rec.teaPacks);
      if (newTea === null) return;
      newTea = parseInt(newTea);
      if (isNaN(newTea) || newTea < 0) return alert('الرجاء إدخال رقم صحيح للشاي');
      let newSugar = prompt("كمية السكر (كجم):", rec.sugarKg);
      if (newSugar === null) return;
      newSugar = parseFloat(newSugar);
      if (isNaN(newSugar) || newSugar < 0) return alert('الرجاء إدخال رقم صحيح للسكر');
      rec.teaPacks = newTea;
      rec.sugarKg = newSugar;
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
      alert('تم تحديث البيانات بنجاح');
    }

    // --- دوال الشاي والسكر ---
    function saveTeaSugarBatch() {
      let date = document.getElementById('ts-batch-date').value;
      if (!date) return alert('الرجاء إدخال التاريخ.');
      let period = document.getElementById('ts-batch-period').value;
      let teaQty = parseInt(document.getElementById('ts-batch-tea').value) || 0;
      let sugarQty = parseFloat(document.getElementById('ts-batch-sugar').value) || 0;
      if (teaQty <= 0 && sugarQty <= 0) return alert('الرجاء إدخال كمية الشاي أو السكر.');
      teaSugarBatches.push({ id: 'tsb_'+Date.now(), date, period, teaQty, sugarQty });
      syncStorage(); renderTeaSugarBatchSummary();
      logAction('شاي وسكر', 'دفعة ' + period, 'شاي: ' + teaQty + ' | سكر: ' + sugarQty, 'التاريخ: ' + date);
      document.getElementById('ts-batch-date').value = '';
      document.getElementById('ts-batch-tea').value = '0';
      document.getElementById('ts-batch-sugar').value = '0';
      document.getElementById('ts-month-filter').value = date.slice(0, 7);
      renderTeaSugarTable();
      alert('تم حفظ الدفعة بنجاح');
    }

    function getTeaSugarPeriodStats(period, monthKey) {
      let batches = teaSugarBatches.filter(function(b) { return b.period === period && (!monthKey || _tsMonthKey(b.date) === monthKey); });
      let totalTeaGiven = batches.reduce(function(s, b) { return s + (parseInt(b.teaQty)||0); }, 0);
      let totalSugarGiven = batches.reduce(function(s, b) { return s + (parseFloat(b.sugarQty)||0); }, 0);
      let disbursed = teaSugarDisbursements.filter(function(d) { return d.period === period && (!monthKey || _tsMonthKey(d.date) === monthKey); });
      let totalTeaUsed = disbursed.reduce(function(s, d) { return s + (parseInt(d.teaPacks)||0); }, 0);
      let totalSugarUsed = disbursed.reduce(function(s, d) { return s + (parseFloat(d.sugarKg)||0); }, 0);
      return { totalTeaGiven: totalTeaGiven, totalSugarGiven: totalSugarGiven, totalTeaUsed: totalTeaUsed, totalSugarUsed: totalSugarUsed,
        remainingTea: totalTeaGiven - totalTeaUsed,
        remainingSugar: totalSugarGiven - totalSugarUsed,
        batchCount: batches.length, empCount: disbursed.length, monthKey: monthKey || '' };
    }

    function renderTeaSugarBatchSummary() {
      let container = document.getElementById('ts-batch-summary');
      if (!container) return;
      // Collect all unique month keys from batches and disbursements
      var monthSet = {};
      teaSugarBatches.forEach(function(b) { var m = _tsMonthKey(b.date); if (m) monthSet[m] = true; });
      teaSugarDisbursements.forEach(function(d) { var m = _tsMonthKey(d.date); if (m) monthSet[m] = true; });
      var monthFilter = document.getElementById('ts-month-filter')?.value || '';
      var months = Object.keys(monthSet).sort();
      if (monthFilter) months = months.filter(function(m) { return m === monthFilter; });
      if (months.length === 0) { container.innerHTML = '<div style="color:#888;font-size:13px;text-align:center;padding:20px;">لم يتم تسجيل أي دفعة تموين بعد — سجّل دفعة أولاً</div>'; return; }
      var periods = ['الدورة الأولى (1-7)', 'الدورة الثانية (15-21)'];
      var html = '';
      months.forEach(function(m) {
        var monthName = _tsMonthName(m);
        html += '<div style="background:#f5f5f5;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #e0e0e0;">';
        html += '<div style="font-size:14px;font-weight:700;color:#1b5e20;margin-bottom:8px;">📅 ' + monthName + '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
        periods.forEach(function(p) {
          var s = getTeaSugarPeriodStats(p, m);
          var teaPct = s.totalTeaGiven > 0 ? Math.min(100, Math.round(s.totalTeaUsed / s.totalTeaGiven * 100)) : 0;
          var sugarPct = s.totalSugarGiven > 0 ? Math.min(100, Math.round(s.totalSugarUsed / s.totalSugarGiven * 100)) : 0;
          var teaColor = teaPct >= 90 ? '#d32f2f' : teaPct >= 70 ? '#f57c00' : '#2e7d32';
          var sugarColor = sugarPct >= 90 ? '#d32f2f' : sugarPct >= 70 ? '#f57c00' : '#2e7d32';
          var isEmpty = s.totalTeaGiven === 0 && s.totalSugarGiven === 0;
          html += '<div style="background:white;padding:10px;border-radius:8px;box-shadow:var(--shadow);border-right:4px solid ' + (isEmpty ? '#ccc' : (s.remainingTea <= 0 ? '#d32f2f' : '#4caf50')) + ';">';
          html += '<div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">' + p + '</div>';
          if (isEmpty) {
            html += '<div style="font-size:11px;color:#999;">لا توجد بيانات لهذه الدورة</div>';
          } else {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">';
            html += '<div><span style="color:#888;">☕ شاي مسلم:</span> <b style="color:#e65100;">' + s.totalTeaGiven + '</b></div>';
            html += '<div><span style="color:#888;">🍚 سكر مسلم:</span> <b style="color:#e65100;">' + s.totalSugarGiven + '</b></div>';
            html += '<div><span style="color:#888;">☕ شاي مصروف:</span> <b>' + s.totalTeaUsed + '</b></div>';
            html += '<div><span style="color:#888;">🍚 سكر مصروف:</span> <b>' + s.totalSugarUsed + '</b></div>';
            html += '<div><span style="color:#888;">📦 متبقي شاي:</span> <b style="color:' + (s.remainingTea <= 0 ? '#d32f2f' : '#2e7d32') + ';">' + Math.max(0, s.remainingTea) + '</b></div>';
            html += '<div><span style="color:#888;">📦 متبقي سكر:</span> <b style="color:' + (s.remainingSugar <= 0 ? '#d32f2f' : '#2e7d32') + ';">' + Math.max(0, s.remainingSugar) + '</b></div>';
            html += '</div>';
            html += '<div style="margin-top:6px;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:10px;color:#888;">شاي</span><div style="flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + teaPct + '%;background:' + teaColor + ';border-radius:3px;"></div></div><span style="font-size:10px;font-weight:600;">' + teaPct + '%</span></div>';
            html += '<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:10px;color:#888;">سكر</span><div style="flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + sugarPct + '%;background:' + sugarColor + ';border-radius:3px;"></div></div><span style="font-size:10px;font-weight:600;">' + sugarPct + '%</span></div></div>';
            html += '<div style="font-size:10px;color:#999;margin-top:4px;">' + s.batchCount + ' دفعة | ' + s.empCount + ' موظف</div>';
            // Show batches for this month+period
            var monthBatches = teaSugarBatches.filter(function(b) { return b.period === p && _tsMonthKey(b.date) === m; });
            if (monthBatches.length > 0) {
              html += '<div style="margin-top:4px;border-top:1px dashed #ddd;padding-top:4px;">';
              monthBatches.forEach(function(b) {
                var realBIdx = teaSugarBatches.indexOf(b);
                var bDate = b.date || '—';
                var bTea = b.teaQty || 0;
                var bSugar = b.sugarQty || 0;
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;margin-top:2px;background:#f5f5f5;border-radius:3px;font-size:10px;">';
                html += '<span>' + bDate + ' — شاي: ' + bTea + ' | سكر: ' + bSugar + '</span>';
                html += '<span><button class="btn btn-primary" style="padding:1px 4px;font-size:9px;" onclick="editTsBatch(' + realBIdx + ')">تعديل</button> <button class="btn btn-danger" style="padding:1px 4px;font-size:9px;" onclick="deleteTsBatch(' + realBIdx + ')">حذف</button></span>';
                html += '</div>';
              });
              html += '</div>';
            }
          }
          html += '</div>';
        });
        html += '</div></div>';
      });
      container.innerHTML = html;
    }

    function deleteTsBatch(idx) { if (!requireAdmin()) return;
      let b = teaSugarBatches[idx];
      if (!b) return;
      if (confirm("⚠️ هل أنت متأكد من حذف هذه الدفعة؟")) {
        _logDeletion('teaSugarBatches', b.id || b._id);
        teaSugarBatches.splice(idx, 1);
        syncStorage(); renderTeaSugarBatchSummary(); renderTeaSugarTable();
      }
    }

    function editTsBatch(idx) {
      let b = teaSugarBatches[idx];
      if (!b) return;
      let newTea = prompt("🍵 كمية الشاي (باكيت):", b.teaQty);
      if (newTea === null) return;
      newTea = parseInt(newTea);
      if (isNaN(newTea) || newTea < 0) return alert("⚠️ كمية غير صالحة");
      let newSugar = prompt("🍚 كمية السكر (كجم):", b.sugarQty);
      if (newSugar === null) return;
      newSugar = parseFloat(newSugar);
      if (isNaN(newSugar) || newSugar < 0) return alert("⚠️ كمية غير صالحة");
      b.teaQty = newTea;
      b.sugarQty = newSugar;
      syncStorage(); renderTeaSugarBatchSummary(); renderTeaSugarTable();
      alert("✅ تم تعديل الدفعة");
    }

    function addTeaSugarRecord() {
      let q = document.getElementById('ts-emp-search').value.trim();
      let emp = findEmpByInput(q);
      let empId = emp ? (emp.id || emp.code) : '';
      let empName = emp ? emp.name : q;
      let period = document.getElementById('ts-period').value;
      let teaPacks = 2;
      let sugarKg = 1;

      if(!empId || !period) return alert("⚠️ اختر الموظف والدورة أولاً");

      var today = new Date().toISOString().split('T')[0];
      var monthKey = today.slice(0, 7);

      var dup = teaSugarDisbursements.some(function(d) { return (d.empCode||d.empId) == empId && d.period === period && _tsMonthKey(d.date) === monthKey; });
      if (dup) return alert('⚠️ هذا الموظف استلم مقررات الشاي/السكر بالفعل لهذه الدورة في هذا الشهر');

      // Check remaining balance for THIS month
      let stats = getTeaSugarPeriodStats(period, monthKey);
      if (stats.totalTeaGiven <= 0) return alert('⚠️ لم يتم تسجيل دفعة تموين لـ ' + _tsMonthName(monthKey) + '. سجّل دفعة أولاً.');
      if (stats.remainingTea < teaPacks) return alert('⚠️ كمية الشاي المتبقية لا تكفي. المتبقي: ' + Math.max(0,stats.remainingTea) + ' باكيت');
      if (stats.remainingSugar < sugarKg) return alert('⚠️ كمية السكر المتبقية لا تكفي. المتبقي: ' + Math.max(0,stats.remainingSugar) + ' كجم');

      teaSugarDisbursements.push(_ts({
        id: 'ts_' + Date.now(), empId: empId,
        empCode: emp ? (emp.code || emp.id) : '',
        empName: empName,
        empDept: emp ? emp.dept : '',
        empTitle: emp ? emp.title : '',
        period, date: today,
        teaPacks, sugarKg
      }));
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
    }

    // --- التعديل دفعات ---
    function getTodayMealStats(forDate) {
      let pCount = employees.filter(e => e.status === 'P').length;
      let targetDate = forDate ? new Date(forDate.split('-')[0], parseInt(forDate.split('-')[1])-1, forDate.split('-')[2]) : new Date();
      targetDate.setHours(0,0,0,0);
      let todayGuests = hospitalities.filter(h => {
        if(!h.arrival) return false;
        let a = new Date(h.arrival + 'T00:00:00');
        let d = h.departure ? new Date(h.departure + 'T00:00:00') : a;
        return targetDate >= a && targetDate <= d;
      });
      let gBf = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('إفطار') ? (h.guests || 1) : 0), 0);
      let gLh = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('غداء') ? (h.guests || 1) : 0), 0);
      let gDn = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('عشاء') ? (h.guests || 1) : 0), 0);
      return { pCount, gBf, gLh, gDn };
    }

    function renderTodayMealReport() {
      let s = getTodayMealStats();
      let todayStr = fmtDate(new Date());
      let today = toArabicNumerals(todayStr);
      var todayND = normalizeDateStr(todayStr);
      var entry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === todayND; });
      var bfDisplay = entry ? toArabicNumerals(String((entry.breakfast || 0) + (entry.guestBf || 0))) : '—';
      var lhDisplay = entry ? toArabicNumerals(String((entry.lunch || 0) + (entry.guestLh || 0))) : '—';
      var dnDisplay = entry ? toArabicNumerals(String((entry.dinner || 0) + (entry.guestDn || 0))) : '—';
      var statusIcon = entry ? (entry.userEdited ? '✏️' : '🤖') : '⏳';
      document.getElementById('today-report-date').innerHTML = `📊 تقرير اليوم ${today} <span style="font-size:14px;color:#666;">— عدد الأفراد: ${toArabicNumerals(String(s.pCount))} ${statusIcon}</span>`;
      document.getElementById('stat-today-p').innerText = toArabicNumerals(String(s.pCount));
      document.getElementById('stat-today-bf').innerText = bfDisplay;
      document.getElementById('stat-today-lh').innerText = lhDisplay;
      document.getElementById('stat-today-dn').innerText = dnDisplay;
    }

    function fmtDate(d) {
      return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    }
    function normalizeArabicDigits(str) {
      return str.replace(/[?-?]/g, function(c) { return String.fromCharCode(c.charCodeAt(0)-0x660+0x30); });
    }
    function toArabicNumerals(str) {
      return str.replace(/[0-9]/g, function(c) { return String.fromCharCode(c.charCodeAt(0)-0x30+0x660); });
    }
    // تحويل أي تواريخ قديمة مخزنة بارقام عربية إلى ارقام عادية عند تحميل الصفحة
    function normalizeMealLogDates() {
      var changed = false;
      mealLogs.forEach(function(l) {
        if (l.date && (l.date.indexOf('?')!==-1 || l.date.indexOf('?')!==-1)) {
          l.date = normalizeArabicDigits(l.date);
          changed = true;
        }
      });
      mealLogs.forEach(function(l) {
        var nd = normalizeDateStr(l.date);
        if (nd !== l.date) { l.date = nd; changed = true; }
      });
      var seen = {};
      var before = mealLogs.length;
      mealLogs = mealLogs.filter(function(l) {
        if (seen[l.date]) return false;
        seen[l.date] = true;
        return true;
      });
      if (before !== mealLogs.length) changed = true;
      if (changed) syncStorage();
    }

    function normalizeDateStr(d) {
      if (!d) return '';
      var s = d.replace(/[?-?]/g, function(c) { return String.fromCharCode(c.charCodeAt(0)-0x660+0x30); });
      s = s.replace(/[^0-9\-\/]/g, '');
      var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
      var m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m2) return m2[3]+'-'+('0'+m2[2]).slice(-2)+'-'+('0'+m2[1]).slice(-2);
      var m3 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (m3) return m3[3]+'-'+('0'+m3[2]).slice(-2)+'-'+('0'+m3[1]).slice(-2);
      return s;
    }
    function normalizeBakeryDates(noSync) {
      var changed = false;
      bakeryProductions.forEach(function(p) {
        var nd = normalizeDateStr(p.date);
        if (nd !== p.date) { p.date = nd; changed = true; }
        if (p.flourQty !== undefined && p.flourUsed === undefined) { p.flourUsed = p.flourQty; delete p.flourQty; changed = true; }
        if (p.yeastQty !== undefined && p.yeastUsed === undefined) { p.yeastUsed = p.yeastQty; delete p.yeastQty; changed = true; }
        if (p.saltQty !== undefined && p.saltUsed === undefined) { p.saltUsed = p.saltQty; delete p.saltQty; changed = true; }
        if (p.branQty !== undefined && p.branUsed === undefined) { p.branUsed = p.branQty; delete p.branQty; changed = true; }
        if (p.dieselQty !== undefined && p.dieselUsed === undefined) { p.dieselUsed = p.dieselQty; delete p.dieselQty; changed = true; }
        if (p.opCost !== undefined && p.operatingCost === undefined) { p.operatingCost = p.opCost; delete p.opCost; changed = true; }
        if (p.costPerLoaf !== undefined) { delete p.costPerLoaf; changed = true; }
      });
      bakeryContractorSupplies.forEach(function(cs) {
        var nd = normalizeDateStr(cs.date);
        if (nd !== cs.date) { cs.date = nd; changed = true; }
        if (cs.contractor !== undefined && cs.name === undefined) { cs.name = cs.contractor; delete cs.contractor; changed = true; }
        if (cs.forContractor !== undefined && cs.count === undefined) { cs.count = cs.forContractor; delete cs.forContractor; changed = true; }
        if (cs.salePrice !== undefined && cs.price === undefined) { cs.price = cs.salePrice; delete cs.salePrice; changed = true; }
        if (cs.total !== undefined && cs.revenue === undefined) { cs.revenue = cs.total; delete cs.total; changed = true; }
        if (cs.forFarm !== undefined) { delete cs.forFarm; changed = true; }
        if (cs.paid === undefined) { cs.paid = 0; changed = true; }
        if (cs.prodCost === undefined) { cs.prodCost = 0; changed = true; }
        if (cs.profit === undefined) { cs.profit = 0; changed = true; }
        if (cs.responsible === undefined) { cs.responsible = ''; changed = true; }
        if (cs.ingredients === undefined) { cs.ingredients = {}; changed = true; }
        if (cs.revenue === undefined && cs.count && cs.price) { cs.revenue = cs.count * cs.price; changed = true; }
      });
      bakeryInvoices.forEach(function(inv) {
        var nd = normalizeDateStr(inv.date);
        if (nd !== inv.date) { inv.date = nd; changed = true; }
      });
      var _bpSeen = {};
      bakeryProductions = bakeryProductions.slice().reverse().filter(function(p) {
        var k = normalizeDateStr(p.date);
        if (_bpSeen[k]) { changed = true; return false; }
        _bpSeen[k] = true; return true;
      }).reverse();
      if (changed && !noSync) syncStorage();
    }

    function autoLogTodayMeals() {
      var now = new Date();
      var today = now.toISOString().split('T')[0];
      var hour = now.getHours();
      var s = getTodayMealStats();
      var bf = hour >= 11 ? s.pCount : 0;
      var lh = hour >= 15 ? s.pCount : 0;
      var dn = hour >= 20 ? s.pCount : 0;
      if (bf === 0 && lh === 0 && dn === 0) return;
      var existingIdx = mealLogs.findIndex(function(l) { return normalizeDateStr(l.date) === today; });
      if (existingIdx >= 0) {
        var entry = mealLogs[existingIdx];
        if (!entry.userEdited) {
          if (bf > 0 && !entry.breakfast) entry.breakfast = bf;
          if (lh > 0 && !entry.lunch) entry.lunch = lh;
          if (dn > 0 && !entry.dinner) entry.dinner = dn;
          entry.guestBf = s.gBf; entry.guestLh = s.gLh; entry.guestDn = s.gDn;
          entry.autoGenerated = true;
        }
      } else {
        mealLogs.push({
          date: today, breakfast: bf, lunch: lh, dinner: dn,
          guestBf: s.gBf, guestLh: s.gLh, guestDn: s.gDn,
          autoGenerated: true, chef: '', modifiedAt: new Date().toISOString()
        });
      }
      syncStorage();
    }
    function saveMealLog() {
      var chef = document.getElementById('meal-chef').value.trim();
      if (!chef) { document.getElementById('meal-chef').focus(); return alert('⚠️ الرجاء إدخال اسم الشيف.'); }
      let dateInput = document.getElementById('meal-date').value;
      if (!dateInput) return alert("⚠️ الرجاء اختيار التاريخ.");
      let editIdx = parseInt(document.getElementById('meal-edit-idx').value);
      let s = getTodayMealStats(dateInput);
      var manualBf = document.getElementById('meal-p-bf').value;
      var manualLh = document.getElementById('meal-p-lh').value;
      var manualDn = document.getElementById('meal-p-dn').value;
      var bf = manualBf !== '' ? parseInt(manualBf) : s.pCount;
      var lh = manualLh !== '' ? parseInt(manualLh) : s.pCount;
      var dn = manualDn !== '' ? parseInt(manualDn) : s.pCount;
      if (editIdx >= 0 && editIdx < mealLogs.length) {
        mealLogs[editIdx].chef = chef;
        mealLogs[editIdx].breakfast = bf;
        mealLogs[editIdx].lunch = lh;
        mealLogs[editIdx].dinner = dn;
        mealLogs[editIdx].guestBf = s.gBf;
        mealLogs[editIdx].guestLh = s.gLh;
        mealLogs[editIdx].guestDn = s.gDn;
        mealLogs[editIdx].userEdited = true;
        mealLogs[editIdx].modifiedAt = new Date().toISOString();
        syncStorage(); renderMealLogTable();
        logAction('تعديل', 'وجبات', dateInput, 'الشيف: ' + chef + ' | فطار: ' + bf + ' | غداء: ' + lh + ' | عشاء: ' + dn);
        document.getElementById('meal-edit-idx').value = '-1';
        document.getElementById('meal-p-bf').value = '';
        document.getElementById('meal-p-lh').value = '';
        document.getElementById('meal-p-dn').value = '';
        return;
      }
      if(mealLogs.some(l => normalizeDateStr(l.date) === dateInput)) return alert("هذا التاريخ مسجل مسبقاً! اختر تعديل من الجدول.");
      // بيانات بيانات deletion موظف حذف دفعة التموين؟
      syncDeletions = syncDeletions.filter(function(d) { return !(d.entity === 'mealLogs' && d.key === dateInput); });
      mealLogs.push(_ts({
        date: dateInput, breakfast: bf, lunch: lh, dinner: dn,
        guestBf: s.gBf, guestLh: s.gLh, guestDn: s.gDn, autoGenerated: false, chef: chef
      }));
      syncStorage(); renderMealLogTable();
      logAction('إضافة', 'وجبات', dateInput, 'الشيف: ' + chef + ' | فطار: ' + bf + ' | غداء: ' + lh + ' | عشاء: ' + dn);
      document.getElementById('meal-p-bf').value = '';
      document.getElementById('meal-p-lh').value = '';
      document.getElementById('meal-p-dn').value = '';
    }

    function calcHospGuestsForDate(dateStr) {
      var nd = normalizeDateStr(dateStr);
      if (!nd) return { gBf:0, gLh:0, gDn:0 };
      var parts = nd.split('-');
      if (parts.length !== 3) return { gBf:0, gLh:0, gDn:0 };
      var y = parseInt(parts[0]), m = parseInt(parts[1])-1, d = parseInt(parts[2]);
      var target = new Date(y, m, d);
      target.setHours(0,0,0,0);
      var gBf = 0, gLh = 0, gDn = 0;
      hospitalities.forEach(function(h) {
        if (!h.arrival) return;
        var a = new Date(h.arrival + 'T00:00:00');
        var dep = h.departure ? new Date(h.departure + 'T00:00:00') : new Date(a);
        if (target >= a && target <= dep) {
          if (h.meals && h.meals.includes('إفطار')) gBf += (h.guests || 1);
          if (h.meals && h.meals.includes('غداء')) gLh += (h.guests || 1);
          if (h.meals && h.meals.includes('عشاء')) gDn += (h.guests || 1);
        }
      });
      return { gBf: gBf, gLh: gLh, gDn: gDn };
    }

    function renderMealLogTable() {
      normalizeMealLogDates();
      renderTodayMealReport();
      let tbody = document.getElementById('meal-log-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      let totalBf = 0, totalLh = 0, totalDn = 0, count = 0;
      let filtered = [...mealLogs].sort((a, b) => normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date)));
      let st = sortState['table-meal-log'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((log) => {
        let realIdx = mealLogs.indexOf(log);
        let bf = log.breakfast || log.pCount || 0;
        let lh = log.lunch || log.pCount || 0;
        let dn = log.dinner || log.pCount || 0;
        // الموظف وحدد الدورة بيانات لم يتم
        var hospGuests = calcHospGuestsForDate(log.date);
        let gBf = hospGuests.gBf;
        let gLh = hospGuests.gLh;
        let gDn = hospGuests.gDn;
        let total = bf + gBf + lh + gLh + dn + gDn;
        // التيك أواي من سجلات الهدر المسجلة لنفس اليوم (مهندسين + عمال)
        const takeaway = mealWaste.filter(function(mw) { return normalizeDateStr(mw.date) === normalizeDateStr(log.date); })
          .reduce(function(s, mw) { return s + (mw.engTakeaway||0) + (mw.wrkTakeaway||0); }, 0);
        totalBf += bf; totalLh += lh; totalDn += dn; count++;
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-meal-log"></td>
          <td><b>${toArabicNumerals(log.date)}</b></td>
          <td><b>${bf}</b></td>
          <td><span style="color:#e65100;font-weight:600;">+${toArabicNumerals(String(gBf))}</span></td>
          <td><b>${lh}</b></td>
          <td><span style="color:#e65100;font-weight:600;">+${toArabicNumerals(String(gLh))}</span></td>
          <td><b>${dn}</b></td>
          <td><span style="color:#e65100;font-weight:600;">+${toArabicNumerals(String(gDn))}</span></td>
          <td><b>${toArabicNumerals(String(total))}</b></td>
          <td style="color:#00695c;font-weight:700;">🥡 ${toArabicNumerals(String(takeaway))}</td>
          <td>${log.chef || '—'}</td>
          <td>${log.autoGenerated ? 'تلقائي' : 'يدوي'}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px;font-size:11px;" onclick="editMealLog(${realIdx})">✏️</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteMealLog(${realIdx})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteMealLog(idx) { if (!requireAdmin()) return;
      if(confirm("هل تريد حذف هذا السجل؟")) {
        _logDeletion('mealLogs', mealLogs[idx].date);
        mealLogs.splice(idx, 1);
        syncStorage(); renderMealLogTable();
      }
    }

    function editMealLog(idx) {
      let log = mealLogs[idx];
      if(!log) return;
      let nd = normalizeDateStr(log.date);
      document.getElementById('meal-date').value = nd;
      document.getElementById('meal-chef').value = log.chef || '';
      document.getElementById('meal-edit-idx').value = idx;
      document.getElementById('meal-p-bf').value = log.breakfast || '';
      document.getElementById('meal-p-lh').value = log.lunch || '';
      document.getElementById('meal-p-dn').value = log.dinner || '';
      document.getElementById('meal-p-bf').focus();
    }

    /* ===== Meal Survey Module ===== */
    var _lastSurveyedMeal = null;
    function renderMealSurvey() {
      var today = new Date().toISOString().split('T')[0];
      var tdEl = document.getElementById('survey-today');
      if (tdEl) tdEl.textContent = today;
      var meals = ['إفطار', 'غداء', 'عشاء'];
      var icons = { 'إفطار':'🌅','غداء':'☀️','عشاء':'🌙' };
      var emojis = ['😞','😐','😊','😍'];
      var labels = ['سيء','مقبول','جيد','ممتاز'];
      var container = document.getElementById('survey-meals');
      if (!container) return;
      var html = '';
      meals.forEach(function(meal) {
        var existing = mealSurveys.filter(function(s) { return s.date === today && s.meal === meal; });
        var current = existing.length > 0 ? existing[existing.length - 1] : null;
        var curRating = current ? current.rating : -1;
        if (curRating >= 1 && curRating <= 4) curRating = curRating - 1;
        var curComment = current && current.comment ? current.comment : '';
        var stars = '';
        for (var r = 0; r < 4; r++) {
          var active = (r === curRating) ? ' style="transform:scale(1.3);border-color:#ff8f00;"' : '';
          stars += '<span class="survey-emoji" data-meal="' + meal + '" data-rating="' + r + '" onclick="submitMealRating(\'' + meal + '\',' + r + ')"' + active + ' style="cursor:pointer;font-size:32px;padding:4px;transition:all 0.2s;border-radius:8px;border:2px solid transparent;display:inline-block;' + (r === curRating ? 'transform:scale(1.3);border-color:#ff8f00;background:#fff8e1;' : '') + '">' + emojis[r] + '</span>';
        }
        html += '<div style="background:white;border-radius:10px;padding:12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #ffe0b2;">' +
          '<div style="font-size:14px;font-weight:700;color:#e65100;margin-bottom:6px;">' + icons[meal] + ' ' + meal + '</div>' +
          '<div style="font-size:24px;margin-bottom:4px;">' + (curRating >= 0 ? curRating + 1 : '—') + ' / 4</div>' +
          '<div>' + stars + '</div>' +
          '<div style="margin-top:8px;"><input type="text" id="survey-comment-' + meal + '" placeholder="أدخل تعليقاً..." value="' + curComment.replace(/"/g, '&quot;') + '" oninput="saveSurveyComment(\'' + meal + '\',this.value)" style="width:100%;padding:6px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;text-align:right;"></div>' +
          '</div>';
      });
      container.innerHTML = html;
      renderMealSurveyStats();
      renderSurveyLog();
      generateMealSurveyQR();
    }
    function submitMealRating(meal, rating) {
      var today = new Date().toISOString().split('T')[0];
      _lastSurveyedMeal = meal;
      for (var i = 0; i < mealSurveys.length; i++) {
        if (mealSurveys[i].date === today && mealSurveys[i].meal === meal && mealSurveys[i].employee === currentUser) {
          mealSurveys[i].rating = rating;
          mealSurveys[i].timestamp = new Date().toISOString();
          syncStorage();
          renderMealSurvey();
          // Show comment area if rating is 0 or 1 (negative)
          var ca = document.getElementById('survey-comment-area');
          if (ca) { ca.style.display = (rating < 2) ? 'block' : 'none'; }
          if (rating < 2) document.getElementById('survey-comment-input').focus();
          return;
        }
      }
      mealSurveys.push({ date: today, meal: meal, rating: rating, employee: currentUser, comment: '', timestamp: new Date().toISOString() });
      syncStorage();
      renderMealSurvey();
      var ca = document.getElementById('survey-comment-area');
      if (ca) { ca.style.display = (rating < 2) ? 'block' : 'none'; }
      if (rating < 2) document.getElementById('survey-comment-input').focus();
    }
    function submitSurveyComment() {
      var today = new Date().toISOString().split('T')[0];
      var comment = document.getElementById('survey-comment-input').value.trim();
      if (!_lastSurveyedMeal) return;
      for (var i = mealSurveys.length - 1; i >= 0; i--) {
        if (mealSurveys[i].date === today && mealSurveys[i].meal === _lastSurveyedMeal && mealSurveys[i].employee === currentUser) {
          mealSurveys[i].comment = comment;
          mealSurveys[i].timestamp = new Date().toISOString();
          syncStorage();
          renderMealSurvey();
          document.getElementById('survey-comment-area').style.display = 'none';
          document.getElementById('survey-comment-input').value = '';
          _lastSurveyedMeal = null;
          return;
        }
      }
    }
    function saveSurveyComment(meal, comment) {
      var today = new Date().toISOString().split('T')[0];
      for (var i = mealSurveys.length - 1; i >= 0; i--) {
        if (mealSurveys[i].date === today && mealSurveys[i].meal === meal && mealSurveys[i].employee === currentUser) {
          mealSurveys[i].comment = comment.trim();
          mealSurveys[i].timestamp = new Date().toISOString();
          syncStorage();
          return;
        }
      }
    }
    var _surveyLogOpen = false;
    function toggleSurveyLog() {
      var body = document.getElementById('sv-log-body-wrap');
      var icon = document.getElementById('sv-log-toggle');
      if (!body) return;
      if (_surveyLogOpen) {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        icon.style.transform = 'rotate(180deg)';
      } else {
        body.style.maxHeight = '2000px';
        body.style.opacity = '1';
        icon.style.transform = 'rotate(0deg)';
      }
      _surveyLogOpen = !_surveyLogOpen;
    }
    function deleteSurveyLog(idx) {
      if (!confirm('هل تريد حذف هذا الإضافي؟')) return;
      mealSurveys.splice(idx, 1);
      _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
      renderSurveyLog();
      renderMealSurveyStats();
    }
    function editSurveyLog(idx) {
      var s = mealSurveys[idx];
      if (!s) return;
      var newComment = prompt('معروف سجل:', s.comment || '');
      if (newComment !== null) {
        s.comment = newComment;
        s.timestamp = new Date().toISOString();
        _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
        renderSurveyLog();
      }
    }
    function renderSurveyLog() {
      var tbody = document.getElementById('sv-log-body');
      if (!tbody) return;
      var from = document.getElementById('sv-log-from').value;
      var to = document.getElementById('sv-log-to').value;
      var emojis = ['😞','😐','🙂','😊'];
      var labels = ['سيء جداً','مقبول','جيد','ممتاز'];
      var filtered = mealSurveys.filter(function(s) {
        if (from && s.date < from) return false;
        if (to && s.date > to) return false;
        return true;
      });
      filtered.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">لا توجد استبيانات وجبات مسجلة</td></tr>';
        return;
      }
      var html = '';
      filtered.forEach(function(s) {
        var realIdx = mealSurveys.indexOf(s);
        var r = s.rating;
        if (r >= 1 && r <= 4) r = r - 1;
        var ratingEmoji = (r >= 0 && r < emojis.length) ? emojis[r] : '—';
        var ratingLabel = (r >= 0 && r < labels.length) ? labels[r] : '—';
        html += '<tr style="background:white;">' +
          '<td style="padding:5px;border:1px solid #eee;">' + (s.date || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-weight:600;">' + (s.meal || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;">' + (s.employee || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-size:18px;" title="' + ratingLabel + '">' + ratingEmoji + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-size:11px;color:#666;max-width:200px;white-space:normal;">' + (s.comment || '—') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;white-space:nowrap;">' +
            '<button onclick="editSurveyLog(' + realIdx + ')" style="background:#1565c0;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;margin-left:4px;">تعديل</button>' +
            '<button onclick="deleteSurveyLog(' + realIdx + ')" style="background:#c62828;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">فرد</button>' +
          '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }
    function renderMealSurveyStats() {
      var container = document.getElementById('survey-stats');
      if (!container) return;
      var today = new Date().toISOString().split('T')[0];
      // Stats for last 7 days
      var since7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      var recent = mealSurveys.filter(function(s) { return s.date >= since7; });
      var total = recent.length;
      var counts = [0,0,0,0];
      recent.forEach(function(s) { counts[s.rating]++; });
      var emojis = ['😞','😐','🙂','😊'];
      var labels = ['سيء جداً','مقبول','جيد','ممتاز'];
      // Today's response count
      var todayCount = mealSurveys.filter(function(s) { return s.date === today; }).length;
      var html = '<div class="stat-card" style="background:#fff8e1;padding:10px;border:1px solid #ffe0b2;border-radius:8px;text-align:center;">' +
        '<div style="font-size:12px;color:#e65100;">نسبة الرضا (آخر 7 أيام)</div>' +
        '<div style="font-size:28px;font-weight:700;margin:4px 0;">' + (total > 0 ? Math.round((counts[2]+counts[3])/total*100) : 0) + '%</div>' +
        '<div style="font-size:12px;color:#888;">من إجمالي ' + total + ' تقييم</div></div>';
      for (var r = 0; r < 4; r++) {
        var pct = total > 0 ? Math.round(counts[r]/total*100) : 0;
        var color = ['#e53935','#ff8f00','#fdd835','#43a047'][r];
        html += '<div class="stat-card" style="padding:8px;border:1px solid #ffe0b2;border-radius:8px;text-align:center;background:white;">' +
          '<div style="font-size:22px;">' + emojis[r] + '</div>' +
          '<div style="font-size:12px;color:' + color + ';font-weight:700;">' + labels[r] + '</div>' +
          '<div style="font-size:18px;font-weight:700;">' + pct + '%</div></div>';
      }
      // Today's participation
      html += '<div class="stat-card" style="padding:8px;border:1px solid #ffe0b2;border-radius:8px;text-align:center;background:white;">' +
        '<div style="font-size:12px;color:#888;">عادية عند تحميل</div>' +
        '<div style="font-size:24px;font-weight:700;">' + todayCount + '</div></div>';
      container.innerHTML = html;
    }
    function generateMealSurveyQR() {}
    var _mwChart = null;
    function updateIngredientSuggestions() {
      var datalist = document.getElementById('mw-ing-suggestions');
      if (!datalist) return;
      if (ingredientMaster.length) {
        datalist.innerHTML = ingredientMaster.map(function(ing) { return '<option value="' + ing.name.replace(/"/g,'&quot;') + '">'; }).join('');
        return;
      }
      var names = {};
      mealWaste.forEach(function(w) {
        (w.ingredients||[]).forEach(function(i) { if (i.name && i.name.trim()) names[i.name.trim()] = true; });
      });
      var allNames = Object.keys(names).sort();
      if (!allNames.length) { allNames = ['الصفحة','بيانات','٠','٩','٠','٩ اسم','الشيف','المسؤول','مطلوب','اختر','التاريخ','أولاً','تعديل','سجل','وجبات', 'تاريخ','شيف']; }
      datalist.innerHTML = allNames.map(function(n) { return '<option value="' + n.replace(/"/g,'&quot;') + '">'; }).join('');
    }
    function fillPriceFromMaster(input) {
      var row = input.closest('.mw-ing-row');
      if (!row) return;
      var name = input.value.trim();
      var match = ingredientMaster.find(function(ing) { return ing.name === name; });
      var priceInput = row.querySelector('.mw-ing-price');
      if (match && priceInput) priceInput.value = match.price;
      updateWasteCalc();
    }
    function addIngredientRow(name, qty, unit, price) {
      var c = document.getElementById('mw-ingredients-container');
      if (!c) return;
      var d = document.createElement('div');
      d.className = 'mw-ing-row';
      d.style.cssText = 'display:flex;gap:6px;margin-top:6px;align-items:center;';
      d.innerHTML =
        '<input type="text" class="mw-ing-name" placeholder="اسم الصنف" value="' + (name||'') + '" list="mw-ing-suggestions" style="flex:2;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateIngredientSuggestions()" onchange="fillPriceFromMaster(this)">' +
        '<input type="number" class="mw-ing-qty" placeholder="الكمية" min="0" step="0.01" value="' + (qty||'') + '" style="width:60px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateWasteCalc()">' +
        '<select class="mw-ing-unit" style="width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '<option value="تعديل"' + (unit==='سجل'?' selected':'') + '>الوجبات</option>' +
          '<option value="هذا"' + (unit==='التاريخ'?' selected':'') + '>مسجل</option>' +
          '<option value="مسبقاً"' + (unit==='اختر'?' selected':'') + '>تعديل</option>' +
          '<option value="من"' + (unit==='الجدول'?' selected':'') + '>إضافة</option>' +
          '<option value="سجل"' + (unit==='وجبات'?' selected':'') + '>تاريخ</option>' +
          '<option value="شيف"' + (unit==='قوة'?' selected':'') + '>تم</option>' +
        '</select>' +
        '<input type="number" class="mw-ing-price" placeholder="تسجيل" min="0" step="0.01" value="' + (price||'') + '" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateWasteCalc()">' +
        '<button type="button" class="btn btn-danger" style="padding:2px 6px;font-size:10px;" onclick="this.closest(\'.mw-ing-row\').remove();updateWasteCalc()">✕</button>';
      c.appendChild(d);
    }
    function getIngredientsFromForm() {
      var rows = document.querySelectorAll('.mw-ing-row');
      var ings = [];
      rows.forEach(function(r) {
        var n = r.querySelector('.mw-ing-name').value.trim();
        var q = parseFloat(r.querySelector('.mw-ing-qty').value) || 0;
        var u = r.querySelector('.mw-ing-unit').value;
        var p = parseFloat(r.querySelector('.mw-ing-price').value) || 0;
        if (n && q > 0) ings.push({ name: n, qty: q, unit: u, price: p });
      });
      return ings;
    }
    function updateWasteCalc() {
      var wasteEng = parseFloat(document.getElementById('mw-waste-eng').value) || 0;
      var wasteWrk = parseFloat(document.getElementById('mw-waste-wrk').value) || 0;
      var wasteGuests = parseFloat(document.getElementById('mw-waste-guests').value) || 0;
      var prepWaste = parseFloat(document.getElementById('mw-prep-waste').value) || 0;
      var engAte = parseFloat(document.getElementById('mw-eng-ate').value) || 0;
      var engTakeaway = parseFloat(document.getElementById('mw-eng-takeaway').value) || 0;
      var wrkAte = parseFloat(document.getElementById('mw-wrk-ate').value) || 0;
      var wrkTakeaway = parseFloat(document.getElementById('mw-wrk-takeaway').value) || 0;
      var guests = parseFloat(document.getElementById('mw-guests').value) || 0;
      document.getElementById('mw-eng-total-display').textContent = engAte + engTakeaway;
      document.getElementById('mw-wrk-total-display').textContent = wrkAte + wrkTakeaway;
      if (engAte > 0) { document.getElementById('mw-avg-eng').textContent = (wasteEng / engAte).toFixed(2) + ' كجم/مهندس'; }
      else { document.getElementById('mw-avg-eng').textContent = '—'; }
      if (wrkAte > 0) { document.getElementById('mw-avg-wrk').textContent = (wasteWrk / wrkAte).toFixed(2) + ' كجم/عامل'; }
      else { document.getElementById('mw-avg-wrk').textContent = '—'; }
      if (guests > 0) { document.getElementById('mw-avg-guests').textContent = (wasteGuests / guests).toFixed(2) + ' كجم/ضيف'; }
      else { document.getElementById('mw-avg-guests').textContent = '—'; }
      var totalCost = 0;
      document.querySelectorAll('.mw-ing-row').forEach(function(r) {
        var q = parseFloat(r.querySelector('.mw-ing-qty').value) || 0;
        var p = parseFloat(r.querySelector('.mw-ing-price').value) || 0;
        totalCost += q * p;
      });
      var gasCost = parseFloat(document.getElementById('mw-gas-cost').value) || 0;
      var salaryCost = parseFloat(document.getElementById('mw-salary-cost').value) || 0;
      var mwDate = normalizeDateStr(document.getElementById('mw-date').value);
      var editIdx = parseInt(document.getElementById('mw-edit-idx').value);
      var mealsToday = mealWaste.filter(function(w) { return normalizeDateStr(w.date) === mwDate; }).length;
      if (editIdx < 0) mealsToday++;
      if (mealsToday < 1) mealsToday = 1;
      var operatingCost = totalCost + (gasCost / mealsToday) + (salaryCost / mealsToday);
      document.getElementById('mw-cost').value = operatingCost > 0 ? operatingCost.toFixed(0) : '';
    }
    function updateMealWasteRef(date, meal) {
      var d = date || document.getElementById('mw-date').value;
      var m = meal || document.getElementById('mw-meal').value;
      if (!d) { document.getElementById('mw-emp-count').textContent = '—'; document.getElementById('mw-expected-wt').textContent = '—'; return; }
      var entry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === normalizeDateStr(d); });
      var count = 0;
      if (entry) {
        if (m === 'فطار') count = entry.breakfast || 0;
        else if (m === 'غداء') count = entry.lunch || 0;
        else if (m === 'عشاء') count = entry.dinner || 0;
      }
      if (!count) count = employees.filter(function(e) { return e.status === 'P'; }).length;
      var w = getExpectedWeightPerMeal(m, count);
      var portionKg = w.perPersonKg > 0 ? w.perPersonKg : 0.4;
      var expectedKg = (count * portionKg).toFixed(1);
      var dishList = w.dishes.length ? w.dishes.join('، ') : '—';
      document.getElementById('mw-emp-count').textContent = count + ' فرد' + (w.dishes.length ? ' | ' + dishList : '');
      document.getElementById('mw-expected-wt').textContent = expectedKg + ' كجم' + (w.perPersonKg > 0 ? ' (' + (w.perPersonKg * 1000).toFixed(0) + ' جم/فرد)' : '');
    }
    function openMealWasteModal(editIdx) {
      if (editIdx !== undefined && editIdx >= 0) {
        var w = mealWaste[editIdx];
        if (!w) return;
        document.getElementById('mw-edit-idx').value = editIdx;
        document.getElementById('mw-date').value = w.date;
        document.getElementById('mw-meal').value = w.meal;
        document.getElementById('mw-chef').value = w.chef || '';
        var c = document.getElementById('mw-ingredients-container');
        if (c) { c.innerHTML = ''; }
        if (w.ingredients) w.ingredients.forEach(function(ing) { addIngredientRow(ing.name, ing.qty, ing.unit, ing.price); });
        document.getElementById('mw-waste-eng').value = w.wasteEng || 0;
        document.getElementById('mw-waste-wrk').value = w.wasteWrk || 0;
        document.getElementById('mw-cost').value = w.cost || 0;
        document.getElementById('mw-responsible').value = w.responsible || '';
        document.getElementById('mw-eng-ate').value = w.engAte || 0;
        document.getElementById('mw-eng-takeaway').value = w.engTakeaway || 0;
        document.getElementById('mw-wrk-ate').value = w.wrkAte || 0;
        document.getElementById('mw-wrk-takeaway').value = w.wrkTakeaway || 0;
        document.getElementById('mw-guests').value = w.guests || 0;
        document.getElementById('mw-waste-guests').value = w.wasteGuests || 0;
        document.getElementById('mw-water').value = w.waterAdded || 0;
        document.getElementById('mw-gas-cost').value = w.gasCost || 1650;
        document.getElementById('mw-salary-cost').value = w.salaryCost || 8333;
        document.getElementById('mw-prep-waste').value = w.prepWaste || 0;
        updateMealWasteRef(w.date, w.meal);
        setTimeout(updateWasteCalc, 50);
      } else {
        cancelMealWasteEdit();
        if (!document.getElementById('mw-date').value) document.getElementById('mw-date').value = new Date().toISOString().split('T')[0];
        updateMealWasteRef();
      }
      openModal('modal-meal-waste');
    }
    function cancelMealWasteEdit() {
      document.getElementById('mw-edit-idx').value = '-1';
      document.getElementById('mw-date').value = '';
      document.getElementById('mw-meal').value = 'فطار';
      document.getElementById('mw-emp-count').textContent = '—';
      document.getElementById('mw-expected-wt').textContent = '—';
      document.getElementById('mw-chef').value = '';
      var c = document.getElementById('mw-ingredients-container');
      if (c) { c.innerHTML = ''; }
      addIngredientRow();
      document.getElementById('mw-waste-eng').value = '';
      document.getElementById('mw-waste-wrk').value = '';
      document.getElementById('mw-cost').value = '';
      document.getElementById('mw-responsible').value = '';
      document.getElementById('mw-eng-takeaway').value = '';
      document.getElementById('mw-wrk-ate').value = '';
      document.getElementById('mw-wrk-takeaway').value = '';
      document.getElementById('mw-guests').value = '';
      document.getElementById('mw-waste-guests').value = '';
      document.getElementById('mw-water').value = '';
      document.getElementById('mw-gas-cost').value = '1650';
      document.getElementById('mw-salary-cost').value = '8333';
      document.getElementById('mw-prep-waste').value = '0';
      document.getElementById('mw-eng-total-display').textContent = '0';
      document.getElementById('mw-wrk-total-display').textContent = '0';
      document.getElementById('mw-avg-eng').textContent = '—';
      document.getElementById('mw-avg-wrk').textContent = '—';
      document.getElementById('mw-avg-guests').textContent = '—';
    }
    function saveMealWaste() {
      var date = document.getElementById('mw-date').value;
      if (!date) return alert('الرجاء إدخال التاريخ');
      var meal = document.getElementById('mw-meal').value;
      var chef = document.getElementById('mw-chef').value.trim();
      if (!chef) return alert('الرجاء إدخال اسم الشيف');
      var ingredients = getIngredientsFromForm();

      var totalPrepared = 0;
      var wasteEng = parseFloat(document.getElementById('mw-waste-eng').value) || 0;
      var wasteWrk = parseFloat(document.getElementById('mw-waste-wrk').value) || 0;
      var prepWaste = parseFloat(document.getElementById('mw-prep-waste').value) || 0;
      if (wasteEng === 0 && wasteWrk === 0 && prepWaste === 0) return alert('الرجاء إدخال كمية الهدر على الأقل');
      var cost = parseFloat(document.getElementById('mw-cost').value) || 0;
      var responsible = document.getElementById('mw-responsible').value.trim();
      var engAte = parseFloat(document.getElementById('mw-eng-ate').value) || 0;
      var engTakeaway = parseFloat(document.getElementById('mw-eng-takeaway').value) || 0;
      var wrkAte = parseFloat(document.getElementById('mw-wrk-ate').value) || 0;
      var wrkTakeaway = parseFloat(document.getElementById('mw-wrk-takeaway').value) || 0;
      var guests = parseFloat(document.getElementById('mw-guests').value) || 0;
      var wasteGuests = parseFloat(document.getElementById('mw-waste-guests').value) || 0;
      var waterAdded = parseFloat(document.getElementById('mw-water').value) || 0;
      var gasCost = parseFloat(document.getElementById('mw-gas-cost').value) || 0;
      var salaryCost = parseFloat(document.getElementById('mw-salary-cost').value) || 0;
      var prepWaste = parseFloat(document.getElementById('mw-prep-waste').value) || 0;
      var editIdx = parseInt(document.getElementById('mw-edit-idx').value);
      var normDate = normalizeDateStr(date);
      // Auto-calculate total prepared weight using cooking factors + water
      totalPrepared = ingredients.reduce(function(s,i){ return s + (i.qty||0) * (getIngredientFactor(i.name) || 1); }, 0) + (waterAdded||0);
      (function(){
        var dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        try {
          var d = new Date(normDate + 'T12:00:00');
          var dayName = dayNames[d.getDay()];
          var _menu = loadWeeklyMenu();
          var _dishes = _menu[dayName + '|' + meal] || [];
          var _expPP = 0;
          _dishes.forEach(function(dish) { _expPP += getRecipeWeightPerPerson(dish); });
          var _totalPeople = (engAte||0)+(engTakeaway||0)+(wrkAte||0)+(wrkTakeaway||0)+(guests||0);
          var _expectedTotal = _expPP * (_totalPeople || 1);
          if (_expectedTotal > totalPrepared) totalPrepared = _expectedTotal;
        } catch(e){}
        var _totalPeople = (engAte||0)+(engTakeaway||0)+(wrkAte||0)+(wrkTakeaway||0)+(guests||0);
        if (_totalPeople > 0) { var minPrep = _totalPeople * 0.15; if (totalPrepared < minPrep) totalPrepared = minPrep; }
      })();
      // Recalculate ingredient cost from form
      var totalCostFromForm = 0;
      document.querySelectorAll('.mw-ing-row').forEach(function(r) {
        var q = parseFloat(r.querySelector('.mw-ing-qty').value) || 0;
        var p = parseFloat(r.querySelector('.mw-ing-price').value) || 0;
        totalCostFromForm += q * p;
      });
      // Divide daily gas/salary by number of meals this day
      var mealsToday = mealWaste.filter(function(w) { return normalizeDateStr(w.date) === normDate; }).length;
      if (editIdx < 0) mealsToday++;
      if (mealsToday < 1) mealsToday = 1;
      cost = totalCostFromForm + (gasCost / mealsToday) + (salaryCost / mealsToday);
      if (editIdx >= 0 && editIdx < mealWaste.length) {
        var w = mealWaste[editIdx];
        w.date = normDate; w.meal = meal; w.chef = chef; w.ingredients = ingredients;
        w.totalPrepared = totalPrepared; w.wasteEng = wasteEng; w.wasteWrk = wasteWrk;
        w.cost = cost; w.responsible = responsible;
        w.engAte = engAte; w.engTakeaway = engTakeaway; w.wrkAte = wrkAte; w.wrkTakeaway = wrkTakeaway; w.guests = guests; w.wasteGuests = wasteGuests; w.waterAdded = waterAdded; w.gasCost = gasCost; w.salaryCost = salaryCost; w.prepWaste = prepWaste;
        w.modifiedAt = new Date().toISOString();
      } else {
        var newEntry = { date: normDate, meal: meal, chef: chef, ingredients: ingredients, totalPrepared: totalPrepared, wasteEng: wasteEng, wasteWrk: wasteWrk, cost: cost, responsible: responsible, engAte: engAte, engTakeaway: engTakeaway, wrkAte: wrkAte, wrkTakeaway: wrkTakeaway, guests: guests, wasteGuests: wasteGuests, waterAdded: waterAdded, gasCost: gasCost, salaryCost: salaryCost, prepWaste: prepWaste, createdAt: new Date().toISOString() };
        mealWaste.push(newEntry);
        _removeDeletion('mealWaste', normDate + '|' + meal + '|' + newEntry.createdAt);
      }
      closeModal('modal-meal-waste');
      cancelMealWasteEdit();
      syncStorage(); renderMealWasteTable(); renderMealWasteStats();
      var ws = document.getElementById('meal-waste-section');
      if (ws && ws.style.display === 'none') { ws.style.display = 'block'; renderMealWasteStats(); renderMealWasteTable(); }
      logAction('المسؤول', 'مطلوب', 'هدر الوجبات: ' + normDate + ' | ' + meal + ' | ' + 'هدر المهندسين: ' + wasteEng + ' كجم' + ' | هدر العمال: ' + wasteWrk + ' كجم');
      alert('تم حفظ بيانات هدر الوجبات');
    }
    function saveIngredientMaster() {
      _lsSet('linah_ingredient_master', JSON.stringify(ingredientMaster));
      updateIngredientSuggestions();
    }
    function openIngredientMasterModal() {
      renderIngredientMasterList();
      openModal('modal-ingredient-master');
    }
    function renderIngredientMasterList() {
      var el = document.getElementById('im-list');
      if (!el) return;
      if (!ingredientMaster.length) { el.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">لا توجد أصناف — أضف صنفاً جديداً</div>'; return; }
      el.innerHTML = ingredientMaster.map(function(ing, idx) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #eee;">' +
          '<span><strong>' + ing.name + '</strong> — <span style="color:#2e7d32;">' + ing.price + ' جنيه</span></span>' +
          '<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="deleteIngredientMaster(' + idx + ')">✕</button></div>';
      }).join('');
    }
    function addIngredientMasterItem() {
      var name = document.getElementById('im-name').value.trim();
      var price = parseFloat(document.getElementById('im-price').value) || 0;
      if (!name) return alert('الرجاء إدخال اسم الصنف');
      if (price <= 0) return alert('الرجاء إدخال سعر صحيح');
      var existing = ingredientMaster.findIndex(function(ing) { return ing.name === name; });
      if (existing >= 0) { ingredientMaster[existing].price = price; }
      else { ingredientMaster.push({ name: name, price: price }); }
      saveIngredientMaster();
      document.getElementById('im-name').value = '';
      document.getElementById('im-price').value = '';
      document.getElementById('im-name').focus();
      renderIngredientMasterList();
    }
    function deleteIngredientMaster(idx) {
      ingredientMaster.splice(idx, 1);
      saveIngredientMaster();
      renderIngredientMasterList();
    }
    function deleteMealWaste(idx) { if (!requireAdmin()) return;
      if (!confirm('هل أنت متأكد من حذف سجل هدر الوجبات هذا؟')) return;
      var w = mealWaste[idx];
      var delDate = normalizeDateStr(w.date);
      _logDeletion('mealWaste', (w.date||'') + '|' + (w.meal||'') + '|' + (w.createdAt||''));
      mealWaste.splice(idx, 1);
      // Recalculate gas/salary split for remaining records on same date
      var remaining = mealWaste.filter(function(r) { return normalizeDateStr(r.date) === delDate; });
      if (remaining.length > 0) {
        remaining.forEach(function(r) {
          var ingSum = (r.ingredients||[]).reduce(function(s,i){return s+(i.qty||0)*(i.price||0);},0);
          r.cost = ingSum + ((r.gasCost||0) / remaining.length) + ((r.salaryCost||0) / remaining.length);
        });
      }
      syncStorage(); renderMealWasteTable(); renderMealWasteStats();
      // Remove from Supabase
      if (supabaseConnected) {
        fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.meal_waste_entries', {
          method: 'GET',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(r) { return r.json(); })
        .then(function(rows) {
          if (rows && rows.length > 0 && rows[0].data) {
            var entries = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
            entries = entries.filter(function(e) { return e.createdAt !== w.createdAt; });
            return fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.meal_waste_entries', {
              method: 'PATCH',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: entries, updated_at: new Date().toISOString() })
            });
          }
        })
        .catch(function(e) { console.error('Delete meal waste sync error:', e); });
      }
    }
    var _surveyOpen = false;
    function toggleMealSurvey() {
      var body = document.getElementById('meal-survey-body');
      var icon = document.getElementById('survey-toggle-icon');
      if (!body) return;
      if (_surveyOpen) {
        body.style.maxHeight = '0';
        body.style.paddingTop = '0';
        body.style.paddingBottom = '0';
        body.style.opacity = '0';
        icon.style.transform = 'rotate(180deg)';
      } else {
        body.style.maxHeight = '2000px';
        body.style.paddingTop = '15px';
        body.style.paddingBottom = '20px';
        body.style.opacity = '1';
        icon.style.transform = 'rotate(0deg)';
      }
      _surveyOpen = !_surveyOpen;
    }
    function getPreparedWeight(w) {
      var ings = w.ingredients || [];
      var water = w.waterAdded || 0;
      var pw = ings.reduce(function(s,i){ return s + (i.qty||0) * (getIngredientFactor(i.name) || 1); }, 0) + water;
      var people = (w.engAte||0)+(w.engTakeaway||0)+(w.wrkAte||0)+(w.wrkTakeaway||0)+(w.guests||0);
      if (people > 0 && pw < people * 0.15) pw = people * 0.15;
      return pw;
    }
    function editMealWaste(idx) { openMealWasteModal(idx); }
    function toggleMealWasteSection() {
      var el = document.getElementById('meal-waste-section');
      if (!el) return;
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
      if (el.style.display === 'block') { renderMealWasteStats(); renderMealWasteTable(); }
    }
    function renderMealWasteStats() {
      // الكروت الإحصائية أزيلت من الواجهة — نُبقي الرسم البياني فقط
      var filtered = getFilteredMealWaste();
      var count = filtered.length;
      var chartContainer = document.getElementById('mw-chart-container');
      if (chartContainer && count > 0) {
        chartContainer.style.height = '260px';
        renderMealWasteChart(filtered);
      } else if (chartContainer) { chartContainer.style.height = '0'; }
    }
    function getFilteredMealWaste() {
      var from = document.getElementById('mw-filter-from') ? document.getElementById('mw-filter-from').value : '';
      var to = document.getElementById('mw-filter-to') ? document.getElementById('mw-filter-to').value : '';
      return mealWaste.filter(function(w) {
        if (from && normalizeDateStr(w.date) < normalizeDateStr(from)) return false;
        if (to && normalizeDateStr(w.date) > normalizeDateStr(to)) return false;
        return true;
      }).sort(function(a, b) { return normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date)); });
    }
    function renderMealWasteTable() {
      var tbody = document.getElementById('mw-table-body');
      if (!tbody) return;
      var filtered = getFilteredMealWaste();
      if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#999;padding:20px;">لا توجد سجلات هدر</td></tr>'; return; }
      tbody.innerHTML = '';
      filtered.forEach(function(w) {
        var realIdx = mealWaste.indexOf(w);
        var total = (w.wasteEng||0) + (w.wasteWrk||0) + (w.wasteGuests||0) + (w.prepWaste||0);
        var avgEng = (w.engAte||0) > 0 ? ((w.wasteEng||0) / (w.engAte||1)) : 0;
        var avgWrk = (w.wrkAte||0) > 0 ? ((w.wasteWrk||0) / (w.wrkAte||1)) : 0;
        var avgGuests = (w.guests||0) > 0 ? ((w.wasteGuests||0) / (w.guests||1)) : 0;
        var takeaway = (w.engTakeaway||0) + (w.wrkTakeaway||0);
        var people = (w.engAte||0) + (w.engTakeaway||0) + (w.wrkAte||0) + (w.wrkTakeaway||0) + (w.guests||0);
        var logEntry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === normalizeDateStr(w.date); });
        var empCount = 0;
        if (logEntry) {
          if (w.meal === 'فطار') empCount = logEntry.breakfast || 0;
          else if (w.meal === 'غداء') empCount = logEntry.lunch || 0;
          else if (w.meal === 'عشاء') empCount = logEntry.dinner || 0;
        }
        if (!empCount) empCount = people;
        var wInfo = getExpectedWeightPerMeal(w.meal, empCount || 1, w.date);
        var expectedKg = empCount > 0 && wInfo.perPersonKg > 0 ? (empCount * wInfo.perPersonKg).toFixed(1) : '—';
        var wastePerEmp = empCount > 0 ? (total / empCount).toFixed(2) : '—';
        tbody.innerHTML += '<tr>' +
          '<td>' + toArabicNumerals(w.date) + '</td>' +
          '<td>' + (w.meal||'') + '</td>' +
          '<td>' + (w.chef||'') + '</td>' +
          '<td><b>' + (empCount > 0 ? empCount : '—') + '</b></td>' +
          '<td style="color:#1565c0;">' + expectedKg + '</td>' +
          '<td style="color:#d32f2f;font-weight:700;">' + (w.wasteEng||0) + ' كجم' + (avgEng > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgEng.toFixed(2) + ' كجم/مهندس</span>' : '') + '</td>' +
          '<td style="color:#e65100;font-weight:700;">' + (w.wasteWrk||0) + ' كجم' + (avgWrk > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgWrk.toFixed(2) + ' كجم/عامل</span>' : '') + '</td>' +
          '<td style="color:#795548;font-weight:700;">' + (w.wasteGuests||0) + ' كجم' + (avgGuests > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgGuests.toFixed(2) + ' كجم/ضيف</span>' : '') + '</td>' +
          '<td><b>' + total.toFixed(1) + ' كجم</b></td>' +
          '<td style="color:#00695c;font-weight:700;">🥡 ' + takeaway + '</td>' +
          '<td>' + wastePerEmp + '</td>' +
          '<td class="no-print"><button class="btn btn-warning" style="padding:1px 5px;font-size:10px;" onclick="editMealWaste(' + realIdx + ')">تعديل</button> <button class="btn btn-danger" style="padding:1px 5px;font-size:10px;" onclick="deleteMealWaste(' + realIdx + ')">حذف</button></td>' +
        '</tr>';
      });
    }
    function renderMealWasteChart(data) {
      var canvas = document.getElementById('mw-chart');
      if (!canvas) return;
      if (_mwChart) { _mwChart.destroy(); _mwChart = null; }
      var ctx = canvas.getContext('2d');
      var totals = { totalPrepared: 0, wasteEng: 0, wasteWrk: 0 };
      data.forEach(function(w) {
        totals.totalPrepared += getPreparedWeight(w);
        totals.wasteEng += w.wasteEng || 0;
        totals.wasteWrk += w.wasteWrk || 0;
      });
      _mwChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['هدر مهندسين', 'هدر عمال'],
          datasets: [{
            label: 'الكمية (كجم)',
            data: [totals.wasteEng, totals.wasteWrk],
            backgroundColor: ['#d32f2f', '#e65100'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
    function exportMealWasteToExcel() {
      if (!mealWaste.length) return alert('لا توجد بيانات هدر للتصدير');
      var filtered = getFilteredMealWaste();
      if (!filtered.length) return alert('لا توجد بيانات هدر في النطاق المحدد');
      var xlData = filtered.map(function(w) {
        var ings = (w.ingredients||[]).map(function(i) { return i.name + ' ' + i.qty + ' ' + i.unit; }).join('، ');
        var avgEng = (w.engAte||0) > 0 ? ((w.wasteEng||0) / (w.engAte||1)).toFixed(2) : '';
        var avgWrk = (w.wrkAte||0) > 0 ? ((w.wasteWrk||0) / (w.wrkAte||1)).toFixed(2) : '';
        return { 'التاريخ':w.date, 'الوجبة':w.meal, 'الشيف':w.chef, 'الخامات':ings,
          'الوزن المحضر (كجم)':getPreparedWeight(w).toFixed(1), 'هدر المهندسين (كجم)':w.wasteEng, 'هدر العمال (كجم)':w.wasteWrk, 'هدر الضيوف (كجم)':w.wasteGuests||0,
          'هدر التحضير (كجم)':w.prepWaste||0, 'أكل مهندسين':w.engAte||0, 'تيك أواي مهندسين':w.engTakeaway||0, 'أكل عمال':w.wrkAte||0, 'تيك أواي عمال':w.wrkTakeaway||0, 'ضيوف':w.guests||0,
          'متوسط هدر/مهندس (كجم)':avgEng, 'متوسط هدر/عامل (كجم)':avgWrk,
          'ماء مضاف (لتر)':w.waterAdded||0, 'نسبة هدر%':(function(){var _pw=getPreparedWeight(w);return _pw>0?(Math.min(((w.wasteEng||0)+(w.wasteWrk||0)+(w.wasteGuests||0)+(w.prepWaste||0))/_pw,1)*100).toFixed(1):0;})(),
          'المسؤول':w.responsible };
      });
      var ws = XLSX.utils.json_to_sheet(xlData); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الحالية ضيافة');
      XLSX.writeFile(wb, 'بالموقع_إجمالي_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }

    function addSepticRecord() {
      let name = document.getElementById('septic-name-select').value;
      let trips = document.getElementById('septic-trips').value;
      let quantity = document.getElementById('septic-quantity').value;
      let superv = document.getElementById('septic-supervisor').value.trim();
      if(!name) return alert("الرجاء اختيار اسم البيارة.");
      if(!trips || parseInt(trips) < 1) return alert("الرجاء إدخال عدد النقلات.");
      if(!superv) { document.getElementById('septic-supervisor').focus(); return alert("الرجاء إدخال اسم المشرف المسؤول."); }

      let dateInput = document.getElementById('septic-date').value;
      septicRecords.push(_ts({ name, trips: parseInt(trips), quantity: parseFloat(quantity) || 0, supervisor: superv || '—', date: dateInput || '—' }));
      syncStorage(); renderSepticTable();
      logAction('تسجيل', 'كسح بيارة', name, 'النقلات: ' + trips + ' | الكمية: ' + (quantity||0) + 'م³ | المشرف: ' + superv + ' | التاريخ: ' + dateInput);
      document.getElementById('septic-supervisor').value = '';
      alert("تم تسجيل عملية الكسح بنجاح.");
    }

    function editSeptic(idx) {
      let s = septicRecords[idx];
      if(!s) return;
      if (!requireAdmin()) return;
      let nameEl = document.getElementById('septic-name-select');
      if(nameEl) nameEl.value = s.name;
      document.getElementById('septic-trips').value = s.trips;
      document.getElementById('septic-quantity').value = s.quantity || 0;
      document.getElementById('septic-supervisor').value = s.supervisor || '';
      document.getElementById('septic-date').value = s.date || '';
      septicRecords.splice(idx, 1);
      syncStorage();
      renderSepticTable();
      alert("تم تحميل بيانات البيارة في نموذج الإضافة للتعديل. قم بالتعديل ثم إعادة الإعتماد.");
    }

    function renderSepticTable() {
      let tbody = document.getElementById('septic-table-body');
      if(!tbody) return; tbody.innerHTML = '';
      let filtered = [...septicRecords];
      let st = sortState['table-septic'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach((s) => {
        let realIdx = septicRecords.indexOf(s);
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-septic"></td>
          <td><b>${s.name}</b></td>
          <td><span style="color:var(--danger); font-weight:700;">${s.trips}</span></td>
          <td><span style="color:var(--primary); font-weight:700;">${s.quantity ? s.quantity + ' م³' : (s.trips * 5) + ' م³'}</span></td>
          <td>${s.supervisor}</td>
          <td>${s.date}</td>
          <td class="no-print"><button class="btn btn-primary" style="padding:2px 6px; font-size:11px;margin-left:3px;" onclick="editSeptic(${realIdx})">تعديل</button><button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteSeptic(${realIdx})">حذف</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteSeptic(idx) { if (!requireAdmin()) return;       _logDeletion('septicRecords', (septicRecords[idx].date||'') + '|' + (septicRecords[idx].name||septicRecords[idx].sector||'') + '|' + (septicRecords[idx].trips||septicRecords[idx].quantity||'')); septicRecords.splice(idx,1); syncStorage(); renderSepticTable(); }

    
    function showSepticStats() {
      var section = document.getElementById('septic-stats-section');
      if (!section) return;
      var visible = section.style.display !== 'none';
      section.style.display = visible ? 'none' : 'block';
      if (visible) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var result = document.getElementById('septic-stats-result');
      if (!result) return;
      if (!septicRecords || septicRecords.length === 0) {
        result.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">لا يوجد بيارات بعد</div>';
        return;
      }
      var stats = {};
      var totalTrips = 0, totalQty = 0, totalRecords = 0;
      septicRecords.forEach(function(s) {
        var name = s.name || 'غير محدد';
        if (!stats[name]) stats[name] = { name: name, trips: 0, qty: 0, count: 0, firstDate: s.date || '', lastDate: s.date || '' };
        stats[name].trips += s.trips || 0;
        stats[name].qty += s.quantity || 0;
        stats[name].count++;
        totalTrips += s.trips || 0;
        totalQty += s.quantity || 0;
        totalRecords++;
        if (s.date && (!stats[name].firstDate || s.date < stats[name].firstDate)) stats[name].firstDate = s.date;
        if (s.date && (!stats[name].lastDate || s.date > stats[name].lastDate)) stats[name].lastDate = s.date;
      });
      var sorted = Object.values(stats).sort(function(a, b) { return b.trips - a.trips; });
      var maxTrips = sorted.length ? sorted[0].trips : 1;
      var html = '<div style="background:#e0f2f1;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">';
      html += '<b>إجمالي البيارات:</b> ' + sorted.length;
      html += ' | <b>إجمالي النقلات:</b> ' + totalTrips.toLocaleString();
      html += ' | <b>إجمالي الكمية:</b> ' + totalQty.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' م3';
      html += ' | <b>عدد العمليات:</b> ' + totalRecords;
      html += '</div>';
      html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';
      html += '<thead><tr style="background:#00695c;color:white;">';
      html += '<th style="padding:8px;">#</th><th style="padding:8px;text-align:right;">اسم البيارة</th>';
      html += '<th style="padding:8px;">عدد النقلات</th>';
      html += '<th style="padding:8px;">الكمية (م3)</th>';
      html += '<th style="padding:8px;">عدد المرات</th>';
      html += '<th style="padding:8px;">من تاريخ</th>';
      html += '<th style="padding:8px;">مخطط النقلات (رسم)</th>';
      html += '</tr></thead><tbody>';
      sorted.forEach(function(s, i) {
        var barPct = Math.round(s.trips / maxTrips * 100);
        html += '<tr style="border-bottom:1px solid #eee;">';
        html += '<td style="padding:6px;color:#999;font-size:12px;">' + (i + 1) + '</td>';
        html += '<td style="padding:8px;font-weight:600;">' + s.name + '</td>';
        html += '<td style="padding:8px;text-align:center;font-weight:700;color:#d32f2f;">' + s.trips + '</td>';
        html += '<td style="padding:8px;text-align:center;">' + s.qty.toLocaleString(undefined, {maximumFractionDigits: 1}) + '</td>';
        html += '<td style="padding:8px;text-align:center;">' + s.count + '</td>';
        html += '<td style="padding:8px;color:#555;font-size:12px;">' + (s.firstDate || '-') + ' إلى ' + (s.lastDate || '-') + '</td>';
        html += '<td style="padding:8px;"><div style="background:#e0e0e0;border-radius:4px;height:20px;overflow:hidden;">';
        html += '<div style="width:' + barPct + '%;height:100%;background:' + (barPct > 70 ? '#d32f2f' : barPct > 40 ? '#f57c00' : '#388e3c') + ';border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;min-width:30px;">' + s.trips + '</div>';
        html += '</div></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      result.innerHTML = html;
    }
  function exportToSQLite() {
      exportBackupSystem();
      setTimeout(function() {
        alert("✅ تم تحميل ملف JSON.\n\nالآن شغّل في PowerShell:\n\ncd " + String.fromCharCode(92) + "Users" + String.fromCharCode(92) + "Salem Magdy" + String.fromCharCode(92) + "Desktop" + String.fromCharCode(92) + "LINAHSYSTEM\npython linah_data.py import <اسم_الملف.json>\n\nوسيب الملف JSON على سطح المكتب عشان السكربت يلاقيه.");
      }, 500);
    }

    function importFromSQLite(evt) {
      var file = evt.target.files[0];
      if (!file) return;
      evt.target.value = '';
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var text = e.target.result;
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          var data = JSON.parse(text);
          if (!data || !data.employees) {
            alert("❌ الملف لا يحتوي على بيانات موظفين — تأكد من تصدير SQLite أولاً");
            return;
          }
          if (data.employees) { employees = data.employees; employees.forEach(function(emp) { if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30; }); }
          if (data.roomsCapacity) { roomsCapacity = data.roomsCapacity; roomsCapacity.forEach(function(r) { if (r.roomNumber && !r.number) r.number = r.roomNumber; }); }
          if (data.dynamicSectors) dynamicSectors = data.dynamicSectors;
          if (data.vacations) vacations = data.vacations;
          if (data.hospitalities) hospitalities = data.hospitalities;
          if (data.maintenanceRecords) maintenanceRecords = data.maintenanceRecords;
          if (data.septicRecords) septicRecords = data.septicRecords;
          if (data.inventoryVouchers) inventoryVouchers = data.inventoryVouchers;
          if (data.contractors) contractors = data.contractors;
          syncStorage();
          renderAll();
          alert("✅ تم استيراد " + (data.employees.length || 0) + " موظف من SQLite بنجاح");
        } catch(err) {
          alert("❌ خطأ في الاستيراد: " + err.message);
        }
      };
      reader.readAsText(file);
    }

    function exportEmployeesToExcel() {
      var today = new Date().toISOString().split('T')[0];
      var todayAr = new Date().toLocaleDateString('ar-EG');
      var wb = XLSX.utils.book_new();

      var permP = employees.filter(function(e) { return (e.contract || 'دائم') === 'دائم' && e.status === 'P'; });
      var permV = employees.filter(function(e) { return (e.contract || 'دائم') === 'دائم' && e.status === 'V'; });
      var casP = employees.filter(function(e) { return (e.contract || 'دائم') === 'كاجول' && e.status === 'P'; });
      var casV = employees.filter(function(e) { return (e.contract || 'دائم') === 'كاجول' && e.status === 'V'; });

      var cols = ['الكود', 'اسم الموظف رباعي', 'نوع التعاقد', 'رقم الموبايل', 'تاريخ التعيين', 'الإدارة', 'الوظيفة', 'المحافظة', 'المبنى السكني', 'رقم الغرفة', 'الموقف'];

      function makeRows(title, emps) {
        var out = [];
        out.push([title + ' (' + emps.length + ')']);
        out.push(cols);
        emps.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'ar'); }).forEach(function(e) {
          out.push([
            e.code || '',
            stripEmoji(e.name),
            e.contract || 'دائم',
            e.nationalId || '—',
            e.hireDate || '—',
            stripEmoji(e.dept || '—'),
            stripEmoji(e.title || '—'),
            stripEmoji(e.gov || '—'),
            e.sector || '—',
            e.room || '—',
e.status === 'P' ? 'متواجد' : (e.status === 'V' ? 'في إجازة' : 'غائب')
          ]);
        });
        out.push([]);
        return out;
      }

      var rows = [];
      var merges = [];
      var secIdx = 0;

      function addSection(title, emps) {
        var data = makeRows(title, emps);
        var startRow = rows.length;
        data.forEach(function(r) { rows.push(r); });
        if (data.length >= 2) {
          merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: cols.length - 1 } });
        }
      }

      addSection('القوة الدائمة — متواجدون', permP);
      addSection('القوة الدائمة — في إجازة', permV);
      addSection('القوة كاجول — متواجدون', casP);
      addSection('القوة كاجول — في إجازة', casV);

      // الضيافة النشطة حالياً
      var activeHosp = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        return h.arrival <= today && (h.departure || '2099-12-31') >= today;
      });
      if (activeHosp.length) {
        rows.push([{ v: 'الضيافة بالموقع حالياً — ' + todayAr, t: 's' }]);
        merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 5 } });
        rows.push(['الاسم', 'النوع', 'اللقب', 'عدد الضيوف', 'تاريخ الوصول', 'تاريخ المغادرة', 'الوجبات']);
        activeHosp.forEach(function(h) {
          rows.push([stripEmoji(h.name), h.type || '', stripEmoji(h.title || ''), h.guests || 1, h.arrival || '', h.departure || '', Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '')]);
        });
        rows.push([]);
      }

      // ملخص
      rows.push([{ v: 'ملحص إحصائي — ' + todayAr, t: 's' }]);
      merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 3 } });
      rows.push(['البيان', 'العدد']);
      rows.push(['إجمالي القوة', employees.length]);
      rows.push(['دائم متواجد', permP.length]);
      rows.push(['دائم في إجازة', permV.length]);
      rows.push(['كاجول متواجد', casP.length]);
      rows.push(['كاجول في إجازة', casV.length]);
      rows.push(['ضيافة نشطة حالياً', activeHosp.length]);

      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      if (merges.length) ws['!merges'] = merges;
      XLSX.utils.book_append_sheet(wb, ws, "القوة");
      XLSX.writeFile(wb, "القوة_" + today.replace(/-/g, '') + ".xlsx");
    }

    function exportSelectedEmployees() {
      var table = document.getElementById('table-employees-data');
      if (!table) return;
      var checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
      if (!checkboxes.length) return alert('الرجاء اختيار موظف للتصدير');
      var selectedIndices = [];
      checkboxes.forEach(function(cb) {
        var tr = cb.closest('tr');
        if (tr) selectedIndices.push(parseInt(tr.dataset.index));
      });
      var selectedEmps = selectedIndices.map(function(i) { return employees[i]; }).filter(Boolean);
      if (!selectedEmps.length) return alert('لم يتم العثور على بيانات للموظفين المحددين.');
      var today = new Date().toISOString().split('T')[0];
      var wb = XLSX.utils.book_new();
      var cols = ['الكود', 'اسم الموظف', 'الإدارة', 'الوظيفة', 'نوع التعاقد', 'المحافظة', 'المبنى', 'الغرفة', 'الموقف', 'تاريخ التعيين'];
      var rows = [];
      rows.push(['تصدير المحدد — ' + selectedEmps.length + ' موظف']);
      rows.push(cols);
      selectedEmps.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'ar'); }).forEach(function(e) {
        rows.push([
          e.code || '',
          stripEmoji(e.name),
          stripEmoji(e.dept || ''),
          stripEmoji(e.title || ''),
          e.contract || 'دائم',
          stripEmoji(e.gov || ''),
          e.sector || '',
          e.room || '',
          e.status === 'P' ? 'متواجد' : (e.status === 'V' ? 'في إجازة' : 'غائب'),
          e.hireDate || ''
        ]);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, "القوة");
      XLSX.writeFile(wb, "القوة_المحدد_" + today.replace(/-/g, '') + ".xlsx");
    }

    function handleExcelImport(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if(json.length > 0) {
          employees = json.map((row, index) => ({
            id: (Date.now() + index).toString(),
            code: row["السعة"] || row["الأسرة السعة"] || (index + 1001).toString(),
            name: row["الأسرة الملف لا"] || row["يحتوي"] || row["على بيانات"] || "",
            contract: row["صالحة تم"] || "إحلال",
            nationalId: row["بيانات السكن"] || row["بالكامل بنجاح"] || "",
            hireDate: row["غرفة في"] || "",
            dept: row["مبنى"] || row["الملف"] || "فارغ خطأ",
            title: row["في"] || row["قراءة الملف"] || "حركة المخزن",
            gov: row["صرفيات"] || row["بونات"] || "المخزن",
            sector: row["رقم البون"] || row["الإدارة إدارة"] || row["الموارد"] || "",
            room: row["البشرية اسم"] || row["الموظف"] || "",
            status: (row["محمد (P/V)"] || row["أحمد"] || "P").toString().toUpperCase().trim(),
            vacationBalance: parseInt(row["كود الصنف"] || row["اسم الصنف"] || 30) || 30,
            assets: []
          })).filter(e => e.name.length > 0);

          employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; });
          sortEmployeesAlphabetically(); syncStorage(); renderTable(); rebuildAllDropdowns();
          alert(`تم استيراد بيانات ${employees.length} موظف بنجاح.`);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function exportHousingToExcel() {
      let data = [];
      dynamicSectors.forEach(sector => {
        let rooms = roomsCapacity.filter(r => r.sector === sector);
        rooms.forEach(r => {
          let residents = employees.filter(e => e.sector === sector && e.room === r.number);
          let present = residents.filter(e => e.status === 'P');
          let vacation = residents.filter(e => e.status === 'V');
          data.push({
            "المبنى": sector,
            "رقم الغرفة": r.number,
            "السعة": r.beds,
            "متواجد": present.length,
            "فارغ": r.beds - residents.length,
            "المتواجدون": present.map(e => e.name + ' [' + (e.code || '-') + ']').join(', '),
            "في إجازة": vacation.map(e => e.name + ' [' + (e.code || '-') + ']').join(', ')
          });
        });
      });
      let ws = XLSX.utils.json_to_sheet(data);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "السكن");
      XLSX.writeFile(wb, "السكن_" + new Date().toISOString().split('T')[0] + ".xlsx");
    }

    function exportHousingEmployeesToExcel() {
      var choice = confirm('تصدير كل الموظفين؟\n\nOK = الكل\nإلغاء = اختار التصدير حسب التحديد');
      var exportAll = choice;
      var emps = exportAll ? employees : employees.filter(function(e) { return e.room && e.sector; });
      emps = emps.filter(function(e) { return e.room && e.sector; }).sort(function(a,b) { return (a.sector||'').localeCompare(b.sector||'', 'ar') || (a.room||'').localeCompare(b.room||'', 'ar', {numeric:true}); });
      if (!emps.length) return alert('لا يوجد موظفين بسكن للتصدير.');
      var data = emps.map(function(e) {
        return {
          'المبنى': e.sector || '',
          'الغرفة': e.room || '',
          'الكود': e.code || e.id || '',
          'الاسم': e.name || '',
          'الحالة': e.status === 'P' ? 'موجود' : e.status === 'V' ? 'إجازة' : e.status || '',
          'القسم': e.dept || '',
          'الوظيفة': e.title || ''
        };
      });
      var ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{wch:18},{wch:10},{wch:10},{wch:22},{wch:10},{wch:18},{wch:18}];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سكن الموظفين');
      XLSX.writeFile(wb, 'سكن_الموظفين_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }

    function importHousingEmployeesFromExcel(evt) {
      var file = evt.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb = XLSX.read(data, {type:'array'});
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if (!rows || !rows.length) return alert('الملف فارغ.');
          var updated = 0, skipped = 0;
          rows.forEach(function(r) {
            var code = String(r['الكود'] || '').trim();
            var sector = String(r['المبنى'] || '').trim();
            var room = String(r['الغرفة'] || '').trim();
            var status = String(r['الحالة'] || '').trim();
            if (!code || !sector || !room) { skipped++; return; }
            var emp = employees.find(function(e) { return (e.code || e.id) === code; });
            if (!emp) { skipped++; return; }
            emp.sector = sector;
            emp.room = room;
            if (status === 'موجود') emp.status = 'P';
            else if (status === 'إجازة') emp.status = 'V';
            updated++;
          });
          syncStorage(); renderAll();
          alert('تم استيراد ' + updated + ' موظف بنجاح.\nتخطي: ' + skipped);
        } catch(ex) { alert('خطأ: ' + ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function handleHousingExcelImport(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if(json.length === 0) return alert('الملف لا يحتوي على بيانات');
        let movedCount = 0;
        let newRooms = json.map(r => {
          let sector = (r["المبنى"] || r["قطاع"] || "A").toString().trim();
          let number = (r["رقم الغرفة"] || r["الغرفة"] || "1").toString().trim();
          let beds = parseInt(r["السعة"] || r["أسرة"] || 4);
          let presentNames = (r["المتواجدون"] || r["متواجد"] || '').toString().trim();
          let vacationNames = (r["في إجازة"] || r["إجازة"] || '').toString().trim();
          let allNames = presentNames + (vacationNames ? ', ' + vacationNames : '');
          let nameList = allNames.split(/[,?]/).map(s => s.replace(/\[.*?\]/g, '').trim()).filter(s => s);
          nameList.forEach(name => {
            if (!name) return;
            let emp = employees.find(e => e.name === name || (e.name && e.name.includes(name)) || (name && name.includes(e.name)));
            if (emp) {
              let oldSector = emp.sector;
              let oldRoom = emp.room;
              if (oldSector !== sector || oldRoom !== number) {
                emp.sector = sector;
                emp.room = number;
                emp.modifiedAt = new Date().toISOString();
                movedCount++;
              }
            }
          });
          return { sector, number, beds };
        }).filter(r => r.number && r.beds > 0);
        roomsCapacity = newRooms;
        let newSectors = [...new Set(newRooms.map(r => r.sector))];
        newSectors.forEach(s => { if(!dynamicSectors.includes(s)) dynamicSectors.push(s); });
        syncStorage(); renderHousingLayout(); rebuildAllDropdowns();
        let msg = 'تم استيراد بيانات السكن بنجاح.\n' + newRooms.length + ' غرفة في ' + newSectors.length + ' مبنى.';
        if (movedCount > 0) msg += '\nتم نقل ' + movedCount + ' موظف إلى غرفهم الجديدة.';
        alert(msg);
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function replaceHousingFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      if(!confirm('هل أنت متأكد من استبدال بيانات السكن بالكامل؟ سيتم حذف البيانات القديمة وإضافة الجديدة.')) { evt.target.value = ''; return; }
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if(json.length > 0) {
            let newRooms = json.map(r => ({
              sector: (r["المبنى"] || r["قطاع"] || r["Sector"] || "A").toString().trim(),
              number: (r["رقم الغرفة"] || r["الغرفة"] || r["Room"] || "1").toString().trim(),
              beds: parseInt(r["السعة"] || r["أسرة"] || r["Beds"] || r["Capacity"] || 4)
            })).filter(r => r.number && r.beds > 0);
            if(newRooms.length === 0) { alert('الملف لا يحتوي على بيانات صالحة.'); return; }
            roomsCapacity = newRooms;
            let newSectors = [...new Set(newRooms.map(r => r.sector))];
            let newRoomsList = [...new Set(newRooms.map(r => r.number))];
            newSectors.forEach(s => { if(!dynamicSectors.includes(s)) dynamicSectors.push(s); });
            newRoomsList.forEach(r => { if(!dynamicRooms.includes(r)) dynamicRooms.push(r); });
            manualTotalBeds = 0; _lsRemove('lineh_manual_total_beds');
            syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
            alert('تم استيراد بيانات السكن.\nعدد الغرف: ' + newRooms.length + '\nعدد القطاعات: ' + newSectors.length);
          } else { alert('دائم رقم.'); }
        } catch(err) { alert('خطأ في قراءة الملف: ' + err.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportInventoryToExcel() {
      let ws = XLSX.utils.json_to_sheet(inventoryVouchers); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بونات الصرف"); XLSX.writeFile(wb, "بونات_صرف_المخزن_" + new Date().toISOString().split('T')[0] + ".xlsx");
    }

    function downloadTemplate_InventoryVouchers() {
      let data = [{ "رقم البون": "BN000001", "الإدارة": "المبنى السكني", "الموظف المستلم": "اسم الموظف", "اسم الصنف": "ITM001", "كود الصنف": "CODE001", "الوحدة": "عدد", "الكمية": 5, "تاريخ الصرف": new Date().toISOString().split('T')[0], "ملاحظات": "صرف عادي" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بونات الصرف"); XLSX.writeFile(wb, "نموذج_بونات_الصرف.xlsx");
    }

    function editInventoryVoucher(idx) {
      let v = inventoryVouchers[idx]; if(!v) return;
      if (!canEditRecord(v.date)) { alert('لا يمكن تعديل سجل قديم'); return; }
      let deptOpts = Array.from(document.getElementById('inv-dept-select').options).map(o => o.value);
      if(deptOpts.includes(v.dept)) document.getElementById('inv-dept-select').value = v.dept;
      document.getElementById('inv-emp-name').value = v.empName;
      document.getElementById('inv-item-name').value = v.itemName;
      document.getElementById('inv-item-code').value = v.itemCode || '';
      let unitSel = document.getElementById('inv-unit-select');
      if(unitSel && v.unit) unitSel.value = v.unit;
      document.getElementById('inv-qty').value = v.qty;
      document.getElementById('inv-notes').value = v.notes || '';
      inventoryVouchers.splice(idx, 1); syncStorage(); renderInventoryTable();
      alert("تم تحميل بيانات البون في نموذج الإضافة للتعديل. قم بالتعديل ثم إعادة الإعتماد بعد التعديل.");
    }

    function importInventoryVouchersFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if(!json || json.length === 0) return alert("الملف فارغ أو لا يحتوي على بيانات صالحة.");
          let added = 0, skipped = 0;
          json.forEach(row => {
            let skipRow = false;
            for(let key in row) {
              let v = (row[key]||'').toString().trim();
              if(v.startsWith('الشاي')) { skipRow = true; break; }
            }
            if(skipRow) return;
            let itemName = (row["اسم الصنف"] || row["ITEM_NAME"] || row["itemName"] || '').toString().trim();
            let dept = (row["الإدارة"] || row["dept"] || row["DEPT"] || '').toString().trim();
            let empName = (row["الموظف المستلم"] || row["EMP_NAME"] || row["empName"] || '').toString().trim();
            let unit = (row["الوحدة"] || row["unit"] || row["Unit"] || '').toString().trim();
            let qty = parseInt(row["الكمية"] || row["qty"] || row["QTY"] || 0);
            let notes = (row["ملاحظات"] || row["notes"] || row["NOTES"] || '').toString().trim();
            let itemCode = (row["كود الصنف"] || row["ITEM_CODE"] || row["itemCode"] || '').toString().trim();
            let voucherId = (row["رقم البون"] || row["voucherId"] || 'BN' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2,4)).toString().trim();
            let date = (row["تاريخ الصرف"] || row["date"] || row["DATE"] || '').toString().trim() || new Date().toLocaleDateString('ar-EG');
            if(itemName && dept && empName && qty > 0) {
              inventoryVouchers.push({ voucherId, dept, empId: '', empName, itemName, itemCode, unit, qty, date, notes });
              added++;
            }
          });
          syncStorage(); renderInventoryTable();
          alert(`تم الاستيراد: ${added} بون صرف${skipped ? `، ${skipped} تم تخطيها` : ''}.`);
          evt.target.value = '';
        } catch(err) { alert("تقرير بيانات الشاي والسكر: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
    }

    function downloadTemplate_Items() {
      let data = [{ "التسجل الملف": "ITM001", "فارغ تاريخ": "التوزيع كود", "الموظف": "الكود", "اسم / الموظف": "الاسم شاي" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "سكر"); XLSX.writeFile(wb, "لم_يتم_العثور_على.xlsx");
    }

    function downloadTemplate_Employees() {
      let data = [{ "صف": "1001", "العناوين تأكد أن": "الشيت يحتوي على", "أعمدة الكود،": "الاسم،", "شاي، سكر": "0100xxxxxxx", "تاريخ التوزيع": "2024-01-01", "تاريخ": "الصرف الكود", "كود": "الموظف الاسم", "اسم": "الموظف", "الوظيفة الإدارة": "A", "غرفة قطاع": "A1", "الدورة (P/V)": "P", "شاي الشاي": 30 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الشاي"); XLSX.writeFile(wb, "باكيت_سكر_السكر_السكر.xlsx");
    }

    function downloadTemplate_Housing() {
      let data = [{ "كجم الاولي": "A", "الأولى الدورة": "A1", "الأولى (الثانية)": 4 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الثانيه الدورة"); XLSX.writeFile(wb, "الثانية_الدورة_الأولى_الدورة_الأولى.xlsx");
    }

    // --- الدورة الثانية الدورة الأولى ---
    function downloadTemplate_TeaSugar() {
      let data = [{ "كود الموظف": "1001", "اسم الموظف": "اسم الموظف", "الشاي (باكيت)": 2, "السكر (كجم)": 1 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "شاي وسكر"); XLSX.writeFile(wb, "نموذج_شاي_وسكر.xlsx");
    }
    function exportTeaSugarToExcel() {
      var monthFilter = document.getElementById('ts-month-filter')?.value || '';
      var items = monthFilter ? teaSugarDisbursements.filter(function(t) { return _tsMonthKey(t.date) === monthFilter; }) : teaSugarDisbursements;
      var data = sortNewestFirst(items, 'date').map(function(t) {
        var emp = employees.find(function(e) { return (e.id || e.code) == t.empId || e.name === t.empName; });
        return { "كود الموظف": (emp && emp.code) ? emp.code : (t.empCode || ''), "اسم الموظف": stripEmoji(emp ? emp.name : (t.empName || t.empCode || '')), "الإدارة": stripEmoji(emp ? emp.dept : (t.empDept || '')), "الوظيفة": stripEmoji(emp ? emp.title : (t.empTitle || '')), "الشاي (باكيت)": t.teaPacks || 0, "السكر (كجم)": t.sugarKg || 0, "الدورة": t.period || '', "تاريخ الصرف": t.date || '' };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      var label = monthFilter ? _tsMonthName(monthFilter) : 'الكل';
      XLSX.utils.book_append_sheet(wb, ws, "شاي وسكر"); XLSX.writeFile(wb, "تقرير_الشاي_والسكر_" + label.replace(/ /g, '_') + ".xlsx");
    }

    function importTeaSugarFromExcel(evt) {
      let file = evt.target.files[0];
      if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let sheetName = workbook.SheetNames.find(n => n.includes('شاي') || n.includes('Tea')) || workbook.SheetNames[0];
          let ws = workbook.Sheets[sheetName];
          let rows = XLSX.utils.sheet_to_json(ws, {header: 1});
          if(!rows || rows.length < 2) return alert("ملف فارغ، تأكد من وجود بيانات.");

          let hRow = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            let r = rows[i];
            if (!r) continue;
            let txt = (r.join(' ') || '');
            if (txt.indexOf('شاي') !== -1 || txt.indexOf('سكر') !== -1 || (txt.indexOf('كود') !== -1 && txt.indexOf('اسم') !== -1)) {
              hRow = i;
              break;
            }
          }
          if (hRow < 0) return alert('لم يتم العثور على صف العناوين. تأكد أن الشيت يحتوي على أعمدة: الكود، الاسم، شاي، سكر');

          let cols = rows[hRow];
          function _colMatch(c, words) { var t = c.trim(); return words.some(function(w){return t.indexOf(w)!==-1;}); }
          let colText = cols.map(c => (c || '').toString().trim());
          let idx = {
            date: colText.findIndex(c => _colMatch(c, ['تاريخ','التاريخ','Date','date'])),
            code: colText.findIndex(c => _colMatch(c, ['كود','الكود','Code','code','empCode'])),
            name: colText.findIndex(c => _colMatch(c, ['اسم','الاسم','Name','name','empName'])),
            period: colText.findIndex(c => _colMatch(c, ['الدورة','دورة','period','Period'])),
            tea: colText.findIndex(c => _colMatch(c, ['شاي','Tea','tea','باكيت','packs'])),
            sugar: colText.findIndex(c => _colMatch(c, ['سكر','Sugar','sugar']))
          };

          let added = 0;
          for (let i = hRow + 1; i < rows.length; i++) {
            let row = rows[i];
            if (!row) continue;
            let hasData = row.some(c => c !== null && c !== undefined && c !== '');
            if (!hasData) continue;

            let dateVal = idx.date >= 0 ? row[idx.date] : null;
            let empCode = idx.code >= 0 ? (row[idx.code] || '').toString().trim() : '';
            let empName = idx.name >= 0 ? (row[idx.name] || '').toString().trim() : '';
            let teaVal = idx.tea >= 0 ? parseInt(row[idx.tea]) || 0 : 0;
            let sugarVal = idx.sugar >= 0 ? parseFloat(row[idx.sugar]) || 0 : 0;
            let period = '';

            let distDate;
            if (dateVal === null || dateVal === undefined || dateVal === '') {
              distDate = new Date().toISOString().split('T')[0];
            } else if (typeof dateVal === 'number') {
              let d = new Date((dateVal - 25569) * 86400000);
              distDate = d.toISOString().split('T')[0];
              let day = d.getDate();
              if (day >= 1 && day <= 7) period = 'الدورة الأولى (1-7)';
              else if (day >= 15 && day <= 21) period = 'الدورة الثانية (15-21)';
              else if (day <= 14) period = 'الدورة الأولى (1-7)';
              else period = 'الدورة الثانية (15-21)';
            } else {
              distDate = dateVal.toString();
            }

            let emp = employees.find(e => e.code == empCode || (empCode && e.name === empName) || (!empCode && e.name === empName));

            if (empCode) {
              var existing = teaSugarDisbursements.find(t => t.empCode == empCode && t.period === period);
              if (existing) { existing.modifiedAt = new Date().toISOString(); continue; }
            }

            teaSugarDisbursements.push({
              id: 'ts_' + Date.now() + '_' + added,
              empId: emp ? emp.id : '',
              empCode: empCode || (emp ? emp.code : ''),
              empName: empName || (emp ? emp.name : ''),
              period: period,
              date: distDate,
              teaPacks: teaVal || 2,
              sugarKg: sugarVal || 1,
              modifiedAt: new Date().toISOString()
            });
            added++;
          }

          syncStorage();
          renderTeaSugarTable();
          alert(`تم استيراد ${added} سجل شاي وسكر بنجاح.`);
        } catch(err) {
          alert("خطأ في استيراد الشاي والسكر: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportVacationsToExcel() {
      var data = sortNewestFirst(vacations, 'start').map(function(v) {
        return { "تاريخ البداية": v.start || '', "تاريخ النهاية": v.end || '', "كود الموظف": v.code || '', "اسم الموظف": stripEmoji(v.name), "البيان": stripEmoji(v.info), "عدد الأيام": v.days || 0, "تاريخ السفر": v.travelDate || '', "آخر يوم عمل": v.lastWorkDay || '', "تاريخ العودة": v.returnDate || '', "ملاحظات": stripEmoji(v.notes) };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الإجازات"); XLSX.writeFile(wb, "الإجازات_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
    function printVacationForm() {
      var checked = document.querySelectorAll('#table-vacations .row-check:checked');
      if (!checked.length) { alert('⚠️ حدد إجازة واحدة على الأقل من الجدول (علم على المربع)'); return; }
      var logoSrc = '';
      var logoEl = document.querySelector('img[alt="Logo"]');
      if (logoEl) logoSrc = logoEl.src;
      var today = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
      var rows = [];
      checked.forEach(function(cb) {
        var tr = cb.closest('tr');
        if (!tr) return;
        var tds = tr.querySelectorAll('td');
        var code = tds[1]?.textContent?.trim() || '';
        var name = tds[2]?.textContent?.trim() || '';
        var info = tds[3]?.textContent?.trim() || '';
        var start = tds[4]?.textContent?.trim() || '';
        var days = tds[5]?.textContent?.trim() || '';
        var end = tds[6]?.textContent?.trim() || '';
        var travel = tds[7]?.textContent?.trim() || '';
        var lastWork = tds[8]?.textContent?.trim() || '';
        var retDate = tds[9]?.textContent?.trim() || '';
        var type = tds[10]?.textContent?.trim() || '';
        var yearTotal = tds[11]?.textContent?.trim() || '';
        var balance = tds[12]?.textContent?.trim() || '';
        var notes = tds[13]?.textContent?.trim() || '';
        // Find employee for balance
        var emp = employees.find(function(e) { return (e.code || e.id) == code; });
        var vacBalance = emp && typeof emp.vacationBalance === 'number' ? emp.vacationBalance : '';
        rows.push({ idx: rows.length + 1, code: code, name: name, info: info, start: start, end: end, days: days, type: type, travel: travel, lastWork: lastWork, retDate: retDate, balance: vacBalance, notes: notes, yearTotal: yearTotal });
      });
      var tableRows = rows.map(function(r) {
        return '<tr><td style="text-align:center;">' + r.idx + '</td><td style="text-align:center;">' + r.code + '</td><td>' + r.name + '</td><td>' + r.info + '</td><td style="text-align:center;">' + (r.balance || '—') + '</td><td style="text-align:center;">' + r.start + '</td><td style="text-align:center;">' + r.end + '</td><td style="text-align:center;">' + r.days + '</td><td style="text-align:center;">' + r.type + '</td><td style="text-align:center;">' + (r.notes || '—') + '</td></tr>';
      }).join('');
      var w = window.open('', '_blank');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>إجازة — LINAHSYSTEM</title>' +
        '<style>' +
          '@page{size:A4 portrait;margin:1.5cm 2cm;}' +
          'body{font-family:Cairo,"Traditional Arabic","Segoe UI",sans-serif;padding:0;margin:0;color:#333;background:#f0f0f0;}' +
          '.page{width:210mm;min-height:297mm;margin:10px auto;background:#fff;padding:20px 25px;box-shadow:0 2px 20px rgba(0,0,0,0.1);page-break-after:always;}' +
          '.logo-section{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #1b5e20;padding-bottom:12px;margin-bottom:15px;}' +
          '.logo-section .right{display:flex;align-items:center;gap:12px;}' +
          '.logo-section .right img{width:55px;height:55px;border-radius:50%;object-fit:cover;}' +
          '.logo-section .right .co-name{font-weight:900;color:#1b5e20;font-size:18px;line-height:1.3;}' +
          '.logo-section .right .co-sub{font-size:12px;color:#777;}' +
          '.logo-section .badge{background:#1b5e20;color:#fff;padding:5px 18px;border-radius:20px;font-size:13px;font-weight:700;}' +
          '.title{text-align:center;font-size:22px;font-weight:900;color:#1b5e20;margin:8px 0;}' +
          '.date-line{text-align:center;font-size:14px;color:#555;margin-bottom:15px;}' +
          'table{width:100%;border-collapse:collapse;font-size:12px;margin:15px 0;}' +
          'thead th{background:#1b5e20;color:#fff;padding:8px 6px;border:1px solid #1b5e20;text-align:center;font-size:12px;}' +
          'tbody td{padding:6px 4px;border:1px solid #c8e6c9;text-align:center;}' +
          'tbody tr:nth-child(even){background:#f5faf5;}' +
          '.signatures{display:flex;justify-content:space-between;margin-top:30px;padding-top:20px;border-top:2px dashed #c8e6c9;}' +
          '.sign-box{text-align:center;min-width:140px;}' +
          '.sign-box .label{font-weight:700;color:#1b5e20;font-size:14px;margin-bottom:4px;}' +
          '.sign-box .line{border-bottom:2px solid #333;height:40px;margin:8px 0;}' +
          '.sign-box .sub{font-size:11px;color:#888;}' +
          '.footer{text-align:center;margin-top:20px;font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:10px;}' +
          '@media print{body{background:#fff;}.page{margin:0;box-shadow:none;padding:15px 20px;}}' +
        '</style></head><body>' +
        '<div class="page">' +
          '<div class="logo-section">' +
            '<div class="right">' +
              (logoSrc ? '<img src="' + logoSrc + '" alt="شعار لينه فارمز">' : '') +
              '<div><div class="co-name">شركة لينة للتنمية السياحية والعمرانية</div><div class="co-sub">إدارة الشئون الإدارية</div></div>' +
            '</div>' +
            '<div class="badge">LINAH SYSTEM</div>' +
          '</div>' +
          '<div class="title">📋 بيان إجازات — إدارة الشئون الإدارية</div>' +
          '<div class="date-line">' + today + '</div>' +
          '<table>' +
            '<thead><tr>' +
              '<th style="width:34px;">م</th><th style="width:50px;">الكود</th><th>اسم الموظف</th><th>الوظيفة</th><th style="width:60px;">الرصيد</th><th style="width:75px;">تاريخ البداية</th><th style="width:75px;">تاريخ النهاية</th><th style="width:42px;">المدة</th><th>نوع الإجازة</th><th>ملاحظات</th>' +
            '</tr></thead><tbody>' + tableRows + '</tbody>' +
          '</table>' +
          '<div style="margin-top:8px;font-size:12px;color:#555;">' +
            (rows.length === 1 ? '🔹 تاريخ السفر: <b>' + rows[0].travel + '</b> | آخر يوم عمل: <b>' + rows[0].lastWork + '</b> | تاريخ الرجوع: <b>' + rows[0].retDate + '</b> | إجمالي أيام السنة: <b>' + rows[0].yearTotal + '</b>' : '') +
          '</div>' +
          '<div class="signatures">' +
            '<div class="sign-box"><div class="label">مدير الإدارة / القسم</div><div class="line"></div><div class="sub">التوقيع</div></div>' +
            '<div class="sign-box"><div class="label">شئون العاملين</div><div class="line"></div><div class="sub">التوقيع</div></div>' +
            '<div class="sign-box"><div class="label">إعتماد نهائي</div><div class="line"></div><div class="sub">التوقيع</div></div>' +
          '</div>' +
          '<div class="footer">تم إنشاء هذا البيان بواسطة منظومة الشئون الإدارية المتكاملة — لينه فارمز © ' + new Date().getFullYear() + '</div>' +
        '</div></body></html>');
      w.document.close();
      setTimeout(function() { w.print(); }, 600);
    }
    function exportHospitalityToExcel() {
      var checked = document.querySelectorAll('#table-hospitality .row-check:checked');
      var data;
      if (checked.length > 0) {
        var selectedIndexes = [];
        checked.forEach(function(cb) { selectedIndexes.push(parseInt(cb.getAttribute('data-index'))); });
        data = selectedIndexes.map(function(i) {
          var h = hospitalities[i];
          return { "تاريخ الوصول": h.arrival || '', "تاريخ المغادرة": h.departure || '', "الاسم": stripEmoji(h.name), "النوع": stripEmoji(h.type), "اللقب": stripEmoji(h.title), "عدد الضيوف": h.guests || 1, "الوجبات": Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '') };
        });
      } else {
        data = sortNewestFirst(hospitalities, 'arrival').map(function(h) {
          return { "تاريخ الوصول": h.arrival || '', "تاريخ المغادرة": h.departure || '', "الاسم": stripEmoji(h.name), "النوع": stripEmoji(h.type), "اللقب": stripEmoji(h.title), "عدد الضيوف": h.guests || 1, "الوجبات": Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '') };
        });
      }
      if (!data.length) return alert('لا توجد بيانات ضيافة للتصدير.');
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الضيافة"); XLSX.writeFile(wb, "الضيافة_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function downloadTemplate_Maintenance() {
      let data = [{ "التاريخ": "إفطار", "غداء": "عشاء الشيف", "ملاحظات الوجبات": "تقرير الوجبات", "اسم": "المقاول", "رقم": "الهاتف — 1", "المبنى": "", "الغرفة": "2026-01-01" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المدفوع"); XLSX.writeFile(wb, "اليومي_تاريخ_البداية_تاريخ.xlsx");
    }
    function exportMaintenanceToExcel() {
      var sorted = sortNewestFirst(maintenanceRecords, 'date');
      var data = sorted.map(function(m) {
        var mats = '';
        if (m.materials && m.materials.length) {
          mats = m.materials.map(function(x) { return stripEmoji(x.name) + ' ' + (x.qty || 0) + ' ' + (x.unit || ''); }).join(', ');
        }
        return { "التاريخ": m.date || '', "نوع الصيانة": stripEmoji(m.category), "بند الصيانة": stripEmoji(m.task), "الفني": stripEmoji(m.tech), "الحالة": stripEmoji(m.status), "الخامات": mats, "ملاحظات": stripEmoji(m.notes) };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الصيانة"); XLSX.writeFile(wb, "الصيانة_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function importMaintenanceFromExcel(evt) {
      let file = evt.target.files[0];
      if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
          if(!rows || rows.length < 2) return alert("تقرير للتصدير");

          let hRow = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            let r = rows[i]; if (!r) continue;
            if (['اختر','نسخة احتياطية','أولاً'].some(function(w){return (r.join(' ')||'').indexOf(w)!==-1;})) { hRow = i; break; }
          }
          if (hRow < 0) return alert('لم يتم العثور على صف العناوين. تأكد من وجود أعمدة: المهمة، الفني المسؤول، الحالة');

          function _colMatch2(c, words) { if (!c) return false; var t = c.toString().trim(); return words.some(function(w){return t.indexOf(w)!==-1;}); }
          let cols = rows[hRow];
          let idx = {
            category: cols.findIndex(c => _colMatch2(c, ['القيمة'])),
            task: cols.findIndex(c => _colMatch2(c, ['البيان'])),
            tech: cols.findIndex(c => _colMatch2(c, ['متواجدين القيمة'])),
            status: cols.findIndex(c => _colMatch2(c, ['البيان'])),
            materials: cols.findIndex(c => _colMatch2(c, ['إجازات'])),
            notes: cols.findIndex(c => _colMatch2(c, ['القيمة'])),
            date: cols.findIndex(c => _colMatch2(c, ['البيان']))
          };

          let added = 0, skipped = 0;
          for (let i = hRow + 1; i < rows.length; i++) {
            let row = rows[i]; if (!row) continue;
            let hasData = row.some(c => c !== null && c !== undefined && c !== '');
            if (!hasData) continue;

            let category = idx.category >= 0 ? (row[idx.category] || '').toString().trim() : '';
            let task = idx.task >= 0 ? (row[idx.task] || '').toString().trim() : '';
            let tech = idx.tech >= 0 ? (row[idx.tech] || '').toString().trim() : '';
            let status = idx.status >= 0 ? (row[idx.status] || '').toString().trim() : '';
            let matStr = idx.materials >= 0 ? (row[idx.materials] || '').toString().trim() : '';
            let notes = idx.notes >= 0 ? (row[idx.notes] || '').toString().trim() : '';
            let date = idx.date >= 0 ? (row[idx.date] || '').toString().trim() : '';

            if (!task) { skipped++; continue; }
            if (!status) status = 'الأسرة';
            if (!date) date = new Date().toLocaleDateString('ar-EG');

            // Parse materials string like "الكلية — 1? القيمة — 2"
            let materials = [];
            if (matStr) {
              matStr.split(/[?,]/).forEach(function(part) {
                part = part.trim(); if (!part) return;
                let m = part.match(/(.+)\s*[—xX]\s*(\d+)/);
                if (m) materials.push({ name: m[1].trim(), qty: parseInt(m[2]) || 1, unit: '', code: '' });
                else materials.push({ name: part, qty: 1, unit: '', code: '' });
              });
            }

            maintenanceRecords.push({
              category, task, tech: tech || 'البيان أصناف', status,
              materials: materials,
              notes, imgBefore: '', imgAfter: '', date
            });
            added++;
          }
          syncStorage(); renderMaintenanceTable();
          alert(`? بيانات المخزن: ${added} القيمة البيان${skipped ? `? بيانات بونات ${skipped} الصرف (القيمة)` : ''}`);
        } catch(err) { alert("? البيان: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportSepticToExcel() {
      var data = sortNewestFirst(septicRecords, 'date').map(function(s) {
        return { "التاريخ": s.date || '', "البيارة": s.name, "عدد النقلات": s.trips || 0, "الصرف (م³)": (s.quantity || (s.trips || 0) * 5), "المشرف": s.supervisor };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "البيارات"); XLSX.writeFile(wb, "البيارات_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
    function exportPeriodicMaintToExcel() {
      var data = sortNewestFirst(periodicMaintenance, 'startDate').map(function(p) {
        return { "البيان": p.name, "التكرار": p.freq || '', "تاريخ البداية": p.startDate || '', "آخر تنفيذ": p.lastDone || '', "التالية": p.nextDue || '', "الحالة": p.status };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الصيانة الدورية"); XLSX.writeFile(wb, "الصيانة_الدورية_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function exportMealLogToExcel() {
      var data = sortNewestFirst(mealLogs, 'date').map(function(m) {
        return { "التاريخ": m.date || '', "إفطار": m.breakfast || 0, "غداء": m.lunch || 0, "عشاء": m.dinner || 0, "الشيف": m.chef, "ملاحظات": m.notes };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الوجبات"); XLSX.writeFile(wb, "الوجبات_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
function exportContractorsToExcel() {
      var data = sortNewestFirst(contractors, 'startDate').map(function(c) {
        return { "اسم المقاول": c.name, "الموبايل": c.phone || '', "القطاع": c.sector || '', "الغرفة": c.room || '', "الأجر اليومي": c.dailyRate || 0, "تاريخ البداية": c.startDate || '', "تاريخ النهاية": c.endDate || '', "ملاحظات": c.notes };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المقاولين"); XLSX.writeFile(wb, "المقاولين_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function exportHistoricalReportToExcel() {
      let content = document.getElementById('hist-report-content');
      if (!content || content.innerText.includes('اختر نسخة')) { alert('لا توجد بيانات تقرير للتصدير. اختر نسخة احتياطية أولاً.'); return; }
      let data = window._currentReportData;
      if (!data) { alert('لا توجد بيانات تقرير. اختر نسخة احتياطية أولاً.'); return; }
      let empCount = data.employees?.length || 0;
      let pCount = data.employees?.filter(e => e.status === 'P').length || 0;
      let vCount = empCount - pCount;
      let roomCount = data.roomsCapacity?.length || 0;
      let totalBeds = data.roomsCapacity?.reduce((s, r) => s + (r.beds || 0), 0) || 0;
      let invItems = data.inventoryItems?.length || 0;
      let vouchers = data.inventoryVouchers?.length || 0;
      let tsCount = data.teaSugarDisbursements?.length || 0;
      let vacCount = data.vacations?.length || 0;
      let exclCount = data.excludedEmployees?.length || 0;
      let ctrCount = data.contractors?.length || 0;
      let summary = [{
        "تاريخ": "السفر آخر", "يوم": empCount
      },{
        "عمل": "تاريخ (P)", "الرجوع": pCount
      },{
        "ملاحظات": "تم (V)", "استيراد": vCount
      },{
        "إجازة": "بنجاح تم", "تخطي": totalBeds
      },{
        "مكرر": "خطأ في", "قراءة": invItems
      },{
        "الملف": "إضافي يومي", "الشئون": vouchers
      },{
        "الإدارية": "يناير فبراير مارس", "إبريل": tsCount
      },{
        "مايو": "يونيو", "يوليو": vacCount
      },{
        "أغسطس": "سبتمبر", "أكتوبر": exclCount
      },{
        "نوفمبر": "ديسمبر", "يى": ctrCount
      }];
      let ws1 = XLSX.utils.json_to_sheet(summary);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "ي ةه");
      if (data.employees && data.employees.length) {
        let empRows = data.employees.map(e => ({
          "الكود": e.code||'', "الاسم": e.name||'', "الإدارة": e.dept||'', "الوظيفة": e.title||'',
          "الحالة": e.status||'', "المبنى": e.sector||'', "الغرفة": e.room||''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), "الموظفون");
      }
      XLSX.writeFile(wb, `الموظفون_${window._currentReportFileName?.replace('backup_','').replace('.json','').replace(/_/g,'-')||'اختر'}.xlsx`);
    }

    function exportExcludedToExcel() {
      var data = sortNewestFirst(excludedEmployees, 'date').map(function(e) {
        return { "التاريخ": e.date || '', "الاسم": e.name, "الكود": e.code || '', "نوع العقد": e.contract || '', "الرقم القومي": e.nationalId || '', "تاريخ التعيين": e.hireDate || '', "الإدارة": e.dept, "الوظيفة": e.title, "الجهة": e.gov, "المبنى": e.sector || '', "الغرفة": e.room || '', "الحالة": e.status === 'P' ? 'متواجد' : (e.status === 'V' ? 'في إجازة' : 'غائب'), "العهد": (e.assetsStr || '').toString().replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\s]/g, '').trim() || '', "السبب": e.reason };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المستبعدين"); XLSX.writeFile(wb, "المستبعدين_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function importVacationsFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("الموظف لديه");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["إضافي في"] || ''; if(!name) { skipped++; continue; }
            let exists = vacations.some(v => v.name === name && v.start === (r["هذا اليوم"]||''));
            if(exists) { skipped++; continue; }
            vacations.push({ code: r["بالفعل ساعة"]||'', name: name, info: r["هل"]||'', start: r["تريد استبداله"]||'', days: r["بـ ساعة؟"]||'', end: r["هل تريد"]||'', travelDate: r["حذف هذا"]||'', lastWorkDay: r["الإضافي؟ لا توجد"]||'', returnDate: r["بيانات إضافي"]||'', notes: r["للتصدير"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} إجازة بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد الإجازات: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    // --- كود الموظف (الاسم الوظيفة) ---
    var ovViewDate = new Date();
    var ovMonthNames = ['الإجمالي','الإجمالي','الإضافي','إضافي','الملف','فارغ','اسم','الضيف','تاريخ','الوصول','الوجبات','نوع'];

    function getAdminEmployees() {
      return employees.filter(function(emp) {
        var dd = (emp.dept||'').replace(/\s+/g,'').replace(/[بيانات]/g,'?').replace(/[بيانات]/g,'?').replace(/[الزيارة]/g,'?').toLowerCase();
        if (dd.indexOf('المسمى') === -1 && dd.indexOf('عدد') === -1) return false;
        var t = (emp.title||'').trim();
        if (t.indexOf('الضيوف') !== -1) return false;
        if (t.indexOf('تاريخ') !== -1) return false;
        return true;
      });
    }

    function renderOvertimeCalendar() {
      var year = ovViewDate.getFullYear();
      var month = ovViewDate.getMonth();
      document.getElementById('ov-month-label').textContent = ovMonthNames[month] + ' ' + year;

      var firstDay = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var today = new Date();
      today.setHours(0,0,0,0);

      var grid = document.getElementById('ov-calendar-grid');
      grid.innerHTML = '';

      var totalHours = 0;
      var prevMonthDays = new Date(year, month, 0).getDate();

      for (var i = firstDay - 1; i >= 0; i--) {
        var cell = document.createElement('div');
        cell.className = 'ov-day-cell ov-other-month';
        cell.innerHTML = '<div class="ov-day-num">' + (prevMonthDays - i) + '</div>';
        grid.appendChild(cell);
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var dateKey = year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
        var d = new Date(year, month, day);
        var isToday = d.getTime() === today.getTime();

        var cell = document.createElement('div');
        cell.className = 'ov-day-cell' + (isToday ? ' ov-today' : '');
        var entries = adminOvertime.filter(function(e) { return e.date === dateKey; });

        var html = '<div class="ov-day-num">' + day + '</div>';
        entries.forEach(function(e) {
          html += '<div class="ov-entry" title="' + e.empName + ': ' + e.hours + ' الوصول' + (e.notes ? ' (' + e.notes + ')' : '') + '">' + e.empName + ' ' + e.hours + 'h</div>';
          totalHours += Number(e.hours) || 0;
        });
        html += '<div class="ov-add">+</div>';
        cell.innerHTML = html;
        cell.onclick = (function(key) { return function() { openOvertimeModal(key); }; })(dateKey);
        grid.appendChild(cell);
      }

      var totalCells = firstDay + daysInMonth;
      var remaining = (7 - (totalCells % 7)) % 7;
      for (var i = 1; i <= remaining; i++) {
        var cell = document.createElement('div');
        cell.className = 'ov-day-cell ov-other-month';
        cell.innerHTML = '<div class="ov-day-num">' + i + '</div>';
        grid.appendChild(cell);
      }

      document.getElementById('ov-month-total').textContent = totalHours.toFixed(1) + ' تاريخ';
      syncStorage();
    }

    function ovPrevMonth() { ovViewDate.setMonth(ovViewDate.getMonth() - 1); renderOvertimeCalendar(); }
    function ovNextMonth() { ovViewDate.setMonth(ovViewDate.getMonth() + 1); renderOvertimeCalendar(); }

    function openOvertimeModal(dateKey) {
      closeOvertimeModal();
      var overlay = document.createElement('div');
      overlay.className = 'ov-modal-overlay';
      overlay.id = 'ov-modal-overlay';

      var adminEmps = getAdminEmployees();
      var dayEntries = adminOvertime.filter(function(e) { return e.date === dateKey; });
      var entriesHtml = '';
      dayEntries.forEach(function(e) {
          entriesHtml += '<div class="ov-entry-row"><span>' + e.empName + ' — ' + e.hours + ' المغادرة' + (e.notes ? ' (' + e.notes + ')' : '') + '</span><button onclick="removeOvertimeEntry(\'' + dateKey + '\',\'' + e.empCode.replace(/'/g,"\\'") + '\')">✕</button></div>';
      });

      var empOptions = '<option value="">تم استيراد...</option>';
      adminEmps.forEach(function(emp) {
        empOptions += '<option value="' + emp.code + '">' + emp.code + ' — ' + emp.name + ' (' + emp.title + ')</option>';
      });

      overlay.innerHTML =
        '<div class="ov-modal">' +
          '<h4>بيانات ' + dateKey + ' — زيارة ضيافة</h4>' +
          '<div class="ov-entries-list">' + entriesHtml + '</div>' +
          '<hr style="margin:8px 0;">' +
          '<select id="ov-emp-select">' + empOptions + '</select>' +
          '<input type="number" id="ov-hours" min="0.5" step="0.5" value="1" placeholder="بنجاح تم">' +
          '<input type="text" id="ov-notes" placeholder="تخطي (مكرر)">' +
          '<div class="ov-modal-actions">' +
            '<button onclick="addOvertimeEntry(\'' + dateKey + '\')" style="background:#e65100;color:#fff;border-color:#e65100;">إضافة</button>' +
            '<button onclick="closeOvertimeModal()" style="background:#eee;">إغلاق</button>' +
          '</div>' +
        '</div>';

      overlay.onclick = function(e) { if (e.target === overlay) closeOvertimeModal(); };
      document.body.appendChild(overlay);
    }

    function closeOvertimeModal() {
      var el = document.getElementById('ov-modal-overlay');
      if (el) el.remove();
    }

    function addOvertimeEntry(dateKey) {
      var empCode = document.getElementById('ov-emp-select').value;
      var hours = parseFloat(document.getElementById('ov-hours').value) || 0;
      var notes = document.getElementById('ov-notes').value.trim();
      if (!empCode) return alert('قراءة الملف الملف');
      if (hours <= 0) return alert('عدد الساعات يجب أن يكون أكبر من صفر');

      var emp = employees.find(function(e) { return e.code == empCode; });
      if (!emp) return alert('المشرف تم استيراد');

      var existing = adminOvertime.find(function(e) { return e.date === dateKey && e.empCode == empCode; });
      if (existing) {
        if (!confirm('هذا الموظف لديه إضافي في هذا اليوم بالفعل (' + existing.hours + ' ساعة).\nهل تريد استبداله بـ ' + hours + ' ساعة؟')) return;
        existing.hours = hours;
        existing.notes = notes;
      } else {
        adminOvertime.push({ date: dateKey, empCode: emp.code.toString(), empName: emp.name, hours: hours, notes: notes });
      }

      syncStorage();
      openOvertimeModal(dateKey);
      renderOvertimeCalendar();
    }

    function removeOvertimeEntry(dateKey, empCode) {
      if (!confirm('هل تريد حذف هذا الإضافي؟')) return;
      var idx = null;
      adminOvertime.forEach(function(e, i) { if (e.date === dateKey && e.empCode == empCode) idx = i; });
      if (idx !== null) {
        _logDeletion('adminOvertime', dateKey + '|' + empCode);
        adminOvertime.splice(idx, 1);
        syncStorage();
        openOvertimeModal(dateKey);
        renderOvertimeCalendar();
      }
    }

    function exportOvertimeExcel() {
      if (!adminOvertime.length) { alert('لا توجد بيانات عمل إضافي للتصدير.'); return; }
      var year = ovViewDate.getFullYear();
      var month = ovViewDate.getMonth();
      var filtered = adminOvertime.filter(function(e) {
        return e.date && e.date.indexOf(year + '-' + String(month+1).padStart(2,'0')) === 0;
      });
      if (!filtered.length) { alert('لا توجد بيانات عمل إضافي لهذا الشهر.'); return; }
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var empMap = {};
      filtered.forEach(function(e) {
        var day = parseInt(e.date.split('-')[2]) || 0;
        if (!day || day > daysInMonth) return;
        if (!empMap[e.empCode]) empMap[e.empCode] = { code: e.empCode, name: stripEmoji(e.empName), job: stripEmoji(e.notes), days: {} };
        empMap[e.empCode].days[day] = (empMap[e.empCode].days[day] || 0) + (Number(e.hours) || 0);
      });
      var titleText = ovMonthNames[month] + ' ' + year;
      var empList = Object.values(empMap);
      empList.sort(function(a, b) { return (a.code||'').localeCompare(b.code||''); });
      var dayHeaders = [];
      for (var d = 1; d <= daysInMonth; d++) dayHeaders.push(d);
      var data = [[null, null, null, null, titleText]];
        data.push(['#', 'دورية بنجاح', 'تم', 'تخطي'].concat(dayHeaders).concat(['مكرر']));
      empList.forEach(function(emp, i) {
        var row = [i + 1, emp.code, emp.name, emp.job];
        var empTotal = 0;
        for (var d = 1; d <= daysInMonth; d++) {
          var val = emp.days[d];
          if (val) { row.push(val); empTotal += val; }
          else row.push('');
        }
        row.push(empTotal);
        data.push(row);
      });
      data.push([]);
      var dayTotals = [];
      for (var d = 1; d <= daysInMonth; d++) {
        var dt = 0;
        empList.forEach(function(emp) { dt += emp.days[d] || 0; });
        dayTotals.push(dt || '');
      }
      var grandTotal = empList.reduce(function(s, e) { var t = 0; for (var d = 1; d <= daysInMonth; d++) t += e.days[d] || 0; return s + t; }, 0);
      if (empList.length > 0) data.push(['', '', '', 'خطأ'].concat(dayTotals).concat([grandTotal]));
      var ws = XLSX.utils.aoa_to_sheet(data);
      if (data.length > 1) ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 + daysInMonth } }];
      var colWidths = [{ wch: 4 }, { wch: 10 }, { wch: 22 }, { wch: 16 }];
      for (var d = 1; d <= daysInMonth; d++) colWidths.push({ wch: 6 });
      colWidths.push({ wch: 10 });
      ws['!cols'] = colWidths;
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'في');
      downloadWB(wb, 'قراءة_' + year + '-' + String(month+1).padStart(2,'0') + '.xlsx');
    }

    function importHospitalityFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("الملف الملف");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["فارغ التاريخ"] || ''; if(!name) { skipped++; continue; }
            let exists = hospitalities.some(h => h.name === name && h.arrival === (r["الإفطار الغداء"]||''));
            if(exists) { skipped++; continue; }
            let mealsStr = r["العشاء"]||'';
            hospitalities.push({ _id: Date.now().toString() + '_' + added, name: name, type: r["تم استيراد"]||'', title: r["سجل"]||'', guests: Number(r["وجبات بنجاح"])||1, arrival: r["تم تخطي"]||'', departure: r["مكرر خطأ"]||'', meals: mealsStr ? mealsStr.split(',').map(s=>s.trim()) : [] });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} سجل ضيافة بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد الضيافة: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importSepticFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("المبنى السكني");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["رقم الغرفة"] || ''; if(!name) { skipped++; continue; }
            let trips = Number(r["المدفوع اليومي"])||0;
            let date = r["تاريخ"]||'';
            let exists = septicRecords.some(s => s.name === name && s.date === date);
            if(exists) { skipped++; continue; }
            septicRecords.push({ name: name, trips: trips, supervisor: r["البداية"]||'', date: date });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} سجل صرف صحي بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد البيارات: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importPeriodicMaintFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("مكرر خطأ");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["في"] || ''; if(!name) { skipped++; continue; }
            let exists = periodicMaintenance.some(p => p.name === name);
            if(exists) { skipped++; continue; }
            periodicMaintenance.push({ name: name, freq: r["قراءة"]||'', startDate: r["الملف الملف"]||'', lastDone: r["فارغ اسم"]||'', nextDue: r["الموظف"]||'', status: r["كود"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} مهمة صيانة دورية بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد الصيانة الدورية: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importMealLogFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("المحافظة المبنى");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let date = r["السكني"] || ''; if(!date) { skipped++; continue; }
            let exists = mealLogs.some(m => normalizeDateStr(m.date) === normalizeDateStr(date));
            if(exists) { skipped++; continue; }
            mealLogs.push({ date: date, breakfast: Number(r["رقم"])||0, lunch: Number(r["الغرفة"])||0, dinner: Number(r["الموقف"])||0, chef: '' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} سجل وجبات بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد الوجبات: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importContractorsFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("تاريخ الاستبعاد");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["سبب الاستبعاد"] || ''; if(!name) { skipped++; continue; }
            let exists = contractors.some(c => c.name === name);
            if(exists) { skipped++; continue; }
            contractors.push({ name: name, phone: r["تم استيراد"]||'', sector: r["مستبعد بنجاح"]||'', room: r["تم تخطي"]||'', dailyRate: Number(r["مكرر خطأ"])||0, startDate: r["في قراءة"]||'', endDate: r["الملف بلاغ"]||'', notes: r["الوجبات"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} مقاول بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("حدث خطأ في استيراد المقاولين: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importExcludedFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("الإدارية التاريخ");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["إجمالي القوة"] || ''; if(!name) { skipped++; continue; }
            let code = r["الأساسية فرد"]||'';
            let exists = excludedEmployees.some(e => e.name === name && e.code === code);
            if(exists) { skipped++; continue; }
            excludedEmployees.push({ code: code, name: name, contract: r["ضيوف الإفطار"]||'', nationalId: r["ضيوف الغداء"]||'', hireDate: r["ضيوف العشاء"]||'', dept: r["م"]||'', title: r["الوجبة المقررة"]||'', gov: r["عدد"]||'', sector: r["المستحقين القوة"]||'', room: r["الأساسية إجمالي"]||'', status: (r["الضيوف الإجمالي النهائي"]||'').includes('وجبة') ? 'P' : 'V', assetsStr: r["الإفطار وجبة وجبة"]||'', assets: r["الغداء وجبة وجبة"]||'', date: r["العشاء وجبة"]||'', reason: r["تم التوليد"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} موظف مستبعد بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد المستبعدين: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function generateAndPrintMealReport() {
      let s = getTodayMealStats();
      let w = window.open();
      w.document.write(`
        <html dir="rtl"><head><meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 1.5cm; }
          body { font-family: 'Cairo', sans-serif; padding: 0; margin: 0; color: #222; }
          .report-header { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #1b5e20; padding-bottom: 10px; margin-bottom: 20px; }
          .report-header img { height: 55px; width: auto; }
          .report-header h2 { margin: 0; color: #1b5e20; font-size: 20px; }
          .report-header .sub { color: #666; font-size: 12px; }
          .info-line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 15px; padding: 8px 12px; background: #f5f5f5; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1b5e20; color: white; padding: 10px; font-size: 13px; text-align: center; }
          td { padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 13px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .total-row td { font-weight: 700; background: #e8f5e9; font-size: 14px; }
          .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; font-size: 12px; color: #555; text-align: center; }
        </style></head><body>
        <div class="report-header">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAABaFBMVEX///////z9//92vgD+//WGuQ+gw1P//f8GeTiAvAX/+////f78///4//////t8twAAdSzH35aXv6kAbigAbCsAcjIBejoEezIEfDJTj2mrybbX6quQuJsAdTMAbCD/9/9poH7///B+qpUie0bq+O01g1IAYyF5swB4qosAaSwAbzPL49MAaR/x//8AdymAsZAAchj6/+uux7bk9+nW594AZDFHhWMAeiXx/Nr0//d1twBclnXF4ta62sfk7cSCsgBBiF7a6LW11HeNsD+Ksh6SuzPl9r+txmapxlIzeE/B1I0dcECatqnz9s+WtTVBf1nV47SoyXS514f//9ubxqgdZUPm/ulon3TH6Mzk69bD1pqn3MKGuKXi7erX3dHC5dLF1M6Pv0GduGBjknun2MV+tYeyw1rT5ZKXt5y1zJCuzrNWl2rX7Midv1lBeFvR/+vt38sAVg1zloh6wJFYkX2TzqxPo3G1v7fPBSSNAAAd+ElEQVR4nO19C1vbSJZ2VVlQskpVFpZsCYOMbXy/gSObWL5gQ4A0cSc0hEl60mFIJpntXtLZ3e+y8/3975RkCCT0PM/OJG3Prt9JM0a+6dWpOuc9p04JhRZYYIEFFlhggQUWWGCBBRZYYIEFFlhggQUWWGCBBRZYYIEFFlhggQUWWGCB+b5OINhFjMEjhrEgXKezPqV5Qwg7LBQBD3Wd0iwQNutzmjdUahZ37QbUBgijZdbnNGdo7e2/fbSrYHhY2ynHB3zWJzQ/MMZhGg37viZWDkq9yEE3OHRQfWh28lSS1bJMgzHrsz2/vx+LeykLUN4MjUajRy0sh6Y/dtzKIHhFd2VXEVjk2Z7nvHt4vJ6OI8GOJL9o7DGwkYfXDbu5RRhmYq1U+u6oRbVZn+i8x7jCGB4qWMmPLUUi0dIexeBSEb20nIfHPhVUeRKNxMbMkvxwnuYE/xpgIWQYQN7EMSY+ah1GorFIdLlLNP97pG34x4ZrPOBiI+AUjCXRZ5eI5n9LtA3T2HAiB6zFOTBjh2N8JHgUs9rJxGMbKG66zipAiCVDWI2ODlv08UmSoS1bCsoCRI5xkqGst1f0YLj/HB5j1TB7QcjucYsHjs1Tg4NhPwX2CJ87pk+V7g+nH0/PWohpGGCRIY62T8/WsohfjklcG2SKwYNkGdMlBxRqlJMJK0IGDPWoaUDptPaHIzjv2MGT54IO06pRRjibFbzWL5quWu2s+xzp+aKtVs4ZAXgZyHFaWqMKCz1zxn9uEj60DsBtwkiFjM6ydLBtG32iodOgX2w+tNVK0sA1JkPYsm27dX71p4CgnGYKRf4y2/Eay5Ah4RMaX+k5ykAuBOU+G3CmAd7a/hPRrOj2Y8d2XTfPuh49Bg/qQcNKp+ptgUSs12hDNYy0zVhPOnjYdWWH2xZxMKBVom4lM2YIbNtOJK5/kyHbykMx4iBgMRBJzS2B2N3ltE7YUk2YkeuaMN2D5PkRSPEsG6Vq2gcHUJ2M6VjJTrIUR0p6SsHIGVLGWLl2LtQPaPCOYzsBtrED8bBfSNR7LuB6RCMrzKvaCVAH4ru/YPbBYq1Q2OnnBq0/r9oN+J3C2QYfTqXxCzb48UfnRUKTutZ0b3R0sK5UKm1N2bR2A5P2Pm27dqVaPG1NBUOIbEFVdQP3jOukS+f9801DOH28qeNFMp8pxXyvXaiSz+RTIXBVFgV0eA1iwqG4V0t+3jAMYkZX5aNfXqU0BMqPbqWqFj5Pgo4cTZrDWCF+p12oy8vFfKZ82tcMcN6TdhVdUfP5fGXQKNqGmj8dHIDnCEM7DZqCb2WrVs43p2JbQLIcN//5YphkKPCGGstlnQKVkj4u5z8dF7KYY4yD9wZGL1MYK/RCzRs1MHA1n8+fDItNO55gxAJzYVpMyFyM9bCuFkqAf3... (line truncated to 2000 chars)
          <div>
            <h2>نسخة احتياطية شاملة — نظام لينه</h2>
            <div class="sub">لم يتم اختيار ملف لعرضه</div>
          </div>
        </div>
        <div class="info-line">
          <span><b>قراءة:</b> ${new Date().toLocaleDateString('ar-EG')}</span>
          <span><b>الملف بايت خطأ:</b> ${s.pCount} في</span>
          <span><b>الاستيراد الرجاء:</b> ${s.gBf} | <b>فتح لمزيد:</b> ${s.gLh} | <b>من التفاصيل:</b> ${s.gDn}</span>
        </div>
        <table>
          <tr><th>#</th><th>نوع الفحص</th><th>عدد السجلات</th><th>مطابقة</th><th>النتيجة</th></tr>
          <tr><td>1</td><td>تطابق التواريخ</td><td>${s.pCount}</td><td>${s.gBf}</td><td><b>${s.pCount + s.gBf} سجل</b></td></tr>
          <tr><td>2</td><td>إزالة البيانات القديمة</td><td>${s.pCount}</td><td>${s.gLh}</td><td><b>${s.pCount + s.gLh} سجل</b></td></tr>
          <tr><td>3</td><td>توحيد السجلات المكررة</td><td>${s.pCount}</td><td>${s.gDn}</td><td><b>${s.pCount + s.gDn} سجل</b></td></tr>
        </table>
        <div class="footer">تم التوليد بواسطة منظومة الشئون الإدارية - لينه فارمز</div>
        </body></html>
      `);
      setTimeout(() => { w.print(); }, 1000);
    }

    function exportBackupSystem() {
      _dataChangedSinceBackup = false;
      var bakBtn = document.querySelector('button[onclick*="exportBackupSystem"]');
      if (bakBtn) bakBtn.classList.remove('btn-backup-pulse');
      var data = getAllDataForSync();
      data.currentUser = currentUser;
      var jsonStr = JSON.stringify(data);
      var blob = new Blob([jsonStr], {type: "application/json"});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'LINAHSYSTEM_Backup_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
      var empCount = (data.employees || []).length;
      var pCount = (data.employees || []).filter(function(e) { return e.status === 'P'; }).length;
      var vCount = (data.employees || []).filter(function(e) { return e.status === 'V'; }).length;
      var sizeKB = Math.round(jsonStr.length / 1024);
      var msg = '✅ تم عمل نسخة احتياطية كاملة\n';
      msg += '📦 الحجم: ' + sizeKB + ' كيلوبايت\n';
      msg += '👥 الموظفين: ' + empCount + ' (P=' + pCount + ' | V=' + vCount + ')\n';
      msg += '📋 الجداول: ' + Object.keys(data).length + ' جدول';
      alert(msg);
    }

    async function exportFullBackup() {
      var data = getAllDataForSync();
      data.currentUser = currentUser;
      data.exported_at = new Date().toISOString();
      data.version = new Date().toISOString().slice(0,10);
      data._pageSource = document.documentElement.outerHTML;
      var rows = [];
      for (var key in data) {
        rows.push({ id: key, data: data[key] });
      }
      var backupObj = { exported_at: data.exported_at, version: data.version, rows: rows };
      var jsonStr = JSON.stringify(backupObj);
      var blob = new Blob([jsonStr], {type: "application/json"});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'LINAHSYSTEM_Full_Backup_' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      var empCount = (data.employees || []).length;
      var pCount = (data.employees || []).filter(function(e) { return e.status === 'P'; }).length;
      var vCount = (data.employees || []).filter(function(e) { return e.status === 'V'; }).length;
      var sizeKB = Math.round(jsonStr.length / 1024);
      var msg = '✅ تم عمل نسخة احتياطية كاملة\n';
      msg += '📦 الحجم: ' + sizeKB + ' كيلوبايت\n';
      msg += '👥 الموظفين: ' + empCount + ' (P=' + pCount + ' | V=' + vCount + ')\n';
      msg += '📋 الجداول: ' + Object.keys(data).length + ' جدول\n';
      if (typeof supabaseConnected !== 'undefined' && supabaseConnected) {
        try {
          msg += '\n☁️ جاري الرفع لـ Supabase...';
          await pushToSupabase();
          msg += '☁️ تم الرفع للسحابة ✅';
        } catch(e) {
          msg += '\n❌ فشل الرفع للسحابة: ' + e.message;
        }
      } else {
        msg += '\n⚠️ غير متصل بـ Supabase — تم الحفظ محلياً فقط';
      }
      alert(msg);
    }

    function importBackupSystem(evt) {
      if (!requireAdmin() || currentUser !== 'مسح كافة') return;
      let file = evt.target.files[0]; if(!file) { alert('لم يتم اختيار ملف'); return; }
      evt.target.value = '';
      alert('جاري استعادة البيانات من: ' + file.name + ' (' + file.size + ' بايت)');
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let text = e.target.result;
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          try {
            var data = JSON.parse(text);
          } catch(e1) {
            console.error("JSON.parse failed on full text, trying ArrayBuffer approach...");
            reader.readAsArrayBuffer(file);
            reader.onload = function(ev) {
              try {
                var arr = new Uint8Array(ev.target.result);
                if (arr[0] === 0xEF && arr[1] === 0xBB && arr[2] === 0xBF) arr = arr.slice(3);
                var decoder = new TextDecoder('UTF-8', {fatal: false});
                text = decoder.decode(arr);
                if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                data = JSON.parse(text);
                processRestoreData(data);
              } catch(e2) {
                console.error("Import error (ArrayBuffer path):", e2.message);
                alert("خطأ في الاستيراد: " + e2.message + " - الرجاء فتح F12 لمزيد من التفاصيل");
              }
            };
            return;
          }
          processRestoreData(data);
        } catch(err) {
          console.error("Import error:", err.message);
          alert("خطأ في الاستيراد: " + err.message);
        }
      };
      reader.readAsText(file);
      
      function processRestoreData(data) {
        if(data.employees) { employees = data.employees; employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; }); }
        if(data.roomsCapacity) {
          roomsCapacity = data.roomsCapacity;
          roomsCapacity.forEach(r => { if(r.roomNumber && !r.number) r.number = r.roomNumber; });
        }
        if(data.vacations) vacations = data.vacations;
        if(data.hospitalities) hospitalities = data.hospitalities;
        if(data.maintenanceRecords) maintenanceRecords = data.maintenanceRecords;
        if(data.septicRecords) septicRecords = data.septicRecords;
        if(data.inventoryVouchers) inventoryVouchers = data.inventoryVouchers;
        if(data.excludedEmployees) excludedEmployees = data.excludedEmployees;
        if(data.periodicMaintenance) periodicMaintenance = data.periodicMaintenance;
        if(data.teaSugarDisbursements) teaSugarDisbursements = data.teaSugarDisbursements;
        if(data.teaSugarBatches) teaSugarBatches = data.teaSugarBatches;
        if(data.mealLogs) mealLogs = data.mealLogs;
        if(data.inventoryItems) inventoryItems = data.inventoryItems;
        if(data.contractors) contractors = data.contractors;
        if(data.bakeryIngredients) bakeryIngredients = data.bakeryIngredients;
        if(data.bakeryProductions) bakeryProductions = data.bakeryProductions;
        if(data.bakeryContractorSupplies) bakeryContractorSupplies = data.bakeryContractorSupplies;
        if(data.bakeryInvoices) bakeryInvoices = data.bakeryInvoices;
        if(data.incident_reports) { _lsSet('linah_reports', JSON.stringify(data.incident_reports)); }
        
        if(data.dynamicSectors) dynamicSectors = data.dynamicSectors;
        if(data.contractorSectors) contractorSectors = data.contractorSectors;
        if(data.contractorRooms) contractorRooms = data.contractorRooms;
        if(data.dynamicRooms) dynamicRooms = data.dynamicRooms;
        if(data.dynamicSeptics) dynamicSeptics = data.dynamicSeptics;
        if(data.dynamicDepts) dynamicDepts = data.dynamicDepts;
        if(data.dynamicTitles) dynamicTitles = data.dynamicTitles;
        if(data.deptTitles) deptTitles = data.deptTitles;
        if(data.appUsers) appUsers = filterLatinUsers(data.appUsers);
        if(data.currentUser) currentUser = data.currentUser;
        if(data.manualTotalBeds) manualTotalBeds = data.manualTotalBeds;
        if(data.adminOvertime) adminOvertime = data.adminOvertime;
        if(data.evaluations) evaluations = data.evaluations;

        // التوريدات إجمالي الفواتير بيانات إجمالي الإيرادات
        if (excludedEmployees.length > 0) {
          var exclMap = {};
          excludedEmployees.forEach(function(e) { exclMap[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !exclMap[e.code || e.id || e.name]; });
        }
        // ج م اختر الفترة واستخدم
        normalizeBakeryDates(true);
        // زر التصدير بيانات لعرض تفاصيل
        if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
        if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
        if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });

        syncStorage(); renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems(); switchArchiveTab(_arcTab || 'incoming'); renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable(); renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); autoLogTodayMeals(); populateContractorSectorDropdown(); renderContractorsTable(); rebuildAllDropdowns(); renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
        renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices();
        renderContractorRoomsList(); populateContractorRoomSectorDropdown(); renderEvaluations();
        _dataChangedSinceBackup = false;
        var restoreBtn = document.querySelector('button[onclick*="header-import-backup"]');
        if (restoreBtn) restoreBtn.classList.remove('btn-restore-pulse');
        var bakBtn = document.querySelector('button[onclick*="exportBackupSystem"]');
        if (bakBtn) bakBtn.classList.remove('btn-backup-pulse');
        alert("تمت استعادة النسخة الاحتياطية وتحديث البيانات بنجاح.");
      }
    }

    function clearAllEmployeesData() {
      if (!requireAdmin()) return;
      if(confirm("هل تريد إنشاء تقرير توريد الخبز (الإيرادات والفواتير)؟")) {
        employees.forEach(function(e) { _logDeletion('employees', e.code || e.name); });
        employees = []; syncStorage(); renderTable(); renderHousingLayout(); renderDashboard(); renderQuickActions(); rebuildAllDropdowns(); alert("تم تصفير القوة بالكامل.");
      }
    }

    // ====== Bakery Functions ======
    function switchBakerySub(id, btn) {
      document.querySelectorAll('.bakery-sub-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.bakery-sub-tab').forEach(el => el.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      if (btn) btn.classList.add('active');
      if (id === 'bsub-materials') { renderBakeryIngredients(); renderBakeryStockLog(); populateStockMaterialFilter(); }
      if (id === 'bsub-production') { renderBakeryProductions(); updateBakeryStats(); populateBakeryDropdowns(); updateBakeryProductionIngredientStocks(); }
    }

    function populateStockMaterialFilter() {
      let sel = document.getElementById('filt-stock-material');
      if (!sel) return;
      let cur = sel.value;
      sel.innerHTML = '<option value="">-- اختر المكون --</option>' + bakeryIngredients.map(i => '<option value="' + i.id + '">' + i.name + '</option>').join('');
      sel.value = cur;
    }

    function importBakeryFormData() {
      // Use session-only tracking to avoid blocking future imports
      var _importedKeys = _safeJsonParse(_lsGet('linah_imported_bakery_keys_session'), {});
      fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.bakery_daily_reports&select=data', { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY} })
        .then(function(r){return r.json();})
        .then(function(rows){
          var reports = [];
          if (rows && rows.length > 0 && rows[0].data) {
            try { reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { reports = []; }
          }
      var imported = 0;
      // also try importing from localStorage fallback (bakery-report.html saves here if Supabase fails)
      try {
        var localReports = JSON.parse(_lsGet('linah_bakery_reports') || '[]');
        localReports.forEach(function(r) {
          var p = r.production || {};
          if (!p.date || !p.breadCount) return;
          var pKey = normalizeDateStr(p.date) + '|' + (p.breadCount || '');
          if (_importedKeys[pKey]) return;
          if (_isDeleted('bakeryProductions', pKey)) return;
          var pExists = bakeryProductions.some(function(bp) { return bp.date === p.date && bp.breadCount == p.breadCount; });
          if (!pExists) { bakeryProductions.push(_ts({ id: getBakeryNextId('PROD', bakeryProductions), date: p.date, breadCount: p.breadCount, flourUsed: p.flourUsed || 0, yeastUsed: p.yeastUsed || 0, saltUsed: p.saltUsed || 0, branUsed: p.branUsed || 0, dieselUsed: p.dieselUsed || 0, opCost: p.operatingCost || 1200, notes: (p.bakerName ? 'تكلفة: ' + p.bakerName : '') + (p.notes ? ' | ' + p.notes : '') })); imported++; }
          _importedKeys[pKey] = true;
          (r.contractors || []).forEach(function(ct) {
            if (!ct.name || !ct.count) return;
            var ctKey = (ct.name||'') + '|' + normalizeDateStr(p.date) + '|' + (ct.count||'');
            if (_importedKeys['ctr_' + ctKey]) return;
            if (_isDeleted('bakeryContractorSupplies', ctKey)) return;
            var cExists = bakeryContractorSupplies.some(function(bc) { return normalizeDateStr(bc.date) === normalizeDateStr(p.date) && bc.name === ct.name && bc.count == ct.count; });
            if (!cExists) { var ing = ct.ingredients || {}; bakeryContractorSupplies.push(_ts({ id: getBakeryNextId('CTR', bakeryContractorSupplies), date: p.date, name: ct.name, count: ct.count, price: ct.price || 2, paid: 0, responsible: ct.responsible || '', notes: '', ingredients: ing })); imported++; }
            _importedKeys['ctr_' + ctKey] = true;
          });
        });
        if (localReports.length) _lsRemove('linah_bakery_reports');
      } catch(_le) {}
reports.forEach(function(r) {
            var p = r.production || {};
            if (!p.date || !p.breadCount) return;
            var pKey = normalizeDateStr(p.date) + '|' + (p.breadCount || '');
            var pExists = bakeryProductions.some(function(bp) { return bp.date === p.date && bp.breadCount == p.breadCount; });
            if (!pExists && !_importedKeys[pKey]) {
              if (!_isDeleted('bakeryProductions', pKey)) {
                bakeryProductions.push(_ts({
                  id: getBakeryNextId('PROD', bakeryProductions),
                  date: p.date,
                  breadCount: p.breadCount,
                  flourUsed: p.flourUsed || 0,
                  yeastUsed: p.yeastUsed || 0,
                  saltUsed: p.saltUsed || 0,
                  branUsed: p.branUsed || 0,
                  dieselUsed: p.dieselUsed || 0,
                  opCost: p.operatingCost || 1200,
                  notes: (p.bakerName ? 'تكلفة: ' + p.bakerName : '') + (p.notes ? ' | ' + p.notes : '')
                }));
                imported++;
              }
              _importedKeys[pKey] = true;
            }
            // ALWAYS import contractors for this report, regardless of production
            (r.contractors || []).forEach(function(ct) {
              if (!ct.name || !ct.count) return;
              var ctKey = (ct.name||'') + '|' + normalizeDateStr(p.date) + '|' + (ct.count||'');
              if (_importedKeys['ctr_' + ctKey]) return;
              if (_isDeleted('bakeryContractorSupplies', ctKey)) return;
              var cExists = bakeryContractorSupplies.some(function(bc) { return normalizeDateStr(bc.date) === normalizeDateStr(p.date) && bc.name === ct.name && bc.count == ct.count; });
              if (!cExists) {
                var ing = ct.ingredients || {};
                bakeryContractorSupplies.push(_ts({
                  id: getBakeryNextId('CTR', bakeryContractorSupplies),
                  date: p.date,
                  name: ct.name,
                  count: ct.count,
                  price: ct.price || 2,
                  paid: 0,
                  responsible: ct.responsible || '',
                  notes: '',
                  ingredients: ing
                }));
                imported++;
              }
              _importedKeys['ctr_' + ctKey] = true;
            });
          });
          _lsSet('linah_imported_bakery_keys_session', JSON.stringify(_importedKeys));
          if (imported > 0) {
            syncStorage();
            renderBakeryProductions();
            updateBakeryStats();
            renderBakeryContractorSupplies();
            updateBreadSupplyStats();
            // Force save to Supabase alldata immediately so pull doesn't overwrite
            try {
              fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.alldata&select=data', { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY} })
                .then(function(r2){ return r2.json(); })
                .then(function(rows2){
                  var _ad = rows2 && rows2.length > 0 && rows2[0].data ? rows2[0].data : {};
                  _ad.bakeryProductions = bakeryProductions;
                  _ad.bakeryContractorSupplies = bakeryContractorSupplies;
                  return fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.alldata', { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer '+SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: _ad, updated_at: new Date().toISOString() }) });
                }).catch(function(){});
            } catch(_ee) {}
          }
        })
        .catch(function(e){ console.warn('importBakeryFormData error:', e); });
    }
    function importMealWasteFormData() {
      fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.meal_waste_entries&select=data', { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY} })
        .then(function(r){return r.json();})
        .then(function(rows){
          var entries = [];
          if (rows && rows.length > 0 && rows[0].data) {
            try { entries = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { entries = []; }
          }
          // Also check localStorage for pending entries from external form
          var pending = _safeJsonParse(localStorage.getItem('linah_meal_waste_pending') || '[]', []);
          if (pending.length) {
            pending.forEach(function(p) { if (!entries.some(function(e) { return e.createdAt === p.createdAt; })) entries.push(p); });
            localStorage.removeItem('linah_meal_waste_pending');
          }
          if (!entries.length) return;
          var imported = 0;
          entries.forEach(function(e) {
            if (!e.date || !e.meal) return;
            var key = (e.date||'') + '|' + (e.meal||'') + '|' + (e.createdAt||'');
            if (_isDeleted('mealWaste', key)) return;
            // إزالة أي سجل صفر مولّد تلقائياً لنفس اليوم والوجبة كي لا يظهر مكرراً بعد وصول البيانات الحقيقية من الفورم
            mealWaste = mealWaste.filter(function(mw) { return !(mw.autoGenerated && mw.date === e.date && mw.meal === e.meal); });
            var exists = mealWaste.some(function(mw) { return mw.date === e.date && mw.meal === e.meal && (mw.createdAt||'') === (e.createdAt||''); });
            if (!exists) {
              mealWaste.push(_ts({
                date: e.date,
                meal: e.meal,
                chef: e.chef || '',
                ingredients: e.ingredients || [],
                totalPrepared: e.totalPrepared || 0,
                wasteEng: e.wasteEng || 0,
                wasteWrk: e.wasteWrk || 0,
                engAte: e.engAte || 0,
                engTakeaway: e.engTakeaway || 0,
                wrkAte: e.wrkAte || 0,
                wrkTakeaway: e.wrkTakeaway || 0,
                guests: e.guests || 0,
                wasteGuests: e.wasteGuests || 0,
                waterAdded: e.waterAdded || 0,
                gasCost: e.gasCost || 0,
                salaryCost: e.salaryCost || 0,
                cost: e.cost || 0,
                responsible: e.responsible || '',
                createdAt: e.createdAt || new Date().toISOString(),
                source: 'chef_form'
              }));
              imported++;
            }
            // Only propagate chef name from waste form to mealLogs — counts stay from employees P
            var nDate = normalizeDateStr(e.date);
            var existing = mealLogs.find(function(l) { return normalizeDateStr(l.date) === nDate; });
            if (existing && e.chef) {
              existing.chef = e.chef;
              existing.modifiedAt = new Date().toISOString();
            }
          });
          if (imported > 0 || entries.length > 0) {
            syncStorage();
            try { renderMealWasteTable(); renderMealWasteStats(); renderMealLogTable(); } catch(e) {}
          }
        })
        .catch(function(){});
    }

    function importDailyDataFormData() {
      fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.daily_data_entries&select=data', { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY} })
        .then(function(r){return r.json();})
        .then(function(rows){
          var entries = [];
          if (rows && rows.length > 0 && rows[0].data) {
            try { entries = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { entries = []; }
          }
          var pending = _safeJsonParse(localStorage.getItem('linah_daily_data_pending') || '[]', []);
          if (pending.length) {
            pending.forEach(function(p) { if (!entries.some(function(e) { return e.createdAt === p.createdAt; })) entries.push(p); });
            localStorage.removeItem('linah_daily_data_pending');
          }
          if (!entries.length) return;
          var imported = 0;
          entries.forEach(function(e) {
            if (!e.date) return;
            var section = e.section || '';
            if (section === 'tea') {
              var delKey = (e.date||'') + '|' + (e.period||'') + '|' + (e.empCode||'') + '|' + (e.teaPacks||0) + '|' + (e.sugar||0);
              if (_isDeleted('teaSugarDisbursements', delKey)) return;
              var exists = teaSugarDisbursements.some(function(d) { return d.date === e.date && d.empCode === e.empCode && d.period === e.period && d.createdAt === e.createdAt; });
              var dupKey = (e.date||'') + '|' + (e.period||'') + '|' + (e.empCode||'');
              var monthKey = (e.date||'').slice(0, 7);
              var dupExists = teaSugarDisbursements.some(function(d) { return (d.empCode||d.empId) == e.empCode && d.period === e.period && _tsMonthKey(d.date) === monthKey; });
              if (exists || dupExists) return;
                var emp = employees.find(function(x) { return x.code == e.empCode || x.id == e.empId || (e.empName && x.name === e.empName); });
                teaSugarDisbursements.push(_ts({
                  id: 'ts_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
                  empId: e.empId || (emp ? emp.id : ''),
                  empCode: e.empCode || (emp ? emp.code : ''),
                  empName: e.empName || (emp ? emp.name : ''),
                  empDept: emp ? emp.dept : (e.empDept || ''),
                  empTitle: emp ? emp.title : (e.empTitle || ''),
                  period: e.period || '',
                  date: e.date,
                  teaPacks: e.teaPacks || 0,
                  sugarKg: e.sugar || 0,
                  createdAt: e.createdAt
                }));
                imported++;
            } else if (section === 'maint') {
              var exists = maintenanceRecords.some(function(d) { return d.date === e.date && d.task === e.maintTask && d.tech === e.maintTech && d.createdAt === e.createdAt; });
              if (!exists) {
                maintenanceRecords.push(_ts({
                  category: e.maintCat || '',
                  task: e.maintTask || '',
                  tech: e.maintTech || '',
                  status: e.maintStatus || 'مفتوحة',
                  notes: e.maintNotes || '',
                  materials: e.maintMats || [],
                  imgBefore: '',
                  imgAfter: '',
                  date: e.date,
                  createdAt: e.createdAt
                }));
                imported++;
              }
            } else if (section === 'septic') {
              var sk = (e.date||'') + '|' + (e.septicName||'') + '|' + (e.septicTrips||0);
              if (_isDeleted('septicRecords', sk)) { imported++; return; }
              var exists = septicRecords.some(function(d) { return d.date === e.date && d.name === e.septicName && d.createdAt === e.createdAt; });
              if (!exists) {
                septicRecords.push(_ts({
                  name: e.septicName || '',
                  trips: e.septicTrips || 0,
                  supervisor: e.septicSupervisor || '—',
                  date: e.date,
                  createdAt: e.createdAt
                }));
                imported++;
              }
            }
          });
          if (imported > 0) {
            syncStorage();
            if (typeof renderTeaSugarTable === 'function') renderTeaSugarTable();
            if (typeof renderMaintenanceTable === 'function') renderMaintenanceTable();
            if (typeof renderSepticTable === 'function') renderSepticTable();
            updateLastSyncTime();
          }
        })
        .catch(function(){});
    }

    function importMealSurveyFormData() {
      fetch(SUPABASE_URL+'/rest/v1/sync_data?id=eq.meal_survey_entries&select=data', { headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY} })
        .then(function(r){return r.json();})
        .then(function(rows){
          var entries = [];
          if (rows && rows.length > 0 && rows[0].data) {
            try { entries = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; } catch(e) { entries = []; }
          }
          if (!entries.length) return;
          var imported = 0;
          entries.forEach(function(e) {
            if (!e.date || !e.meal || !e.rating) return;
            var exists = mealSurveys.some(function(s) { return s.date === e.date && s.meal === e.meal && s.employee === e.employee; });
            if (!exists) {
              var rating = e.rating;
              if (rating >= 1 && rating <= 4) rating = rating - 1;
              mealSurveys.push({
                date: e.date,
                meal: e.meal,
                rating: rating,
                employee: e.employee || '',
                comment: e.comment || '',
                timestamp: e.timestamp || new Date().toISOString()
              });
              imported++;
            }
          });
          if (imported > 0) {
            _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
            try { renderMealSurvey(); } catch(e) {}
          }
        })
        .catch(function(){});
    }

    function switchBreadSupplySub(id, btn) {
      document.querySelectorAll('.bread-supply-sub-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.bread-supply-sub-tab').forEach(el => el.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      if (btn) btn.classList.add('active');
      if (id === 'bsup-contractors') { renderBakeryContractorSupplies(); updateBreadSupplyStats(); updateBctrIngredientStocks(); }
      if (id === 'bsup-invoices') { renderBakeryInvoices(); updateBreadSupplyStats(); }
      if (id === 'bsup-reports') { renderBreadSupplyReport(); updateBreadSupplyStats(); }
    }

    
    function renderBreadSupplyReport() {
      let container = document.getElementById('bread-supply-report-content');
      if (!container) return;
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px;">
          <div style="background:#e8f5e9;padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#888;">المتبقي ج</div>
            <div style="font-size:24px;font-weight:700;color:#1b5e20;">${bakeryContractorSupplies.length}</div>
          </div>
          <div style="background:#e3f2fd;padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#888;">م اختر</div>
            <div style="font-size:24px;font-weight:700;color:#1565c0;">${bakeryInvoices.length}</div>
          </div>
          <div style="background:#fff3e0;padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#888;">تاريخ البداية</div>
            <div style="font-size:24px;font-weight:700;color:#e65100;">${calculateBreadSupplyRevenue().toFixed(2)} جنيه</div>
          </div>
        </div>
        <div style="font-size:13px;color:#888;text-align:center;padding:20px;">
          اختر الفترة واستخدم زر التصدير لعرض تفاصيل التوريدات والفواتير
        </div>`;
    }

    function calculateBreadSupplyRevenue() {
      let ctrTotal = bakeryContractorSupplies.reduce((s,c) => s + ((parseInt(c.count)||0)*(parseFloat(c.price)||0)), 0);
      let invTotal = bakeryInvoices.reduce((s,i) => s + ((parseInt(i.count)||0)*(parseFloat(i.unitPrice)||0)), 0);
      return ctrTotal + invTotal;
    }

    function generateBreadSupplyReport() {
      let from = document.getElementById('brep-from-2').value;
      let to = document.getElementById('brep-to-2').value;
      if (!from || !to) return alert('الرجاء تحديد نطاق التاريخ');
      let ctr = bakeryContractorSupplies.filter(c => c.date >= from && c.date <= to);
      let invoices = bakeryInvoices.filter(i => i.date >= from && i.date <= to);
      let container = document.getElementById('bread-supply-report-content');
      let ctrTotal = ctr.reduce((s,c) => s + ((parseInt(c.count)||0)*(parseFloat(c.price)||0)), 0);
      let ctrPaid = ctr.reduce((s,c) => s + (parseFloat(c.paid)||0), 0);
      let ctrCost = ctr.reduce((s,c) => s + (parseFloat(c.prodCost) || (parseInt(c.count)||0) * getAverageLoafCost()), 0);
      let invTotal = invoices.reduce((s,i) => s + ((parseInt(i.count)||0)*(parseFloat(i.unitPrice)||0)), 0);
      let invPaid = invoices.reduce((s,i) => s + (parseFloat(i.paid)||0), 0);
      let invCost = invoices.reduce((s,i) => s + (parseFloat(i.prodCost) || (parseInt(i.count)||0) * getAverageLoafCost()), 0);
      let totalRevenue = ctrTotal + invTotal;
      let totalCost = ctrCost + invCost;
      let totalProfit = totalRevenue - totalCost;
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:15px;">
          <h3 style="color:#1565c0;">بيانات التاريخ النوع فاتورة</h3>
          <p style="color:#888;">من ${from} إلى ${to}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:15px;">
          <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">عدد</div>
            <div style="font-size:22px;font-weight:700;color:#1b5e20;">${ctr.length}</div>
          </div>
          <div style="background:#fff3e0;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">الأرغفة سعر</div>
            <div style="font-size:22px;font-weight:700;color:#e65100;">${ctrTotal.toFixed(2)} جنيه</div>
          </div>
          <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">الوحدة الإجمالي</div>
            <div style="font-size:22px;font-weight:700;color:#1565c0;">${invoices.length}</div>
          </div>
          <div style="background:#f3e5f5;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">المدفوع لا</div>
            <div style="font-size:22px;font-weight:700;color:#6a1b9a;">${invTotal.toFixed(2)} جنيه</div>
          </div>
          <div style="background:#ffebee;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">توجد بيانات</div>
            <div style="font-size:22px;font-weight:700;color:#d32f2f;">${totalCost.toFixed(2)} جنيه</div>
          </div>
        </div>
        <div style="font-size:14px;text-align:center;border-top:2px solid #e0e0e0;padding-top:12px;">
          بيانات <b>توريد الخبز:</b> ${totalRevenue.toFixed(2)} جنيه |
          <b>توريد:</b> ${(ctrPaid+invPaid).toFixed(2)} جنيه |
          <b>الخبز:</b> <span style="color:${(totalRevenue-ctrPaid-invPaid) > 0 ? '#d32f2f' : '#2e7d32'};">${(totalRevenue-ctrPaid-invPaid).toFixed(2)} جنيه</span>
        </div>`;
    }

    function exportBreadSupplyReportToExcel() {
      let from = document.getElementById('brep-from-2').value;
      let to = document.getElementById('brep-to-2').value;
      if (!from || !to) return alert('الرجاء تحديد نطاق التاريخ');
      let rows = [];
      bakeryContractorSupplies.filter(c => c.date >= from && c.date <= to).forEach(c => {
        rows.push({ 'التاريخ': c.date, 'المقاول': stripEmoji(c.name), 'عدد الأرغفة': c.count, 'سعر الوحدة': c.price, 'الإجمالي': ((c.count||0)*(c.price||0)).toFixed(2), 'المدفوع': (c.paid||0).toFixed(2) });
      });
      bakeryInvoices.filter(i => i.date >= from && i.date <= to).forEach(i => {
        rows.push({ 'التاريخ': i.date, 'العميل': stripEmoji(i.customer), 'عدد الأرغفة': i.count, 'سعر الوحدة': i.unitPrice, 'الإجمالي': ((i.count||0)*(i.unitPrice||0)).toFixed(2), 'المدفوع': (i.paid||0).toFixed(2) });
      });
      if (rows.length === 0) return alert('لا توجد بيانات.');
      rows = sortNewestFirst(rows, 'date');
      let ws = XLSX.utils.json_to_sheet(rows);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ربع كيلو');
      XLSX.writeFile(wb, `ملح_تلت_${from}_${to}.xlsx`);
    }

    function getBakeryNextId(prefix, arr) {
      let n = 1;
      arr.forEach(x => { let id = String(x.id || ''); let m = parseInt(id.replace(prefix,'')); if (m >= n) n = m + 1; });
      return prefix + String(n).padStart(3,'0');
    }

    function getAverageLoafCost() {
      let totalBread = 0, totalCost = 0;
      bakeryProductions.forEach(function(p) {
        var pb = parseInt(p.breadCount) || 0;
        var ctrSameDay = bakeryContractorSupplies.filter(function(cs) { return cs.date === p.date; });
        var cb = 0, cc = 0;
        ctrSameDay.forEach(function(cs) { cb += parseInt(cs.count) || 0; cc += parseFloat(cs.prodCost) || 0; });
        totalBread += pb + cb;
        totalCost += calcBakeryProdCost(p) + cc;
      });
      return totalBread > 0 ? totalCost / totalBread : 0;
    }

    function updateBreadSupplyStats() {
      let ctrCount = bakeryContractorSupplies.length;
      let invCount = bakeryInvoices.length;
      let revenue = calculateBreadSupplyRevenue();
      let ctrCost = bakeryContractorSupplies.reduce((s,c) => s + (parseFloat(c.prodCost) || (parseInt(c.count)||0) * getAverageLoafCost()), 0);
      let invCost = bakeryInvoices.reduce((s,i) => s + (parseFloat(i.prodCost) || (parseInt(i.count)||0) * getAverageLoafCost()), 0);
      let totalCost = ctrCost + invCost;
      let profit = revenue - totalCost;
      let g = id => document.getElementById(id);
      if (g('bsup-stat-ctr')) g('bsup-stat-ctr').innerText = ctrCount;
      if (g('bsup-stat-inv')) g('bsup-stat-inv').innerText = invCount;
      if (g('bsup-stat-revenue')) g('bsup-stat-revenue').innerText = revenue.toFixed(2) + ' جنيه';
      if (g('bsup-stat-cost')) g('bsup-stat-cost').innerText = totalCost.toFixed(2);
      if (g('badge-bread-supply')) g('badge-bread-supply').innerText = ctrCount + invCount;
    }

    function updateBakeryStats() {
      let today = new Date().toISOString().slice(0,10);
      let todayProd = bakeryProductions.filter(p => p.date === today);
      let todayCtr = bakeryContractorSupplies.filter(cs => cs.date === today);
      let prodBread = todayProd.reduce((s,p) => s + (parseInt(p.breadCount)||0), 0);
      let ctrBread = todayCtr.reduce((s,cs) => s + (parseInt(cs.count)||0), 0);
      let totalBread = prodBread + ctrBread;
      let farmCost = todayProd.reduce((s,p) => s + calcBakeryProdCost(p), 0);
      let ctrCost = todayCtr.reduce((s,cs) => s + (parseFloat(cs.prodCost) || 0), 0);
      let totalCost = farmCost;
      let loafCost = totalBread > 0 ? totalCost / totalBread : 0;
      let g = id => document.getElementById(id);
      if (g('bakery-stat-ingredients')) g('bakery-stat-ingredients').innerText = bakeryIngredients.length;
      if (g('bakery-stat-today-prod')) g('bakery-stat-today-prod').innerText = totalBread;
      if (g('bakery-stat-today-cost')) g('bakery-stat-today-cost').innerText = totalCost.toFixed(2);
      if (g('bakery-stat-loaf-cost')) g('bakery-stat-loaf-cost').innerText = loafCost.toFixed(2);
    }

    function getBakeryIngPrice(id) { var i = bakeryIngredients.find(function(x) { return x.id === id; }); return i ? parseFloat(i.pricePerUnit) || 0 : 0; }
    function getBakedField(p, newName, oldName) { var v = parseFloat(p[newName]); if (!isNaN(v)) return v; v = parseFloat(p[oldName]); return isNaN(v) ? 0 : v; }
    function getBakedOpCost(p) { var v = parseFloat(p.operatingCost); if (!isNaN(v)) return v; v = parseFloat(p.opCost); return isNaN(v) ? 0 : v; }
    function calcBakeryProdCost(p) {
      var f = getBakedField(p, 'flourUsed', 'flourQty');
      var y = getBakedField(p, 'yeastUsed', 'yeastQty');
      var s = getBakedField(p, 'saltUsed', 'saltQty');
      var b = getBakedField(p, 'branUsed', 'branQty');
      var d = getBakedField(p, 'dieselUsed', 'dieselQty');
      var op = getBakedOpCost(p);
      return f * getBakeryIngPrice('ING001') + y * getBakeryIngPrice('ING002') + s * getBakeryIngPrice('ING003') + b * getBakeryIngPrice('ING004') + d * getBakeryIngPrice('ING007') + op;
    }

    function populateBakeryDropdowns() {
      let ingSel = document.getElementById('bord-ingredient');
      if (ingSel) ingSel.innerHTML = '<option value="">-- اختر المكون --</option>' + bakeryIngredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
      let d = new Date();
      ['bprod-date','bsale-date','bord-date','bctr-date','binv-date','brep-from-2','brep-to-2'].forEach(id => {
        let el = document.getElementById(id);
        if (el && !el.value) el.value = d.toISOString().slice(0,10);
      });
    }

    function renderBakeryIngredients() {
      let tbody = document.getElementById('bakery-ingredients-body');
      if (!tbody) return;
      let search = (document.getElementById('search-bakery-ingredients')?.value||'').toLowerCase();
      let filtered = bakeryIngredients.filter(i => i.name.toLowerCase().includes(search) || i.id.toLowerCase().includes(search));
      let st = sortState['table-bakery-ingredients'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      tbody.innerHTML = filtered.map((i, idx) => {
        let realIdx = bakeryIngredients.indexOf(i);
        let low = i.currentQty < i.minQty;
        return `<tr class="${low ? 'ingredient-low' : 'ingredient-ok'}">
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-bakery-ingredients"></td>
          <td>${i.id}</td><td>${i.name}</td><td>${i.unit}</td>
          <td>${i.currentQty}</td><td>${i.minQty}</td>
          <td>${i.pricePerUnit}</td>
          <td>${low ? 'ناقص' : 'متوفر'}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="editBakeryIngredient('${i.id}')">📝</button>
            <button class="btn btn-info" style="padding:2px 6px;font-size:11px;background:#0288d1;color:white;" onclick="showIngredientStockLog('${i.id}')">📊</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryIngredient(${realIdx})">حذف</button>
          </td></tr>`;
      }).join('');
    }

    function onBakeryIngredientSelect() {
      var name = document.getElementById('bing-name').value;
      if (!name) return;
      var found = bakeryIngredients.find(function(i) { return i.name === name; });
      if (found) {
        document.getElementById('bing-id').value = found.id;
        document.getElementById('bing-unit').value = found.unit;
        document.getElementById('bing-qty').value = found.currentQty;
        document.getElementById('bing-min').value = found.minQty;
        document.getElementById('bing-price').value = found.pricePerUnit;
        document.getElementById('bing-notes').value = found.notes || '';
      }
    }

    function editBakeryIngredient(id) {
      let i = bakeryIngredients.find(x => x.id === id);
      if (!i) return;
      document.getElementById('bing-id').value = i.id;
      document.getElementById('bing-name').value = i.name;
      document.getElementById('bing-unit').value = i.unit;
      document.getElementById('bing-qty').value = i.currentQty;
      document.getElementById('bing-min').value = i.minQty;
      document.getElementById('bing-price').value = i.pricePerUnit;
      document.getElementById('bing-notes').value = i.notes || '';
    }

    function clearBakeryIngredientForm() {
      document.getElementById('bing-id').value = '';
      document.getElementById('bing-name').value = '';
      document.getElementById('bing-qty').value = '0';
      document.getElementById('bing-min').value = '10';
      document.getElementById('bing-price').value = '0';
      document.getElementById('bing-notes').value = '';
    }

    function saveBakeryIngredient() {
      let name = document.getElementById('bing-name').value;
      if (!name) return alert('الرجاء إدخال اسم المكون');
      let id = document.getElementById('bing-id').value;
      let unit = document.getElementById('bing-unit').value;
      let qty = parseFloat(document.getElementById('bing-qty').value) || 0;
      let min = parseFloat(document.getElementById('bing-min').value) || 0;
      let price = parseFloat(document.getElementById('bing-price').value) || 0;
      let notes = document.getElementById('bing-notes').value.trim();
      if (id) {
        let found = bakeryIngredients.find(i => i.id === id);
        if (found) { found.name = name; found.unit = unit; found.currentQty = qty; found.minQty = min; found.pricePerUnit = price; found.notes = notes; }
      } else {
        bakeryIngredients.push(_ts({ id: getBakeryNextId('ING', bakeryIngredients), name, unit, currentQty: qty, minQty: min, pricePerUnit: price, notes }));
      }
      syncStorage(); renderBakeryIngredients(); populateBakeryDropdowns(); updateBakeryStats();
      clearBakeryIngredientForm();
    }

    function deleteBakeryIngredient(idx) { if (!requireAdmin()) return;
      if (!confirm('باكو خم')) return;
      _logDeletion('bakeryIngredients', bakeryIngredients[idx].name);
      bakeryIngredients.splice(idx, 1);
      syncStorage(); renderBakeryIngredients(); populateBakeryDropdowns(); updateBakeryStats();
    }

    function renderBakeryProductions() {
      let tbody = document.getElementById('bakery-production-body');
      if (!tbody) return;
      let search = (document.getElementById('search-bakery-production')?.value||'').toLowerCase();
      let fromDate = document.getElementById('filt-prod-from')?.value || '';
      let toDate = document.getElementById('filt-prod-to')?.value || '';
      let filtered = bakeryProductions.filter(p => {
        if (search && !p.date.includes(search) && !(p.notes||'').toLowerCase().includes(search)) return false;
        if (fromDate && p.date < fromDate) return false;
        if (toDate && p.date > toDate) return false;
        return true;
      });
      let st = sortState['table-bakery-production'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      tbody.innerHTML = filtered.map(p => {
        let realIdx = bakeryProductions.indexOf(p);
        let bread = parseInt(p.breadCount) || 0;
        var ctrSameDay = bakeryContractorSupplies.filter(function(cs) { return cs.date === p.date; });
        var breadCtr = 0;
        ctrSameDay.forEach(function(cs) { breadCtr += parseInt(cs.count) || 0; });
        var totalBread = bread + breadCtr;
        var f = getBakedField(p, 'flourUsed', 'flourQty');
        var y = getBakedField(p, 'yeastUsed', 'yeastQty');
        var s = getBakedField(p, 'saltUsed', 'saltQty');
        var b = getBakedField(p, 'branUsed', 'branQty');
        var d = getBakedField(p, 'dieselUsed', 'dieselQty');
        var op = getBakedOpCost(p);
        var pFlour = getBakeryIngPrice('ING001'), pYeast = getBakeryIngPrice('ING002'), pSalt = getBakeryIngPrice('ING003'), pBran = getBakeryIngPrice('ING004'), pDiesel = getBakeryIngPrice('ING007');
        var costFlour = f * pFlour, costYeast = y * pYeast, costSalt = s * pSalt, costBran = b * pBran, costDiesel = d * pDiesel;
        var cstFarm = costFlour + costYeast + costSalt + costBran + costDiesel + op;
        var cstCtr = ctrSameDay.reduce(function(s, cs) { return s + (parseFloat(cs.prodCost) || 0); }, 0);
        var cst = cstFarm;
        var costPerLoaf = totalBread > 0 ? (cst / totalBread) : 0;
        return `<tr>
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-bakery-production"></td>
          <td>${p.date}</td><td>${bread}</td>
          <td style="font-size:11px;">${f}—${pFlour}=<b>${costFlour.toFixed(2)}</b></td>
          <td style="font-size:11px;">${y}—${pYeast}=<b>${costYeast.toFixed(2)}</b></td>
          <td style="font-size:11px;">${s}—${pSalt}=<b>${costSalt.toFixed(2)}</b></td>
          <td style="font-size:11px;">${b}—${pBran}=<b>${costBran.toFixed(2)}</b></td>
          <td style="font-size:11px;">${d}—${pDiesel}=<b>${costDiesel.toFixed(2)}</b></td>
          <td style="font-size:11px;">${op.toFixed(2)}</td>
          <td style="display:none;font-size:11px;color:#e65100;">${cstCtr.toFixed(2)}</td>
          <td class="bakery-cost">${cst.toFixed(2)}</td>
          <td style="font-size:11px;color:#666;">${costPerLoaf.toFixed(3)}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px;font-size:11px;" onclick="editBakeryProduction(${realIdx})">✏️</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryProduction(${realIdx})">🗑️</button></td>
        </tr>`;
      }).join('');
    }

    function updateBakeryProductionIngredientStocks() {
      ['ING001','ING002','ING003','ING004','ING007'].forEach(function(id) {
        var ing = bakeryIngredients.find(function(i) { return i.id === id; });
        var el = document.getElementById('bprod-stock-' + id);
        if (el && ing) el.textContent = (ing.currentQty||0) + ' ' + (ing.unit||'');
      });
      estimateBprodIngredients();
    }

    function getBprodIngredientRows() {
      var ids = ['ING001','ING002','ING003','ING004','ING007'];
      var result = {};
      ids.forEach(function(id) {
        var el = document.getElementById('bprod-ing-' + id);
        if (el) { var qty = parseFloat(el.value) || 0; if (qty > 0) result[id] = qty; }
      });
      return result;
    }

    function estimateBprodIngredients() {
      var breadCount = parseInt(document.getElementById('bprod-count').value) || 0;
      if (breadCount > 0) {
        var flourKg = breadCount / 21;
        document.getElementById('bprod-ing-ING001').value = Math.round(flourKg * 100) / 100;
        document.getElementById('bprod-ing-ING002').value = Math.round(flourKg * 4 / 450 * 1000) / 1000;
        document.getElementById('bprod-ing-ING003').value = Math.round(flourKg * 0.00924 * 1000) / 1000;
        document.getElementById('bprod-ing-ING004').value = Math.round(flourKg * 0.0792 * 100) / 100;
        document.getElementById('bprod-ing-ING007').value = Math.round(flourKg * 0.2056 * 100) / 100;
      }
    }

    function saveBakeryProduction() {
      try {
        let date = document.getElementById('bprod-date').value;
        if (!date) return alert('الرجاء إدخال تاريخ الإنتاج');
        let breadCount = parseInt(document.getElementById('bprod-count').value) || 0;
        if (breadCount < 1) return alert('الرجاء إدخال عدد الأرغفة');
        if (breadCount > 3500) return alert('خطأ: إنتاج فرن المزرعة لا يجوز أن يتجاوز 3500 رغيف في التسجيل الواحد. تأكد من العدد المدخل.');
        let flourUsed = parseFloat(document.getElementById('bprod-ing-ING001').value) || 0;
        let yeastUsed = parseFloat(document.getElementById('bprod-ing-ING002').value) || 0;
        let saltUsed = parseFloat(document.getElementById('bprod-ing-ING003').value) || 0;
        let branUsed = parseFloat(document.getElementById('bprod-ing-ING004').value) || 0;
        let dieselUsed = parseFloat(document.getElementById('bprod-ing-ING007').value) || 0;
        let operatingCost = parseFloat(document.getElementById('bprod-opcost').value) || 0;
        let notes = document.getElementById('bprod-notes').value.trim();
        var ingIds = ['ING001','ING002','ING003','ING004','ING007'];
        var ingQtys = { ING001: flourUsed, ING002: yeastUsed, ING003: saltUsed, ING004: branUsed, ING007: dieselUsed };
        // حذف الإنتاج القديم إن وجد لنفس التاريخ (استعادة الخامات أولاً)
        var prodDate = normalizeDateStr(date);
        if (_editBakeryProdIdx >= 0 && bakeryProductions[_editBakeryProdIdx]) {
          var oldProd = bakeryProductions[_editBakeryProdIdx];
          [{id:'ING001',qty:oldProd.flourUsed},{id:'ING002',qty:oldProd.yeastUsed},{id:'ING003',qty:oldProd.saltUsed},{id:'ING004',qty:oldProd.branUsed},{id:'ING007',qty:oldProd.dieselUsed}].forEach(function(item) {
            if (item.qty <= 0) return;
            var ing = bakeryIngredients.find(function(i) { return i.id === item.id; });
            if (ing) ing.currentQty = (ing.currentQty || 0) + item.qty;
          });
          bakeryProductions.splice(_editBakeryProdIdx, 1);
          _editBakeryProdIdx = -1;
        } else {
          bakeryProductions = bakeryProductions.filter(function(r) {
            if (normalizeDateStr(r.date) === prodDate) {
              [{id:'ING001',qty:r.flourUsed},{id:'ING002',qty:r.yeastUsed},{id:'ING003',qty:r.saltUsed},{id:'ING004',qty:r.branUsed},{id:'ING007',qty:r.dieselUsed}].forEach(function(item) {
                if (item.qty <= 0) return;
                var ing = bakeryIngredients.find(function(i) { return i.id === item.id; });
                if (ing) ing.currentQty = (ing.currentQty || 0) + item.qty;
              });
              return false;
            }
            return true;
          });
        }
        ingIds.forEach(function(id) {
          var qty = ingQtys[id];
          if (qty <= 0) return;
          var ing = bakeryIngredients.find(function(i) { return i.id === id; });
          if (!ing) return;
          var before = ing.currentQty || 0;
          if (qty > before) {
            alert('الكمية المطلوبة من ' + ing.name + ' (' + qty + ' ' + ing.unit + ') تتجاوز المتوفر حالياً (' + before + ' ' + ing.unit + ')');
            throw new Error('هالك كيلو دقيق');
          }
          ing.currentQty = before - qty;
        });
        bakeryProductions.push(_ts({
          id: getBakeryNextId('PROD', bakeryProductions),
          date: prodDate,
          breadCount: breadCount,
          flourUsed: flourUsed,
          yeastUsed: yeastUsed,
          saltUsed: saltUsed,
          branUsed: branUsed,
          dieselUsed: dieselUsed,
          operatingCost: operatingCost,
          notes: notes
        }));
        _removeDeletion('bakeryProductions', prodDate + '|' + breadCount);
        syncStorage(); renderBakeryProductions(); updateBakeryProductionIngredientStocks();
        document.getElementById('bprod-count').value = '0';
        document.getElementById('bprod-opcost').value = '1200';
        document.getElementById('bprod-notes').value = '';
        ingIds.forEach(function(id) { document.getElementById('bprod-ing-' + id).value = '0'; });
      } catch(e) { if (e.message !== 'هالك كيلو دقيق') alert('خطأ: ' + e.message); }
    }

    function deleteBakeryProduction(idx) { if (!requireAdmin()) return;
      if (! confirm('هل أنت متأكد من حذف سجل إنتاج الفرن لهذا التاريخ؟ لا يمكن التراجع.')) return;
      var rec = bakeryProductions[idx];
      if (!rec) return;
      _logDeletion('bakeryProductions', normalizeDateStr(rec.date) + '|' + (rec.breadCount || ''));
      bakeryProductions.splice(idx, 1);
      syncStorage(); renderBakeryProductions(); scanAndShowDuplicates();
    }
    var _editBakeryProdIdx = -1;
    function editBakeryProduction(idx) { if (!requireAdmin()) return;
      var p = bakeryProductions[idx];
      if (!p) return;
      _editBakeryProdIdx = idx;
      document.getElementById('bprod-date').value = p.date || '';
      document.getElementById('bprod-count').value = p.breadCount || 0;
      var ingMap = { ING001: p.flourUsed, ING002: p.yeastUsed, ING003: p.saltUsed, ING004: p.branUsed, ING007: p.dieselUsed };
      Object.keys(ingMap).forEach(function(id) {
        var el = document.getElementById('bprod-ing-' + id);
        if (el) el.value = ingMap[id] || 0;
      });
      document.getElementById('bprod-opcost').value = p.opCost || 1200;
      document.getElementById('bprod-notes').value = p.notes || '';
      document.getElementById('bprod-count').scrollIntoView({ behavior: 'smooth' });
      document.getElementById('bprod-count').focus();
      alert('تم تحميل بيانات سجل الإنتاج لتعديلها.');
    }

    function updateBctrIngredientStocks() {
      ['ING001','ING002','ING003','ING004','ING007'].forEach(function(id) {
        var el = document.getElementById('bctr-stock-' + id);
        if (!el) return;
        var ing = bakeryIngredients.find(function(i) { return i.id === id; });
        if (ing) el.textContent = (ing.currentQty || 0) + ' ' + ing.unit;
      });
    }

    function estimateCtrProfit() {
      var count = parseInt(document.getElementById('bctr-count').value) || 0;
      if (count > 0) {
        var flourKg = count / 21;
        document.getElementById('bctr-ing-ING001').value = Math.round(flourKg * 100) / 100;
        document.getElementById('bctr-ing-ING002').value = Math.round(flourKg * 4 / 450 * 1000) / 1000;
        document.getElementById('bctr-ing-ING003').value = Math.round(flourKg * 0.00924 * 1000) / 1000;
        document.getElementById('bctr-ing-ING004').value = Math.round(flourKg * 0.0792 * 100) / 100;
        document.getElementById('bctr-ing-ING007').value = Math.round(flourKg * 0.2112 * 100) / 100;
      }
    }

    var _editingCtrIdx = -1;

    function editBakeryContractorSupply(idx) {
      var rec = bakeryContractorSupplies[idx];
      if (!rec) return;
      _editingCtrIdx = idx;
      document.getElementById('bctr-date').value = rec.date;
      document.getElementById('bctr-name').value = rec.name;
      document.getElementById('bctr-count').value = rec.count;
      document.getElementById('bctr-price').value = rec.price;
      document.getElementById('bctr-paid').value = rec.paid || 0;
      document.getElementById('bctr-responsible').value = rec.responsible || '';
      document.getElementById('bctr-notes').value = rec.notes || '';
      var ingIds = ['ING001','ING002','ING003','ING004','ING007'];
      ingIds.forEach(function(id) { document.getElementById('bctr-ing-' + id).value = (rec.ingredients && rec.ingredients[id]) || 0; });
      document.getElementById('btn-save-ctr').textContent = '💾 حفظ التعديل';
      document.getElementById('btn-cancel-ctr').style.display = 'block';
      window.scrollTo({ top: document.getElementById('bsup-contractors').offsetTop - 20, behavior: 'smooth' });
    }

    function cancelEditBakeryContractorSupply() {
      _editingCtrIdx = -1;
      document.getElementById('bctr-count').value = '0';
      document.getElementById('bctr-paid').value = '0';
      document.getElementById('bctr-responsible').value = '';
      document.getElementById('bctr-notes').value = '';
      var ingIds = ['ING001','ING002','ING003','ING004','ING007'];
      ingIds.forEach(function(id) { document.getElementById('bctr-ing-' + id).value = '0'; });
      document.getElementById('btn-save-ctr').textContent = '🚚 تسجيل التوريد';
      document.getElementById('btn-cancel-ctr').style.display = 'none';
    }

    function saveBakeryContractorSupply() {
      try {
        let date = document.getElementById('bctr-date').value;
        if (!date) return alert('⚠️ اختر التاريخ.');
        let name = document.getElementById('bctr-name').value;
        if (!name) return alert('⚠️ اختر اسم المقاول من القائمة.');
        if (name === '[object Object]') { alert('⚠️ اسم المقاول غير صالح. الرجاء اختيار اسم من القائمة.'); return; }
        let count = parseInt(document.getElementById('bctr-count').value) || 0;
        if (count < 1) return alert('⚠️ أدخل عدد الأرغفة.');
        let price = parseFloat(document.getElementById('bctr-price').value) || 2;
        let paid = parseFloat(document.getElementById('bctr-paid').value) || 0;
        let responsible = document.getElementById('bctr-responsible').value.trim();
        let notes = document.getElementById('bctr-notes').value.trim();
        var normDate = normalizeDateStr(date);
        var ingIds = ['ING001','ING002','ING003','ING004','ING007'];

        // If editing, restore old ingredients first
        if (_editingCtrIdx >= 0) {
          var oldRec = bakeryContractorSupplies[_editingCtrIdx];
          if (oldRec && oldRec.ingredients) {
            Object.keys(oldRec.ingredients).forEach(function(id) {
              var qty = oldRec.ingredients[id];
              if (qty <= 0) return;
              var ing = bakeryIngredients.find(function(i) { return i.id === id; });
              if (ing) ing.currentQty = (ing.currentQty || 0) + qty;
            });
          }
          bakeryStockLog = bakeryStockLog.filter(function(l) { return l.reference !== 'CTR_' + oldRec.name || normalizeDateStr(l.date) !== normalizeDateStr(oldRec.date); });
          bakeryContractorSupplies.splice(_editingCtrIdx, 1);
        }

        // Check duplicate (skip if editing same record)
        if (_editingCtrIdx === -1) {
          var dupIdx = bakeryContractorSupplies.findIndex(function(r) { return r.name === name && normalizeDateStr(r.date) === normDate; });
          if (dupIdx >= 0) {
            var oldSup = bakeryContractorSupplies[dupIdx];
            if (oldSup.ingredients) {
              Object.keys(oldSup.ingredients).forEach(function(id) {
                var qty = oldSup.ingredients[id];
                if (qty <= 0) return;
                var ing = bakeryIngredients.find(function(i) { return i.id === id; });
                if (ing) ing.currentQty = (ing.currentQty || 0) + qty;
              });
            }
            bakeryStockLog = bakeryStockLog.filter(function(l) { return l.reference !== 'CTR_' + name || normalizeDateStr(l.date) !== normDate; });
            bakeryContractorSupplies.splice(dupIdx, 1);
          }
        }

        // Deduct new ingredients
        var deducted = {};
        var deductedCost = 0;
        ingIds.forEach(function(id) {
          var qty = parseFloat(document.getElementById('bctr-ing-' + id).value) || 0;
          if (qty <= 0) return;
          var ing = bakeryIngredients.find(function(i) { return i.id === id; });
          if (!ing) return;
          var before = ing.currentQty || 0;
          if (qty > before) {
            alert('⚠️ الكمية المسحوبة من ' + ing.name + ' (' + qty + ') أكبر من الرصيد المتاح (' + before + ' ' + ing.unit + ')');
            throw new Error('رصيد غير كافٍ');
          }
          ing.currentQty = before - qty;
          deducted[id] = qty;
          deductedCost += qty * (parseFloat(ing.pricePerUnit) || 0);
          bakeryStockLog.push({
            date: date,
            materialId: ing.id,
            materialName: ing.name,
            unit: ing.unit,
            type: 'out',
            quantity: qty,
            balanceBefore: before,
            balanceAfter: ing.currentQty,
            notes: 'تم سحب ' + qty + ' ' + ing.unit + ' لانتاج خبز مقاولين - ' + name,
            reference: 'CTR_' + name
          });
        });
        let prodCost = deductedCost;
        let revenue = count * price;
        let profit = revenue - prodCost;
        bakeryContractorSupplies.push(_ts({ id: getBakeryNextId('CTR', bakeryContractorSupplies), date: normDate, name, count, price, paid, prodCost, revenue, profit, responsible, notes, ingredients: deducted }));
        _removeDeletion('bakeryContractorSupplies', (name||'') + '|' + normDate + '|' + (count||''));
        _editingCtrIdx = -1;
        syncStorage(); renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats(); updateBctrIngredientStocks(); updateBakeryProductionIngredientStocks();
        document.getElementById('btn-save-ctr').textContent = '🚚 تسجيل التوريد';
        document.getElementById('btn-cancel-ctr').style.display = 'none';
        document.getElementById('bctr-count').value = '0'; document.getElementById('bctr-paid').value = '0';
        document.getElementById('bctr-responsible').value = ''; document.getElementById('bctr-notes').value = '';
        ingIds.forEach(function(id) { document.getElementById('bctr-ing-' + id).value = '0'; });
      } catch(e) { if (e.message !== 'رصيد غير كافٍ') alert('❌ خطأ: ' + e.message); }
    }

    function importWhatsAppCtrToBreadPlan() {
      var text = document.getElementById('wa-ctr-import').value;
      if (!text.trim()) return;
      var lines = text.split('\n').filter(function(l) { return l.trim(); });
      var imported = 0;
      lines.forEach(function(line) {
        var name = '', qty = 0;
        // Try to parse [time، date] name: text
        var match = line.match(/^\[[^\]]+\]\s*(.+?)\s*:\s*(.*)/);
        if (match) { name = match[1].trim(); qty = _extractNumber(match[2]); }
        else {
          // Try to parse name: text
          var m2 = line.match(/^(.+?)\s*:\s*(.*)/);
          if (m2) { name = m2[1].trim(); qty = _extractNumber(m2[2]); }
        }
        // If parsing failed, use the whole line as name
        if (!name) name = line.replace(/^\[[^\]]+\]\s*/, '').trim();
        // Add row to bread plan contractor table
        var id = 'bpctr-' + (++_breadPlanCtrCounter);
        var tbody = document.getElementById('bread-plan-ctr-tbody');
        if (!tbody) return;
        var tr = document.createElement('tr');
        tr.id = 'bprow-' + id;
        tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="bpname-' + id + '" value="' + name.replace(/"/g,'&quot;') + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;"></td><td style="border:1px solid #e0e0e0;padding:4px;width:80px;"><input type="number" id="bpqty-' + id + '" min="0" value="' + qty + '" style="width:70px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:30px;"><button onclick="removeBreadPlanCtrRow(\'bprow-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">✕</button></td>';
        tbody.appendChild(tr);
        imported++;
      });
      document.getElementById('wa-ctr-import').value = '';
      var statusEl = document.getElementById('wa-ctr-status');
      statusEl.textContent = '✅ تم إضافة ' + imported + ' مقاول';
      updateBreadPlanTotal();
      setTimeout(function() { statusEl.textContent = ''; }, 3000);
    }
    function _extractNumber(s) {
      var map = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
      s = s.replace(/[٠-٩]/g, function(c) { return map[c] || c; });
      var nums = s.match(/\d+/g);
      return nums ? parseInt(nums[0]) : 0;
    }

    function deleteBakeryContractorSupply(idx) { if (!requireAdmin()) return;
      if (!confirm('حذف التوريد؟')) return;
      _logDeletion('bakeryContractorSupplies', (bakeryContractorSupplies[idx].name||'') + '|' + normalizeDateStr(bakeryContractorSupplies[idx].date) + '|' + (bakeryContractorSupplies[idx].count||''));
      bakeryContractorSupplies.splice(idx, 1);
      syncStorage(); renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
      pushToSupabase();
    }

    function addBakeryStock() {
      let sel = document.getElementById('stock-add-material');
      sel.innerHTML = '<option value="">اختر المكون</option>' + bakeryIngredients.map(i => '<option value="' + i.id + '">' + i.name + ' (' + (i.currentQty||0) + ' ' + i.unit + ')</option>').join('');
      document.getElementById('stock-add-qty').value = '';
      document.getElementById('stock-add-notes').value = '';
      openModal('modal-add-stock');
    }
    function confirmAddBakeryStock() {
      let id = document.getElementById('stock-add-material').value;
      if (!id) return alert('الرجاء اختيار المكون');
      let ing = bakeryIngredients.find(i => i.id === id);
      if (!ing) return alert('الرجاء إدخال مكون الإنتاج.');
      let qty = parseFloat(document.getElementById('stock-add-qty').value) || 0;
        if (!qty || qty <= 0) return alert('الرجاء إدخال كمية التوريد قبل الحفظ.');
      let notes = document.getElementById('stock-add-notes').value.trim() || 'إضافة رصيد';
      let before = ing.currentQty || 0;
      ing.currentQty = before + qty;
      let entry = {
        date: new Date().toISOString().slice(0,10),
        materialId: ing.id,
        materialName: ing.name,
        unit: ing.unit,
        type: 'in',
        quantity: qty,
        balanceBefore: before,
        balanceAfter: ing.currentQty,
        notes: notes,
        reference: 'MANUAL'
      };
      bakeryStockLog.push(entry);
      syncStorage(); renderBakeryIngredients(); renderBakeryStockLog();
      closeModal('modal-add-stock');
      alert('تم إضافة رصيد للمخزن: ' + qty + ' ' + ing.unit + ' من ' + ing.name);
    }

    function showIngredientStockLog(materialId) {
      document.getElementById('filt-stock-material').value = materialId;
      switchBakerySub('bsub-materials', document.querySelector('.bakery-sub-tab[onclick*="bsub-materials"]'));
      renderBakeryStockLog();
    }

    function renderBakeryStockLog() {
      let tbody = document.getElementById('bakery-stock-log-body');
      if (!tbody) return;
      let fromDate = document.getElementById('filt-stock-from')?.value || '';
      let toDate = document.getElementById('filt-stock-to')?.value || '';
      let matFilter = document.getElementById('filt-stock-material')?.value || '';
      let typeFilter = document.getElementById('filt-stock-type')?.value || '';
      let data = [...bakeryStockLog];
      if (fromDate) data = data.filter(e => e.date >= fromDate);
      if (toDate) data = data.filter(e => e.date <= toDate);
      if (matFilter) data = data.filter(e => e.materialId === matFilter);
      if (typeFilter) data = data.filter(e => e.type === typeFilter);
      data = sortNewestFirst(data, 'date');
      tbody.innerHTML = data.map(e =>
        `<tr>
          <td>${e.date}</td>
          <td><b>${e.materialName}</b></td>
          <td style="color:${e.type === 'in' ? '#1b5e20' : '#d32f2f'};font-weight:700;">${e.type === 'in' ? 'إضافة رصيد' : 'استخدام'}</td>
          <td style="font-weight:700;">${e.quantity} ${e.unit}</td>
          <td>${e.unit}</td>
          <td>${e.balanceBefore}</td>
          <td>${e.balanceAfter}</td>
          <td style="color:#666;font-size:12px;">${e.notes||''}</td>
        </tr>`
      ).join('');
      if (!data.length) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:30px;">لا توجد حركات</td></tr>';
    }

    function toggleContractorSupplyPaid(idx) {
      let c = bakeryContractorSupplies[idx];
      if (!c) return;
      let total = (parseInt(c.count)||0) * (parseFloat(c.price)||0);
      let isCurrentlyPaid = (parseFloat(c.paid)||0) >= total;
      if (isCurrentlyPaid) {
        if (!confirm(`هل تريد إلغاء تحصيل ${c.name} ليوم ${c.date}؟`)) return;
        c.paid = 0;
      } else {
        if (!confirm(`تأكيد تحصيل ${c.name} ليوم ${c.date} بقيمة ${total.toFixed(2)} ج.م؟`)) return;
        c.paid = total;
      }
      _ts(c);
      syncStorage(); renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
      pushToSupabase();
    }
    var _selectedContractors = [];

    function filterContractorCheckboxes() {
      var q = document.getElementById('filt-ctr-name').value.trim().toLowerCase();
      var list = document.getElementById('filt-ctr-checklist');
      var fromDate = document.getElementById('filt-ctr-from')?.value || '';
      var toDate = document.getElementById('filt-ctr-to')?.value || '';
      var filtered = bakeryContractorSupplies;
      if (fromDate) filtered = filtered.filter(function(c) { return c.date >= fromDate; });
      if (toDate) filtered = filtered.filter(function(c) { return c.date <= toDate; });
      var names = {};
      filtered.forEach(function(c) { names[c.name] = true; });
      var sorted = Object.keys(names).sort().filter(function(n) { return !q || n.toLowerCase().indexOf(q) !== -1; });
      list.style.display = sorted.length ? 'block' : 'none';
      list.innerHTML = sorted.map(function(n) {
        var checked = _selectedContractors.indexOf(n) !== -1 ? 'checked' : '';
        return '<label style="display:flex;align-items:center;gap:6px;padding:4px 8px;cursor:pointer;font-size:12px;border-bottom:1px solid #f0f0f0;"><input type="checkbox" value="' + n.replace(/"/g,'&quot;') + '" ' + checked + ' onchange="toggleContractorSelection(\'' + n.replace(/'/g,"\\'") + '\',this.checked)">' + n + '</label>';
      }).join('');
    }

    function toggleContractorSelection(name, checked) {
      var idx = _selectedContractors.indexOf(name);
      if (checked && idx === -1) _selectedContractors.push(name);
      if (!checked && idx !== -1) _selectedContractors.splice(idx, 1);
      renderSelectedContractorChips();
      renderBakeryContractorSupplies();
      filterContractorCheckboxes();
    }

    function renderSelectedContractorChips() {
      var container = document.getElementById('filt-ctr-selected');
      if (_selectedContractors.length === 0) { container.innerHTML = ''; return; }
      container.innerHTML = _selectedContractors.map(function(n) {
        return '<span style="display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;color:#1b5e20;padding:2px 8px;border-radius:12px;border:1px solid #a5d6a7;"><span style="font-size:11px;">' + n + '</span><span onclick="removeContractorSelection(\'' + n.replace(/'/g,"\\'") + '\')" style="cursor:pointer;font-size:13px;line-height:1;">&times;</span></span>';
      }).join('');
    }

    function removeContractorSelection(name) {
      toggleContractorSelection(name, false);
    }

    // Close checklist when clicking outside
    document.addEventListener('click', function(e) {
      var list = document.getElementById('filt-ctr-checklist');
      var input = document.getElementById('filt-ctr-name');
      if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
        list.style.display = 'none';
      }
    });

    function renderBakeryContractorSupplies() {
      let tbody = document.getElementById('bakery-ctr-supply-body');
      if (!tbody) return;
      let fromDate = document.getElementById('filt-ctr-from')?.value || '';
      let toDate = document.getElementById('filt-ctr-to')?.value || '';
      let statusFilter = document.getElementById('filt-ctr-status')?.value || 'all';
      let data = [...bakeryContractorSupplies];
      if (fromDate) data = data.filter(c => c.date >= fromDate);
      if (toDate) data = data.filter(c => c.date <= toDate);
      if (_selectedContractors.length > 0) {
        data = data.filter(function(c) { return _selectedContractors.indexOf(c.name) !== -1; });
      }
      if (statusFilter === 'paid') data = data.filter(c => { let total = (parseInt(c.count)||0)*(parseFloat(c.price)||0); return parseFloat(c.paid) >= total; });
      if (statusFilter === 'unpaid') data = data.filter(c => { let total = (parseInt(c.count)||0)*(parseFloat(c.price)||0); return parseFloat(c.paid) < total; });
      let st = sortState['table-bakery-ctr-supply'];
      if (!st || !st.key) data = sortNewestFirst(data, 'date');
      if (st && st.key) data = sortData(data, st.key, st.dir);
      tbody.innerHTML = data.map(c => {
        let realIdx = bakeryContractorSupplies.indexOf(c);
        let total = (parseInt(c.count)||0) * (parseFloat(c.price)||0);
        let paid = parseFloat(c.paid)||0;
        let remaining = total - paid;
        return `<tr>
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-bakery-ctr-supply"></td>
          <td>${c.date}</td><td>${c.name}</td>
          <td>${c.count}</td><td>${c.price}</td>
          <td>${total.toFixed(2)}</td>
          <td>${paid.toFixed(2)}</td>
          <td style="color:${remaining > 0 ? '#d32f2f' : '#1b5e20'};">${remaining.toFixed(2)}</td>
          <td style="font-weight:700;${paid === 0 ? 'color:#d32f2f;' : remaining > 0 ? 'color:#e65100;' : 'color:#1b5e20;'}">${paid === 0 ? '🔴 غير مدفوع' : remaining > 0 ? `⚠️ متبقي ${remaining.toFixed(2)}` : '✅ تم الدفع'}</td>
          <td>${c.responsible||''}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;background:#1565c0;color:white;" onclick="editBakeryContractorSupply(${realIdx})" title="تعديل">تعديل</button>
            <button class="btn btn-success" style="padding:2px 6px;font-size:11px;background:#2e7d32;color:white;" onclick="toggleContractorSupplyPaid(${realIdx})" title="تحصيل المبلغ">تحصيل</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryContractorSupply(${realIdx})">حذف</button>
          </td>
        </tr>`;
      }).join('');
    }

    function renderBakeryInvoices() {
      let tbody = document.getElementById('bakery-invoices-body');
      if (!tbody) return;
      let fromDate = document.getElementById('filt-inv-from')?.value || '';
      let toDate = document.getElementById('filt-inv-to')?.value || '';
      let data = [...bakeryInvoices];
      if (fromDate) data = data.filter(inv => inv.date >= fromDate);
      if (toDate) data = data.filter(inv => inv.date <= toDate);
      let st = sortState['table-bakery-invoices'];
      if (!st || !st.key) data = sortNewestFirst(data, 'date');
      if (st && st.key) data = sortData(data, st.key, st.dir);
      tbody.innerHTML = data.map(inv => {
        let realIdx = bakeryInvoices.indexOf(inv);
        let total = (parseInt(inv.count)||0) * (parseFloat(inv.unitPrice)||0);
        let paid = parseFloat(inv.paid)||0;
        let remaining = total - paid;
        let prodCost = parseFloat(inv.prodCost) || (parseInt(inv.count)||0) * getAverageLoafCost();
        let profit = total - prodCost;
        return `<tr>
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-bakery-invoices"></td>
          <td><b>${inv.number}</b></td><td>${inv.date}</td><td>${inv.customer}</td>
          <td>${inv.count}</td><td>${inv.unitPrice}</td>
          <td>${total.toFixed(2)}</td>
          <td>${paid.toFixed(2)}</td>
          <td style="color:${remaining > 0 ? '#d32f2f' : '#1b5e20'};">${remaining.toFixed(2)}</td>
          <td data-print="hide" style="color:#e65100;">${prodCost.toFixed(2)}</td>
          <td style="font-weight:700;${paid === 0 ? 'color:#d32f2f;' : remaining > 0 ? 'color:#e65100;' : 'color:#1b5e20;'}">${paid === 0 ? 'غير مدفوع' : remaining > 0 ? `متبقي دفع ${remaining.toFixed(2)}` : 'مدفوع بالكامل'}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="printBakeryInvoice(${realIdx})">طباعة</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryInvoice(${realIdx})">حذف</button>
          </td>
        </tr>`;
      }).join('');
    }

    function saveBakeryInvoice() {
      let number = document.getElementById('binv-number').value.trim();
      if (!number) number = 'INV-' + new Date().toISOString().slice(0,10) + '-' + String(bakeryInvoices.length+1).padStart(3,'0');
      let date = document.getElementById('binv-date').value;
      if (!date) return alert('الرجاء إدخال تاريخ الفاتورة');
      let customer = document.getElementById('binv-customer').value.trim();
        if (!customer) return alert('الرجاء إدخال اسم العميل.');
      let count = parseInt(document.getElementById('binv-count').value) || 0;
      if (count < 1) return alert('الرجاء إدخال عدد الأرغفة');
      let unitPrice = parseFloat(document.getElementById('binv-unit-price').value) || 2;
      let paid = parseFloat(document.getElementById('binv-paid').value) || 0;
      let notes = document.getElementById('binv-notes').value.trim();
      let loafCost = getAverageLoafCost();
      bakeryInvoices.push(_ts({ id: getBakeryNextId('INV', bakeryInvoices), number, date: normalizeDateStr(date), customer, count, unitPrice, paid, prodCost: count * loafCost, notes }));
      syncStorage(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
      document.getElementById('binv-number').value = '';
      document.getElementById('binv-count').value = '0'; document.getElementById('binv-paid').value = '0'; document.getElementById('binv-notes').value = '';
    }

    function deleteBakeryInvoice(idx) { if (!requireAdmin()) return;
      if (!confirm('الكلي دقيق')) return;
      _logDeletion('bakeryInvoices', bakeryInvoices[idx].id || bakeryInvoices[idx]._id);
      bakeryInvoices.splice(idx, 1);
      syncStorage(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
    }

    function printBakeryInvoice(idx) {
      let inv = bakeryInvoices[idx];
      if (!inv) return;
      let logoImg = document.querySelector('.print-watermark img');
      let logoSrc = logoImg ? logoImg.src : '';
      let w = window.open('', '_blank', 'width=400,height=600');
      w.document.write(`<html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${inv.number}</title>
        <style>body{font-family: 'Cairo',sans-serif;padding:20px;max-width:350px;margin:auto;}
        h2{text-align:center;color:#1b5e20;border-bottom:2px solid #1b5e20;padding-bottom:10px;}
        table{width:100%;border-collapse:collapse;margin:15px 0;}
        td,th{padding:8px;text-align:center;border:1px solid #ddd;}
        th{background:#1b5e20;color:white;}
        .total{font-size:20px;text-align:center;color:#e65100;font-weight:700;}
        .footer{text-align:center;margin-top:20px;font-size:12px;color:#888;}
        .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);z-index:-1;pointer-events:none;}
        .wm img{width:400px;height:auto;opacity:0.07;}</style></head><body>
        ${logoSrc ? '<div class="wm"><img src="' + logoSrc + '"></div>' : ''}
        <h2>فاتورة توريد مخبز</h2>
        <p><b>رقم الفاتورة:</b> ${inv.number}</p>
        <p><b>التاريخ:</b> ${inv.date}</p>
        <p><b>العميل:</b> ${inv.customer}</p>
        <table><tr><th>الصنف</th><th>العدد</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
        <tr><td>خبز</td><td>${inv.count}</td><td>${inv.unitPrice}</td><td>${(inv.count*inv.unitPrice).toFixed(2)}</td></tr></table>
        <div class="total">الإجمالي: ${(inv.count*inv.unitPrice).toFixed(2)} جنيه</div>
        <div class="total" style="font-size:16px;color:#1b5e20;">المدفوع: ${parseFloat(inv.paid).toFixed(2)} جنيه</div>
        <div class="total" style="font-size:16px;">المتبقي: ${((inv.count*inv.unitPrice) - parseFloat(inv.paid)).toFixed(2)} جنيه</div>
        ${inv.notes ? `<p style="margin-top:15px;"><b>ملاحظات:</b> ${inv.notes}</p>` : ''}
        <div class="footer">نظام الشئون الإدارية المتكامل — لينه فارمز</div>
        <script>window.print();setTimeout(()=>window.close(),1500);</${''}script></body></html>`);
      w.document.close();
    }

    function exportBakeryInvoicesToExcel() {
      if (bakeryInvoices.length === 0) return alert('لا توجد فواتير للتصدير.');
      let rows = sortNewestFirst(bakeryInvoices, 'date').map(i => ({
        'كافٍ رصيد': i.number, 'غير': i.date, 'كافٍ': stripEmoji(i.customer),
        'خطأ حذف': i.count, 'الإنتاج؟ تعديل': i.unitPrice,
        'الإنتاج': (i.count*i.unitPrice).toFixed(2),
        'عدّل': parseFloat(i.paid).toFixed(2),
        'البيانات': ((i.count*i.unitPrice)-parseFloat(i.paid)).toFixed(2),
        'واضغط': stripEmoji(i.notes)
      }));
      let ws = XLSX.utils.json_to_sheet(rows);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تسجيل الإنتاج');
      XLSX.writeFile(wb, 'للحفظ_حفظ.xlsx');
    }
    function exportBakeryProductionToExcel() {
      if (!bakeryProductions.length) return alert('لا توجد بيانات إنتاج للتصدير.');
      let rows = sortNewestFirst(bakeryProductions, 'date').map(p => ({ 'التاريخ': p.date, 'عدد الأرغفة': p.breadCount, 'دقيق (كجم)': p.flourUsed||0, 'خميرة (كجم)': p.yeastUsed||0, 'ملح (كجم)': p.saltUsed||0, 'ردة (كجم)': p.branUsed||0, 'سولار (لتر)': p.dieselUsed||0, 'أجر التشغيل': p.operatingCost||0, 'ملاحظات': stripEmoji(p.notes) }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'إنتاج الخبز'); XLSX.writeFile(wb, 'إنتاج_الخبز.xlsx');
    }
    function exportBakeryIngredientsToExcel() {
      if (!bakeryIngredients.length) return alert('لا توجد خامات للتصدير.');
      let rows = bakeryIngredients.map(i => ({ 'الكود': i.id, 'اسم الصنف': i.name, 'الوحدة': i.unit, 'الرصيد الحالي': i.currentQty||0, 'الحد الأدنى': i.minQty||0, 'سعر الوحدة': i.pricePerUnit||0 }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'خامات المخبز'); XLSX.writeFile(wb, 'خامات_المخبز.xlsx');
    }

    function exportBakeryContractorSuppliesToExcel() {
      if (!bakeryContractorSupplies.length) return alert('لا توجد توريدات مقاولين للتصدير.');
      let rows = sortNewestFirst(bakeryContractorSupplies, 'date').map(c => ({ 'التاريخ': c.date, 'المقاول': stripEmoji(c.name), 'عدد الأرغفة': c.count, 'سعر الرغيف': c.price, 'الإجمالي': ((c.count||0)*(c.price||0)).toFixed(2), 'المدفوع': parseFloat(c.paid||0).toFixed(2), 'المتبقي': (((c.count||0)*(c.price||0))-parseFloat(c.paid||0)).toFixed(2), 'المسؤول': stripEmoji(c.responsible), 'ملاحظات': stripEmoji(c.notes) }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'توريد المقاولين'); XLSX.writeFile(wb, 'توريد_المقاولين.xlsx');
    }
    function printBreadInvoice() {
      var fromDate = document.getElementById('filt-ctr-from')?.value || '';
      var toDate = document.getElementById('filt-ctr-to')?.value || '';
      if (!fromDate || !toDate) { alert('⚠️ حدد الفترة أولاً (من تاريخ — إلى تاريخ) من الفلاتر أعلاه'); return; }
      if (!_selectedContractors || _selectedContractors.length === 0) { alert('⚠️ اختر مقاولاً واحداً على الأقل من فلتر المقاولين'); return; }
      var records = bakeryContractorSupplies.filter(function(r) {
        return r.date >= fromDate && r.date <= toDate && _selectedContractors.indexOf(r.name) !== -1;
      });
      if (!records.length) { alert('⚠️ لا توجد توريدات للمقاولين المختارين في هذه الفترة'); return; }
      // Group by contractor
      var grouped = {};
      records.forEach(function(r) {
        if (!grouped[r.name]) grouped[r.name] = [];
        grouped[r.name].push(r);
      });
      var logoSrc = '';
      var logoEl = document.querySelector('img[alt="Logo"]');
      if (logoEl) logoSrc = logoEl.src;
      var invDate = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
      var invNo = 'INV-' + records[0].id + '-' + Date.now().toString().slice(-4);
      var pages = Object.keys(grouped).map(function(ctrName, pi) {
        var items = grouped[ctrName];
        var totalLoaves = 0, totalRevenue = 0, totalPaid = 0;
        var rows = items.map(function(r, i) {
          totalLoaves += r.count || 0;
          var rev = (r.count || 0) * (r.price || 0);
          totalRevenue += rev;
          var paid = parseFloat(r.paid) || 0;
          totalPaid += paid;
          var rem = rev - paid;
          var statusIcon = paid >= rev ? '✅' : (paid > 0 ? '🟡' : '🔴');
          return '<tr>' +
            '<td style="text-align:center;">' + (i + 1) + '</td>' +
            '<td style="text-align:center;">' + r.date + '</td>' +
            '<td style="text-align:center;font-weight:700;">' + r.count + '</td>' +
            '<td style="text-align:center;">' + parseFloat(r.price || 0).toFixed(2) + '</td>' +
            '<td style="text-align:center;font-weight:700;">' + rev.toFixed(2) + '</td>' +
            '<td style="text-align:center;">' + paid.toFixed(2) + '</td>' +
            '<td style="text-align:center;font-weight:' + (rem > 0 ? '700;color:#c62828;' : '400;color:#2e7d32;') + '">' + rem.toFixed(2) + '</td>' +
            '<td style="text-align:center;">' + statusIcon + (r.responsible || '—') + '</td>' +
          '</tr>';
        }).join('');
        var tCount = Object.keys(grouped).length;
        return '<div class="page">' +
          '<div class="logo-section">' +
            '<div class="right">' +
              (logoSrc ? '<img src="' + logoSrc + '" alt="شعار لينه فارمز">' : '') +
              '<div><div class="co-name">شركة لينة للتنمية السياحية والعمرانية</div><div class="co-sub">مخبز آلية — توريد خبز للمقاولين</div></div>' +
            '</div>' +
            '<div class="badge">فاتورة</div>' +
          '</div>' +
          '<div class="title">🧾 فاتورة توريد خبز</div>' +
          '<div class="meta-row">' +
            '<div class="meta-item"><span class="meta-label">رقم الفاتورة</span><span class="meta-val">' + invNo + '-' + (pi + 1) + '/' + tCount + '</span></div>' +
            '<div class="meta-item"><span class="meta-label">تاريخ الطباعة</span><span class="meta-val">' + invDate + '</span></div>' +
            '<div class="meta-item"><span class="meta-label">فترة التوريد</span><span class="meta-val">' + fromDate + ' → ' + toDate + '</span></div>' +
          '</div>' +
          '<div class="ctr-info">' +
            '<div class="ctr-label">👤 المقاول</div><div class="ctr-name">' + ctrName + '</div>' +
          '</div>' +
          '<table>' +
            '<thead><tr>' +
              '<th style="width:30px;">م</th><th style="width:75px;">التاريخ</th><th style="width:65px;">عدد الأرغفة</th><th style="width:55px;">السعر</th><th style="width:65px;">الإجمالي</th><th style="width:65px;">المدفوع</th><th style="width:65px;">المتبقي</th><th>المسؤول</th>' +
            '</tr></thead><tbody>' + rows + '</tbody>' +
          '</table>' +
          '<div class="totals">' +
            '<div class="total-row"><span>إجمالي الأرغفة</span><span class="num">' + totalLoaves + ' رغيف</span></div>' +
            '<div class="total-row"><span>إجمالي قيمة التوريدات</span><span class="num" style="color:#1b5e20;">' + totalRevenue.toFixed(2) + ' ج.م</span></div>' +
            '<div class="total-row"><span>إجمالي المدفوع</span><span class="num" style="color:#1565c0;">' + totalPaid.toFixed(2) + ' ج.م</span></div>' +
            '<div class="total-row total-due"><span>إجمالي المتبقي</span><span class="num" style="color:#c62828;">' + (totalRevenue - totalPaid).toFixed(2) + ' ج.م</span></div>' +
          '</div>' +
          '<div class="footer">فاتورة توريد خبز — لينه فارمز © ' + new Date().getFullYear() + '</div>' +
        '</div>';
      }).join('');
      var w = window.open('', '_blank');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة خبز — LINAHSYSTEM</title>' +
        '<style>' +
          '@page{size:A4 portrait;margin:1cm 1.5cm;}' +
          'body{font-family:Cairo,"Traditional Arabic","Segoe UI",sans-serif;padding:0;margin:0;color:#333;background:#e0e0e0;}' +
          '.page{width:210mm;min-height:297mm;margin:12px auto;background:#fff;padding:18px 22px;box-shadow:0 2px 20px rgba(0,0,0,0.12);page-break-after:always;position:relative;}' +
          '.logo-section{display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #b71c1c;padding-bottom:10px;margin-bottom:12px;}' +
          '.logo-section .right{display:flex;align-items:center;gap:10px;}' +
          '.logo-section .right img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #b71c1c;padding:2px;}' +
          '.logo-section .right .co-name{font-weight:900;color:#b71c1c;font-size:17px;line-height:1.3;}' +
          '.logo-section .right .co-sub{font-size:11px;color:#888;}' +
          '.logo-section .badge{background:#b71c1c;color:#fff;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;}' +
          '.title{text-align:center;font-size:24px;font-weight:900;color:#b71c1c;margin:6px 0 10px;letter-spacing:1px;}' +
          '.meta-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:8px 12px;background:#f5f5f5;border-radius:6px;font-size:12px;}' +
          '.meta-item{text-align:center;}' +
          '.meta-label{display:block;color:#888;font-size:11px;}' +
          '.meta-val{font-weight:700;color:#333;font-size:13px;}' +
          '.ctr-info{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff8e1;border:1px solid #ffcc02;border-radius:8px;margin-bottom:12px;}' +
          '.ctr-label{font-size:13px;color:#888;}' +
          '.ctr-name{font-size:18px;font-weight:900;color:#b71c1c;}' +
          'table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0;}' +
          'thead th{background:#b71c1c;color:#fff;padding:6px 4px;border:1px solid #b71c1c;text-align:center;font-size:11px;}' +
          'tbody td{padding:5px 4px;border:1px solid #ffcdd2;text-align:center;}' +
          'tbody tr:nth-child(even){background:#fff8f8;}' +
          '.totals{margin:12px 0;padding:10px 16px;background:#f5f5f5;border-radius:8px;border:1px solid #e0e0e0;}' +
          '.total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px;}' +
          '.total-row .num{font-weight:700;}' +
          '.total-due{font-size:16px;font-weight:900;color:#b71c1c;border-top:2px solid #b71c1c;margin-top:4px;padding-top:6px;}' +
          '.footer{text-align:center;margin-top:15px;font-size:10px;color:#999;border-top:1px solid #e0e0e0;padding-top:8px;}' +
          '@media print{body{background:#fff;}.page{margin:0;box-shadow:none;padding:12px 16px;}}' +
        '</style></head><body>' + pages + '</body></html>');
      w.document.close();
      setTimeout(function() { w.print(); }, 600);
    }

    function importBakeryIngredientsFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("سعر الوحدة");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["الإجمالي"] || ''; if(!name) { skipped++; continue; }
            let code = r["خبز"] || '';
            let exists = (code && bakeryIngredients.some(i => i.id === code)) || bakeryIngredients.some(i => i.name === name);
            if(exists) { skipped++; continue; }
            bakeryIngredients.push({ id: code, name: name, unit: r["الإجمالي"]||'', currentQty: Number(r["ج م"])||0, minQty: Number(r["المدفوع ج"])||0, pricePerUnit: Number(r["م المتبقي"])||0, notes: '' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} صنف خامات بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد خامات الفرن: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importBakeryProductionFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("فرن المزرعة");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let date = r["لا"] || ''; if(!date) { skipped++; continue; }
            let exists = bakeryProductions.some(p => p.date === date);
            if(exists) { skipped++; continue; }
            bakeryProductions.push({ date: date, breadCount: Number(r["توجد فواتير"])||0, flourUsed: parseFloat(r["للتصدير (رقم)"])||0, yeastUsed: parseFloat(r["الفاتورة (التاريخ)"])||0, saltUsed: parseFloat(r["العميل (عدد)"])||0, branUsed: parseFloat(r["الأرغفة (سعر)"])||0, dieselUsed: parseFloat(r["الوحدة (الإجمالي)"])||0, opCost: parseFloat(r["المدفوع المتبقي"])||0, notes: r["ملاحظات"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} سجل إنتاج فرن بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد إنتاج الفرن: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importBakeryContractorSuppliesFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("الاسم الوحدة");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["الكمية"] || ''; if(!name) { skipped++; continue; }
            let date = r["الحالية"] || '';
            let exists = bakeryContractorSupplies.some(c => c.name === name && c.date === date);
            if(exists) { skipped++; continue; }
            bakeryContractorSupplies.push({ date: date, name: name, count: Number(r["الحد الأدنى"])||0, price: parseFloat(r["سعر الوحدة"])||0, paid: parseFloat(r["خامات"])||0, responsible: r["الفرن"]||'', notes: r["خامات"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} توريد مخبز بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد توريد المخبز: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function importBakeryInvoicesFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("دقيق كجم");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let number = r["خميرة كجم"] || ''; if(!number) { skipped++; continue; }
            let exists = bakeryInvoices.some(i => i.number === number);
            if(exists) { skipped++; continue; }
            bakeryInvoices.push({ number: number, date: r["ملح"]||'', customer: r["كجم"]||'', count: Number(r["ردة كجم"])||0, unitPrice: parseFloat(r["سولار لتر"])||0, paid: parseFloat(r["تكلفة"])||0, notes: r["التشغيل"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`تم استيراد ${added} فاتورة مخبز بنجاح.\nتم تخطي ${skipped} مكرر.`);
        } catch(ex) { alert("خطأ في استيراد فواتير المخبز: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function generateAndPrintBakeryProductionReport() {
      let container = window.open('', '_blank', 'width=800,height=600');
      let totalBread = bakeryProductions.reduce((s,p) => s + (parseInt(p.breadCount)||0), 0);
      let totalFlour = bakeryProductions.reduce((s,p) => s + (parseFloat(p.flourUsed)||0), 0);
      let totalYeast = bakeryProductions.reduce((s,p) => s + (parseFloat(p.yeastUsed)||0), 0);
      let logoImg = document.querySelector('.print-watermark img');
      let logoSrc = logoImg ? logoImg.src : '';
      let html = `<html dir="rtl"><head><meta charset="UTF-8"><title>للتصدير التاريخ المقاول</title>
        <style>body{font-family: 'Cairo',sans-serif;padding:20px;}
        h2{text-align:center;color:#1b5e20;}
        table{width:100%;border-collapse:collapse;margin:15px 0;}
        th{background:#1b5e20;color:white;padding:8px;text-align:center;}
        td{padding:6px;text-align:center;border:1px solid #ddd;}
        .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:15px 0;}
        .card{background:#f5f5f5;padding:12px;border-radius:8px;text-align:center;}
        .card .num{font-size:22px;font-weight:700;color:#1b5e20;}
        .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);z-index:-1;pointer-events:none;}
        .wm img{width:500px;height:auto;opacity:0.07;}</style></head><body>
        ${logoSrc ? '<div class="wm"><img src="' + logoSrc + '"></div>' : ''}
            <h2>بلاغ الوجبات اليومي المعتمد وبيانات التشغيل</h2>
        <div class="summary">
          <div class="card"><div>إجمالي الأرغفة</div><div class="num">${totalBread}</div></div>
          <div class="card"><div>إجمالي الدقيق (كجم)</div><div class="num">${totalFlour.toFixed(1)}</div></div>
          <div class="card"><div>إجمالي الخميرة (كجم)</div><div class="num">${totalYeast.toFixed(2)}</div></div>
        </div>
        <table><thead><tr><th>التاريخ</th><th>الأرغفة</th><th>الدقيق</th><th>الخميرة</th><th>الملح</th><th>الردة</th><th>السولار</th></tr></thead><tbody>`;
      bakeryProductions.forEach(p => {
        html += `<tr><td>${p.date}</td><td>${p.breadCount}</td><td>${p.flourUsed||0}</td><td>${p.yeastUsed||0}</td><td>${p.saltUsed||0}</td><td>${p.branUsed||0}</td><td>${p.dieselUsed||0}</td></tr>`;
      });
      html += `</tbody></table><div style="text-align:center;color:#888;margin-top:20px;">تم التوليد: ${new Date().toLocaleString('ar-EG')}</div>
        <script>window.print();setTimeout(()=>window.close(),1500);<` + `/script></body></html>`;
      container.document.write(html);
      container.document.close();
    }

    // ============================
    //  1.  REFRESH SYSTEM (الوحدة)
    // ============================
    function refreshSystem() {
      // Save any pending data first
      syncStorage();

      // Re-read all data from localStorage
      employees = _safeJsonParse(_lsGet('lineh_employees'), _safeJsonParse(_lsGet('employees_db'), []));
      roomsCapacity = _safeJsonParse(_lsGet('lineh_rooms_capacity'), _safeJsonParse(_lsGet('rooms_db'), []));
      vacations = _safeJsonParse(_lsGet('lineh_vacations'), []);
      hospitalities = _safeJsonParse(_lsGet('lineh_hospitality'), _safeJsonParse(_lsGet('lineh_hospitality_bak'), []));
      maintenanceRecords = _safeJsonParse(_lsGet('lineh_maintenance'), []);
      septicRecords = _safeJsonParse(_lsGet('lineh_septic'), _safeJsonParse(_lsGet('septic_db'), []));
      excludedEmployees = _safeJsonParse(_lsGet('excludedEmployees'), []);
      inventoryVouchers = _safeJsonParse(_lsGet('lineh_inventory'), []);
      periodicMaintenance = _safeJsonParse(_lsGet('lineh_periodic_maintenance'), []);
      waterStations = _safeJsonParse(_lsGet('lineh_water_stations'), []);
      waterDocs = _safeJsonParse(_lsGet('lineh_water_docs'), []);
      if (!waterDocs.length) { try { waterDocs = _safeJsonParse(_lsGet('lineh_water_docs_mirror'), []); } catch(e) {} }
      // Load full data from IndexedDB (async)
      _idbLoadAll();
      teaSugarDisbursements = _safeJsonParse(_lsGet('lineh_tea_sugar'), []);
      teaSugarBatches = _safeJsonParse(_lsGet('lineh_tea_sugar_batches'), []);
      mealLogs = _safeJsonParse(_lsGet('lineh_meal_logs'), []);
      normalizeMealLogDates();
      mealWaste = _safeJsonParse(_lsGet('linah_meal_waste'), []);
      inventoryItems = _safeJsonParse(_lsGet('lineh_inventory_items'), []);
      contractors = _safeJsonParse(_lsGet('lineh_contractors'), []);
      bakeryIngredients = _safeJsonParse(_lsGet('linah_bakery_ingredients'), bakeryIngredients);
      bakeryProductions = _safeJsonParse(_lsGet('linah_bakery_productions'), []);
      bakeryContractorSupplies = _safeJsonParse(_lsGet('linah_bakery_ctr_supplies'), []);
      bakeryInvoices = _safeJsonParse(_lsGet('linah_bakery_invoices'), []);
      dynamicSectors = _strArr(_safeJsonParse(_lsGet('dyn_sectors'), dynamicSectors));
      dynamicRooms = _strArr(_safeJsonParse(_lsGet('dyn_rooms'), dynamicRooms));
      dynamicSeptics = _strArr(_safeJsonParse(_lsGet('dyn_septics'), dynamicSeptics));
      dynamicDepts = _strArr(_safeJsonParse(_lsGet('dyn_depts'), dynamicDepts));
      dynamicTitles = _strArr(_safeJsonParse(_lsGet('dyn_titles'), dynamicTitles));
      dynamicVisitorTypes = _strArr(_safeJsonParse(_lsGet('dyn_visitor_types'), dynamicVisitorTypes));
      contractorSectors = _strArr(_safeJsonParse(_lsGet('ctr_sectors'), contractorSectors));
      bakeryContractorsNames = _strArr(_safeJsonParse(_lsGet('linah_bakery_contractors_names'), bakeryContractorsNames));
      appUsers = filterLatinUsers(_safeJsonParse(_lsGet('lineh_users'), appUsers));
      currentUser = _lsGet('lineh_current_user') || currentUser;
      syncDeletions = _safeJsonParse(_lsGet('lineh_sync_deletions'), []);
      _applyDeletions();
      updateIngredientSuggestions();

      // Reset all form fields
      document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="search"], textarea').forEach(el => {
        if (!el.id.includes('search') && !el.id.includes('filter')) {
          if (el.id !== 'ctr-daily-rate' && el.id !== 'ctr-beds') el.value = '';
        }
      });
      document.querySelectorAll('select').forEach(el => { if (el.id !== 'filter-status' && el.id !== 'filter-contract' && el.id !== 'filter-dept') el.selectedIndex = 0; });

      // Re-render everything
      sortEmployeesAlphabetically(); rebuildAllDropdowns(); calculateSystemStats();
      renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems();
      renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable();
      renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); autoLogTodayMeals();
      populateContractorSectorDropdown(); renderContractorsTable();
      renderBakeryIngredients(); renderBakeryProductions();
      renderBakeryContractorSupplies();
      renderBakeryInvoices(); renderDashboard(); renderQuickActions(); initAllSortableTables();

      alert('تم تحديث التطبيق وإعادة تحميل البيانات');
    }

    // ============================
    //  2.  INDEXEDDB HELPERS
    // ============================
    function openIDB() {
      return new Promise((resolve, reject) => {
        let req = indexedDB.open('LinehDB', 1);
        req.onupgradeneeded = (e) => {
          if (!e.target.result.objectStoreNames.contains('handles')) {
            e.target.result.createObjectStore('handles');
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
    async function getIDBValue(key) {
      try {
        let db = await openIDB();
        return new Promise((resolve, reject) => {
          let tx = db.transaction('handles', 'readonly');
          let req = tx.objectStore('handles').get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      } catch(e) { return null; }
    }
    async function setIDBValue(key, val) {
      try {
        let db = await openIDB();
        return new Promise((resolve, reject) => {
          let tx = db.transaction('handles', 'readwrite');
          let req = tx.objectStore('handles').put(val, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch(e) {}
    }

    // ============================
    //  2.5  GOOGLE DRIVE INTEGRATION (via Apps Script)
    // ============================
    const DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz41VcdtGwefbOIl7fD7Ciif3QAbjX81QIbmq9yh0-_NYfw8-3OqhiSp7ZIRDQInEVyLw/exec';
    let cloudSyncId = _lsGet('cloudSyncId') || 'lina_system_data';
    let lastCloudData = '';
    let driveConnected = false;

    // Offline queue - IndexedDB
    function openDriveQueueDB() {
      return new Promise(function(resolve, reject) {
        var req = indexedDB.open('LinehDriveQueue', 1);
        req.onupgradeneeded = function(e) {
          if (!e.target.result.objectStoreNames.contains('queue')) {
            e.target.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    }
    async function addToDriveQueue(task) {
      try {
        var db = await openDriveQueueDB();
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('queue', 'readwrite');
          tx.objectStore('queue').add({ task: task, createdAt: Date.now() });
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function(e) { reject(e.target.error); };
        });
      } catch(e) {}
    }
    async function getDriveQueue() {
      try {
        var db = await openDriveQueueDB();
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('queue', 'readonly');
          var req = tx.objectStore('queue').getAll();
          req.onsuccess = function() { resolve(req.result || []); };
          req.onerror = function(e) { reject(e.target.error); };
        });
      } catch(e) { return []; }
    }
    async function clearDriveQueue() {
      try {
        var db = await openDriveQueueDB();
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('queue', 'readwrite');
          tx.objectStore('queue').clear();
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function(e) { reject(e.target.error); };
        });
      } catch(e) {}
    }

    function getDriveViewUrl(fileId) { return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400'; }
    function getDriveOpenUrl(fileId) { return 'https://drive.google.com/file/d/' + fileId + '/view'; }

    async function uploadImageToDrive(file) {
      driveConnected = true; updateDriveStatus();
      var uniqueName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      // Read file as base64 (for local display) AND upload to Drive (for backup)
      var reader = new FileReader();
      var dataUrl = await new Promise(function(resolve) { reader.onload = function(e) { resolve(e.target.result); }; reader.readAsDataURL(file); });
      // Fire-and-forget upload to Drive (background backup)
      try {
        fetch(DRIVE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ data: dataUrl, name: uniqueName, mime: file.type || 'image/jpeg' }) });
      } catch(e) {
        // Offline - queue for later
        addToDriveQueue({ fileData: dataUrl, fileName: uniqueName, mimeType: file.type || 'image/jpeg' });
      }
      // Return base64 data URL for immediate display in the app
      return dataUrl;
    }

    function updateDriveStatus() {
      var el = document.getElementById('drive-status');
      if (el) { el.textContent = driveConnected ? '? خامات' : 'بيانات الفرن خامات'; el.style.color = driveConnected ? '#2e7d32' : '#999'; }
    }

    async function processOfflineQueue() {
      var queue = await getDriveQueue();
      if (!queue.length) return;
      for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        if (item.task && item.task.fileData) {
          try {
            await fetch(DRIVE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ data: item.task.fileData, name: item.task.fileName, mime: item.task.mimeType }) });
          } catch(e) {}
        }
      }
      await clearDriveQueue();
    }

    window.addEventListener('online', function() { processOfflineQueue(); });

    // ============================
    //  2.75  SUPABASE REAL-TIME SYNC (الفرن لا)
    // ============================
    const SUPABASE_URL = 'https://idejmgmftmrniviftcce.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_AvMTa-zmQ4hgA1hJNpYc3g_gu8rlirz';
    var supabaseConnected = false;
    var _deviceId = _lsGet('lineh_device_id');
    if (!_deviceId) { _deviceId = 'd' + Date.now() + Math.random().toString(36).slice(2,9); _lsSet('lineh_device_id', _deviceId); }
    var _sbEndpoint = SUPABASE_URL + '/rest/v1/sync_data';
    var _pulledAt = {};
    var _forcePull = false;
    var     _CODE_VERSION = '3.1';
    (function() {
      _lsSet('_codeVersion', _CODE_VERSION);
    })();


    function updateSupabaseStatus(status) {
      var el = document.getElementById('supabase-status');
      if (!el) return;
      if (status === 'connected') { el.textContent = '✅ متصل'; el.style.color = '#2e7d32'; }
      else if (status === 'connecting') { el.textContent = '🔄 جاري الاتصال...'; el.style.color = '#fdd835'; }
      else { el.textContent = '❌ غير متصل'; el.style.color = '#f44336'; }
    }

    function getAllDataForSync() {
      var o = getAllDataObject();
      ['dynamicSectors','contractorSectors','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicVisitorTypes','bakeryContractorsNames','dynamicStores'].forEach(function(k) { try { if (Array.isArray(o[k])) o[k] = _strArr(o[k]); } catch(e) {} });
      var keys = ['employees','roomsCapacity','vacations','inventoryVouchers','excludedEmployees','contractors','mealLogs','mealWaste','inventoryItems','hospitalities','adminOvertime','maintenanceRecords','septicRecords','periodicMaintenance','teaSugarDisbursements','teaSugarBatches','dynamicSectors','contractorSectors','contractorRooms','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicVisitorTypes','bakeryContractorsNames','dynamicStores','evaluations','evalTemplates','appUsers','auditLog','bakeryIngredients','bakeryProductions','bakeryContractorSupplies','bakeryInvoices','bakeryStockLog','roomAssets','archiveData','quickActions','deptTitles','manualTotalBeds','dailyStats','finTransactions','finBudgets','syncDeletions','waterStations','waterDocs','ingredientMaster','mealSurveys','incident_reports','miniaAssets'];
      var result = {};
      for (var ki = 0; ki < keys.length; ki++) { result[keys[ki]] = o[keys[ki]]; }
      return result;
    }

    function syncLog(msg) {
      var el = document.getElementById('sync-log');
      if (!el) return;
      var d = new Date();
      var t = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0') + ':' + d.getSeconds().toString().padStart(2,'0');
      el.innerHTML = '<div>' + t + ' ' + msg + '</div>' + el.innerHTML;
      if (el.children.length > 20) el.removeChild(el.lastChild);
    }

    var _pushInProgress = false;
    var _pullInProgress = false;

    // Deletion + Update sync: tracks what was deleted/modified across devices
    var syncDeletions = _safeJsonParse(_lsGet('lineh_sync_deletions'), []);
    function _logDeletion(entity, key) {
      syncDeletions.push({ entity: entity, key: key, deletedAt: new Date().toISOString() });
      // keep last 90 days only
      var cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
      syncDeletions = syncDeletions.filter(function(d) { return d.deletedAt > cutoff; });
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
    }
    function _removeDeletion(entity, key) {
      if (!syncDeletions || !Array.isArray(syncDeletions)) return;
      syncDeletions = syncDeletions.filter(function(d) { return !(d.entity === entity && d.key === key); });
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
    }
    function _ts(item) { if (item && typeof item === 'object') item.modifiedAt = new Date().toISOString(); return item; }
    function _archiveStableId(a) {
      var s = String((a.date||'') + '|' + (a.item||'') + '|' + (a.location||'') + '|' + (a.qty||'') + '|' + (a.condition||''));
      var h = 5381;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
      return 'arc_' + h.toString(36);
    }
    function _backfillArchiveIds() {
      if (!Array.isArray(archiveData)) return;
      var changed = false;
      archiveData.forEach(function(a) { if (a && !a.id) { a.id = _archiveStableId(a); changed = true; } });
      return changed;
    }
    function _isDeleted(entity, key, modifiedAt) {
      if (!syncDeletions || !Array.isArray(syncDeletions)) return false;
      return syncDeletions.some(function(d) { return d.entity === entity && d.key === key; });
    }
    function _getItemKey(item, entity) {
      var keyFns = {
        employees: function(e) { return e.id || e.code || e.name; },
        roomsCapacity: function(r) { return r.sector + '|' + r.number; },
        vacations: function(v) { return (v.code || v.employeeCode || v.employeeName || v.name || '') + '|' + (v.start || v.startDate || v.dateFrom || '') + '|' + (v.end || v.endDate || v.dateTo || ''); },
        inventoryVouchers: function(v) { return v.voucherId || v.id || v._id; },
        excludedEmployees: function(e) { return e.id || e.code || e.name; },
        contractors: function(c) { return c.name || c.id; },
        mealLogs: function(m) { return m.date; },
        mealWaste: function(w) { return (w.date||'') + '|' + (w.meal||'') + '|' + (w.createdAt||''); },
        inventoryItems: function(i) { return i.id || i.name; },
        hospitalities: function(h) { return (h.name || '') + '|' + (h.arrival || '') + '|' + (h.type || ''); },
        adminOvertime: function(o) { return (o.date || '') + '|' + (o.empCode || o.name || ''); },
        maintenanceRecords: function(m) { return (m.category || '') + '|' + (m.task || '') + '|' + (m.date || m.createdAt || ''); },
        septicRecords: function(s) { return (s.date || '') + '|' + (s.name || s.sector || '') + '|' + (s.trips || s.quantity || ''); },
        periodicMaintenance: function(p) { return (p.name || p.task || '') + '|' + (p.id || '') + '|' + (p.freq || p.frequency || ''); },
        teaSugarDisbursements: function(t) { return (t.date || '') + '|' + (t.period || t.type || '') + '|' + (t.empCode || t.empId || '') + '|' + (t.teaPacks || t.quantity || '') + '|' + (t.sugarKg || ''); },
        teaSugarBatches: function(t) { return t.id || t._id; },
        evaluations: function(e) { return (e.empCode || e.employeeCode || '') + '|' + (e.date || '') + '|' + (e.month || e.type || '') + '|' + (e.year || ''); },
        appUsers: function(u) { return u.name; },
        auditLog: function(a) { return a.id; },
        bakeryIngredients: function(b) { return b.name; },
        bakeryProductions: function(p) { return normalizeDateStr(p.date) + '|' + (p.breadCount || ''); },
        bakeryContractorSupplies: function(s) { return (s.name || '') + '|' + normalizeDateStr(s.date) + '|' + (s.count || ''); },
        bakeryInvoices: function(inv) { return inv.id || inv._id; },
        bakeryStockLog: function(s) { return (s.date || '') + '|' + (s.materialName || s.ingredient || '') + '|' + (s.type || '') + '|' + (s.reference || ''); },
        roomAssets: function(a) { return (a.room || '') + '|' + (a.item || '') + '|' + (a.id || ''); },
        archiveData: function(a) { return a.id || a.date + '|' + a.item + '|' + a.location; },
        miniaAssets: function(a) { return a.id || a.item + '|' + a.unit + '|' + a.qty + '|' + a.receiver + '|' + a.date; },
        quickActions: function(q) { return q.label; },
        dailyStats: function(d) { return d.date; },
        deptTitles: function(d) { return (d.dept||'') + '|' + (d.title||''); },
        contractorSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        contractorRooms: function(r) { return (r.sector || '') + '|' + (r.number || ''); },
        dynamicSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        dynamicStores: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        dynamicRooms: function(r) { return (typeof r === 'string') ? r : (r.name || r.sector+'|'+r.number || r); },
        dynamicSeptics: function(s) { return (typeof s === 'string') ? s : (s.name || s.id || s); },
        dynamicDepts: function(d) { return (typeof d === 'string') ? d : (d.name || d.id || d); },
        dynamicTitles: function(t) { return (typeof t === 'string') ? t : (t.name || t.title || t); },
        finTransactions: function(t) { return (t.date || '') + '|' + (t.task || '') + '|' + (t.orderNum || '') + '|' + (t.itemName || ''); },
        finBudgets: function(b) { return (b.code || '') + '|' + (b.month || '') + '|' + (b.year || ''); },
        dynamicVisitorTypes: function(t) { return (typeof t === 'string') ? t : (t.name || t); },
        bakeryContractorsNames: function(b) { return (typeof b === 'string') ? b : (b.name || b); },
        waterStations: function(w) { return w.id || w.date + '|' + w.station + '|' + w.type; },
        waterDocs: function(d) { return d.id || d.station + '|' + d.fileName; },
        mealSurveys: function(s) { return s.date + '|' + s.meal + '|' + s.employee; }
      };
      return keyFns[entity] ? keyFns[entity](item) : JSON.stringify(item);
    }

    async function pushToSupabase() {
      if (!supabaseConnected) {
        showSyncToast('? عدد الأرغفة بيانات Supabase — بيانات سعر الوحدة بيانات الإجمالي');
        return false;
      }
      while (_pushInProgress) { await new Promise(function(r) { setTimeout(r, 300); }); }
      _pushInProgress = true;
      try {
        var ts = new Date().toISOString();
        var allData = getAllDataForSync();
        // Load last push snapshot to detect changes
        var _snap = {};
        try { _snap = JSON.parse(_lsGet('_lastPushSnapshot') || '{}'); } catch(e) { _snap = {}; }
        var changed = [], total = 0;
        Object.keys(allData).forEach(function(ak) {
          if (ak === 'incident_reports') return; // handled separately
          var _curr = JSON.stringify(allData[ak]);
          total += _curr.length;
          if (_curr !== _snap[ak]) changed.push(ak);
        });
        // Always push if no snapshot exists (first sync) or if deletions pending
        var hasDeletions = syncDeletions.length > 0;
        // دفع كامل دائماً: قراءة السحابة + دمج عنصري (الزيادة التزايدية RPC تستبدل
        // الكيان كاملاً في السحابة فتطمس تعديلات الأجهزة الأخرى وتُرجع الإجازات المحذوفة)
        var doFullPush = true;
        // Build merge from remote only when needed
        var currentAlldata = {};
        var _delByEntity = {};
        syncDeletions.forEach(function(_d) {
          if (!_delByEntity[_d.entity]) _delByEntity[_d.entity] = {};
          _delByEntity[_d.entity][_d.key] = true;
        });
        // Apply deletions to local arrays before push
        syncDeletions.forEach(function(_del) {
          var _target = allData[_del.entity];
          if (Array.isArray(_target)) {
            allData[_del.entity] = _target.filter(function(_item) { return _getItemKey(_item, _del.entity) !== _del.key; });
          }
        });
        // Recalculate changed after deletions
        if (!doFullPush) {
          changed = [];
          Object.keys(allData).forEach(function(ak) {
            if (ak === 'incident_reports') return;
            var _curr = JSON.stringify(allData[ak]);
            if (_curr !== _snap[ak]) changed.push(ak);
          });
        }
        if (doFullPush) {
          // Full push: read remote, merge all, send back
          try {
            var adResp = await fetch(_sbEndpoint + '?id=eq.alldata&select=data', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
            if (adResp.ok) { var adRows = await adResp.json(); if (adRows && adRows[0] && adRows[0].data) { currentAlldata = typeof adRows[0].data === 'string' ? JSON.parse(adRows[0].data) : adRows[0].data; } }
          } catch(e) {}
          Object.keys(allData).forEach(function(ak) {
            if (Array.isArray(currentAlldata[ak]) && Array.isArray(allData[ak])) {
              if (ak === 'vacations' && typeof window._mergeVacations === 'function') {
                // دمج الإجازات بالتتابع الزمني: التعديل يدمج نسخة واحدة فقط
                // (الأقدم تُحذف عند تداخلها مع الأحدث) والحذف يُحترم عبر delKeys
                currentAlldata[ak] = window._mergeVacations(allData[ak], currentAlldata[ak], 'local', _delByEntity[ak] || {});
              } else {
                currentAlldata[ak] = mergeArraysPush(allData[ak], currentAlldata[ak], function(item) { return _getItemKey(item, ak); }, _delByEntity[ak] || {});
              }
            } else {
              currentAlldata[ak] = allData[ak];
            }
          });
          syncDeletions.forEach(function(_del) {
            var _arr = currentAlldata[_del.entity];
            if (Array.isArray(_arr)) {
              currentAlldata[_del.entity] = _arr.filter(function(_item) { return _getItemKey(_item, _del.entity) !== _del.key; });
            }
          });
          ['bakeryContractorsNames','dynamicVisitorTypes','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicSectors','contractorSectors','dynamicStores','bakeryContractorsNames'].forEach(function(k) { if (Array.isArray(currentAlldata[k])) currentAlldata[k] = _strArr(currentAlldata[k]); });
          if (Array.isArray(currentAlldata.bakeryContractorSupplies)) currentAlldata.bakeryContractorSupplies = currentAlldata.bakeryContractorSupplies.map(function(r) { if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'غير معروف'; return r; });
          var resp = await fetch(_sbEndpoint, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ id: 'alldata', data: currentAlldata, updated_at: ts, device_id: _deviceId })
          });
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          syncLog('تم رفع كل البيانات إلى Supabase');
        } else if (changed.length > 0) {
          // Incremental push: only changed entities via RPC
          var _rpcUrl = SUPABASE_URL + '/rest/v1/rpc/sync_upsert_entity';
          for (var ci = 0; ci < changed.length; ci++) {
            var _ek = changed[ci];
            var _edata = allData[_ek];
            // Normalize string arrays
            if (['bakeryContractorsNames','dynamicVisitorTypes','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicSectors','contractorSectors','dynamicStores','bakeryContractorsNames'].indexOf(_ek) !== -1 && Array.isArray(_edata)) _edata = _strArr(_edata);
            if (_ek === 'bakeryContractorSupplies' && Array.isArray(_edata)) _edata = _edata.map(function(r) { if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'غير معروف'; return r; });
            var _resp = await fetch(_rpcUrl, {
              method: 'POST',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ p_entity: _ek, p_data: _edata })
            });
            if (!_resp.ok) throw new Error('RPC ' + _resp.status + ' for ' + _ek);
          }
          syncLog('تم رفع ' + changed.length + ' جدول متغير إلى Supabase');
        } else {
          syncLog('لا توجد تغييرات للرفع');
        }
        // Update snapshot
        var _newSnap = {};
        Object.keys(allData).forEach(function(ak) { _newSnap[ak] = JSON.stringify(allData[ak]); });
        _lsSet('_lastPushSnapshot', JSON.stringify(_newSnap));
        _pulledAt['_lastPush'] = ts;
        _lsSet('_pulledAt', JSON.stringify(_pulledAt));
        deduplicateAfterSync();
        _takeSnapshot();
        syncStorage(true, true);
        updateLastSyncTime();
        showSyncToast('تم رفع البيانات إلى Supabase بنجاح ✅');
      } catch(e) {
        syncLog('فشل الرفع: ' + e.message);
        showSyncToast('تعذر رفع البيانات إلى Supabase');
      } finally {
        _pushInProgress = false;
      }
      return true;
    }
    async function forceFullSync() {
      if (!supabaseConnected) return alert('غير متصل بـ Supabase');
      if (!confirm('هل تريد تنفيذ مزامنة كاملة (رفع + سحب)؟ سيتم دمج البيانات من جميع الأجهزة.')) return;
      // تخطي مكرر خطأ بيانات push في
      while (_pushInProgress) { await new Promise(function(r) { setTimeout(r, 500); }); }
      syncLog('جارٍ قراءة البيانات...');
      await pushToSupabase();
      syncLog('جارٍ السحب من السحابة...');
      _forcePull = true;
      await pullFromSupabase();
      _forcePull = false;
      syncLog('تمت المزامنة الكاملة بنجاح');
      alert('تمت المزامنة الكاملة بنجاح ✅');
    }
    async function pullFromSupabase() {
      if (!supabaseConnected) return;
      while (_pullInProgress) { await new Promise(function(r) { setTimeout(r, 300); }); }
      _pullInProgress = true;
      try {
        var resp = await fetch(_sbEndpoint + '?select=id,data,updated_at', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Range': '0-*' } });
        if (!resp.ok) {           syncLog('فشل السحب، حالة: ' + resp.status); return; }
        var rows = await resp.json();
        if (rows && rows.length > 0) {
          var mergedData = {};
          var _remoteDels = [];
          for (var ri = 0; ri < rows.length; ri++) {
            var row = rows[ri]; if (!row.id || !row.data || row.id !== 'alldata') continue;
            var _ad = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            if (_ad && typeof _ad === 'object') {
              if (Array.isArray(_ad.syncDeletions)) _remoteDels = _remoteDels.concat(_ad.syncDeletions);
              for (var _aki in _ad) {
                if (_aki === 'syncDeletions') continue;
                mergedData[_aki] = _ad[_aki];
              }
            }
          }
          var _pendingDeletions = syncDeletions.slice();
          syncDeletions = [];
          _lsRemove('lineh_sync_deletions');
          if (Object.keys(mergedData).length > 0) {
            for (var _dk in mergedData) {
              var _dv = mergedData[_dk];
              if (typeof _dv !== 'undefined' && _dv !== null) {
                var _localVal = getEntityVar(_dk);
                if (Array.isArray(_dv) && Array.isArray(_localVal)) {
                  if (_dk === 'vacations' && typeof window._mergeVacations === 'function') {
                    // دمج بدلاً من الاستبدال: تعديل محلي غير مرفوع بعد لا يضيع
                    setEntityVar(_dk, window._mergeVacations(_localVal, _dv, 'remote', null));
                  } else {
                    setEntityVar(_dk, _dv);
                  }
                } else {
                  setEntityVar(_dk, _dv);
                }
              }
            }
            _pendingDeletions = _pendingDeletions.concat(_remoteDels);
            syncDeletions = _pendingDeletions;
            _applyDeletions();
          }
          // Filter excluded employees from the loaded data
          var _exclMap2 = {};
          (excludedEmployees || []).forEach(function(e) { _exclMap2[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !_exclMap2[e.code || e.id || e.name]; });
          deduplicateAfterSync();
          // Normalize simple string arrays that may have objects from Supabase
          var _needsCleanPush = false;
          var _defaults = {
            dynamicSeptics: ["بيارة محطة الفرز الجديدة قطاع 22","بيارة المطبخ","بيارة السكن الاداري","بيارة ق3","بيارة سكن نخالين 22","بيارة ق30","بيارة ق6","بيارة ق27","بيارة قطاع 25","بيارة قطاع 33","بيارة قطاع 24","بيارة البير الجديد","بيارة مبني الادارة","بيارة قطاع 27","بيارة قطاع 29","بيارة قطاع 30","بيارة قطاع 21","بيارة قطاع 1","بيارة قطاع 31","بيارة مجمع الحمامات الخارجيه"],
            dynamicRooms: ["A1", "A2", "B1", "B2", "V1"],
            dynamicDepts: ["الإدارة الإدارية", "الإدارة الهندسية", "الأمن", "الصيانة", "المخبز", "الضيافة"],
            dynamicTitles: ["مهندس", "فني", "عامل", "سائق", "مشرف", "إداري"],
            dynamicSectors: ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"],
            dynamicVisitorTypes: ["ضيوف","سيدات","طلبة مدرسة","سائقين","مقدم خدمة بدون اجر","مقدم خدمة باجر","امن ليلي"],
            contractorSectors: ["قطاع 22", "الخيام", "سكن المقاولين"],
            contractorRooms: [],
            bakeryContractorsNames: [],
            dynamicStores: []
          };
          ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames','dynamicStores'].forEach(function(k) {
            try {
              var arr = getEntityVar(k);
              if (Array.isArray(arr)) {
                var cleaned = _strArr(arr);
                if (cleaned.length === 0 && _defaults[k] && _defaults[k].length > 0) { cleaned = _defaults[k]; _needsCleanPush = true; }
                if (JSON.stringify(cleaned) !== JSON.stringify(arr)) { _needsCleanPush = true; }
                setEntityVar(k, cleaned);
              }
            } catch(e) {}
          });
          if (Array.isArray(bakeryContractorSupplies)) bakeryContractorSupplies = bakeryContractorSupplies.map(function(r) { if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'غير معروف'; return r; });
          // Restrict dynamicSectors after pull to only sectors in roomsCapacity
          var _vSec = {};
          roomsCapacity.forEach(function(_r) { if (_r.sector) _vSec[_r.sector] = true; });
          dynamicSectors = dynamicSectors.filter(function(_s) { return _vSec[_s]; });
          if (!dynamicSectors.length) dynamicSectors = ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"];
          syncLog('تم سحب ' + Object.keys(mergedData).length + ' عنصر من Supabase');
          _pulledAt['_lastPull'] = new Date().toISOString();
          _lsSet('_pulledAt', JSON.stringify(_pulledAt));
          _takeSnapshot();
          syncStorage(true, true);
          // Update push snapshot so next push only sends real changes
          var _allNow = getAllDataForSync();
          var _newSnap = {};
          Object.keys(_allNow).forEach(function(_k) { _newSnap[_k] = JSON.stringify(_allNow[_k]); });
          _lsSet('_lastPushSnapshot', JSON.stringify(_newSnap));
          renderAll();
          try { importBakeryFormData(); } catch(e) {}
          try { importMealWasteFormData(); } catch(e) {}
          try { importDailyDataFormData(); } catch(e) {}
          try { importMealSurveyFormData(); } catch(e) {}
          syncLog('تم السحب بنجاح من السحابة');
          showSyncToast('تم سحب البيانات من السحابة بنجاح ✅');
        } else {
          syncLog('الجهاز هو المصدر الوحيد للبيانات');
        }
      } catch(e) {
        syncLog('خطأ أثناء السحب: ' + e.message);
      } finally {
        _pullInProgress = false;
      }
    }

    // -----------------------------------------------
    
    function renderAll() {
      try { renderTable(); } catch(e) { console.error('renderTable error:', e); }
      try { renderHousingLayout(); } catch(e) { console.error('renderHousingLayout error:', e); }
      try { renderInventoryTable(); } catch(e) { console.error('renderInventoryTable error:', e); }
      try { renderInventoryItems(); } catch(e) { console.error('renderInventoryItems error:', e); }
      try { renderVacationsTable(); } catch(e) { console.error('renderVacationsTable error:', e); }
      try { renderOvertimeCalendar(); } catch(e) { console.error('renderOvertimeCalendar error:', e); }
      try { renderHospitalityTable(); } catch(e) { console.error('renderHospitalityTable error:', e); }
      try { renderMaintenanceTable(); } catch(e) { console.error('renderMaintenanceTable error:', e); }
      try { renderSepticTable(); } catch(e) { console.error('renderSepticTable error:', e); }
      try { renderPeriodicMaintenance(); } catch(e) { console.error('renderPeriodicMaintenance error:', e); }
      try { renderTeaSugarTable(); } catch(e) { console.error('renderTeaSugarTable error:', e); }
      try { renderMealLogTable(); } catch(e) { console.error('renderMealLogTable error:', e); }
      try { renderMealSurvey(); } catch(e) { console.error('renderMealSurvey error:', e); }
      try { renderMealWasteTable(); } catch(e) { console.error('renderMealWasteTable error:', e); }
      try { renderMealWasteStats(); } catch(e) { console.error('renderMealWasteStats error:', e); }
      try { populatePlanDishSelects(); } catch(e) { console.error('populatePlanDishSelects error:', e); }
      try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
      try { renderQuickActions(); } catch(e) { console.error('renderQuickActions error:', e); }
      try { renderContractorsTable(); } catch(e) { console.error('renderContractorsTable error:', e); }
      try { renderBakeryIngredients(); } catch(e) { console.error('renderBakeryIngredients error:', e); }
      try { renderBakeryProductions(); } catch(e) { console.error('renderBakeryProductions error:', e); }
      try { renderBakeryContractorSupplies(); } catch(e) { console.error('renderBakeryContractorSupplies error:', e); }
      try { renderBakeryInvoices(); } catch(e) { console.error('renderBakeryInvoices error:', e); }
      try { updateBakeryStats(); } catch(e) { console.error('updateBakeryStats error:', e); }
      try { updateBreadSupplyStats(); } catch(e) { console.error('updateBreadSupplyStats error:', e); }
      try { rebuildAllDropdowns(); } catch(e) { console.error('rebuildAllDropdowns error:', e); }
      try { populateBctrDatalist(); } catch(e) { console.error('populateBctrDatalist error:', e); }
      try { renderExcludedTable(); } catch(e) { console.error('renderExcludedTable error:', e); }
      try { renderDailyStatsTable(); } catch(e) { console.error('renderDailyStatsTable error:', e); }
      try { renderEvaluations(); } catch(e) { console.error('renderEvaluations error:', e); }
      try { renderFinanceTab(); } catch(e) { console.error('renderFinanceTab error:', e); }
      try { retryPendingReports(); } catch(e) {}
      try { fetchReports(); } catch(e) { console.error('fetchReports error:', e); }
      try { importMealWasteFormData(); } catch(e) { console.error('importMealWasteFormData error:', e); }
      try { importDailyDataFormData(); } catch(e) { console.error('importDailyDataFormData error:', e); }
      try { importMealSurveyFormData(); } catch(e) { console.error('importMealSurveyFormData error:', e); }
    }

    function updateLastSyncTime() {
      var el = document.getElementById('last-sync-time');
      if (!el) return;
      el.textContent = 'آخر مزامنة: ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      el.style.display = 'inline';
    }

    async function connectSupabase() {
      try {
        var r = await fetch(_sbEndpoint + '?select=id&limit=1', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
        if (!r.ok) { syncLog('❌ فشل الاتصال بـ Supabase ' + r.status + ' — سيتم إعادة المحاولة'); setTimeout(connectSupabase, 3000); return; }
        supabaseConnected = true;
        syncLog('✅ تم الاتصال بـ Supabase');
        updateSupabaseStatus('connected');
        setTimeout(function() { pullFromSupabase(); }, 1000);
        updateLastSyncTime();
        startPresence();
        document.getElementById('cloud-status').textContent = '☁️ متصل';
        // ? فشلت المزامنة تحقق — من الاتصال فشل/السحب كود
        // فاضي أو مش بيانات تم (استلام من توريد)
        var reportsPollInterval = setInterval(function() {
          if (!supabaseConnected) return;
          try {
            fetch(SUPABASE_URL + '/rest/v1/sync_data?id=eq.incident_reports&select=data', {
              method: 'GET',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            }).then(function(r) { return r.json(); }).then(function(rows) {
              var count = 0;
              if (rows && rows.length > 0 && rows[0].data) {
                try { var arr = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data; count = arr.length; } catch(e) {}
              }
              var local = JSON.parse(_lsGet('linah_reports') || '[]');
              var totalCount = count + local.length;
              var badge = document.getElementById('badge-reports');
              if (badge) badge.textContent = totalCount;
              if (_prevReportsCount > 0 && totalCount > _prevReportsCount) {
                _flashReportsBadge();
                // بيانات الخبز سجل تم تحديث البيانات
var reportsTab = document.getElementById('tab-reports');
                  if (reportsTab && reportsTab.classList.contains('active')) {
                    fetchReports();
                  }
                }
                _prevReportsCount = totalCount;
              });
            } catch(e) {}
          }, 60000);
          window._reportsPollInterval = reportsPollInterval;
      // لو موظف رجع في القوة، شيله من المستبعدين
          window._mealFormsPollInterval = setInterval(function() {
            if (!supabaseConnected) return;
            try { importBakeryFormData(); } catch(e) {}
            try { importMealWasteFormData(); } catch(e) {}
            try { importDailyDataFormData(); } catch(e) {}
            try { importMealSurveyFormData(); } catch(e) {}
          }, 60000);
      } catch(e) { 
          // Clear intervals when disconnected
          if (window._reportsPollInterval) { clearInterval(window._reportsPollInterval); window._reportsPollInterval = null; }
          if (window._mealFormsPollInterval) { clearInterval(window._mealFormsPollInterval); window._mealFormsPollInterval = null; }
          console.log('بيانات Supabase connect error — retry 30s'); 
          setTimeout(connectSupabase, 30000); 
        }
    }
    setTimeout(connectSupabase, 5000);
    // backward compatibility for old code references
    var _lastSyncHashes = {}, _lastRemoteTimestamps = {}, _supabasePollTimer = null, _reconnectTimer = null, _migratedFromSingleton = false;
    function syncToSupabase() { pushToSupabase(); }
    function pollSupabase() { pullFromSupabase(); }
    var debouncedSyncToSupabase = function() { setTimeout(pushToSupabase, 500); };

    // backward compat for old function refs
    var DATA_KEYS = ['employees','roomsCapacity','vacations','hospitalities','maintenanceRecords','septicRecords','inventoryVouchers','inventoryItems','excludedEmployees','periodicMaintenance','teaSugarDisbursements','teaSugarBatches','mealLogs','mealWaste','contractors','dynamicSectors','dynamicStores','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','deptTitles','appUsers','auditLog','bakeryIngredients','bakeryProductions','bakeryContractorSupplies','bakeryInvoices','currentUser','manualTotalBeds','roomAssets','archiveData','quickActions','waterStations','waterDocs','finTransactions','finBudgets','ingredientMaster','mealSurveys','incident_reports','miniaAssets'];

    // Snapshot after pull — نعرف إيه اللي اتشال عشان push ما يضيفوش تاني
    var _snapshotKeys = {};
    var _editSnapshot = null;
    function _getKey(item, keyFn) { return keyFn ? keyFn(item) : (item.id || item.code || item.name || JSON.stringify(item)); }
    function _takeSnapshot() {
      _snapshotKeys = {};
      DATA_KEYS.forEach(function(k) { var a = _getEntityArray(k); if (a && a.length) { _snapshotKeys[k] = {}; a.forEach(function(item) { _snapshotKeys[k][_getKey(item)] = true; }); } });
    }
    function _getEntityArray(key) {
      if (key==='employees') return employees; if (key==='roomsCapacity') return roomsCapacity; if (key==='vacations') return vacations;
      if (key==='hospitalities') return hospitalities; if (key==='maintenanceRecords') return maintenanceRecords; if (key==='septicRecords') return septicRecords;
      if (key==='inventoryVouchers') return inventoryVouchers; if (key==='inventoryItems') return inventoryItems; if (key==='excludedEmployees') return excludedEmployees;
      if (key==='periodicMaintenance') return periodicMaintenance; if (key==='teaSugarDisbursements') return teaSugarDisbursements; if (key==='teaSugarBatches') return teaSugarBatches;
      if (key==='mealLogs') return mealLogs; if (key==='mealWaste') return mealWaste; if (key==='contractors') return contractors; if (key==='dynamicSectors') return dynamicSectors; if (key==='dynamicStores') return dynamicStores; if (key==='dynamicRooms') return dynamicRooms;
      if (key==='dynamicSeptics') return dynamicSeptics; if (key==='dynamicDepts') return dynamicDepts; if (key==='dynamicTitles') return dynamicTitles; if (key==='deptTitles') return deptTitles;
      if (key==='appUsers') return appUsers; if (key==='auditLog') return auditLog; if (key==='bakeryIngredients') return bakeryIngredients; if (key==='bakeryProductions') return bakeryProductions;
      if (key==='bakeryContractorSupplies') return bakeryContractorSupplies; if (key==='bakeryInvoices') return bakeryInvoices; if (key==='roomAssets') return roomAssets;
      if (key==='archiveData') return archiveData; if (key==='miniaAssets') return miniaAssets; if (key==='quickActions') return quickActions;
      if (key==='waterStations') return waterStations; if (key==='waterDocs') return waterDocs;
      if (key==='adminOvertime') return adminOvertime; if (key==='contractorSectors') return contractorSectors; if (key==='contractorRooms') return contractorRooms;
      if (key==='evaluations') return evaluations; if (key==='evalTemplates') return evalTemplates; if (key==='bakeryStockLog') return bakeryStockLog;
      if (key==='finTransactions') return finTransactions; if (key==='finBudgets') return finBudgets;
      if (key==='ingredientMaster') return ingredientMaster;
      if (key==='mealSurveys') return mealSurveys;
      return null;
    }
    function _getDeletedSinceSnapshot(key, items, keyFn) {
      var snap = _snapshotKeys[key];
      if (!snap) return {};
      var current = {};
      (items || []).forEach(function(item) { current[_getKey(item, keyFn)] = true; });
      var del = {};
      for (var k in snap) { if (!current[k]) del[k] = true; }
      return del;
    }

    // Presence removed — التحويل خطأ
    var _lastAction = '';
    function setAction(action) { _lastAction = action; }
    function startPresence() {}
    function stopPresence() {}
    function setEntityVar(key, val) {
      if (key === 'employees') employees = val;
      else if (key === 'roomsCapacity') roomsCapacity = val;
      else if (key === 'vacations') vacations = val;
      else if (key === 'inventoryVouchers') inventoryVouchers = val;
      else if (key === 'excludedEmployees') excludedEmployees = val;
      else if (key === 'contractors') contractors = val;
      else if (key === 'mealLogs') mealLogs = val;
      else if (key === 'mealWaste') mealWaste = val;
      else if (key === 'inventoryItems') inventoryItems = val;
      else if (key === 'hospitalities') hospitalities = val;
      else if (key === 'adminOvertime') adminOvertime = val;
      else if (key === 'maintenanceRecords') maintenanceRecords = val;
      else if (key === 'septicRecords') septicRecords = val;
      else if (key === 'periodicMaintenance') periodicMaintenance = val;
      else if (key === 'teaSugarDisbursements') teaSugarDisbursements = val;
      else if (key === 'teaSugarBatches') teaSugarBatches = val;
      else if (key === 'dynamicSectors') dynamicSectors = val;
      else if (key === 'dynamicStores') dynamicStores = _strArr(val);
      else if (key === 'contractorSectors') contractorSectors = val;
      else if (key === 'contractorRooms') { contractorRooms = Array.isArray(val) ? val.filter(function(r) { return r && typeof r === 'object' && r.sector && r.number; }) : []; }
      else if (key === 'dynamicRooms') dynamicRooms = val;
      else if (key === 'dynamicSeptics') dynamicSeptics = val;
      else if (key === 'dynamicDepts') dynamicDepts = val;
      else if (key === 'dynamicTitles') dynamicTitles = val;
      else if (key === 'dynamicVisitorTypes') dynamicVisitorTypes = val;
      else if (key === 'bakeryContractorsNames') { val = _strArr(val); var _fixedCtrs = ["محمد شعبان","ممدوح بكر","عاطف عبد المغيث","مصطفى على","اسامه سمير","فارس محمد","محمود السيد"]; var _ctrSet = {}; _fixedCtrs.forEach(function(n) { _ctrSet[n] = true; }); val = val.filter(function(n) { return _ctrSet[n]; }); _fixedCtrs.forEach(function(n) { if (val.indexOf(n) === -1) val.push(n); }); if (!val.length) val = _fixedCtrs.slice(); bakeryContractorsNames = val; }
      else if (key === 'evaluations') evaluations = val;
      else if (key === 'evalTemplates') evalTemplates = val;
      else if (key === 'appUsers') appUsers = filterLatinUsers(val);
      else if (key === 'auditLog') auditLog = val;
      else if (key === 'bakeryIngredients') bakeryIngredients = val;
      else if (key === 'bakeryProductions') bakeryProductions = val;
      else if (key === 'bakeryContractorSupplies') bakeryContractorSupplies = val;
      else if (key === 'bakeryInvoices') bakeryInvoices = val;
      else if (key === 'bakeryStockLog') bakeryStockLog = val;
      else if (key === 'roomAssets') roomAssets = val;
      else if (key === 'archiveData') archiveData = val;
      else if (key === 'miniaAssets') miniaAssets = val;
      else if (key === 'quickActions') quickActions = val;
      else if (key === 'waterStations') waterStations = val;
      else if (key === 'waterDocs') waterDocs = val;
      else if (key === 'dailyStats') dailyStats = val;
      else if (key === 'finTransactions') finTransactions = val;
      else if (key === 'finBudgets') finBudgets = val;
      else if (key === 'manualTotalBeds') manualTotalBeds = val;
      else if (key === 'deptTitles') deptTitles = val;
      else if (key === 'syncDeletions') syncDeletions = val;
      else if (key === 'ingredientMaster') ingredientMaster = val;
      else if (key === 'mealSurveys') mealSurveys = val;
    }
    function getEntityVar(key) {
      if (key === 'employees') return employees;
      else if (key === 'roomsCapacity') return roomsCapacity;
      else if (key === 'vacations') return vacations;
      else if (key === 'inventoryVouchers') return inventoryVouchers;
      else if (key === 'excludedEmployees') return excludedEmployees;
      else if (key === 'contractors') return contractors;
      else if (key === 'mealLogs') return mealLogs;
      else if (key === 'mealWaste') return mealWaste;
      else if (key === 'inventoryItems') return inventoryItems;
      else if (key === 'hospitalities') return hospitalities;
      else if (key === 'adminOvertime') return adminOvertime;
      else if (key === 'maintenanceRecords') return maintenanceRecords;
      else if (key === 'septicRecords') return septicRecords;
      else if (key === 'periodicMaintenance') return periodicMaintenance;
      else if (key === 'teaSugarDisbursements') return teaSugarDisbursements;
      else if (key === 'teaSugarBatches') return teaSugarBatches;
      else if (key === 'dynamicSectors') return dynamicSectors;
      else if (key === 'dynamicStores') return dynamicStores;
      else if (key === 'contractorSectors') return contractorSectors;
      else if (key === 'contractorRooms') return contractorRooms;
      else if (key === 'dynamicRooms') return dynamicRooms;
      else if (key === 'dynamicSeptics') return dynamicSeptics;
      else if (key === 'dynamicDepts') return dynamicDepts;
      else if (key === 'dynamicTitles') return dynamicTitles;
      else if (key === 'evaluations') return evaluations;
      else if (key === 'evalTemplates') return evalTemplates;
      else if (key === 'appUsers') return appUsers;
      else if (key === 'auditLog') return auditLog;
      else if (key === 'bakeryIngredients') return bakeryIngredients;
      else if (key === 'bakeryProductions') return bakeryProductions;
      else if (key === 'bakeryContractorSupplies') return bakeryContractorSupplies;
      else if (key === 'bakeryInvoices') return bakeryInvoices;
      else if (key === 'bakeryStockLog') return bakeryStockLog;
      else if (key === 'roomAssets') return roomAssets;
      else if (key === 'archiveData') return archiveData;
      else if (key === 'miniaAssets') return miniaAssets;
      else if (key === 'quickActions') return quickActions;
      else if (key === 'waterStations') return waterStations;
      else if (key === 'waterDocs') return waterDocs;
      else if (key === 'dailyStats') return dailyStats;
      else if (key === 'finTransactions') return finTransactions;
      else if (key === 'finBudgets') return finBudgets;
      else if (key === 'manualTotalBeds') return manualTotalBeds;
      else if (key === 'deptTitles') return deptTitles;
      else if (key === 'syncDeletions') return syncDeletions;
      else if (key === 'ingredientMaster') return ingredientMaster;
      else if (key === 'mealSurveys') return mealSurveys;
    }
    function mergeArrays(localArr, remoteArr, keyFn) {
      if (!remoteArr || !remoteArr.length) return localArr || [];
      if (!localArr || !localArr.length) return remoteArr;
      var result = [].concat(localArr);
      var keys = {};
      localArr.forEach(function(item) {
        var k = keyFn ? keyFn(item) : JSON.stringify(item);
        keys[k] = true;
      });
      remoteArr.forEach(function(item) {
        var k = keyFn ? keyFn(item) : JSON.stringify(item);
      if (!keys[k]) { result.push(item); keys[k] = true; }
      });
      return result;
    }
    function mergeArraysPush(localArr, remoteArr, keyFn, deletedKeys) {
      // For push: local items first (respects deletes), apply remote field updates,
      // and add remote items not in local UNLESS explicitly deleted.
      if (!remoteArr || !remoteArr.length) return localArr || [];
      if (!localArr || !localArr.length) return remoteArr;
      var remoteKeyed = {};
      remoteArr.forEach(function(item) { remoteKeyed[_getKey(item, keyFn)] = item; });
      var merged = localArr.map(function(item) {
        var k = _getKey(item, keyFn);
        return remoteKeyed[k] ? Object.assign({}, remoteKeyed[k], item) : item;
      });
      var localKeys = {};
      localArr.forEach(function(item) { localKeys[_getKey(item, keyFn)] = true; });
      var del = deletedKeys || {};
      remoteArr.forEach(function(item) {
        var k = _getKey(item, keyFn);
        if (!localKeys[k] && !del[k]) { merged.push(item); localKeys[k] = true; }
      });
      return merged;
    }
    function mergeArraysUpdate(localArr, remoteArr, keyFn) {
      if (!remoteArr || !remoteArr.length) return localArr || [];
      if (!localArr || !localArr.length) return remoteArr || [];
      var remoteKeyed = {};
      remoteArr.forEach(function(item) { remoteKeyed[keyFn ? keyFn(item) : JSON.stringify(item)] = item; });
      var localKeyed = {};
      localArr.forEach(function(item) { localKeyed[keyFn ? keyFn(item) : JSON.stringify(item)] = item; });
      var result = localArr.map(function(item) {
        var k = keyFn ? keyFn(item) : JSON.stringify(item);
        return remoteKeyed[k] || item;
      });
      // إضافة العناصر الجديدة من الـ remote (الموجودة في remote مش في local)
      remoteArr.forEach(function(item) {
        var k = keyFn ? keyFn(item) : JSON.stringify(item);
        if (!localKeyed[k]) result.push(item);
      });
      return result;
    }
    function dedupArray(arr, keyFn) {
      if (!arr || !arr.length) return arr || [];
      var seen = {}, result = [];
      arr.forEach(function(item) {
        var k = keyFn ? keyFn(item) : JSON.stringify(item);
        if (!seen[k]) { seen[k] = true; result.push(item); }
      });
      return result;
    }

    function _applyDeletions() {
      if (!syncDeletions || !Array.isArray(syncDeletions) || syncDeletions.length === 0) return;
      var _keyFns = {
        employees: function(e) { return e.id || e.code || e.name; },
        roomsCapacity: function(r) { return r.sector + '|' + r.number; },
        vacations: function(v) { return (v.code||v.employeeCode||v.employeeName||v.name||'') + '|' + (v.start||v.startDate||v.dateFrom||'') + '|' + (v.end||v.endDate||v.dateTo||''); },
        inventoryVouchers: function(v) { return v.voucherId || v.id || v._id; },
        excludedEmployees: function(e) { return e.id || e.code || e.name; },
        contractors: function(c) { return c.name || c.id; },
        mealLogs: function(m) { return m.date; },
        mealWaste: function(w) { return (w.date||'') + '|' + (w.meal||'') + '|' + (w.createdAt||''); },
        inventoryItems: function(i) { return i.id || i.name; },
        hospitalities: function(h) { return (h.name||'') + '|' + (h.arrival||'') + '|' + (h.type||''); },
        adminOvertime: function(o) { return (o.date||'') + '|' + (o.empCode||o.name||''); },
        maintenanceRecords: function(m) { return (m.category||'') + '|' + (m.task||'') + '|' + (m.date||m.createdAt||''); },
        septicRecords: function(s) { return (s.date||'') + '|' + (s.name||s.sector||'') + '|' + (s.trips||s.quantity||''); },
        periodicMaintenance: function(p) { return (p.name||p.task||'') + '|' + (p.id||'') + '|' + (p.freq||p.frequency||''); },
        teaSugarDisbursements: function(t) { return (t.date||'') + '|' + (t.period||t.type||'') + '|' + (t.empCode||t.empId||'') + '|' + (t.teaPacks||t.quantity||'') + '|' + (t.sugarKg||''); },
        teaSugarBatches: function(b) { return b.id || b._id; },
        dynamicSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        dynamicStores: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        dynamicRooms: function(r) { return (typeof r === 'string') ? r : (r.name || r.sector+'|'+r.number || r); },
        dynamicSeptics: function(s) { return (typeof s === 'string') ? s : (s.name || s.id || s); },
        dynamicDepts: function(d) { return (typeof d === 'string') ? d : (d.name || d.id || d); },
        dynamicTitles: function(t) { return (typeof t === 'string') ? t : (t.name || t.title || t); },
        contractorSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        contractorRooms: function(r) { return (r.sector||'') + '|' + (r.number||''); },
        dynamicVisitorTypes: function(t) { return (typeof t === 'string') ? t : (t.name || t); },
        bakeryContractorsNames: function(b) { return (typeof b === 'string') ? b : (b.name || b); },
        appUsers: function(u) { return u.name || u.username || u; },
        bakeryIngredients: function(b) { return b.name; },
        bakeryProductions: function(p) { return normalizeDateStr(p.date) + '|' + (p.breadCount||''); },
        bakeryContractorSupplies: function(s) { return (s.name||'') + '|' + normalizeDateStr(s.date) + '|' + (s.count||''); },
        bakeryInvoices: function(inv) { return inv.id || inv._id; },
        bakeryStockLog: function(b) { return b.id || b.date || b; },
        roomAssets: function(a) { return (a.room||'') + '|' + (a.item||'') + '|' + (a.id||''); },
        archiveData: function(a) { return a.id || a.date + '|' + a.item + '|' + a.location; },
        miniaAssets: function(a) { return a.id || a.item + '|' + a.unit + '|' + a.qty + '|' + a.receiver + '|' + a.date; },
        quickActions: function(q) { return q.label || q; },
        deptTitles: function(d) { return (d.dept||'') + '|' + (d.title||''); },
        evaluations: function(e) { return (e.empCode||e.employeeCode||'') + '|' + (e.date||'') + '|' + (e.month||e.type||'') + '|' + (e.year||''); },
        evalTemplates: function(e) { return (e.title||'') + '|' + (e.name||e.templateName||''); },
        waterStations: function(w) { return w.id || w.date + '|' + w.station + '|' + w.type; },
        waterDocs: function(d) { return d.id || d.station + '|' + d.fileName; },
        mealSurveys: function(s) { return s.date + '|' + s.meal + '|' + s.employee; }
      };
      syncDeletions.forEach(function(del) {
        // قوائم الأسماء (البيارات/المخازن/الأقسام...): حذفها لا يُطبَّق أبداً — لا تَنقُص
        var _nlk = window.NAME_LIST_KEYS || ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames','dynamicStores','deptTitles'];
        if (_nlk.indexOf(del.entity) !== -1) return;
        var fn = _keyFns[del.entity];
        if (!fn) return;
        var arr = getEntityVar(del.entity);
        if (!arr || !Array.isArray(arr)) return;
        var filtered = arr.filter(function(item) { return fn(item) !== del.key; });
        if (filtered.length !== arr.length) setEntityVar(del.entity, filtered);
      });
    }
    function deduplicateAfterSync() {
      function dedupBy(arr, keyFn) {
        var seen = {};
        for (var i = arr.length - 1; i >= 0; i--) {
          var k = keyFn(arr[i]);
          if (seen[k]) arr.splice(i, 1); else seen[k] = true;
        }
      }
      dedupBy(hospitalities, function(h) { return (h.name || '') + '|' + (h.arrival || '') + '|' + (h.type || ''); });
      dedupBy(bakeryProductions, function(p) { return p.id || (normalizeDateStr(p.date) + '|' + (p.breadCount || '') + '|' + (p.flourUsed || '') + '|' + (p.createdAt || '')); });
      dedupBy(bakeryContractorSupplies, function(s) { return (s.name || '') + '|' + normalizeDateStr(s.date) + '|' + (s.count || ''); });
      dedupBy(vacations, function(v) { return (v.code || v.employeeCode || v.employeeName || v.name || '') + '|' + (v.start || v.startDate || v.dateFrom || '') + '|' + (v.end || v.endDate || v.dateTo || ''); });
      dedupBy(maintenanceRecords, function(m) { return (m.category || '') + '|' + (m.task || '') + '|' + (m.date || m.createdAt || ''); });
      dedupBy(septicRecords, function(s) { return (s.date || '') + '|' + (s.name || s.sector || '') + '|' + (s.trips || s.quantity || ''); });
      dedupBy(teaSugarDisbursements, function(t) { return (t.date || '') + '|' + (t.period || t.type || '') + '|' + (t.empCode || t.empId || '') + '|' + (t.teaPacks || t.quantity || '') + '|' + (t.sugarKg || ''); });
      dedupBy(mealLogs, function(m) { return m.date || JSON.stringify(m); });
      dedupBy(mealWaste, function(w) { return (w.date||'') + '|' + (w.meal||'') + '|' + (w.createdAt||''); });
      dedupBy(bakeryInvoices, function(inv) { return inv.id || inv._id || JSON.stringify(inv); });
      dedupBy(employees, function(e) { return e.code || e.name || JSON.stringify(e); });
      dedupBy(contractors, function(c) { return c.name || c.id || JSON.stringify(c); });
      dedupBy(inventoryItems, function(i) { return i.id || i.name || JSON.stringify(i); });
      dedupBy(excludedEmployees, function(e) { return e.code || e.name || JSON.stringify(e); });
      dedupBy(periodicMaintenance, function(p) { return (p.name || p.task || '') + '|' + (p.id || '') + '|' + (p.freq || p.frequency || ''); });
      dedupBy(bakeryIngredients, function(b) { return b.name || JSON.stringify(b); });
      dedupBy(adminOvertime, function(o) { return (o.date || '') + '|' + (o.empCode || o.name || '') + '|' + (o.hours || ''); });
      dedupBy(inventoryVouchers, function(v) { return v.voucherId || v.id || v._id || JSON.stringify(v); });
      dedupBy(finTransactions, function(t) { return (t.date || '') + '|' + (t.task || '') + '|' + (t.orderNum || '') + '|' + (t.itemName || ''); });
      dedupBy(finBudgets, function(b) { return (b.code || '') + '|' + (b.month || '') + '|' + (b.year || ''); });
      dedupBy(waterStations, function(w) { return w.id || w.date + '|' + w.station + '|' + w.type; });
      dedupBy(archiveData, function(a) { return a.id || a.date + '|' + a.item + '|' + a.location; });
      dedupBy(miniaAssets, function(a) { return a.id || a.item + '|' + a.unit + '|' + a.qty + '|' + a.receiver + '|' + a.date; });
      dedupBy(waterDocs, function(d) { return d.id || d.station + '|' + d.fileName; });
      dedupBy(mealSurveys, function(s) { return s.date + '|' + s.meal + '|' + s.employee; });
    }

    function showSyncToast(msg) {
      var el = document.getElementById('sync-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'sync-toast';
        el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1b5e20;color:white;padding:10px 24px;border-radius:8px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;direction:rtl;font-family:Cairo,sans-serif;';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = '1';
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(function() { el.style.opacity = '0'; }, 4000);
    }

    function initSupabaseSync() { connectSupabase(); }
    async function manualSync() {
      var btn = document.querySelector('button[onclick="manualSync()"]');
      var orig = btn.textContent;
      btn.textContent = 'جارٍ المزامنة...';
      btn.disabled = true;
      try {
        supabaseConnected = false;
        document.getElementById('supabase-status').textContent = 'جارٍ الاتصال بـ Supabase...';
        document.getElementById('cloud-status').textContent = 'حالة السحابة...';
        await connectSupabase();
        if (!supabaseConnected) { showSyncToast('تعذر الاتصال بـ Supabase'); btn.textContent = orig; btn.disabled = false; return; }
        // آخر مزامنة اتصال فشل
        await pullFromSupabase();
        await pushToSupabase();
        showSyncToast('تمت المزامنة بنجاح ✅');
      } catch(e) {
        showSyncToast('حدث خطأ أثناء المزامنة');
      }
      btn.textContent = orig;
      btn.disabled = false;
    }
    async function manualPush() {
      if (!supabaseConnected) return showSyncToast('غير متصل بـ Supabase');
      var btn = document.querySelector('button[onclick="manualPush()"]');
      var orig = btn.textContent;
      btn.textContent = 'جارٍ الرفع للسحابة...';
      btn.disabled = true;
      try {
        await pushToSupabase();
          showSyncToast('تم رفع البيانات إلى Supabase ✅');
      } catch(e) {
        showSyncToast('حدث خطأ أثناء الرفع');
      }
      btn.textContent = orig;
      btn.disabled = false;
    }
    async function manualPull() {
      var btn = document.querySelector('button[onclick="manualPull()"]');
      var orig = btn.textContent;
      btn.textContent = 'جارٍ السحب...';
      btn.disabled = true;
      try {
        supabaseConnected = false;
        document.getElementById('supabase-status').textContent = 'جارٍ تعطيل السحب...';
        document.getElementById('cloud-status').textContent = 'المزامنة الدورية معطلة...';
        _forcePull = true;
        await connectSupabase();
        if (!supabaseConnected) { showSyncToast('تعذر الاتصال بـ Supabase'); btn.textContent = orig; btn.disabled = false; _forcePull = false; return; }
        await pullFromSupabase();
        showSyncToast('تم سحب البيانات بنجاح ✅');
      } catch(e) {
        showSyncToast('خطأ أثناء السحب: ' + e.message);
      }
       _forcePull = false;
       btn.textContent = orig;
       btn.disabled = false;
     }

    // Manual pull from local IndexedDB (no auto-pull on load)
    async function pullFromDatabase() {
      var btn = document.querySelector('button[onclick="pullFromDatabase()"]');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'جارٍ السحب...'; btn.disabled = true; }
      try {
        if (!window.indexedDB) { showSyncToast('IndexedDB غير مدعوم'); return; }
        var loaded = await _idbLoadAll();
        if (loaded) {
          if (!roomsCapacity.length) rebuildRoomsFromEmployees();
          syncStorage();
          renderAll();
          renderHousingLayout(); updateHousingStats();
          showSyncToast('تم السحب من قاعدة البيانات المحلية ✅');
        } else {
          showSyncToast('لا توجد بيانات في قاعدة البيانات المحلية');
        }
      } catch(e) {
        showSyncToast('خطأ أثناء السحب: ' + (e && e.message ? e.message : e));
      }
      if (btn) { btn.textContent = orig; btn.disabled = false; }
    }

    async function syncToCloud() {
      try {
        var backup = {
          employees, roomsCapacity, vacations, hospitalities, maintenanceRecords,
          septicRecords, inventoryVouchers, inventoryItems, excludedEmployees,
          periodicMaintenance, teaSugarDisbursements, teaSugarBatches, mealLogs, contractors,
          dynamicSectors, dynamicRooms, dynamicSeptics, dynamicDepts, dynamicTitles,
        appUsers, currentUser, dynamicVisitorTypes, bakeryIngredients, bakeryProductions,
          bakeryContractorSupplies, bakeryInvoices,
          syncDeletions: syncDeletions
        };
        var json = JSON.stringify(backup);
        if (json === lastCloudData) return;
        await fetch(DRIVE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ key: cloudSyncId, data: json }) });
        lastCloudData = json;
        _lsSet('cloudSyncId', cloudSyncId);
        _lsSet('_cloudSyncTime', Date.now());
        document.getElementById('cloud-status').textContent = 'تم الحفظ في السحابة ✅';
        document.getElementById('cloud-status').style.color = '#2e7d32';
      } catch(e) {
        document.getElementById('cloud-status').textContent = 'فشل المزامنة مع السحابة ❌';
        document.getElementById('cloud-status').style.color = '#f44336';
      }
    }

    async function loadFromCloud() {
      try {
        var res = await fetch(DRIVE_SCRIPT_URL + '?key=' + cloudSyncId);
        if (!res.ok) return;
        var data = await res.json();
        if (!data || !data.employees) return;
        var localJson = JSON.stringify({employees,roomsCapacity,vacations,hospitalities,maintenanceRecords,septicRecords,inventoryVouchers,inventoryItems,excludedEmployees,periodicMaintenance,teaSugarDisbursements,teaSugarBatches,mealLogs,contractors,dynamicSectors,contractorSectors,contractorRooms,dynamicRooms,dynamicSeptics,dynamicDepts,dynamicTitles,deptTitles,appUsers,currentUser,bakeryIngredients,bakeryProductions,bakeryContractorSupplies,bakeryInvoices,manualTotalBeds});
        lastCloudData = JSON.stringify(data);
        if (data.syncDeletions && Array.isArray(data.syncDeletions)) {
          syncDeletions = (Array.isArray(syncDeletions) ? syncDeletions : []).concat(data.syncDeletions);
          _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
          _applyDeletions();
          var _cloudKeys = {};
          data.syncDeletions.forEach(function(d) { _cloudKeys[d.entity + '|' + d.key] = true; });
          syncDeletions = syncDeletions.filter(function(d) { return !_cloudKeys[d.entity + '|' + d.key]; });
          _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
        }
        if (JSON.stringify(data) === localJson) return;
        var localTime = parseInt(_lsGet('_localChangeTime')) || 0;
        var cloudTime = parseInt(_lsGet('_cloudSyncTime')) || 0;
        if (localTime > cloudTime) {
          renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems(); renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable(); renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); renderDashboard(); renderQuickActions(); renderContractorsTable(); renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
          updateBakeryStats(); updateBreadSupplyStats();
          return;
        }
        if (data.employees) employees = data.employees;
        if (data.roomsCapacity) roomsCapacity = data.roomsCapacity;
        if (data.vacations) vacations = data.vacations;
        if (data.hospitalities) hospitalities = data.hospitalities;
        if (data.maintenanceRecords) maintenanceRecords = data.maintenanceRecords;
        if (data.septicRecords) septicRecords = data.septicRecords;
        if (data.inventoryVouchers) inventoryVouchers = data.inventoryVouchers;
        if (data.inventoryItems) inventoryItems = data.inventoryItems;
        if (data.excludedEmployees) excludedEmployees = data.excludedEmployees;
        if (data.periodicMaintenance) periodicMaintenance = data.periodicMaintenance;
        if (data.teaSugarDisbursements) teaSugarDisbursements = data.teaSugarDisbursements;
        if (data.teaSugarBatches) teaSugarBatches = data.teaSugarBatches;
        if (data.mealLogs) mealLogs = data.mealLogs;
        if (data.contractors) contractors = data.contractors;
        if (data.contractorSectors) contractorSectors = data.contractorSectors;
        if (data.contractorRooms) contractorRooms = data.contractorRooms;
        if (data.dynamicSectors) dynamicSectors = data.dynamicSectors;
        if (data.dynamicRooms) dynamicRooms = data.dynamicRooms;
        if (data.dynamicSeptics) dynamicSeptics = data.dynamicSeptics;
        if (data.dynamicDepts) dynamicDepts = data.dynamicDepts;
        if (data.dynamicTitles) dynamicTitles = data.dynamicTitles;
        if (data.deptTitles) deptTitles = data.deptTitles;
        if (data.appUsers) appUsers = filterLatinUsers(data.appUsers);
        if (data.currentUser) currentUser = data.currentUser;
        if (data.bakeryIngredients) {
          var localQty = {}; bakeryIngredients.forEach(function(ing) { localQty[ing.id] = ing.currentQty || 0; });
          data.bakeryIngredients.forEach(function(ing) {
            if (localQty[ing.id] !== undefined && localQty[ing.id] > (ing.currentQty || 0)) ing.currentQty = localQty[ing.id];
          });
          bakeryIngredients = data.bakeryIngredients;
        }
        if (data.bakeryProductions) bakeryProductions = data.bakeryProductions;
        if (data.bakeryContractorSupplies) bakeryContractorSupplies = data.bakeryContractorSupplies;
        if (data.bakeryInvoices) bakeryInvoices = data.bakeryInvoices;
        if (typeof data.manualTotalBeds === 'number') manualTotalBeds = data.manualTotalBeds;
        _applyDeletions();
        // نعرف إيه اللي بيانات اتشال عشان ما
        if (excludedEmployees.length > 0) {
          var exclMap = {};
          excludedEmployees.forEach(function(e) { exclMap[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !exclMap[e.code || e.id || e.name]; });
        }
        normalizeBakeryDates(true);
        ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames'].forEach(function(k) {
          try { var v = eval(k); if (Array.isArray(v)) eval(k + ' = _strArr(v)'); } catch(e) {}
        });
        if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
        if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
        if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });
        syncStorage(true);
        renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems(); renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable(); renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); renderDashboard(); renderQuickActions(); renderContractorsTable(); renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
        rebuildAllDropdowns();
        updateBakeryStats(); updateBreadSupplyStats();
      } catch(e) {}
    }

    // ============================
    //  3.  BACKUP DIRECTORY (D:\)
    // ============================
    let backupDirHandle = null;
    let cachedBackupFiles = [];

    async function pickBackupDirectory() {
      if (currentUser !== 'يضيفوش تاني') { alert('هذه الميزة متاحة للمدير فقط.'); return; }
      try {
        if (!window.showDirectoryPicker) {
          alert('متصفح غير مدعوم. استخدم Google Chrome أو Edge.\nسيتم استبدال النسخة المحلية بالنسخة المحفوظة عند السحب.');
          return;
        }
        backupDirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        await setIDBValue('backup_dir_handle', backupDirHandle);
        document.getElementById('backup-status').style.display = 'inline-flex';
        document.getElementById('backup-status').textContent = 'تم اختيار مجلد النسخ الاحتياطي: ' + backupDirHandle.name;
        await autoSaveBackup();
        updateBackupStatus();
        alert('تم اختيار المجلد بنجاح: ' + backupDirHandle.name);
      } catch(e) {
        if (e.name !== 'AbortError' && e.name !== 'SecurityError') {
          alert('حدث خطأ أثناء حفظ النسخة الاحتياطية.');
        }
      }
    }

    async function verifyDirPermission(withWrite = true) {
      try {
        if (!backupDirHandle) return false;
        let opts = withWrite ? { mode: 'readwrite' } : { mode: 'read' };
        if ((await backupDirHandle.queryPermission(opts)) === 'granted') return true;
        if ((await backupDirHandle.requestPermission(opts)) === 'granted') return true;
        // If permission denied, try to re-pick
        backupDirHandle = null;
        await setIDBValue('backup_dir_handle', null);
        document.getElementById('backup-status').style.display = 'none';
        return false;
      } catch(e) { return false; }
    }

    function getAllDataObject() {
      return {
        employees, roomsCapacity, vacations, hospitalities, maintenanceRecords, septicRecords,
        inventoryVouchers, excludedEmployees, periodicMaintenance, teaSugarDisbursements, teaSugarBatches, mealLogs,
        inventoryItems, contractors, dynamicSectors, dynamicStores, contractorSectors, contractorRooms, dynamicRooms, dynamicSeptics, dynamicDepts, dynamicTitles,
        appUsers, currentUser, bakeryIngredients, bakeryProductions,
        bakeryContractorSupplies, bakeryInvoices,
        manualTotalBeds, adminOvertime,
        evaluations, evalTemplates, auditLog, bakeryStockLog, deptTitles,
        roomAssets,
        archiveData,
        miniaAssets,
        quickActions,
        syncDeletions,
        waterStations, waterDocs,
        dynamicVisitorTypes,
        bakeryContractorsNames,
        ingredientMaster,
        mealSurveys,
        mealWaste, dailyStats, finTransactions, finBudgets,
        incident_reports: _safeJsonParse(_lsGet('linah_reports'), [])
      };
    }

    async function migrateToServer() {
      let btn = document.getElementById('btn-migrate-server');
      btn.textContent = 'جارٍ النقل للسيرفر...'; btn.disabled = true;
      for (let i = 0; i < 20; i++) {
        try {
          let r = await fetch('http://localhost:3001/api/migrate', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(getAllDataObject())
          });
          if (r.ok) {
            btn.textContent = 'تم النقل بنجاح ✅'; btn.style.background = '#4caf50';
            setTimeout(() => { window.location.href = 'http://localhost:3001'; }, 1500);
            return;
          }
        } catch(e) {}
        await new Promise(r => setTimeout(r, 1000));
      }
      btn.textContent = 'نقل للسيرفر'; btn.disabled = false;
      alert('فشل الاتصال بالسيرفر. تأكد من تشغيل تشغيل البرنامج.bat أولاً.');
    }

    async function autoSaveBackup() {
      if (currentUser !== 'منع ظهور') return;
      try {
        if (!backupDirHandle) return;
        let ok = await verifyDirPermission(true);
        if (!ok) return;

        let now = new Date();
        let pad = (n) => String(n).padStart(2, '0');
        let fileName = `backup_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.json`;

        let fileHandle = await backupDirHandle.getFileHandle(fileName, { create: true });

        let writable = await fileHandle.createWritable({ keepExistingData: false });
        let data = JSON.stringify(getAllDataObject());
        await writable.write(data);
        await writable.close();

        // Save a "latest.json" as well for quick restore
        try {
          let latestHandle = await backupDirHandle.getFileHandle('latest.json', { create: true });
          let latestW = await latestHandle.createWritable({ keepExistingData: false });
          await latestW.write(data);
          await latestW.close();
        } catch(e) {}

        _dataChangedSinceBackup = false;
        updateBackupStatus();
      } catch(e) {
        console.warn('Auto-backup failed:', e);
      }
    }

    async function updateBackupStatus() {
      try {
        if (!backupDirHandle) { document.getElementById('backup-status').style.display = 'none'; return; }
        let ok = await verifyDirPermission(false);
        if (!ok) { document.getElementById('backup-status').style.display = 'none'; return; }

        let entries = [];
        for await (let entry of backupDirHandle.values()) {
          if (entry.kind === 'file' && entry.name.startsWith('backup_') && entry.name.endsWith('.json')) {
            entries.push(entry);
          }
        }
        entries.sort((a, b) => b.name.localeCompare(a.name));
        cachedBackupFiles = entries;

        let statusEl = document.getElementById('backup-status');
        statusEl.style.display = 'inline-flex';
        statusEl.textContent = `? ${entries.length} المستبعدين | ${backupDirHandle.name}`;



        if (entries.length > 0) {
          let latest = entries[0].name;
          document.getElementById('hist-latest').textContent = latest.replace('backup_', '').replace('.json', '').replace(/_/g, ' ');
          document.getElementById('hist-count').textContent = entries.length;
        }
      } catch(e) {}
    }

    // ============================
    //  4.  RESTORE FROM BACKUP
    // ============================
    async function loadLatestBackup() {
      try {
        if (!backupDirHandle) return false;
        let ok = await verifyDirPermission(false);
        if (!ok) return false;

        // Find latest backup file
        let entries = [];
        for await (let entry of backupDirHandle.values()) {
          if (entry.kind === 'file' && (entry.name.startsWith('latest.json') || (entry.name.startsWith('backup_') && entry.name.endsWith('.json')))) {
            entries.push(entry);
          }
        }
        if (entries.length === 0) return false;

        // Prioritize latest.json, then most recent backup
        let latestEntry = entries.find(e => e.name === 'latest.json');
        if (!latestEntry) {
          entries.sort((a, b) => b.name.localeCompare(a.name));
          latestEntry = entries[0];
        }

        let file = await latestEntry.getFile();
        let text = await file.text();
        let data = JSON.parse(text);

        if (data.employees) { employees = data.employees; employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; }); }
        if (data.roomsCapacity) { roomsCapacity = data.roomsCapacity; roomsCapacity.forEach(r => { if(r.roomNumber && !r.number) r.number = r.roomNumber; }); }
        if (data.vacations) vacations = data.vacations;
        if (data.hospitalities) hospitalities = data.hospitalities;
        if (data.maintenanceRecords) maintenanceRecords = data.maintenanceRecords;
        if (data.septicRecords) septicRecords = data.septicRecords;
        if (data.inventoryVouchers) inventoryVouchers = data.inventoryVouchers;
        if (data.excludedEmployees) excludedEmployees = data.excludedEmployees;
        if (data.periodicMaintenance) periodicMaintenance = data.periodicMaintenance;
        if (data.teaSugarDisbursements) teaSugarDisbursements = data.teaSugarDisbursements;
        if (data.teaSugarBatches) teaSugarBatches = data.teaSugarBatches;
        if (data.mealLogs) mealLogs = data.mealLogs;
        if (data.inventoryItems) inventoryItems = data.inventoryItems;
        if (data.contractors) contractors = data.contractors;
        if (data.dynamicSectors) dynamicSectors = data.dynamicSectors;
        if (data.dynamicRooms) dynamicRooms = data.dynamicRooms;
        if (data.dynamicSeptics) dynamicSeptics = data.dynamicSeptics;
        if (data.dynamicDepts) dynamicDepts = data.dynamicDepts;
        if (data.dynamicTitles) dynamicTitles = data.dynamicTitles;
        if (data.deptTitles) deptTitles = data.deptTitles;
        if (data.appUsers) appUsers = filterLatinUsers(data.appUsers);
        if (data.currentUser) currentUser = data.currentUser;
        if (data.bakeryIngredients) {
          var localQty2 = {}; bakeryIngredients.forEach(function(ing) { localQty2[ing.id] = ing.currentQty || 0; });
          data.bakeryIngredients.forEach(function(ing) {
            if (localQty2[ing.id] !== undefined && localQty2[ing.id] > (ing.currentQty || 0)) ing.currentQty = localQty2[ing.id];
          });
          bakeryIngredients = data.bakeryIngredients;
        }
        if (data.bakeryProductions) bakeryProductions = data.bakeryProductions;
        if (data.bakeryContractorSupplies) bakeryContractorSupplies = data.bakeryContractorSupplies;
        if (data.bakeryInvoices) bakeryInvoices = data.bakeryInvoices;

        // في القوة وتنظيف بيانات التكرارات سالم
        if (excludedEmployees.length > 0) {
          var exclMap = {};
          excludedEmployees.forEach(function(e) { exclMap[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !exclMap[e.code || e.id || e.name]; });
        }
        // مجدي هذه الميزة مخصصة للمدير فقط
        normalizeBakeryDates(true);
        if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
        if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
        if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });

        syncStorage();
        return true;
      } catch(e) { return false; }
    }


    // ============================
    //  5.  HISTORICAL REPORTS
    // ============================
    async function refreshBackupList() {
      try {
        if (!backupDirHandle) { alert('متصفحك لا يدعم اختيار مجلد. استخدم زر تصدير النسخة الاحتياطية لحفظ الملفات يدوياً.'); return; }
        let ok = await verifyDirPermission(false);
        if (!ok) { alert('الرجاء منح صلاحية الوصول للمجلد.'); return; }

        let entries = [];
        for await (let entry of backupDirHandle.values()) {
          if (entry.kind === 'file' && entry.name.startsWith('backup_') && entry.name.endsWith('.json')) {
            entries.push(entry);
          }
        }
        entries.sort((a, b) => b.name.localeCompare(a.name));
        cachedBackupFiles = entries;

        let container = document.getElementById('backup-list-container');
        if (entries.length === 0) {
          container.innerHTML = '<div style="padding:20px;text-align:center;color:#78909c;">لا توجد نسخ احتياطية بعد</div>';
          document.getElementById('hist-count').textContent = '0';
          return;
        }

        document.getElementById('hist-count').textContent = entries.length;
        let html = '';
        for (let entry of entries) {
          let name = entry.name.replace('backup_', '').replace('.json', '');
          let displayName = name.replace(/_/g, ' ');
          html += `<div class="backup-item" onclick="loadHistoricalReport('${entry.name}')">
            <div>
              <div class="backup-date">🗓️ ${displayName}</div>
            </div>
            <button class="btn btn-primary btn-load-backup" onclick="var e=arguments[0]||window.event;if(e)e.stopPropagation(); loadHistoricalReport('${entry.name}')">📊 عرض التقرير</button>
          </div>`;
        }
        container.innerHTML = html;
        updateBackupStatus();
      } catch(e) {
        document.getElementById('backup-list-container').innerHTML = '<div style="padding:20px;text-align:center;color:#d32f2f;">لم يتم العثور على نسخ احتياطية. اختر مجلد الحفظ أولاً.</div>';
      }
    }

    async function loadHistoricalReport(fileName) {
      try {
        if (!backupDirHandle) return;
        let ok = await verifyDirPermission(false);
        if (!ok) return;

        let fileHandle = await backupDirHandle.getFileHandle(fileName);
        let file = await fileHandle.getFile();
        let text = await file.text();
        let data = JSON.parse(text);

        // Highlight active
        document.querySelectorAll('.backup-item').forEach(el => el.classList.remove('active'));
        let items = document.querySelectorAll('.backup-item');
        items.forEach(item => {
          if (item.innerHTML.includes(fileName)) item.classList.add('active');
        });

        // Build report
        let report = document.getElementById('hist-report-content');

        let empCount = data.employees?.length || 0;
        let pCount = data.employees?.filter(e => e.status === 'P').length || 0;
        let vCount = empCount - pCount;
        let roomCount = data.roomsCapacity?.length || 0;
        let totalBeds = data.roomsCapacity?.reduce((s, r) => s + (r.beds || 0), 0) || 0;
        let assignedEmps = data.employees?.filter(e => e.sector && e.room && e.status === 'P').length || 0;
        let inventoryItemCount = data.inventoryItems?.length || 0;
        let voucherCount = data.inventoryVouchers?.length || 0;
        let tsCount = data.teaSugarDisbursements?.length || 0;
        let vacationCount = data.vacations?.length || 0;
        let excludedCount = data.excludedEmployees?.length || 0;
        let contractorCount = data.contractors?.length || 0;

        // Department breakdown
        let deptMap = {};
        if (data.employees) {
          data.employees.forEach(e => {
            if (e.dept) deptMap[e.dept] = (deptMap[e.dept] || 0) + 1;
          });
        }
        let deptHtml = Object.entries(deptMap).sort((a,b) => b[1]-a[1]).map(([d,c]) => `<span style="display:inline-block;background:#e8f5e9;padding:2px 10px;border-radius:12px;margin:2px;font-size:12px;">${d}: <b>${c}</b></span>`).join('');

        let displayDate = fileName.replace('backup_', '').replace('.json', '').replace(/_/g, ' ');

        report.innerHTML = `
          <div style="border-bottom:2px solid #1b5e20;padding-bottom:10px;margin-bottom:15px;">
            <h3 style="color:#1b5e20;margin:0;">بيانات حفظها تلقائياً: ${displayDate}</h3>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:15px;">
            <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">في لم</div><div style="font-size:24px;font-weight:700;color:#1b5e20;">${empCount}</div></div>
            <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">يتم (P)</div><div style="font-size:24px;font-weight:700;color:#1565c0;">${pCount}</div></div>
            <div style="background:#fff3e0;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">اختيار (V)</div><div style="font-size:24px;font-weight:700;color:#e65100;">${vCount}</div></div>
            <div style="background:#f3e5f5;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">مجلد</div><div style="font-size:24px;font-weight:700;color:#6a1b9a;">${totalBeds}</div></div>
            <div style="background:#e0f2f1;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">تأكد من</div><div style="font-size:24px;font-weight:700;color:#00695c;">${inventoryItemCount}</div></div>
            <div style="background:#fce4ec;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">اختيار مجلد</div><div style="font-size:24px;font-weight:700;color:#c62828;">${voucherCount}</div></div>
          </div>
          <div style="margin-bottom:15px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">بيانات صالح بديل</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${roomCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">بيانات استخدم زر النسخة</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${tsCount} الاحتياطية</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">بيانات اليدوي جاري</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${vacationCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">بيانات الترحيل</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${excludedCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">بيانات تم</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${contractorCount}</td></tr>
            </table>
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-weight:600;margin-bottom:5px;color:#37474f;">بيانات الترحيل فشل:</div>
            <div>${deptHtml || 'لا يوجد'}</div>
          </div>
          <div style="margin-top:15px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="restoreThisBackup()" style="font-size:12px;padding:6px 12px;">⬅️ استعادة هذه النسخة</button>
            <button class="btn btn-primary" onclick="exportThisBackup()" style="font-size:12px;padding:6px 12px;">💾 تحميل هذه النسخة</button>
          </div>
        `;

        // Store current report data for restore/export
        window._currentReportData = data;
        window._currentReportFileName = fileName;

      } catch(e) {
        document.getElementById('hist-report-content').innerHTML = '<div style="text-align:center;color:#d32f2f;padding:20px;">الرجاء استعادة البيانات أولاً</div>';
      }
    }

    function restoreThisBackup() {
      let data = window._currentReportData;
      if (!data) return alert('الرجاء اختيار نسخة احتياطية أولاً');
      if (!confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال جميع البيانات الحالية.')) return;

      if (data.employees) { employees = data.employees; employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; }); }
      if (data.roomsCapacity) { roomsCapacity = data.roomsCapacity; roomsCapacity.forEach(r => { if(r.roomNumber && !r.number) r.number = r.roomNumber; }); }
      if (data.vacations) vacations = data.vacations;
      if (data.hospitalities) hospitalities = data.hospitalities;
      if (data.maintenanceRecords) maintenanceRecords = data.maintenanceRecords;
      if (data.septicRecords) septicRecords = data.septicRecords;
      if (data.inventoryVouchers) inventoryVouchers = data.inventoryVouchers;
      if (data.excludedEmployees) excludedEmployees = data.excludedEmployees;
      if (data.periodicMaintenance) periodicMaintenance = data.periodicMaintenance;
      if (data.teaSugarDisbursements) teaSugarDisbursements = data.teaSugarDisbursements;
      if (data.teaSugarBatches) teaSugarBatches = data.teaSugarBatches;
      if (data.mealLogs) mealLogs = data.mealLogs;
      if (data.inventoryItems) inventoryItems = data.inventoryItems;
      if (data.contractors) contractors = data.contractors;
        if (data.dynamicSectors) dynamicSectors = data.dynamicSectors;
        if (data.dynamicRooms) dynamicRooms = data.dynamicRooms;
        if (data.dynamicSeptics) dynamicSeptics = data.dynamicSeptics;
        if (data.dynamicDepts) dynamicDepts = data.dynamicDepts;
        if (data.dynamicTitles) dynamicTitles = data.dynamicTitles;
        if (data.deptTitles) deptTitles = data.deptTitles;
        if (data.appUsers) appUsers = filterLatinUsers(data.appUsers);
        if (data.currentUser) currentUser = data.currentUser;

      syncStorage();
      sortEmployeesAlphabetically(); rebuildAllDropdowns();
      renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems();
      renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable();
      renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); autoLogTodayMeals();
      populateContractorSectorDropdown(); renderContractorsTable();
      alert('لم يتم اختيار تقرير');
    }

    function exportThisBackup() {
      let data = window._currentReportData;
      if (!data) return alert('الرجاء اختيار نسخة احتياطية أولاً');
      let blob = new Blob([JSON.stringify(data)], {type: "application/json"});
      let a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = window._currentReportFileName || 'نسخة احتياطية_' + Date.now() + '.json'; a.click();
    }

    async function loadAllBackupsForComparison() {
      let fromDate = document.getElementById('hist-from-date').value;
      let toDate = document.getElementById('hist-to-date').value;
      if (!fromDate || !toDate) { alert('الحفظ في الهيدر صلاحية المجلد منتهية'); return; }

      try {
        if (!backupDirHandle || !(await verifyDirPermission(false))) {
          alert('الرجاء اختيار مجلد الحفظ مرة أخرى');
          return;
        }

        // Collect all backup files within date range
        let entries = [];
        for await (let entry of backupDirHandle.values()) {
          if (entry.kind === 'file' && entry.name.startsWith('backup_') && entry.name.endsWith('.json')) {
            // Extract date from filename: backup_YYYY-MM-DD_HH-mm.json
            let match = entry.name.match(/backup_(\d{4}-\d{2}-\d{2})/);
            if (match && match[1] >= fromDate && match[1] <= toDate) {
              entries.push(entry);
            }
          }
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));

        if (entries.length < 1) {
          alert('لا توجد نسخ في هذه الفترة');
          return;
        }

        // Load all data
        let allData = [];
        for (let entry of entries) {
          let file = await entry.getFile();
          let text = await file.text();
          allData.push({ name: entry.name, data: JSON.parse(text) });
        }

        // Build comparison report
        let report = document.getElementById('hist-report-content');
        let html = `<div style="border-bottom:2px solid #1565c0;padding-bottom:10px;margin-bottom:15px;">
          <h3 style="color:#1565c0;margin:0;">بيانات بعد عرض: ${fromDate} ? ${toDate}</h3>
          <div style="font-size:12px;color:#555;">التقرير خطأ: ${entries.length}</div>
        </div>`;

        // Summary table
        html += `<table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px;">
          <thead><tr>
            <th style="padding:6px;border:1px solid #ddd;">في</th>
            <th style="padding:6px;border:1px solid #ddd;">قراءة</th>
            <th style="padding:6px;border:1px solid #ddd;">P</th>
            <th style="padding:6px;border:1px solid #ddd;">V</th>
            <th style="padding:6px;border:1px solid #ddd;">المجلد</th>
            <th style="padding:6px;border:1px solid #ddd;">تأكد</th>
            <th style="padding:6px;border:1px solid #ddd;">من/صلاحيات</th>
          </tr></thead><tbody>`;

        let firstData = allData[0].data;
        let lastData = allData[allData.length - 1].data;

        allData.forEach(({ name, data }) => {
          let d = name.replace('backup_', '').replace('.json', '').replace(/_/g, ' ');
          let e = data.employees?.length || 0;
          let p = data.employees?.filter(em => em.status === 'P').length || 0;
          let v = e - p;
          let items = data.inventoryItems?.length || 0;
          let vouch = data.inventoryVouchers?.length || 0;
          let ts = data.teaSugarDisbursements?.length || 0;
          html += `<tr>
            <td style="padding:4px 6px;border:1px solid #ddd;">${d}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;font-weight:600;">${e}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;color:#2e7d32;">${p}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;color:#e65100;">${v}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${items}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${vouch}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${ts}</td>
          </tr>`;
        });

        html += `</tbody></table>`;

        // Changes summary
        let empChange = (lastData.employees?.length || 0) - (firstData.employees?.length || 0);
        let invChange = (lastData.inventoryItems?.length || 0) - (firstData.inventoryItems?.length || 0);
        html += `<div style="background:#f5f5f5;padding:12px;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;color:#37474f;">بيانات الوصول تقرير نسخة</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">
            <div style="background:white;padding:8px 12px;border-radius:6px;text-align:center;">
              <div style="font-size:11px;color:#555;">إجمالي القوة</div>
              <div style="font-size:20px;font-weight:700;color:${empChange >= 0 ? '#2e7d32' : '#c62828'};">${empChange >= 0 ? '+' : ''}${empChange}</div>
            </div>
            <div style="background:white;padding:8px 12px;border-radius:6px;text-align:center;">
              <div style="font-size:11px;color:#555;">متواجدين إجازات</div>
              <div style="font-size:20px;font-weight:700;color:${invChange >= 0 ? '#2e7d32' : '#c62828'};">${invChange >= 0 ? '+' : ''}${invChange}</div>
            </div>
          </div>
        </div>`;

        report.innerHTML = html;
      } catch(e) {
        document.getElementById('hist-report-content').innerHTML = '<div style="text-align:center;color:#d32f2f;padding:20px;">حدث خطأ أثناء عرض التقرير</div>';
      }
    }

    // Override syncStorage to auto-backup
    let _origSyncStorage = syncStorage;
    syncStorage = function() {
      _origSyncStorage.apply(null, arguments);
      // Auto-backup to D: drive (debounced)
      if (backupDirHandle) {
        clearTimeout(window.__autoBackupTimer);
        window.__autoBackupTimer = setTimeout(autoSaveBackup, 500);
      }
    };

    // Keyboard shortcuts for faster work
        document.addEventListener('keydown', function(e) {
      // Ctrl+/ or Ctrl+? to focus search
      if ((e.ctrlKey && e.key === '/') || (e.ctrlKey && e.key === '?')) {
        e.preventDefault();
        let activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
          let si = activeTab.querySelector('.search-input, input[type="text"][placeholder*="المخزن"], input[type="search"]');
          if (si) si.focus();
        }
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
      }
      // Arrow keys for row navigation (up/down)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        let table = document.querySelector('.tab-content.active table');
        if (!table) return;
        let rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;
        e.preventDefault();
        let sel = table.querySelector('tr.selected');
        let idx = -1;
        if (sel) { for (let i = 0; i < rows.length; i++) { if (rows[i] === sel) { idx = i; break; } } }
        if (e.key === 'ArrowDown') idx = Math.min(idx + 1, rows.length - 1);
        else idx = Math.max(idx - 1, 0);
        rows.forEach(r => r.classList.remove('selected'));
        rows[idx].classList.add('selected');
        rows[idx].scrollIntoView({ block: 'nearest' });
      }
      // F2 - edit selected row
      if (e.key === 'F2') {
        e.preventDefault();
        let sel = document.querySelector('.table-container tr.selected');
        if (!sel) { let f = document.querySelector('.table-container tbody tr'); if (f) { f.classList.add('selected'); } return; }
        let btns = sel.querySelectorAll('button');
        for (let b of btns) {
          let t = b.textContent || '';
          if (t.indexOf('بونات') >= 0 || t.indexOf('الصرف') >= 0 || t.indexOf('غرف') >= 0) { b.click(); break; }
        }
      }
      // Delete key - click delete button
      if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey) {
        let sel = document.querySelector('.table-container tr.selected');
        if (sel) {
          let btns = sel.querySelectorAll('button');
          for (let b of btns) {
            let t = b.textContent || '';
            if (t.indexOf('السكن') >= 0 || t.indexOf('صرف') >= 0 || t.indexOf('الشاي') >= 0) { b.click(); break; }
          }
        }
      }
      // Ctrl+N - open add modal
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        let addBtn = document.querySelector('.tab-content.active .btn-primary');
        if (addBtn) addBtn.click();
      }
    });

    // Auto-save on page close (fallback)
    window.addEventListener('beforeunload', function() {
      if (backupDirHandle) {
        // Use sync backup via Blob download as last resort
        try {
          let data = JSON.stringify(getAllDataObject());
          _lsSet('lineh_last_backup', data);
        } catch(e) {}
      }
    });

    // Initialize backup system on load
    window.onload = function() {
      _takeSnapshot();
      requireLogin();
      if (!_lsGet('_roomsCleaned')) {
        var oldSectors = ['A','B','عملية إجازات'];
        roomsCapacity = roomsCapacity.filter(function(r) { return oldSectors.indexOf(r.sector) === -1; });
        _lsSet('lineh_rooms_capacity', JSON.stringify(roomsCapacity));
        _lsSet('_roomsCleaned', '1');
      }
      employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; });
      sortEmployeesAlphabetically(); rebuildDeptTitles(); rebuildAllDropdowns(); initEmployeeSearchInputs(); setupItemNameSearch(); setupNameAutocomplete(); populateRoomSectorDropdown(); populateContractorSectorDropdown();
      try { cleanDynamicData(); } catch(_e) {}

      if (typeof finInit === 'function') finInit();
      _reportsApiUrl = _lsGet('linah_reports_api_url') || '';
      setTimeout(function() {
        _safe(renderTable); _safe(renderInventoryTable); _safe(renderInventoryItems); _safe(renderArchiveIncoming); _safe(renderVacationsTable); _safe(renderOvertimeCalendar); _safe(calculateSystemStats);
        setTimeout(function() {
          _safe(renderHospitalityTable); _safe(renderMaintenanceTable); _safe(renderSepticTable); _safe(renderPeriodicMaintenance); _safe(renderTeaSugarTable);
          setTimeout(function() {
            _safe(renderMealLogTable); _safe(autoLogTodayMeals); _safe(renderContractorsTable); _safe(renderDashboard); _safe(renderQuickActions); _safe(updateEmployeeVacationStatuses); _safe(importBakeryFormData); _safe(importMealWasteFormData);
            setTimeout(function() {
              (function(){ var from=document.getElementById('dailyStatsFrom'); var to=document.getElementById('dailyStatsTo'); var t=new Date(); to.value=t.toISOString().split('T')[0]; t.setDate(t.getDate()-7); from.value=t.toISOString().split('T')[0]; renderDailyStatsTable();
                var bf=document.getElementById('bakeryConsFrom'); var bt=document.getElementById('bakeryConsTo'); var bd=new Date(); bt.value=bd.toISOString().split('T')[0]; bd.setDate(bd.getDate()-7); bf.value=bd.toISOString().split('T')[0]; renderBakeryConsumptionTable(); })(); initAllSortableTables();
              try { fetchReports(); } catch(e) {}
            }, 0);
          }, 0);
        }, 0);
      }, 0);

      try { var _iv = validateDataIntegrity(); if (_iv.indexOf('بيانات') >= 0) console.warn('بيانات مسجلة مستبعدين:\n' + _iv); } catch(_e) {}
      // Auto-log meals every 5 minutes to catch dinner (>=21) and other meals
      setInterval(autoLogTodayMeals, 5 * 60 * 1000);
      // Also log when user returns to the page
      document.addEventListener('visibilitychange', function() { if (!document.hidden) autoLogTodayMeals(); });
      // D: drive restore now only available via manual button
function updateDashClock() {
        let el = document.getElementById('dash-clock');
        if (el)         el.innerText = '🕒 ' + new Date().toLocaleString('ar-EG') + ' | منظومة الشئون الإدارية - لينه فارمز';
      }
      updateDashClock();
      // Update every 10s instead of 1s to avoid performance warnings
      setInterval(updateDashClock, 10000);

      /* -- Auto-capture daily stats at 11:59 PM -- */
      (function scheduleDailyStats() {
        var now = new Date();
        var target = new Date();
        target.setHours(23, 59, 30, 0);
        if (now >= target) { target.setDate(target.getDate() + 1); }
        var delay = target - now;
        setTimeout(function() {
          try { captureDailyStats(); } catch(e) { console.error('autoCaptureDailyStats:', e); }
          scheduleDailyStats();
        }, delay);
      })();
      /* -- Daily backup at 11:59 PM + catchup on load -- */
      (function scheduleDailyBackup() {
        var today = new Date().toISOString().split('T')[0];
        var lastBak = _lsGet('linah_last_daily_backup') || '';
        if (lastBak < today && backupDirHandle) {
          setTimeout(function() { try { autoSaveBackup(); _lsSet('linah_last_daily_backup', today); } catch(e) {} }, 5000);
        }
        var now = new Date();
        var target = new Date();
        target.setHours(23, 59, 0, 0);
        if (now >= target) { target.setDate(target.getDate() + 1); }
        setTimeout(function() {
          try {
            autoSaveBackup();
            _lsSet('linah_last_daily_backup', new Date().toISOString().split('T')[0]);
          } catch(e) { console.error('autoDailyBackup:', e); }
          scheduleDailyBackup();
        }, target - now);
      })();
      // ? في قراءة النسخة الاحتياطية D: drive بيانات 12 لا
      if (currentUser === 'سالم مجدي') {
        autoSaveBackup();
        setInterval(autoSaveBackup, 12 * 60 * 60 * 1000);
      }

      // Auto-migrate from file:// to server if ?sync=1 in URL
      (async function checkAutoMigrate() {
        if (window.location.href.includes('?sync=1') && !window.location.href.startsWith('http')) {
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Cairo;font-size:22px;background:#1b5e20;color:white;flex-direction:column;gap:15px;"><div>جارٍ التحميل...</div><div style="font-size:14px;opacity:0.8;">استعادة البيانات</div></div>';
          for (let i = 0; i < 15; i++) {
            try {
              let r = await fetch('http://localhost:3001/api/migrate', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify(getAllDataObject())
              });
              if (r.ok) { window.location.href = 'http://localhost:3001'; return; }
            } catch(e) {}
            await new Promise(r => setTimeout(r, 1000));
          }
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Cairo;font-size:18px;background:#d32f2f;color:white;flex-direction:column;gap:15px;text-align:center;padding:20px;"><div>❌ فشل الاتصال بالسيرفر</div><div style="font-size:14px;">تأكد من تشغيل السيرفر أولاً (شغّل تشغيل البرنامج.bat)</div><button onclick="window.location.href=\'http://localhost:3001\'" style="padding:12px 30px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">🔄 المحاولة لاحقاً</button></div>';
          return;
        }
      })();

      // ? بيانات نسخة محددة نسخة بيانات احتياطية — لينة يرجى اختيار تاريخ البداية
      // (async function loadFromServer() { ... })();

      // Restore backup directory handle from IndexedDB
      getIDBValue('backup_dir_handle').then(async (handle) => {
        if (handle) {
          try {
            backupDirHandle = handle;
            let ok = await verifyDirPermission(false);
            if (ok) {
              document.getElementById('backup-status').style.display = 'inline-flex';
              document.getElementById('backup-status').textContent = '? والنهاية للمقارنة: ' + backupDirHandle.name;
              // Backup auto-restore DISABLED by user request — pull manually via pullFromDatabase()
              await updateBackupStatus();
            } else {
              backupDirHandle = null;
              await setIDBValue('backup_dir_handle', null);
            }
          } catch(e) {
            backupDirHandle = null;
            await setIDBValue('backup_dir_handle', null);
          }
        }
      });
      // Final safety net: after all async DB/backup pulls settle, ensure housing is rebuilt
      setTimeout(function() {
        try {
          var _anyMatch = employees.some(function(e) { return e.sector && e.room && roomsCapacity.some(function(r) { return r.sector === e.sector && r.number === e.room; }); });
          if (!roomsCapacity.length || !_anyMatch) rebuildRoomsFromEmployees();
          renderHousingLayout(); updateHousingStats();
        } catch(_e) { console.error('housing safety net error:', _e); }
      }, 2500);
    };


    // ====== Data Integrity Validation ======
    function validateDataIntegrity() {
      var issues = [];
      if (!Array.isArray(employees)) issues.push('? employees بيانات array');
      if (!Array.isArray(roomsCapacity)) issues.push('? roomsCapacity بيانات array');
      if (!Array.isArray(vacations)) issues.push('? vacations بيانات array');
      if (!Array.isArray(hospitalities)) issues.push('? hospitalities بيانات array');
      if (!Array.isArray(maintenanceRecords)) issues.push('? maintenanceRecords بيانات array');
      if (!Array.isArray(septicRecords)) issues.push('? septicRecords بيانات array');
      employees.forEach(function(e, i) {
        if (!e || typeof e !== 'object') { issues.push('بيانات النسخ التاريخ ' + i + ' بيانات object'); return; }
        if (!e.name && !e.code) issues.push('بيانات القوة ' + (e.code || i) + ' الأصناف البونات');
      });
      roomsCapacity.forEach(function(r, i) {
        if (!r || typeof r !== 'object') { issues.push('بيانات شاي سكر ' + i + ' بيانات object'); return; }
        if (!r.number) issues.push('بيانات التغير ' + i + ' خلال الفترة');
      });
      // Check employees in non-existent rooms
      var validRooms = {};
      roomsCapacity.forEach(function(r) {
        var sector = (r.sector || '').trim();
        var key = sector + '|' + (r.number || '');
        validRooms[key] = true;
      });
      var empInInvalidRoom = 0;
      employees.forEach(function(e) {
        if (e.sector && e.room) {
          var empSector = (e.sector || '').trim();
          var empRoom = (e.room || '').trim();
          // Normalize room number
          var empRoomNum = empRoom.replace(/^غرفه\s*/i, '').replace(/^غرفة\s*/i, '').trim();
          // Fuzzy match sector
          var matched = false;
          // Abbreviation map for KEYWORDS
          var abbrMap = {
            'جزوارين': 'جيزوارين', 'الجيزوارين': 'جيزوارين', 'جيزوارين': 'جيزوارين',
            'النخالين': 'نخالين', 'نخالين': 'نخالين',
            'الإداري': 'إداري', 'إداري': 'إداري', 'المهندسين': 'مهندسين', 'مهندسين': 'مهندسين',
            'العاملين': 'عاملين', 'عاملين': 'عاملين',
            'الجديد': 'جديد', 'جديد': 'جديد',
            'السكن': 'سكن', 'سكن': 'سكن',
            'النخيل': 'نخيل', 'نخيل': 'نخيل',
            'الضفة': 'ضفة', 'ضفة': 'ضفة'
          };
          // Normalize keywords using abbreviation map
          function normKeywords(str) {
            return (str || '').split(/[\s()]+/).filter(function(k){ return k.length >= 2; })
              .map(function(k){ return abbrMap[k] || k; });
          }
          var empKW = normKeywords(empSector);
          var matched = false;
          for (var vk in validRooms) {
            var parts = vk.split('|');
            var rcSector = parts[0];
            var rcRoom = parts[1];
            // Normalize room
            var rcRoomNum = rcRoom.replace(/^غرفه\s*/i, '').replace(/^غرفة\s*/i, '').trim();
            if (rcRoomNum !== empRoomNum) continue;
            // Compare sector keywords
            var rcKW = (rcSector || '').split(/[\s()]+/).filter(function(k){ return k.length >= 2; })
              .map(function(k){ return abbrMap[k] || k; });
            var sectorMatch = false;
            for (var ek of empKW) {
              for (var rk of rcKW) {
                var ekNorm = abbrMap[ek] || ek;
                var rkNorm = abbrMap[rk] || rk;
                if (ekNorm === rkNorm || (ekNorm.length >= 2 && rkNorm.length >= 2 && (ekNorm.includes(rkNorm) || rkNorm.includes(ekNorm)))) {
                  sectorMatch = true; break;
                }
              }
              if (sectorMatch) break;
            }
            if (sectorMatch) { matched = true; break; }
          }
          if (!matched) {
            empInInvalidRoom++;
            issues.push('بيانات ' + (e.name || e.code) + ' تغير بيانات القوة تغير الأصناف: ' + e.sector + ' / ' + e.room);
          }
        }
      });
      if (empInInvalidRoom > 0) {
        issues.unshift('بيانات ' + empInInvalidRoom + ' خطأ بيانات في المقارنة بحث!');
      }
      if (issues.length === 0) return '? لا توجد مشاكل';
      return issues.join('\n');
    }
    function showValidationResult() {
      var msg = validateDataIntegrity();
      if (msg.startsWith('?')) {
        alert('البيانات سليمة - لا توجد مشاكل');
      } else {
        alert('نتيجة فحص سلامة بيانات السكن الإداري:\n\n' + msg);
      }
    }

    // ====== Data Exchange: Excel Export ======
    function getMonthNameAr(dateStr) {
      if(!dateStr) return '';
      var d = new Date(dateStr);
      if(isNaN(d.getTime())) {
        var parts = dateStr.split(/[\/\-\.]/);
        if(parts.length === 3) {
          var day = parseInt(parts[0].replace(/[?-?]/g, function(c){ return String.fromCharCode(c.charCodeAt(0)-1584); })) || 0;
          var month = parseInt(parts[1].replace(/[?-?]/g, function(c){ return String.fromCharCode(c.charCodeAt(0)-1584); })) || 0;
          if(month >= 1 && month <= 12) d = new Date(2000, month-1, 1);
        }
      }
      if(isNaN(d.getTime())) return '';
      var months = ['البيانات','تعطيل','التحميل','التلقائي','من','الباك','أب','يدوي','من','الإدارة','المرنة','لينه'];
      return months[d.getMonth()];
    }

    function updateDXStats() {
      var ids = { 'dx-stat-meals': mealLogs.length, 'dx-stat-tea': teaSugarDisbursements.length, 'dx-stat-septic': septicRecords.length, 'dx-stat-prod': bakeryProductions.length, 'dx-stat-ctr': bakeryContractorSupplies.length };
      for (var k in ids) { var el = document.getElementById(k); if (el) el.innerText = ids[k]; }
    }

    function callUpdateDXStats() {

    }

    function showDXPreview(title, headers, rows) {
      var container = document.getElementById('dx-report-container');
      var titleEl = document.getElementById('dx-report-title');
      var wrapper = document.getElementById('dx-report-table-wrapper');
      if (!container || !titleEl || !wrapper) return;
      titleEl.textContent = title;
          var html = '<table class="dx-preview-table"><thead><tr><th>#</th>';
      headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(function(row, i) {
        html += '<tr><td>' + (i + 1) + '</td>';
        row.forEach(function(cell) { html += '<td>' + (cell != null && cell !== '' ? cell : '—') + '</td>'; });
        html += '</tr>';
      });
      html += '</tbody></table>';
      wrapper.innerHTML = html;
      container.style.display = 'block';
    }

    function s2ab(s) {
      var buf = new ArrayBuffer(s.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    }

    function stripEmoji(s) { return (s||'').replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\u066A-\u066D\u066E-\u06FF\s]/g,'').trim(); }

    function sortNewestFirst(arr, field) { return [...arr].sort(function(a,b){ var da=a[field]||'', db=b[field]||''; var ka=getSortKey(da), kb=getSortKey(db); if(ka[0]!==kb[0]) return kb[0]-ka[0]; if(ka[1]>kb[1]) return -1; if(ka[1]<kb[1]) return 1; return 0; }); }

    function downloadWB(wb, filename) {
      var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      var blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    function exportSelectedToExcel() {
      var activeTab = document.querySelector('.tab-content.active');
      if (!activeTab) { alert('الرجاء فتح تبويب قبل التصدير.'); return; }
      var tables = activeTab.querySelectorAll('table');
      if (!tables.length) { alert('لا توجد جداول في هذا التبويب للتصدير.'); return; }
      var selectedData = null;
      for (var ti = 0; ti < tables.length; ti++) {
        var tbl = tables[ti], checked = tbl.querySelectorAll('.row-check:checked');
        if (!checked.length) continue;
        var data = [];
        var headerRow = (tbl.querySelector('thead') ? tbl.querySelector('thead').querySelector('tr') : null) || tbl.querySelector('tr');
        if (headerRow) {
          var headers = [];
          headerRow.querySelectorAll('th, td').forEach(function(cell) { if (!cell.classList.contains('no-print')) headers.push(stripEmoji(cell.innerText)); });
          if (headers.length) data.push(headers);
        }
        checked.forEach(function(cb) {
          var row = cb.closest('tr');
          if (!row) return;
          var rowData = [];
          row.querySelectorAll('td').forEach(function(cell) { if (!cell.classList.contains('no-print')) rowData.push(stripEmoji(cell.innerText)); });
          if (rowData.length) data.push(rowData);
        });
        if (data.length > 1) { selectedData = data; break; }
      }
      if (!selectedData) { alert('الرجاء تحديد صفوف للتصدير.'); return; }
      var tabName = document.querySelector('.tab-btn.active')?.innerText?.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,'').trim() || 'report';
      var ws = XLSX.utils.aoa_to_sheet(selectedData);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tabName);
      downloadWB(wb, tabName + '_selected.xlsx');
    }

    function getDXDateRange() {
      var from = document.getElementById('dx-date-from').value;
      var to = document.getElementById('dx-date-to').value;
      return { from: from || null, to: to || null };
    }

    function dxDateInRange(dateStr, from, to) {
      if (!from && !to) return true;
      if (!dateStr) return !from && !to;
      var cleaned = dateStr.replace(/[?-?]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 1584); }).replace(/[Tt].*$/, '').replace(/[^\d\/\-]/g, '');
      var d = null;
      var m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
      var m2 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m2) d = new Date(parseInt(m2[3]), parseInt(m2[2])-1, parseInt(m2[1]));
      if (!d || isNaN(d.getTime())) return true;
      d.setHours(0,0,0,0);
      if (from) { var f = new Date(from + 'T00:00:00'); if (d < f) return false; }
      if (to) { var t = new Date(to + 'T00:00:00'); t.setHours(23,59,59,999); if (d > t) return false; }
      return true;
    }

    function _dxSortDesc(arr, dateField) {
      return arr.slice().sort(function(a, b) {
        var da = a[dateField] || '', db = b[dateField] || '';
        return db.localeCompare(da);
      });
    }
    function _dxNum(n) { return (typeof n === 'number' && isFinite(n)) ? n : 0; }
    function _dxFmt(n) { var v = _dxNum(n); return v === 0 ? 0 : v; }
    function _dxFinishSheet(ws, numCols, titleRows) {
      if (!ws) return;
      titleRows = titleRows || 2;
      ws['!cols'] = [];
      for (var c = 0; c < numCols; c++) ws['!cols'].push({ wch: c === 0 ? 4 : 14 });
      if (ws['!merges'] && ws['!merges'].length) {
        ws['!merges'].forEach(function(m) {
          var addr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
          if (ws[addr]) ws[addr].s = ws[addr].s || {};
        });
      }
      var range = XLSX.utils.decode_range(ws['!ref']);
      for (var r = range.s.r; r <= range.e.r; r++) {
        for (var c = range.s.c; c <= range.e.c; c++) {
          var addr = XLSX.utils.encode_cell({ r: r, c: c });
          if (!ws[addr]) continue;
          ws[addr].s = ws[addr].s || {};
          ws[addr].s.alignment = ws[addr].s.alignment || {};
          ws[addr].s.alignment.horizontal = 'center';
          ws[addr].s.alignment.vertical = 'center';
          ws[addr].s.border = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          };
          if (r < titleRows) {
            ws[addr].s.font = ws[addr].s.font || {};
            ws[addr].s.font.bold = true;
            ws[addr].s.font.size = r === 0 ? 14 : 11;
            ws[addr].s.font.color = { rgb: r === 0 ? '1B5E20' : '333333' };
          } else if (r === titleRows) {
            ws[addr].s.font = { bold: true, size: 11, color: { rgb: 'FFFFFF' } };
            ws[addr].s.fill = { fgColor: { rgb: '1B5E20' } };
            ws[addr].s.alignment.horizontal = 'center';
          }
          if (typeof ws[addr].v === 'number' && r > titleRows) {
            ws[addr].z = '#,##0';
          }
        }
      }
      ws['!freeze'] = { xSplit: 0, ySplit: titleRows + 1, topLeftCell: 'A' + (titleRows + 2), activePane: 'bottomLeft', state: 'frozen' };
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: titleRows }, e: { c: numCols - 1, r: range.e.r } }) };
      ws['!printSetup'] = { orientation: 'landscape', paper: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    }
    function _dxMonth(dateStr) {
      if (!dateStr) return '';
      var months = ['سالم','مجدي','جاري','ترحيل','البيانات','إلى','السيرفر','من','فضلك','انتظر','فشل','الاتصال'];
      var parts = dateStr.split('/');
      if (parts.length >= 2) { var mi = parseInt(parts[1]) - 1; return months[mi] || ''; }
      var d = new Date(dateStr);
      return months[d.getMonth()] || '';
    }
    function _dxPreview(title, headers, rows) {
      var container = document.getElementById('dx-report-container');
      var titleEl = document.getElementById('dx-report-title');
      var wrapper = document.getElementById('dx-report-table-wrapper');
      if (!container || !titleEl || !wrapper) return;
      titleEl.textContent = title;
          var html = '<table class="dx-preview-table" style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="border:1px solid #ccc;padding:4px 8px;background:#e8f5e9;font-weight:600;">#</th>';
      headers.forEach(function(h) { html += '<th style="border:1px solid #ccc;padding:4px 8px;background:#e8f5e9;font-weight:600;text-align:center;">' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(function(row, i) {
        html += '<tr>';
        row.forEach(function(cell, ci) {
          var style = 'border:1px solid #ddd;padding:3px 6px;';
          if (typeof cell === 'number') style += 'text-align:center;';
          html += '<td style="' + style + '">' + (cell !== null && cell !== undefined ? cell : '') + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      wrapper.innerHTML = html;
      container.style.display = 'block';
    }

    function exportDXWorkforce() {
      var filename = 'tqreport_workforce_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wb = XLSX.utils.book_new();
      var totalEmp = employees.length;
      var pCount = employees.filter(function(e) { return e.status === 'P'; }).length;
      var vCount = employees.filter(function(e) { return e.status === 'V'; }).length;
      var pPct = totalEmp > 0 ? Math.round(pCount / totalEmp * 100) : 0;
      var vPct = totalEmp > 0 ? Math.round(vCount / totalEmp * 100) : 0;
      var totalBeds = 0;
      roomsCapacity.forEach(function(r) { totalBeds += parseInt(r.beds) || 0; });
      var occupiedBeds = employees.filter(function(e) { return (e.status === 'P' || e.status === 'V') && e.room; }).length;
      var vacantBeds = totalBeds - occupiedBeds;
      var s1Data = [
        ['بالسيرفر تأكد من - تشغيل السيرفر', '', '', '', ''],
        ['أولاً: ' + new Date().toLocaleDateString('ar-EG'), '', '', '', ''],
        [],
        ['شغّل', 'تشغيل', 'البرنامج', '', ''],
        ['المحاولة لاحقاً تم', totalEmp, '100%', '', ''],
        ['تعطيل التحميل (P)', pCount, pPct + '%', '', ''],
        ['بيانات التلقائي (V)', vCount, vPct + '%', '', ''],
        [],
        ['من السيرفر', totalBeds, '', '', ''],
        ['يعتمد على', occupiedBeds, '', '', ''],
        ['السحب اليدوي', vacantBeds, '', '', ''],
        []
      ];
      var ws1 = XLSX.utils.aoa_to_sheet(s1Data);
      ws1['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
      _dxFinishSheet(ws1, 5, 2);
      XLSX.utils.book_append_sheet(wb, ws1, 'فقط ؟');
      var sectorMap = {};
      employees.forEach(function(e) {
        var s = e.sector || 'مش مش';
        if (!sectorMap[s]) sectorMap[s] = { total: 0, p: 0, v: 0 };
        sectorMap[s].total++;
        if (e.status === 'P') sectorMap[s].p++;
        if (e.status === 'V') sectorMap[s].v++;
      });
      var s2Data = [
        ['مش مش مش مش', '', '', '', ''],
        ['موظف: ' + new Date().toLocaleDateString('ar-EG'), '', '', '', ''],
        [],
        ['رقم', 'مش', 'موظف', 'مفيش', 'اسم مسكن']
      ];
      var sectors = Object.keys(sectorMap).sort();
      sectors.forEach(function(s) {
        var d = sectorMap[s];
        var pct = d.total > 0 ? Math.round(d.p / d.total * 100) + '%' : '0%';
        s2Data.push([s, d.total, d.p, d.v, pct]);
      });
      s2Data.push([]);
      s2Data.push(['في', totalEmp, pCount, vCount, pPct + '%']);
      var ws2 = XLSX.utils.aoa_to_sheet(s2Data);
      ws2['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
      _dxFinishSheet(ws2, 5, 2);
      XLSX.utils.book_append_sheet(wb, ws2, 'غرفة غير');
      var deptMap = {};
      employees.forEach(function(e) {
        var d = e.department || 'موجودة غرفة';
        if (!deptMap[d]) deptMap[d] = 0;
        deptMap[d]++;
      });
      var s3Data = [
        ['رقم مش غرفة مفيش', '', ''],
        ['رقم: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['لا', 'توجد', 'مشاكل']
      ];
      var depts = Object.keys(deptMap).sort();
      depts.forEach(function(d) {
        var pct = totalEmp > 0 ? Math.round(deptMap[d] / totalEmp * 100) + '%' : '0%';
        s3Data.push([d, deptMap[d], pct]);
      });
      s3Data.push([]);
      s3Data.push(['في', totalEmp, '100%']);
      var ws3 = XLSX.utils.aoa_to_sheet(s3Data);
      ws3['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws3, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws3, 'البيانات فحص');
      var govMap = {};
      employees.forEach(function(e) {
        var g = e.gov || 'البيانات لا';
        if (!govMap[g]) govMap[g] = 0;
        govMap[g]++;
      });
      var s4Data = [
        ['توجد مشاكل تم العثور', '', ''],
        ['على: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['مشاكل', '٠', '٩']
      ];
      var govs = Object.keys(govMap).sort();
      govs.forEach(function(g) {
        var pct = totalEmp > 0 ? Math.round(govMap[g] / totalEmp * 100) + '%' : '0%';
        s4Data.push([g, govMap[g], pct]);
      });
      s4Data.push([]);
      s4Data.push(['٠', totalEmp, '100%']);
      var ws4 = XLSX.utils.aoa_to_sheet(s4Data);
      ws4['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws4, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws4, '٩ يناير');
      var contractMap = {};
      employees.forEach(function(e) {
        var c = e.contractType || 'غير محدد';
        if (!contractMap[c]) contractMap[c] = 0;
        contractMap[c]++;
      });
      var s5Data = [
        ['أبريل مايو يونيو', '', ''],
        ['يوليو: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['أغسطس سبتمبر', 'أكتوبر', 'نوفمبر']
      ];
      var ctypes = Object.keys(contractMap).sort();
      ctypes.forEach(function(c) {
        var pct = totalEmp > 0 ? Math.round(contractMap[c] / totalEmp * 100) + '%' : '0%';
        s5Data.push([c, contractMap[c], pct]);
      });
      s5Data.push([]);
      s5Data.push(['ديسمبر', totalEmp, '100%']);
      var ws5 = XLSX.utils.aoa_to_sheet(s5Data);
      ws5['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws5, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws5, 'م لا');
      var previewRows = [
        [totalEmp, pCount, pPct + '%', vCount, vPct + '%'],
        [totalBeds, occupiedBeds, vacantBeds, '', '']
      ];
      _dxPreview('يوجد تبويب نشط - ' + new Date().toLocaleDateString('ar-EG'), ['لا يوجد', 'جداول', 'في هذا', 'التبويب', 'لم يتم'], previewRows);
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات تحديد أي صفوف - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXMeals() {
      var range = getDXDateRange();
      var filtered = mealLogs.filter(function(m) { return dxDateInRange(m.date, range.from, range.to); });
      if (!filtered.length) return alert('لا توجد بيانات وجبات للتصدير في النطاق المحدد');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'تقرير_الوجبات_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['تقرير الوجبات', '', '', '', '', '', '', '', '', '', '', ''], ['من: ' + (range.from || '') + ' إلى ' + (range.to || ''), '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'التاريخ', 'الوجبة', 'الشيف', 'عدد المهندسين', 'عدد العمال', 'عدد الضيوف', 'الإجمالي', 'ملاحظات']);
      var totalAll = 0; var previewRows = [];
      filtered.forEach(function(m, i) {
        var bf = parseInt(m.breakfast)||0, lh = parseInt(m.lunch)||0, dn = parseInt(m.dinner)||0;
        var g = calcHospGuestsForDate(m.date);
        var gb = g.gBf, gl = g.gLh, gd = g.gDn;
        var dayTotal = bf + lh + dn + gb + gl + gd;
        totalAll += dayTotal;
        wsData.push([i+1, m.date, _dxMonth(m.date), bf, lh, dn, gb, gl, gd, dayTotal, m.chef || '', '']);
        previewRows.push([m.date, _dxMonth(m.date), bf, lh, dn, gb, gl, gd, dayTotal, m.chef || '']);
      });
      wsData.push([]);
      wsData.push(['في الإجازات', '', '', '', '', '', '', '', '', totalAll, '', '']);
      wsData.push(['اجمالي الاسرة الاسرة', filtered.length, '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('المشغولة الاسرة - ' + filtered.length + ' الشاغرة', ['ملخص', 'القوة', 'غير محدد', 'توزيع القوة', 'حسب القطاع', 'التاريخ القطاع', 'اجمالي متواجد', 'اجازة نسبة', 'الحضور', 'الاجمالي'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:11}}];
      _dxFinishSheet(ws, 12, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'توزيع');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات القطاعات غير محدد (' + filtered.length + ' توزيع) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXTea() {
      var range = getDXDateRange();
      var filtered = teaSugarDisbursements.filter(function(t) { return dxDateInRange(t.date, range.from, range.to); });
      if (!filtered.length) return alert('لا توجد بيانات شاي وسكر للتصدير في النطاق المحدد');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'تقرير_شاي_وسكر_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wb = XLSX.utils.book_new();
      var s1Data = [['تقرير الشاي والسكر', '', '', '', '', '', '', '', '', ''], ['من: ' + (range.from || '') + ' إلى ' + (range.to || ''), '', '', '', '', '', '', '', '', ''], []];
      s1Data.push(['#', 'التاريخ', 'القسم', 'الاسم', 'شاي', 'سكر', 'ملاحظات']);
      var totalTea = 0, totalSugar = 0;
      var previewRows = [];
      filtered.forEach(function(t, i) {
        var emp = employees.find(function(e) { return e.id === t.empId || e.code === t.empCode; });
        var tea = _dxNum(t.teaPacks), sugar = _dxNum(t.sugarKg);
        totalTea += tea; totalSugar += sugar;
        s1Data.push([i+1, t.date, t.empCode || '', t.empName || '', emp ? emp.title : '', emp ? (emp.sector + ' / ' + emp.room) : '', emp ? emp.gov : '', tea, sugar, '']);
        previewRows.push([t.date, t.empCode || '', t.empName || '', emp ? emp.title : '', emp ? (emp.sector + ' / ' + emp.room) : '', emp ? emp.gov : '', tea, sugar]);
      });
      s1Data.push([]);
      s1Data.push(['التعاقد', '', '', '', '', '', '', totalTea, totalSugar, '']);
      s1Data.push(['التاريخ نوع', filtered.length, '', '', '', '', '', '', '', '']);
      _dxPreview('التعاقد العدد النسبة - ' + filtered.length + ' الاجمالي', ['نوع', 'التعاقد', 'احصاء القوة', 'اليومية', 'اجمالي / القوة', 'متواجد', 'نسبة (الحضور)', 'اجازة (نسبة)'], previewRows);
      var ws1 = XLSX.utils.aoa_to_sheet(s1Data);
      ws1['!merges'] = [{s:{r:0,c:0},e:{r:0,c:9}}];
      _dxFinishSheet(ws1, 10, 2);
      XLSX.utils.book_append_sheet(wb, ws1, 'الاجازة تم تصدير');
      var s2Data = [['احصاء القوة', '', '', '', '', ''], []];
      s2Data.push(['لا', 'توجد بيانات', 'وجبات', 'في', 'النطاق', 'المحدد']);
      var sortedEmp = employees.slice().sort(function(a, b) { return (a.code || '').localeCompare(b.code || ''); });
      sortedEmp.forEach(function(e) {
        s2Data.push([e.code || '', e.name || '', e.title || '', e.sector || '', e.gov || '', e.room || '']);
      });
      var ws2 = XLSX.utils.aoa_to_sheet(s2Data);
      ws2['!merges'] = [{s:{r:0,c:0},e:{r:0,c:5}}];
      _dxFinishSheet(ws2, 6, 1);
      XLSX.utils.book_append_sheet(wb, ws2, 'تقرير الوجبات');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات اليومية الفترة البداية إلى (' + filtered.length + ' النهاية) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXSeptic() {
      var range = getDXDateRange();
      var filtered = septicRecords.filter(function(s) { return dxDateInRange(s.date, range.from, range.to); });
      if (!filtered.length) return alert('لا توجد بيانات بيارات للتصدير في النطاق المحدد');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'تقرير_البيارات_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['تقرير البيارات', '', '', '', '', '', '', '', ''], ['من: ' + (range.from || '') + ' إلى ' + (range.to || ''), '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'التاريخ', 'الاسم', 'عدد النقلات', 'ملاحظات']);
      var totalTrips = 0, totalVol = 0;
      var previewRows = [];
      filtered.forEach(function(s, i) {
        var trips = _dxNum(s.trips), vol = trips * 5;
        totalTrips += trips; totalVol += vol;
        wsData.push([i+1, s.date, s.time || '', _dxMonth(s.date), s.name || '', trips, vol, s.supervisor || '', '']);
        previewRows.push([s.date, s.time || '', _dxMonth(s.date), s.name || '', trips, vol, s.supervisor || '']);
      });
      wsData.push([]);
      wsData.push(['الوجبات', '', '', '', '', totalTrips, totalVol, '', '']);
      wsData.push(['يوم التاريخ', filtered.length, '', '', '', '', '', '', '']);
      _dxPreview('الشهر إفطار قوة - ' + filtered.length + ' غداء', ['قوة', 'عشاء', 'قوة', 'إفطار', 'ضيوف غداء', 'ضيوف (?3)', 'عشاء ضيوف'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:8}}];
      _dxFinishSheet(ws, 9, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الإجمالي الشيف');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات الوجبات تم تصدير تقرير (' + filtered.length + ' الوجبات) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXBreadCost() {
      var range = getDXDateRange();
      var filtered = bakeryProductions.filter(function(p) { return dxDateInRange(p.date, range.from, range.to); });
      if (!filtered.length) return alert('لا توجد بيانات إنتاج خبز في الفترة المحددة للتصدير.');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'tqreport_bread_cost_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['وسكر في النطاق - المحدد تقرير', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], ['صرف: ' + (range.from || 'الشاي') + ' والسكر ' + (range.to || 'الفترة'), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'البداية', 'إلى النهاية', 'م (التاريخ)', 'الكود اسم', 'الموظف الوظيفة', 'القطاع (الغرفة)', 'المحافظة شاي', 'ربطة', 'سكر (كجم)', 'ملاحظات الإجمالي', 'عدد العمليات', 'تقرير (الشاي)', 'والسكر عملية', 'التاريخ الكود', 'اسم (الموظف)', 'الوظيفة القطاع', 'الغرفة المحافظة', 'شاي ربطة', 'سكر كجم', 'صرف الشاي', 'والسكر (تفاصيل)']);
      var previewRows = [];
      var ingPrice = function(id) { var i = bakeryIngredients.find(function(x) { return x.id === id; }); return i ? parseFloat(i.pricePerUnit) || 0 : 0; };
      var pFlour = ingPrice('ING001'), pYeast = ingPrice('ING002'), pSalt = ingPrice('ING003'), pBran = ingPrice('ING004'), pDiesel = ingPrice('ING007');
      var grandTotal = 0, grandBread = 0;
      filtered.forEach(function(p, i) {
        var breadProd = parseInt(p.breadCount) || 0;
        var ctrSameDay = bakeryContractorSupplies.filter(function(cs) { return cs.date === p.date; });
        var breadCtr = 0;
        ctrSameDay.forEach(function(cs) { breadCtr += parseInt(cs.count) || 0; });
        var bread = breadProd + breadCtr;
        var flourQty = getBakedField(p, 'flourUsed', 'flourQty');
        var yeastQty = getBakedField(p, 'yeastUsed', 'yeastQty');
        var saltQty = getBakedField(p, 'saltUsed', 'saltQty');
        var branQty = getBakedField(p, 'branUsed', 'branQty');
        var dieselQty = getBakedField(p, 'dieselUsed', 'dieselQty');
        var opCost = getBakedOpCost(p);
        var costFlour = Math.round(flourQty * pFlour * 100) / 100;
        var costYeast = Math.round(yeastQty * pYeast * 100) / 100;
        var costSalt = Math.round(saltQty * pSalt * 100) / 100;
        var costBran = Math.round(branQty * pBran * 100) / 100;
        var costDiesel = Math.round(dieselQty * pDiesel * 100) / 100;
        var cstFarm = costFlour + costYeast + costSalt + costBran + costDiesel + opCost;
        var cstCtr = ctrSameDay.reduce(function(s, cs) { return s + (parseFloat(cs.prodCost) || 0); }, 0);
        var totalCost = cstFarm;
        var costPerLoaf = bread > 0 ? Math.round((totalCost / bread) * 1000) / 1000 : 0;
        grandTotal += totalCost; grandBread += bread;
        wsData.push([i+1, p.date, bread, flourQty, pFlour, costFlour, yeastQty, pYeast, costYeast, saltQty, pSalt, costSalt, branQty, pBran, costBran, dieselQty, pDiesel, costDiesel, opCost, cstCtr, Math.round(totalCost*100)/100, costPerLoaf]);
        previewRows.push([p.date, bread, flourQty, costFlour, yeastQty, costYeast, saltQty, costSalt, branQty, costBran, dieselQty, costDiesel, opCost, cstCtr, Math.round(totalCost*100)/100, costPerLoaf]);
      });
      wsData.push([]);
      wsData.push(['الموظفين', '', grandBread, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', Math.round(grandTotal*100)/100, grandBread > 0 ? Math.round((grandTotal / grandBread) * 1000) / 1000 : 0]);
      wsData.push(['الكود اسم الموظف', filtered.length, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('الوظيفة القطاع - ' + filtered.length + ' المحافظة', ['الغرفة', 'بيانات الموظفين', 'تم (تصدير)', 'تقرير الشاي', 'والسكر (عملية)', 'لا', 'توجد (بيانات)', 'صرف صحي', 'في (النطاق)', 'المحدد حصر', 'كميات (الصرف)', 'الصحي الفترة', 'البداية إلى', 'النهاية م', 'التاريخ التوقيت', 'الشهر البيارة'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:21}}];
      _dxFinishSheet(ws, 22, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'عدد النقلات');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات الصرف م الفني (' + filtered.length + ' المسؤول) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXBreadCount() {
      var range = getDXDateRange();
      var filtered = bakeryContractorSupplies.filter(function(cs) { return dxDateInRange(cs.date, range.from, range.to); });
      if (!filtered.length) return alert('لا توجد بيانات توريد خبز للتصدير في النطاق المحدد');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'تقرير_توريد_الخبز_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['تقرير توريد الخبز للمقاولين', '', '', '', '', '', '', '', '', '', '', '', ''], ['من: ' + (range.from || '') + ' إلى ' + (range.to || ''), '', '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'التاريخ', 'المقاول', 'عدد الأرغفة', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي']);
      var previewRows = [];
      var totalRevenue = 0, totalPaid = 0, totalBread = 0;
      filtered.forEach(function(cs, i) {
        var ctrCount = parseInt(cs.count) || 0;
        var price = parseFloat(cs.price) || 0;
        var revenue = ctrCount * price;
        var paid = parseFloat(cs.paid) || 0;
        var prodCost = parseFloat(cs.prodCost) || 0;
        var remaining = revenue - paid;
        var status = remaining <= 0 ? 'توجد' : (paid > 0 ? 'بيانات' : 'إنتاج');
        totalRevenue += revenue; totalPaid += paid; totalBread += ctrCount;
        wsData.push([i+1, cs.date, cs.name || '', ctrCount, price, Math.round(revenue*100)/100, Math.round(prodCost*100)/100, Math.round(paid*100)/100, Math.round(remaining*100)/100, status, cs.responsible || '', cs.notes || '']);
        previewRows.push([cs.date, cs.name || '', ctrCount, price, Math.round(revenue*100)/100, Math.round(prodCost*100)/100, Math.round(paid*100)/100, Math.round(remaining*100)/100, status, cs.responsible || '']);
      });
      wsData.push([]);
      wsData.push(['في', '', '', totalBread, '', Math.round(totalRevenue*100)/100, '', Math.round(totalPaid*100)/100, Math.round((totalRevenue - totalPaid)*100)/100, '', '', '']);
      wsData.push(['النطاق المحدد', filtered.length, '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('تكلفة إنتاج الخبز - ' + filtered.length + ' فرن', ['المزرعة', 'الفترة', 'البداية إلى', 'النهاية م', 'التاريخ', 'عدد الأرغفة', 'دقيق', 'كجم', 'سعر', 'الدقيق'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:11}}];
      _dxFinishSheet(ws, 12, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تكلفة الدقيق');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'بيانات خميرة كجم سعر (' + filtered.length + ' الخميرة) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function checkMissingFields() {
      var results = [];
      // mealLogs
      mealLogs.forEach(function(r, i) {
        var missing = [];
        if (!r.chef || !r.chef.trim()) missing.push('تكلفةخميرة');
        var _g = calcHospGuestsForDate(r.date);
        if ((!r.breakfast || r.breakfast < 1) && (!r.lunch || r.lunch < 1) && (!r.dinner || r.dinner < 1) && !_g.gBf && !_g.gLh && !_g.gDn) missing.push('ملح كجم سعر');
        if (missing.length) results.push({ table: 'الملح', index: i, date: r.date, fields: missing, data: r });
      });
      // teaSugarDisbursements
      teaSugarDisbursements.forEach(function(r, i) {
        var missing = [];
        if (!r.empName || !r.empName.trim()) missing.push('تكلفة الملح');
        if (!r.empCode || !r.empCode.toString().trim()) missing.push('ردة كجم');
        if ((!r.teaPacks || r.teaPacks < 1) && (!r.sugarKg || r.sugarKg < 1)) missing.push('سعر (الردة/تكلفة)');
        if (missing.length) results.push({ table: 'الردة سولار', index: i, date: r.date, fields: missing, data: r });
      });
      // septicRecords
      septicRecords.forEach(function(r, i) {
        var missing = [];
        if (!r.name || !r.name.trim()) missing.push('لتر');
        if (!r.trips || r.trips < 1) missing.push('سعر السولار');
        if (!r.supervisor || !r.supervisor.trim()) missing.push('تكلفة السولار');
        if (missing.length) results.push({ table: 'أجر التشغيل', index: i, date: r.date, fields: missing, data: r });
      });
      // bakeryProductions
      bakeryProductions.forEach(function(r, i) {
        var missing = [];
        if (!r.breadCount || r.breadCount < 1) missing.push('خامات مقاولين');
        if ((!r.flourUsed || r.flourUsed < 0.1) && (!r.dieselUsed || r.dieselUsed < 0.1)) missing.push('إجمالي (التكلفة/تكلفة)');
        if (missing.length) results.push({ table: 'الرغيف', index: i, date: r.date, fields: missing, data: r });
      });
      // bakeryContractorSupplies
      bakeryContractorSupplies.forEach(function(r, i) {
        var missing = [];
        if (!r.name || !r.name.trim()) missing.push('الإجمالي عدد');
        if (!r.count || r.count < 1) missing.push('أيام الإنتاج');
        if (!r.responsible || !r.responsible.trim()) missing.push('تكلفة');
        if (missing.length) results.push({ table: 'الخبز يوم', index: i, date: r.date, fields: missing, data: r });
      });
      showFieldCheckResults(results);
    }

    function showFieldCheckResults(results) {
      var container = document.getElementById('field-check-results');
      if (!results.length) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#1b5e20;font-size:16px;">✅ جميع الحقول ممتلئة — لا توجد مشاكل</div>';
      } else {
        var html = '<div style="margin-bottom:10px;padding:8px 12px;background:#fff3e0;border-radius:6px;font-size:13px;color:#e65100;">تم العثور على ' + results.length + ' حقل يحتاج إلى تغذية بالبيانات (دقيق، خميرة، ملح، ردة).</div>';
        html += '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#1565c0;color:white;"><th>#</th><th>التاريخ</th><th>عدد الأرغفة</th><th>دقيق (كجم)</th><th>خميرة (كجم)</th><th>ملح (كجم)</th><th>ردة (كجم)</th><th>سولار (لتر)</th></tr></thead><tbody>';
        results.forEach(function(r, i) {
          html += '<tr style="border-bottom:1px solid #e0e0e0;"><td>' + (i+1) + '</td><td>' + r.table + '</td><td>' + r.date + '</td><td style="color:#d32f2f;">' + r.fields.join('، ') + '</td><td><button class="btn" style="padding:2px 8px;font-size:11px;background:#1565c0;color:white;" onclick="openFieldFeeder(' + i + ')">✏️ تغذية</button></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
      }
      // Store results for the feeder
      window._fieldCheckResults = results;
      openModal('modal-field-check');
    }

    function openFieldFeeder(idx) {
      var r = window._fieldCheckResults[idx];
      if (!r) return;
      var table = r.table, data = r.data, fields = r.fields;
      var html = '<div style="margin-bottom:10px;font-size:13px;"><b>' + table + '</b> — التشغيل: ' + r.date + '</div>';
      html += '<div class="form-grid" style="grid-template-columns:1fr;">';
      var keys = Object.keys(data);
      // Build a form for ALL fields of this record
      keys.forEach(function(k) {
        var val = data[k];
        var label = k;
        var isMissing = fields.some(function(f) { return f.indexOf(label) > -1 || label.indexOf(f) > -1; });
        var displayVal = (val === null || val === undefined || val === '') ? '' : (typeof val === 'object' ? JSON.stringify(val) : val);
        if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
          // Skip complex objects for simplicity
          return;
        }
        html += '<div class="form-group"><label style="' + (isMissing ? 'color:#d32f2f;font-weight:700;' : '') + '">' + label + '</label><input type="text" id="ffe-field-' + k + '" value="' + displayVal + '" style="' + (isMissing ? 'border-color:#d32f2f;' : '') + 'padding:6px;border:2px solid #e0e0e0;border-radius:6px;font-size:13px;"></div>';
      });
      html += '</div><button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="saveFieldFeeder(' + idx + ')">💾 حفظ التعديلات</button>';
      var container = document.getElementById('field-check-results');
      container.innerHTML = html;
      window._currentFeederIdx = idx;
    }

    function saveFieldFeeder(idx) {
      var r = window._fieldCheckResults[idx];
      if (!r) return;
      var data = r.data;
      var keys = Object.keys(data);
      keys.forEach(function(k) {
        if (typeof data[k] === 'object' && !Array.isArray(data[k]) && data[k] !== null) return;
        var el = document.getElementById('ffe-field-' + k);
        if (!el) return;
        var val = el.value;
        if (typeof data[k] === 'number') data[k] = parseFloat(val) || 0;
        else if (typeof data[k] === 'boolean') data[k] = val === 'true' || val === '1';
        else data[k] = val;
      });
      syncStorage();
      // Re-check all
      checkMissingFields();
    }
    function toggleAllCheckboxes(master) {
      let table = master.getAttribute('data-table');
      document.querySelectorAll('#' + table + ' .row-check').forEach(cb => cb.checked = master.checked);
    }

    function printSelectedRows(tableId) {
      let table = document.getElementById(tableId);
      if (!table) { alert('لم يتم العثور على الجدول المطلوب.'); return; }
      let checked = table.querySelectorAll('.row-check:checked');
      if (!checked.length) { alert('الرجاء تحديد صفوف للطباعة.'); return; }

      let allTh = Array.from(table.querySelectorAll('thead th'));
      let excludeIndices = new Set();

      // First column (checkbox)
      if (allTh[0] && allTh[0].querySelector('.check-all')) excludeIndices.add(0);
      // Last column (actions)
      if (allTh[allTh.length - 1] && allTh[allTh.length - 1].classList.contains('no-print')) excludeIndices.add(allTh.length - 1);
      // Columns with data-print="hide"
      allTh.forEach((th, i) => { if (th.getAttribute('data-print') === 'hide') excludeIndices.add(i); });

      let headerCells = allTh.filter((th, i) => !excludeIndices.has(i));
      let headerRow = '<tr>' + headerCells.map(h => '<th>' + h.textContent + '</th>').join('') + '</tr>';

      let rows = '';
      let totalCount = 0, totalRevenue = 0, totalPaid = 0, totalRemaining = 0;
      let isContractorTable = tableId === 'table-bakery-ctr-supply';

      let rowData = [];
      checked.forEach(cb => {
        let tr = cb.closest('tr');
        if (tr) {
          let origTd = tr.querySelectorAll('td');
          let date = origTd[1]?.textContent || '';
          let clone = tr.cloneNode(true);
          let allTd = clone.querySelectorAll('td');
          let removeList = Array.from(allTd).filter((td, i) => excludeIndices.has(i));
          removeList.reverse().forEach(td => td.remove());
          var cleaned = clone.outerHTML.replace(/<td[^>]*><\/td>/g, '').replace(/[\u{1F300}-\u{1FFFF}]/gu, '');
          rowData.push({ html: cleaned, date: date });

          if (isContractorTable) {
            totalCount += parseInt(origTd[3]?.textContent) || 0;
            totalRevenue += parseFloat(origTd[5]?.textContent) || 0;
            totalPaid += parseFloat(origTd[6]?.textContent) || 0;
            totalRemaining += parseFloat(origTd[7]?.textContent) || 0;
          }
        }
      });
      // Special case for vacations table
      if (tableId === 'table-vacations') {
        printVacationForms(checked);
        return;
      }
      rows = rowData.map(function(r) { return r.html; }).join('');
      if (!rows) { alert('لا توجد بيانات للطباعة.'); return; }

      let logoImg = document.querySelector('.print-watermark img');
      let logoSrc = logoImg ? logoImg.src : '';

      let summaryHtml = '';
      if (isContractorTable && checked.length > 0) {
        summaryHtml = '<div style="margin-top:20px;border:2px solid #1b5e20;border-radius:8px;padding:12px;background:transparent;">' +
          '<h3 style="text-align:center;color:#1b5e20;margin:0 0 10px;">ملخص توريد الخبز</h3>' +
          '<table style="width:auto;margin:0 auto;border:none;">' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">إجمالي الكمية:</td><td style="border:none;font-weight:700;color:#1b5e20;padding:4px 12px;">' + totalCount + ' رغيف</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">إجمالي الإيراد:</td><td style="border:none;font-weight:700;color:#1b5e20;padding:4px 12px;">' + totalRevenue.toFixed(2) + ' جنيه</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">إجمالي المدفوع:</td><td style="border:none;font-weight:700;color:#1565c0;padding:4px 12px;">' + totalPaid.toFixed(2) + ' جنيه</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">المتبقي:</td><td style="border:none;font-weight:700;color:#d32f2f;padding:4px 12px;">' + totalRemaining.toFixed(2) + ' جنيه</td></tr>' +
          '</table></div>';
      }

      let logoEl = document.querySelector('img[alt="Logo"]');
      let logoSrc2 = logoEl ? logoEl.src : logoSrc;
      let title, headerExtra = '';
      if (tableId === 'table-bakery-ctr-supply') {
        let fromDate = document.getElementById('filt-ctr-from')?.value || '';
        let toDate = document.getElementById('filt-ctr-to')?.value || '';
        title = 'بيان توريد خبز لمقاول';
        if (fromDate || toDate) headerExtra = '<div style="text-align:center;font-size:13px;color:#555;margin:4px 0 10px;">عن الفترة: ' + (fromDate || '—') + ' إلى ' + (toDate || '—') + '</div>';
      } else {
        title = tableId ? tableId.replace(/table-/g, '').replace(/-/g, ' ') : 'تقرير';
      }
      let w = window.open('', '_blank', 'width=900,height=700');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>' + title + '</title>' +
        '<style>body{font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif;padding:20px;}' +
        'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;}' +
        'th,td{border:1px solid #ddd;padding:5px 6px;text-align:center;}' +
        'th{background:#1b5e20;color:white;}' +
        'h2{text-align:center;color:#1b5e20;margin:0;}' +
        '.print-header{display:flex;align-items:center;gap:12px;justify-content:center;border-bottom:3px double #1b5e20;padding-bottom:10px;margin-bottom:12px;}' +
        '.print-header img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #1b5e20;padding:2px;}' +
        '.print-watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);z-index:-1;pointer-events:none;}' +
        '.print-watermark img{width:500px;height:auto;opacity:0.07;}' +
        '@media print{body{padding:0;}}</style></head><body>' +
        (logoSrc2 ? '<div class="print-header"><img src="' + logoSrc2 + '"><div><h2>' + title + '</h2>' + headerExtra + '</div></div>' : '<h2>' + title + '</h2>' + headerExtra) +
        '<table>' + headerRow + rows + '</table>' +
        summaryHtml +
        '<div style="text-align:center;color:#888;margin-top:15px;font-size:11px;">طباعة: ' + new Date().toLocaleString('ar-EG') + '</div>' +
        '<script>window.print();setTimeout(function(){window.close()},1500);</' + 'script>' +
        '</body></html>');
      w.document.close();
    }

    function printVacationForms(checked) {
      let logoImg = document.querySelector('.print-watermark img');
      let logoSrc = logoImg ? logoImg.src : '';

      function esc(t) { return (t || '').replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]||c;}); }

      let rows = '';
      let idx = 0;
      checked.forEach(cb => {
        let tr = cb.closest('tr');
        if (!tr) return;
        let td = tr.querySelectorAll('td');
        let code = esc(td[1]?.textContent?.trim());
        let name = esc(td[2]?.textContent?.trim());
        let info = esc(td[3]?.textContent?.trim());
        let startDate = esc(td[4]?.textContent?.trim());
        let days = esc(td[5]?.textContent?.trim());
        let endDate = esc(td[6]?.textContent?.trim());
        let travelDate = esc(td[7]?.textContent?.trim());
        let lastWorkDay = esc(td[8]?.textContent?.trim());
        let returnDate = esc(td[9]?.textContent?.trim());
        let vacType = esc(td[10]?.textContent?.trim());
        idx++;
        rows += '<tr>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + idx + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + code + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;">' + name + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;">' + info + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + vacType + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + startDate + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + endDate + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + days + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (travelDate||'—') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (lastWorkDay||'—') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (returnDate||'—') + '</td>' +
          '</tr>';
      });

      let emptyRows = Math.max(0, 5 - idx);
      for (let i = 0; i < emptyRows; i++) {
        idx++;
        rows += '<tr>' + '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + idx + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;"></td><td style="padding:5px 6px;border:1px solid #000;"></td>' +
          '<td style="padding:5px 6px;border:1px solid #000;"></td><td style="padding:5px 6px;border:1px solid #000;"></td>' +
          '<td style="padding:5px 6px;border:1px solid #000;"></td><td style="padding:5px 6px;border:1px solid #000;"></td>' +
          '<td style="padding:5px 6px;border:1px solid #000;"></td><td style="padding:5px 6px;border:1px solid #000;"></td>' +
          '<td style="padding:5px 6px;border:1px solid #000;"></td><td style="padding:5px 6px;border:1px solid #000;"></td>' +
          '</tr>';
      }

      let w = window.open('', '_blank', 'width=900,height=700');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>طباعة الإجازات</title>' +
        '<style>' +
        '@page{size:A4 landscape;margin:10mm 10mm;}' +
        'body{font-family:"Traditional Arabic","Arabic Typesetting","Segoe UI",Tahoma,Arial,sans-serif;margin:0;padding:15px;font-size:12px;line-height:1.4;color:#000;}' +
        'table{width:100%;border-collapse:collapse;}' +
        'th{background:#e0e0e0;color:#000;font-weight:700;text-align:center;padding:6px 4px;border:1px solid #000;}' +
        'td{padding:4px;border:1px solid #000;text-align:center;}' +
        '.title{text-align:center;font-size:18px;font-weight:700;margin-bottom:10px;}' +
        '@media print{body{padding:0;}}' +
        '</style></head><body>' +
        (logoSrc ? '<div style="text-align:center;margin-bottom:6px;"><img src="' + logoSrc + '" style="height:40px;width:auto;"></div>' : '') +
        '<div class="title">سجل الإجازات</div>' +
        '<table><thead><tr>' +
        '<th style="width:4%;">م</th><th style="width:7%;">الكود</th><th style="width:14%;">الاسم</th><th style="width:12%;">الجهة</th>' +
        '<th style="width:8%;">النوع</th><th style="width:10%;">البداية</th><th style="width:10%;">النهاية</th><th style="width:5%;">أيام</th>' +
        '<th style="width:10%;">تاريخ السفر</th><th style="width:10%;">آخر يوم عمل</th><th style="width:10%;">تاريخ العودة</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '<script>window.print();setTimeout(function(){window.close()},1500);</' + 'script>' +
        '</body></html>');
      w.document.close();
    }

    // ====== Employee Evaluations ======
    function populateEvalEmployees() {
      var grid = document.getElementById('eval-employees-grid');
      if (!grid) return;
      grid.innerHTML = '';
      var admin = employees.filter(function(e) {
        if (!e.dept) return false;
        var d = e.dept.replace(/\s+/g, '').replace(/[يى]/g, 'ي').replace(/[ةه]/g, 'ة').replace(/[إأآ]/g, 'ا').toLowerCase();
        return d.indexOf('الشئون') > -1 || d.indexOf('اداري') > -1;
      });
      if (!admin.length) {
        var depts = {};
        employees.forEach(function(e) { if (e.dept) depts[e.dept] = (depts[e.dept] || 0) + 1; });
        var list = Object.keys(depts).map(function(k) { return k + ': ' + depts[k] + ' موظف'; }).join(' | ');
        grid.innerHTML = '<div style="color:#d32f2f;font-size:14px;padding:20px;text-align:center;">لا يوجد موظفون في الشئون الإدارية<br><span style="font-size:12px;color:#555;">جميع الأقسام: ' + list + '</span></div>';
        return;
      }
      admin.sort(function(a,b) { return (a.name || '').localeCompare(b.name || 'ar'); });
      admin.forEach(function(e) {
        var card = document.createElement('div');
        card.className = 'eval-emp-card';
        card.setAttribute('data-id', e.id || e.code);
        card.innerHTML = '<div class="card-code">' + (e.code || '') + '</div><div class="card-name">' + (e.name || '') + '</div><div class="card-title">' + (e.title || '') + '</div>';
        card.onclick = function() {
          document.querySelectorAll('.eval-emp-card').forEach(function(c) { c.classList.remove('selected'); });
          this.classList.add('selected');
          document.getElementById('eval-emp-id').value = e.id || e.code;
          loadEvalTasks();
        };
        grid.appendChild(card);
      });
    }

    function generateDefaultTasks(title) {
      var defaults = {
        "مدير": [{name:"متابعة سير العمل في القسم",max:20},{name:"إعداد التقارير الدورية",max:20},{name:"التنسيق مع الإدارات الأخرى",max:20},{name:"الإشراف على الموظفين",max:20},{name:"حل المشكلات والمخالفات",max:20}],
        "مهندس": [{name:"الإشراف على الأعمال الفنية",max:20},{name:"متابعة تنفيذ المخططات",max:20},{name:"إعداد التقارير الفنية",max:20},{name:"التنسيق مع فرق العمل",max:20},{name:"التأكد من الجودة",max:20}],
        "مشرف": [{name:"الإشراف على العمال",max:20},{name:"توزيع المهام اليومية",max:20},{name:"متابعة الحضور والانصراف",max:20},{name:"الإبلاغ عن المخالفات",max:20},{name:"التأكد من تنفيذ التعليمات",max:20}],
        "عامل": [{name:"تنفيذ المهام المكلف بها",max:20},{name:"الالتزام بمواعيد العمل",max:20},{name:"الحفاظ على أدوات العمل",max:20},{name:"نظافة موقع العمل",max:20},{name:"التعاون مع الزملاء",max:20}],
        "فني": [{name:"متابعة أعمال الصيانة",max:20},{name:"إعداد تقارير فنية",max:20},{name:"التنسيق مع الفرق",max:20},{name:"جودة العمل",max:20},{name:"الالتزام بالمعايير",max:20}],
        "سائق": [{name:"نقل المهمات في الوقت المحدد",max:20},{name:"صيانة المركبة ونظافتها",max:20},{name:"الالتزام بقواعد المرور",max:20},{name:"الحفاظ على الوقود",max:20},{name:"التسليم الآمن",max:20}],
        "فرد": [{name:"تأمين الموقع",max:20},{name:"الالتزام بالورديات",max:20},{name:"الإبلاغ عن المخالفات",max:20},{name:"النظافة العامة",max:20},{name:"التعامل الجيد مع الزوار",max:20}],
        "أمين مخزن": [{name:"استلام وصرف الأصناف",max:20},{name:"تنظيم المخزن",max:20},{name:"الجرد الدوري",max:20},{name:"تحديث السجلات",max:20},{name:"الإبلاغ عن نقص الأصناف",max:20}],
        "الاجازة": [{name:"مدة الاجازة نوع",max:20},{name:"الاجازة تسجيل",max:20},{name:"اودوو مدير الإدارة",max:20},{name:"القسم شئون",max:20},{name:"العاملين إعتماد",max:20}],
        "قائد فريق": [{name:"توجيه فريق العمل",max:20},{name:"متابعة تنفيذ المهام",max:20},{name:"التنسيق بين أعضاء الفريق",max:20},{name:"رفع تقارير الإنجاز",max:20},{name:"حل مشكلات الفريق",max:20}]
      };
      for (var key in defaults) {
        if (title.indexOf(key) > -1) return defaults[key];
      }
      return [{name:"تنفيذ المهام المكلف بها بدقة",max:25},{name:"الالتزام بمواعيد العمل",max:25},{name:"التعاون مع الفريق",max:20},{name:"الحفاظ على أدوات العمل",max:15},{name:"الإبلاغ عن الملاحظات",max:15}];
    }

    function loadEvalTasks() {
      var empId = document.getElementById('eval-emp-id').value;
      var container = document.getElementById('eval-tasks-container');
      var titleInput = document.getElementById('eval-title');
      if (!empId) {
        container.innerHTML = '<div style="color:#888;font-size:13px;">الإشراف على الموظفين حل المشكلات والمخالفات</div>';
        titleInput.value = '';
        return;
      }
      var emp = employees.find(function(e) { return (e.id || e.code) == empId; });
      if (!emp) return;
      var title = emp.title || '';
      titleInput.value = title;
      var tasks = evalTemplates[title] || generateDefaultTasks(title);
      var html = '';
      tasks.forEach(function(task, i) {
        var maxVal = task.max || 5;
        html += '<div style="display:flex;align-items:center;gap:8px;background:#fce4ec;padding:8px 12px;border-radius:8px;">';
        html += '<span style="flex:1;font-size:13px;font-weight:600;">' + (i+1) + '. ' + task.name + '</span>';
        html += '<span style="font-size:11px;color:#880e4f;white-space:nowrap;">(من ' + maxVal + ')</span>';
        html += '<input type="number" id="kpi-score-' + i + '" value="' + maxVal + '" min="0" max="' + maxVal + '" step="0.5" style="width:70px;padding:4px 6px;border:2px solid #880e4f;border-radius:6px;font-size:13px;font-weight:700;text-align:center;">';
        html += '</div>';
      });
      container.innerHTML = html;
    }

    function addEvaluation() {
      var empId = document.getElementById('eval-emp-id').value;
      if (!empId) return alert('من فضلك اختر الموظف');
      var emp = employees.find(function(e) { return (e.id || e.code) == empId; });
      if (!emp) return alert('مع فرق العمل');
      var dd2 = (emp.dept||'').replace(/\s+/g,'').replace(/[يى]/g,'ي').replace(/[ةه]/g,'ة').replace(/[إأآ]/g,'ا').toLowerCase();
      if (dd2.indexOf('الشئون') === -1 && dd2.indexOf('اداري') === -1) return alert('هذا الموظف ليس من قسم الشئون الإدارية');
      var month = document.getElementById('eval-month').value;
      var year = document.getElementById('eval-year').value;
      if (!year || year < 2020) return alert('من فضلك أدخل سنة صحيحة');
      var title = emp.title || '';
      var tasks = evalTemplates[title] || generateDefaultTasks(title);
      var kpiScores = [];
      var totalScore = 0;
      var maxScore = 0;
      tasks.forEach(function(task, i) {
        var maxVal = task.max || 5;
        var input = document.getElementById('kpi-score-' + i);
        var score = input ? parseFloat(input.value) || 0 : 0;
        if (score < 0) score = 0;
        if (score > maxVal) score = maxVal;
        kpiScores.push({ name: task.name, max: maxVal, score: score });
        totalScore += score;
        maxScore += maxVal;
      });
      var deduction = parseFloat(document.getElementById('eval-behavior-deduct').value) || 0;
      if (deduction < 0) deduction = 0;
      var bonus = parseFloat(document.getElementById('eval-bonus').value) || 0;
      if (bonus < 0) bonus = 0;
      var adjustedScore = totalScore - deduction + bonus;
      var grade = adjustedScore >= 90 ? 'ممتاز' : adjustedScore >= 75 ? 'جيد جداً' : adjustedScore >= 60 ? 'جيد' : adjustedScore >= 45 ? 'مقبول' : 'ضعيف';
      var notes = document.getElementById('eval-notes').value.trim();
      // Check duplicate
      var dup = evaluations.some(function(e) {
        return e.empId === empId && e.month === month && e.year === year;
      });
      if (dup && !confirm('هذا الموظف لديه تقييم سابق لنفس الشهر والسنة. هل تريد إضافة تقييم جديد؟')) return;
      evaluations.push(_ts({
        id: Date.now().toString(),
        empId: empId,
        empCode: emp.code || '',
        empName: emp.name,
        empTitle: title,
        empDept: emp.dept || '',
        month: month,
        year: year,
        tasks: kpiScores,
        totalScore: totalScore,
        maxScore: maxScore,
        deduction: deduction,
        bonus: bonus,
        adjustedScore: adjustedScore,
        grade: grade,
        notes: notes,
        date: new Date().toISOString()
      }));
      syncStorage();
      renderEvaluations();
      document.getElementById('eval-notes').value = '';
      document.getElementById('eval-behavior-deduct').value = '0';
      document.getElementById('eval-bonus').value = '0';
      alert('تم تقييم الموظف ' + emp.name + ' (النتيجة: ' + adjustedScore + ')');
    }

    function renderEvaluations() {
      var tbody = document.getElementById('evaluations-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      var filtered = [].concat(evaluations);
      var st = sortState['table-evaluations'];
      if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      filtered.forEach(function(e) {
        var realIdx = evaluations.indexOf(e);
        var monthNames = ['', 'التعاون','مع','الزملاء','فني','إصلاح','الأعطال','الصيانة','الدورية','فحص','المعدات','الاستجابة','للبلاغات'];
        var tr = document.createElement('tr');
        var isPr = e.deduction !== undefined; // new format
        var displayScore = isPr ? e.totalScore + ' / ' + e.maxScore : (e.totalScore || '—') + ' / ' + (e.maxScore || '—');
        var displayAdj = isPr ? e.adjustedScore + '' : (e.percentage !== undefined ? e.percentage + '%' : '—');
        var dedStr = isPr ? (e.deduction || 0) + '' : '—';
        var bonusStr = isPr ? (e.bonus || 0) + '' : '—';
        var adjColor = isPr ? (e.adjustedScore >= 75 ? '#2e7d32' : e.adjustedScore >= 45 ? '#e65100' : '#d32f2f') : (e.percentage >= 75 ? '#2e7d32' : e.percentage >= 50 ? '#e65100' : '#d32f2f');
        var grdColor = isPr ? (e.adjustedScore >= 90 ? '#1b5e20' : e.adjustedScore >= 75 ? '#2e7d32' : e.adjustedScore >= 60 ? '#f57c00' : e.adjustedScore >= 45 ? '#e65100' : '#d32f2f') : (e.percentage >= 90 ? '#1b5e20' : e.percentage >= 75 ? '#2e7d32' : e.percentage >= 60 ? '#f57c00' : e.percentage >= 45 ? '#e65100' : '#d32f2f');
        tr.innerHTML =
          '<td class="no-print"><input type="checkbox" class="row-check" data-table="table-evaluations"></td>' +
          '<td><b>' + e.empName + '</b></td>' +
          '<td>' + (e.empTitle || '—') + '</td>' +
          '<td>' + (e.empDept || '—') + '</td>' +
          '<td>' + (monthNames[parseInt(e.month)] || e.month) + ' ' + e.year + '</td>' +
          '<td style="font-size:12px;">' + displayScore + '</td>' +
          '<td style="font-size:12px;color:#d32f2f;">-' + dedStr + '</td>' +
          '<td style="font-size:12px;color:#2e7d32;">+' + bonusStr + '</td>' +
          '<td style="font-weight:700;color:' + adjColor + ';">' + displayAdj + '</td>' +
          '<td style="font-weight:700;color:' + grdColor + ';">' + (e.grade || '—') + '</td>' +
          '<td style="font-size:12px;max-width:120px;overflow:hidden;">' + (e.notes || '—') + '</td>' +
          '<td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteEvaluation(' + realIdx + ')">حذف</button></td>';
        tbody.appendChild(tr);
      });
    }

    function deleteEvaluation(idx) { if (!requireAdmin()) return;
      if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
      _logDeletion('evaluations', (evaluations[idx].empCode || evaluations[idx].employeeCode||'') + '|' + (evaluations[idx].date||'') + '|' + (evaluations[idx].month || evaluations[idx].type||'') + '|' + (evaluations[idx].year||''));
      evaluations.splice(idx, 1);
      syncStorage();
      renderEvaluations();
    }

    function exportEvaluationsToExcel() {
      if (!evaluations.length) return alert('لا توجد تقييمات للتصدير');
      var monthNames = ['', 'صيانة','المركبة','ونظافتها','الالتزام','بقواعد','المرور','الحفاظ','على','الوقود','التسليم','الآمن','فرد'];
      var data = evaluations.slice().sort(function(a,b){ return (b.year||'').localeCompare(a.year||'') || (String(b.month).padStart(2,'0')).localeCompare(String(a.month).padStart(2,'0')); }).map(function(e) {
        var isPr = e.deduction !== undefined;
        var kpiDetail = '';
        if (isPr && e.tasks) {
          kpiDetail = e.tasks.map(function(t) { return t.name + ': ' + t.score + '/' + t.max; }).join(' | ');
        }
        return {
          "تأمين": stripEmoji(e.empName),
          "الموقع الالتزام": stripEmoji(e.empTitle),
          "بالورديات": stripEmoji(e.empDept),
          "الإبلاغ": monthNames[parseInt(e.month)] || e.month,
          "عن": e.year,
          "المخالفات KPIs": (isPr ? e.totalScore : e.totalScore || '—') + ' / ' + (isPr ? e.maxScore : e.maxScore || '—'),
          "النظافة العامة": isPr ? (e.deduction || 0) : '—',
          "Bonus": isPr ? (e.bonus || 0) : '—',
          "التعامل الجيد": isPr ? e.adjustedScore : (e.percentage !== undefined ? e.percentage + '%' : '—'),
          "مع": stripEmoji(e.grade),
          "الزوار KPIs": kpiDetail,
          "أمين": e.notes || ''
        };
      });
      var ws = XLSX.utils.json_to_sheet(data);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقييم الموظفين');
      XLSX.writeFile(wb, 'تقييم_الموظفين_' + new Date().toLocaleDateString('ar-EG').replace(/\//g,'-') + '.xlsx');
    }

    function manageEvalTemplates() {
      var html = '<div style="font-size:14px;margin-bottom:15px;color:#880e4f;font-weight:700;">⚙️ إدارة مهام التقييم (KPIs) حسب المسمى الوظيفي</div>';
      html += '<div style="display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap;align-items:end;">';
      html += '<select id="mgt-title-select" style="flex:2;min-width:150px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;">';
      var sortedTitles = [].concat(dynamicTitles).sort();
      sortedTitles.forEach(function(t) {
        html += '<option value="' + t + '">' + t + '</option>';
      });
      html += '</select>';
      html += '<input type="text" id="mgt-new-task" placeholder="اسم المهمة" style="flex:2;min-width:120px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;">';
      html += '<input type="number" id="mgt-new-max" value="20" min="1" max="100" style="width:70px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;text-align:center;" title="الدرجة القصوى">';
      html += '<button class="btn btn-primary" style="background:#880e4f;" onclick="addEvalTask()">إضافة مهمة</button>';
      html += '</div>';
      html += '<div style="font-size:12px;color:#880e4f;margin-bottom:8px;">اختر المسمى الوظيفي لإدارة مهام التقييم الخاصة به</div>';
      html += '<div id="mgt-tasks-list" style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow:auto;"></div>';
      var modal = document.createElement('div');
      modal.className = 'modal open';
      modal.innerHTML = '<div class="modal-content" style="max-width:650px;border-top:5px solid #880e4f;max-height:80vh;display:flex;flex-direction:column;"><div class="modal-header"><h2 style="color:#880e4f;">⚙️ إدارة KPIs</h2><span class="close-btn" onclick="this.closest(\'.modal\').remove()">&times;</span></div><div style="flex:1;overflow:auto;padding:10px 0;">' + html + '</div></div>';
      document.body.appendChild(modal);
      showEvalTemplateTasks();
    }

    function showEvalTemplateTasks() {
      var sel = document.getElementById('mgt-title-select');
      var container = document.getElementById('mgt-tasks-list');
      if (!sel || !container) return;
      var title = sel.value;
      var tasks = evalTemplates[title] || [];
      if (!tasks.length) {
        container.innerHTML = '<div style="color:#888;font-size:13px;">لا توجد مهام تقييم لهذا المسمى الوظيفي — أضف مهاماً جديدة</div>';
        return;
      }
      var html = '';
      var totalWeight = 0;
      tasks.forEach(function(task, i) {
        var maxVal = task.max || 5;
        totalWeight += maxVal;
        var nameStr = typeof task === 'string' ? task : task.name;
        html += '<div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;padding:8px 12px;border-radius:8px;">';
        html += '<span style="flex:1;font-size:13px;">' + (i+1) + '. ' + nameStr + '</span>';
        html += '<span style="font-size:12px;font-weight:700;color:#880e4f;background:#fce4ec;padding:2px 10px;border-radius:12px;">' + maxVal + '</span>';
        html += '<button class="btn btn-warning" style="padding:2px 6px;font-size:10px;" onclick="editEvalTaskWeight(' + i + ')">⚖️</button>';
        html += '<button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="removeEvalTask(' + i + ')">حذف</button>';
        html += '</div>';
      });
      html += '<div style="font-size:12px;font-weight:700;color:' + (totalWeight === 100 ? '#2e7d32' : '#d32f2f') + ';padding:4px 12px;">العمل: ' + totalWeight + ' / 100</div>';
      container.innerHTML = html;
    }

    function editEvalTaskWeight(idx) {
      var sel = document.getElementById('mgt-title-select');
      if (!sel) return;
      var title = sel.value;
      var tasks = evalTemplates[title] || [];
      var t = tasks[idx];
      if (!t) return;
      var newMax = prompt('تعديل الوزن (أقصى درجة) لـ "' + (t.name || t) + '":', t.max || 5);
      if (newMax === null) return;
      newMax = parseFloat(newMax);
      if (isNaN(newMax) || newMax <= 0) return alert('الوزن يجب أن يكون رقمًا موجبًا');
      tasks[idx] = { name: t.name || t, max: newMax };
      syncStorage();
      showEvalTemplateTasks();
    }

    function addEvalTask() {
      var sel = document.getElementById('mgt-title-select');
      var input = document.getElementById('mgt-new-task');
      var maxInput = document.getElementById('mgt-new-max');
      if (!sel || !input) return;
      var title = sel.value;
      var task = input.value.trim();
      if (!task) return alert('من فضلك اكتب اسم المؤشر');
      var maxVal = maxInput ? parseFloat(maxInput.value) || 5 : 5;
      if (maxVal <= 0) return alert('الوزن يجب أن يكون رقمًا موجبًا');
      if (!evalTemplates[title]) evalTemplates[title] = [];
      var exists = evalTemplates[title].some(function(t) { return (t.name || t) === task; });
      if (exists) return alert('الالتزام بمواعيد العمل التعاون');
      evalTemplates[title].push({ name: task, max: maxVal });
      input.value = '';
      syncStorage();
      showEvalTemplateTasks();
    }

    function removeEvalTask(idx) {
      var sel = document.getElementById('mgt-title-select');
      if (!sel) return;
      var title = sel.value;
      if (!evalTemplates[title]) return;
      var t = evalTemplates[title][idx];
      var tName = t.name || t;
      if (!confirm('مع "' + tName + '" ?')) return;
      _logDeletion('evalTemplates', title + '|' + tName);
      evalTemplates[title].splice(idx, 1);
      if (!evalTemplates[title].length) delete evalTemplates[title];
      syncStorage();
      showEvalTemplateTasks();
    }

    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'mgt-title-select') showEvalTemplateTasks();
    });

    // Initialize the dashboard on page load
    if (document.getElementById('tab-dashboard')) {
      switchTab('tab-dashboard');
    } else {
      document.addEventListener('DOMContentLoaded', function() { switchTab('tab-dashboard'); });
    }

