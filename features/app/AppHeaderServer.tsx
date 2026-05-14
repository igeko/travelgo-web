import { getServerClient } from "@/lib/dal/supabase";
import { AppHeader, type AppHeaderProps } from "./AppHeader";

/**
 * Server wrapper per AppHeader.
 * Legge la sessione Supabase e passa isLoggedIn + initials al client component.
 */
export async function AppHeaderServer(props: Omit<AppHeaderProps, "isLoggedIn" | "initials" | "avatarUrl" | "fullName">) {
  let isLoggedIn = false;
  let initials = "";
  let avatarUrl = "";
  let fullName = "";

  try {
    const supabase = await getServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      fullName = user.user_metadata?.full_name ?? user.email ?? "";
      avatarUrl = user.user_metadata?.avatar_url ?? "";
      initials = fullName
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");
    }
  } catch {
    // Se Supabase non è configurato (es. env mancanti) mostriamo Sign in
  }

  return (
    <AppHeader
      {...props}
      isLoggedIn={isLoggedIn}
      initials={initials}
      avatarUrl={avatarUrl}
      fullName={fullName}
    />
  );
}
