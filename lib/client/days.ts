/**
 * lib/client/days.ts — frontend client for day endpoints.
 */
import { patch } from "./http";

export const days = {
  /** PATCH /api/days/[dayId] — update day metadata. */
  update: (dayId: string, patchBody: Record<string, unknown>) =>
    patch<null>(`/api/days/${dayId}`, patchBody),
};
