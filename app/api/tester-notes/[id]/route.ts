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
const VALID_STATUSES = ["proposed", "approved", "in_progress", "done", "archived"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();

  // Solo admin/dev possono cambiare stato
  const { data: adminRoles } = await db
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ADMIN_ROLES);

  if (!adminRoles?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await db
    .from("tester_notes")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
