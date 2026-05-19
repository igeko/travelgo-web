/**
 * app/api/trips/day-activities/[dayActivityId]/route.ts
 * ─────────────────────────────────────────────────────────────────
 * PATCH, DELETE for day_activity instances.
 * Updates timing, notes, booking, budget — instance-level metadata.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireDayActivityEditor } from "@/lib/dal/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dayActivityId: string }> },
) {
  const { dayActivityId } = await params;

  const auth = await requireDayActivityEditor(dayActivityId);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  // Only allow updates to instance-level fields
  const allowed = [
    "slot",
    "time",
    "position",
    "notes",
    "booking",
    "budget_amount",
    "budget_currency",
    "budget_paid",
    "budget_category",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("day_activities")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", dayActivityId)
    .select("id, activity_id, day_id, slot, position, time, notes, booking, budget_amount, budget_currency, budget_paid, budget_category, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch activity details separately
  const { data: activity } = await supabase
    .from("activities")
    .select("id, trip_id, title, short_desc, details, location, location_place_id, location_lat, location_lng, icon, hero_image, url")
    .eq("id", data.activity_id)
    .single();

  // Merge activity data into day_activity response
  const merged = {
    ...data,
    activity,
  };

  return NextResponse.json(merged);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ dayActivityId: string }> },
) {
  const { dayActivityId } = await params;

  const auth = await requireDayActivityEditor(dayActivityId);
  if (!auth.ok) return auth.response;

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("day_activities")
    .delete()
    .eq("id", dayActivityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
