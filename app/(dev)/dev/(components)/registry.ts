/**
 * Sandbox component registry.
 * Add an entry here every time you create a new variants page.
 * The order is the one shown in the sidebar.
 */
export type SandboxEntry = {
  slug: string;
  title: string;
  group: "Atoms" | "Features" | "Admin";
  /** Optional subgroup label within a group (e.g. "Activity" inside Features) */
  subgroup?: string;
  description?: string;
};

export const sandboxRegistry: SandboxEntry[] = [
  // ── Atoms ────────────────────────────────────────────────────────
  {
    slug: "icons",
    title: "Icons",
    group: "Atoms",
    description: "Gallery completa del set Tabler ri-esportato dal barrel @/components/ui/icons · ricerca + click-to-copy",
  },
  {
    slug: "button",
    title: "Button",
    group: "Atoms",
    description: "Button system · 3 sizes, 5 variants, 4 tones, icon-only/label",
  },
  {
    slug: "quote",
    title: "Quote",
    group: "Atoms",
    description: "Blockquote with orange left border · lead (serif italic) + optional note",
  },
  {
    slug: "tabs",
    title: "TabSwitcher",
    group: "Atoms",
    description: "Generic tab/view switcher · pill-shaped toggle with active state styling",
  },
  {
    slug: "filter-pill",
    title: "FilterPill",
    group: "Atoms",
    description: "Filter / toggle pill · 3 sizes, 4 tones, active/inactive states — usato nelle admin pages",
  },
  // Fields subgroup
  {
    slug: "address-field",
    title: "AddressField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Google Places autocomplete · returns structured PlaceResult",
  },
  {
    slug: "destination-field",
    title: "DestinationField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Destination autocomplete · single or multiple selection with chip UI",
  },
  {
    slug: "date-picker",
    title: "DatePickerField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Date picker · SoftField pill trigger + calendar dropdown via react-day-picker",
  },
  {
    slug: "budget-input",
    title: "BudgetInput",
    group: "Atoms",
    subgroup: "Fields",
    description: "Pill input · amount + currency cycle + optional conversion",
  },
  {
    slug: "cycle-pill",
    title: "CyclePill",
    group: "Atoms",
    subgroup: "Fields",
    description: "Ink pill with colored dot · cycles through options on click",
  },
  {
    slug: "period-bar",
    title: "PeriodBar",
    group: "Atoms",
    subgroup: "Fields",
    description: "Day-period segmented control · morning/afternoon/evening/night",
  },
  {
    slug: "time-field",
    title: "TimeField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Time picker compatto HH:MM · pill trigger + popover griglia ore/minuti (stesso stile del picker di PeriodBar)",
  },
  {
    slug: "soft-field",
    title: "SoftField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Pill text input / textarea · floating label, prefix, suffix, counter",
  },
  {
    slug: "image-picker",
    title: "ImagePicker",
    group: "Atoms",
    subgroup: "Fields",
    description: "Thumbnail + dark popover · Upload tab with 7 states (idle → drag-over → uploading → complete → error)",
  },
  // Map subgroup
  {
    slug: "map",
    title: "Map",
    group: "Atoms",
    subgroup: "Map",
    description: "Google Maps JS SDK wrapper · center + zoom, smooth pan, loading state",
  },
  {
    slug: "route-map",
    title: "ActivityRouteMap",
    group: "Atoms",
    subgroup: "Map",
    description: "Day's itinerary map · stop markers + per-leg routed polyline · built on Map's routes API",
  },
  // ── Features ─────────────────────────────────────────────────────
  // Explore subgroup
  {
    slug: "explore-toolbar",
    title: "ExploreToolbar",
    group: "Features",
    subgroup: "Explore",
    description: "Rail verticale macro-categorie + chip row sotto-categorie · selezione singola toggle-off, pin nel rail, settings placeholder · eventi via callback",
  },
  {
    slug: "explore-switch",
    title: "SegmentToggle",
    group: "Features",
    subgroup: "Explore",
    description: "Figma Switch (SwitcherV2) · toggle segmentato icona+label, segmento attivo bianco su track bg · usato in Activity Sleep/Stop",
  },
  {
    slug: "explore-activity",
    title: "ActivityStop",
    group: "Features",
    subgroup: "Explore",
    description: "Figma Activity · sosta alloggio, 4 stati + card editor (Sleep/Stop, nights, address, arrivo/partenza)",
  },
  {
    slug: "explore-fuzzy",
    title: "FuzzyStop",
    group: "Features",
    subgroup: "Explore",
    description: "Figma Fuzzy · sosta a orario fuzzy, 4 stati + card editor (Stopping for N minutes, address)",
  },
  {
    slug: "explore-transfer",
    title: "Transfer",
    group: "Features",
    subgroup: "Explore",
    description: "Figma Transfer · connettore tra soste, modi transit/car, stati default/hover/open",
  },
  {
    slug: "explore-timeline",
    title: "Timeline",
    group: "Features",
    subgroup: "Explore",
    description: "Figma Timeline · organismo Explore da dati reali del viaggio · orari allineati alle attività · control trip id (default Japan 2026)",
  },
  {
    slug: "place-hover",
    title: "PlaceHoverCard",
    group: "Features",
    subgroup: "Explore",
    description: "Popover 270px ancorato sopra un pin Explore · variante desktop di /design/place-hover · modalità Google (fetch lazy) o saved (dati del viaggio)",
  },
  // App subgroup
  {
    slug: "app-header",
    title: "AppHeader",
    group: "Features",
    subgroup: "App",
    description: "Two-row sticky header · brand + nav + trip context + tabs + edit mode chip",
  },
  {
    slug: "yumeji-drawer",
    title: "YumejiDrawer (v1)",
    group: "Features",
    subgroup: "App",
    description: "Pannello «I tuoi Yume» v1 · toggle in Row 2 + pannello che slitta da destra · stati closed/floating/pinned, dati mock",
  },
  {
    slug: "yumeji-panel",
    title: "YumejiPanel (v2)",
    group: "Features",
    subgroup: "App",
    description: "Pannello «I tuoi Yume» v2 · contenitore stile lista-giorni · standalone / floating / pinned (colonna day-by-day, affianco mappa Explore)",
  },
  {
    slug: "yume-list",
    title: "YumeList",
    group: "Features",
    subgroup: "App",
    description: "Corpo del pannello Yume · ricerca + filtri abilitabili, lista propri/condivisi con owner avatar, placeholder immagini come ActivityList",
  },
  // Activity subgroup
  {
    slug: "activity-row",
    title: "ActivityRow",
    group: "Features",
    subgroup: "Activity",
    description: "Timeline activity row · all state variants",
  },
  {
    slug: "activity-edit-form",
    title: "ActivityEditForm",
    group: "Features",
    subgroup: "Activity",
    description: "Activity edit form · title, status, period + time picker, address, budget",
  },
  {
    slug: "activity-list",
    title: "ActivityList",
    group: "Features",
    subgroup: "Activity",
    description: "Slotted activity list · morning/afternoon/evening/night grouping, edit mode",
  },
  {
    slug: "itinerary",
    title: "Itinerary",
    group: "Features",
    subgroup: "Activity",
    description: "Day itinerary · map + sorted activity list, show/hide map, edit mode",
  },
  {
    slug: "activity-timeline",
    title: "Timeline",
    group: "Features",
    subgroup: "Activity",
    description: "Day editor spine view · blocchi tipizzati, bridge, add affordance, AI organize, fuzzy variant",
  },
  {
    slug: "activity-search",
    title: "ActivitySearchField",
    group: "Features",
    subgroup: "Activity",
    description: "Combobox ricerca attività del viaggio · gruppi Da programmare / Già pianificate, inline + floating, keyboard nav",
  },
  {
    slug: "transit-verifier",
    title: "TransitVerifier",
    group: "Features",
    subgroup: "Activity",
    description: "Verifica tratta con Go · alternative di trasporto pubblico reali via Routes API → BridgeData, mappa opzionale",
  },
  // Day subgroup
  {
    slug: "day-incipit",
    title: "DayIncipit",
    group: "Features",
    subgroup: "Day",
    description: "Voce di Go + riassunto del giorno · GoAvatar a sinistra, corpo Quote e CTA 'Chiedi a me.' con parole rotanti · unifica Quote + GoLaunchTrigger",
  },
  {
    slug: "day-edit-form",
    title: "DayEditForm",
    group: "Features",
    subgroup: "Day",
    description: "Form unica di modifica giorno · anagrafica (titolo, città, tipo, riassunto, note, immagine, mappa) + alloggio (tipo, nome, indirizzo, link, costo, note)",
  },
  // Trips subgroup
  {
    slug: "create-trip",
    title: "CreateTripForm",
    group: "Features",
    subgroup: "Trips",
    description: "Form creazione viaggio · destinazione, date range, travelers, theme · standalone (no modal wrapper)",
  },
  {
    slug: "day-list",
    title: "DayList",
    group: "Features",
    subgroup: "Trips",
    description: "Trip days aside · clickable selection",
  },
  {
    slug: "day-agenda",
    title: "DayAgenda",
    group: "Features",
    subgroup: "Trips",
    description: "Sulla falsa riga di DayList · a sinistra il giorno (data), a destra la pila ordinata delle attività della giornata (solo titolo) · selezione per singola attività",
  },
  {
    slug: "day-rail",
    title: "DayRail",
    group: "Features",
    subgroup: "Trips",
    description: "Shared day sidebar (trip day page + /trips/new) · header full/label · collapsible",
  },
  {
    slug: "hero-banner",
    title: "HeroBanner",
    group: "Features",
    subgroup: "Trips",
    description: "Full-bleed hero image with text overlay + optional sub-banner",
  },
  {
    slug: "boarding-pass",
    title: "BoardingPass",
    group: "Features",
    subgroup: "Trips",
    description: "Trip hero shaped like a boarding pass · trip-schema facts + AI-provided airports/times/countdown",
  },
  {
    slug: "trip-info",
    title: "TripInfo",
    group: "Features",
    subgroup: "Trips",
    description: "«Il biglietto» del viaggio · 4 campi inline-editabili (SoftField inline), stamp di Go, stati empty/edit/collapsed",
  },
  {
    slug: "place-info",
    title: "PlaceInfoPanel",
    group: "Features",
    subgroup: "Trips",
    description: "«Know before you go» country card · 6 tabs (currency/visa/weather/power/language/safety), data-driven",
  },
  {
    slug: "place-card",
    title: "PlaceCard",
    group: "Features",
    subgroup: "Trips",
    description: "Compact destination card · landmark glyph + city + country + facts/caption · left of the boarding pass",
  },
  {
    slug: "day-info-edit-form",
    title: "DayInfoEditForm",
    group: "Features",
    subgroup: "Day",
    description: "Editor anagrafica del giorno (zona, luogo, riassunto, nota, tipo, immagine) · estratto da HeroBanner, footer opzionale + ref.getData()",
  },
  {
    slug: "lodging-edit-form",
    title: "LodgingEditForm",
    group: "Features",
    subgroup: "Day",
    description: "Editor alloggio / sub-banner (tipo, nome, indirizzo, link, costo) · estratto da HeroBanner, footer opzionale + ref.getData()",
  },
  {
    slug: "day-activities-edit-form",
    title: "DayActivitiesEditForm",
    group: "Features",
    subgroup: "Day",
    description: "Sezione lista attività · righe dense ora+titolo, inserimento inline, titolo via ActivitySearchField (autocomplete + crea nuova), ora via TimeField",
  },
  // AI subgroup
  {
    slug: "ai-suggest",
    title: "GoAvatar",
    group: "Features",
    subgroup: "AI",
    description: "Avatar Go · cerchio ink con kanji 五, halo arancione pulsante · xs/sm/md",
  },
  {
    slug: "go-panel",
    title: "GoPanel",
    group: "Features",
    subgroup: "AI",
    description: "Orchestratore widget Go · trigger → API → widget. Controls + Debug panel.",
  },
  {
    slug: "go-chat",
    title: "GoChat",
    group: "Features",
    subgroup: "AI",
    description: "Trigger conversazionale Go · banner naked con sweep, rotating words, bottone Ask me.",
  },
  {
    slug: "go-chat-float",
    title: "GoChatFloat",
    group: "Features",
    subgroup: "AI",
    description: "Chat Go floating · panel fixed bottom-right, suggestions inline, card espansa con foto lazy.",
  },
  // ── Admin ─────────────────────────────────────────────────────────
  {
    slug: "tester-notes",
    title: "Tester Notes",
    group: "Admin",
    description: "Feedback e segnalazioni bug dai tester · lista filtrata per tipo",
  },
  {
    slug: "docs",
    title: "Design docs",
    group: "Admin",
    description: "Viewer MD per i doc di design in docs/design/ · index + rendering via marked",
  },
];
