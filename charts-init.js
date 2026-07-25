// ====== Chart.js Dashboard Enhancer ======
// Replaces Canvas 2D donut charts with interactive Chart.js versions
(function() {
  if (typeof Chart === 'undefined') return;
  var _charts = []; var _lastData = '';

  function _isVisible(el) { return el && el.offsetParent !== null; }

  function _destroyAll() {
    _charts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
    _charts = [];
  }

  function _enhance() {
    var db = document.getElementById('tab-dashboard');
    if (!db || !_isVisible(db)) return;
    var totalEmp = 0;
    try { totalEmp = employees.length; } catch(e) { return; }

    var pCount = 0, vCount = 0, daim = 0, kagol = 0;
    try {
      employees.forEach(function(e) {
        if (e.status === 'P') pCount++; else vCount++;
        if (e.contract === 'دائم') daim++; else if (e.contract === 'كاجول') kagol++;
      });
    } catch(e) { return; }

    var dataKey = totalEmp + '|' + pCount + '|' + vCount + '|' + daim + '|' + kagol;
    if (dataKey === _lastData) return;
    _lastData = dataKey;
    _destroyAll();

    // ── Chart 1: Workforce Donut ──
    var c1 = document.getElementById('dash-donut');
    if (c1 && totalEmp > 0) {
      var parent = c1.parentElement;
      if (parent) {
        // Center text overlay
        var overlay = document.getElementById('dash-donut-total');
        if (overlay) overlay.textContent = totalEmp;

        var ctx = c1.getContext('2d');
        var chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['متواجد (' + pCount + ')', 'في إجازة (' + vCount + ')'],
            datasets: [{
              data: [pCount, vCount],
              backgroundColor: ['#2e7d32', '#ff9800'],
              borderWidth: 2,
              borderColor: '#fff',
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                rtl: true,
                bodyFont: { family: 'Cairo' },
                callbacks: {
                  label: function(ctx) {
                    var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                    var pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                    return ctx.label + ': ' + pct + '%';
                  }
                }
              }
            }
          }
        });
        _charts.push(chart);
      }
    }

    // ── Chart 2: Contract Type Donut ──
    var c2 = document.getElementById('dash-contract-chart');
    if (c2 && totalEmp > 0) {
      var other = totalEmp - daim - kagol;
      var cLabels = [], cData = [], cColors = [];
      if (daim > 0) { cLabels.push('دائم (' + daim + ')'); cData.push(daim); cColors.push('#1565c0'); }
      if (kagol > 0) { cLabels.push('كاجول (' + kagol + ')'); cData.push(kagol); cColors.push('#ff9800'); }
      if (other > 0) { cLabels.push('أخرى (' + other + ')'); cData.push(other); cColors.push('#78909c'); }

      var overlay2 = document.getElementById('dash-ctrct-total');
      if (overlay2) overlay2.textContent = totalEmp;

      var ctx2 = c2.getContext('2d');
      var chart2 = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: cLabels,
          datasets: [{
            data: cData,
            backgroundColor: cColors,
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              rtl: true,
              bodyFont: { family: 'Cairo' },
              callbacks: {
                label: function(ctx) {
                  var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                  var pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                  return ctx.parsed + ' موظف (' + pct + '%)';
                }
              }
            }
          }
        }
      });
      _charts.push(chart2);
    }
  }

  // Poll every 1.5s to catch dashboard renders
  setInterval(_enhance, 1500);
})();
