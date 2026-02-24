#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "Country-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "country-pricing-rules.json"
OUTPUT_JS   = BASE_DIR / "country-pricing-rules.js"


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
        "chamber_required",
        "chamber_fee",
        "chamber_expedite_fee",
        "notes",
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing columns in Country-Pricing-Master.xlsx: {missing}"
        )

    rules = {}
    for _, row in df.iterrows():
        country = str(row["country"]).strip()
        if not country:
            continue

        ctype = str(row["type"]).strip().lower()
        cons_fee = float(row.get("consulate_fee", 0) or 0)
        svc_fee = float(row.get("service_fee", 0) or 0)
        chamber_raw = str(row.get("chamber_required", "")).strip()
        chamber_required = (
            chamber_raw if chamber_raw and chamber_raw.lower() != "no" else False
        )
        chamber_fee = float(row.get("chamber_fee", 0) or 0)
        chamber_expedite = float(row.get("chamber_expedite_fee", 0) or 0)
        notes = str(row.get("notes", "") or "").replace('"', '\\"')

        rules[country] = {
            "type": ctype,
            "consulateFee": cons_fee,
            "serviceFee": svc_fee,
            "chamberRequired": chamber_required,
            "chamberFee": chamber_fee,
            "chamberExpediteFee": chamber_expedite,
            "notes": notes,
        }

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
        if data["type"] == "non_hague":
            lines.append(f'    consulateFee: {data["consulateFee"]},')
            lines.append(f'    serviceFee: {data["serviceFee"]},')
            if data["chamberRequired"]:
                lines.append(
                    f'    chamberRequired: "{data["chamberRequired"]}",'
                )
                lines.append(f'    chamberFee: {data["chamberFee"]},')
                lines.append(
                    f'    chamberExpediteFee: {data["chamberExpediteFee"]},'
                )
            else:
                lines.append("    chamberRequired: false,")
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

