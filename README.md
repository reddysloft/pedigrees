# Pedigree Generator

A single-page web app for generating pigeon racing pedigree certificates. Pick a
template, enter the subject bird's details, upload each parent's pedigree image,
match birds by ring number, and export as PNG, PDF, or JSON.

Live site (GitHub Pages): https://reddysloft.github.io/pedigrees/

## Features

- Two layout templates (compact and proportional)
- Click-to-color highlights on any card
- Logo upload — shown top-left and as a 10% watermark
- Image auto-fill — free in-browser OCR (Tesseract.js) or optional
  Gemini vision API for near-perfect extraction
- Ring-based matching: type each bird's ring number and the app pulls the
  surrounding text from the uploaded image into the right slot
- JSON export/import — reuse any pedigree as a parent in a new one
- PNG and PDF export

## Running locally

Static files only — no build step. Any static web server works:

```bash
python -m http.server 8765
# or
npx serve .
```

Then open `http://localhost:8765`.

## Regenerating template assets

The two template PNGs are preprocessed into `assets/` with transparent
backgrounds plus a `templates.json` describing each card's position:

```bash
python tools/make_templates.py
```

Requires Python with `Pillow`, `numpy`, and `scipy`.

## Project layout

```
index.html           app shell: sidebar form + stage preview
styles.css           dark app chrome + light pedigree document
app.js               state, rendering, uploads, OCR, export
assets/              resized template PNGs + card positions
tools/               Python helper for regenerating assets
template 1.png       original (unprocessed) layout 1 — kept for reproducibility
template 2.png       original (unprocessed) layout 2
```
