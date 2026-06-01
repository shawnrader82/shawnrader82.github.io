#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_XLSX = BASE_DIR / "Translation-Pricing-Master.xlsx"
OUTPUT_JSON = BASE_DIR / "translation-pricing-rules.json"
OUTPUT_JS   = BASE_DIR / "translation-pricing-rules.js"


def load_language_pairs():
    df = pd.read_excel(INPUT_XLSX, sheet_name="Language Pairs & Rates")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required = [
        "source_language",
        "target_language",
        "base_price_per_page_–_personal",
        "base_price_per_page_–_business",
        "rush_(50%_faster)",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing columns in Language Pairs & Rates: {missing}"
        )

    pairs = {}
    for _, row in df.iterrows():
        src = str(row["source_language"]).strip()
        tgt = str(row["target_language"]).strip()
        if not src or not tgt:
            continue

        personal = float(row["base_price_per_page_–_personal"])
        business = float(row["base_price_per_page_–_business"])
        rush = float(row["rush_(50%_faster)"])

        key = f"{src}__{tgt}"
        pairs[key] = {
            "source": src,
            "target": tgt,
            "personalPerPage": personal,
            "businessPerPage": business,
            "rushPerPage": rush,
        }

    return pairs


def load_addons():
    df = pd.read_excel(INPUT_XLSX, sheet_name="Translation Add-ons")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required = ["addon_code", "label", "price", "price_type", "description"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Missing columns in Translation Add-ons: {missing}"
        )

    addons = {}
    for _, row in df.iterrows():
        code = str(row["addon_code"]).strip()
        if not code or code.upper() == "LEGEND:":
            continue

        label = str(row["label"]).strip()
        price = float(row["price"] or 0)
        price_type = str(row["price_type"]).strip()
        desc = str(row.get("description", "") or "").replace('"', '\\"')

        addons[code] = {
            "label": label,
            "price": price,
            "priceType": price_type,
            "description": desc,
        }

    return addons


def write_json_and_js(pairs, addons):
    data = {
        "pairs": pairs,
        "addons": addons,
    }

    # JSON
    OUTPUT_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # JS
    lines = []
    lines.append("// ========== TRANSLATION PRICING RULES ==========")
    lines.append("// Generated from Translation-Pricing-Master.xlsx")
    lines.append("")
    lines.append("const TRANSLATION_PRICING_RULES = {")
    lines.append("  pairs: {")
    for key, vals in pairs.items():
        lines.append(
            f'    "{key}": {{ '
            f'source: "{vals["source"]}", '
            f'target: "{vals["target"]}", '
            f'personalPerPage: {vals["personalPerPage"]}, '
            f'businessPerPage: {vals["businessPerPage"]}, '
            f'rushPerPage: {vals["rushPerPage"]} }},'
        )
    lines.append("  },")
    lines.append("  addons: {")
    for code, vals in addons.items():
        lines.append(
            f'    "{code}": {{ '
            f'label: "{vals["label"]}", '
            f'price: {vals["price"]}, '
            f'priceType: "{vals["priceType"]}", '
            f'description: "{vals["description"]}" }},'
        )
    lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("function getTranslationRate(source, target) {")
    lines.append("  const key = `${source}__${target}`;")
    lines.append("  return TRANSLATION_PRICING_RULES.pairs[key] || null;")
    lines.append("}")
    lines.append("")
    lines.append("function getTranslationAddon(code) {")
    lines.append("  return TRANSLATION_PRICING_RULES.addons[code] || null;")
    lines.append("}")
    lines.append("")
    lines.append("if (typeof window !== 'undefined') {")
    lines.append("  window.TRANSLATION_PRICING_RULES = TRANSLATION_PRICING_RULES;")
    lines.append("  window.getTranslationRate = getTranslationRate;")
    lines.append("  window.getTranslationAddon = getTranslationAddon;")
    lines.append("}")
    lines.append("")
    js_text = "\n".join(lines)
    OUTPUT_JS.write_text(js_text, encoding="utf-8")


def main():
    pairs = load_language_pairs()
    addons = load_addons()
    write_json_and_js(pairs, addons)
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_JS}")


if __name__ == "__main__":
    main()

