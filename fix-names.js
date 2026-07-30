function normalizeName(n) {
  if (!n || typeof n !== 'string') return '';
  return n.trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .toLowerCase();
}

function normalizeNameFlat(n) {
  return normalizeName(n).replace(/\s+/g, '');
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  var na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return true;
  var fa = normalizeNameFlat(a), fb = normalizeNameFlat(b);
  if (fa === fb) return true;
  if (fa.indexOf(fb) !== -1 || fb.indexOf(fa) !== -1) return true;
  return false;
}

function findBestName(name, allNames) {
  var best = name;
  allNames.forEach(function(n) {
    if (!n) return;
    if (namesMatch(n, best) && n.length > best.length) best = n;
  });
  return best;
}

function unifyContractorNames() {
  if (typeof bakeryContractorSupplies === 'undefined' || !bakeryContractorSupplies) return;
  if (typeof bakeryContractorsNames !== 'undefined' && bakeryContractorsNames && bakeryContractorsNames.length < 6) {
    bakeryContractorsNames = ["محمد شعبان","ممدوح بكر","عاطف عبد المغيث","مصطفى على","اسامه سمير","فارس محمد"];
    _lsSet('linah_bakery_contractors_names', JSON.stringify(bakeryContractorsNames));
  }
  var allNames = [], nameIdx = {};
  bakeryContractorSupplies.forEach(function(r) {
    if (r && r.name && !nameIdx[r.name]) { nameIdx[r.name] = true; allNames.push(r.name); }
  });
  if (typeof bakeryContractorsNames !== 'undefined' && bakeryContractorsNames) {
    bakeryContractorsNames.forEach(function(n) {
      if (n && !nameIdx[n]) { nameIdx[n] = true; allNames.push(n); }
    });
  }
  if (typeof _selectedContractors !== 'undefined' && _selectedContractors) {
    _selectedContractors.forEach(function(n) {
      if (n && !nameIdx[n]) { nameIdx[n] = true; allNames.push(n); }
    });
  }
  var nameMap = {};
  allNames.forEach(function(n) {
    var norm = normalizeNameFlat(n);
    if (!nameMap[norm] || n.length > nameMap[norm].length) nameMap[norm] = n;
  });
  var changes = 0;
  bakeryContractorSupplies.forEach(function(r) {
    if (!r || !r.name) return;
    var best = findBestName(r.name, allNames);
    best = nameMap[normalizeNameFlat(best)] || best;
    if (best && r.name !== best) { changes++; r.name = best; }
  });
  if (typeof _selectedContractors !== 'undefined' && _selectedContractors) {
    _selectedContractors.forEach(function(n, i, arr) {
      var best = findBestName(n, allNames);
      best = nameMap[normalizeNameFlat(best)] || best;
      if (best && best !== n) arr[i] = best;
    });
    var seen = {};
    _selectedContractors = _selectedContractors.filter(function(n) { if (seen[n]) return false; seen[n] = true; return true; });
  }
  if (changes > 0) {
    syncStorage();
    if (typeof renderBakeryContractorSupplies === 'function') renderBakeryContractorSupplies();
    if (typeof updateBreadSupplyStats === 'function') updateBreadSupplyStats();
    if (typeof updateBakeryStats === 'function') updateBakeryStats();
    if (typeof filterContractorCheckboxes === 'function') filterContractorCheckboxes();
  }
  if (typeof populateBakeryDropdowns === 'function') populateBakeryDropdowns();
}

function runUnify() {
  if (typeof bakeryContractorSupplies === 'undefined') { setTimeout(runUnify, 500); return; }
  unifyContractorNames();
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(runUnify, 500);
  setTimeout(runUnify, 3000);
  setTimeout(runUnify, 7000);
  setTimeout(runUnify, 15000);
});
