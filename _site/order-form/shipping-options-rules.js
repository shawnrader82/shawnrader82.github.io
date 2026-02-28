// ========== SHIPPING OPTIONS RULES ==========
// Generated from Shipping-Options-Pricing.xlsx

const SHIPPING_OPTIONS_RULES = {
  "internationalrecipient": [
    { id: "fedex_intl_3_10", carrier: "FedEx", service: "FedEx International Priority", days: "3-10", price: 120.0, label: "FedEx - FedEx International Priority - (3-10 days) - ($120.00)" },
    { id: "dhl_intl_3_10", carrier: "DHL", service: "DHL Economy Select", days: "3-10", price: 140.0, label: "DHL - DHL Economy Select - (3-10 days) - ($140.00)" },
    { id: "usps_intl_3_25", carrier: "USPS", service: "Priority Mail Express International", days: "3-25", price: 80.0, label: "USPS - Priority Mail Express International - (3-25 days) - ($80.00)" },
  ],
  "backtoyou": [
    { id: "usps_domestic_priority", carrier: "USPS", service: "Priority Express", days: "2-3", price: 0.0, label: "USPS - Priority Express - (2-3 days) - ($0.00)" },
    { id: "usps_domestic_express", carrier: "USPS", service: "Priority Express", days: "1-2", price: 35.0, label: "USPS - Priority Express - (1-2 days) - ($35.00)" },
    { id: "fedex_domestic_ground", carrier: "FedEx", service: "Ground", days: "1-5", price: 20.0, label: "FedEx - Ground - (1-5 days) - ($20.00)" },
    { id: "fedex_domestic_2day", carrier: "FedEx", service: "2 Day", days: "2", price: 45.0, label: "FedEx - 2 Day - (2 days) - ($45.00)" },
    { id: "fedex_domestic_overnight_8pm", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "8 PM", price: 65.0, label: "FedEx - Overnight - (1 days) - ($65.00)" },
    { id: "fedex_domestic_overnight_12am", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "12 AM", price: 70.0, label: "FedEx - Overnight - (1 days) - ($70.00)" },
    { id: "fedex_domestic_first_8am", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "8 AM", price: 120.0, label: "FedEx - Overnight - (1 days) - ($120.00)" },
  ],
  "otherusrecipient": [
    { id: "usps_domestic_priority", carrier: "USPS", service: "Priority Express", days: "2-3", price: 0.0, label: "USPS - Priority Express - (2-3 days) - ($0.00)" },
    { id: "usps_domestic_express", carrier: "USPS", service: "Priority Express", days: "1-2", price: 35.0, label: "USPS - Priority Express - (1-2 days) - ($35.00)" },
    { id: "fedex_domestic_ground", carrier: "FedEx", service: "Ground", days: "1-5", price: 20.0, label: "FedEx - Ground - (1-5 days) - ($20.00)" },
    { id: "fedex_domestic_2day", carrier: "FedEx", service: "2 Day", days: "2", price: 45.0, label: "FedEx - 2 Day - (2 days) - ($45.00)" },
    { id: "fedex_domestic_overnight_8pm", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "8 PM", price: 65.0, label: "FedEx - Overnight - (1 days) - ($65.00)" },
    { id: "fedex_domestic_overnight_12am", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "12 AM", price: 70.0, label: "FedEx - Overnight - (1 days) - ($70.00)" },
    { id: "fedex_domestic_first_8am", carrier: "FedEx", service: "Overnight", days: "1", timeWindow: "8 AM", price: 120.0, label: "FedEx - Overnight - (1 days) - ($120.00)" },
  ],
  "samedaycourierla": [
    { id: "courier_la_sameday", carrier: "Local Courier", service: "Los Angeles", days: "0", price: 65.0, label: "Local Courier - Los Angeles - ($65.00)" },
    { id: "courier_oc_sameday", carrier: "Local Courier", service: "Orange County", days: "0", price: 130.0, label: "Local Courier - Orange County - ($130.00)" },
    { id: "courier_vc_sameday", carrier: "Local Courier", service: "Ventura", days: "0", price: 130.0, label: "Local Courier - Ventura - ($130.00)" },
  ],
  "samedaycourieroc": [
    { id: "courier_la_sameday", carrier: "Local Courier", service: "Los Angeles", days: "0", price: 65.0, label: "Local Courier - Los Angeles - ($65.00)" },
    { id: "courier_oc_sameday", carrier: "Local Courier", service: "Orange County", days: "0", price: 130.0, label: "Local Courier - Orange County - ($130.00)" },
    { id: "courier_vc_sameday", carrier: "Local Courier", service: "Ventura", days: "0", price: 130.0, label: "Local Courier - Ventura - ($130.00)" },
  ],
};

function getShippingOptionsForRecipient(recipientType) {
  return SHIPPING_OPTIONS_RULES[recipientType] || [];
}

if (typeof window !== 'undefined') {
  window.SHIPPING_OPTIONS_RULES = SHIPPING_OPTIONS_RULES;
  window.getShippingOptionsForRecipient = getShippingOptionsForRecipient;
}