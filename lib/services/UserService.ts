/**
 * lib/services/UserService.ts
 * ─────────────────────────────────────────────────────────────────
 * Current-user composition: auth identity + platform roles.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal } from "@/lib/dal";
import { serviceDal } from "@/lib/dal";

export type Me = {
  user: { id: string; email: string; fullName: string; avatarUrl: string } | null;
  roles: string[];
};

export class UserService {
  constructor(private readonly dal: Dal) {}

  /** The current user plus their platform roles, or nulls if anonymous. */
  async me(): Promise<Me> {
    const { data: user } = await this.dal.users.getCurrentUser();
    if (!user) return { user: null, roles: [] };

    const roles = await serviceDal().users.getPlatformRoles(user.id);
    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        fullName: user.user_metadata?.full_name ?? user.email ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? "",
      },
      roles,
    };
  }
}
