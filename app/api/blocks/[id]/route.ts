import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireActivityEditor } from "@/lib/dal/auth";
import { ACTIVITY_SELECT } from "@/lib/dal/trips";

type Params = { params: Promise<{ id: string }> };

/* ── PATCH /api/blocks/[id] ────────────────────────────────────── */
// Edita solo i campi di istanza — NON campi entità come title/location
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireActivityEditor(id);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const supabase = await getServerClient();

  // Campi di istanza permessi (non tocca title, location, hero_image, ecc.)
  const INSTANCE_FIELDS = [
    "time", "slot", "position", "fuzzy",
    "instance_note", "booking_status",
    "type", "title", "short_desc",
    "location", "location_place_id", "location_lat", "location_lng",
    "budget_amount", "budget_currency", "budget_paid", "booking",
    "hero_image", "icon", "url", "place_enriched",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of INSTANCE_FIELDS) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("activities")
    .update(patch)
    .eq("id", id)
    .select(ACTIVITY_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/* ── DELETE /api/blocks/[id] ───────────────────────────────────── */
// Rimuove il blocco dal giorno; l'entità originale (entity_id) resta intatta
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  const auth = await requireActivityEditor(id);
  if (!auth.ok) return auth.response;

  const supabase = await getServerClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
