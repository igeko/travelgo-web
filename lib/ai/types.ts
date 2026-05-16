/**
 * Types · Go AI Suggest
 *
 * Contratti condivisi tra:
 *  - lib/ai/tools.ts         (esecuzione mock lato server)
 *  - lib/ai/tool-definitions (schema OpenAI)
 *  - features/ai-suggest/*   (componenti React)
 *
 * Tutti i campi sono volutamente minimi: copiamo solo ciò che il
 * design rende oggi. Niente `any`, niente shape lato DB qui dentro.
 */

/** Categoria semplificata di un place suggerito da Go. */
export type PlaceCategory =
  | "Caffè"
  | "Libreria"
  | "Caffè · Libreria"
  | "Ristorante"
  | "Bar"
  | "Museo"
  | "Parco"
  | "Negozio"
  | "Esperienza"
  | "Altro";

/** Riferimento ad un luogo concreto restituito da Go. */
export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  /** URL di anteprima oppure CSS gradient inline (per il mock). */
  photo_url: string;
  /** Galleria opzionale (1 hero + 3 thumbs nel design). */
  gallery?: string[];
  /** Distanza dal punto di partenza della ricerca, in metri. */
  distance_m: number;
  /** Valutazione 0–5 (opzionale, da Places API). */
  rating?: number;
  /** Livello di prezzo 0–4 (opzionale). */
  price_level?: 0 | 1 | 2 | 3 | 4;
  /** Indirizzo o quartiere riconoscibile (per fact-strip). */
  address?: string;
};

/** Singola attività già pianificata in un giorno. */
export type Activity = {
  id: string;
  title: string;
  /** "HH:MM" 24h. Vuoto = "tutto il giorno". */
  start_time: string;
  /** Luogo opzionale (alcune attività possono essere senza place). */
  place?: Place;
};

/** Contesto del giorno corrente (per il tool get_day_context). */
export type DayContext = {
  day_num: number;
  /** "Lun", "Mar"… italiano breve. */
  dow: string;
  /** ISO date "YYYY-MM-DD". */
  date: string;
  /** Zona/area macroscopica (es. "Tokyo · Monte Fuji"). */
  zone: string;
  weather: {
    /** Es. "sereno", "pioggia debole". */
    summary: string;
    temp_min_c: number;
    temp_max_c: number;
  };
  activities: Activity[];
  /** Pernottamento di quella notte (opzionale). */
  stay?: string;
  /** Incipit del giorno scritto dall'utente. */
  incipit_lead: string;
  incipit_note?: string;
};

/** Contesto del trip (per il tool get_trip_context). */
export type TripContext = {
  name: string;
  total_days: number;
  days_planned: number;
  /** Mood/temi ricorrenti del viaggio. */
  mood_history: string[];
  /** Budget medio in valuta locale o "basso" | "medio" | "alto". */
  budget_avg: string;
};

/** Una proposta di Go: place arricchito con why + bullet + fatti. */
export type ActivitySuggestion = {
  place: Place;
  /** Testo serif italico — perché Go propone questo luogo. */
  why_text: string;
  /** "Cosa aspettarsi" — opzionale, lista breve. */
  bullets: string[];
  /** Fact-strip in fondo al detail. */
  facts: {
    clock: string;
    coin: string;
    walk: string;
    map_pin: string;
  };
};

/** Ruolo nel transcript della conversazione lato UI. */
export type MessageRole = "user" | "go";

/** Tipo di messaggio: testo, chip rapidi, ancora per i risultati o bucket di risultati inline. */
export type MessageKind = "text" | "quick-replies" | "result-anchor" | "results";

/** Messaggio nel transcript della UI (non lo schema OpenAI). */
export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  kind?: MessageKind;
  /** Se kind === 'quick-replies': lista chip cliccabili. */
  quickReplies?: string[];
  /** Se kind === 'results': bucket di suggerimenti renderizzato inline. */
  results?: ActivitySuggestion[];
};

/** Risposta del backend al client. */
export type AssistantTurn = {
  messages: Message[];
  /**
   * DEPRECATED — i risultati ora vivono embedded nei `messages` come Message
   * di kind `results`. Mantenuto per retro-compatibilità: se popolato, il
   * client può ricostruire un bucket message in coda.
   */
  results?: ActivitySuggestion[];
  /** Quick reply suggerite (opz). */
  quickReplies?: string[];
};

/** Id stabile usato per il bucket di risultati inline (così "rigenero" senza duplicare). */
export const RESULTS_BUCKET_ID = "results-bucket";

/** Argomenti per search_places. */
export type SearchPlacesArgs = {
  query: string;
  near?: { lat: number; lng: number } | string;
  radius_km?: number;
  category?: PlaceCategory | string;
};

/** Argomenti per suggest_activities. */
export type SuggestActivitiesArgs = {
  seeds: Place[];
  /** Es. "tranquillo", "veloce", "energico". */
  style?: string;
  /** Contesto del giorno passato come testo libero (Go lo legge dai tool). */
  context?: string;
};

/** Argomenti generici per i tool di scrittura (stub). */
export type AddActivityArgs = { day_num: number; place_id: string };
export type AddWishlistArgs = { place_id: string };
export type SetStayArgs = { day_num: number; stay: string };
export type ShowOnMapArgs = { place_id: string };
export type AskPreferencesArgs = { question: string; options?: string[] };

/** Risultato comune dei tool di scrittura. */
export type ToolWriteResult = { ok: true; note?: string };
