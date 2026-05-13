/**
 * lib/dal/MemberRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for `trip_members`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import {
  DalError,
  type DalResult,
  type DbTripMember,
  type MemberRole,
} from "./types";

// ── Repository ────────────────────────────────────────────────────

export class MemberRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All members of a trip. */
  async listByTrip(tripId: string): Promise<DalResult<DbTripMember[]>> {
    const { data, error } = await this.db
      .from("trip_members")
      .select("*")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember[], error: null };
  }

  /** Current user's membership record for a trip (used for role checks). */
  async findMyMembership(tripId: string): Promise<DalResult<DbTripMember>> {
    const {
      data: { user },
    } = await this.db.auth.getUser();

    if (!user) {
      return {
        data: null,
        error: new DalError("Not authenticated", "AUTH_REQUIRED"),
      };
    }

    const { data, error } = await this.db
      .from("trip_members")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember, error: null };
  }

  /** Update a member's role (owner only — enforced by RLS). */
  async updateRole(
    tripId: string,
    userId: string,
    role: MemberRole,
  ): Promise<DalResult<DbTripMember>> {
    const { data, error } = await this.db
      .from("trip_members")
      .update({ role })
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripMember, error: null };
  }

  /** Remove a member (owner can remove anyone; user can remove themselves). */
  async remove(tripId: string, userId: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from("trip_members")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
