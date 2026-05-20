/**
 * lib/dal/entities/Journal.ts
 * ─────────────────────────────────────────────────────────────────
 * The Journal entity — all DB access for `journal_entries`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { JournalTable } from "../tables";
import { DalError, type DalResult, type DbJournalEntry } from "../types";

export type CreateJournalEntryInput = {
  trip_id: string;
  body: string;
  day_id?: string;
  activity_id?: string;
  mood?: string;
};

export type UpdateJournalEntryInput = {
  body?: string;
  mood?: string | null;
};

export class Journal {
  constructor(private readonly db: SupabaseClient) {}

  async listByTrip(tripId: string): Promise<DalResult<DbJournalEntry[]>> {
    const { data, error } = await this.db
      .from(JournalTable.Entries)
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbJournalEntry[], error: null };
  }

  async listByDay(dayId: string): Promise<DalResult<DbJournalEntry[]>> {
    const { data, error } = await this.db
      .from(JournalTable.Entries)
      .select("*")
      .eq("day_id", dayId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbJournalEntry[], error: null };
  }

  async findById(id: string): Promise<DalResult<DbJournalEntry>> {
    const { data, error } = await this.db
      .from(JournalTable.Entries)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbJournalEntry, error: null };
  }

  async create(input: CreateJournalEntryInput): Promise<DalResult<DbJournalEntry>> {
    const { data, error } = await this.db
      .from(JournalTable.Entries)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbJournalEntry, error: null };
  }

  async update(
    id: string,
    input: UpdateJournalEntryInput,
  ): Promise<DalResult<DbJournalEntry>> {
    const { data, error } = await this.db
      .from(JournalTable.Entries)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbJournalEntry, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(JournalTable.Entries).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
