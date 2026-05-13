/**
 * lib/dal/PhotoRepository.ts
 * ─────────────────────────────────────────────────────────────────
 * All DB access for `photos`.
 * Storage upload/download is handled separately via Supabase Storage
 * SDK — this repository only manages the metadata row.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "./supabase";
import { DalError, type DalResult, type DbPhoto } from "./types";

// ── Input types ───────────────────────────────────────────────────

export type CreatePhotoInput = {
  trip_id: string;
  storage_path: string;
  day_id?: string;
  activity_id?: string;
  caption?: string;
  taken_at?: string;
  width?: number;
  height?: number;
};

export type UpdatePhotoInput = {
  caption?: string | null;
  day_id?: string | null;
  activity_id?: string | null;
};

// ── Repository ────────────────────────────────────────────────────

export class PhotoRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByTrip(tripId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from("photos")
      .select("*")
      .eq("trip_id", tripId)
      .order("taken_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async listByDay(dayId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from("photos")
      .select("*")
      .eq("day_id", dayId)
      .order("taken_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async listByActivity(activityId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from("photos")
      .select("*")
      .eq("activity_id", activityId)
      .order("taken_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async create(input: CreatePhotoInput): Promise<DalResult<DbPhoto>> {
    const { data, error } = await this.db
      .from("photos")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto, error: null };
  }

  async update(id: string, input: UpdatePhotoInput): Promise<DalResult<DbPhoto>> {
    const { data, error } = await this.db
      .from("photos")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from("photos").delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
