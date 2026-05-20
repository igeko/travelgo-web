/**
 * lib/client/ai.ts — frontend client for the OpenAI proxy (non-streaming).
 */
import { requestRaw } from "./http";

export const ai = {
  /** POST /api/ai/describe → { description }. */
  describe: (body: Record<string, unknown>) =>
    requestRaw<{ description?: string }>("POST", "/api/ai/describe", body),

  /** POST /api/ai/describe-day → DayNarrative. */
  describeDay: <T = unknown>(body: Record<string, unknown>) =>
    requestRaw<T>("POST", "/api/ai/describe-day", body),

  /** POST /api/ai/chat → assistant turn (tool-calling). */
  chat: <T = unknown>(messages: unknown[]) =>
    requestRaw<T>("POST", "/api/ai/chat", { messages }),
};
