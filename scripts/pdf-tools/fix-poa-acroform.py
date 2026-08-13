#!/usr/bin/env python3
"""
Repair the CA Statutory POA PDF:
1. Collect all widget annotations across all pages
2. Register them at the document catalog's /AcroForm /Fields array so PDF viewers
   and print engines can find them (fixes qpdf's "not reachable from /AcroForm" warnings)
3. Strip ReportLab's page-level JavaScript that trips up Brave's PDFium print path
4. Preserve interactivity — customers can still fill AND print

Uses pypdf, no ReportLab needed since we're just fixing structure not regenerating.
"""
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    NameObject, ArrayObject, DictionaryObject, IndirectObject,
    BooleanObject, NumberObject
)

src = sys.argv[1]
dst = sys.argv[2]

reader = PdfReader(src)
writer = PdfWriter(clone_from=reader)

catalog = writer._root_object
print(f"Pages: {len(writer.pages)}")

# Collect every widget annotation across all pages
widget_refs = []
for i, page in enumerate(writer.pages):
    annots = page.get("/Annots")
    if not annots:
        continue
    resolved_annots = annots.get_object() if hasattr(annots, 'get_object') else annots
    for annot_ref in resolved_annots:
        annot = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
        subtype = annot.get("/Subtype")
        if subtype == "/Widget":
            # Preserve the reference (IndirectObject) not the resolved dict
            widget_refs.append(annot_ref)
    print(f"Page {i+1}: {len(resolved_annots)} annotations")

print(f"\nTotal widget annotations found: {len(widget_refs)}")

# Get or create AcroForm dictionary in catalog
if "/AcroForm" in catalog:
    acroform = catalog["/AcroForm"]
    if hasattr(acroform, 'get_object'):
        acroform = acroform.get_object()
    print(f"Existing AcroForm found with {len(acroform.get('/Fields', []))} field(s)")
else:
    acroform = DictionaryObject()
    catalog[NameObject("/AcroForm")] = acroform
    print("Created new AcroForm dictionary")

# Set Fields array to reference all widgets
acroform[NameObject("/Fields")] = ArrayObject(widget_refs)
acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

# Remove JavaScript from catalog if present
if "/Names" in catalog:
    names = catalog["/Names"]
    if hasattr(names, 'get_object'):
        names = names.get_object()
    if "/JavaScript" in names:
        del names[NameObject("/JavaScript")]
        print("Stripped catalog-level /JavaScript")

if "/OpenAction" in catalog:
    del catalog[NameObject("/OpenAction")]
    print("Stripped catalog-level /OpenAction")

# Strip AA (additional actions) that trigger on document events
for key in ["/AA"]:
    if key in catalog:
        del catalog[NameObject(key)]
        print(f"Stripped catalog-level {key}")

# Strip per-widget JavaScript actions that might trip up print engines
js_stripped = 0
for widget_ref in widget_refs:
    widget = widget_ref.get_object() if hasattr(widget_ref, 'get_object') else widget_ref
    # Strip /AA (Additional Actions) — JS on focus/blur/format/validate/calculate
    if "/AA" in widget:
        del widget[NameObject("/AA")]
        js_stripped += 1
    # Strip /A (single Action)
    if "/A" in widget:
        del widget[NameObject("/A")]

if js_stripped:
    print(f"Stripped JS actions from {js_stripped} widget(s)")

with open(dst, "wb") as f:
    writer.write(f)

print(f"\nWrote: {dst}")
