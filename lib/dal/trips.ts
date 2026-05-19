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
  activity_id: string;     // For accessing entity in day_activities
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

// Local row shapes for the joined activity ↔ day_activity query.
type DaRow = {
  id: string;
  activity_id: string;
  day_id: string;
  slot: string | null;
  position: number | null;
  time: string | null;
  notes: string | null;
  booking: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  budget_paid: boolean | null;
  budget_category: string | null;
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
};

/**
 * Get all activities for a day.
 * Queries day_activities with activity JOIN for the new schema.
 * Returns Activity[] for backward compatibility.
 */
export async function getDayActivities(dayId: string): Promise<Activity[]> {
  const supabase = await getServerClient();

  const { data } = await supabase
    .from("day_activities")
    .select("id, activity_id, day_id, slot, position, time, notes, booking, budget_amount, budget_currency, budget_paid, budget_category, created_at, updated_at")
    .eq("day_id", dayId)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  const rows = (data ?? []) as DaRow[];
  if (rows.length === 0) return [];

  const activityIds = [...new Set(rows.map((da) => da.activity_id))];
  const { data: activitiesData } = await supabase
    .from("activities")
    .select("id, trip_id, title, short_desc, details, location, location_place_id, location_lat, location_lng, icon, hero_image, url")
    .in("id", activityIds);

  const activitiesMap = new Map(((activitiesData ?? []) as ActRow[]).map((a) => [a.id, a]));

  return rows.map((da) => {
    const activity = activitiesMap.get(da.activity_id);
    return {
      id: da.id,
      activity_id: da.activity_id,
      day_id: da.day_id,
      trip_id: activity?.trip_id,
      slot: da.slot,
      position: da.position,
      time: da.time,
      title: activity?.title,
      short_desc: activity?.short_desc,
      details: activity?.details,
      notes: da.notes,
      location: activity?.location,
      location_place_id: activity?.location_place_id,
      location_lat: activity?.location_lat,
      location_lng: activity?.location_lng,
      icon: activity?.icon,
      hero_image: activity?.hero_image,
      url: activity?.url,
      booking: da.booking,
      budget_amount: da.budget_amount,
      budget_currency: da.budget_currency,
      budget_paid: da.budget_paid,
      budget_category: da.budget_category,
      place_enriched: null,
      created_at: da.created_at,
      updated_at: da.updated_at,
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

  const { data: dayActivities } = await supabase
    .from("day_activities")
    .select("id, activity_id, day_id, slot, position, time, notes, booking, budget_amount, budget_currency, budget_paid, budget_category")
    .in("day_id", dayIds)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (!dayActivities || dayActivities.length === 0) {
    return { trip: tripRes.data, days: days.map((d) => ({ ...d, activities: [] })) };
  }

  const daRows = dayActivities as DaRow[];
  const activityIds = [...new Set(daRows.map((da) => da.activity_id))];
  const { data: activities } = await supabase
    .from("activities")
    .select("id, trip_id, title, short_desc, location, location_place_id, location_lat, location_lng, icon, hero_image, url")
    .in("id", activityIds);

  const actMap = new Map(((activities ?? []) as ActRow[]).map((a) => [a.id, a]));

  const byDay = new Map<string, Activity[]>();
  for (const da of daRows) {
    const act = actMap.get(da.activity_id);
    const item: Activity = {
      id: da.id,
      activity_id: da.activity_id,
      day_id: da.day_id,
      trip_id: act?.trip_id ?? tripId,
      slot: da.slot as Activity["slot"],
      position: da.position ?? 0,
      time: da.time,
      title: act?.title ?? "",
      short_desc: act?.short_desc ?? null,
      location: act?.location ?? null,
      location_place_id: act?.location_place_id ?? null,
      location_lat: act?.location_lat ?? null,
      location_lng: act?.location_lng ?? null,
      icon: act?.icon ?? null,
      hero_image: act?.hero_image ?? null,
      url: act?.url ?? null,
      booking: da.booking,
      budget_amount: da.budget_amount,
      budget_currency: da.budget_currency,
      budget_paid: da.budget_paid ?? false,
      place_enriched: null,
    };
    const list = byDay.get(da.day_id) ?? [];
    list.push(item);
    byDay.set(da.day_id, list);
  }

  return {
    trip: tripRes.data,
    days: days.map((d) => ({ ...d, activities: byDay.get(d.id) ?? [] })),
  };
}
