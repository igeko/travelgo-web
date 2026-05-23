/**
 * lib/services/YumeService.ts
 * ─────────────────────────────────────────────────────────────────
 * The single backend orchestration layer for "yume".
 *
 * A yume IS an activity owned by a user (`activities.created_by`) — there is
 * no separate table. This service exposes the user-facing operations over
 * that model: list my collection, create, remove, change visibility, and
 * share/unshare with a trip (via `activity_shares`).
 *
 * Authorization is enforced upstream by the route guards (requireUser /
 * requireActivityOwner) and by RLS; this layer holds the policy/shape.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal, DbActivity, ActivityVisibility } from "@/lib/dal";
import { notFound, badRequest, unauthorized } from "@/lib/api/errors";
import { pickFields, isUuid } from "@/lib/api/validation";
import { DEFAULT_PAGE_SIZE, type Page } from "@/lib/pagination";
import { unwrap } from "./util";

/** Entity fields a caller may set when creating a yume. */
const YUME_CREATE_FIELDS = [
  "short_desc", "details", "category", "icon",
  "location", "location_place_id", "location_lat", "location_lng",
  "hero_image", "url",
] as const;

const VISIBILITIES: readonly ActivityVisibility[] = ["public", "private", "shared"];

/** Profilo del creatore allegato a uno yume (utile per la vista "condivisi da altri"). */
export type YumeCreator = { id: string; displayName: string | null; avatarUrl: string | null };

/** A yume = an activity plus the trips it is shared with and its creator profile. */
export type Yume = DbActivity & { shared_trip_ids: string[]; owner: YumeCreator | null };

function parseVisibility(value: unknown): ActivityVisibility | null {
  return typeof value === "string" && (VISIBILITIES as readonly string[]).includes(value)
    ? (value as ActivityVisibility)
    : null;
}

export class YumeService {
  constructor(private readonly dal: Dal) {}

  private async currentUserId(): Promise<string> {
    const { data: user } = await this.dal.users.getCurrentUser();
    if (!user) throw unauthorized();
    return user.id;
  }

  /** Risolve i profili dei creatori (per `created_by`) di un set di activity. */
  private async ownersByCreator(items: DbActivity[]): Promise<Map<string, YumeCreator>> {
    const ids = [...new Set(items.map((i) => i.created_by).filter((x): x is string => !!x))];
    const map = new Map<string, YumeCreator>();
    if (ids.length === 0) return map;
    const profiles = unwrap(await this.dal.users.getProfiles(ids));
    for (const p of profiles) {
      map.set(p.id, { id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url });
    }
    return map;
  }

  /** A page of the current user's yume collection (their activities), optionally filtered. */
  async listMine(
    opts?: { visibility?: ActivityVisibility; limit?: number; offset?: number; search?: string },
  ): Promise<Page<Yume>> {
    const userId = await this.currentUserId();
    const limit = opts?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = opts?.offset ?? 0;

    // Fetch one extra row to detect whether a further page exists.
    const rows = unwrap(
      await this.dal.activities.listOwnedBy(userId, {
        visibility: opts?.visibility,
        offset,
        limit: limit + 1,
        search: opts?.search,
      }),
    );
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const shares = await this.dal.activities.listSharesByActivityIds(items.map((a) => a.id));
    const byActivity = new Map<string, string[]>();
    for (const s of shares) {
      const list = byActivity.get(s.activity_id) ?? [];
      list.push(s.trip_id);
      byActivity.set(s.activity_id, list);
    }

    const owners = await this.ownersByCreator(items);

    return {
      items: items.map((a) => ({
        ...a,
        shared_trip_ids: byActivity.get(a.id) ?? [],
        owner: a.created_by ? owners.get(a.created_by) ?? null : null,
      })),
      hasMore,
    };
  }

  /** A single yume by id (RLS enforces visibility). */
  async get(id: string): Promise<Yume> {
    const entity = unwrap(await this.dal.activities.findById(id));
    if (!entity) throw notFound("Yume not found");
    const shared_trip_ids = await this.dal.activities.listShareTripIds(id);
    const owners = await this.ownersByCreator([entity]);
    return {
      ...entity,
      shared_trip_ids,
      owner: entity.created_by ? owners.get(entity.created_by) ?? null : null,
    };
  }

  /** Create a yume (an activity owned by the current user). Defaults private. */
  async create(body: Record<string, unknown>): Promise<DbActivity> {
    const userId = await this.currentUserId();
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "New yume";
    const visibility = parseVisibility(body.visibility) ?? undefined;
    const patch = pickFields(body, YUME_CREATE_FIELDS);

    return unwrap(
      await this.dal.activities.create({ created_by: userId, title, visibility, ...patch }),
    );
  }

  /** Remove a yume entity (owner-only; enforced by the route guard + RLS). */
  async remove(id: string): Promise<void> {
    unwrap(await this.dal.activities.delete(id));
  }

  /** Change a yume's visibility. */
  async setVisibility(id: string, visibility: unknown): Promise<DbActivity> {
    const v = parseVisibility(visibility);
    if (!v) throw badRequest("Invalid visibility");
    return unwrap(await this.dal.activities.update(id, { visibility: v }));
  }

  /** Share a yume with a trip (makes it visible to that trip's members). */
  async shareToTrip(id: string, tripId: unknown): Promise<void> {
    if (!isUuid(tripId)) throw badRequest("Invalid trip id");
    unwrap(await this.dal.activities.addShare(id, tripId));
  }

  /** Stop sharing a yume with a trip. */
  async unshareFromTrip(id: string, tripId: string): Promise<void> {
    if (!isUuid(tripId)) throw badRequest("Invalid trip id");
    unwrap(await this.dal.activities.removeShare(id, tripId));
  }
}
