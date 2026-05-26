/**
 * lib/services/GoService.ts
 * ─────────────────────────────────────────────────────────────────
 * Go agent persistence: load/create the per-(trip,user) session, map the
 * stored conversation to/from the neutral LLM message shape, and persist a
 * turn (user message + everything the loop appended).
 *
 * Build with the RLS-scoped DAL (serverServices): the session and messages
 * are owned by the caller and gated by trip membership at the DB level.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, GoSessionRow, GoMessageRow, InsertGoMessage, UpdateGoSession } from "@/lib/dal";
import type { LlmMessage, LlmToolCall } from "@/lib/ai/llm";
import { unwrap } from "./util";

/** Stored row → neutral LLM message (rebuilds tool-call shapes). */
function rowToLlm(row: GoMessageRow): LlmMessage {
  if (row.role === "assistant" && row.tool_calls) {
    return { role: "assistant", content: row.content, toolCalls: row.tool_calls as LlmToolCall[] };
  }
  if (row.role === "tool") {
    return { role: "tool", content: row.content, toolCallId: row.tool_call_id ?? undefined, name: row.name ?? undefined };
  }
  return { role: row.role, content: row.content };
}

/** Neutral LLM message → insertable row (preserves tool calls / signatures). */
function llmToRow(session: GoSessionRow, m: LlmMessage): InsertGoMessage {
  return {
    session_id: session.id,
    trip_id: session.trip_id,
    role: m.role === "system" ? "user" : m.role, // system never persisted; guard for types
    content: m.content,
    tool_calls: m.toolCalls ?? null,
    tool_call_id: m.toolCallId ?? null,
    name: m.name ?? null,
  };
}

export class GoService {
  constructor(private readonly dal: Dal) {}

  /** The caller's session for this trip, creating it on first use. */
  async loadOrCreateSession(tripId: string, userId: string): Promise<GoSessionRow> {
    const existing = unwrap(await this.dal.go.getSession(tripId, userId));
    if (existing) return existing;
    return unwrap(await this.dal.go.createSession(tripId, userId));
  }

  /** Past conversation as neutral LLM messages (oldest→newest, capped). */
  async historyAsLlm(sessionId: string, limit = 40): Promise<LlmMessage[]> {
    const rows = unwrap(await this.dal.go.listMessages(sessionId, limit));
    return rows.map(rowToLlm);
  }

  /** Conversation for display: user + assistant turns with visible text only. */
  async displayTurns(sessionId: string, limit = 60): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const rows = unwrap(await this.dal.go.listMessages(sessionId, limit));
    return rows
      .filter((r) => (r.role === "user" || r.role === "assistant") && r.content.trim().length > 0)
      .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
  }

  /**
   * Persist a completed turn: the messages the loop appended (user message +
   * assistant/tool turns), then touch the session (updated_at, optional phase
   * / planning_state). The trip-context prefix is ephemeral and never stored.
   */
  async persistTurn(session: GoSessionRow, appended: LlmMessage[], patch?: UpdateGoSession): Promise<void> {
    const rows = appended.filter((m) => m.role !== "system").map((m) => llmToRow(session, m));
    unwrap(await this.dal.go.insertMessages(rows));
    unwrap(await this.dal.go.updateSession(session.id, patch ?? {}));
  }
}
