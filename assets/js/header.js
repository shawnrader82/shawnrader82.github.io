/* Shared header loader — fetches /partials/header.html into #header-placeholder
   and wires up the mobile menu toggle. Sets aria-current="page" on the link
   matching the page's data-nav-active attribute on <body> (or on the placeholder). */
(function () {
  function init() {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    fetch('/partials/header.html')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
        wire(placeholder);
      })
      .catch(function (err) {
        console.error('Header load error:', err);
      });
  }

  function wire(scope) {
    var header = scope.querySelector('.home-header');
    var toggle = scope.querySelector('#home-menu-toggle');
    var menu = scope.querySelector('#home-mobile-menu');

    if (header && toggle && menu) {
      function open() {
        header.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
        menu.hidden = false;
      }
      function close() {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        menu.hidden = true;
      }

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (header.classList.contains('is-open')) close();
        else open();
      });

      document.addEventListener('click', function (e) {
        if (!header.classList.contains('is-open')) return;
        if (!menu.contains(e.target) && !toggle.contains(e.target)) close();
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 900 && header.classList.contains('is-open')) close();
      });

      close();
    }

    // Active state from <body data-nav-active="apostille|notary|hospital|jail|locations">
    var active = (document.body && document.body.getAttribute('data-nav-active')) || '';
    if (active) {
      var links = scope.querySelectorAll('[data-nav="' + active + '"]');
      Array.prototype.forEach.call(links, function (a) {
        a.setAttribute('aria-current', 'page');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
