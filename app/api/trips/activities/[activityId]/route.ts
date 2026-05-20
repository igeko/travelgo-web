import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireActivityEditor } from "@/lib/dal/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const { activityId } = await params;

  const auth = await requireActivityEditor(activityId);
  if (!auth.ok) return auth.response;

  const dal = await serverDal();
  const { error } = await dal.activities.delete(activityId);

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

  // Only entity-level fields (no slot, time, position, notes, booking, budget_*)
  const allowed = [
    "title", "short_desc", "details", "category", "icon",
    "location", "location_place_id", "location_lat", "location_lng",
    "hero_image", "url",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const dal = await serverDal();
  const { data, error } = await dal.activities.update(activityId, patch);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
