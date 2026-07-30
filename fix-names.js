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

function namesMatch(a, b) {
  return normalizeName(a) === normalizeName(b);
}

function unifyContractorNames() {
  if (typeof bakeryContractorSupplies === 'undefined' || !bakeryContractorSupplies) return;
  var nameMap = {};
  var normToBest = {};
  var changes = 0;
  bakeryContractorSupplies.forEach(function(r) {
    if (!r || !r.name) return;
    var norm = normalizeName(r.name);
    if (!normToBest[norm] || r.name.length < normToBest[norm].length) normToBest[norm] = r.name;
  });
  bakeryContractorSupplies.forEach(function(r) {
    if (!r || !r.name) return;
    var norm = normalizeName(r.name);
    var best = normToBest[norm];
    if (best && r.name !== best) {
      changes++;
      r.name = best;
    }
  });
  if (typeof _selectedContractors !== 'undefined' && _selectedContractors) {
    _selectedContractors.forEach(function(n, i, arr) {
      var norm = normalizeName(n);
      var best = normToBest[norm];
      if (best && best !== n) arr[i] = best;
    });
    var seen = {};
    _selectedContractors = _selectedContractors.filter(function(n) {
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    });
  }
  if (typeof bakeryContractorsNames !== 'undefined' && bakeryContractorsNames) {
    bakeryContractorsNames.forEach(function(n, i) {
      var norm = normalizeName(n);
      if (normToBest[norm] && normToBest[norm] !== n) bakeryContractorsNames[i] = normToBest[norm];
    });
    var seen = {};
    bakeryContractorsNames = bakeryContractorsNames.filter(function(n) {
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    });
  }
  if (changes > 0) {
    syncStorage();
    if (typeof renderBakeryContractorSupplies === 'function') renderBakeryContractorSupplies();
    if (typeof updateBreadSupplyStats === 'function') updateBreadSupplyStats();
    if (typeof updateBakeryStats === 'function') updateBakeryStats();
    if (typeof filterContractorCheckboxes === 'function') filterContractorCheckboxes();
  }
}

function normalizeNameInput() {
  var el = document.getElementById('bctr-name');
  if (!el) return;
  var val = el.value.trim();
  if (!val) return;
  var best = null;
  if (typeof bakeryContractorSupplies !== 'undefined') {
    bakeryContractorSupplies.forEach(function(r) {
      if (r && r.name && namesMatch(r.name, val) && (!best || r.name.length < best.length)) best = r.name;
    });
  }
  if (!best && typeof bakeryContractorsNames !== 'undefined') {
    bakeryContractorsNames.forEach(function(n) {
      if (n && namesMatch(n, val) && (!best || n.length < best.length)) best = n;
    });
  }
  if (best && best !== val) el.value = best;
}

function runUnify() {
  if (typeof bakeryContractorSupplies === 'undefined') { setTimeout(runUnify, 1000); return; }
  unifyContractorNames();
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(runUnify, 500);
  setTimeout(runUnify, 3000);
  setTimeout(runUnify, 7000);
  var input = document.getElementById('bctr-name');
  if (input) {
    input.addEventListener('change', normalizeNameInput);
    input.addEventListener('blur', normalizeNameInput);
  }
});
