import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireActivityEditor } from "@/lib/dal/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const { activityId } = await params;

  const auth = await requireActivityEditor(activityId);
  if (!auth.ok) return auth.response;

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const { activityId } = await params;

  const auth = await requireActivityEditor(activityId);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const allowed = [
    "title", "short_desc", "slot", "time",
    "location", "location_place_id", "location_lat", "location_lng",
    "budget_amount", "budget_currency", "budget_paid", "booking",
    "place_enriched", "hero_image",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("activities")
    .update(patch)
    .eq("id", activityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
