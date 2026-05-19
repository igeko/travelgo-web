import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { requireDayEditor } from "@/lib/dal/auth";
import { parseJsonBody, pickFields, safeHttpUrl } from "@/lib/api/validation";

const ALLOWED_DAY_FIELDS = [
  "show_map", "city", "label", "day_type", "notes", "summary",
  "accommodation_type", "accommodation_name", "accommodation_address",
  "accommodation_url", "accommodation_notes",
  "accommodation_place_id", "accommodation_lat", "accommodation_lng",
  "accommodation_cost_amount", "accommodation_cost_currency", "accommodation_cost_paid",
  "image_url", "narrative",
] as const;

const URL_FIELDS = new Set(["accommodation_url", "image_url"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  const auth = await requireDayEditor(dayId);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const patch = pickFields(parsed.body, ALLOWED_DAY_FIELDS);

  for (const key of URL_FIELDS) {
    if (key in patch && patch[key as keyof typeof patch] != null && patch[key as keyof typeof patch] !== "") {
      const safe = safeHttpUrl(patch[key as keyof typeof patch]);
      if (!safe) {
        return NextResponse.json({ error: `Invalid URL in ${key}` }, { status: 400 });
      }
      patch[key as keyof typeof patch] = safe;
    }
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
