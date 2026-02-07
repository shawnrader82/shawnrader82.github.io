// ========== APOSTILLE COUNTRY RULES ==========
// Enhanced structure with detailed fee breakdowns for non-Hague countries
// Generated from Country-Pricing-Enhanced.xlsx

const APOSTILLE_COUNTRY_RULES = {
  "Argentina": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Australia": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Austria": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Belgium": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Brazil": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Colombia": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Costa Rica": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Croatia": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Cyprus": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Czech Republic": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Denmark": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "France": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Germany": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Greece": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Hong Kong": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Ireland": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Israel": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Italy": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Japan": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Mexico": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Netherlands": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "New Zealand": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Norway": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Poland": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Portugal": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Romania": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Russia": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "South Africa": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "South Korea": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Spain": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Sweden": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Switzerland": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Turkey": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Ukraine": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "United Kingdom": {
    type: "hague",
    notes: "Hague Convention - standard apostille"
  },
  "Egypt": {
    type: "non_hague",
    consulateFee: 50,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 225,  // consulate + service + chamber (if req)
    notes: "Requires both consulate attestation + US-Arab Chamber of Commerce certification"
  },
  "China": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Vietnam": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Thailand": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "United Arab Emirates": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Saudi Arabia": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Qatar": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Kuwait": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Bahrain": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Jordan": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Lebanon": {
    type: "non_hague",
    consulateFee: 45,
    serviceFee: 75,
    chamberRequired: "US-Arab Chamber",
    chamberFee: 100,
    chamberExpediteFee: 50,
    totalPerDoc: 220,  // consulate + service + chamber (if req)
    notes: "Requires both consulate + US-Arab Chamber certification"
  },
  "Canada": {
    type: "non_hague",
    consulateFee: 50,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 125,  // consulate + service + chamber (if req)
    notes: "Authentication through Global Affairs Canada"
  },
  "Taiwan": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "TECRO (Taipei Economic & Cultural Representative Office) certification"
  },
  "Afghanistan": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Algeria": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Bangladesh": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Indonesia": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Iran": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required - complex political situation may affect processing"
  },
  "Iraq": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Malaysia": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Morocco": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Pakistan": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Philippines": {
    type: "non_hague",
    consulateFee: 35,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 110,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
  "Singapore": {
    type: "non_hague",
    consulateFee: 40,
    serviceFee: 75,
    chamberRequired: false,
    totalPerDoc: 115,  // consulate + service + chamber (if req)
    notes: "Consulate attestation required"
  },
}

// Helper function to calculate non-Hague fees for a document group
function calculateNonHagueFees(countryName, quantity, includeExpedite = false) {
  const rule = APOSTILLE_COUNTRY_RULES[countryName];

  if (!rule || rule.type !== 'non_hague') {
    return {
      consulateFee: 0,
      serviceFee: 0,
      chamberFee: 0,
      chamberExpediteFee: 0,
      total: 0,
      breakdown: []
    };
  }

  const breakdown = [];
  let total = 0;

  // Consulate attestation fee
  if (rule.consulateFee) {
    const consulateTotal = rule.consulateFee * quantity;
    total += consulateTotal;
    breakdown.push({
      label: `${countryName} consulate attestation`,
      perDoc: rule.consulateFee,
      quantity: quantity,
      total: consulateTotal
    });
  }

  // Service fee (one-time per transaction, not per doc)
  if (rule.serviceFee) {
    total += rule.serviceFee;
    breakdown.push({
      label: 'Non-Hague processing service',
      perDoc: null,
      quantity: 1,
      total: rule.serviceFee
    });
  }

  // Chamber of Commerce fee (if required)
  if (rule.chamberRequired && rule.chamberFee) {
    total += rule.chamberFee;
    breakdown.push({
      label: `${rule.chamberRequired} certification`,
      perDoc: null,
      quantity: 1,
      total: rule.chamberFee
    });
  }

  // Chamber expedite fee (optional)
  if (includeExpedite && rule.chamberExpediteFee) {
    total += rule.chamberExpediteFee;
    breakdown.push({
      label: `${rule.chamberRequired} expedited processing`,
      perDoc: null,
      quantity: 1,
      total: rule.chamberExpediteFee
    });
  }

  return {
    consulateFee: rule.consulateFee * quantity,
    serviceFee: rule.serviceFee,
    chamberFee: rule.chamberFee || 0,
    chamberExpediteFee: includeExpedite ? (rule.chamberExpediteFee || 0) : 0,
    total: total,
    breakdown: breakdown
  };
}

// Export for use in main intake script
if (typeof window !== 'undefined') {
  window.APOSTILLE_COUNTRY_RULES = APOSTILLE_COUNTRY_RULES;
  window.calculateNonHagueFees = calculateNonHagueFees;
}
