/**
 * lib/client/go.ts — frontend client for the Go assistant.
 * chat/enrich are streaming: the method returns the live Response and
 * the caller reads the body stream (it still does not call fetch itself).
 */
import { requestRaw, stream } from "./http";

/** Structured editorial content for a Yume card (AI-generated). */
export type YumeCardData = {
  title: string;
  tagline: string;
  sections: { heading: string; body: string }[];
  highlights: string[];
};

export const go = {
  /** POST /api/go/chat → streaming Response. */
  chat: (body: Record<string, unknown>) => stream("POST", "/api/go/chat", body),

  /** POST /api/go/enrich → streaming Response. */
  enrich: (body: Record<string, unknown>) => stream("POST", "/api/go/enrich", body),

  /** POST /api/go/yume-card → structured editorial card (non-streaming JSON). */
  yumeCard: (body: Record<string, unknown>) =>
    requestRaw<YumeCardData>("POST", "/api/go/yume-card", body),

  /** POST /api/go → deprecated mock (dev only). */
  legacy: <T = unknown>(body: Record<string, unknown>) =>
    requestRaw<T>("POST", "/api/go", body),
};
