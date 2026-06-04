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

/**
 * Drop orphan `tool` messages and dangling `assistant(tool_calls)` so the
 * replayed history is always a valid tool sequence. The providers reject a
 * `tool` turn that doesn't directly answer a preceding `assistant` tool_calls
 * turn — which can happen if a turn's rows were persisted with the same
 * timestamp and read back out of order. Keep an assistant+tools group only when
 * every tool_call has its matching result right after it.
 */
function sanitizeToolSequence(msgs: LlmMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  let i = 0;
  while (i < msgs.length) {
    const m = msgs[i];
    if (m.role === "tool") { i++; continue; } // orphan (not consumed below) → drop
    if (m.role === "assistant" && m.toolCalls?.length) {
      const ids = new Set(m.toolCalls.map((c) => c.id));
      const tools: LlmMessage[] = [];
      let j = i + 1;
      while (j < msgs.length) {
        const t = msgs[j];
        if (t.role !== "tool" || !t.toolCallId || !ids.has(t.toolCallId)) break;
        tools.push(t);
        j++;
      }
      if (tools.length === ids.size) out.push(m, ...tools);
      else if (m.content) out.push({ ...m, toolCalls: undefined }); // incomplete → keep as plain text
      i = j;
      continue;
    }
    out.push(m);
    i++;
  }
  return out;
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

/**
 * Legacy: confirm applies used to persist an assistant note like
 * "✓ Modifica applicata (confermata dall'utente): …". We stopped doing that
 * (it leaked into the model's narration and the transcript), but old sessions
 * still carry these rows — filter them out of both the replay and the display.
 */
const LEGACY_APPLIED_NOTE = "✓ Modifica applicata";
const isLegacyNote = (m: { content: string }) => m.content.startsWith(LEGACY_APPLIED_NOTE);

/** A confirm-gated proposal, as stored/replayed for the UI (never sent to the model). */
export type GoPendingActionShape = { name: string; arguments: Record<string, unknown>; summary: string };

/** One turn for the UI: visible text + optional proposed actions (widgets). */
export type GoDisplayTurn = { role: "user" | "assistant"; content: string; pending?: GoPendingActionShape[] };

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
    const msgs = sanitizeToolSequence(rows.map(rowToLlm).filter((m) => !isLegacyNote(m)));
    // The cap is a sliding window that can start mid tool-sequence: a `tool`
    // message orphaned from its assistant(tool_calls), or an assistant
    // functionCall whose user turn was cut off. Both break the providers —
    // OpenAI rejects an orphan tool message; Gemini requires a functionCall
    // turn to follow a user/functionResponse turn. The replayed history must
    // therefore begin with a `user` turn, so drop any leading non-user rows.
    let start = 0;
    while (start < msgs.length && msgs[start].role !== "user") start++;
    return start === 0 ? msgs : msgs.slice(start);
  }

  /**
   * Conversation for display: user + assistant turns with visible text, plus
   * the confirm-gated proposals (pending_actions) so the in-chat widgets/cards
   * can be rehydrated on reload.
   */
  async displayTurns(sessionId: string, limit = 60): Promise<GoDisplayTurn[]> {
    const rows = unwrap(await this.dal.go.listMessages(sessionId, limit));
    return rows
      .filter(
        (r) =>
          (r.role === "user" || r.role === "assistant") &&
          (r.content.trim().length > 0 || r.pending_actions != null) &&
          !isLegacyNote(r),
      )
      .map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content,
        pending: (r.pending_actions as GoPendingActionShape[] | null) ?? undefined,
      }));
  }

  /**
   * Persist a completed turn: the messages the loop appended (user message +
   * assistant/tool turns), then touch the session (updated_at, optional phase
   * / planning_state). The trip-context prefix is ephemeral and never stored.
   * `pendingActions`, when present, are attached to the turn's last assistant
   * message (the proposal) for UI rehydration — they never feed the model.
   */
  async persistTurn(
    session: GoSessionRow,
    appended: LlmMessage[],
    opts?: { pendingActions?: unknown[]; patch?: UpdateGoSession },
  ): Promise<void> {
    const rows = appended.filter((m) => m.role !== "system").map((m) => llmToRow(session, m));
    if (opts?.pendingActions?.length) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].role === "assistant") {
          rows[i].pending_actions = opts.pendingActions;
          break;
        }
      }
    }
    unwrap(await this.dal.go.insertMessages(rows));
    unwrap(await this.dal.go.updateSession(session.id, opts?.patch ?? {}));
  }
}
