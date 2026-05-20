import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireActivityEditor } from "@/lib/dal/auth";
import type { BridgeData } from "@/lib/dal/domain";

type Params = { params: Promise<{ id: string }> };

/* ── PATCH /api/blocks/[id]/bridge ────────────────────────────────
   Aggiorna i dati ponte (in o out) di un blocco.
   body: { direction: "in" | "out", bridge: BridgeData }
──────────────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireActivityEditor(id);
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    direction: "in" | "out";
    bridge: Partial<BridgeData> | null;
  };

  if (!body.direction || !["in", "out"].includes(body.direction)) {
    return NextResponse.json({ error: "direction must be 'in' or 'out'" }, { status: 400 });
  }

  const field = body.direction === "in" ? "bridge_in_json" : "bridge_out_json";

  const dal = await serverDal();
  const { data, error } = await dal.activities.setBridge(id, field, body.bridge ?? null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
