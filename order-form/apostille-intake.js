// ========== STEP 3 · SCRIPTS (LOCAL TO THIS STEP) ==========

// Build translation language selects from TRANSLATION_PRICING_RULES
function populateTranslationLanguageSelects() {
  const rules = window.TRANSLATION_PRICING_RULES;
  if (!rules || !rules.pairs) return;

  const fromSelect = document.getElementById("translation_from_language");
  const toSelect   = document.getElementById("translation_to_language");
  if (!fromSelect || !toSelect) return;

  // Collect unique language names from all pairs
  const langs = new Set();
  Object.values(rules.pairs).forEach(pair => {
    if (pair.source) langs.add(pair.source);
    if (pair.target) langs.add(pair.target);
  });

  const sortedLangs = Array.from(langs).sort();

  function fillSelect(select) {
    // Keep the first placeholder option, remove the rest
    while (select.options.length > 1) {
      select.remove(1);
    }
    sortedLangs.forEach(lang => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      select.appendChild(opt);
    });
  }

  fillSelect(fromSelect);
  fillSelect(toSelect);
}


// Helper to read rules from country-pricing-rules.js
function getCountryRule(countryName) {
  if (typeof window.COUNTRY_PRICING_RULES === "object" && window.COUNTRY_PRICING_RULES !== null) {
    return window.COUNTRY_PRICING_RULES[countryName] || null;
  }
  return null;
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
  if (typeof window.COUNTRY_PRICING_RULES === "object" && window.COUNTRY_PRICING_RULES !== null) {
    return Object.keys(window.COUNTRY_PRICING_RULES).sort();
  }
  return [];
}

// Populate all per-document country selects
function populateDocumentCountrySelects() {
  const selects = document.querySelectorAll(".document-country-select");
  if (!selects.length) return;

  const countries = getAllCountriesFromRulesOrFallback();

  selects.forEach(select => {
    if (select.dataset.populated === "true") return;

    while (select.options.length > 1) {
      select.remove(1);
    }

    countries.forEach(country => {
      const opt = document.createElement("option");
      opt.value = country;

      const rule = getCountryRule(country);

      let isAvailable = true;
      if (rule && typeof rule.serviceAvailable === "boolean") {
        isAvailable = rule.serviceAvailable;
      }

      if (!isAvailable) {
        opt.disabled = true;
        opt.textContent = country + " (not currently serviceable)";
      } else {
        opt.textContent = country;
      }

      select.appendChild(opt);
    });

    select.dataset.populated = "true";

    select.addEventListener("change", () => {
      const country = select.value;
      const rule = getCountryRule(country);
      const helpEl = select.closest(".full-field")?.querySelector(".form-help");

      if (helpEl) {
        if (!rule) {
          helpEl.textContent =
            "Used to apply Hague vs non-Hague rules and any country-specific fees for this document group.";
        } else if (rule.type === "non_hague" || rule.type === "nonhague") {
          const personalFees = rule.fees && rule.fees.personal ? rule.fees.personal : null;
          const consulate = personalFees ? (personalFees.consulateFee || 0) : 0;
          helpEl.textContent =
            "Non-Hague destination: additional consulate/authentication steps apply. " +
            (consulate > 0
              ? `Estimated consulate fee around $${consulate} per document in this group (plus service/chamber fees where required).`
              : "Additional fees vary by country and document type.");
        } else {
          helpEl.textContent =
            "Hague Convention member: standard apostille is usually sufficient for this document group.";
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
      <button type="button" class="btn-pill btn-pill--danger remove-doc_btn">Remove</button>
    `;

    newRow.querySelectorAll(".doc-quantity").forEach(i => (i.value = 1));
    newRow.querySelectorAll("select").forEach(sel => (sel.selectedIndex = 0));

    newRow.querySelectorAll(".document-country-select").forEach(sel => {
      sel.dataset.populated = "false";
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

// ========== TRANSLATION PRICING (flat per page) ==========

function calculateTranslationTotal() {
  const usage = document.getElementById("usage_type");
  const pagesEl = document.getElementById("translation_words");
  const totalField = document.getElementById("translation_total");

  if (!usage || !pagesEl) return 0;

  const raw = parseInt(pagesEl.value || "0", 10) || 0;
  const pages = Math.max(1, raw);

  const isBusiness = usage.value === "business";
  const baseRatePerPage = isBusiness ? 55 : 45;
  let total = pages * baseRatePerPage;

  const expediteCheckbox = document.getElementById("addon_expedited_turnaround");
  if (expediteCheckbox && expediteCheckbox.checked) {
    const rushPerPage = 25;
    total += pages * rushPerPage;
  }

  const addonsConfig = {
    shipped_hard_copy: { price: 35, type: "per_transaction" },
    notarization: { price: 75, type: "per_transaction" },
  };

  ["shipped_hard_copy", "notarization"].forEach(code => {
    const checkbox = document.getElementById(`addon_${code}`);
    if (!checkbox || !checkbox.checked) return;

    const cfg = addonsConfig[code];
    if (!cfg) return;

    if (cfg.type === "per_page") {
      total += cfg.price * pages;
    } else {
      total += cfg.price;
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

  let apostilleTotal = 0;
  let translationTotal = 0;

  // ----- Apostille portion -----
  if (needApostille) {
    apostilleTotal += getApostillePrice(usageType, docCount);

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
        apostilleTotal += (countyRule.countyPerDocFee || 0) * qty;
        if (!statesAlreadyCharged.has(stateName)) {
          apostilleTotal += countyRule.countyServiceFee || 0;
          statesAlreadyCharged.add(stateName);
        }
      }
    });

    const allStateSelects = document.querySelectorAll('select[name="document_state[]"]');
    const uniqueStates = new Set();
    allStateSelects.forEach(sel => {
      if (sel.value) uniqueStates.add(sel.value);
    });

    if (uniqueStates.size > 1) {
      const additionalStateFee = typeof window.getAdditionalStateFee === "function"
        ? window.getAdditionalStateFee()
        : 75;
      apostilleTotal += additionalStateFee * (uniqueStates.size - 1);
    }

    const rows = document.querySelectorAll("#document-list .document-row");
    rows.forEach(row => {
      const qtyInput = row.querySelector(".doc-quantity");
      const countrySelect = row.querySelector(".document-country-select");

      const qty = qtyInput ? parseInt(qtyInput.value || "0", 10) || 0 : 0;
      const country = countrySelect ? countrySelect.value : "";

      if (!qty || !country) return;

      const rule = getCountryRule(country);
      if (!rule || rule.type !== "non_hague") return;

      const fees = rule.fees || {};
      const feeSet = fees[usageType] || fees.personal || fees.business || null;
      if (!feeSet) return;

      const consulatePerDoc = parseFloat(feeSet.consulateFee || 0);
      const serviceFee = parseFloat(feeSet.serviceFee || 0);
      const chamberFee = parseFloat(feeSet.chamberFee || 0);

      if (consulatePerDoc) apostilleTotal += consulatePerDoc * qty;
      if (serviceFee) apostilleTotal += serviceFee;
      if (chamberFee) apostilleTotal += chamberFee;
    });
  }

  // Write apostille subtotal into Step 2 field
  const apostilleSubtotalField = document.getElementById("apostille_estimated_total");
  if (apostilleSubtotalField) {
    apostilleSubtotalField.value = needApostille && apostilleTotal > 0
      ? "$" + apostilleTotal.toFixed(2)
      : "";
  }

  // ----- Translation portion -----
  if (needTranslation) {
    const translationField = document.getElementById("translation_total");
    const usageFieldForTrans = document.getElementById("usage_type");
    const pagesEl = document.getElementById("translation_words");

    const usageTypeForTranslation = usageFieldForTrans ? usageFieldForTrans.value : "personal";
    const isBusiness = usageTypeForTranslation === "business";
    const baseRatePerPage = isBusiness ? 55 : 45;

    if (translationField && translationField.value) {
      translationTotal += parseFloat(translationField.value || "0");
    } else {
      const raw = pagesEl ? parseInt(pagesEl.value || "0", 10) || 0 : 0;
      const pages = Math.max(1, raw);
      translationTotal += pages * baseRatePerPage;
    }
  }

  // Write translation subtotal into Step 2 field
  const translationSubtotalField = document.getElementById("translation_estimated_total");
  if (translationSubtotalField) {
    translationSubtotalField.value = needTranslation && translationTotal > 0
      ? "$" + translationTotal.toFixed(2)
      : "";
  }

  // Combined base total for overall estimate
  return apostilleTotal + translationTotal;
}

function updateOrderEstimate() {
  const base = calculateBaseTotal();

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

// make sure listeners can see it
window.updateOrderEstimate = updateOrderEstimate;


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

function updateRequiredFieldsForServices() {
  const apostilleInput = document.getElementById("svc-apostille");
  const translationInput = document.getElementById("svc-translation");

  const apostilleSelected = apostilleInput && apostilleInput.checked;
  const translationSelected = translationInput && translationInput.checked;

  // Apostille: all issuing state / doc type / quantity / country fields
  document.querySelectorAll("#apostille-documents-block .document-row").forEach(row => {
    const stateSel   = row.querySelector('select[name="document_state[]"]');
    const typeSel    = row.querySelector('select[name="document_type[]"]');
    const qtyInput   = row.querySelector('.doc-quantity');
    const countrySel = row.querySelector('.document-country-select');

    [stateSel, typeSel, qtyInput, countrySel].forEach(el => {
      if (!el) return;
      if (apostilleSelected) {
        el.setAttribute("required", "required");
      } else {
        el.removeAttribute("required");
      }
    });
  });

  // Translation: from / to / pages in Step 2
  const fromLang = document.getElementById("translation_from_language");
  const toLang   = document.getElementById("translation_to_language");
  const pages    = document.getElementById("translation_words");

  [fromLang, toLang, pages].forEach(el => {
    if (!el) return;
    if (translationSelected) {
      el.setAttribute("required", "required");
    } else {
      el.removeAttribute("required");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const steps = Array.from(document.querySelectorAll(".intake-step"));
  const pills = Array.from(document.querySelectorAll(".intake-step-pill"));

  populateTranslationLanguageSelects();
  populateDocumentCountrySelects();
  updateRequiredFieldsForServices();

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

  // ========== SHIPPING RECIPIENT CARDS & COURIER FEES ==========
  function updateRecipientCardsAndCourierFees() {
    const intlCard = document.getElementById("international-recipient-card");
    const usCard = document.getElementById("us-recipient-card");
    const radios = document.querySelectorAll('input[name="shipping_recipient_type"]');
    if (!radios.length) return;

    let selected = null;
    radios.forEach(r => {
      if (r.checked) selected = r.value;
    });

    // Hide both by default
    if (intlCard) intlCard.classList.add("hidden");
    if (usCard) usCard.classList.add("hidden");

    // Show the correct card based on Step 4 selection
    if (selected === "international_recipient") {
      if (intlCard) intlCard.classList.remove("hidden");
    } else if (selected === "other_us_recipient") {
      if (usCard) usCard.classList.remove("hidden");
    }

    // Same‑day courier fees
    let courierFee = 0;
    if (selected === "same_day_courier_la") {
      courierFee = 65;
    } else if (selected === "same_day_courier_oc") {
      courierFee = 130;
    }
    window._courierFee = courierFee || 0;

    if (typeof updateOrderEstimate === "function") {
      updateOrderEstimate();
    }
  }

  // Watch for changes on Step‑4 shipping-recipient radios
  document.querySelectorAll('input[name="shipping_recipient_type"]').forEach(radio => {
    radio.addEventListener("change", updateRecipientCardsAndCourierFees);
  });

  // Initialize once on load
  updateRecipientCardsAndCourierFees();

  // ========== GOOGLE PLACES AUTOCOMPLETE (US ADDRESSES) ==========
  function attachUsAddressAutocomplete(config) {
    const addressInput = document.getElementById(config.addressId);
    if (!addressInput || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ["address"],
      componentRestrictions: { country: ["us"] }
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place || !place.address_components) return;

      const components = {
        street_number: "",
        route: "",
        locality: "",
        administrative_area_level_1: "",
        postal_code: "",
        country: ""
      };

      place.address_components.forEach(c => {
        const type = c.types[0];
        if (components.hasOwnProperty(type)) {
          components[type] = c.long_name;
        }
      });

      const line1 = [components.street_number, components.route].filter(Boolean).join(" ").trim();

      const cityEl = document.getElementById(config.cityId);
      const stateEl = document.getElementById(config.stateId);
      const zipEl = document.getElementById(config.zipId);
      const countryEl = document.getElementById(config.countryId);

      if (addressInput && line1) addressInput.value = line1;
      if (cityEl && components.locality) cityEl.value = components.locality;
      if (stateEl && components.administrative_area_level_1) stateEl.value = components.administrative_area_level_1;
      if (zipEl && components.postal_code) zipEl.value = components.postal_code;
      if (countryEl && components.country) countryEl.value = components.country;
    });
  }

  function initUsAutocompletes() {
    attachUsAddressAutocomplete({
      addressId: "mailing_address_1",
      cityId: "mailing_city",
      stateId: "mailing_state",
      zipId: "mailing_zip",
      countryId: "mailing_country"
    });

    attachUsAddressAutocomplete({
      addressId: "us_recipient_address_1",
      cityId: "us_recipient_city",
      stateId: "us_recipient_state",
      zipId: "us_recipient_zip",
      countryId: "us_recipient_country"
    });
  }

  setTimeout(initUsAutocompletes, 800);

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

  // expose for other code (if needed)
  window.setActiveStep = setActiveStep;

  // Generic next-step handler, except Step 2 (uses custom validation)
  document.querySelectorAll("[data-next-step]").forEach(btn => {
    const target = parseInt(btn.getAttribute("data-next-step"), 10);
    if (target === 2) return; // Step 2 handled separately
    btn.addEventListener("click", () => setActiveStep(target));
  });

  // Step-2 validation before moving to Step 3
  const step2NextBtn = document.querySelector('button[data-next-step="2"]');
  if (step2NextBtn) {
    step2NextBtn.addEventListener("click", () => {
      const apostilleInput = document.getElementById("svc-apostille");
      const translationInput = document.getElementById("svc-translation");
      const apostilleSelected = apostilleInput && apostilleInput.checked;
      const translationSelected = translationInput && translationInput.checked;

      let valid = true;

      document.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));

      if (apostilleSelected) {
        document.querySelectorAll("#apostille-documents-block .document-row").forEach(row => {
          ["document_state[]", "document_type[]", "document_quantity[]", "document_country[]"].forEach(name => {
            const el = row.querySelector(`[name="${name}"]`);
            if (!el) return;
            const empty = !el.value || (el.type === "number" && Number(el.value) <= 0);
            if (empty) {
              valid = false;
              el.classList.add("field-error");
            }
          });
        });
      }

      if (translationSelected) {
        const fromLang = document.getElementById("translation_from_language");
        const toLang   = document.getElementById("translation_to_language");
        const pages    = document.getElementById("translation_words");

        [fromLang, toLang, pages].forEach(el => {
          if (!el) return;
          const empty = !el.value || (el.type === "number" && Number(el.value) <= 0);
          if (empty) {
            valid = false;
            el.classList.add("field-error");
          }
        });
      }

      if (!valid) {
        alert("Please complete all required fields in Step 2 before continuing.");
        return;
      }

      setActiveStep(2);
    });
  }

  // Previous-step buttons
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
      updateRequiredFieldsForServices();
      updateOrderEstimate();
    });
  }

  if (translationInput) {
    translationInput.addEventListener("change", () => {
      updateServiceTiles();
      updateRequiredFieldsForServices();
      calculateTranslationTotal();
      updateOrderEstimate();
    });
  }

  // Delivery method pills → set hidden input + toggle upload card
  const deliveryField = document.getElementById("delivery_method");
  const uploadCard = document.getElementById("document-upload-card");

  if (deliveryField) {
    const deliveryPills = document.querySelectorAll("[data-delivery-value]");
    deliveryPills.forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-delivery-value");
        deliveryField.value = value;

        deliveryPills.forEach(b =>
          b.classList.toggle("toggle-pill--active", b === btn)
        );

        // Show upload card only when "Document upload only" is selected
        if (uploadCard) {
          uploadCard.style.display = (value === "upload_only") ? "" : "none";
        }

        updateOrderEstimate();
      });
    });
  }

  // File upload filename display
  const uploadInput = document.getElementById("intake_upload_files");
  const uploadNameSpan = document.getElementById("intake_upload_files_name");
  if (uploadInput && uploadNameSpan) {
    uploadInput.addEventListener("change", () => {
      if (!uploadInput.files || uploadInput.files.length === 0) {
        uploadNameSpan.textContent = "No files chosen";
      } else if (uploadInput.files.length === 1) {
        uploadNameSpan.textContent = uploadInput.files[0].name;
      } else {
        uploadNameSpan.textContent = uploadInput.files.length + " files selected";
      }
    });
  }

  updateServiceTiles();
  updateRequiredFieldsForServices();
  setActiveStep(0);

  function updateSpeedOptionsForState() {
    const container = document.querySelector("#apostille-speed-block .speed-options-container");
    if (!container) return;

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

    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener("change", () => {
        updateOrderEstimate();
      });
    });
  }

  window.updateSpeedOptionsForState = updateSpeedOptionsForState;
});

