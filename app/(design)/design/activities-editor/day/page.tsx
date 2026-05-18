/**
 * Day Editor · design sketch
 *
 * Edit mode inline (decisioni 15-19 in docs/design/activities-editor.md):
 *   - Stessa view del consumption, toggle "Edit day" → "Editing" in cima
 *   - Affordance pencil/trash/drag handle per blocco
 *   - `+ aggiungi blocco` hover-reveal sulla spina (CSS :hover, niente JS)
 *   - Composer inline con type-chip · niente zona = blocco fuzzy
 *   - Bridge editor inline · selettore mezzo + tempo libero
 *   - Auto-save · sticky footer Done/Cancel
 *   - Escape "Apri nel builder" verso /design/activities-editor/builder
 *
 * Tutto inline in questo file. Modificare liberamente.
 */

import "./day-editor.css";

const DAY_BLOCKS = [
  { id: "exit",     time: "07:40", icon: "ti-key",                       name: "Uscita albergo",       type: "action", fuzzy: false },
  { id: "sensoji",  time: "08:00", icon: "ti-map-pin",                   name: "Sensō-ji",             type: "place",  fuzzy: false },
  { id: "sumida",   time: "10:30", icon: "ti-map-pin",                   name: "Parco Sumida",         type: "place",  fuzzy: false },
  { id: "skytree",  time: "20:00", icon: "ti-building-broadcast-tower",  name: "Tokyo Sky Tower Tree", type: "place",  fuzzy: false },
];

const BRIDGE_BEFORE_SENSOJI = { mezzo: "walk",  label: "8 min a piedi · 0,6 km" };
const BRIDGE_BEFORE_SUMIDA  = { mezzo: "metro", label: "Metro · ~5 min · Linea Ginza", lineDetails: "uscita A2, vicino al konbini" };

/* ─────────────────────────────────────────────────────────────────
   Sub-components inline (ephemeral)
───────────────────────────────────────────────────────────────── */

function BlockRow({
  icon,
  type,
  time,
  name,
  fuzzy = false,
}: {
  icon: string;
  type: "place" | "action" | "pause" | "meal";
  time: string;
  name: string;
  fuzzy?: boolean;
}) {
  const iconBg =
    type === "place" ? "bg-[#f5e8df] text-orange-deep" :
    type === "pause" ? "bg-[#ddedde] text-[#557a45]" :
    type === "meal"  ? "bg-[#fcecd0] text-[#7a5e0e]" :
                       "bg-surface-soft text-ink-soft";

  return (
    <div className={`group/row bg-surface border ${fuzzy ? "border-dashed border-border-strong bg-[#faf6ef]" : "border-border"} rounded-[10px] px-3 py-2 flex items-center gap-2 relative`}>
      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <i className={`ti ${icon} text-[12px]`} />
      </span>
      <span className="text-[10.5px] text-ink-faint tabular-nums shrink-0">{time}</span>
      <span className={`text-[12.5px] flex-1 ${fuzzy ? "italic text-ink-soft" : "font-medium text-ink"}`}>{name}</span>
      <span className="inline-flex gap-0.5 shrink-0">
        <button className="w-[22px] h-[22px] rounded-md bg-transparent text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors inline-flex items-center justify-center">
          <i className="ti ti-pencil text-[12px]" />
        </button>
        <button className="w-[22px] h-[22px] rounded-md bg-transparent text-ink-faint hover:bg-[#fcebeb] hover:text-[#a32d2d] transition-colors inline-flex items-center justify-center">
          <i className="ti ti-trash text-[12px]" />
        </button>
      </span>
    </div>
  );
}

function AddZone() {
  return (
    <div className="add-zone group/add">
      <div className="add-dot">
        <i className="ti ti-plus text-[11px]" />
      </div>
      <div className="add-affordance">
        <div className="add-line" />
        <span className="add-label">aggiungi blocco</span>
      </div>
    </div>
  );
}

function BridgeClosed({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="bridge-closed">
      <i className={`ti ${icon}`} />
      <span>{label}</span>
      <span className="ml-auto text-[#c7c0b0]">
        <i className="ti ti-pencil text-[11.5px]" />
      </span>
    </div>
  );
}

function BridgeExpanded() {
  return (
    <div className="bridge-expanded">
      <div className="be-card">
        <div className="be-head">
          <i className="ti ti-pencil text-[11px]" />
          <span>Modifica spostamento</span>
          <span className="ml-auto text-ink-faint cursor-pointer">
            <i className="ti ti-x text-[13px]" />
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
          <div className="be-field">
            <span className="be-key">Tempo</span>
            ~ 5 min · 2 fermate
          </div>
          <div className="be-field">
            <span className="be-key">Linea</span>
            Ginza Line
          </div>
        </div>

        <div className="be-note">
          Nota: <b className="text-ink font-medium">uscita A2, vicino al konbini</b>
        </div>

        <div className="be-foot">
          <span className="be-free">
            <i className="ti ti-circle-minus text-[11.5px]" />
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
          <i className="ti ti-plus text-[11px]" />
          <span>Nuovo blocco</span>
          <span className="ml-auto text-ink-faint cursor-pointer">
            <i className="ti ti-x text-[13px]" />
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
          <div className="ae-field time">
            <span className="ae-key">Ora</span>
            <span className="ae-val">16:00</span>
          </div>
          <div className="ae-field flex-1">
            <span className="ae-key">Titolo</span>
            <span className="ae-val">giro intorno all'hotel</span>
          </div>
          <div className="ae-field zone">
            <span className="ae-key">Zona (opz.)</span>
            <span className="ae-val italic text-ink-faint">(decidi sul posto)</span>
          </div>
        </div>

        <div className="ae-foot">
          <span className="italic text-ink-faint">
            Niente zona = fuzzy <i className="ti ti-info-circle text-[10.5px] align-[-1px]" />
          </span>
          <button className="ae-ok">Aggiungi</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DayEditorSketch() {
  return (
    <div className="max-w-[760px] mx-auto px-6 py-8">
      <header className="mb-4">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">Sketch</div>
        <h1 className="text-[22px] font-medium leading-tight">Day Editor (inline edit mode)</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          Stessa view della consumption, toggle inline · `+ aggiungi blocco` hover-reveal sulla spina · composer fuzzy · ponte clickabile.
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/activities-editor">
              docs/design/activities-editor.md
            </a>{" "}
            · decisioni 15-19.
          </span>
        </p>
      </header>

      <div className="day-frame">
        {/* Day header con pill Edit attiva */}
        <div className="day-h">
          <div className="left">
            <div className="text-[10px] tracking-[0.08em] uppercase text-ink-faint">
              Day 02 · <b className="text-orange">TOKYO</b>
            </div>
            <h2 className="text-[17px] font-medium mt-0.5">Asakusa e Sumida-Gawa</h2>
          </div>
          <div className="flex gap-1.5 items-center">
            <button className="pill-ghost">
              <i className="ti ti-external-link text-[11.5px]" />
              Apri nel builder
            </button>
            <button className="pill-edit">
              <i className="ti ti-pencil text-[12px]" />
              Editing
            </button>
          </div>
        </div>

        {/* Edit mode banner */}
        <div className="em-banner">
          <i className="ti ti-pencil text-[12px] text-orange" />
          <span>
            <b className="font-medium">Edit mode</b> · passa fra due blocchi per aggiungere · clicca un blocco per modificare
          </span>
          <span className="ml-auto text-ink-faint text-[10.5px] italic inline-flex items-center gap-1">
            <i className="ti ti-check text-[11px] text-[#3d6e0e]" />
            auto-salvato
          </span>
        </div>

        {/* Body con spine */}
        <div className="px-4 py-3.5">
          <div className="spine">
            <AddZone />
            <BlockRow {...DAY_BLOCKS[0]} type="action" />
            <AddZone />
            <BridgeClosed icon={`ti-${BRIDGE_BEFORE_SENSOJI.mezzo}`} label={BRIDGE_BEFORE_SENSOJI.label} />
            <AddZone />
            <BlockRow {...DAY_BLOCKS[1]} type="place" />
            <AddZone />
            <BridgeExpanded />
            <BlockRow {...DAY_BLOCKS[2]} type="place" />
            <AddExpandedFuzzy />
            <AddZone />
            <BridgeClosed icon="ti-soup" label="Cena qui (food court, flessibile)" />
            <AddZone />
            <BlockRow {...DAY_BLOCKS[3]} type="place" />
            <AddZone />
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="foot-bar">
          <span className="text-ink-faint inline-flex items-center gap-1.5 text-[11px]">
            <i className="ti ti-check text-[12px] text-[#3d6e0e]" />
            3 modifiche · auto-salvate
          </span>
          <span className="flex gap-1.5">
            <button className="text-ink-soft text-[11px] px-2.5 py-1">Annulla</button>
            <button className="bg-ink text-white rounded-full px-3.5 py-1 text-[11px] font-medium">Done</button>
          </span>
        </div>
      </div>

      <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint">
        <b className="text-ink-soft font-medium">Iterazione libera</b> — hover su qualsiasi gap tra blocchi per vedere l'affordance `+`. Mock inline, niente API. Bridge espanso e composer fuzzy mostrati statici per la demo, in produzione si aprono al click.
      </footer>
    </div>
  );
}
