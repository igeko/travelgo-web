/**
 * lib/client/yumes.ts — the single frontend interface to the yume backend.
 * A yume is an activity owned by the current user; these mirror /api/yumes.
 */
import type { DbActivity, ActivityVisibility } from "@/lib/dal";
import { get, post, patch, del, query } from "./http";

/** A yume = an activity plus the trips it is explicitly shared with. */
export type Yume = DbActivity & { shared_trip_ids: string[] };

export const yumes = {
  /** GET /api/yumes — my collection (optionally filtered by visibility). */
  list: (params?: { visibility?: ActivityVisibility }) =>
    get<Yume[]>(`/api/yumes${query({ visibility: params?.visibility })}`),

  /** GET /api/yumes/[id] — a single yume (visibility enforced server-side). */
  get: (id: string) => get<Yume>(`/api/yumes/${id}`),

  /** POST /api/yumes — create a yume (defaults to private). */
  create: (body: Record<string, unknown>) => post<DbActivity>(`/api/yumes`, body),

  /** DELETE /api/yumes/[id] — remove the yume (owner only). */
  remove: (id: string) => del<null>(`/api/yumes/${id}`),

  /** PATCH /api/yumes/[id] — change visibility (owner only). */
  setVisibility: (id: string, visibility: ActivityVisibility) =>
    patch<DbActivity>(`/api/yumes/${id}`, { visibility }),

  /** POST /api/yumes/[id]/shares — share with a trip (owner only). */
  shareToTrip: (id: string, tripId: string) =>
    post<null>(`/api/yumes/${id}/shares`, { trip_id: tripId }),

  /** DELETE /api/yumes/[id]/shares/[tripId] — stop sharing with a trip. */
  unshareFromTrip: (id: string, tripId: string) =>
    del<null>(`/api/yumes/${id}/shares/${tripId}`),
};
