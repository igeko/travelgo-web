/**
 * GET /api/activities/search?trip_id=X&day_id=Y&q=tsukiji
 *
 * Autocomplete a 2 gruppi per ActivityAutocomplete:
 *
 * 1. "wishlist" — attività già nel trip (qualsiasi giorno),
 *    con badge "Dn" se già schedulata nel giorno corrente (day_id)
 *
 * 2. "platform" — ricerca full-text su tutte le attività della piattaforma
 *    (attività di altri trip, comunità/curated) che matchano la query
 *
 * Response: { wishlist: Activity[], platform: Activity[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { serverDal } from "@/lib/dal";
import { requireTripMember } from "@/lib/dal/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("trip_id");
  const dayId  = searchParams.get("day_id") ?? null;
  const q      = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (!tripId) {
    return NextResponse.json({ error: "trip_id required" }, { status: 400 });
  }

  const auth = await requireTripMember(tripId);
  if (!auth.ok) return auth.response;

  const dal = await serverDal();
  const result = await dal.activities.search({ tripId, dayId, query: q });

  return NextResponse.json(result);
}
