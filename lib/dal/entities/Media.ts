/**
 * lib/dal/entities/Media.ts
 * ─────────────────────────────────────────────────────────────────
 * The Media entity — photo metadata rows (`photos`).
 * Storage objects live in Supabase Storage and are handled by callers.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { MediaTable } from "../tables";
import { DalError, type DalResult, type DbPhoto } from "../types";

export type CreatePhotoInput = {
  trip_id: string;
  storage_path: string;
  day_id?: string | null;
  activity_id?: string | null;
  caption?: string | null;
  taken_at?: string;
  width?: number;
  height?: number;
};

export type UpdatePhotoInput = {
  caption?: string | null;
  day_id?: string | null;
  activity_id?: string | null;
};

export class Media {
  constructor(private readonly db: SupabaseClient) {}

  async listByTrip(tripId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from(MediaTable.Photos)
      .select("*")
      .eq("trip_id", tripId)
      .order("taken_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async listByDay(dayId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from(MediaTable.Photos)
      .select("*")
      .eq("day_id", dayId)
      .order("taken_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async listByActivity(activityId: string): Promise<DalResult<DbPhoto[]>> {
    const { data, error } = await this.db
      .from(MediaTable.Photos)
      .select("*")
      .eq("activity_id", activityId)
      .order("taken_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto[], error: null };
  }

  async create(input: CreatePhotoInput): Promise<DalResult<DbPhoto>> {
    const { data, error } = await this.db
      .from(MediaTable.Photos)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto, error: null };
  }

  async update(id: string, input: UpdatePhotoInput): Promise<DalResult<DbPhoto>> {
    const { data, error } = await this.db
      .from(MediaTable.Photos)
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbPhoto, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(MediaTable.Photos).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
