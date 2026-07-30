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
  if (typeof bakeryContractorSupplies === 'undefined') return;
  var nameMap = {};
  var changes = 0;
  bakeryContractorSupplies.forEach(function(r) {
    var norm = normalizeName(r.name);
    if (!nameMap[norm]) nameMap[norm] = r.name;
    else if (nameMap[norm] !== r.name) {
      changes++;
      r.name = nameMap[norm];
    }
  });
  if (changes > 0) {
    syncStorage();
    renderBakeryContractorSupplies();
    updateBreadSupplyStats();
    updateBakeryStats();
    if (typeof filterContractorCheckboxes === 'function') filterContractorCheckboxes();
  }
}

function normalizeNameInput() {
  var el = document.getElementById('bctr-name');
  if (!el) return;
  var val = el.value.trim();
  if (!val) return;
  var matched = false;
  if (typeof bakeryContractorSupplies !== 'undefined') {
    bakeryContractorSupplies.forEach(function(r) {
      if (namesMatch(r.name, val) && r.name !== val) {
        el.value = r.name;
        matched = true;
      }
    });
  }
  if (!matched && typeof bakeryContractorsNames !== 'undefined') {
    bakeryContractorsNames.forEach(function(n) {
      if (namesMatch(n, val) && n !== val) {
        el.value = n;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(unifyContractorNames, 1500);
  var input = document.getElementById('bctr-name');
  if (input) {
    input.addEventListener('change', normalizeNameInput);
    input.addEventListener('blur', normalizeNameInput);
  }
});
