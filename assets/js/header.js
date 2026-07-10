(function () {
  // Bump this when header-dropdowns.css or header-dropdowns.js meaningfully
  // changes and clients need to bypass cached copies. It's appended as a
  // query string so browsers treat the request as a new URL.
  var HEADER_ASSET_VERSION = '2026-07-10c';

  // Inject header dropdown CSS into <head> if not already present.
  // This guarantees dropdown styling even on pages whose <head> doesn't
  // explicitly link header-dropdowns.css. Must run BEFORE the header
  // partial is inserted so the stylesheet is ready when the markup lands.
  function ensureDropdownStyles() {
    var href = '/assets/css/header-dropdowns.css?v=' + HEADER_ASSET_VERSION;
    var already = document.querySelector('link[href^="/assets/css/header-dropdowns.css"]');
    if (already) {
      // Force refresh if a stale (differently-versioned or unversioned) link
      // is already present in <head>.
      if (already.getAttribute('href') !== href) {
        already.setAttribute('href', href);
      }
    } else {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    // Critical fallback: even if the external stylesheet hasn't finished
    // loading, hide dropdown panels and the unstyled mobile menu list the
    // instant the header markup is inserted. Prevents the 'all menus open'
    // flash visible in screenshots.
    if (document.getElementById('header-dropdowns-critical')) return;
    var style = document.createElement('style');
    style.id = 'header-dropdowns-critical';
    style.textContent =
      '.home-header__dropdown{position:absolute;visibility:hidden;opacity:0;pointer-events:none}' +
      '.home-mobile-menu[hidden]{display:none!important}';
    document.head.appendChild(style);
  }

  // Inject header dropdown JS into <head> if not already present.
  // Loaded after the header partial is in the DOM so the script's
  // bootstrap finds the .home-nav__dropdown elements it wires.
  function ensureDropdownScript() {
    var src = '/assets/js/header-dropdowns.js?v=' + HEADER_ASSET_VERSION;
    var already = document.querySelector('script[src^="/assets/js/header-dropdowns.js"]');
    if (already) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function init() {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    // Kick off the CSS request before we even fetch the partial so
    // the styles are likely to arrive in time.
    ensureDropdownStyles();

    fetch('/partials/header.html')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
        wireHeader(placeholder);
        ensureDropdownScript();
      })
      .catch(function (error) {
        console.error('Header load error:', error);
      });
  }

  function wireHeader(scope) {
    var header = scope.querySelector('.home-header');
    if (!header) return;

    var toggle = scope.querySelector('#home-menu-toggle');
    var menu = scope.querySelector('#home-mobile-menu');

    // Collapse/expand helpers for mobile menu groups.
    // Defined here so openMenu/closeMenu can call them.
    function collapseAllGroups() {
      var groups = scope.querySelectorAll('.home-mobile-menu__group[data-collapsible]');
      Array.prototype.forEach.call(groups, function (group) {
        group.classList.remove('is-expanded');
        var btn = group.querySelector('.home-mobile-menu__toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    function expandGroupByNav(navKey) {
      if (!navKey) return;
      var groups = scope.querySelectorAll('.home-mobile-menu__group[data-collapsible]');
      Array.prototype.forEach.call(groups, function (group) {
        var parent = group.querySelector('.home-mobile-menu__parent');
        if (parent && parent.getAttribute('data-nav') === navKey) {
          group.classList.add('is-expanded');
          var btn = group.querySelector('.home-mobile-menu__toggle');
          if (btn) btn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    function openMenu() {
      if (!toggle || !menu) return;
      header.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      menu.hidden = false;
      // Auto-expand the group matching the current page.
      collapseAllGroups();
      var activeNav = (document.body && document.body.getAttribute('data-nav-active')) || '';
      expandGroupByNav(activeNav);
    }

    function closeMenu() {
      if (!toggle || !menu) return;
      header.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      menu.hidden = true;
      collapseAllGroups();
    }

    // Info bar slide state: hide on scroll-down past threshold,
    // show on scroll-up. Desktop only (info bar hidden via CSS on ≤900px).
    var infobar = document.getElementById('home-infobar');
    var lastScrollY = window.scrollY;
    var HIDE_THRESHOLD = 80;
    var SHOW_THRESHOLD_DELTA = 30;

    // Belt-and-suspenders: force-hide info bar on mobile via inline style.
    // Prevents stale cached CSS from leaking the bar onto narrow screens.
    function applyInfobarVisibility() {
      if (!infobar) return;
      if (window.innerWidth <= 900) {
        infobar.style.display = 'none';
        header.style.top = '0';
      } else {
        infobar.style.display = '';
        header.style.top = '';
      }
    }
    applyInfobarVisibility();
    window.addEventListener('resize', applyInfobarVisibility);

    function handleScroll() {
      var y = window.scrollY;
      var goingDown = y > lastScrollY;
      var delta = Math.abs(y - lastScrollY);

      if (y > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }

      // Info bar slide behavior (skip on touch/narrow screens where it's hidden anyway).
      if (infobar && window.innerWidth > 900) {
        if (y <= 4) {
          // Always show at the very top.
          infobar.classList.remove('is-hidden');
        } else if (goingDown && y > HIDE_THRESHOLD) {
          infobar.classList.add('is-hidden');
        } else if (!goingDown && delta > SHOW_THRESHOLD_DELTA) {
          infobar.classList.remove('is-hidden');
        }
      }

      lastScrollY = y;
    }

    if (toggle && menu) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (header.classList.contains('is-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      document.addEventListener('click', function (event) {
        if (!header.classList.contains('is-open')) return;
        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
          closeMenu();
        }
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 900 && header.classList.contains('is-open')) {
          closeMenu();
        }
      });

      closeMenu();
    }

    // Wire chevron toggle buttons on each collapsible group.
    var mobileGroups = scope.querySelectorAll('.home-mobile-menu__group[data-collapsible]');
    Array.prototype.forEach.call(mobileGroups, function (group) {
      var btn = group.querySelector('.home-mobile-menu__toggle');
      if (!btn) return;
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var expanded = group.classList.toggle('is-expanded');
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    });

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    var active = (document.body && document.body.getAttribute('data-nav-active')) || '';
    if (active) {
      var links = scope.querySelectorAll('[data-nav="' + active + '"]');
      Array.prototype.forEach.call(links, function (link) {
        link.setAttribute('aria-current', 'page');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
