import { serverServices } from "@/lib/services";
import { AppHeader, type AppHeaderProps } from "./AppHeader";

/**
 * Server wrapper per AppHeader.
 *
 * Unico punto che inietta l'utente nell'header: identità + display + ruoli
 * arrivano da `UserService.me()` (display da public.user_profiles, mai dai
 * metadata OAuth). I consumer passano solo le props non-utente (nav, trip…).
 */
type AppHeaderServerProps = Omit<
  AppHeaderProps,
  "isLoggedIn" | "initials" | "avatarUrl" | "fullName" | "isDev" | "isTester"
>;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export async function AppHeaderServer(props: AppHeaderServerProps) {
  let isLoggedIn = false;
  let initials = "";
  let avatarUrl = "";
  let fullName = "";
  let isDev = false;
  let isTester = false;

  try {
    const services = await serverServices();
    const { user, roles } = await services.users.me();
    if (user) {
      isLoggedIn = true;
      fullName = user.fullName;
      avatarUrl = user.avatarUrl;
      initials = initialsOf(fullName);
      isDev = roles.includes("dev");
      isTester = roles.some((r) => ["tester", "dev", "admin"].includes(r));
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
      isDev={isDev}
      isTester={isTester}
    />
  );
}
