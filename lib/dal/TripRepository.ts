/**
 * lib/dal/TripRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for the `trips` table.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import { DalError, type DalResult, type DbTrip } from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreateTripInput = {
  title: string;
  subtitle?: string;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  budget_total?: number;
  currency?: string;
  local_currency?: string;
  display_currency?: string;
};

export type UpdateTripInput = Partial<CreateTripInput>;

// ── Repository ────────────────────────────────────────────────────

export class TripRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** All trips the current user is a member of. */
  async listForCurrentUser(): Promise<DalResult<DbTrip[]>> {
    const { data, error } = await this.db
      .from("trips")
      .select(
        `
        *,
        trip_members!inner ( user_id )
        `,
      )
      .order("start_date", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip[], error: null };
  }

  /** Single trip by ID (RLS enforces membership). */
  async findById(id: string): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  /** Create a new trip. The caller (Route Handler) must also insert
   *  a trip_members row with role "owner" via service-role client. */
  async create(input: CreateTripInput): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from("trips")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  /** Update trip metadata. Only editors and owners can do this (enforced by RLS). */
  async update(id: string, input: UpdateTripInput): Promise<DalResult<DbTrip>> {
    const { data, error } = await this.db
      .from("trips")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbTrip, error: null };
  }

  /** Delete a trip. Only the owner should be able to do this (enforce in Route Handler). */
  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from("trips").delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
