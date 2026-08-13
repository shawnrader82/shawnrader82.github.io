# PDF Tools

## fix-poa-acroform.py

Repairs the CA Statutory POA PDF (and similar ReportLab-generated fillable PDFs) so they:
1. Register all form widgets in the document catalog's `/AcroForm /Fields` array (fixes "widget annotation not reachable from /AcroForm" warnings)
2. Preserve full interactivity — customers can still tap/fill fields on desktop and mobile (Foxit, Chrome PDF viewer, Nextcloud PDF viewer)
3. Strip document-level and per-widget JavaScript that breaks Brave's PDFium print engine on page 3

## Why this matters

ReportLab's `canvas.acroForm` API sometimes creates widget annotations directly on pages without adding them to the catalog-level `/AcroForm /Fields` array. Strict PDF viewers (Brave's PDFium in particular) refuse to render or print pages with orphan widgets. Symptom: printing page 3 warms the printer then aborts with no output.

## Usage

```bash
pip install pypdf
python3 scripts/pdf-tools/fix-poa-acroform.py \
  assets/forms/ca-statutory-power-of-attorney.pdf \
  assets/forms/ca-statutory-power-of-attorney.pdf
```

Or on a fresh generation:

```bash
python3 scripts/pdf-tools/fix-poa-acroform.py raw-poa.pdf assets/forms/ca-statutory-power-of-attorney.pdf
```

## Verification

After running, both should be true:

```bash
qpdf --check assets/forms/ca-statutory-power-of-attorney.pdf 2>&1 | grep -i warning
# (no output = repaired)

pdfinfo assets/forms/ca-statutory-power-of-attorney.pdf | grep -iE "form|javascript"
# Form:            AcroForm
# JavaScript:      no
```
