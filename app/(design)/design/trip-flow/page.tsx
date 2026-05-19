/**
 * Trip flow map · design sketch
 *
 * Mappa end-to-end del percorso utente: /trips → create → Discovery →
 * Builder → Day page → Activity Detail. Indica status di ogni step
 * (designed / partial / missing) e raccoglie i gap UX da chiudere.
 *
 * Spec viva e checklist gap: docs/design/trip-flow.md
 */

import "./trip-flow.css";

type Status = "ok" | "partial" | "missing";

const STATUS_LABEL: Record<Status, string> = {
  ok: "✓ designed",
  partial: "~ partial",
  missing: "⚠ missing",
};

type Node = {
  name: string;
  url: string;
  status: Status;
  body: string;
  tag?: string;
  variant?: "default" | "discovery" | "builder" | "day" | "missing" | "start";
};

type Step = { node: Node; transition?: string };

const FLOW: Step[] = [
  {
    node: {
      name: "START · user è loggato",
      url: "",
      status: "ok",
      body: "",
      variant: "start",
    },
  },
  {
    node: {
      name: "Trips list",
      url: "/trips",
      status: "ok",
      body: "Lista viaggi dell'utente come grid di card. CTA primaria \"Nuovo viaggio\" in alto a destra.",
    },
    transition: 'click "Nuovo viaggio"',
  },
  {
    node: {
      name: "Create trip · modal",
      url: "overlay",
      status: "ok",
      body: "Modale \"Alright, let's go!\" — destinazione obbligatoria + opzionali Dates / Travelers / Theme. CTA \"Create trip\" (arancio).",
      tag: "Pattern già disegnato (screenshot)",
    },
    transition: "Create trip",
  },
  {
    node: {
      name: "Discovery zone",
      url: "/trips/[id]/discover",
      status: "ok",
      body: 'Decisione recente: dopo il create si atterra QUI, non sulla trip overview. Landing editoriale Wanderlust-inspired composta da DiscoveryWidget. Top nav: Discover · Wishlist · Days · Map. CTA "Build trip →" in alto a dx quando hai abbastanza nella wishlist.',
      tag: "Hero · Regions · GoBanner · Editors · Packs · Trending · GoHint",
      variant: "discovery",
    },
    transition: 'click "Build trip" (dopo save in wishlist)',
  },
  {
    node: {
      name: "Builder · trip workspace",
      url: "/trips/[id]/build",
      status: "ok",
      body: 'Two-pane: Wishlist sx · Day cards dx. Al primo open: hero AI "Organizza il mio viaggio" → loading → workshop con banner. Ai ritorni: workshop normale. Drag wishlist ↔ giorni, AI per-day "Rigenera".',
      tag: "4 stati documentati · decisioni 12-14, 27",
      variant: "builder",
    },
    transition: 'click "Open" su un giorno',
  },
  {
    node: {
      name: "Day page (con Day Editor embedded)",
      url: "/trips/[id]/days/[n]",
      status: "partial",
      body: "Banner foto + lodging + deck + GoIntro (esistente). Sotto: Day Editor embedded — Toolbar Lista|Timeline|Racconto, Show map, AI Organize this day, + Add. Spine con block-row, ponti editabili inline, autocomplete 2-affordance.",
      tag: "Day Editor in sketch · pagina ospite legacy",
      variant: "day",
    },
    transition: "click sul nome di un blocco",
  },
  {
    node: {
      name: "Activity Detail · entità",
      url: "/trips/[id]/activities/[id] · TBD",
      status: "missing",
      body: "IDENTITY-level: nome, foto, indirizzo, descrizione lunga, hours, fonte. \"Used in\" lista di giorni/trip dove l'entità è programmata.",
      tag: "Decisione 22 · sketch non ancora creato",
      variant: "missing",
    },
  },
];

const SIDE_ROADS = [
  {
    name: "Wishlist standalone",
    url: "/trips/[id]/wishlist",
    body: "Oggi vive come sidebar nel Builder + voice nel top nav di Discovery.",
    tag: "Decisione · serve pagina dedicata?",
    severity: "dec" as const,
  },
  {
    name: "Map view",
    url: "/trips/[id]/map",
    body: "Top nav di Discovery la cita, mai disegnata.",
    tag: "⚠ missing — design da fare",
    severity: "missing" as const,
  },
  {
    name: "Trip overview",
    url: "legacy public/design/trip.html",
    body: "Era la pagina dettagli trip (banner, dates, lodging, paesi info). Con Discovery come landing serve ancora?",
    tag: "⚠ decisione: kill o riusare?",
    severity: "missing" as const,
  },
  {
    name: "Day-by-Day overview",
    url: "public/design/daybyday_responsive.html",
    body: "Lista verticale dei giorni. Integrare con Builder o tenere come pagina a sé?",
    tag: "Decisione",
    severity: "dec" as const,
  },
];

const GAPS = [
  { tag: "Missing",   nm: "Activity Detail page",          ds: "Click sul nome non porta da nessuna parte. Decisione 22 lo prevede ma il sketch non esiste." },
  { tag: "Missing",   nm: "Map view",                       ds: "Top nav di Discovery la promette. Mai disegnata. Vista mappa POI con cluster + drawer dettagli." },
  { tag: "Decisione", nm: "Trip overview · kill o riusare?", ds: "La legacy `trip.html` è la pagina dettagli trip. Con Discovery come landing primaria, serve ancora?" },
  { tag: "Decisione", nm: "Wishlist standalone",            ds: "Oggi solo sidebar Builder + nav voice in Discovery. Pagina dedicata `/wishlist` aggiunge valore o complica?" },
  { tag: "Edge case", nm: "Discovery empty · wishlist vuota", ds: 'Cosa mostra il CTA "Build trip" quando non hai ancora salvato niente?' },
  { tag: "Edge case", nm: "Builder · wishlist vuota",       ds: "Hai cliccato Build prima di salvare. L'hero AI non ha cosa distribuire. Empty state che riporta a Discovery?" },
  { tag: 'Edge case', nm: 'AI fallisce a "Organizza trip"', ds: "Loading in errore. Retry? Fallback al workshop manuale?" },
  { tag: "Edge case", nm: "Backtrack · Builder → Discovery", ds: 'Sono nel Builder ma voglio scoprire altre cose da aggiungere. "Discover more" da qualche parte?' },
  { tag: "Missing",   nm: "Onboarding · primo trip",         ds: "Utente nuovo che crea il suo primo viaggio. Coach marks? Tour della Discovery?" },
  { tag: "Decisione", nm: "Trip-level controls",            ds: "Dove vivono: mezzo principale, budget, travelers, tema, date? Settings panel? Header dropdown?" },
  { tag: "Edge case", nm: "Notifiche in-trip",              ds: "Sciopero, chiusura imprevista, conferma prenotazione. Dove appaiono?" },
];

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function TripFlowSketch() {
  return (
    <div className="tf-wrap">
      <header className="tf-h">
        <div className="tf-eb">User journey · TravelGo</div>
        <h1>Da /trips a un giorno organizzato</h1>
        <p>
          Mappa del flusso end-to-end. Verde = designato e in sketch. Giallo = parziale o decisione pendente. Rosso = mancante. La sidebar a destra raccoglie i gap UX da chiudere prima di chiamare "completo" il flusso.
          <br />
          <span className="tf-meta">
            Tracker vivo:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/trip-flow">
              docs/design/trip-flow.md
            </a>
          </span>
        </p>
      </header>

      <div className="tf-layout">
        <div className="tf-flow">
          {FLOW.map((step, i) => (
            <div key={i} className="tf-step">
              {step.transition && (
                <div className="tf-arrow">
                  <div className="tf-line" />
                  <div className="tf-head">▼</div>
                  <div className="tf-label">{step.transition}</div>
                </div>
              )}
              <div className={`tf-node ${step.node.variant ?? ""}`}>
                {step.node.variant === "start" ? (
                  <span className="tf-start-label">{step.node.name}</span>
                ) : (
                  <>
                    <div className="tf-node-h">
                      <span className="tf-name">{step.node.name}</span>
                      {step.node.url && <span className="tf-url">{step.node.url}</span>}
                      <span className={`tf-status ${step.node.status}`}>{STATUS_LABEL[step.node.status]}</span>
                    </div>
                    {step.node.body && <div className="tf-node-body">{step.node.body}</div>}
                    {step.node.tag && (
                      <div className="tf-node-side">
                        <span>{step.node.tag}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="tf-branches-section">
            <div className="tf-branches-title">Side roads · accessibili da più punti</div>
            <div className="tf-branches">
              {SIDE_ROADS.map((b, i) => (
                <div key={i} className={`tf-branch ${b.severity}`}>
                  <b>{b.name}</b>
                  <div>URL: {b.url} · {b.body}</div>
                  <div className="tf-branch-tag">{b.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="tf-gaps">
          <h3>Gap UX da chiudere</h3>
          <p className="tf-gaps-lead">Cose che bloccano un giro end-to-end vero, in ordine di priorità.</p>
          {GAPS.map((g, i) => (
            <div key={i} className="tf-gap">
              <span className={`tf-gap-tag ${g.tag.toLowerCase().replace(/\s/g, "")}`}>{g.tag}</span>
              <span className="tf-gap-nm">{g.nm}</span>
              <div className="tf-gap-ds">{g.ds}</div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
