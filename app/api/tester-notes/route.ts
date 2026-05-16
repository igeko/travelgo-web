import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const TESTER_ROLES = ["tester", "dev", "admin"];
const ADMIN_ROLES  = ["dev", "admin"];

export async function POST(req: NextRequest) {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();

  // Verifica ruolo tester via service client (bypassa RLS)
  const { data: roles } = await db
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", TESTER_ROLES);

  if (!roles?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { type, note, page_url, trip_id } = body;

  if (!note?.trim()) return NextResponse.json({ error: "Note required" }, { status: 400 });
  if (!["bug", "suggestion", "other"].includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { data, error } = await db
    .from("tester_notes")
    .insert({ user_id: user.id, type, note: note.trim(), page_url: page_url || null, trip_id: trip_id || null })
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

  // Controlla se è admin/dev — vede tutto, altrimenti solo le sue
  const { data: adminRoles } = await db
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ADMIN_ROLES);

  const isAdmin = !!adminRoles?.length;

  let query = db
    .from("tester_notes")
    .select("id, type, note, page_url, trip_id, created_at, user_id, status")
    .order("created_at", { ascending: false });

  if (!isAdmin) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notes = data ?? [];

  // Arricchisce con il nome dell'autore via auth.users (solo service client può farlo)
  const userIds = [...new Set(notes.map((n) => n.user_id))];
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 200 });
  const userMap: Record<string, string> = {};
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      if (userIds.includes(u.id)) {
        userMap[u.id] = (u.user_metadata?.full_name as string) || u.email || u.id;
      }
    }
  }

  const enriched = notes.map((n) => ({ ...n, author_name: userMap[n.user_id] ?? "Unknown" }));
  return NextResponse.json(enriched);
}
