// TravelGo — Button library plugin
// Allineato a public/design/design-system.css (.btn-icon)
// Lancia da: Plugins > Development > TravelGo — Button library
// Crea 3 component set nella pagina "TravelGo — Buttons":
//   Button     (icon + label) — Variant × Size
//   Icon button (icon-only square) — Variant × Size
//   Text button (label only)  — Variant × Size

(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // ============ Tokens (rgb/255) ============
  const COL = {
    bg:           { r: 0.945, g: 0.937, b: 0.910 }, // #F1EFE8
    surface:      { r: 1, g: 1, b: 1 },             // #FFFFFF
    surfaceSoft:  { r: 0.961, g: 0.953, b: 0.933 }, // #F5F3EE
    ink:          { r: 0.051, g: 0.173, b: 0.239 }, // #0D2C3D
    inkSoft:      { r: 0.357, g: 0.420, b: 0.471 }, // #5B6B78
    inkFaint:     { r: 0.541, g: 0.596, b: 0.639 }, // #8A98A3
    borderStrong: { r: 0.051, g: 0.173, b: 0.239 }, // #0D2C3D @ 0.18 alpha
    danger:       { r: 0.604, g: 0.188, b: 0.082 }, // #9A3015
    warningText:  { r: 0.639, g: 0.471, b: 0.035 }, // #A37809
    warningSolid: { r: 0.878, g: 0.659, b: 0.094 }, // #E0A818
  };
  const fill = (c, a) => [{ type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: a == null ? 1 : a }];

  // ============ Page ============
  const page = figma.createPage();
  page.name = "TravelGo — Buttons";
  await figma.setCurrentPageAsync(page);

  // ============ Size config (icon + label) ============
  const SIZES = {
    Sm: { square: 24, h: 24, padL: 8,  padR: 10, gap: 5, fontLabel: 11, fontSquare: 11, iconSize: 12, padTextX: 14, fontTextOnly: 11 },
    Md: { square: 32, h: 32, padL: 11, padR: 14, gap: 6, fontLabel: 12, fontSquare: 14, iconSize: 14, padTextX: 16, fontTextOnly: 12 },
    Lg: { square: 40, h: 40, padL: 14, padR: 18, gap: 8, fontLabel: 13, fontSquare: 16, iconSize: 16, padTextX: 22, fontTextOnly: 13 },
  };

  // ============ Variant config ============
  // Default → bg white, border-strong, text ink
  // Solid   → bg ink, text white, border ink
  // Ghost   → bg transparent, no border, text ink
  // Danger  → text danger, border default (resta default style)
  // Warning → text warning, border warning @ 0.25
  const VARS = {
    Default: { bg: COL.surface, text: COL.ink,         border: COL.borderStrong, borderAlpha: 0.18 },
    Solid:   { bg: COL.ink,     text: COL.surface,     border: COL.ink,          borderAlpha: 1    },
    Ghost:   { bg: null,        text: COL.ink,         border: null,             borderAlpha: 0    },
    Danger:  { bg: COL.surface, text: COL.danger,      border: COL.borderStrong, borderAlpha: 0.18 },
    Warning: { bg: COL.surface, text: COL.warningText, border: COL.warningText,  borderAlpha: 0.25 },
  };

  function applyVisuals(c, v) {
    c.fills = v.bg ? fill(v.bg) : [];
    if (v.border) {
      c.strokes = [{ type: "SOLID", color: { r: v.border.r, g: v.border.g, b: v.border.b }, opacity: v.borderAlpha }];
      c.strokeWeight = 0.5;
    }
  }

  // ============ Button factory (with label + icon) ============
  function createButton(variant, size) {
    const s = SIZES[size];
    const v = VARS[variant];
    const c = figma.createComponent();
    c.name = `Variant=${variant}, Size=${size}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "FIXED";
    c.resize(100, s.h);
    c.paddingLeft = s.padL;
    c.paddingRight = s.padR;
    c.itemSpacing = s.gap;
    c.primaryAxisAlignItems = "CENTER";
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    applyVisuals(c, v);

    const ig = figma.createText();
    ig.fontName = { family: "Inter", style: "Regular" };
    ig.characters = "✦"; // placeholder — sostituisci con istanza Tabler
    ig.fontSize = s.iconSize;
    ig.fills = fill(v.text);
    c.appendChild(ig);

    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.characters = "Bottone";
    t.fontSize = s.fontLabel;
    t.fills = fill(v.text);
    c.appendChild(t);

    return c;
  }

  // ============ Icon button factory (square) ============
  function createIconButton(variant, size) {
    const s = SIZES[size];
    const v = VARS[variant];
    const c = figma.createComponent();
    c.name = `Variant=${variant}, Size=${size}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "FIXED";
    c.counterAxisSizingMode = "FIXED";
    c.resize(s.square, s.square);
    c.primaryAxisAlignItems = "CENTER";
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    applyVisuals(c, v);

    const ig = figma.createText();
    ig.fontName = { family: "Inter", style: "Regular" };
    ig.characters = "✦";
    ig.fontSize = s.fontSquare;
    ig.fills = fill(v.text);
    c.appendChild(ig);

    return c;
  }

  // ============ Text button factory (no icon) ============
  function createTextButton(variant, size) {
    const s = SIZES[size];
    const v = VARS[variant];
    const c = figma.createComponent();
    c.name = `Variant=${variant}, Size=${size}`;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "FIXED";
    c.resize(100, s.h);
    c.paddingLeft = c.paddingRight = s.padTextX;
    c.itemSpacing = 0;
    c.primaryAxisAlignItems = "CENTER";
    c.counterAxisAlignItems = "CENTER";
    c.cornerRadius = 999;
    applyVisuals(c, v);

    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.characters = "Bottone";
    t.fontSize = s.fontTextOnly;
    t.fills = fill(v.text);
    c.appendChild(t);

    return c;
  }

  // ============ Build sets ============
  const variants = ["Default", "Solid", "Ghost", "Danger", "Warning"];
  const sizes = ["Sm", "Md", "Lg"];

  const buttonComps = [];
  const iconBtnComps = [];
  const textBtnComps = [];
  for (const v of variants) {
    for (const s of sizes) {
      buttonComps.push(createButton(v, s));
      iconBtnComps.push(createIconButton(v, s));
      textBtnComps.push(createTextButton(v, s));
    }
  }

  const buttonSet = figma.combineAsVariants(buttonComps, page);
  buttonSet.name = "Button";
  styleSet(buttonSet);

  const iconBtnSet = figma.combineAsVariants(iconBtnComps, page);
  iconBtnSet.name = "Icon button";
  styleSet(iconBtnSet);

  const textBtnSet = figma.combineAsVariants(textBtnComps, page);
  textBtnSet.name = "Text button";
  styleSet(textBtnSet);

  function styleSet(set) {
    set.fills = fill(COL.bg);
    set.cornerRadius = 14;
    set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;
    set.itemSpacing = 16;
    set.layoutMode = "VERTICAL";
    set.primaryAxisSizingMode = "AUTO";
    set.counterAxisSizingMode = "AUTO";
  }

  // ============ Layout: column with section labels ============
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

  buttonSet.x = 200; buttonSet.y = 200;
  addLabel("Button (icon + label)", buttonSet.x, buttonSet.y);

  iconBtnSet.x = 200; iconBtnSet.y = buttonSet.y + buttonSet.height + 80;
  addLabel("Icon button (square)", iconBtnSet.x, iconBtnSet.y);

  textBtnSet.x = 200; textBtnSet.y = iconBtnSet.y + iconBtnSet.height + 80;
  addLabel("Text button (label only)", textBtnSet.x, textBtnSet.y);

  figma.viewport.scrollAndZoomIntoView([buttonSet, iconBtnSet, textBtnSet]);
  figma.notify("✓ Button library creata: 3 set × 15 variants = 45 component");
  figma.closePlugin();
})();
