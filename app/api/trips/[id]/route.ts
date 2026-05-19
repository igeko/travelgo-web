import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/dal/auth";
import { getTripSnapshot } from "@/lib/dal/trips";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireTripMember(id);
  if (!auth.ok) return auth.response;

  const snapshot = await getTripSnapshot(id);
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
