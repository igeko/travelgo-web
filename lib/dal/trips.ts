import { getServerClient } from "@/lib/dal/supabase";

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

export async function getTrip(id: string): Promise<Trip | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("trips")
    .select("id, title, subtitle, start_date, end_date, currency")
    .eq("id", id)
    .single();
  return data;
}

export async function getTripDays(tripId: string): Promise<Day[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("days")
    .select("id, trip_id, day_number, date, city, label, day_type, accommodation_name, accommodation_address, accommodation_url, accommodation_type, accommodation_place_id, accommodation_lat, accommodation_lng, show_map, notes, summary, image_url, narrative")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true });
  return data ?? [];
}

// Colonne base — sempre disponibili
const ACTIVITY_SELECT_BASE = [
  "id", "day_id", "trip_id", "slot", "position", "time",
  "title", "short_desc", "location", "location_place_id", "location_lat", "location_lng",
  "icon", "hero_image", "url",
  "budget_amount", "budget_currency", "budget_paid", "booking", "place_enriched",
].join(", ");

// Colonne timeline — richiedono migrazione DB (aggiungere quando disponibili)
const ACTIVITY_SELECT_TIMELINE = [
  ...ACTIVITY_SELECT_BASE.split(", "),
  "type", "fuzzy", "instance_note", "booking_status",
  "bridge_in_json", "bridge_out_json", "entity_id",
].join(", ");

export const ACTIVITY_SELECT = ACTIVITY_SELECT_TIMELINE;

// Local row shapes for the joined activity ↔ scheduled_activity query.
// Instance-level fields (notes, booking, budget_*) live on `activities`;
// `scheduled_activities` keeps only the scheduling join.
type DaRow = {
  id: string;
  activity_id: string;
  day_id: string;
  slot: string | null;
  position: number | null;
  time: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ActRow = {
  id: string;
  trip_id: string;
  title: string;
  short_desc: string | null;
  details?: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  icon: string | null;
  hero_image: string | null;
  url: string | null;
  booking?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  budget_paid?: boolean | null;
  budget_category?: string | null;
  notes?: string | null;
};

/**
 * Get all activities for a day.
 * Queries scheduled_activities with activity JOIN for the new schema.
 * Returns Activity[] for backward compatibility.
 */
export async function getDayActivities(dayId: string): Promise<Activity[]> {
  const supabase = await getServerClient();

  const { data, error } = await supabase
    .from("scheduled_activities")
    .select("id, activity_id, day_id, slot, position, time, created_at, updated_at")
    .eq("day_id", dayId)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (error) {
    console.error("[getDayActivities] error:", error.message);
    return [];
  }
  const rows = (data ?? []) as DaRow[];
  if (rows.length === 0) return [];

  const activityIds = [...new Set(rows.map((sa) => sa.activity_id))];
  const { data: activitiesData } = await supabase
    .from("activities")
    .select("id, trip_id, title, short_desc, details, location, location_place_id, location_lat, location_lng, icon, hero_image, url, booking, budget_amount, budget_currency, budget_paid, budget_category, notes")
    .in("id", activityIds);

  const activitiesMap = new Map(((activitiesData ?? []) as ActRow[]).map((a) => [a.id, a]));

  return rows.map((sa) => {
    const activity = activitiesMap.get(sa.activity_id);
    return {
      id: sa.id,
      activity_id: sa.activity_id,
      day_id: sa.day_id,
      trip_id: activity?.trip_id,
      slot: sa.slot as Activity["slot"],
      position: sa.position ?? 0,
      time: sa.time,
      title: activity?.title,
      short_desc: activity?.short_desc,
      details: activity?.details,
      notes: activity?.notes,
      location: activity?.location,
      location_place_id: activity?.location_place_id,
      location_lat: activity?.location_lat,
      location_lng: activity?.location_lng,
      icon: activity?.icon,
      hero_image: activity?.hero_image,
      url: activity?.url,
      booking: activity?.booking,
      budget_amount: activity?.budget_amount,
      budget_currency: activity?.budget_currency,
      budget_paid: activity?.budget_paid,
      budget_category: activity?.budget_category,
      place_enriched: null,
      created_at: sa.created_at,
      updated_at: sa.updated_at,
    };
  }) as Activity[];
}

export type TripSnapshot = {
  trip: Trip;
  days: Array<Day & { activities: Activity[] }>;
};

/**
 * Carica trip + days + tutte le attività del viaggio.
 * 4 query flat invece di N×2 (una per giorno).
 */
export async function getTripSnapshot(tripId: string): Promise<TripSnapshot | null> {
  const supabase = await getServerClient();

  const [tripRes, daysRes] = await Promise.all([
    supabase
      .from("trips")
      .select("id, title, subtitle, start_date, end_date, currency")
      .eq("id", tripId)
      .single(),
    supabase
      .from("days")
      .select("id, trip_id, day_number, date, city, label, day_type, accommodation_name, accommodation_address, accommodation_url, accommodation_type, accommodation_place_id, accommodation_lat, accommodation_lng, show_map, notes, summary, image_url, narrative")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true }),
  ]);

  if (!tripRes.data) {
    if (tripRes.error) console.error("[getTripSnapshot] trip error:", tripRes.error.message);
    return null;
  }

  const days: Day[] = daysRes.data ?? [];
  if (days.length === 0) {
    return { trip: tripRes.data, days: [] };
  }

  const dayIds = days.map((d) => d.id);

  const { data: scheduledActivities } = await supabase
    .from("scheduled_activities")
    .select("id, activity_id, day_id, slot, position, time")
    .in("day_id", dayIds)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (!scheduledActivities || scheduledActivities.length === 0) {
    return { trip: tripRes.data, days: days.map((d) => ({ ...d, activities: [] })) };
  }

  const saRows = scheduledActivities as DaRow[];
  const activityIds = [...new Set(saRows.map((sa) => sa.activity_id))];
  const { data: activities } = await supabase
    .from("activities")
    .select("id, trip_id, title, short_desc, location, location_place_id, location_lat, location_lng, icon, hero_image, url, booking, budget_amount, budget_currency, budget_paid, budget_category, notes")
    .in("id", activityIds);

  const actMap = new Map(((activities ?? []) as ActRow[]).map((a) => [a.id, a]));

  const byDay = new Map<string, Activity[]>();
  for (const sa of saRows) {
    const act = actMap.get(sa.activity_id);
    const item: Activity = {
      id: sa.id,
      activity_id: sa.activity_id,
      day_id: sa.day_id,
      trip_id: act?.trip_id ?? tripId,
      slot: sa.slot as Activity["slot"],
      position: sa.position ?? 0,
      time: sa.time,
      title: act?.title ?? "",
      short_desc: act?.short_desc ?? null,
      location: act?.location ?? null,
      location_place_id: act?.location_place_id ?? null,
      location_lat: act?.location_lat ?? null,
      location_lng: act?.location_lng ?? null,
      icon: act?.icon ?? null,
      hero_image: act?.hero_image ?? null,
      url: act?.url ?? null,
      booking: act?.booking ?? null,
      budget_amount: act?.budget_amount ?? null,
      budget_currency: act?.budget_currency ?? null,
      budget_paid: act?.budget_paid ?? false,
      place_enriched: null,
    };
    const list = byDay.get(sa.day_id) ?? [];
    list.push(item);
    byDay.set(sa.day_id, list);
  }

  return {
    trip: tripRes.data,
    days: days.map((d) => ({ ...d, activities: byDay.get(d.id) ?? [] })),
  };
}
