    // Check server on load and migrate data
    (function() {
      var el = document.getElementById('server-status');
      if (el) {
        el.innerHTML = 'تم حفظ البيانات بنجاح - جارٍ التحديث';
        el.style.color = '#f44336';
      }
    })();

    // تمت إزالة البيانات الأولية - سيتم التحميل من التخزين المحلي

    function _safeJsonParse(val, fallback) { 
      try { var r = JSON.parse(val); return (r !== null && r !== undefined) ? r : fallback; } catch(e) { return fallback; } 
    }

    // ====== IndexedDB for All Data (╪¿╪»┘è┘ä localStorage) ======
    var _idbReady = false;
    function _openIDB() {
      return new Promise(function(resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB عملية السحابة')); return; }
        // فتح بدون إصدار محدد لتجنب VersionError لو الإصدار الحالي أعلى
        var req = indexedDB.open('LinahSystemDB');
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('allData')) {
            db.createObjectStore('allData', { keyPath: 'key' });
          }
        };
        req.onsuccess = function(e) {
          var db = e.target.result;
          // شفاء ذاتي: لو المخزن مفقود رغم وجود القاعدة نرفع الإصدار قسرياً
          if (db.objectStoreNames && db.objectStoreNames.contains('allData')) {
            _idbReady = true; resolve(db); return;
          }
          var ver = (db.version || 0) + 1;
          try { db.close(); } catch (errClose) {}
          var req2 = indexedDB.open('LinahSystemDB', ver);
          req2.onupgradeneeded = function(e2) {
            var d2 = e2.target.result;
            if (!d2.objectStoreNames.contains('allData')) {
              d2.createObjectStore('allData', { keyPath: 'key' });
            }
          };
          req2.onsuccess = function(e2) { _idbReady = true; resolve(e2.target.result); };
          req2.onerror = function(e2) { reject(e2.target.error); };
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    }
    function _idbGet(key) {
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readonly');
          var store = tx.objectStore('allData');
          var req = store.get(key);
          req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
          req.onerror = function() { reject(req.error); };
        });
      });
    }
    function _idbSet(key, value) {
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readwrite');
          var store = tx.objectStore('allData');
          store.put({ key: key, value: value });
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function() { reject(tx.error); };
        });
      });
    }
    function _idbRemove(key) {
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readwrite');
          var store = tx.objectStore('allData');
          store.delete(key);
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function() { reject(tx.error); };
        });
      });
    }
    var finTransactions = []; var finBudgets = [];
    // السيرفر متصل السيرفر غير
    var _ALL_KEYS = [
      'employees','roomsCapacity','vacations','hospitalities','maintenanceRecords','septicRecords',
      'inventoryVouchers','excludedEmployees','periodicMaintenance','teaSugarDisbursements','teaSugarBatches',
      'mealLogs','inventoryItems','contractors','evaluations','evalTemplates','auditLog',
      'bakeryIngredients','bakeryProductions','bakeryContractorSupplies','bakeryInvoices','bakeryStockLog',
      'adminOvertime','roomAssets','archiveData','miniaAssets','waterStations','waterDocs','quickActions','dailyStats',
      'dynamicSectors','contractorSectors','contractorRooms','dynamicRooms','dynamicSeptics',
      'dynamicDepts','dynamicTitles','deptTitles','manualTotalBeds','syncDeletions','appUsers',
      'finTransactions','finBudgets','ingredientMaster','mealSurveys'
    ];
    // متصل بيانات تخزين بيانات IndexedDB محلي الموقع
    function _scheduleIDBBackup() {
      _idbScheduleSave();
    }
    function _idbSaveAll() {
      if (!window.indexedDB) return Promise.resolve();
      _idbScheduleSave();
      return Promise.resolve();
    }
    function _idbLoadAll() {
      if (!window.indexedDB) return Promise.resolve(false);
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readonly');
          var store = tx.objectStore('allData');
          /* try __ALL__ first (old format), then per-key */
          var req = store.get('__ALL__');
          req.onsuccess = function() {
            var data = req.result ? req.result.value : null;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              _ALL_KEYS.forEach(function(k) {
                if (data[k] !== undefined) {
                  var v = null; try { v = typeof getEntityVar === 'function' ? getEntityVar(k) : null; } catch(e) {}
                  if (v && Array.isArray(v) && v.length > 0) return;
                  if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) return;
                  if (typeof setEntityVar === 'function') setEntityVar(k, data[k]);
                }
              });
              resolve(true);
            } else {
              /* fallback: load from per-key cache into global vars */
              var allReq = store.getAll();
              allReq.onsuccess = function() {
                (allReq.result || []).forEach(function(item) {
                  if (item && item.key && item.key !== '__ALL__') {
                    var mappedKey = null;
                    for (var ki = 0; ki < _ALL_KEYS.length; ki++) {
                      var lsk = typeof getLSKey === 'function' ? getLSKey(_ALL_KEYS[ki]) : _ALL_KEYS[ki];
                      if (lsk === item.key || _ALL_KEYS[ki] === item.key) { mappedKey = _ALL_KEYS[ki]; break; }
                    }
                    if (mappedKey) {
                      var v2 = null; try { v2 = typeof getEntityVar === 'function' ? getEntityVar(mappedKey) : null; } catch(e) {}
                      if (v2 === null || v2 === undefined || (Array.isArray(v2) && v2.length === 0)) {
                        if (typeof setEntityVar === 'function') setEntityVar(mappedKey, item.value);
                      }
                    }
                  }
                });
                resolve(true);
              };
              allReq.onerror = function() { resolve(false); };
            }
          };
          req.onerror = function() { resolve(false); };
        });
      }).catch(function() { return false; });
    }
    // تم بيانات اكتشاف بيانات localStorage بيانات IndexedDB
    function _migrateAllToIDB() {
      if (_lsGet('_idbMigrated_v2')) return Promise.resolve();
      _ALL_KEYS.forEach(function(k) {
        try {
          var v = typeof getEntityVar === 'function' ? getEntityVar(k) : null;
          if (v !== undefined && v !== null) _idbCache[k] = v;
        } catch(e) {}
      });
      _idbScheduleSave();
      _lsSet('_idbMigrated_v2', '1');
      return Promise.resolve();
    }

    // ===== IndexedDB functions for waterDocs (large base64 files) =====
    var _waterDocsSaveTimer = null;
    function _doSaveWaterDocsToIDB() {
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readwrite');
          var store = tx.objectStore('allData');
          store.put({ key: 'waterDocs', value: waterDocs });
          tx.oncomplete = function() { resolve(); };
          tx.onerror = function() { reject(tx.error); };
        });
      }).catch(function(err) { console.warn('فشل حفظ مستندات المياه في IDB:', err); });
    }
    // حفظ مؤجل ومجمع: النداءات المتتالية خلال ثانية تُدمج في كتابة واحدة
    function _saveWaterDocsToIDB() {
      if (!window.indexedDB) return Promise.resolve();
      if (_waterDocsSaveTimer) clearTimeout(_waterDocsSaveTimer);
      return new Promise(function(resolve) {
        _waterDocsSaveTimer = setTimeout(function() {
          _waterDocsSaveTimer = null;
          resolve(_doSaveWaterDocsToIDB());
        }, 1000);
      });
    }

    function _loadWaterDocsFromIDB() {
      if (!window.indexedDB) return Promise.resolve([]);
      return _openIDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('allData', 'readonly');
          var store = tx.objectStore('allData');
          var req = store.get('waterDocs');
          req.onsuccess = function() {
            resolve(req.result ? req.result.value : []);
          };
          req.onerror = function() { resolve([]); };
        });
      }).catch(function() { return []; });
    }
    // ===== End waterDocs IndexedDB functions =====

    (function _cleanCorruptedLocalStorage() {
      var tx = _lsGet('_storageTx');
      if (tx === 'start') {
        _lsRemove('_storageTx');
        console.warn('حدث خطأ أثناء تحميل بيانات المياه (crash). يرجى إعادة المحاولة لاحقاً.');
      }
      if (_lsGet('_corruptionCleaned_v2')) return;
      var keys = ['lineh_employees','employees_db','lineh_rooms_capacity','rooms_db','lineh_vacations','lineh_hospitality','lineh_hospitality_bak','lineh_maintenance','lineh_septic','septic_db','lineh_inventory','excludedEmployees','lineh_periodic_maintenance','lineh_tea_sugar','lineh_tea_sugar_batches','lineh_meal_logs','lineh_inventory_items','lineh_contractors','dyn_sectors','ctr_sectors','ctr_rooms','dyn_rooms','dyn_septics','dyn_depts','dyn_titles','lineh_evaluations','lineh_eval_templates','lineh_users','linah_audit_log','linah_bakery_ingredients','linah_bakery_productions','linah_bakery_ctr_supplies','linah_bakery_invoices','linah_bakery_stock_log','lineh_admin_overtime','lineh_room_assets','lineh_archive_data','lineh_quick_actions','lineh_daily_stats','lineh_water_stations','lineh_water_docs'];
      keys.forEach(function(k) {
        try {
          var raw = _lsGet(k);
          if (!raw || !/\?{2,}/.test(raw)) return;
          var arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return;
          var before = arr.length;
          arr = arr.filter(function(item) {
            if (!item || typeof item !== 'object') return true;
            return !/\?{2,}/.test(JSON.stringify(item));
          });
          if (arr.length < before) _lsSet(k, JSON.stringify(arr));
        } catch(e) {}
      });
      _lsSet('_corruptionCleaned_v2', '1');
    })();

    /* Load IndexedDB data into memory cache before init */
    (function _loadIDBCache() {
      if (!window.indexedDB) return;
      _openIDB().then(function(_db) {
        try {
          var _tx = _db.transaction('allData', 'readonly');
          var _store = _tx.objectStore('allData');
          var _allReq = _store.getAll();
          _allReq.onsuccess = function() {
            var _items = _allReq.result || [];
            _items.forEach(function(_item) {
              if (_item && _item.key && _item.value !== undefined && _item.key !== '__ALL__') {
                _idbCache[_item.key] = _item.value;
              }
            });
          };
        } catch(_ee) {}
      }).catch(function() {});
    })();
