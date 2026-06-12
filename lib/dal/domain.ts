/**
 * lib/dal/domain.ts
 * ─────────────────────────────────────────────────────────────────
 * UI-facing domain types and query-select constants.
 *
 * These are the shapes the app's components consume (slimmer / richer
 * than the raw DB rows in `types.ts`). The Trips entity class returns
 * these from its composed reads (getTrip / getDays / getDayActivities /
 * getSnapshot).
 * ─────────────────────────────────────────────────────────────────
 */

export type Trip = {
  id: string;
  title: string;
  subtitle: string | null;
  /** Destination/place ("Norvegia"), distinct from the trip name (title). */
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  adults_count: number | null;
  children_count: number | null;
  theme_tags: string[] | null;
  theme_description: string | null;
};

export type Day = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  city: string | null;
  label: string | null;
  day_type: string | null;
  accommodation_name: string | null;
  accommodation_address: string | null;
  accommodation_url: string | null;
  accommodation_type: string | null;
  accommodation_place_id: string | null;
  accommodation_lat: number | null;
  accommodation_lng: number | null;
  use_previous_accommodation: boolean;
  show_map: boolean;
  notes: string | null;
  summary: string | null;
  image_url: string | null;
  narrative: unknown | null;
};

export type BlockType = "place" | "move" | "meal" | "pause" | "action";
export type BookingStatus = "todo" | "booked" | "paid";

export type BridgeData = {
  transport: "walk" | "metro" | "bus" | "taxi" | "bike" | "car" | "train";
  duration_min: number;
  /** Distanza in metri dal Routes API. Null/undefined quando ignota
   *  (entry persistite pre-distance, fallback senza geo, ecc.). */
  distance_m?: number | null;
  line?: string | null;
  stops?: string | null;
  note?: string | null;
  /** Scheduled-activity id della destinazione del leg al momento del save.
   *  Permette al render di scartare il bridge se il next nel chain non
   *  matcha più (es. inserita una fuzzy in mezzo, riordinato il giorno):
   *  così evitiamo l'overwrite silenzioso storico e ricalcoliamo lazy.
   *  Optional/null per i bridge salvati prima dello Step 1: il render li
   *  tratta come legacy best-effort (vedi useChainBridges). */
  target_id?: string | null;
};

export type Activity = {
  id: string;              // day_activity_id (instance)
  activity_id: string;     // For accessing entity in scheduled_activities
  day_id: string;
  trip_id: string;
  slot: "morning" | "afternoon" | "evening" | "night" | null;
  position: number;
  time: string | null;
  /** Durata in minuti dell'istanza schedulata. Optional/null = fallback su
   *  default per category. Opzionale per retro-compatibilità con i mock dei
   *  dev sandbox (vedi app/(dev)/dev/(components)) che pre-esistono alla
   *  migrazione 20260609. */
  duration_min?: number | null;
  title: string;
  short_desc: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  icon: string | null;
  hero_image: string | null;
  url: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  budget_paid: boolean;
  booking: boolean | string | null;
  place_enriched: unknown | null;
  // ── Timeline fields — richiede migrazione DB ──
  type?: BlockType;
  fuzzy?: boolean;
  instance_note?: string | null;
  booking_status?: BookingStatus | null;
  bridge_in_json?: BridgeData | null;
  bridge_out_json?: BridgeData | null;
  entity_id?: string | null;
};

export type TripSnapshot = {
  trip: Trip;
  days: Array<Day & { activities: Activity[] }>;
};
