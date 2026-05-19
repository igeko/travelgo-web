import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { getTripSnapshot } from "@/lib/dal/trips";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getTripSnapshot(id);
  if (!snapshot) {
    console.error("[GET /api/trips/[id]] getTripSnapshot returned null for", id);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
