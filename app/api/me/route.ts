import { NextResponse } from "next/server";
import { getServerClient, getServiceClient } from "@/lib/dal/supabase";

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
