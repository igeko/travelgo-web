/**
 * Tool implementations · Go AI Suggest
 *
 * Tutte le funzioni qui dentro sono MOCK hard-coded: lo scenario che
 * vediamo è quello del prototipo `public/design/ai_suggest.html`
 * (Giorno 4 a Tokyo, pausa tranquilla tra Tsukiji e Hama-Rikyū).
 *
 * Quando collegheremo i veri data source:
 *  - get_day_context / get_trip_context → DAL (lib/dal/*)
 *  - search_places → Google Places API (proxy via /api/places/*)
 *  - suggest_activities → restera la nostra logica di arricchimento
 *  - add_activity_to_day / add_to_wishlist / set_stay → DAL writes
 *
 * Niente effetti collaterali reali: i tool di scrittura fanno
 * `console.log` e ritornano `{ ok: true }`.
 */

import type {
  ActivitySuggestion,
  AddActivityArgs,
  AddWishlistArgs,
  AskPreferencesArgs,
  DayContext,
  Place,
  SearchPlacesArgs,
  SetStayArgs,
  ShowOnMapArgs,
  SuggestActivitiesArgs,
  ToolWriteResult,
  TripContext,
} from "./types";

/* ─────────────────────────────────────────────────────────────────
   Mock dataset
───────────────────────────────────────────────────────────────── */

const MOCK_DAY: DayContext = {
  day_num: 4,
  dow: "Lun",
  date: "2026-04-13",
  zone: "Tokyo · Monte Fuji",
  weather: { summary: "sereno", temp_min_c: 22, temp_max_c: 28 },
  activities: [
    {
      id: "act-1",
      title: "Kabukiza Theatre",
      start_time: "09:00",
      place: {
        id: "pl-kabukiza",
        name: "Kabukiza Theatre",
        category: "Esperienza",
        lat: 35.6695,
        lng: 139.7657,
        photo_url: "linear-gradient(135deg,#a8b8a0,#5e7558)",
        distance_m: 0,
      },
    },
    {
      id: "act-2",
      title: "Ginza walk",
      start_time: "10:30",
      place: {
        id: "pl-ginza",
        name: "Ginza",
        category: "Negozio",
        lat: 35.6717,
        lng: 139.7649,
        photo_url: "linear-gradient(135deg,#c5b5a0,#7a6548)",
        distance_m: 0,
      },
    },
    {
      id: "act-3",
      title: "Tsukiji Outer Market",
      start_time: "12:30",
      place: {
        id: "pl-tsukiji",
        name: "Tsukiji Outer Market",
        category: "Ristorante",
        lat: 35.6655,
        lng: 139.7706,
        photo_url: "linear-gradient(135deg,#d5c5a8,#a08a65)",
        distance_m: 0,
      },
    },
    {
      id: "act-4",
      title: "Hama-Rikyū Gardens",
      start_time: "15:00",
      place: {
        id: "pl-hamarikyu",
        name: "Hama-Rikyū Gardens",
        category: "Parco",
        lat: 35.6597,
        lng: 139.7634,
        photo_url: "linear-gradient(135deg,#a8b8a0,#5e7558)",
        distance_m: 0,
      },
    },
    {
      id: "act-5",
      title: "Cena a Roppongi",
      start_time: "19:30",
      place: {
        id: "pl-roppongi",
        name: "Roppongi",
        category: "Ristorante",
        lat: 35.6627,
        lng: 139.7314,
        photo_url: "linear-gradient(135deg,#b5c5d5,#7a8c9d);",
        distance_m: 0,
      },
    },
  ],
  stay: "Hoshinoya Tōkyō",
  incipit_lead: "Una giornata di Tokyo a piedi, tanto camminare.",
  incipit_note:
    "Voglio stare lento, mangiare al mercato e finire nei giardini prima del tramonto.",
};

const MOCK_TRIP: TripContext = {
  name: "Japan 2026",
  total_days: 21,
  days_planned: 18,
  mood_history: ["Cultura", "Food", "Natura"],
  budget_avg: "medio",
};

const MOCK_PLACES: Place[] = [
  {
    id: "pl-bunkitsu",
    name: "BUNKITSU Books & Coffee",
    category: "Caffè · Libreria",
    lat: 35.6692,
    lng: 139.7672,
    photo_url: "linear-gradient(135deg,#a8b8a0,#5e7558)",
    gallery: [
      "linear-gradient(135deg,#c5d5b5,#8a9d75)",
      "linear-gradient(135deg,#b5c5d5,#7a8c9d)",
      "linear-gradient(135deg,#d5c5a8,#a08a65)",
    ],
    distance_m: 480,
    rating: 4.6,
    price_level: 2,
    address: "Higashi-Ginza",
  },
  {
    id: "pl-tullys",
    name: "Tully's Tsukiji-Higashi",
    category: "Caffè",
    lat: 35.6669,
    lng: 139.7689,
    photo_url: "linear-gradient(135deg,#c5b5a0,#9a8c75)",
    gallery: [
      "linear-gradient(135deg,#a8b8a0,#7d9176)",
      "linear-gradient(135deg,#b5c5d5,#7a8c9d)",
      "linear-gradient(135deg,#d5c5a8,#a08a65)",
    ],
    distance_m: 320,
    rating: 4.0,
    price_level: 1,
    address: "Tsukiji-Higashi",
  },
  {
    id: "pl-hibiya",
    name: "HIBIYA Central Market",
    category: "Libreria",
    lat: 35.6736,
    lng: 139.7595,
    photo_url: "linear-gradient(135deg,#b5c5d5,#7a8c9d)",
    gallery: [
      "linear-gradient(135deg,#a8b8a0,#7d9176)",
      "linear-gradient(135deg,#c5b5a0,#9a8c75)",
      "linear-gradient(135deg,#d5c5a8,#a08a65)",
    ],
    distance_m: 610,
    rating: 4.3,
    price_level: 0,
    address: "Hibiya Chanter, 1F",
  },
];

const MOCK_WHY: Record<string, ActivitySuggestion> = {
  "pl-bunkitsu": {
    place: MOCK_PLACES[0],
    why_text:
      "Una libreria-caffè dove paghi un fee d'ingresso e leggi quanto vuoi. Pochi posti, silenzio totale — perfetta per due ore di pausa tra il pranzo a Tsukiji e i giardini del pomeriggio.",
    bullets: [
      "Fee ingresso ¥1500 (illimitato)",
      "Caffè e dolci serviti al tavolo",
      "Libri da sfogliare in giapponese e inglese",
    ],
    facts: {
      clock: "11:00–20:00",
      coin: "¥1500",
      walk: "Bassa fatica",
      map_pin: "Higashi-Ginza",
    },
  },
  "pl-tullys": {
    place: MOCK_PLACES[1],
    why_text:
      "Un caffè di catena ma con un'enclave di tavolini al primo piano sempre vuota a quell'ora. Buona soluzione per una pausa veloce a costo basso, e a soli 5 minuti da Tsukiji.",
    bullets: [],
    facts: {
      clock: "07:00–22:00",
      coin: "¥500",
      walk: "Bassa fatica",
      map_pin: "Tsukiji",
    },
  },
  "pl-hibiya": {
    place: MOCK_PLACES[2],
    why_text:
      "Una galleria di librerie e piccole botteghe artigianali al primo piano dell'Hibiya Chanter. Si entra liberamente, si sfoglia, si esce — perfetto per una passeggiata lenta senza obblighi.",
    bullets: [],
    facts: {
      clock: "11:00–21:00",
      coin: "Gratis",
      walk: "Bassa fatica",
      map_pin: "Hibiya",
    },
  },
};

/* ─────────────────────────────────────────────────────────────────
   Tool implementations
───────────────────────────────────────────────────────────────── */

/** Restituisce il contesto del giorno corrente (mock: Giorno 4). */
export async function get_day_context(): Promise<DayContext> {
  return MOCK_DAY;
}

/** Restituisce il contesto del viaggio (mock: Japan 2026). */
export async function get_trip_context(): Promise<TripContext> {
  return MOCK_TRIP;
}

/**
 * Cerca luoghi vicino a un punto/area, opzionalmente filtrati per categoria.
 * Mock: ritorna sempre i 3 candidati del prototipo, eventualmente
 * filtrati case-insensitive su `category` o `query`.
 */
export async function search_places(args: SearchPlacesArgs): Promise<Place[]> {
  const q = (args.query ?? "").toLowerCase();
  const cat = (args.category ?? "").toLowerCase();
  const all = [...MOCK_PLACES];
  if (!q && !cat) return all;
  const filtered = all.filter((p) => {
    const hay = `${p.name} ${p.category} ${p.address ?? ""}`.toLowerCase();
    return (q && hay.includes(q)) || (cat && hay.includes(cat));
  });
  return filtered.length > 0 ? filtered : all;
}

/**
 * Arricchisce un set di place con `why_text`, `bullets`, `facts`.
 * Mock: pesca dal dizionario MOCK_WHY, oppure costruisce un fallback
 * neutro se il place non è conosciuto.
 */
export async function suggest_activities(
  args: SuggestActivitiesArgs,
): Promise<ActivitySuggestion[]> {
  return args.seeds.map<ActivitySuggestion>((p) => {
    const hit = MOCK_WHY[p.id];
    if (hit) return hit;
    return {
      place: p,
      why_text: `Sembra una buona fermata: ${p.name} è vicino e coerente con il tuo ritmo.`,
      bullets: [],
      facts: {
        clock: "—",
        coin: "—",
        walk: "Bassa fatica",
        map_pin: p.address ?? "—",
      },
    };
  });
}

/** Stub: aggiunge un place come nuova attività di un giorno. */
export async function add_activity_to_day(
  args: AddActivityArgs,
): Promise<ToolWriteResult> {
  // eslint-disable-next-line no-console
  console.log("[Go tool] add_activity_to_day", args);
  return { ok: true, note: `Aggiunto al giorno ${args.day_num}` };
}

/** Stub: salva un place nella wishlist dell'utente. */
export async function add_to_wishlist(
  args: AddWishlistArgs,
): Promise<ToolWriteResult> {
  // eslint-disable-next-line no-console
  console.log("[Go tool] add_to_wishlist", args);
  return { ok: true, note: "Salvato in wishlist" };
}

/** Stub: imposta il pernottamento di un giorno. */
export async function set_stay(args: SetStayArgs): Promise<ToolWriteResult> {
  // eslint-disable-next-line no-console
  console.log("[Go tool] set_stay", args);
  return { ok: true, note: `Stay impostato per giorno ${args.day_num}` };
}

/** Stub: chiede al map module di centrare un place. */
export async function show_on_map(args: ShowOnMapArgs): Promise<ToolWriteResult> {
  // eslint-disable-next-line no-console
  console.log("[Go tool] show_on_map", args);
  return { ok: true };
}

/**
 * No-op lato server: la UI lato client intercetta `ask_user_preferences`
 * per mostrare quick-replies. Qui ritorniamo l'eco degli argomenti, così
 * il modello "vede" che la domanda è stata posta.
 */
export async function ask_user_preferences(
  args: AskPreferencesArgs,
): Promise<{ asked: string; options?: string[] }> {
  return { asked: args.question, options: args.options };
}

/* ─────────────────────────────────────────────────────────────────
   Dispatcher · usato dal route handler per eseguire un tool_call
───────────────────────────────────────────────────────────────── */

export type ToolName =
  | "get_day_context"
  | "get_trip_context"
  | "search_places"
  | "suggest_activities"
  | "add_activity_to_day"
  | "add_to_wishlist"
  | "set_stay"
  | "show_on_map"
  | "ask_user_preferences";

/** Esegue un tool dato il nome e gli args JSON. Type-safe sul nome. */
export async function runTool(
  name: ToolName,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case "get_day_context":
      return get_day_context();
    case "get_trip_context":
      return get_trip_context();
    case "search_places":
      return search_places(args as SearchPlacesArgs);
    case "suggest_activities":
      return suggest_activities(args as SuggestActivitiesArgs);
    case "add_activity_to_day":
      return add_activity_to_day(args as AddActivityArgs);
    case "add_to_wishlist":
      return add_to_wishlist(args as AddWishlistArgs);
    case "set_stay":
      return set_stay(args as SetStayArgs);
    case "show_on_map":
      return show_on_map(args as ShowOnMapArgs);
    case "ask_user_preferences":
      return ask_user_preferences(args as AskPreferencesArgs);
  }
}

/** Esporta i mock per uso lato client (preview demo). */
export const MOCK = {
  day: MOCK_DAY,
  trip: MOCK_TRIP,
  places: MOCK_PLACES,
  suggestions: Object.values(MOCK_WHY),
};
