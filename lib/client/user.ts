/**
 * lib/client/user.ts — frontend client for the current-user endpoint.
 */
import { get } from "./http";

export type Me = {
  user: { id: string; email: string; fullName: string; avatarUrl: string } | null;
  roles: string[];
};

export const user = {
  /** GET /api/me — current user identity + platform roles. */
  me: () => get<Me>("/api/me"),
};
