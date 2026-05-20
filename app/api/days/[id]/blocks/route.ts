import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireDayEditor, requireDayMember } from "@/lib/dal/auth";
import { parseJsonBody, safeHttpUrl } from "@/lib/api/validation";

type Params = { params: Promise<{ id: string }> };

const SLOT_ORDER = ["morning", "afternoon", "evening", "night"];
const SLOT_VALUES = new Set(["morning", "afternoon", "evening", "night"]);
const URL_FIELDS = new Set(["url", "hero_image"]);

/* ── GET /api/days/[id]/blocks ─────────────────────────────────── */
export async function GET(_req: Request, { params }: Params) {
  const { id: dayId } = await params;

  const auth = await requireDayMember(dayId);
  if (!auth.ok) return auth.response;

  const dal = await serverDal();
  const { data, error } = await dal.activities.listBlocksByDay(dayId);

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

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown>;

  const dal = await serverDal();

  const tripId = await dal.trips.tripIdForDay(dayId);
  if (!tripId) return NextResponse.json({ error: "Day not found" }, { status: 404 });

  const slot = typeof body.slot === "string" && SLOT_VALUES.has(body.slot) ? body.slot : "morning";

  const nextPosition = await dal.activities.nextBlockPosition(dayId);

  const insert: Record<string, unknown> = {
    day_id: dayId,
    trip_id: tripId,
    title:    typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : "Nuovo blocco",
    type:     typeof body.type === "string" ? body.type : "place",
    fuzzy:    body.fuzzy === true,
    slot,
    position: typeof body.position === "number" ? body.position : nextPosition,
  };

  const optionalFields = [
    "time", "short_desc", "location", "location_place_id",
    "location_lat", "location_lng", "instance_note", "booking_status",
    "bridge_in_json", "bridge_out_json", "entity_id",
    "budget_amount", "budget_currency", "hero_image", "icon", "url",
  ] as const;

  for (const key of optionalFields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (URL_FIELDS.has(key) && value != null && value !== "") {
      const safe = safeHttpUrl(value);
      if (!safe) {
        return NextResponse.json({ error: `Invalid URL in ${key}` }, { status: 400 });
      }
      insert[key] = safe;
    } else {
      insert[key] = value;
    }
  }

  const { data: created, error } = await dal.activities.createBlock(insert);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(created, { status: 201 });
}
