/**
 * Document Recording Fee Calculator
 * Mobile American Notary & Apostilles
 * Fees verified June 2026 · Final amount confirmed with recorder at filing.
 */
(function () {
  'use strict';

  /* ── Fee schedules ─────────────────────────────────────────────────────── */
  var FEE_SCHEDULE = {
    la: {
      name: 'LA County',
      tripFee: 150,
      firstPage: 15,
      addlPage: 3,
      sb2: 75,
      fraudFee: 10,
      ab1466: 2,
      fbnFirst: 26,
      fbnExtra: 0,
      certCopy: 8,
      certCopyNote: '',
      marriageLicense: 91
    },
    oc: {
      name: 'Orange County',
      tripFee: 200,
      firstPage: 12,
      addlPage: 3,
      sb2: 75,
      fraudFee: 10,
      ab1466: 2,
      fbnFirst: 26,
      fbnExtra: 0,
      certCopy: 5,
      certCopyNote: '',
      marriageLicense: 61
    },
    ventura: {
      name: 'Ventura County',
      tripFee: 175,
      firstPage: 14,
      addlPage: 3,
      sb2: 75,
      fraudFee: 10,           /* placeholder – verify at filing */
      ab1466: 2,
      fbnFirst: 59,
      fbnExtra: 10,
      certCopy: 13,
      certCopyNote: '(verify at filing)',
      marriageLicense: 106
    }
  };

  /* doc type categories */
  var DOC_TYPES = [
    { value: 'grant-deed',         label: 'Grant Deed',                         category: 'deed' },
    { value: 'quitclaim-deed',     label: 'Quitclaim Deed',                      category: 'deed' },
    { value: 'tod-deed',           label: 'Transfer-on-Death (TOD) Deed',        category: 'deed' },
    { value: 'affidavit-death',    label: 'Affidavit of Death of Joint Tenant',  category: 'deed' },
    { value: 'fbn-dba',            label: 'FBN / DBA Filing',                    category: 'fbn'  },
    { value: 'certified-copy',     label: 'Certified Copy Request',              category: 'cert' },
    { value: 'other',              label: 'Other Recordable Document',           category: 'other'}
  ];

  /* ── Calculation logic ─────────────────────────────────────────────────── */
  function calcCountyFee(county, docCategory, pages, extraNames) {
    var fs = FEE_SCHEDULE[county];
    var lines = [];
    var total = 0;

    if (docCategory === 'deed') {
      var basePage = fs.firstPage;
      var addl = (pages - 1) * fs.addlPage;
      lines.push({ label: 'Recording – first page', amount: basePage });
      if (addl > 0) lines.push({ label: 'Recording – additional pages (' + (pages - 1) + ' × $' + fs.addlPage + ')', amount: addl });
      lines.push({ label: 'SB2 Building Homes & Jobs Act', amount: fs.sb2 });
      lines.push({ label: 'Real Estate Fraud Prevention Fee', amount: fs.fraudFee });
      lines.push({ label: 'AB 1466 Restrictive Covenant Fee', amount: fs.ab1466 });
      total = basePage + addl + fs.sb2 + fs.fraudFee + fs.ab1466;

    } else if (docCategory === 'fbn') {
      var fbnCost = fs.fbnFirst;
      lines.push({ label: 'FBN/DBA – first name filing', amount: fbnCost });
      total = fbnCost;
      if (extraNames > 0 && fs.fbnExtra > 0) {
        var extraCost = extraNames * fs.fbnExtra;
        lines.push({ label: 'FBN/DBA – extra names (' + extraNames + ' × $' + fs.fbnExtra + ')', amount: extraCost });
        total += extraCost;
      }

    } else if (docCategory === 'cert') {
      var certCost = fs.certCopy;
      var certLabel = 'Certified copy fee' + (fs.certCopyNote ? ' ' + fs.certCopyNote : '');
      lines.push({ label: certLabel, amount: certCost });
      total = certCost;

    } else {
      /* other recordable */
      var basePage2 = fs.firstPage;
      var addl2 = (pages - 1) * fs.addlPage;
      lines.push({ label: 'Recording – first page', amount: basePage2 });
      if (addl2 > 0) lines.push({ label: 'Recording – additional pages (' + (pages - 1) + ' × $' + fs.addlPage + ')', amount: addl2 });
      total = basePage2 + addl2;
    }

    return { lines: lines, total: total };
  }

  function runCalc(countyKey, docValue, pages, extraDocs, extraFbnNames) {
    var fs = FEE_SCHEDULE[countyKey];
    var docType = DOC_TYPES.find(function (d) { return d.value === docValue; });
    var category = docType ? docType.category : 'other';

    var lineItems = [];
    var grandTotal = 0;

    /* Trip fee */
    lineItems.push({ label: fs.name + ' trip fee', amount: fs.tripFee });
    grandTotal += fs.tripFee;

    /* Extra documents */
    if (extraDocs > 0) {
      var extraCost = extraDocs * 25;
      lineItems.push({ label: 'Extra documents (' + extraDocs + ' × $25)', amount: extraCost });
      grandTotal += extraCost;
    }

    /* County recording fees */
    var county = calcCountyFee(countyKey, category, pages, extraFbnNames);
    county.lines.forEach(function (l) { lineItems.push(l); });
    grandTotal += county.total;

    return { lineItems: lineItems, grandTotal: grandTotal };
  }

  /* ── DOM helpers ───────────────────────────────────────────────────────── */
  function fmt(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function buildHTML(result) {
    var rows = result.lineItems.map(function (item) {
      return '<tr><td class="dr-calc__label">' + item.label + '</td><td class="dr-calc__amount">' + fmt(item.amount) + '</td></tr>';
    }).join('');

    return '<table class="dr-calc__table" aria-label="Fee breakdown">' +
      '<thead><tr><th>Item</th><th>Amount</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td class="dr-calc__label dr-calc__total-label"><strong>Estimated Total</strong></td>' +
      '<td class="dr-calc__amount dr-calc__total-amount"><strong>' + fmt(result.grandTotal) + '</strong></td></tr></tfoot>' +
      '</table>' +
      '<p class="dr-calc__disclaimer">Fees verified June 2026 &middot; Final amount confirmed with recorder at filing.</p>';
  }

  /* ── Widget initializer ────────────────────────────────────────────────── */
  function initCalculator(wrapper) {
    /* Populate county select */
    var countySelect = wrapper.querySelector('[data-dr-county]');
    var docSelect    = wrapper.querySelector('[data-dr-doctype]');
    var pagesInput   = wrapper.querySelector('[data-dr-pages]');
    var extraInput   = wrapper.querySelector('[data-dr-extra]');
    var fbnRow       = wrapper.querySelector('[data-dr-fbn-row]');
    var fbnExtra     = wrapper.querySelector('[data-dr-fbn-extra]');
    var output       = wrapper.querySelector('[data-dr-output]');

    if (!countySelect || !docSelect || !output) return;

    /* Populate options if empty */
    if (countySelect.options.length === 0) {
      Object.keys(FEE_SCHEDULE).forEach(function (key) {
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = FEE_SCHEDULE[key].name + ' (trip fee: ' + fmt(FEE_SCHEDULE[key].tripFee) + ')';
        countySelect.appendChild(opt);
      });
    }

    if (docSelect.options.length === 0) {
      DOC_TYPES.forEach(function (d) {
        var opt = document.createElement('option');
        opt.value = d.value;
        opt.textContent = d.label;
        docSelect.appendChild(opt);
      });
    }

    /* Apply per-page default document type, if provided.
       Spoke pages set data-dr-default-doctype="grant-deed" (etc.) on the
       wrapper so the calculator opens pre-selected to that document. */
    var defaultDoc = wrapper.getAttribute('data-dr-default-doctype');
    if (defaultDoc && DOC_TYPES.some(function (d) { return d.value === defaultDoc; })) {
      docSelect.value = defaultDoc;
    }

    function toggleFbn() {
      if (!fbnRow) return;
      var docType = DOC_TYPES.find(function (d) { return d.value === docSelect.value; });
      fbnRow.style.display = (docType && docType.category === 'fbn') ? '' : 'none';
    }

    function update() {
      toggleFbn();
      var county    = countySelect.value || 'la';
      var docVal    = docSelect.value || 'grant-deed';
      var pages     = parseInt(pagesInput ? pagesInput.value : 2, 10) || 2;
      var extra     = parseInt(extraInput ? extraInput.value : 0, 10) || 0;
      var fbnNames  = parseInt(fbnExtra ? fbnExtra.value : 0, 10) || 0;
      if (pages < 1) pages = 1;
      if (extra < 0) extra = 0;
      if (fbnNames < 0) fbnNames = 0;

      var result = runCalc(county, docVal, pages, extra, fbnNames);
      output.innerHTML = buildHTML(result);
    }

    countySelect.addEventListener('change', update);
    docSelect.addEventListener('change', update);
    if (pagesInput) pagesInput.addEventListener('input', update);
    if (extraInput) extraInput.addEventListener('input', update);
    if (fbnExtra) fbnExtra.addEventListener('input', update);

    update(); /* initial render */
  }

  /* ── Auto-init all .dr-calculator widgets on the page ─────────────────── */
  function autoInit() {
    var widgets = document.querySelectorAll('.dr-calculator');
    widgets.forEach(function (w) { initCalculator(w); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();
