// footer.js
(function () {
  function loadFooter() {
    var placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    fetch('/footer.html')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP error ' + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
      })
      .catch(function (err) {
        console.error('Error loading footer:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();

