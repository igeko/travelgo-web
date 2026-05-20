import { NextResponse } from "next/server";
import { serverDal, serviceDal } from "@/lib/dal";

export async function GET() {
  const dal = await serverDal();
  const { data: user } = await dal.users.getCurrentUser();
  if (!user) return NextResponse.json({ user: null, roles: [] });

  const roles = await serviceDal().users.getPlatformRoles(user.id);

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
