// TravelGo — Filter header plugin
// Allineato a public/design/styles.css (tokens reali)
// Crea pagina "TravelGo — Filters" con header collapsed + popover Opzioni.

(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // ============ Tokens TravelGo ============
  const COL = {
    bg:           { r: 0.945, g: 0.937, b: 0.910 }, // #F1EFE8
    surface:      { r: 1, g: 1, b: 1 },             // #FFFFFF
    surfaceSoft:  { r: 0.961, g: 0.953, b: 0.933 }, // #F5F3EE
    surfaceWarm:  { r: 0.992, g: 0.961, b: 0.933 }, // #FDF5EE
    ink:          { r: 0.051, g: 0.173, b: 0.239 }, // #0D2C3D
    inkSoft:      { r: 0.357, g: 0.420, b: 0.471 }, // #5B6B78
    inkFaint:     { r: 0.541, g: 0.596, b: 0.639 }, // #8A98A3
    borderStrong: { r: 0.051, g: 0.173, b: 0.239 }, // alpha 0.18 nei fill
    orange:       { r: 0.957, g: 0.482, b: 0.227 }, // #F47B3A
    orangeSoft:   { r: 0.992, g: 0.925, b: 0.875 }, // #FDECDF
    orangeDeep:   { r: 0.659, g: 0.282, b: 0.094 }, // #A84818
    lime:         { r: 0.902, g: 0.949, b: 0.329 }, // #E6F254
    limeText:     { r: 0.353, g: 0.384, b: 0.024 }, // #5A6206
  };
  const fill = (c, a) => [{ type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: a == null ? 1 : a }];

  const page = figma.createPage();
  page.name = "TravelGo — Filters";
  await figma.setCurrentPageAsync(page);

  // ============ Root ============
  const root = figma.createFrame();
  root.name = "Filter header + popover";
  root.layoutMode = "VERTICAL";
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "AUTO";
  root.itemSpacing = 4;
  root.paddingLeft = root.paddingRight = root.paddingTop = root.paddingBottom = 24;
  root.fills = fill(COL.bg);
  root.cornerRadius = 14;
  root.x = 100; root.y = 100;

  // ============ Header (collapsed) ============
  const header = figma.createFrame();
  header.name = "Header (collapsed)";
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "AUTO";
  header.resize(420, header.height);
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "CENTER";
  header.itemSpacing = 8;
  header.paddingLeft = header.paddingRight = 12;
  header.paddingTop = header.paddingBottom = 10;
  header.fills = fill(COL.surface);
  header.cornerRadius = 14;
  header.strokes = [{ type: "SOLID", color: COL.borderStrong, opacity: 0.08 }];
  header.strokeWeight = 0.5;

  // Search pill (riusa estetica .stop-pill / .soft)
  const search = figma.createFrame();
  search.name = "Search pill";
  search.layoutMode = "HORIZONTAL";
  search.layoutGrow = 1;
  search.primaryAxisSizingMode = "AUTO";
  search.counterAxisSizingMode = "FIXED";
  search.resize(search.width, 32);
  search.itemSpacing = 8;
  search.paddingLeft = search.paddingRight = 14;
  search.counterAxisAlignItems = "CENTER";
  search.fills = fill(COL.surfaceSoft);
  search.cornerRadius = 999;

  const sIcon = figma.createText();
  sIcon.fontName = { family: "Inter", style: "Regular" };
  sIcon.characters = "⌕";
  sIcon.fontSize = 14;
  sIcon.fills = fill(COL.inkSoft);
  search.appendChild(sIcon);

  const sPh = figma.createText();
  sPh.fontName = { family: "Inter", style: "Regular" };
  sPh.characters = "Cerca tappa…";
  sPh.fontSize = 12;
  sPh.fills = fill(COL.inkFaint);
  search.appendChild(sPh);
  header.appendChild(search);

  // Opzioni button (variante .solid arancione, brand-aware)
  const opt = figma.createFrame();
  opt.name = "Opzioni button (solid orange · active)";
  opt.layoutMode = "HORIZONTAL";
  opt.primaryAxisSizingMode = "AUTO";
  opt.counterAxisSizingMode = "FIXED";
  opt.resize(opt.width, 32);
  opt.itemSpacing = 6;
  opt.paddingLeft = 11;
  opt.paddingRight = 14;
  opt.counterAxisAlignItems = "CENTER";
  opt.fills = fill(COL.orange);
  opt.cornerRadius = 999;

  const optLbl = figma.createText();
  optLbl.fontName = { family: "Inter", style: "Medium" };
  optLbl.characters = "⚙ Opzioni";
  optLbl.fontSize = 12;
  optLbl.fills = fill(COL.surface);
  opt.appendChild(optLbl);

  const badge = figma.createFrame();
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisSizingMode = "AUTO";
  badge.counterAxisSizingMode = "AUTO";
  badge.paddingLeft = badge.paddingRight = 6;
  badge.paddingTop = badge.paddingBottom = 1;
  badge.fills = fill(COL.surface, 0.25);
  badge.cornerRadius = 999;
  const badgeTxt = figma.createText();
  badgeTxt.fontName = { family: "Inter", style: "Medium" };
  badgeTxt.characters = "3";
  badgeTxt.fontSize = 10;
  badgeTxt.fills = fill(COL.surface);
  badge.appendChild(badgeTxt);
  opt.appendChild(badge);
  header.appendChild(opt);
  root.appendChild(header);

  // ============ Popover ============
  const pop = figma.createFrame();
  pop.name = "Popover — Opzioni";
  pop.layoutMode = "VERTICAL";
  pop.primaryAxisSizingMode = "AUTO";
  pop.counterAxisSizingMode = "FIXED";
  pop.resize(420, pop.height);
  pop.itemSpacing = 4;
  pop.paddingLeft = pop.paddingRight = 18;
  pop.paddingTop = pop.paddingBottom = 16;
  pop.fills = fill(COL.surface);
  pop.cornerRadius = 14;
  pop.strokes = [{ type: "SOLID", color: COL.borderStrong, opacity: 0.08 }];
  pop.strokeWeight = 0.5;
  pop.effects = [
    // 0 10px 40px #0d2c3d2e
    { type: "DROP_SHADOW", color: { r: COL.ink.r, g: COL.ink.g, b: COL.ink.b, a: 0.18 }, offset: { x: 0, y: 10 }, radius: 40, spread: 0, visible: true, blendMode: "NORMAL" },
    // 0 2px 8px #0d2c3d14
    { type: "DROP_SHADOW", color: { r: COL.ink.r, g: COL.ink.g, b: COL.ink.b, a: 0.08 }, offset: { x: 0, y: 2  }, radius: 8,  spread: 0, visible: true, blendMode: "NORMAL" },
  ];

  const buildRow = (titleText, subText, icons) => {
    const row = figma.createFrame();
    row.name = `Row — ${titleText}`;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "FIXED";
    row.counterAxisSizingMode = "AUTO";
    row.resize(384, row.height);
    row.itemSpacing = 14;
    row.paddingTop = row.paddingBottom = 8;
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];

    const tb = figma.createFrame();
    tb.layoutMode = "VERTICAL";
    tb.primaryAxisSizingMode = "AUTO";
    tb.counterAxisSizingMode = "FIXED";
    tb.resize(110, tb.height);
    tb.itemSpacing = 2;
    tb.fills = [];

    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Medium" };
    title.characters = titleText;
    title.fontSize = 13;
    title.fills = fill(COL.ink);
    tb.appendChild(title);

    const sub = figma.createText();
    sub.fontName = { family: "Inter", style: "Regular" };
    sub.characters = subText;
    sub.fontSize = 10;
    sub.fills = fill(COL.inkSoft);
    tb.appendChild(sub);

    row.appendChild(tb);

    const strip = figma.createFrame();
    strip.layoutMode = "HORIZONTAL";
    strip.primaryAxisSizingMode = "AUTO";
    strip.counterAxisSizingMode = "AUTO";
    strip.itemSpacing = 4;
    strip.fills = [];

    for (const ic of icons) {
      const btn = figma.createFrame();
      btn.name = `${ic.label}${ic.active ? " (selected)" : ""}`;
      btn.layoutMode = "VERTICAL";
      btn.primaryAxisSizingMode = "FIXED";
      btn.counterAxisSizingMode = "FIXED";
      btn.resize(48, 44);
      btn.itemSpacing = 4;
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      btn.fills = [];
      btn.cornerRadius = 8;

      const glyph = figma.createText();
      glyph.fontName = { family: "Inter", style: "Regular" };
      glyph.characters = ic.glyph;
      glyph.fontSize = 20;
      glyph.fills = fill(ic.active ? COL.ink : COL.inkSoft);
      btn.appendChild(glyph);

      const bar = figma.createRectangle();
      bar.resize(24, 2);
      bar.cornerRadius = 2;
      bar.fills = ic.active ? fill(COL.orange) : [];
      btn.appendChild(bar);

      strip.appendChild(btn);
    }
    row.appendChild(strip);
    return row;
  };

  const divider = () => {
    const d = figma.createRectangle();
    d.resize(384, 0.5);
    d.fills = [{ type: "SOLID", color: COL.ink, opacity: 0.08 }];
    return d;
  };

  // Le 4 sezioni
  pop.appendChild(buildRow("Mostra", "multi", [
    { glyph: "📍", label: "Tappe",   active: false },
    { glyph: "🛏", label: "Notti",   active: true  },
    { glyph: "♨", label: "Onsen",    active: true  },
    { glyph: "🏛", label: "Cultura", active: true  },
    { glyph: "🚙", label: "Soste",   active: false },
    { glyph: "📷", label: "Micro",   active: false },
  ]));
  pop.appendChild(divider());

  pop.appendChild(buildRow("Raggruppa per", "singola", [
    { glyph: "🗓", label: "Giorno",    active: true  },
    { glyph: "🗺", label: "Regione",   active: false },
    { glyph: "▦", label: "Tipologia",  active: false },
    { glyph: "—", label: "Nessuno",    active: false },
  ]));
  pop.appendChild(divider());

  pop.appendChild(buildRow("Vista", "singola", [
    { glyph: "≡", label: "Timeline",    active: true  },
    { glyph: "▥", label: "Gantt",       active: false },
    { glyph: "🗓", label: "Calendario", active: false },
    { glyph: "🗺", label: "Mappa",      active: false },
  ]));
  pop.appendChild(divider());

  pop.appendChild(buildRow("Ottimizza per", "singola", [
    { glyph: "↝", label: "Distanza",  active: false },
    { glyph: "⏱", label: "Tempo",     active: false },
    { glyph: "⛰", label: "Scenic",    active: true  },
    { glyph: "$", label: "Risparmio", active: false },
  ]));

  // Footer
  const footer = figma.createFrame();
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisSizingMode = "FIXED";
  footer.counterAxisSizingMode = "AUTO";
  footer.resize(384, footer.height);
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.counterAxisAlignItems = "CENTER";
  footer.paddingTop = 12;
  footer.fills = [];

  const reset = figma.createText();
  reset.fontName = { family: "Inter", style: "Regular" };
  reset.characters = "↻ Ripristina";
  reset.fontSize = 11;
  reset.fills = fill(COL.inkSoft);
  footer.appendChild(reset);

  // Applica come .solid arancione (CTA brand)
  const apply = figma.createFrame();
  apply.layoutMode = "HORIZONTAL";
  apply.primaryAxisSizingMode = "AUTO";
  apply.counterAxisSizingMode = "FIXED";
  apply.resize(apply.width, 32);
  apply.paddingLeft = apply.paddingRight = 16;
  apply.counterAxisAlignItems = "CENTER";
  apply.fills = fill(COL.orange);
  apply.cornerRadius = 999;
  const applyTxt = figma.createText();
  applyTxt.fontName = { family: "Inter", style: "Medium" };
  applyTxt.characters = "Applica";
  applyTxt.fontSize = 12;
  applyTxt.fills = fill(COL.surface);
  apply.appendChild(applyTxt);
  footer.appendChild(apply);
  pop.appendChild(footer);

  root.appendChild(pop);

  figma.viewport.scrollAndZoomIntoView([root]);
  figma.notify("✓ Header + popover creati nella pagina 'TravelGo — Filters'");
  figma.closePlugin();
})();
