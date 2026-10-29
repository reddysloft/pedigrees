/* =======================================================================
   Pedigree Generator — state, rendering, uploads, export
   ======================================================================= */

/** Default empty bird record. `bg` is the optional highlight color.
 *  `fancier` is used only on the Subject card (3rd line, between name & color). */
const emptyBird = () => ({ ring: "", name: "", color: "", notes: "", bg: "", fancier: "" });

/* ----------------------------------------------------------------
   Template configs. Each template is a background image with
   card bounding boxes expressed as fractions of the image size.
   Positions were auto-detected from the user-supplied PNG and
   filled in from the branching structure where detection missed.
   ---------------------------------------------------------------- */
const TEMPLATE_CONFIGS = {
  template1: {
    label: "Template 1",
    image: "assets/template1.png",
    aspect: 1000 / 1410,
    cards: {
      subject:  { x: 0.019, y: 0.402, w: 0.205, h: 0.202 },
      father:   { x: 0.228, y: 0.175, w: 0.204, h: 0.202 },
      mother:   { x: 0.228, y: 0.639, w: 0.204, h: 0.203 },
      gp_ff:    { x: 0.496, y: 0.057, w: 0.205, h: 0.202 },
      gp_fm:    { x: 0.496, y: 0.290, w: 0.205, h: 0.202 },
      gp_mf:    { x: 0.496, y: 0.523, w: 0.205, h: 0.202 },
      gp_mm:    { x: 0.496, y: 0.753, w: 0.205, h: 0.203 },
      ggp_fff:  { x: 0.767, y: 0.057, w: 0.204, h: 0.093 },
      ggp_ffm:  { x: 0.766, y: 0.174, w: 0.205, h: 0.093 },
      ggp_fmf:  { x: 0.766, y: 0.287, w: 0.205, h: 0.093 },
      ggp_fmm:  { x: 0.766, y: 0.401, w: 0.205, h: 0.093 },
      ggp_mff:  { x: 0.767, y: 0.519, w: 0.204, h: 0.093 },
      ggp_mfm:  { x: 0.767, y: 0.636, w: 0.204, h: 0.093 },
      ggp_mmf:  { x: 0.767, y: 0.754, w: 0.204, h: 0.093 },
      ggp_mmm:  { x: 0.767, y: 0.871, w: 0.204, h: 0.092 },
    },
  },
  template2: {
    label: "Template 2",
    image: "assets/template2.png",
    aspect: 1000 / 1410,
    cards: {
      subject:  { x: 0.023, y: 0.291, w: 0.204, h: 0.434 },
      father:   { x: 0.254, y: 0.057, w: 0.205, h: 0.434 },
      mother:   { x: 0.254, y: 0.519, w: 0.205, h: 0.434 },
      gp_ff:    { x: 0.509, y: 0.057, w: 0.205, h: 0.202 },
      gp_fm:    { x: 0.509, y: 0.290, w: 0.205, h: 0.202 },
      gp_mf:    { x: 0.509, y: 0.523, w: 0.205, h: 0.202 },
      gp_mm:    { x: 0.509, y: 0.753, w: 0.205, h: 0.203 },
      ggp_fff:  { x: 0.770, y: 0.057, w: 0.204, h: 0.092 },
      ggp_ffm:  { x: 0.770, y: 0.175, w: 0.204, h: 0.092 },
      ggp_fmf:  { x: 0.770, y: 0.288, w: 0.204, h: 0.092 },
      ggp_fmm:  { x: 0.770, y: 0.402, w: 0.204, h: 0.092 },
      ggp_mff:  { x: 0.770, y: 0.519, w: 0.204, h: 0.093 },
      ggp_mfm:  { x: 0.770, y: 0.636, w: 0.204, h: 0.093 },
      ggp_mmf:  { x: 0.770, y: 0.754, w: 0.204, h: 0.093 },
      ggp_mmm:  { x: 0.770, y: 0.871, w: 0.204, h: 0.092 },
    },
  },
};

function currentTemplate() {
  return TEMPLATE_CONFIGS[state.template] || TEMPLATE_CONFIGS.template1;
}

/** Convert legacy template values from earlier builds. */
function migrateLegacyTemplate() {
  if (state.template === "staggered") state.template = "template1";
  else if (state.template === "proportional") state.template = "template2";
  if (!TEMPLATE_CONFIGS[state.template]) state.template = "template1";
}

/** 15-slot tree (subject + 2 parents + 4 gp + 8 ggp). */
const defaultState = () => ({
  template: "template1", // "template1" | "template2"
  loft: {
    name: "ROY'S LOFT",
    address: "KS Siddartha Roy\nKolar, Karnataka",
    contact: "9980038809",
    logo: null, // data URL
  },
  subject: { ...emptyBird(), gender: "" },
  // Keys used for click-to-color (matches the keys below).
  // Father branch
  father: emptyBird(),
  gp_ff: emptyBird(),  // father's father
  gp_fm: emptyBird(),  // father's mother
  ggp_fff: emptyBird(),
  ggp_ffm: emptyBird(),
  ggp_fmf: emptyBird(),
  ggp_fmm: emptyBird(),
  // Mother branch
  mother: emptyBird(),
  gp_mf: emptyBird(),  // mother's father
  gp_mm: emptyBird(),  // mother's mother
  ggp_mff: emptyBird(),
  ggp_mfm: emptyBird(),
  ggp_mmf: emptyBird(),
  ggp_mmm: emptyBird(),
  // Reference images (not exported)
  _fatherRef: null,
  _motherRef: null,
});

let state = defaultState();

/* ------------------------------------------------------------------
   Utility: get/set state by dotted or bracketed path
   ------------------------------------------------------------------ */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

/* ------------------------------------------------------------------
   Build the collapsible ancestor field blocks for Father and Mother
   ------------------------------------------------------------------ */
const ancestorConfig = {
  father: {
    self: { key: "father", label: "Father" },
    gp:   [
      { key: "gp_ff", label: "Father's Father" },
      { key: "gp_fm", label: "Father's Mother" },
    ],
    ggp:  [
      { key: "ggp_fff", label: "FF's Father" },
      { key: "ggp_ffm", label: "FF's Mother" },
      { key: "ggp_fmf", label: "FM's Father" },
      { key: "ggp_fmm", label: "FM's Mother" },
    ],
  },
  mother: {
    self: { key: "mother", label: "Mother" },
    gp:   [
      { key: "gp_mf", label: "Mother's Father" },
      { key: "gp_mm", label: "Mother's Mother" },
    ],
    ggp:  [
      { key: "ggp_mff", label: "MF's Father" },
      { key: "ggp_mfm", label: "MF's Mother" },
      { key: "ggp_mmf", label: "MM's Father" },
      { key: "ggp_mmm", label: "MM's Mother" },
    ],
  },
};

function birdFieldBlock(key, label) {
  return `
    <div class="ancestor-group" data-group="${key}">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;font-weight:500">${label}</div>
      <label>Ring <input type="text" data-field="${key}.ring" /></label>
      <label>Name <input type="text" data-field="${key}.name" /></label>
      <label>Color <input type="text" data-field="${key}.color" /></label>
      <label>Notes <textarea data-field="${key}.notes" rows="3"></textarea></label>
    </div>
  `;
}

function renderParentFields(side) {
  // The per-ancestor edit form has been removed from the Father/Mother tabs
  // (the user now drives those sides via the Match-by-ring panel + preview).
  // Guard here so other callers still work if the container isn't present.
  const container = document.getElementById(`${side}Fields`);
  if (!container) return;
  const cfg = ancestorConfig[side];
  container.innerHTML = `
    <h4>${cfg.self.label}</h4>
    ${birdFieldBlock(cfg.self.key, cfg.self.label)}
    <h4>Grandparents</h4>
    ${cfg.gp.map(g => birdFieldBlock(g.key, g.label)).join("")}
    <h4>Great-grandparents</h4>
    ${cfg.ggp.map(g => birdFieldBlock(g.key, g.label)).join("")}
  `;
  syncInputsFromState(container);
}

/* ------------------------------------------------------------------
   Input binding — single delegated listener; dynamically-added
   inputs (ancestor fields) are picked up automatically.
   ------------------------------------------------------------------ */
function initInputBinding() {
  document.querySelector(".sidebar").addEventListener("input", (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.field) return;
    setByPath(state, el.dataset.field, el.value);
    renderPreview();
  });
}

/** Pull values from state into every bound input (used after import/reset). */
function syncInputsFromState(root = document) {
  root.querySelectorAll("[data-field]").forEach((el) => {
    const value = getByPath(state, el.dataset.field) ?? "";
    if (el.type === "radio") {
      // For radios, don't overwrite the value attribute (which identifies the
      // option). Just toggle checked based on whether this option matches.
      el.checked = (el.value === value);
    } else if (el.type === "checkbox") {
      el.checked = Boolean(value);
    } else {
      el.value = value;
    }
  });
}

/* ------------------------------------------------------------------
   Rendering
   ------------------------------------------------------------------ */
function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Return ♂ / ♀ for a slot. Subject uses the user's gender selection. */
function inferGenderSymbol(key, bird) {
  if (key === "subject") {
    const g = (bird?.gender || "").toLowerCase();
    if (g.startsWith("c") || g.startsWith("m")) return "♂";
    if (g.startsWith("h") || g.startsWith("f")) return "♀";
    return "";
  }
  if (key === "father") return "♂";
  if (key === "mother") return "♀";
  const last = key.slice(-1);
  if (last === "f") return "♂";   // ...ff, ..._f, ...fff, mff — paternal line, male
  if (last === "m") return "♀";   // ...fm, ..._m, ...ffm, mfm — maternal / female
  return "";
}

function birdInnerHtml(bird, key) {
  const parts = [];
  if (bird.ring) {
    const sym = inferGenderSymbol(key, bird);
    const symHtml = sym ? ` <span class="gender-sym">${sym}</span>` : "";
    parts.push(`<div class="ring">${esc(bird.ring)}${symHtml}</div>`);
  }
  if (bird.name)    parts.push(`<div class="name">${esc(bird.name)}</div>`);
  if (bird.fancier) parts.push(`<div class="fancier">${esc(bird.fancier)}</div>`);
  if (bird.color)   parts.push(`<div class="color">${esc(bird.color)}</div>`);
  if (bird.notes)   parts.push(`<div class="notes">${esc(bird.notes)}</div>`);
  return parts.join("");
}

/* Detected card boxes are the WHITE INTERIOR of each drawn rectangle,
   measured just inside the stroke. A tiny outward expansion compensates
   for the single-pixel dilation used during detection so the highlight
   color lands exactly against the inner edge of each drawn border. */
const CARD_INSET_X = 0.0015;
const CARD_INSET_Y = 0.0012;

/** Render a card absolutely positioned over the template image. */
function cardHtml(bird, key, box) {
  const positionStyle =
    `left:${((box.x - CARD_INSET_X) * 100).toFixed(3)}%;` +
    `top:${((box.y - CARD_INSET_Y) * 100).toFixed(3)}%;` +
    `width:${((box.w + 2 * CARD_INSET_X) * 100).toFixed(3)}%;` +
    `height:${((box.h + 2 * CARD_INSET_Y) * 100).toFixed(3)}%`;
  const bgStyle = bird && bird.bg ? `;background-color:${esc(bird.bg)}` : "";
  const style = ` style="${positionStyle}${bgStyle}"`;
  const dataKey = ` data-bird="${key}"`;
  const inner = birdInnerHtml(bird || {}, key);
  const emptyClass = inner ? "" : " empty";
  return `<div class="card card-${key}${emptyClass}"${dataKey}${style}>${inner}</div>`;
}

function renderPreview() {
  // Title
  document.getElementById("pageTitle").textContent =
    `Pedigree Pigeon: ${state.subject.ring || ""}`.trim().replace(/:$/, ":");

  // Logo + watermark
  const logoSlot = document.getElementById("logoSlot");
  const watermark = document.getElementById("watermark");
  if (state.loft.logo) {
    logoSlot.innerHTML = `<img src="${state.loft.logo}" alt="logo" />`;
    watermark.style.backgroundImage = `url(${state.loft.logo})`;
  } else {
    logoSlot.innerHTML = "";
    watermark.style.backgroundImage = "";
  }

  // Loft block
  document.getElementById("loftTitle").textContent = state.loft.name || "";
  document.getElementById("loftAddress").textContent = state.loft.address || "";
  document.getElementById("loftContact").textContent =
    state.loft.contact ? `Contact : ${state.loft.contact}` : "";

  // Template image + card overlays
  const tpl = currentTemplate();
  const bg = document.getElementById("templateBg");
  if (bg.getAttribute("src") !== tpl.image) bg.setAttribute("src", tpl.image);
  const cards = tpl.cards;

  const html = [
    cardHtml(state.subject, "subject", cards.subject),
    cardHtml(state.father,  "father",  cards.father),
    cardHtml(state.mother,  "mother",  cards.mother),
    cardHtml(state.gp_ff,   "gp_ff",   cards.gp_ff),
    cardHtml(state.gp_fm,   "gp_fm",   cards.gp_fm),
    cardHtml(state.gp_mf,   "gp_mf",   cards.gp_mf),
    cardHtml(state.gp_mm,   "gp_mm",   cards.gp_mm),
    cardHtml(state.ggp_fff, "ggp_fff", cards.ggp_fff),
    cardHtml(state.ggp_ffm, "ggp_ffm", cards.ggp_ffm),
    cardHtml(state.ggp_fmf, "ggp_fmf", cards.ggp_fmf),
    cardHtml(state.ggp_fmm, "ggp_fmm", cards.ggp_fmm),
    cardHtml(state.ggp_mff, "ggp_mff", cards.ggp_mff),
    cardHtml(state.ggp_mfm, "ggp_mfm", cards.ggp_mfm),
    cardHtml(state.ggp_mmf, "ggp_mmf", cards.ggp_mmf),
    cardHtml(state.ggp_mmm, "ggp_mmm", cards.ggp_mmm),
  ].join("");
  document.getElementById("templateCards").innerHTML = html;
}

/* ------------------------------------------------------------------
   Color picker (click any card in preview to highlight it)
   ------------------------------------------------------------------ */
let colorTarget = null; // which bird key is being colored

function openColorPicker(cardEl) {
  const key = cardEl.dataset.bird;
  if (!key) return;
  colorTarget = key;

  const popover = document.getElementById("colorPopover");
  const rect = cardEl.getBoundingClientRect();
  popover.hidden = false;

  // Measure after reveal so we can keep it on-screen.
  const popRect = popover.getBoundingClientRect();
  let left = rect.right + 8;
  let top = rect.top;
  if (left + popRect.width > window.innerWidth - 8) {
    left = Math.max(8, rect.left - popRect.width - 8);
  }
  if (top + popRect.height > window.innerHeight - 8) {
    top = window.innerHeight - popRect.height - 8;
  }
  popover.style.left = `${left}px`;
  popover.style.top  = `${top}px`;

  const current = getByPath(state, `${key}.bg`) || "";
  popover.querySelectorAll(".swatch[data-color]").forEach((sw) => {
    sw.classList.toggle("selected", sw.dataset.color === current);
  });
  const customInput = document.getElementById("colorPopoverCustom");
  if (customInput) customInput.value = /^#[0-9a-f]{6}$/i.test(current) ? current : "#f5c8cb";
}

function closeColorPicker() {
  const popover = document.getElementById("colorPopover");
  if (popover) popover.hidden = true;
  colorTarget = null;
}

function applyColorToTarget(color) {
  if (!colorTarget) return;
  setByPath(state, `${colorTarget}.bg`, color || "");
  renderPreview();
  closeColorPicker();
}

function initColorPicker() {
  const area = document.getElementById("templateWrap");
  const popover = document.getElementById("colorPopover");

  area.addEventListener("click", (e) => {
    const card = e.target.closest(".card[data-bird]");
    if (!card) return;
    e.stopPropagation();
    openColorPicker(card);
  });

  popover.querySelectorAll(".swatch[data-color]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyColorToTarget(btn.dataset.color);
    });
  });

  const customInput = document.getElementById("colorPopoverCustom");
  if (customInput) {
    customInput.addEventListener("change", (e) => applyColorToTarget(e.target.value));
  }

  document.addEventListener("click", (e) => {
    if (popover.hidden) return;
    if (popover.contains(e.target)) return;
    if (e.target.closest(".card[data-bird]")) return;
    closeColorPicker();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeColorPicker();
  });
}

/** Clear every card's highlight color. */
function clearAllColors() {
  const keys = [
    "subject", "father", "mother",
    "gp_ff", "gp_fm", "gp_mf", "gp_mm",
    "ggp_fff", "ggp_ffm", "ggp_fmf", "ggp_fmm",
    "ggp_mff", "ggp_mfm", "ggp_mmf", "ggp_mmm",
  ];
  for (const k of keys) if (state[k]) state[k].bg = "";
  renderPreview();
}

/* ------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------ */
function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      document.querySelectorAll(".pane").forEach((p) =>
        p.classList.toggle("active", p.dataset.pane === name));
    });
  });
}

/* ------------------------------------------------------------------
   File uploads
   ------------------------------------------------------------------ */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}
async function readFileAsBase64Clean(file) {
  const dataUrl = await readFileAsDataURL(file);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/* ------------------------------------------------------------------
   AI auto-extraction (Google Gemini vision)
   ------------------------------------------------------------------ */
const GEMINI_MODEL = "gemini-2.5-flash";
const EXTRACTION_PROMPT = `You are extracting data from a pigeon racing pedigree certificate image.

Pedigrees read left-to-right. The subject (main bird) is on the far left. Its father is in the upper position of the next column, mother in the lower. Each bird's parents follow the same father-above-mother pattern in the next column.

For each bird visible in the image, extract:
- ring: band / ring number (e.g., "BE 18-5025989 C", "IN 22-23281")
- name: any name or title given (e.g., "ELZA", "Son White Edmond"). Empty string if none.
- color: color / markings only (e.g., "Grizzle", "Chequer", "Blue", "White Pied"). Empty string if none.
- notes: everything else — race results, breeder credits, lineage notes, placements. Preserve line breaks with \\n.

Use these JSON keys for the bird's position in the tree:
- subject      : the main bird (leftmost)
- father       : subject's father
- mother       : subject's mother
- gp_ff        : father's father
- gp_fm        : father's mother
- gp_mf        : mother's father
- gp_mm        : mother's mother
- ggp_fff      : father's father's father
- ggp_ffm      : father's father's mother
- ggp_fmf      : father's mother's father
- ggp_fmm      : father's mother's mother
- ggp_mff      : mother's father's father
- ggp_mfm      : mother's father's mother
- ggp_mmf      : mother's mother's father
- ggp_mmm      : mother's mother's mother

Rules:
- Include ONLY birds actually present in the image. OMIT keys for empty / missing slots.
- Do not invent data. If a field isn't visible, use an empty string.
- Return pure JSON only. No markdown fences. No commentary.`;

function getAiKey() { return (localStorage.getItem("aiKey") || "").trim(); }
function setAiKey(k) { localStorage.setItem("aiKey", k || ""); }

function initAiKeyInput() {
  const input = document.getElementById("aiKey");
  if (!input) return;
  input.value = getAiKey();
  input.addEventListener("input", () => setAiKey(input.value.trim()));
}

async function extractPedigreeFromImage(file) {
  const key = getAiKey();
  if (!key) throw new Error("Set your Gemini API key in the Loft tab first.");

  const base64 = await readFileAsBase64Clean(file);
  const mimeType = file.type || "image/jpeg";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{
      parts: [
        { text: EXTRACTION_PROMPT },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text.slice(0, 240)}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text);
}

function updateRefPreview(side, { imgUrl, status = "", error = false } = {}) {
  const el = document.getElementById(`${side}Ref`);
  if (!el) return;
  const img = imgUrl ? `<img src="${imgUrl}" alt="${side} reference" />` : "";
  const statusHtml = status
    ? `<div class="extraction-status${error ? " error" : ""}">${esc(status)}</div>`
    : "";
  el.innerHTML = img + statusHtml;
}

/* ------------------------------------------------------------------
   Browser-side OCR fallback (Tesseract.js) — used when no Gemini key.
   Detects card rectangles via image processing, then assigns Tesseract's
   recognised lines to each rectangle by position. This keeps each card's
   text in its own slot instead of dumping it all into one.
   ------------------------------------------------------------------ */

/** OCR + card-box detection. Returns everything we need for later matching. */
async function runOcrOnly(file, onProgress) {
  onProgress?.("Loading image…");
  const { canvas, width, height } = await loadImageToCanvas(file);

  onProgress?.("Detecting card outlines…");
  const boxes = detectCardBoxes(canvas);

  onProgress?.("Loading OCR engine…");
  if (!window.Tesseract) throw new Error("OCR engine not loaded yet. Try again in a moment.");

  // Tesseract is noticeably more accurate on larger images. If the source is
  // small/moderate (common when a user screenshots or exports), upscale to a
  // target of ~2200px wide before OCR, then scale coordinates back.
  const TARGET_W = 2200;
  const scale = width < TARGET_W ? TARGET_W / width : 1;
  let ocrCanvas = canvas;
  if (scale !== 1) {
    ocrCanvas = document.createElement("canvas");
    ocrCanvas.width = Math.round(width * scale);
    ocrCanvas.height = Math.round(height * scale);
    const ctx = ocrCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, ocrCanvas.width, ocrCanvas.height);
  }

  const worker = await window.Tesseract.createWorker("eng", 1, {
    logger: (m) => {
      if (!m || !m.status) return;
      if (m.status === "recognizing text") {
        onProgress?.(`Reading text ${Math.round((m.progress || 0) * 100)}%`);
      } else {
        onProgress?.(m.status.charAt(0).toUpperCase() + m.status.slice(1) + "…");
      }
    },
  });
  try {
    // SPARSE_TEXT (PSM 11) is better than the default auto layout for pedigrees
    // where text sits in many small boxes scattered on the page.
    await worker.setParameters({
      tessedit_pageseg_mode: "11",
      preserve_interword_spaces: "1",
    });
    const dataUrl = ocrCanvas.toDataURL("image/png");
    const { data } = await worker.recognize(dataUrl);
    let lines = collectOcrLines(data);
    if (lines.length === 0) throw new Error("No text was detected in the image.");

    // Scale OCR coordinates back to original image space so they align with
    // the detected card boxes and the stored image size.
    if (scale !== 1) {
      const inv = 1 / scale;
      lines = lines.map((l) => ({
        text: l.text,
        x0: l.x0 * inv, y0: l.y0 * inv,
        x1: l.x1 * inv, y1: l.y1 * inv,
        cx: l.cx * inv, cy: l.cy * inv,
      }));
    }
    return { lines, width, height, boxes };
  } finally {
    await worker.terminate();
  }
}

/* ------------------------------------------------------------------
   Match-by-ring: use ring numbers the user typed to find each bird's
   text block in the OCR output. Each ring anchor's "card" extends
   from that ring's line down to the next ring in the same column
   (or the bottom of the image).
   ------------------------------------------------------------------ */

function normalizeRing(s) {
  return (s || "").replace(/[\s\-_.]/g, "").toUpperCase();
}

/** Does a line of OCR'd text look like a pigeon ring/band number header? */
function looksLikeRing(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 5 || t.length > 60) return false;
  // Common formats: "BE 18-5025989 C", "PL 0384-19-9849 C", "NLD 13-1110004",
  //                 "DV 08177-19-678", "IN 22-23281", "B 20-5115165".
  return /^[A-Z]{1,5}[-\s]?\d{1,5}[-\s]\d{2,8}/i.test(t);
}

function findRingLine(ocrLines, ringText) {
  const target = normalizeRing(ringText);
  if (!target) return null;
  // Exact normalised substring match first.
  for (const line of ocrLines) {
    if (normalizeRing(line.text).includes(target)) return line;
  }
  // Loosen: look for the longest run of digits in the typed ring.
  const digitRuns = ringText.match(/\d{3,}/g);
  if (digitRuns && digitRuns.length) {
    const biggest = digitRuns.reduce((a, b) => a.length >= b.length ? a : b);
    for (const line of ocrLines) {
      if (line.text.replace(/\D/g, "").includes(biggest)) return line;
    }
  }
  return null;
}

/**
 * Build the pedigree object from ring anchors.
 *
 * For each ring the user typed we locate it in the OCR output and then take
 * ALL text that belongs to its card:
 *
 *   1. Prefer the drawn card box that encloses the ring. If detection found
 *      one, every OCR line inside the box becomes that bird's content.
 *   2. If no box was detected (or the detected box is suspiciously huge),
 *      fall back to a column walk: keep every line whose horizontal center
 *      sits within the ring's column, from the ring down to the next ring
 *      the user typed in that same column (or the bottom of the image).
 *
 * No ring-reference truncation, no gap cutoffs — if it's in the card, it
 * ends up in the slot.
 */
function matchByRings(ocrLines, imageW, imageH, boxes, ringMap) {
  const anchors = [];
  for (const [slot, ringText] of Object.entries(ringMap)) {
    if (!ringText || !ringText.trim()) continue;
    const line = findRingLine(ocrLines, ringText);
    if (line) anchors.push({ slot, ringText: ringText.trim(), line });
  }
  if (anchors.length === 0) return {};

  const imageArea = imageW * imageH;
  const result = {};

  for (const anchor of anchors) {
    const ax = (anchor.line.x0 + anchor.line.x1) / 2;
    const ay = anchor.line.cy;

    // 1) Primary: the LARGEST detected box that still contains the ring and
    //    isn't bigger than half the page (which would mean borders merged).
    let bestBox = null;
    let bestArea = 0;
    for (const box of (boxes || [])) {
      if (ax < box.x0 || ax > box.x1 || ay < box.y0 || ay > box.y1) continue;
      const area = (box.x1 - box.x0) * (box.y1 - box.y0);
      if (area > imageArea * 0.5) continue;
      if (area > bestArea) { bestArea = area; bestBox = box; }
    }

    let cardLines;
    if (bestBox) {
      cardLines = ocrLines
        .filter((l) => {
          if (l === anchor.line) return false;
          const lx = (l.x0 + l.x1) / 2;
          return lx >= bestBox.x0 && lx <= bestBox.x1 &&
                 l.cy >= bestBox.y0 && l.cy <= bestBox.y1;
        })
        .sort((a, b) => a.cy - b.cy);
    } else {
      // 2) Fallback: column walk.
      const colTol = Math.max(100, imageW * 0.22);
      let bottomY = imageH;
      for (const other of anchors) {
        if (other === anchor) continue;
        const ox = (other.line.x0 + other.line.x1) / 2;
        if (Math.abs(ox - ax) < colTol && other.line.cy > ay) {
          bottomY = Math.min(bottomY, other.line.cy);
        }
      }
      cardLines = ocrLines
        .filter((l) => {
          if (l === anchor.line) return false;
          if (l.cy <= ay + 2) return false;
          if (l.cy >= bottomY) return false;
          const lx = (l.x0 + l.x1) / 2;
          return Math.abs(lx - ax) < colTol;
        })
        .sort((a, b) => a.cy - b.cy);
    }

    const text = cardLines.map((l) => l.text).join("\n");
    const parsed = parseBirdText(text);
    parsed.ring = anchor.ringText;
    result[anchor.slot] = parsed;
  }
  return result;
}

function doMatchAndFill(side) {
  const lines = state[`_${side}OcrLines`];
  const size  = state[`_${side}OcrSize`];
  const boxes = state[`_${side}OcrBoxes`] || [];
  const refUrl = state[`_${side}Ref`];
  if (!lines || !size) {
    alert("Upload a pedigree image first.");
    return;
  }
  const ringMap = {};
  document.querySelectorAll(`input.match-ring[data-match-side="${side}"]`).forEach((inp) => {
    const slot = inp.dataset.matchSlot;
    const val = inp.value.trim();
    if (val) ringMap[slot] = val;
  });
  if (Object.keys(ringMap).length === 0) {
    updateRefPreview(side, { imgUrl: refUrl, status: "Enter at least one ring number above.", error: true });
    return;
  }
  const extracted = matchByRings(lines, size.w, size.h, boxes, ringMap);
  const filled = countFilledBirds(extracted);
  if (filled === 0) {
    updateRefPreview(side, { imgUrl: refUrl, status: "No ring numbers matched. Double-check what you typed.", error: true });
    return;
  }
  importParentPedigree(side, extracted);
  renderParentFields(side);
  renderPreview();
  const missed = Object.keys(ringMap).length - filled;
  const tail = missed > 0 ? ` (${missed} ring${missed === 1 ? "" : "s"} not found)` : "";
  updateRefPreview(side, {
    imgUrl: refUrl,
    status: `✓ Filled ${filled} bird${filled === 1 ? "" : "s"} from image${tail}.`,
  });
}

function initMatchButtons() {
  document.querySelectorAll(".match-fill-btn").forEach((btn) => {
    btn.addEventListener("click", () => doMatchAndFill(btn.dataset.matchSide));
  });
}

async function runTesseractExtraction(file, onProgress) {
  onProgress?.("Loading image…");
  const { canvas, width, height } = await loadImageToCanvas(file);

  onProgress?.("Detecting card outlines…");
  const boxes = detectCardBoxes(canvas);

  onProgress?.("Loading OCR engine…");
  if (!window.Tesseract) throw new Error("OCR engine not loaded yet. Try again in a moment.");

  const worker = await window.Tesseract.createWorker("eng", 1, {
    logger: (m) => {
      if (!m || !m.status) return;
      if (m.status === "recognizing text") {
        onProgress?.(`Reading text ${Math.round((m.progress || 0) * 100)}%`);
      } else {
        onProgress?.(m.status.charAt(0).toUpperCase() + m.status.slice(1) + "…");
      }
    },
  });

  try {
    const dataUrl = canvas.toDataURL("image/png");
    const { data } = await worker.recognize(dataUrl);
    const lines = collectOcrLines(data);
    if (lines.length === 0) throw new Error("No text was detected in the image.");

    const useBoxes = boxes.length >= 2;
    onProgress?.(useBoxes
      ? `Mapping ${boxes.length} cards to pedigree slots…`
      : "No card outlines found — clustering text by proximity…");

    const extracted = useBoxes
      ? assignLinesToBoxes(lines, boxes, width, height)
      : clusterLinesIntoSlots(lines, width, height);

    const filledCount = Object.values(extracted).filter(
      (b) => b && (b.ring || b.name || b.color || b.notes)
    ).length;
    if (filledCount === 0) throw new Error("Could not map text to any card.");
    return extracted;
  } finally {
    await worker.terminate();
  }
}

/** Count how many bird slots the parsed pedigree actually populated. */
function countFilledBirds(parsed) {
  return Object.values(parsed || {}).filter(
    (b) => b && typeof b === "object" &&
           (b.ring || b.name || b.color || b.notes)
  ).length;
}

/* ---------------- image I/O & rectangle detection ---------------- */

function loadImageToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve({ canvas, width: canvas.width, height: canvas.height });
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/** Find card-shaped bright regions enclosed by dark borders. */
function detectCardBoxes(sourceCanvas) {
  // Downscale for speed.
  const maxW = 800;
  const scale = Math.min(1, maxW / sourceCanvas.width);
  const sw = Math.max(1, Math.round(sourceCanvas.width * scale));
  const sh = Math.max(1, Math.round(sourceCanvas.height * scale));
  const work = document.createElement("canvas");
  work.width = sw;
  work.height = sh;
  work.getContext("2d").drawImage(sourceCanvas, 0, 0, sw, sh);
  const px = work.getContext("2d").getImageData(0, 0, sw, sh).data;

  // Threshold to binary ink. 185 catches lighter gray borders too.
  const ink = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const brightness = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    ink[i] = brightness < 185 ? 1 : 0;
  }

  // Light dilation closes hair-thin breaks in the drawn borders.
  dilateInk(ink, sw, sh);

  // Flood the exterior from (0,0) so interior stays unmarked.
  const exterior = new Uint8Array(sw * sh);
  floodFillBackground(ink, exterior, sw, sh);

  // Interior pixels are the inside of each drawn rectangle.
  const interior = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    interior[i] = ink[i] === 0 && exterior[i] === 0 ? 1 : 0;
  }

  const components = connectedComponents(interior, sw, sh);
  const total = sw * sh;
  const boxes = [];
  for (const c of components) {
    const w = c.x1 - c.x0;
    const h = c.y1 - c.y0;
    const area = w * h;
    if (area < total * 0.0015 || area > total * 0.25) continue;
    if (w < 20 || h < 20) continue;
    boxes.push({
      x0: c.x0 / scale,
      y0: c.y0 / scale,
      x1: c.x1 / scale,
      y1: c.y1 / scale,
    });
  }
  return boxes;
}

function dilateInk(arr, w, h) {
  const out = new Uint8Array(arr.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (arr[i] ||
          (x > 0     && arr[i - 1]) ||
          (x < w - 1 && arr[i + 1]) ||
          (y > 0     && arr[i - w]) ||
          (y < h - 1 && arr[i + w])) {
        out[i] = 1;
      }
    }
  }
  arr.set(out);
}

function floodFillBackground(ink, out, w, h) {
  const stack = [0];
  out[0] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i - x) / w;
    const neighbors = [
      x > 0     ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0     ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || ink[n] || out[n]) continue;
      out[n] = 1;
      stack.push(n);
    }
  }
}

function connectedComponents(mask, w, h) {
  const visited = new Uint8Array(mask.length);
  const comps = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || visited[i]) continue;
    const stack = [i];
    visited[i] = 1;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    while (stack.length) {
      const j = stack.pop();
      const x = j % w, y = (j - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const neighbors = [
        x > 0     ? j - 1 : -1,
        x < w - 1 ? j + 1 : -1,
        y > 0     ? j - w : -1,
        y < h - 1 ? j + w : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || !mask[n] || visited[n]) continue;
        visited[n] = 1;
        stack.push(n);
      }
    }
    comps.push({ x0, y0, x1: x1 + 1, y1: y1 + 1 });
  }
  return comps;
}

/* ---------------- OCR -> slots mapping ---------------- */

/** Flatten Tesseract's block tree into a flat list of lines with bboxes. */
function collectOcrLines(data) {
  const lines = [];
  for (const b of (data.blocks || [])) {
    for (const p of (b.paragraphs || [])) {
      for (const l of (p.lines || [])) {
        const txt = (l.text || "").trim();
        if (!txt) continue;
        lines.push({
          text: txt,
          x0: l.bbox.x0, y0: l.bbox.y0,
          x1: l.bbox.x1, y1: l.bbox.y1,
          cx: (l.bbox.x0 + l.bbox.x1) / 2,
          cy: (l.bbox.y0 + l.bbox.y1) / 2,
        });
      }
    }
  }
  return lines;
}

/**
 * Pin each detected card box to a pedigree slot.
 * Columns in the uploaded pedigree are detected by horizontal gap analysis
 * (not k-means), so a 3-column parent pedigree stays 3 columns and the
 * mapping becomes:
 *     col 0 (1 card)   -> subject (= parent in the target)
 *     col 1 (2 cards)  -> father, mother  (= grandparents in the target)
 *     col 2 (4 cards)  -> gp_ff..gp_mm    (= great-grandparents in the target)
 * A 4-column upload also works; a shallow 1-2 column upload fills only
 * what's visible.
 */
function assignBoxesToSlots(boxes, imageW, imageH) {
  if (boxes.length === 0) return [];
  const info = boxes.map((b) => ({
    box: b,
    cx: (b.x0 + b.x1) / 2,
    cy: (b.y0 + b.y1) / 2,
  }));
  info.sort((a, b) => a.cx - b.cx);

  // Split into columns wherever there's a wide horizontal gap.
  const gapThreshold = imageW * 0.07;
  const columns = [[info[0]]];
  for (let i = 1; i < info.length; i++) {
    const gap = info[i].cx - info[i - 1].cx;
    if (gap > gapThreshold) columns.push([info[i]]);
    else columns[columns.length - 1].push(info[i]);
  }

  const slotsByCol = [
    ["subject"],
    ["father", "mother"],
    ["gp_ff", "gp_fm", "gp_mf", "gp_mm"],
    ["ggp_fff", "ggp_ffm", "ggp_fmf", "ggp_fmm",
     "ggp_mff", "ggp_mfm", "ggp_mmf", "ggp_mmm"],
  ];

  const out = [];
  for (let col = 0; col < Math.min(columns.length, slotsByCol.length); col++) {
    const slots = slotsByCol[col];
    const items = columns[col].slice().sort((a, b) => a.cy - b.cy);
    const minY = items[0].cy;
    const maxY = items[items.length - 1].cy;
    const span = Math.max(1, maxY - minY);
    const expectedPos = slots.map((_, i) => (i + 0.5) / slots.length);
    const taken = new Set();
    for (const it of items) {
      const localPos = (it.cy - minY) / span;
      let bestSlot = -1, bestD = Infinity;
      for (let i = 0; i < slots.length; i++) {
        if (taken.has(i)) continue;
        const d = Math.abs(localPos - expectedPos[i]);
        if (d < bestD) { bestD = d; bestSlot = i; }
      }
      if (bestSlot >= 0) {
        taken.add(bestSlot);
        out.push({ box: it.box, slot: slots[bestSlot] });
      }
    }
  }
  return out;
}

/** Assign each OCR line to the detected card box its center falls into. */
function assignLinesToBoxes(lines, boxes, imageW, imageH) {
  const slotted = assignBoxesToSlots(boxes, imageW, imageH);
  // Pad boxes a touch so lines right at the drawn border still get caught.
  const padX = imageW * 0.01;
  const padY = imageH * 0.005;
  const padded = slotted.map(({ box, slot }) => ({
    slot,
    bounds: {
      x0: box.x0 - padX, y0: box.y0 - padY,
      x1: box.x1 + padX, y1: box.y1 + padY,
    },
    cx: (box.x0 + box.x1) / 2,
    cy: (box.y0 + box.y1) / 2,
    w:  box.x1 - box.x0,
    h:  box.y1 - box.y0,
  }));

  const buckets = new Map();
  for (const line of lines) {
    // Try an exact bounds hit first.
    let hit = padded.find(({ bounds }) =>
      line.cx >= bounds.x0 && line.cx <= bounds.x1 &&
      line.cy >= bounds.y0 && line.cy <= bounds.y1
    );
    // Fallback: snap to the nearest box center if it's clearly closest.
    if (!hit) {
      let best = null, bestD = Infinity;
      for (const p of padded) {
        const dx = (line.cx - p.cx) / Math.max(1, p.w);
        const dy = (line.cy - p.cy) / Math.max(1, p.h);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best && bestD < 0.6) hit = best;
    }
    if (!hit) continue;
    if (!buckets.has(hit.slot)) buckets.set(hit.slot, []);
    buckets.get(hit.slot).push(line);
  }

  const result = {};
  for (const [slot, slotLines] of buckets) {
    slotLines.sort((a, b) => a.cy - b.cy);
    const text = slotLines.map((l) => l.text).join("\n");
    result[slot] = parseBirdText(text);
  }
  return result;
}

/** Fallback when no card rectangles are detected — cluster lines in 2D. */
function clusterLinesIntoSlots(lines, imageW, imageH) {
  // Group lines that are close vertically & horizontally into "cards".
  const sorted = [...lines].sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  const cards = [];
  const yGap = imageH * 0.03;   // vertical closeness threshold
  const xGap = imageW * 0.08;   // horizontal closeness threshold
  for (const line of sorted) {
    let joined = false;
    for (const c of cards) {
      const nearY = Math.abs(line.cy - c.lastY) < yGap &&
                    Math.abs(line.cx - c.cx) < xGap;
      if (nearY) {
        c.lines.push(line);
        c.lastY = line.cy;
        c.cx = (c.cx * (c.lines.length - 1) + line.cx) / c.lines.length;
        joined = true;
        break;
      }
    }
    if (!joined) cards.push({ lines: [line], cx: line.cx, lastY: line.cy });
  }
  const fakeBoxes = cards.map((c) => {
    const x0 = Math.min(...c.lines.map((l) => l.x0));
    const y0 = Math.min(...c.lines.map((l) => l.y0));
    const x1 = Math.max(...c.lines.map((l) => l.x1));
    const y1 = Math.max(...c.lines.map((l) => l.y1));
    return { x0, y0, x1, y1 };
  });
  return assignLinesToBoxes(lines, fakeBoxes, imageW, imageH);
}

/** Split a card's raw text into {ring, name, color, notes}. */
function parseBirdText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bird = { ring: "", name: "", color: "", notes: "" };
  if (!lines.length) return bird;

  // Find the first line that looks like a ring/band number anywhere near the top.
  const ringPattern = /\d{2,}[-\s]?\d{2,}/;
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    if (ringPattern.test(lines[i])) {
      bird.ring = lines[i];
      lines.splice(i, 1);
      break;
    }
  }
  // Next line (if quoted or short all-caps) is the name.
  if (lines.length) {
    const first = lines[0];
    if (/^["'“‘]/.test(first)) {
      bird.name = lines.shift().replace(/^["'“‘]+|["'”’]+$/g, "");
    } else if (first.length < 32 && /^[A-Z]/.test(first) &&
               !/\d{2,}[-\s]?\d{2,}/.test(first)) {
      bird.name = lines.shift();
    }
  }
  // Short, one-ish-word line is likely the color.
  if (lines.length && lines[0].length < 32 && lines[0].split(/\s+/).length <= 4) {
    bird.color = lines.shift();
  }
  bird.notes = lines.join("\n");
  return bird;
}

/** Minimal 1D k-means for clustering block positions into columns. */
function kMeans1D(values, k) {
  if (values.length === 0) return [];
  if (values.length <= k) return [...values].sort((a, b) => a - b);
  const sorted = [...values].sort((a, b) => a - b);
  let centers = Array.from({ length: k }, (_, i) =>
    sorted[Math.floor((i + 0.5) * sorted.length / k)]
  );
  for (let iter = 0; iter < 30; iter++) {
    const buckets = centers.map(() => []);
    for (const v of values) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = Math.abs(centers[i] - v);
        if (d < bd) { bd = d; best = i; }
      }
      buckets[best].push(v);
    }
    const next = buckets.map((b, i) =>
      b.length ? b.reduce((a, c) => a + c, 0) / b.length : centers[i]
    );
    const done = next.every((c, i) => Math.abs(c - centers[i]) < 0.0001);
    centers = next;
    if (done) break;
  }
  return centers;
}

/**
 * Map a parent pedigree's slots into the corresponding half of this
 * tree. Only slots that carry real data in `parsed` are written; empty
 * slots in the upload leave the current state alone, so a 2-generation
 * upload won't wipe out a 3rd generation the user already filled in.
 */
function importParentPedigree(side, parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid data");
  const copy = (src) => ({
    ring:  src?.ring  ?? "",
    name:  src?.name  ?? "",
    color: src?.color ?? "",
    notes: src?.notes ?? "",
    bg:    src?.bg    ?? "",
  });
  const hasData = (src) =>
    src && typeof src === "object" &&
    (src.ring || src.name || src.color || src.notes);

  // dest slot -> key in the uploaded pedigree
  const map = side === "father"
    ? { father: "subject",  gp_ff: "father",  gp_fm: "mother",
        ggp_fff: "gp_ff",   ggp_ffm: "gp_fm", ggp_fmf: "gp_mf", ggp_fmm: "gp_mm" }
    : { mother: "subject",  gp_mf: "father",  gp_mm: "mother",
        ggp_mff: "gp_ff",   ggp_mfm: "gp_fm", ggp_mmf: "gp_mf", ggp_mmm: "gp_mm" };

  for (const [dest, srcKey] of Object.entries(map)) {
    const src = parsed[srcKey];
    if (hasData(src)) state[dest] = copy(src);
  }
}

function initUploads() {
  document.querySelectorAll("[data-upload]").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const kind = input.dataset.upload;

      try {
        if (kind === "logo") {
          state.loft.logo = await readFileAsDataURL(file);
          document.getElementById("logoPreview").innerHTML =
            `<img src="${state.loft.logo}" alt="logo preview" />`;
        } else if (kind === "fatherImage" || kind === "motherImage") {
          const url = await readFileAsDataURL(file);
          const side = kind.startsWith("father") ? "father" : "mother";
          state[`_${side}Ref`] = url;
          updateRefPreview(side, { imgUrl: url, status: "Loading OCR engine…" });
          renderPreview();
          try {
            const ocr = await runOcrOnly(file, (msg) =>
              updateRefPreview(side, { imgUrl: url, status: msg })
            );
            state[`_${side}OcrLines`] = ocr.lines;
            state[`_${side}OcrSize`]  = { w: ocr.width, h: ocr.height };
            state[`_${side}OcrBoxes`] = ocr.boxes || [];
            document.getElementById(`${side}MatchPanel`).hidden = false;
            updateRefPreview(side, {
              imgUrl: url,
              status: `Image read (${ocr.lines.length} text lines). Enter ring numbers below and click Match & fill.`,
            });
          } catch (err) {
            console.error(err);
            updateRefPreview(side, {
              imgUrl: url,
              status: `OCR failed: ${err.message}`,
              error: true,
            });
          }
          return;
        } else if (kind === "fatherJson" || kind === "motherJson") {
          const text = await readFileAsText(file);
          const parsed = JSON.parse(text);
          const side = kind.startsWith("father") ? "father" : "mother";
          importParentPedigree(side, parsed);
          renderParentFields(side);
        }
        renderPreview();
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
      } finally {
        e.target.value = ""; // allow re-uploading the same file
      }
    });
  });
}

/* ------------------------------------------------------------------
   Export: PNG, PDF, JSON
   ------------------------------------------------------------------ */
async function renderPageToCanvas() {
  const page = document.getElementById("page");
  return await html2canvas(page, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
}

async function exportPng() {
  const canvas = await renderPageToCanvas();
  const link = document.createElement("a");
  link.download = `pedigree_${(state.subject.ring || "bird").replace(/\s+/g, "_")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function exportPdf() {
  const canvas = await renderPageToCanvas();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.width / canvas.height;
  const pageRatio = pageW / pageH;
  let w, h;
  if (imgRatio > pageRatio) { w = pageW; h = pageW / imgRatio; }
  else                      { h = pageH; w = pageH * imgRatio; }
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
  pdf.save(`pedigree_${(state.subject.ring || "bird").replace(/\s+/g, "_")}.pdf`);
}

function exportJson() {
  const { _fatherRef, _motherRef, ...clean } = state;
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `pedigree_${(state.subject.ring || "bird").replace(/\s+/g, "_")}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function initActions() {
  document.getElementById("exportPng").addEventListener("click", exportPng);
  document.getElementById("exportPdf").addEventListener("click", exportPdf);
  document.getElementById("exportJson").addEventListener("click", exportJson);

  const importBtn = document.getElementById("importJson");
  const importInput = document.getElementById("importJsonInput");
  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      state = { ...defaultState(), ...parsed };
      migrateLegacyTemplate();
      renderParentFields("father");
      renderParentFields("mother");
      syncInputsFromState(document);
      if (state.loft?.logo) {
        document.getElementById("logoPreview").innerHTML =
          `<img src="${state.loft.logo}" alt="logo preview" />`;
      }
      renderPreview();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("resetAll").addEventListener("click", () => {
    if (!confirm("Clear all fields?")) return;
    state = defaultState();
    renderParentFields("father");
    renderParentFields("mother");
    syncInputsFromState(document);
    document.getElementById("logoPreview").innerHTML = "";
    document.getElementById("fatherRef").innerHTML = "";
    document.getElementById("motherRef").innerHTML = "";
    renderPreview();
  });
}

/* ------------------------------------------------------------------
   Bootstrap
   ------------------------------------------------------------------ */
function init() {
  initTabs();
  initInputBinding();
  renderParentFields("father");
  renderParentFields("mother");
  syncInputsFromState(document);
  initUploads();
  initActions();
  initColorPicker();
  initMatchButtons();
  initAiKeyInput();
  const clearBtn = document.getElementById("clearColors");
  if (clearBtn) clearBtn.addEventListener("click", clearAllColors);
  renderPreview();
}
document.addEventListener("DOMContentLoaded", init);
