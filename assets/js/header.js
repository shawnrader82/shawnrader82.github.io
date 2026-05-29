(function () {
  function init() {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    fetch('/partials/header.html')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
        wireHeader(placeholder);
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

    function openMenu() {
      if (!toggle || !menu) return;
      header.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      menu.hidden = false;
    }

    function closeMenu() {
      if (!toggle || !menu) return;
      header.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      menu.hidden = true;
    }

    // Info bar slide state: hide on scroll-down past threshold,
    // show on scroll-up. Desktop only (info bar hidden via CSS on ≤900px).
    var infobar = document.getElementById('home-infobar');
    var lastScrollY = window.scrollY;
    var HIDE_THRESHOLD = 80;
    var SHOW_THRESHOLD_DELTA = 30;

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
