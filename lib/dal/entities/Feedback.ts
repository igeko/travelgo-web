/**
 * lib/dal/entities/Feedback.ts
 * ─────────────────────────────────────────────────────────────────
 * The Feedback entity — tester / QA notes (`tester_notes`).
 *
 * Read/write run with the service-role client after the route has
 * verified the caller's platform role, so build through `serviceDal()`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { FeedbackTable } from "../tables";
import { DalError, type DalResult } from "../types";

type Row = Record<string, unknown>;

export type CreateTesterNoteInput = {
  user_id: string;
  type: string;
  note: string;
  page_url: string | null;
  trip_id: string | null;
};

const LIST_SELECT =
  "id, type, note, fix_notes, page_url, trip_id, created_at, user_id, status";

export class Feedback {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: CreateTesterNoteInput): Promise<DalResult<{ id: string }>> {
    const { data, error } = await this.db
      .from(FeedbackTable.TesterNotes)
      .insert(input)
      .select("id")
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as { id: string }, error: null };
  }

  /** Notes visible to the viewer: own notes, or everything for admins. */
  async listForViewer(opts: {
    userId: string;
    isAdmin: boolean;
  }): Promise<DalResult<Row[]>> {
    let query = this.db
      .from(FeedbackTable.TesterNotes)
      .select(LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!opts.isAdmin) query = query.eq("user_id", opts.userId);

    const { data, error } = await query;
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data ?? []) as Row[], error: null };
  }

  async getAuthorId(id: string): Promise<string | null> {
    const { data } = await this.db
      .from(FeedbackTable.TesterNotes)
      .select("user_id")
      .eq("id", id)
      .single();
    return (data as { user_id: string } | null)?.user_id ?? null;
  }

  async update(id: string, patch: Row): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(FeedbackTable.TesterNotes)
      .update(patch)
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
