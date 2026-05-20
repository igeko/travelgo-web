/**
 * lib/dal/entities/Membership.ts
 * ─────────────────────────────────────────────────────────────────
 * Trip collaboration: members (`trip_members`) and pending invites
 * (`trip_invites`).
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { MembershipTable } from "../tables";
import {
  DalError,
  type DalResult,
  type DbTripMember,
  type DbTripInvite,
  type MemberRole,
  type InviteRole,
} from "../types";

export type AddMemberInput = {
  trip_id: string;
  user_id: string;
  role: MemberRole;
};

export type CreateInviteInput = {
  trip_id: string;
  email: string;
  role: InviteRole;
};

export class Membership {
  constructor(private readonly db: SupabaseClient) {}

  // ── Members ──────────────────────────────────────────────────────

  async listMembers(tripId: string): Promise<DalResult<DbTripMember[]>> {
    const { data, error } = await this.db
      .from(MembershipTable.Members)
      .select("*")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember[], error: null };
  }

  /** Current user's membership record for a trip (used for role checks). */
  async findMyMembership(tripId: string): Promise<DalResult<DbTripMember>> {
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) {
      return { data: null, error: new DalError("Not authenticated", "AUTH_REQUIRED") };
    }

    const { data, error } = await this.db
      .from(MembershipTable.Members)
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember, error: null };
  }

  /** Add a member (e.g. the owner row when a trip is created). */
  async add(input: AddMemberInput): Promise<DalResult<DbTripMember>> {
    const { data, error } = await this.db
      .from(MembershipTable.Members)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember, error: null };
  }

  async updateRole(
    tripId: string,
    userId: string,
    role: MemberRole,
  ): Promise<DalResult<DbTripMember>> {
    const { data, error } = await this.db
      .from(MembershipTable.Members)
      .update({ role })
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember, error: null };
  }

  async remove(tripId: string, userId: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(MembershipTable.Members)
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Current user's role in a trip, restricted to an allow-list. */
  async roleInTrip(
    tripId: string,
    userId: string,
    allowed: readonly string[],
  ): Promise<MemberRole | null> {
    const { data } = await this.db
      .from(MembershipTable.Members)
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .in("role", allowed as unknown as string[])
      .maybeSingle();
    return (data as { role: MemberRole } | null)?.role ?? null;
  }

  // ── Invites ──────────────────────────────────────────────────────

  async listInvites(tripId: string): Promise<DalResult<DbTripInvite[]>> {
    const { data, error } = await this.db
      .from(MembershipTable.Invites)
      .select("*")
      .eq("trip_id", tripId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite[], error: null };
  }

  async findInviteByToken(token: string): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from(MembershipTable.Invites)
      .select("*")
      .eq("token", token)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  async createInvite(input: CreateInviteInput): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from(MembershipTable.Invites)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  async markInviteAccepted(id: string): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from(MembershipTable.Invites)
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  async deleteInvite(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(MembershipTable.Invites).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
