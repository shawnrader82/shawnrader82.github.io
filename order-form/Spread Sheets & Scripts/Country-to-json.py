#!/usr/bin/env python3

import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "Country-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "country-pricing-rules.json"
OUTPUT_JS = BASE_DIR / "country-pricing-rules.js"


def safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        v_str = str(value).strip()
        if not v_str or v_str.upper() == "PLEASE_RESEARCH":
            return default
        return float(v_str)
    except (ValueError, TypeError):
        return default


def normalize_usage(raw):
    """Map spreadsheet usage_type values to personal / business / both."""
    if raw is None:
        return "both"
    v = str(raw).strip().lower()
    if v in ("personal", "p"):
        return "personal"
    if v in ("business", "company", "commercial", "b"):
        return "business"
    if v in ("both", "all", "any"):
        return "both"
    # default: both, so rules work for either usage
    return "both"


def base_country_name(name):
    """
    Strip parenthetical qualifiers like ' (personal)' so
    'Jordan (personal)' and 'Jordan (company/legal)' both map to 'Jordan'.
    """
    if not name:
        return ""
    s = str(name).strip()
    # If it contains '(', take the part before it
    if "(" in s:
        return s.split("(", 1)[0].strip()
    return s


def load_country_rules():
    # Sheet is called "Country Pricing" per your file
    df = pd.read_excel(INPUT_XLSX, sheet_name="Country Pricing")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required_cols = [
        "country",
        "type",
        "consulate_fee",
        "service_fee",
        "serviceable",          # Yes/No in spreadsheet
        "chamber_required",
        "chamber_fee",
        "chamber_expedite_fee",
        "notes",
        "usage_type",           # NEW: personal / business / both
    ]

    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing columns in Country-Pricing-Master.xlsx: {missing}"
        )

    # We will build one entry per *base* country, with nested fees
    rules = {}

    for _, row in df.iterrows():
        raw_country = str(row["country"]).strip()
        if not raw_country:
            continue

        country = base_country_name(raw_country)
        if not country:
            continue

        ctype = str(row["type"]).strip().lower()
        cons_fee = safe_float(row.get("consulate_fee", 0))
        svc_fee = safe_float(row.get("service_fee", 0))

        chamber_raw = str(row.get("chamber_required", "")).strip()
        chamber_required = (
            chamber_raw if chamber_raw and chamber_raw.lower() != "no" else False
        )

        chamber_fee = safe_float(row.get("chamber_fee", 0))
        chamber_expedite = safe_float(row.get("chamber_expedite_fee", 0))

        notes = str(row.get("notes", "") or "").replace('"', '\\\\\"')

        # serviceable Yes/No -> boolean
        service_raw = str(row.get("serviceable", "") or "").strip().lower()
        service_available = service_raw in ("yes", "y", "true", "1")

        usage = normalize_usage(row.get("usage_type", ""))

        # Initialize country entry if needed
        if country not in rules:
            rules[country] = {
                "type": ctype,
                "serviceAvailable": service_available,
                "fees": {},   # usage_type -> fee dict
                "notes": notes,
            }
        else:
            # Keep type consistent; if mixed, prefer non_hague over hague (more restrictive)
            existing_type = rules[country]["type"]
            if existing_type != ctype:
                if existing_type == "hague" and ctype == "non_hague":
                    rules[country]["type"] = ctype
            # If any variant is serviceable, mark country as serviceable
            rules[country]["serviceAvailable"] = (
                rules[country]["serviceAvailable"] or service_available
            )
            # Optionally append notes if new text and not already present
            if notes and notes not in rules[country]["notes"]:
                if rules[country]["notes"]:
                    rules[country]["notes"] += " "
                rules[country]["notes"] += notes

        # Build fee entry for this usage variant
        fee_entry = {
            "consulateFee": cons_fee,
            "serviceFee": svc_fee,
            "chamberRequired": chamber_required,
            "chamberFee": chamber_fee,
            "chamberExpediteFee": chamber_expedite,
        }

        # For "both", we apply to both personal and business
        if usage == "both":
            rules[country]["fees"]["personal"] = fee_entry
            rules[country]["fees"]["business"] = fee_entry
        else:
            rules[country]["fees"][usage] = fee_entry

    return rules


def write_json_and_js(rules):
    # JSON
    OUTPUT_JSON.write_text(json.dumps(rules, indent=2), encoding="utf-8")

    # JS
    lines = []
    lines.append("// ========== COUNTRY PRICING RULES ==========")
    lines.append("// Generated from Country-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const COUNTRY_PRICING_RULES = {")
    for country, data in rules.items():
        lines.append(f'  "{country}": {{')
        lines.append(f'    type: "{data["type"]}",')
        lines.append(
            f'    serviceAvailable: {str(data["serviceAvailable"]).lower()},'
        )

        # Write nested fees object keyed by usage type
        lines.append("    fees: {")
        fees = data.get("fees", {})
        for usage_key, fee in fees.items():
            lines.append(f'      "{usage_key}": {{')
            if data["type"] == "non_hague":
                lines.append(f'        consulateFee: {fee["consulateFee"]},')
                lines.append(f'        serviceFee: {fee["serviceFee"]},')
                if fee["chamberRequired"]:
                    lines.append(
                        f'        chamberRequired: "{fee["chamberRequired"]}",'
                    )
                    lines.append(f'        chamberFee: {fee["chamberFee"]},')
                    lines.append(
                        f'        chamberExpediteFee: {fee["chamberExpediteFee"]},'
                    )
                else:
                    lines.append("        chamberRequired: false,")
            else:
                # Hague: no consulate/chamber fees
                lines.append("        chamberRequired: false,")
            lines.append("      },")
        lines.append("    },")  # end fees

        lines.append(f'    notes: "{data["notes"]}"')
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.COUNTRY_PRICING_RULES = COUNTRY_PRICING_RULES;")
    lines.append("}")
    lines.append("")
    js_text = "\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")


def main():
    rules = load_country_rules()
    write_json_and_js(rules)
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

