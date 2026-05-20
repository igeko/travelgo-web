/**
 * lib/client/feedback.ts — frontend client for tester notes.
 */
import { get, post, patch } from "./http";

export type SubmitNotePayload = {
  type: string;
  note: string;
  page_url?: string | null;
  trip_id?: string | null;
};

export const feedback = {
  /** POST /api/tester-notes — submit a note. */
  submit: (payload: SubmitNotePayload) => post<{ id: string }>("/api/tester-notes", payload),

  /** GET /api/tester-notes — list notes (own, or all for admins). */
  list: <T = unknown>() => get<T[]>("/api/tester-notes"),

  /** PATCH /api/tester-notes/[id] — edit note / status / fix_notes. */
  update: (id: string, body: Record<string, unknown>) =>
    patch<null>(`/api/tester-notes/${id}`, body),
};
