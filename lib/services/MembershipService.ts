/**
 * lib/services/MembershipService.ts
 * ─────────────────────────────────────────────────────────────────
 * Trip collaboration policy/orchestration: the member roster (enriched
 * with display info) and pending invites. Routes guard editor/member
 * access; this service holds the logic.
 *
 * Member/invite mutations may be blocked by RLS for a non-owner editor,
 * so callers pass a service-role DAL (after the route guard authorizes).
 * Reads use the RLS-scoped DAL.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, MemberRole, InviteRole } from "@/lib/dal";
import { badRequest } from "@/lib/api/errors";
import type { TripMemberView, TripInviteView } from "@/lib/trip-members/types";
import { UserService } from "./UserService";
import { unwrap } from "./util";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MembershipService {
  constructor(private readonly dal: Dal) {}

  // ── Members ──────────────────────────────────────────────────────

  /** The trip roster, enriched with name + avatar from user_profiles. */
  async listMembers(tripId: string): Promise<TripMemberView[]> {
    const rows = unwrap(await this.dal.members.listMembers(tripId));
    const displays = await new UserService(this.dal).displays(rows.map((m) => m.user_id));
    return rows.map((m) => {
      const d = displays.get(m.user_id);
      return {
        userId: m.user_id,
        name: d?.fullName ?? "",
        avatarUrl: d?.avatarUrl ?? "",
        role: m.role,
        joinedAt: m.joined_at,
      };
    });
  }

  async setMemberRole(tripId: string, userId: string, role: MemberRole): Promise<void> {
    unwrap(await this.dal.members.updateRole(tripId, userId, role));
  }

  async removeMember(tripId: string, userId: string): Promise<void> {
    unwrap(await this.dal.members.remove(tripId, userId));
  }

  // ── Invites ──────────────────────────────────────────────────────

  /** Pending (un-accepted) invites for a trip. */
  async listInvites(tripId: string): Promise<TripInviteView[]> {
    const rows = unwrap(await this.dal.members.listInvites(tripId));
    return rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      sentAt: i.created_at,
    }));
  }

  /** Persist a pending invite row (no email is sent). */
  async createInvite(tripId: string, email: string, role: InviteRole): Promise<TripInviteView> {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw badRequest("Invalid email");
    const row = unwrap(
      await this.dal.members.createInvite({ trip_id: tripId, email: normalized, role }),
    );
    return { id: row.id, email: row.email, role: row.role, sentAt: row.created_at };
  }

  async deleteInvite(_tripId: string, inviteId: string): Promise<void> {
    unwrap(await this.dal.members.deleteInvite(inviteId));
  }
}
