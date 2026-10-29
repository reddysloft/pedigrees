"""
Resize the user-provided template PNGs and auto-detect the card
bounding boxes so the web app can overlay text on them precisely.

Produces:
  pedigrees/assets/template1.png  (resized, PNG)
  pedigrees/assets/template2.png
  pedigrees/assets/templates.json (dimensions + card bounding boxes)

Card detection works by:
  1. Downscale to a working size.
  2. Threshold to isolate dark ink (card outlines).
  3. Flood-fill the exterior (background) white, so card interiors
     become isolated white blobs.
  4. Label connected components of white interior and keep ones
     whose bounding boxes look like cards (reasonable aspect ratio
     and area within expected bounds).
"""

from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)

TARGET_W = 1000  # final page width in CSS px

def process(src_path: Path, out_png: Path):
    img = Image.open(src_path).convert("RGB")
    sw, sh = img.size

    # Final resized image for the web (same aspect, width TARGET_W).
    out_w = TARGET_W
    out_h = round(sh * out_w / sw)
    resized = img.resize((out_w, out_h), Image.LANCZOS).convert("RGBA")

    # Knock out the white background so the page watermark can show through.
    arr = np.array(resized)
    rgb_sum = arr[:, :, 0].astype(int) + arr[:, :, 1].astype(int) + arr[:, :, 2].astype(int)
    # Fully transparent for near-white pixels; preserve the drawn borders.
    arr[rgb_sum > 240 * 3, 3] = 0
    Image.fromarray(arr, mode="RGBA").save(out_png, optimize=True)

    # Lower-res pass for cheap card detection.
    work_w = 800
    work_h = round(sh * work_w / sw)
    work = img.resize((work_w, work_h), Image.LANCZOS).convert("L")
    arr = np.array(work)

    # Threshold: anything darker than mid-gray is ink.
    ink = arr < 160

    # Single-pixel dilation closes any hairline break in the outline without
    # eating noticeably into the interior.
    ink = ndimage.binary_dilation(ink, iterations=1)

    # Mark background (outside the cards). We assume the top-left pixel is background.
    bg = np.zeros_like(ink, dtype=bool)
    bg[0, 0] = True
    # Flood-fill: expand through the non-ink area.
    non_ink = ~ink
    bg_filled = ndimage.binary_propagation(bg, mask=non_ink)

    # Card interiors = non-ink pixels that aren't the exterior background.
    interior = non_ink & ~bg_filled

    # Label connected components of interior.
    labeled, n = ndimage.label(interior)
    print(f"{src_path.name}: {n} candidate regions")

    # Collect bounding boxes with heuristics.
    slices = ndimage.find_objects(labeled)
    cards = []
    img_area = work_w * work_h
    for i, sl in enumerate(slices, start=1):
        if sl is None:
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        w = x1 - x0
        h = y1 - y0
        area = w * h
        # Reject tiny blobs (noise) and anything larger than ~20% of page (the
        # exterior background got excluded already, but just in case).
        if area < img_area * 0.0015 or area > img_area * 0.2:
            continue
        if w < 20 or h < 20:
            continue
        cards.append({
            "x": x0 / work_w,
            "y": y0 / work_h,
            "w": w / work_w,
            "h": h / work_h,
            "cx": (x0 + w / 2) / work_w,
            "cy": (y0 + h / 2) / work_h,
        })
    print(f"  kept {len(cards)} card-ish regions")
    # Sort by column (x), then row (y).
    cards.sort(key=lambda c: (round(c["cx"] * 10), c["cy"]))
    return {
        "width": out_w,
        "height": out_h,
        "cards": cards,
    }

def main():
    t1 = process(ROOT / "template 1.png", ASSETS / "template1.png")
    t2 = process(ROOT / "template 2.png", ASSETS / "template2.png")
    out = {"template1": t1, "template2": t2}
    (ASSETS / "templates.json").write_text(json.dumps(out, indent=2))
    print("\nWrote", ASSETS / "templates.json")

if __name__ == "__main__":
    main()
