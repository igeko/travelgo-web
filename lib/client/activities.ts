/**
 * lib/client/activities.ts — frontend client for the activity model
 * (entity + scheduled instance). Mirrors the canonical backend routes.
 */
import type { Activity, ActivitySearchResult } from "@/lib/dal";
import { get, post, patch, del, query } from "./http";

export const activities = {
  /** GET /api/days/[dayId]/activities — activities scheduled on a day. */
  listForDay: (dayId: string) => get<Activity[]>(`/api/days/${dayId}/activities`),

  /** POST /api/days/[dayId]/activities — create+schedule (or schedule an existing entity_id). */
  addToDay: (dayId: string, body: Record<string, unknown>) =>
    post<Activity>(`/api/days/${dayId}/activities`, body),

  /** POST /api/days/[dayId]/activities/organize — AI reorder. */
  organize: (dayId: string) => post<Activity[]>(`/api/days/${dayId}/activities/organize`),

  /** PATCH /api/scheduled-activities/[id] — instance/timeline fields. */
  updateInstance: (scheduledId: string, body: Record<string, unknown>) =>
    patch<null>(`/api/scheduled-activities/${scheduledId}`, body),

  /** DELETE /api/scheduled-activities/[id] — unschedule (entity kept). */
  removeFromDay: (scheduledId: string) => del<null>(`/api/scheduled-activities/${scheduledId}`),

  /** POST /api/scheduled-activities/[id]/move — one slot up/down (intra- o cross-day on border). */
  move: (scheduledId: string, direction: "up" | "down") =>
    post<null>(`/api/scheduled-activities/${scheduledId}/move`, { direction }),

  /** POST /api/scheduled-activities/[id]/move-to — drag&drop su posizione
   *  arbitraria (anche cross-day). `position` 0-based, clampato server-side. */
  moveTo: (scheduledId: string, dayId: string, position: number) =>
    post<null>(`/api/scheduled-activities/${scheduledId}/move-to`, { dayId, position }),

  /** PATCH /api/scheduled-activities/[id]/bridge — set a transport bridge. */
  setBridge: (scheduledId: string, direction: "in" | "out", bridge: Record<string, unknown> | null) =>
    patch<null>(`/api/scheduled-activities/${scheduledId}/bridge`, { direction, bridge }),

  /** PATCH /api/activities/[id] — entity-level fields. */
  updateEntity: (activityId: string, body: Record<string, unknown>) =>
    patch<Activity | null>(`/api/activities/${activityId}`, body),

  /** DELETE /api/activities/[id] — delete the entity (cascades scheduling). */
  deleteEntity: (activityId: string) => del<null>(`/api/activities/${activityId}`),

  /** GET /api/activities/search — wishlist + platform autocomplete. */
  search: (params: { tripId: string; dayId?: string | null; query?: string }) =>
    get<ActivitySearchResult>(
      `/api/activities/search${query({ trip_id: params.tripId, day_id: params.dayId, q: params.query })}`,
    ),
};
