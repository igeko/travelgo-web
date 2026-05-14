import { NextRequest, NextResponse } from "next/server";
import { getDayActivities } from "@/lib/dal/trips";
import { getServerClient } from "@/lib/dal/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const activities = await getDayActivities(dayId);
  return NextResponse.json(activities);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;
  const body = await req.json();

  const supabase = await getServerClient();

  // Resolve trip_id from day
  const { data: day, error: dayErr } = await supabase
    .from("days")
    .select("trip_id")
    .eq("id", dayId)
    .single();

  if (dayErr || !day) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const allowed = [
    "title", "short_desc", "slot", "time",
    "location", "location_place_id", "location_lat", "location_lng",
    "budget_amount", "budget_currency", "budget_paid",
  ] as const;

  const insert: Record<string, unknown> = {
    day_id: dayId,
    trip_id: day.trip_id,
    title: body.title ?? "New activity",
  };

  for (const key of allowed) {
    if (key in body && key !== "title") insert[key] = body[key];
  }

  const { data: created, error } = await supabase
    .from("activities")
    .insert(insert)
    .select("id, day_id, trip_id, slot, position, time, title, short_desc, location, location_place_id, location_lat, location_lng, icon, hero_image, url, budget_amount, budget_currency, budget_paid")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
