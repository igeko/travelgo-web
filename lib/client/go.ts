/**
 * lib/client/go.ts — frontend client for the Go assistant.
 * chat/enrich are streaming: the method returns the live Response and
 * the caller reads the body stream (it still does not call fetch itself).
 */
import { request, requestRaw, stream } from "./http";

/** Structured editorial content for a Yume card (AI-generated). */
export type YumeCardData = {
  title: string;
  tagline: string;
  sections: { heading: string; body: string }[];
  highlights: string[];
};

/** A write Go proposed but the user must confirm before it runs. */
export type GoPendingAction = { name: string; arguments: Record<string, unknown>; summary: string };

/** Result of one Go agent turn (/api/go/agent). */
export type GoAgentResult = {
  text: string;
  steps: { tool: string; args: unknown; result: unknown }[];
  pendingActions?: GoPendingAction[];
  sessionId: string;
  provider: string;
  model: string;
  iterations: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** Present when called with debug:true — system prompt + messages sent. */
  _debug?: {
    systemPrompt?: string;
    sentMessages?: { role: string; content: string }[];
    steps?: { tool: string; args: unknown; result: unknown }[];
  };
};

export const go = {
  /** POST /api/go/chat → streaming Response. */
  chat: (body: Record<string, unknown>) => stream("POST", "/api/go/chat", body),

  /** POST /api/go/agent → one agent turn (enveloped JSON, unwrapped to data). */
  agent: (body: { tripId: string; message: string; tripContext?: string; debug?: boolean }) =>
    request<GoAgentResult>("POST", "/api/go/agent", body),

  /** POST /api/go/deep-dive → structured extra info for a place (raw JSON). */
  deepDive: (body: { title: string; category?: string; location?: string; why?: string; tripContext?: string }) =>
    requestRaw<{ overview: string; tips: string[]; bestFor: string; avoid: string | null; nearbyIdeas: string[] }>(
      "POST",
      "/api/go/deep-dive",
      body,
    ),

  /** POST /api/go/agent (confirm) → apply a proposed write the user confirmed. */
  agentApply: (tripId: string, action: { name: string; arguments: Record<string, unknown> }) =>
    request<{ applied: boolean; result: unknown }>("POST", "/api/go/agent", { tripId, confirm: action }),

  /** GET /api/go/agent?tripId=… → saved conversation (reload recovery). */
  agentHistory: (tripId: string) =>
    request<{ sessionId: string; turns: { role: "user" | "assistant"; content: string }[] }>(
      "GET",
      `/api/go/agent?tripId=${encodeURIComponent(tripId)}`,
    ),

  /** POST /api/go/enrich → streaming Response. */
  enrich: (body: Record<string, unknown>) => stream("POST", "/api/go/enrich", body),

  /** POST /api/go/yume-card → structured editorial card (non-streaming JSON). */
  yumeCard: (body: Record<string, unknown>) =>
    requestRaw<YumeCardData>("POST", "/api/go/yume-card", body),

  /** POST /api/go → deprecated mock (dev only). */
  legacy: <T = unknown>(body: Record<string, unknown>) =>
    requestRaw<T>("POST", "/api/go", body),
};
