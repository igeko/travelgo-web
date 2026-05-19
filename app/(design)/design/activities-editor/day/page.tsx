/**
 * Day Editor · design sketch (importato da Claude Design 2026-05-18)
 *
 * Architettura (decisioni 15-19, 24-25 in docs/design/activities-editor.md):
 *   - **Embedded nella pagina giorno** (decisione 25): niente day banner, niente
 *     edit toggle, niente sticky footer Done.
 *   - **AI vive qui** (decisione 24): "Organize this day" in toolbar.
 *   - Toolbar: Show map · Organize this day · 3-toggle (Lista | Timeline | Racconto)
 *   - **Add zone hover-reveal con 2 affordance**: "aggiungi blocco" (orange) e
 *     "aggiungi attività" (ink-soft).
 *   - **ActivityAutocomplete** inline: search wishlist + database con highlighting
 *     e fallback "Crea nuova attività".
 *   - Block-row containerless, hover → white card + orange glow.
 *   - Spine continua tra le sezioni; icone con halo che mascherano la linea.
 *
 * Tutto inline. Modificare liberamente.
 */

import "./day-editor.css";

const MORNING_BLOCKS = [
  { id: "exit",     time: "07:40", icon: "ti-key",       name: "Uscita albergo", type: "action" as const, fuzzy: false },
  { id: "sensoji",  time: "08:00", icon: "ti-map-pin",   name: "Sensō-ji",       type: "place"  as const, fuzzy: false },
  { id: "sumida",   time: "10:30", icon: "ti-map-pin",   name: "Parco Sumida",   type: "place"  as const, fuzzy: false },
];

const BRIDGE_BEFORE_SENSOJI = { mezzo: "walk", label: "8 min a piedi · 0,6 km" };

/* ─────────────────────────────────────────────────────────────────
   Sub-components inline
───────────────────────────────────────────────────────────────── */

function BlockRow({
  icon,
  time,
  name,
  fuzzy = false,
  filledIcon = false,
  parenSuffix,
}: {
  icon: string;
  time: string;
  name: string;
  fuzzy?: boolean;
  filledIcon?: boolean;
  parenSuffix?: string;
}) {
  return (
    <div className={`block-row ${fuzzy ? "fuzzy" : ""}`}>
      <span className={`ico ${filledIcon ? "filled" : ""}`}>
        <i className={`ti ${icon}`} />
      </span>
      <span className="time">{time}</span>
      <span className="name" title="Click sul nome → Activity Detail (entità)">
        {name}
        {parenSuffix && <span className="paren"> {parenSuffix}</span>}
      </span>
      <span className="row-actions">
        <button title="Edit instance (time, fuzzy, note, booking)">
          <i className="ti ti-pencil" style={{ fontSize: "12px" }} />
        </button>
        <button className="danger" title="Rimuovi dal giorno (l'entità resta in wishlist)">
          <i className="ti ti-trash" style={{ fontSize: "12px" }} />
        </button>
      </span>
    </div>
  );
}

function AddZone({ alwaysOn = false }: { alwaysOn?: boolean }) {
  return (
    <div className={`add-zone ${alwaysOn ? "always-on" : ""}`}>
      <div className="add-dot">
        <i className="ti ti-plus" style={{ fontSize: "11px" }} />
      </div>
      <div className="add-affordance">
        <div className="add-affordance-item kind-block">
          <div className="add-line" />
          <span className="add-label">aggiungi blocco</span>
        </div>
        <div className="add-affordance-item kind-activity">
          <div className="add-line" />
          <span className="add-label">aggiungi attività</span>
        </div>
      </div>
    </div>
  );
}

function BridgeClosed({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="bridge-closed">
      <i className={`ti ${icon}`} />
      <span>{label}</span>
      <span className="edit-hint">
        <i className="ti ti-pencil" style={{ fontSize: "11.5px" }} />
      </span>
    </div>
  );
}

function BridgeExpanded() {
  return (
    <div className="bridge-expanded">
      <div className="be-card">
        <div className="be-head">
          <i className="ti ti-pencil" style={{ fontSize: "11px" }} />
          <span>Modifica spostamento</span>
          <span className="close">
            <i className="ti ti-x" style={{ fontSize: "13px" }} />
          </span>
        </div>
        <div className="be-row">
          <span className="be-lbl">Mezzo</span>
          {[
            { id: "walk",  icon: "ti-walk",  label: "A piedi" },
            { id: "metro", icon: "ti-train", label: "Metro" },
            { id: "bus",   icon: "ti-bus",   label: "Bus" },
            { id: "taxi",  icon: "ti-car",   label: "Taxi" },
            { id: "bike",  icon: "ti-bike",  label: "Bici" },
          ].map((m) => (
            <span key={m.id} className={`be-chip ${m.id === "metro" ? "on" : ""}`}>
              <i className={`ti ${m.icon}`} />
              {m.label}
            </span>
          ))}
        </div>
        <div className="be-fields">
          <div className="be-field"><span className="be-key">Tempo</span>~ 5 min · 2 fermate</div>
          <div className="be-field"><span className="be-key">Linea</span>Ginza Line</div>
        </div>
        <div className="be-note">Nota: <b>uscita A2, vicino al konbini</b></div>
        <div className="be-foot">
          <span className="be-free">
            <i className="ti ti-circle-minus" style={{ fontSize: "11.5px" }} />
            Marca come tempo libero
          </span>
          <button className="be-ok">OK</button>
        </div>
      </div>
    </div>
  );
}

function AddExpandedFuzzy() {
  const types = [
    { id: "place",  icon: "ti-map-pin", label: "Luogo" },
    { id: "move",   icon: "ti-train",   label: "Spostamento" },
    { id: "meal",   icon: "ti-soup",    label: "Pasto" },
    { id: "pause",  icon: "ti-tree",    label: "Pausa" },
    { id: "action", icon: "ti-key",     label: "Azione" },
  ];

  return (
    <div className="add-expanded">
      <div className="ae-card">
        <div className="ae-head">
          <i className="ti ti-plus" style={{ fontSize: "11px" }} />
          <span>Nuovo blocco</span>
          <span className="close">
            <i className="ti ti-x" style={{ fontSize: "13px" }} />
          </span>
        </div>
        <div className="ae-type-chips">
          {types.map((t) => (
            <span key={t.id} className={`ae-type-chip ${t.id === "pause" ? "on" : ""}`}>
              <i className={`ti ${t.icon}`} />
              {t.label}
            </span>
          ))}
        </div>
        <div className="ae-fields">
          <div className="ae-field time"><span className="ae-key">Ora</span><span className="ae-val">16:00</span></div>
          <div className="ae-field flex-1"><span className="ae-key">Titolo</span><span className="ae-val">giro intorno all'hotel</span></div>
          <div className="ae-field zone"><span className="ae-key">Zona (opz.)</span><span className="ae-val italic">(decidi sul posto)</span></div>
        </div>
        <div className="ae-foot">
          <span style={{ fontStyle: "italic" }}>
            Niente zona = fuzzy <i className="ti ti-info-circle" style={{ fontSize: "10.5px" }} />
          </span>
          <button className="ae-ok">Aggiungi</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Activity Autocomplete (NEW) ─────────────────────────────────
   Stato live dopo click su "aggiungi attività". Cerca nella wishlist
   del viaggio + nel database TravelGo + offre "crea nuova".
─────────────────────────────────────────────────────────────────── */
function ActivityAutocomplete() {
  return (
    <div className="activity-autocomplete">
      <div className="aa-input-row">
        <span className="ico-ring">
          <i className="ti ti-search" style={{ fontSize: "12px" }} />
        </span>
        <span className="time-placeholder">16:00</span>
        <span className="aa-input">
          <span className="typed">tsukiji</span>
          <span className="caret" />
        </span>
        <span className="esc-hint">
          <kbd>esc</kbd> annulla
        </span>
      </div>

      <div className="aa-dropdown">
        <div className="aa-group-label">
          <span>nella wishlist</span>
          <span className="aa-group-count">2</span>
        </div>
        <div className="aa-option focused">
          <span className="aa-thumb" style={{ backgroundImage: "linear-gradient(160deg,#d4a674,#4c3a2a)" }} />
          <div className="aa-main">
            <div className="aa-name">
              Mercato <mark>Tsukiji</mark>
            </div>
            <div className="aa-meta">Chuo · 2h · 3 km da Yanaka</div>
          </div>
          <span className="aa-zone-tag">D3</span>
        </div>
        <div className="aa-option">
          <span className="aa-thumb" style={{ backgroundImage: "linear-gradient(160deg,#e0c590,#7a5c2a)" }} />
          <div className="aa-main">
            <div className="aa-name">
              <mark>Tsukiji</mark> Hongan-ji temple
            </div>
            <div className="aa-meta">Chuo · 45 min · vicino al mercato</div>
          </div>
        </div>

        <div className="aa-group-label">
          <span>nella piattaforma</span>
          <span className="aa-group-count">3</span>
        </div>
        <div className="aa-option">
          <span className="aa-thumb" style={{ backgroundImage: "linear-gradient(160deg,#8aaab8,#1f3b4a)" }} />
          <div className="aa-main">
            <div className="aa-name">
              <mark>Tsukiji</mark> Outer Market food tour
            </div>
            <div className="aa-meta">Chuo · esperienza guidata · 2h 30</div>
          </div>
        </div>
        <div className="aa-option">
          <span className="aa-thumb" style={{ backgroundImage: "linear-gradient(160deg,#c8a072,#5a3a1a)" }} />
          <div className="aa-main">
            <div className="aa-name">
              Sushi Dai (<mark>Tsukiji</mark>)
            </div>
            <div className="aa-meta">Chuo · ristorante · ⏱ coda media 45 min</div>
          </div>
        </div>
        <div className="aa-option">
          <span className="aa-thumb" style={{ backgroundImage: "linear-gradient(160deg,#b8a890,#4a3528)" }} />
          <div className="aa-main">
            <div className="aa-name">
              <mark>Tsukiji</mark> Namiyoke-jinja
            </div>
            <div className="aa-meta">Chuo · santuario · 20 min</div>
          </div>
        </div>

        <div className="aa-create">
          <span className="aa-create-ico">
            <i className="ti ti-plus" style={{ fontSize: "12px", color: "var(--color-orange-deep)" }} />
          </span>
          <div className="aa-create-main">
            <div><b>Crea "tsukiji"</b> come nuova attività</div>
            <div className="aa-create-sub">la aggiungi anche alla wishlist del viaggio</div>
          </div>
          <span className="aa-create-cta">Crea</span>
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ name, count }: { name: string; count: number }) {
  return (
    <div className="sec-div">
      <span className="sec-lbl">{name}</span>
      <span className="sec-line" />
      <span className="sec-count">{count} acts</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DayEditorSketch() {
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="mb-4">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">
          Sketch · embedded · importato da Claude Design
        </div>
        <h1 className="text-[22px] font-medium leading-tight">Day Editor</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          La vista timeline <b className="text-ink font-medium">embedded nella pagina giorno</b>. Niente day banner, niente edit toggle. <b className="text-ink font-medium">L'AI vive qui</b> (decisione 24): "Organize this day" sta in toolbar. Add zone con <b className="text-ink font-medium">2 affordance</b>: <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">+ aggiungi blocco</code> (free-form) e <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">+ aggiungi attività</code> (ricerca wishlist + database).
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/activities-editor">
              docs/design/activities-editor.md
            </a>{" "}
            · decisioni 15-19, 24-25.
          </span>
        </p>
      </header>

      {/* Faux day page context */}
      <div className="border border-dashed border-border rounded-xl bg-bg/40 p-2 mb-4">
        <div className="text-[10px] uppercase tracking-[0.10em] text-ink-faint text-center py-1">
          ↑ pagina giorno: banner, lodging, deck, Go intro · sopra il Day Editor ↑
        </div>
      </div>

      {/* Toolbar */}
      <div className="day-toolbar">
        <span className="dt-eyebrow">Day itinerary</span>
        <div className="dt-actions">
          <button className="dt-pill">
            <i className="ti ti-map" style={{ fontSize: "12.5px" }} />
            Show map
          </button>
          <button className="dt-pill dt-ai">
            <i className="ti ti-sparkles" style={{ fontSize: "12.5px" }} />
            Organize this day
          </button>
          <div className="dt-toggle">
            <button>Lista</button>
            <button className="on">Timeline<span className="dt-dot" /></button>
            <button>Racconto<span className="dt-dot" /></button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3">
        {/* MORNING */}
        <SectionDivider name="Morning" count={3} />

        <div className="spine spine--first">
          <AddZone />
          <BlockRow {...MORNING_BLOCKS[0]} />
          <AddZone alwaysOn />
          <BridgeClosed icon={`ti-${BRIDGE_BEFORE_SENSOJI.mezzo}`} label={BRIDGE_BEFORE_SENSOJI.label} />
          <BlockRow {...MORNING_BLOCKS[1]} />
          <AddZone />
          <BridgeExpanded />
          <BlockRow {...MORNING_BLOCKS[2]} />
          <AddZone />
        </div>

        {/* AFTERNOON */}
        <SectionDivider name="Afternoon" count={2} />

        <div className="spine">
          <AddZone />
          <BlockRow icon="ti-soup" time="12:30" name="Pranzo" parenSuffix="(zona Kuramae)" fuzzy filledIcon />
          <AddExpandedFuzzy />
          <BlockRow icon="ti-tree" time="14:30" name="Yanesen wander" />
          <ActivityAutocomplete />
          <AddZone />
        </div>

        {/* EVENING */}
        <SectionDivider name="Evening" count={1} />

        <div className="spine spine--last">
          <BridgeClosed icon="ti-soup" label="Cena qui (food court, flessibile)" />
          <BlockRow icon="ti-building-broadcast-tower" time="20:00" name="Tokyo Sky Tower Tree" />
          <AddZone />
        </div>
      </div>

      <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Hover sui gap</b> tra blocchi → 2 affordance: <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">+ aggiungi blocco</code> (composer fuzzy/free-form) e <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">+ aggiungi attività</code> (autocomplete wishlist + database con "crea nuova"). <b className="text-ink-soft font-medium">Click sul nome</b> di un blocco → Activity Detail. <b className="text-ink-soft font-medium">Pencil</b> → popover istanza (time, fuzzy, note, booking). <b className="text-ink-soft font-medium">Trash</b> → rimuove dal giorno. <b className="text-ink-soft font-medium">AI Organize this day</b> in toolbar.
      </footer>
    </div>
  );
}
