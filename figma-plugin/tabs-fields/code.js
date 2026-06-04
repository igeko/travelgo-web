// TravelGo — Tabs & Fields plugin
// Allineato a components/ui/TabSwitcher.tsx + SoftField.tsx + BudgetInput.tsx + AddressField.tsx
// e a app/globals.css (@theme).
// Crea pagina "TravelGo — Tabs & Fields" con:
//   Tab switcher  (Variant=Outline|Solid|Ghost × Size=Xs|Sm|Md|Lg)
//   Soft field — Pill   (Size=Sm|Md × State=Default|Hover|Focus|Filled)
//   Soft field — Inline (Layout=A|B|C|D × State=Default|Filled)
//   Address field (esempio composto)
//   Budget input  (esempio composto)

(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // ============ Tokens da app/globals.css @theme ============
  const COL = {
    bg:           { r: 0.945, g: 0.937, b: 0.910 }, // #F1EFE8
    surface:      { r: 1, g: 1, b: 1 },             // #FFFFFF
    surfaceSoft:  { r: 0.961, g: 0.953, b: 0.933 }, // #F5F3EE
    surfaceInput: { r: 0.980, g: 0.980, b: 0.965 }, // #FAFAF6
    ink:          { r: 0.051, g: 0.173, b: 0.239 }, // #0D2C3D
    inkSoft:      { r: 0.357, g: 0.420, b: 0.471 }, // #5B6B78
    inkFaint:     { r: 0.541, g: 0.596, b: 0.639 }, // #8A98A3
    primary:      { r: 0.957, g: 0.482, b: 0.227 }, // #F47B3A (orange/primary)
    primaryDeep:  { r: 0.659, g: 0.282, b: 0.094 }, // #A84818
    dangerFg:     { r: 0.604, g: 0.188, b: 0.082 }, // #9A3015
    statusTodo:   { r: 0.886, g: 0.294, b: 0.290 }, // #E24B4A (icon "filled" Address)
  };
  const fill = (c, a) => [{ type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: a == null ? 1 : a }];

  const page = figma.createPage();
  page.name = "TravelGo — Tabs & Fields";
  await figma.setCurrentPageAsync(page);

  // ============================================================
  // TAB SWITCHER
  // ============================================================
  const TAB_SIZE = {
    Xs: { containerFs: 10, btnH: 20, btnPx: 8,  btnFs: 10 },
    Sm: { containerFs: 11, btnH: 24, btnPx: 10, btnFs: 11 },
    Md: { containerFs: 12, btnH: 32, btnPx: 14, btnFs: 12 },
    Lg: { containerFs: 13, btnH: 40, btnPx: 18, btnFs: 13 },
  };
  const TAB_VAR = {
    Outline: { bg: COL.surface, borderColor: COL.ink, borderAlpha: 0.18 },
    Solid:   { bg: null,        borderColor: null,    borderAlpha: 0 },
    Ghost:   { bg: null,        borderColor: null,    borderAlpha: 0 },
  };

  function createTabPill(label, active, size) {
    const s = TAB_SIZE[size];
    const btn = figma.createFrame();
    btn.name = `Tab ${label}${active ? " (active)" : ""}`;
    btn.layoutMode = "HORIZONTAL";
    btn.primaryAxisSizingMode = "AUTO";
    btn.counterAxisSizingMode = "FIXED";
    btn.resize(btn.width, s.btnH);
    btn.paddingLeft = btn.paddingRight = s.btnPx;
    btn.primaryAxisAlignItems = "CENTER";
    btn.counterAxisAlignItems = "CENTER";
    btn.cornerRadius = 999;
    if (active) {
      btn.fills = fill(COL.ink);
    } else {
      btn.fills = [];
    }
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.characters = label;
    t.fontSize = s.btnFs;
    t.fills = fill(active ? COL.surface : COL.ink);
    btn.appendChild(t);
    return btn;
  }

  function createTabSwitcher(variant, size) {
    const v = TAB_VAR[variant];
    const c = figma.createComponent();
    c.name = `Variant=${variant}, Size=${size}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "AUTO";
    c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 3;
    c.itemSpacing = 2;
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    c.fills = v.bg ? fill(v.bg) : [];
    if (v.borderColor) {
      c.strokes = [{ type: "SOLID", color: v.borderColor, opacity: v.borderAlpha }];
      c.strokeWeight = 1;
    }
    c.appendChild(createTabPill("Lista", true, size));
    c.appendChild(createTabPill("Timeline", false, size));
    c.appendChild(createTabPill("Racconto", false, size));
    return c;
  }

  const tabComps = [];
  for (const v of ["Outline", "Solid", "Ghost"]) {
    for (const s of ["Xs", "Sm", "Md", "Lg"]) {
      tabComps.push(createTabSwitcher(v, s));
    }
  }
  const tabSet = figma.combineAsVariants(tabComps, page);
  tabSet.name = "Tab switcher";
  styleSet(tabSet);

  // ============================================================
  // SOFT FIELD · PILL
  // ============================================================
  const PILL_SIZE = {
    Sm: { h: 32, padX: 14, padY: 6,  gap: 4, fs: 13 },
    Md: { h: 44, padX: 18, padY: 10, gap: 6, fs: 15 },
  };

  function createSoftPill(size, state) {
    const s = PILL_SIZE[size];
    const filled = state === "Filled";
    const focused = state === "Focus";
    const hovered = state === "Hover";

    const c = figma.createComponent();
    c.name = `Variant=Pill, Size=${size}, State=${state}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "FIXED";
    c.counterAxisSizingMode = "FIXED";
    c.resize(280, s.h);
    c.paddingLeft = c.paddingRight = s.padX;
    c.paddingTop = c.paddingBottom = s.padY;
    c.itemSpacing = s.gap;
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;

    // bg: surface-input by default, surface (white) on focus
    c.fills = fill(focused ? COL.surface : COL.surfaceInput);

    // border:
    //   default → border (ink @ 0.08)
    //   hover   → border-strong (ink @ 0.18)
    //   focus   → primary (#F47B3A)
    const borderColor = focused ? COL.primary : COL.ink;
    const borderAlpha = focused ? 1 : hovered ? 0.18 : 0.08;
    c.strokes = [{ type: "SOLID", color: borderColor, opacity: borderAlpha }];
    c.strokeWeight = focused ? 1 : 0.5;

    // Focus ring: drop shadow primary @ 0.12, blur 0, spread 3px
    if (focused) {
      c.effects = [
        { type: "DROP_SHADOW", color: { r: COL.primary.r, g: COL.primary.g, b: COL.primary.b, a: 0.12 }, offset: { x: 0, y: 0 }, radius: 0, spread: 3, visible: true, blendMode: "NORMAL" },
      ];
    }

    // Value (input text)
    const t = figma.createText();
    t.fontName = filled ? { family: "Inter", style: "Regular" } : { family: "Inter", style: "Regular" };
    t.characters = filled ? "Asakusa-ku, Tokyo" : "Cerca indirizzo…";
    t.fontSize = s.fs;
    t.fills = fill(filled ? COL.ink : COL.inkFaint);
    t.layoutGrow = 1;
    c.appendChild(t);

    return c;
  }

  const pillComps = [];
  for (const sz of ["Sm", "Md"]) {
    for (const st of ["Default", "Hover", "Focus", "Filled"]) {
      pillComps.push(createSoftPill(sz, st));
    }
  }
  const pillSet = figma.combineAsVariants(pillComps, page);
  pillSet.name = "Soft field — Pill";
  styleSet(pillSet);

  // ============================================================
  // SOFT FIELD · INLINE (passport row)
  // ============================================================
  // Layouts (A/B/C/D):
  //   A → icon + label + value
  //   B → icon + value (no label)
  //   C → label + value (no icon)
  //   D → value only (bare)
  // State: Default (empty), Filled

  function createInline(layout, state) {
    const hasIcon = layout === "A" || layout === "B";
    const hasLabel = layout === "A" || layout === "C";
    const filled = state === "Filled";

    const c = figma.createComponent();
    c.name = `Variant=Inline, Layout=${layout}, State=${state}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "FIXED";
    c.counterAxisSizingMode = "AUTO";
    c.resize(320, c.height);
    c.itemSpacing = 10;
    c.paddingTop = c.paddingBottom = 8;
    c.counterAxisAlignItems = "CENTER";
    c.fills = [];

    if (hasIcon) {
      const ig = figma.createText();
      ig.fontName = { family: "Inter", style: "Regular" };
      ig.characters = "✦";
      ig.fontSize = 14;
      // Icon color: ink-faint (empty) → primary (filled)
      ig.fills = fill(filled ? COL.primary : COL.inkFaint);
      c.appendChild(ig);
    }

    if (hasLabel) {
      const lbl = figma.createText();
      lbl.fontName = { family: "Inter", style: "Medium" };
      lbl.characters = "INDIRIZZO";
      lbl.fontSize = 10;
      lbl.letterSpacing = { unit: "PERCENT", value: 6 };
      lbl.fills = fill(COL.inkFaint);
      lbl.resize(50, lbl.height);
      c.appendChild(lbl);
    }

    const val = figma.createText();
    val.fontName = { family: "Inter", style: "Medium" };
    if (filled) {
      val.characters = "Asakusa-ku, Tokyo";
      val.fills = fill(COL.ink);
    } else {
      val.characters = "Tocca per inserire…";
      val.fills = fill(COL.inkFaint);
    }
    val.fontSize = 12.5;
    val.layoutGrow = 1;
    c.appendChild(val);

    return c;
  }

  const inlineComps = [];
  for (const lay of ["A", "B", "C", "D"]) {
    for (const st of ["Default", "Filled"]) {
      inlineComps.push(createInline(lay, st));
    }
  }
  const inlineSet = figma.combineAsVariants(inlineComps, page);
  inlineSet.name = "Soft field — Inline";
  styleSet(inlineSet);

  // ============================================================
  // ADDRESS FIELD (composed example — single component)
  // ============================================================
  function createAddressField() {
    const c = figma.createComponent();
    c.name = "Address field · Filled · with map button";
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "FIXED";
    c.counterAxisSizingMode = "FIXED";
    c.resize(380, 44);
    c.paddingLeft = c.paddingRight = 18;
    c.paddingTop = c.paddingBottom = 10;
    c.itemSpacing = 8;
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    c.fills = fill(COL.surfaceInput);
    c.strokes = [{ type: "SOLID", color: COL.ink, opacity: 0.08 }];
    c.strokeWeight = 0.5;

    // Prefix: map-pin icon · "filled" → status-todo red (per src AddressField)
    const ig = figma.createText();
    ig.fontName = { family: "Inter", style: "Regular" };
    ig.characters = "📍";
    ig.fontSize = 14;
    ig.fills = fill(COL.statusTodo);
    c.appendChild(ig);

    // Value
    const val = figma.createText();
    val.fontName = { family: "Inter", style: "Regular" };
    val.characters = "Asakusa-ku, Taito City, Tokyo 111-0032, Japan";
    val.fontSize = 15;
    val.fills = fill(COL.ink);
    val.layoutGrow = 1;
    c.appendChild(val);

    // Suffix: "map" Button outline sm
    const mapBtn = figma.createFrame();
    mapBtn.layoutMode = "HORIZONTAL";
    mapBtn.primaryAxisSizingMode = "AUTO";
    mapBtn.counterAxisSizingMode = "FIXED";
    mapBtn.resize(mapBtn.width, 24);
    mapBtn.paddingLeft = 8;
    mapBtn.paddingRight = 10;
    mapBtn.itemSpacing = 4;
    mapBtn.counterAxisAlignItems = "CENTER";
    mapBtn.fills = fill(COL.surface);
    mapBtn.strokes = [{ type: "SOLID", color: COL.ink, opacity: 0.18 }];
    mapBtn.strokeWeight = 0.5;
    mapBtn.cornerRadius = 999;

    const mapIcon = figma.createText();
    mapIcon.fontName = { family: "Inter", style: "Regular" };
    mapIcon.characters = "🗺";
    mapIcon.fontSize = 11;
    mapIcon.fills = fill(COL.ink);
    mapBtn.appendChild(mapIcon);

    const mapLbl = figma.createText();
    mapLbl.fontName = { family: "Inter", style: "Medium" };
    mapLbl.characters = "map";
    mapLbl.fontSize = 11;
    mapLbl.fills = fill(COL.ink);
    mapBtn.appendChild(mapLbl);

    c.appendChild(mapBtn);
    return c;
  }
  const addressField = createAddressField();

  // ============================================================
  // BUDGET INPUT
  // ============================================================
  function createBudgetInput() {
    const c = figma.createComponent();
    c.name = "Budget input · with conversion";
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "FIXED";
    c.counterAxisSizingMode = "AUTO";
    c.resize(260, c.height);
    c.paddingLeft = c.paddingRight = 18;
    c.paddingTop = c.paddingBottom = 8;
    c.itemSpacing = 6;
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    c.fills = fill(COL.surfaceInput);
    c.strokes = [{ type: "SOLID", color: COL.ink, opacity: 0.08 }];
    c.strokeWeight = 0.5;

    // Symbol
    const sym = figma.createText();
    sym.fontName = { family: "Inter", style: "Medium" };
    sym.characters = "€";
    sym.fontSize = 13;
    sym.fills = fill(COL.inkFaint);
    c.appendChild(sym);

    // Amount
    const amt = figma.createText();
    amt.fontName = { family: "Inter", style: "Medium" };
    amt.characters = "120";
    amt.fontSize = 13;
    amt.fills = fill(COL.ink);
    amt.layoutGrow = 1;
    c.appendChild(amt);

    // Conversion
    const conv = figma.createText();
    conv.fontName = { family: "Inter", style: "Regular" };
    conv.characters = "≈ ¥19.500";
    conv.fontSize = 11;
    conv.fills = fill(COL.inkFaint);
    c.appendChild(conv);

    // Currency pill (bg-ink)
    const cur = figma.createFrame();
    cur.layoutMode = "HORIZONTAL";
    cur.primaryAxisSizingMode = "AUTO";
    cur.counterAxisSizingMode = "AUTO";
    cur.paddingLeft = 9;
    cur.paddingRight = 7;
    cur.paddingTop = cur.paddingBottom = 3;
    cur.itemSpacing = 3;
    cur.counterAxisAlignItems = "CENTER";
    cur.fills = fill(COL.ink);
    cur.cornerRadius = 999;

    const code = figma.createText();
    code.fontName = { family: "Inter", style: "Medium" };
    code.characters = "EUR";
    code.fontSize = 10;
    code.letterSpacing = { unit: "PERCENT", value: 4 };
    code.fills = fill(COL.surface);
    cur.appendChild(code);

    const chev = figma.createText();
    chev.fontName = { family: "Inter", style: "Regular" };
    chev.characters = "⌄";
    chev.fontSize = 10;
    chev.fills = fill(COL.surface, 0.6);
    cur.appendChild(chev);

    c.appendChild(cur);
    return c;
  }
  const budgetInput = createBudgetInput();

  // ============ Layout: column with section labels ============
  function styleSet(set) {
    set.fills = fill(COL.bg);
    set.cornerRadius = 14;
    set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;
    set.itemSpacing = 16;
    set.layoutMode = "VERTICAL";
    set.primaryAxisSizingMode = "AUTO";
    set.counterAxisSizingMode = "AUTO";
  }

  function addLabel(text, x, y) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.characters = text;
    t.fontSize = 18;
    t.fills = fill(COL.ink);
    t.x = x;
    t.y = y - 32;
    page.appendChild(t);
  }

  let yCursor = 200;
  const xCol = 200;

  tabSet.x = xCol; tabSet.y = yCursor;
  addLabel("Tab switcher", tabSet.x, tabSet.y);
  yCursor = tabSet.y + tabSet.height + 80;

  pillSet.x = xCol; pillSet.y = yCursor;
  addLabel("Soft field — Pill", pillSet.x, pillSet.y);
  yCursor = pillSet.y + pillSet.height + 80;

  inlineSet.x = xCol; inlineSet.y = yCursor;
  addLabel("Soft field — Inline", inlineSet.x, inlineSet.y);
  yCursor = inlineSet.y + inlineSet.height + 80;

  addressField.x = xCol; addressField.y = yCursor;
  addLabel("Address field", addressField.x, addressField.y);
  yCursor = addressField.y + addressField.height + 80;

  budgetInput.x = xCol; budgetInput.y = yCursor;
  addLabel("Budget input", budgetInput.x, budgetInput.y);

  figma.viewport.scrollAndZoomIntoView([tabSet, pillSet, inlineSet, addressField, budgetInput]);
  figma.notify("✓ Tabs & Fields creati");
  figma.closePlugin();
})();
