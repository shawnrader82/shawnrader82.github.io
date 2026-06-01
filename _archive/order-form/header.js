(function () {
  function initNavDropdowns(root) {
    // Find ALL dropdown nav items (Services, Locations, etc.)
    var dropdownItems = root.querySelectorAll('.main-nav .nav-item.has-dropdown');
    if (!dropdownItems.length) return;

    dropdownItems.forEach(function (item) {
      // The clickable link at the top of this dropdown
      var toggleLink = item.querySelector('.nav-link');
      if (!toggleLink) return;

      toggleLink.addEventListener('click', function (e) {
        e.preventDefault(); // don’t navigate (e.g., to # or locations.html)

        // Close any other open dropdowns
        dropdownItems.forEach(function (other) {
          if (other !== item) {
            other.classList.remove('open');
            var otherToggle = other.querySelector('.nav-link');
            if (otherToggle) {
              otherToggle.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle this one
        var isOpen = item.classList.toggle('open');
        toggleLink.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });

    // Close dropdowns when clicking outside the header
    document.addEventListener('click', function (e) {
      var clickedInside = root.contains(e.target);
      if (clickedInside) return;

      dropdownItems.forEach(function (item) {
        item.classList.remove('open');
        var toggleLink = item.querySelector('.nav-link');
        if (toggleLink) {
          toggleLink.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function initHamburger(root) {
    var toggle = root.querySelector('.nav-toggle');
    var nav = root.querySelector('.main-nav');
    if (!toggle || !nav) return;

    // Start closed on mobile
    nav.classList.remove('is-open');

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      nav.classList.toggle('is-open');
    });

    // Close when clicking outside the nav/toggle
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) {
        nav.classList.remove('is-open');
      }
    });
  }

  function loadHeader() {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    fetch('/header.html')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP error ' + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;

        initNavDropdowns(placeholder);
        initHamburger(placeholder);
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

