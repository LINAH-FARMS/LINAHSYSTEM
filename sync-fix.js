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
    // عناصر غير كائنات (نصوص/أرقام — قوائم السلسلات مثل أسماء البيارات)
    // تُعاد كما هي: Object.assign على نص كان يحوّله لمصفوفة حروف {0:'ب',1:'ي'}
    const localIsObj = localItem && typeof localItem === 'object';
    const remoteIsObj = remoteItem && typeof remoteItem === 'object';
    if (!localIsObj && !remoteIsObj) return localItem;
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

  // قراءة السحابة بتقسيم جديد: صفوف ent:* (صف صغير لكل جدول — المصدر الأساسي)
  // + صف alldata القديم للتوافق (نُستخدم قيمه فقط للجداول التي لا يوجد لها صف ent)
  // المزامنة الجزئية الذكية: بدلاً من سحب data كل الجداول في كل مرة، نفحص
  // أولاً قائمة خفيفة (id + updated_at فقط — بضعة كيلوبايت) ثم نسحب البيانات
  // الكاملة فقط للجداول التي تغيرت فعلاً (أو أول مرة/عند فقدان الكاش).
  const _ENT_TS_KEY = '_cloudEntTs';
  function _entTsCache() {
    try { return JSON.parse(_lsGet(_ENT_TS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function _saveEntTsCache(c) {
    try { _lsSet(_ENT_TS_KEY, JSON.stringify(c)); } catch (e) {}
  }
  async function _readCloudMerge() {
    const out = { data: {}, cloudMs: 0 };
    const h = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };
    const tsCache = _entTsCache();
    const newCache = Object.assign({}, tsCache);
    let rows = [];
    try {
      const haveCache = Object.keys(tsCache).length > 0;
      if (haveCache) {
        // ---------- الوضع الجزئي: فحص خفيف ثم سحب المتغير فقط ----------
        let meta = [];
        let alldataMeta = null;
        const rL = await fetch(_sbEndpoint + '?select=id,updated_at&id=like.ent:%25&order=updated_at.desc&limit=100', { method: 'GET', headers: h, mode: 'cors' });
        if (rL.ok) { try { meta = await rL.json(); } catch (e) { meta = []; } }
        const rA = await fetch(_sbEndpoint + '?id=eq.alldata&select=id,updated_at', { method: 'GET', headers: h, mode: 'cors' });
        if (rA.ok) { try { const arr = await rA.json(); alldataMeta = arr && arr[0] ? arr[0] : null; } catch (e) { alldataMeta = null; } }
        const changedIds = [];
        let maxCloudMs = 0;
        (meta || []).forEach(function (row) {
          if (!row || !row.id || row.id.indexOf('ent:') !== 0) return;
          const t = Date.parse(row.updated_at || '');
          if (!isNaN(t) && t > maxCloudMs) maxCloudMs = t;
          if (tsCache[row.id] !== row.updated_at) changedIds.push(row.id);
        });
        if (alldataMeta) {
          const t = Date.parse(alldataMeta.updated_at || '');
          if (!isNaN(t) && t > maxCloudMs) maxCloudMs = t;
          if (tsCache['alldata'] !== alldataMeta.updated_at) changedIds.push('alldata');
        }
        out.cloudMs = maxCloudMs;
        // سحب data فقط للصفوف المتغيرة — متتابع لتفادي قطع الاتصال
        for (let i = 0; i < changedIds.length; i++) {
          const cid = changedIds[i];
          try {
            const rr = await fetch(_sbEndpoint + '?id=eq.' + encodeURIComponent(cid) + '&select=id,data,updated_at', { method: 'GET', headers: h, mode: 'cors' });
            if (rr.ok) {
              const arr = await rr.json();
              const row = arr && arr[0];
              if (row && row.id) rows.push(row);
            } else {
              syncLog('فشل سحب ' + cid + ' (' + rr.status + ')');
            }
          } catch (e) { syncLog('انقطاع أثناء سحب ' + cid + ': ' + e.message); }
        }
        (rows || []).forEach(function (row) { if (row && row.id && row.updated_at) newCache[row.id] = row.updated_at; });
        _saveEntTsCache(newCache);
      } else {
        // ---------- أول مرة أو فقدان الكاش: السحب الكامل المعهود ----------
        const r1 = await fetch(_sbEndpoint + '?id=like.ent:%25&select=id,data,updated_at&order=updated_at.desc&limit=100', { method: 'GET', headers: h, mode: 'cors' });
        const r2 = await fetch(_sbEndpoint + '?id=eq.alldata&select=id,data,updated_at', { method: 'GET', headers: h, mode: 'cors' });
        if (r1.ok) { try { rows = (await r1.json()) || []; } catch (e) { rows = []; } }
        if (r2.ok) {
          try {
            const arr = await r2.json();
            (arr || []).forEach(function (row) { if (row && row.id === 'alldata') rows.push(row); });
          } catch (e) {}
        }
        (rows || []).forEach(function (row) {
          if (!row || !row.id || !row.updated_at) return;
          newCache[row.id] = row.updated_at;
          const t = Date.parse(row.updated_at || '');
          if (!isNaN(t) && t > out.cloudMs) out.cloudMs = t;
        });
        _saveEntTsCache(newCache);
      }
      // ---------- البناء المشترك: من الصفوف المسحوبة فعلاً ----------
      (rows || []).forEach(function (row) {
        if (!row || !row.data || row.id.indexOf('ent:') !== 0) return;
        let val = null;
        try { val = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch (e) { val = null; }
        if (val === null || val === undefined) return;
        out.data[row.id.slice(4)] = val;
      });
      // سجل الحذف المعروف: أي عنصر بمفتاح محذوف لا يعود أبداً عبر alldata
      const delSet = {};
      try {
        (window.syncDeletions || syncDeletions || []).forEach(function (d) {
          if (d && d.entity && d.key) delSet[d.entity + '\u0000' + d.key] = true;
        });
      } catch (e) {}
      (rows || []).forEach(function (row) {
        if (!row || row.id !== 'alldata' || !row.data) return;
        const t = Date.parse(row.updated_at || '');
        if (!isNaN(t) && t > out.cloudMs) out.cloudMs = t;
        let obj = null;
        try { obj = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch (e) { obj = null; }
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(function (k) {
          const entVal = out.data[k];
          if (entVal === undefined) {
            out.data[k] = Array.isArray(obj[k]) ? obj[k].filter(function (it) {
              if (it === null || it === undefined) return false;
              return !delSet[k + '\u0000' + _entityKey(it, k)];
            }) : obj[k];
            return;
          }
          if (Array.isArray(entVal) && Array.isArray(obj[k])) {
            const byKey = {};
            function _put(it) {
              if (it === null || it === undefined) return;
              const key = _entityKey(it, k);
              if (delSet[k + '\u0000' + key]) return;
              if (!byKey[key]) { byKey[key] = it; return; }
              byKey[key] = _pickNewer(byKey[key], it, TIE_REMOTE);
            }
            (obj[k] || []).forEach(_put);
            (entVal || []).forEach(_put);
            out.data[k] = Object.keys(byKey).map(function (key) { return byKey[key]; });
          }
        });
      });
    } catch (e) { syncLog('قراءة السحابة فشلت: ' + e.message); }
    return out;
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
  //  قوائم الأسماء (البيارات، المخازن، الأقسام...): اتحاد فقط — لا تنقص أبداً
  // ============================================================
  const NAME_LIST_KEYS = ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames','dynamicStores','deptTitles'];
  function _mergeNameLists(localArr, remoteArr, entity, delKeys) {
    const out = [];
    const seen = {};
    const del = (delKeys && typeof delKeys === 'object') ? delKeys : null;
    [remoteArr, localArr].forEach(function (arr) {
      (arr || []).forEach(function (x) {
        if (typeof x !== 'string') return;
        const s = x.trim();
        if (s.length < 2 || seen[s] || (del && del[s])) return;
        seen[s] = true;
        out.push(s);
      });
    });
    return out;
  }

  // ============================================================
  //  pushToSupabase — دفع مع دمج على مستوى العنصر (الأحدث يفوز)
  // ============================================================
  window.pushToSupabase = async function pushToSupabase(silent) {
    if (!supabaseConnected) {
      if (!silent) showSyncToast('غير متصل بـ Supabase');
      return false;
    }
    while (_pushInProgress) { await new Promise(function (r) { setTimeout(r, 300); }); }
    _pushInProgress = true;
    try {
      const ts = new Date().toISOString();
      const allData = getAllDataForSync();

      // قراءة أحدث نسخة من السحابة للدمج (صفوف ent:* + alldata للتوافق)
      const remoteRead = await _readCloudMerge();
      let remote = Object.keys(remoteRead.data).length > 0 ? remoteRead.data : null;

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
        if (k === 'waterDocs') return; // تُدار في صفوف منفصلة (حماية من الفقدان)
        const val = allData[k];
        if (Array.isArray(val)) {
          const remoteArr = remote && Array.isArray(remote[k]) ? remote[k] : null;
          if (k === 'vacations') {
            mergedPayload[k] = _mergeVacations(val, remoteArr, TIE_LOCAL, delByEntity[k] || {});
          } else if (NAME_LIST_KEYS.indexOf(k) !== -1) {
            mergedPayload[k] = _mergeNameLists(val, remoteArr, k, delByEntity[k] || {});
          } else {
            mergedPayload[k] = _mergeSyncElements(val, remoteArr, k, delByEntity[k] || {}, TIE_LOCAL);
          }
        } else {
          mergedPayload[k] = val;
        }
      });

      // الرفع بتقسيم جديد: صف صغير مستقل لكل جدول متغير (ent:<key>) —
      // لا يتجاوز أي طلب حمولة السيرفر، فلا يعود خطأ 500 أبداً
      let _snapLocal = {};
      try { _snapLocal = JSON.parse(_lsGet('_lastPushSnapshot') || '{}'); } catch (e) { _snapLocal = {}; }
      const _hasSnap = Object.keys(_snapLocal).length > 0;
      const _changedKeys = [];
      Object.keys(mergedPayload).forEach(function (k) {
        if (k === 'incident_reports' || k === 'waterDocs') return;
        if (!_hasSnap || JSON.stringify(mergedPayload[k]) !== _snapLocal[k]) _changedKeys.push(k);
      });
      let _entErrors = 0;
      for (let ci = 0; ci < _changedKeys.length; ci++) {
        const _ck = _changedKeys[ci];
        try {
          const up = await fetch(_sbEndpoint, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ id: 'ent:' + _ck, data: mergedPayload[_ck], updated_at: ts, device_id: _deviceId })
          });
          if (!up.ok) { _entErrors++; syncLog('فشل رفع ' + _ck + ' (HTTP ' + up.status + ')'); }
        } catch (e) { _entErrors++; syncLog('خطأ رفع ' + _ck + ': ' + e.message); }
      }
      // توافق قديم غير حرج: محاولة تحديث صف alldata الكامل مرة واحدة فقط
      // عند أول مزامنة لجهاز جديد — بعدها تُدار البيانات من صفوف ent:
      // المنفصلة (توفير كامل للاستهلاك ولا تكرار لرفع 10 ميجا كل دورة)
      if (!_hasSnap) {
        try {
          const upResp = await fetch(_sbEndpoint, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ id: 'alldata', data: mergedPayload, updated_at: ts, device_id: _deviceId })
          });
          if (!upResp.ok) syncLog('رفع alldata الكامل غير ممكن (' + upResp.status + ') — البيانات محفوظة في صفوف ent: المنفصلة');
        } catch (e) { syncLog('رفع alldata الكامل فشل: ' + e.message); }
      }
      try { await pushWaterDocsToCloud(); } catch (e) { console.error('pushWaterDocsToCloud:', e); }

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
      if (!silent) showSyncToast('تم رفع البيانات إلى Supabase بنجاح ✅');
    } catch (e) {
      syncLog('فشل الرفع: ' + e.message);
      if (!silent) showSyncToast('تعذر رفع البيانات إلى Supabase');
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
  window.pullFromSupabase = async function pullFromSupabase(silent) {
    if (!supabaseConnected) return;
    while (_pullInProgress) { await new Promise(function (r) { setTimeout(r, 300); }); }
    _pullInProgress = true;
    try {
      const remoteRead = await _readCloudMerge();
      const cloudMs = remoteRead.cloudMs;
      const remoteData = remoteRead.data;

      // تطبيق الحذف القادم من السحابة دائماً (حتى لو لم تتغير بيانات أخرى)
      const pendingDeletions = syncDeletions.slice();
      const remoteDels = Array.isArray(remoteData.syncDeletions) ? remoteData.syncDeletions : [];
      syncDeletions = pendingDeletions.concat(remoteDels);
      _applyDeletions();
      _lsSet('lineh_sync_deletions', JSON.stringify(syncDeletions));

      if (Object.keys(remoteData).length === 0) {
        _pulledAt['_lastPull'] = new Date().toISOString();
        _lsSet('_pulledAt', JSON.stringify(_pulledAt));
        return;
      }

      // الدمج عنصر-بعنصر (الأحدث modifiedAt يفوز) يحفظ التعديلات المحلية
      // مهما كانت تواريخها، فلا حاجة لحارس منع السحب القديم — كان يمنع
      // وصول تعديلات/إضافات/حذف الأجهزة الأخرى فيبقى الجهاز المحلي على
      // نسخة قديمة (مثل اختلاف عدد القوة بين البرنامج والفورم الخارجي).
      {
        // مفاتيح الحذف: أي سجل محذوف محلياً أو من جهاز آخر لا يُرجِع من السحابة
        const pullDelKeys = {};
        syncDeletions.forEach(function (d) {
          if (!d || !d.entity) return;
          if (!pullDelKeys[d.entity]) pullDelKeys[d.entity] = {};
          pullDelKeys[d.entity][d.key] = true;
        });
        Object.keys(remoteData).forEach(function (k) {
          if (k === 'syncDeletions') return;
          if (k === 'waterDocs') return; // تُدمج من صفوفها المنفصلة (حماية)
          const v = remoteData[k];
          if (typeof v === 'undefined' || v === null) return;
          const localVal = getEntityVar(k);
          if (Array.isArray(v) && Array.isArray(localVal)) {
            if (k === 'vacations') {
              setEntityVar(k, _mergeVacations(localVal, v, TIE_REMOTE, pullDelKeys[k] || {}));
            } else if (NAME_LIST_KEYS.indexOf(k) !== -1) {
              setEntityVar(k, _mergeNameLists(localVal, v, k, pullDelKeys[k] || {}));
            } else {
              setEntityVar(k, _mergeSyncElements(localVal, v, k, pullDelKeys[k] || {}, TIE_REMOTE));
            }
          } else {
            setEntityVar(k, v);
          }
        });
        // إعادة تطبيق الحذف بعد الدمج: السجل المحذوف لا يعود أبداً
        _applyDeletions();
        syncLog('تم سحب ' + Object.keys(remoteData).length + ' عنصر من Supabase');
        try { await pullWaterDocsFromCloud(true); } catch (e) { console.error('pullWaterDocsFromCloud:', e); }
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
        bakeryContractorsNames: [],
        dynamicStores: []
      };
      ['dynamicSeptics','dynamicRooms','dynamicDepts','dynamicTitles','dynamicSectors','dynamicVisitorTypes','contractorSectors','contractorRooms','bakeryContractorsNames','dynamicStores'].forEach(function (k) {
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
      if (!silent) showSyncToast('تم سحب البيانات من السحابة بنجاح ✅');
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
  window._mergeNameLists = _mergeNameLists;
  window.NAME_LIST_KEYS = NAME_LIST_KEYS;
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

  // ============================================================
  //  الفتح المباشر من السحابة: عند فتح الصفحة دائماً نأخذ أحدث
  //  نسخة من السحابة (مصدر الحقيقة) ونمسح الكاش القديم للكيانات
  //  حتى لا يتأثر النظام ببيانات قديمة. عند انقطاع الإنترنت يفتح
  //  البيانات المحفوظة محلياً (كبديل آمن وليس صفحة فارغة).
  // ============================================================
  const _CACHE_KEYS = [
    'lineh_employees', 'lineh_rooms_capacity', 'lineh_vacations', 'lineh_hospitality',
    'lineh_maintenance', 'lineh_septic', 'lineh_inventory', 'lineh_periodic_maintenance',
    'lineh_tea_sugar', 'lineh_tea_sugar_batches', 'lineh_meal_logs', 'lineh_inventory_items',
    'lineh_contractors', 'lineh_users'
  ];

  window.autoPullOnLoad = async function autoPullOnLoad() {
    try {
      if (!supabaseConnected) return;
      const remoteRead = await _readCloudMerge();
      const remoteData = remoteRead.data;
      if (Object.keys(remoteData).length === 0) return;

      // 1) استبدال كل الكيانات في الذاكرة بنسخة السحابة
      const loadDelKeys = {};
      syncDeletions.forEach(function (d) {
        if (!d || !d.entity) return;
        if (!loadDelKeys[d.entity]) loadDelKeys[d.entity] = {};
        loadDelKeys[d.entity][d.key] = true;
      });
      Object.keys(remoteData).forEach(function (k) {
        if (k === 'syncDeletions') return;
        if (k === 'waterDocs') return; // تُدمج من صفوفها المنفصلة ولا تُستبدل أبداً
        if (k === 'vacations') {
          try {
            const lv = getEntityVar('vacations');
            if (Array.isArray(lv) && Array.isArray(remoteData[k])) {
              setEntityVar('vacations', _mergeVacations(lv, remoteData[k], TIE_REMOTE, loadDelKeys[k] || {}));
              return;
            }
          } catch (e) {}
        }
        try { setEntityVar(k, remoteData[k]); } catch (e) {}
      });
      // 1b) دمج مستندات المياه اتحادياً (لا حذف أبداً إلا بضغطة المستخدم)
      try { await pullWaterDocsFromCloud(true); } catch (e) {}
      try { await pushWaterDocsToCloud(); } catch (e) {}
      // 2) ضمان وجود مدير النظام دائماً (السحابة حالياً بلا مستخدمين)
      if (Array.isArray(appUsers)) {
        const hasAdmin = appUsers.some(function (u) { return u && u.name === 'مدير النظام'; });
        if (!hasAdmin) {
          appUsers.push({ name: 'مدير النظام', role: 'admin', passHash: (typeof hashPass === 'function') ? hashPass('admin123') : '' });
        }
      }
      // 3) مسح الكاش القديم المخزن محلياً
      _CACHE_KEYS.forEach(function (k) { try { _lsRemove(k); } catch (e) {} });
      // 4) المعالجات اللاحقة (حذف + تكرار + سكن)
      try { _applyDeletions(); } catch (e) {}
      try { deduplicateAfterSync(); } catch (e) {}
      try { normalizeHousingData(); } catch (e) {}
      // 5) حفظ الحالة الجديدة محلياً (إعادة بناء الكاش من السحابة)
      try { syncStorage(true, true); } catch (e) {}
      // 6) إعادة رسم كل شيء
      try { renderAll(); } catch (e) {}
      try { if (typeof populateLoginDropdown === 'function') populateLoginDropdown(); } catch (e) {}
      try { if (typeof importBakeryFormData === 'function') importBakeryFormData(); } catch (e) {}
      try { if (typeof importMealWasteFormData === 'function') importMealWasteFormData(); } catch (e) {}
      try { if (typeof importDailyDataFormData === 'function') importDailyDataFormData(); } catch (e) {}
      try { if (typeof importMealSurveyFormData === 'function') importMealSurveyFormData(); } catch (e) {}
      showSyncToast('تم فتح أحدث البيانات من السحابة ✅');
    } catch (e) {
      console.error('autoPullOnLoad:', e);
      showSyncToast('غير متصل — تم فتح البيانات المحفوظة محلياً');
    }
  };

  // الانتظار حتى يكتمل التحميل والرسم الأول ثم الفتح من السحابة
  window.addEventListener('load', function () {
    setTimeout(autoPullOnLoad, 1500);
  });

  // ============================================================
  //  مزامنة تلقائية دورية (كل 30 ثانية) — اقتصادية جداً في استهلاك
  //  الإنترنت:
  //  1) دفع التعديلات المحلية غير المرفوعة أولاً (مقارنة محلية بلا شبكة)
  //  2) ثم سحب — إن دفعنا نقوم بسحب فوراً لالتقاط تعديلات الأجهزة الأخرى
  //     (الدمج عنصر-بعنصر يحفظ التعديلات المحلية في كلا الحالتين)
  //  3) بدون تغيير محلي: فحص خفيف (updated_at فقط) وسحب مرة واحدة فقط
  //     لو النسخة السحابية أحدث من آخر سحب.
  //  بلا مزامنة كاملة كل دورة، استهلاك البيانات يبقى بضعة كيلوبايتات
  //  في اليوم، والسحب الكامل (3MB تقريباً) يحدث فقط عند تغيير حقيقي.
  // ============================================================
  setInterval(function () {
    if (!supabaseConnected) return;
    (async function () {
      let pushed = false;
      try {
        const allNow = getAllDataForSync();
        const snap = JSON.parse(_lsGet('_lastPushSnapshot') || '{}');
        let changed = Object.keys(snap).length === 0;
        for (const k in allNow) {
          if (snap[k] !== JSON.stringify(allNow[k])) { changed = true; break; }
        }
        if (changed) { await window.pushToSupabase(true); pushed = true; }
      } catch (e) {}
      try {
        if (pushed) {
          await window.pullFromSupabase(true);
        } else {
          const resp = await fetch(_sbEndpoint + '?select=id,updated_at&order=updated_at.desc&limit=200', {
            method: 'GET',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
            mode: 'cors'
          });
          if (resp.ok) {
            const rows = await resp.json();
            let cloudMs = 0;
            (rows || []).forEach(function (row) {
              if (!row) return;
              if (row.id !== 'alldata' && row.id.indexOf('ent:') !== 0) return;
              const t = Date.parse(row.updated_at || '');
              if (!isNaN(t) && t > cloudMs) cloudMs = t;
            });
            let lastMs = 0;
            try { lastMs = Date.parse((_pulledAt && (_pulledAt['_lastPull'] || _pulledAt['_lastPush'])) || '') || 0; } catch (e) {}
            if (cloudMs > lastMs + 1000) await window.pullFromSupabase(true);
          }
        }
      } catch (e) {}
    })();
  }, 30000);

  // ============================================================
  //  مستندات محطات المياه — مزامنة محمية من الفقدان نهائياً:
  //  كل مستند في صف مستقل (id=waterdocs:<docId>) حتى لا تتخطى
  //  حمولة البيانات حد السيرفر، والسحب دمج اتحادي (union):
  //  أي مستند موجود محلياً أو في السحابة يتم الإبقاء عليه،
  //  والحذف يتم فقط بضغطة المستخدم على زر الحذف.
  // ============================================================
  function _waterDocKey(d) { return (d && d.id) || ((d && d.station) + '|' + (d.fileName || '')); }
  function _waterDocRowId(d) { return 'waterdocs:' + _waterDocKey(d); }

  window._waterDocDeletes = function () {
    try { return JSON.parse(_lsGet('lineh_waterdocs_deleted') || '[]'); } catch (e) { return []; }
  };
  window._saveWaterDocDeletes = function (arr) {
    _lsSet('lineh_waterdocs_deleted', JSON.stringify(arr));
  };

  window.pushWaterDocsToCloud = async function pushWaterDocsToCloud() {
    if (!supabaseConnected || !Array.isArray(waterDocs) || waterDocs.length === 0) return;
    for (var wdi = 0; wdi < waterDocs.length; wdi++) {
      var d = waterDocs[wdi];
      if (!d) continue;
      var key = _waterDocKey(d);
      if (_waterDocDeletes().indexOf(key) !== -1) continue;
      try {
        var resp = await fetch(_sbEndpoint, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: _waterDocRowId(d), data: d, updated_at: new Date().toISOString(), device_id: _deviceId })
        });
        if (!resp.ok) syncLog('فشل رفع مستند مياه (' + resp.status + '): ' + (d.fileName || ''));
      } catch (e) { syncLog('خطأ رفع مستند مياه: ' + e.message); }
    }
  };

  window.pullWaterDocsFromCloud = async function pullWaterDocsFromCloud(silent) {
    if (!supabaseConnected) return;
    try {
      let resp = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          resp = await fetch(_sbEndpoint + '?select=id,data,updated_at&id=like.waterdocs%25&order=updated_at.desc&limit=500', {
            method: 'GET',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          });
          if (resp && resp.ok) break;
          syncLog('فشل سحب مستندات المياه (' + (resp ? resp.status : 'شبكة') + ') — محاولة ' + (attempt + 1) + '/3');
        } catch (e) { syncLog('انقطاع الشبكة بسحب المستندات — محاولة ' + (attempt + 1) + '/3'); }
        await new Promise(function (r) { setTimeout(r, 2000 * (attempt + 1)); });
      }
      if (!resp || !resp.ok) return;
      const rows = await resp.json();
      if (!rows || !Array.isArray(rows)) return;
      const cloudByKey = {};
      const delKeys = {};
      _waterDocDeletes().forEach(function (k) { delKeys[k] = true; });
      rows.forEach(function (r) {
        if (!r || !r.data) return;
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        if (!d) return;
        const k = _waterDocKey(d);
        if (delKeys[k]) return;
        if (!cloudByKey[k]) cloudByKey[k] = d;
        else if (Date.parse(d.uploadedAt || 0) > Date.parse(cloudByKey[k].uploadedAt || 0)) cloudByKey[k] = d;
      });
      const localByKey = {};
      (waterDocs || []).forEach(function (d) { if (d) localByKey[_waterDocKey(d)] = d; });
      let added = 0, kept = 0;
      const merged = [];
      Object.keys(localByKey).forEach(function (k) {
        const l = localByKey[k];
        const c = cloudByKey[k];
        if (c && Date.parse(c.uploadedAt || 0) > Date.parse(l.uploadedAt || 0)) { merged.push(Object.assign({}, l, c)); kept++; }
        else { merged.push(l); }
      });
      Object.keys(cloudByKey).forEach(function (k) {
        if (!localByKey[k]) { merged.push(cloudByKey[k]); added++; }
      });
      if (added > 0 || kept > 0) {
        waterDocs = merged;
        try { syncStorage(true, true); } catch (e) {}
        try { _saveWaterDocsToIDB(); } catch (e) {}
        try { if (typeof renderWaterDocs === 'function') renderWaterDocs(); } catch (e) {}
        try { if (typeof renderWaterStations === 'function') renderWaterStations(); } catch (e) {}
        if (!silent) showSyncToast('تم تحديث ' + (added + kept) + ' مستند مياه من السحابة ✅');
      }
    } catch (e) { console.error('pullWaterDocsFromCloud:', e); }
  };

  // السحب يدوي عند فتح التبويب + إعادة الرفع للمستندات المفقودة
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && supabaseConnected) {
      setTimeout(function () { try { pullWaterDocsFromCloud(true); } catch (e) {} }, 1500);
    }
  });

  // ============================================================
  //  الإكمال التلقائي للبيانات اليومية:
  //  أي يوم مضى (حتى 7 أيام) بدون سجل وجبات (فطار/غداء/عشاء)
  //  أو بدون سجل هدر — يُكمل النظام السجلات تلقائياً بعدد
  //  الموظفين الحاضرين في ذلك اليوم (من الإحصاء اليومي أو من
  //  الحاضرين حالياً)، ويرقّمها autoFilled لكي تُعامل كناقصة
  //  ويُفضل تعديلها يدوياً في أي وقت. اليوم الحالي لا يُلمس
  //  (يتكفل به autoLogTodayMeals أثناء ساعات اليوم).
  // ============================================================
  const _AUTO_DAYS_BACK = 7;

  window.autoCompleteMissedDaily = function autoCompleteMissedDaily() {
    try {
      var mealLogDateKey = function (l) { return normalizeDateStr(l.date); };
      var wasteKey = function (w) { return normalizeDateStr(w.date) + '|' + (w.meal || ''); };
      var changed = false;
      var now = new Date();
      for (var i = 1; i <= _AUTO_DAYS_BACK; i++) {
        var when = new Date(now.getTime() - i * 86400000);
        var d = normalizeDateStr(when.toISOString().split('T')[0]);
        if (!d || d.length !== 10) continue;

        // عدد الحاضرين لهذا اليوم: من الإحصائيات اليومية إن وجدت
        var count = 0;
        try {
          var ds = dailyStats.filter(function (s) { return normalizeDateStr(s.date) === d; });
          if (ds.length) {
            var last = ds[ds.length - 1];
            count = (parseInt(last.permP) || 0) + (parseInt(last.casP) || 0);
          }
        } catch (e) {}
        if (count <= 0) count = employees.filter(function (e) { return e.status === 'P'; }).length;
        if (count <= 0) continue;

        // 1) وجبات اليوم
        var hasMeal = mealLogs.some(function (l) { return mealLogDateKey(l) === d; });
        if (!hasMeal) {
          mealLogs.push({
            date: d, breakfast: count, lunch: count, dinner: count,
            guestBf: 0, guestLh: 0, guestDn: 0,
            autoGenerated: true, autoFilled: true, chef: '',
            modifiedAt: new Date().toISOString()
          });
          try {
            syncDeletions = syncDeletions.filter(function (x) { return !(x.entity === 'mealLogs' && x.key === d); });
          } catch (e) {}
          changed = true;
        }

        // 2) سجلات الهدر للوجبات الثلاث
        ['فطار', 'غداء', 'عشاء'].forEach(function (meal) {
          var hasWaste = mealWaste.some(function (w) { return wasteKey(w) === d + '|' + meal; });
          if (hasWaste) return;
          var createdAt = new Date().toISOString();
          mealWaste.push({
            date: d, meal: meal, chef: '', ingredients: [],
            totalPrepared: 0, wasteEng: 0, wasteWrk: 0, cost: 0, responsible: '',
            engAte: 0, engTakeaway: 0, wrkAte: 0, wrkTakeaway: 0, guests: 0,
            wasteGuests: 0, waterAdded: 0, gasCost: 0, salaryCost: 0, prepWaste: 0,
            autoGenerated: true, autoFilled: true,
            createdAt: createdAt
          });
          try { _removeDeletion('mealWaste', d + '|' + meal + '|' + createdAt); } catch (e) {}
          changed = true;
        });
      }
      if (changed) {
        syncStorage();
        try { renderAll(); } catch (e) {}
        try { if (typeof renderMealWasteTable === 'function') renderMealWasteTable(); } catch (e) {}
        try { if (typeof renderMealWasteStats === 'function') renderMealWasteStats(); } catch (e) {}
        showSyncToast('تم إكمال بيانات الأيام الماضية تلقائياً (سجلات مرقمة تلقائياً)');
      }
    } catch (e) {
      console.error('autoCompleteMissedDaily:', e);
    }
  };

  // تشغيل الإكمال بعد فتح السحابة + دورياً كل 30 دقيقة + عند رجوع الصفحة
  setTimeout(autoCompleteMissedDaily, 4000);
  setInterval(autoCompleteMissedDaily, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) setTimeout(autoCompleteMissedDaily, 2000);
  });
})();