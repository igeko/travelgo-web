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

const ADMIN_ROLES = ["dev", "admin"];
const VALID_STATUSES = ["proposed", "approved", "in_progress", "to_be_tested", "done", "archived"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();

  const body = await req.json();
  const { status, note, fix_notes } = body;

  const updates: Record<string, unknown> = {};

  // status e fix_notes: solo admin/dev
  if (status !== undefined || fix_notes !== undefined) {
    const { data: adminRoles } = await db
      .from("user_platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ADMIN_ROLES);

    if (!adminRoles?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (fix_notes !== undefined) {
      updates.fix_notes = fix_notes?.trim() || null;
    }
  }

  // note: solo l'autore della nota
  if (note !== undefined) {
    if (!note?.trim()) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

    const { data: noteData } = await db
      .from("tester_notes")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!noteData || noteData.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    updates.note = note.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await db
    .from("tester_notes")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
