import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null, roles: [] });

  const { data: rows } = await getServiceClient()
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (rows ?? []).map((r: { role: string }) => r.role);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name ?? user.email ?? "",
      avatarUrl: user.user_metadata?.avatar_url ?? "",
    },
    roles,
  });
}
