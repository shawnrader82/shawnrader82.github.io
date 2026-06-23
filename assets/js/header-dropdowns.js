/**
 * Header Dropdown Navigation — Mobile American Notary & Apostilles
 *
 * Handles:
 *  - Click-outside-to-close
 *  - Esc key to close
 *  - Touch/click on parent caret toggles dropdown (without following the link)
 *  - Keyboard arrow navigation within dropdown
 *  - aria-expanded state management
 */
(function () {
  'use strict';

  var OPEN_CLASS = 'is-open';

  // Always re-query — the header is injected asynchronously by
  // header.min.js, so a cached NodeList from initial bootstrap would
  // be empty. Re-querying on every call is cheap (a few elements).
  function getItems() {
    return document.querySelectorAll('.home-header__nav-item--has-dropdown');
  }

  function closeAll(except) {
    getItems().forEach(function (item) {
      if (item !== except) {
        item.classList.remove(OPEN_CLASS);
        item.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openItem(item) {
    closeAll(item);
    item.classList.add(OPEN_CLASS);
    item.setAttribute('aria-expanded', 'true');
  }

  function closeItem(item) {
    item.classList.remove(OPEN_CLASS);
    item.setAttribute('aria-expanded', 'false');
  }

  function toggleItem(item) {
    if (item.classList.contains(OPEN_CLASS)) {
      closeItem(item);
    } else {
      openItem(item);
    }
  }

  function getFocusableMenuItems(item) {
    var dropdown = item.querySelector('.home-header__dropdown');
    if (!dropdown) return [];
    return Array.prototype.slice.call(dropdown.querySelectorAll('a[role="menuitem"]'));
  }

  function bootstrap() {
    var nodes = getItems();
    if (!nodes.length) return false; // header partial not in DOM yet
    if (document.body.getAttribute('data-header-dropdowns-bootstrapped') === '1') return true;
    document.body.setAttribute('data-header-dropdowns-bootstrapped', '1');

    nodes.forEach(function (item) {
      // Set initial aria-expanded
      item.setAttribute('aria-expanded', 'false');

      var link = item.querySelector('.home-header__nav-link');
      var caret = item.querySelector('.home-header__nav-caret');
      var dropdown = item.querySelector('.home-header__dropdown');

      if (!link || !dropdown) return;

      // Click on caret or on the nav link itself (on touch / pointer-devices
      // where hover isn't reliable) — toggle without following the href.
      // On desktop the hover CSS handles show/hide; click is supplemental.
      link.addEventListener('click', function (e) {
        // Only intercept if the nav item has a dropdown AND we are on a
        // touch-primary device (coarse pointer) or the dropdown is not
        // already visible via hover.
        var isCoarse = window.matchMedia('(pointer: coarse)').matches;
        var isOpen = item.classList.contains(OPEN_CLASS);

        if (isCoarse) {
          // On touch devices, first tap opens; second tap follows the link.
          if (!isOpen) {
            e.preventDefault();
            toggleItem(item);
          }
          // If already open, allow the link click through to navigate.
        }
        // On desktop, hover handles it; clicks follow normally.
      });

      // Keyboard: Enter / Space on the nav link toggles the dropdown.
      link.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleItem(item);
          if (item.classList.contains(OPEN_CLASS)) {
            var menuItems = getFocusableMenuItems(item);
            if (menuItems.length) menuItems[0].focus();
          }
        }
        if (e.key === 'Escape') {
          closeItem(item);
          link.focus();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          openItem(item);
          var menuItems = getFocusableMenuItems(item);
          if (menuItems.length) menuItems[0].focus();
        }
      });

      // Keyboard arrow navigation within dropdown.
      if (dropdown) {
        dropdown.addEventListener('keydown', function (e) {
          var menuItems = getFocusableMenuItems(item);
          var focused = document.activeElement;
          var idx = menuItems.indexOf(focused);

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            var next = menuItems[idx + 1] || menuItems[0];
            if (next) next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var prev = menuItems[idx - 1] || menuItems[menuItems.length - 1];
            if (prev) prev.focus();
          } else if (e.key === 'Escape') {
            closeItem(item);
            link.focus();
          } else if (e.key === 'Tab') {
            // Let tab close the dropdown naturally via focus-within
            closeItem(item);
          }
        });
      }
    });

    // Click outside closes all dropdowns.
    document.addEventListener('click', function (e) {
      var clickedInside = e.target.closest('.home-header__nav-item--has-dropdown');
      if (!clickedInside) {
        closeAll(null);
      }
    });

    // Esc anywhere closes all dropdowns.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAll(null);
      }
    });

    return true;
  }

  // Try immediately (in case the partial is already there), then
  // poll briefly to catch the moment header.min.js drops the markup in,
  // then give up after ~5s if the header never appears.
  if (!bootstrap()) {
    var tries = 0;
    var poll = setInterval(function () {
      tries++;
      if (bootstrap() || tries > 50) {
        clearInterval(poll);
      }
    }, 100);
  }
})();
