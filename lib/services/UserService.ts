/**
 * lib/services/UserService.ts
 * ─────────────────────────────────────────────────────────────────
 * Punto d'accesso canonico ai dati utente (server).
 *
 *   Identità (id, email)        → auth.users  (auth.uid())
 *   Display (nome, avatar, …)   → public.user_profiles  (via dal.users)
 *
 * Regola: il display NON si legge MAI dai metadata OAuth (`user_metadata`).
 * Quei metadata servono solo a seedare user_profiles (trigger handle_new_user).
 * Tutta l'app passa di qui (o da dal.users) per nome/avatar.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal } from "@/lib/dal";
import { serviceDal } from "@/lib/dal";

export type Me = {
  user: { id: string; email: string; fullName: string; avatarUrl: string } | null;
  roles: string[];
};

/** Display info di un utente (per liste owner/autore). */
export type UserDisplay = { id: string; fullName: string; avatarUrl: string | null };

export class UserService {
  constructor(private readonly dal: Dal) {}

  /** The current user plus their platform roles, or nulls if anonymous. */
  async me(): Promise<Me> {
    const { data: user } = await this.dal.users.getCurrentUser();
    if (!user) return { user: null, roles: [] };

    const { data: profile } = await this.dal.users.getProfile(user.id);
    const roles = await serviceDal().users.getPlatformRoles(user.id);
    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.display_name ?? user.email ?? "",
        avatarUrl: profile?.avatar_url ?? "",
      },
      roles,
    };
  }

  /** Display (nome+avatar) per un set di utenti, da user_profiles. */
  async displays(userIds: string[]): Promise<Map<string, UserDisplay>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    const map = new Map<string, UserDisplay>();
    if (ids.length === 0) return map;
    const { data } = await this.dal.users.getProfiles(ids);
    for (const p of data ?? []) {
      map.set(p.id, { id: p.id, fullName: p.display_name ?? "", avatarUrl: p.avatar_url });
    }
    return map;
  }
}
