(function () {
  function closeDropdowns(root) {
    var dropdownItems = root.querySelectorAll('.nav-item.has-dropdown');

    dropdownItems.forEach(function (item) {
      item.classList.remove('open');
      var trigger = item.querySelector('.nav-link');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initHeader(root) {
    var nav = root.querySelector('.main-nav');
    var toggle = root.querySelector('.nav-toggle');
    var dropdownItems = root.querySelectorAll('.nav-item.has-dropdown');

    dropdownItems.forEach(function (item) {
      var trigger = item.querySelector('.nav-link');
      if (!trigger) return;

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var isOpen = item.classList.contains('open');

        closeDropdowns(root);

        if (!isOpen) {
          item.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) {
        closeDropdowns(root);

        if (nav) {
          nav.classList.remove('is-open');
        }

        document.body.classList.remove('menu-open');

        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });

    if (toggle && nav) {
      toggle.setAttribute('aria-expanded', 'false');

      toggle.addEventListener('click', function (e) {
        e.stopPropagation();

        var isOpen = nav.classList.toggle('is-open');
        document.body.classList.toggle('menu-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        if (!isOpen) {
          closeDropdowns(root);
        }
      });
    }
  }

  function loadHeader() {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    fetch('/partials/header.html')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
        initHeader(placeholder);
      })
      .catch(function (err) {
        console.error('Error loading header:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();
