#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "State-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "state-pricing-rules.json"
OUTPUT_JS   = BASE_DIR / "state-pricing-rules.js"

def load_state_rules():
    df = pd.read_excel(INPUT_XLSX)

    # Normalize columns
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required = [
        "state_code", "state_name",
        "option_1_label", "option_1_price",
        "option_2_label", "option_2_price",
        "option_3_label", "option_3_price",
        "option_4_label", "option_4_price",
        "option_5_label", "option_5_price",
        "notes",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(f"Missing columns in State-Pricing-Master.xlsx: {missing}")

    rules = {}

    for _, row in df.iterrows():
        code = str(row["state_code"]).strip()
        if not code:
            continue

        name = str(row["state_name"]).strip()
        notes = str(row.get("notes", "") or "").replace('"', '\\"')

        options = []
        for i in range(1, 6):
            label_key = f"option_{i}_label"
            price_key = f"option_{i}_price"
            label_raw = row.get(label_key, "")
            price_raw = row.get(price_key, "")

            label = str(label_raw).strip() if not pd.isna(label_raw) else ""
            if not label:
                continue  # skip empty options

            price = float(price_raw or 0)

            options.append({
                "label": label,
                "price": price,
            })

        rules[code] = {
            "stateName": name,
            "options": options,
            "notes": notes,
        }

    return rules

def write_json_and_js(rules):
    # JSON
    OUTPUT_JSON.write_text(json.dumps(rules, indent=2), encoding="utf-8")

    # JS
    lines = []
    lines.append("// ========== STATE PRICING RULES ==========")
    lines.append("// Generated from State-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const STATE_PRICING_RULES = {")
    for code, data in rules.items():
        lines.append(f'  "{code}": {{')
        lines.append(f'    stateName: "{data["stateName"]}",')
        lines.append("    options: [")
        for opt in data["options"]:
            lines.append(
                f'      {{ label: "{opt["label"]}", price: {opt["price"]} }},'
            )
        lines.append("    ],")
        lines.append(f'    notes: "{data["notes"]}"')
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("function getStateSpeedOptions(stateCode) {")
    lines.append("  return STATE_PRICING_RULES[stateCode] || null;")
    lines.append("}")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.STATE_PRICING_RULES = STATE_PRICING_RULES;")
    lines.append("  window.getStateSpeedOptions = getStateSpeedOptions;")
    lines.append("}")
    js_text = "\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")

def main():
    rules = load_state_rules()
    write_json_and_js(rules)
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

