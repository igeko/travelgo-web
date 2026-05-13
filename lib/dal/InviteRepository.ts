/**
 * lib/dal/InviteRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for `trip_invites`.
 * Note: accepting an invite (INSERT into trip_members) must be done
 * via a Route Handler with service-role key, not here.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import {
  DalError,
  type DalResult,
  type DbTripInvite,
  type InviteRole,
} from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreateInviteInput = {
  trip_id: string;
  email: string;
  role: InviteRole;
};

// ── Repository ────────────────────────────────────────────────────

export class InviteRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All pending invites for a trip. */
  async listByTrip(tripId: string): Promise<DalResult<DbTripInvite[]>> {
    const { data, error } = await this.db
      .from("trip_invites")
      .select("*")
      .eq("trip_id", tripId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite[], error: null };
  }

  /** Look up an invite by its token (used in the accept flow). */
  async findByToken(token: string): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from("trip_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  /** Create an invite. The invited_by field is auto-set from auth.uid() via RLS/trigger. */
  async create(input: CreateInviteInput): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from("trip_invites")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  /** Mark an invite as accepted. Should be called server-side after adding the member. */
  async markAccepted(id: string): Promise<DalResult<DbTripInvite>> {
    const { data, error } = await this.db
      .from("trip_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTripInvite, error: null };
  }

  /** Revoke a pending invite. */
  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from("trip_invites")
      .delete()
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
