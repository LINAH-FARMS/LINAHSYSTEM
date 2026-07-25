    // ØªØ­Ù…ÙŠÙ„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† IndexedDB (ØºÙŠØ± Ù…ØªØ²Ø§Ù…Ù†) - Ø¨Ø¯ÙŠÙ„ Ø¹Ù† localStorage
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
             console.log('ØªÙ… ØªØ­Ù…ÙŠÙ„ ' + waterDocs.length + ' Ù…Ø³ØªÙ†Ø¯ Ù…ÙŠØ§Ù‡ Ù…Ù† IndexedDB');
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
      // auto-prune: Ø§Ù…Ø³Ø­ Ø§Ù„Ù„ÙŠ Ø£Ù‚Ø¯Ù… Ù…Ù† Ø´Ù‡Ø± ÙƒÙ„ Ù…Ø§ ØªØ¯Ø®Ù„ Ø¬Ø¯ÙŠØ¯ Ø¹Ø´Ø§Ù† Ù…Ø§ ÙŠØªÙ…Ù„ÙŠØ´
      var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (auditLog.length > 0 && new Date(auditLog[0].time).getTime() < cutoff) {
        auditLog = auditLog.filter(function(e) { return new Date(e.time).getTime() > cutoff; });
      }
      _lsSet('linah_audit_log', JSON.stringify(auditLog));
    }
    normalizeBakeryDates();
    // Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø³Ø±Ù‘Ø© Ø¨ÙŠØ§Ù†Ø§Øª ØªØ±ØªÙŠØ¨ Ø§Ù„Ø®ÙŠØ§Ø±Ø§Øª Ø¨ÙŠØ§Ù†Ø§Øª ÙŠØ¬Ø¨
    if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
    if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
    if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });
    normalizeMealLogDates();

    setInterval(() => {
      const now = new Date();
      document.getElementById('live-clock').innerText = "Ø§Ù„Ø³Ø§Ø¹Ø©: " + now.toLocaleString('ar-EG');
    }, 1000);

    function sortEmployeesAlphabetically() {
      employees.sort((a, b) => (a.name || "").localeCompare(b.name || "ar"));
    }

    function rebuildAllDropdowns() {
      autoDiscoverDynamicData();
      var allGovs = defaultGovs.slice();
      employees.forEach(emp => {
        if (emp.dept && !dynamicDepts.includes(emp.dept.trim())) dynamicDepts.push(emp.dept.trim());
        if (emp.title && !dynamicTitles.includes(emp.title.trim())) dynamicTitles.push(emp.title.trim());
        if (emp.gov && !allGovs.includes(emp.gov.trim())) allGovs.push(emp.gov.trim());
      });
      // Remove invalid governorates and sort
      var validGovs = allGovs.filter(function(g) {
        var g2 = g.trim();
        return g2 && g2 !== 'Ø§Ù„ÙØ±Ø§ÙØ±Ø©' && g2 !== 'ÙØ±Ø§ÙØ±Ø©' && g2 !== 'Ø§Ù„ÙØ±Ø§ÙØ±Ù‡' && g2.length > 1;
      }).sort(function(a, b) { return a.localeCompare(b, 'ar'); });
      _lsSet('dyn_depts', JSON.stringify(dynamicDepts));
      _lsSet('dyn_titles', JSON.stringify(dynamicTitles));
      rebuildDeptTitles();

      fillSelectWithOptions('form-emp-dept', dynamicDepts, '-- Ø§Ø®ØªØ± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© --');
      fillSelectWithOptions('form-emp-gov', validGovs, '-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø© --');
      fillSelectWithOptions('form-emp-sector', dynamicSectors, '-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¨Ù†Ù‰ --');
      var secSel = document.getElementById('form-emp-sector');
      if (secSel) { secSel.onchange = updateEmpRoomBySector; }
      updateEmpRoomBySector();
      filterTitlesByDept();

      fillSelectWithOptions('inv-dept-select', dynamicDepts, '-- Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù… --');
      fillSelectWithOptions('septic-name-select', dynamicSeptics, '-- Ø§Ø®ØªØ± --');
      var sd = document.getElementById('septic-date');
      if (sd && !sd.value) sd.value = new Date().toISOString().split('T')[0];
      populateContractorSectorDropdown();
      fillSelectWithOptions('transfer-dept-select', dynamicDepts, '-- Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù… --');
      fillSelectWithOptions('transfer-title-select', dynamicTitles, '-- Ø§Ø®ØªØ± Ø§Ù„ÙˆØ¸ÙŠÙØ© --');
      fillSelectWithOptions('hosp-type', dynamicVisitorTypes, '');
      populateBctrDatalist();
      initEmployeeDatalists();
    }

    function populateVacationEmpSelect() {}

    function populateBctrDatalist() {
      var sel = document.getElementById('bctr-name');
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ --</option>' + bakeryContractorsNames.filter(function(n) { return typeof n === 'string' && n.trim(); }).map(function(n) { return '<option value="' + n.replace(/"/g,'&quot;') + '">' + n + '</option>'; }).join('');
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
        opt.value = ''; opt.textContent = '-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø£ÙˆÙ„Ø§Ù‹ --';
        roomSel.appendChild(opt);
        return;
      }
      let sectorRooms = roomsCapacity.filter(function(r) { return r.sector === sector; });
      if (sectorRooms.length === 0) {
        let opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù Ù…Ø³Ø¬Ù„Ø© ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù‚Ø·Ø§Ø¹';
        roomSel.appendChild(opt);
        return;
      }
      sectorRooms.forEach(function(r) {
        let opt = document.createElement('option');
        opt.value = r.number; opt.textContent = r.number;
        roomSel.appendChild(opt);
      });
      // Ø¥Ø¶Ø§ÙØ© Ø¯Ø±Ø¬Ø©
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
        balSpan.innerText = typeof emp.vacationBalance === 'number' ? 'Ø±ØµÙŠØ¯ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©: ' + emp.vacationBalance + ' ÙŠÙˆÙ…' : '';
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
      _lsSet('lineh_archive_data', JSON.stringify(archiveData));
      _lsSet('lineh_water_stations', JSON.stringify(waterStations));
      // waterDocs saved to IndexedDB only (large base64 files)
      _lsSet('lineh_quick_actions', JSON.stringify(quickActions));
      _lsSet('lineh_daily_stats', JSON.stringify(dailyStats));
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));
      _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
      _lsSet('_pulledAt', JSON.stringify(_pulledAt));
      try { _lsRemove('_storageTx'); } catch(e) {}
      calculateSystemStats();
      if (!noTimestamp) _lsSet('_localChangeTime', Date.now());
      setAction('Ø¨ÙŠØ§Ù†Ø§Øª ØªÙˆØ§Ø¬Ø¯');
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
            {v:pCount, color:'#2e7d32', label:'Ù…ØªÙˆØ§Ø¬Ø¯ P'},
            {v:vCount, color:'#ff9800', label:'Ø¥Ø¬Ø§Ø²Ø© V'}
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
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#2e7d32;"></span> Ù…ØªÙˆØ§Ø¬Ø¯ <b>${pCount}</b></span>
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#ff9800;"></span> Ø¥Ø¬Ø§Ø²Ø© <b>${vCount}</b></span>
            <span class="dash-legend-item"><span class="dash-legend-dot" style="background:#e8f5e9;"></span> Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ <b>${totalEmp}</b></span>
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
            <div class="dash-hbar-label"><span>${(s || 'Ø¨Ø¯ÙˆÙ† Ù‚Ø·Ø§Ø¹')} (${d.rooms} ØºØ±ÙØ©)</span><span>${occ}/${d.beds}</span></div>
            <div class="dash-hbar-track">
              <div class="dash-hbar-fill" style="width:${pct}%;background:${hColors[i%hColors.length]};"></div>
            </div>
          </div>`;
        }).join('') || '<div style="color:#90a4ae;font-size:12px;text-align:center;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù</div>';
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
        `).join('') || '<div style="color:#90a4ae;text-align:center;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¯Ø§Ø±Ø§Øª</div>';
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
          <div class="dash-summary-item c-green"><span class="s-icon">ðŸ“¦</span><span class="s-label">Ø£ØµÙ†Ø§Ù Ø§Ù„Ù…Ø®Ø²Ù†</span><span class="s-value">${invItems}</span></div>
          <div class="dash-summary-item c-blue"><span class="s-icon">ðŸ§¾</span><span class="s-label">Ø¨ÙˆÙ†Ø§Øª Ø§Ù„ØµØ±Ù</span><span class="s-value">${invVouchers}</span></div>
          <div class="dash-summary-item c-orange"><span class="s-icon">ðŸµ</span><span class="s-label">ØµØ±Ù Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±</span><span class="s-value">${tsCount}</span></div>
          <div class="dash-summary-item c-purple"><span class="s-icon">ðŸ“…</span><span class="s-label">Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª</span><span class="s-value">${vacCount}</span></div>
          <div class="dash-summary-item c-teal"><span class="s-icon">ðŸ”§</span><span class="s-label">ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø©</span><span class="s-value">${maintCount}</span></div>
          <div class="dash-summary-item c-red"><span class="s-icon">ðŸ›¡ï¸</span><span class="s-label">ØµÙŠØ§Ù†Ø© Ø¯ÙˆØ±ÙŠØ©</span><span class="s-value">${pmC}</span></div>
          <div class="dash-summary-item c-amber"><span class="s-icon">ðŸ›Žï¸</span><span class="s-label">Ø§Ù„Ø¶ÙŠØ§ÙØ©</span><span class="s-value">${hospCount}</span></div>
          <div class="dash-summary-item c-indigo"><span class="s-icon">ðŸš›</span><span class="s-label">Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª</span><span class="s-value">${septicC}</span></div>
          <div class="dash-summary-item c-green"><span class="s-icon">ðŸ½ï¸</span><span class="s-label">Ø§Ù„ÙˆØ¬Ø¨Ø§Øª</span><span class="s-value">${mealCount}</span></div>
          <div class="dash-summary-item c-blue"><span class="s-icon">ðŸš«</span><span class="s-label">Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†</span><span class="s-value">${exclCount}</span></div>
        `;
      }

      // ====== RECENT ACTIVITY ======
      if (g('dash-activity')) {
        var actItems = auditLog.slice(-15).reverse().map(function(e) {
          var dot = 'green';
          if (e.action === 'Ø­Ø°Ù' || e.action === 'Ø§Ø³ØªØ¨Ø¹Ø§Ø¯') dot = 'blue';
          if (e.action === 'Ù„Ø§' || e.action === 'ØªÙˆØ¬Ø¯') dot = 'red';
          var t = e.time ? new Date(e.time).toLocaleString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : '';
          return '<div class="activity-item"><span class="activity-dot ' + dot + '"></span><span><b>' + e.user + '</b> â€” ' + (e.targetName ? e.targetName + ' | ' : '') + (e.details || e.action) + '</span><span style="font-size:9px;color:#90a4ae;margin-right:auto;">' + t + '</span></div>';
        });
        g('dash-activity').innerHTML = actItems.length ? actItems.join('') : '<div style="text-align:center;color:#90a4ae;padding:10px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ø´Ø§Ø·Ø§Øª</div>';
      }

      // ====== CONTRACT TYPE DISTRIBUTION CHART ======
      if (g('dash-contract-chart') && totalEmp > 0) {
        let canvas = g('dash-contract-chart'), ctx = canvas.getContext('2d');
        let cx=75, cy=75, r=55, lw=22;
        ctx.clearRect(0,0,150,150);
        let daim = employees.filter(e => e.contract === 'Ø¯Ø§Ø¦Ù…').length;
        let kagol = employees.filter(e => e.contract === 'ÙƒØ§Ø¬ÙˆÙ„').length;
        let other = totalEmp - daim - kagol;
        let slices = [];
        if (daim > 0) slices.push({v:daim, color:'#1565c0', label:'Ø¯Ø§Ø¦Ù…'});
        if (kagol > 0) slices.push({v:kagol, color:'#ff9800', label:'ÙƒØ§Ø¬ÙˆÙ„'});
        if (other > 0) slices.push({v:other, color:'#78909c', label:'Ø£Ø®Ø±Ù‰'});
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
        let gBf = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('Ø¥ÙØ·Ø§Ø±')) ? (h.guests || 1) : 0), 0);
        let gLh = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('ØºØ¯Ø§Ø¡')) ? (h.guests || 1) : 0), 0);
        let gDn = todayGuests.reduce((s, h) => s + ((h.meals && h.meals.includes('Ø¹Ø´Ø§Ø¡')) ? (h.guests || 1) : 0), 0);
        let totalMeals = (pCount + gBf) + (pCount + gLh) + (pCount + gDn);
        if (g('dash-bakery-meals-badge')) g('dash-bakery-meals-badge').innerText = totalBread + totalMeals;
        if (g('dash-today-bread')) g('dash-today-bread').innerText = totalBread;
        if (g('dash-today-bf')) g('dash-today-bf').innerText = pCount + gBf;
        if (g('dash-today-lh')) g('dash-today-lh').innerText = pCount + gLh;
        if (g('dash-today-dn')) g('dash-today-dn').innerText = pCount + gDn;
        if (g('dash-today-date')) g('dash-today-date').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª ' + new Date().toLocaleDateString('ar-EG');
        if (g('dash-today-total')) g('dash-today-total').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª ' + totalBread + ' ÙˆØ¬Ø¨Ø© | Ø¨ÙŠØ§Ù†Ø§Øª ' + totalMeals + ' ØºÙŠØ±';
      }

      // ====== GOVERNORATE DISTRIBUTION ======
      if (g('dash-gov-bars')) {
        let govMap = {};
        employees.forEach(e => { let g = e.gov || 'Ù…Ø­Ø¯Ø¯ Ø§Ù„Ø¯ÙˆØ±Ø©'; govMap[g] = (govMap[g] || 0) + 1; });
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
        let periods = ['Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (1-7)', 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© (15-21)'];
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
                <span>â˜• Ø´Ø§ÙŠ: <b>${Math.max(0,s.remainingTea)}</b>/${s.totalTeaGiven}</span>
                <span>ðŸš Ø³ÙƒØ±: <b>${Math.max(0,s.remainingSugar)}</b>/${s.totalSugarGiven}</span>
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
          html = '<div style="text-align:center;color:#aaa;padding:20px;font-size:13px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙØ¹Ø§Øª ØªÙ…ÙˆÙŠÙ† Ù…Ø³Ø¬Ù„Ø©<br><span style="font-size:11px;">Ø³Ø¬Ù„ Ø¯ÙØ¹Ø© ÙÙŠ ØªØ¨ÙˆÙŠØ¨ Ø§Ù„ØµØ±Ù</span></div>';
          if (g('dash-ts-stock-badge')) g('dash-ts-stock-badge').innerText = '0';
        } else {
          let totalTeaPct = allGiven.tea > 0 ? Math.round(allUsed.tea/allGiven.tea*100) : 0;
          let totalSugarPct = allGiven.sugar > 0 ? Math.round(allUsed.sugar/allGiven.sugar*100) : 0;
          let totalRemaining = (allGiven.tea - allUsed.tea) + (allGiven.sugar - allUsed.sugar);
          html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div style="background:#fff3e0;padding:8px;border-radius:6px;text-align:center;">
              <div style="font-size:10px;color:#888;">Ø§Ù„Ø´Ø§ÙŠ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</div>
              <div style="font-size:18px;font-weight:700;color:#e65100;">${Math.max(0,allGiven.tea-allUsed.tea)}</div>
            </div>
            <div style="background:#e8f5e9;padding:8px;border-radius:6px;text-align:center;">
              <div style="font-size:10px;color:#888;">Ø¨ÙŠØ§Ù†Ø§Øª Ø´Ø§ÙŠ Ù…ØªØ¨Ù‚ÙŠ</div>
              <div style="font-size:18px;font-weight:700;color:#2e7d32;">${Math.max(0,allGiven.sugar-allUsed.sugar)}</div>
            </div>
          </div>` + html;
          if (g('dash-ts-stock-badge')) g('dash-ts-stock-badge').innerText = Math.max(0, allGiven.tea - allUsed.tea);
        }
        g('dash-ts-stock-content').innerHTML = html;
      }
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
      document.getElementById('qa-icon-input').value = 'âš¡';
      document.getElementById('qa-label-input').value = '';
      document.getElementById('qa-action-input').value = '';
      renderQAList();
      openModal('modal-quick-actions');
    }
    function renderQAList() {
      var list = document.getElementById('qa-list');
      list.innerHTML = quickActions.map(function(qa, i) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid #eee;"><span>' + qa.icon + ' <b>' + qa.label + '</b> <small style="color:#888;">' + qa.action + '</small></span><span><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:1px 6px;font-size:11px;margin-left:4px;" onclick="editQuickAction(' + i + ')">âœï¸</button><button class="btn btn-sm" style="background:#d32f2f;color:#fff;padding:1px 6px;font-size:11px;" onclick="deleteQuickAction(' + i + ')">âœ•</button></span></div>';
      }).join('') || '<div style="color:#999;text-align:center;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø³Ø±ÙŠØ¹Ø©</div>';
    }
    function saveQuickAction() {
      var icon = document.getElementById('qa-icon-input').value.trim() || 'âš¡';
      var label = document.getElementById('qa-label-input').value.trim();
      var action = document.getElementById('qa-action-input').value.trim();
      if (!label) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡');
      if (!action) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø£Ù…Ø± (JavaScript)');
      if (_qaEditIdx >= 0) {
        quickActions[_qaEditIdx] = { icon: icon, label: label, action: action };
        _qaEditIdx = -1;
      } else {
        quickActions.push({ icon: icon, label: label, action: action });
      }
      syncStorage();
      renderQuickActions();
      renderQAList();
      document.getElementById('qa-icon-input').value = 'Ø¨ÙŠØ§Ù†Ø§Øª'; document.getElementById('qa-label-input').value = ''; document.getElementById('qa-action-input').value = '';
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
      if (!from || !to) return alert('âš ï¸ Ø§Ø®ØªØ± ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© ÙˆØ§Ù„Ù†Ù‡Ø§ÙŠØ©');
      if (from > to) return alert('âš ï¸ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø£ÙƒØ¨Ø± Ù…Ù† ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©');
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
      sel.innerHTML = '<option value="">ÙƒÙ„ Ø§Ù„Ø£Ù†ÙˆØ§Ø¹</option>' + Object.keys(types).sort().map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ ØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ø¨Ø­Ø«</td></tr>';
        return;
      }
      var st = sortState['table-audit-log'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      else filtered = sortNewestFirst(filtered, 'time');
      filtered.forEach(function(e) {
        var actionLabels = { add:'ØªÙˆØ¬Ø¯', edit:'Ù†ØªØ§Ø¦Ø¬', delete:'ØªØ·Ø§Ø¨Ù‚' };
        var actionColors = { add:'#2e7d32', edit:'#1565c0', delete:'#d32f2f' };
        var d = new Date(e.time);
        var timeStr = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
        var tr = document.createElement('tr');
        tr.innerHTML = '<td style="white-space:nowrap;font-size:11px;">' + timeStr + '</td><td><b>' + (e.user||'') + '</b></td><td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:white;background:' + (actionColors[e.action]||'#888') + ';">' + (actionLabels[e.action]||e.action) + '</span></td><td>' + (e.targetType||'') + '</td><td>' + (e.targetName||'') + '</td><td style="font-size:11px;color:#555;">' + (e.details||'') + '</td>';
        tbody.appendChild(tr);
      });
    }
    function exportAuditLog() {
      if (!auditLog.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±');
      var rows = [['Ø­Ø°Ù Ù„Ø§', 'ØªÙˆØ¬Ø¯', 'Ø³Ø¬Ù„Ø§Øª', 'Ù„Ù„ØªØµØ¯ÙŠØ± Ø§Ù„ØªØ§Ø±ÙŠØ®', 'ÙˆØ§Ù„ÙˆÙ‚Øª', 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…']];
      var labels = { add:'Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡', edit:'Ù†ÙˆØ¹', delete:'Ø§Ù„ÙƒÙŠØ§Ù†' };
      auditLog.forEach(function(e) {
        var d = new Date(e.time);
        var timeStr = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
        rows.push([timeStr, e.user || '', labels[e.action] || e.action, e.targetType || '', e.targetName || '', e.details || '']);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø§Ø³Ù… ØªÙØ§ØµÙŠÙ„');
      XLSX.writeFile(wb, 'Ø¥Ø¶Ø§ÙØ©_ØªØ¹Ø¯ÙŠÙ„_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
    function renderFinanceTab() {
      if (typeof finRenderAll === 'function') {
        try { finRenderAll(); } catch(e) { console.error('Finance error:', e); }
      } else {
        var el = document.getElementById('fin-stats');
        if (el) el.innerHTML = '<div style="padding:20px;color:red;text-align:center;">finance.js Ù„Ù… ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„</div>';
      }
    }

    // ==================== Ø³Ø¬Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª ====================
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
            console.log('âœ… ØªÙ… Ø±ÙØ¹ ' + added + ' Ø¨Ù„Ø§Øº Ù…Ø­Ù„ÙŠ');
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

        _reportsHeaders = ['Ø§Ù„Ø§Ø³Ù…', 'Ø§Ù„ÙƒÙˆØ¯', 'Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†', 'Ø§Ù„Ù‚Ø³Ù…', 'Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„', 'ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„', 'Ø§Ù„Ù…ÙˆÙ‚Ø¹', 'Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©', 'Ø§Ù„Ø­Ø§Ù„Ø©', 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº', 'ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚'];
        _reportsData = reports.map(function(r) {
          return {
            _row: r.id || Date.now(),
            'Ø§Ù„Ø§Ø³Ù…': r.name || '',
            'Ø§Ù„ÙƒÙˆØ¯': r.code || '',
            'Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†': r.phone || '',
            'Ø§Ù„Ù‚Ø³Ù…': r.dept || '',
            'Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„': r.type || '',
            'ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„': r.desc || r.description || '',
            'Ø§Ù„Ù…ÙˆÙ‚Ø¹': r.location || '',
            'Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©': r.priority || '',
            'Ø§Ù„Ø­Ø§Ù„Ø©': r.status || 'Ø¬Ø¯ÙŠØ¯',
            'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº': r.opened_at || r.date || r.created_at || '',
            'ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚': r.closed_at || ''
          };
        }).reverse();
        renderReportsTable(_reportsData);
        updateReportsStats(_reportsData);
      })
      .catch(function(err) {
        var local = JSON.parse(_lsGet('linah_reports') || '[]');
        _reportsHeaders = ['Ø§Ù„Ø§Ø³Ù…', 'Ø§Ù„ÙƒÙˆØ¯', 'Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†', 'Ø§Ù„Ù‚Ø³Ù…', 'Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„', 'ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„', 'Ø§Ù„Ù…ÙˆÙ‚Ø¹', 'Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©', 'Ø§Ù„Ø­Ø§Ù„Ø©', 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº', 'ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚'];
        _reportsData = local.map(function(r) {
          return {
            _row: r.id || Date.now(),
            'Ø§Ù„Ø§Ø³Ù…': r.name || '',
            'Ø§Ù„ÙƒÙˆØ¯': r.code || '',
            'Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†': r.phone || '',
            'Ø§Ù„Ù‚Ø³Ù…': r.dept || '',
            'Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„': r.type || '',
            'ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„': r.desc || r.description || '',
            'Ø§Ù„Ù…ÙˆÙ‚Ø¹': r.location || '',
            'Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©': r.priority || '',
            'Ø§Ù„Ø­Ø§Ù„Ø©': r.status || 'Ø¬Ø¯ÙŠØ¯',
            'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº': r.opened_at || r.date || r.created_at || '',
            'ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚': r.closed_at || ''
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
      var colCode = _findReportCol(headers, ['Ø§Ù„ÙƒÙˆØ¯', 'ÙƒÙˆØ¯', 'code']);
      var colDept = _findReportCol(headers, ['Ø§Ù„Ù‚Ø³Ù…', 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©', 'dept']);
      var colType = _findReportCol(headers, ['Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„', 'Ù†ÙˆØ¹', 'type']);
      var colDesc = _findReportCol(headers, ['ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„', 'ÙˆØµÙ', 'ØªÙØ§ØµÙŠÙ„', 'desc']);
      var colLocation = _findReportCol(headers, ['Ø§Ù„Ù…ÙˆÙ‚Ø¹', 'Ù…ÙƒØ§Ù†', 'location']);
      var colStatus = _findReportCol(headers, ['Ø§Ù„Ø­Ø§Ù„Ø©', 'status']);
      var colName = _findReportCol(headers, ['Ø§Ù„Ø§Ø³Ù…', 'Ø§Ø³Ù…', 'name']);
      var colPhone = _findReportCol(headers, ['Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†', 'ØªÙ„ÙŠÙÙˆÙ†', 'Ø±Ù‚Ù…', 'phone']);
      var colPriority = _findReportCol(headers, ['Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©', 'priorit', 'priority']);
      var colDate = _findReportCol(headers, ['ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº', 'ØªØ§Ø±ÙŠØ®', 'date']);
      var colNotes = _findReportCol(headers, ['Ù…Ù„Ø§Ø­Ø¸Ø§Øª', 'notes', 'ÙˆÙ‚Øª']);

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
      if (colDate) displayCols.push({ key: colDate, label: 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª', w: '140px' });

      var otherCols = headers.filter(function(h) {
        return h && h !== '_row' && h.indexOf('Timestamp') === -1 &&
          displayCols.every(function(c) { return c.key !== h; });
      });
      otherCols.forEach(function(h) { displayCols.push({ key: h, label: h, w: '120px' }); });

      displayCols.push({ key: '_actions', label: 'Ø¬Ø¯ÙŠØ¯', w: '100px', isAction: true });

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
                '<option value="Ø¬Ø¯ÙŠØ¯"' + ((r[colStatus] || '') === 'Ø¬Ø¯ÙŠØ¯' ? ' selected' : '') + '>Ø¬Ø¯ÙŠØ¯</option>' +
                '<option value="Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°"' + ((r[colStatus] || '') === 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°' ? ' selected' : '') + '>Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°</option>' +
                '<option value="Ù…ØºÙ„Ù‚"' + ((r[colStatus] || '') === 'Ù…ØºÙ„Ù‚' ? ' selected' : '') + '>Ù…ØºÙ„Ù‚</option>' +
                '</select> ';
            }
            actions += '<button onclick="deleteReport(' + i + ')" style="background:#c62828;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:Cairo,sans-serif;" title="Ø§Ù„Ø¨Ù„Ø§Øº Ø¹Ø¬Ù„">Ø¹Ø§Ù„ÙŠ</button>';
            html += '<td class="no-print">' + actions + '</td>';
          } else {
            var val = r[c.key] || '';
            var style = '';
            if (c.key === colPriority) {
              if (val.indexOf('Ù…ØªÙˆØ³Ø·') !== -1 || val.indexOf('Ù…Ù†Ø®ÙØ¶') !== -1) style = 'color:#c62828;font-weight:700;';
              else if (val.indexOf('Ø¹Ø§Ø¯ÙŠ') !== -1) style = 'color:#f57f17;font-weight:700;';
              else if (val.indexOf('Ù…ØºÙ„Ù‚') !== -1 || val.indexOf('Ù‚ÙŠØ¯') !== -1) style = 'color:#2e7d32;font-weight:700;';
            }
            if (c.key === colStatus) {
              if (val === 'Ù…ØºÙ„Ù‚') style = 'color:#2e7d32;font-weight:700;';
              else if (val === 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°') style = 'color:#f57f17;font-weight:700;';
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
      var colType = _findReportCol(headers, ['Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„', 'Ù†ÙˆØ¹', 'type']);
      var colStatus = _findReportCol(headers, ['Ø§Ù„Ø­Ø§Ù„Ø©', 'status']);
      var colPriority = _findReportCol(headers, ['Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©', 'priorit', 'priority']);

      reports.forEach(function(r) {
        var p = colPriority ? (r[colPriority] || '') : '';
        var s = colStatus ? (r[colStatus] || 'Ø¬Ø¯ÙŠØ¯') : 'Ø¹Ø¬Ù„';
        if (p.indexOf('Ø¹Ø§Ù„ÙŠ') !== -1 || p.indexOf('Ù‚ÙŠØ¯') !== -1) urgent++;
        if (s === 'Ø§Ù„ØªÙ†ÙÙŠØ° Ù…ØºÙ„Ù‚') pending++;
        if (s === 'Ø¬Ø¯ÙŠØ¯') closed++;
        if (s === 'Ø§Ù„Ø¯Ø±Ø¬Ø©' || s === '') newCount++;
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
      var colType = _findReportCol(_reportsHeaders, ['Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„', 'Ù†ÙˆØ¹', 'type']);
      var colStatus = _findReportCol(_reportsHeaders, ['Ø§Ù„Ø­Ø§Ù„Ø©', 'status']);
      var colPriority = _findReportCol(_reportsHeaders, ['Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©', 'priorit', 'priority']);
      var filtered = _reportsData.filter(function(r) {
        var vals = Object.values(r).join(' ').toLowerCase();
        if (search && vals.indexOf(search) === -1) return false;
        if (typeFilter && colType && (r[colType] || '').indexOf(typeFilter) === -1) return false;
        if (priorityFilter && colPriority) {
          var p = r[colPriority] || '';
          if (priorityFilter === 'Ø¹Ø§Ø¬Ù„' && p.indexOf('Ø¹Ø¬Ù„') === -1 && p.indexOf('Ø¹Ø§Ù„ÙŠ') === -1) return false;
          if (priorityFilter === 'Ù…ØªÙˆØ³Ø·' && p.indexOf('Ù…ØªÙˆØ³Ø·') === -1) return false;
          if (priorityFilter === 'Ù…Ù†Ø®ÙØ¶' && p.indexOf('Ù…Ù†Ø®ÙØ¶') === -1 && p.indexOf('Ø¹Ø§Ø¯ÙŠ') === -1) return false;
        }
        if (statusFilter && colStatus && (r[colStatus] || 'Ø¬Ø¯ÙŠØ¯') !== statusFilter) return false;
        return true;
      });
      renderReportsTable(filtered);
    }

    function updateReportStatusFromList(index, newStatus) {
      var report = _reportsData[index];
      if (!report) return;
      report['Ø§Ù„Ø­Ø§Ù„Ø©'] = newStatus;
      if (newStatus === 'Ù…ØºÙ„Ù‚') {
        var now = new Date();
        report['ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚'] = now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2) + ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2);
      }
      var local = JSON.parse(_lsGet('linah_reports') || '[]');
      for (var i = 0; i < local.length; i++) {
        if ((local[i].id || i) == report._row) {
          local[i].status = newStatus;
          if (newStatus === 'Ù…ØºÙ„Ù‚') local[i].closed_at = report['ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚'];
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
              if (newStatus === 'Ù…ØºÙ„Ù‚') reports[j].closed_at = report['ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚'];
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
      logAction('Ø®ØµÙ…', 'Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ù†Ø©', report['Ø§Ù„Ø´Ù‡Ø± Ø¨Ù„Ø§Øº'] || '', 'Ø­Ø§Ù„Ø© ' + newStatus);
      if (newStatus === 'ØªØ¹Ø¯ÙŠÙ„') {
          try {
            fetch('http://localhost:3456/send-resolution', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                id: report._row,
                phone: report['Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†'],
                name: report['Ø§Ù„Ø§Ø³Ù…'],
                type: report['Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„'],
                desc: report['ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„'],
                opened_at: report['ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø¨Ù„Ø§Øº'],
                closed_at: report['ÙˆÙ‚Øª Ø§Ù„Ø§ØºÙ„Ø§Ù‚']
              })
            }).catch(function(){});
          } catch(e) {}
      }
    }

    function deleteReport(index) {
      var report = _reportsData[index];
      if (!report) return;
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ø§Ù„ØªÙ‚Ø±ÙŠØ± "' + (report['Ø§Ù„Ø§Ø³Ù…'] || '') + '"ØŸ')) return;

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
      logAction('Ø­Ø°Ù', 'Ø¨Ù„Ø§Øº Ø£Ø¹Ø·Ø§Ù„', report['Ø§Ø³Ù… Ø§Ù„Ø¹Ø§Ù…Ù„'] || '', '');
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
        alert('Ø§Ù„Ø§ØªØµØ§Ù„ Ù†Ø§Ø¬Ø­! Ø¹Ø¯Ø¯ Ø§Ù„Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©: ' + count);
      })
      .catch(function(e) { alert('ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„: ' + e.message); });
    }

    function exportReportsToExcel() {
      if (!_reportsData.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ù„Ø§ØºØ§Øª Ù„Ù„ØªØµØ¯ÙŠØ±');
      var wb = XLSX.utils.book_new();
      var headers = _reportsHeaders.filter(function(h) { return h && h !== '_row' && h.indexOf('Timestamp') === -1; });
      var rows = [headers.concat(['Ù„Ù„ØªØµØ¯ÙŠØ± Ø­Ø§Ù„Ø© (Ø§Ù„Ø¨Ù„Ø§Øº ØªØ­Ø¯ÙŠØ«)'])];
      _reportsData.forEach(function(r) {
        var row = headers.map(function(h) { return r[h] || ''; });
        row.push('');
        rows.push(row);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = headers.map(function() { return { wch: 18 }; });
      ws['!cols'].push({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, 'Ù…Ø­Ù„ÙŠ Ø¨Ù„Ø§ØºØ§Øª');
      var today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, 'Ø§Ù„Ø£Ø¹Ø·Ø§Ù„_Ø¨Ù„Ø§ØºØ§Øª_' + today.replace(/-/g, '') + '.xlsx');
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
        { id: 'qrr-reports', urlId: 'qrr-url-reports', url: 'https://linah-farms.github.io/LINAHSYSTEM/report.html', color: '1b5e20', label: 'ðŸš¨ Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„Ø£Ø¹Ø·Ø§Ù„' },
        { id: 'qrr-bakery', urlId: 'qrr-url-bakery', url: 'https://linah-farms.github.io/LINAHSYSTEM/bakery-report.html', color: 'e65100', label: 'ðŸž Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø®Ø¨Ø²' },
        { id: 'qrr-daily', urlId: 'qrr-url-daily', url: 'https://linah-farms.github.io/LINAHSYSTEM/daily-data.html', color: '6a1b9a', label: 'ðŸ“‹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ©' },
        { id: 'qrr-survey', urlId: 'qrr-url-survey', url: 'https://linah-farms.github.io/LINAHSYSTEM/meal-survey-form.html', color: 'f57c00', label: 'ðŸ“ Ø§Ø³ØªØ¨ÙŠØ§Ù† Ø§Ù„ÙˆØ¬Ø¨Ø§Øª' },
        { id: 'qrr-waste', urlId: 'qrr-url-waste', url: 'https://linah-farms.github.io/LINAHSYSTEM/meal-waste-form.html', color: 'c62828', label: 'ðŸ—‘ï¸ Ø³Ø¬Ù„ Ù‡Ø¯Ø± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª' }
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
      var tabNames = { 'tab-dashboard':'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©','tab-employees':'Ø§Ù„Ù‚ÙˆØ©','tab-housing':'Ø§Ù„Ø³ÙƒÙ†','tab-inventory':'Ø§Ù„Ù…Ø®Ø²Ù†','tab-vacations':'Ø¥Ø¬Ø§Ø²Ø§Øª ÙˆØ¥Ø¶Ø§ÙÙŠ Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©','tab-hospitality':'Ø§Ù„Ø¶ÙŠØ§ÙØ©','tab-maintenance':'Ø§Ù„ØµÙŠØ§Ù†Ø©','tab-septic':'Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª','tab-dynamic':'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø±Ù†Ø©','tab-excluded':'Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†','tab-periodic-maint':'Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©','tab-tea-sugar':'Ø´Ø§ÙŠ ÙˆØ³ÙƒØ±','tab-meal-log':'Ø§Ù„ÙˆØ¬Ø¨Ø§Øª','tab-contractors':'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†','tab-bakery':'Ø§Ù„Ù…Ø®Ø¨Ø²','tab-bread-supply':'ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²','tab-evaluations':'Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª','tab-audit':'Ø³Ø¬Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª','tab-finance':'Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ù…Ø§Ù„ÙŠ ÙˆØ§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ©','tab-reports':'Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„Ø£Ø¹Ø·Ø§Ù„','tab-data-exchange':'ØªØ¨Ø§Ø¯Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª','tab-water-stations':'Ù…Ø­Ø·Ø§Øª Ø§Ù„Ù…ÙŠØ§Ù‡' };
      setAction('Ø£Ù†Øª ÙÙŠ ØªØ¨ÙˆÙŠØ¨: ' + (tabNames[tabId] || tabId));
      try { if(tabId === 'tab-dashboard') { renderDashboard(); renderQuickActions(); } } catch(e) { console.error('tab-dashboard error:', e); }
      try { if(tabId === 'tab-housing') { if(!roomsCapacity.length) rebuildRoomsFromEmployees(); renderHousingLayout(); updateHousingStats(); } } catch(e) { console.error('tab-housing error:', e); }
      try { if(tabId === 'tab-dynamic') { renderDynamicLists(); } } catch(e) { console.error('tab-dynamic error:', e); }
      try { if(tabId === 'tab-excluded') { renderExcludedTable(); } } catch(e) { console.error('tab-excluded error:', e); }
      try { if(tabId === 'tab-inventory') { renderInventoryItems(); renderArchiveTable(); } } catch(e) { console.error('tab-inventory error:', e); }
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
      document.title = `ÙÙŠ Ø¬Ø¯Ø§ÙˆÙ„ - ${tabName}`;
      setTimeout(() => { window.print(); document.title = originalTitle; }, 100);
    }

    function exportPdfActiveTab() {
      let activeTab = document.querySelector('.tab-content.active');
      if(!activeTab) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªØ¨ÙˆÙŠØ¨ Ù†Ø´Ø· Ù„Ù„ØªØµØ¯ÙŠØ±.'); return; }
      let tabId = activeTab.id;
      let tabName = document.querySelector(`.tab-btn.active`)?.innerText?.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,'').trim() || tabId;
      let tables = activeTab.querySelectorAll('table');
      if(!tables.length) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¬Ø¯ÙˆÙ„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ØªØ¨ÙˆÙŠØ¨ Ù„Ù„ØªØµØ¯ÙŠØ±.'); return; }
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
      html += '<div><h2>Ù‡Ø°Ø§ Ø§Ù„ØªØ¨ÙˆÙŠØ¨</h2><div class="sub">' + tabName + '</div></div>';
      html += '<div style="font-size:14px;color:#555;">Ù„Ù„ØªØµØ¯ÙŠØ± ÙŠÙˆÙ„ÙŠÙˆ: ' + dateStr + '</div>';
      html += '</div>';
      html += '<div class="info-line"><span><b>Ø§Ù„ØªØ­ÙˆÙŠÙ„:</b> ' + tabName + '</span><span><b>ÙØ§Ø±Ù…Ø² Ù„ÙŠÙ†Ù‡:</b> ' + dateStr + '</span></div>';
      for (var ti = 0; ti < tables.length; ti++) {
        var tbl = tables[ti].cloneNode(true);
        tbl.querySelectorAll('th.no-print, td.no-print').forEach(function(c) { c.remove(); });
        tbl.querySelectorAll('th:empty, td:empty').forEach(function(c) { c.remove(); });
        html += tbl.outerHTML;
      }
      html += '<div class="footer">ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ' + dateStr + ' â€” ØªÙ… Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙˆØ§Ø³Ø·Ø© Ù…Ù†Ø¸ÙˆÙ…Ø© Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²</div>';
      html += '</body></html>';
      var w = window.open('', '_blank');
      w.document.write(html);
      setTimeout(function() { w.print(); }, 800);
    }

    function addDynamicDept() {
      let deptName = document.getElementById('new-dept').value.trim();
      if(!deptName) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.");
      if(dynamicDepts.includes(deptName)) return alert("Ù‡Ø°Ù‡ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.");
      dynamicDepts.push(deptName);
      document.getElementById('new-dept').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function addDynamicVisitorType() {
      let val = document.getElementById('new-visitor-type').value.trim();
      if(!val) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ØªØµÙ†ÙŠÙ Ø§Ù„Ø²Ø§Ø¦Ø±.");
      if(dynamicVisitorTypes.includes(val)) return alert("Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.");
      dynamicVisitorTypes.push(val);
      document.getElementById('new-visitor-type').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addBakeryContractorName() {
      let val = document.getElementById('new-bakery-ctr').value.trim();
      if(!val) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„.");
      if(bakeryContractorsNames.includes(val)) return alert("Ù‡Ø°Ø§ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.");
      bakeryContractorsNames.push(val);
      document.getElementById('new-bakery-ctr').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
      populateBctrDatalist();
    }
    function fixBakeryContractors() {
      var _o = ["Ù…Ø­Ù…Ø¯ Ø´Ø¹Ø¨Ø§Ù†","Ù…Ù…Ø¯ÙˆØ­ Ø¨ÙƒØ±","Ø¹Ø§Ø·Ù Ø¹Ø¨Ø¯ Ø§Ù„Ù…ØºÙŠØ«","Ù…ØµØ·ÙÙ‰ Ø¹Ù„Ù‰","Ø§Ø³Ø§Ù…Ù‡ Ø³Ù…ÙŠØ±","ÙØ§Ø±Ø³ Ù…Ø­Ù…Ø¯"];
      bakeryContractorsNames = _o.slice();
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
      populateBctrDatalist();
      alert("ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ø¥Ù„Ù‰ Ø§Ù„Ù€ 6 Ø§Ù„Ø£Ø³Ø§Ø³ÙŠÙŠÙ†.");
    }
    function syncBakeryContractorsToSupabase() {
      var raw = { id: 'alldata' };
      raw.bakeryContractorsNames = bakeryContractorsNames;
      raw.userId = currentUser;
      raw.timestamp = new Date().toISOString();
      fetch(SB + '/rest/v1/sync_data?id=eq.alldata', {
        method: 'PUT',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'alldata', data: raw })
      }).then(function(r) {
        if (r.ok) alert("âœ… ØªÙ… Ù…Ø²Ø§Ù…Ù†Ø© Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ù…Ø¹ Supabase Ø¨Ù†Ø¬Ø§Ø­!");
        else alert("âŒ ÙØ´Ù„Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©: " + r.status);
      }).catch(function(e) { alert("âŒ Ø®Ø·Ø£: " + e.message); });
    }
    function addDynamicTitle() {
      let titleName = document.getElementById('new-title').value.trim();
      if(!titleName) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ.");
      if(dynamicTitles.includes(titleName)) return alert("Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ù…Ù‰ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.");
      dynamicTitles.push(titleName);
      document.getElementById('new-title').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function addDeptTitle() {
      let dept = document.getElementById('dept-title-dept-select').value;
      let titleName = document.getElementById('new-dept-title').value.trim();
      if(!dept) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø£ÙˆÙ„Ø§Ù‹.");
      if(!titleName) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ.");
      if (!deptTitles[dept]) deptTitles[dept] = [];
      if (deptTitles[dept].includes(titleName)) return alert("Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ù…Ù‰ Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ÙØ¹Ù„ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.");
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
      if (!depts.length) { container.innerHTML = '<div style="color:#999;padding:4px;">â€” Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±ÙˆØ§Ø¨Ø· Ù…Ø³Ø¬Ù„Ø© â€”</div>'; return; }
      depts.forEach(dept => {
        let titles = deptTitles[dept] || [];
        let block = document.createElement('div');
        block.style.cssText = 'border:1px solid #e0e0e0;border-radius:6px;padding:8px;margin-bottom:6px;';
        let titleHtml = '';
        titles.forEach(t => {
          let sanitizedDept = dept.replace(/'/g, "\\'");
          let sanitizedTitle = t.replace(/'/g, "\\'");
          titleHtml += `<span style="background:#f3e5f5;padding:2px 8px;border-radius:4px;font-size:11px;display:inline-flex;align-items:center;gap:4px;margin:2px;">
            ${t} <span style="cursor:pointer;color:#c62828;" onclick="removeDeptTitle('${sanitizedDept}','${sanitizedTitle}')" title="Ø­Ø°Ù">âœ•</span></span>`;
        });
        block.innerHTML = `<div style="font-weight:700;color:#6a1b9a;margin-bottom:4px;">ðŸ¢ ${dept}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${titleHtml}</div>`;
        container.appendChild(block);
      });
    }

    function removeDeptTitle(dept, title) {
      if (!confirm(`Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù "${title}" Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© "${dept}"ØŸ`)) return;
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
        div.innerHTML = "Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ù…ÙˆØ¸Ù Ø¨Ø¹Ø¯.";
        return;
      }
      let emp = findEmpByInput(q);
      if(emp) {
        div.innerHTML = `Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©: <span style="color:blue;">[ ${emp.dept || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©'} ]</span> | Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„Ø­Ø§Ù„ÙŠ: <span style="color:purple;">[ ${emp.title || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'} ]</span>`;
        document.getElementById('transfer-dept-select').value = dynamicDepts.includes(emp.dept) ? emp.dept : dynamicDepts[0];
        document.getElementById('transfer-title-select').value = dynamicTitles.includes(emp.title) ? emp.title : dynamicTitles[0];
      }
    }

    function executeEmployeeTransfer() {
      let q = document.getElementById('transfer-emp-search').value.trim();
      if(!q) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù…ÙˆØ¸Ù Ø£ÙˆÙ„Ø§Ù‹.");
      let targetDept = document.getElementById('transfer-dept-select').value;
      let targetTitle = document.getElementById('transfer-title-select').value;
      
      let emp = findEmpByInput(q);
      let empIndex = emp ? employees.indexOf(emp) : -1;
      if(empIndex !== -1) {
        let oldDept = employees[empIndex].dept || 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©';
        let oldTitle = employees[empIndex].title || 'Ù„Ù… ÙŠØªÙ…';
        
        employees[empIndex].dept = targetDept;
        employees[empIndex].title = targetTitle;
        
        rebuildDeptTitles();
        syncStorage(); renderTable(); rebuildAllDropdowns(); loadEmployeeCurrentDetails();
        logAction('ØªØ­ÙˆÙŠÙ„', 'Ù…ÙˆØ¸Ù', employees[empIndex].name, 'Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©: ' + oldDept + ' Ø¥Ù„Ù‰ ' + targetDept + ' | Ù…Ù† Ø§Ù„Ù…Ø³Ù…Ù‰: ' + oldTitle + ' Ø¥Ù„Ù‰ ' + targetTitle);
        alert(`ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ù…ÙˆØ¸Ù "${employees[empIndex].name}" Ø¨Ù†Ø¬Ø§Ø­.`);
      }
    }

    function autoDiscoverDynamicData() {
      var changed = false;
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
      // Discover bakery contractor names from supplies â€” disabled per user request, only 6 fixed names

      if (changed) {
        _lsSet('dyn_rooms', JSON.stringify(_strArr(dynamicRooms)));
        _lsSet('dyn_septics', JSON.stringify(_strArr(dynamicSeptics)));
        _lsSet('linah_bakery_contractors_names', JSON.stringify(_strArr(bakeryContractorsNames)));
      }
    }

    function cleanDynamicData() {
      var changed = false;
      function scrub(arr) {
        var out = [], seen = {};
        (arr || []).forEach(function(x) {
          var s = (typeof x === 'string') ? x : (x ? String(x.name || x.title || x.label || x) : '');
          s = (s || '').trim();
          if (!s) { changed = true; return; }
          if (s.indexOf('?') !== -1) { changed = true; return; }
          var k = s.toLowerCase();
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
      if (dts) { fillSelectWithOptions('dept-title-dept-select', dynamicDepts, '-- Ù…Ø­Ø¯Ø¯ Ø§Ù„Ù…Ø³Ù…Ù‰ --'); }
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
      if (!arr.length) { container.innerHTML = '<div style="color:#999;padding:4px;">â€” Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù†Ø§ØµØ± â€”</div>'; return; }
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
            <button class="btn" style="padding:1px 6px;font-size:10px;background:#1565c0;color:white;" onclick="editDynamicItem('${inputId}','${listId}',${realIdx})">ØªØ¹Ø¯ÙŠÙ„</button>
            <button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteDynamicItem('${listId}',${realIdx})">Ø­Ø°Ù</button>
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
      if (btn) { btn.textContent = 'Ø­ÙØ¸'; btn.style.background = '#e65100'; btn.onclick = function() { saveDynamicEdit(inputId); }; }
    }

    function saveDynamicEdit(inputId) {
      if (!dynamicEditIndex) return;
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let arr = lists[dynamicEditIndex.listId];
      if (!arr || dynamicEditIndex.idx >= arr.length) { cancelDynamicEdit(inputId); return; }
      let val = document.getElementById('new-' + inputId).value.trim();
      if (!val) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ù‚ÙŠÙ…Ø©.');
      if (arr.includes(val) && arr.indexOf(val) !== dynamicEditIndex.idx) return alert('Ù‡Ø°Ù‡ Ø§Ù„Ù‚ÙŠÙ…Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.');
      arr[dynamicEditIndex.idx] = val;
      cancelDynamicEdit(inputId);
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }

    function cancelDynamicEdit(inputId) {
      dynamicEditIndex = null;
      document.getElementById('new-' + inputId).value = '';
      let btn = document.getElementById('btn-' + inputId);
      if (!btn) return;
      btn.textContent = 'âž• Ø¥Ø¶Ø§ÙØ©'; btn.style.background = '';
      let fns = { sector: addDynamicSector, room: addDynamicRoom, septic: addDynamicSeptic, dept: addDynamicDept, title: addDynamicTitle, 'ctr-sector': addContractorSector, 'visitor-type': addDynamicVisitorType, 'bakery-ctr': addBakeryContractorName };
      if (fns[inputId]) btn.onclick = fns[inputId];
    }

    
    function deleteDynamicItem(listId, idx) { if (!requireAdmin()) return;
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù†ØµØ±ØŸ')) return;
      let lists = { sector: dynamicSectors, room: dynamicRooms, septic: dynamicSeptics, dept: dynamicDepts, title: dynamicTitles, 'ctr-sector': contractorSectors, 'visitor-type': dynamicVisitorTypes, 'bakery-ctr': bakeryContractorsNames };
      let entityMap = { sector: 'dynamicSectors', room: 'dynamicRooms', septic: 'dynamicSeptics', dept: 'dynamicDepts', title: 'dynamicTitles', 'ctr-sector': 'contractorSectors', 'visitor-type': 'dynamicVisitorTypes', 'bakery-ctr': 'bakeryContractorsNames' };
      let arr = lists[listId];
      if (!arr || idx >= arr.length) return;
      let item = arr[idx];
      
      let inUseCount = 0;
      let inUseMsg = '';
      if (listId === 'dept') {
        inUseCount = employees.filter(function(e) { return e.dept === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ù…ÙˆØ¸Ù Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…Ø±ØªØ¨Ø·Ø§Ù‹ Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©. Ø§Ù†Ù‚Ù„Ù‡Ù… Ø£ÙˆÙ„Ø§Ù‹ Ø£Ùˆ Ø§Ø¶ØºØ· ØªØ£ÙƒÙŠØ¯ Ù„Ø­Ø°ÙÙ‡Ø§ Ù…Ù† Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'title') {
        inUseCount = employees.filter(function(e) { return e.title === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ù…ÙˆØ¸Ù Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…Ø±ØªØ¨Ø·Ø§Ù‹ Ø¨Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ¸ÙŠÙØ©. Ø§Ù†Ù‚Ù„Ù‡Ù… Ø£ÙˆÙ„Ø§Ù‹ Ø£Ùˆ Ø§Ø¶ØºØ· ØªØ£ÙƒÙŠØ¯ Ù„Ø­Ø°ÙÙ‡Ø§ Ù…Ù† Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'sector') {
        inUseCount = employees.filter(function(e) { return e.sector === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ù…ÙˆØ¸Ù Ù„Ø§ ÙŠØ²Ø§Ù„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰. Ø§Ù†Ù‚Ù„Ù‡Ù… Ø£ÙˆÙ„Ø§Ù‹ Ø£Ùˆ Ø§Ø¶ØºØ· ØªØ£ÙƒÙŠØ¯ Ù„Ø­Ø°ÙÙ‡Ù… Ù…Ù† Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'room') {
        inUseCount = employees.filter(function(e) { return e.room === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ù…ÙˆØ¸Ù Ù„Ø§ ÙŠØ²Ø§Ù„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ØºØ±ÙØ©. Ø§Ù†Ù‚Ù„Ù‡Ù… Ø£ÙˆÙ„Ø§Ù‹ Ø£Ùˆ Ø§Ø¶ØºØ· ØªØ£ÙƒÙŠØ¯ Ù„Ø­Ø°ÙÙ‡Ø§ Ù…Ù†Ù‡Ù… Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'septic') {
        inUseCount = (septicRecords || []).filter(function(s) { return (s.name||s.sector||'') === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ø³Ø¬Ù„ Ø¨ÙŠØ§Ø±Ø§Øª Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…Ø±ØªØ¨Ø·Ø§Ù‹ Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø§Ø³Ù…. Ø³ÙŠØªÙ… Ø­Ø°ÙÙ‡Ø§ Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'bakery-ctr') {
        inUseCount = (typeof bakeryContractorSupplies !== 'undefined' ? bakeryContractorSupplies : []).filter(function(s) { return s.name === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' ØªÙˆØ±ÙŠØ¯ Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…Ø±ØªØ¨Ø·Ø§Ù‹ Ø¨Ù‡Ø°Ø§ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„. Ø³ÙŠØªÙ… Ø­Ø°ÙÙ‡Ø§ Ø£ÙŠØ¶Ø§Ù‹.';
      } else if (listId === 'visitor-type') {
        inUseCount = (typeof hospData !== 'undefined' ? hospData : []).filter(function(h) { return h.type === item; }).length;
        if (inUseCount > 0) inUseMsg = 'Ù‡Ù†Ø§Ùƒ ' + inUseCount + ' Ø²Ø§Ø¦Ø± Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…Ø±ØªØ¨Ø·Ø§Ù‹ Ø¨Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ. Ø³ÙŠØªÙ… Ø­Ø°ÙÙ‡ Ù…Ù†Ù‡Ù… Ø£ÙŠØ¶Ø§Ù‹.';
      }
      
      if (inUseCount > 0) {
        if (!confirm('ØªØ­Ø°ÙŠØ±: ' + inUseMsg + '\n\nÙ‡Ù„ ØªØ±ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ…Ø±Ø§Ø± ÙÙŠ Ø§Ù„Ø­Ø°ÙØŸ')) return;
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
      if(!val) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø¨Ù†Ù‰.');
      if(roomsCapacity.some(function(r) { return r.sector === val; })) return alert('Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.');
      roomsCapacity.push({ sector: val, number: 'Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª 1', beds: 1 });
      if(!dynamicSectors.includes(val)) dynamicSectors.push(val);
      document.getElementById('new-sector').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists(); renderHousingLayout();
    }
    function addDynamicRoom() {
      let val = document.getElementById('new-room').value.trim();
      if(!val) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù…/Ø§Ø³Ù… Ø§Ù„ØºØ±ÙØ©.');
      if(dynamicRooms.includes(val)) return alert('Ù‡Ø°Ù‡ Ø§Ù„ØºØ±ÙØ© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.');
      dynamicRooms.push(val); document.getElementById('new-room').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addDynamicSeptic() {
      let val = document.getElementById('new-septic').value.trim();
      if(!val) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø¨ÙŠØ§Ø±Ø©.');
      if(dynamicSeptics.includes(val)) return alert('Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ø±Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.');
      dynamicSeptics.push(val); document.getElementById('new-septic').value = '';
      syncStorage(); rebuildAllDropdowns(); renderDynamicLists();
    }
    function addContractorSector() {
      let val = document.getElementById('new-ctr-sector').value.trim();
      if(!val) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø¨Ù†Ù‰.');
      if(contractorSectors.includes(val)) return alert('Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.');
      contractorSectors.push(val); document.getElementById('new-ctr-sector').value = '';
      syncStorage(); populateContractorSectorDropdown(); renderDynamicLists();
    }

    // ============================
    //  SORTING SYSTEM (Ø­Ø°Ù)
    // ============================
    let sortState = {};

    function getSortKey(val) {
      if (val === null || val === undefined || val === '' || val === 'â€”') return [2, ''];
      let ds = (val == null ? '' : val.toString()).trim();
      let num = parseFloat(ds);
      if (!isNaN(num) && ds === num.toString()) return [0, num];
      // Convert Arabic-Indic numerals to Western
      ds = ds.replace(/[Ù -Ù©]/g, function(c) { return 'Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©'.indexOf(c); });
      // Strip Unicode formatting marks (RTL, LRM, etc.) that can appear in locale dates
      ds = ds.replace(/[\u200E\u200F\u202A-\u202E\u2060-\u2064]/g, '');
      // Strip trailing time
      ds = ds.replace(/\s*\d{1,2}:\d{2}(:\d{2})?\s*$/, '');
      // Arabic month names: 15 ÙŠÙˆÙ„ÙŠÙˆ 2026
      var arMonths = {'ÙŠÙ†Ø§ÙŠØ±':1,'ÙØ¨Ø±Ø§ÙŠØ±':2,'Ù…Ø§Ø±Ø³':3,'Ø§Ø¨Ø±ÙŠÙ„':4,'Ø£Ø¨Ø±ÙŠÙ„':4,'Ù…Ø§ÙŠÙˆ':5,'ÙŠÙˆÙ†ÙŠÙˆ':6,'ÙŠÙˆÙ„ÙŠÙˆ':7,'Ø£ØºØ³Ø·Ø³':8,'Ø§ØºØ³Ø·Ø³':8,'Ø³Ø¨ØªÙ…Ø¨Ø±':9,'Ø£ÙƒØªÙˆØ¨Ø±':10,'Ø§ÙƒØªÙˆØ¨Ø±':10,'Ù†ÙˆÙÙ…Ø¨Ø±':11,'Ù†ÙˆÙÙ…Ø¨Ø±':11,'Ø¯ÙŠØ³Ù…Ø¨Ø±':12};
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
        return [0, new Date(d2[3], p2-1, p1).getTime()]; // ambiguous â†’ DD-MM-YYYY (Egypt locale)
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
        th.title = 'Ø§Ø¶ØºØ· Ù„Ù„ÙØ±Ø²';
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
            'table-archive': 'renderArchiveTable'
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
        var roleLabel = u.role === 'admin' ? 'Ù…Ø¯ÙŠØ±' : 'Ù…Ø³ØªØ®Ø¯Ù…';
        var roleColor = u.role === 'admin' ? '#6a1b9a' : '#1565c0';
        var newRole = u.role === 'admin' ? 'user' : 'admin';
        var newLabel = u.role === 'admin' ? 'ØªÙ†Ø²ÙŠÙ„ Ù„Ù…Ø³ØªØ®Ø¯Ù…' : 'ØªØ±Ù‚ÙŠØ© Ù„Ù…Ø¯ÙŠØ±';
        var isSelf = u.name === currentUser ? ' (Ø£Ù†Øª)' : '';
        var hasPass = u.passHash ? 'ðŸ”‘ ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ù…Ø¶Ø¨ÙˆØ·Ø©' : 'ðŸ”“ Ø¨Ø¯ÙˆÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ±';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:6px;font-size:14px;">' +
          '<span><strong>' + u.name + '</strong>' + isSelf + ' <span style="color:' + roleColor + ';font-size:12px;">(' + roleLabel + ')</span> <span style="font-size:11px;color:#888;">' + hasPass + '</span></span>' +
          '<div style="display:flex;gap:4px;">' +
          '<button class="btn btn-sm" style="background:#e65100;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="resetUserPass(\'' + u.name.replace(/'/g, "\\'") + '\')">Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†</button>' +
          '<button class="btn btn-sm" style="background:' + roleColor + ';color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="changeUserRole(\'' + u.name.replace(/'/g, "\\'") + '\',\'' + newRole + '\')">' + newLabel + '</button>' +
          '<button class="btn btn-sm" style="background:#c62828;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" onclick="deleteAppUser(\'' + u.name.replace(/'/g, "\\'") + '\')">Ø­Ø°Ù</button>' +
          '</div></div>';
      }).join('');
    }

    function resetUserPass(name) {
      if (!requireAdmin()) return;
      var newPass = prompt('Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… "' + name + '":');
      if (newPass === null) return;
      if (newPass.length < 3) { alert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªÙ‚Ù„ Ø¹Ù† 3 Ø£Ø­Ø±Ù.'); return; }
      var u = appUsers.find(function(x) { return x.name === name; });
      if (!u) return;
      u.passHash = hashPass(newPass);
      delete u.noPass;
      saveUsers();
      // ØªØ­Ø¯ÙŠØ« Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†
      renderUsersList();
    }

    function changeMyPassword() {
      var old = prompt('Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ©:');
      if (old === null) return;
      var u = appUsers.find(function(x) { return x.name === currentUser; });
      if (!u) return;
      if (u.passHash && u.passHash !== hashPass(old)) { alert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©.'); return; }
      var newPass = prompt('Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©:');
      if (newPass === null) return;
      if (newPass.length < 3) { alert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªÙ‚Ù„ Ø¹Ù† 3 Ø£Ø­Ø±Ù.'); return; }
      var confirmPass = prompt('Ø£Ø¹Ø¯ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©:');
      if (confirmPass !== newPass) { alert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚Ø©.'); return; }
      u.passHash = hashPass(newPass);
      delete u.noPass;
      saveUsers();
      alert('ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­.');
    }

    function addNewUser() {
      if (!requireAdmin()) return;
      var name = document.getElementById('new-user-name').value.trim();
      var role = document.getElementById('new-user-role').value;
      if (!name) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….'); return; }
      if (!/^[\u0621-\u064A\s]+$/.test(name)) { alert('Ø§Ù„Ø§Ø³Ù… ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¨Ø§Ù„Ø£Ø­Ø±Ù Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙÙ‚Ø·.'); return; }
      if (appUsers.find(function(u) { return u.name === name; })) { alert('Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.'); return; }
      var pass = prompt('Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… "' + name + '" (Ø§ØªØ±ÙƒÙ‡Ø§ ÙØ§Ø±ØºØ© Ù„Ø¨Ø¯ÙˆÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ±):');
      if (pass === null) return;
      var userObj = { name: name, role: role };
      if (pass && pass.length >= 3) { userObj.passHash = hashPass(pass); }
      else if (pass && pass.length > 0 && pass.length < 3) { alert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªÙ‚Ù„ Ø¹Ù† 3 Ø£Ø­Ø±Ù.'); return; }
      else { userObj.noPass = true; }
      appUsers.push(userObj);
      saveUsers();
      document.getElementById('new-user-name').value = '';
      renderUsersList();
      populateLoginDropdown();
    }

    function changeUserRole(name, newRole) {
      if (!requireAdmin()) return;
      if (name === currentUser) { alert('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØºÙŠÙŠØ± ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ (Ø£Ù†Øª).'); return; }
      var u = appUsers.find(function(x) { return x.name === name; });
      if (!u) return;
      u.role = newRole;
      saveUsers();
      renderUsersList();
      populateLoginDropdown();
    }

    function deleteAppUser(name) {
      if (!requireAdmin()) return;
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… "' + name + '"ØŸ')) return;
      if (name === currentUser) { alert('Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ (Ø£Ù†Øª).'); return; }
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
      if (!user) { document.getElementById('login-error').innerText = 'Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…Ø³Ø¬Ù„.'; return; }
      if (!user.noPass && user.passHash && user.passHash !== hashPass(pass)) {
        document.getElementById('login-error').innerText = 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©.'; return;
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
      box.innerHTML = '<h3 style="margin:0 0 16px;">Ø§Ø®ØªÙŠØ§Ø± Ù…Ø³ØªØ®Ø¯Ù… Ù„Ù„Ø¯Ø®ÙˆÙ„</h3><select id="backdoor-user" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;margin-bottom:12px;">' +
        appUsers.map(function(u) { return '<option value="' + u.name + '">' + u.name + '</option>'; }).join('') +
        '</select><button onclick="doBackdoorLogin()" style="width:100%;padding:10px;background:#2e7d32;color:#fff;border:none;border-radius:8px;font-size:15px;font-family:Cairo,sans-serif;cursor:pointer;">Ø¯Ø®ÙˆÙ„</button>';
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
      if (el) el.textContent = currentUser || 'â€”';
    }
    function logout() {
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ "' + currentUser + '"ØŸ')) return;
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
        {id:'rpt-workforce', label:'Ø§Ù„Ù‚ÙˆØ© Ø§Ù„Ø¹Ø§Ù…Ù„Ø©', def:true},
        {id:'rpt-housing', label:'Ø§Ù„Ø³ÙƒÙ†', def:true},
        {id:'rpt-meals', label:'Ø§Ù„ÙˆØ¬Ø¨Ø§Øª', def:true},
        {id:'rpt-guests', label:'Ø§Ù„Ø¶ÙŠØ§ÙØ©', def:true},
        {id:'rpt-vacations', label:'Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª', def:true},
        {id:'rpt-maintenance', label:'Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ¨Ù„Ø§ØºØ§Øª Ø§Ù„Ø£Ø¹Ø·Ø§Ù„', def:true},
        {id:'rpt-septic', label:'Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª', def:true},
        {id:'rpt-bakery-prod', label:'Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ù…Ø®Ø¨Ø²', def:true},
        {id:'rpt-bakery-supply', label:'ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²', def:true},
        {id:'rpt-inventory', label:'Ø§Ù„Ù…Ø®Ø²Ù†', def:true},
        {id:'rpt-tea', label:'Ø´Ø§ÙŠ ÙˆØ³ÙƒØ±', def:true},
        {id:'rpt-pm', label:'Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©', def:true},
        {id:'rpt-contractors', label:'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†', def:true},
        {id:'rpt-excluded', label:'Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†', def:true},
        {id:'rpt-daily-stats', label:'Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ÙŠÙˆÙ…ÙŠØ©', def:true}
      ];
      var checksHtml = sections.map(function(s) {
        return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:4px 0;"><input type="checkbox" id="' + s.id + '" ' + (s.def ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;"> ' + s.label + '</label>';
      }).join('');
      box.innerHTML = '<h3 style="margin:0 0 4px;color:#1b5e20;">ðŸ“‹ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§Ù…Ù„</h3>' +
        '<p style="font-size:12px;color:#666;margin:0 0 12px;">Ø§Ø®ØªØ± Ø§Ù„Ø£Ù‚Ø³Ø§Ù… ÙˆØ§Ù„ØªØ§Ø±ÙŠØ® Ø«Ù… Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</p>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px;">' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 16px;border-radius:20px;border:2px solid #1b5e20;" id="rpt-type-daily-label"><input type="radio" name="rpt-type" value="daily" checked onchange="toggleRptType()" style="width:15px;height:15px;cursor:pointer;"> ÙŠÙˆÙ…ÙŠ</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 16px;border-radius:20px;border:2px solid #bbb;" id="rpt-type-weekly-label"><input type="radio" name="rpt-type" value="weekly" onchange="toggleRptType()" style="width:15px;height:15px;cursor:pointer;"> Ø£Ø³Ø¨ÙˆØ¹ÙŠ</label>' +
        '</div>' +
        '<div id="rpt-date-range" style="text-align:right;margin-bottom:10px;">' +
        '<div id="rpt-date-daily"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">ðŸ“… Ø§Ù„ØªØ§Ø±ÙŠØ®</label><input type="date" id="daily-report-date" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;"></div>' +
        '<div id="rpt-date-weekly" style="display:none;"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">ðŸ“… Ù…Ù†</label><input type="date" id="weekly-report-from" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;margin-bottom:6px;"><label style="display:block;font-size:12px;color:#555;margin-bottom:4px;">ðŸ“… Ø¥Ù„Ù‰</label><input type="date" id="weekly-report-to" value="' + todayStr + '" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;"></div>' +
        '</div>' +
        '<div style="text-align:right;margin-bottom:10px;border:1px solid #e0e0e0;border-radius:8px;padding:10px;background:#fafafa;display:grid;grid-template-columns:1fr 1fr;gap:2px;">' +
        checksHtml +
        '</div>' +
        '<input type="password" id="daily-report-pass" placeholder="ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± (0000)" style="width:100%;padding:8px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:Cairo,sans-serif;margin-bottom:8px;text-align:center;" onkeydown="if(event.key===\'Enter\')checkDailyReportPass()">' +
        '<button onclick="checkDailyReportPass()" style="width:100%;padding:10px;background:#1b5e20;color:#fff;border:none;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;cursor:pointer;">Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø±ÙŠØ±</button>' +
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
        if (errEl) errEl.innerText = 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©';
        return;
      }
      var isWeekly = document.querySelector('input[name="rpt-type"]:checked');
      if (!isWeekly) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ® Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ø®Ø¨Ø²'); return; }
      isWeekly = isWeekly.value === 'weekly';
      var dateInput;
      if (isWeekly) {
        var fromEl = document.getElementById('weekly-report-from');
        dateInput = fromEl ? fromEl.value : '';
      } else {
        var dailyEl = document.getElementById('daily-report-date');
        dateInput = dailyEl ? dailyEl.value : '';
      }
      if (!dateInput) { alert('Ø£Ø¯Ø®Ù„ ØªØ§Ø±ÙŠØ® ØµØ±Ù Ø§Ù„Ø®Ø¨Ø²'); return; }
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
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù‚ÙˆØ© Ø§Ù„Ø¹Ø§Ù…Ù„Ø©', totalEmp + ' Ø¥Ø¬Ù…Ø§Ù„ÙŠ | ' + pCount + ' Ø­Ø§Ø¶Ø± | ' + vCount + ' Ø¥Ø¬Ø§Ø²Ø©') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø³ÙƒÙ†', totalBeds + ' Ø³Ø±ÙŠØ± | ' + occupiedBeds + ' Ù…Ø´ØºÙˆÙ„ (' + occPct + '%) | ' + vacantBeds + ' Ø´Ø§ØºØ±') + '</div>';
      }
      if (opts['rpt-meals']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ÙˆØ¬Ø¨Ø§Øª', 'ÙØ·Ø§Ø± ' + (pCount + mealStats.gBf) + ' | ØºØ¯Ø§Ø¡ ' + (pCount + mealStats.gLh) + ' | Ø¹Ø´Ø§Ø¡ ' + (pCount + mealStats.gDn)) + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = todayGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¶ÙŠØ§ÙØ©', todayGuests.length + ' Ø²Ø§Ø¦Ø± | ' + gTotal + ' Ø¶ÙŠÙ') + '</div>';
      }
      if (opts['rpt-vacations']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª', activeVacations.length + ' Ø³Ø¬Ù„') + '</div>';
      }
      if (opts['rpt-maintenance']) {
        var openM = todayMaint.filter(function(m) { return m.status === 'Ù…ÙØªÙˆØ­' || m.status === 'open'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ØµÙŠØ§Ù†Ø©', todayMaint.length + ' Ø·Ù„Ø¨ | ' + openM + ' Ù…ÙØªÙˆØ­') + '</div>';
      }
      if (opts['rpt-septic']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª', todaySeptic.length + ' Ø¹Ù…Ù„ÙŠØ©') + '</div>';
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
        sectionsHtml += '<div class="rp-section">' + sec('Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ù…Ø®Ø¨Ø²', prodTotal + ' Ø±ØºÙŠÙ | ØªÙƒÙ„ÙØ© ' + prodCost.toFixed(0) + ' Ø¬.Ù… | ØªÙƒÙ„ÙØ© Ø§Ù„Ø±ØºÙŠÙ ' + costPerLoaf.toFixed(2) + ' Ø¬.Ù…') + '</div>';
      }
      if (opts['rpt-bakery-supply']) {
        var ctrBread = todayCtr.reduce(function(s,c) { return s + (c.count || 0); }, 0);
        var ctrNames = todayCtr.map(function(c) { return c.name + ' ' + (c.count || 0); }).join(' | ');
        sectionsHtml += '<div class="rp-section">' + sec('ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²', ctrBread + ' Ø±ØºÙŠÙ | ' + ctrNames) + '</div>';
      }
      if (opts['rpt-inventory']) {
        var invItems = todayInv.reduce(function(s,v) { return s + (parseInt(v.qty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ø®Ø²Ù†', todayInv.length + ' ØµØ±Ù | ' + invItems + ' ØµÙ†Ù') + '</div>';
      }
      if (opts['rpt-tea']) {
        var teaQ = todayTea.reduce(function(s,t) { return s + (parseFloat(t.teaQty) || 0); }, 0);
        var sugarQ = todayTea.reduce(function(s,t) { return s + (parseFloat(t.sugarQty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±', todayTea.length + ' ØµØ±Ù | Ø´Ø§ÙŠ ' + teaQ + ' ÙƒØ¬Ù… | Ø³ÙƒØ± ' + sugarQ + ' ÙƒØ¬Ù…') + '</div>';
      }
      if (opts['rpt-pm']) {
        var pmDone = todayPM.filter(function(p) { return p.status === 'ØªÙ…' || p.status === 'ØªÙ… Ø§Ù„ØªÙ†ÙÙŠØ°'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©', todayPM.length + ' Ù…Ù‡Ù…Ø© | ' + pmDone + ' Ù…Ù†ÙØ°') + '</div>';
      }
      if (opts['rpt-contractors']) {
        var ctrDaily = contractors.reduce(function(s,c) { return s + (parseFloat(c.dailyRate) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†', contractors.length + ' Ù…Ù‚Ø§ÙˆÙ„ | Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙŠÙˆÙ…ÙŠ ' + ctrDaily.toFixed(0) + ' Ø¬.Ù…') + '</div>';
      }
      if (opts['rpt-excluded']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†', excludedEmployees.length + ' Ù…ÙˆØ¸Ù') + '</div>';
      }
      if (opts['rpt-daily-stats']) {
        var ds = computeDailyStatsForRange(dateInput, dateInput);
        if (ds.length > 0) {
          var d = ds[0];
          sectionsHtml += '<div class="rp-section">' + sec('Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ÙŠÙˆÙ…ÙŠØ©', 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ ' + d.total + ' | Ø¯Ø§Ø¦Ù… Ø­Ø§Ø¶Ø± ' + d.permP + ' | Ø¯Ø§Ø¦Ù… Ø¥Ø¬Ø§Ø²Ø© ' + d.permV + ' | ÙƒØ§Ø¬ÙˆÙ„ Ø­Ø§Ø¶Ø± ' + d.casP + ' | ÙƒØ§Ø¬ÙˆÙ„ Ø¥Ø¬Ø§Ø²Ø© ' + (d.casV || 0) + ' | Ø¶ÙŠÙˆÙ ' + d.hospGuests) + '</div>';
        }
      }
      if (!sectionsHtml) sectionsHtml = '<div style="text-align:center;padding:30px;color:#888;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© Ù…Ù‡Ù…Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ù…ÙØªÙˆØ­Ø© Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª</div>';
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ø¹Ù…Ù„ÙŠØ© Ø¥Ù†ØªØ§Ø¬ - Ø§Ù„Ø®Ø¨Ø² Ø±ØºÙŠÙ</title>' +
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
        '<h1>Ø¨ÙŠØ§Ù†Ø§Øª ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²</h1><h2>Ø±ØºÙŠÙ ØµØ±Ù - Ø§Ù„Ù…Ø®Ø²Ù† Ø¨ÙˆÙ†</h2><div class="rp-date">Ø¨ÙŠØ§Ù†Ø§Øª ' + dateStr + '</div></div>' +
        sectionsHtml +
        '<div class="rp-footer">ØµÙ†Ù ØµØ±Ù Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ± - Ù…Ø³ØªÙ„Ù… Ø´Ø§ÙŠ | ' + dateStr + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'Ø³ÙƒØ±_ÙƒØ¬Ù…_' + dateInput + '.html';
        a.style.display = 'none';
        document.body.appendChild(a);
        setTimeout(function() { a.click(); }, 100);
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
      } catch(e) {
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(fullHtml); w.document.close(); }
          else { alert('ØªÙ… ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ø¯ÙˆØ±ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­'); }
        } catch(e2) { alert('Ø®Ø·Ø£ ÙÙŠ ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ø¯ÙˆØ±ÙŠØ©: ' + e.message); }
      }
    }
    function generateWeeklyReport(fromDate, toDate, opts) {
      var start = new Date(fromDate + 'T00:00:00');
      var end = new Date(toDate + 'T00:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) { alert('ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ§Ù„Ø­: Ù…Ù† ' + fromDate + ' Ø¥Ù„Ù‰ ' + toDate); return; }
      var days = [];
      for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2));
      }
        var dateStr = start.toLocaleDateString('ar-EG') + ' Ø¥Ù„Ù‰ ' + end.toLocaleDateString('ar-EG');
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
        sectionsHtml += '<div class="rp-section">' + sec('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙˆÙ† Ù…ÙˆØ¸Ù', totalEmp + ' Ø¨ÙŠØ§Ù†Ø§Øª | ' + pCount + ' Ù„Ù… | ' + vCount + ' ÙŠØªÙ…') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø®ØªÙŠØ§Ø±', totalBeds + ' Ø£ÙŠ | ' + occupiedBeds + ' Ø£Ù‚Ø³Ø§Ù… (' + occPct + '%) | ' + vacantBeds + ' Ù„Ù„ØªÙ‚Ø±ÙŠØ±') + '</div>';
      }
      if (opts['rpt-meals']) {
        var mBf = 0, mLh = 0, mDn = 0;
        days.forEach(function(dateInput) {
          var ms = getTodayMealStats();
          mBf += pCount + ms.gBf;
          mLh += pCount + ms.gLh;
          mDn += pCount + ms.gDn;
        });
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ…ÙŠ', 'Ù„ÙŠÙ†Ù‡ ' + mBf + ' | ÙØ§Ø±Ù…Ø² ' + mLh + ' | Ù„ÙŠÙ†Ù‡ ' + mDn + ' (ÙØ§Ø±Ù…Ø² ' + days.length + ' Ø§Ù„ØªÙ‚Ø±ÙŠØ±)') + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = uniqueGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ÙŠÙˆÙ…ÙŠ Ø§Ù„Ø´Ø¦ÙˆÙ†', uniqueGuests.length + ' Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© | ' + gTotal + ' Ù…Ù†Ø¸ÙˆÙ…Ø©') + '</div>';
      }
      if (opts['rpt-workforce']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù‚ÙˆØ© Ø§Ù„Ø¹Ø§Ù…Ù„Ø©', totalEmp + ' Ø¥Ø¬Ù…Ø§Ù„ÙŠ | ' + pCount + ' Ø­Ø§Ø¶Ø± | ' + vCount + ' Ø¥Ø¬Ø§Ø²Ø©') + '</div>';
      }
      if (opts['rpt-housing']) {
        var occPct = totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø³ÙƒÙ†', totalBeds + ' Ø³Ø±ÙŠØ± | ' + occupiedBeds + ' Ù…Ø´ØºÙˆÙ„ (' + occPct + '%) | ' + vacantBeds + ' Ø´Ø§ØºØ±') + '</div>';
      }
      if (opts['rpt-meals']) {
        var mBf = 0, mLh = 0, mDn = 0;
        days.forEach(function(dateInput) {
          var ms = getTodayMealStats();
          mBf += pCount + ms.gBf;
          mLh += pCount + ms.gLh;
          mDn += pCount + ms.gDn;
        });
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ÙˆØ¬Ø¨Ø§Øª', 'ÙØ·Ø§Ø± ' + mBf + ' | ØºØ¯Ø§Ø¡ ' + mLh + ' | Ø¹Ø´Ø§Ø¡ ' + mDn + ' (Ã—' + days.length + ' ÙŠÙˆÙ…)') + '</div>';
      }
      if (opts['rpt-guests']) {
        var gTotal = uniqueGuests.reduce(function(s,h) { return s + (parseInt(h.guests) || 1); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¶ÙŠØ§ÙØ©', uniqueGuests.length + ' Ø²Ø§Ø¦Ø± | ' + gTotal + ' Ø¶ÙŠÙ') + '</div>';
      }
      if (opts['rpt-vacations']) {
        var uniqueVac = [];
        var vSeen = {};
        allVac.forEach(function(v) {
          if (!vSeen[v.nationalId || v.name]) { vSeen[v.nationalId || v.name] = true; uniqueVac.push(v); }
        });
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª', uniqueVac.length + ' Ø³Ø¬Ù„') + '</div>';
      }
      if (opts['rpt-maintenance']) {
        var openM = allMaint.filter(function(m) { return m.status === 'Ù…ÙØªÙˆØ­' || m.status === 'open'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ØµÙŠØ§Ù†Ø©', allMaint.length + ' Ø·Ù„Ø¨ | ' + openM + ' Ù…ÙØªÙˆØ­') + '</div>';
      }
      if (opts['rpt-septic']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª', allSeptic.length + ' Ø¹Ù…Ù„ÙŠØ©') + '</div>';
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
        sectionsHtml += '<div class="rp-section">' + sec('Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ù…Ø®Ø¨Ø²', prodTotal + ' Ø±ØºÙŠÙ | ØªÙƒÙ„ÙØ© ' + prodCost.toFixed(0) + ' Ø¬.Ù… | ØªÙƒÙ„ÙØ© Ø§Ù„Ø±ØºÙŠÙ ' + costPerLoaf.toFixed(2) + ' Ø¬.Ù… (Ã—' + days.length + ' ÙŠÙˆÙ…)') + '</div>';
      }
      if (opts['rpt-bakery-supply']) {
        var ctrBread = allCtr.reduce(function(s,c) { return s + (c.count || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²', ctrBread + ' Ø±ØºÙŠÙ | ' + days.length + ' ÙŠÙˆÙ…') + '</div>';
      }
      if (opts['rpt-inventory']) {
        var invItems = allInv.reduce(function(s,v) { return s + (parseInt(v.qty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ø®Ø²Ù†', allInv.length + ' ØµØ±Ù | ' + invItems + ' ØµÙ†Ù') + '</div>';
      }
      if (opts['rpt-tea']) {
        var teaQ = allTea.reduce(function(s,t) { return s + (parseFloat(t.teaQty) || 0); }, 0);
        var sugarQ = allTea.reduce(function(s,t) { return s + (parseFloat(t.sugarQty) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±', allTea.length + ' ØµØ±Ù | Ø´Ø§ÙŠ ' + teaQ + ' ÙƒØ¬Ù… | Ø³ÙƒØ± ' + sugarQ + ' ÙƒØ¬Ù…') + '</div>';
      }
      if (opts['rpt-pm']) {
        var pmDone = allPM.filter(function(p) { return p.status === 'ØªÙ…' || p.status === 'ØªÙ… Ø§Ù„ØªÙ†ÙÙŠØ°'; }).length;
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©', allPM.length + ' Ù…Ù‡Ù…Ø© | ' + pmDone + ' Ù…Ù†ÙØ°') + '</div>';
      }
      if (opts['rpt-contractors']) {
        var ctrDaily = contractors.reduce(function(s,c) { return s + (parseFloat(c.dailyRate) || 0); }, 0);
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†', contractors.length + ' Ù…Ù‚Ø§ÙˆÙ„ | Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙŠÙˆÙ…ÙŠ ' + ctrDaily.toFixed(0) + ' Ø¬.Ù…') + '</div>';
      }
      if (opts['rpt-excluded']) {
        sectionsHtml += '<div class="rp-section">' + sec('Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†', excludedEmployees.length + ' Ù…ÙˆØ¸Ù') + '</div>';
      }
      if (opts['rpt-daily-stats']) {
        var dsData = computeDailyStatsForRange(fromDate, toDate);
        var sumTot = 0, sumPP = 0, sumPV = 0, sumCP = 0, sumCV = 0, sumGH = 0;
        dsData.forEach(function(d) { sumTot += d.total; sumPP += d.permP; sumPV += d.permV; sumCP += d.casP; sumCV += (d.casV || 0); sumGH += d.hospGuests; });
        var n = dsData.length;
        sectionsHtml += '<div class="rp-section">' + sec('Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ÙŠÙˆÙ…ÙŠØ©', 'Ø§Ù„Ù…Ø¹Ø¯Ù„ â€” Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ ' + Math.round(sumTot/n) + ' | Ø¯Ø§Ø¦Ù… Ø­Ø§Ø¶Ø± ' + Math.round(sumPP/n) + ' | Ø¯Ø§Ø¦Ù… Ø¥Ø¬Ø§Ø²Ø© ' + Math.round(sumPV/n) + ' | ÙƒØ§Ø¬ÙˆÙ„ Ø­Ø§Ø¶Ø± ' + Math.round(sumCP/n) + ' | ÙƒØ§Ø¬ÙˆÙ„ Ø¥Ø¬Ø§Ø²Ø© ' + Math.round(sumCV/n) + ' | Ø¶ÙŠÙˆÙ ' + Math.round(sumGH/n) + ' (Ã—' + n + ' ÙŠÙˆÙ…)') + '</div>';
      }
      if (!sectionsHtml) sectionsHtml = '<div style="text-align:center;padding:30px;color:#888;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© Ù…Ù‡Ù…Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ù…ÙØªÙˆØ­Ø© Ø±ØºÙŠÙ</div>';
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ</title>' +
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
        '<h1>Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ Ø§Ù„Ø´Ø§Ù…Ù„</h1><h2>Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²</h2><div class="rp-date">' + dateStr + '</div></div>' +
        sectionsHtml +
        '<div class="rp-footer">ØªÙ‚Ø±ÙŠØ± Ø£Ø³Ø¨ÙˆØ¹ÙŠ â€” ' + dateStr + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'Ø§Ù„Ø´Ø§ÙŠ_ÙˆØ§Ù„Ø³ÙƒØ±_' + fromDate + '_' + toDate + '.html';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
      } catch(e) { alert('ØªØ¹Ø°Ø± ØªØµØ¯ÙŠØ± ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±: ' + e.message); }
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
        if (h.type === 'Ù†Ø³Ø§Ø¡') womenCount += g;
        else if (h.type === 'Ø£Ø¬Ø§Ù†Ø¨') studentCount += g;
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
        ctrRowsHtml += '<tr id="row-' + id + '"><td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" value="' + (c.name || '') + '" id="name-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="Ø§Ù„Ø¯ÙˆØ±ÙŠØ© Ù…Ù‡Ù…Ø©"></td><td style="border:1px solid #e0e0e0;padding:4px;width:100px;"><input type="number" id="qty-' + id + '" min="0" value="0" style="width:80px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:40px;"><button onclick="removeBreadCtrRow(\'row-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">âœ•</button></td></tr>';
      });
      box.innerHTML = '<div style="font-size:32px;margin-bottom:6px;">ðŸž</div>' +
        '<h3 style="margin:0 0 2px;color:#1b5e20;font-size:18px;">Ø§Ù‚ØªØ±Ø§Ø­ ÙƒÙ…ÙŠØ© Ø§Ù„Ø®Ø¨Ø² Ø§Ù„ÙŠÙˆÙ…ÙŠØ©</h3>' +
        '<div style="margin:6px 0 10px;display:flex;align-items:center;justify-content:center;gap:8px;"><label style="font-size:13px;color:#555;">Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ®:</label><input type="date" id="bsug-date-select" value="' + dateInput + '" style="padding:6px 10px;border:2px solid #2e7d32;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;" onchange="recalcBreadSuggestionForDate()"></div>' +
        '<p style="font-size:12px;color:#888;margin:0 0 14px;">Ø§Ø¶Ø¨Ø· Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¯ Ø­Ø³Ø¨ Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙØ¹Ù„ÙŠ Ø§Ù„ÙŠÙˆÙ…</p>' +
        '<div style="text-align:right;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#e8f5e9;border-radius:8px;margin-bottom:6px;border-right:4px solid #2e7d32;font-size:14px;"><span>ðŸ‘¤ Ø§Ù„Ø¹Ù…Ø§Ù„ (Ø§Ù„Ø­Ø¶ÙˆØ± ' + pCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">Ã— 6</span><input type="number" id="bsug-workers" min="0" value="' + workerLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #a5d6a7;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fce4ec;border-radius:8px;margin-bottom:6px;border-right:4px solid #e91e63;font-size:14px;"><span>ðŸ‘© Ø§Ù„Ø³ÙŠØ¯Ø§Øª (' + womenCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">Ø§ÙØªØ±Ø§Ø¶ÙŠ 2</span><input type="number" id="bsug-women" min="0" value="' + womenLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #f48fb1;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#e3f2fd;border-radius:8px;margin-bottom:6px;border-right:4px solid #1565c0;font-size:14px;"><span>ðŸŽ’ Ø·Ù„Ø¨Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø© (' + studentCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">Ø§ÙØªØ±Ø§Ø¶ÙŠ 2</span><input type="number" id="bsug-students" min="0" value="' + studentLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #90caf9;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:6px;border-right:4px solid #78909c;font-size:14px;"><span>ðŸš— Ø¶ÙŠÙˆÙ ÙˆØ²ÙˆØ§Ø± ÙˆØ³ÙˆØ§Ù‚ÙŠÙ† (' + otherGuestsCount + ')</span><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;color:#888;">Ø§ÙØªØ±Ø§Ø¶ÙŠ 2</span><input type="number" id="bsug-other" min="0" value="' + otherGuestsLoaves + '" style="width:70px;padding:4px 6px;border:1px solid #b0bec5;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></span></div>' +
        '<div style="margin-top:10px;margin-bottom:4px;font-weight:700;color:#e65100;font-size:14px;display:flex;justify-content:space-between;align-items:center;"><span>ðŸ‘· Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† (Ø¹Ø¯Ø¯ Ù…ÙØªÙˆØ­)</span><button onclick="addBreadCtrRow()" style="padding:4px 12px;background:#e65100;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">âž• Ø¥Ø¶Ø§ÙØ© Ù…Ù‚Ø§ÙˆÙ„</button></div>' +
        '<div style="max-height:200px;overflow-y:auto;margin-bottom:6px;"><table id="bread-ctr-table" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;">Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;width:100px;">Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;font-size:12px;width:40px;"></th></tr></thead><tbody id="bread-ctr-tbody">' + ctrRowsHtml + '</tbody></table></div>' +
        '<hr style="border:none;border-top:2px dashed #e0e0e0;margin:10px 0;">' +
        '<div style="display:flex;justify-content:space-between;padding:12px;background:#1b5e20;color:white;border-radius:10px;font-size:16px;font-weight:800;"><span>ðŸ¥– Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù‚ØªØ±Ø­</span><span id="bread-total-display">' + (workerLoaves + womenLoaves + studentLoaves + otherGuestsLoaves) + ' Ø±ØºÙŠÙ</span></div>' +
        '</div>' +
        '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
        '<button onclick="copyBreadTotal()" style="padding:8px 20px;background:#1565c0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">ðŸ“‹ Ù†Ø³Ø® Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</button>' +
        '<button onclick="fillBreadProductionInput()" style="padding:8px 20px;background:#2e7d32;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">ðŸ“¥ ØªØ¹Ø¨Ø¦Ø© Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ù†ØªØ§Ø¬</button>' +
        '<button onclick="document.getElementById(\'bread-suggestion-modal\').remove()" style="padding:8px 20px;background:#e0e0e0;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">Ø¥ØºÙ„Ø§Ù‚</button>' +
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
        if (h.type === 'Ù†Ø³Ø§Ø¡') womenCount += g;
        else if (h.type === 'Ø£Ø¬Ø§Ù†Ø¨') studentCount += g;
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
      tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="name-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ Ø§Ù‚ØªØ±Ø§Ø­"></td><td style="border:1px solid #e0e0e0;padding:4px;width:100px;"><input type="number" id="qty-' + id + '" min="0" value="0" style="width:80px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadSuggestionTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:40px;"><button onclick="removeBreadCtrRow(\'row-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">âœ•</button></td>';
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
      if (el) el.innerText = getBreadSuggestionTotal() + ' Ø§Ø¹Ø¯Ø§Ø¯';
    }
    function copyBreadTotal() {
      var val = getBreadSuggestionTotal();
      navigator.clipboard.writeText(String(val)).then(function() {
        alert('ØªÙ… Ù†Ø³Ø® Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø£Ø±ØºÙØ© Ø§Ù„Ø®Ø¨Ø²: ' + val + ' Ø±ØºÙŠÙ');
      }).catch(function() {
        prompt('Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ø¹Ø¯Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ®:', val);
      });
    }
    function fillBreadProductionInput() {
      var val = getBreadSuggestionTotal();
      var input = document.getElementById('bprod-count');
      if (input) input.value = val;
      document.getElementById('bread-suggestion-modal').remove();
      estimateBprodIngredients();
      alert('ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø£Ø±ØºÙØ© Ø§Ù„Ø®Ø¨Ø² Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø©: ' + val + ' Ø±ØºÙŠÙ');
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
        if (h.type === 'Ù†Ø³Ø§Ø¡') womenCount += g;
        else if (h.type === 'Ø£Ø¬Ø§Ù†Ø¨') studentCount += g;
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
      box.innerHTML = '<div style="font-size:32px;margin-bottom:6px;">ðŸž</div>' +
        '<h3 style="margin:0 0 2px;color:#e65100;font-size:18px;">ØªØ®Ø·ÙŠØ· ÙƒÙ…ÙŠØ© Ø§Ù„Ø®Ø¨Ø²</h3>' +
        '<div style="margin:6px 0 10px;display:flex;align-items:center;justify-content:center;gap:8px;"><label style="font-size:13px;color:#555;">Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ®:</label><input type="date" id="bp-date-select" value="' + planDate + '" style="padding:6px 10px;border:2px solid #e65100;border-radius:8px;font-size:14px;font-family:Cairo,sans-serif;" onchange="recalcBreadPlanForDate()"></div>' +
        '<p style="font-size:11px;color:#999;margin:0 0 14px;">Ø§Ø¶Ø¨Ø· Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¯ Ø­Ø³Ø¨ Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙØ¹Ù„ÙŠ Ù„ÙƒÙ„ ÙØ¦Ø©</p>' +
        '<div style="text-align:right;">' +
        '<div style="background:#e8f5e9;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #c8e6c9;">' +
        '<div style="font-weight:700;color:#1b5e20;margin-bottom:8px;font-size:14px;">ðŸž Ø®Ø¨Ø² Ø§Ù„Ø¹Ù…Ø§Ù„ ÙˆØ§Ù„Ø¶ÙŠÙˆÙ</div>' +
        '<div style="font-size:13px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #2e7d32;"><span>ðŸ‘¤ Ø¹Ù…Ø§Ù„ (Ø§Ù„Ø­Ø¶ÙˆØ±: ' + pCount + ')</span><input type="number" id="bp-workers" min="0" value="' + pCount + '" style="width:70px;padding:4px 6px;border:1px solid #a5d6a7;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #558b2f;"><span>ðŸ§‘â€ðŸŒ¾ Ø¹Ù…Ø§Ù„ Ø§Ù„Ø£Ø±Ø¶</span><input type="number" id="bp-ground" min="0" value="40" style="width:70px;padding:4px 6px;border:1px solid #aed581;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #e91e63;"><span>ðŸ‘© Ø³ÙŠØ¯Ø§Øª</span><input type="number" id="bp-women" min="0" value="55" style="width:70px;padding:4px 6px;border:1px solid #f48fb1;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #1565c0;"><span>ðŸŽ’ Ø·Ù„Ø¨Ø© (Ø§Ù„Ø­Ø¶ÙˆØ±: ' + studentCount + ')</span><input type="number" id="bp-students" min="0" value="' + studentCount + '" style="width:70px;padding:4px 6px;border:1px solid #90caf9;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #78909c;"><span>ðŸš— Ø¶ÙŠÙˆÙ Ø¢Ø®Ø±ÙŠÙ† (Ø§Ù„Ø­Ø¶ÙˆØ±: ' + otherGuestsCount + ')</span><input type="number" id="bp-other" min="0" value="' + otherGuestsCount + '" style="width:70px;padding:4px 6px;border:1px solid #b0bec5;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;border-right:4px solid #37474f;"><span>ðŸŒ™ Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ù„ÙŠÙ„ÙŠ (Ã— 2 Ø±ØºÙŠÙ)</span><input type="number" id="bp-night" min="0" value="12" style="width:70px;padding:4px 6px;border:1px solid #90a4ae;border-radius:4px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></div>' +
        '</div></div>' +
        '<div style="background:#fff8e1;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #ffe082;">' +
        '<div style="font-weight:700;color:#e65100;margin-bottom:8px;font-size:14px;display:flex;justify-content:space-between;align-items:center;"><span>ðŸ‘· Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†</span><button onclick="addBreadPlanCtrRow()" style="padding:4px 12px;background:#e65100;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">âž• Ø¥Ø¶Ø§ÙØ© Ù…Ù‚Ø§ÙˆÙ„</button></div>' +
        '<div style="max-height:150px;overflow-y:auto;"><table id="bread-plan-ctr-table" style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;">Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;width:80px;">Ø±ØºÙŠÙ ØªÙ…</th><th style="padding:6px;background:#fff3e0;border:1px solid #e0e0e0;width:30px;"></th></tr></thead><tbody id="bread-plan-ctr-tbody"></tbody></table></div>' +
        '<div style="margin-top:8px;padding:8px;background:#fff;border-radius:6px;border:1px dashed #e65100;">' +
        '<div style="font-size:12px;font-weight:600;color:#e65100;margin-bottom:4px;">ðŸ“± Ø§Ù„ØµÙ‚ Ø±Ø³Ø§Ø¦Ù„ ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ù„Ø¥Ø¶Ø§ÙØªÙ‡Ù… ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹:</div>' +
        '<textarea id="wa-ctr-import" rows="2" style="width:100%;padding:6px;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;font-family:inherit;resize:vertical;" placeholder="Ù…Ù‚Ø§ÙˆÙ„ ÙØ§Ø±Ø³ Ù…Ø­Ù…Ø¯: 65&#10;Ø§Ø³Ø§Ù…Ù‡ Ø³Ù…ÙŠØ± Ù…Ù‚Ø§ÙˆÙ„: 105&#10;Ù…ØµØ·ÙÙŠ Ø¹Ù„ÙŠ Ù…Ù‚Ø§ÙˆÙ„: Ù¡Ù Ù "></textarea>' +
        '<button onclick="importWhatsAppCtrToBreadPlan()" style="margin-top:4px;padding:4px 12px;background:#075e54;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:Cairo,sans-serif;">ðŸ“¥ Ø§Ø³ØªÙŠØ±Ø§Ø¯</button>' +
        '<span id="wa-ctr-status" style="font-size:11px;color:#666;margin-right:8px;"></span>' +
        '</div>' +
        '</div>' +
        '<div style="background:#fff3e0;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #ffcc80;">' +
        '<div style="font-weight:700;color:#e65100;margin-bottom:8px;font-size:14px;">Ø¨ÙŠØ§Ù†Ø§Øª Ù†Ø³Ø® Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</div>' +
        '<div style="font-size:13px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;">' +
        '<span>Ø±ØºÙŠÙ:</span><b id="bp-loaves-workers">' + workerLoaves + '</b>' +
        '<span>Ø¹Ù…Ø§Ù„ Ø§Ù„Ø£Ø±Ø¶:</span><b id="bp-loaves-ground">40</b>' +
        '<span>Ø§Ù†Ø³Ø®:</span><b id="bp-loaves-women">' + womenLoaves + '</b>' +
        '<span>Ø§Ù„Ø¹Ø¯Ø¯:</span><b id="bp-loaves-students">' + studentLoaves + '</b>' +
        '<span>ÙŠØ¯ÙˆÙŠØ§Ù‹ ØªÙ…:</span><b id="bp-loaves-other">' + otherLoaves + '</b>' +
        '<span>ØªØ¹Ø¨Ø¦Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ø¯Ø¯ (5):</span><b id="bp-loaves-return">' + returnFromVacation + '</b>' +
        '<span>Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ù„ÙŠÙ„ÙŠ:</span><b id="bp-loaves-night">2</b>' +
        '<span>Ø§Ù„Ø£Ø±ØºÙØ©:</span><b id="bp-loaves-ctr">0</b>' +
        '<hr style="grid-column:span 2;border:none;border-top:1px dashed #e0e0e0;margin:4px 0;">' +
        '<span style="font-weight:700;">Ø³ÙŠØ¯Ø§Øª:</span><b style="color:#e65100;font-size:15px;" id="bread-plan-total-display">' + totalLoaves + ' Ø·Ù„Ø¨Ø©</b>' +
        '</div></div>' +
        '</div>' +
        '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
        '<button onclick="generateBreadPlanReport()" style="padding:10px 24px;background:#1b5e20;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-family:Cairo,sans-serif;font-weight:700;">ðŸ“„ ØªÙˆÙ„ÙŠØ¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±</button>' +
        '<button onclick="document.getElementById(\'bread-plan-modal\').remove()" style="padding:10px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-family:Cairo,sans-serif;">Ø¥ØºÙ„Ø§Ù‚</button>' +
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
        if (h.type === 'Ø§Ù„ØªØ§Ø±ÙŠØ®') womenCount += g;
        else if (h.type === 'Ø¹Ø¯Ù‘Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ®') studentCount += g;
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
      tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="bpname-' + id + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;" placeholder="ÙˆØ§Ù„Ø£Ø±Ù‚Ø§Ù… Ø¨Ø±Ø§Ø­ØªÙƒ"></td><td style="border:1px solid #e0e0e0;padding:4px;width:80px;"><input type="number" id="bpqty-' + id + '" min="0" value="0" style="width:70px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:30px;"><button onclick="removeBreadPlanCtrRow(\'bprow-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">âœ•</button></td>';
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
      if (et) et.textContent = total + ' Ø§Ù„ØªÙ‚Ø±ÙŠØ±';
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
        if (h.type === 'Ù†Ø³Ø§Ø¡') womenCount += g;
        else if (h.type === 'Ø£Ø¬Ø§Ù†Ø¨') studentCount += g;
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
      var fullHtml = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø´Ø®Ø§Øµ Ø¹Ø¯Ù‘Ù„</title>' +
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
        '<h1>ØªÙ‚Ø±ÙŠØ± Ø®Ø·Ø© ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø®Ø¨Ø²</h1><div class="rp-date">Ø®Ø·Ø© ÙŠÙˆÙ… ' + dateArabic + ' (' + planDate + ')</div></div>' +
        '<div class="rp-section"><div class="rp-summary"><span class="rp-summary-icon">ðŸž</span><span class="rp-summary-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©</span><span class="rp-summary-value" style="font-weight:700;color:#e65100;font-size:16px;">' + totalLoaves + ' Ø±ØºÙŠÙ</span></div></div>' +
        '<div class="rp-section"><h3 style="color:#1b5e20;font-size:14px;margin:0 0 6px;">ØªÙØµÙŠÙ„ Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø¹Ù„Ù‰ Ø§Ù„ÙØ¦Ø§Øª</h3>' +
        '<table class="rp-table"><tr><th>Ø§Ù„ÙØ¦Ø©</th><th>Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©</th></tr>' +
        '<tr><td>Ø§Ù„Ø¹Ù…Ø§Ù„ (' + bpWorkers + ' Ã— 6)</td><td style="text-align:center;">' + workerLoaves + '</td></tr>' +
        '<tr><td>Ø¹Ù…Ø§Ù„ Ø§Ù„Ø£Ø±Ø¶</td><td style="text-align:center;">' + groundLoaves + '</td></tr>' +
        '<tr><td>Ø§Ù„Ø³ÙŠØ¯Ø§Øª (' + bpWomen + ' Ã— 2)</td><td style="text-align:center;">' + womenLoaves + '</td></tr>' +
        '<tr><td>Ø§Ù„Ø·Ø§Ù„Ø¨Ø§Øª (' + bpStudents + ' Ã— 2)</td><td style="text-align:center;">' + studentLoaves + '</td></tr>' +
        '<tr><td>Ø¶ÙŠÙˆÙ Ø¢Ø®Ø±ÙˆÙ† (' + bpOther + ' Ã— 6)</td><td style="text-align:center;">' + otherLoaves + '</td></tr>' +
        '<tr><td>Ø§Ù„Ø¹Ø§Ø¦Ø¯ Ù…Ù† Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©</td><td style="text-align:center;">' + returnFromVacation + '</td></tr>' +
        '<tr><td>Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ù„ÙŠÙ„ÙŠ (' + nightSecurity + ' Ã— 2)</td><td style="text-align:center;">' + nightLoaves + '</td></tr>' +
        '<tr style="background:#e8f5e9;font-weight:700;"><td>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø£Ø±ØºÙØ© Ø§Ù„Ù…Ø²Ø±Ø¹Ø©</td><td style="text-align:center;">' + (farmLoaves + returnFromVacation + nightLoaves) + '</td></tr>' +
        '</table></div>' +
        (contractorsData.length > 0 ? '<div class="rp-section"><h3 style="color:#e65100;font-size:14px;margin:0 0 6px;">ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†</h3><table class="rp-table"><tr><th>Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„</th><th>Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©</th></tr>' + contractorsData.map(function(c) { return '<tr><td>' + c.name + '</td><td style="text-align:center;">' + c.qty + '</td></tr>'; }).join('') + '<tr style="background:#fff8e1;font-weight:700;"><td>Ø¥Ø¬Ù…Ø§Ù„ÙŠ ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†</td><td style="text-align:center;">' + ctrLoaves + '</td></tr></table></div>' : '') +
        '<div class="rp-section" style="background:#fff3e0;border-radius:8px;padding:10px;border:1px solid #ffcc80;text-align:center;font-size:15px;font-weight:700;color:#e65100;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ©: ' + totalLoaves + ' Ø±ØºÙŠÙ</div>' +
        '<div class="rp-footer">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ© | ' + dateArabic + '</div>' +
        '</div></body></html>';
      try {
        var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'ØªÙˆÙ„ÙŠØ¯_Ø§Ù„ØªÙ‚Ø±ÙŠØ±_' + planDate + '.html';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
      } catch(e) {
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(fullHtml); w.document.close(); }
          else { alert('Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø©'); }
        } catch(e2) { alert('Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„: ' + e.message); }
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
        document.getElementById('login-screen').classList.remove('hidden');
        updateCurrentUserDisplay();
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
      if (currentUser === 'Ø³Ø§Ù„Ù… Ù…Ø¬Ø¯ÙŠ') document.body.classList.add('backup-allowed');
    }

    var _dataChangedSinceBackup = false;
    function showLoginAlert(name) { /* removed per user request */ }
    function updateHousingStats() {
      let totalBeds = manualTotalBeds > 0 ? manualTotalBeds : roomsCapacity.reduce((s, rc) => s + (parseInt(rc.beds) || 0), 0);
      let occupiedBeds = employees.filter(e => (e.status === 'P' || e.status === 'V') && e.room).length;
      let inp = document.getElementById('stat-total-beds-input');
      if (inp) { inp.value = totalBeds; inp.style.borderColor = manualTotalBeds > 0 ? '#e65100' : '#e0e0e0'; }
      document.getElementById('stat-occupied-beds').innerText = occupiedBeds;
      document.getElementById('stat-vacant-beds').innerText = Math.max(0, totalBeds - occupiedBeds);
    }

    function updateManualTotalBeds(val) {
      manualTotalBeds = parseInt(val) || 0;
      _lsSet('lineh_manual_total_beds', manualTotalBeds);
      syncStorage(); updateHousingStats(); renderDashboard(); renderQuickActions();
    }

    function captureDailyStats() {
      var today = new Date().toISOString().split('T')[0];
      var total = employees.length;
      var perm = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'Ø¯Ø§Ø¦Ù…'; });
      var casual = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'ÙƒØ§Ø¬ÙˆÙ„'; });
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
          if ((e.contract || 'Ø¯Ø§Ø¦Ù…') === 'Ø¯Ø§Ø¦Ù…') { if (isPresent) permP++; else permV++; }
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
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="padding:15px;color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯</td></tr>'; return; }
      var cols = ['Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', 'Ø¯Ø§Ø¦Ù… Ø­Ø§Ø¶Ø±', 'Ø¯Ø§Ø¦Ù… Ø¥Ø¬Ø§Ø²Ø©', 'ÙƒØ§Ø¬ÙˆÙ„ Ø­Ø§Ø¶Ø±', 'ÙƒØ§Ø¬ÙˆÙ„ Ø¥Ø¬Ø§Ø²Ø©', 'Ø¶ÙŠÙˆÙ'];
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
        var avgRow = '<td style="padding:5px;border:2px solid #1b5e20;font-weight:900;background:#e8f5e9;">Ù…Ø¹Ø¯Ù„ (' + data.length + ')</td>';
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
      if (!fromDate || !toDate) return alert('Ø§Ù„Ø®Ø¨Ø² Ù„Ù„ØºØ¯ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ© Ø±ØºÙŠÙ');
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
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" style="padding:15px;color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù†Ø·Ø§Ù‚</td></tr>'; return; }
      // Summary cards
      var totals = { flour:0, bran:0, salt:0, yeast:0, diesel:0, breadFarm:0, breadCtr:0, breadTotal:0 };
      data.forEach(function(s) { totals.flour += s.flour; totals.bran += s.bran; totals.salt += s.salt; totals.yeast += s.yeast; totals.diesel += s.diesel; totals.breadFarm += s.breadFarm; totals.breadCtr += s.breadCtr; totals.breadTotal += s.breadTotal; });
      var cards = document.getElementById('bakery-summary-cards');
      if (cards) cards.innerHTML = [
        { label: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ©', val: totals.breadTotal, color: '#1b5e20' },
        { label: 'Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)', val: Math.round(totals.flour*100)/100, color: '#37474f' },
        { label: 'Ø±Ø¯Ø© (ÙƒØ¬Ù…)', val: Math.round(totals.bran*100)/100, color: '#37474f' },
        { label: 'Ù…Ù„Ø­ (ÙƒØ¬Ù…)', val: Math.round(totals.salt*100)/100, color: '#37474f' },
        { label: 'Ø®Ù…ÙŠØ±Ø© (ÙƒØ¬Ù…)', val: Math.round(totals.yeast*100)/100, color: '#37474f' },
        { label: 'Ø³ÙˆÙ„Ø§Ø± (Ù„ØªØ±)', val: Math.round(totals.diesel*100)/100, color: '#37474f' }
      ].map(function(c) {
        return '<div style="background:' + c.color + ';color:white;padding:6px 14px;border-radius:8px;font-size:12px;text-align:center;min-width:100px;"><div style="font-weight:700;font-size:16px;">' + c.val + '</div><div style="font-size:10px;opacity:0.9;">' + c.label + '</div></div>';
      }).join('');
      var cols = ['Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø®Ø¨Ø² Ø§Ù„Ù…Ø²Ø±Ø¹Ø©', 'Ø®Ø¨Ø² Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†', 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', 'Ø¯Ù‚ÙŠÙ‚', 'Ø±Ø¯Ø©', 'Ù…Ù„Ø­', 'Ø®Ù…ÙŠØ±Ø©', 'Ø³ÙˆÙ„Ø§Ø±'];
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
      if (!fromDate || !toDate) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ®');
      var data = computeBakeryConsumptionForRange(fromDate, toDate);
      if (!data.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù†Ø·Ø§Ù‚');
      data.slice().reverse();
      var xlData = data.map(function(s) {
        return { 'Ø§Ù„ØªØ§Ø±ÙŠØ®': s.date, 'Ø®Ø¨Ø² Ø§Ù„Ù…Ø²Ø±Ø¹Ø©': s.breadFarm, 'Ø®Ø¨Ø² Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†': s.breadCtr, 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ©': s.breadTotal, 'Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)': s.flour, 'Ø±Ø¯Ø© (ÙƒØ¬Ù…)': s.bran, 'Ù…Ù„Ø­ (ÙƒØ¬Ù…)': s.salt, 'Ø®Ù…ÙŠØ±Ø© (ÙƒØ¬Ù…)': s.yeast, 'Ø³ÙˆÙ„Ø§Ø± (Ù„ØªØ±)': s.diesel };
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
              label: 'Ø®Ø¨Ø² Ø§Ù„Ù…Ø²Ø±Ø¹Ø© (Ø±ØºÙŠÙ)',
              data: data.map(function(s) { return s.breadFarm; }),
              backgroundColor: '#e65100',
              borderRadius: 3,
              order: 2
            },
            {
              label: 'Ø®Ø¨Ø² Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† (Ø±ØºÙŠÙ)',
              data: data.map(function(s) { return s.breadCtr; }),
              backgroundColor: '#ff8a65',
              borderRadius: 3,
              order: 2
            },
            {
              label: 'Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)',
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
              title: { display: true, text: 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©', font: { size: 11 } },
              ticks: { font: { size: 10 } }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              title: { display: true, text: 'Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)', font: { size: 11 } },
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
      document.getElementById('stat-total-emp').innerText = employees.length;
      document.getElementById('stat-p-emp').innerText = employees.filter(e => e.status === 'P').length;
      document.getElementById('stat-v-emp').innerText = employees.filter(e => e.status === 'V').length;
      document.getElementById('stat-total-vouchers').innerText = inventoryVouchers.length;
      
      let itemsDisbursed = 0;
      inventoryVouchers.forEach(v => itemsDisbursed += (parseInt(v.qty) || 0));
      document.getElementById('stat-total-items-disbursed').innerText = itemsDisbursed;
      document.getElementById('stat-registered-items').innerText = inventoryItems.length;

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
      // Ø¨ÙŠØ§Ù†Ø§Øª: editable, not required
      codeField.readOnly = false;
      codeField.style.background = '#fff';
      codeField.style.cursor = 'text';
      if (contract === 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ') {
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
          d.innerText = `[${p.code || 'â€”'}] ${p.name}${p.dept ? ' | ' + p.dept : ''}`;
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
      let opt0 = document.createElement('option'); opt0.value = '';       opt0.textContent = '-- Ø§Ø®ØªØ± Ø§Ù„ÙˆØ¸ÙŠÙØ© --';
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
      row.innerHTML = '<input type="text" placeholder="ÙƒØ¬Ù… Ø³ÙˆÙ„Ø§Ø± Ù„ØªØ±" class="extra-asset-name" value="' + itemName + '" style="flex:2;"><input type="number" min="1" class="extra-asset-qty" value="' + itemQty + '" style="flex:1;"><button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Ø­Ø°Ù</button>';
      container.appendChild(row);
    }

    /* ===== Ø®Ø¨Ø² employee asset management (from flexible admin) ===== */
    var _DEFAULT_ASSETS = ["Ø§Ù„ÙØ±Ù† 8 ØªÙˆØ±ÙŠØ¯","Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† 6 Ø¥Ø¬Ù…Ø§Ù„ÙŠ","Ø§Ù„Ø®Ø¨Ø² Ø¯Ù‚ÙŠÙ‚ / ÙƒØ¬Ù… Ø±Ø¯Ø©","ÙƒØ¬Ù…","Ù…Ù„Ø­","ÙƒØ¬Ù…","Ø®Ù…ÙŠØ±Ø©","ÙƒØ¬Ù… Ø³ÙˆÙ„Ø§Ø±","Ù„ØªØ± Ø­Ø¯Ø¯","ØªØ§Ø±ÙŠØ® 2 Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©","ÙˆØ§Ù„Ù†Ù‡Ø§ÙŠØ© + 2 Ø£ÙˆÙ„Ø§Ù‹","Ù„Ø§","ØªÙˆØ¬Ø¯","Ø¨ÙŠØ§Ù†Ø§Øª","Ø§Ù„ØªØ§Ø±ÙŠØ®","Ø®Ø¨Ø² Ø§Ù„ÙØ±Ù† ØªÙˆØ±ÙŠØ¯","Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ø¥Ø¬Ù…Ø§Ù„ÙŠ","Ø§Ù„Ø®Ø¨Ø² Ø¯Ù‚ÙŠÙ‚","ÙƒØ¬Ù… Ø±Ø¯Ø©","ÙƒØ¬Ù…","Ù…Ù„Ø­ ÙƒØ¬Ù…"];

    function searchAssetEmployee() {
      var q = document.getElementById('asset-emp-search').value.trim().toLowerCase();
      var display = document.getElementById('asset-emp-display');
      var idField = document.getElementById('asset-emp-id');
      var area = document.getElementById('asset-edit-area');
      if (!q) { display.textContent = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø®Ù…ÙŠØ±Ø© ÙƒØ¬Ù…'; area.style.display = 'none'; idField.value = ''; return; }
      var emp = null;
      for (var i = 0; i < employees.length; i++) {
        var e = employees[i];
        if ((e.code && e.code.toLowerCase() === q) || (e.name && e.name.toLowerCase().indexOf(q) !== -1)) { emp = e; break; }
      }
      if (!emp) { display.textContent = 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ±Ø¯'; area.style.display = 'none'; idField.value = ''; return; }
      idField.value = emp.id;
      display.textContent = 'Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† ' + emp.name + ' (' + (emp.code || 'Ø¯Ù‚ÙŠÙ‚ ÙƒØ¬Ù…') + ') â€” ' + (emp.dept || '') + ' | ' + (emp.title || '');
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
      row.innerHTML = '<input type="text" class="asset-extra-name" placeholder="Ø¹Ø¯Ø¯ Ø£Ø±ØºÙØ©" value="' + item.replace(/"/g,'&quot;') + '" style="flex:2;padding:4px 8px;border:2px solid #e0e0e0;border-radius:4px;font-size:12px;"><input type="number" class="asset-extra-qty" value="' + qty + '" min="1" style="width:60px;padding:4px;border:2px solid #e0e0e0;border-radius:4px;font-size:12px;"><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:2px 6px;font-size:11px;">Ø­Ø°Ù</button>';
      container.appendChild(row);
    }

    function addAssetField(item, qty) { addExtraAssetField(item, qty); }

    function saveAssetEmployee() {
      var id = document.getElementById('asset-emp-id').value;
      if (!id) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ¸Ù');
      var emp = null;
      for (var i = 0; i < employees.length; i++) { if (employees[i].id === id) { emp = employees[i]; break; } }
      if (!emp) return alert('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¸Ù');
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
      alert('ØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø£ØµÙˆÙ„ Ø§Ù„Ù…ÙˆØ¸Ù ' + emp.name + ' Ø¨Ù†Ø¬Ø§Ø­');
    }

    function exportAssetsExcel() {
      var data = [];
      employees.forEach(function(e) {
        if (e.assets && e.assets.length > 0) {
          e.assets.forEach(function(a) {
            data.push({ 'Ù‡Ù„': e.code || '', 'Ø¯ÙŠØ³Ù…Ø¨Ø±': e.name, 'Ù†ÙˆÙÙ…Ø¨Ø±': e.dept || '', 'Ø£ÙƒØªÙˆØ¨Ø±': e.title || '', 'Ø³Ø¨ØªÙ…Ø¨Ø±': a.item, 'Ø£ØºØ³Ø·Ø³': a.qty });
          });
        } else {
          data.push({ 'ÙŠÙˆÙ„ÙŠÙˆ': e.code || '', 'ÙŠÙˆÙ†ÙŠÙˆ': e.name, 'Ù…Ø§ÙŠÙˆ': e.dept || '', 'Ø£Ø¨Ø±ÙŠÙ„': e.title || '', 'Ù…Ø§Ø±Ø³': '', 'ÙØ¨Ø±Ø§ÙŠØ±': '' });
        }
      });
      if (data.length === 0) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø£ØµÙˆÙ„ Ù„Ù„ØªØµØ¯ÙŠØ±');
      var ws = XLSX.utils.json_to_sheet(data);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assets');
      XLSX.writeFile(wb, 'Ø¨Ù†Ø¬Ø§Ø­_ØªÙ‚ÙŠÙŠÙ…_' + new Date().toISOString().split('T')[0] + '.xlsx');
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
            var code = (r['Ø­ÙØ¸'] || '').toString().trim();
            var name = (r['ØªÙ…'] || '').toString().trim();
            var item = (r['Ø¬Ø¯ÙŠØ¯ØŸ'] || '').toString().trim();
            var qty = parseInt(r['ØªÙ‚ÙŠÙŠÙ…']) || 1;
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
          alert('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ØµÙˆÙ„ Ù„Ù€ ' + updated + ' Ù…ÙˆØ¸Ù.');
        } catch(err) { alert('ØªØ¹Ø°Ø± Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ØµÙˆÙ„: ' + err.message); }
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
      if (sorted.length === 0) { document.getElementById('asset-summary-container').innerHTML = '<span style="color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ØµÙˆÙ„ Ù…Ø³Ø¬Ù„Ø©</span>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f5f5f5;position:sticky;top:0;"><th style="padding:6px;border:1px solid #ddd;text-align:right;">#</th><th style="padding:6px;border:1px solid #ddd;text-align:right;">ÙˆØ¸ÙŠÙØ©</th><th style="padding:6px;border:1px solid #ddd;text-align:center;">Ø³Ø±ÙŠØ±</th></tr></thead><tbody>';
      sorted.forEach(function(item, idx) {
        html += '<tr><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">' + (idx + 1) + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + item + '</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:700;color:#e65100;">' + summary[item] + '</td></tr>';
      });
      html += '</tbody></table>';
      document.getElementById('asset-summary-container').innerHTML = html;
    }

    function printEmployeeAssetStatement() {
      var id = document.getElementById('asset-emp-id').value;
      if (!id) return alert('Ø£Ø¯Ø®Ù„ ÙƒÙˆØ¯ Ø§Ù„Ø¹Ø§Ù…Ù„.');
      var emp = employees.find(function(e) { return e.id === id; });
      if (!emp) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¹Ø§Ù…Ù„.');
      var rows = '';
      if (emp.assets && emp.assets.length > 0) {
        var total = 0;
        emp.assets.forEach(function(a) { total += a.qty; rows += '<tr><td style="padding:6px 12px;border:1px solid #333;">' + a.item + '</td><td style="padding:6px 12px;border:1px solid #333;text-align:center;">' + a.qty + '</td></tr>'; });
        rows += '<tr style="background:#f5f5f5;font-weight:700;"><td style="padding:6px 12px;border:1px solid #333;text-align:left;">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td><td style="padding:6px 12px;border:1px solid #333;text-align:center;">' + total + '</td></tr>';
      } else {
        rows = '<tr><td colspan="2" style="padding:12px;text-align:center;color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù‡Ø¯Ø© Ù…Ø³Ø¬Ù„Ø©</td></tr>';
      }
      var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ÙƒØ´Ù Ø¹Ù‡Ø¯Ø© - ' + emp.name + '</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{padding:8px 12px;border:1px solid #333;text-align:right;}th{background:#e65100;color:#fff;}.header{text-align:center;margin-bottom:20px;}.header h2{margin:0;color:#e65100;}.info{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:15px;font-size:13px;}.info div{flex:1;min-width:120px;}.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.06;font-size:80px;pointer-events:none;z-index:-1;}</style></head><body><div class="watermark">LINAHSYSTEM</div><div class="header"><h2>ÙƒØ´Ù Ø¹Ù‡Ø¯Ø©</h2><p style="font-size:14px;color:#888;">Ù†Ø¸Ø§Ù… Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„</p></div><div class="info"><div><b>Ø§Ù„Ø¹Ø§Ù…Ù„:</b> ' + emp.name + '</div><div><b>Ø§Ù„ÙƒÙˆØ¯:</b> ' + (emp.code || 'â€”') + '</div><div><b>Ø§Ù„Ù‚Ø³Ù…:</b> ' + (emp.dept || 'â€”') + '</div><div><b>Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ:</b> ' + (emp.title || 'â€”') + '</div></div><table><thead><tr><th>Ø§Ù„ØµÙ†Ù</th><th style="text-align:center;">Ø§Ù„Ø¹Ø¯Ø¯</th></tr></thead><tbody>' + rows + '</tbody></table><div style="margin-top:15px;font-size:11px;color:#888;text-align:center;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©: ' + new Date().toLocaleDateString('ar-EG') + '</div></body></html>';
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
      if (results.length === 0) { container.innerHTML = '<span style="color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</span>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">Ø§Ù„ÙƒÙˆØ¯</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">Ø§Ù„Ø¹Ø§Ù…Ù„</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">Ø§Ù„ØµÙ†Ù</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:center;">Ø§Ù„Ø¹Ø¯Ø¯</th></tr></thead><tbody>';
      results.forEach(function(r) {
        html += '<tr><td style="padding:4px 8px;border:1px solid #ddd;">' + (r.emp.code || '') + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + r.emp.name + '</td><td style="padding:4px 8px;border:1px solid #ddd;">' + r.item + '</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">' + r.qty + '</td></tr>';
      });
      html += '</tbody></table><div style="margin-top:4px;color:#888;font-size:11px;">ÙŠØªÙ… Ø§Ù„Ø§Ø®ØªÙŠØ§Ø±: ' + results.length + '</div>';
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

      if(!name) return alert("Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸Ù Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø§Ø³Ù…");

      if(!editId) {
        let dupCode = employees.find(e => e.code && e.code.toLowerCase() === code.toLowerCase());
        if(dupCode) return alert("Ø§Ù„ÙƒÙˆØ¯ [" + code + "] Ù…Ø³Ø¬Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹ Ø¨Ø§Ø³Ù… [" + dupCode.name + "].\nØ§Ù„Ø­Ø§Ù„Ø©: " + (dupCode.status === 'P' ? 'Ù…ØªÙˆØ§Ø¬Ø¯' : 'ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©') + "\nØ§Ù„Ø¥Ø¯Ø§Ø±Ø©: " + (dupCode.dept || 'â€”') + "\nØªØ£ÙƒØ¯ Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø¶Ø§ÙØ©.");
        let dupExcl = excludedEmployees.find(e => e.code && e.code.toLowerCase() === code.toLowerCase());
        if(dupExcl) return alert("Ø§Ù„ÙƒÙˆØ¯ [" + code + "] Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹ ÙÙŠ Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ† Ø¨Ø§Ø³Ù… [" + dupExcl.name + "].\nØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ¨Ø¹Ø§Ø¯: " + (dupExcl.date || 'â€”') + "\nØ§Ù„Ø³Ø¨Ø¨: " + (dupExcl.reason || 'â€”') + "\nÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.");
        let similarName = employees.find(e => e.name && e.name.trim().toLowerCase() === name.toLowerCase());
        if(similarName) {
          if(!confirm("ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸Ù Ø¨Ù†ÙØ³ Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¶Ø¨Ø·: [" + similarName.name + "] ÙƒÙˆØ¯ " + (similarName.code || 'Ø¨Ø¯ÙˆÙ†') + ".\nÙ‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ÙˆØ¸Ù Ø±ØºÙ… Ø§Ù„ØªØ´Ø§Ø¨Ù‡ØŸ")) return;
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
      document.getElementById('modal-emp-title').innerText = 'Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¸Ù Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ù‚ÙˆØ©';
    }

    function resetAddEmpForm() {
      document.getElementById('edit-emp-id').value = '';
      document.getElementById('modal-emp-title').innerText = 'Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¸Ù Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ù‚ÙˆØ©';
      document.getElementById('form-emp-code').value = ''; document.getElementById('form-emp-code').readOnly = false; document.getElementById('form-emp-code').style.background = '#fff';
      document.getElementById('form-emp-name').value = ''; document.getElementById('form-emp-contract').value = 'Ø¯Ø§Ø¦Ù…';
      document.getElementById('form-emp-national-id').value = ''; document.getElementById('form-emp-hire-date').value = '';
      document.getElementById('form-emp-status').value = 'P'; document.getElementById('form-emp-vacation-balance').value = 30;
      document.getElementById('form-emp-dept').value = ''; document.getElementById('form-emp-title-select').value = '';
      document.getElementById('form-emp-gov').value = ''; document.getElementById('form-emp-sector').value = '';
      document.getElementById('form-emp-room').innerHTML = '<option value="">Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø£ÙˆÙ„Ø§Ù‹</option>';
      document.querySelectorAll('.default-asset').forEach(function(inp){ inp.value = 0; });
      document.getElementById('assets-form-container').innerHTML = '';
      document.getElementById('form-emp-name').focus();
    }
    function editEmployee(id) {
      let emp = employees.find(e => e.id == id);
      if(!emp) return;
      document.getElementById('edit-emp-id').value = emp.id;
      document.getElementById('modal-emp-title').innerText = "ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¸Ù";
      document.getElementById('form-emp-code').value = emp.code || '';
      document.getElementById('form-emp-name').value = emp.name || '';
      document.getElementById('form-emp-contract').value = emp.contract || 'Ø¯Ø§Ø¦Ù…';
      // Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¹Ù‡Ø¯ ØªÙ… ØªØ­Ø¯ÙŠØ« Ù…ÙˆØ¸Ù Ø®Ø·Ø£
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
      let assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('ØŒ ') : "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù‡ÙˆØ¯ Ø³Ø±ÙŠØ±ÙŠØ©";
      document.getElementById('exclude-emp-summary').innerHTML = `
        <b>Ø§Ù„ØµÙ†Ù Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:</b> ${emp.name}<br>
        <b>Ø§Ø®ØªØ±:</b> ${emp.code || 'Ù…ÙˆØ¸ÙØ§Ù‹'} | <b>Ø£ÙˆÙ„Ø§Ù‹:</b> ${emp.title}<br>
        <b>Ø§Ù„Ù…ÙˆØ¸Ù ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯:</b> <span style="color:red; font-weight:600;">${assetsStr}</span>
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
      let assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('ØŒ ') : "Ù„Ø§ ÙŠÙˆØ¬Ø¯";

      let excludedRecord = Object.assign({}, emp);
      excludedRecord.date = new Date().toISOString().split('T')[0];
      excludedRecord.reason = extraNotes ? `${reason} (${extraNotes})` : reason;
      excludedRecord.assetsStr = (emp.assets && emp.assets.length > 0) ? emp.assets.map(a => `${a.item} (${a.qty})`).join('ØŒ ') : "Ù„Ø§ ÙŠÙˆØ¬Ø¯";

      excludedEmployees.push(excludedRecord);
      _logDeletion('employees', emp.id || emp.code || emp.name);
      employees.splice(idx, 1);

      rebuildDeptTitles();
      syncStorage(); renderTable(); rebuildAllDropdowns(); closeModal('modal-exclude-emp');
      document.getElementById('exclude-notes-input').value = '';
      alert(`ØªÙ… Ø§Ø³ØªØ¨Ø¹Ø§Ø¯ Ø§Ù„Ù…ÙˆØ¸Ù [${excludedRecord.name}] ÙˆØªØ³Ø¬ÙŠÙ„ Ø¹Ù‡Ø¯ØªÙ‡ Ø§Ù„Ù…Ø³ØªÙ„Ù…Ø© Ø¨Ù†Ø¬Ø§Ø­.`);
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
          <td>${e.contract || 'â€”'}</td>
          <td>${e.nationalId || 'â€”'}</td>
          <td>${e.hireDate || 'â€”'}</td>
          <td><span style="color:var(--primary); font-weight:600;">${e.dept || 'â€”'}</span></td>
          <td>${e.title || 'â€”'}</td>
          <td>${e.gov || 'â€”'}</td>
          <td>${e.sector || 'â€”'}</td>
          <td>${e.room || 'â€”'}</td>
          <td><span class="status-badge ${e.status==='P'?'status-p':'status-v'}">${e.status==='P'?'Ù…ØªÙˆØ§Ø¬Ø¯':'ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©'}</span></td>
          <td style="font-size:11px; max-width:150px; color:#555;">${e.assetsStr || e.assets || 'â€”'}</td>
          <td><span style="color:var(--danger); font-weight:600;">${toArabicNumerals(e.date)}</span></td>
          <td><span style="font-style:italic; color:#d32f2f;">${e.reason}</span></td>
          <td class="no-print" style="display:flex;gap:4px;">
            <button class="btn btn-success" style="padding:2px 6px;font-size:11px;" onclick="restoreExcluded(${realIdx})">â†©ï¸ Ø§Ø³ØªØ±Ø¬Ø§Ø¹</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="permanentlyDeleteExcluded(${realIdx})">Ø­Ø°Ù Ù†Ù‡Ø§Ø¦ÙŠ</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function permanentlyDeleteExcluded(idx) { if (!requireAdmin()) return;
      if(confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ù…Ø³Ø­ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ ØªÙ…Ø§Ù…Ø§Ù‹ Ø­ØªÙ‰ Ù…Ù† Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØŸ")) {
        _logDeletion('excludedEmployees', excludedEmployees[idx].code || excludedEmployees[idx].name);
        excludedEmployees.splice(idx, 1); syncStorage(); renderExcludedTable();
      }
    }

    function restoreExcluded(idx) {
      var rec = excludedEmployees[idx];
      if (!rec) return;
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ø³ØªØ±Ø¬Ø§Ø¹ "' + rec.name + '" Ø¥Ù„Ù‰ Ù‚ÙˆØ© Ø§Ù„Ø¹Ù…Ù„ØŸ')) return;
      var assetsVal = rec.assets;
      if (typeof assetsVal === 'string' && assetsVal !== 'Ù„Ø§ ÙŠÙˆØ¬Ø¯' && assetsVal !== 'â€”') {
        assetsVal = [{ item: assetsVal, qty: 1 }];
      }
      if (!Array.isArray(assetsVal)) assetsVal = [];
      var emp = {
        id: Date.now().toString(),
        code: rec.code || '',
        name: rec.name,
        contract: rec.contract || 'Ø¯Ø§Ø¦Ù…',
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
      alert('ØªÙ…Øª Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¸Ù ' + rec.name + ' Ø¨Ù†Ø¬Ø§Ø­');
    }

// Ø¥Ø¬Ø¨Ø§Ø±ÙŠØ§Ù‹ Ø§Ù„ÙƒÙˆØ¯ Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹
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

// Ø¯Ø§Ù„Ø© ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø°ÙƒÙŠØ© Ù…Ø¹ ØªØ³Ø¬ÙŠÙ„ ÙˆÙ‚Øª Ø§Ù„Ù…ØºØ§Ø¯Ø±Ø© ØªÙ„Ù‚Ø§Ø¦ÙŠ
function toggleEmployeeStatus(empId) {
    let emp = employees.find(e => e.id == empId);
    if (emp) {
        let oldStatus = emp.status;
        if (emp.status === 'P') {
            emp.departureTime = new Date().toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
            emp.status = 'V';
        } else {
            emp.status = 'P';
            emp.departureTime = '';
        }
        _ts(emp);
        playChangeSound();
        syncStorage();
        logAction('ØªØ¹Ø¯ÙŠÙ„', 'Ø­Ø§Ù„Ø© Ù…ÙˆØ¸Ù', emp.name, 'Ù…Ù† ' + (oldStatus === 'P' ? 'ØªÙˆØ§Ø¬Ø¯' : 'Ø¥Ø¬Ø§Ø²Ø©') + ' Ø¥Ù„Ù‰ ' + (emp.status === 'P' ? 'ØªÙˆØ§Ø¬Ø¯' : 'Ø¥Ø¬Ø§Ø²Ø©'));
        renderTable(); renderDashboard();
        calculateSystemStats();
        autoLogTodayMeals(); renderMealLogTable();
    }
}
    function renderTable() {
      let q = document.getElementById('search-emp').value.toLowerCase();
      let statusFil = document.getElementById('filter-status').value;
      let contractFil = document.getElementById('filter-contract').value;
      let tbody = document.querySelector('#table-employees-data tbody');
      tbody.innerHTML = '';

      let filtered = employees.filter(e => {
        let matchSearch = (e.name||'').toLowerCase().includes(q) || 
                          ((e.code||'').toLowerCase() === q);
        let matchStatus = statusFil ? e.status === statusFil : true;
        let matchContract = contractFil ? e.contract === contractFil : true;
        return matchSearch && matchStatus && matchContract;
      });

      // Apply sort
      let st = sortState['table-employees-data'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);

      filtered.forEach(e => {
        let tr = document.createElement('tr');
        tr.dataset.index = employees.indexOf(e);
        let assetsStr = (e.assets && e.assets.length > 0) ? e.assets.map(a => `${a.item} (${a.qty})`).join('ØŒ ') : "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù‡Ø¯Ø©";

        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-employees-data"></td>
          <td><b>${e.code || ''}</b></td>
          <td>${e.name}</td>
          <td>${e.contract || 'Ø¯Ø§Ø¦Ù…'}</td>
          <td>${e.nationalId || 'â€”'}</td>
          <td>${e.hireDate || 'â€”'}</td>
          <td><span style="color:var(--primary); font-weight:600;">${e.dept || 'â€”'}</span></td>
          <td>${e.title || 'â€”'}</td>
          <td>${e.gov || 'â€”'}</td>
          <td>${e.sector || 'â€”'}</td>
          <td>${e.room || 'â€”'}</td>
          <td><span class="status-badge ${e.status==='P'?'status-p':'status-v'}">${e.status==='P'?'ØªÙˆØ§Ø¬Ø¯ P':`Ø¥Ø¬Ø§Ø²Ø© V ${e.departureTime?'(Ù…ØºØ§Ø¯Ø±Ø© '+e.departureTime+')':''}`}</span></td>
          <td class="no-print" style="display:none;">${assetsStr}</td>
          <td class="no-print" style="white-space:nowrap;">
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="editEmployee('${e.id}')">ðŸ“ ØªØ¹Ø¯ÙŠÙ„</button>
            <button class="btn btn-warning btn-sm"style="padding:4px 8px; font-size:11px;" onclick="toggleEmployeeStatus('${e.id}')">ðŸ”„ ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„Ø©</button>
            <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="openExclusionModal('${e.id}')">ðŸš« Ø§Ø³ØªØ¨Ø¹Ø§Ø¯</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      renderHousingLayout();
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
          if (!_lsGet('_roomsRebuiltWarned')) { console.warn('ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© Ø¨Ù†Ø§Ø¡ ' + arr.length + ' ØºØ±ÙØ©/Ù…Ø¨Ù†Ù‰ Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ† (roomsCapacity ÙƒØ§Ù† ÙØ§Ø¶ÙŠ)'); _lsSet('_roomsRebuiltWarned', '1'); }
          syncStorage();
        }
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
          if (typeof layout !== 'undefined') layout.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø³ÙƒÙ† â€” Ø§Ø³ØªØ®Ø¯Ù… Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø£Ùˆ Ø£Ø¶Ù Ù…Ø¨Ø§Ù†ÙŠ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø±Ù†Ø©</div>';
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
        block.innerHTML = `<div class="sector-title" style="display:flex;justify-content:space-between;align-items:center;">Ø§Ù„Ù…Ø¨Ù†Ù‰: ${sector}</div>`;

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
          card.innerHTML = '<div class="room-header"><span>\u0627\u0644\u063A\u0631\u0641\u0629: ' + room.number + '</span><span class="room-beds">\u0627\u0644\u0625\u0634\u063A\u0627\u0644: ' + roomUsers.length + ' / \u0627\u0644\u0633\u0639\u0629: ' + room.beds + '</span></div><div class="room-users">' + (userBadges || '<span style=\"color:#b0bec5;font-size:12px;font-style:italic;\">\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0627\u0644</span>') + '</div><div style="display:flex;gap:4px;margin-top:6px;"></div>';
          roomsContainer.appendChild(card);
        });
        block.appendChild(roomsContainer); layout.appendChild(block);
      });
    }

    function diagnoseAndFixHousing() {
      if (!requireAdmin()) return;
      var validSectors = {};
      roomsCapacity.forEach(function(rc) { validSectors[rc.sector] = true; });
      var validSectorList = Object.keys(validSectors);
      if (validSectorList.length === 0) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¨Ø§Ù†Ù Ø£Ùˆ ØºØ±Ù Ù…Ø³Ø¬Ù„Ø©. Ø£Ø¶Ù Ù…Ø¨Ù†Ù‰ ÙˆØºØ±Ù Ø£ÙˆÙ„Ø§Ù‹.'); return; }

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
      if (pending.length === 0) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙˆÙ† Ø¨Ø­Ø§Ø¬Ø© Ø¥Ù„Ù‰ Ø¥ØµÙ„Ø§Ø­ Ø³ÙƒÙ†Ù‡Ù….'); return; }

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
          var opt = document.createElement('option'); opt.value = ''; opt.textContent = '-- Ø§Ø®ØªØ± Ø§Ù„ØºØ±ÙØ© --'; roomSel.appendChild(opt); return;
        }
        var rooms = getAvailableRooms(sector);
        rooms.forEach(function(r) {
          var opt = document.createElement('option');
          opt.value = r.number;
          opt.textContent = r.number + ' (Ø§Ù„Ø³Ø¹Ø©: ' + r.beds + ')';
          roomSel.appendChild(opt);
        });
      }

      function applyCurrent(action) {
        if (action === 'save') {
          var emp = pending[currentIdx];
          var newSector = sectorSel.value;
          var newRoom = roomSel.value;
          if (!newSector || !newRoom) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ø¨Ù†Ù‰ ÙˆØ§Ù„ØºØ±ÙØ©'); return; }
          fixed.push({ emp: emp, oldSector: emp.sector, oldRoom: emp.room, newSector: newSector, newRoom: newRoom });
          emp.sector = newSector;
          emp.room = newRoom;
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
        var msg = 'Ù†ØªØ§Ø¦Ø¬ ØªØ´Ø®ÙŠØµ Ø§Ù„Ø³ÙƒÙ†:\n';
        msg += 'ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø³ÙƒÙ†: ' + fixed.length + ' Ù…ÙˆØ¸Ù\n';
        msg += 'ØªÙ… ØªØ®Ø·ÙŠ: ' + skipped.length + ' Ù…ÙˆØ¸Ù\n';
        if (fixed.length > 0) {
          msg += '\nØªÙ… Ù†Ù‚Ù„:\n';
          fixed.forEach(function(f, i) {
            msg += (i+1) + '. ' + f.emp.name + ' [' + (f.emp.code||'') + ']:\n';
            msg += '   ' + f.oldSector + '/' + f.oldRoom + ' â† ' + f.newSector + '/' + f.newRoom + '\n';
          });
        }
        alert(msg);
      }

      // Create overlay modal
      overlay = document.createElement('div');
      overlay.className = 'ov-modal-overlay';
      overlay.id = 'housing-fix-overlay';
      overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;';
      overlay.onclick = function(e) { if (e.target === overlay && confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ø§ÙØ°Ø©ØŸ')) { overlay.remove(); } };

      modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:20px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.2);direction:rtl;font-family:inherit;';
      modal.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
          '<h3 style="margin:0;color:#e65100;">ØªØ´Ø®ÙŠØµ ÙˆØ¥ØµÙ„Ø§Ø­ Ø³ÙƒÙ† Ø§Ù„Ù…ÙˆØ¸Ù</h3>' +
          '<span style="font-size:13px;color:#888;">Ø§Ù„Ù…ÙˆØ¸Ù <span id="hfix-idx">1</span> Ù…Ù† ' + pending.length + '</span>' +
        '</div>' +
        '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:15px;">' +
          '<div style="font-size:16px;font-weight:700;" id="hfix-name">-</div>' +
          '<div style="font-size:13px;color:#888;" id="hfix-code">-</div>' +
          '<div style="font-size:13px;color:#c62828;margin-top:6px;" id="hfix-old">-</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Ø§Ù„Ù…Ø¨Ù†Ù‰</label>' +
          '<select id="hfix-sector" style="width:100%;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:13px;" onchange="var evt=document.createEvent(\'HTMLEvents\');evt.initEvent(\'change\',true,true);document.getElementById(\'hfix-room\').dispatchEvent(evt);"></select>' +
        '</div>' +
        '<div style="margin-bottom:18px;">' +
          '<label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Ø§Ù„ØºØ±ÙØ©</label>' +
          '<select id="hfix-room" style="width:100%;padding:8px;border:1px solid #bbb;border-radius:6px;font-size:13px;"></select>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;">' +
          '<button id="hfix-skip-btn" style="flex:1;padding:10px;border:none;border-radius:6px;background:#e0e0e0;color:#333;font-size:14px;font-weight:600;cursor:pointer;">â­ï¸ ØªØ®Ø·ÙŠ</button>' +
          '<button id="hfix-save-btn" style="flex:1;padding:10px;border:none;border-radius:6px;background:#e65100;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">ðŸ’¾ Ø­ÙØ¸</button>' +
        '</div>' +
        '<div style="margin-top:12px;text-align:center;">' +
          '<button id="hfix-cancel-btn" style="padding:6px 20px;border:none;border-radius:6px;background:transparent;color:#c62828;font-size:12px;cursor:pointer;">Ø¥Ù„ØºØ§Ø¡</button>' +
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
      document.getElementById('hfix-cancel-btn').onclick = function() { if (confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© ÙˆØªØ¬Ø§Ù‡Ù„ Ø§Ù„ØªØºÙŠÙŠØ±Ø§ØªØŸ')) { overlay.remove(); finishFixer(); } };
      sectorSel.onchange = function() {
        roomSel.innerHTML = '';
        var sector = sectorSel.value;
        if (!sector) {           var o = document.createElement('option'); o.value = ''; o.textContent = '-- Ø§Ø®ØªØ± Ø§Ù„ØºØ±ÙØ© --'; roomSel.appendChild(o); return; }
        var rooms = getAvailableRooms(sector);
        rooms.forEach(function(r) {
          var opt = document.createElement('option');
          opt.value = r.number;           opt.textContent = r.number + ' (Ø§Ù„Ø³Ø¹Ø©: ' + r.beds + ')';
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
      if (validSectorList.length === 0) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¨Ø§Ù†Ù Ø£Ùˆ ØºØ±Ù Ù…Ø³Ø¬Ù„Ø© Ù„Ø¥ØµÙ„Ø§Ø­ Ø§Ù„Ø³ÙƒÙ†. Ø£Ø¶Ù Ù…Ø¨Ù†Ù‰ ÙˆØºØ±Ù Ø£ÙˆÙ„Ø§Ù‹.'); return; }

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
        var stripped = roomInput.replace(new RegExp(['Ø¥Ø¬Ø§Ø²Ø©','ØŒ','Ù„Ø§','ÙŠÙˆØ¬Ø¯','Ø¹Ù‡Ø¯Ø©','Ø¯Ø§Ø¦Ù…\\s*ØªÙˆØ§Ø¬Ø¯\\s*[()]?\\s*'].join('|'),'g'), '').trim();
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
        if (!newSector) { skipped++; errors.push(emp.name + ': ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ¯ Ù…Ø¨Ù†Ù‰ Ù…Ù†Ø§Ø³Ø¨'); return; }
        var newRoom = (newSector === emp.sector) ? findBestRoom(newSector, emp.room) : null;
        if (!newRoom) {
          var emptyRooms = roomsCapacity.filter(function(r) {
            return r.sector === newSector && !employees.some(function(e) { return e.sector === newSector && e.room === r.number; });
          });
          newRoom = emptyRooms.length > 0 ? emptyRooms[0].number : roomsCapacity.find(function(r) { return r.sector === newSector; })?.number;
        }
        if (!newRoom) { skipped++; errors.push(emp.name + ': Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù Ù…ØªØ§Ø­Ø© ÙÙŠ ' + newSector); return; }
        emp.sector = newSector;
        emp.room = newRoom;
        fixed++;
      });
      if (fixed > 0) syncStorage();
      var msg = 'Ù†ØªØ§Ø¦Ø¬ Ø¥Ø¹Ø§Ø¯Ø© ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø³ÙƒÙ†:\n';
      msg += 'ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø³ÙƒÙ†: ' + fixed + ' Ù…ÙˆØ¸Ù\n';
      msg += 'ØªØ¹Ø°Ø± ØªØ¹Ø¯ÙŠÙ„: ' + skipped + ' Ù…ÙˆØ¸Ù\n';
      if (errors.length > 0) msg += 'ØªØ¹Ø°Ø± ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø³ÙƒÙ† Ù„Ù„ØªØ§Ù„ÙŠ:\n' + errors.slice(0, 20).join('\n');
      alert(msg);
      renderHousingLayout();
      updateHousingStats();
      rebuildAllDropdowns();
    }

    function deleteBuilding(sector) {
      let buildingEmps = employees.filter(e => e.sector === sector);
      let otherSectors = dynamicSectors.filter(s => s !== sector);
      if (buildingEmps.length === 0) {
        if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø§Ù„Ù…Ø¨Ù†Ù‰ "' + sector + '" ÙˆÙƒÙ„ ØºØ±ÙÙ‡ØŸ')) return;
        let sectorRooms = roomsCapacity.filter(r => r.sector === sector);
        sectorRooms.forEach(r => _logDeletion('roomsCapacity', r.sector + '|' + r.number));
        _logDeletion('dynamicSectors', sector);
        roomsCapacity = roomsCapacity.filter(r => r.sector !== sector);
        dynamicSectors = dynamicSectors.filter(s => s !== sector);
        syncStorage();
        renderHousingLayout();
        alert('ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø¨Ù†Ù‰ "' + sector + '" ÙˆØ¬Ù…ÙŠØ¹ ØºØ±ÙÙ‡ Ø¨Ù†Ø¬Ø§Ø­');
        return;
      }
      if (otherSectors.length === 0) {
        alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¨Ø§Ù†Ù Ø£Ø®Ø±Ù‰ Ù„Ù†Ù‚Ù„ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø¥Ù„ÙŠÙ‡Ø§. Ø£Ø¶Ù Ù…Ø¨Ù†Ù‰ Ø¢Ø®Ø± Ø£ÙˆÙ„Ø§Ù‹.');
        return;
      }
      let modal = document.createElement('div');
      modal.className = 'modal open';
      modal.id = 'modal-delete-building';
      let html = '<div class="modal-content" style="max-width:650px;border-top:5px solid #c62828;max-height:85vh;display:flex;flex-direction:column;">';
      html += '<div class="modal-header"><h2 style="color:#c62828;">Ø£ÙˆÙ„Ø§Ù‹ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†: ' + sector + '</h2><span class="close-btn" onclick="this.closest(\'.modal\').remove()">&times;</span></div>';
      html += '<div style="flex:1;overflow:auto;padding:10px 0;">';
      html += '<div style="background:#ffebee;padding:10px 14px;border-radius:8px;font-size:13px;color:#c62828;margin-bottom:12px;">Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³ÙƒÙ†ÙŠÙ† <b>' + buildingEmps.length + '</b> Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­ Ø¨ÙŠØ§Ù†Ø§Øª Ø¬ÙŠØ¯ Ù…Ù…ØªØ§Ø². ØµØ­ÙŠØ­Ø© Ø³Ù†Ø© Ø£Ø¯Ø®Ù„ ÙØ¶Ù„Ùƒ Ù…Ù† Ø£ÙˆÙ„Ø§Ù‹.</div>';
      html += '<div id="delete-building-emps-list">';
      buildingEmps.forEach(function(emp, i) {
        html += '<div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;padding:8px 12px;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;">';
        html += '<span style="flex:1;min-width:150px;font-size:13px;font-weight:600;">' + emp.name + ' <span style="color:#888;font-size:11px;">[' + (emp.code || 'Ø§Ø®ØªØ±') + '] - Ù…Ø¨Ù†ÙŠ ' + (emp.room || '-') + '</span></span>';
        html += '<select id="db-sect-' + i + '" style="width:130px;padding:6px 8px;border:2px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;">';
        html += '<option value="">-- Ø³Ø¹Ø© ÙˆØ§Ù„ØºØ±ÙØ© --</option>';
        otherSectors.forEach(function(s) { html += '<option value="' + s + '">' + s + '</option>'; });
        html += '</select>';
        html += '<select id="db-room-' + i + '" style="width:120px;padding:6px 8px;border:2px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;">';
        html += '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¨Ù†ÙŠ --</option>';
        html += '</select>';
        html += '</div>';
      });
      html += '</div></div>';
      html += '<div style="padding:10px 0;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;">';
      html += '<button class="btn" style="background:#757575;color:#fff;" onclick="document.getElementById(\'modal-delete-building\').remove()">Ø¥Ù„ØºØ§Ø¡</button>';
      html += '<button class="btn" style="background:#c62828;color:#fff;" onclick="confirmDeleteBuilding(\'' + sector.replace(/'/g, "\\'") + '\')">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</button>';
      html += '</div></div>';
      modal.innerHTML = html;
      document.body.appendChild(modal);
      buildingEmps.forEach(function(emp, i) {
        var sectSel = document.getElementById('db-sect-' + i);
        var roomSel = document.getElementById('db-room-' + i);
        if (!sectSel || !roomSel) return;
        sectSel.onchange = function() {
          var selSect = sectSel.value;
          roomSel.innerHTML = '<option value="">-- Ù…ÙˆØ¸Ù ØªÙ… --</option>';
          if (!selSect) return;
          var rooms = roomsCapacity.filter(r => r.sector === selSect);
          rooms.forEach(function(r) {
            var occupantCount = employees.filter(e => e.sector === selSect && e.room === r.number && (e.id || e.code) !== (emp.id || emp.code)).length;
            var hasSpace = occupantCount < r.beds;
            var opt = document.createElement('option');
            opt.value = r.number;
            opt.textContent = 'Ø§Ù„ØªØ®Ø·ÙŠ ' + r.number + ' (' + occupantCount + '/' + r.beds + ')' + (hasSpace ? '' : ' (Ù…Ù…ØªÙ„Ø¦)');
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
        alert('Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† ØºÙŠØ± Ø§Ù„Ù…Ø³Ù†Ø¯ÙŠÙ† Ù„ØºØ±Ù: ' + unassigned.join('ØŒ '));
        return;
      }
      if (!confirm('Ø³ÙŠØªÙ… Ù†Ù‚Ù„ ' + buildingEmps.length + ' Ù…ÙˆØ¸Ù Ù…Ù† Ø§Ù„Ù…Ø¨Ù†Ù‰ "' + sector + '" Ø¥Ù„Ù‰ Ù…Ø¨Ù†Ù‰ Ø¢Ø®Ø±. Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŸ')) return;
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
        alert('ØªÙ… Ù†Ù‚Ù„ ' + buildingEmps.length + ' Ù…ÙˆØ¸Ù Ù…Ù† Ø§Ù„Ù…Ø¨Ù†Ù‰ "' + sector + '" Ø¥Ù„Ù‰ Ø£Ù‚Ø³Ø§Ù… Ø£Ø®Ø±Ù‰');
    }

    function editSectorName(btn, oldName) {
        let newName = prompt('Ø£Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ù…Ø¨Ù†Ù‰:\n' + oldName, oldName);
      if (!newName || newName.trim() === '' || newName === oldName) return;
      newName = newName.trim();
      if (dynamicSectors.indexOf(newName) !== -1) {
        alert('ØªÙ… ØªØ®Ø·ÙŠ Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù†ØµØ±.');
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
      alert('ØªÙ… ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„Ù…Ø¨Ù†Ù‰ Ù…Ù† "' + oldName + '" Ø¥Ù„Ù‰ "' + newName + '"');
    }

    function migrateRoom(fromSector, fromRoom) {
      let roomEmps = employees.filter(function(e) { return e.sector === fromSector && e.room === fromRoom; });
      if (roomEmps.length === 0) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙˆÙ† ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ØºØ±ÙØ© Ù„Ù„Ù†Ù‚Ù„.'); return; }
      // Build target options grouped by sector
      var targetOptions = '<option value="">-- ØªÙ… Ø§Ù„Ø¥ØµÙ„Ø§Ø­ØŸ Ø¥Ù„ØºØ§Ø¡ --</option>';
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
        rooms.forEach(function(r) { targetOptions += '<option value="' + s.replace(/'/g, "\\'") + '|' + r.room.replace(/'/g, "\\'") + '">' + r.room + ' (' + r.current + '/' + r.beds + ')' + (r.avail < roomEmps.length ? ' (Ù…Ù…ØªÙ„Ø¦)' : '') + '</option>'; });
        targetOptions += '</optgroup>';
      });
      var html = '<div class="modal open" id="modal-migrate"><div class="modal-content" style="max-width:500px;border-top:5px solid #37474f;">';
      html += '<div class="modal-header"><h2 style="color:#37474f;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø®ØªØ± Ù…Ø¨Ù†ÙŠ Ø£ÙˆÙ„Ø§Ù‹</h2><span class="close-btn" onclick="document.getElementById(\'modal-migrate\').remove()">&times;</span></div>';
      html += '<div style="background:#f5f5f5;padding:10px 14px;border-radius:8px;margin-bottom:12px;">';
      html += '<div style="font-weight:700;margin-bottom:6px;">Ø¨ÙŠØ§Ù†Ø§Øª: ' + fromSector + ' â€” ' + fromRoom + '</div>';
      html += '<div style="font-size:13px;">Ø³Ø¹Ø© Ù‡Ù„: ' + roomEmps.length + '</div>';
      html += '<div style="max-height:120px;overflow-y:auto;margin-top:6px;">';
      roomEmps.forEach(function(e) { html += '<span class="user-badge">' + e.name.split(' ').slice(0,2).join(' ') + '</span> '; });
      html += '</div></div>';
      html += '<div class="form-group"><label>Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯:</label><select id="migrate-target" style="width:100%;padding:10px;">' + targetOptions + '</select></div>';
      html += '<div style="display:flex;gap:8px;margin-top:15px;">';
      html += '<button class="btn btn-primary" onclick="execMigrate(\'' + fromSector.replace(/'/g, "\\'") + '\',\'' + fromRoom.replace(/'/g, "\\'") + '\')">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù†Ù‚Ù„</button>';
      html += '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-migrate\').remove()">Ø¥Ù„ØºØ§Ø¡</button></div>';
      html += '</div></div>';
      document.body.insertAdjacentHTML('beforeend', html);
    }

    function execMigrate(fromSector, fromRoom) {
      var sel = document.getElementById('migrate-target');
      if (!sel || !sel.value) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± ØºØ±ÙØ© Ù„Ù„Ù†Ù‚Ù„'); return; }
      var parts = sel.value.split('|');
      var toSector = parts[0], toRoom = parts[1];
      if (!toSector || !toRoom) return;
      // Check availability
      var target = roomsCapacity.filter(function(r) { return r.sector === toSector && r.number === toRoom; })[0];
      if (!target) { alert('Ø§Ù„ØºØ±ÙØ© Ø£Ùˆ Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø§Ù„Ù…Ø­Ø¯Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯.'); return; }
      var currentCount = employees.filter(function(e) { return e.sector === toSector && e.room === toRoom; }).length;
      var avail = target.beds - currentCount;
      var toMove = employees.filter(function(e) { return e.sector === fromSector && e.room === fromRoom; });
      if (toMove.length === 0) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙˆÙ† Ù„Ù†Ù‚Ù„Ù‡Ù… Ø¥Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„ØºØ±ÙØ©.'); document.getElementById('modal-migrate').remove(); return; }
      if (avail < toMove.length && !confirm('Ø³Ø¹Ø© Ø§Ù„ØºØ±ÙØ© (' + toSector + ' - ' + toRoom + ') Ù‡ÙŠ ' + target.beds + ' ÙˆÙ…Ø³Ø¬Ù„ Ø¨Ù‡Ø§ Ø­Ø§Ù„ÙŠØ§Ù‹ ' + currentCount + ' Ù…ÙˆØ¸Ù.\nØ³ÙŠØªÙ… Ù†Ù‚Ù„ ' + toMove.length + ' Ù…ÙˆØ¸Ù ÙˆÙ‚Ø¯ ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ø³Ø¹Ø©. Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŸ')) return;
      toMove.forEach(function(e) { e.sector = toSector; e.room = toRoom; });
      syncStorage();
      renderHousingLayout();
      document.getElementById('modal-migrate').remove();
      alert('ØªÙ… Ù†Ù‚Ù„ ' + toMove.length + ' Ù…ÙˆØ¸Ù Ù…Ù† "' + fromSector + ' - ' + fromRoom + '" Ø¥Ù„Ù‰ ØºØ±ÙØ© "' + toSector + ' - ' + toRoom + '"');
    }

    function editRoomBeds(sector, roomNumber, currentBeds) {
      let newBeds = prompt('Ø£Ø®Ø±Ù‰ Ù‚Ø¨Ù„ Ø§Ù„Ø­Ø°Ù ' + roomNumber + ' Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø¯ÙˆÙ† ' + sector + '\nØºØ±ÙØ© Ø§Ø®ØªØ±: ' + currentBeds + '\nÙ…Ø¨Ù†Ù‰ Ø£ÙˆÙ„Ø§Ù‹ Ù…Ø¨Ù†Ù‰:', currentBeds);
      if (newBeds === null) return;
      newBeds = parseInt(newBeds);
      if (isNaN(newBeds) || newBeds < 1) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ Ø£Ø³Ø±Ù‘Ø© ØµØ­ÙŠØ­ Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±');
      let room = roomsCapacity.find(r => r.sector === sector && r.number === roomNumber);
      if (room) {
        room.beds = newBeds;
        room.modifiedAt = new Date().toISOString();
      }
      syncStorage();
      renderHousingLayout();
      alert('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø³Ø¹Ø© Ø§Ù„ØºØ±ÙØ© ' + roomNumber + ' Ø¥Ù„Ù‰ ' + newBeds + ' Ø³Ø±ÙŠØ±');
    }

    function editRoomName(sector, roomNumber) {
      let newName = prompt('Ø£Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù„Ù„ØºØ±ÙØ© "' + roomNumber + '" ÙÙŠ Ø§Ù„Ù…Ø¨Ù†Ù‰ "' + sector + '" (Ø³ÙŠØªÙ… Ù†Ù‚Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø¥Ù„ÙŠÙ‡Ø§):', roomNumber);
      if (newName === null || !newName.trim()) return;
      newName = newName.trim();
      if (newName === roomNumber) return;
      let exists = roomsCapacity.find(r => r.sector === sector && r.number === newName && r.number !== roomNumber);
      if (exists) return alert('Ø±Ù‚Ù… Ø§Ù„ØºØ±ÙØ© "' + newName + '" Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰');
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
      alert('ØªÙ… ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØºØ±ÙØ© Ù…Ù† "' + roomNumber + '" Ø¥Ù„Ù‰ "' + newName + '"');
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
            let badge = e.status === 'V' ? ' <span style="color:#e65100;font-size:10px;">(ÙŠØ¬Ø¨)</span>' : '';
            return e.name + badge;
          }).join('ØŒ ');
          if (!names) names = '<span style="color:#999;">ØªØ¹ÙŠÙŠÙ†</span>';
          roomRows += '<tr><td style="text-align:center;font-weight:700;">' + room.number + '</td><td style="text-align:center;">' + room.beds + '</td><td style="text-align:center;">' + occCount + '</td><td style="text-align:center;' + (vacant === 0 ? 'color:#c62828;font-weight:700;' : vacant <= 1 ? 'color:#e65100;' : 'color:#2e7d32;') + '">' + vacant + '</td><td style="font-size:11px;">' + names + '</td></tr>';
        });
        totalBeds += sectorBeds;
        totalOccupied += sectorOccupied;
        let sectorVacant = sectorBeds - sectorOccupied;
        totalVacant += sectorVacant;
        let occPercent = sectorBeds > 0 ? Math.round(sectorOccupied / sectorBeds * 100) : 0;
        buildingRows += '<tr style="background:#e8f5e9;"><td colspan="5" style="font-weight:800;font-size:14px;color:#1b5e20;padding:10px;">Ø¨ÙŠØ§Ù†Ø§Øª ' + sector + ' <span style="font-size:11px;color:#555;font-weight:400;">(' + sectorsMap[sector].length + ' Ù…Ø¨Ù†Ù‰ | ÙˆØºØ±ÙØ©: ' + sectorOccupied + '/' + sectorBeds + ' | ' + occPercent + '%)</span></td></tr>';
        buildingRows += roomRows;
      }
      let mainPercent = totalBeds > 0 ? Math.round(totalOccupied / totalBeds * 100) : 0;
      let printContent = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø³ÙƒÙ†</title>';
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
      printContent += '<div class="header"><h1>ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø³ÙƒÙ†</h1><p>ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙ‚Ø±ÙŠØ±: ' + new Date().toLocaleDateString('ar-EG', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) + ' | ' + new Date().toLocaleTimeString('ar-EG') + '</p></div>';
      printContent += '<div class="summary">';
      printContent += '<div class="summary-box"><div class="label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø³Ø±Ø©</div><div class="value">' + totalBeds + '</div></div>';
      printContent += '<div class="summary-box blue"><div class="label">Ù…Ø´ØºÙˆÙ„</div><div class="value">' + totalOccupied + '</div><div class="label">' + mainPercent + '%</div></div>';
      printContent += '<div class="summary-box orange"><div class="label">Ø´Ø§ØºØ±</div><div class="value">' + totalVacant + '</div></div>';
      printContent += '</div>';
      printContent += '<table><thead><tr><th style="width:80px;">Ø§Ù„ØºØ±ÙØ©</th><th style="width:70px;">Ø£Ø³Ø±Ø©</th><th style="width:70px;">Ù…Ø´ØºÙˆÙ„</th><th style="width:70px;">Ø´Ø§ØºØ±</th><th>Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ù…Ù‚ÙŠÙ…ÙŠÙ†</th></tr></thead><tbody>';
      printContent += buildingRows;
      printContent += '</tbody></table>';
      printContent += '<div class="footer">Ù†Ø¸Ø§Ù… Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„ â€” Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²</div>';
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
      document.getElementById('housing-result-code').textContent = '[' + (emp.code || 'ØªØ¹Ø¯ÙŠÙ„') + ']';
      document.getElementById('housing-result-detail').textContent = 'Ø§Ù„Ù…Ø¨Ù†Ù‰: ' + (emp.sector || 'â€”') + ' | Ø§Ù„ØºØ±ÙØ©: ' + (emp.room || 'â€”') + ' | Ø§Ù„Ø­Ø§Ù„Ø©: ' + (emp.status === 'P' ? 'Ù…ØªÙˆØ§Ø¬Ø¯' : emp.status === 'V' ? 'ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©' : emp.status || '-');
      fillSelectWithOptions('housing-edit-sector', dynamicSectors, '-- ÙÙŠ Ù…Ø¨Ù†Ù‰ --');
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
        var opt = document.createElement('option'); opt.value = ''; opt.textContent = '-- Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ ÙŠÙˆØ¬Ø¯ --'; roomSel.appendChild(opt); return;
      }
      var sectorRooms = roomsCapacity.filter(function(r) { return r.sector === sector; });
      if (sectorRooms.length === 0) {
        var opt = document.createElement('option'); opt.value = ''; opt.textContent = 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰'; roomSel.appendChild(opt); return;
      }
      sectorRooms.forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r.number; opt.textContent = r.number + ' (Ø§Ù„Ø§Ø³Ù…: ' + r.beds + ')';
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
      if (!sector || !room) { alert('ØªÙ… ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØºØ±ÙØ©'); return; }
      emp.sector = sector;
      emp.room = room;
      syncStorage();
      renderHousingLayout();
      showHousingEmployeeResult();
      rebuildAllDropdowns();
      alert('ØªÙ… Ø¥Ø³ÙƒØ§Ù† Ø§Ù„Ù…ÙˆØ¸Ù ' + emp.name + ' Ø¨Ù†Ø¬Ø§Ø­');
    }

    var _raSector = '', _raRoom = '', _raEditIdx = -1;
    function openRoomAssets(sector, room) {
      _raSector = sector; _raRoom = room; _raEditIdx = -1;
      document.getElementById('room-assets-header').textContent = 'Ù…Ø¨Ù†Ù‰: ' + sector + ' | ØºØ±ÙØ©: ' + room;
      document.getElementById('ra-item').value = ''; document.getElementById('ra-qty').value = '1'; document.getElementById('ra-notes').value = '';
      document.getElementById('btn-save-room-asset').textContent = 'âž• Ø¥Ø¶Ø§ÙØ© Ø£ØµÙ„';
      renderRoomAssets();
      openModal('modal-room-assets');
    }
    function renderRoomAssets() {
      var list = document.getElementById('room-assets-list');
      var items = roomAssets.filter(function(a) { return a.sector === _raSector && a.room === _raRoom; });
      list.innerHTML = items.length ? items.map(function(a, i) {
        var idx = roomAssets.indexOf(a);
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid #eee;"><span>' + a.item + (a.qty > 1 ? ' (x' + a.qty + ')' : '') + (a.notes ? ' â€” ' + a.notes : '') + ' <small style="color:#999;">' + a.dateAdded + '</small></span><span><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:1px 6px;font-size:11px;margin-left:4px;" onclick="editRoomAsset(' + idx + ')">âœï¸</button><button class="btn btn-sm" style="background:#d32f2f;color:#fff;padding:1px 6px;font-size:11px;" onclick="deleteRoomAsset(' + idx + ')">âœ•</button></span></div>';
      }).join('') : '<div style="color:#999;font-style:italic;text-align:center;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ØµÙˆÙ„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ØºØ±ÙØ©</div>';
    }
    function saveRoomAsset() {
      var item = document.getElementById('ra-item').value.trim();
      if (!item) return alert('Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„');
      var qty = parseInt(document.getElementById('ra-qty').value) || 1;
      var notes = document.getElementById('ra-notes').value.trim();
      if (_raEditIdx >= 0) {
        var a = roomAssets[_raEditIdx];
        if (a) { a.item = item; a.qty = qty; a.notes = notes; }
        _raEditIdx = -1;
        syncStorage();
        logAction('ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ø§Ø¹Ø©', item, 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ' + _raSector + ' | Ø§Ù„Ø£Ø³ÙØ±Ù‘Ø©: ' + _raRoom);
      } else {
        roomAssets.push({ sector: _raSector, room: _raRoom, item: item, qty: qty, notes: notes, dateAdded: new Date().toISOString().split('T')[0] });
        syncStorage();
        logAction('Ø§Ù„Ù…Ø´ØºÙˆÙ„Ø©', 'Ø§Ù„Ø´Ø§ØºØ±Ø© Ø§Ù„ØºØ±ÙØ©', item, 'Ø§Ù„Ø³Ø¹Ø©: ' + _raSector + ' | Ø§Ù„Ù…Ø´ØºÙˆÙ„: ' + _raRoom + ' | Ø§Ù„Ø´Ø§ØºØ±: ' + qty);
      }
      document.getElementById('ra-item').value = ''; document.getElementById('ra-qty').value = '1'; document.getElementById('ra-notes').value = '';
      document.getElementById('btn-save-room-asset').textContent = 'âž• Ø¥Ø¶Ø§ÙØ© Ø£ØµÙ„';
      renderRoomAssets();
    }
    function editRoomAsset(idx) {
      var a = roomAssets[idx];
      if (!a) return;
      _raEditIdx = idx;
      document.getElementById('ra-item').value = a.item;
      document.getElementById('ra-qty').value = a.qty;
      document.getElementById('ra-notes').value = a.notes || '';
      document.getElementById('btn-save-room-asset').textContent = 'ðŸ’¾ Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„';
    }
    function deleteRoomAsset(idx) {
      if (!requireAdmin()) return;
      var a = roomAssets[idx];
      if (!a) return;
      _logDeletion('roomAssets', (a.room || '') + '|' + (a.item || '') + '|' + (a.id || ''));
      roomAssets.splice(idx, 1);
      syncStorage();
      logAction('Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„Ø©', 'Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²', a.item, 'Ø·Ø¨Ø§Ø¹Ø©: ' + a.sector + ' | ØªÙ„Ù‚Ø§Ø¦ÙŠØ©: ' + a.room);
      renderRoomAssets();
    }
    function exportRoomAssets() {
      if (!roomAssets.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ØµÙˆÙ„ Ù„Ù„ØªØµØ¯ÙŠØ±');
      var rows = [['Ø§Ù„Ù…Ø¨Ù†Ù‰', 'Ø±Ù‚Ù… Ø§Ù„ØºØ±ÙØ©', 'Ø§Ù„Ø³ÙƒØ§Ù†', 'Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„', 'Ø§Ù„ÙƒÙ…ÙŠØ©', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª', 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¶Ø§ÙØ©']];
      roomAssets.forEach(function(a) {
        var residents = employees.filter(function(e) { return e.sector === a.sector && e.room === a.room; }).map(function(e) { return e.name; }).join('ØŒ ') || 'â€”';
        rows.push([a.sector, a.room, residents, a.item, a.qty, a.notes || '', a.dateAdded]);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø£ØµÙˆÙ„ Ø§Ù„ØºØ±Ù');
      XLSX.writeFile(wb, 'ØºØ±Ù_Ø³Ø¹Ø©_' + new Date().toISOString().split('T')[0] + '.xlsx');
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
            if (rows.length < 2) return alert('Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº Ø£Ùˆ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª');
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
            logAction('Ø§Ù„Ù‚Ø·Ø§Ø¹', 'ÙˆØ§Ù„ØºØ±ÙØ© ØªÙ… Ø­ÙØ¸', (added + updated) + ' Ù…ÙˆÙ‚Ø¹ (' + added + ' Ø§Ù„Ø³ÙƒÙ† ' + updated + ' Ù„Ù„Ù…ÙˆØ¸Ù)');
            renderRoomAssets();
            alert('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ' + added + ' ØºØ±ÙØ© ÙˆØªØ­Ø¯ÙŠØ« ' + updated + ' Ø£ØµÙ„');
          } catch(e) { alert('Ø®Ø·Ø£ ÙÙŠ Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©: ' + e.message); }
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
      if (before === after) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù Ø®Ø§Ù„ÙŠØ© Ù„Ù„Ø­Ø°Ù.'); return; }
      let usedSectors = new Set(roomsCapacity.map(r => r.sector));
      let usedRooms = new Set(roomsCapacity.map(r => r.number));
      dynamicSectors = dynamicSectors.filter(s => usedSectors.has(s));
      dynamicRooms = dynamicRooms.filter(r => usedRooms.has(r));
      syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
      alert('ØªÙ… Ø­Ø°Ù ' + (before - after) + ' ØºØ±ÙØ© ØºÙŠØ± Ù…Ø³ØªØ®Ø¯Ù…Ø©');
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
      if (before === roomsCapacity.length) { if (!silent) alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù Ù…ÙƒØ±Ø±Ø© Ù„Ù„Ø­Ø°Ù.'); return; }
      removed.forEach(function(k) { _logDeletion('roomsCapacity', k); });
      syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
      if (!silent) alert('ØªÙ… Ø­Ø°Ù ' + (before - roomsCapacity.length) + ' ØºØ±ÙØ© Ù…ÙƒØ±Ø±Ø©');
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

      if(!sector) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ø¨Ù†Ù‰");
      if(!number) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ø§Ù„ØºØ±ÙØ©");
      if(!beds) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø³Ø±Ù‘Ø©");

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
      sel.innerHTML = '<option value="">-- Ø¥Ø¶Ø§ÙØ© Ø£ØµÙ„ --</option>';
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
      sel.innerHTML = '<option value="">-- Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„ --</option>';
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
        return alert("Ù…Ù† ÙØ¶Ù„Ùƒ Ø§Ù…Ù„Ø£ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©: ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø³ØªÙ„Ù…ØŒ Ø§Ø³Ù… Ø§Ù„ØµÙ†ÙØŒ ÙˆØ§Ù„ÙƒÙ…ÙŠØ©!");
      }

      let empObj = findEmpByInput(empNameRaw);
      let empId = empObj ? (empObj.id || empObj.code) : '';
      let empName = empObj ? empObj.name : empNameRaw;

      let voucher = { voucherId, dept, empId, empName, itemName, itemCode, unit, qty: parseInt(qty), date: new Date().toISOString().split('T')[0], notes };
      inventoryVouchers.push(_ts(voucher)); syncStorage(); renderInventoryTable();
      logAction('Ø§Ù„Ù…Ø®Ø²Ù†', 'ØµØ±Ù', itemName, 'Ø§Ù„ÙƒÙ…ÙŠØ©: ' + qty + ' | Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©: ' + dept + ' | Ø§Ù„Ù…ÙˆØ¸Ù: ' + empName);
      
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
          a.desc = (a.desc || '') + 'ØªÙ… ØµØ±Ù ' + deduct + ' Ø¨ØªØ§Ø±ÙŠØ® ' + new Date().toISOString().split('T')[0];
        }
      }
      if (remaining < qty) { syncStorage(); renderArchiveTable(); }
      
      document.getElementById('inv-item-name').value = '';
      document.getElementById('inv-item-code').value = '';
      document.getElementById('inv-notes').value = '';
      alert("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø±ÙƒØ© ÙˆØ¨ÙˆÙ† ØµØ±Ù Ø§Ù„Ù…Ø®Ø²Ù† Ù„Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªÙ„Ù…Ø© ÙˆØ§Ù„Ù…ÙˆØ¸Ù Ø¨Ù†Ø¬Ø§Ø­.");
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
          <td>${v.notes || 'â€”'}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px; font-size:11px;" onclick="editInventoryVoucher(${realIdx})">âœï¸</button> <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteInventoryVoucher(${realIdx})">ðŸ—‘ï¸</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteInventoryVoucher(idx) { if (!requireAdmin()) return;
      if(confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¨ÙˆÙ† Ù…Ù† Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø®Ø²Ù†ØŸ")) {
        _logDeletion('inventoryVouchers', inventoryVouchers[idx].voucherId || inventoryVouchers[idx].id || inventoryVouchers[idx]._id);
        inventoryVouchers.splice(idx, 1); syncStorage(); renderInventoryTable();
      }
    }

    // --- Ø£ØµÙ„ Ø¬Ø¯ÙŠØ¯ØŒ ---
    function addInventoryItem() {
      let code = document.getElementById('item-code').value.trim();
      let name = document.getElementById('item-name').value.trim();
      let unit = document.getElementById('item-unit').value;
      let store = document.getElementById('item-store').value.trim();
      if(!code || !name) return alert("ØªØ­Ø¯ÙŠØ« ÙØ´Ù„ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù Ù„Ø§!");
      if(inventoryItems.some(i => i.code === code)) return alert("ØªÙˆØ¬Ø¯ ØºØ±Ù Ø®Ø§Ù„ÙŠØ© Ù„Ù„Ø­Ø°Ù!");
      inventoryItems.push({ code, name, unit, store: store || 'â€”' });
      syncStorage(); renderInventoryItems();
      document.getElementById('item-code').value = ''; document.getElementById('item-name').value = '';
      document.getElementById('item-store').value = '';
      alert(`ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØµÙ†Ù [${name}] ÙÙŠ Ø³Ø¬Ù„ Ø§Ù„Ø£ØµÙ†Ø§Ù`);
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
        tr.innerHTML = `<td class="no-print"><input type="checkbox" class="row-check" data-table="table-items-registry"></td><td><b>${item.code}</b></td><td>${item.name}</td><td>${item.unit}</td><td>${item.store}</td><td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteInventoryItem(${realIdx})">Ø­Ø°Ù</button></td>`;
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
          if(!json || json.length === 0) return alert("Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº Ø£Ùˆ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª ØµØ§Ù„Ø­Ø©.");
          let added = 0, skipped = 0;
          json.forEach(row => {
            for(let key in row) {
              let v = (row[key]||'').toString().trim();
              if(v.startsWith('Ø£Ùˆ')) return;
            }
            let code = (row["Ø§ÙƒØªØ¨ Ø§Ø³Ù…"] || row["ØºØ±ÙØ©"] || row["code"] || row["Code"] || row["ITEM_CODE"] || '').toString().trim();
            let name = (row["Ø¬Ø¯ÙŠØ¯Ø© Ø­Ø¯Ø¯"] || row["Ø¹Ø¯Ø¯"] || row["name"] || row["Name"] || row["ITEM_NAME"] || '').toString().trim();
            let unit = (row["Ø§Ù„Ø£Ø³ÙØ±Ù‘Ø©"] || row["unit"] || row["Unit"] || 'Ø§Ø®ØªØ±').toString().trim();
            let store = (row["Ø§Ù„Ù‚Ø·Ø§Ø¹"] || row["Ø§Ø®ØªØ±"] || row["store"] || row["Store"] || row["LOCATION"] || 'â€”').toString().trim();
            if(code && name) {
              if(!inventoryItems.some(i => i.code === code)) {
                inventoryItems.push({ code, name, unit, store });
                added++;
              } else { skipped++; }
            }
          });
          syncStorage(); renderInventoryItems();
          alert(`ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: ${added} ØµÙ†Ù Ø¬Ø¯ÙŠØ¯${skipped ? `ØŒ ${skipped} ØµÙ†Ù Ù…ÙƒØ±Ø± ØªÙ… ØªØ®Ø·ÙŠÙ‡` : ''}.`);
          evt.target.value = '';
        } catch(err) { alert("ØªØ­Ø¯ÙŠØ¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø³ØªÙ„Ù…ØŒ: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
    }

    function deleteInventoryItem(idx) { if (!requireAdmin()) return;
      if(confirm("Ø§Ø³Ù… Ø§Ù„ØµÙ†ÙØŒ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ§Ù„ÙƒÙ…ÙŠØ©")) {
        _logDeletion('inventoryItems', inventoryItems[idx].id || inventoryItems[idx].name);
        inventoryItems.splice(idx, 1);
        syncStorage(); renderInventoryItems();
      }
    }

    var _arcEditIdx = -1;
    function renderArchiveTable() {
      var q = (document.getElementById('search-archive').value || '').toLowerCase();
      var filtered = archiveData.filter(function(a) { return !q || a.item.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || (a.issueto||'').toLowerCase().includes(q) || (a.issueby||'').toLowerCase().includes(q) || (a.receiver||'').toLowerCase().includes(q); });
      var st = sortState['table-archive'];
      if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
      var tbody = document.getElementById('archive-table-body');
      tbody.innerHTML = filtered.length ? filtered.map(function(a, i) {
        var idx = archiveData.indexOf(a);
        return '<tr><td>' + a.item + '</td><td>' + a.desc + '</td><td>' + a.qty + '</td><td>' + a.location + '</td><td>' + a.condition + '</td><td>' + a.date + '</td><td>' + (a.issueto || 'â€”') + '</td><td>' + (a.issuedate || 'â€”') + '</td><td>' + (a.issueby || 'â€”') + '</td><td>' + (a.receiver || 'â€”') + '</td><td class="no-print"><button class="btn btn-sm" style="background:#1565c0;color:#fff;padding:2px 6px;font-size:11px;margin-left:4px;" onclick="editArchiveRecord(' + idx + ')">âœï¸</button><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteArchiveRecord(' + idx + ')">ðŸ—‘ï¸</button></td></tr>';
      }).join('') : '<tr><td colspan="11" style="text-align:center;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù‡Ø¯Ø§Øª Ù…Ø³Ø¬Ù„Ø©</td></tr>';
    }
    function saveArchiveRecord() {
      var item = document.getElementById('arc-item').value.trim();
      var desc = document.getElementById('arc-desc').value.trim();
      var qty = parseInt(document.getElementById('arc-qty').value) || 1;
      var location = document.getElementById('arc-location').value.trim();
      var condition = document.getElementById('arc-condition').value;
      var date = document.getElementById('arc-date').value || new Date().toISOString().split('T')[0];
      var issueto = document.getElementById('arc-issueto').value.trim();
      var issuedate = document.getElementById('arc-issuedate').value;
      var issueby = document.getElementById('arc-issueby').value.trim();
      var receiver = document.getElementById('arc-receiver').value.trim();
      if (!item) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù');
      if (_arcEditIdx >= 0) {
        var a = archiveData[_arcEditIdx];
        if (a) { a.item = item; a.desc = desc; a.qty = qty; a.location = location; a.condition = condition; a.date = date; a.issueto = issueto; a.issuedate = issuedate; a.issueby = issueby; a.receiver = receiver; }
        _arcEditIdx = -1;
        syncStorage();
        logAction('Ù…Ø³ØªÙ„Ù…', 'ÙƒÙ…ÙŠØ©', item, 'ØªÙ…: ' + qty + ' | ØªØ³Ø¬ÙŠÙ„: ' + location);
      } else {
        archiveData.push({ item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, issueto: issueto, issuedate: issuedate, issueby: issueby, receiver: receiver });
        syncStorage();
        logAction('Ø­Ø±ÙƒØ©', 'ÙˆØ¨ÙˆÙ†', item, 'ØµØ±Ù: ' + qty + ' | Ø§Ù„Ù…Ø®Ø²Ù†: ' + location + ' | Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©: ' + condition);
      }
      document.getElementById('arc-item').value = ''; document.getElementById('arc-desc').value = ''; document.getElementById('arc-qty').value = '1'; document.getElementById('arc-location').value = ''; document.getElementById('arc-condition').value = 'Ø§Ù„Ù…Ø³ØªÙ„Ù…Ø©'; document.getElementById('arc-date').value = ''; document.getElementById('arc-issueto').value = ''; document.getElementById('arc-issuedate').value = ''; document.getElementById('arc-issueby').value = ''; document.getElementById('arc-receiver').value = '';
      document.getElementById('btn-save-archive').textContent = 'âž• Ø¥Ø¶Ø§ÙØ© Ø¹Ù‡Ø¯Ø©';
      renderArchiveTable();
    }
    function editArchiveRecord(idx) {
      var a = archiveData[idx];
      if (!a) return;
      _arcEditIdx = idx;
      document.getElementById('arc-item').value = a.item;
      document.getElementById('arc-desc').value = a.desc;
      document.getElementById('arc-qty').value = a.qty;
      document.getElementById('arc-location').value = a.location;
      document.getElementById('arc-condition').value = a.condition;
      document.getElementById('arc-date').value = a.date;
      document.getElementById('arc-issueto').value = a.issueto || '';
      document.getElementById('arc-issuedate').value = a.issuedate || '';
      document.getElementById('arc-issueby').value = a.issueby || '';
      document.getElementById('arc-receiver').value = a.receiver || '';
      document.getElementById('btn-save-archive').textContent = 'âž• Ø¥Ø¶Ø§ÙØ© Ø¹Ù‡Ø¯Ø©';
    }
    function deleteArchiveRecord(idx) {
      if (!requireAdmin()) return;
      var a = archiveData[idx];
      if (!a) return;
      _logDeletion('archiveData', a.id || a.date);
      archiveData.splice(idx, 1);
      syncStorage();
      logAction('Ø­Ø°Ù', 'Ù‡Ø°Ø§', a.item, 'Ø§Ù„Ø¨ÙˆÙ†: ' + a.qty);
      renderArchiveTable();
    }
    function exportArchiveExcel() {
      if (!archiveData.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù‡Ø¯Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±');
      var rows = [['Ø§Ø³Ù… Ø§Ù„Ø¹Ù‡Ø¯Ø©','Ø§Ù„Ø¨ÙŠØ§Ù†','Ø§Ù„Ø¹Ø¯Ø¯','Ø§Ø³Ù… Ø§Ù„Ù…Ø®Ø²Ù†','Ø§Ù„Ø­Ø§Ù„Ø©','ØªØ§Ø±ÙŠØ® Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù‡Ø¯Ø©','Ø¬Ù‡Ø© Ø§Ù„ØµØ±Ù','ØªØ§Ø±ÙŠØ® Ø§Ù„ØµØ±Ù','Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¹Ù„Ù‰ Ø§Ù„ØµØ±Ù','Ø§Ù„Ù…Ø³ØªÙ„Ù…']];
      archiveData.forEach(function(a) { rows.push([a.item, a.desc, a.qty, a.location, a.condition, a.date, a.issueto||'', a.issuedate||'', a.issueby||'', a.receiver||'']); });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…Ø®Ø§Ø²Ù†');
      XLSX.writeFile(wb, 'Ø§Ø±Ø´ÙŠÙ_Ø§Ù„Ù…Ø®Ø§Ø²Ù†_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
    function importArchiveExcel(evt) {
      var file = evt.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (rows.length < 2) return alert('Ø§Ù„Ù…Ù„Ù Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ©.\nØªØ£ÙƒØ¯ Ù…Ù† ÙˆØ¬ÙˆØ¯ ØµÙ Ø±Ø£Ø³ (header) ÙˆØµÙÙˆÙ Ø¨ÙŠØ§Ù†Ø§Øª.');
          var replaceAll = confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ø³ØªØ¨Ø¯Ø§Ù„ ÙƒÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŸ\nØ§Ø®ØªØ± OK Ù„Ù„Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø§Ù„ÙƒØ§Ù…Ù„ØŒ Ø£Ùˆ Cancel Ù„Ø¥Ø¶Ø§ÙØ© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙ‚Ø·.');
          if (replaceAll) archiveData = [];
          var added = 0, updated = 0;
          for (var i = 1; i < rows.length; i++) {
            var cols = rows[i];
            if (!cols || cols.length < 4) continue;
            var item = (cols[0] || '').toString().trim();
            var desc = (cols[1] || '').toString().trim();
            var qty = parseInt(cols[2]) || 1;
            var location = (cols[3] || '').toString().trim();
            var condition = (cols[4] || 'Ø¬Ø¯ÙŠØ¯Ø©').toString().trim();
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
              archiveData.push({ item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, issueto: issueto, issuedate: issuedate, issueby: issueby, receiver: receiver });
              added++;
            } else {
              var existing = archiveData.find(function(a) { return a.item === item && a.location === location; });
              if (existing) {
                existing.desc = desc; existing.qty = qty; existing.condition = condition; existing.date = date;
                existing.issueto = issueto; existing.issuedate = issuedate; existing.issueby = issueby; existing.receiver = receiver;
                updated++;
              } else {
                archiveData.push({ item: item, desc: desc, qty: qty, location: location, condition: condition, date: date, issueto: issueto, issuedate: issuedate, issueby: issueby, receiver: receiver });
                added++;
              }
            }
          }
          syncStorage();
          logAction('Ø§Ø³ØªÙŠØ±Ø§Ø¯', 'Ø£Ø±Ø´ÙŠÙ', added + ' Ø¥Ø¶Ø§ÙØ©', updated + ' ØªØ­Ø¯ÙŠØ«');
          renderArchiveTable();
          alert('ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ' + (replaceAll ? archiveData.length : (added + updated)) + ' Ø³Ø¬Ù„ Ø¨Ù†Ø¬Ø§Ø­.\nØ¥Ø¶Ø§ÙØ§Øª: ' + added + ' | ØªØ­Ø¯ÙŠØ«Ø§Øª: ' + updated);
        } catch(err) { alert('Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø±Ø´ÙŠÙ: ' + err.message); }
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
          d.innerText = `[${item.code}] ${item.name} â€” Ø§Ù„Ø§Ø³Ù…: ${item.store||'â€”'}`;
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
      var today = new Date();
      var y = today.getFullYear();
      var m = String(today.getMonth() + 1).padStart(2, '0');
      var d = String(today.getDate()).padStart(2, '0');
      var todayStr = y + '-' + m + '-' + d;
      employees.forEach(function(emp) {
        var empCode = emp.code || emp.id;
        var empVacations = vacations.filter(function(v) { return v.code === empCode; });
        if (empVacations.length === 0) return;
        var active = empVacations.some(function(v) {
          var travel = v.travelDate || v.start;
          var ret = v.returnDate || v.end;
          if (!travel || !ret) return false;
          return todayStr >= travel && todayStr < ret;
        });
        var newStatus = active ? 'V' : 'P';
        if (emp.status !== newStatus) { emp.status = newStatus; _ts(emp); }
      });
    }

    function addVacationMovement() {
      var q = document.getElementById('vacation-emp-select').value.trim();
      var emp = findEmpByInput(q);
      var empId = emp ? (emp.id || emp.code) : '';
      let vtype = document.getElementById('vacation-type').value;
      let start = document.getElementById('vacation-start-date').value;
      let days = parseInt(document.getElementById('vacation-days').value) || 0;
      let notes = document.getElementById('vacation-notes').value.trim();

      if(!empId || !start || !days) return alert("Ø§Ù„ÙˆØ­Ø¯Ø© Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø®Ø²Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹ ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ ØµÙ†Ù Ø¬Ø¯ÙŠØ¯!");

      if (!emp) return;

      let dates = calcVacationDates(start, days);
      if (!dates) return alert("Ù„Ù… ÙŠØªÙ… ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ ØªØ§Ø±ÙŠØ® ØµØ­ÙŠØ­");

      // ØªØ®Ø·ÙŠÙ‡ Ø¨ÙŠØ§Ù†Ø§Øª Ø®Ø·Ø£ ÙÙŠ
      if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
      if (days > emp.vacationBalance) {
        if (!confirm(`Ø¨ÙŠØ§Ù†Ø§Øª Ù‚Ø±Ø§Ø¡Ø© ${emp.name} Ø§Ù„Ù…Ù„Ù Ø­Ø°Ù ${emp.vacationBalance} Ø§Ù„ØµÙ†Ù Ù…Ù† Ø§Ù„Ø³Ø¬Ù„ØŸ Ù„Ø§ ${days} ØªÙˆØ¬Ø¯.\nØ¨ÙŠØ§Ù†Ø§Øª Ø¹Ù‡Ø¯Ø§Øª Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ø£Ø¯Ø®Ù„`)) return;
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
      alert(`ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø¥Ø¬Ø§Ø²Ø© Ù„Ù„ÙØ±Ø¯ [${vRecord.name}] Ù„Ù…Ø¯Ø© ${days} ÙŠÙˆÙ…`);
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
          <td>${v.code || 'â€”'}</td>
          <td><b>${v.name}</b></td>
          <td>${v.info || 'â€”'}</td>
          <td>${v.start}</td>
          <td>${v.days}</td>
          <td>${v.end}</td>
          <td>${v.travelDate || calcVacationDates(v.start, v.days)?.travelDate || 'â€”'}</td>
          <td>${v.lastWorkDay || calcVacationDates(v.start, v.days)?.lastWorkDay || 'â€”'}</td>
          <td>${v.returnDate || calcVacationDates(v.start, v.days)?.returnDate || 'â€”'}</td>
          <td><span style="font-weight:700;color:${v.type==='Ù…ÙˆÙ‚Ø¹'?'#1565c0':v.type==='Ø¥Ø¶Ø§ÙØ©'?'#e65100':'#2e7d32'};">${v.type || 'Ø¹Ù‡Ø¯Ø©'}</span></td>
          <td style="font-weight:700;color:#1b5e20;">${yearTotal}</td>
          <td style="font-weight:700;color:${empBalance !== null && empBalance > 0 ? '#2e7d32' : '#c62828'};">${empBalance !== null ? empBalance + ' ÙŠÙˆÙ…' : 'â€”'}</td>
          <td>${v.notes || 'â€”'}</td>
          <td class="no-print" style="display:flex;gap:4px;">
            <button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editVacation(${realIdx})">âœï¸</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteVacation(${realIdx})">Ø­Ø°Ù</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteVacation(idx) { if (!requireAdmin()) return;
      if(confirm("Ø­Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ø¶Ø§ÙØ©")) {
        var oldRec = vacations[idx];
        var empCode = oldRec?.code;
        _logDeletion('vacations', (oldRec?.code || oldRec?.employeeCode || oldRec?.employeeName || oldRec?.name || empCode || '') + '|' + (oldRec?.start || oldRec?.startDate || oldRec?.dateFrom || '') + '|' + (oldRec?.end || oldRec?.endDate || oldRec?.dateTo || ''));
        // Ø¹Ù‡Ø¯Ø© Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„
        if (oldRec) {
          var emp = employees.find(function(e) { return (e.code || e.id) === empCode; });
          if (emp && oldRec.days) {
            if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
            emp.vacationBalance += oldRec.days;
          }
        }
        var v = vacations[idx]; vacations.splice(idx, 1); syncStorage(); renderVacationsTable(); if(v) logAction('delete','Ø­Ø°Ù', v.name, v.code ? 'Ø¹Ù‡Ø¯Ø©: ' + v.code : '');
        if (empCode) {
          var hasMore = vacations.some(function(v) { return v.code === empCode; });
          if (hasMore) { updateEmployeeVacationStatuses(); }
          else {
            var emp = employees.find(function(e) { return (e.code || e.id) === empCode; });
            if (emp && emp.status !== 'P') { emp.status = 'P'; _ts(emp); }
          }
          renderTable(); renderDashboard();
        }
      }
    }

    function editVacation(idx) {
      var v = vacations[idx];
      if (!v) return;
      if (!canEditRecord(v.start || v.date)) { alert('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø³Ø¬Ù„ Ø¥Ø¬Ø§Ø²Ø© Ù‚Ø¯ÙŠÙ…'); return; }
      var emp = employees.find(function(e) { return (e.code || e.id) === v.code; });
      // Ø§Ø³Ù… Ø§Ù„Ø¹Ù‡Ø¯Ø©
      document.getElementById('vacation-emp-select').value = v.code;
      document.getElementById('vacation-type').value = v.type || 'Ø§Ù„Ø¨ÙŠØ§Ù†';
      document.getElementById('vacation-start-date').value = v.start;
      document.getElementById('vacation-days').value = v.days;
      document.getElementById('vacation-notes').value = v.notes || '';
      if (emp) {
          document.getElementById('vacation-balance-display').innerText = typeof emp.vacationBalance === 'number' ? 'Ø±ØµÙŠØ¯ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©: ' + emp.vacationBalance + ' ÙŠÙˆÙ…' : '';
      }
      previewVacationDates();
      // ØªØ¹ÙŠÙŠÙ† ID Ø§Ù„ØªØ¹Ø¯ÙŠÙ„
      document.getElementById('vacation-edit-id').value = idx;
      document.querySelector('#tab-vacations .btn-primary').innerText = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„';
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
      if (!empId || !start || !days) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© ÙƒØ§Ù…Ù„Ø©");
      var dates = calcVacationDates(start, days);
      if (!dates) return alert("Ø®Ø·Ø£ ÙÙŠ Ø­Ø³Ø§Ø¨ ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©");
      var oldDays = v.days;
      // ØªØ­Ø¯ÙŠØ« ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¬Ø¯ÙŠØ¯ØŒ ØªØ­Ø¯ÙŠØ«
      var emp = employees.find(function(e) { return (e.code || e.id) === v.code; });
      if (emp) {
        if (typeof emp.vacationBalance !== 'number') emp.vacationBalance = 30;
        emp.vacationBalance += oldDays; // Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø©
        if (days > emp.vacationBalance) {
          if (!confirm('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù„Ù ' + emp.name + ' Ù…Ø®Ø²Ù† ÙŠØ¬Ø¨ ' + emp.vacationBalance + ' Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØ±Ø¯ ÙˆØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© ' + days + ' Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©.\nØ¨ÙŠØ§Ù†Ø§Øª ÙˆØ¹Ø¯Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ÙŠØ§Ù… ÙÙŠ')) {
            emp.vacationBalance -= oldDays; // Ø®Ø·Ø£
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
      syncStorage(); renderVacationsTable(); updateEmployeeVacationStatuses(); renderTable(); renderDashboard();
      // Ø­Ø³Ø§Ø¨ ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©
      document.getElementById('vacation-notes').value = '';
      document.getElementById('vacation-days').value = '';
      document.getElementById('vacation-start-date').value = '';
      document.getElementById('vacation-preview').style.display = 'none';
      document.getElementById('vacation-emp-select').value = '';
      document.getElementById('vacation-balance-display').innerText = '';
      document.getElementById('vacation-edit-id').value = '';
      document.querySelector('#tab-vacations .btn-primary').innerText = 'ðŸ’¾ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©';
      document.querySelector('#tab-vacations .btn-primary').onclick = function() { addVacationMovement(); };
      alert('ØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø¨Ù†Ø¬Ø§Ø­');
    }

    function addHospitalityRecord() {
      let name = document.getElementById('hosp-name').value.trim();
      let type = document.getElementById('hosp-type').value;
      let title = document.getElementById('hosp-title').value.trim();
      let arrival = document.getElementById('hosp-arrival').value;
      let departure = document.getElementById('hosp-departure').value;
      let guests = parseInt(document.getElementById('hosp-guests').value) || 1;
      let editId = document.getElementById('hosp-edit-id').value;

      if(!name || !arrival) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø²Ø§Ø¦Ø± ÙˆØªØ§Ø±ÙŠØ® Ø§Ù„ÙˆØµÙˆÙ„.");

      let meals = [];
      if(document.getElementById('hosp-meal-bf').checked) meals.push("Ø¥ÙØ·Ø§Ø±");
      if(document.getElementById('hosp-meal-lh').checked) meals.push("ØºØ¯Ø§Ø¡");
      if(document.getElementById('hosp-meal-dn').checked) meals.push("Ø¹Ø´Ø§Ø¡");

      if (editId) {
        let idx = hospitalities.findIndex(h => h._id == editId || (typeof h._id === 'undefined' && h.name === name && h.arrival === arrival));
        if (idx === -1) idx = hospitalities.findIndex(h => h.name === name && h.arrival === arrival);
        if (idx !== -1) {
          hospitalities[idx] = { _id: editId, name, type, title, arrival, departure, guests, meals: meals.slice() };
        }
        document.getElementById('hosp-edit-id').value = '';
        document.getElementById('hosp-save-btn').innerHTML = 'ðŸ›Žï¸ ØªØ³Ø¬ÙŠÙ„ ÙˆØ¥Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø²ÙŠØ§Ø±Ø©';
        document.getElementById('hosp-save-btn').onclick = function() { addHospitalityRecord(); };
      } else {
        var dupHosp = hospitalities.find(function(h) { return h.name === name && h.arrival === arrival; });
        if (dupHosp) return alert('ÙŠÙˆØ¬Ø¯ ØªØ³Ø¬ÙŠÙ„ Ø¶ÙŠØ§ÙØ© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø´Ø®Øµ ÙÙŠ ØªØ§Ø±ÙŠØ® Ù‚Ø±ÙŠØ¨ Ù…Ù† (' + name + ' - ' + arrival + ').');
        hospitalities.push(_ts({ _id: Date.now().toString(), name, type, title, arrival, departure, guests, meals: meals.slice() }));
      }
      updateMealLogFromHospitality(arrival);
      autoLogTodayMeals(); syncStorage(); renderHospitalityTable(); renderMealLogTable();
        logAction(editId ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Ø¥Ø¶Ø§ÙØ©', 'Ø¶ÙŠØ§ÙØ©', name, 'Ø§Ù„ÙˆØµÙˆÙ„: ' + arrival + ' | Ø§Ù„Ù…ØºØ§Ø¯Ø±Ø©: ' + guests);
      document.getElementById('hosp-name').value = ''; document.getElementById('hosp-title').value = '';
      alert("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø²ÙŠØ§Ø±Ø© ÙˆØ¥Ø¶Ø§ÙØ© Ø§Ù„ÙˆØ¬Ø¨Ø§Øª Ø¥Ù„Ù‰ Ø³Ø¬Ù„ Ø§Ù„ÙˆØ¬Ø¨Ø§Øª.");
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
      document.getElementById('hosp-meal-bf').checked = (h.meals || []).includes('Ø¥ÙØ·Ø§Ø±');
      document.getElementById('hosp-meal-lh').checked = (h.meals || []).includes('ØºØ¯Ø§Ø¡');
      document.getElementById('hosp-meal-dn').checked = (h.meals || []).includes('Ø¹Ø´Ø§Ø¡');
      document.getElementById('hosp-save-btn').innerHTML = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª';
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
          <td>${h.title || 'â€”'}</td>
          <td>${h.arrival}</td>
          <td>${h.departure || 'â€”'}</td>
          <td style="text-align:center;font-weight:700;">${h.guests || 1}</td>
          <td style="text-align:center;">${(function(){ var mealLabels = []; var _ml = h.meals; if (_ml && typeof _ml === 'object' && typeof _ml.length === 'number') { for (var _i = 0; _i < _ml.length; _i++) { var _m = _ml[_i]; if (_m === 'Ø¥ÙØ·Ø§Ø±' || _m === 'Ù…Ø£Ù…ÙˆØ±ÙŠØ©') mealLabels.push('Ø¥ÙØ·Ø§Ø±'); else if (_m === 'ØºØ¯Ø§Ø¡' || _m === 'Ø§Ù…ØªØ¯Ø§Ø¯') mealLabels.push('ØºØ¯Ø§Ø¡'); else if (_m === 'Ø¹Ø´Ø§Ø¡' || _m === 'Ø§Ø¹ØªÙŠØ§Ø¯ÙŠØ©') mealLabels.push('Ø¹Ø´Ø§Ø¡'); else mealLabels.push(_m); } } if (!mealLabels.length) return '<span style="color:#999;font-size:11px;">â€”</span>'; var _html = ''; for (var _j = 0; _j < mealLabels.length; _j++) { _html += '<span style="display:inline-block;background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin:1px;">' + mealLabels[_j] + '</span>'; } return _html; })()}</td>
          <td class="no-print" style="white-space:nowrap;">
            <button class="btn btn-secondary" style="padding:2px 6px; font-size:11px;" onclick="editHospitality(${realIdx})">ðŸ“</button>
            <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteHospitality(${realIdx})">Ø­Ø°Ù</button>
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
      html += '<h3 style="color:#856404;margin:0 0 10px;">ðŸ” ÙØ­Øµ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙƒØ±Ø±Ø©</h3>';
      var found = false;

      // 1. Ø§Ù„Ø£ÙŠØ§Ù… Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©
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
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">ðŸ“‹ Ø¶ÙŠØ§ÙØ© Ù…ØªÙƒØ±Ø± (' + hospDups.length + '):</strong>';
        hospDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
            html += '<span style="font-size:13px;">' + d.rec.name + ' | Ø§Ù„ÙˆØµÙˆÙ„: ' + d.rec.arrival + (d.rec.title ? ' | ' + d.rec.title : '') + '</span>';
          html += '<button onclick="deleteDupHospitality(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Ø­Ø°Ù Ø§Ù„ØªÙƒØ±Ø§Ø±</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      // 2. Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ ÙŠÙˆÙ… ØªØ®Ø²ÙŠÙ†
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
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">ðŸž Ø¥Ù†ØªØ§Ø¬ Ù…ØªÙƒØ±Ø± (' + prodDups.length + '):</strong>';
        prodDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
          html += '<span style="font-size:13px;">ðŸ“… ' + normalizeDateStr(d.rec.date) + ' | Ø®Ø¨Ø²: ' + (d.rec.breadCount || 0) + '</span>';
          html += '<button onclick="deleteDupProduction(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Ø­Ø°Ù Ø§Ù„ØªÙƒØ±Ø§Ø±</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      // 3. ÙˆØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©
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
        html += '<div style="margin-bottom:12px;"><strong style="color:#c62828;">ðŸ“¦ ØªÙˆØ±ÙŠØ¯ Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ù…ØªÙƒØ±Ø± (' + ctrDups.length + '):</strong>';
        ctrDups.forEach(function(d) {
          html += '<div style="background:#ffebee;padding:8px;border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">';
          html += '<span style="font-size:13px;">' + d.rec.name + ' | ' + normalizeDateStr(d.rec.date) + ' | ÙƒÙ…ÙŠØ©: ' + (d.rec.count || 0) + '</span>';
          html += '<button onclick="deleteDupContractor(' + d.idx + ')" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Ø­Ø°Ù Ø§Ù„ØªÙƒØ±Ø§Ø±</button>';
          html += '</div>';
        });
        html += '</div>';
      }

      if (!found) {
        html += '<div style="background:#e8f5e9;padding:12px;border-radius:6px;color:#2e7d32;font-weight:600;text-align:center;">âœ… Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù…ÙƒØ±Ø±Ø©</div>';
      } else {
        html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
        html += '<button onclick="deleteAllDuplicates()" style="padding:6px 16px;background:#c62828;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Ø­Ø°Ù ÙƒØ§ÙØ© Ø§Ù„ØªÙƒØ±Ø§Ø±Ø§Øª</button>';
        html += '<button onclick="document.getElementById(\'' + (panelId || 'duplicates-panel') + '\').innerHTML=\'\'" style="padding:6px 16px;background:#757575;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Ø¥ØºÙ„Ø§Ù‚</button>';
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
      if (!target) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø³Ø¬Ù„ ØµØ­ÙŠØ­ Ù„Ù„ØªØ¹Ø¯ÙŠÙ„.'); return; }
      if (!confirm('ÙˆØ§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© ' + target.date + ' | ' + (target.breadCount||0) + ' ÙŠÙˆÙ…')) return;
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

    function deleteAllDuplicates() {
      if (!requireAdmin()) return;
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙƒØ±Ø±Ø©ØŸ')) return;

      // Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„ÙÙˆØ±Ù…
      var hospSeen = {};
      for (var i = hospitalities.length - 1; i >= 0; i--) {
        var key = hospitalities[i].name + '|' + hospitalities[i].arrival;
        if (hospSeen[key]) { hospitalities.splice(i, 1); } else { hospSeen[key] = true; }
      }

      // ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© ØªÙ…
      var prodSeen = {};
      for (var i = bakeryProductions.length - 1; i >= 0; i--) {
        var key = normalizeDateStr(bakeryProductions[i].date);
        if (prodSeen[key]) { bakeryProductions.splice(i, 1); } else { prodSeen[key] = true; }
      }

      // ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø© Ø¨Ù†Ø¬Ø§Ø­ Ø§Ø³Ù…
      var ctrSeen = {};
      for (var i = bakeryContractorSupplies.length - 1; i >= 0; i--) {
        var key = bakeryContractorSupplies[i].name + '|' + normalizeDateStr(bakeryContractorSupplies[i].date);
        if (ctrSeen[key]) { bakeryContractorSupplies.splice(i, 1); } else { ctrSeen[key] = true; }
      }

      syncStorage(); renderHospitalityTable(); renderMealLogTable();
      renderBakeryProductions(); updateBakeryProductionIngredientStocks();
      renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
      scanAndShowDuplicates();
      alert('ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­ âœ…');
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

      if(!category) { document.getElementById('maint-category').focus(); return alert("âš ï¸ Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ø§Ù„ØµÙŠØ§Ù†Ø©"); }
      if(!task) { document.getElementById('maint-task').focus(); return alert("âš ï¸ Ø£Ø¯Ø®Ù„ ÙˆØµÙ Ø§Ù„Ø¹Ø·Ù„/Ø§Ù„ØªÙØ§ØµÙŠÙ„"); }
      if(!tech) { document.getElementById('maint-tech').focus(); return alert("âš ï¸ Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„"); }

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
        alert('âœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ù…Ù‡Ù…Ø© Ø§Ù„ØµÙŠØ§Ù†Ø©');
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
        let statusColors = {'Ù…ÙØªÙˆØ­Ø©':'#e53935','ØªØ­Øª Ø§Ù„ØªÙ†ÙÙŠØ°':'#fb8c00','ØªÙ…Øª':'#2e7d32','Ù…Ù„ØºØ§Ø©':'#757575'};
        let statusIcons = {'Ù…ÙØªÙˆØ­Ø©':'ðŸ”´','ØªØ­Øª Ø§Ù„ØªÙ†ÙÙŠØ°':'ðŸŸ¡','ØªÙ…Øª':'âœ…','Ù…Ù„ØºØ§Ø©':'âŒ'};
        let stColor = statusColors[m.status] || '#333';
        let stIcon = statusIcons[m.status] || 'ðŸ“‹';
        let matsHtml = (m.materials && m.materials.length) ? m.materials.map(mat =>
          `<span style="display:inline-block;background:#e3f2fd;padding:1px 5px;margin:1px;border-radius:3px;font-size:11px;border:1px solid #90caf9;">${mat.name} â€” ${mat.qty}</span>`
        ).join(' ') : 'â€”';
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="no-print"><input type="checkbox" class="row-check" data-table="table-maintenance"></td>
          <td><span style="background:#fff3e0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#e65100;">${m.category || 'â€”'}</span></td>
          <td><b>${m.task}</b></td>
          <td>ðŸ‘¤ ${m.tech || 'â€”'}</td>
          <td><span style="color:${stColor};font-weight:bold;font-size:12px;">${stIcon} ${m.status||'â€”'}</span></td>
          <td style="font-size:11px;">${matsHtml}</td>
          <td style="font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(m.notes||'').replace(/"/g,'&quot;')}">${m.notes || 'â€”'}</td>
          <td>${m.imgBefore?`<img src="${m.imgBefore}" class="img-preview" onclick="viewFullImage('${m.imgBefore}')">`:'â€”'}</td>
          <td>${m.imgAfter?`<img src="${m.imgAfter}" class="img-preview" onclick="viewFullImage('${m.imgAfter}')">`:'â€”'}</td>
          <td>${m.date ? (m.date.match(/^\d{4}-/) ? m.date.split('-').reverse().join('/') : m.date) : 'â€”'}</td>
          <td class="no-print" style="display:flex;gap:4px;"><button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editMaint(${realIdx})">âœï¸</button><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteMaint(${realIdx})">ðŸ—‘ï¸</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteMaint(idx) { if (!requireAdmin()) return; if(!confirm('Ø­Ø°Ù Ù…Ù‡Ù…Ø© Ø§Ù„ØµÙŠØ§Ù†Ø©ØŸ')) return; var rec = maintenanceRecords[idx]; _logDeletion('maintenanceRecords', (rec.category||'') + '|' + (rec.task||'') + '|' + (rec.date||rec.createdAt||'')); maintenanceRecords.splice(idx,1); syncStorage(); renderMaintenanceTable(); }
    function editMaint(idx) {
      let rec = maintenanceRecords[idx];
      if (!rec) return;
      if (!canEditRecord(rec.date)) { alert('âš ï¸ Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø³Ø¬Ù„ Ù‚Ø¯ÙŠÙ…'); return; }
      _editingMaintIdx = idx;
      document.getElementById('maint-category').value = rec.category || '';
      document.getElementById('maint-task').value = rec.task || '';
      document.getElementById('maint-tech').value = rec.tech || '';
      document.getElementById('maint-status').value = rec.status || 'Ù…ÙØªÙˆØ­Ø©';
      document.getElementById('maint-notes').value = rec.notes || '';
      maintMaterials = (rec.materials && rec.materials.length) ? rec.materials.map(function(m) { return {name:m.name, qty:m.qty}; }) : [];
      renderMaintMaterialsList();
      document.getElementById('btn-save-maint').textContent = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„';
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
      document.getElementById('btn-save-maint').textContent = 'ðŸ’¾ ØªØ³Ø¬ÙŠÙ„';
      document.getElementById('btn-cancel-maint').style.display = 'none';
      document.getElementById('maint-category').value = '';
      document.getElementById('maint-task').value = '';
      document.getElementById('maint-tech').value = '';
      document.getElementById('maint-status').value = 'Ù…ÙØªÙˆØ­Ø©';
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
      if (!matches.length) { resultsEl.style.display = 'block'; resultsEl.innerHTML = '<div style="padding:8px;color:#999;font-size:12px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</div>'; btnAdd.style.display = 'none'; maintSelectedCode = ''; return; }
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = matches.map((m,i) =>
        `<div class="maint-mat-result" data-code="${m.code}" style="padding:6px 8px;cursor:pointer;border-bottom:1px solid #eee;font-size:12px;display:flex;justify-content:space-between;align-items:center;${i === 0 ? 'background:#e3f2fd;' : ''}"
              onclick="selectMaintMatResult('${m.code}')">
          <span><b>${m.code}</b> â€” ${m.name} <span style="color:#666;">(${m.unit||'â€”'})</span></span>
          <span class="maint-mat-add" style="color:#1565c0;font-weight:bold;font-size:11px;">? Ø¥ØºÙ„Ø§Ù‚</span>
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
      if(!code) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± ÙƒÙˆØ¯ Ø§Ù„ØµÙ†Ù");
      let item = inventoryItems.find(i => i.code === code);
      if(!item) return alert("Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„ØµÙ†Ù");
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
      if(!maintMaterials.length) { el.innerHTML = '<span style="color:#999;font-size:12px;">Ù„Ù… ÙŠØªÙ… Ø¥Ø¶Ø§ÙØ© Ø£ÙŠ Ø®Ø§Ù…Ø§Øª Ø£Ùˆ Ø£Ø¯ÙˆØ§Øª Ø¨Ø¹Ø¯</span>'; return; }
      el.innerHTML = maintMaterials.map((m,i) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:#e3f2fd;padding:3px 8px;border-radius:6px;border:1px solid #90caf9;font-size:12px;">
          <b>${m.name}</b> â€”${m.qty} ${m.unit}
          <span style="cursor:pointer;color:red;font-weight:bold;margin-right:4px;" onclick="removeMaintMaterial(${i})">âœ•</span>
        </span>`
      ).join('');
    }

    // --- Ø¥Ù†ØªØ§Ø¬ Ù…ÙƒØ±Ø± ---
    
    function addPeriodicMaintenance() {
      let name = document.getElementById('pm-name').value.trim();
      let freq = document.getElementById('pm-freq').value;
      let startDate = document.getElementById('pm-start').value;
      let lastDone = document.getElementById('pm-last-done').value;
      if(!name || !freq || !startDate) return alert('ÙŠØ±Ø¬Ù‰ Ø£ÙƒÙ…Ø§Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© (Ø§Ù„Ø§Ø³Ù… - Ø§Ù„ØªÙƒØ±Ø§Ø± - ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©)');

      let nextDue = new Date(lastDone || startDate);
      switch(freq) {
        case 'Ø´Ù‡Ø±ÙŠ': nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'Ø£Ø³Ø¨ÙˆØ¹ÙŠ': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'Ø³Ù†ÙˆÙŠ': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        case 'Ø±Ø¨Ø¹ Ø³Ù†ÙˆÙŠ': nextDue.setMonth(nextDue.getMonth() + 3); break;
        case 'Ù†ØµÙ Ø³Ù†ÙˆÙŠ': nextDue.setMonth(nextDue.getMonth() + 6); break;
      }

      periodicMaintenance.push({
        id: 'pm_' + Date.now(), name, freq, startDate,
        lastDone: lastDone || startDate,
        nextDue: nextDue.toISOString().split('T')[0],
        status: 'active'
      });
      syncStorage(); renderPeriodicMaintenance();
      logAction('Ø¥Ø¶Ø§ÙØ©', 'Ù…Ù‡Ù…Ø© Ø¯ÙˆØ±ÙŠØ©', name, 'Ø§Ù„Ù†ÙˆØ¹: ' + freq + ' | Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©: ' + startDate);
      document.getElementById('pm-last-done').value = '';
      alert('ØªÙ… Ø¥Ø¶Ø§ÙØ© Ù…Ù‡Ù…Ø© Ø¯ÙˆØ±ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø©');
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
          <td>${pm.lastDone || 'â€”'}</td>
          <td style="${isOverdue ? 'color:var(--danger);font-weight:700;' : 'color:var(--primary);font-weight:600;'}">${pm.nextDue} ${isOverdue ? 'Ù…ØªØ£Ø®Ø±Ø©' : ''}</td>
          <td><span class="status-badge ${pm.status === 'active' ? 'status-p' : ''}" style="${pm.status === 'inactive' ? 'background:#ffebee;color:#b71c1c;' : ''}">${pm.status === 'active' ? 'Ù†Ø´Ø·' : 'Ù…ØªÙˆÙ‚Ù'}</span></td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="markPMDone(${realIdx})">ØªÙ…</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deletePM(${realIdx})">Ø­Ø°Ù</button>
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
        case 'Ø­ÙØ¸': nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'Ø·Ù„Ø¨': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'Ø§Ù„ØµÙŠØ§Ù†Ø©': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        case 'Ø¨Ù†Ø¬Ø§Ø­ Ù…ÙØªÙˆØ­Ø©': nextDue.setMonth(nextDue.getMonth() + 3); break;
        case 'ØªØ­Øª Ø§Ù„ØªÙ†ÙÙŠØ°': nextDue.setMonth(nextDue.getMonth() + 6); break;
      }
      pm.nextDue = nextDue.toISOString().split('T')[0];
      syncStorage(); renderPeriodicMaintenance();
    }

    function deletePM(idx) { if (!requireAdmin()) return;
      if(confirm("ØªÙ…Øª Ù…Ù„ØºØ§Ø© Ù…ÙØªÙˆØ­Ø© ØªØ­Øª")) {
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
      if (!date) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ØªØ§Ø±ÙŠØ® Ø§Ù„ØµÙŠØ§Ù†Ø©.');
      waterStations.push({
        id: 'ws_' + Date.now(),
        station: station,
        type: type,
        date: date,
        nextDate: nextDate,
        notes: notes,
        status: (!nextDate || nextDate >= new Date().toISOString().split('T')[0]) ? 'Ù…ÙØªÙˆØ­Ø©' : 'Ù…ØªØ£Ø®Ø±Ø©',
        createdAt: new Date().toISOString()
      });
      syncStorage();
      renderWaterStations();
      document.getElementById('ws-notes').value = '';
      alert('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø³Ø¬Ù„ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­.');
    }
    function renderWaterStations() {
      var tbody = document.getElementById('water-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      var now = new Date().toISOString().split('T')[0];
      var overdue = 0;
      waterStations.forEach(function(w, i) {
        w.status = (!w.nextDate || w.nextDate >= now) ? 'Ù…ÙØªÙˆØ­Ø©' : 'Ù…ØªØ£Ø®Ø±Ø©';
        if (w.status === 'Ù…ØªØ£Ø®Ø±Ø©') overdue++;
        var docsForThis = waterDocs.filter(function(d) { return d.station === w.station && d.recordId === w.id; });
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><b>' + w.station + '</b></td>' +
          '<td>' + w.type + '</td>' +
          '<td>' + w.date + '</td>' +
          '<td style="color:' + (w.status === 'Ù…ØªØ£Ø®Ø±Ø©' ? '#d32f2f;font-weight:700' : '#00695c;font-weight:600') + ';">' + (w.nextDate || 'â€”') + '</td>' +
          '<td><span class="status-badge ' + (w.status === 'Ù…ØªØ£Ø®Ø±Ø©' ? 'status-danger' : 'status-ok') + '" style="' + (w.status === 'Ù…ØªØ£Ø®Ø±Ø©' ? 'background:#ffebee;color:#b71c1c;' : '') + '">' + w.status + '</span></td>' +
          '<td style="font-size:12px;">' + (w.notes || 'â€”') + '</td>' +
          '<td>' + (docsForThis.length ? 'ðŸ“Ž ' + docsForThis.length : 'â€”') + '</td>' +
          '<td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteWaterRecord(' + i + ')">Ø­Ø°Ù</button></td>';
        tbody.appendChild(tr);
      });
      document.getElementById('water-station-count').innerText = waterStations.length;
      document.getElementById('water-overdue-count').innerText = overdue;
      initSortableTable('table-water-stations');
    }
    function deleteWaterRecord(idx) {
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ØŸ')) return;
      _logDeletion('waterStations', waterStations[idx].id || (waterStations[idx].date + '|' + waterStations[idx].station + '|' + waterStations[idx].type));
      waterStations.splice(idx, 1);
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
        waterDocs.push({
          id: 'wd_' + Date.now(),
          station: station,
          fileName: file.name,
          fileType: file.type,
          data: e.target.result,
          uploadedAt: new Date().toISOString()
        });
        _saveWaterDocsToIDB();
        renderWaterDocs();
        document.getElementById('ws-upload-status').textContent = 'ØªÙ… Ø±ÙØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯: ' + file.name;
        fileInput.value = '';
      };
      reader.readAsDataURL(file);
    }
    function renderWaterDocs() {
      var container = document.getElementById('water-docs-list');
      if (!container) return;
      var stations = ['Ø§Ù„Ù…Ø­Ø·Ø© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©', 'Ø§Ù„Ù…Ø­Ø·Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©'];
      var html = '';
      stations.forEach(function(st) {
        var docs = waterDocs.filter(function(d) { return d.station === st; });
        html += '<div style="background:#f5f5f5;border-radius:8px;padding:10px;border:1px solid #e0e0e0;">';
        html += '<h4 style="margin:0 0 6px;font-size:13px;color:#00695c;">' + st + ' (' + docs.length + ' Ù…Ø³ØªÙ†Ø¯)</h4>';
        if (docs.length === 0) {
          html += '<div style="font-size:12px;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø·Ø©.</div>';
        } else {
          html += '<div style="max-height:300px;overflow-y:auto;">';
          docs.slice().reverse().forEach(function(d) {
            var isImg = d.fileType && d.fileType.startsWith('image/');
            html += '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:6px;">';
            html += isImg ? '<img src="' + d.data + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : 'ðŸ“„';
            html += '<a href="' + d.data + '" target="_blank" download="' + d.fileName + '" style="flex:1;color:#1565c0;text-decoration:none;">' + d.fileName + '</a>';
            html += '<button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteWaterDoc(\'' + d.id + '\')">Ø­Ø°Ù</button>';
            html += '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      container.innerHTML = html;
    }
    function deleteWaterDoc(id) {
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ØŸ')) return;
      for (var i = 0; i < waterDocs.length; i++) { if (waterDocs[i].id === id) { waterDocs.splice(i, 1); break; } }
      _saveWaterDocsToIDB();
      renderWaterDocs();
    }

    // --- Ù…Ø·Ù„ÙˆØ¨ ---
    function populateContractorSectorDropdown() {
      let sel = document.getElementById('ctr-sector');
      if(!sel) return;
      sel.innerHTML = '<option value="">-- Ø§Ù„ÙÙ†ÙŠ --</option>';
      contractorSectors.forEach(s => {
        let opt = document.createElement('option');
        opt.value = s; opt.textContent = s; sel.appendChild(opt);
      });
    }
    function populateContractorRoomDropdown() {
      var sector = document.getElementById('ctr-sector').value;
      var roomSel = document.getElementById('ctr-room');
      if (!roomSel) return;
      roomSel.innerHTML = '<option value="">-- Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ --</option>';
      if (!sector) { roomSel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ØºØ±ÙØ© --</option>'; return; }
      var taken = {};
      contractors.forEach(function(c) {
        if (c.sector !== sector || !c.room) return;
        var active = !c.endDate || new Date(c.endDate) >= new Date();
        if (active) taken[c.room] = true;
      });
      contractorRooms.filter(function(r) { return r.sector === sector; }).forEach(function(r) {
        if (taken[r.number]) return;
        var o = document.createElement('option');
        o.value = r.number; o.textContent = r.number + ' (' + r.beds + ' Ø§Ù„ØªÙ†ÙÙŠØ°)'; roomSel.appendChild(o);
      });
      if (roomSel.options.length === 1) {
        roomSel.innerHTML = '<option value="">-- Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù Ù…ØªØ§Ø­Ø© ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø¨Ù†Ù‰ --</option>';
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

      if(!name || !sector || !startDate) return alert("ØªÙ…Øª Ù…Ù„ØºØ§Ø© Ø§Ù„Ø­Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ù…ÙØªÙˆØ­Ø©ØŒ ØªØ­Øª");

      let roomData = contractorRooms.find(r => r.sector === sector && r.number === room);
      let beds = roomData ? roomData.beds : 1;

      contractors.push(_ts({ id: 'ctr_' + Date.now(), name, phone, sector, room, dailyRate, startDate, endDate, beds, notes }));
      syncStorage(); renderContractorsTable();
      document.getElementById('ctr-name').value = ''; document.getElementById('ctr-phone').value = '';
      document.getElementById('ctr-sector').value = ''; document.getElementById('ctr-room').innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ØºØ±ÙØ© --</option>';
      document.getElementById('ctr-notes').value = '';
      document.getElementById('ctr-end-date').value = '';
      alert("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„");
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
          <td>${c.phone || 'â€”'}</td>
          <td>${c.sector}</td>
          <td>${c.room || 'â€”'}</td>
          <td>${c.dailyRate || 0} Ø¬Ù†ÙŠÙ‡</td>
          <td>${c.startDate || 'â€”'}</td>
          <td>${c.endDate || 'â€”'}</td>
          <td>${days} ØªÙ…</td>
          <td>${c.beds || 1}</td>
          <td><b style="color:var(--primary);">${invoice.toLocaleString()} Ø¬Ù†ÙŠÙ‡</b></td>
          <td style="font-size:11px;">${c.notes || 'â€”'}</td>
          <td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteContractor(${realIdx})">Ø­Ø°Ù</button></td>
        `;
        tbody.appendChild(tr);
      });
      document.getElementById('stat-total-contractors').innerText = contractors.length;
      document.getElementById('stat-total-daily-invoice').innerText = totalDaily.toLocaleString() + ' Ø¬Ù†ÙŠÙ‡/Ø·Ù„Ø¨';
    }

    function deleteContractor(idx) { if (!requireAdmin()) return;
      if(confirm("Ø§Ù„ØµÙŠØ§Ù†Ø© Ù„Ø§")) {
        _logDeletion('contractors', contractors[idx].name || contractors[idx].id);
        contractors.splice(idx, 1);
        syncStorage(); renderContractorsTable();
      }
    }

    // --- ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ø¥Ø¶Ø§ÙØ© ---
    function populateContractorRoomSectorDropdown() {
      var sel = document.getElementById('ctr-room-sector');
      if (!sel) return;
      sel.innerHTML = '<option value="">Ø§Ø®ØªØ±</option>';
      contractorSectors.forEach(function(s) {
        var o = document.createElement('option');
        o.value = s; o.textContent = s; sel.appendChild(o);
      });
    }
    function addContractorRoom() {
      var sector = document.getElementById('ctr-room-sector').value;
      var number = document.getElementById('ctr-room-number').value.trim();
      var beds = parseInt(document.getElementById('ctr-room-beds').value) || 4;
      if (!sector || !number) return alert('ØµÙ†ÙØ§Ù‹ Ù…Ù† Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø¨Ø­Ø«/Ø§Ù„ØµÙ†Ù ØºÙŠØ±');
      if (contractorRooms.find(function(r) { return r.sector === sector && r.number === number; }))
        return alert('Ù…ÙˆØ¬ÙˆØ¯ Ù„Ù… ÙŠØªÙ…');
      contractorRooms.push({ sector: sector, number: number, beds: beds });
      syncStorage(); renderContractorRoomsList(); document.getElementById('ctr-room-number').value = '';
    }
    function renderContractorRoomsList() {
      contractorRooms = contractorRooms.filter(function(r) { return r && typeof r === 'object' && r.sector && r.number; });
      var container = document.getElementById('ctr-rooms-list');
      if (!container) return;
      if (!contractorRooms.length) { container.innerHTML = '<div style="color:#999;padding:4px;">â€” Ù„Ø§ ØªÙˆØ¬Ø¯ ØºØ±Ù â€”</div>'; return; }
      var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><tr style="background:#f5f5f5;"><th style="padding:4px;">#</th><th style="padding:4px;">Ø®Ø§Ù…Ø§Øª</th><th style="padding:4px;">Ø£Ùˆ</th><th style="padding:4px;">Ø£Ø¯ÙˆØ§Øª</th><th style="padding:4px;"></th></tr>';
      contractorRooms.forEach(function(r, i) {
        html += '<tr id="ctr-room-row-' + i + '"><td style="padding:3px;border-bottom:1px solid #eee;">' + (i+1) + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;">' + r.sector + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;">' + r.number + '</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;" id="ctr-room-beds-cell-' + i + '">' + r.beds + ' Ø¨Ø¹Ø¯</td>' +
          '<td style="padding:3px;border-bottom:1px solid #eee;text-align:left;" id="ctr-room-actions-' + i + '">' +
          '<button class="btn" style="padding:1px 6px;font-size:10px;background:#1565c0;color:white;" onclick="editContractorRoomBeds(' + i + ')">âœï¸</button> ' +
          '<button class="btn btn-danger" style="padding:1px 6px;font-size:10px;" onclick="deleteContractorRoom(' + i + ')">Ø­Ø°Ù</button></td></tr>';
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
        '<button class="btn" style="padding:1px 6px;font-size:10px;background:#2e7d32;color:white;" onclick="saveContractorRoomBeds(' + idx + ')">ðŸ’¾</button> ' +
        '          <button class="btn" style="padding:1px 6px;font-size:10px;background:#888;color:white;" onclick="renderContractorRoomsList()">ðŸ”„</button>';
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
      if (!confirm('Ø§Ù„Ø¯ÙˆØ±ÙŠØ© ÙŠØ±Ø¬Ù‰')) return;
      _logDeletion('contractorRooms', (contractorRooms[idx].sector||'') + '|' + (contractorRooms[idx].number||''));
      contractorRooms.splice(idx, 1);
      syncStorage(); renderContractorRoomsList();
    }

    // --- Ù…Ù„Ø¡ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ---
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
      var names = ['', 'ÙŠÙ†Ø§ÙŠØ±', 'ÙØ¨Ø±Ø§ÙŠØ±', 'Ù…Ø§Ø±Ø³', 'Ø¥Ø¨Ø±ÙŠÙ„', 'Ù…Ø§ÙŠÙˆ', 'ÙŠÙˆÙ†ÙŠÙˆ', 'ÙŠÙˆÙ„ÙŠÙˆ', 'Ø£ØºØ³Ø·Ø³', 'Ø³Ø¨ØªÙ…Ø¨Ø±', 'Ø£ÙƒØªÙˆØ¨Ø±', 'Ù†ÙˆÙÙ…Ø¨Ø±', 'Ø¯ÙŠØ³Ù…Ø¨Ø±'];
      var parts = monthKey.split('-');
      var m = parseInt(parts[1]) || 0;
      return names[m] + ' ' + parts[0];
    }
function renderTeaSugarTable() {
  let tbody = document.getElementById('ts-table-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  var monthFilter = document.getElementById('ts-month-filter')?.value || '';
  let q = document.getElementById('search-ts')?.value.toLowerCase() || '';
  let filtered = [...teaSugarDisbursements];
  if (monthFilter) filtered = filtered.filter(function(ts) { return _tsMonthKey(ts.date) === monthFilter; });
  if (q) filtered = filtered.filter(function(ts) { return (ts.empName||'').toLowerCase().includes(q) || (ts.empCode||'').toLowerCase().includes(q); });
  let st = sortState['table-tea-sugar'];
  if (!st || !st.key) filtered = sortNewestFirst(filtered, 'date');
  if (st && st.key) filtered = sortData(filtered, st.key, st.dir);
  filtered.forEach((ts, idx) => {
    let realIdx = teaSugarDisbursements.indexOf(ts);
    let emp = employees.find(e => (e.id || e.code) == ts.empId || e.name === ts.empName);
    let empName = emp ? (emp.name || emp.title) : (ts.empName || ts.empTitle || 'â€”');
    let empCode = emp ? (emp.code || emp.id) : (ts.empCode || 'â€”');
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
      <td class="no-print"><button class="btn btn-primary" style="padding:2px 6px;font-size:11px;" onclick="editTS(${realIdx})">âœï¸</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteTS(${realIdx})">ðŸ—‘ï¸</button></td>
    `;
    tbody.appendChild(tr);
  });
  renderTeaSugarBatchSummary();
}

    function deleteTS(idx) { if (!requireAdmin()) return;
      if(confirm("âš ï¸ Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„ØµØ±ÙØŸ")) {
        var d = teaSugarDisbursements[idx];
        _logDeletion('teaSugarDisbursements', (d.date||'') + '|' + (d.period||d.type||'') + '|' + (d.empCode||d.empId||'') + '|' + (d.teaPacks||d.quantity||'') + '|' + (d.sugarKg||''));
        teaSugarDisbursements.splice(idx, 1);
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
      }
    }

    function editTS(idx) {
      let rec = teaSugarDisbursements[idx];
      if (!rec) return;
      if (!canEditRecord(rec.date || rec.disburseDate)) { alert('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø³Ø¬Ù„ Ø®Ø§Ø±Ø¬ ÙØªØ±Ø© Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø³Ù…ÙˆØ­Ø©'); return; }
      let newTea = prompt("Ø¹Ø¯Ø¯ Ø¹Ø¨ÙˆØ§Øª Ø§Ù„Ø´Ø§ÙŠ:", rec.teaPacks);
      if (newTea === null) return;
      newTea = parseInt(newTea);
      if (isNaN(newTea) || newTea < 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… ØµØ­ÙŠØ­ Ù„Ù„Ø´Ø§ÙŠ');
      let newSugar = prompt("ÙƒÙ…ÙŠØ© Ø§Ù„Ø³ÙƒØ± (ÙƒØ¬Ù…):", rec.sugarKg);
      if (newSugar === null) return;
      newSugar = parseFloat(newSugar);
      if (isNaN(newSugar) || newSugar < 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… ØµØ­ÙŠØ­ Ù„Ù„Ø³ÙƒØ±');
      rec.teaPacks = newTea;
      rec.sugarKg = newSugar;
      syncStorage(); renderTeaSugarTable(); renderTeaSugarBatchSummary();
      alert('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­');
    }

    // --- Ø¯ÙˆØ§Ù„ Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ± ---
    function saveTeaSugarBatch() {
      let date = document.getElementById('ts-batch-date').value;
      if (!date) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ®.');
      let period = document.getElementById('ts-batch-period').value;
      let teaQty = parseInt(document.getElementById('ts-batch-tea').value) || 0;
      let sugarQty = parseFloat(document.getElementById('ts-batch-sugar').value) || 0;
      if (teaQty <= 0 && sugarQty <= 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙ…ÙŠØ© Ø§Ù„Ø´Ø§ÙŠ Ø£Ùˆ Ø§Ù„Ø³ÙƒØ±.');
      teaSugarBatches.push({ id: 'tsb_'+Date.now(), date, period, teaQty, sugarQty });
      syncStorage(); renderTeaSugarBatchSummary();
      logAction('Ø´Ø§ÙŠ ÙˆØ³ÙƒØ±', 'Ø¯ÙØ¹Ø© ' + period, 'Ø´Ø§ÙŠ: ' + teaQty + ' | Ø³ÙƒØ±: ' + sugarQty, 'Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + date);
      document.getElementById('ts-batch-date').value = '';
      document.getElementById('ts-batch-tea').value = '0';
      document.getElementById('ts-batch-sugar').value = '0';
      document.getElementById('ts-month-filter').value = date.slice(0, 7);
      renderTeaSugarTable();
      alert('ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­');
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
      if (months.length === 0) { container.innerHTML = '<div style="color:#888;font-size:13px;text-align:center;padding:20px;">Ù„Ù… ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø£ÙŠ Ø¯ÙØ¹Ø© ØªÙ…ÙˆÙŠÙ† Ø¨Ø¹Ø¯ â€” Ø³Ø¬Ù‘Ù„ Ø¯ÙØ¹Ø© Ø£ÙˆÙ„Ø§Ù‹</div>'; return; }
      var periods = ['Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (1-7)', 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© (15-21)'];
      var html = '';
      months.forEach(function(m) {
        var monthName = _tsMonthName(m);
        html += '<div style="background:#f5f5f5;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid #e0e0e0;">';
        html += '<div style="font-size:14px;font-weight:700;color:#1b5e20;margin-bottom:8px;">ðŸ“… ' + monthName + '</div>';
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
            html += '<div style="font-size:11px;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙˆØ±Ø©</div>';
          } else {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">';
            html += '<div><span style="color:#888;">â˜• Ø´Ø§ÙŠ Ù…Ø³Ù„Ù…:</span> <b style="color:#e65100;">' + s.totalTeaGiven + '</b></div>';
            html += '<div><span style="color:#888;">ðŸš Ø³ÙƒØ± Ù…Ø³Ù„Ù…:</span> <b style="color:#e65100;">' + s.totalSugarGiven + '</b></div>';
            html += '<div><span style="color:#888;">â˜• Ø´Ø§ÙŠ Ù…ØµØ±ÙˆÙ:</span> <b>' + s.totalTeaUsed + '</b></div>';
            html += '<div><span style="color:#888;">ðŸš Ø³ÙƒØ± Ù…ØµØ±ÙˆÙ:</span> <b>' + s.totalSugarUsed + '</b></div>';
            html += '<div><span style="color:#888;">ðŸ“¦ Ù…ØªØ¨Ù‚ÙŠ Ø´Ø§ÙŠ:</span> <b style="color:' + (s.remainingTea <= 0 ? '#d32f2f' : '#2e7d32') + ';">' + Math.max(0, s.remainingTea) + '</b></div>';
            html += '<div><span style="color:#888;">ðŸ“¦ Ù…ØªØ¨Ù‚ÙŠ Ø³ÙƒØ±:</span> <b style="color:' + (s.remainingSugar <= 0 ? '#d32f2f' : '#2e7d32') + ';">' + Math.max(0, s.remainingSugar) + '</b></div>';
            html += '</div>';
            html += '<div style="margin-top:6px;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:10px;color:#888;">Ø´Ø§ÙŠ</span><div style="flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + teaPct + '%;background:' + teaColor + ';border-radius:3px;"></div></div><span style="font-size:10px;font-weight:600;">' + teaPct + '%</span></div>';
            html += '<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:10px;color:#888;">Ø³ÙƒØ±</span><div style="flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + sugarPct + '%;background:' + sugarColor + ';border-radius:3px;"></div></div><span style="font-size:10px;font-weight:600;">' + sugarPct + '%</span></div></div>';
            html += '<div style="font-size:10px;color:#999;margin-top:4px;">' + s.batchCount + ' Ø¯ÙØ¹Ø© | ' + s.empCount + ' Ù…ÙˆØ¸Ù</div>';
            // Show batches for this month+period
            var monthBatches = teaSugarBatches.filter(function(b) { return b.period === p && _tsMonthKey(b.date) === m; });
            if (monthBatches.length > 0) {
              html += '<div style="margin-top:4px;border-top:1px dashed #ddd;padding-top:4px;">';
              monthBatches.forEach(function(b) {
                var realBIdx = teaSugarBatches.indexOf(b);
                var bDate = b.date || 'â€”';
                var bTea = b.teaQty || 0;
                var bSugar = b.sugarQty || 0;
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;margin-top:2px;background:#f5f5f5;border-radius:3px;font-size:10px;">';
                html += '<span>' + bDate + ' â€” Ø´Ø§ÙŠ: ' + bTea + ' | Ø³ÙƒØ±: ' + bSugar + '</span>';
                html += '<span><button class="btn btn-primary" style="padding:1px 4px;font-size:9px;" onclick="editTsBatch(' + realBIdx + ')">ØªØ¹Ø¯ÙŠÙ„</button> <button class="btn btn-danger" style="padding:1px 4px;font-size:9px;" onclick="deleteTsBatch(' + realBIdx + ')">Ø­Ø°Ù</button></span>';
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
      if (confirm("âš ï¸ Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙØ¹Ø©ØŸ")) {
        _logDeletion('teaSugarBatches', b.id || b._id);
        teaSugarBatches.splice(idx, 1);
        syncStorage(); renderTeaSugarBatchSummary(); renderTeaSugarTable();
      }
    }

    function editTsBatch(idx) {
      let b = teaSugarBatches[idx];
      if (!b) return;
      let newTea = prompt("ðŸµ ÙƒÙ…ÙŠØ© Ø§Ù„Ø´Ø§ÙŠ (Ø¨Ø§ÙƒÙŠØª):", b.teaQty);
      if (newTea === null) return;
      newTea = parseInt(newTea);
      if (isNaN(newTea) || newTea < 0) return alert("âš ï¸ ÙƒÙ…ÙŠØ© ØºÙŠØ± ØµØ§Ù„Ø­Ø©");
      let newSugar = prompt("ðŸš ÙƒÙ…ÙŠØ© Ø§Ù„Ø³ÙƒØ± (ÙƒØ¬Ù…):", b.sugarQty);
      if (newSugar === null) return;
      newSugar = parseFloat(newSugar);
      if (isNaN(newSugar) || newSugar < 0) return alert("âš ï¸ ÙƒÙ…ÙŠØ© ØºÙŠØ± ØµØ§Ù„Ø­Ø©");
      b.teaQty = newTea;
      b.sugarQty = newSugar;
      syncStorage(); renderTeaSugarBatchSummary(); renderTeaSugarTable();
      alert("âœ… ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø©");
    }

    function addTeaSugarRecord() {
      let q = document.getElementById('ts-emp-search').value.trim();
      let emp = findEmpByInput(q);
      let empId = emp ? (emp.id || emp.code) : '';
      let empName = emp ? emp.name : q;
      let period = document.getElementById('ts-period').value;
      let teaPacks = 2;
      let sugarKg = 1;

      if(!empId || !period) return alert("âš ï¸ Ø§Ø®ØªØ± Ø§Ù„Ù…ÙˆØ¸Ù ÙˆØ§Ù„Ø¯ÙˆØ±Ø© Ø£ÙˆÙ„Ø§Ù‹");

      var today = new Date().toISOString().split('T')[0];
      var monthKey = today.slice(0, 7);

      // Check remaining balance for THIS month
      let stats = getTeaSugarPeriodStats(period, monthKey);
      if (stats.totalTeaGiven <= 0) return alert('âš ï¸ Ù„Ù… ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© ØªÙ…ÙˆÙŠÙ† Ù„Ù€ ' + _tsMonthName(monthKey) + '. Ø³Ø¬Ù‘Ù„ Ø¯ÙØ¹Ø© Ø£ÙˆÙ„Ø§Ù‹.');
      if (stats.remainingTea < teaPacks) return alert('âš ï¸ ÙƒÙ…ÙŠØ© Ø§Ù„Ø´Ø§ÙŠ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ© Ù„Ø§ ØªÙƒÙÙŠ. Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: ' + Math.max(0,stats.remainingTea) + ' Ø¨Ø§ÙƒÙŠØª');
      if (stats.remainingSugar < sugarKg) return alert('âš ï¸ ÙƒÙ…ÙŠØ© Ø§Ù„Ø³ÙƒØ± Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ© Ù„Ø§ ØªÙƒÙÙŠ. Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: ' + Math.max(0,stats.remainingSugar) + ' ÙƒØ¬Ù…');

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

    // --- Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø¯ÙØ¹Ø§Øª ---
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
      let gBf = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('Ø¥ÙØ·Ø§Ø±') ? (h.guests || 1) : 0), 0);
      let gLh = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('ØºØ¯Ø§Ø¡') ? (h.guests || 1) : 0), 0);
      let gDn = todayGuests.reduce((s, h) => s + (h.meals && h.meals.includes('Ø¹Ø´Ø§Ø¡') ? (h.guests || 1) : 0), 0);
      return { pCount, gBf, gLh, gDn };
    }

    function renderTodayMealReport() {
      let s = getTodayMealStats();
      let todayStr = fmtDate(new Date());
      let today = toArabicNumerals(todayStr);
      var todayND = normalizeDateStr(todayStr);
      var entry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === todayND; });
      var bfDisplay = entry ? toArabicNumerals(String((entry.breakfast || 0) + (entry.guestBf || 0))) : 'â€”';
      var lhDisplay = entry ? toArabicNumerals(String((entry.lunch || 0) + (entry.guestLh || 0))) : 'â€”';
      var dnDisplay = entry ? toArabicNumerals(String((entry.dinner || 0) + (entry.guestDn || 0))) : 'â€”';
      var statusIcon = entry ? (entry.userEdited ? 'âœï¸' : 'ðŸ¤–') : 'â³';
      document.getElementById('today-report-date').innerHTML = `ðŸ“Š ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ… ${today} <span style="font-size:14px;color:#666;">â€” Ø¹Ø¯Ø¯ Ø§Ù„Ø£ÙØ±Ø§Ø¯: ${toArabicNumerals(String(s.pCount))} ${statusIcon}</span>`;
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
    // ØªØ­ÙˆÙŠÙ„ Ø£ÙŠ ØªÙˆØ§Ø±ÙŠØ® Ù‚Ø¯ÙŠÙ…Ø© Ù…Ø®Ø²Ù†Ø© Ø¨Ø§Ø±Ù‚Ø§Ù… Ø¹Ø±Ø¨ÙŠØ© Ø¥Ù„Ù‰ Ø§Ø±Ù‚Ø§Ù… Ø¹Ø§Ø¯ÙŠØ© Ø¹Ù†Ø¯ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©
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
      var dn = hour >= 21 ? s.pCount : 0;
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
      if (!chef) { document.getElementById('meal-chef').focus(); return alert('âš ï¸ Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø´ÙŠÙ.'); }
      let dateInput = document.getElementById('meal-date').value;
      if (!dateInput) return alert("âš ï¸ Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ØªØ§Ø±ÙŠØ®.");
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
        logAction('ØªØ¹Ø¯ÙŠÙ„', 'ÙˆØ¬Ø¨Ø§Øª', dateInput, 'Ø§Ù„Ø´ÙŠÙ: ' + chef + ' | ÙØ·Ø§Ø±: ' + bf + ' | ØºØ¯Ø§Ø¡: ' + lh + ' | Ø¹Ø´Ø§Ø¡: ' + dn);
        document.getElementById('meal-edit-idx').value = '-1';
        document.getElementById('meal-p-bf').value = '';
        document.getElementById('meal-p-lh').value = '';
        document.getElementById('meal-p-dn').value = '';
        return;
      }
      if(mealLogs.some(l => normalizeDateStr(l.date) === dateInput)) return alert("Ù‡Ø°Ø§ Ø§Ù„ØªØ§Ø±ÙŠØ® Ù…Ø³Ø¬Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹! Ø§Ø®ØªØ± ØªØ¹Ø¯ÙŠÙ„ Ù…Ù† Ø§Ù„Ø¬Ø¯ÙˆÙ„.");
      // Ø¨ÙŠØ§Ù†Ø§Øª Ø¨ÙŠØ§Ù†Ø§Øª deletion Ù…ÙˆØ¸Ù Ø­Ø°Ù Ø¯ÙØ¹Ø© Ø§Ù„ØªÙ…ÙˆÙŠÙ†ØŸ
      syncDeletions = syncDeletions.filter(function(d) { return !(d.entity === 'mealLogs' && d.key === dateInput); });
      mealLogs.push(_ts({
        date: dateInput, breakfast: bf, lunch: lh, dinner: dn,
        guestBf: s.gBf, guestLh: s.gLh, guestDn: s.gDn, autoGenerated: false, chef: chef
      }));
      syncStorage(); renderMealLogTable();
      logAction('Ø¥Ø¶Ø§ÙØ©', 'ÙˆØ¬Ø¨Ø§Øª', dateInput, 'Ø§Ù„Ø´ÙŠÙ: ' + chef + ' | ÙØ·Ø§Ø±: ' + bf + ' | ØºØ¯Ø§Ø¡: ' + lh + ' | Ø¹Ø´Ø§Ø¡: ' + dn);
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
          if (h.meals && h.meals.includes('Ø¥ÙØ·Ø§Ø±')) gBf += (h.guests || 1);
          if (h.meals && h.meals.includes('ØºØ¯Ø§Ø¡')) gLh += (h.guests || 1);
          if (h.meals && h.meals.includes('Ø¹Ø´Ø§Ø¡')) gDn += (h.guests || 1);
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
        // Ø§Ù„Ù…ÙˆØ¸Ù ÙˆØ­Ø¯Ø¯ Ø§Ù„Ø¯ÙˆØ±Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù… ÙŠØªÙ…
        var hospGuests = calcHospGuestsForDate(log.date);
        let gBf = hospGuests.gBf;
        let gLh = hospGuests.gLh;
        let gDn = hospGuests.gDn;
        let total = bf + gBf + lh + gLh + dn + gDn;
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
          <td>${log.chef || 'â€”'}</td>
          <td>${log.autoGenerated ? 'ØªÙ„Ù‚Ø§Ø¦ÙŠ' : 'ÙŠØ¯ÙˆÙŠ'}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px;font-size:11px;" onclick="editMealLog(${realIdx})">âœï¸</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteMealLog(${realIdx})">ðŸ—‘ï¸</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function deleteMealLog(idx) { if (!requireAdmin()) return;
      if(confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ØŸ")) {
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
      var meals = ['Ø¥ÙØ·Ø§Ø±', 'ØºØ¯Ø§Ø¡', 'Ø¹Ø´Ø§Ø¡'];
      var icons = { 'Ø¥ÙØ·Ø§Ø±':'ðŸŒ…','ØºØ¯Ø§Ø¡':'â˜€ï¸','Ø¹Ø´Ø§Ø¡':'ðŸŒ™' };
      var emojis = ['ðŸ˜ž','ðŸ˜','ðŸ˜Š','ðŸ˜'];
      var labels = ['Ø³ÙŠØ¡','Ù…Ù‚Ø¨ÙˆÙ„','Ø¬ÙŠØ¯','Ù…Ù…ØªØ§Ø²'];
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
          '<div style="font-size:24px;margin-bottom:4px;">' + (curRating >= 0 ? curRating + 1 : 'â€”') + ' / 4</div>' +
          '<div>' + stars + '</div>' +
          '<div style="margin-top:8px;"><input type="text" id="survey-comment-' + meal + '" placeholder="Ø£Ø¯Ø®Ù„ ØªØ¹Ù„ÙŠÙ‚Ø§Ù‹..." value="' + curComment.replace(/"/g, '&quot;') + '" oninput="saveSurveyComment(\'' + meal + '\',this.value)" style="width:100%;padding:6px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;font-family:Cairo;text-align:right;"></div>' +
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
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØŸ')) return;
      mealSurveys.splice(idx, 1);
      _lsSet('linah_meal_surveys', JSON.stringify(mealSurveys));
      renderSurveyLog();
      renderMealSurveyStats();
    }
    function editSurveyLog(idx) {
      var s = mealSurveys[idx];
      if (!s) return;
      var newComment = prompt('Ù…Ø¹Ø±ÙˆÙ Ø³Ø¬Ù„:', s.comment || '');
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
      var emojis = ['ðŸ˜ž','ðŸ˜','ðŸ™‚','ðŸ˜Š'];
      var labels = ['Ø³ÙŠØ¡ Ø¬Ø¯Ø§Ù‹','Ù…Ù‚Ø¨ÙˆÙ„','Ø¬ÙŠØ¯','Ù…Ù…ØªØ§Ø²'];
      var filtered = mealSurveys.filter(function(s) {
        if (from && s.date < from) return false;
        if (to && s.date > to) return false;
        return true;
      });
      filtered.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø§Ø³ØªØ¨ÙŠØ§Ù†Ø§Øª ÙˆØ¬Ø¨Ø§Øª Ù…Ø³Ø¬Ù„Ø©</td></tr>';
        return;
      }
      var html = '';
      filtered.forEach(function(s) {
        var realIdx = mealSurveys.indexOf(s);
        var r = s.rating;
        if (r >= 1 && r <= 4) r = r - 1;
        var ratingEmoji = (r >= 0 && r < emojis.length) ? emojis[r] : 'â€”';
        var ratingLabel = (r >= 0 && r < labels.length) ? labels[r] : 'â€”';
        html += '<tr style="background:white;">' +
          '<td style="padding:5px;border:1px solid #eee;">' + (s.date || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-weight:600;">' + (s.meal || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;">' + (s.employee || '') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-size:18px;" title="' + ratingLabel + '">' + ratingEmoji + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;font-size:11px;color:#666;max-width:200px;white-space:normal;">' + (s.comment || 'â€”') + '</td>' +
          '<td style="padding:5px;border:1px solid #eee;white-space:nowrap;">' +
            '<button onclick="editSurveyLog(' + realIdx + ')" style="background:#1565c0;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;margin-left:4px;">ØªØ¹Ø¯ÙŠÙ„</button>' +
            '<button onclick="deleteSurveyLog(' + realIdx + ')" style="background:#c62828;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">ÙØ±Ø¯</button>' +
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
      var emojis = ['ðŸ˜ž','ðŸ˜','ðŸ™‚','ðŸ˜Š'];
      var labels = ['Ø³ÙŠØ¡ Ø¬Ø¯Ø§Ù‹','Ù…Ù‚Ø¨ÙˆÙ„','Ø¬ÙŠØ¯','Ù…Ù…ØªØ§Ø²'];
      // Today's response count
      var todayCount = mealSurveys.filter(function(s) { return s.date === today; }).length;
      var html = '<div class="stat-card" style="background:#fff8e1;padding:10px;border:1px solid #ffe0b2;border-radius:8px;text-align:center;">' +
        '<div style="font-size:12px;color:#e65100;">Ù†Ø³Ø¨Ø© Ø§Ù„Ø±Ø¶Ø§ (Ø¢Ø®Ø± 7 Ø£ÙŠØ§Ù…)</div>' +
        '<div style="font-size:28px;font-weight:700;margin:4px 0;">' + (total > 0 ? Math.round((counts[2]+counts[3])/total*100) : 0) + '%</div>' +
        '<div style="font-size:12px;color:#888;">Ù…Ù† Ø¥Ø¬Ù…Ø§Ù„ÙŠ ' + total + ' ØªÙ‚ÙŠÙŠÙ…</div></div>';
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
        '<div style="font-size:12px;color:#888;">Ø¹Ø§Ø¯ÙŠØ© Ø¹Ù†Ø¯ ØªØ­Ù…ÙŠÙ„</div>' +
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
      if (!allNames.length) { allNames = ['Ø§Ù„ØµÙØ­Ø©','Ø¨ÙŠØ§Ù†Ø§Øª','Ù ','Ù©','Ù ','Ù© Ø§Ø³Ù…','Ø§Ù„Ø´ÙŠÙ','Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„','Ù…Ø·Ù„ÙˆØ¨','Ø§Ø®ØªØ±','Ø§Ù„ØªØ§Ø±ÙŠØ®','Ø£ÙˆÙ„Ø§Ù‹','ØªØ¹Ø¯ÙŠÙ„','Ø³Ø¬Ù„','ÙˆØ¬Ø¨Ø§Øª', 'ØªØ§Ø±ÙŠØ®','Ø´ÙŠÙ']; }
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
        '<input type="text" class="mw-ing-name" placeholder="Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù" value="' + (name||'') + '" list="mw-ing-suggestions" style="flex:2;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateIngredientSuggestions()" onchange="fillPriceFromMaster(this)">' +
        '<input type="number" class="mw-ing-qty" placeholder="Ø§Ù„ÙƒÙ…ÙŠØ©" min="0" step="0.01" value="' + (qty||'') + '" style="width:60px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateWasteCalc()">' +
        '<select class="mw-ing-unit" style="width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '<option value="ØªØ¹Ø¯ÙŠÙ„"' + (unit==='Ø³Ø¬Ù„'?' selected':'') + '>Ø§Ù„ÙˆØ¬Ø¨Ø§Øª</option>' +
          '<option value="Ù‡Ø°Ø§"' + (unit==='Ø§Ù„ØªØ§Ø±ÙŠØ®'?' selected':'') + '>Ù…Ø³Ø¬Ù„</option>' +
          '<option value="Ù…Ø³Ø¨Ù‚Ø§Ù‹"' + (unit==='Ø§Ø®ØªØ±'?' selected':'') + '>ØªØ¹Ø¯ÙŠÙ„</option>' +
          '<option value="Ù…Ù†"' + (unit==='Ø§Ù„Ø¬Ø¯ÙˆÙ„'?' selected':'') + '>Ø¥Ø¶Ø§ÙØ©</option>' +
          '<option value="Ø³Ø¬Ù„"' + (unit==='ÙˆØ¬Ø¨Ø§Øª'?' selected':'') + '>ØªØ§Ø±ÙŠØ®</option>' +
          '<option value="Ø´ÙŠÙ"' + (unit==='Ù‚ÙˆØ©'?' selected':'') + '>ØªÙ…</option>' +
        '</select>' +
        '<input type="number" class="mw-ing-price" placeholder="ØªØ³Ø¬ÙŠÙ„" min="0" step="0.01" value="' + (price||'') + '" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" oninput="updateWasteCalc()">' +
        '<button type="button" class="btn btn-danger" style="padding:2px 6px;font-size:10px;" onclick="this.closest(\'.mw-ing-row\').remove();updateWasteCalc()">âœ•</button>';
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
      if (engAte > 0) { document.getElementById('mw-avg-eng').textContent = (wasteEng / engAte).toFixed(2) + ' ÙƒØ¬Ù…/Ù…Ù‡Ù†Ø¯Ø³'; }
      else { document.getElementById('mw-avg-eng').textContent = 'â€”'; }
      if (wrkAte > 0) { document.getElementById('mw-avg-wrk').textContent = (wasteWrk / wrkAte).toFixed(2) + ' ÙƒØ¬Ù…/Ø¹Ø§Ù…Ù„'; }
      else { document.getElementById('mw-avg-wrk').textContent = 'â€”'; }
      if (guests > 0) { document.getElementById('mw-avg-guests').textContent = (wasteGuests / guests).toFixed(2) + ' ÙƒØ¬Ù…/Ø¶ÙŠÙ'; }
      else { document.getElementById('mw-avg-guests').textContent = 'â€”'; }
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
      if (!d) { document.getElementById('mw-emp-count').textContent = 'â€”'; document.getElementById('mw-expected-wt').textContent = 'â€”'; return; }
      var entry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === normalizeDateStr(d); });
      var count = 0;
      if (entry) {
        if (m === 'ÙØ·Ø§Ø±') count = entry.breakfast || 0;
        else if (m === 'ØºØ¯Ø§Ø¡') count = entry.lunch || 0;
        else if (m === 'Ø¹Ø´Ø§Ø¡') count = entry.dinner || 0;
      }
      if (!count) count = employees.filter(function(e) { return e.status === 'P'; }).length;
      var w = getExpectedWeightPerMeal(m, count);
      var portionKg = w.perPersonKg > 0 ? w.perPersonKg : 0.4;
      var expectedKg = (count * portionKg).toFixed(1);
      var dishList = w.dishes.length ? w.dishes.join('ØŒ ') : 'â€”';
      document.getElementById('mw-emp-count').textContent = count + ' ÙØ±Ø¯' + (w.dishes.length ? ' | ' + dishList : '');
      document.getElementById('mw-expected-wt').textContent = expectedKg + ' ÙƒØ¬Ù…' + (w.perPersonKg > 0 ? ' (' + (w.perPersonKg * 1000).toFixed(0) + ' Ø¬Ù…/ÙØ±Ø¯)' : '');
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
      document.getElementById('mw-meal').value = 'Ø¥ÙØ·Ø§Ø±';
      document.getElementById('mw-emp-count').textContent = 'â€”';
      document.getElementById('mw-expected-wt').textContent = 'â€”';
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
      document.getElementById('mw-avg-eng').textContent = 'â€”';
      document.getElementById('mw-avg-wrk').textContent = 'â€”';
      document.getElementById('mw-avg-guests').textContent = 'â€”';
    }
    function saveMealWaste() {
      var date = document.getElementById('mw-date').value;
      if (!date) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ®');
      var meal = document.getElementById('mw-meal').value;
      var chef = document.getElementById('mw-chef').value.trim();
      if (!chef) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø´ÙŠÙ');
      var ingredients = getIngredientsFromForm();
      if (!ingredients.length) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ§Ø¯ Ù„Ù„Ø²ÙŠØ§Ø±Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸.');
      var totalPrepared = 0;
      var wasteEng = parseFloat(document.getElementById('mw-waste-eng').value) || 0;
      var wasteWrk = parseFloat(document.getElementById('mw-waste-wrk').value) || 0;
      var prepWaste = parseFloat(document.getElementById('mw-prep-waste').value) || 0;
      if (wasteEng === 0 && wasteWrk === 0 && prepWaste === 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙ…ÙŠØ© Ø§Ù„Ù‡Ø¯Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„');
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
        var dayNames = ['Ø§Ù„Ø£Ø­Ø¯','Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†','Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡','Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡','Ø§Ù„Ø®Ù…ÙŠØ³','Ø§Ù„Ø¬Ù…Ø¹Ø©','Ø§Ù„Ø³Ø¨Øª'];
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
      logAction('Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„', 'Ù…Ø·Ù„ÙˆØ¨', 'Ù‡Ø¯Ø± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª: ' + normDate + ' | ' + meal + ' | ' + 'Ù‡Ø¯Ø± Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†: ' + wasteEng + ' ÙƒØ¬Ù…' + ' | Ù‡Ø¯Ø± Ø§Ù„Ø¹Ù…Ø§Ù„: ' + wasteWrk + ' ÙƒØ¬Ù…');
      alert('ØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ù‡Ø¯Ø± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª');
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
      if (!ingredientMaster.length) { el.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ØµÙ†Ø§Ù â€” Ø£Ø¶Ù ØµÙ†ÙØ§Ù‹ Ø¬Ø¯ÙŠØ¯Ø§Ù‹</div>'; return; }
      el.innerHTML = ingredientMaster.map(function(ing, idx) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #eee;">' +
          '<span><strong>' + ing.name + '</strong> â€” <span style="color:#2e7d32;">' + ing.price + ' Ø¬Ù†ÙŠÙ‡</span></span>' +
          '<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="deleteIngredientMaster(' + idx + ')">âœ•</button></div>';
      }).join('');
    }
    function addIngredientMasterItem() {
      var name = document.getElementById('im-name').value.trim();
      var price = parseFloat(document.getElementById('im-price').value) || 0;
      if (!name) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù');
      if (price <= 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø³Ø¹Ø± ØµØ­ÙŠØ­');
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
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø³Ø¬Ù„ Ù‡Ø¯Ø± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª Ù‡Ø°Ø§ØŸ')) return;
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
      var el = document.getElementById('mw-stats');
      if (!el) return;
      var filtered = getFilteredMealWaste();
      var totalWaste = 0, totalCost = 0, count = filtered.length, totalPrepared = 0, totalCookedQty = 0, totalPrepWaste = 0;
      filtered.forEach(function(w) {
        totalPrepared += getPreparedWeight(w);
        totalWaste += (w.wasteEng||0) + (w.wasteWrk||0) + (w.wasteGuests||0) + (w.prepWaste||0);
        totalPrepWaste += w.prepWaste || 0;
        totalCost += w.cost || 0;
        totalCookedQty += getPreparedWeight(w);
      });
      var wastePct = totalPrepared > 0 ? (Math.min(totalWaste / totalPrepared, 1) * 100) : 0;
      var totalEngAte = 0, totalWrkAte = 0, totalWasteFromEng = 0, totalWasteFromWrk = 0, totalWasteFromGuests = 0, totalGuests = 0;
      filtered.forEach(function(w) {
        totalEngAte += w.engAte || 0;
        totalWrkAte += w.wrkAte || 0;
        totalWasteFromEng += w.wasteEng || 0;
        totalWasteFromWrk += w.wasteWrk || 0;
        totalWasteFromGuests += w.wasteGuests || 0;
        totalGuests += w.guests || 0;
      });
      var avgEng = totalEngAte > 0 ? (totalWasteFromEng / totalEngAte) : 0;
      var avgWrk = totalWrkAte > 0 ? (totalWasteFromWrk / totalWrkAte) : 0;
      var avgGuests = totalGuests > 0 ? (totalWasteFromGuests / totalGuests) : 0;
      var totalPeople = totalEngAte + totalWrkAte + totalGuests;
      var costPerPerson = totalPeople > 0 ? (totalCost / totalPeople) : 0;
      var wasteR = totalPrepared > 0 ? Math.min(totalWaste / totalPrepared, 1) : 0;
      var wasteCost = wasteR * totalCost;
      var totalEmpInFilter = employees.filter(function(e) { return e.status === 'P'; }).length;
      el.innerHTML = [
        '<div style="background:#2e7d32;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + totalEmpInFilter + '</div><div style="font-size:11px;">Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø§Ù„Ø­Ø§Ù„ÙŠÙŠÙ† (P)</div></div>',
        '<div style="background:#4a148c;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + totalCookedQty.toFixed(1) + ' ÙƒØ¬Ù…</div><div style="font-size:11px;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ÙØ¹ÙŽØ¯</div></div>',
        '<div style="background:#795548;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + totalPrepWaste.toFixed(1) + ' ÙƒØ¬Ù…</div><div style="font-size:11px;">Ù‡Ø¯Ø± Ø§Ù„ØªØ­Ø¶ÙŠØ±</div></div>',
        '<div style="background:#d32f2f;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + totalWaste.toFixed(1) + ' ÙƒØ¬Ù…</div><div style="font-size:11px;">Ù‡Ø¯Ø± Ø§Ù„Ø·Ù‡ÙŠ</div></div>',
        '<div style="background:' + (wastePct <= 5 ? '#2e7d32' : '#d32f2f') + ';color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + wastePct.toFixed(1) + '%</div><div style="font-size:11px;">Ù†Ø³Ø¨Ø© Ø§Ù„Ù‡Ø¯Ø± (Ø§Ù„Ù‡Ø¯Ù â‰¤5%)</div></div>',
        '<div style="background:#1565c0;color:white;padding:10px;border-radius:8px;text-align:center;font-size:12px;"><div style="font-weight:700;">Ù…Ù‡Ù†Ø¯Ø³ ' + (totalEngAte > 0 ? avgEng.toFixed(2) + ' ÙƒØ¬Ù…' : 'â€”') + ' | Ø¹Ø§Ù…Ù„ ' + (totalWrkAte > 0 ? avgWrk.toFixed(2) + ' ÙƒØ¬Ù…' : 'â€”') + ' | Ø¶ÙŠÙˆÙ ' + (totalGuests > 0 ? avgGuests.toFixed(2) + ' ÙƒØ¬Ù…' : 'â€”') + '</div><div style="font-size:11px;">Ù…ØªÙˆØ³Ø· Ù‡Ø¯Ø±/ÙØ±Ø¯</div></div>',
        '<div style="background:#37474f;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + costPerPerson.toFixed(0) + ' Ø¬Ù†ÙŠÙ‡</div><div style="font-size:11px;">Ø§Ù„ØªÙƒÙ„ÙØ©/ÙØ±Ø¯ (' + totalPeople + ' ÙØ±Ø¯)</div></div>',
        '<div style="background:#b71c1c;color:white;padding:10px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;">' + wasteCost.toFixed(0) + ' Ø¬Ù†ÙŠÙ‡</div><div style="font-size:11px;">ØªÙƒÙ„ÙØ© Ø§Ù„Ù‡Ø¯Ø±</div></div>'
      ].join('');
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
      if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#999;padding:20px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù‡Ø¯Ø±</td></tr>'; return; }
      tbody.innerHTML = '';
      filtered.forEach(function(w) {
        var realIdx = mealWaste.indexOf(w);
        var total = (w.wasteEng||0) + (w.wasteWrk||0) + (w.wasteGuests||0) + (w.prepWaste||0);
        var avgEng = (w.engAte||0) > 0 ? ((w.wasteEng||0) / (w.engAte||1)) : 0;
        var avgWrk = (w.wrkAte||0) > 0 ? ((w.wasteWrk||0) / (w.wrkAte||1)) : 0;
        var avgGuests = (w.guests||0) > 0 ? ((w.wasteGuests||0) / (w.guests||1)) : 0;
        var people = (w.engAte||0) + (w.engTakeaway||0) + (w.wrkAte||0) + (w.wrkTakeaway||0) + (w.guests||0);
        var logEntry = mealLogs.find(function(l) { return normalizeDateStr(l.date) === normalizeDateStr(w.date); });
        var empCount = 0;
        if (logEntry) {
          if (w.meal === 'ÙØ·Ø§Ø±') empCount = logEntry.breakfast || 0;
          else if (w.meal === 'ØºØ¯Ø§Ø¡') empCount = logEntry.lunch || 0;
          else if (w.meal === 'Ø¹Ø´Ø§Ø¡') empCount = logEntry.dinner || 0;
        }
        if (!empCount) empCount = people;
        var wInfo = getExpectedWeightPerMeal(w.meal, empCount || 1, w.date);
        var expectedKg = empCount > 0 && wInfo.perPersonKg > 0 ? (empCount * wInfo.perPersonKg).toFixed(1) : 'â€”';
        var wastePerEmp = empCount > 0 ? (total / empCount).toFixed(2) : 'â€”';
        tbody.innerHTML += '<tr>' +
          '<td>' + toArabicNumerals(w.date) + '</td>' +
          '<td>' + (w.meal||'') + '</td>' +
          '<td>' + (w.chef||'') + '</td>' +
          '<td><b>' + (empCount > 0 ? empCount : 'â€”') + '</b></td>' +
          '<td style="color:#1565c0;">' + expectedKg + '</td>' +
          '<td style="color:#d32f2f;font-weight:700;">' + (w.wasteEng||0) + ' ÙƒØ¬Ù…' + (avgEng > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgEng.toFixed(2) + ' ÙƒØ¬Ù…/Ù…Ù‡Ù†Ø¯Ø³</span>' : '') + '</td>' +
          '<td style="color:#e65100;font-weight:700;">' + (w.wasteWrk||0) + ' ÙƒØ¬Ù…' + (avgWrk > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgWrk.toFixed(2) + ' ÙƒØ¬Ù…/Ø¹Ø§Ù…Ù„</span>' : '') + '</td>' +
          '<td style="color:#795548;font-weight:700;">' + (w.wasteGuests||0) + ' ÙƒØ¬Ù…' + (avgGuests > 0 ? '<br><span style="font-size:10px;font-weight:400;color:#999;">' + avgGuests.toFixed(2) + ' ÙƒØ¬Ù…/Ø¶ÙŠÙ</span>' : '') + '</td>' +
          '<td><b>' + total.toFixed(1) + ' ÙƒØ¬Ù…</b></td>' +
          '<td>' + wastePerEmp + '</td>' +
          '<td class="no-print"><button class="btn btn-warning" style="padding:1px 5px;font-size:10px;" onclick="editMealWaste(' + realIdx + ')">ØªØ¹Ø¯ÙŠÙ„</button> <button class="btn btn-danger" style="padding:1px 5px;font-size:10px;" onclick="deleteMealWaste(' + realIdx + ')">Ø­Ø°Ù</button></td>' +
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
          labels: ['Ù‡Ø¯Ø± Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†', 'Ù‡Ø¯Ø± Ø¹Ù…Ø§Ù„'],
          datasets: [{
            label: 'Ø§Ù„ÙƒÙ…ÙŠØ© (ÙƒØ¬Ù…)',
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
      if (!mealWaste.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù‡Ø¯Ø± Ù„Ù„ØªØµØ¯ÙŠØ±');
      var filtered = getFilteredMealWaste();
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù‡Ø¯Ø± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯');
      var xlData = filtered.map(function(w) {
        var ings = (w.ingredients||[]).map(function(i) { return i.name + ' ' + i.qty + ' ' + i.unit; }).join('ØŒ ');
        var avgEng = (w.engAte||0) > 0 ? ((w.wasteEng||0) / (w.engAte||1)).toFixed(2) : '';
        var avgWrk = (w.wrkAte||0) > 0 ? ((w.wasteWrk||0) / (w.wrkAte||1)).toFixed(2) : '';
        return { 'Ø§Ù„ØªØ§Ø±ÙŠØ®':w.date, 'Ø§Ù„ÙˆØ¬Ø¨Ø©':w.meal, 'Ø§Ù„Ø´ÙŠÙ':w.chef, 'Ø§Ù„Ø®Ø§Ù…Ø§Øª':ings,
          'Ø§Ù„ÙˆØ²Ù† Ø§Ù„Ù…Ø­Ø¶Ø± (ÙƒØ¬Ù…)':getPreparedWeight(w).toFixed(1), 'Ù‡Ø¯Ø± Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ† (ÙƒØ¬Ù…)':w.wasteEng, 'Ù‡Ø¯Ø± Ø§Ù„Ø¹Ù…Ø§Ù„ (ÙƒØ¬Ù…)':w.wasteWrk, 'Ù‡Ø¯Ø± Ø§Ù„Ø¶ÙŠÙˆÙ (ÙƒØ¬Ù…)':w.wasteGuests||0,
          'Ù‡Ø¯Ø± Ø§Ù„ØªØ­Ø¶ÙŠØ± (ÙƒØ¬Ù…)':w.prepWaste||0, 'Ø£ÙƒÙ„ Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†':w.engAte||0, 'ØªÙŠÙƒ Ø£ÙˆØ§ÙŠ Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†':w.engTakeaway||0, 'Ø£ÙƒÙ„ Ø¹Ù…Ø§Ù„':w.wrkAte||0, 'ØªÙŠÙƒ Ø£ÙˆØ§ÙŠ Ø¹Ù…Ø§Ù„':w.wrkTakeaway||0, 'Ø¶ÙŠÙˆÙ':w.guests||0,
          'Ù…ØªÙˆØ³Ø· Ù‡Ø¯Ø±/Ù…Ù‡Ù†Ø¯Ø³ (ÙƒØ¬Ù…)':avgEng, 'Ù…ØªÙˆØ³Ø· Ù‡Ø¯Ø±/Ø¹Ø§Ù…Ù„ (ÙƒØ¬Ù…)':avgWrk,
          'Ù…Ø§Ø¡ Ù…Ø¶Ø§Ù (Ù„ØªØ±)':w.waterAdded||0, 'Ù†Ø³Ø¨Ø© Ù‡Ø¯Ø±%':(function(){var _pw=getPreparedWeight(w);return _pw>0?(Math.min(((w.wasteEng||0)+(w.wasteWrk||0)+(w.wasteGuests||0)+(w.prepWaste||0))/_pw,1)*100).toFixed(1):0;})(),
          'Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„':w.responsible };
      });
      var ws = XLSX.utils.json_to_sheet(xlData); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¶ÙŠØ§ÙØ©');
      XLSX.writeFile(wb, 'Ø¨Ø§Ù„Ù…ÙˆÙ‚Ø¹_Ø¥Ø¬Ù…Ø§Ù„ÙŠ_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }

    function addSepticRecord() {
      let name = document.getElementById('septic-name-select').value;
      let trips = document.getElementById('septic-trips').value;
      let quantity = document.getElementById('septic-quantity').value;
      let superv = document.getElementById('septic-supervisor').value.trim();
      if(!name) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ø³Ù… Ø§Ù„Ø¨ÙŠØ§Ø±Ø©.");
      if(!trips || parseInt(trips) < 1) return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø§Øª.");
      if(!superv) { document.getElementById('septic-supervisor').focus(); return alert("Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±Ù Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„."); }

      let dateInput = document.getElementById('septic-date').value;
      septicRecords.push(_ts({ name, trips: parseInt(trips), quantity: parseFloat(quantity) || 0, supervisor: superv || 'â€”', date: dateInput || 'â€”' }));
      syncStorage(); renderSepticTable();
      logAction('ØªØ³Ø¬ÙŠÙ„', 'ÙƒØ³Ø­ Ø¨ÙŠØ§Ø±Ø©', name, 'Ø§Ù„Ù†Ù‚Ù„Ø§Øª: ' + trips + ' | Ø§Ù„ÙƒÙ…ÙŠØ©: ' + (quantity||0) + 'Ù…Â³ | Ø§Ù„Ù…Ø´Ø±Ù: ' + superv + ' | Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + dateInput);
      document.getElementById('septic-supervisor').value = '';
      alert("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„ÙƒØ³Ø­ Ø¨Ù†Ø¬Ø§Ø­.");
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
      alert("ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨ÙŠØ§Ø±Ø© ÙÙŠ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø¥Ø¶Ø§ÙØ© Ù„Ù„ØªØ¹Ø¯ÙŠÙ„. Ù‚Ù… Ø¨Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø«Ù… Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø¹ØªÙ…Ø§Ø¯.");
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
          <td><span style="color:var(--primary); font-weight:700;">${s.quantity ? s.quantity + ' Ù…Â³' : (s.trips * 5) + ' Ù…Â³'}</span></td>
          <td>${s.supervisor}</td>
          <td>${s.date}</td>
          <td class="no-print"><button class="btn btn-primary" style="padding:2px 6px; font-size:11px;margin-left:3px;" onclick="editSeptic(${realIdx})">ØªØ¹Ø¯ÙŠÙ„</button><button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteSeptic(${realIdx})">Ø­Ø°Ù</button></td>
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
        result.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¨ÙŠØ§Ø±Ø§Øª Ø¨Ø¹Ø¯</div>';
        return;
      }
      var stats = {};
      var totalTrips = 0, totalQty = 0, totalRecords = 0;
      septicRecords.forEach(function(s) {
        var name = s.name || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
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
      html += '<b>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª:</b> ' + sorted.length;
      html += ' | <b>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ù‚Ù„Ø§Øª:</b> ' + totalTrips.toLocaleString();
      html += ' | <b>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒÙ…ÙŠØ©:</b> ' + totalQty.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' Ù…3';
      html += ' | <b>Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª:</b> ' + totalRecords;
      html += '</div>';
      html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';
      html += '<thead><tr style="background:#00695c;color:white;">';
      html += '<th style="padding:8px;">#</th><th style="padding:8px;text-align:right;">Ø§Ø³Ù… Ø§Ù„Ø¨ÙŠØ§Ø±Ø©</th>';
      html += '<th style="padding:8px;">Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø§Øª</th>';
      html += '<th style="padding:8px;">Ø§Ù„ÙƒÙ…ÙŠØ© (Ù…3)</th>';
      html += '<th style="padding:8px;">Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø±Ø§Øª</th>';
      html += '<th style="padding:8px;">Ù…Ù† ØªØ§Ø±ÙŠØ®</th>';
      html += '<th style="padding:8px;">Ù…Ø®Ø·Ø· Ø§Ù„Ù†Ù‚Ù„Ø§Øª (Ø±Ø³Ù…)</th>';
      html += '</tr></thead><tbody>';
      sorted.forEach(function(s, i) {
        var barPct = Math.round(s.trips / maxTrips * 100);
        html += '<tr style="border-bottom:1px solid #eee;">';
        html += '<td style="padding:6px;color:#999;font-size:12px;">' + (i + 1) + '</td>';
        html += '<td style="padding:8px;font-weight:600;">' + s.name + '</td>';
        html += '<td style="padding:8px;text-align:center;font-weight:700;color:#d32f2f;">' + s.trips + '</td>';
        html += '<td style="padding:8px;text-align:center;">' + s.qty.toLocaleString(undefined, {maximumFractionDigits: 1}) + '</td>';
        html += '<td style="padding:8px;text-align:center;">' + s.count + '</td>';
        html += '<td style="padding:8px;color:#555;font-size:12px;">' + (s.firstDate || '-') + ' Ø¥Ù„Ù‰ ' + (s.lastDate || '-') + '</td>';
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
        alert("âœ… ØªÙ… ØªØ­Ù…ÙŠÙ„ Ù…Ù„Ù JSON.\n\nØ§Ù„Ø¢Ù† Ø´ØºÙ‘Ù„ ÙÙŠ PowerShell:\n\ncd " + String.fromCharCode(92) + "Users" + String.fromCharCode(92) + "Salem Magdy" + String.fromCharCode(92) + "Desktop" + String.fromCharCode(92) + "LINAHSYSTEM\npython linah_data.py import <Ø§Ø³Ù…_Ø§Ù„Ù…Ù„Ù.json>\n\nÙˆØ³ÙŠØ¨ Ø§Ù„Ù…Ù„Ù JSON Ø¹Ù„Ù‰ Ø³Ø·Ø­ Ø§Ù„Ù…ÙƒØªØ¨ Ø¹Ø´Ø§Ù† Ø§Ù„Ø³ÙƒØ±Ø¨Øª ÙŠÙ„Ø§Ù‚ÙŠÙ‡.");
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
            alert("âŒ Ø§Ù„Ù…Ù„Ù Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ù…ÙˆØ¸ÙÙŠÙ† â€” ØªØ£ÙƒØ¯ Ù…Ù† ØªØµØ¯ÙŠØ± SQLite Ø£ÙˆÙ„Ø§Ù‹");
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
          alert("âœ… ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ " + (data.employees.length || 0) + " Ù…ÙˆØ¸Ù Ù…Ù† SQLite Ø¨Ù†Ø¬Ø§Ø­");
        } catch(err) {
          alert("âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: " + err.message);
        }
      };
      reader.readAsText(file);
    }

    function exportEmployeesToExcel() {
      var today = new Date().toISOString().split('T')[0];
      var todayAr = new Date().toLocaleDateString('ar-EG');
      var wb = XLSX.utils.book_new();

      var permP = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'Ø¯Ø§Ø¦Ù…' && e.status === 'P'; });
      var permV = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'Ø¯Ø§Ø¦Ù…' && e.status === 'V'; });
      var casP = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'ÙƒØ§Ø¬ÙˆÙ„' && e.status === 'P'; });
      var casV = employees.filter(function(e) { return (e.contract || 'Ø¯Ø§Ø¦Ù…') === 'ÙƒØ§Ø¬ÙˆÙ„' && e.status === 'V'; });

      var cols = ['Ø§Ù„ÙƒÙˆØ¯', 'Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù Ø±Ø¨Ø§Ø¹ÙŠ', 'Ù†ÙˆØ¹ Ø§Ù„ØªØ¹Ø§Ù‚Ø¯', 'Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„', 'ØªØ§Ø±ÙŠØ® Ø§Ù„ØªØ¹ÙŠÙŠÙ†', 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©', 'Ø§Ù„ÙˆØ¸ÙŠÙØ©', 'Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©', 'Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø§Ù„Ø³ÙƒÙ†ÙŠ', 'Ø±Ù‚Ù… Ø§Ù„ØºØ±ÙØ©', 'Ø§Ù„Ù…ÙˆÙ‚Ù'];

      function makeRows(title, emps) {
        var out = [];
        out.push([title + ' (' + emps.length + ')']);
        out.push(cols);
        emps.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'ar'); }).forEach(function(e) {
          out.push([
            e.code || '',
            stripEmoji(e.name),
            e.contract || 'Ø¯Ø§Ø¦Ù…',
            e.nationalId || 'â€”',
            e.hireDate || 'â€”',
            stripEmoji(e.dept || 'â€”'),
            stripEmoji(e.title || 'â€”'),
            stripEmoji(e.gov || 'â€”'),
            e.sector || 'â€”',
            e.room || 'â€”',
            e.status === 'P' ? 'Ù…ØªÙˆØ§Ø¬Ø¯' : 'ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©'
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

      addSection('Ø§Ù„Ù‚ÙˆØ© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø© â€” Ù…ØªÙˆØ§Ø¬Ø¯ÙˆÙ†', permP);
      addSection('Ø§Ù„Ù‚ÙˆØ© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø© â€” ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©', permV);
      addSection('Ø§Ù„Ù‚ÙˆØ© ÙƒØ§Ø¬ÙˆÙ„ â€” Ù…ØªÙˆØ§Ø¬Ø¯ÙˆÙ†', casP);
      addSection('Ø§Ù„Ù‚ÙˆØ© ÙƒØ§Ø¬ÙˆÙ„ â€” ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©', casV);

      // Ø§Ù„Ø¶ÙŠØ§ÙØ© Ø§Ù„Ù†Ø´Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹
      var activeHosp = hospitalities.filter(function(h) {
        if (!h.arrival) return false;
        return h.arrival <= today && (h.departure || '2099-12-31') >= today;
      });
      if (activeHosp.length) {
        rows.push([{ v: 'Ø§Ù„Ø¶ÙŠØ§ÙØ© Ø¨Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø­Ø§Ù„ÙŠØ§Ù‹ â€” ' + todayAr, t: 's' }]);
        merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 5 } });
        rows.push(['Ø§Ù„Ø§Ø³Ù…', 'Ø§Ù„Ù†ÙˆØ¹', 'Ø§Ù„Ù„Ù‚Ø¨', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø¶ÙŠÙˆÙ', 'ØªØ§Ø±ÙŠØ® Ø§Ù„ÙˆØµÙˆÙ„', 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ØºØ§Ø¯Ø±Ø©', 'Ø§Ù„ÙˆØ¬Ø¨Ø§Øª']);
        activeHosp.forEach(function(h) {
          rows.push([stripEmoji(h.name), h.type || '', stripEmoji(h.title || ''), h.guests || 1, h.arrival || '', h.departure || '', Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '')]);
        });
        rows.push([]);
      }

      // Ù…Ù„Ø®Øµ
      rows.push([{ v: 'Ù…Ù„Ø­Øµ Ø¥Ø­ØµØ§Ø¦ÙŠ â€” ' + todayAr, t: 's' }]);
      merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 3 } });
      rows.push(['Ø§Ù„Ø¨ÙŠØ§Ù†', 'Ø§Ù„Ø¹Ø¯Ø¯']);
      rows.push(['Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù‚ÙˆØ©', employees.length]);
      rows.push(['Ø¯Ø§Ø¦Ù… Ù…ØªÙˆØ§Ø¬Ø¯', permP.length]);
      rows.push(['Ø¯Ø§Ø¦Ù… ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©', permV.length]);
      rows.push(['ÙƒØ§Ø¬ÙˆÙ„ Ù…ØªÙˆØ§Ø¬Ø¯', casP.length]);
      rows.push(['ÙƒØ§Ø¬ÙˆÙ„ ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©', casV.length]);
      rows.push(['Ø¶ÙŠØ§ÙØ© Ù†Ø´Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹', activeHosp.length]);

      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      if (merges.length) ws['!merges'] = merges;
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ù‚ÙˆØ©");
      XLSX.writeFile(wb, "Ø§Ù„Ù‚ÙˆØ©_" + today.replace(/-/g, '') + ".xlsx");
    }

    function exportSelectedEmployees() {
      var table = document.getElementById('table-employees-data');
      if (!table) return;
      var checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
      if (!checkboxes.length) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù…ÙˆØ¸Ù Ù„Ù„ØªØµØ¯ÙŠØ±');
      var selectedIndices = [];
      checkboxes.forEach(function(cb) {
        var tr = cb.closest('tr');
        if (tr) selectedIndices.push(parseInt(tr.dataset.index));
      });
      var selectedEmps = selectedIndices.map(function(i) { return employees[i]; }).filter(Boolean);
      if (!selectedEmps.length) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ø³Ø§ÙƒÙ† Ù„ØªØµØ¯ÙŠØ± Ø¨ÙŠØ§Ù†Ø§ØªÙ‡.');
      var today = new Date().toISOString().split('T')[0];
      var wb = XLSX.utils.book_new();
      function empRow(e) {
        return {
          "Ø§Ø³ØªÙŠØ±Ø§Ø¯": e.code || "",
          "ÙƒØ´Ù Ø§Ù„Ø³ÙƒÙ†": stripEmoji(e.name),
          "Ø¨Ù†Ø¬Ø§Ø­": stripEmoji(e.dept),
          "ØºØ±ÙØ©": stripEmoji(e.title),
          "ÙÙŠ": e.sector || "",
          "Ù…Ø¨Ù†Ù‰": e.room || "",
          "ØªÙ… ØªØ±Ø­ÙŠÙ„": e.hireDate || "",
          "Ù…ÙˆØ¸Ù Ø­Ø³Ø¨": e.nationalId || ""
        };
      }
      var rows = [];
      rows.push([{ v: 'Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ ÙÙŠ (' + selectedEmps.length + ')', t: 's' }]);
      rows.push([{ v: 'Ø§Ù„Ù…Ù„Ù', t: 's' }, { v: 'Ù‡Ù„ Ø£Ù†Øª', t: 's' }, { v: 'Ù…ØªØ£ÙƒØ¯', t: 's' }, { v: 'Ù…Ù†', t: 's' }, { v: 'Ø§Ø³ØªØ¨Ø¯Ø§Ù„', t: 's' }, { v: 'Ø¨ÙŠØ§Ù†Ø§Øª', t: 's' }, { v: 'Ø§Ù„Ø³ÙƒÙ† Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŸ', t: 's' }, { v: 'Ø³ÙŠØªÙ… Ø­Ø°Ù', t: 's' }]);
      selectedEmps.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'ar'); }).forEach(function(e) {
        var r = empRow(e);
        rows.push([r["Ø¬Ù…ÙŠØ¹"], r["Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³Ø¹Ø©"], r["Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©"], r["ÙˆØ¥Ø¶Ø§ÙØ©"], r["Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª"], r["Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©"], r["Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø§Ù„Ø³ÙƒÙ†ÙŠ"], r["Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø³ÙƒÙ†ÙŠ"]]);
      });
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø±Ù‚Ù…");
      XLSX.writeFile(wb, "Ø§Ù„ØºØ±ÙØ©_Ø§Ù„ØºØ±ÙØ©_" + today.replace(/-/g, '') + ".xlsx");
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
            code: row["Ø§Ù„Ø³Ø¹Ø©"] || row["Ø§Ù„Ø£Ø³Ø±Ø© Ø§Ù„Ø³Ø¹Ø©"] || (index + 1001).toString(),
            name: row["Ø§Ù„Ø£Ø³Ø±Ø© Ø§Ù„Ù…Ù„Ù Ù„Ø§"] || row["ÙŠØ­ØªÙˆÙŠ"] || row["Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª"] || "",
            contract: row["ØµØ§Ù„Ø­Ø© ØªÙ…"] || "Ø¥Ø­Ù„Ø§Ù„",
            nationalId: row["Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙƒÙ†"] || row["Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø¨Ù†Ø¬Ø§Ø­"] || "",
            hireDate: row["ØºØ±ÙØ© ÙÙŠ"] || "",
            dept: row["Ù…Ø¨Ù†Ù‰"] || row["Ø§Ù„Ù…Ù„Ù"] || "ÙØ§Ø±Øº Ø®Ø·Ø£",
            title: row["ÙÙŠ"] || row["Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù"] || "Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø®Ø²Ù†",
            gov: row["ØµØ±ÙÙŠØ§Øª"] || row["Ø¨ÙˆÙ†Ø§Øª"] || "Ø§Ù„Ù…Ø®Ø²Ù†",
            sector: row["Ø±Ù‚Ù… Ø§Ù„Ø¨ÙˆÙ†"] || row["Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø¥Ø¯Ø§Ø±Ø©"] || row["Ø§Ù„Ù…ÙˆØ§Ø±Ø¯"] || "",
            room: row["Ø§Ù„Ø¨Ø´Ø±ÙŠØ© Ø§Ø³Ù…"] || row["Ø§Ù„Ù…ÙˆØ¸Ù"] || "",
            status: (row["Ù…Ø­Ù…Ø¯ (P/V)"] || row["Ø£Ø­Ù…Ø¯"] || "P").toString().toUpperCase().trim(),
            vacationBalance: parseInt(row["ÙƒÙˆØ¯ Ø§Ù„ØµÙ†Ù"] || row["Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù"] || 30) || 30,
            assets: []
          })).filter(e => e.name.length > 0);

          employees.forEach(function(e) { if (typeof e.vacationBalance !== 'number') e.vacationBalance = 30; });
          sortEmployeesAlphabetically(); syncStorage(); renderTable(); rebuildAllDropdowns();
          alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ${employees.length} Ù…ÙˆØ¸Ù Ø¨Ù†Ø¬Ø§Ø­.`);
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
            "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù‡Ù†Ø§": sector,
            "Ø¨ÙˆÙ†Ø§Øª Ø§Ù„ØµØ±Ù": r.number,
            "Ù†Ù…ÙˆØ°Ø¬ (Ø¨ÙˆÙ†Ø§Øª)": r.beds,
            "ØµØ±Ù": present.length,
            "Ø§Ù„Ù…Ø®Ø²Ù†": r.beds - residents.length,
            "Ù„Ø§ (ÙŠÙ…ÙƒÙ†)": present.map(e => e.name + ' [' + (e.code || '-') + ']').join(', '),
            "ØªØ¹Ø¯ÙŠÙ„ (Ø³Ø¬Ù„Ø§Øª)": vacation.map(e => e.name + ' [' + (e.code || '-') + ']').join(', ')
          });
        });
      });
      let ws = XLSX.utils.json_to_sheet(data);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ø£ÙŠØ§Ù… Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© ØªÙ…");
      XLSX.writeFile(wb, "ØªØ­Ù…ÙŠÙ„_Ø¨ÙŠØ§Ù†Ø§Øª_Ø§Ù„Ø¨ÙˆÙ†_ÙÙŠ_Ù†Ù…ÙˆØ°Ø¬.xlsx");
    }

    function exportHousingEmployeesToExcel() {
      var choice = confirm('ØªØµØ¯ÙŠØ± ÙƒÙ„ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†ØŸ\n\nOK = Ø§Ù„ÙƒÙ„\nØ¥Ù„ØºØ§Ø¡ = Ø§Ø®ØªØ§Ø± Ø§Ù„ØªØµØ¯ÙŠØ± Ø­Ø³Ø¨ Ø§Ù„ØªØ­Ø¯ÙŠØ¯');
      var exportAll = choice;
      var emps = exportAll ? employees : employees.filter(function(e) { return e.room && e.sector; });
      emps = emps.filter(function(e) { return e.room && e.sector; }).sort(function(a,b) { return (a.sector||'').localeCompare(b.sector||'', 'ar') || (a.room||'').localeCompare(b.room||'', 'ar', {numeric:true}); });
      if (!emps.length) return alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙŠÙ† Ø¨Ø³ÙƒÙ† Ù„Ù„ØªØµØ¯ÙŠØ±.');
      var data = emps.map(function(e) {
        return {
          'Ø§Ù„Ù…Ø¨Ù†Ù‰': e.sector || '',
          'Ø§Ù„ØºØ±ÙØ©': e.room || '',
          'Ø§Ù„ÙƒÙˆØ¯': e.code || e.id || '',
          'Ø§Ù„Ø§Ø³Ù…': e.name || '',
          'Ø§Ù„Ø­Ø§Ù„Ø©': e.status === 'P' ? 'Ù…ÙˆØ¬ÙˆØ¯' : e.status === 'V' ? 'Ø¥Ø¬Ø§Ø²Ø©' : e.status || '',
          'Ø§Ù„Ù‚Ø³Ù…': e.dept || '',
          'Ø§Ù„ÙˆØ¸ÙŠÙØ©': e.title || ''
        };
      });
      var ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{wch:18},{wch:10},{wch:10},{wch:22},{wch:10},{wch:18},{wch:18}];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø³ÙƒÙ† Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†');
      XLSX.writeFile(wb, 'Ø³ÙƒÙ†_Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }

    function importHousingEmployeesFromExcel(evt) {
      var file = evt.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb = XLSX.read(data, {type:'array'});
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if (!rows || !rows.length) return alert('Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº.');
          var updated = 0, skipped = 0;
          rows.forEach(function(r) {
            var code = String(r['Ø§Ù„ÙƒÙˆØ¯'] || '').trim();
            var sector = String(r['Ø§Ù„Ù…Ø¨Ù†Ù‰'] || '').trim();
            var room = String(r['Ø§Ù„ØºØ±ÙØ©'] || '').trim();
            var status = String(r['Ø§Ù„Ø­Ø§Ù„Ø©'] || '').trim();
            if (!code || !sector || !room) { skipped++; return; }
            var emp = employees.find(function(e) { return (e.code || e.id) === code; });
            if (!emp) { skipped++; return; }
            emp.sector = sector;
            emp.room = room;
            if (status === 'Ù…ÙˆØ¬ÙˆØ¯') emp.status = 'P';
            else if (status === 'Ø¥Ø¬Ø§Ø²Ø©') emp.status = 'V';
            updated++;
          });
          syncStorage(); renderAll();
          alert('ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ' + updated + ' Ù…ÙˆØ¸Ù Ø¨Ù†Ø¬Ø§Ø­.\nØªØ®Ø·ÙŠ: ' + skipped);
        } catch(ex) { alert('Ø®Ø·Ø£: ' + ex.message); }
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
        if(json.length === 0) return alert('Ø§Ù„Ù…Ù„Ù Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª');
        let movedCount = 0;
        let newRooms = json.map(r => {
          let sector = (r["Ù‚Ù… Ø¨Ø§Ù„ØªØ¹Ø¯ÙŠÙ„"] || r["Ø«Ù… Ø¥Ø¹Ø§Ø¯Ø©"] || r["Ø§Ù„Ø¥Ø¹ØªÙ…Ø§Ø¯"] || "A").toString().trim();
          let number = (r["Ø¨Ø¹Ø¯ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„"] || r["Ø§Ù„Ù…Ù„Ù"] || "1").toString().trim();
          let beds = parseInt(r["ÙØ§Ø±Øº (Ø£Ùˆ)"] || r["Ù„Ø§"] || r["ÙŠØ­ØªÙˆÙŠ"] || 4);
          let presentNames = (r["Ø¹Ù„Ù‰ (Ø¨ÙŠØ§Ù†Ø§Øª)"] || r["Ù…Ø«Ø§Ù„"] || '').toString().trim();
          let vacationNames = (r["Ø§Ø³Ù… (Ø§Ù„ØµÙ†Ù)"] || '').toString().trim();
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
        let msg = '? Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„ÙˆØ­Ø¯Ø©.\n' + newRooms.length + ' Ø¹Ø¯Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ' + newSectors.length + ' Ø§Ù„ÙƒÙ…ÙŠØ©.';
        if (movedCount > 0) msg += '\nØªÙ… Ù†Ù‚Ù„ ' + movedCount + ' Ù…ÙˆØ¸Ù Ø¥Ù„Ù‰ ØºØ±ÙÙ‡Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©.';
        alert(msg);
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function replaceHousingFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      if(!confirm('Ø¨ÙŠØ§Ù†Ø§Øª Ø¨ÙŠØ§Ù†Ø§Øª ØªØ§Ø±ÙŠØ® Ø§Ù„ØµØ±Ù Ø¨ÙŠØ§Ù†Ø§Øª ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨ÙˆÙ† ØµØ±Ù\nØŒ ØªÙ… ØªØ®Ø·ÙŠÙ‡Ø§ Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù ÙƒÙˆØ¯ Ø§Ù„ØµÙ†Ù.')) { evt.target.value = ''; return; }
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if(json.length > 0) {
            let newRooms = json.map(r => ({
              sector: (r["Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù"] || r["Ù…Ø«Ø§Ù„ ØµÙ†Ù"] || r["Ø§Ù„ÙˆØ­Ø¯Ø©"] || r["Sector"] || "A").toString().trim(),
              number: (r["Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø®Ø²Ù†"] || r["Ø§Ù„Ù…ÙˆÙ‚Ø¹"] || r["Room"] || "1").toString().trim(),
              beds: parseInt(r["Ù…Ø®Ø²Ù† (Ø±Ø¦ÙŠØ³ÙŠ)"] || r["Ø§Ù„Ø£ØµÙ†Ø§Ù"] || r["Ù†Ù…ÙˆØ°Ø¬"] || r["Beds"] || r["Capacity"] || 4)
            })).filter(r => r.number && r.beds > 0);
            if(newRooms.length === 0) { alert('Ø§Ù„Ù…Ù„Ù Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª ØµØ§Ù„Ø­Ø©.'); return; }
            roomsCapacity = newRooms;
            let newSectors = [...new Set(newRooms.map(r => r.sector))];
            let newRoomsList = [...new Set(newRooms.map(r => r.number))];
            newSectors.forEach(s => { if(!dynamicSectors.includes(s)) dynamicSectors.push(s); });
            newRoomsList.forEach(r => { if(!dynamicRooms.includes(r)) dynamicRooms.push(r); });
            manualTotalBeds = 0; _lsRemove('lineh_manual_total_beds');
            syncStorage(); renderHousingLayout(); updateHousingStats(); rebuildAllDropdowns();
            alert('ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙƒÙ†.\nØ¹Ø¯Ø¯ Ø§Ù„ØºØ±Ù: ' + newRooms.length + '\nØ¹Ø¯Ø¯ Ø§Ù„Ù‚Ø·Ø§Ø¹Ø§Øª: ' + newSectors.length);
          } else { alert('Ø¯Ø§Ø¦Ù… Ø±Ù‚Ù….'); }
        } catch(err) { alert('Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù: ' + err.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportInventoryToExcel() {
      let ws = XLSX.utils.json_to_sheet(inventoryVouchers); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø¨ÙˆÙ†Ø§Øª Ø§Ù„ØµØ±Ù"); XLSX.writeFile(wb, "Ø¨ÙˆÙ†Ø§Øª_ØµØ±Ù_Ø§Ù„Ù…Ø®Ø²Ù†_" + new Date().toISOString().split('T')[0] + ".xlsx");
    }

    function downloadTemplate_InventoryVouchers() {
      let data = [{ "Ø±Ù‚Ù… Ø§Ù„Ø¨ÙˆÙ†": "BN000001", "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©": "Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø§Ù„Ø³ÙƒÙ†ÙŠ", "Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø³ØªÙ„Ù…": "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù", "Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù": "ITM001", "ÙƒÙˆØ¯ Ø§Ù„ØµÙ†Ù": "CODE001", "Ø§Ù„ÙˆØ­Ø¯Ø©": "Ø¹Ø¯Ø¯", "Ø§Ù„ÙƒÙ…ÙŠØ©": 5, "ØªØ§Ø±ÙŠØ® Ø§Ù„ØµØ±Ù": new Date().toISOString().split('T')[0], "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": "ØµØ±Ù Ø¹Ø§Ø¯ÙŠ" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø¨ÙˆÙ†Ø§Øª Ø§Ù„ØµØ±Ù"); XLSX.writeFile(wb, "Ù†Ù…ÙˆØ°Ø¬_Ø¨ÙˆÙ†Ø§Øª_Ø§Ù„ØµØ±Ù.xlsx");
    }

    function editInventoryVoucher(idx) {
      let v = inventoryVouchers[idx]; if(!v) return;
      if (!canEditRecord(v.date)) { alert('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø³Ø¬Ù„ Ù‚Ø¯ÙŠÙ…'); return; }
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
      alert("ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨ÙˆÙ† ÙÙŠ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø¥Ø¶Ø§ÙØ© Ù„Ù„ØªØ¹Ø¯ÙŠÙ„. Ù‚Ù… Ø¨Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø«Ù… Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø¹ØªÙ…Ø§Ø¯ Ø¨Ø¹Ø¯ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„.");
    }

    function importInventoryVouchersFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if(!json || json.length === 0) return alert("Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº Ø£Ùˆ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª ØµØ§Ù„Ø­Ø©.");
          let added = 0, skipped = 0;
          json.forEach(row => {
            let skipRow = false;
            for(let key in row) {
              let v = (row[key]||'').toString().trim();
              if(v.startsWith('Ø§Ù„Ø´Ø§ÙŠ')) { skipRow = true; break; }
            }
            if(skipRow) return;
            let itemName = (row["Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù"] || row["ITEM_NAME"] || row["itemName"] || '').toString().trim();
            let dept = (row["Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©"] || row["dept"] || row["DEPT"] || '').toString().trim();
            let empName = (row["Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø³ØªÙ„Ù…"] || row["EMP_NAME"] || row["empName"] || '').toString().trim();
            let unit = (row["Ø§Ù„ÙˆØ­Ø¯Ø©"] || row["unit"] || row["Unit"] || '').toString().trim();
            let qty = parseInt(row["Ø§Ù„ÙƒÙ…ÙŠØ©"] || row["qty"] || row["QTY"] || 0);
            let notes = (row["Ù…Ù„Ø§Ø­Ø¸Ø§Øª"] || row["notes"] || row["NOTES"] || '').toString().trim();
            let itemCode = (row["ÙƒÙˆØ¯ Ø§Ù„ØµÙ†Ù"] || row["ITEM_CODE"] || row["itemCode"] || '').toString().trim();
            let voucherId = (row["Ø±Ù‚Ù… Ø§Ù„Ø¨ÙˆÙ†"] || row["voucherId"] || 'BN' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2,4)).toString().trim();
            let date = (row["ØªØ§Ø±ÙŠØ® Ø§Ù„ØµØ±Ù"] || row["date"] || row["DATE"] || '').toString().trim() || new Date().toLocaleDateString('ar-EG');
            if(itemName && dept && empName && qty > 0) {
              inventoryVouchers.push({ voucherId, dept, empId: '', empName, itemName, itemCode, unit, qty, date, notes });
              added++;
            }
          });
          syncStorage(); renderInventoryTable();
          alert(`ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: ${added} Ø¨ÙˆÙ† ØµØ±Ù${skipped ? `ØŒ ${skipped} ØªÙ… ØªØ®Ø·ÙŠÙ‡Ø§` : ''}.`);
          evt.target.value = '';
        } catch(err) { alert("ØªÙ‚Ø±ÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
    }

    function downloadTemplate_Items() {
      let data = [{ "Ø§Ù„ØªØ³Ø¬Ù„ Ø§Ù„Ù…Ù„Ù": "ITM001", "ÙØ§Ø±Øº ØªØ§Ø±ÙŠØ®": "Ø§Ù„ØªÙˆØ²ÙŠØ¹ ÙƒÙˆØ¯", "Ø§Ù„Ù…ÙˆØ¸Ù": "Ø§Ù„ÙƒÙˆØ¯", "Ø§Ø³Ù… / Ø§Ù„Ù…ÙˆØ¸Ù": "Ø§Ù„Ø§Ø³Ù… Ø´Ø§ÙŠ" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø³ÙƒØ±"); XLSX.writeFile(wb, "Ù„Ù…_ÙŠØªÙ…_Ø§Ù„Ø¹Ø«ÙˆØ±_Ø¹Ù„Ù‰.xlsx");
    }

    function downloadTemplate_Employees() {
      let data = [{ "ØµÙ": "1001", "Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ† ØªØ£ÙƒØ¯ Ø£Ù†": "Ø§Ù„Ø´ÙŠØª ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰", "Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„ÙƒÙˆØ¯ØŒ": "Ø§Ù„Ø§Ø³Ù…ØŒ", "Ø´Ø§ÙŠØŒ Ø³ÙƒØ±": "0100xxxxxxx", "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙˆØ²ÙŠØ¹": "2024-01-01", "ØªØ§Ø±ÙŠØ®": "Ø§Ù„ØµØ±Ù Ø§Ù„ÙƒÙˆØ¯", "ÙƒÙˆØ¯": "Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ø§Ø³Ù…", "Ø§Ø³Ù…": "Ø§Ù„Ù…ÙˆØ¸Ù", "Ø§Ù„ÙˆØ¸ÙŠÙØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©": "A", "ØºØ±ÙØ© Ù‚Ø·Ø§Ø¹": "A1", "Ø§Ù„Ø¯ÙˆØ±Ø© (P/V)": "P", "Ø´Ø§ÙŠ Ø§Ù„Ø´Ø§ÙŠ": 30 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ø´Ø§ÙŠ"); XLSX.writeFile(wb, "Ø¨Ø§ÙƒÙŠØª_Ø³ÙƒØ±_Ø§Ù„Ø³ÙƒØ±_Ø§Ù„Ø³ÙƒØ±.xlsx");
    }

    function downloadTemplate_Housing() {
      let data = [{ "ÙƒØ¬Ù… Ø§Ù„Ø§ÙˆÙ„ÙŠ": "A", "Ø§Ù„Ø£ÙˆÙ„Ù‰ Ø§Ù„Ø¯ÙˆØ±Ø©": "A1", "Ø§Ù„Ø£ÙˆÙ„Ù‰ (Ø§Ù„Ø«Ø§Ù†ÙŠØ©)": 4 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ø«Ø§Ù†ÙŠÙ‡ Ø§Ù„Ø¯ÙˆØ±Ø©"); XLSX.writeFile(wb, "Ø§Ù„Ø«Ø§Ù†ÙŠØ©_Ø§Ù„Ø¯ÙˆØ±Ø©_Ø§Ù„Ø£ÙˆÙ„Ù‰_Ø§Ù„Ø¯ÙˆØ±Ø©_Ø§Ù„Ø£ÙˆÙ„Ù‰.xlsx");
    }

    // --- Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ ---
    function downloadTemplate_TeaSugar() {
      let data = [{ "ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ¸Ù": "1001", "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù": "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù", "Ø§Ù„Ø´Ø§ÙŠ (Ø¨Ø§ÙƒÙŠØª)": 2, "Ø§Ù„Ø³ÙƒØ± (ÙƒØ¬Ù…)": 1 }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø´Ø§ÙŠ ÙˆØ³ÙƒØ±"); XLSX.writeFile(wb, "Ù†Ù…ÙˆØ°Ø¬_Ø´Ø§ÙŠ_ÙˆØ³ÙƒØ±.xlsx");
    }
    function exportTeaSugarToExcel() {
      var monthFilter = document.getElementById('ts-month-filter')?.value || '';
      var items = monthFilter ? teaSugarDisbursements.filter(function(t) { return _tsMonthKey(t.date) === monthFilter; }) : teaSugarDisbursements;
      var data = sortNewestFirst(items, 'date').map(function(t) {
        var emp = employees.find(function(e) { return (e.id || e.code) == t.empId || e.name === t.empName; });
        return { "ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ¸Ù": (emp && emp.code) ? emp.code : (t.empCode || ''), "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù": stripEmoji(emp ? emp.name : (t.empName || t.empCode || '')), "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©": stripEmoji(emp ? emp.dept : (t.empDept || '')), "Ø§Ù„ÙˆØ¸ÙŠÙØ©": stripEmoji(emp ? emp.title : (t.empTitle || '')), "Ø§Ù„Ø´Ø§ÙŠ (Ø¨Ø§ÙƒÙŠØª)": t.teaPacks || 0, "Ø§Ù„Ø³ÙƒØ± (ÙƒØ¬Ù…)": t.sugarKg || 0, "Ø§Ù„Ø¯ÙˆØ±Ø©": t.period || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„ØµØ±Ù": t.date || '' };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      var label = monthFilter ? _tsMonthName(monthFilter) : 'Ø§Ù„ÙƒÙ„';
      XLSX.utils.book_append_sheet(wb, ws, "Ø´Ø§ÙŠ ÙˆØ³ÙƒØ±"); XLSX.writeFile(wb, "ØªÙ‚Ø±ÙŠØ±_Ø§Ù„Ø´Ø§ÙŠ_ÙˆØ§Ù„Ø³ÙƒØ±_" + label.replace(/ /g, '_') + ".xlsx");
    }

    function importTeaSugarFromExcel(evt) {
      let file = evt.target.files[0];
      if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, {type: 'array'});
          let sheetName = workbook.SheetNames.find(n => n.includes('Ø´Ø§ÙŠ') || n.includes('Tea')) || workbook.SheetNames[0];
          let ws = workbook.Sheets[sheetName];
          let rows = XLSX.utils.sheet_to_json(ws, {header: 1});
          if(!rows || rows.length < 2) return alert("Ù…Ù„Ù ÙØ§Ø±ØºØŒ ØªØ£ÙƒØ¯ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª.");

          let hRow = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            let r = rows[i];
            if (!r) continue;
            let txt = (r.join(' ') || '');
            if (txt.indexOf('Ø´Ø§ÙŠ') !== -1 || txt.indexOf('Ø³ÙƒØ±') !== -1 || (txt.indexOf('ÙƒÙˆØ¯') !== -1 && txt.indexOf('Ø§Ø³Ù…') !== -1)) {
              hRow = i;
              break;
            }
          }
          if (hRow < 0) return alert('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ØµÙ Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†. ØªØ£ÙƒØ¯ Ø£Ù† Ø§Ù„Ø´ÙŠØª ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø¹Ù…Ø¯Ø©: Ø§Ù„ÙƒÙˆØ¯ØŒ Ø§Ù„Ø§Ø³Ù…ØŒ Ø´Ø§ÙŠØŒ Ø³ÙƒØ±');

          let cols = rows[hRow];
          function _colMatch(c, words) { var t = c.trim(); return words.some(function(w){return t.indexOf(w)!==-1;}); }
          let colText = cols.map(c => (c || '').toString().trim());
          let idx = {
            date: colText.findIndex(c => _colMatch(c, ['ØªØ§Ø±ÙŠØ®','Ø§Ù„ØªØ§Ø±ÙŠØ®','Date','date'])),
            code: colText.findIndex(c => _colMatch(c, ['ÙƒÙˆØ¯','Ø§Ù„ÙƒÙˆØ¯','Code','code','empCode'])),
            name: colText.findIndex(c => _colMatch(c, ['Ø§Ø³Ù…','Ø§Ù„Ø§Ø³Ù…','Name','name','empName'])),
            period: colText.findIndex(c => _colMatch(c, ['Ø§Ù„Ø¯ÙˆØ±Ø©','Ø¯ÙˆØ±Ø©','period','Period'])),
            tea: colText.findIndex(c => _colMatch(c, ['Ø´Ø§ÙŠ','Tea','tea','Ø¨Ø§ÙƒÙŠØª','packs'])),
            sugar: colText.findIndex(c => _colMatch(c, ['Ø³ÙƒØ±','Sugar','sugar']))
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
              if (day >= 1 && day <= 7) period = 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (1-7)';
              else if (day >= 15 && day <= 21) period = 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© (15-21)';
              else if (day <= 14) period = 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ (1-7)';
              else period = 'Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© (15-21)';
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
          alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø³Ø¬Ù„ Ø´Ø§ÙŠ ÙˆØ³ÙƒØ± Ø¨Ù†Ø¬Ø§Ø­.`);
        } catch(err) {
          alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportVacationsToExcel() {
      var data = sortNewestFirst(vacations, 'start').map(function(v) {
        return { "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©": v.start || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©": v.end || '', "ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ¸Ù": v.code || '', "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù": stripEmoji(v.name), "Ø§Ù„Ø¨ÙŠØ§Ù†": stripEmoji(v.info), "Ø¹Ø¯Ø¯ Ø§Ù„Ø£ÙŠØ§Ù…": v.days || 0, "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø³ÙØ±": v.travelDate || '', "Ø¢Ø®Ø± ÙŠÙˆÙ… Ø¹Ù…Ù„": v.lastWorkDay || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¹ÙˆØ¯Ø©": v.returnDate || '', "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": stripEmoji(v.notes) };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª"); XLSX.writeFile(wb, "Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
    function printVacationForm() {
      var checked = document.querySelectorAll('#table-vacations .row-check:checked');
      if (!checked.length) { alert('âš ï¸ Ø­Ø¯Ø¯ Ø¥Ø¬Ø§Ø²Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù…Ù† Ø§Ù„Ø¬Ø¯ÙˆÙ„ (Ø¹Ù„Ù… Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø±Ø¨Ø¹)'); return; }
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
        return '<tr><td style="text-align:center;">' + r.idx + '</td><td style="text-align:center;">' + r.code + '</td><td>' + r.name + '</td><td>' + r.info + '</td><td style="text-align:center;">' + (r.balance || 'â€”') + '</td><td style="text-align:center;">' + r.start + '</td><td style="text-align:center;">' + r.end + '</td><td style="text-align:center;">' + r.days + '</td><td style="text-align:center;">' + r.type + '</td><td style="text-align:center;">' + (r.notes || 'â€”') + '</td></tr>';
      }).join('');
      var w = window.open('', '_blank');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ø¥Ø¬Ø§Ø²Ø© â€” LINAHSYSTEM</title>' +
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
              (logoSrc ? '<img src="' + logoSrc + '" alt="Ø´Ø¹Ø§Ø± Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²">' : '') +
              '<div><div class="co-name">Ø´Ø±ÙƒØ© Ù„ÙŠÙ†Ø© Ù„Ù„ØªÙ†Ù…ÙŠØ© Ø§Ù„Ø³ÙŠØ§Ø­ÙŠØ© ÙˆØ§Ù„Ø¹Ù…Ø±Ø§Ù†ÙŠØ©</div><div class="co-sub">Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©</div></div>' +
            '</div>' +
            '<div class="badge">LINAH SYSTEM</div>' +
          '</div>' +
          '<div class="title">ðŸ“‹ Ø¨ÙŠØ§Ù† Ø¥Ø¬Ø§Ø²Ø§Øª â€” Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©</div>' +
          '<div class="date-line">' + today + '</div>' +
          '<table>' +
            '<thead><tr>' +
              '<th style="width:34px;">Ù…</th><th style="width:50px;">Ø§Ù„ÙƒÙˆØ¯</th><th>Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù</th><th>Ø§Ù„ÙˆØ¸ÙŠÙØ©</th><th style="width:60px;">Ø§Ù„Ø±ØµÙŠØ¯</th><th style="width:75px;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©</th><th style="width:75px;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©</th><th style="width:42px;">Ø§Ù„Ù…Ø¯Ø©</th><th>Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø©</th><th>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th>' +
            '</tr></thead><tbody>' + tableRows + '</tbody>' +
          '</table>' +
          '<div style="margin-top:8px;font-size:12px;color:#555;">' +
            (rows.length === 1 ? 'ðŸ”¹ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø³ÙØ±: <b>' + rows[0].travel + '</b> | Ø¢Ø®Ø± ÙŠÙˆÙ… Ø¹Ù…Ù„: <b>' + rows[0].lastWork + '</b> | ØªØ§Ø±ÙŠØ® Ø§Ù„Ø±Ø¬ÙˆØ¹: <b>' + rows[0].retDate + '</b> | Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø£ÙŠØ§Ù… Ø§Ù„Ø³Ù†Ø©: <b>' + rows[0].yearTotal + '</b>' : '') +
          '</div>' +
          '<div class="signatures">' +
            '<div class="sign-box"><div class="label">Ù…Ø¯ÙŠØ± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© / Ø§Ù„Ù‚Ø³Ù…</div><div class="line"></div><div class="sub">Ø§Ù„ØªÙˆÙ‚ÙŠØ¹</div></div>' +
            '<div class="sign-box"><div class="label">Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ†</div><div class="line"></div><div class="sub">Ø§Ù„ØªÙˆÙ‚ÙŠØ¹</div></div>' +
            '<div class="sign-box"><div class="label">Ø¥Ø¹ØªÙ…Ø§Ø¯ Ù†Ù‡Ø§Ø¦ÙŠ</div><div class="line"></div><div class="sub">Ø§Ù„ØªÙˆÙ‚ÙŠØ¹</div></div>' +
          '</div>' +
          '<div class="footer">ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‡Ø°Ø§ Ø§Ù„Ø¨ÙŠØ§Ù† Ø¨ÙˆØ§Ø³Ø·Ø© Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„Ø© â€” Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø² Â© ' + new Date().getFullYear() + '</div>' +
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
          return { "Ø®Ø·Ø£": h.arrival || '', "Ø§Ù„ØªØ§Ø±ÙŠØ®": h.departure || '', "Ø§Ø³Ù… Ø§Ù„Ø¨ÙŠØ§Ø±Ø©": stripEmoji(h.name), "Ø¹Ø¯Ø¯": stripEmoji(h.type), "Ø§Ù„Ù†Ù‚Ù„Ø§Øª": stripEmoji(h.title), "Ø§Ù„ØµØ±Ù Ø§Ù„Ù…Ø´Ø±Ù": h.guests || 1, "Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª": Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '') };
        });
      } else {
        data = sortNewestFirst(hospitalities, 'arrival').map(function(h) {
          return { "ØªÙ‚Ø±ÙŠØ±": h.arrival || '', "Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª": h.departure || '', "Ø§Ù„Ù…Ù‡Ù…Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©": stripEmoji(h.name), "ØªØ§Ø±ÙŠØ®": stripEmoji(h.type), "Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©": stripEmoji(h.title), "Ø¢Ø®Ø± ØªÙ†ÙÙŠØ°": h.guests || 1, "Ø§Ù„ØªØ§Ù„ÙŠ": Array.isArray(h.meals) ? h.meals.join(', ') : (typeof h.meals === 'string' ? h.meals : '') };
        });
      }
      if (!data.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØµÙŠØ§Ù†Ø© Ø¯ÙˆØ±ÙŠØ© Ù„Ù„ØªØµØ¯ÙŠØ±.');
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ØªÙ‚Ø±ÙŠØ±"); XLSX.writeFile(wb, "Ø§Ù„ØµÙŠØ§Ù†Ø©_Ø§Ù„Ø¯ÙˆØ±ÙŠØ©_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function downloadTemplate_Maintenance() {
      let data = [{ "Ø§Ù„ØªØ§Ø±ÙŠØ®": "Ø¥ÙØ·Ø§Ø±", "ØºØ¯Ø§Ø¡": "Ø¹Ø´Ø§Ø¡ Ø§Ù„Ø´ÙŠÙ", "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„ÙˆØ¬Ø¨Ø§Øª": "ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª", "Ø§Ø³Ù…": "Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„", "Ø±Ù‚Ù…": "Ø§Ù„Ù‡Ø§ØªÙ â€” 1", "Ø§Ù„Ù…Ø¨Ù†Ù‰": "", "Ø§Ù„ØºØ±ÙØ©": "2026-01-01" }];
      let ws = XLSX.utils.json_to_sheet(data); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ù…Ø¯ÙÙˆØ¹"); XLSX.writeFile(wb, "Ø§Ù„ÙŠÙˆÙ…ÙŠ_ØªØ§Ø±ÙŠØ®_Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©_ØªØ§Ø±ÙŠØ®.xlsx");
    }
    function exportMaintenanceToExcel() {
      var sorted = sortNewestFirst(maintenanceRecords, 'date');
      var data = sorted.map(function(m) {
        var mats = '';
        if (m.materials && m.materials.length) {
          mats = m.materials.map(function(x) { return stripEmoji(x.name) + ' ' + (x.qty || 0) + ' ' + (x.unit || ''); }).join(', ');
        }
        return { "Ø§Ù„ØªØ§Ø±ÙŠØ®": m.date || '', "Ù†ÙˆØ¹ Ø§Ù„ØµÙŠØ§Ù†Ø©": stripEmoji(m.category), "Ø¨Ù†Ø¯ Ø§Ù„ØµÙŠØ§Ù†Ø©": stripEmoji(m.task), "Ø§Ù„ÙÙ†ÙŠ": stripEmoji(m.tech), "Ø§Ù„Ø­Ø§Ù„Ø©": stripEmoji(m.status), "Ø§Ù„Ø®Ø§Ù…Ø§Øª": mats, "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": stripEmoji(m.notes) };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„ØµÙŠØ§Ù†Ø©"); XLSX.writeFile(wb, "Ø§Ù„ØµÙŠØ§Ù†Ø©_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
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
          if(!rows || rows.length < 2) return alert("ØªÙ‚Ø±ÙŠØ± Ù„Ù„ØªØµØ¯ÙŠØ±");

          let hRow = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            let r = rows[i]; if (!r) continue;
            if (['Ø§Ø®ØªØ±','Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©','Ø£ÙˆÙ„Ø§Ù‹'].some(function(w){return (r.join(' ')||'').indexOf(w)!==-1;})) { hRow = i; break; }
          }
          if (hRow < 0) return alert('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ØµÙ Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†. ØªØ£ÙƒØ¯ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø£Ø¹Ù…Ø¯Ø©: Ø§Ù„Ù…Ù‡Ù…Ø©ØŒ Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ØŒ Ø§Ù„Ø­Ø§Ù„Ø©');

          function _colMatch2(c, words) { if (!c) return false; var t = c.toString().trim(); return words.some(function(w){return t.indexOf(w)!==-1;}); }
          let cols = rows[hRow];
          let idx = {
            category: cols.findIndex(c => _colMatch2(c, ['Ø§Ù„Ù‚ÙŠÙ…Ø©'])),
            task: cols.findIndex(c => _colMatch2(c, ['Ø§Ù„Ø¨ÙŠØ§Ù†'])),
            tech: cols.findIndex(c => _colMatch2(c, ['Ù…ØªÙˆØ§Ø¬Ø¯ÙŠÙ† Ø§Ù„Ù‚ÙŠÙ…Ø©'])),
            status: cols.findIndex(c => _colMatch2(c, ['Ø§Ù„Ø¨ÙŠØ§Ù†'])),
            materials: cols.findIndex(c => _colMatch2(c, ['Ø¥Ø¬Ø§Ø²Ø§Øª'])),
            notes: cols.findIndex(c => _colMatch2(c, ['Ø§Ù„Ù‚ÙŠÙ…Ø©'])),
            date: cols.findIndex(c => _colMatch2(c, ['Ø§Ù„Ø¨ÙŠØ§Ù†']))
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
            if (!status) status = 'Ø§Ù„Ø£Ø³Ø±Ø©';
            if (!date) date = new Date().toLocaleDateString('ar-EG');

            // Parse materials string like "Ø§Ù„ÙƒÙ„ÙŠØ© â€” 1? Ø§Ù„Ù‚ÙŠÙ…Ø© â€” 2"
            let materials = [];
            if (matStr) {
              matStr.split(/[?,]/).forEach(function(part) {
                part = part.trim(); if (!part) return;
                let m = part.match(/(.+)\s*[â€”xX]\s*(\d+)/);
                if (m) materials.push({ name: m[1].trim(), qty: parseInt(m[2]) || 1, unit: '', code: '' });
                else materials.push({ name: part, qty: 1, unit: '', code: '' });
              });
            }

            maintenanceRecords.push({
              category, task, tech: tech || 'Ø§Ù„Ø¨ÙŠØ§Ù† Ø£ØµÙ†Ø§Ù', status,
              materials: materials,
              notes, imgBefore: '', imgAfter: '', date
            });
            added++;
          }
          syncStorage(); renderMaintenanceTable();
          alert(`? Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø®Ø²Ù†: ${added} Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¨ÙŠØ§Ù†${skipped ? `? Ø¨ÙŠØ§Ù†Ø§Øª Ø¨ÙˆÙ†Ø§Øª ${skipped} Ø§Ù„ØµØ±Ù (Ø§Ù„Ù‚ÙŠÙ…Ø©)` : ''}`);
        } catch(err) { alert("? Ø§Ù„Ø¨ÙŠØ§Ù†: " + err.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    function exportSepticToExcel() {
      var data = sortNewestFirst(septicRecords, 'date').map(function(s) {
        return { "Ø§Ù„ØªØ§Ø±ÙŠØ®": s.date || '', "Ø§Ù„Ø¨ÙŠØ§Ø±Ø©": s.name, "Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø§Øª": s.trips || 0, "Ø§Ù„ØµØ±Ù (Ù…Â³)": (s.quantity || (s.trips || 0) * 5), "Ø§Ù„Ù…Ø´Ø±Ù": s.supervisor };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª"); XLSX.writeFile(wb, "Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
    function exportPeriodicMaintToExcel() {
      var data = sortNewestFirst(periodicMaintenance, 'startDate').map(function(p) {
        return { "Ø§Ù„Ø¨ÙŠØ§Ù†": p.name, "Ø§Ù„ØªÙƒØ±Ø§Ø±": p.freq || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©": p.startDate || '', "Ø¢Ø®Ø± ØªÙ†ÙÙŠØ°": p.lastDone || '', "Ø§Ù„ØªØ§Ù„ÙŠØ©": p.nextDue || '', "Ø§Ù„Ø­Ø§Ù„Ø©": p.status };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©"); XLSX.writeFile(wb, "Ø§Ù„ØµÙŠØ§Ù†Ø©_Ø§Ù„Ø¯ÙˆØ±ÙŠØ©_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function exportMealLogToExcel() {
      var data = sortNewestFirst(mealLogs, 'date').map(function(m) {
        return { "Ø§Ù„ØªØ§Ø±ÙŠØ®": m.date || '', "Ø¥ÙØ·Ø§Ø±": m.breakfast || 0, "ØºØ¯Ø§Ø¡": m.lunch || 0, "Ø¹Ø´Ø§Ø¡": m.dinner || 0, "Ø§Ù„Ø´ÙŠÙ": m.chef, "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": m.notes };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„ÙˆØ¬Ø¨Ø§Øª"); XLSX.writeFile(wb, "Ø§Ù„ÙˆØ¬Ø¨Ø§Øª_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }
function exportContractorsToExcel() {
      var data = sortNewestFirst(contractors, 'startDate').map(function(c) {
        return { "Ø§Ø³Ù… Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„": c.name, "Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„": c.phone || '', "Ø§Ù„Ù‚Ø·Ø§Ø¹": c.sector || '', "Ø§Ù„ØºØ±ÙØ©": c.room || '', "Ø§Ù„Ø£Ø¬Ø± Ø§Ù„ÙŠÙˆÙ…ÙŠ": c.dailyRate || 0, "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©": c.startDate || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©": c.endDate || '', "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": c.notes };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†"); XLSX.writeFile(wb, "Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function exportHistoricalReportToExcel() {
      let content = document.getElementById('hist-report-content');
      if (!content || content.innerText.includes('Ø§Ø®ØªØ± Ù†Ø³Ø®Ø©')) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØªÙ‚Ø±ÙŠØ± Ù„Ù„ØªØµØ¯ÙŠØ±. Ø§Ø®ØªØ± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹.'); return; }
      let data = window._currentReportData;
      if (!data) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØªÙ‚Ø±ÙŠØ±. Ø§Ø®ØªØ± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹.'); return; }
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
        "ØªØ§Ø±ÙŠØ®": "Ø§Ù„Ø³ÙØ± Ø¢Ø®Ø±", "ÙŠÙˆÙ…": empCount
      },{
        "Ø¹Ù…Ù„": "ØªØ§Ø±ÙŠØ® (P)", "Ø§Ù„Ø±Ø¬ÙˆØ¹": pCount
      },{
        "Ù…Ù„Ø§Ø­Ø¸Ø§Øª": "ØªÙ… (V)", "Ø§Ø³ØªÙŠØ±Ø§Ø¯": vCount
      },{
        "Ø¥Ø¬Ø§Ø²Ø©": "Ø¨Ù†Ø¬Ø§Ø­ ØªÙ…", "ØªØ®Ø·ÙŠ": totalBeds
      },{
        "Ù…ÙƒØ±Ø±": "Ø®Ø·Ø£ ÙÙŠ", "Ù‚Ø±Ø§Ø¡Ø©": invItems
      },{
        "Ø§Ù„Ù…Ù„Ù": "Ø¥Ø¶Ø§ÙÙŠ ÙŠÙˆÙ…ÙŠ", "Ø§Ù„Ø´Ø¦ÙˆÙ†": vouchers
      },{
        "Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©": "ÙŠÙ†Ø§ÙŠØ± ÙØ¨Ø±Ø§ÙŠØ± Ù…Ø§Ø±Ø³", "Ø¥Ø¨Ø±ÙŠÙ„": tsCount
      },{
        "Ù…Ø§ÙŠÙˆ": "ÙŠÙˆÙ†ÙŠÙˆ", "ÙŠÙˆÙ„ÙŠÙˆ": vacCount
      },{
        "Ø£ØºØ³Ø·Ø³": "Ø³Ø¨ØªÙ…Ø¨Ø±", "Ø£ÙƒØªÙˆØ¨Ø±": exclCount
      },{
        "Ù†ÙˆÙÙ…Ø¨Ø±": "Ø¯ÙŠØ³Ù…Ø¨Ø±", "ÙŠÙ‰": ctrCount
      }];
      let ws1 = XLSX.utils.json_to_sheet(summary);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "ÙŠ Ø©Ù‡");
      if (data.employees && data.employees.length) {
        let empRows = data.employees.map(e => ({
          "Ø§Ù„ÙƒÙˆØ¯": e.code||'', "Ø§Ù„Ø§Ø³Ù…": e.name||'', "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©": e.dept||'', "Ø§Ù„ÙˆØ¸ÙŠÙØ©": e.title||'',
          "Ø§Ù„Ø­Ø§Ù„Ø©": e.status||'', "Ø§Ù„Ù…Ø¨Ù†Ù‰": e.sector||'', "Ø§Ù„ØºØ±ÙØ©": e.room||''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), "Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ†");
      }
      XLSX.writeFile(wb, `Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ†_${window._currentReportFileName?.replace('backup_','').replace('.json','').replace(/_/g,'-')||'Ø§Ø®ØªØ±'}.xlsx`);
    }

    function exportExcludedToExcel() {
      var data = sortNewestFirst(excludedEmployees, 'date').map(function(e) {
        return { "Ø§Ù„ØªØ§Ø±ÙŠØ®": e.date || '', "Ø§Ù„Ø§Ø³Ù…": e.name, "Ø§Ù„ÙƒÙˆØ¯": e.code || '', "Ù†ÙˆØ¹ Ø§Ù„Ø¹Ù‚Ø¯": e.contract || '', "Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù‚ÙˆÙ…ÙŠ": e.nationalId || '', "ØªØ§Ø±ÙŠØ® Ø§Ù„ØªØ¹ÙŠÙŠÙ†": e.hireDate || '', "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©": e.dept, "Ø§Ù„ÙˆØ¸ÙŠÙØ©": e.title, "Ø§Ù„Ø¬Ù‡Ø©": e.gov, "Ø§Ù„Ù…Ø¨Ù†Ù‰": e.sector || '', "Ø§Ù„ØºØ±ÙØ©": e.room || '', "Ø§Ù„Ø­Ø§Ù„Ø©": e.status === 'P' ? 'Ù…ØªÙˆØ§Ø¬Ø¯' : 'ÙÙŠ Ø¥Ø¬Ø§Ø²Ø©', "Ø§Ù„Ø¹Ù‡Ø¯": (e.assetsStr || '').toString().replace(/[^\u0600-\u06FF\u0660-\u0669\u0020-\u007E\s]/g, '').trim() || '', "Ø§Ù„Ø³Ø¨Ø¨": e.reason };
      });
      var ws = XLSX.utils.json_to_sheet(data); var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†"); XLSX.writeFile(wb, "Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†_" + new Date().toISOString().split('T')[0].replace(/-/g, '') + ".xlsx");
    }

    function importVacationsFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("Ø§Ù„Ù…ÙˆØ¸Ù Ù„Ø¯ÙŠÙ‡");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø¥Ø¶Ø§ÙÙŠ ÙÙŠ"] || ''; if(!name) { skipped++; continue; }
            let exists = vacations.some(v => v.name === name && v.start === (r["Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ…"]||''));
            if(exists) { skipped++; continue; }
            vacations.push({ code: r["Ø¨Ø§Ù„ÙØ¹Ù„ Ø³Ø§Ø¹Ø©"]||'', name: name, info: r["Ù‡Ù„"]||'', start: r["ØªØ±ÙŠØ¯ Ø§Ø³ØªØ¨Ø¯Ø§Ù„Ù‡"]||'', days: r["Ø¨Ù€ Ø³Ø§Ø¹Ø©ØŸ"]||'', end: r["Ù‡Ù„ ØªØ±ÙŠØ¯"]||'', travelDate: r["Ø­Ø°Ù Ù‡Ø°Ø§"]||'', lastWorkDay: r["Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØŸ Ù„Ø§ ØªÙˆØ¬Ø¯"]||'', returnDate: r["Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ø¶Ø§ÙÙŠ"]||'', notes: r["Ù„Ù„ØªØµØ¯ÙŠØ±"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø¥Ø¬Ø§Ø²Ø© Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª: "+ex.message); }
      };
      reader.readAsArrayBuffer(file);
      evt.target.value = '';
    }

    // --- ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ¸Ù (Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙˆØ¸ÙŠÙØ©) ---
    var ovViewDate = new Date();
    var ovMonthNames = ['Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ','Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ','Ø§Ù„Ø¥Ø¶Ø§ÙÙŠ','Ø¥Ø¶Ø§ÙÙŠ','Ø§Ù„Ù…Ù„Ù','ÙØ§Ø±Øº','Ø§Ø³Ù…','Ø§Ù„Ø¶ÙŠÙ','ØªØ§Ø±ÙŠØ®','Ø§Ù„ÙˆØµÙˆÙ„','Ø§Ù„ÙˆØ¬Ø¨Ø§Øª','Ù†ÙˆØ¹'];

    function getAdminEmployees() {
      return employees.filter(function(emp) {
        var dd = (emp.dept||'').replace(/\s+/g,'').replace(/[Ø¨ÙŠØ§Ù†Ø§Øª]/g,'?').replace(/[Ø¨ÙŠØ§Ù†Ø§Øª]/g,'?').replace(/[Ø§Ù„Ø²ÙŠØ§Ø±Ø©]/g,'?').toLowerCase();
        if (dd.indexOf('Ø§Ù„Ù…Ø³Ù…Ù‰') === -1 && dd.indexOf('Ø¹Ø¯Ø¯') === -1) return false;
        var t = (emp.title||'').trim();
        if (t.indexOf('Ø§Ù„Ø¶ÙŠÙˆÙ') !== -1) return false;
        if (t.indexOf('ØªØ§Ø±ÙŠØ®') !== -1) return false;
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
          html += '<div class="ov-entry" title="' + e.empName + ': ' + e.hours + ' Ø§Ù„ÙˆØµÙˆÙ„' + (e.notes ? ' (' + e.notes + ')' : '') + '">' + e.empName + ' ' + e.hours + 'h</div>';
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

      document.getElementById('ov-month-total').textContent = totalHours.toFixed(1) + ' ØªØ§Ø±ÙŠØ®';
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
          entriesHtml += '<div class="ov-entry-row"><span>' + e.empName + ' â€” ' + e.hours + ' Ø§Ù„Ù…ØºØ§Ø¯Ø±Ø©' + (e.notes ? ' (' + e.notes + ')' : '') + '</span><button onclick="removeOvertimeEntry(\'' + dateKey + '\',\'' + e.empCode.replace(/'/g,"\\'") + '\')">âœ•</button></div>';
      });

      var empOptions = '<option value="">ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯...</option>';
      adminEmps.forEach(function(emp) {
        empOptions += '<option value="' + emp.code + '">' + emp.code + ' â€” ' + emp.name + ' (' + emp.title + ')</option>';
      });

      overlay.innerHTML =
        '<div class="ov-modal">' +
          '<h4>Ø¨ÙŠØ§Ù†Ø§Øª ' + dateKey + ' â€” Ø²ÙŠØ§Ø±Ø© Ø¶ÙŠØ§ÙØ©</h4>' +
          '<div class="ov-entries-list">' + entriesHtml + '</div>' +
          '<hr style="margin:8px 0;">' +
          '<select id="ov-emp-select">' + empOptions + '</select>' +
          '<input type="number" id="ov-hours" min="0.5" step="0.5" value="1" placeholder="Ø¨Ù†Ø¬Ø§Ø­ ØªÙ…">' +
          '<input type="text" id="ov-notes" placeholder="ØªØ®Ø·ÙŠ (Ù…ÙƒØ±Ø±)">' +
          '<div class="ov-modal-actions">' +
            '<button onclick="addOvertimeEntry(\'' + dateKey + '\')" style="background:#e65100;color:#fff;border-color:#e65100;">Ø¥Ø¶Ø§ÙØ©</button>' +
            '<button onclick="closeOvertimeModal()" style="background:#eee;">Ø¥ØºÙ„Ø§Ù‚</button>' +
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
      if (!empCode) return alert('Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…Ù„Ù');
      if (hours <= 0) return alert('Ø¹Ø¯Ø¯ Ø§Ù„Ø³Ø§Ø¹Ø§Øª ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±');

      var emp = employees.find(function(e) { return e.code == empCode; });
      if (!emp) return alert('Ø§Ù„Ù…Ø´Ø±Ù ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯');

      var existing = adminOvertime.find(function(e) { return e.date === dateKey && e.empCode == empCode; });
      if (existing) {
        if (!confirm('Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¸Ù Ù„Ø¯ÙŠÙ‡ Ø¥Ø¶Ø§ÙÙŠ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ… Ø¨Ø§Ù„ÙØ¹Ù„ (' + existing.hours + ' Ø³Ø§Ø¹Ø©).\nÙ‡Ù„ ØªØ±ÙŠØ¯ Ø§Ø³ØªØ¨Ø¯Ø§Ù„Ù‡ Ø¨Ù€ ' + hours + ' Ø³Ø§Ø¹Ø©ØŸ')) return;
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
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØŸ')) return;
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
      if (!adminOvertime.length) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ù…Ù„ Ø¥Ø¶Ø§ÙÙŠ Ù„Ù„ØªØµØ¯ÙŠØ±.'); return; }
      var year = ovViewDate.getFullYear();
      var month = ovViewDate.getMonth();
      var filtered = adminOvertime.filter(function(e) {
        return e.date && e.date.indexOf(year + '-' + String(month+1).padStart(2,'0')) === 0;
      });
      if (!filtered.length) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ù…Ù„ Ø¥Ø¶Ø§ÙÙŠ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±.'); return; }
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
        data.push(['#', 'Ø¯ÙˆØ±ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­', 'ØªÙ…', 'ØªØ®Ø·ÙŠ'].concat(dayHeaders).concat(['Ù…ÙƒØ±Ø±']));
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
      if (empList.length > 0) data.push(['', '', '', 'Ø®Ø·Ø£'].concat(dayTotals).concat([grandTotal]));
      var ws = XLSX.utils.aoa_to_sheet(data);
      if (data.length > 1) ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 + daysInMonth } }];
      var colWidths = [{ wch: 4 }, { wch: 10 }, { wch: 22 }, { wch: 16 }];
      for (var d = 1; d <= daysInMonth; d++) colWidths.push({ wch: 6 });
      colWidths.push({ wch: 10 });
      ws['!cols'] = colWidths;
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ÙÙŠ');
      downloadWB(wb, 'Ù‚Ø±Ø§Ø¡Ø©_' + year + '-' + String(month+1).padStart(2,'0') + '.xlsx');
    }

    function importHospitalityFromExcel(evt) {
      let file = evt.target.files[0]; if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        try {
          let data = new Uint8Array(e.target.result);
          let wb = XLSX.read(data, {type:'array'});
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if(!rows || !rows.length) return alert("Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…Ù„Ù");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["ÙØ§Ø±Øº Ø§Ù„ØªØ§Ø±ÙŠØ®"] || ''; if(!name) { skipped++; continue; }
            let exists = hospitalities.some(h => h.name === name && h.arrival === (r["Ø§Ù„Ø¥ÙØ·Ø§Ø± Ø§Ù„ØºØ¯Ø§Ø¡"]||''));
            if(exists) { skipped++; continue; }
            let mealsStr = r["Ø§Ù„Ø¹Ø´Ø§Ø¡"]||'';
            hospitalities.push({ _id: Date.now().toString() + '_' + added, name: name, type: r["ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯"]||'', title: r["Ø³Ø¬Ù„"]||'', guests: Number(r["ÙˆØ¬Ø¨Ø§Øª Ø¨Ù†Ø¬Ø§Ø­"])||1, arrival: r["ØªÙ… ØªØ®Ø·ÙŠ"]||'', departure: r["Ù…ÙƒØ±Ø± Ø®Ø·Ø£"]||'', meals: mealsStr ? mealsStr.split(',').map(s=>s.trim()) : [] });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø³Ø¬Ù„ Ø¶ÙŠØ§ÙØ© Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¶ÙŠØ§ÙØ©: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ø§Ù„Ù…Ø¨Ù†Ù‰ Ø§Ù„Ø³ÙƒÙ†ÙŠ");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø±Ù‚Ù… Ø§Ù„ØºØ±ÙØ©"] || ''; if(!name) { skipped++; continue; }
            let trips = Number(r["Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ø§Ù„ÙŠÙˆÙ…ÙŠ"])||0;
            let date = r["ØªØ§Ø±ÙŠØ®"]||'';
            let exists = septicRecords.some(s => s.name === name && s.date === date);
            if(exists) { skipped++; continue; }
            septicRecords.push({ name: name, trips: trips, supervisor: r["Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©"]||'', date: date });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø³Ø¬Ù„ ØµØ±Ù ØµØ­ÙŠ Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ù…ÙƒØ±Ø± Ø®Ø·Ø£");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["ÙÙŠ"] || ''; if(!name) { skipped++; continue; }
            let exists = periodicMaintenance.some(p => p.name === name);
            if(exists) { skipped++; continue; }
            periodicMaintenance.push({ name: name, freq: r["Ù‚Ø±Ø§Ø¡Ø©"]||'', startDate: r["Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…Ù„Ù"]||'', lastDone: r["ÙØ§Ø±Øº Ø§Ø³Ù…"]||'', nextDue: r["Ø§Ù„Ù…ÙˆØ¸Ù"]||'', status: r["ÙƒÙˆØ¯"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ù…Ù‡Ù…Ø© ØµÙŠØ§Ù†Ø© Ø¯ÙˆØ±ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ©: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø© Ø§Ù„Ù…Ø¨Ù†Ù‰");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let date = r["Ø§Ù„Ø³ÙƒÙ†ÙŠ"] || ''; if(!date) { skipped++; continue; }
            let exists = mealLogs.some(m => normalizeDateStr(m.date) === normalizeDateStr(date));
            if(exists) { skipped++; continue; }
            mealLogs.push({ date: date, breakfast: Number(r["Ø±Ù‚Ù…"])||0, lunch: Number(r["Ø§Ù„ØºØ±ÙØ©"])||0, dinner: Number(r["Ø§Ù„Ù…ÙˆÙ‚Ù"])||0, chef: '' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø³Ø¬Ù„ ÙˆØ¬Ø¨Ø§Øª Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„ÙˆØ¬Ø¨Ø§Øª: "+ex.message); }
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
          if(!rows || !rows.length) return alert("ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ¨Ø¹Ø§Ø¯");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø³Ø¨Ø¨ Ø§Ù„Ø§Ø³ØªØ¨Ø¹Ø§Ø¯"] || ''; if(!name) { skipped++; continue; }
            let exists = contractors.some(c => c.name === name);
            if(exists) { skipped++; continue; }
            contractors.push({ name: name, phone: r["ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯"]||'', sector: r["Ù…Ø³ØªØ¨Ø¹Ø¯ Ø¨Ù†Ø¬Ø§Ø­"]||'', room: r["ØªÙ… ØªØ®Ø·ÙŠ"]||'', dailyRate: Number(r["Ù…ÙƒØ±Ø± Ø®Ø·Ø£"])||0, startDate: r["ÙÙŠ Ù‚Ø±Ø§Ø¡Ø©"]||'', endDate: r["Ø§Ù„Ù…Ù„Ù Ø¨Ù„Ø§Øº"]||'', notes: r["Ø§Ù„ÙˆØ¬Ø¨Ø§Øª"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ù…Ù‚Ø§ÙˆÙ„ Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„ØªØ§Ø±ÙŠØ®");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù‚ÙˆØ©"] || ''; if(!name) { skipped++; continue; }
            let code = r["Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙØ±Ø¯"]||'';
            let exists = excludedEmployees.some(e => e.name === name && e.code === code);
            if(exists) { skipped++; continue; }
            excludedEmployees.push({ code: code, name: name, contract: r["Ø¶ÙŠÙˆÙ Ø§Ù„Ø¥ÙØ·Ø§Ø±"]||'', nationalId: r["Ø¶ÙŠÙˆÙ Ø§Ù„ØºØ¯Ø§Ø¡"]||'', hireDate: r["Ø¶ÙŠÙˆÙ Ø§Ù„Ø¹Ø´Ø§Ø¡"]||'', dept: r["Ù…"]||'', title: r["Ø§Ù„ÙˆØ¬Ø¨Ø© Ø§Ù„Ù…Ù‚Ø±Ø±Ø©"]||'', gov: r["Ø¹Ø¯Ø¯"]||'', sector: r["Ø§Ù„Ù…Ø³ØªØ­Ù‚ÙŠÙ† Ø§Ù„Ù‚ÙˆØ©"]||'', room: r["Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ø¥Ø¬Ù…Ø§Ù„ÙŠ"]||'', status: (r["Ø§Ù„Ø¶ÙŠÙˆÙ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ"]||'').includes('ÙˆØ¬Ø¨Ø©') ? 'P' : 'V', assetsStr: r["Ø§Ù„Ø¥ÙØ·Ø§Ø± ÙˆØ¬Ø¨Ø© ÙˆØ¬Ø¨Ø©"]||'', assets: r["Ø§Ù„ØºØ¯Ø§Ø¡ ÙˆØ¬Ø¨Ø© ÙˆØ¬Ø¨Ø©"]||'', date: r["Ø§Ù„Ø¹Ø´Ø§Ø¡ ÙˆØ¬Ø¨Ø©"]||'', reason: r["ØªÙ… Ø§Ù„ØªÙˆÙ„ÙŠØ¯"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ù…ÙˆØ¸Ù Ù…Ø³ØªØ¨Ø¹Ø¯ Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†: "+ex.message); }
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
            <h2>Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø´Ø§Ù…Ù„Ø© â€” Ù†Ø¸Ø§Ù… Ù„ÙŠÙ†Ù‡</h2>
            <div class="sub">Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù Ù„Ø¹Ø±Ø¶Ù‡</div>
          </div>
        </div>
        <div class="info-line">
          <span><b>Ù‚Ø±Ø§Ø¡Ø©:</b> ${new Date().toLocaleDateString('ar-EG')}</span>
          <span><b>Ø§Ù„Ù…Ù„Ù Ø¨Ø§ÙŠØª Ø®Ø·Ø£:</b> ${s.pCount} ÙÙŠ</span>
          <span><b>Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø±Ø¬Ø§Ø¡:</b> ${s.gBf} | <b>ÙØªØ­ Ù„Ù…Ø²ÙŠØ¯:</b> ${s.gLh} | <b>Ù…Ù† Ø§Ù„ØªÙØ§ØµÙŠÙ„:</b> ${s.gDn}</span>
        </div>
        <table>
          <tr><th>#</th><th>Ù†ÙˆØ¹ Ø§Ù„ÙØ­Øµ</th><th>Ø¹Ø¯Ø¯ Ø§Ù„Ø³Ø¬Ù„Ø§Øª</th><th>Ù…Ø·Ø§Ø¨Ù‚Ø©</th><th>Ø§Ù„Ù†ØªÙŠØ¬Ø©</th></tr>
          <tr><td>1</td><td>ØªØ·Ø§Ø¨Ù‚ Ø§Ù„ØªÙˆØ§Ø±ÙŠØ®</td><td>${s.pCount}</td><td>${s.gBf}</td><td><b>${s.pCount + s.gBf} Ø³Ø¬Ù„</b></td></tr>
          <tr><td>2</td><td>Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©</td><td>${s.pCount}</td><td>${s.gLh}</td><td><b>${s.pCount + s.gLh} Ø³Ø¬Ù„</b></td></tr>
          <tr><td>3</td><td>ØªÙˆØ­ÙŠØ¯ Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙƒØ±Ø±Ø©</td><td>${s.pCount}</td><td>${s.gDn}</td><td><b>${s.pCount + s.gDn} Ø³Ø¬Ù„</b></td></tr>
        </table>
        <div class="footer">ØªÙ… Ø§Ù„ØªÙˆÙ„ÙŠØ¯ Ø¨ÙˆØ§Ø³Ø·Ø© Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© - Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²</div>
        </body></html>
      `);
      setTimeout(() => { w.print(); }, 1000);
    }

    function exportBackupSystem() {
      if (!requireAdmin() || (currentUser !== 'Ø®Ø·ÙŠØ± Ø¬Ø¯Ø§Ù‹' && currentUser !== 'Ø³Ø§Ù„Ù… Ù…Ø¬Ø¯ÙŠ')) return;
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
      var msg = 'âœ… ØªÙ… Ø¹Ù…Ù„ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙƒØ§Ù…Ù„Ø©\n';
      msg += 'ðŸ“¦ Ø§Ù„Ø­Ø¬Ù…: ' + sizeKB + ' ÙƒÙŠÙ„ÙˆØ¨Ø§ÙŠØª\n';
      msg += 'ðŸ‘¥ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†: ' + empCount + ' (P=' + pCount + ' | V=' + vCount + ')\n';
      msg += 'ðŸ“‹ Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„: ' + Object.keys(data).length + ' Ø¬Ø¯ÙˆÙ„';
      alert(msg);
    }

    async function exportFullBackup() {
      if (!requireAdmin() || (currentUser !== 'Ø®Ø·ÙŠØ± Ø¬Ø¯Ø§Ù‹' && currentUser !== 'Ø³Ø§Ù„Ù… Ù…Ø¬Ø¯ÙŠ')) return;
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
      var msg = 'âœ… ØªÙ… Ø¹Ù…Ù„ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙƒØ§Ù…Ù„Ø©\n';
      msg += 'ðŸ“¦ Ø§Ù„Ø­Ø¬Ù…: ' + sizeKB + ' ÙƒÙŠÙ„ÙˆØ¨Ø§ÙŠØª\n';
      msg += 'ðŸ‘¥ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†: ' + empCount + ' (P=' + pCount + ' | V=' + vCount + ')\n';
      msg += 'ðŸ“‹ Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„: ' + Object.keys(data).length + ' Ø¬Ø¯ÙˆÙ„\n';
      if (typeof supabaseConnected !== 'undefined' && supabaseConnected) {
        try {
          msg += '\nâ˜ï¸ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹ Ù„Ù€ Supabase...';
          await pushToSupabase();
          msg += 'â˜ï¸ ØªÙ… Ø§Ù„Ø±ÙØ¹ Ù„Ù„Ø³Ø­Ø§Ø¨Ø© âœ…';
        } catch(e) {
          msg += '\nâŒ ÙØ´Ù„ Ø§Ù„Ø±ÙØ¹ Ù„Ù„Ø³Ø­Ø§Ø¨Ø©: ' + e.message;
        }
      } else {
        msg += '\nâš ï¸ ØºÙŠØ± Ù…ØªØµÙ„ Ø¨Ù€ Supabase â€” ØªÙ… Ø§Ù„Ø­ÙØ¸ Ù…Ø­Ù„ÙŠØ§Ù‹ ÙÙ‚Ø·';
      }
      alert(msg);
    }

    function importBackupSystem(evt) {
      if (!requireAdmin() || currentUser !== 'Ù…Ø³Ø­ ÙƒØ§ÙØ©') return;
      let file = evt.target.files[0]; if(!file) { alert('Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù'); return; }
      evt.target.value = '';
      alert('Ø¬Ø§Ø±ÙŠ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù†: ' + file.name + ' (' + file.size + ' Ø¨Ø§ÙŠØª)');
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
                alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: " + e2.message + " - Ø§Ù„Ø±Ø¬Ø§Ø¡ ÙØªØ­ F12 Ù„Ù…Ø²ÙŠØ¯ Ù…Ù† Ø§Ù„ØªÙØ§ØµÙŠÙ„");
              }
            };
            return;
          }
          processRestoreData(data);
        } catch(err) {
          console.error("Import error:", err.message);
          alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: " + err.message);
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

        // Ø§Ù„ØªÙˆØ±ÙŠØ¯Ø§Øª Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª
        if (excludedEmployees.length > 0) {
          var exclMap = {};
          excludedEmployees.forEach(function(e) { exclMap[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !exclMap[e.code || e.id || e.name]; });
        }
        // Ø¬ Ù… Ø§Ø®ØªØ± Ø§Ù„ÙØªØ±Ø© ÙˆØ§Ø³ØªØ®Ø¯Ù…
        normalizeBakeryDates(true);
        // Ø²Ø± Ø§Ù„ØªØµØ¯ÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø¹Ø±Ø¶ ØªÙØ§ØµÙŠÙ„
        if (bakeryProductions.length > 0) bakeryProductions = dedupArray(bakeryProductions, function(p) { return p.id || (p.date + '|' + (p.breadCount||0) + '|' + (p.flourUsed||0) + '|' + (p.createdAt||'')); });
        if (bakeryContractorSupplies.length > 0) bakeryContractorSupplies = dedupArray(bakeryContractorSupplies, function(cs) { return cs.date + '|' + (cs.name||'') + '|' + (cs.count||0) + '|' + (cs.price||0); });
        if (contractors.length > 0) contractors = dedupArray(contractors, function(c) { return c.id || JSON.stringify(c); });

        syncStorage(); renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems(); renderArchiveTable(); renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable(); renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); autoLogTodayMeals(); populateContractorSectorDropdown(); renderContractorsTable(); rebuildAllDropdowns(); renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices(); updateBakeryStats(); updateBreadSupplyStats();
        renderBakeryIngredients(); renderBakeryProductions(); renderBakeryContractorSupplies(); renderBakeryInvoices();
        renderContractorRoomsList(); populateContractorRoomSectorDropdown(); renderEvaluations();
        _dataChangedSinceBackup = false;
        var restoreBtn = document.querySelector('button[onclick*="header-import-backup"]');
        if (restoreBtn) restoreBtn.classList.remove('btn-restore-pulse');
        var bakBtn = document.querySelector('button[onclick*="exportBackupSystem"]');
        if (bakBtn) bakBtn.classList.remove('btn-backup-pulse');
        alert("ØªÙ…Øª Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­.");
      }
    }

    function clearAllEmployeesData() {
      if (!requireAdmin()) return;
      if(confirm("Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ù†Ø´Ø§Ø¡ ØªÙ‚Ø±ÙŠØ± ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø² (Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„ÙÙˆØ§ØªÙŠØ±)ØŸ")) {
        employees.forEach(function(e) { _logDeletion('employees', e.code || e.name); });
        employees = []; syncStorage(); renderTable(); renderHousingLayout(); renderDashboard(); renderQuickActions(); rebuildAllDropdowns(); alert("ØªÙ… ØªØµÙÙŠØ± Ø§Ù„Ù‚ÙˆØ© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.");
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
      sel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…ÙƒÙˆÙ† --</option>' + bakeryIngredients.map(i => '<option value="' + i.id + '">' + i.name + '</option>').join('');
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
          if (!pExists) { bakeryProductions.push(_ts({ id: getBakeryNextId('PROD', bakeryProductions), date: p.date, breadCount: p.breadCount, flourUsed: p.flourUsed || 0, yeastUsed: p.yeastUsed || 0, saltUsed: p.saltUsed || 0, branUsed: p.branUsed || 0, dieselUsed: p.dieselUsed || 0, opCost: p.operatingCost || 1200, notes: (p.bakerName ? 'ØªÙƒÙ„ÙØ©: ' + p.bakerName : '') + (p.notes ? ' | ' + p.notes : '') })); imported++; }
          _importedKeys[pKey] = true;
          (r.contractors || []).forEach(function(ct) {
            if (!ct.name || !ct.count) return;
            var ctKey = (ct.name||'') + '|' + normalizeDateStr(p.date) + '|' + (ct.count||'');
            if (_importedKeys['ctr_' + ctKey]) return;
            if (_isDeleted('bakeryContractorSupplies', ctKey)) return;
            var cExists = bakeryContractorSupplies.some(function(bc) { return bc.date === p.date && bc.name === ct.name && bc.count == ct.count; });
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
                  notes: (p.bakerName ? 'ØªÙƒÙ„ÙØ©: ' + p.bakerName : '') + (p.notes ? ' | ' + p.notes : '')
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
              var cExists = bakeryContractorSupplies.some(function(bc) { return bc.date === p.date && bc.name === ct.name && bc.count == ct.count; });
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
            // Only propagate chef name from waste form to mealLogs â€” counts stay from employees P
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
              var exists = teaSugarDisbursements.some(function(d) { return d.date === e.date && d.empCode === e.empCode && d.period === e.period && d.createdAt === e.createdAt; });
              if (!exists) {
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
              }
            } else if (section === 'maint') {
              var exists = maintenanceRecords.some(function(d) { return d.date === e.date && d.task === e.maintTask && d.tech === e.maintTech && d.createdAt === e.createdAt; });
              if (!exists) {
                maintenanceRecords.push(_ts({
                  category: e.maintCat || '',
                  task: e.maintTask || '',
                  tech: e.maintTech || '',
                  status: e.maintStatus || 'Ù…ÙØªÙˆØ­Ø©',
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
                  supervisor: e.septicSupervisor || 'â€”',
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
            <div style="font-size:12px;color:#888;">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø¬</div>
            <div style="font-size:24px;font-weight:700;color:#1b5e20;">${bakeryContractorSupplies.length}</div>
          </div>
          <div style="background:#e3f2fd;padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#888;">Ù… Ø§Ø®ØªØ±</div>
            <div style="font-size:24px;font-weight:700;color:#1565c0;">${bakeryInvoices.length}</div>
          </div>
          <div style="background:#fff3e0;padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#888;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©</div>
            <div style="font-size:24px;font-weight:700;color:#e65100;">${calculateBreadSupplyRevenue().toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
          </div>
        </div>
        <div style="font-size:13px;color:#888;text-align:center;padding:20px;">
          Ø§Ø®ØªØ± Ø§Ù„ÙØªØ±Ø© ÙˆØ§Ø³ØªØ®Ø¯Ù… Ø²Ø± Ø§Ù„ØªØµØ¯ÙŠØ± Ù„Ø¹Ø±Ø¶ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØªÙˆØ±ÙŠØ¯Ø§Øª ÙˆØ§Ù„ÙÙˆØ§ØªÙŠØ±
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
      if (!from || !to) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ®');
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
          <h3 style="color:#1565c0;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†ÙˆØ¹ ÙØ§ØªÙˆØ±Ø©</h3>
          <p style="color:#888;">Ù…Ù† ${from} Ø¥Ù„Ù‰ ${to}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:15px;">
          <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">Ø¹Ø¯Ø¯</div>
            <div style="font-size:22px;font-weight:700;color:#1b5e20;">${ctr.length}</div>
          </div>
          <div style="background:#fff3e0;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">Ø§Ù„Ø£Ø±ØºÙØ© Ø³Ø¹Ø±</div>
            <div style="font-size:22px;font-weight:700;color:#e65100;">${ctrTotal.toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
          </div>
          <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</div>
            <div style="font-size:22px;font-weight:700;color:#1565c0;">${invoices.length}</div>
          </div>
          <div style="background:#f3e5f5;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ù„Ø§</div>
            <div style="font-size:22px;font-weight:700;color:#6a1b9a;">${invTotal.toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
          </div>
          <div style="background:#ffebee;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#888;">ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</div>
            <div style="font-size:22px;font-weight:700;color:#d32f2f;">${totalCost.toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
          </div>
        </div>
        <div style="font-size:14px;text-align:center;border-top:2px solid #e0e0e0;padding-top:12px;">
          Ø¨ÙŠØ§Ù†Ø§Øª <b>ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²:</b> ${totalRevenue.toFixed(2)} Ø¬Ù†ÙŠÙ‡ |
          <b>ØªÙˆØ±ÙŠØ¯:</b> ${(ctrPaid+invPaid).toFixed(2)} Ø¬Ù†ÙŠÙ‡ |
          <b>Ø§Ù„Ø®Ø¨Ø²:</b> <span style="color:${(totalRevenue-ctrPaid-invPaid) > 0 ? '#d32f2f' : '#2e7d32'};">${(totalRevenue-ctrPaid-invPaid).toFixed(2)} Ø¬Ù†ÙŠÙ‡</span>
        </div>`;
    }

    function exportBreadSupplyReportToExcel() {
      let from = document.getElementById('brep-from-2').value;
      let to = document.getElementById('brep-to-2').value;
      if (!from || !to) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ®');
      let rows = [];
      bakeryContractorSupplies.filter(c => c.date >= from && c.date <= to).forEach(c => {
        rows.push({ 'Ø§Ù„ØªØ§Ø±ÙŠØ®': c.date, 'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„': stripEmoji(c.name), 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©': c.count, 'Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©': c.price, 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ': ((c.count||0)*(c.price||0)).toFixed(2), 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹': (c.paid||0).toFixed(2) });
      });
      bakeryInvoices.filter(i => i.date >= from && i.date <= to).forEach(i => {
        rows.push({ 'Ø§Ù„ØªØ§Ø±ÙŠØ®': i.date, 'Ø§Ù„Ø¹Ù…ÙŠÙ„': stripEmoji(i.customer), 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©': i.count, 'Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©': i.unitPrice, 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ': ((i.count||0)*(i.unitPrice||0)).toFixed(2), 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹': (i.paid||0).toFixed(2) });
      });
      if (rows.length === 0) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª.');
      rows = sortNewestFirst(rows, 'date');
      let ws = XLSX.utils.json_to_sheet(rows);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø±Ø¨Ø¹ ÙƒÙŠÙ„Ùˆ');
      XLSX.writeFile(wb, `Ù…Ù„Ø­_ØªÙ„Øª_${from}_${to}.xlsx`);
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
      if (g('bsup-stat-revenue')) g('bsup-stat-revenue').innerText = revenue.toFixed(2) + ' Ø¬Ù†ÙŠÙ‡';
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
      if (ingSel) ingSel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…ÙƒÙˆÙ† --</option>' + bakeryIngredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
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
          <td>${low ? 'Ù†Ø§Ù‚Øµ' : 'Ù…ØªÙˆÙØ±'}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="editBakeryIngredient('${i.id}')">ðŸ“</button>
            <button class="btn btn-info" style="padding:2px 6px;font-size:11px;background:#0288d1;color:white;" onclick="showIngredientStockLog('${i.id}')">ðŸ“Š</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryIngredient(${realIdx})">Ø­Ø°Ù</button>
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
      if (!name) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù…ÙƒÙˆÙ†');
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
      if (!confirm('Ø¨Ø§ÙƒÙˆ Ø®Ù…')) return;
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
          <td style="font-size:11px;">${f}â€”${pFlour}=<b>${costFlour.toFixed(2)}</b></td>
          <td style="font-size:11px;">${y}â€”${pYeast}=<b>${costYeast.toFixed(2)}</b></td>
          <td style="font-size:11px;">${s}â€”${pSalt}=<b>${costSalt.toFixed(2)}</b></td>
          <td style="font-size:11px;">${b}â€”${pBran}=<b>${costBran.toFixed(2)}</b></td>
          <td style="font-size:11px;">${d}â€”${pDiesel}=<b>${costDiesel.toFixed(2)}</b></td>
          <td style="font-size:11px;">${op.toFixed(2)}</td>
          <td style="display:none;font-size:11px;color:#e65100;">${cstCtr.toFixed(2)}</td>
          <td class="bakery-cost">${cst.toFixed(2)}</td>
          <td style="font-size:11px;color:#666;">${costPerLoaf.toFixed(3)}</td>
          <td class="no-print"><button class="btn btn-warning" style="padding:2px 6px;font-size:11px;" onclick="editBakeryProduction(${realIdx})">âœï¸</button> <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryProduction(${realIdx})">ðŸ—‘ï¸</button></td>
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
        if (!date) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ù†ØªØ§Ø¬');
        let breadCount = parseInt(document.getElementById('bprod-count').value) || 0;
        if (breadCount < 1) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©');
        if (breadCount > 3500) return alert('Ø®Ø·Ø£: Ø¥Ù†ØªØ§Ø¬ ÙØ±Ù† Ø§Ù„Ù…Ø²Ø±Ø¹Ø© Ù„Ø§ ÙŠØ¬ÙˆØ² Ø£Ù† ÙŠØªØ¬Ø§ÙˆØ² 3500 Ø±ØºÙŠÙ ÙÙŠ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ÙˆØ§Ø­Ø¯. ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø¯Ø®Ù„.');
        let flourUsed = parseFloat(document.getElementById('bprod-ing-ING001').value) || 0;
        let yeastUsed = parseFloat(document.getElementById('bprod-ing-ING002').value) || 0;
        let saltUsed = parseFloat(document.getElementById('bprod-ing-ING003').value) || 0;
        let branUsed = parseFloat(document.getElementById('bprod-ing-ING004').value) || 0;
        let dieselUsed = parseFloat(document.getElementById('bprod-ing-ING007').value) || 0;
        let operatingCost = parseFloat(document.getElementById('bprod-opcost').value) || 0;
        let notes = document.getElementById('bprod-notes').value.trim();
        var ingIds = ['ING001','ING002','ING003','ING004','ING007'];
        var ingQtys = { ING001: flourUsed, ING002: yeastUsed, ING003: saltUsed, ING004: branUsed, ING007: dieselUsed };
        // Ø­Ø°Ù Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ù‚Ø¯ÙŠÙ… Ø¥Ù† ÙˆØ¬Ø¯ Ù„Ù†ÙØ³ Ø§Ù„ØªØ§Ø±ÙŠØ® (Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø®Ø§Ù…Ø§Øª Ø£ÙˆÙ„Ø§Ù‹)
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
            alert('Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† ' + ing.name + ' (' + qty + ' ' + ing.unit + ') ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªÙˆÙØ± Ø­Ø§Ù„ÙŠØ§Ù‹ (' + before + ' ' + ing.unit + ')');
            throw new Error('Ù‡Ø§Ù„Ùƒ ÙƒÙŠÙ„Ùˆ Ø¯Ù‚ÙŠÙ‚');
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
      } catch(e) { if (e.message !== 'Ù‡Ø§Ù„Ùƒ ÙƒÙŠÙ„Ùˆ Ø¯Ù‚ÙŠÙ‚') alert('Ø®Ø·Ø£: ' + e.message); }
    }

    function deleteBakeryProduction(idx) { if (!requireAdmin()) return;
      if (! confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø³Ø¬Ù„ Ø¥Ù†ØªØ§Ø¬ Ø§Ù„ÙØ±Ù† Ù„Ù‡Ø°Ø§ Ø§Ù„ØªØ§Ø±ÙŠØ®ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹.')) return;
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
      alert('ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø³Ø¬Ù„ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ù„ØªØ¹Ø¯ÙŠÙ„Ù‡Ø§.');
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
      document.getElementById('btn-save-ctr').textContent = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„';
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
      document.getElementById('btn-save-ctr').textContent = 'ðŸšš ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªÙˆØ±ÙŠØ¯';
      document.getElementById('btn-cancel-ctr').style.display = 'none';
    }

    function saveBakeryContractorSupply() {
      try {
        let date = document.getElementById('bctr-date').value;
        if (!date) return alert('âš ï¸ Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ®.');
        let name = document.getElementById('bctr-name').value;
        if (!name) return alert('âš ï¸ Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©.');
        if (name === '[object Object]') { alert('âš ï¸ Ø§Ø³Ù… Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ ØºÙŠØ± ØµØ§Ù„Ø­. Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ø³Ù… Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©.'); return; }
        let count = parseInt(document.getElementById('bctr-count').value) || 0;
        if (count < 1) return alert('âš ï¸ Ø£Ø¯Ø®Ù„ Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©.');
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
            alert('âš ï¸ Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø³Ø­ÙˆØ¨Ø© Ù…Ù† ' + ing.name + ' (' + qty + ') Ø£ÙƒØ¨Ø± Ù…Ù† Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø­ (' + before + ' ' + ing.unit + ')');
            throw new Error('Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ');
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
            notes: 'ØªÙ… Ø³Ø­Ø¨ ' + qty + ' ' + ing.unit + ' Ù„Ø§Ù†ØªØ§Ø¬ Ø®Ø¨Ø² Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† - ' + name,
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
        document.getElementById('btn-save-ctr').textContent = 'ðŸšš ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªÙˆØ±ÙŠØ¯';
        document.getElementById('btn-cancel-ctr').style.display = 'none';
        document.getElementById('bctr-count').value = '0'; document.getElementById('bctr-paid').value = '0';
        document.getElementById('bctr-responsible').value = ''; document.getElementById('bctr-notes').value = '';
        ingIds.forEach(function(id) { document.getElementById('bctr-ing-' + id).value = '0'; });
      } catch(e) { if (e.message !== 'Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ') alert('âŒ Ø®Ø·Ø£: ' + e.message); }
    }

    function importWhatsAppCtrToBreadPlan() {
      var text = document.getElementById('wa-ctr-import').value;
      if (!text.trim()) return;
      var lines = text.split('\n').filter(function(l) { return l.trim(); });
      var imported = 0;
      lines.forEach(function(line) {
        var name = '', qty = 0;
        // Try to parse [timeØŒ date] name: text
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
        tr.innerHTML = '<td style="border:1px solid #e0e0e0;padding:4px;"><input type="text" id="bpname-' + id + '" value="' + name.replace(/"/g,'&quot;') + '" style="width:100%;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;background:transparent;"></td><td style="border:1px solid #e0e0e0;padding:4px;width:80px;"><input type="number" id="bpqty-' + id + '" min="0" value="' + qty + '" style="width:70px;border:none;padding:6px;font-size:13px;font-family:Cairo,sans-serif;text-align:center;" oninput="updateBreadPlanTotal()"></td><td style="border:1px solid #e0e0e0;padding:4px;width:30px;"><button onclick="removeBreadPlanCtrRow(\'bprow-' + id + '\')" style="background:none;border:none;color:#d32f2f;cursor:pointer;font-size:16px;">âœ•</button></td>';
        tbody.appendChild(tr);
        imported++;
      });
      document.getElementById('wa-ctr-import').value = '';
      var statusEl = document.getElementById('wa-ctr-status');
      statusEl.textContent = 'âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© ' + imported + ' Ù…Ù‚Ø§ÙˆÙ„';
      updateBreadPlanTotal();
      setTimeout(function() { statusEl.textContent = ''; }, 3000);
    }
    function _extractNumber(s) {
      var map = { 'Ù ':'0','Ù¡':'1','Ù¢':'2','Ù£':'3','Ù¤':'4','Ù¥':'5','Ù¦':'6','Ù§':'7','Ù¨':'8','Ù©':'9' };
      s = s.replace(/[Ù -Ù©]/g, function(c) { return map[c] || c; });
      var nums = s.match(/\d+/g);
      return nums ? parseInt(nums[0]) : 0;
    }

    function deleteBakeryContractorSupply(idx) { if (!requireAdmin()) return;
      if (!confirm('Ø­Ø°Ù Ø§Ù„ØªÙˆØ±ÙŠØ¯ØŸ')) return;
      _logDeletion('bakeryContractorSupplies', (bakeryContractorSupplies[idx].name||'') + '|' + normalizeDateStr(bakeryContractorSupplies[idx].date) + '|' + (bakeryContractorSupplies[idx].count||''));
      bakeryContractorSupplies.splice(idx, 1);
      syncStorage(); renderBakeryContractorSupplies(); updateBakeryStats(); updateBreadSupplyStats();
    }

    function addBakeryStock() {
      let sel = document.getElementById('stock-add-material');
      sel.innerHTML = '<option value="">Ø§Ø®ØªØ± Ø§Ù„Ù…ÙƒÙˆÙ†</option>' + bakeryIngredients.map(i => '<option value="' + i.id + '">' + i.name + ' (' + (i.currentQty||0) + ' ' + i.unit + ')</option>').join('');
      document.getElementById('stock-add-qty').value = '';
      document.getElementById('stock-add-notes').value = '';
      openModal('modal-add-stock');
    }
    function confirmAddBakeryStock() {
      let id = document.getElementById('stock-add-material').value;
      if (!id) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…ÙƒÙˆÙ†');
      let ing = bakeryIngredients.find(i => i.id === id);
      if (!ing) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ù…ÙƒÙˆÙ† Ø§Ù„Ø¥Ù†ØªØ§Ø¬.');
      let qty = parseFloat(document.getElementById('stock-add-qty').value) || 0;
        if (!qty || qty <= 0) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙ…ÙŠØ© Ø§Ù„ØªÙˆØ±ÙŠØ¯ Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸.');
      let notes = document.getElementById('stock-add-notes').value.trim() || 'Ø¥Ø¶Ø§ÙØ© Ø±ØµÙŠØ¯';
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
      alert('ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø±ØµÙŠØ¯ Ù„Ù„Ù…Ø®Ø²Ù†: ' + qty + ' ' + ing.unit + ' Ù…Ù† ' + ing.name);
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
          <td style="color:${e.type === 'in' ? '#1b5e20' : '#d32f2f'};font-weight:700;">${e.type === 'in' ? 'Ø¥Ø¶Ø§ÙØ© Ø±ØµÙŠØ¯' : 'Ø§Ø³ØªØ®Ø¯Ø§Ù…'}</td>
          <td style="font-weight:700;">${e.quantity} ${e.unit}</td>
          <td>${e.unit}</td>
          <td>${e.balanceBefore}</td>
          <td>${e.balanceAfter}</td>
          <td style="color:#666;font-size:12px;">${e.notes||''}</td>
        </tr>`
      ).join('');
      if (!data.length) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:30px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø±ÙƒØ§Øª</td></tr>';
    }

    function toggleContractorSupplyPaid(idx) {
      let c = bakeryContractorSupplies[idx];
      if (!c) return;
      let total = (parseInt(c.count)||0) * (parseFloat(c.price)||0);
      let isCurrentlyPaid = (parseFloat(c.paid)||0) >= total;
      if (isCurrentlyPaid) {
        if (!confirm(`Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ù„ØºØ§Ø¡ ØªØ­ØµÙŠÙ„ ${c.name} Ù„ÙŠÙˆÙ… ${c.date}ØŸ`)) return;
        c.paid = 0;
      } else {
        if (!confirm(`ØªØ£ÙƒÙŠØ¯ ØªØ­ØµÙŠÙ„ ${c.name} Ù„ÙŠÙˆÙ… ${c.date} Ø¨Ù‚ÙŠÙ…Ø© ${total.toFixed(2)} Ø¬.Ù…ØŸ`)) return;
        c.paid = total;
      }
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
          <td style="font-weight:700;${paid === 0 ? 'color:#d32f2f;' : remaining > 0 ? 'color:#e65100;' : 'color:#1b5e20;'}">${paid === 0 ? 'ðŸ”´ ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹' : remaining > 0 ? `âš ï¸ Ù…ØªØ¨Ù‚ÙŠ ${remaining.toFixed(2)}` : 'âœ… ØªÙ… Ø§Ù„Ø¯ÙØ¹'}</td>
          <td>${c.responsible||''}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;background:#1565c0;color:white;" onclick="editBakeryContractorSupply(${realIdx})" title="ØªØ¹Ø¯ÙŠÙ„">ØªØ¹Ø¯ÙŠÙ„</button>
            <button class="btn btn-success" style="padding:2px 6px;font-size:11px;background:#2e7d32;color:white;" onclick="toggleContractorSupplyPaid(${realIdx})" title="ØªØ­ØµÙŠÙ„ Ø§Ù„Ù…Ø¨Ù„Øº">ØªØ­ØµÙŠÙ„</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryContractorSupply(${realIdx})">Ø­Ø°Ù</button>
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
          <td style="font-weight:700;${paid === 0 ? 'color:#d32f2f;' : remaining > 0 ? 'color:#e65100;' : 'color:#1b5e20;'}">${paid === 0 ? 'ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹' : remaining > 0 ? `Ù…ØªØ¨Ù‚ÙŠ Ø¯ÙØ¹ ${remaining.toFixed(2)}` : 'Ù…Ø¯ÙÙˆØ¹ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„'}</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="printBakeryInvoice(${realIdx})">Ø·Ø¨Ø§Ø¹Ø©</button>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteBakeryInvoice(${realIdx})">Ø­Ø°Ù</button>
          </td>
        </tr>`;
      }).join('');
    }

    function saveBakeryInvoice() {
      let number = document.getElementById('binv-number').value.trim();
      if (!number) number = 'INV-' + new Date().toISOString().slice(0,10) + '-' + String(bakeryInvoices.length+1).padStart(3,'0');
      let date = document.getElementById('binv-date').value;
      if (!date) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ ØªØ§Ø±ÙŠØ® Ø§Ù„ÙØ§ØªÙˆØ±Ø©');
      let customer = document.getElementById('binv-customer').value.trim();
        if (!customer) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„.');
      let count = parseInt(document.getElementById('binv-count').value) || 0;
      if (count < 1) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©');
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
      if (!confirm('Ø§Ù„ÙƒÙ„ÙŠ Ø¯Ù‚ÙŠÙ‚')) return;
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
      w.document.write(`<html dir="rtl"><head><meta charset="UTF-8"><title>ÙØ§ØªÙˆØ±Ø© ${inv.number}</title>
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
        <h2>ÙØ§ØªÙˆØ±Ø© ØªÙˆØ±ÙŠØ¯ Ù…Ø®Ø¨Ø²</h2>
        <p><b>Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©:</b> ${inv.number}</p>
        <p><b>Ø§Ù„ØªØ§Ø±ÙŠØ®:</b> ${inv.date}</p>
        <p><b>Ø§Ù„Ø¹Ù…ÙŠÙ„:</b> ${inv.customer}</p>
        <table><tr><th>Ø§Ù„ØµÙ†Ù</th><th>Ø§Ù„Ø¹Ø¯Ø¯</th><th>Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th></tr>
        <tr><td>Ø®Ø¨Ø²</td><td>${inv.count}</td><td>${inv.unitPrice}</td><td>${(inv.count*inv.unitPrice).toFixed(2)}</td></tr></table>
        <div class="total">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${(inv.count*inv.unitPrice).toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
        <div class="total" style="font-size:16px;color:#1b5e20;">Ø§Ù„Ù…Ø¯ÙÙˆØ¹: ${parseFloat(inv.paid).toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
        <div class="total" style="font-size:16px;">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: ${((inv.count*inv.unitPrice) - parseFloat(inv.paid)).toFixed(2)} Ø¬Ù†ÙŠÙ‡</div>
        ${inv.notes ? `<p style="margin-top:15px;"><b>Ù…Ù„Ø§Ø­Ø¸Ø§Øª:</b> ${inv.notes}</p>` : ''}
        <div class="footer">Ù†Ø¸Ø§Ù… Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„ â€” Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²</div>
        <script>window.print();setTimeout(()=>window.close(),1500);</${''}script></body></html>`);
      w.document.close();
    }

    function exportBakeryInvoicesToExcel() {
      if (bakeryInvoices.length === 0) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù„Ù„ØªØµØ¯ÙŠØ±.');
      let rows = sortNewestFirst(bakeryInvoices, 'date').map(i => ({
        'ÙƒØ§ÙÙ Ø±ØµÙŠØ¯': i.number, 'ØºÙŠØ±': i.date, 'ÙƒØ§ÙÙ': stripEmoji(i.customer),
        'Ø®Ø·Ø£ Ø­Ø°Ù': i.count, 'Ø§Ù„Ø¥Ù†ØªØ§Ø¬ØŸ ØªØ¹Ø¯ÙŠÙ„': i.unitPrice,
        'Ø§Ù„Ø¥Ù†ØªØ§Ø¬': (i.count*i.unitPrice).toFixed(2),
        'Ø¹Ø¯Ù‘Ù„': parseFloat(i.paid).toFixed(2),
        'Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª': ((i.count*i.unitPrice)-parseFloat(i.paid)).toFixed(2),
        'ÙˆØ§Ø¶ØºØ·': stripEmoji(i.notes)
      }));
      let ws = XLSX.utils.json_to_sheet(rows);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ù†ØªØ§Ø¬');
      XLSX.writeFile(wb, 'Ù„Ù„Ø­ÙØ¸_Ø­ÙØ¸.xlsx');
    }
    function exportBakeryProductionToExcel() {
      if (!bakeryProductions.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù†ØªØ§Ø¬ Ù„Ù„ØªØµØ¯ÙŠØ±.');
      let rows = sortNewestFirst(bakeryProductions, 'date').map(p => ({ 'Ø§Ù„ØªØ§Ø±ÙŠØ®': p.date, 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©': p.breadCount, 'Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)': p.flourUsed||0, 'Ø®Ù…ÙŠØ±Ø© (ÙƒØ¬Ù…)': p.yeastUsed||0, 'Ù…Ù„Ø­ (ÙƒØ¬Ù…)': p.saltUsed||0, 'Ø±Ø¯Ø© (ÙƒØ¬Ù…)': p.branUsed||0, 'Ø³ÙˆÙ„Ø§Ø± (Ù„ØªØ±)': p.dieselUsed||0, 'Ø£Ø¬Ø± Ø§Ù„ØªØ´ØºÙŠÙ„': p.operatingCost||0, 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª': stripEmoji(p.notes) }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ø®Ø¨Ø²'); XLSX.writeFile(wb, 'Ø¥Ù†ØªØ§Ø¬_Ø§Ù„Ø®Ø¨Ø².xlsx');
    }
    function exportBakeryIngredientsToExcel() {
      if (!bakeryIngredients.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø§Ù…Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±.');
      let rows = bakeryIngredients.map(i => ({ 'Ø§Ù„ÙƒÙˆØ¯': i.id, 'Ø§Ø³Ù… Ø§Ù„ØµÙ†Ù': i.name, 'Ø§Ù„ÙˆØ­Ø¯Ø©': i.unit, 'Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ': i.currentQty||0, 'Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰': i.minQty||0, 'Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©': i.pricePerUnit||0 }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø®Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®Ø¨Ø²'); XLSX.writeFile(wb, 'Ø®Ø§Ù…Ø§Øª_Ø§Ù„Ù…Ø®Ø¨Ø².xlsx');
    }

    function exportBakeryContractorSuppliesToExcel() {
      if (!bakeryContractorSupplies.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØ±ÙŠØ¯Ø§Øª Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ù„Ù„ØªØµØ¯ÙŠØ±.');
      let rows = sortNewestFirst(bakeryContractorSupplies, 'date').map(c => ({ 'Ø§Ù„ØªØ§Ø±ÙŠØ®': c.date, 'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„': stripEmoji(c.name), 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©': c.count, 'Ø³Ø¹Ø± Ø§Ù„Ø±ØºÙŠÙ': c.price, 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ': ((c.count||0)*(c.price||0)).toFixed(2), 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹': parseFloat(c.paid||0).toFixed(2), 'Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ': (((c.count||0)*(c.price||0))-parseFloat(c.paid||0)).toFixed(2), 'Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„': stripEmoji(c.responsible), 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª': stripEmoji(c.notes) }));
      let ws = XLSX.utils.json_to_sheet(rows); let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†'); XLSX.writeFile(wb, 'ØªÙˆØ±ÙŠØ¯_Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†.xlsx');
    }
    function printBreadInvoice() {
      var fromDate = document.getElementById('filt-ctr-from')?.value || '';
      var toDate = document.getElementById('filt-ctr-to')?.value || '';
      if (!fromDate || !toDate) { alert('âš ï¸ Ø­Ø¯Ø¯ Ø§Ù„ÙØªØ±Ø© Ø£ÙˆÙ„Ø§Ù‹ (Ù…Ù† ØªØ§Ø±ÙŠØ® â€” Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®) Ù…Ù† Ø§Ù„ÙÙ„Ø§ØªØ± Ø£Ø¹Ù„Ø§Ù‡'); return; }
      if (!_selectedContractors || _selectedContractors.length === 0) { alert('âš ï¸ Ø§Ø®ØªØ± Ù…Ù‚Ø§ÙˆÙ„Ø§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù…Ù† ÙÙ„ØªØ± Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†'); return; }
      var records = bakeryContractorSupplies.filter(function(r) {
        return r.date >= fromDate && r.date <= toDate && _selectedContractors.indexOf(r.name) !== -1;
      });
      if (!records.length) { alert('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØ±ÙŠØ¯Ø§Øª Ù„Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ† Ø§Ù„Ù…Ø®ØªØ§Ø±ÙŠÙ† ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ÙØªØ±Ø©'); return; }
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
          var statusIcon = paid >= rev ? 'âœ…' : (paid > 0 ? 'ðŸŸ¡' : 'ðŸ”´');
          return '<tr>' +
            '<td style="text-align:center;">' + (i + 1) + '</td>' +
            '<td style="text-align:center;">' + r.date + '</td>' +
            '<td style="text-align:center;font-weight:700;">' + r.count + '</td>' +
            '<td style="text-align:center;">' + parseFloat(r.price || 0).toFixed(2) + '</td>' +
            '<td style="text-align:center;font-weight:700;">' + rev.toFixed(2) + '</td>' +
            '<td style="text-align:center;">' + paid.toFixed(2) + '</td>' +
            '<td style="text-align:center;font-weight:' + (rem > 0 ? '700;color:#c62828;' : '400;color:#2e7d32;') + '">' + rem.toFixed(2) + '</td>' +
            '<td style="text-align:center;">' + statusIcon + (r.responsible || 'â€”') + '</td>' +
          '</tr>';
        }).join('');
        var tCount = Object.keys(grouped).length;
        return '<div class="page">' +
          '<div class="logo-section">' +
            '<div class="right">' +
              (logoSrc ? '<img src="' + logoSrc + '" alt="Ø´Ø¹Ø§Ø± Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²">' : '') +
              '<div><div class="co-name">Ø´Ø±ÙƒØ© Ù„ÙŠÙ†Ø© Ù„Ù„ØªÙ†Ù…ÙŠØ© Ø§Ù„Ø³ÙŠØ§Ø­ÙŠØ© ÙˆØ§Ù„Ø¹Ù…Ø±Ø§Ù†ÙŠØ©</div><div class="co-sub">Ù…Ø®Ø¨Ø² Ø¢Ù„ÙŠØ© â€” ØªÙˆØ±ÙŠØ¯ Ø®Ø¨Ø² Ù„Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†</div></div>' +
            '</div>' +
            '<div class="badge">ÙØ§ØªÙˆØ±Ø©</div>' +
          '</div>' +
          '<div class="title">ðŸ§¾ ÙØ§ØªÙˆØ±Ø© ØªÙˆØ±ÙŠØ¯ Ø®Ø¨Ø²</div>' +
          '<div class="meta-row">' +
            '<div class="meta-item"><span class="meta-label">Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©</span><span class="meta-val">' + invNo + '-' + (pi + 1) + '/' + tCount + '</span></div>' +
            '<div class="meta-item"><span class="meta-label">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©</span><span class="meta-val">' + invDate + '</span></div>' +
            '<div class="meta-item"><span class="meta-label">ÙØªØ±Ø© Ø§Ù„ØªÙˆØ±ÙŠØ¯</span><span class="meta-val">' + fromDate + ' â†’ ' + toDate + '</span></div>' +
          '</div>' +
          '<div class="ctr-info">' +
            '<div class="ctr-label">ðŸ‘¤ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„</div><div class="ctr-name">' + ctrName + '</div>' +
          '</div>' +
          '<table>' +
            '<thead><tr>' +
              '<th style="width:30px;">Ù…</th><th style="width:75px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="width:65px;">Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©</th><th style="width:55px;">Ø§Ù„Ø³Ø¹Ø±</th><th style="width:65px;">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th><th style="width:65px;">Ø§Ù„Ù…Ø¯ÙÙˆØ¹</th><th style="width:65px;">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</th><th>Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</th>' +
            '</tr></thead><tbody>' + rows + '</tbody>' +
          '</table>' +
          '<div class="totals">' +
            '<div class="total-row"><span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ©</span><span class="num">' + totalLoaves + ' Ø±ØºÙŠÙ</span></div>' +
            '<div class="total-row"><span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù‚ÙŠÙ…Ø© Ø§Ù„ØªÙˆØ±ÙŠØ¯Ø§Øª</span><span class="num" style="color:#1b5e20;">' + totalRevenue.toFixed(2) + ' Ø¬.Ù…</span></div>' +
            '<div class="total-row"><span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹</span><span class="num" style="color:#1565c0;">' + totalPaid.toFixed(2) + ' Ø¬.Ù…</span></div>' +
            '<div class="total-row total-due"><span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</span><span class="num" style="color:#c62828;">' + (totalRevenue - totalPaid).toFixed(2) + ' Ø¬.Ù…</span></div>' +
          '</div>' +
          '<div class="footer">ÙØ§ØªÙˆØ±Ø© ØªÙˆØ±ÙŠØ¯ Ø®Ø¨Ø² â€” Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø² Â© ' + new Date().getFullYear() + '</div>' +
        '</div>';
      }).join('');
      var w = window.open('', '_blank');
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ÙØ§ØªÙˆØ±Ø© Ø®Ø¨Ø² â€” LINAHSYSTEM</title>' +
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
          if(!rows || !rows.length) return alert("Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ"] || ''; if(!name) { skipped++; continue; }
            let code = r["Ø®Ø¨Ø²"] || '';
            let exists = (code && bakeryIngredients.some(i => i.id === code)) || bakeryIngredients.some(i => i.name === name);
            if(exists) { skipped++; continue; }
            bakeryIngredients.push({ id: code, name: name, unit: r["Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ"]||'', currentQty: Number(r["Ø¬ Ù…"])||0, minQty: Number(r["Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ø¬"])||0, pricePerUnit: Number(r["Ù… Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ"])||0, notes: '' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} ØµÙ†Ù Ø®Ø§Ù…Ø§Øª Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø®Ø§Ù…Ø§Øª Ø§Ù„ÙØ±Ù†: "+ex.message); }
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
          if(!rows || !rows.length) return alert("ÙØ±Ù† Ø§Ù„Ù…Ø²Ø±Ø¹Ø©");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let date = r["Ù„Ø§"] || ''; if(!date) { skipped++; continue; }
            let exists = bakeryProductions.some(p => p.date === date);
            if(exists) { skipped++; continue; }
            bakeryProductions.push({ date: date, breadCount: Number(r["ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ±"])||0, flourUsed: parseFloat(r["Ù„Ù„ØªØµØ¯ÙŠØ± (Ø±Ù‚Ù…)"])||0, yeastUsed: parseFloat(r["Ø§Ù„ÙØ§ØªÙˆØ±Ø© (Ø§Ù„ØªØ§Ø±ÙŠØ®)"])||0, saltUsed: parseFloat(r["Ø§Ù„Ø¹Ù…ÙŠÙ„ (Ø¹Ø¯Ø¯)"])||0, branUsed: parseFloat(r["Ø§Ù„Ø£Ø±ØºÙØ© (Ø³Ø¹Ø±)"])||0, dieselUsed: parseFloat(r["Ø§Ù„ÙˆØ­Ø¯Ø© (Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ)"])||0, opCost: parseFloat(r["Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ"])||0, notes: r["Ù…Ù„Ø§Ø­Ø¸Ø§Øª"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ø³Ø¬Ù„ Ø¥Ù†ØªØ§Ø¬ ÙØ±Ù† Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¥Ù†ØªØ§Ø¬ Ø§Ù„ÙØ±Ù†: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙˆØ­Ø¯Ø©");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let name = r["Ø§Ù„ÙƒÙ…ÙŠØ©"] || ''; if(!name) { skipped++; continue; }
            let date = r["Ø§Ù„Ø­Ø§Ù„ÙŠØ©"] || '';
            let exists = bakeryContractorSupplies.some(c => c.name === name && c.date === date);
            if(exists) { skipped++; continue; }
            bakeryContractorSupplies.push({ date: date, name: name, count: Number(r["Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰"])||0, price: parseFloat(r["Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©"])||0, paid: parseFloat(r["Ø®Ø§Ù…Ø§Øª"])||0, responsible: r["Ø§Ù„ÙØ±Ù†"]||'', notes: r["Ø®Ø§Ù…Ø§Øª"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} ØªÙˆØ±ÙŠØ¯ Ù…Ø®Ø¨Ø² Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ù…Ø®Ø¨Ø²: "+ex.message); }
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
          if(!rows || !rows.length) return alert("Ø¯Ù‚ÙŠÙ‚ ÙƒØ¬Ù…");
          let added = 0, skipped = 0;
          for(let r of rows) {
            let number = r["Ø®Ù…ÙŠØ±Ø© ÙƒØ¬Ù…"] || ''; if(!number) { skipped++; continue; }
            let exists = bakeryInvoices.some(i => i.number === number);
            if(exists) { skipped++; continue; }
            bakeryInvoices.push({ number: number, date: r["Ù…Ù„Ø­"]||'', customer: r["ÙƒØ¬Ù…"]||'', count: Number(r["Ø±Ø¯Ø© ÙƒØ¬Ù…"])||0, unitPrice: parseFloat(r["Ø³ÙˆÙ„Ø§Ø± Ù„ØªØ±"])||0, paid: parseFloat(r["ØªÙƒÙ„ÙØ©"])||0, notes: r["Ø§Ù„ØªØ´ØºÙŠÙ„"]||'' });
            added++;
          }
          syncStorage(); renderAll(); alert(`ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} ÙØ§ØªÙˆØ±Ø© Ù…Ø®Ø¨Ø² Ø¨Ù†Ø¬Ø§Ø­.\nØªÙ… ØªØ®Ø·ÙŠ ${skipped} Ù…ÙƒØ±Ø±.`);
        } catch(ex) { alert("Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø®Ø¨Ø²: "+ex.message); }
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
      let html = `<html dir="rtl"><head><meta charset="UTF-8"><title>Ù„Ù„ØªØµØ¯ÙŠØ± Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„</title>
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
            <h2>Ø¨Ù„Ø§Øº Ø§Ù„ÙˆØ¬Ø¨Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ ÙˆØ¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„</h2>
        <div class="summary">
          <div class="card"><div>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø±ØºÙØ©</div><div class="num">${totalBread}</div></div>
          <div class="card"><div>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)</div><div class="num">${totalFlour.toFixed(1)}</div></div>
          <div class="card"><div>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø®Ù…ÙŠØ±Ø© (ÙƒØ¬Ù…)</div><div class="num">${totalYeast.toFixed(2)}</div></div>
        </div>
        <table><thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø£Ø±ØºÙØ©</th><th>Ø§Ù„Ø¯Ù‚ÙŠÙ‚</th><th>Ø§Ù„Ø®Ù…ÙŠØ±Ø©</th><th>Ø§Ù„Ù…Ù„Ø­</th><th>Ø§Ù„Ø±Ø¯Ø©</th><th>Ø§Ù„Ø³ÙˆÙ„Ø§Ø±</th></tr></thead><tbody>`;
      bakeryProductions.forEach(p => {
        html += `<tr><td>${p.date}</td><td>${p.breadCount}</td><td>${p.flourUsed||0}</td><td>${p.yeastUsed||0}</td><td>${p.saltUsed||0}</td><td>${p.branUsed||0}</td><td>${p.dieselUsed||0}</td></tr>`;
      });
      html += `</tbody></table><div style="text-align:center;color:#888;margin-top:20px;">ØªÙ… Ø§Ù„ØªÙˆÙ„ÙŠØ¯: ${new Date().toLocaleString('ar-EG')}</div>
        <script>window.print();setTimeout(()=>window.close(),1500);<` + `/script></body></html>`;
      container.document.write(html);
      container.document.close();
    }

    // ============================
    //  1.  REFRESH SYSTEM (Ø§Ù„ÙˆØ­Ø¯Ø©)
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
      document.querySelectorAll('select').forEach(el => { if (el.id !== 'filter-status' && el.id !== 'filter-contract') el.selectedIndex = 0; });

      // Re-render everything
      sortEmployeesAlphabetically(); rebuildAllDropdowns(); calculateSystemStats();
      renderTable(); renderHousingLayout(); renderInventoryTable(); renderInventoryItems();
      renderVacationsTable(); renderOvertimeCalendar(); renderHospitalityTable(); renderMaintenanceTable(); renderSepticTable();
      renderPeriodicMaintenance(); renderTeaSugarTable(); renderMealLogTable(); autoLogTodayMeals();
      populateContractorSectorDropdown(); renderContractorsTable();
      renderBakeryIngredients(); renderBakeryProductions();
      renderBakeryContractorSupplies();
      renderBakeryInvoices(); renderDashboard(); renderQuickActions(); initAllSortableTables();

      alert('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆØ¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª');
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
      if (el) { el.textContent = driveConnected ? '? Ø®Ø§Ù…Ø§Øª' : 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØ±Ù† Ø®Ø§Ù…Ø§Øª'; el.style.color = driveConnected ? '#2e7d32' : '#999'; }
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
    //  2.75  SUPABASE REAL-TIME SYNC (Ø§Ù„ÙØ±Ù† Ù„Ø§)
    // ============================
    const SUPABASE_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
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
      if (status === 'connected') { el.textContent = 'âœ… Ù…ØªØµÙ„'; el.style.color = '#2e7d32'; }
      else if (status === 'connecting') { el.textContent = 'ðŸ”„ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§ØªØµØ§Ù„...'; el.style.color = '#fdd835'; }
      else { el.textContent = 'âŒ ØºÙŠØ± Ù…ØªØµÙ„'; el.style.color = '#f44336'; }
    }

    function getAllDataForSync() {
      var o = getAllDataObject();
      ['dynamicSectors','contractorSectors','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicVisitorTypes','bakeryContractorsNames'].forEach(function(k) { try { if (Array.isArray(o[k])) o[k] = _strArr(o[k]); } catch(e) {} });
      var keys = ['employees','roomsCapacity','vacations','inventoryVouchers','excludedEmployees','contractors','mealLogs','mealWaste','inventoryItems','hospitalities','adminOvertime','maintenanceRecords','septicRecords','periodicMaintenance','teaSugarDisbursements','teaSugarBatches','dynamicSectors','contractorSectors','contractorRooms','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicVisitorTypes','bakeryContractorsNames','evaluations','evalTemplates','appUsers','auditLog','bakeryIngredients','bakeryProductions','bakeryContractorSupplies','bakeryInvoices','bakeryStockLog','roomAssets','archiveData','quickActions','deptTitles','manualTotalBeds','dailyStats','finTransactions','finBudgets','syncDeletions','waterStations','waterDocs','ingredientMaster','mealSurveys'];
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
        archiveData: function(a) { return a.id || a.date; },
        quickActions: function(q) { return q.label; },
        dailyStats: function(d) { return d.date; },
        deptTitles: function(d) { return (d.dept||'') + '|' + (d.title||''); },
        contractorSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
        contractorRooms: function(r) { return (r.sector || '') + '|' + (r.number || ''); },
        dynamicSectors: function(s) { return (typeof s === 'string') ? s : (s.name || s); },
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
        showSyncToast('? Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ© Ø¨ÙŠØ§Ù†Ø§Øª Supabase â€” Ø¨ÙŠØ§Ù†Ø§Øª Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ');
        return false;
      }
      while (_pushInProgress) { await new Promise(function(r) { setTimeout(r, 300); }); }
      _pushInProgress = true;
      try {
        var ts = new Date().toISOString();
        var allData = getAllDataForSync();
        var currentAlldata = {};
        try {
          var adResp = await fetch(_sbEndpoint + '?id=eq.alldata&select=data', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
          if (adResp.ok) { var adRows = await adResp.json(); if (adRows && adRows[0] && adRows[0].data) { currentAlldata = typeof adRows[0].data === 'string' ? JSON.parse(adRows[0].data) : adRows[0].data; } }
        } catch(e) {}
        var _delByEntity = {};
        syncDeletions.forEach(function(_d) {
          if (!_delByEntity[_d.entity]) _delByEntity[_d.entity] = {};
          _delByEntity[_d.entity][_d.key] = true;
        });
        Object.keys(allData).forEach(function(ak) {
          if (Array.isArray(currentAlldata[ak]) && Array.isArray(allData[ak])) {
            currentAlldata[ak] = mergeArraysPush(allData[ak], currentAlldata[ak], function(item) { return _getItemKey(item, ak); }, _delByEntity[ak] || {});
          } else {
            currentAlldata[ak] = allData[ak];
          }
        });
        // Apply pending deletions to the merged data (handles case where local array is empty but deletions exist)
        syncDeletions.forEach(function(_del) {
          var _arr = currentAlldata[_del.entity];
          if (Array.isArray(_arr)) {
            currentAlldata[_del.entity] = _arr.filter(function(_item) { return _getItemKey(_item, _del.entity) !== _del.key; });
          }
        });
        ['bakeryContractorsNames','dynamicVisitorTypes','dynamicSeptics','dynamicDepts','dynamicTitles','dynamicSectors','contractorSectors','bakeryContractorsNames'].forEach(function(k) { if (Array.isArray(currentAlldata[k])) currentAlldata[k] = _strArr(currentAlldata[k]); });
        if (Array.isArray(currentAlldata.bakeryContractorSupplies)) currentAlldata.bakeryContractorSupplies = currentAlldata.bakeryContractorSupplies.map(function(r) { if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'; return r; });
        var resp = await fetch(_sbEndpoint, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: 'alldata', data: currentAlldata, updated_at: ts, device_id: _deviceId })
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        _pulledAt['_lastPush'] = ts;
        _lsSet('_pulledAt', JSON.stringify(_pulledAt));
        deduplicateAfterSync();
        _takeSnapshot();
        syncStorage(true, true);
        syncLog('ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Supabase');
        updateLastSyncTime();
        showSyncToast('ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Supabase Ø¨Ù†Ø¬Ø§Ø­ âœ…');
      } catch(e) {
        syncLog('ÙØ´Ù„ Ø§Ù„Ø±ÙØ¹: ' + e.message);
        showSyncToast('ØªØ¹Ø°Ø± Ø±ÙØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Supabase');
      } finally {
        _pushInProgress = false;
      }
      return true;
    }
    async function forceFullSync() {
      if (!supabaseConnected) return alert('ØºÙŠØ± Ù…ØªØµÙ„ Ø¨Ù€ Supabase');
      if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ ØªÙ†ÙÙŠØ° Ù…Ø²Ø§Ù…Ù†Ø© ÙƒØ§Ù…Ù„Ø© (Ø±ÙØ¹ + Ø³Ø­Ø¨)ØŸ Ø³ÙŠØªÙ… Ø¯Ù…Ø¬ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©.')) return;
      // ØªØ®Ø·ÙŠ Ù…ÙƒØ±Ø± Ø®Ø·Ø£ Ø¨ÙŠØ§Ù†Ø§Øª push ÙÙŠ
      while (_pushInProgress) { await new Promise(function(r) { setTimeout(r, 500); }); }
      syncLog('Ø¬Ø§Ø±Ù Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...');
      await pushToSupabase();
      syncLog('Ø¬Ø§Ø±Ù Ø§Ù„Ø³Ø­Ø¨ Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©...');
      _forcePull = true;
      await pullFromSupabase();
      _forcePull = false;
      syncLog('ØªÙ…Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø¨Ù†Ø¬Ø§Ø­');
      alert('ØªÙ…Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø¨Ù†Ø¬Ø§Ø­ âœ…');
    }
    async function pullFromSupabase() {
      if (!supabaseConnected) return;
      while (_pullInProgress) { await new Promise(function(r) { setTimeout(r, 300); }); }
      _pullInProgress = true;
      try {
        var resp = await fetch(_sbEndpoint + '?select=id,data,updated_at', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Range': '0-*' } });
        if (!resp.ok) {           syncLog('ÙØ´Ù„ Ø§Ù„Ø³Ø­Ø¨ØŒ Ø­Ø§Ù„Ø©: ' + resp.status); return; }
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
                  setEntityVar(_dk, _dv);
                } else {
                  setEntityVar(_dk, _dv);
                }
              }
            }
            _pendingDeletions = _pendingDeletions.concat(_remoteDels);
            syncDeletions = _pendingDeletions;
            _applyDeletions();
            syncDeletions = [];
            _lsRemove('lineh_sync_deletions');
          }
          // Filter excluded employees from the loaded data
          var _exclMap2 = {};
          (excludedEmployees || []).forEach(function(e) { _exclMap2[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !_exclMap2[e.code || e.id || e.name]; });
          deduplicateAfterSync();
          // Normalize simple string arrays that may have objects from Supabase
          var _needsCleanPush = false;
          var _defaults = {
            dynamicSeptics: ["Ø¨ÙŠØ§Ø±Ø© Ù…Ø­Ø·Ø© Ø§Ù„ÙØ±Ø² Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù‚Ø·Ø§Ø¹ 22","Ø¨ÙŠØ§Ø±Ø© Ø§Ù„Ù…Ø·Ø¨Ø®","Ø¨ÙŠØ§Ø±Ø© Ø§Ù„Ø³ÙƒÙ† Ø§Ù„Ø§Ø¯Ø§Ø±ÙŠ","Ø¨ÙŠØ§Ø±Ø© Ù‚3","Ø¨ÙŠØ§Ø±Ø© Ø³ÙƒÙ† Ù†Ø®Ø§Ù„ÙŠÙ† 22","Ø¨ÙŠØ§Ø±Ø© Ù‚30","Ø¨ÙŠØ§Ø±Ø© Ù‚6","Ø¨ÙŠØ§Ø±Ø© Ù‚27","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 25","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 33","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 24","Ø¨ÙŠØ§Ø±Ø© Ø§Ù„Ø¨ÙŠØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯","Ø¨ÙŠØ§Ø±Ø© Ù…Ø¨Ù†ÙŠ Ø§Ù„Ø§Ø¯Ø§Ø±Ø©","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 27","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 29","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 30","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 21","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 1","Ø¨ÙŠØ§Ø±Ø© Ù‚Ø·Ø§Ø¹ 31","Ø¨ÙŠØ§Ø±Ø© Ù…Ø¬Ù…Ø¹ Ø§Ù„Ø­Ù…Ø§Ù…Ø§Øª Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠÙ‡"],
            dynamicRooms: ["A1", "A2", "B1", "B2", "V1"],
            dynamicDepts: ["Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©", "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠØ©", "Ø§Ù„Ø£Ù…Ù†", "Ø§Ù„ØµÙŠØ§Ù†Ø©", "Ø§Ù„Ù…Ø®Ø¨Ø²", "Ø§Ù„Ø¶ÙŠØ§ÙØ©"],
            dynamicTitles: ["Ù…Ù‡Ù†Ø¯Ø³", "ÙÙ†ÙŠ", "Ø¹Ø§Ù…Ù„", "Ø³Ø§Ø¦Ù‚", "Ù…Ø´Ø±Ù", "Ø¥Ø¯Ø§Ø±ÙŠ"],
            dynamicSectors: ["Ø³ÙƒÙ† Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†", "Ø³ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ†", "Ø³ÙƒÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ"],
            dynamicVisitorTypes: ["Ø¶ÙŠÙˆÙ","Ø³ÙŠØ¯Ø§Øª","Ø·Ù„Ø¨Ø© Ù…Ø¯Ø±Ø³Ø©","Ø³Ø§Ø¦Ù‚ÙŠÙ†","Ù…Ù‚Ø¯Ù… Ø®Ø¯Ù…Ø© Ø¨Ø¯ÙˆÙ† Ø§Ø¬Ø±","Ù…Ù‚Ø¯Ù… Ø®Ø¯Ù…Ø© Ø¨Ø§Ø¬Ø±","Ø§Ù…Ù† Ù„ÙŠÙ„ÙŠ"],
            contractorSectors: ["Ù‚Ø·Ø§Ø¹ 22", "Ø§Ù„Ø®ÙŠØ§Ù…", "Ø³ÙƒÙ† Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†"],
            contractorRooms: [],
            bakeryContractorsNames: []
          };
          ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames'].forEach(function(k) {
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
          if (Array.isArray(bakeryContractorSupplies)) bakeryContractorSupplies = bakeryContractorSupplies.map(function(r) { if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'; return r; });
          syncLog('ØªÙ… Ø³Ø­Ø¨ ' + Object.keys(mergedData).length + ' Ø¹Ù†ØµØ± Ù…Ù† Supabase');
          _pulledAt['_lastPull'] = new Date().toISOString();
          _lsSet('_pulledAt', JSON.stringify(_pulledAt));
          _takeSnapshot();
          syncStorage(true, true);
          renderAll();
          try { importBakeryFormData(); } catch(e) {}
          try { importMealWasteFormData(); } catch(e) {}
          try { importDailyDataFormData(); } catch(e) {}
          try { importMealSurveyFormData(); } catch(e) {}
          syncLog('ØªÙ… Ø§Ù„Ø³Ø­Ø¨ Ø¨Ù†Ø¬Ø§Ø­ Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©');
          showSyncToast('ØªÙ… Ø³Ø­Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø© Ø¨Ù†Ø¬Ø§Ø­ âœ…');
        } else {
          syncLog('Ø§Ù„Ø¬Ù‡Ø§Ø² Ù‡Ùˆ Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„ÙˆØ­ÙŠØ¯ Ù„Ù„Ø¨ÙŠØ§Ù†Ø§Øª');
        }
      } catch(e) {
        syncLog('Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø³Ø­Ø¨: ' + e.message);
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
      el.textContent = 'Ø¢Ø®Ø± Ù…Ø²Ø§Ù…Ù†Ø©: ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      el.style.display = 'inline';
    }

    async function connectSupabase() {
      try {
        var r = await fetch(_sbEndpoint + '?select=id&limit=1', { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
        if (!r.ok) { syncLog('âŒ ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Supabase ' + r.status + ' â€” Ø³ÙŠØªÙ… Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©'); setTimeout(connectSupabase, 3000); return; }
        supabaseConnected = true;
        syncLog('âœ… ØªÙ… Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Supabase');
        updateSupabaseStatus('connected');
        setTimeout(function() { pullFromSupabase(); }, 1000);
        updateLastSyncTime();
        startPresence();
        document.getElementById('cloud-status').textContent = 'â˜ï¸ Ù…ØªØµÙ„';
        // ? ÙØ´Ù„Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© ØªØ­Ù‚Ù‚ â€” Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„ ÙØ´Ù„/Ø§Ù„Ø³Ø­Ø¨ ÙƒÙˆØ¯
        // ÙØ§Ø¶ÙŠ Ø£Ùˆ Ù…Ø´ Ø¨ÙŠØ§Ù†Ø§Øª ØªÙ… (Ø§Ø³ØªÙ„Ø§Ù… Ù…Ù† ØªÙˆØ±ÙŠØ¯)
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
                // Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø®Ø¨Ø² Ø³Ø¬Ù„ ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
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
      // Ù„Ùˆ Ù…ÙˆØ¸Ù Ø±Ø¬Ø¹ ÙÙŠ Ø§Ù„Ù‚ÙˆØ©ØŒ Ø´ÙŠÙ„Ù‡ Ù…Ù† Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†
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
          console.log('Ø¨ÙŠØ§Ù†Ø§Øª Supabase connect error â€” retry 30s'); 
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
    var DATA_KEYS = ['employees','roomsCapacity','vacations','hospitalities','maintenanceRecords','septicRecords','inventoryVouchers','inventoryItems','excludedEmployees','periodicMaintenance','teaSugarDisbursements','teaSugarBatches','mealLogs','mealWaste','contractors','dynamicSectors','dynamicRooms','dynamicSeptics','dynamicDepts','dynamicTitles','deptTitles','appUsers','auditLog','bakeryIngredients','bakeryProductions','bakeryContractorSupplies','bakeryInvoices','currentUser','manualTotalBeds','roomAssets','archiveData','quickActions','waterStations','waterDocs','finTransactions','finBudgets','ingredientMaster','mealSurveys'];

    // Snapshot after pull â€” Ù†Ø¹Ø±Ù Ø¥ÙŠÙ‡ Ø§Ù„Ù„ÙŠ Ø§ØªØ´Ø§Ù„ Ø¹Ø´Ø§Ù† push Ù…Ø§ ÙŠØ¶ÙŠÙÙˆØ´ ØªØ§Ù†ÙŠ
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
      if (key==='mealLogs') return mealLogs; if (key==='mealWaste') return mealWaste; if (key==='contractors') return contractors; if (key==='dynamicSectors') return dynamicSectors; if (key==='dynamicRooms') return dynamicRooms;
      if (key==='dynamicSeptics') return dynamicSeptics; if (key==='dynamicDepts') return dynamicDepts; if (key==='dynamicTitles') return dynamicTitles; if (key==='deptTitles') return deptTitles;
      if (key==='appUsers') return appUsers; if (key==='auditLog') return auditLog; if (key==='bakeryIngredients') return bakeryIngredients; if (key==='bakeryProductions') return bakeryProductions;
      if (key==='bakeryContractorSupplies') return bakeryContractorSupplies; if (key==='bakeryInvoices') return bakeryInvoices; if (key==='roomAssets') return roomAssets;
      if (key==='archiveData') return archiveData; if (key==='quickActions') return quickActions;
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

    // Presence removed â€” Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø®Ø·Ø£
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
      else if (key === 'contractorSectors') contractorSectors = val;
      else if (key === 'contractorRooms') { contractorRooms = Array.isArray(val) ? val.filter(function(r) { return r && typeof r === 'object' && r.sector && r.number; }) : []; }
      else if (key === 'dynamicRooms') dynamicRooms = val;
      else if (key === 'dynamicSeptics') dynamicSeptics = val;
      else if (key === 'dynamicDepts') dynamicDepts = val;
      else if (key === 'dynamicTitles') dynamicTitles = val;
      else if (key === 'dynamicVisitorTypes') dynamicVisitorTypes = val;
      else if (key === 'bakeryContractorsNames') { val = _strArr(val); var _fixedCtrs = ["Ù…Ø­Ù…Ø¯ Ø´Ø¹Ø¨Ø§Ù†","Ù…Ù…Ø¯ÙˆØ­ Ø¨ÙƒØ±","Ø¹Ø§Ø·Ù Ø¹Ø¨Ø¯ Ø§Ù„Ù…ØºÙŠØ«","Ù…ØµØ·ÙÙ‰ Ø¹Ù„Ù‰","Ø§Ø³Ø§Ù…Ù‡ Ø³Ù…ÙŠØ±","ÙØ§Ø±Ø³ Ù…Ø­Ù…Ø¯"]; var _ctrSet = {}; _fixedCtrs.forEach(function(n) { _ctrSet[n] = true; }); val = val.filter(function(n) { return _ctrSet[n]; }); if (!val.length) val = _fixedCtrs.slice(); bakeryContractorsNames = val; }
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
      // Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù† Ø§Ù„Ù€ remote (Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ remote Ù…Ø´ ÙÙŠ local)
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
        archiveData: function(a) { return a.id || a.date; },
        quickActions: function(q) { return q.label || q; },
        deptTitles: function(d) { return (d.dept||'') + '|' + (d.title||''); },
        evaluations: function(e) { return (e.empCode||e.employeeCode||'') + '|' + (e.date||'') + '|' + (e.month||e.type||'') + '|' + (e.year||''); },
        evalTemplates: function(e) { return (e.title||'') + '|' + (e.name||e.templateName||''); },
        waterStations: function(w) { return w.id || w.date + '|' + w.station + '|' + w.type; },
        waterDocs: function(d) { return d.id || d.station + '|' + d.fileName; },
        mealSurveys: function(s) { return s.date + '|' + s.meal + '|' + s.employee; }
      };
      syncDeletions.forEach(function(del) {
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
      btn.textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©...';
      btn.disabled = true;
      try {
        supabaseConnected = false;
        document.getElementById('supabase-status').textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Supabase...';
        document.getElementById('cloud-status').textContent = 'Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø­Ø§Ø¨Ø©...';
        await connectSupabase();
        if (!supabaseConnected) { showSyncToast('ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Supabase'); btn.textContent = orig; btn.disabled = false; return; }
        // Ø¢Ø®Ø± Ù…Ø²Ø§Ù…Ù†Ø© Ø§ØªØµØ§Ù„ ÙØ´Ù„
        await pullFromSupabase();
        await pushToSupabase();
        showSyncToast('ØªÙ…Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­ âœ…');
      } catch(e) {
        showSyncToast('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©');
      }
      btn.textContent = orig;
      btn.disabled = false;
    }
    async function manualPush() {
      if (!supabaseConnected) return showSyncToast('ØºÙŠØ± Ù…ØªØµÙ„ Ø¨Ù€ Supabase');
      var btn = document.querySelector('button[onclick="manualPush()"]');
      var orig = btn.textContent;
      btn.textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ø±ÙØ¹ Ù„Ù„Ø³Ø­Ø§Ø¨Ø©...';
      btn.disabled = true;
      try {
        await pushToSupabase();
          showSyncToast('ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Supabase âœ…');
      } catch(e) {
        showSyncToast('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø±ÙØ¹');
      }
      btn.textContent = orig;
      btn.disabled = false;
    }
    async function manualPull() {
      var btn = document.querySelector('button[onclick="manualPull()"]');
      var orig = btn.textContent;
      btn.textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ø³Ø­Ø¨...';
      btn.disabled = true;
      try {
        supabaseConnected = false;
        document.getElementById('supabase-status').textContent = 'Ø¬Ø§Ø±Ù ØªØ¹Ø·ÙŠÙ„ Ø§Ù„Ø³Ø­Ø¨...';
        document.getElementById('cloud-status').textContent = 'Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ© Ù…Ø¹Ø·Ù„Ø©...';
        _forcePull = true;
        await connectSupabase();
        if (!supabaseConnected) { showSyncToast('ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Supabase'); btn.textContent = orig; btn.disabled = false; _forcePull = false; return; }
        await pullFromSupabase();
        showSyncToast('ØªÙ… Ø³Ø­Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­ âœ…');
      } catch(e) {
        showSyncToast('Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø³Ø­Ø¨: ' + e.message);
      }
       _forcePull = false;
       btn.textContent = orig;
       btn.disabled = false;
     }

    // Manual pull from local IndexedDB (no auto-pull on load)
    async function pullFromDatabase() {
      var btn = document.querySelector('button[onclick="pullFromDatabase()"]');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ø³Ø­Ø¨...'; btn.disabled = true; }
      try {
        if (!window.indexedDB) { showSyncToast('IndexedDB ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…'); return; }
        var loaded = await _idbLoadAll();
        if (loaded) {
          if (!roomsCapacity.length) rebuildRoomsFromEmployees();
          syncStorage();
          renderAll();
          renderHousingLayout(); updateHousingStats();
          showSyncToast('ØªÙ… Ø§Ù„Ø³Ø­Ø¨ Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ© âœ…');
        } else {
          showSyncToast('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ©');
        }
      } catch(e) {
        showSyncToast('Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø³Ø­Ø¨: ' + (e && e.message ? e.message : e));
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
        document.getElementById('cloud-status').textContent = 'ØªÙ… Ø§Ù„Ø­ÙØ¸ ÙÙŠ Ø§Ù„Ø³Ø­Ø§Ø¨Ø© âœ…';
        document.getElementById('cloud-status').style.color = '#2e7d32';
      } catch(e) {
        document.getElementById('cloud-status').textContent = 'ÙØ´Ù„ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¹ Ø§Ù„Ø³Ø­Ø§Ø¨Ø© âŒ';
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
        // Ù†Ø¹Ø±Ù Ø¥ÙŠÙ‡ Ø§Ù„Ù„ÙŠ Ø¨ÙŠØ§Ù†Ø§Øª Ø§ØªØ´Ø§Ù„ Ø¹Ø´Ø§Ù† Ù…Ø§
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
      if (currentUser !== 'ÙŠØ¶ÙŠÙÙˆØ´ ØªØ§Ù†ÙŠ') { alert('Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙŠØ²Ø© Ù…ØªØ§Ø­Ø© Ù„Ù„Ù…Ø¯ÙŠØ± ÙÙ‚Ø·.'); return; }
      try {
        if (!window.showDirectoryPicker) {
          alert('Ù…ØªØµÙØ­ ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…. Ø§Ø³ØªØ®Ø¯Ù… Google Chrome Ø£Ùˆ Edge.\nØ³ÙŠØªÙ… Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø­Ù„ÙŠØ© Ø¨Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø© Ø¹Ù†Ø¯ Ø§Ù„Ø³Ø­Ø¨.');
          return;
        }
        backupDirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        await setIDBValue('backup_dir_handle', backupDirHandle);
        document.getElementById('backup-status').style.display = 'inline-flex';
        document.getElementById('backup-status').textContent = 'ØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ù…Ø¬Ù„Ø¯ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ: ' + backupDirHandle.name;
        await autoSaveBackup();
        updateBackupStatus();
        alert('ØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ø¬Ù„Ø¯ Ø¨Ù†Ø¬Ø§Ø­: ' + backupDirHandle.name);
      } catch(e) {
        if (e.name !== 'AbortError' && e.name !== 'SecurityError') {
          alert('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©.');
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
        inventoryItems, contractors, dynamicSectors, contractorSectors, contractorRooms, dynamicRooms, dynamicSeptics, dynamicDepts, dynamicTitles,
        appUsers, currentUser, bakeryIngredients, bakeryProductions,
        bakeryContractorSupplies, bakeryInvoices,
        manualTotalBeds, adminOvertime,
        evaluations, evalTemplates, auditLog, bakeryStockLog, deptTitles,
        roomAssets,
        archiveData,
        quickActions,
        syncDeletions,
        waterStations, waterDocs,
        dynamicVisitorTypes,
        bakeryContractorsNames,
        ingredientMaster,
        mealSurveys,
        mealWaste, dailyStats, finTransactions, finBudgets
      };
    }

    async function migrateToServer() {
      let btn = document.getElementById('btn-migrate-server');
      btn.textContent = 'Ø¬Ø§Ø±Ù Ø§Ù„Ù†Ù‚Ù„ Ù„Ù„Ø³ÙŠØ±ÙØ±...'; btn.disabled = true;
      for (let i = 0; i < 20; i++) {
        try {
          let r = await fetch('http://localhost:3001/api/migrate', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(getAllDataObject())
          });
          if (r.ok) {
            btn.textContent = 'ØªÙ… Ø§Ù„Ù†Ù‚Ù„ Ø¨Ù†Ø¬Ø§Ø­ âœ…'; btn.style.background = '#4caf50';
            setTimeout(() => { window.location.href = 'http://localhost:3001'; }, 1500);
            return;
          }
        } catch(e) {}
        await new Promise(r => setTimeout(r, 1000));
      }
      btn.textContent = 'Ù†Ù‚Ù„ Ù„Ù„Ø³ÙŠØ±ÙØ±'; btn.disabled = false;
      alert('ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±. ØªØ£ÙƒØ¯ Ù…Ù† ØªØ´ØºÙŠÙ„ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬.bat Ø£ÙˆÙ„Ø§Ù‹.');
    }

    async function autoSaveBackup() {
      if (currentUser !== 'Ù…Ù†Ø¹ Ø¸Ù‡ÙˆØ±') return;
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
        statusEl.textContent = `? ${entries.length} Ø§Ù„Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ† | ${backupDirHandle.name}`;



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

        // ÙÙŠ Ø§Ù„Ù‚ÙˆØ© ÙˆØªÙ†Ø¸ÙŠÙ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙƒØ±Ø§Ø±Ø§Øª Ø³Ø§Ù„Ù…
        if (excludedEmployees.length > 0) {
          var exclMap = {};
          excludedEmployees.forEach(function(e) { exclMap[e.code || e.id || e.name] = true; });
          employees = employees.filter(function(e) { return !exclMap[e.code || e.id || e.name]; });
        }
        // Ù…Ø¬Ø¯ÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙŠØ²Ø© Ù…Ø®ØµØµØ© Ù„Ù„Ù…Ø¯ÙŠØ± ÙÙ‚Ø·
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
        if (!backupDirHandle) { alert('Ù…ØªØµÙØ­Ùƒ Ù„Ø§ ÙŠØ¯Ø¹Ù… Ø§Ø®ØªÙŠØ§Ø± Ù…Ø¬Ù„Ø¯. Ø§Ø³ØªØ®Ø¯Ù… Ø²Ø± ØªØµØ¯ÙŠØ± Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ù„Ø­ÙØ¸ Ø§Ù„Ù…Ù„ÙØ§Øª ÙŠØ¯ÙˆÙŠØ§Ù‹.'); return; }
        let ok = await verifyDirPermission(false);
        if (!ok) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ù…Ù†Ø­ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ Ù„Ù„Ù…Ø¬Ù„Ø¯.'); return; }

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
          container.innerHTML = '<div style="padding:20px;text-align:center;color:#78909c;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ø³Ø® Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø¨Ø¹Ø¯</div>';
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
              <div class="backup-date">ðŸ—“ï¸ ${displayName}</div>
            </div>
            <button class="btn btn-primary btn-load-backup" onclick="var e=arguments[0]||window.event;if(e)e.stopPropagation(); loadHistoricalReport('${entry.name}')">ðŸ“Š Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø±ÙŠØ±</button>
          </div>`;
        }
        container.innerHTML = html;
        updateBackupStatus();
      } catch(e) {
        document.getElementById('backup-list-container').innerHTML = '<div style="padding:20px;text-align:center;color:#d32f2f;">Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù†Ø³Ø® Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©. Ø§Ø®ØªØ± Ù…Ø¬Ù„Ø¯ Ø§Ù„Ø­ÙØ¸ Ø£ÙˆÙ„Ø§Ù‹.</div>';
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
            <h3 style="color:#1b5e20;margin:0;">Ø¨ÙŠØ§Ù†Ø§Øª Ø­ÙØ¸Ù‡Ø§ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹: ${displayDate}</h3>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:15px;">
            <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">ÙÙŠ Ù„Ù…</div><div style="font-size:24px;font-weight:700;color:#1b5e20;">${empCount}</div></div>
            <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">ÙŠØªÙ… (P)</div><div style="font-size:24px;font-weight:700;color:#1565c0;">${pCount}</div></div>
            <div style="background:#fff3e0;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">Ø§Ø®ØªÙŠØ§Ø± (V)</div><div style="font-size:24px;font-weight:700;color:#e65100;">${vCount}</div></div>
            <div style="background:#f3e5f5;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">Ù…Ø¬Ù„Ø¯</div><div style="font-size:24px;font-weight:700;color:#6a1b9a;">${totalBeds}</div></div>
            <div style="background:#e0f2f1;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">ØªØ£ÙƒØ¯ Ù…Ù†</div><div style="font-size:24px;font-weight:700;color:#00695c;">${inventoryItemCount}</div></div>
            <div style="background:#fce4ec;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:11px;color:#555;">Ø§Ø®ØªÙŠØ§Ø± Ù…Ø¬Ù„Ø¯</div><div style="font-size:24px;font-weight:700;color:#c62828;">${voucherCount}</div></div>
          </div>
          <div style="margin-bottom:15px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">Ø¨ÙŠØ§Ù†Ø§Øª ØµØ§Ù„Ø­ Ø¨Ø¯ÙŠÙ„</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${roomCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø³ØªØ®Ø¯Ù… Ø²Ø± Ø§Ù„Ù†Ø³Ø®Ø©</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${tsCount} Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙŠØ¯ÙˆÙŠ Ø¬Ø§Ø±ÙŠ</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${vacationCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ±Ø­ÙŠÙ„</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${excludedCount}</td></tr>
              <tr><td style="padding:6px;border-bottom:1px solid #eee;">Ø¨ÙŠØ§Ù†Ø§Øª ØªÙ…</td><td style="padding:6px;border-bottom:1px solid #eee;font-weight:600;">${contractorCount}</td></tr>
            </table>
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-weight:600;margin-bottom:5px;color:#37474f;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ±Ø­ÙŠÙ„ ÙØ´Ù„:</div>
            <div>${deptHtml || 'Ù„Ø§ ÙŠÙˆØ¬Ø¯'}</div>
          </div>
          <div style="margin-top:15px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="restoreThisBackup()" style="font-size:12px;padding:6px 12px;">â¬…ï¸ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù†Ø³Ø®Ø©</button>
            <button class="btn btn-primary" onclick="exportThisBackup()" style="font-size:12px;padding:6px 12px;">ðŸ’¾ ØªØ­Ù…ÙŠÙ„ Ù‡Ø°Ù‡ Ø§Ù„Ù†Ø³Ø®Ø©</button>
          </div>
        `;

        // Store current report data for restore/export
        window._currentReportData = data;
        window._currentReportFileName = fileName;

      } catch(e) {
        document.getElementById('hist-report-content').innerHTML = '<div style="text-align:center;color:#d32f2f;padding:20px;">Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø£ÙˆÙ„Ø§Ù‹</div>';
      }
    }

    function restoreThisBackup() {
      let data = window._currentReportData;
      if (!data) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹');
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù†Ø³Ø®Ø©ØŸ Ø³ÙŠØªÙ… Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ©.')) return;

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
      alert('Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± ØªÙ‚Ø±ÙŠØ±');
    }

    function exportThisBackup() {
      let data = window._currentReportData;
      if (!data) return alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹');
      let blob = new Blob([JSON.stringify(data)], {type: "application/json"});
      let a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = window._currentReportFileName || 'Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©_' + Date.now() + '.json'; a.click();
    }

    async function loadAllBackupsForComparison() {
      let fromDate = document.getElementById('hist-from-date').value;
      let toDate = document.getElementById('hist-to-date').value;
      if (!fromDate || !toDate) { alert('Ø§Ù„Ø­ÙØ¸ ÙÙŠ Ø§Ù„Ù‡ÙŠØ¯Ø± ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø¬Ù„Ø¯ Ù…Ù†ØªÙ‡ÙŠØ©'); return; }

      try {
        if (!backupDirHandle || !(await verifyDirPermission(false))) {
          alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ù…Ø¬Ù„Ø¯ Ø§Ù„Ø­ÙØ¸ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰');
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
          alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ø³Ø® ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ÙØªØ±Ø©');
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
          <h3 style="color:#1565c0;margin:0;">Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø¹Ø¯ Ø¹Ø±Ø¶: ${fromDate} ? ${toDate}</h3>
          <div style="font-size:12px;color:#555;">Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø®Ø·Ø£: ${entries.length}</div>
        </div>`;

        // Summary table
        html += `<table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px;">
          <thead><tr>
            <th style="padding:6px;border:1px solid #ddd;">ÙÙŠ</th>
            <th style="padding:6px;border:1px solid #ddd;">Ù‚Ø±Ø§Ø¡Ø©</th>
            <th style="padding:6px;border:1px solid #ddd;">P</th>
            <th style="padding:6px;border:1px solid #ddd;">V</th>
            <th style="padding:6px;border:1px solid #ddd;">Ø§Ù„Ù…Ø¬Ù„Ø¯</th>
            <th style="padding:6px;border:1px solid #ddd;">ØªØ£ÙƒØ¯</th>
            <th style="padding:6px;border:1px solid #ddd;">Ù…Ù†/ØµÙ„Ø§Ø­ÙŠØ§Øª</th>
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
          <h4 style="margin:0 0 8px 0;color:#37474f;">Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØµÙˆÙ„ ØªÙ‚Ø±ÙŠØ± Ù†Ø³Ø®Ø©</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">
            <div style="background:white;padding:8px 12px;border-radius:6px;text-align:center;">
              <div style="font-size:11px;color:#555;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù‚ÙˆØ©</div>
              <div style="font-size:20px;font-weight:700;color:${empChange >= 0 ? '#2e7d32' : '#c62828'};">${empChange >= 0 ? '+' : ''}${empChange}</div>
            </div>
            <div style="background:white;padding:8px 12px;border-radius:6px;text-align:center;">
              <div style="font-size:11px;color:#555;">Ù…ØªÙˆØ§Ø¬Ø¯ÙŠÙ† Ø¥Ø¬Ø§Ø²Ø§Øª</div>
              <div style="font-size:20px;font-weight:700;color:${invChange >= 0 ? '#2e7d32' : '#c62828'};">${invChange >= 0 ? '+' : ''}${invChange}</div>
            </div>
          </div>
        </div>`;

        report.innerHTML = html;
      } catch(e) {
        document.getElementById('hist-report-content').innerHTML = '<div style="text-align:center;color:#d32f2f;padding:20px;">Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø±ÙŠØ±</div>';
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
          let si = activeTab.querySelector('.search-input, input[type="text"][placeholder*="Ø§Ù„Ù…Ø®Ø²Ù†"], input[type="search"]');
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
          if (t.indexOf('Ø¨ÙˆÙ†Ø§Øª') >= 0 || t.indexOf('Ø§Ù„ØµØ±Ù') >= 0 || t.indexOf('ØºØ±Ù') >= 0) { b.click(); break; }
        }
      }
      // Delete key - click delete button
      if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey) {
        let sel = document.querySelector('.table-container tr.selected');
        if (sel) {
          let btns = sel.querySelectorAll('button');
          for (let b of btns) {
            let t = b.textContent || '';
            if (t.indexOf('Ø§Ù„Ø³ÙƒÙ†') >= 0 || t.indexOf('ØµØ±Ù') >= 0 || t.indexOf('Ø§Ù„Ø´Ø§ÙŠ') >= 0) { b.click(); break; }
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
        var oldSectors = ['A','B','Ø¹Ù…Ù„ÙŠØ© Ø¥Ø¬Ø§Ø²Ø§Øª'];
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
        _safe(renderTable); _safe(renderInventoryTable); _safe(renderInventoryItems); _safe(renderArchiveTable); _safe(renderVacationsTable); _safe(renderOvertimeCalendar); _safe(calculateSystemStats);
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

      try { var _iv = validateDataIntegrity(); if (_iv.indexOf('Ø¨ÙŠØ§Ù†Ø§Øª') >= 0) console.warn('Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ù…Ø³ØªØ¨Ø¹Ø¯ÙŠÙ†:\n' + _iv); } catch(_e) {}
      // Auto-log meals every 5 minutes to catch dinner (>=21) and other meals
      setInterval(autoLogTodayMeals, 5 * 60 * 1000);
      // Also log when user returns to the page
      document.addEventListener('visibilitychange', function() { if (!document.hidden) autoLogTodayMeals(); });
      // D: drive restore now only available via manual button
function updateDashClock() {
        let el = document.getElementById('dash-clock');
        if (el)         el.innerText = 'ðŸ•’ ' + new Date().toLocaleString('ar-EG') + ' | Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© - Ù„ÙŠÙ†Ù‡ ÙØ§Ø±Ù…Ø²';
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
      // ? ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© D: drive Ø¨ÙŠØ§Ù†Ø§Øª 12 Ù„Ø§
      if (currentUser === 'Ø³Ø§Ù„Ù… Ù…Ø¬Ø¯ÙŠ') {
        autoSaveBackup();
        setInterval(autoSaveBackup, 12 * 60 * 60 * 1000);
      }

      // Auto-migrate from file:// to server if ?sync=1 in URL
      (async function checkAutoMigrate() {
        if (window.location.href.includes('?sync=1') && !window.location.href.startsWith('http')) {
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Cairo;font-size:22px;background:#1b5e20;color:white;flex-direction:column;gap:15px;"><div>Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div><div style="font-size:14px;opacity:0.8;">Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</div></div>';
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
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Cairo;font-size:18px;background:#d32f2f;color:white;flex-direction:column;gap:15px;text-align:center;padding:20px;"><div>âŒ ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±</div><div style="font-size:14px;">ØªØ£ÙƒØ¯ Ù…Ù† ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ± Ø£ÙˆÙ„Ø§Ù‹ (Ø´ØºÙ‘Ù„ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬.bat)</div><button onclick="window.location.href=\'http://localhost:3001\'" style="padding:12px 30px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">ðŸ”„ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù„Ø§Ø­Ù‚Ø§Ù‹</button></div>';
          return;
        }
      })();

      // ? Ø¨ÙŠØ§Ù†Ø§Øª Ù†Ø³Ø®Ø© Ù…Ø­Ø¯Ø¯Ø© Ù†Ø³Ø®Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© â€” Ù„ÙŠÙ†Ø© ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©
      // (async function loadFromServer() { ... })();

      // Restore backup directory handle from IndexedDB
      getIDBValue('backup_dir_handle').then(async (handle) => {
        if (handle) {
          try {
            backupDirHandle = handle;
            let ok = await verifyDirPermission(false);
            if (ok) {
              document.getElementById('backup-status').style.display = 'inline-flex';
              document.getElementById('backup-status').textContent = '? ÙˆØ§Ù„Ù†Ù‡Ø§ÙŠØ© Ù„Ù„Ù…Ù‚Ø§Ø±Ù†Ø©: ' + backupDirHandle.name;
              // Backup auto-restore DISABLED by user request â€” pull manually via pullFromDatabase()
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
      if (!Array.isArray(employees)) issues.push('? employees Ø¨ÙŠØ§Ù†Ø§Øª array');
      if (!Array.isArray(roomsCapacity)) issues.push('? roomsCapacity Ø¨ÙŠØ§Ù†Ø§Øª array');
      if (!Array.isArray(vacations)) issues.push('? vacations Ø¨ÙŠØ§Ù†Ø§Øª array');
      if (!Array.isArray(hospitalities)) issues.push('? hospitalities Ø¨ÙŠØ§Ù†Ø§Øª array');
      if (!Array.isArray(maintenanceRecords)) issues.push('? maintenanceRecords Ø¨ÙŠØ§Ù†Ø§Øª array');
      if (!Array.isArray(septicRecords)) issues.push('? septicRecords Ø¨ÙŠØ§Ù†Ø§Øª array');
      employees.forEach(function(e, i) {
        if (!e || typeof e !== 'object') { issues.push('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù†Ø³Ø® Ø§Ù„ØªØ§Ø±ÙŠØ® ' + i + ' Ø¨ÙŠØ§Ù†Ø§Øª object'); return; }
        if (!e.name && !e.code) issues.push('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‚ÙˆØ© ' + (e.code || i) + ' Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ø¨ÙˆÙ†Ø§Øª');
      });
      roomsCapacity.forEach(function(r, i) {
        if (!r || typeof r !== 'object') { issues.push('Ø¨ÙŠØ§Ù†Ø§Øª Ø´Ø§ÙŠ Ø³ÙƒØ± ' + i + ' Ø¨ÙŠØ§Ù†Ø§Øª object'); return; }
        if (!r.number) issues.push('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØºÙŠØ± ' + i + ' Ø®Ù„Ø§Ù„ Ø§Ù„ÙØªØ±Ø©');
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
          var empRoomNum = empRoom.replace(/^ØºØ±ÙÙ‡\s*/i, '').replace(/^ØºØ±ÙØ©\s*/i, '').trim();
          // Fuzzy match sector
          var matched = false;
          // Abbreviation map for KEYWORDS
          var abbrMap = {
            'Ø¬Ø²ÙˆØ§Ø±ÙŠÙ†': 'Ø¬ÙŠØ²ÙˆØ§Ø±ÙŠÙ†', 'Ø§Ù„Ø¬ÙŠØ²ÙˆØ§Ø±ÙŠÙ†': 'Ø¬ÙŠØ²ÙˆØ§Ø±ÙŠÙ†', 'Ø¬ÙŠØ²ÙˆØ§Ø±ÙŠÙ†': 'Ø¬ÙŠØ²ÙˆØ§Ø±ÙŠÙ†',
            'Ø§Ù„Ù†Ø®Ø§Ù„ÙŠÙ†': 'Ù†Ø®Ø§Ù„ÙŠÙ†', 'Ù†Ø®Ø§Ù„ÙŠÙ†': 'Ù†Ø®Ø§Ù„ÙŠÙ†',
            'Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ': 'Ø¥Ø¯Ø§Ø±ÙŠ', 'Ø¥Ø¯Ø§Ø±ÙŠ': 'Ø¥Ø¯Ø§Ø±ÙŠ', 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†': 'Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†', 'Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†': 'Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†',
            'Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ†': 'Ø¹Ø§Ù…Ù„ÙŠÙ†', 'Ø¹Ø§Ù…Ù„ÙŠÙ†': 'Ø¹Ø§Ù…Ù„ÙŠÙ†',
            'Ø§Ù„Ø¬Ø¯ÙŠØ¯': 'Ø¬Ø¯ÙŠØ¯', 'Ø¬Ø¯ÙŠØ¯': 'Ø¬Ø¯ÙŠØ¯',
            'Ø§Ù„Ø³ÙƒÙ†': 'Ø³ÙƒÙ†', 'Ø³ÙƒÙ†': 'Ø³ÙƒÙ†',
            'Ø§Ù„Ù†Ø®ÙŠÙ„': 'Ù†Ø®ÙŠÙ„', 'Ù†Ø®ÙŠÙ„': 'Ù†Ø®ÙŠÙ„',
            'Ø§Ù„Ø¶ÙØ©': 'Ø¶ÙØ©', 'Ø¶ÙØ©': 'Ø¶ÙØ©'
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
            var rcRoomNum = rcRoom.replace(/^ØºØ±ÙÙ‡\s*/i, '').replace(/^ØºØ±ÙØ©\s*/i, '').trim();
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
            issues.push('Ø¨ÙŠØ§Ù†Ø§Øª ' + (e.name || e.code) + ' ØªØºÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‚ÙˆØ© ØªØºÙŠØ± Ø§Ù„Ø£ØµÙ†Ø§Ù: ' + e.sector + ' / ' + e.room);
          }
        }
      });
      if (empInInvalidRoom > 0) {
        issues.unshift('Ø¨ÙŠØ§Ù†Ø§Øª ' + empInInvalidRoom + ' Ø®Ø·Ø£ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙŠ Ø§Ù„Ù…Ù‚Ø§Ø±Ù†Ø© Ø¨Ø­Ø«!');
      }
      if (issues.length === 0) return '? Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø´Ø§ÙƒÙ„';
      return issues.join('\n');
    }
    function showValidationResult() {
      var msg = validateDataIntegrity();
      if (msg.startsWith('?')) {
        alert('Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø³Ù„ÙŠÙ…Ø© - Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø´Ø§ÙƒÙ„');
      } else {
        alert('Ù†ØªÙŠØ¬Ø© ÙØ­Øµ Ø³Ù„Ø§Ù…Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙƒÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ:\n\n' + msg);
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
      var months = ['Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª','ØªØ¹Ø·ÙŠÙ„','Ø§Ù„ØªØ­Ù…ÙŠÙ„','Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ','Ù…Ù†','Ø§Ù„Ø¨Ø§Ùƒ','Ø£Ø¨','ÙŠØ¯ÙˆÙŠ','Ù…Ù†','Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©','Ø§Ù„Ù…Ø±Ù†Ø©','Ù„ÙŠÙ†Ù‡'];
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
        row.forEach(function(cell) { html += '<td>' + (cell != null && cell !== '' ? cell : 'â€”') + '</td>'; });
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
      if (!activeTab) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ÙØªØ­ ØªØ¨ÙˆÙŠØ¨ Ù‚Ø¨Ù„ Ø§Ù„ØªØµØ¯ÙŠØ±.'); return; }
      var tables = activeTab.querySelectorAll('table');
      if (!tables.length) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ø¯Ø§ÙˆÙ„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ØªØ¨ÙˆÙŠØ¨ Ù„Ù„ØªØµØ¯ÙŠØ±.'); return; }
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
      if (!selectedData) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ ØµÙÙˆÙ Ù„Ù„ØªØµØ¯ÙŠØ±.'); return; }
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
      var months = ['Ø³Ø§Ù„Ù…','Ù…Ø¬Ø¯ÙŠ','Ø¬Ø§Ø±ÙŠ','ØªØ±Ø­ÙŠÙ„','Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª','Ø¥Ù„Ù‰','Ø§Ù„Ø³ÙŠØ±ÙØ±','Ù…Ù†','ÙØ¶Ù„Ùƒ','Ø§Ù†ØªØ¸Ø±','ÙØ´Ù„','Ø§Ù„Ø§ØªØµØ§Ù„'];
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
        ['Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ± ØªØ£ÙƒØ¯ Ù…Ù† - ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ±', '', '', '', ''],
        ['Ø£ÙˆÙ„Ø§Ù‹: ' + new Date().toLocaleDateString('ar-EG'), '', '', '', ''],
        [],
        ['Ø´ØºÙ‘Ù„', 'ØªØ´ØºÙŠÙ„', 'Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬', '', ''],
        ['Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù„Ø§Ø­Ù‚Ø§Ù‹ ØªÙ…', totalEmp, '100%', '', ''],
        ['ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ØªØ­Ù…ÙŠÙ„ (P)', pCount, pPct + '%', '', ''],
        ['Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ (V)', vCount, vPct + '%', '', ''],
        [],
        ['Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±', totalBeds, '', '', ''],
        ['ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰', occupiedBeds, '', '', ''],
        ['Ø§Ù„Ø³Ø­Ø¨ Ø§Ù„ÙŠØ¯ÙˆÙŠ', vacantBeds, '', '', ''],
        []
      ];
      var ws1 = XLSX.utils.aoa_to_sheet(s1Data);
      ws1['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
      _dxFinishSheet(ws1, 5, 2);
      XLSX.utils.book_append_sheet(wb, ws1, 'ÙÙ‚Ø· ØŸ');
      var sectorMap = {};
      employees.forEach(function(e) {
        var s = e.sector || 'Ù…Ø´ Ù…Ø´';
        if (!sectorMap[s]) sectorMap[s] = { total: 0, p: 0, v: 0 };
        sectorMap[s].total++;
        if (e.status === 'P') sectorMap[s].p++;
        if (e.status === 'V') sectorMap[s].v++;
      });
      var s2Data = [
        ['Ù…Ø´ Ù…Ø´ Ù…Ø´ Ù…Ø´', '', '', '', ''],
        ['Ù…ÙˆØ¸Ù: ' + new Date().toLocaleDateString('ar-EG'), '', '', '', ''],
        [],
        ['Ø±Ù‚Ù…', 'Ù…Ø´', 'Ù…ÙˆØ¸Ù', 'Ù…ÙÙŠØ´', 'Ø§Ø³Ù… Ù…Ø³ÙƒÙ†']
      ];
      var sectors = Object.keys(sectorMap).sort();
      sectors.forEach(function(s) {
        var d = sectorMap[s];
        var pct = d.total > 0 ? Math.round(d.p / d.total * 100) + '%' : '0%';
        s2Data.push([s, d.total, d.p, d.v, pct]);
      });
      s2Data.push([]);
      s2Data.push(['ÙÙŠ', totalEmp, pCount, vCount, pPct + '%']);
      var ws2 = XLSX.utils.aoa_to_sheet(s2Data);
      ws2['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
      _dxFinishSheet(ws2, 5, 2);
      XLSX.utils.book_append_sheet(wb, ws2, 'ØºØ±ÙØ© ØºÙŠØ±');
      var deptMap = {};
      employees.forEach(function(e) {
        var d = e.department || 'Ù…ÙˆØ¬ÙˆØ¯Ø© ØºØ±ÙØ©';
        if (!deptMap[d]) deptMap[d] = 0;
        deptMap[d]++;
      });
      var s3Data = [
        ['Ø±Ù‚Ù… Ù…Ø´ ØºØ±ÙØ© Ù…ÙÙŠØ´', '', ''],
        ['Ø±Ù‚Ù…: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['Ù„Ø§', 'ØªÙˆØ¬Ø¯', 'Ù…Ø´Ø§ÙƒÙ„']
      ];
      var depts = Object.keys(deptMap).sort();
      depts.forEach(function(d) {
        var pct = totalEmp > 0 ? Math.round(deptMap[d] / totalEmp * 100) + '%' : '0%';
        s3Data.push([d, deptMap[d], pct]);
      });
      s3Data.push([]);
      s3Data.push(['ÙÙŠ', totalEmp, '100%']);
      var ws3 = XLSX.utils.aoa_to_sheet(s3Data);
      ws3['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws3, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws3, 'Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙØ­Øµ');
      var govMap = {};
      employees.forEach(function(e) {
        var g = e.gov || 'Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø§';
        if (!govMap[g]) govMap[g] = 0;
        govMap[g]++;
      });
      var s4Data = [
        ['ØªÙˆØ¬Ø¯ Ù…Ø´Ø§ÙƒÙ„ ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ±', '', ''],
        ['Ø¹Ù„Ù‰: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['Ù…Ø´Ø§ÙƒÙ„', 'Ù ', 'Ù©']
      ];
      var govs = Object.keys(govMap).sort();
      govs.forEach(function(g) {
        var pct = totalEmp > 0 ? Math.round(govMap[g] / totalEmp * 100) + '%' : '0%';
        s4Data.push([g, govMap[g], pct]);
      });
      s4Data.push([]);
      s4Data.push(['Ù ', totalEmp, '100%']);
      var ws4 = XLSX.utils.aoa_to_sheet(s4Data);
      ws4['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws4, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws4, 'Ù© ÙŠÙ†Ø§ÙŠØ±');
      var contractMap = {};
      employees.forEach(function(e) {
        var c = e.contractType || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
        if (!contractMap[c]) contractMap[c] = 0;
        contractMap[c]++;
      });
      var s5Data = [
        ['Ø£Ø¨Ø±ÙŠÙ„ Ù…Ø§ÙŠÙˆ ÙŠÙˆÙ†ÙŠÙˆ', '', ''],
        ['ÙŠÙˆÙ„ÙŠÙˆ: ' + new Date().toLocaleDateString('ar-EG'), '', ''],
        [],
        ['Ø£ØºØ³Ø·Ø³ Ø³Ø¨ØªÙ…Ø¨Ø±', 'Ø£ÙƒØªÙˆØ¨Ø±', 'Ù†ÙˆÙÙ…Ø¨Ø±']
      ];
      var ctypes = Object.keys(contractMap).sort();
      ctypes.forEach(function(c) {
        var pct = totalEmp > 0 ? Math.round(contractMap[c] / totalEmp * 100) + '%' : '0%';
        s5Data.push([c, contractMap[c], pct]);
      });
      s5Data.push([]);
      s5Data.push(['Ø¯ÙŠØ³Ù…Ø¨Ø±', totalEmp, '100%']);
      var ws5 = XLSX.utils.aoa_to_sheet(s5Data);
      ws5['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
      _dxFinishSheet(ws5, 3, 2);
      XLSX.utils.book_append_sheet(wb, ws5, 'Ù… Ù„Ø§');
      var previewRows = [
        [totalEmp, pCount, pPct + '%', vCount, vPct + '%'],
        [totalBeds, occupiedBeds, vacantBeds, '', '']
      ];
      _dxPreview('ÙŠÙˆØ¬Ø¯ ØªØ¨ÙˆÙŠØ¨ Ù†Ø´Ø· - ' + new Date().toLocaleDateString('ar-EG'), ['Ù„Ø§ ÙŠÙˆØ¬Ø¯', 'Ø¬Ø¯Ø§ÙˆÙ„', 'ÙÙŠ Ù‡Ø°Ø§', 'Ø§Ù„ØªØ¨ÙˆÙŠØ¨', 'Ù„Ù… ÙŠØªÙ…'], previewRows);
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª ØªØ­Ø¯ÙŠØ¯ Ø£ÙŠ ØµÙÙˆÙ - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXMeals() {
      var range = getDXDateRange();
      var filtered = mealLogs.filter(function(m) { return dxDateInRange(m.date, range.from, range.to); });
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ¬Ø¨Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'ØªÙ‚Ø±ÙŠØ±_Ø§Ù„ÙˆØ¬Ø¨Ø§Øª_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª', '', '', '', '', '', '', '', '', '', '', ''], ['Ù…Ù†: ' + (range.from || '') + ' Ø¥Ù„Ù‰ ' + (range.to || ''), '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„ÙˆØ¬Ø¨Ø©', 'Ø§Ù„Ø´ÙŠÙ', 'Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ÙŠÙ†', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…Ø§Ù„', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø¶ÙŠÙˆÙ', 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª']);
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
      wsData.push(['ÙÙŠ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª', '', '', '', '', '', '', '', '', totalAll, '', '']);
      wsData.push(['Ø§Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø§Ø³Ø±Ø© Ø§Ù„Ø§Ø³Ø±Ø©', filtered.length, '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('Ø§Ù„Ù…Ø´ØºÙˆÙ„Ø© Ø§Ù„Ø§Ø³Ø±Ø© - ' + filtered.length + ' Ø§Ù„Ø´Ø§ØºØ±Ø©', ['Ù…Ù„Ø®Øµ', 'Ø§Ù„Ù‚ÙˆØ©', 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯', 'ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù‚ÙˆØ©', 'Ø­Ø³Ø¨ Ø§Ù„Ù‚Ø·Ø§Ø¹', 'Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù‚Ø·Ø§Ø¹', 'Ø§Ø¬Ù…Ø§Ù„ÙŠ Ù…ØªÙˆØ§Ø¬Ø¯', 'Ø§Ø¬Ø§Ø²Ø© Ù†Ø³Ø¨Ø©', 'Ø§Ù„Ø­Ø¶ÙˆØ±', 'Ø§Ù„Ø§Ø¬Ù…Ø§Ù„ÙŠ'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:11}}];
      _dxFinishSheet(ws, 12, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ØªÙˆØ²ÙŠØ¹');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‚Ø·Ø§Ø¹Ø§Øª ØºÙŠØ± Ù…Ø­Ø¯Ø¯ (' + filtered.length + ' ØªÙˆØ²ÙŠØ¹) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXTea() {
      var range = getDXDateRange();
      var filtered = teaSugarDisbursements.filter(function(t) { return dxDateInRange(t.date, range.from, range.to); });
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø´Ø§ÙŠ ÙˆØ³ÙƒØ± Ù„Ù„ØªØµØ¯ÙŠØ± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'ØªÙ‚Ø±ÙŠØ±_Ø´Ø§ÙŠ_ÙˆØ³ÙƒØ±_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wb = XLSX.utils.book_new();
      var s1Data = [['ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§ÙŠ ÙˆØ§Ù„Ø³ÙƒØ±', '', '', '', '', '', '', '', '', ''], ['Ù…Ù†: ' + (range.from || '') + ' Ø¥Ù„Ù‰ ' + (range.to || ''), '', '', '', '', '', '', '', '', ''], []];
      s1Data.push(['#', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ù‚Ø³Ù…', 'Ø§Ù„Ø§Ø³Ù…', 'Ø´Ø§ÙŠ', 'Ø³ÙƒØ±', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª']);
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
      s1Data.push(['Ø§Ù„ØªØ¹Ø§Ù‚Ø¯', '', '', '', '', '', '', totalTea, totalSugar, '']);
      s1Data.push(['Ø§Ù„ØªØ§Ø±ÙŠØ® Ù†ÙˆØ¹', filtered.length, '', '', '', '', '', '', '', '']);
      _dxPreview('Ø§Ù„ØªØ¹Ø§Ù‚Ø¯ Ø§Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ø³Ø¨Ø© - ' + filtered.length + ' Ø§Ù„Ø§Ø¬Ù…Ø§Ù„ÙŠ', ['Ù†ÙˆØ¹', 'Ø§Ù„ØªØ¹Ø§Ù‚Ø¯', 'Ø§Ø­ØµØ§Ø¡ Ø§Ù„Ù‚ÙˆØ©', 'Ø§Ù„ÙŠÙˆÙ…ÙŠØ©', 'Ø§Ø¬Ù…Ø§Ù„ÙŠ / Ø§Ù„Ù‚ÙˆØ©', 'Ù…ØªÙˆØ§Ø¬Ø¯', 'Ù†Ø³Ø¨Ø© (Ø§Ù„Ø­Ø¶ÙˆØ±)', 'Ø§Ø¬Ø§Ø²Ø© (Ù†Ø³Ø¨Ø©)'], previewRows);
      var ws1 = XLSX.utils.aoa_to_sheet(s1Data);
      ws1['!merges'] = [{s:{r:0,c:0},e:{r:0,c:9}}];
      _dxFinishSheet(ws1, 10, 2);
      XLSX.utils.book_append_sheet(wb, ws1, 'Ø§Ù„Ø§Ø¬Ø§Ø²Ø© ØªÙ… ØªØµØ¯ÙŠØ±');
      var s2Data = [['Ø§Ø­ØµØ§Ø¡ Ø§Ù„Ù‚ÙˆØ©', '', '', '', '', ''], []];
      s2Data.push(['Ù„Ø§', 'ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª', 'ÙˆØ¬Ø¨Ø§Øª', 'ÙÙŠ', 'Ø§Ù„Ù†Ø·Ø§Ù‚', 'Ø§Ù„Ù…Ø­Ø¯Ø¯']);
      var sortedEmp = employees.slice().sort(function(a, b) { return (a.code || '').localeCompare(b.code || ''); });
      sortedEmp.forEach(function(e) {
        s2Data.push([e.code || '', e.name || '', e.title || '', e.sector || '', e.gov || '', e.room || '']);
      });
      var ws2 = XLSX.utils.aoa_to_sheet(s2Data);
      ws2['!merges'] = [{s:{r:0,c:0},e:{r:0,c:5}}];
      _dxFinishSheet(ws2, 6, 1);
      XLSX.utils.book_append_sheet(wb, ws2, 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙˆØ¬Ø¨Ø§Øª');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ© Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø¥Ù„Ù‰ (' + filtered.length + ' Ø§Ù„Ù†Ù‡Ø§ÙŠØ©) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXSeptic() {
      var range = getDXDateRange();
      var filtered = septicRecords.filter(function(s) { return dxDateInRange(s.date, range.from, range.to); });
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¨ÙŠØ§Ø±Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'ØªÙ‚Ø±ÙŠØ±_Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ø±Ø§Øª', '', '', '', '', '', '', '', ''], ['Ù…Ù†: ' + (range.from || '') + ' Ø¥Ù„Ù‰ ' + (range.to || ''), '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ø§Ø³Ù…', 'Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø§Øª', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª']);
      var totalTrips = 0, totalVol = 0;
      var previewRows = [];
      filtered.forEach(function(s, i) {
        var trips = _dxNum(s.trips), vol = trips * 5;
        totalTrips += trips; totalVol += vol;
        wsData.push([i+1, s.date, s.time || '', _dxMonth(s.date), s.name || '', trips, vol, s.supervisor || '', '']);
        previewRows.push([s.date, s.time || '', _dxMonth(s.date), s.name || '', trips, vol, s.supervisor || '']);
      });
      wsData.push([]);
      wsData.push(['Ø§Ù„ÙˆØ¬Ø¨Ø§Øª', '', '', '', '', totalTrips, totalVol, '', '']);
      wsData.push(['ÙŠÙˆÙ… Ø§Ù„ØªØ§Ø±ÙŠØ®', filtered.length, '', '', '', '', '', '', '']);
      _dxPreview('Ø§Ù„Ø´Ù‡Ø± Ø¥ÙØ·Ø§Ø± Ù‚ÙˆØ© - ' + filtered.length + ' ØºØ¯Ø§Ø¡', ['Ù‚ÙˆØ©', 'Ø¹Ø´Ø§Ø¡', 'Ù‚ÙˆØ©', 'Ø¥ÙØ·Ø§Ø±', 'Ø¶ÙŠÙˆÙ ØºØ¯Ø§Ø¡', 'Ø¶ÙŠÙˆÙ (?3)', 'Ø¹Ø´Ø§Ø¡ Ø¶ÙŠÙˆÙ'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:8}}];
      _dxFinishSheet(ws, 9, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø´ÙŠÙ');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØ¬Ø¨Ø§Øª ØªÙ… ØªØµØ¯ÙŠØ± ØªÙ‚Ø±ÙŠØ± (' + filtered.length + ' Ø§Ù„ÙˆØ¬Ø¨Ø§Øª) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXBreadCost() {
      var range = getDXDateRange();
      var filtered = bakeryProductions.filter(function(p) { return dxDateInRange(p.date, range.from, range.to); });
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù†ØªØ§Ø¬ Ø®Ø¨Ø² ÙÙŠ Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ù„Ù„ØªØµØ¯ÙŠØ±.');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'tqreport_bread_cost_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['ÙˆØ³ÙƒØ± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ - Ø§Ù„Ù…Ø­Ø¯Ø¯ ØªÙ‚Ø±ÙŠØ±', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], ['ØµØ±Ù: ' + (range.from || 'Ø§Ù„Ø´Ø§ÙŠ') + ' ÙˆØ§Ù„Ø³ÙƒØ± ' + (range.to || 'Ø§Ù„ÙØªØ±Ø©'), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©', 'Ø¥Ù„Ù‰ Ø§Ù„Ù†Ù‡Ø§ÙŠØ©', 'Ù… (Ø§Ù„ØªØ§Ø±ÙŠØ®)', 'Ø§Ù„ÙƒÙˆØ¯ Ø§Ø³Ù…', 'Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„ÙˆØ¸ÙŠÙØ©', 'Ø§Ù„Ù‚Ø·Ø§Ø¹ (Ø§Ù„ØºØ±ÙØ©)', 'Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø© Ø´Ø§ÙŠ', 'Ø±Ø¨Ø·Ø©', 'Ø³ÙƒØ± (ÙƒØ¬Ù…)', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª', 'ØªÙ‚Ø±ÙŠØ± (Ø§Ù„Ø´Ø§ÙŠ)', 'ÙˆØ§Ù„Ø³ÙƒØ± Ø¹Ù…Ù„ÙŠØ©', 'Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„ÙƒÙˆØ¯', 'Ø§Ø³Ù… (Ø§Ù„Ù…ÙˆØ¸Ù)', 'Ø§Ù„ÙˆØ¸ÙŠÙØ© Ø§Ù„Ù‚Ø·Ø§Ø¹', 'Ø§Ù„ØºØ±ÙØ© Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©', 'Ø´Ø§ÙŠ Ø±Ø¨Ø·Ø©', 'Ø³ÙƒØ± ÙƒØ¬Ù…', 'ØµØ±Ù Ø§Ù„Ø´Ø§ÙŠ', 'ÙˆØ§Ù„Ø³ÙƒØ± (ØªÙØ§ØµÙŠÙ„)']);
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
      wsData.push(['Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†', '', grandBread, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', Math.round(grandTotal*100)/100, grandBread > 0 ? Math.round((grandTotal / grandBread) * 1000) / 1000 : 0]);
      wsData.push(['Ø§Ù„ÙƒÙˆØ¯ Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¸Ù', filtered.length, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('Ø§Ù„ÙˆØ¸ÙŠÙØ© Ø§Ù„Ù‚Ø·Ø§Ø¹ - ' + filtered.length + ' Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©', ['Ø§Ù„ØºØ±ÙØ©', 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†', 'ØªÙ… (ØªØµØ¯ÙŠØ±)', 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§ÙŠ', 'ÙˆØ§Ù„Ø³ÙƒØ± (Ø¹Ù…Ù„ÙŠØ©)', 'Ù„Ø§', 'ØªÙˆØ¬Ø¯ (Ø¨ÙŠØ§Ù†Ø§Øª)', 'ØµØ±Ù ØµØ­ÙŠ', 'ÙÙŠ (Ø§Ù„Ù†Ø·Ø§Ù‚)', 'Ø§Ù„Ù…Ø­Ø¯Ø¯ Ø­ØµØ±', 'ÙƒÙ…ÙŠØ§Øª (Ø§Ù„ØµØ±Ù)', 'Ø§Ù„ØµØ­ÙŠ Ø§Ù„ÙØªØ±Ø©', 'Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø¥Ù„Ù‰', 'Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ù…', 'Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„ØªÙˆÙ‚ÙŠØª', 'Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ø¨ÙŠØ§Ø±Ø©'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:21}}];
      _dxFinishSheet(ws, 22, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø§Øª');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµØ±Ù Ù… Ø§Ù„ÙÙ†ÙŠ (' + filtered.length + ' Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function exportDXBreadCount() {
      var range = getDXDateRange();
      var filtered = bakeryContractorSupplies.filter(function(cs) { return dxDateInRange(cs.date, range.from, range.to); });
      if (!filtered.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØªÙˆØ±ÙŠØ¯ Ø®Ø¨Ø² Ù„Ù„ØªØµØ¯ÙŠØ± ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯');
      filtered = _dxSortDesc(filtered, 'date');
      var filename = 'ØªÙ‚Ø±ÙŠØ±_ØªÙˆØ±ÙŠØ¯_Ø§Ù„Ø®Ø¨Ø²_' + new Date().toISOString().slice(0,10) + '.xlsx';
      var wsData = [['ØªÙ‚Ø±ÙŠØ± ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø² Ù„Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†', '', '', '', '', '', '', '', '', '', '', '', ''], ['Ù…Ù†: ' + (range.from || '') + ' Ø¥Ù„Ù‰ ' + (range.to || ''), '', '', '', '', '', '', '', '', '', '', '', ''], []];
      wsData.push(['#', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©', 'Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©', 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹', 'Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ']);
      var previewRows = [];
      var totalRevenue = 0, totalPaid = 0, totalBread = 0;
      filtered.forEach(function(cs, i) {
        var ctrCount = parseInt(cs.count) || 0;
        var price = parseFloat(cs.price) || 0;
        var revenue = ctrCount * price;
        var paid = parseFloat(cs.paid) || 0;
        var prodCost = parseFloat(cs.prodCost) || 0;
        var remaining = revenue - paid;
        var status = remaining <= 0 ? 'ØªÙˆØ¬Ø¯' : (paid > 0 ? 'Ø¨ÙŠØ§Ù†Ø§Øª' : 'Ø¥Ù†ØªØ§Ø¬');
        totalRevenue += revenue; totalPaid += paid; totalBread += ctrCount;
        wsData.push([i+1, cs.date, cs.name || '', ctrCount, price, Math.round(revenue*100)/100, Math.round(prodCost*100)/100, Math.round(paid*100)/100, Math.round(remaining*100)/100, status, cs.responsible || '', cs.notes || '']);
        previewRows.push([cs.date, cs.name || '', ctrCount, price, Math.round(revenue*100)/100, Math.round(prodCost*100)/100, Math.round(paid*100)/100, Math.round(remaining*100)/100, status, cs.responsible || '']);
      });
      wsData.push([]);
      wsData.push(['ÙÙŠ', '', '', totalBread, '', Math.round(totalRevenue*100)/100, '', Math.round(totalPaid*100)/100, Math.round((totalRevenue - totalPaid)*100)/100, '', '', '']);
      wsData.push(['Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø­Ø¯Ø¯', filtered.length, '', '', '', '', '', '', '', '', '', '']);
      _dxPreview('ØªÙƒÙ„ÙØ© Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ø®Ø¨Ø² - ' + filtered.length + ' ÙØ±Ù†', ['Ø§Ù„Ù…Ø²Ø±Ø¹Ø©', 'Ø§Ù„ÙØªØ±Ø©', 'Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø¥Ù„Ù‰', 'Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ù…', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©', 'Ø¯Ù‚ÙŠÙ‚', 'ÙƒØ¬Ù…', 'Ø³Ø¹Ø±', 'Ø§Ù„Ø¯Ù‚ÙŠÙ‚'], previewRows);
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:11}}];
      _dxFinishSheet(ws, 12, 2);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ØªÙƒÙ„ÙØ© Ø§Ù„Ø¯Ù‚ÙŠÙ‚');
      downloadWB(wb, filename);
      document.getElementById('dx-export-log').innerText = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø®Ù…ÙŠØ±Ø© ÙƒØ¬Ù… Ø³Ø¹Ø± (' + filtered.length + ' Ø§Ù„Ø®Ù…ÙŠØ±Ø©) - ' + new Date().toLocaleTimeString('ar-EG');
    }

    function checkMissingFields() {
      var results = [];
      // mealLogs
      mealLogs.forEach(function(r, i) {
        var missing = [];
        if (!r.chef || !r.chef.trim()) missing.push('ØªÙƒÙ„ÙØ©Ø®Ù…ÙŠØ±Ø©');
        var _g = calcHospGuestsForDate(r.date);
        if ((!r.breakfast || r.breakfast < 1) && (!r.lunch || r.lunch < 1) && (!r.dinner || r.dinner < 1) && !_g.gBf && !_g.gLh && !_g.gDn) missing.push('Ù…Ù„Ø­ ÙƒØ¬Ù… Ø³Ø¹Ø±');
        if (missing.length) results.push({ table: 'Ø§Ù„Ù…Ù„Ø­', index: i, date: r.date, fields: missing, data: r });
      });
      // teaSugarDisbursements
      teaSugarDisbursements.forEach(function(r, i) {
        var missing = [];
        if (!r.empName || !r.empName.trim()) missing.push('ØªÙƒÙ„ÙØ© Ø§Ù„Ù…Ù„Ø­');
        if (!r.empCode || !r.empCode.toString().trim()) missing.push('Ø±Ø¯Ø© ÙƒØ¬Ù…');
        if ((!r.teaPacks || r.teaPacks < 1) && (!r.sugarKg || r.sugarKg < 1)) missing.push('Ø³Ø¹Ø± (Ø§Ù„Ø±Ø¯Ø©/ØªÙƒÙ„ÙØ©)');
        if (missing.length) results.push({ table: 'Ø§Ù„Ø±Ø¯Ø© Ø³ÙˆÙ„Ø§Ø±', index: i, date: r.date, fields: missing, data: r });
      });
      // septicRecords
      septicRecords.forEach(function(r, i) {
        var missing = [];
        if (!r.name || !r.name.trim()) missing.push('Ù„ØªØ±');
        if (!r.trips || r.trips < 1) missing.push('Ø³Ø¹Ø± Ø§Ù„Ø³ÙˆÙ„Ø§Ø±');
        if (!r.supervisor || !r.supervisor.trim()) missing.push('ØªÙƒÙ„ÙØ© Ø§Ù„Ø³ÙˆÙ„Ø§Ø±');
        if (missing.length) results.push({ table: 'Ø£Ø¬Ø± Ø§Ù„ØªØ´ØºÙŠÙ„', index: i, date: r.date, fields: missing, data: r });
      });
      // bakeryProductions
      bakeryProductions.forEach(function(r, i) {
        var missing = [];
        if (!r.breadCount || r.breadCount < 1) missing.push('Ø®Ø§Ù…Ø§Øª Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†');
        if ((!r.flourUsed || r.flourUsed < 0.1) && (!r.dieselUsed || r.dieselUsed < 0.1)) missing.push('Ø¥Ø¬Ù…Ø§Ù„ÙŠ (Ø§Ù„ØªÙƒÙ„ÙØ©/ØªÙƒÙ„ÙØ©)');
        if (missing.length) results.push({ table: 'Ø§Ù„Ø±ØºÙŠÙ', index: i, date: r.date, fields: missing, data: r });
      });
      // bakeryContractorSupplies
      bakeryContractorSupplies.forEach(function(r, i) {
        var missing = [];
        if (!r.name || !r.name.trim()) missing.push('Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø¹Ø¯Ø¯');
        if (!r.count || r.count < 1) missing.push('Ø£ÙŠØ§Ù… Ø§Ù„Ø¥Ù†ØªØ§Ø¬');
        if (!r.responsible || !r.responsible.trim()) missing.push('ØªÙƒÙ„ÙØ©');
        if (missing.length) results.push({ table: 'Ø§Ù„Ø®Ø¨Ø² ÙŠÙˆÙ…', index: i, date: r.date, fields: missing, data: r });
      });
      showFieldCheckResults(results);
    }

    function showFieldCheckResults(results) {
      var container = document.getElementById('field-check-results');
      if (!results.length) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#1b5e20;font-size:16px;">âœ… Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ù…Ù…ØªÙ„Ø¦Ø© â€” Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø´Ø§ÙƒÙ„</div>';
      } else {
        var html = '<div style="margin-bottom:10px;padding:8px 12px;background:#fff3e0;border-radius:6px;font-size:13px;color:#e65100;">ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ' + results.length + ' Ø­Ù‚Ù„ ÙŠØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ ØªØºØ°ÙŠØ© Ø¨Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª (Ø¯Ù‚ÙŠÙ‚ØŒ Ø®Ù…ÙŠØ±Ø©ØŒ Ù…Ù„Ø­ØŒ Ø±Ø¯Ø©).</div>';
        html += '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#1565c0;color:white;"><th>#</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ø±ØºÙØ©</th><th>Ø¯Ù‚ÙŠÙ‚ (ÙƒØ¬Ù…)</th><th>Ø®Ù…ÙŠØ±Ø© (ÙƒØ¬Ù…)</th><th>Ù…Ù„Ø­ (ÙƒØ¬Ù…)</th><th>Ø±Ø¯Ø© (ÙƒØ¬Ù…)</th><th>Ø³ÙˆÙ„Ø§Ø± (Ù„ØªØ±)</th></tr></thead><tbody>';
        results.forEach(function(r, i) {
          html += '<tr style="border-bottom:1px solid #e0e0e0;"><td>' + (i+1) + '</td><td>' + r.table + '</td><td>' + r.date + '</td><td style="color:#d32f2f;">' + r.fields.join('ØŒ ') + '</td><td><button class="btn" style="padding:2px 8px;font-size:11px;background:#1565c0;color:white;" onclick="openFieldFeeder(' + i + ')">âœï¸ ØªØºØ°ÙŠØ©</button></td></tr>';
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
      var html = '<div style="margin-bottom:10px;font-size:13px;"><b>' + table + '</b> â€” Ø§Ù„ØªØ´ØºÙŠÙ„: ' + r.date + '</div>';
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
      html += '</div><button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="saveFieldFeeder(' + idx + ')">ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª</button>';
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
      if (!table) { alert('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨.'); return; }
      let checked = table.querySelectorAll('.row-check:checked');
      if (!checked.length) { alert('Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ ØµÙÙˆÙ Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©.'); return; }

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
      if (!rows) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©.'); return; }

      let logoImg = document.querySelector('.print-watermark img');
      let logoSrc = logoImg ? logoImg.src : '';

      let summaryHtml = '';
      if (isContractorTable && checked.length > 0) {
        summaryHtml = '<div style="margin-top:20px;border:2px solid #1b5e20;border-radius:8px;padding:12px;background:transparent;">' +
          '<h3 style="text-align:center;color:#1b5e20;margin:0 0 10px;">Ù…Ù„Ø®Øµ ØªÙˆØ±ÙŠØ¯ Ø§Ù„Ø®Ø¨Ø²</h3>' +
          '<table style="width:auto;margin:0 auto;border:none;">' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒÙ…ÙŠØ©:</td><td style="border:none;font-weight:700;color:#1b5e20;padding:4px 12px;">' + totalCount + ' Ø±ØºÙŠÙ</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯:</td><td style="border:none;font-weight:700;color:#1b5e20;padding:4px 12px;">' + totalRevenue.toFixed(2) + ' Ø¬Ù†ÙŠÙ‡</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹:</td><td style="border:none;font-weight:700;color:#1565c0;padding:4px 12px;">' + totalPaid.toFixed(2) + ' Ø¬Ù†ÙŠÙ‡</td></tr>' +
          '<tr><td style="border:none;font-weight:700;text-align:left;padding:4px 12px;">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ:</td><td style="border:none;font-weight:700;color:#d32f2f;padding:4px 12px;">' + totalRemaining.toFixed(2) + ' Ø¬Ù†ÙŠÙ‡</td></tr>' +
          '</table></div>';
      }

      let logoEl = document.querySelector('img[alt="Logo"]');
      let logoSrc2 = logoEl ? logoEl.src : logoSrc;
      let title, headerExtra = '';
      if (tableId === 'table-bakery-ctr-supply') {
        let fromDate = document.getElementById('filt-ctr-from')?.value || '';
        let toDate = document.getElementById('filt-ctr-to')?.value || '';
        title = 'Ø¨ÙŠØ§Ù† ØªÙˆØ±ÙŠØ¯ Ø®Ø¨Ø² Ù„Ù…Ù‚Ø§ÙˆÙ„';
        if (fromDate || toDate) headerExtra = '<div style="text-align:center;font-size:13px;color:#555;margin:4px 0 10px;">Ø¹Ù† Ø§Ù„ÙØªØ±Ø©: ' + (fromDate || 'â€”') + ' Ø¥Ù„Ù‰ ' + (toDate || 'â€”') + '</div>';
      } else {
        title = tableId ? tableId.replace(/table-/g, '').replace(/-/g, ' ') : 'ØªÙ‚Ø±ÙŠØ±';
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
        '<div style="text-align:center;color:#888;margin-top:15px;font-size:11px;">Ø·Ø¨Ø§Ø¹Ø©: ' + new Date().toLocaleString('ar-EG') + '</div>' +
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
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (travelDate||'â€”') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (lastWorkDay||'â€”') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #000;text-align:center;">' + (returnDate||'â€”') + '</td>' +
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
      w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª</title>' +
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
        '<div class="title">Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø¬Ø§Ø²Ø§Øª</div>' +
        '<table><thead><tr>' +
        '<th style="width:4%;">Ù…</th><th style="width:7%;">Ø§Ù„ÙƒÙˆØ¯</th><th style="width:14%;">Ø§Ù„Ø§Ø³Ù…</th><th style="width:12%;">Ø§Ù„Ø¬Ù‡Ø©</th>' +
        '<th style="width:8%;">Ø§Ù„Ù†ÙˆØ¹</th><th style="width:10%;">Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©</th><th style="width:10%;">Ø§Ù„Ù†Ù‡Ø§ÙŠØ©</th><th style="width:5%;">Ø£ÙŠØ§Ù…</th>' +
        '<th style="width:10%;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø³ÙØ±</th><th style="width:10%;">Ø¢Ø®Ø± ÙŠÙˆÙ… Ø¹Ù…Ù„</th><th style="width:10%;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¹ÙˆØ¯Ø©</th>' +
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
        var d = e.dept.replace(/\s+/g, '').replace(/[ÙŠÙ‰]/g, 'ÙŠ').replace(/[Ø©Ù‡]/g, 'Ø©').replace(/[Ø¥Ø£Ø¢]/g, 'Ø§').toLowerCase();
        return d.indexOf('Ø§Ù„Ø´Ø¦ÙˆÙ†') > -1 || d.indexOf('Ø§Ø¯Ø§Ø±ÙŠ') > -1;
      });
      if (!admin.length) {
        var depts = {};
        employees.forEach(function(e) { if (e.dept) depts[e.dept] = (depts[e.dept] || 0) + 1; });
        var list = Object.keys(depts).map(function(k) { return k + ': ' + depts[k] + ' Ù…ÙˆØ¸Ù'; }).join(' | ');
        grid.innerHTML = '<div style="color:#d32f2f;font-size:14px;padding:20px;text-align:center;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙˆÙ† ÙÙŠ Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©<br><span style="font-size:12px;color:#555;">Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…: ' + list + '</span></div>';
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
        "Ù…Ø¯ÙŠØ±": [{name:"Ù…ØªØ§Ø¨Ø¹Ø© Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„ ÙÙŠ Ø§Ù„Ù‚Ø³Ù…",max:20},{name:"Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø¯ÙˆØ±ÙŠØ©",max:20},{name:"Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ù…Ø¹ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø®Ø±Ù‰",max:20},{name:"Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†",max:20},{name:"Ø­Ù„ Ø§Ù„Ù…Ø´ÙƒÙ„Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø§Ù„ÙØ§Øª",max:20}],
        "Ù…Ù‡Ù†Ø¯Ø³": [{name:"Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ÙÙ†ÙŠØ©",max:20},{name:"Ù…ØªØ§Ø¨Ø¹Ø© ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ø®Ø·Ø·Ø§Øª",max:20},{name:"Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„ÙÙ†ÙŠØ©",max:20},{name:"Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ù…Ø¹ ÙØ±Ù‚ Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ø§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ù„Ø¬ÙˆØ¯Ø©",max:20}],
        "Ù…Ø´Ø±Ù": [{name:"Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ù…Ø§Ù„",max:20},{name:"ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„ÙŠÙˆÙ…ÙŠØ©",max:20},{name:"Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„Ø§Ù†ØµØ±Ø§Ù",max:20},{name:"Ø§Ù„Ø¥Ø¨Ù„Ø§Øº Ø¹Ù† Ø§Ù„Ù…Ø®Ø§Ù„ÙØ§Øª",max:20},{name:"Ø§Ù„ØªØ£ÙƒØ¯ Ù…Ù† ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ¹Ù„ÙŠÙ…Ø§Øª",max:20}],
        "Ø¹Ø§Ù…Ù„": [{name:"ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…ÙƒÙ„Ù Ø¨Ù‡Ø§",max:20},{name:"Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ù†Ø¸Ø§ÙØ© Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ø§Ù„ØªØ¹Ø§ÙˆÙ† Ù…Ø¹ Ø§Ù„Ø²Ù…Ù„Ø§Ø¡",max:20}],
        "ÙÙ†ÙŠ": [{name:"Ù…ØªØ§Ø¨Ø¹Ø© Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØµÙŠØ§Ù†Ø©",max:20},{name:"Ø¥Ø¹Ø¯Ø§Ø¯ ØªÙ‚Ø§Ø±ÙŠØ± ÙÙ†ÙŠØ©",max:20},{name:"Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ù…Ø¹ Ø§Ù„ÙØ±Ù‚",max:20},{name:"Ø¬ÙˆØ¯Ø© Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ±",max:20}],
        "Ø³Ø§Ø¦Ù‚": [{name:"Ù†Ù‚Ù„ Ø§Ù„Ù…Ù‡Ù…Ø§Øª ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ø­Ø¯Ø¯",max:20},{name:"ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…Ø±ÙƒØ¨Ø© ÙˆÙ†Ø¸Ø§ÙØªÙ‡Ø§",max:20},{name:"Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ù…Ø±ÙˆØ±",max:20},{name:"Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø§Ù„ÙˆÙ‚ÙˆØ¯",max:20},{name:"Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø¢Ù…Ù†",max:20}],
        "ÙØ±Ø¯": [{name:"ØªØ£Ù…ÙŠÙ† Ø§Ù„Ù…ÙˆÙ‚Ø¹",max:20},{name:"Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª",max:20},{name:"Ø§Ù„Ø¥Ø¨Ù„Ø§Øº Ø¹Ù† Ø§Ù„Ù…Ø®Ø§Ù„ÙØ§Øª",max:20},{name:"Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø§Ù„Ø¹Ø§Ù…Ø©",max:20},{name:"Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ø§Ù„Ø¬ÙŠØ¯ Ù…Ø¹ Ø§Ù„Ø²ÙˆØ§Ø±",max:20}],
        "Ø£Ù…ÙŠÙ† Ù…Ø®Ø²Ù†": [{name:"Ø§Ø³ØªÙ„Ø§Ù… ÙˆØµØ±Ù Ø§Ù„Ø£ØµÙ†Ø§Ù",max:20},{name:"ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù…Ø®Ø²Ù†",max:20},{name:"Ø§Ù„Ø¬Ø±Ø¯ Ø§Ù„Ø¯ÙˆØ±ÙŠ",max:20},{name:"ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø³Ø¬Ù„Ø§Øª",max:20},{name:"Ø§Ù„Ø¥Ø¨Ù„Ø§Øº Ø¹Ù† Ù†Ù‚Øµ Ø§Ù„Ø£ØµÙ†Ø§Ù",max:20}],
        "Ø§Ù„Ø§Ø¬Ø§Ø²Ø©": [{name:"Ù…Ø¯Ø© Ø§Ù„Ø§Ø¬Ø§Ø²Ø© Ù†ÙˆØ¹",max:20},{name:"Ø§Ù„Ø§Ø¬Ø§Ø²Ø© ØªØ³Ø¬ÙŠÙ„",max:20},{name:"Ø§ÙˆØ¯ÙˆÙˆ Ù…Ø¯ÙŠØ± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©",max:20},{name:"Ø§Ù„Ù‚Ø³Ù… Ø´Ø¦ÙˆÙ†",max:20},{name:"Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ† Ø¥Ø¹ØªÙ…Ø§Ø¯",max:20}],
        "Ù‚Ø§Ø¦Ø¯ ÙØ±ÙŠÙ‚": [{name:"ØªÙˆØ¬ÙŠÙ‡ ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„",max:20},{name:"Ù…ØªØ§Ø¨Ø¹Ø© ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ù‡Ø§Ù…",max:20},{name:"Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ø¨ÙŠÙ† Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„ÙØ±ÙŠÙ‚",max:20},{name:"Ø±ÙØ¹ ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø¥Ù†Ø¬Ø§Ø²",max:20},{name:"Ø­Ù„ Ù…Ø´ÙƒÙ„Ø§Øª Ø§Ù„ÙØ±ÙŠÙ‚",max:20}]
      };
      for (var key in defaults) {
        if (title.indexOf(key) > -1) return defaults[key];
      }
      return [{name:"ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…ÙƒÙ„Ù Ø¨Ù‡Ø§ Ø¨Ø¯Ù‚Ø©",max:25},{name:"Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„",max:25},{name:"Ø§Ù„ØªØ¹Ø§ÙˆÙ† Ù…Ø¹ Ø§Ù„ÙØ±ÙŠÙ‚",max:20},{name:"Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¹Ù…Ù„",max:15},{name:"Ø§Ù„Ø¥Ø¨Ù„Ø§Øº Ø¹Ù† Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª",max:15}];
    }

    function loadEvalTasks() {
      var empId = document.getElementById('eval-emp-id').value;
      var container = document.getElementById('eval-tasks-container');
      var titleInput = document.getElementById('eval-title');
      if (!empId) {
        container.innerHTML = '<div style="color:#888;font-size:13px;">Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø­Ù„ Ø§Ù„Ù…Ø´ÙƒÙ„Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø§Ù„ÙØ§Øª</div>';
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
        html += '<span style="font-size:11px;color:#880e4f;white-space:nowrap;">(Ù…Ù† ' + maxVal + ')</span>';
        html += '<input type="number" id="kpi-score-' + i + '" value="' + maxVal + '" min="0" max="' + maxVal + '" step="0.5" style="width:70px;padding:4px 6px;border:2px solid #880e4f;border-radius:6px;font-size:13px;font-weight:700;text-align:center;">';
        html += '</div>';
      });
      container.innerHTML = html;
    }

    function addEvaluation() {
      var empId = document.getElementById('eval-emp-id').value;
      if (!empId) return alert('Ù…Ù† ÙØ¶Ù„Ùƒ Ø§Ø®ØªØ± Ø§Ù„Ù…ÙˆØ¸Ù');
      var emp = employees.find(function(e) { return (e.id || e.code) == empId; });
      if (!emp) return alert('Ù…Ø¹ ÙØ±Ù‚ Ø§Ù„Ø¹Ù…Ù„');
      var dd2 = (emp.dept||'').replace(/\s+/g,'').replace(/[ÙŠÙ‰]/g,'ÙŠ').replace(/[Ø©Ù‡]/g,'Ø©').replace(/[Ø¥Ø£Ø¢]/g,'Ø§').toLowerCase();
      if (dd2.indexOf('Ø§Ù„Ø´Ø¦ÙˆÙ†') === -1 && dd2.indexOf('Ø§Ø¯Ø§Ø±ÙŠ') === -1) return alert('Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¸Ù Ù„ÙŠØ³ Ù…Ù† Ù‚Ø³Ù… Ø§Ù„Ø´Ø¦ÙˆÙ† Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©');
      var month = document.getElementById('eval-month').value;
      var year = document.getElementById('eval-year').value;
      if (!year || year < 2020) return alert('Ù…Ù† ÙØ¶Ù„Ùƒ Ø£Ø¯Ø®Ù„ Ø³Ù†Ø© ØµØ­ÙŠØ­Ø©');
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
      var grade = adjustedScore >= 90 ? 'Ù…Ù…ØªØ§Ø²' : adjustedScore >= 75 ? 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹' : adjustedScore >= 60 ? 'Ø¬ÙŠØ¯' : adjustedScore >= 45 ? 'Ù…Ù‚Ø¨ÙˆÙ„' : 'Ø¶Ø¹ÙŠÙ';
      var notes = document.getElementById('eval-notes').value.trim();
      // Check duplicate
      var dup = evaluations.some(function(e) {
        return e.empId === empId && e.month === month && e.year === year;
      });
      if (dup && !confirm('Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¸Ù Ù„Ø¯ÙŠÙ‡ ØªÙ‚ÙŠÙŠÙ… Ø³Ø§Ø¨Ù‚ Ù„Ù†ÙØ³ Ø§Ù„Ø´Ù‡Ø± ÙˆØ§Ù„Ø³Ù†Ø©. Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ø¶Ø§ÙØ© ØªÙ‚ÙŠÙŠÙ… Ø¬Ø¯ÙŠØ¯ØŸ')) return;
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
      alert('ØªÙ… ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù…ÙˆØ¸Ù ' + emp.name + ' (Ø§Ù„Ù†ØªÙŠØ¬Ø©: ' + adjustedScore + ')');
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
        var monthNames = ['', 'Ø§Ù„ØªØ¹Ø§ÙˆÙ†','Ù…Ø¹','Ø§Ù„Ø²Ù…Ù„Ø§Ø¡','ÙÙ†ÙŠ','Ø¥ØµÙ„Ø§Ø­','Ø§Ù„Ø£Ø¹Ø·Ø§Ù„','Ø§Ù„ØµÙŠØ§Ù†Ø©','Ø§Ù„Ø¯ÙˆØ±ÙŠØ©','ÙØ­Øµ','Ø§Ù„Ù…Ø¹Ø¯Ø§Øª','Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø©','Ù„Ù„Ø¨Ù„Ø§ØºØ§Øª'];
        var tr = document.createElement('tr');
        var isPr = e.deduction !== undefined; // new format
        var displayScore = isPr ? e.totalScore + ' / ' + e.maxScore : (e.totalScore || 'â€”') + ' / ' + (e.maxScore || 'â€”');
        var displayAdj = isPr ? e.adjustedScore + '' : (e.percentage !== undefined ? e.percentage + '%' : 'â€”');
        var dedStr = isPr ? (e.deduction || 0) + '' : 'â€”';
        var bonusStr = isPr ? (e.bonus || 0) + '' : 'â€”';
        var adjColor = isPr ? (e.adjustedScore >= 75 ? '#2e7d32' : e.adjustedScore >= 45 ? '#e65100' : '#d32f2f') : (e.percentage >= 75 ? '#2e7d32' : e.percentage >= 50 ? '#e65100' : '#d32f2f');
        var grdColor = isPr ? (e.adjustedScore >= 90 ? '#1b5e20' : e.adjustedScore >= 75 ? '#2e7d32' : e.adjustedScore >= 60 ? '#f57c00' : e.adjustedScore >= 45 ? '#e65100' : '#d32f2f') : (e.percentage >= 90 ? '#1b5e20' : e.percentage >= 75 ? '#2e7d32' : e.percentage >= 60 ? '#f57c00' : e.percentage >= 45 ? '#e65100' : '#d32f2f');
        tr.innerHTML =
          '<td class="no-print"><input type="checkbox" class="row-check" data-table="table-evaluations"></td>' +
          '<td><b>' + e.empName + '</b></td>' +
          '<td>' + (e.empTitle || 'â€”') + '</td>' +
          '<td>' + (e.empDept || 'â€”') + '</td>' +
          '<td>' + (monthNames[parseInt(e.month)] || e.month) + ' ' + e.year + '</td>' +
          '<td style="font-size:12px;">' + displayScore + '</td>' +
          '<td style="font-size:12px;color:#d32f2f;">-' + dedStr + '</td>' +
          '<td style="font-size:12px;color:#2e7d32;">+' + bonusStr + '</td>' +
          '<td style="font-weight:700;color:' + adjColor + ';">' + displayAdj + '</td>' +
          '<td style="font-weight:700;color:' + grdColor + ';">' + (e.grade || 'â€”') + '</td>' +
          '<td style="font-size:12px;max-width:120px;overflow:hidden;">' + (e.notes || 'â€”') + '</td>' +
          '<td class="no-print"><button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="deleteEvaluation(' + realIdx + ')">Ø­Ø°Ù</button></td>';
        tbody.appendChild(tr);
      });
    }

    function deleteEvaluation(idx) { if (!requireAdmin()) return;
      if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„ØªÙ‚ÙŠÙŠÙ…ØŸ')) return;
      _logDeletion('evaluations', (evaluations[idx].empCode || evaluations[idx].employeeCode||'') + '|' + (evaluations[idx].date||'') + '|' + (evaluations[idx].month || evaluations[idx].type||'') + '|' + (evaluations[idx].year||''));
      evaluations.splice(idx, 1);
      syncStorage();
      renderEvaluations();
    }

    function exportEvaluationsToExcel() {
      if (!evaluations.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ‚ÙŠÙŠÙ…Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±');
      var monthNames = ['', 'ØµÙŠØ§Ù†Ø©','Ø§Ù„Ù…Ø±ÙƒØ¨Ø©','ÙˆÙ†Ø¸Ø§ÙØªÙ‡Ø§','Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…','Ø¨Ù‚ÙˆØ§Ø¹Ø¯','Ø§Ù„Ù…Ø±ÙˆØ±','Ø§Ù„Ø­ÙØ§Ø¸','Ø¹Ù„Ù‰','Ø§Ù„ÙˆÙ‚ÙˆØ¯','Ø§Ù„ØªØ³Ù„ÙŠÙ…','Ø§Ù„Ø¢Ù…Ù†','ÙØ±Ø¯'];
      var data = evaluations.slice().sort(function(a,b){ return (b.year||'').localeCompare(a.year||'') || (String(b.month).padStart(2,'0')).localeCompare(String(a.month).padStart(2,'0')); }).map(function(e) {
        var isPr = e.deduction !== undefined;
        var kpiDetail = '';
        if (isPr && e.tasks) {
          kpiDetail = e.tasks.map(function(t) { return t.name + ': ' + t.score + '/' + t.max; }).join(' | ');
        }
        return {
          "ØªØ£Ù…ÙŠÙ†": stripEmoji(e.empName),
          "Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…": stripEmoji(e.empTitle),
          "Ø¨Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª": stripEmoji(e.empDept),
          "Ø§Ù„Ø¥Ø¨Ù„Ø§Øº": monthNames[parseInt(e.month)] || e.month,
          "Ø¹Ù†": e.year,
          "Ø§Ù„Ù…Ø®Ø§Ù„ÙØ§Øª KPIs": (isPr ? e.totalScore : e.totalScore || 'â€”') + ' / ' + (isPr ? e.maxScore : e.maxScore || 'â€”'),
          "Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø§Ù„Ø¹Ø§Ù…Ø©": isPr ? (e.deduction || 0) : 'â€”',
          "Bonus": isPr ? (e.bonus || 0) : 'â€”',
          "Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ø§Ù„Ø¬ÙŠØ¯": isPr ? e.adjustedScore : (e.percentage !== undefined ? e.percentage + '%' : 'â€”'),
          "Ù…Ø¹": stripEmoji(e.grade),
          "Ø§Ù„Ø²ÙˆØ§Ø± KPIs": kpiDetail,
          "Ø£Ù…ÙŠÙ†": e.notes || ''
        };
      });
      var ws = XLSX.utils.json_to_sheet(data);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†');
      XLSX.writeFile(wb, 'ØªÙ‚ÙŠÙŠÙ…_Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†_' + new Date().toLocaleDateString('ar-EG').replace(/\//g,'-') + '.xlsx');
    }

    function manageEvalTemplates() {
      var html = '<div style="font-size:14px;margin-bottom:15px;color:#880e4f;font-weight:700;">âš™ï¸ Ø¥Ø¯Ø§Ø±Ø© Ù…Ù‡Ø§Ù… Ø§Ù„ØªÙ‚ÙŠÙŠÙ… (KPIs) Ø­Ø³Ø¨ Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ</div>';
      html += '<div style="display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap;align-items:end;">';
      html += '<select id="mgt-title-select" style="flex:2;min-width:150px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;">';
      var sortedTitles = [].concat(dynamicTitles).sort();
      sortedTitles.forEach(function(t) {
        html += '<option value="' + t + '">' + t + '</option>';
      });
      html += '</select>';
      html += '<input type="text" id="mgt-new-task" placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ù‡Ù…Ø©" style="flex:2;min-width:120px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;">';
      html += '<input type="number" id="mgt-new-max" value="20" min="1" max="100" style="width:70px;padding:8px;border:2px solid #e0e0e0;border-radius:8px;text-align:center;" title="Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ù‚ØµÙˆÙ‰">';
      html += '<button class="btn btn-primary" style="background:#880e4f;" onclick="addEvalTask()">Ø¥Ø¶Ø§ÙØ© Ù…Ù‡Ù…Ø©</button>';
      html += '</div>';
      html += '<div style="font-size:12px;color:#880e4f;margin-bottom:8px;">Ø§Ø®ØªØ± Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ Ù„Ø¥Ø¯Ø§Ø±Ø© Ù…Ù‡Ø§Ù… Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù‡</div>';
      html += '<div id="mgt-tasks-list" style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow:auto;"></div>';
      var modal = document.createElement('div');
      modal.className = 'modal open';
      modal.innerHTML = '<div class="modal-content" style="max-width:650px;border-top:5px solid #880e4f;max-height:80vh;display:flex;flex-direction:column;"><div class="modal-header"><h2 style="color:#880e4f;">âš™ï¸ Ø¥Ø¯Ø§Ø±Ø© KPIs</h2><span class="close-btn" onclick="this.closest(\'.modal\').remove()">&times;</span></div><div style="flex:1;overflow:auto;padding:10px 0;">' + html + '</div></div>';
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
        container.innerHTML = '<div style="color:#888;font-size:13px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… ØªÙ‚ÙŠÙŠÙ… Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ù…Ù‰ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ â€” Ø£Ø¶Ù Ù…Ù‡Ø§Ù…Ø§Ù‹ Ø¬Ø¯ÙŠØ¯Ø©</div>';
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
        html += '<button class="btn btn-warning" style="padding:2px 6px;font-size:10px;" onclick="editEvalTaskWeight(' + i + ')">âš–ï¸</button>';
        html += '<button class="btn btn-danger" style="padding:2px 6px;font-size:11px;" onclick="removeEvalTask(' + i + ')">Ø­Ø°Ù</button>';
        html += '</div>';
      });
      html += '<div style="font-size:12px;font-weight:700;color:' + (totalWeight === 100 ? '#2e7d32' : '#d32f2f') + ';padding:4px 12px;">Ø§Ù„Ø¹Ù…Ù„: ' + totalWeight + ' / 100</div>';
      container.innerHTML = html;
    }

    function editEvalTaskWeight(idx) {
      var sel = document.getElementById('mgt-title-select');
      if (!sel) return;
      var title = sel.value;
      var tasks = evalTemplates[title] || [];
      var t = tasks[idx];
      if (!t) return;
      var newMax = prompt('ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙˆØ²Ù† (Ø£Ù‚ØµÙ‰ Ø¯Ø±Ø¬Ø©) Ù„Ù€ "' + (t.name || t) + '":', t.max || 5);
      if (newMax === null) return;
      newMax = parseFloat(newMax);
      if (isNaN(newMax) || newMax <= 0) return alert('Ø§Ù„ÙˆØ²Ù† ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ù‹Ø§ Ù…ÙˆØ¬Ø¨Ù‹Ø§');
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
      if (!task) return alert('Ù…Ù† ÙØ¶Ù„Ùƒ Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ù…Ø¤Ø´Ø±');
      var maxVal = maxInput ? parseFloat(maxInput.value) || 5 : 5;
      if (maxVal <= 0) return alert('Ø§Ù„ÙˆØ²Ù† ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ù‹Ø§ Ù…ÙˆØ¬Ø¨Ù‹Ø§');
      if (!evalTemplates[title]) evalTemplates[title] = [];
      var exists = evalTemplates[title].some(function(t) { return (t.name || t) === task; });
      if (exists) return alert('Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„ØªØ¹Ø§ÙˆÙ†');
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
      if (!confirm('Ù…Ø¹ "' + tName + '" ?')) return;
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

