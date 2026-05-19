import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireDayEditor } from "@/lib/dal/auth";
import { ACTIVITY_SELECT } from "@/lib/dal/trips";

type Params = { params: Promise<{ id: string }> };

const SLOT_ORDER = ["morning", "afternoon", "evening", "night"];

/* ── GET /api/days/[id]/blocks ─────────────────────────────────── */
export async function GET(_req: Request, { params }: Params) {
  const { id: dayId } = await params;
  const supabase = await getServerClient();

  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("day_id", dayId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // cast through unknown — nuove colonne non ancora nelle Supabase generated types
  type Row = { slot: string | null; position: number | null; [k: string]: unknown };
  const rows = (data ?? []) as unknown as Row[];

  const sorted = rows.slice().sort((a, b) => {
    const si = SLOT_ORDER.indexOf((a.slot ?? "") as string);
    const sj = SLOT_ORDER.indexOf((b.slot ?? "") as string);
    if (si !== sj) return (si === -1 ? 99 : si) - (sj === -1 ? 99 : sj);
    return ((a.position ?? 0) as number) - ((b.position ?? 0) as number);
  });

  return NextResponse.json(sorted);
}

/* ── POST /api/days/[id]/blocks ────────────────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: dayId } = await params;

  const auth = await requireDayEditor(dayId);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const supabase = await getServerClient();

  const { data: day } = await supabase
    .from("days")
    .select("trip_id")
    .eq("id", dayId)
    .single();

  if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });

  // Calcola la prossima position nel giorno
  const { data: last } = await supabase
    .from("activities")
    .select("position")
    .eq("day_id", dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (last?.position ?? 0) + 1;

  const insert: Record<string, unknown> = {
    day_id: dayId,
    trip_id: day.trip_id,
    title:    body.title ?? "Nuovo blocco",
    type:     body.type  ?? "place",
    fuzzy:    body.fuzzy ?? false,
    slot:     body.slot  ?? "morning",
    position: body.position ?? nextPosition,
  };

  const optionalFields = [
    "time", "short_desc", "location", "location_place_id",
    "location_lat", "location_lng", "instance_note", "booking_status",
    "bridge_in_json", "bridge_out_json", "entity_id",
    "budget_amount", "budget_currency", "hero_image", "icon", "url",
  ] as const;

  for (const key of optionalFields) {
    if (key in body) insert[key] = body[key];
  }

  const { data: created, error } = await supabase
    .from("activities")
    .insert(insert)
    .select(ACTIVITY_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(created, { status: 201 });
}
