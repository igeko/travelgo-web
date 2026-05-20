import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireDayEditor, requireDayMember } from "@/lib/dal/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;

  const auth = await requireDayMember(dayId);
  if (!auth.ok) return auth.response;

  const dal = await serverDal();
  const activities = await dal.trips.getDayActivities(dayId);
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
  const dal = await serverDal();

  // Resolve trip_id from day
  const tripId = await dal.trips.tripIdForDay(dayId);
  if (!tripId) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  // 1. CREATE activity entity (instance fields booking/budget/notes now live here)
  const activityInsert: Record<string, unknown> = {
    trip_id: tripId,
    title: body.title ?? "New activity",
  };

  const activityFields = [
    "short_desc", "details", "category", "icon",
    "location", "location_place_id", "location_lat", "location_lng",
    "hero_image", "url",
    "booking", "budget_amount", "budget_currency", "budget_paid", "budget_category", "notes",
  ] as const;

  for (const key of activityFields) {
    if (key in body) activityInsert[key] = body[key];
  }

  const { data: activity, error: actError } = await dal.activities.create(activityInsert);

  if (actError || !activity) {
    return NextResponse.json({ error: actError?.message ?? "Failed to create activity" }, { status: 500 });
  }

  // 2. CREATE scheduled_activity instance (only slot/time/position)
  const scheduledInsert: Record<string, unknown> = {
    activity_id: activity.id,
    day_id: dayId,
  };
  const scheduledFields = ["slot", "time", "position"] as const;
  for (const key of scheduledFields) {
    if (key in body) scheduledInsert[key] = body[key];
  }

  const { data: scheduled, error: saError } = await dal.trips.scheduleActivity(scheduledInsert);

  if (saError || !scheduled) {
    await dal.activities.delete(activity.id);
    return NextResponse.json({ error: saError?.message ?? "Failed to schedule activity" }, { status: 500 });
  }

  // Combined response for backward compat with the existing UI shape.
  const result = {
    id: scheduled.id,
    activity_id: scheduled.activity_id,
    day_id: scheduled.day_id,
    slot: scheduled.slot,
    position: scheduled.position,
    time: scheduled.time,
    notes: activity.notes,
    booking: activity.booking,
    budget_amount: activity.budget_amount,
    budget_currency: activity.budget_currency,
    budget_paid: activity.budget_paid,
    budget_category: activity.budget_category,
    created_at: scheduled.created_at,
    updated_at: scheduled.updated_at,
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
