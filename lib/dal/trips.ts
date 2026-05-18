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

export async function getDayActivities(dayId: string): Promise<Activity[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("activities")
    .select("id, day_id, trip_id, slot, position, time, title, short_desc, location, location_place_id, location_lat, location_lng, icon, hero_image, url, budget_amount, budget_currency, budget_paid, booking, place_enriched")
    .eq("day_id", dayId)
    .order("position", { ascending: true });
  return data ?? [];
}
