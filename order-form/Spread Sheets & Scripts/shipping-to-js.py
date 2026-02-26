#!/usr/bin/env python3
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "Shipping-Options-Pricing.xlsx"
OUTPUT_JS  = BASE_DIR / "shipping-options-rules.js"


def load_shipping_rules():
    """
    Reads all sheets from Shipping-Options-Pricing.xlsx and builds
    a dict keyed by shippingrecipienttype values used in the form.
    """
    sheets = pd.read_excel(INPUT_XLSX, sheet_name=None)
    rules = {}

    # ---- International sheet → internationalrecipient ----
    intl_df = sheets.get("International")
    if intl_df is not None:
        intl_df.columns = [c.strip().lower().replace(" ", "_") for c in intl_df.columns]
        for col in ["carrier", "service", "days", "price", "id"]:
            if col not in intl_df.columns:
                raise RuntimeError(f"Missing column '{col}' in 'International' sheet")
        options = []
        for _, row in intl_df.iterrows():
            opt_id  = str(row["id"]).strip()
            carrier = str(row["carrier"]).strip()
            service = str(row["service"]).strip()
            days    = str(row["days"]).strip()
            price_raw = row.get("price", 0) or 0
            if not opt_id or not carrier or not service:
                continue
            price = float(price_raw)
            label = f"{carrier} - {service} - ({days} days) - (${price:.2f})"
            options.append({
                "id": opt_id,
                "carrier": carrier,
                "service": service,
                "days": days,
                "price": price,
                "label": label,
            })
        rules["internationalrecipient"] = options

    # ---- US Domestic sheet → backtoyou + otherusrecipient ----
    us_df = sheets.get("US Domestic")
    if us_df is not None:
        us_df.columns = [c.strip().lower().replace(" ", "_") for c in us_df.columns]
        for col in ["carrier", "service", "days", "price", "id"]:
            if col not in us_df.columns:
                raise RuntimeError(f"Missing column '{col}' in 'US Domestic' sheet")
        us_options = []
        for _, row in us_df.iterrows():
            opt_id  = str(row["id"]).strip()
            carrier = str(row["carrier"]).strip()
            service = str(row["service"]).strip()
            days    = str(row["days"]).strip()
            price_raw = row.get("price", 0) or 0
            if not opt_id or not carrier or not service:
                continue
            price = float(price_raw)

            # Optional time_window column (for overnight options)
            raw_tw = row.get("time_window", "")
            time_window = ""
            if "time_window" in us_df.columns and pd.notna(raw_tw):
                time_window = str(raw_tw).strip()

            label = f"{carrier} - {service} - ({days} days) - (${price:.2f})"
            us_options.append({
                "id": opt_id,
                "carrier": carrier,
                "service": service,
                "days": days,
                "time_window": time_window,
                "price": price,
                "label": label,
            })

        rules["backtoyou"] = us_options
        rules["otherusrecipient"] = us_options

    # ---- Same Day Courier sheet → samedaycourierla + samedaycourieroc ----
    courier_df = sheets.get("Same Day Courier")
    if courier_df is not None:
        courier_df.columns = [c.strip().lower().replace(" ", "_") for c in courier_df.columns]
        for col in ["carrier", "service", "days", "price", "id"]:
            if col not in courier_df.columns:
                raise RuntimeError(f"Missing column '{col}' in 'Same Day Courier' sheet")
        courier_options = []
        for _, row in courier_df.iterrows():
            opt_id  = str(row["id"]).strip()
            carrier = str(row["carrier"]).strip()
            service = str(row["service"]).strip()
            days    = str(row["days"]).strip()
            price_raw = row.get("price", 0) or 0
            if not opt_id or not carrier or not service:
                continue
            price = float(price_raw)

            raw_tw = row.get("time_window", "")
            time_window = ""
            if "time_window" in courier_df.columns and pd.notna(raw_tw):
                time_window = str(raw_tw).strip()

            label = f"{carrier} - {service} - (${price:.2f})"
            courier_options.append({
                "id": opt_id,
                "carrier": carrier,
                "service": service,
                "days": days,
                "time_window": time_window,
                "price": price,
                "label": label,
            })
        rules["samedaycourierla"] = courier_options
        rules["samedaycourieroc"] = courier_options

    return rules


def write_js(rules):
    """
    Writes shipping-options-rules.js in the same style as your other rules files.
    """
    js = []
    js.append("// ========== SHIPPING OPTIONS RULES ==========")
    js.append("// Generated from Shipping-Options-Pricing.xlsx")
    js.append("")
    js.append("const SHIPPING_OPTIONS_RULES = {")
    for recipient_type, options in rules.items():
        js.append(f'  "{recipient_type}": [')
        for opt in options:
            # Build optional timeWindow field
            time_window_js = ""
            tw = opt.get("time_window")
            if tw:
                tw_str = str(tw).strip()
                # Normalize common Excel time formats
                if tw_str in ("20:00:00", "20:00"):
                    tw_str = "8 PM"
                elif tw_str in ("00:00:00", "00:00"):
                    tw_str = "12 AM"
                elif tw_str in ("08:00:00", "8:00:00", "08:00"):
                    tw_str = "8 AM"
                time_window_js = f'timeWindow: "{tw_str}", '

            js.append(
                '    { id: "' + opt["id"] + '", '
                'carrier: "' + opt["carrier"] + '", '
                'service: "' + opt["service"] + '", '
                'days: "' + opt["days"] + '", '
                + time_window_js +
                "price: " + str(opt["price"]) + ", "
                'label: "' + opt["label"].replace('"', '\\"') + '" },'
            )
        js.append("  ],")
    js.append("};")
    js.append("")
    js.append("function getShippingOptionsForRecipient(recipientType) {")
    js.append("  return SHIPPING_OPTIONS_RULES[recipientType] || [];")
    js.append("}")
    js.append("")
    js.append("if (typeof window !== 'undefined') {")
    js.append("  window.SHIPPING_OPTIONS_RULES = SHIPPING_OPTIONS_RULES;")
    js.append("  window.getShippingOptionsForRecipient = getShippingOptionsForRecipient;")
    js.append("}")
    js_text = "\n".join(js)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")
    print(f"Wrote: {OUTPUT_JS}")


def main():
    rules = load_shipping_rules()
    write_js(rules)


if __name__ == "__main__":
    main()

