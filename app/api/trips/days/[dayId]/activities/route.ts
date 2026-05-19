import { NextRequest, NextResponse } from "next/server";
import { getDayActivities } from "@/lib/dal/trips";
import { getServerClient } from "@/lib/dal/supabase";
import { requireDayEditor, requireDayMember } from "@/lib/dal/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;

  const auth = await requireDayMember(dayId);
  if (!auth.ok) return auth.response;

  const activities = await getDayActivities(dayId);
  return NextResponse.json(activities);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  const auth = await requireDayEditor(dayId);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const supabase = await getServerClient();

  // Resolve trip_id from day
  const { data: day } = await supabase
    .from("days")
    .select("trip_id")
    .eq("id", dayId)
    .single();

  if (!day) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  // 1. CREATE activity entity
  const activityInsert: Record<string, unknown> = {
    trip_id: day.trip_id,
    title: body.title ?? "New activity",
  };

  // Activity fields (entity-level)
  const activityFields = [
    "short_desc", "details", "category", "icon",
    "location", "location_place_id", "location_lat", "location_lng",
    "hero_image", "url"
  ] as const;

  for (const key of activityFields) {
    if (key in body) activityInsert[key] = body[key];
  }

  const { data: activity, error: actError } = await supabase
    .from("activities")
    .insert(activityInsert)
    .select()
    .single();

  if (actError) {
    return NextResponse.json({ error: actError.message }, { status: 500 });
  }

  // 2. CREATE day_activity instance
  const dayActivityInsert: Record<string, unknown> = {
    activity_id: activity.id,
    day_id: dayId,
  };

  // Day activity fields (instance-level)
  const dayActivityFields = [
    "slot", "time", "position",
    "notes", "booking",
    "budget_amount", "budget_currency", "budget_paid", "budget_category"
  ] as const;

  for (const key of dayActivityFields) {
    if (key in body) dayActivityInsert[key] = body[key];
  }

  const { data: dayActivity, error: daError } = await supabase
    .from("day_activities")
    .insert(dayActivityInsert)
    .select("id, activity_id, day_id, slot, position, time, notes, booking, budget_amount, budget_currency, budget_paid, budget_category, created_at, updated_at")
    .single();

  if (daError) {
    // Cleanup: remove the created activity
    await supabase.from("activities").delete().eq("id", activity.id);
    return NextResponse.json({ error: daError.message }, { status: 500 });
  }

  // Return combined view for backward compat
  const result = {
    id: dayActivity.id,
    activity_id: dayActivity.activity_id,
    day_id: dayActivity.day_id,
    slot: dayActivity.slot,
    position: dayActivity.position,
    time: dayActivity.time,
    notes: dayActivity.notes,
    booking: dayActivity.booking,
    budget_amount: dayActivity.budget_amount,
    budget_currency: dayActivity.budget_currency,
    budget_paid: dayActivity.budget_paid,
    budget_category: dayActivity.budget_category,
    created_at: dayActivity.created_at,
    updated_at: dayActivity.updated_at,
    trip_id: activity.trip_id,
    title: activity.title,
    short_desc: activity.short_desc,
    details: activity.details,
    location: activity.location,
    location_place_id: activity.location_place_id,
    location_lat: activity.location_lat,
    location_lng: activity.location_lng,
    icon: activity.icon,
    hero_image: activity.hero_image,
    url: activity.url,
  };

  return NextResponse.json(result, { status: 201 });
}
