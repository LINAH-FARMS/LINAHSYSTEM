// ============================================================
//  إصلاح مشكلة المزامنة: سكن العاملين يرجع لمكان مختلف بعد مزامنة قوية
//  ----------------------------------------------------------
//  المشكلة الأصلية:
//  1) pushToSupabase القديمة كانت تستبدل الكيان كاملاً في السحابة
//     (RPC) بنسخة الجهاز الدافع — أي جهاز بياناته أقدم يمسح تعديلات الآخرين
//  2) pullFromSupabase كانت تستبدل البيانات المحلية ببيانات السحابة
//     بدون مقارنة تواريخ (خلافاً لدالة Google Drive القديمة)
//  3) تضارب أسماء السكن بين employees و roomsCapacity في البيانات نفسها
//     (مثل "سكن العاملين الجديد 2025" + "غرفه C1" بدلاً من
//      "سكن العاملين الجديد 2025 (C)" + "غرفه C1")
//
//  الحل: دمج على مستوى العنصر بمعيار modifiedAt (الأحدث يفوز) +
//  حارس محلي: لا تستبدل المحلي إذا كان أحدث من السحابة + تنظيم أسماء السكن
// ============================================================

(function () {
  const TIE_LOCAL = 'local';
  const TIE_REMOTE = 'remote';

  function _timeMs(v) {
    if (!v) return null;
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }

  function _pickNewer(localItem, remoteItem, tie) {
    const l = _timeMs(localItem && localItem.modifiedAt);
    const r = _timeMs(remoteItem && remoteItem.modifiedAt);
    let winner;
    let loser;
    if (l === null && r === null) {
      winner = tie === TIE_LOCAL ? localItem : remoteItem;
    } else if (r === null) {
      winner = localItem;
    } else if (l === null) {
      winner = remoteItem;
    } else {
      winner = l >= r ? localItem : remoteItem;
    }
    loser = winner === localItem ? remoteItem : localItem;
    if (!loser) return Object.assign({}, winner);
    return Object.assign({}, loser, winner);
  }

  function _entityKey(item, entity) {
    if (typeof _getItemKey === 'function') return _getItemKey(item, entity);
    return (item && (item.id || item.code || item.name)) || JSON.stringify(item);
  }

  // دمج عنصر-بعنصر بين النسخة المحلية والنسخة السحابية
  function _mergeSyncElements(localArr, remoteArr, entity, delKeys, tie) {
    if (!Array.isArray(localArr)) return localArr;
    if (!Array.isArray(remoteArr) || remoteArr.length === 0) {
      if (!delKeys || Object.keys(delKeys).length === 0) return localArr;
      return localArr.filter(function (item) { return !delKeys[_entityKey(item, entity)]; });
    }
    const remoteByKey = {};
    remoteArr.forEach(function (item) { remoteByKey[_entityKey(item, entity)] = item; });
    const localKeys = {};
    const result = [];
    localArr.forEach(function (item) {
      const k = _entityKey(item, entity);
      if (delKeys && delKeys[k]) return;
      localKeys[k] = true;
      const rem = remoteByKey[k];
      result.push(rem ? _pickNewer(item, rem, tie) : item);
    });
    remoteArr.forEach(function (item) {
      const k = _entityKey(item, entity);
      if (localKeys[k]) return;
      if (delKeys && delKeys[k]) return;
      result.push(item);
    });
    return result;
  }

  // ============================================================
  //  إصلاح خاص بالإجازات: تعديل الإجازة كان يغير المفتاح (التواريخ
  //  داخلة في المفتاح) فتبقى النسخة القديمة في السحابة ويعود السجل القديم
  //  لزملائك (وكأن التعديل رجع). الحل: دمج حسب الموظف + التداخل الزمني،
  //  وتُرجع كل مجموعة متداخلة نسخة واحدة فقط (الأحدث modifiedAt،
  //  والتعادل للجهة النشطة: المحلي عند الدفع والسحابية عند السحب)
  // ============================================================
  function _vacEmpKey(v) {
    return String((v && (v.code || v.employeeCode || v.employeeName || v.name)) || '').trim();
  }
  function _vacRange(v) {
    const s = String((v && (v.start || v.startDate || v.dateFrom || v.dateTo)) || '').replace(/[^0-9-]/g, '');
    const e = String((v && (v.end || v.endDate || v.dateTo || v.dateFrom)) || '').replace(/[^0-9-]/g, '');
    return { s: s, e: e };
  }
  function _vacOverlaps(a, b) {
    const ra = _vacRange(a), rb = _vacRange(b);
    if (!ra.s && !ra.e) return false;
    if (!rb.s && !rb.e) return false;
    const as = ra.s || ra.e, ae = ra.e || ra.s;
    const bs = rb.s || rb.e, be = rb.e || rb.s;
    return as <= be && bs <= ae;
  }
  function _vacWinner(copies, tie) {
    let best = copies[0];
    let bestT = _timeMs(best.item.modifiedAt);
    let localIsBest = best.__side === 'local';
    for (let i = 1; i < copies.length; i++) {
      const c = copies[i];
      const cT = _timeMs(c.item.modifiedAt);
      const cLocal = c.__side === 'local';
      let better = null;
      if (cT !== null && bestT === null) better = true;
      else if (cT === null && bestT !== null) better = false;
      else if (cT !== null && bestT !== null) {
        if (cT > bestT) better = true;
        else if (cT < bestT) better = false;
      }
      if (better === true) { best = c; bestT = cT; localIsBest = cLocal; }
      else if (better === null || better === false) {
        // تعادل (أو السحابة أحدث): الجهة النشطة تفوز عند التعادل فقط
        if (better === null) {
          const wantLocal = tie === TIE_LOCAL;
          if (wantLocal && cLocal && !localIsBest) { best = c; bestT = cT; localIsBest = true; }
          else if (!wantLocal && !cLocal && localIsBest) { best = c; bestT = cT; localIsBest = false; }
        }
      }
    }
    const winner = Object.assign({}, best.item);
    delete winner.__side;
    return winner;
  }
  function _mergeVacations(localArr, remoteArr, tie, delKeys) {
    if (!Array.isArray(localArr)) return localArr;
    if (!Array.isArray(remoteArr) || remoteArr.length === 0) {
      if (!delKeys || Object.keys(delKeys).length === 0) return localArr;
      return localArr.filter(function (item) { return !delKeys[_entityKey(item, 'vacations')]; });
    }
    const groups = {};
    function place(arr, side) {
      arr.forEach(function (item) {
        const k = _vacEmpKey(item);
        if (!k) return;
        if (delKeys && delKeys[_entityKey(item, 'vacations')]) return;
        if (!groups[k]) groups[k] = [];
        let placed = false;
        for (let g = 0; g < groups[k].length; g++) {
          if (_vacOverlaps(groups[k][g][0].item, item)) {
            groups[k][g].push({ __side: side, item: item });
            placed = true;
            break;
          }
        }
        if (!placed) groups[k].push([{ __side: side, item: item }]);
      });
    }
    place(localArr, 'local');
    place(remoteArr, 'remote');
    const result = [];
    Object.keys(groups).forEach(function (k) {
      groups[k].forEach(function (grp) {
        if (grp.length === 1) { result.push(Object.assign({}, grp[0].item)); return; }
        result.push(_vacWinner(grp, tie));
      });
    });
    return result;
  }

  // تنظيم أسماء السكن لتطابق employees مع roomsCapacity
  function normalizeHousingData() {
    try {
      let changed = false;
      const roomMap = {};
      roomsCapacity.forEach(function (r) {
        if (r && r.sector && r.number) roomMap[r.sector + '|' + r.number] = true;
      });
      function variant(n) {
        if (/^غرفه /.test(n)) return n.replace(/^غرفه /, 'غرفة ');
        if (/^غرفة /.test(n)) return n.replace(/^غرفة /, 'غرفه ');
        return n;
      }
      employees.forEach(function (e) {
        if (!e || !e.sector || !e.room) return;
        let sec = e.sector.trim();
        let room = e.room.trim();
        // ملاحظة: لا ندمج "سكن العاملين الجديد 2025" مع "(C)" — مبنيان منفصلان فعلياً
        // (الكشف يفرق بينهما: القديم غرفه C1 سعتها 6 والمبني (C) غرفه C1 سعتها 50)
        if (/^جزوارين$/.test(sec) || /^جيزوارين$/.test(sec)) {
          const jr = /^(?:جزوارين|جيزوارين)[\s\u00A0]*(\d+)$/.exec(room);
          if (jr) { sec = 'سكن العاملين (سكن الجيزوارين)'; room = 'غرفه ' + jr[1]; }
        } else if (sec === 'القطاعات') {
          const qr = /^قطاعات[\s\u00A0]*(\d+)$/.exec(room);
          if (qr) { sec = 'سكن القطاعات'; room = 'قطاع رقم ( ' + qr[1] + ' )'; }
        }
        if (sec === e.sector.trim() && room === e.room.trim()) return;
        if (!roomMap[sec + '|' + room] && roomMap[sec + '|' + variant(room)]) room = variant(room);
        if (!roomMap[sec + '|' + room]) return;
        e.sector = sec;
        e.room = room;
        e.modifiedAt = new Date().toISOString();
        changed = true;
      });
      return changed;
    } catch (e) {
      console.error('normalizeHousingData error:', e);
      return false;
    }
  }

  // ============================================================
  //  pushToSupabase — دفع مع دمج على مستوى العنصر (الأحدث يفوز)
  // ============================================================
  window.pushToSupabase = async function pushToSupabase() {
    if (!supabaseConnected) {
      showSyncToast('غير متصل بـ Supabase');
      return false;
    }
    while (_pushInProgress) { await new Promise(function (r) { setTimeout(r, 300); }); }
    _pushInProgress = true;
    try {
      const ts = new Date().toISOString();
      const allData = getAllDataForSync();

      // قراءة أحدث نسخة من السحابة للدمج
      let remote = null;
      try {
        const resp = await fetch(_sbEndpoint + '?select=id,data,updated_at&order=updated_at.desc', {
          method: 'GET',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
          mode: 'cors'
        });
        if (resp.ok) {
          const rows = await resp.json();
          let best = null;
          let bestT = -1;
          if (Array.isArray(rows)) {
            rows.forEach(function (row) {
              if (!row || row.id !== 'alldata' || !row.data) return;
              let t = Date.parse(row.updated_at || '');
              if (isNaN(t)) t = 0;
              if (t >= bestT) { bestT = t; best = row; }
            });
            if (best) remote = typeof best.data === 'string' ? JSON.parse(best.data) : best.data;
          }
        }
      } catch (e) { syncLog('قراءة النسخة السحابية للدمج فشلت: ' + e.message); }

      const delByEntity = {};
      syncDeletions.forEach(function (d) {
        if (!d || !d.entity) return;
        if (!delByEntity[d.entity]) delByEntity[d.entity] = {};
        delByEntity[d.entity][d.key] = true;
      });

      // بناء البيانات المرفوعة: دمج عنصري للأرراي، والمحلي يفوز في التعادل عند الدفع
      const mergedPayload = {};
      Object.keys(allData).forEach(function (k) {
        if (k === 'incident_reports') return; // تُدار في صفها الخاص
        const val = allData[k];
        if (Array.isArray(val)) {
          const remoteArr = remote && Array.isArray(remote[k]) ? remote[k] : null;
          if (k === 'vacations') {
            mergedPayload[k] = _mergeVacations(val, remoteArr, TIE_LOCAL, delByEntity[k] || {});
          } else {
            mergedPayload[k] = _mergeSyncElements(val, remoteArr, k, delByEntity[k] || {}, TIE_LOCAL);
          }
        } else {
          mergedPayload[k] = val;
        }
      });

      const upResp = await fetch(_sbEndpoint, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'alldata', data: mergedPayload, updated_at: ts, device_id: _deviceId })
      });
      if (!upResp.ok) throw new Error('HTTP ' + upResp.status);

      // تحديث snapshot بما تم رفعه فعلاً (المدمج) ليكون المرجع الدقيق
      const newSnap = {};
      Object.keys(mergedPayload).forEach(function (k) { newSnap[k] = JSON.stringify(mergedPayload[k]); });
      _lsSet('_lastPushSnapshot', JSON.stringify(newSnap));
      _pulledAt['_lastPush'] = ts;
      _lsSet('_pulledAt', JSON.stringify(_pulledAt));
      syncLog('تم رفع البيانات إلى Supabase بنجاح (دمج العناصر)');

      deduplicateAfterSync();
      _takeSnapshot();
      syncStorage(true, true);
      updateLastSyncTime();
      showSyncToast('تم رفع البيانات إلى Supabase بنجاح ✅');
    } catch (e) {
      syncLog('فشل الرفع: ' + e.message);
      showSyncToast('تعذر رفع البيانات إلى Supabase');
    } finally {
      _pushInProgress = false;
    }
    return true;
  };

  // ============================================================
  //  pullFromSupabase — سحب مع:
  //  أ) اختيار أحدث نسخة فقط
  //  ب) حارس: لا تستبدل المحلي إذا كان أحدث من السحابة
  //  ج) دمج عنصري عند التطبيق (الأحدث يفوز، التعادل للـ remote)
  // ============================================================
  window.pullFromSupabase = async function pullFromSupabase() {
    if (!supabaseConnected) return;
    while (_pullInProgress) { await new Promise(function (r) { setTimeout(r, 300); }); }
    _pullInProgress = true;
    try {
      const resp = await fetch(_sbEndpoint + '?select=id,data,updated_at&order=updated_at.desc', {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Range': '0-*' },
        mode: 'cors'
      });
      if (!resp.ok) { syncLog('فشل السحب، حالة: ' + resp.status); return; }
      const rows = await resp.json();
      if (!rows || rows.length === 0) { syncLog('الجهاز هو المصدر الوحيد للبيانات'); return; }

      // أحدث نسخة فقط
      let bestRow = null;
      let cloudMs = 0;
      rows.forEach(function (row) {
        if (!row || row.id !== 'alldata' || !row.data) return;
        let t = Date.parse(row.updated_at || '');
        if (isNaN(t)) t = 0;
        if (t >= cloudMs) { cloudMs = t; bestRow = row; }
      });
      if (!bestRow) { syncLog('لم يتم العثور على بيانات سحابية'); return; }
      const remoteData = typeof bestRow.data === 'string' ? JSON.parse(bestRow.data) : bestRow.data;

      // حارس آخر تعديل محلي: إذا كان المحلي أحدث من السحابة لا نستبدله
      const localMs = parseInt(_lsGet('_localChangeTime')) || 0;
      let hasPriorSync = true;
      try {
        const snap = JSON.parse(_lsGet('_lastPushSnapshot') || '{}');
        hasPriorSync = snap && Object.keys(snap).length > 0;
      } catch (e) { hasPriorSync = false; }
      const tolerance = 60000; // 60 ثانية لتفادي فروق الساعة
      const localNewer = hasPriorSync && cloudMs > 0 && localMs > 0 && (localMs - cloudMs) > tolerance;

      // تطبيق الحذف القادم من السحابة دائماً
      const pendingDeletions = syncDeletions.slice();
      const remoteDels = Array.isArray(remoteData.syncDeletions) ? remoteData.syncDeletions : [];
      syncDeletions = pendingDeletions.concat(remoteDels);
      _applyDeletions();
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));

      if (localNewer) {
        syncLog('التعديلات المحلية أحدث من السحابة (' + new Date(localMs).toLocaleTimeString('ar-EG') + ' > ' + new Date(cloudMs).toLocaleTimeString('ar-EG') + ') — تم الاحتفاظ بالبيانات المحلية');
        showSyncToast('التعديلات المحلية أحدث من السحابة — لم يتم استبدالها');
      } else {
        Object.keys(remoteData).forEach(function (k) {
          if (k === 'syncDeletions') return;
          const v = remoteData[k];
          if (typeof v === 'undefined' || v === null) return;
          const localVal = getEntityVar(k);
          if (Array.isArray(v) && Array.isArray(localVal)) {
            if (k === 'vacations') {
              setEntityVar(k, _mergeVacations(localVal, v, TIE_REMOTE, null));
            } else {
              setEntityVar(k, _mergeSyncElements(localVal, v, k, null, TIE_REMOTE));
            }
          } else {
            setEntityVar(k, v);
          }
        });
        syncLog('تم سحب ' + Object.keys(remoteData).length + ' عنصر من Supabase');
      }

      // ----------------- معالجة لاحقة (مثل الأصلية) -----------------
      const _exclMap2 = {};
      (excludedEmployees || []).forEach(function (e) { _exclMap2[e.code || e.id || e.name] = true; });
      employees = employees.filter(function (e) { return !_exclMap2[e.code || e.id || e.name]; });

      deduplicateAfterSync();

      const _defaults = {
        dynamicSeptics: ["بيارة محطة الفرز الجديدة قطاع 22","بيارة المطبخ","بيارة السكن الاداري","بيارة ق3","بيارة سكن نخالين 22","بيارة ق30","بيارة ق6","بيارة ق27","بيارة قطاع 25","بيارة قطاع 33","بيارة قطاع 24","بيارة البير الجديد","بيارة مبني الادارة","بيارة قطاع 27","بيارة قطاع 29","بيارة قطاع 30","بيارة قطاع 21","بيارة قطاع 1","بيارة قطاع 31","بيارة مجمع الحمامات الخارجيه"],
        dynamicRooms: ["A1", "A2", "B1", "B2", "V1"],
        dynamicDepts: ["الإدارة الإدارية", "الإدارة الهندسية", "الأمن", "الصيانة", "المخبز", "الضيافة"],
        dynamicTitles: ["مهندس", "فني", "عامل", "سائق", "مشرف", "إداري"],
        dynamicSectors: ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"],
        dynamicVisitorTypes: ["ضيوف","سيدات","طلبة مدرسة","سائقين","مقدم خدمة بدون اجر","مقدم خدمة باجر","امن ليلي"],
        contractorSectors: ["قطاع 22", "الخيام", "سكن المقاولين"],
        contractorRooms: [],
        bakeryContractorsNames: []
      };
      ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames'].forEach(function (k) {
        try {
          const arr = getEntityVar(k);
          if (Array.isArray(arr)) {
            const cleaned = _strArr(arr);
            if (cleaned.length === 0 && _defaults[k] && _defaults[k].length > 0) {
              _defaults[k].forEach(function (d) { if (cleaned.indexOf(d) === -1) cleaned.push(d); });
            }
            setEntityVar(k, cleaned);
          }
        } catch (e) {}
      });

      if (Array.isArray(bakeryContractorSupplies)) {
        bakeryContractorSupplies = bakeryContractorSupplies.map(function (r) {
          if (typeof r === 'object' && r && (typeof r.name !== 'string' || r.name === '[object Object]' || !r.name.trim())) r.name = 'غير معروف';
          return r;
        });
      }

      const _vSec = {};
      roomsCapacity.forEach(function (_r) { if (_r.sector) _vSec[_r.sector] = true; });
      dynamicSectors = dynamicSectors.filter(function (_s) { return _vSec[_s]; });
      if (!dynamicSectors.length) {
        dynamicSectors = ["سكن المهندسين (السكن الجديد)","سكن الموظفين (السكن الإداري)","سكن العاملين (السكن الإداري)","سكن العاملين الجديد 2025 (C)","سكن العاملين الجديد 2025 (D)","سكن العاملين الجديد 2025 (E)","سكن العاملين الجديد 2025 (F)","سكن العاملين (سكن الجيزوارين)","سكن العاملين (سكن النخالين)","سكن القطاعات","سكن فاليو الجديد","سكن الكرفان"];
      }

      // تنظيم أسماء السكن (إصلاح فروق "غرفه C1" و "2025 (C)")
      let normalized = false;
      try { normalized = normalizeHousingData(); } catch (e) { console.error(e); }

      _pulledAt['_lastPull'] = new Date().toISOString();
      _lsSet('_pulledAt', JSON.stringify(_pulledAt));
      _takeSnapshot();
      syncStorage(true, true);

      // تحديث snapshot الدفع من الحالة المحلية الحالية
      const _allNow = getAllDataForSync();
      const _newSnap = {};
      Object.keys(_allNow).forEach(function (_k) { _newSnap[_k] = JSON.stringify(_allNow[_k]); });
      _lsSet('_lastPushSnapshot', JSON.stringify(_newSnap));

      // حفظ أسماء السكن المنظمة محلياً (تغيير حقيقي يُرفع في الدفعة القادمة)
      if (normalized) syncStorage();

      renderAll();
      try { if (typeof populateLoginDropdown === 'function') populateLoginDropdown(); } catch (e) {}
      try { if (typeof importBakeryFormData === 'function') importBakeryFormData(); } catch (e) {}
      try { if (typeof importMealWasteFormData === 'function') importMealWasteFormData(); } catch (e) {}
      try { if (typeof importDailyDataFormData === 'function') importDailyDataFormData(); } catch (e) {}
      try { if (typeof importMealSurveyFormData === 'function') importMealSurveyFormData(); } catch (e) {}
      syncLog('تم السحب بنجاح من السحابة');
      showSyncToast('تم سحب البيانات من السحابة بنجاح ✅');
    } catch (e) {
      syncLog('خطأ أثناء السحب: ' + e.message);
    } finally {
      _pullInProgress = false;
    }
  };

  // ============================================================
  //  تصدير الدوال المساعدة لكي تستخدمها بقية الملفات
  // ============================================================
  window._mergeSyncElements = _mergeSyncElements;
  window._mergeVacations = _mergeVacations;
  window.normalizeHousingData = normalizeHousingData;

  // تنظيم أسماء السكن عند بدء التشغيل (بدون سحابة)
  function runNormalizeOnLoad() {
    try {
      if (normalizeHousingData()) syncStorage();
    } catch (e) { console.error(e); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runNormalizeOnLoad);
  } else {
    runNormalizeOnLoad();
  }
})();