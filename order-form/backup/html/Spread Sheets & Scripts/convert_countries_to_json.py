#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

EXCEL_FILE = "Country-Pricing.xlsx"
OUTPUT_FILE = "apostille_country_rules.js"

# Sheet names in your workbook
HAGUE_SHEET = "Hague Countries"
NON_HAGUE_SHEET = "Non-Hague Countries"
FEE_LOOKUP_SHEET = "Fee Lookup"

def load_countries():
    xlsx_path = Path(EXCEL_FILE)
    if not xlsx_path.exists():
        raise SystemExit(f"Excel file not found: {xlsx_path}")

    # Read the two country tables
    hague_df = pd.read_excel(xlsx_path, sheet_name=HAGUE_SHEET)
    non_hague_df = pd.read_excel(xlsx_path, sheet_name=NON_HAGUE_SHEET)

    # Normalize column names we need
    # Hague / Non-Hague sheets both have:
    # Country, Convention Status, Additional Fee Per Doc, Notes
    hague_df = hague_df.rename(
        columns={
            "Country": "Country",
            "Convention Status": "Convention Status",
            "Additional Fee Per Doc": "Additional Fee Per Doc",
            "Notes": "Notes",
        }
    )
    non_hague_df = non_hague_df.rename(
        columns={
            "Country": "Country",
            "Convention Status": "Convention Status",
            "Additional Fee Per Doc": "Additional Fee Per Doc",
            "Notes": "Notes",
        }
    )

    rules = {}

    # Hague countries
    for _, row in hague_df.iterrows():
        country = str(row["Country"]).strip()
        if not country:
            continue

        rules[country] = {
            "type": "hague",
            "conventionStatus": str(row.get("Convention Status", "")).strip(),
            "additionalFeePerDoc": float(row.get("Additional Fee Per Doc", 0) or 0),
            "note": str(row.get("Notes", "")).strip(),
        }

    # Non‑Hague countries
    for _, row in non_hague_df.iterrows():
        country = str(row["Country"]).strip()
        if not country:
            continue

        rules[country] = {
            "type": "non_hague",
            "conventionStatus": str(row.get("Convention Status", "")).strip(),
            "additionalFeePerDoc": float(row.get("Additional Fee Per Doc", 0) or 0),
            "note": str(row.get("Notes", "")).strip(),
        }

    return rules

def main():
    rules = load_countries()

    js = "window.APOSTILLE_COUNTRY_RULES = " + json.dumps(rules, indent=2) + ";\n"
    Path(OUTPUT_FILE).write_text(js, encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

