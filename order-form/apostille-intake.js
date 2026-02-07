// ========== STEP 3 · SCRIPTS (LOCAL TO THIS STEP) ==========

// Helper to read rules from apostille-country-rules.js
function getCountryRule(countryName) {
  if (!window.APOSTILLE_COUNTRY_RULES) return null;
  return window.APOSTILLE_COUNTRY_RULES[countryName] || null;
}

// Helper to read county rules from county-pricing-rules.js
function getCountyCostsForState(stateName, docCount) {
  const rules = window.COUNTY_PRICING_RULES || {};
  const rule = rules[stateName];
  if (!rule || !rule.requiresCountyAuth) {
    return { total: 0 };
  }
  const perDocTotal = (rule.countyPerDocFee || 0) * docCount;
  const serviceFee = rule.countyServiceFee || 0;
  const total = perDocTotal + serviceFee;
  return { total };
}

// Build the master country list once
function getAllCountriesFromRulesOrFallback() {
  let countries = [];
  if (window.APOSTILLE_COUNTRY_RULES) {
    countries = Object.keys(window.APOSTILLE_COUNTRY_RULES).sort();
  } else {
    countries = [
      "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
      "Bahrain", "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China",
      "Colombia", "Costa Rica", "Croatia", "Cyprus", "Czech Republic", "Denmark",
      "Dominican Republic", "Ecuador", "Egypt", "France", "Germany", "Greece",
      "Hong Kong", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
      "Italy", "Japan", "Jordan", "Kuwait", "Lebanon", "Malaysia", "Mexico",
      "Morocco", "Netherlands", "New Zealand", "Norway", "Pakistan", "Peru",
      "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
      "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
      "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "Ukraine",
      "United Arab Emirates", "United Kingdom", "United States", "Vietnam"
    ];
  }
  return countries;
}

// Populate all per-document country selects
function populateDocumentCountrySelects() {
  const selects = document.querySelectorAll(".document-country-select");
  if (!selects.length) return;

  const countries = getAllCountriesFromRulesOrFallback();

  selects.forEach(select => {
    if (select.dataset.populated === "true") return;

    countries.forEach(country => {
      const opt = document.createElement("option");
      opt.value = country;
      opt.textContent = country;
      select.appendChild(opt);
    });

    select.dataset.populated = "true";

    select.addEventListener("change", () => {
      const country = select.value;
      const rule = getCountryRule(country);
      const helpEl = select.closest(".full-field")?.querySelector(".form-help");

      if (helpEl) {
        if (!rule) {
          helpEl.textContent = "Used to apply Hague vs non-Hague rules and any country-specific fees for this document group.";
        } else if (rule.type === "non_hague") {
          const consulate = rule.consulateFee || 0;
          helpEl.textContent = "Non-Hague destination: additional consulate/authentication steps apply. " +
            (consulate > 0
              ? `Estimated consulate fee around $${consulate} per document in this group (plus service/chamber fees where required).`
              : "Additional fees vary by country and document type.");
        } else {
          helpEl.textContent = "Hague Convention member: standard apostille is usually sufficient for this document group.";
        }
      }

      if (typeof updateOrderEstimate === "function") {
        updateOrderEstimate();
      }
    });
  });
}

// Document list + total
let docCounter = 1;
const docListEl = document.getElementById("document-list");
const addDocBtn = document.getElementById("add-document-btn");
const totalDocsEl = document.getElementById("total_documents");

function updateTotalDocuments() {
  if (!totalDocsEl) return;
  const quantities = Array.from(document.querySelectorAll(".doc-quantity"));
  const total = quantities.reduce((sum, input) => {
    const val = parseInt(input.value || "0", 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  totalDocsEl.value = total || 0;
  if (typeof updateOrderEstimate === "function") {
    updateOrderEstimate();
  }
}

if (addDocBtn && docListEl) {
  addDocBtn.addEventListener("click", () => {
    docCounter++;
    const newRow = document.createElement("div");
    newRow.className = "document-row";
    newRow.innerHTML = docListEl.firstElementChild.innerHTML;

    const header = newRow.querySelector(".document-row-header");
    header.innerHTML = `
      <span>Document #${docCounter}</span>
      <button type="button" class="btn-pill btn-pill--danger remove-doc-btn">Remove</button>
    `;

    newRow.querySelectorAll(".doc-quantity").forEach(i => (i.value = 1));
    newRow.querySelectorAll("select").forEach(sel => (sel.selectedIndex = 0));

    // Reset the country select populated flag so it gets repopulated
    newRow.querySelectorAll(".document-country-select").forEach(sel => {
      sel.dataset.populated = "false";
      // Clear existing options except the first placeholder
      while (sel.options.length > 1) {
        sel.remove(1);
      }
    });

    docListEl.appendChild(newRow);
    populateDocumentCountrySelects();
    updateTotalDocuments();
  });

  docListEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-doc-btn")) {
      const rows = docListEl.querySelectorAll(".document-row");
      if (rows.length > 1) {
        e.target.closest(".document-row").remove();
        updateTotalDocuments();
      }
    }
  });

  docListEl.addEventListener("input", (e) => {
    if (e.target.classList.contains("doc-quantity")) {
      updateTotalDocuments();
    }
  });

  updateTotalDocuments();
}

// ========== TRANSLATION PRICING (from translation-pricing-rules.js) ==========

// Build unique language list from translation-pricing-rules.js
function getUniqueLanguages() {
  if (!window.TRANSLATION_PRICING_RULES?.pairs) {
    console.warn("TRANSLATION_PRICING_RULES not loaded");
    return [];
  }
  const set = new Set();
  Object.values(window.TRANSLATION_PRICING_RULES.pairs).forEach(pair => {
    set.add(pair.source);
    set.add(pair.target);
  });
  return Array.from(set).sort();
}

function populateTranslationLanguageSelects() {
  const fromSel = document.getElementById("translation_from_language");
  const toSel = document.getElementById("translation_to_language");
  if (!fromSel || !toSel) return;

  const langs = getUniqueLanguages();
  langs.forEach(lang => {
    const o1 = document.createElement("option");
    o1.value = o1.textContent = lang;
    fromSel.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = o2.textContent = lang;
    toSel.appendChild(o2);
  });
}

// Look up translation rate from external rules
function findRateRow(sourceLang, targetLang) {
  if (!window.TRANSLATION_PRICING_RULES?.pairs) return null;
  const key = `${sourceLang}__${targetLang}`;
  return window.TRANSLATION_PRICING_RULES.pairs[key] || null;
}

function calculateTranslationTotal() {
  const fromSel = document.getElementById("translation_from_language");
  const toSel = document.getElementById("translation_to_language");
  const usage = document.getElementById("usage_type");
  const wordsEl = document.getElementById("translation_words");
  const totalField = document.getElementById("translation_total");

  if (!fromSel || !toSel || !usage || !wordsEl) return 0;

  const source = fromSel.value;
  const target = toSel.value;
  if (!source || !target || source === target) {
    if (totalField) totalField.value = "";
    return 0;
  }

  const row = findRateRow(source, target);
  if (!row) {
    if (totalField) totalField.value = "";
    return 0;
  }

  const totalWords = parseInt(wordsEl.value || "0", 10) || 0;
  const pages = Math.max(1, Math.ceil(totalWords / 250));

  // Use field names from external rules
  const baseRate = usage.value === "business" ? row.businessPerPage : row.personalPerPage;
  let total = pages * baseRate;

  // Check expedited checkbox - uses rushPerPage from rules
  const expediteCheckbox = document.getElementById("addon_expedited_turnaround");
  if (expediteCheckbox && expediteCheckbox.checked) {
    total += pages * row.rushPerPage;
  }

  // Process other addons from external rules
  const addons = window.TRANSLATION_PRICING_RULES?.addons || {};

  ["shipped_hard_copy", "notarization"].forEach(code => {
    const checkbox = document.getElementById(`addon_${code}`);
    if (!checkbox || !checkbox.checked) return;

    const addon = addons[code];
    if (!addon) return;

    if (addon.priceType === "per_page") {
      total += addon.price * pages;
    } else if (addon.priceType === "per_transaction") {
      total += addon.price;
    }
  });

  if (totalField) totalField.value = total.toFixed(2);
  return total;
}

// ========== APOSTILLE PRICING ==========

function getApostillePrice(usageType, quantity) {
  if (typeof window.getApostillePricing === "function") {
    const result = window.getApostillePricing(usageType, quantity);
    if (result && typeof result.total === "number") {
      return result.total;
    }
  }
  return usageType === "business" ? 250 : 175;
}

// ========== PRICING CALCULATION ==========

function calculateBaseTotal() {
  const usageField = document.getElementById("usage_type");
  const usageType = usageField ? usageField.value : "personal";

  const totalDocsElLocal = document.getElementById("total_documents");
  const docCount = totalDocsElLocal ? parseInt(totalDocsElLocal.value || "1", 10) : 1;

  const apostilleInput = document.getElementById("svc-apostille");
  const translationInput = document.getElementById("svc-translation");
  const needApostille = apostilleInput && apostilleInput.checked;
  const needTranslation = translationInput && translationInput.checked;

  let total = 0;

  if (needApostille) {
    total += getApostillePrice(usageType, docCount);

    // ========== COUNTY FEES (per document row) ==========
    const allRows = document.querySelectorAll("#document-list .document-row");
    const statesAlreadyCharged = new Set();

    allRows.forEach(row => {
      const stateSelect = row.querySelector('select[name="document_state[]"]');
      const qtyInput = row.querySelector(".doc-quantity");
      if (!stateSelect) return;

      const stateName = stateSelect.options[stateSelect.selectedIndex].text.trim();
      const qty = qtyInput ? parseInt(qtyInput.value || "0", 10) || 0 : 0;
      if (!stateName || !qty) return;

      const countyRule = window.COUNTY_PRICING_RULES ? window.COUNTY_PRICING_RULES[stateName] : null;
      if (countyRule && countyRule.requiresCountyAuth) {
        total += (countyRule.countyPerDocFee || 0) * qty;
        if (!statesAlreadyCharged.has(stateName)) {
          total += countyRule.countyServiceFee || 0;
          statesAlreadyCharged.add(stateName);
        }
      }
    });
    // ========== /COUNTY FEES ==========

    // ========== MULTI-STATE FEE ==========
    const allStateSelects = document.querySelectorAll('select[name="document_state[]"]');
    const uniqueStates = new Set();
    allStateSelects.forEach(sel => {
      if (sel.value) uniqueStates.add(sel.value);
    });

    if (uniqueStates.size > 1) {
      const additionalStateFee = typeof window.getAdditionalStateFee === "function"
        ? window.getAdditionalStateFee()
        : 75;
      total += additionalStateFee * (uniqueStates.size - 1);
    }
    // ========== /MULTI-STATE FEE ==========

    // ========== NON-HAGUE COUNTRY FEES ==========
    const rows = document.querySelectorAll("#document-list .document-row");
    rows.forEach(row => {
      const qtyInput = row.querySelector(".doc-quantity");
      const countrySelect = row.querySelector(".document-country-select");

      const qty = qtyInput ? parseInt(qtyInput.value || "0", 10) || 0 : 0;
      const country = countrySelect ? countrySelect.value : "";

      if (!qty || !country) return;

      const rule = getCountryRule(country);
      if (!rule || rule.type !== "non_hague") return;

      const consulatePerDoc = parseFloat(rule.consulateFee || 0);
      const serviceFee = parseFloat(rule.serviceFee || 0);
      const chamberFee = parseFloat(rule.chamberFee || 0);

      if (consulatePerDoc) total += consulatePerDoc * qty;
      if (serviceFee) total += serviceFee;
      if (chamberFee) total += chamberFee;
    });
    // ========== /NON-HAGUE COUNTRY FEES ==========
  }

  if (needTranslation) {
    const translationField = document.getElementById("translation_total");
    if (translationField && translationField.value) {
      total += parseFloat(translationField.value || "0");
    }
  }

  return total;
}

function updateOrderEstimate() {
  const base = calculateBaseTotal();

  // Sum speed prices from ALL state speed selections
  let speedPrice = 0;
  const speedContainer = document.querySelector("#apostille-speed-block .speed-options-container");
  if (speedContainer) {
    speedContainer.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      speedPrice += parseFloat(radio.getAttribute("data-speed-price") || "0");
    });
  }

  const grandTotal = base + speedPrice;

  document.querySelectorAll("#order_estimated_total").forEach(el => {
    el.value = grandTotal > 0 ? "$" + grandTotal.toFixed(2) : "";
  });
}

// ========== INTAKE FORM SCRIPTS (GLOBAL) ==========

function updateServiceTiles() {
  const apostilleInput = document.getElementById("svc-apostille");
  const translationInput = document.getElementById("svc-translation");
  const apostilleBlock = document.getElementById("apostille-documents-block");
  const translationBlock = document.getElementById("translation-documents-block");
  const translationAddons = document.getElementById("translation-addons-block");

  if (!apostilleInput || !translationInput) return;

  const apostilleTile = apostilleInput.closest(".service-tile").querySelector(".service-tile-body");
  const translationTile = translationInput.closest(".service-tile").querySelector(".service-tile-body");

  apostilleTile.style.borderColor = apostilleInput.checked ? "#111827" : "#d1d5db";
  apostilleTile.style.background = apostilleInput.checked ? "#eef2ff" : "#f9fafb";

  translationTile.style.borderColor = translationInput.checked ? "#111827" : "#d1d5db";
  translationTile.style.background = translationInput.checked ? "#eef2ff" : "#f9fafb";

  if (apostilleBlock) apostilleBlock.classList.toggle("hidden", !apostilleInput.checked);
  if (translationBlock) translationBlock.classList.toggle("hidden", !translationInput.checked);
  if (translationAddons) translationAddons.classList.toggle("hidden", !translationInput.checked);
}

document.addEventListener("DOMContentLoaded", function () {
  const steps = Array.from(document.querySelectorAll(".intake-step"));
  const pills = Array.from(document.querySelectorAll(".intake-step-pill"));

  populateTranslationLanguageSelects();
  populateDocumentCountrySelects();

  ["translation_from_language", "translation_to_language", "translation_words"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        calculateTranslationTotal();
        updateOrderEstimate();
      });
      el.addEventListener("input", () => {
        calculateTranslationTotal();
        updateOrderEstimate();
      });
    }
  });

  ["addon_shipped_hard_copy", "addon_notarization", "addon_expedited_turnaround"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        calculateTranslationTotal();
        updateOrderEstimate();
      });
    }
  });

  function updateStepPillVisibility(activeIndex) {
    const total = pills.length;
    const visible = new Set();

    if (activeIndex <= 1) {
      visible.add(0);
      if (total > 1) visible.add(1);
      if (total > 2) visible.add(2);
    } else if (activeIndex >= total - 2) {
      if (total >= 3) {
        visible.add(total - 3);
        visible.add(total - 2);
        visible.add(total - 1);
      }
    } else {
      visible.add(activeIndex - 1);
      visible.add(activeIndex);
      visible.add(activeIndex + 1);
    }

    pills.forEach((pill, i) => {
      pill.style.display = visible.has(i) ? "flex" : "none";
    });
  }

  function scrollActiveStepIntoView(index) {
    const container = document.querySelector(".intake-steps");
    const pill = pills[index];
    if (!container || !pill || pill.style.display === "none") return;

    const containerRect = container.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const offset = pillRect.left - containerRect.left;
    const centerOffset = offset - (containerRect.width / 2 - pillRect.width / 2);
    container.scrollTo({ left: container.scrollLeft + centerOffset, behavior: "smooth" });
  }

  function setActiveStep(index) {
    steps.forEach((step, i) => step.classList.toggle("intake-step--active", i === index));
    pills.forEach((pill, i) => pill.classList.toggle("intake-step-pill--active", i === index));
    updateStepPillVisibility(index);

    const active = steps[index];
    if (active) window.scrollTo({ top: active.offsetTop - 40, behavior: "smooth" });
    scrollActiveStepIntoView(index);

    updateServiceTiles();
    updateSpeedOptionsForState();
    updateOrderEstimate();
  }

  document.querySelectorAll("[data-next-step]").forEach(btn => {
    btn.addEventListener("click", () => setActiveStep(parseInt(btn.getAttribute("data-next-step"), 10)));
  });

  document.querySelectorAll("[data-prev-step]").forEach(btn => {
    btn.addEventListener("click", () => setActiveStep(parseInt(btn.getAttribute("data-prev-step"), 10)));
  });

  const usageField = document.getElementById("usage_type");
  document.querySelectorAll("[data-usage-value]").forEach(btn => {
    btn.addEventListener("click", () => {
      usageField.value = btn.getAttribute("data-usage-value");
      document.querySelectorAll("[data-usage-value]").forEach(b =>
        b.classList.toggle("toggle-pill--active", b === btn)
      );
      calculateTranslationTotal();
      updateOrderEstimate();
    });
  });

  const apostilleInput = document.getElementById("svc-apostille");
  const translationInput = document.getElementById("svc-translation");

  if (apostilleInput) apostilleInput.checked = false;
  if (translationInput) translationInput.checked = false;

  if (apostilleInput) {
    apostilleInput.addEventListener("change", () => {
      updateServiceTiles();
      updateOrderEstimate();
    });
  }

  if (translationInput) {
    translationInput.addEventListener("change", () => {
      updateServiceTiles();
      calculateTranslationTotal();
      updateOrderEstimate();
    });
  }

  const deliveryField = document.getElementById("delivery_method");
  if (deliveryField) {
    document.querySelectorAll("[data-delivery-value]").forEach(btn => {
      btn.addEventListener("click", () => {
        deliveryField.value = btn.getAttribute("data-delivery-value");
        document.querySelectorAll("[data-delivery-value]").forEach(b =>
          b.classList.toggle("toggle-pill--active", b === btn)
        );
      });
    });
  }

  updateServiceTiles();
  setActiveStep(0);

  // ========== SPEED OPTIONS (reads from state-pricing-rules.js) ==========
  function updateSpeedOptionsForState() {
    const container = document.querySelector("#apostille-speed-block .speed-options-container");
    if (!container) return;

    // Get all unique states from document rows
    const allStateSelects = document.querySelectorAll('select[name="document_state[]"]');
    const uniqueStates = new Set();
    allStateSelects.forEach(sel => {
      if (sel.value) uniqueStates.add(sel.value);
    });

    if (uniqueStates.size === 0) {
      container.innerHTML = `
        <div class="form-help" style="color:#6b7280;">
          Select an issuing state in Step 2 to see available speed options.
        </div>
      `;
      return;
    }

    let html = "";

    uniqueStates.forEach(stateCode => {
      const stateRule = window.STATE_PRICING_RULES ? window.STATE_PRICING_RULES[stateCode] : null;

      if (!stateRule || !stateRule.options || stateRule.options.length === 0) {
        html += `
          <div class="form-help" style="color:#6b7280; margin-bottom: 8px;">
            <strong>${stateCode}:</strong> Timing will be confirmed after review.
          </div>
        `;
        return;
      }

      html += `<div class="state-speed-group" style="margin-bottom:16px;">`;
      html += `<div style="font-weight:600; margin-bottom:6px;">${stateRule.stateName}</div>`;

      stateRule.options.forEach((opt, idx) => {
        const inputName = `speed_${stateCode}`;
        const inputId = `speed_${stateCode}_${idx}`;
        const priceLabel = opt.price > 0 ? ` (+$${opt.price.toFixed(0)})` : " (included)";
        const checkedAttr = idx === 0 ? "checked" : "";

        html += `
          <label class="toggle-pill" style="display:flex; align-items:center; margin-bottom:4px; cursor:pointer;">
            <input type="radio"
                   name="${inputName}"
                   id="${inputId}"
                   value="${opt.label}"
                   data-speed-price="${opt.price}"
                   ${checkedAttr}
                   style="margin-right:8px;">
            ${opt.label}${priceLabel}
          </label>
        `;
      });

      if (stateRule.notes && stateRule.notes !== "nan") {
        html += `<div class="form-help" style="color:#6b7280; font-size:12px; margin-top:4px;">${stateRule.notes}</div>`;
      }

      html += `</div>`;
    });

    container.innerHTML = html;

    // Attach change listeners to update estimate
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener("change", () => {
        updateOrderEstimate();
      });
    });
  }

  // Make updateSpeedOptionsForState available globally
  window.updateSpeedOptionsForState = updateSpeedOptionsForState;
});

