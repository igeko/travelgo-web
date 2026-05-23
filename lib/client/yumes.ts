/**
 * lib/client/yumes.ts — the single frontend interface to the yume backend.
 * A yume is an activity owned by the current user; these mirror /api/yumes.
 */
import type { DbActivity, ActivityVisibility } from "@/lib/dal";
import type { Page } from "@/lib/pagination";
import { get, post, patch, del, query } from "./http";

/** Creator profile attached to a yume (mirrors YumeService.YumeCreator). */
export type YumeCreator = { id: string; displayName: string | null; avatarUrl: string | null };

/** A yume = an activity plus the trips it is shared with and its creator profile. */
export type Yume = DbActivity & { shared_trip_ids: string[]; owner: YumeCreator | null };

export const yumes = {
  /** GET /api/yumes — a page of my collection (filter by visibility, free-text q). */
  list: (params?: { visibility?: ActivityVisibility; q?: string; limit?: number; offset?: number }) =>
    get<Page<Yume>>(
      `/api/yumes${query({
        visibility: params?.visibility,
        q: params?.q,
        limit: params?.limit,
        offset: params?.offset,
      })}`,
    ),

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
