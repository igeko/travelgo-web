import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireActivityEditor } from "@/lib/dal/auth";
import { parseJsonBody, pickFields, safeHttpUrl } from "@/lib/api/validation";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_BLOCK_FIELDS = [
  "time", "slot", "position", "fuzzy",
  "instance_note", "booking_status",
  "type", "title", "short_desc",
  "location", "location_place_id", "location_lat", "location_lng",
  "budget_amount", "budget_currency", "budget_paid", "booking",
  "hero_image", "icon", "url", "place_enriched",
] as const;

const URL_FIELDS = new Set(["url", "hero_image"]);

/* ── PATCH /api/blocks/[id] ────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireActivityEditor(id);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const patch = pickFields(parsed.body, ALLOWED_BLOCK_FIELDS);

  // Reject `javascript:` / `data:` URLs in any URL-shaped field.
  for (const key of URL_FIELDS) {
    if (key in patch && patch[key as keyof typeof patch] != null) {
      const safe = safeHttpUrl(patch[key as keyof typeof patch]);
      if (!safe) {
        return NextResponse.json({ error: `Invalid URL in ${key}` }, { status: 400 });
      }
      patch[key as keyof typeof patch] = safe;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const dal = await serverDal();
  const { data, error } = await dal.activities.patchBlock(id, patch);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/* ── DELETE /api/blocks/[id] ───────────────────────────────────── */
// Rimuove il blocco dal giorno; l'entità originale (entity_id) resta intatta
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  const auth = await requireActivityEditor(id);
  if (!auth.ok) return auth.response;

  const dal = await serverDal();
  const { error } = await dal.activities.deleteBlock(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
