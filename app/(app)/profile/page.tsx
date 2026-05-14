import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/dal/supabase";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name ?? user.email ?? "";
  const avatarUrl = user.user_metadata?.avatar_url ?? "";
  const email = user.email ?? "";
  const initials = fullName
    .split(/\s+/)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  // Roles
  const { data: roleRows, error: rolesError } = await supabase
    .from("user_platform_roles")
    .select("role")
    .eq("user_id", user.id);
  console.log("[profile] roleRows:", roleRows, "error:", rolesError);
  const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);

  const joinedAt = new Date(user.created_at).toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeaderServer activeNav="trips" />

      <main className="flex-1 max-w-[640px] mx-auto w-full px-5 py-10">

        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-8">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink flex items-center justify-center text-white text-[22px] font-semibold shrink-0 select-none">
              {initials}
            </div>
          )}
          <div>
            <div className="text-[22px] font-semibold text-ink leading-tight">{fullName}</div>
            <div className="text-[13px] text-ink-soft mt-0.5">{email}</div>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border divide-y divide-border">
          <Row label="Email" value={email} />
          <Row label="Membro dal" value={joinedAt} />
          <Row label="ID utente" value={user.id} mono />
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.10em] text-ink-faint mb-2">
              Ruoli piattaforma
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] border border-border bg-surface text-ink-soft font-mono"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-[12px] text-ink-faint shrink-0">{label}</span>
      <span className={`text-[13px] text-ink text-right truncate ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
