    var _memoryStorage = {};
    var _localStorageBlocked = false;
    var _idbCache = {};
    var _idbSaveTimer = null;
    function _checkLocalStorage() { try { var _t = '_test_' + Date.now(); localStorage.setItem(_t, '1'); localStorage.removeItem(_t); _localStorageBlocked = false; } catch(e) { _localStorageBlocked = true; } }
    function _idbScheduleSave() { if (_idbSaveTimer) clearTimeout(_idbSaveTimer); _idbSaveTimer = setTimeout(function() { _idbSaveTimer = null; _flushIDBCache(); }, 2000); }
    function _flushIDBCache() { if (!window.indexedDB) return; _openIDB().then(function(db) { try { var tx = db.transaction('allData', 'readwrite'); var store = tx.objectStore('allData'); for (var _k in _idbCache) { try { store.put({ key: _k, value: _idbCache[_k] }); } catch(_ee) {} } } catch(_e) {} }).catch(function() {}); }
    function _lsGet(key) { if (_idbCache.hasOwnProperty(key)) return _idbCache[key]; try { return localStorage.getItem(key); } catch(e) { _localStorageBlocked = true; return _memoryStorage[key] || null; } }
    function _lsSet(key, val) { _idbCache[key] = val; try { localStorage.setItem(key, val); } catch(e) { _localStorageBlocked = true; _memoryStorage[key] = val; } _idbScheduleSave(); }
    function _lsRemove(key) { delete _idbCache[key]; try { localStorage.removeItem(key); } catch(e) { _localStorageBlocked = true; delete _memoryStorage[key]; } _idbScheduleSave(); }
    function _lsGetKey(index) { try { return localStorage.key(index); } catch(e) { _localStorageBlocked = true; var keys = Object.keys(_memoryStorage); return keys[index] || null; } }
    _checkLocalStorage();
    window.onerror = function(msg, src, line, col, err) { try { console.error('خطأ عام غير متوقع:', msg, '|', (src||'').split('/').pop(), (line||'') + ':' + (col||''), err); } catch(_e) {} return false; };
    function _safe(fn) { try { if (typeof fn === 'function') fn(); } catch(e) { console.error('render error in ' + (fn && fn.name ? fn.name : 'fn') + ':', e); } }
  (function(){
    var v='3.1';
    var s=_lsGet('_codeVersion');
    if(s&&s!==v){
      try {
        var _bak = {};
        for (var _i = 0; _i < localStorage.length; _i++) {
          var _k = _lsGetKey(_i);
          if (_k !== '_codeVersion') _bak[_k] = _lsGet(_k);
        }
        _lsSet('_preUpdateBackup_' + s, JSON.stringify(_bak));
      } catch(_e) {}
      _lsSet('_codeVersion', v);
    } else {
      _lsSet('_codeVersion', v);
    }
  })();