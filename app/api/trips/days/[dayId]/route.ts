import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;
  const body = await req.json();

  // Only allow whitelisted fields to be patched
  const allowed = [
    "show_map", "city", "label", "day_type", "notes", "summary",
    "accommodation_type", "accommodation_name", "accommodation_address",
    "accommodation_url", "accommodation_notes",
    "accommodation_place_id", "accommodation_lat", "accommodation_lng",
    "accommodation_cost_amount", "accommodation_cost_currency", "accommodation_cost_paid",
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
    .from("days")
    .update(patch)
    .eq("id", dayId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
