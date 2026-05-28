/**
 * Mobile American Notary — gclid/gbraid/wbraid + UTM capture
 *
 * What this does:
 *  1. On every page load, reads URL params (gclid, gbraid, wbraid, utm_*)
 *  2. Stores them in a 90-day first-party cookie + localStorage backup
 *  3. When user submits any contact form (with email field), POSTs
 *     {email, gclid, gbraid, wbraid, utm_*, client_id} to the n8n endpoint
 *     /webhook/ad-click-capture for ad_clicks table stitching.
 *  4. Auto-appends gclid + UTMs to all outbound links to book.squareup.com so
 *     Square sees the click params in order metadata.
 *  5. Fires a GA4 'phone_click' dataLayer event on every tel: link click,
 *     enriched with current stored gclid for call attribution.
 */
(function () {
  var COOKIE_NAME = 'mna_ads';
  var COOKIE_DAYS = 90;
  var N8N_CAPTURE_URL = 'https://n8n.mobileamericannotary.com/webhook/ad-click-capture';
  var SQUARE_DOMAIN = 'book.squareup.com';

  function getParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]+)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, val, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(val) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function getClientId() {
    // GA4 client_id from _ga cookie format: GA1.1.1234567890.1234567890
    var ga = getCookie('_ga');
    if (!ga) return null;
    var parts = ga.split('.');
    return parts.length >= 4 ? parts[2] + '.' + parts[3] : null;
  }

  // 1) Read incoming click params, merge with existing cookie
  var existing = {};
  try { existing = JSON.parse(getCookie(COOKIE_NAME) || '{}'); } catch (e) {}

  var incoming = {
    gclid: getParam('gclid'),
    gbraid: getParam('gbraid'),
    wbraid: getParam('wbraid'),
    utm_source: getParam('utm_source'),
    utm_medium: getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
    utm_term: getParam('utm_term'),
    utm_content: getParam('utm_content'),
    landing_page: window.location.pathname,
    captured_at: new Date().toISOString()
  };

  var merged = Object.assign({}, existing);
  Object.keys(incoming).forEach(function (k) {
    if (incoming[k]) merged[k] = incoming[k];
  });

  if (merged.gclid || merged.gbraid || merged.wbraid || merged.utm_source) {
    setCookie(COOKIE_NAME, JSON.stringify(merged), COOKIE_DAYS);
    try { localStorage.setItem(COOKIE_NAME, JSON.stringify(merged)); } catch (e) {}
  }

  // 2) Append gclid to all book.squareup.com links so it survives the click
  function decorateSquareLinks() {
    var ads;
    try { ads = JSON.parse(getCookie(COOKIE_NAME) || '{}'); } catch (e) { return; }
    if (!ads.gclid && !ads.gbraid && !ads.wbraid) return;
    var links = document.querySelectorAll('a[href*="' + SQUARE_DOMAIN + '"]');
    for (var i = 0; i < links.length; i++) {
      var url;
      try { url = new URL(links[i].href); } catch (e) { continue; }
      if (ads.gclid) url.searchParams.set('gclid', ads.gclid);
      if (ads.gbraid) url.searchParams.set('gbraid', ads.gbraid);
      if (ads.wbraid) url.searchParams.set('wbraid', ads.wbraid);
      url.searchParams.set('utm_source', ads.utm_source || 'google');
      url.searchParams.set('utm_medium', ads.utm_medium || 'cpc');
      if (ads.utm_campaign) url.searchParams.set('utm_campaign', ads.utm_campaign);
      links[i].href = url.toString();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateSquareLinks);
  } else {
    decorateSquareLinks();
  }
  setTimeout(decorateSquareLinks, 1500);

  // 3) Listen for form submissions → post mapping to n8n
  function captureContact(emailValue, extraData) {
    var ads = {};
    try { ads = JSON.parse(getCookie(COOKIE_NAME) || '{}'); } catch (e) {}
    var payload = Object.assign({
      email: (emailValue || '').toLowerCase().trim(),
      client_id: getClientId(),
      user_agent: navigator.userAgent,
      referrer: document.referrer
    }, ads, extraData || {});
    if (!payload.email) return;
    try {
      navigator.sendBeacon(N8N_CAPTURE_URL,
        new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch (e) {
      fetch(N8N_CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var emailInput = form.querySelector('input[type="email"], input[name*="mail" i]');
    if (emailInput && emailInput.value) {
      captureContact(emailInput.value, { source_form: form.id || form.name || 'unknown' });
    }
  }, true);

  // 4) Phone click → GA4 event with gclid enrichment
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a) return;
    var ads = {};
    try { ads = JSON.parse(getCookie(COOKIE_NAME) || '{}'); } catch (err) {}
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'phone_click',
        phone_number: a.href.replace('tel:', ''),
        gclid: ads.gclid || null,
        utm_source: ads.utm_source || null,
        utm_campaign: ads.utm_campaign || null
      });
    }
  }, true);

  // Expose for debugging in browser console
  window.mnaAds = function () {
    try { return JSON.parse(getCookie(COOKIE_NAME) || '{}'); }
    catch (e) { return null; }
  };
})();
