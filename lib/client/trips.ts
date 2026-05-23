/**
 * lib/client/trips.ts — frontend client for trip endpoints.
 */
import type { TripSummary, TripSnapshot, DbTrip, MemberRole, InviteRole } from "@/lib/dal";
import type { HomeMeta } from "@/lib/trip-home/meta";
import type { TripMemberView, TripInviteView } from "@/lib/trip-members/types";
import { get, post, patch, del } from "./http";

export type CreateTripPayload = {
  title: string;
  subtitle?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string;
};

export type UpdateTripPayload = {
  title?: string;
  subtitle?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
  theme_tags?: string[];
  theme_description?: string | null;
};

export const trips = {
  /** GET /api/trips */
  list: () => get<TripSummary[]>("/api/trips"),

  /** GET /api/trips/[id] — full snapshot */
  get: (id: string) => get<TripSnapshot>(`/api/trips/${id}`),

  /** POST /api/trips */
  create: (payload: CreateTripPayload) => post<{ id: string }>("/api/trips", payload),

  /** PATCH /api/trips/[id] — edit trip fields (reconciles days on range change). */
  update: (id: string, payload: UpdateTripPayload) =>
    patch<DbTrip>(`/api/trips/${id}`, payload),

  /** GET /api/trips/[id]/home-meta — AI-resolved Trip Home content for a locale. */
  homeMeta: (id: string, locale: string) =>
    get<HomeMeta>(`/api/trips/${id}/home-meta?locale=${encodeURIComponent(locale)}`),

  // ── Members ──────────────────────────────────────────────────────

  /** GET /api/trips/[id]/members */
  members: (id: string) => get<TripMemberView[]>(`/api/trips/${id}/members`),

  /** PATCH /api/trips/[id]/members/[userId] */
  setMemberRole: (id: string, userId: string, role: MemberRole) =>
    patch<null>(`/api/trips/${id}/members/${userId}`, { role }),

  /** DELETE /api/trips/[id]/members/[userId] */
  removeMember: (id: string, userId: string) =>
    del<null>(`/api/trips/${id}/members/${userId}`),

  // ── Invites ──────────────────────────────────────────────────────

  /** GET /api/trips/[id]/invites */
  invites: (id: string) => get<TripInviteView[]>(`/api/trips/${id}/invites`),

  /** POST /api/trips/[id]/invites */
  createInvite: (id: string, payload: { email: string; role: InviteRole }) =>
    post<TripInviteView>(`/api/trips/${id}/invites`, payload),

  /** DELETE /api/trips/[id]/invites/[inviteId] */
  deleteInvite: (id: string, inviteId: string) =>
    del<null>(`/api/trips/${id}/invites/${inviteId}`),
};
