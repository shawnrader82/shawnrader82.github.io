#!/usr/bin/env python3
"""
Repair the CA Statutory POA PDF by directly fixing the degenerate text matrix
on page 3.

Root cause identified: Page 3 content stream contains
    0.0 0.0 0.0 1.0 332.762 129.497 Tm
which sets text horizontal scale to 0, making text 0-pixels wide. Determinant
of this matrix is 0.0, which Brave's PDFium refuses to render — hence the
"page 3 warms printer then aborts with no output" symptom.

The subsequent operation is
    1.0 0.0 0.0 1.0 332.762 129.497 Tm
which is the CORRECT matrix at the same coordinates. So the broken one is
a leftover/stray from an earlier edit and can be safely removed.

Fix: replace the degenerate matrix with an identity matrix (a=1) so any
viewer sees a valid transform.

Also registers all widget annotations at the catalog /AcroForm level and
strips embedded JavaScript.
"""
import sys
import re
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    NameObject, ArrayObject, DictionaryObject, IndirectObject,
    BooleanObject, ByteStringObject, ContentStream
)

src = sys.argv[1]
dst = sys.argv[2]

reader = PdfReader(src)
writer = PdfWriter(clone_from=reader)

# --- Fix degenerate text matrices on all pages ---
def fix_content_stream(data_bytes):
    """Replace any Tm operator with det=0 with an identity-scale variant."""
    data = data_bytes.decode('latin-1', errors='replace')
    original_data = data
    
    fixes = 0
    # Match: a b c d e f Tm  where det(a*d - b*c) == 0
    def replace_tm(match):
        nonlocal fixes
        a, b, c, d, e, f = [float(x) for x in match.groups()]
        det = a*d - b*c
        if abs(det) < 0.0001:
            # Degenerate — rewrite as identity-scale at same coords
            fixes += 1
            return f"1 0 0 1 {e} {f} Tm"
        return match.group(0)
    
    pattern = r'(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+Tm'
    data = re.sub(pattern, replace_tm, data)
    
    return data.encode('latin-1', errors='replace'), fixes

total_fixes = 0
for i, page in enumerate(writer.pages):
    contents = page.get("/Contents")
    if not contents:
        continue
    contents = contents.get_object() if hasattr(contents, 'get_object') else contents
    
    if hasattr(contents, 'get_data'):
        # Single stream
        data = contents.get_data()
        new_data, fixes = fix_content_stream(data)
        if fixes > 0:
            contents.set_data(new_data)
            print(f"Page {i+1}: fixed {fixes} degenerate text matrices")
            total_fixes += fixes
    elif hasattr(contents, '__iter__'):
        # Multiple streams
        for stream_ref in contents:
            stream = stream_ref.get_object() if hasattr(stream_ref, 'get_object') else stream_ref
            if hasattr(stream, 'get_data'):
                data = stream.get_data()
                new_data, fixes = fix_content_stream(data)
                if fixes > 0:
                    stream.set_data(new_data)
                    print(f"Page {i+1}: fixed {fixes} degenerate text matrices in sub-stream")
                    total_fixes += fixes

print(f"Total text matrix fixes: {total_fixes}\n")

# --- Register all widgets at catalog /AcroForm level ---
catalog = writer._root_object
widget_refs = []
for i, page in enumerate(writer.pages):
    annots = page.get("/Annots")
    if not annots:
        continue
    resolved = annots.get_object() if hasattr(annots, 'get_object') else annots
    for annot_ref in resolved:
        annot = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
        if annot.get("/Subtype") == "/Widget":
            widget_refs.append(annot_ref)

print(f"Widgets found: {len(widget_refs)}")

if "/AcroForm" in catalog:
    acroform = catalog["/AcroForm"]
    if hasattr(acroform, 'get_object'):
        acroform = acroform.get_object()
else:
    acroform = DictionaryObject()
    catalog[NameObject("/AcroForm")] = acroform

acroform[NameObject("/Fields")] = ArrayObject(widget_refs)
acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

# --- Strip JavaScript ---
for key in ["/OpenAction", "/AA"]:
    if key in catalog:
        del catalog[NameObject(key)]
        print(f"Stripped catalog {key}")

if "/Names" in catalog:
    names = catalog["/Names"]
    if hasattr(names, 'get_object'):
        names = names.get_object()
    if "/JavaScript" in names:
        del names[NameObject("/JavaScript")]
        print("Stripped catalog Names/JavaScript")

for widget_ref in widget_refs:
    widget = widget_ref.get_object() if hasattr(widget_ref, 'get_object') else widget_ref
    for key in ["/AA", "/A"]:
        if key in widget:
            del widget[NameObject(key)]

with open(dst, "wb") as f:
    writer.write(f)

print(f"\nWrote: {dst}")
