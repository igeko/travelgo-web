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
  id: string;
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
  // ── Timeline fields (Dec 15) ──
  type: BlockType;
  fuzzy: boolean;
  instance_note: string | null;
  booking_status: BookingStatus | null;
  bridge_in_json: BridgeData | null;
  bridge_out_json: BridgeData | null;
  entity_id: string | null;
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
    .select("id, trip_id, day_number, date, city, label, day_type, accommodation_name, accommodation_address, accommodation_url, accommodation_type, accommodation_place_id, accommodation_lat, accommodation_lng, show_map, notes, summary, image_url")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true });
  return data ?? [];
}

const ACTIVITY_SELECT = [
  "id", "day_id", "trip_id", "slot", "position", "time",
  "title", "short_desc", "location", "location_place_id", "location_lat", "location_lng",
  "icon", "hero_image", "url",
  "budget_amount", "budget_currency", "budget_paid", "booking", "place_enriched",
  // timeline fields
  "type", "fuzzy", "instance_note", "booking_status",
  "bridge_in_json", "bridge_out_json", "entity_id",
].join(", ");

export async function getDayActivities(dayId: string): Promise<Activity[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("day_id", dayId)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  return (data ?? []) as unknown as Activity[];
}

export { ACTIVITY_SELECT };
