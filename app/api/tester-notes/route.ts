import { NextRequest, NextResponse } from "next/server";
import { getServerClient, getServiceClient } from "@/lib/dal/supabase";
import { TESTER_ROLES, ADMIN_ROLES } from "@/lib/dal/auth";
import { isUuid, parseJsonBody, safeHttpUrl } from "@/lib/api/validation";

const NOTE_TYPES = new Set(["bug", "suggestion", "other"]);

export async function POST(req: NextRequest) {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();

  const { data: roles } = await db
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", TESTER_ROLES as unknown as string[]);

  if (!roles?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown>;

  const type = typeof body.type === "string" ? body.type : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return NextResponse.json({ error: "Note required" }, { status: 400 });
  if (!NOTE_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  // page_url: must be an HTTP(S) URL if provided; reject javascript: etc.
  let pageUrl: string | null = null;
  if (body.page_url) {
    const safe = safeHttpUrl(body.page_url, { maxLength: 1000 });
    if (!safe) return NextResponse.json({ error: "Invalid page_url" }, { status: 400 });
    pageUrl = safe;
  }

  // trip_id: must be a UUID if provided.
  let tripId: string | null = null;
  if (body.trip_id) {
    if (!isUuid(body.trip_id)) {
      return NextResponse.json({ error: "Invalid trip_id" }, { status: 400 });
    }
    tripId = body.trip_id;
  }

  const { data, error } = await db
    .from("tester_notes")
    .insert({
      user_id: user.id,
      type,
      note: note.slice(0, 4000),
      page_url: pageUrl,
      trip_id: tripId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function GET() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();

  // Anyone with a tester role can see their own notes; admins/devs see everything.
  const { data: roles } = await db
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", TESTER_ROLES as unknown as string[]);

  if (!roles?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r.role as string));

  let query = db
    .from("tester_notes")
    .select("id, type, note, fix_notes, page_url, trip_id, created_at, user_id, status")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!isAdmin) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notes = data ?? [];

  // Resolve author names only for the user_ids actually present — no full listUsers().
  const userIds = [...new Set(notes.map((n) => n.user_id).filter((id): id is string => !!id))];
  const userMap: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (id) => {
      const { data: u } = await db.auth.admin.getUserById(id);
      if (u?.user) {
        const fullName = u.user.user_metadata?.full_name;
        userMap[id] = (typeof fullName === "string" && fullName) ? fullName : "Unknown";
      }
    }),
  );

  const enriched = notes.map((n) => ({ ...n, author_name: userMap[n.user_id] ?? "Unknown" }));
  return NextResponse.json(enriched);
}
