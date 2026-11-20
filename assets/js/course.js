/* course.js — shared behaviour for the course guides (NLP.html, llm.html, LTP.html).
   Week accordion (one week open at a time) · skill bars · radar chart.
   Loaded with defer after site.js and Chart.js, so the DOM and Chart are ready.
   The radar chart reads its data from <script type="application/json" id="radar-config">
   and its colours from the CSS custom properties, and is redrawn on `themechange`.
   The scroll reveal of the ethics items is site.js's .fade-in. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── ACCORDION ─────────────────────────────────────── */
  var weekBtns = Array.prototype.slice.call(document.querySelectorAll('.week-btn[aria-controls]'));
  function bodyOf(btn) {
    return document.getElementById(btn.getAttribute('aria-controls')) || btn.nextElementSibling;
  }
  function setHidden(body, hidden) {
    body.inert = hidden;
    if (hidden) { body.setAttribute('aria-hidden', 'true'); body.setAttribute('inert', ''); }
    else { body.removeAttribute('aria-hidden'); body.removeAttribute('inert'); }
  }
  function closeWeekBody(body) {
    if (body.style.maxHeight === 'none' || body.style.maxHeight === '') {
      body.style.maxHeight = body.scrollHeight + 'px';
      void body.offsetHeight; // force reflow so the collapse animates from the real height
    }
    body.classList.remove('open');
    body.style.maxHeight = '0px';
    setHidden(body, true);
  }
  function openWeekBody(body) {
    setHidden(body, false);
    body.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
    // once expanded, drop the cap so content can reflow (e.g. on resize) without clipping
    var release = function () { if (body.classList.contains('open')) body.style.maxHeight = 'none'; };
    body.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'max-height') return;
      body.removeEventListener('transitionend', onEnd);
      release();
    });
    setTimeout(release, 600);
  }
  function toggleWeek(btn) {
    var body = bodyOf(btn);
    var isOpen = btn.classList.contains('open');
    weekBtns.forEach(function (b) {       // one week open at a time
      if (b.classList.contains('open')) {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
        var other = bodyOf(b);
        if (other) closeWeekBody(other);
      }
    });
    if (!isOpen && body) {
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      openWeekBody(body);
    }
  }
  weekBtns.forEach(function (btn) {
    var body = bodyOf(btn);
    if (!body) return;
    // collapsed state is applied here, so without JS every week stays readable
    btn.setAttribute('aria-expanded', 'false');
    body.style.maxHeight = '0px';
    setHidden(body, true);
    btn.addEventListener('click', function () { toggleWeek(btn); });
  });
  // a link to a week (#w3-btn or #w3-body) opens it
  function openFromHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var btn = el.classList.contains('week-btn') ? el
      : (el.classList.contains('week-body') ? document.querySelector('.week-btn[aria-controls="' + id + '"]') : null);
    if (btn && !btn.classList.contains('open')) toggleWeek(btn);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
  // printing shows every week (CSS); keep the inert state from hiding it from print-to-PDF readers
  window.addEventListener('beforeprint', function () {
    weekBtns.forEach(function (b) { var bd = bodyOf(b); if (bd) setHidden(bd, false); });
  });
  window.addEventListener('afterprint', function () {
    weekBtns.forEach(function (b) { var bd = bodyOf(b); if (bd && !b.classList.contains('open')) setHidden(bd, true); });
  });

  /* ── SKILL BARS ────────────────────────────────────── */
  var bars = document.getElementById('skillBars');
  if (bars) {
    var fillBars = function () {
      bars.querySelectorAll('.skill-bar-fill').forEach(function (f) { f.classList.add('animate'); });
    };
    if (!('IntersectionObserver' in window)) {
      fillBars();
    } else {
      var barObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { fillBars(); barObserver.disconnect(); }
      }, { threshold: 0.3 });
      barObserver.observe(bars);
    }
    window.addEventListener('beforeprint', fillBars);
  }

  /* ── RADAR CHART ───────────────────────────────────── */
  var canvas = document.getElementById('radarChart');
  var cfgEl = document.getElementById('radar-config');
  if (!canvas || !cfgEl || typeof window.Chart === 'undefined') return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  // '#d4a853' or 'rgb(…)' → 'rgba(r,g,b,a)'
  function withAlpha(color, a) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
    var r, g, b;
    if (m) {
      var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else {
      var n = (color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
      r = n[0]; g = n[1]; b = n[2];
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function palette() {
    return { gold: cssVar('--gold'), teal: cssVar('--teal'), muted: cssVar('--muted'), line: cssVar('--line') };
  }
  function datasetStyle(d, pal) {
    var c = pal[d.color] || pal.gold;
    return {
      backgroundColor: withAlpha(c, d.fill != null ? d.fill : (d.dashed ? 0.08 : 0.1)),
      borderColor: withAlpha(c, d.border != null ? d.border : (d.dashed ? 0.6 : 0.7)),
      pointBackgroundColor: c
    };
  }
  var font = { family: "'JetBrains Mono', monospace", size: 10 };
  var pal = palette();
  var chart = new window.Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: cfg.labels,
      datasets: cfg.datasets.map(function (d) {
        var ds = {
          label: d.label,
          data: d.data,
          pointBorderColor: 'transparent',
          pointRadius: 4,
          borderWidth: 1.5
        };
        if (d.dashed) ds.borderDash = [4, 3];
        var st = datasetStyle(d, pal);
        for (var k in st) ds[k] = st[k];
        return ds;
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      animation: reduceMotion ? false : undefined,
      plugins: {
        legend: { labels: { color: pal.muted, font: font, boxWidth: 12 } }
      },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, display: false },
          grid: { color: pal.line },
          angleLines: { color: pal.line },
          pointLabels: { color: pal.muted, font: font }
        }
      }
    }
  });

  function recolour() {
    var p = palette();
    chart.data.datasets.forEach(function (ds, i) {
      var st = datasetStyle(cfg.datasets[i], p);
      for (var k in st) ds[k] = st[k];
    });
    chart.options.plugins.legend.labels.color = p.muted;
    var r = chart.options.scales.r;
    r.grid.color = p.line; r.angleLines.color = p.line; r.pointLabels.color = p.muted;
    chart.update('none');
  }
  window.addEventListener('themechange', recolour);
})();
