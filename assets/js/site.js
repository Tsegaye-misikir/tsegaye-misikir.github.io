/* site.js — shared behaviour (vanilla, no dependencies).
   Theme toggle · mobile menu · scroll spy (home) · fade-in reveal ·
   BibTeX copy · publication filters · current year.
   The inline bootstrap in _includes/head.html has already added the `js`
   class to <html> and applied a stored theme. */
(function () {
  'use strict';

  var root = document.documentElement;
  var live = document.querySelector('[data-live-region]');
  function announce(msg) {
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 50);
  }

  /* ── THEME ─────────────────────────────────────────── */
  var mqLight = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mqLight && mqLight.matches ? 'light' : 'dark';
  }
  var themeButtons = document.querySelectorAll('[data-theme-toggle]');
  function syncThemeButtons() {
    var dark = currentTheme() === 'dark';
    themeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', 'Dark theme');
      b.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    });
  }
  function emitTheme() {
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme() } }));
  }
  themeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeButtons();
      announce(next === 'dark' ? 'Dark theme on' : 'Light theme on');
      emitTheme();
    });
  });
  if (mqLight) {
    var onSystemChange = function () {
      if (root.hasAttribute('data-theme')) return;   // explicit choice wins
      syncThemeButtons();
      emitTheme();
    };
    if (mqLight.addEventListener) mqLight.addEventListener('change', onSystemChange);
    else if (mqLight.addListener) mqLight.addListener(onSystemChange);
  }
  syncThemeButtons();

  /* ── MOBILE MENU ───────────────────────────────────── */
  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('[data-nav-toggle]');
  var menu = document.getElementById('site-menu');
  var mqMobile = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  var inertTargets = ['main', '.site-footer', '.course-subnav', '.skip-link'];

  function menuIsOpen() { return !!header && header.classList.contains('menu-open'); }
  function setMenu(open, returnFocus) {
    if (!header || !navToggle || !menu) return;
    header.classList.toggle('menu-open', open);
    root.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    inertTargets.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
    if (open) {
      var first = menu.querySelector('a[href]');
      if (first) first.focus({ preventScroll: true });
    } else if (returnFocus) {
      navToggle.focus();
    }
  }
  if (navToggle && menu) {
    navToggle.addEventListener('click', function () { setMenu(!menuIsOpen(), true); });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && menuIsOpen()) setMenu(false, false);
    });
    var focusables = function () {
      return Array.prototype.filter.call(header.querySelectorAll('a[href], button:not([disabled])'), function (el) {
        return el.offsetParent !== null && !el.closest('[inert]') && getComputedStyle(el).visibility !== 'hidden';
      });
    };
    document.addEventListener('keydown', function (e) {
      if (!menuIsOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false, true); return; }
      if (e.key === 'Tab') {   // trap focus in the header while the menu is open
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Keep keyboard focus inside header while the menu is open.
    document.addEventListener('focusin', function (e) {
      if (menuIsOpen() && header && !header.contains(e.target)) {
        var first = menu.querySelector('a[href]');
        if (first) first.focus();
      }
    });
    if (mqMobile) {
      var onMq = function () { if (!mqMobile.matches && menuIsOpen()) setMenu(false, false); };
      if (mqMobile.addEventListener) mqMobile.addEventListener('change', onMq);
      else if (mqMobile.addListener) mqMobile.addListener(onMq);
    }
  }

  /* ── SCROLL SPY (home page sections) ───────────────── */
  if ('IntersectionObserver' in window && (location.pathname === '/' || location.pathname === '/index.html')) {
    var spyLinks = {};
    document.querySelectorAll('.nav-links a[href^="/#"]').forEach(function (a) {
      spyLinks[a.getAttribute('href').slice(2)] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(spyLinks).forEach(function (id) {
          spyLinks[id].classList.toggle('is-current', id === en.target.id);
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(spyLinks).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ── FADE-IN REVEAL ────────────────────────────────── */
  var fades = document.querySelectorAll('.fade-in');
  function revealAll() { fades.forEach(function (el) { el.classList.add('visible'); }); }
  if (!('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    fades.forEach(function (el) { io.observe(el); });
  }
  window.addEventListener('beforeprint', revealAll);

  /* ── COPY (BibTeX and [data-copy] buttons) ─────────── */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function selectNode(node) {
    try {
      var r = document.createRange(); r.selectNodeContents(node);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
  }
  function feedback(btn, ok) {
    var label = btn.querySelector('span') || btn;
    if (!btn.dataset.label) btn.dataset.label = label.textContent;
    label.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    btn.classList.toggle('is-copied', ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      label.textContent = btn.dataset.label;
      btn.classList.remove('is-copied');
    }, 2000);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-bib, [data-copy]');
    if (!btn) return;
    var src;
    if (btn.hasAttribute('data-copy') && btn.getAttribute('data-copy')) {
      src = document.querySelector(btn.getAttribute('data-copy'));
    } else {
      var box = btn.closest('.bib, details');
      src = box && box.querySelector('pre code, pre');
    }
    if (!src) return;
    var text = src.textContent.replace(/\s+$/, '') + '\n';
    copyText(text).then(function () {
      feedback(btn, true);
      announce('BibTeX copied to clipboard');
    }, function () {
      selectNode(src);
      feedback(btn, false);
      announce('Copy failed. The BibTeX is selected; press Control plus C to copy.');
    });
  });

  /* ── PUBLICATION FILTERS ───────────────────────────── */
  var filters = document.querySelector('[data-pub-filters]');
  if (filters) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.pub-row'));
    var groups = document.querySelectorAll('.pub-year');
    var countEls = document.querySelectorAll('[data-pub-count]');
    var emptyEl = document.querySelector('[data-pub-empty]');
    var search = filters.querySelector('[data-pub-search]') || filters.querySelector('input[type="search"]');
    var state = { type: 'all', year: 'all', q: '' };

    var norm = function (s) {
      s = String(s || '').toLowerCase();
      return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
    };
    rows.forEach(function (r) {
      var parts = r.querySelectorAll('.pub-row-title, .pub-row-authors, .pub-row-venue, .pub-row-meta');
      var t = '';
      parts.forEach(function (p) { t += ' ' + p.textContent; });
      r._search = norm(t + ' ' + (r.getAttribute('data-year') || ''));
    });

    var btnKind = function (b) {
      if (b.hasAttribute('data-filter-type')) return ['type', b.getAttribute('data-filter-type')];
      if (b.hasAttribute('data-filter-year')) return ['year', b.getAttribute('data-filter-year')];
      if (b.hasAttribute('data-filter')) return [b.getAttribute('data-filter'), b.getAttribute('data-value')];
      return null;
    };
    var buttons = Array.prototype.slice.call(filters.querySelectorAll('[data-filter-type], [data-filter-year], [data-filter]'))
      .filter(function (b) { return btnKind(b); });

    var apply = function (updateUrl) {
      var terms = norm(state.q).split(/\s+/).filter(Boolean);
      var shown = 0;
      rows.forEach(function (r) {
        var ok = (state.type === 'all' || r.getAttribute('data-type') === state.type) &&
                 (state.year === 'all' || r.getAttribute('data-year') === state.year) &&
                 terms.every(function (t) { return r._search.indexOf(t) !== -1; });
        r.hidden = !ok;
        if (ok) shown++;
      });
      groups.forEach(function (g) {
        g.hidden = !g.querySelector('.pub-row:not([hidden])');
      });
      countEls.forEach(function (c) { c.textContent = shown; });
      if (emptyEl) emptyEl.hidden = shown !== 0;
      buttons.forEach(function (b) {
        var k = btnKind(b);
        var on = state[k[0]] === k[1];
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('active', on);
      });
      if (updateUrl && window.history && history.replaceState) {
        var p = new URLSearchParams();
        if (state.type !== 'all') p.set('type', state.type);
        if (state.year !== 'all') p.set('year', state.year);
        if (state.q) p.set('q', state.q);
        var qs = p.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      }
    };

    buttons.forEach(function (b) {
      if (b.tagName === 'BUTTON' && !b.getAttribute('type')) b.setAttribute('type', 'button');
      b.addEventListener('click', function () {
        var k = btnKind(b);
        state[k[0]] = k[1];
        apply(true);
      });
    });
    if (search) {
      var timer;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { state.q = search.value.trim(); apply(true); }, 120);
      });
      var form = search.closest('form');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    }

    // Restore state from ?type=&year=&q=
    try {
      var params = new URLSearchParams(location.search);
      var valid = function (kind, v) {
        return buttons.some(function (b) { var k = btnKind(b); return k[0] === kind && k[1] === v; });
      };
      if (params.get('type') && valid('type', params.get('type'))) state.type = params.get('type');
      if (params.get('year') && valid('year', params.get('year'))) state.year = params.get('year');
      if (params.get('q')) { state.q = params.get('q'); if (search) search.value = state.q; }
    } catch (e) {}
    apply(false);
  }

  /* ── CURRENT YEAR ──────────────────────────────────── */
  document.querySelectorAll('[data-year-now]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
