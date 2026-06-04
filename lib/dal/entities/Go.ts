/**
 * lib/dal/entities/Go.ts
 * ─────────────────────────────────────────────────────────────────
 * The Go entity — agent persistence: one planning session per
 * (trip, user) plus its conversation thread.
 *
 * Built via `serverDal()` so RLS applies: a user only ever sees and
 * writes their own session/messages, and only for trips they belong to.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { GoTable } from "../tables";
import { DalError, type DalResult } from "../types";

export type GoMessageRole = "user" | "assistant" | "tool";

export type GoSessionRow = {
  id: string;
  trip_id: string;
  user_id: string;
  phase: string;
  planning_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GoMessageRow = {
  id: string;
  session_id: string;
  trip_id: string;
  role: GoMessageRole;
  content: string;
  tool_calls: unknown | null;
  tool_call_id: string | null;
  name: string | null;
  /** UI-only: confirm-gated writes proposed on this turn (for reload). */
  pending_actions: unknown | null;
  created_at: string;
};

/** A message ready to insert (session_id + trip_id supplied by the service). */
export type InsertGoMessage = {
  session_id: string;
  trip_id: string;
  role: GoMessageRole;
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string | null;
  name?: string | null;
  pending_actions?: unknown;
};

export type UpdateGoSession = {
  phase?: string;
  planning_state?: Record<string, unknown>;
};

const SESSION_SELECT = "id, trip_id, user_id, phase, planning_state, created_at, updated_at";
const MESSAGE_SELECT = "id, session_id, trip_id, role, content, tool_calls, tool_call_id, name, pending_actions, created_at";

export class Go {
  constructor(private readonly db: SupabaseClient) {}

  /** The caller's session for a trip, or null if none exists yet. */
  async getSession(tripId: string, userId: string): Promise<DalResult<GoSessionRow | null>> {
    const { data, error } = await this.db
      .from(GoTable.Sessions)
      .select(SESSION_SELECT)
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data as GoSessionRow | null) ?? null, error: null };
  }

  async createSession(tripId: string, userId: string): Promise<DalResult<GoSessionRow>> {
    const { data, error } = await this.db
      .from(GoTable.Sessions)
      .insert({ trip_id: tripId, user_id: userId })
      .select(SESSION_SELECT)
      .single();
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as GoSessionRow, error: null };
  }

  async updateSession(id: string, patch: UpdateGoSession): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(GoTable.Sessions)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** The most recent `limit` messages, returned oldest→newest. */
  async listMessages(sessionId: string, limit = 40): Promise<DalResult<GoMessageRow[]>> {
    // Take the newest `limit` rows (DESC + limit), then flip to chronological.
    // ASC + limit would freeze on the OLDEST messages once a session grows.
    const { data, error } = await this.db
      .from(GoTable.Messages)
      .select(MESSAGE_SELECT)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: ((data ?? []) as GoMessageRow[]).reverse(), error: null };
  }

  async insertMessages(rows: InsertGoMessage[]): Promise<DalResult<true>> {
    if (rows.length === 0) return { data: true, error: null };
    // Stamp a strictly increasing created_at per row so a turn's messages keep
    // their insertion order on read. A single INSERT shares one statement
    // timestamp, which sorts ambiguously and can place a `tool` row before its
    // `assistant(tool_calls)` — an orphan the LLM providers reject.
    const base = Date.now();
    const stamped = rows.map((r, i) => ({ ...r, created_at: new Date(base + i).toISOString() }));
    const { error } = await this.db.from(GoTable.Messages).insert(stamped);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
