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
  start_date: string | null;
  end_date: string | null;
  currency: string;
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
  line?: string | null;
  stops?: string | null;
  note?: string | null;
};

export type Activity = {
  id: string;              // day_activity_id (instance)
  activity_id: string;     // For accessing entity in scheduled_activities
  day_id: string;
  trip_id: string;
  slot: "morning" | "afternoon" | "evening" | "night" | null;
  position: number;
  time: string | null;
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
