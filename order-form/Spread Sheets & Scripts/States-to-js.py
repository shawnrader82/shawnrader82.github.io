#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "State-Pricing-Master.xlsx"
OUTPUT_JS   = BASE_DIR / "state-pricing-rules.js"

def load_state_rules():
    df = pd.read_excel(INPUT_XLSX)
    df.columns = [str(c).strip() for c in df.columns]

    required = ["State Code", "State Name"]
    for col in required:
        if col not in df.columns:
            raise RuntimeError(f"Missing required column: {col}")

    rules = {}

    for _, row in df.iterrows():
        code = str(row["State Code"]).strip()
        if not code or pd.isna(row["State Code"]):
            continue

        name = str(row["State Name"]).strip()
        notes_raw = row.get("Notes", "")
        notes = str(notes_raw).strip() if pd.notna(notes_raw) and str(notes_raw).lower() != "nan" else ""

        options = []

        # Process all 5 options with consistent structure
        for i in range(1, 6):
            title_key = f"Option {i} – Title"
            speed_key = f"Option {i} – Speed"
            price_key = f"Option {i} – Price"

            # Helper to get clean string value
            def get_val(key):
                val = row.get(key, "")
                return str(val).strip() if pd.notna(val) and str(val).lower() != "nan" else ""

            # Helper to get numeric price
            def get_price(key):
                val = row.get(key, "")
                try:
                    return float(val) if pd.notna(val) else 0.0
                except:
                    return 0.0

            title = get_val(title_key)
            speed = get_val(speed_key)
            price = get_price(price_key)

            # Skip if both title and speed are empty
            if not title and not speed:
                continue

            # Build combined label
            label = " · ".join([v for v in [title, speed] if v])

            options.append({
                "title": title,
                "speed": speed,
                "price": price,
                "label": label,
            })

        rules[code] = {
            "stateName": name,
            "options": options,
            "notes": notes,
        }

    return rules

def write_js(rules):
    js_obj = json.dumps(rules, indent=2, ensure_ascii=False)
    lines = []
    lines.append("// ========== STATE PRICING RULES ==========")
    lines.append("// Generated from State-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const STATE_PRICING_RULES = " + js_obj + ";")
    lines.append("")
    lines.append("function getStateSpeedOptions(stateCode) {")
    lines.append("  return STATE_PRICING_RULES[stateCode] || null;")
    lines.append("}")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.STATE_PRICING_RULES = STATE_PRICING_RULES;")
    lines.append("  window.getStateSpeedOptions = getStateSpeedOptions;")
    lines.append("}")

    # CHANGE THIS LINE:
    js_text = "\n".join(lines)   # was "\\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")


def main():
    rules = load_state_rules()
    write_js(rules)
    print(f"✓ Wrote: {OUTPUT_JS}")
    print(f"  {len(rules)} states/territories processed")

if __name__ == "__main__":
    main()

