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
import { getServerClient } from "@/lib/dal/supabase";

const SEARCH_SELECT = "id, title, short_desc, location, hero_image, type, slot, day_id, trip_id, fuzzy";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("trip_id");
  const dayId  = searchParams.get("day_id") ?? null;
  const q      = (searchParams.get("q") ?? "").trim();

  if (!tripId) {
    return NextResponse.json({ error: "trip_id required" }, { status: 400 });
  }

  const supabase = await getServerClient();

  // ── Gruppo 1: wishlist (tutte le attività del trip) ─────────────
  let wishlistQuery = supabase
    .from("activities")
    .select(SEARCH_SELECT)
    .eq("trip_id", tripId)
    .order("slot", { ascending: true })
    .order("position", { ascending: true })
    .limit(30);

  if (q) {
    wishlistQuery = wishlistQuery.ilike("title", `%${q}%`);
  }

  const { data: wishlistRaw } = await wishlistQuery;

  // Arricchisci con badge "Dn" se l'attività è già nel giorno corrente
  const wishlist = (wishlistRaw ?? []).map((a) => ({
    ...a,
    in_current_day: dayId ? a.day_id === dayId : false,
  }));

  // ── Gruppo 2: platform (attività da altri trip, full-text) ───────
  let platformQuery = supabase
    .from("activities")
    .select(SEARCH_SELECT)
    .neq("trip_id", tripId) // esclude il trip corrente
    .limit(20);

  if (q) {
    platformQuery = platformQuery.ilike("title", `%${q}%`);
  } else {
    // Senza query: non restituiamo nulla per platform (evita rumore)
    return NextResponse.json({ wishlist, platform: [] });
  }

  const { data: platform } = await platformQuery;

  return NextResponse.json({
    wishlist,
    platform: platform ?? [],
  });
}
