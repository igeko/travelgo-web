import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireActivityEditor } from "@/lib/dal/auth";
import { ACTIVITY_SELECT } from "@/lib/dal/trips";
import type { BridgeData } from "@/lib/dal/trips";

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

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("activities")
    .update({ [field]: body.bridge ?? null })
    .eq("id", id)
    .select(ACTIVITY_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
