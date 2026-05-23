/**
 * lib/trip-members/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared view shapes for trip collaboration (members + invites).
 * Importable from both the service layer and the frontend client.
 * ─────────────────────────────────────────────────────────────────
 */

import type { MemberRole, InviteRole } from "@/lib/dal/types";

/** A trip member enriched with display info, for the Trip Edit roster. */
export type TripMemberView = {
  userId: string;
  name: string;
  avatarUrl: string;
  role: MemberRole;
  joinedAt: string;
};

/** A pending (un-accepted) invite row. */
export type TripInviteView = {
  id: string;
  email: string;
  role: InviteRole;
  sentAt: string;
};
