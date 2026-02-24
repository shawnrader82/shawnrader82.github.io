#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "County-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "county-pricing-rules.json"
OUTPUT_JS   = BASE_DIR / "county-pricing-rules.js"


def load_county_rules():
    df = pd.read_excel(INPUT_XLSX, sheet_name="County Rules")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Match your actual column names after normalization
    required_cols = [
        "state",
        "requirescounty",
        "countyperdocfee",
        "countyservicefee",
        "notes",
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing columns in County-Pricing-Master.xlsx: {missing}"
        )

    rules = {}
    for _, row in df.iterrows():
        state = str(row["state"]).strip()
        if not state:
            continue

        requires_raw = str(row["requirescounty"]).strip().lower()
        requires = requires_raw in ["yes", "true", "y", "1"]

        per_doc = float(row.get("countyperdocfee", 0) or 0)
        service_fee = float(row.get("countyservicefee", 0) or 0)
        notes = str(row.get("notes", "") or "").replace('"', '\\"')

        rules[state] = {
            "requiresCountyAuth": requires,
            "countyPerDocFee": per_doc,
            "countyServiceFee": service_fee,
            "notes": notes,
        }

    return rules


def write_json_and_js(rules):
    # JSON for backend or debugging
    OUTPUT_JSON.write_text(json.dumps(rules, indent=2), encoding="utf-8")

    # JS for the browser
    lines = []
    lines.append("// ========== COUNTY PRICING RULES ==========")
    lines.append("// Generated from County-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const COUNTY_PRICING_RULES = {")
    for state, data in rules.items():
        lines.append(f'  "{state}": {{')
        lines.append(
            f'    requiresCountyAuth: {str(data["requiresCountyAuth"]).lower()},'
        )
        lines.append(f'    countyPerDocFee: {data["countyPerDocFee"]},')
        lines.append(f'    countyServiceFee: {data["countyServiceFee"]},')
        lines.append(f'    notes: "{data["notes"]}"')
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.COUNTY_PRICING_RULES = COUNTY_PRICING_RULES;")
    lines.append("}")
    lines.append("")
    js_text = "\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")


def main():
    rules = load_county_rules()
    write_json_and_js(rules)
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

