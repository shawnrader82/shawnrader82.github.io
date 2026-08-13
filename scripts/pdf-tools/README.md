# PDF Tools

## fix-poa-acroform.py

Repairs the CA Statutory POA PDF (and similar ReportLab/Foxit-edited fillable PDFs) so all pages print correctly across all PDF viewers while preserving interactive form fields.

## Root cause

The site's fillable POA PDF had a **degenerate text matrix on page 3**:

```
0.0 0.0 0.0 1.0 332.762 129.497 Tm
```

The first value (horizontal text scaling) was `0.0`, giving the matrix a determinant of 0. Mathematically this collapses text to zero pixels wide — invalid PDF.

- **Non-strict viewers** (Chrome's PDFium in most contexts, Adobe Reader, Foxit, Nextcloud's PDF viewer, iOS Safari) silently ignore the bad matrix and continue
- **Strict viewers** — Brave's PDFium in particular — refuse to render/print the page containing the invalid transform

Symptom: printing page 3 in Brave warmed up the printer then aborted with no output. Even "print page 3 only" failed. All other viewers rendered the page fine.

## What the script does

1. **Fixes degenerate text matrices** — walks each page's content stream, finds any `a b c d e f Tm` operator with `det = a*d - b*c = 0`, and replaces with `1 0 0 1 e f Tm` (identity scale at the same coordinates)
2. **Registers form widgets in AcroForm/Fields** — corrects ReportLab's habit of creating widget annotations on pages without adding them to the catalog-level `/AcroForm /Fields` array
3. **Sets NeedAppearances=true** so viewers regenerate field appearances when the user fills them
4. **Strips document JavaScript** — removes catalog-level `/JavaScript`, `/OpenAction`, `/AA` and per-widget `/AA`, `/A` that break some print engines
5. **Preserves** all 17 tappable widgets, F=4 print flags, borders/appearance settings, Foxit compatibility, exact visual layout

## Usage

```bash
pip install pypdf
python3 scripts/pdf-tools/fix-poa-acroform.py \
  path/to/input.pdf \
  path/to/output.pdf
```

Safe to run repeatedly on the same file (idempotent).

## Verification

After running, these should all be true:

```bash
# 1. No degenerate matrices
python3 -c "
from pypdf import PdfReader; import re
r = PdfReader('assets/forms/ca-statutory-power-of-attorney.pdf')
for i,p in enumerate(r.pages,1):
    c = p.get('/Contents')
    if c:
        c = c.get_object() if hasattr(c,'get_object') else c
        if hasattr(c,'get_data'):
            d = c.get_data().decode('latin-1',errors='replace')
            for m in re.finditer(r'(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+Tm',d):
                v=[float(x) for x in m.groups()]
                det=v[0]*v[3]-v[1]*v[2]
                if abs(det)<0.0001: print(f'Page {i}: DEGENERATE {m.group(0)}')
print('OK')"

# 2. No PDF structural warnings
qpdf --check assets/forms/ca-statutory-power-of-attorney.pdf 2>&1 | grep -iE 'warning|error' || echo 'Clean'

# 3. Ghostscript parses without complaint
gs -o /dev/null -sDEVICE=nullpage -dNOPAUSE -dBATCH assets/forms/ca-statutory-power-of-attorney.pdf 2>&1 | grep -iE 'error|warning|degenerate|repaired' || echo 'Clean'

# 4. Form fields still present
pdfinfo assets/forms/ca-statutory-power-of-attorney.pdf | grep -iE 'form|javascript'
# Should show: Form: AcroForm, JavaScript: no
```

## When to run

- After any manual PDF edit in Foxit or Adobe Acrobat that touches the fillable form
- After any ReportLab regeneration of the POA
- If a user reports pages failing to print (particularly page 3) in Brave or other strict PDF renderers
