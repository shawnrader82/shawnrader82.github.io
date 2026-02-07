#!/usr/bin/env python3

import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INPUT_XLSX = BASE_DIR / "Apostille-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "apostille-pricing-rules.json"
OUTPUT_JS = BASE_DIR / "apostille-pricing-rules.js"

def load_tier(sheet_name):
    df = pd.read_excel(INPUT_XLSX, sheet_name=sheet_name)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    required = ["quantity", "per_document", "total_price"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(f"Missing columns in sheet '{sheet_name}': {missing}")
    rules = {}
    for _, row in df.iterrows():
        qty = int(row["quantity"])
        per_doc = float(row["per_document"])
        total = float(row["total_price"])
        rules[qty] = {
            "perDoc": per_doc,
            "total": total,
        }
    return rules

def load_additional_state_fee(sheet_name="Additional State Fees"):
    df = pd.read_excel(INPUT_XLSX, sheet_name=sheet_name)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    # Just grab the per_state fee from the first row (it's constant at $75)
    if "per_state" in df.columns:
        return float(df["per_state"].iloc[0])
    return 75.0  # fallback

def main():
    business = load_tier("Business Pricing")
    personal = load_tier("Personal Pricing")
    additional_state_fee = load_additional_state_fee()

    data = {
        "business": business,
        "personal": personal,
        "additionalStateFee": additional_state_fee,
    }

    # JSON
    OUTPUT_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # JS
    lines = []
    lines.append("// ========== APOSTILLE PRICING RULES ==========")
    lines.append("// Generated from Apostille-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const APOSTILLE_PRICING_RULES = {")
    for tier_name in ["business", "personal"]:
        tier_data = data[tier_name]
        lines.append(f'  "{tier_name}": {{')
        for qty, vals in tier_data.items():
            lines.append(
                f'    {qty}: {{ perDoc: {vals["perDoc"]}, total: {vals["total"]} }},'
            )
        lines.append("  },")
    lines.append(f'  "additionalStateFee": {data["additionalStateFee"]},')
    lines.append("};")
    lines.append("")
    lines.append("function getApostillePricing(tier, quantity) {")
    lines.append("  const table = APOSTILLE_PRICING_RULES[tier];")
    lines.append("  if (!table) return null;")
    lines.append("  if (table[quantity]) return table[quantity];")
    lines.append(
        "  const maxQty = Math.max(...Object.keys(table).map(q => parseInt(q, 10)));"
    )
    lines.append("  if (quantity > maxQty) return table[maxQty];")
    lines.append("  return null;")
    lines.append("}")
    lines.append("")
    lines.append("function getAdditionalStateFee() {")
    lines.append("  return APOSTILLE_PRICING_RULES.additionalStateFee || 75;")
    lines.append("}")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.APOSTILLE_PRICING_RULES = APOSTILLE_PRICING_RULES;")
    lines.append("  window.getApostillePricing = getApostillePricing;")
    lines.append("  window.getAdditionalStateFee = getAdditionalStateFee;")
    lines.append("}")
    lines.append("")
    js_text = "\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")

    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_JS}")

if __name__ == "__main__":
    main()

