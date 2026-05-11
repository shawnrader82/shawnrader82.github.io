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

    function handleScroll() {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
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
