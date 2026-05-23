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

import type { Dal, DbActivity, ActivityVisibility, ActivitySearchResult } from "@/lib/dal";
import { notFound, badRequest, unauthorized } from "@/lib/api/errors";
import { pickFields, isUuid, safeHttpUrl } from "@/lib/api/validation";
import { DEFAULT_PAGE_SIZE, type Page } from "@/lib/pagination";
import { resolveWidget } from "@/lib/yumeji/select";
import type { YumejiCatalog, YumejiWidgetSpec } from "@/lib/yumeji/types";
import { unwrap } from "./util";

/**
 * Upper bound on the catalog working set. The Yumeji page derives every widget
 * from this single bounded load, so a collection of thousands never lands in
 * memory whole — widgets show capped previews and drill down on demand.
 */
const CATALOG_WORKING_SET = 300;

/** Entity fields a caller may set on an activity (create). */
const ENTITY_FIELDS = [
  "short_desc", "details", "category", "icon",
  "location", "location_place_id", "location_lat", "location_lng",
  "hero_image", "url",
  "booking", "budget_amount", "budget_currency", "budget_paid", "budget_category", "notes",
] as const;

/** Updatable entity fields (title included). */
const ENTITY_PATCH_FIELDS = ["title", ...ENTITY_FIELDS] as const;

const URL_FIELDS = new Set(["url", "hero_image"]);

function validateUrls(patch: Record<string, unknown>): void {
  for (const key of URL_FIELDS) {
    const value = patch[key];
    if (key in patch && value != null && value !== "") {
      const safe = safeHttpUrl(value);
      if (!safe) throw badRequest(`Invalid URL in ${key}`);
      patch[key] = safe;
    }
  }
}

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
    opts?: {
      visibility?: ActivityVisibility;
      limit?: number;
      offset?: number;
      search?: string;
      /** Trip context for the scheduled filter — "scheduled" means "on a day of this trip". */
      tripId?: string;
      /** true → only scheduled in `tripId`; false → only not scheduled there; undefined → all. */
      scheduled?: boolean;
    },
  ): Promise<Page<Yume>> {
    const userId = await this.currentUserId();
    const limit = opts?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = opts?.offset ?? 0;

    // Scheduled / to-plan filter (server-side, scoped to the current trip).
    let idFilter: { ids: string[]; mode: "in" | "out" } | undefined;
    if (opts?.scheduled != null && opts.tripId) {
      const scheduledIds = await this.dal.activities.scheduledIdsInTrip(opts.tripId);
      idFilter = { ids: scheduledIds, mode: opts.scheduled ? "in" : "out" };
    }

    // Fetch one extra row to detect whether a further page exists.
    const rows = unwrap(
      await this.dal.activities.listOwnedBy(userId, {
        visibility: opts?.visibility,
        offset,
        limit: limit + 1,
        search: opts?.search,
        idFilter,
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

  /**
   * Build the Yumeji catalog: one bounded load of the user's collection, then
   * each manifest widget derives its slice in memory (see lib/yumeji/select).
   * No per-widget query, no full-collection fetch.
   */
  async buildCatalog(specs: YumejiWidgetSpec[]): Promise<YumejiCatalog> {
    const userId = await this.currentUserId();
    const workingSet = unwrap(
      await this.dal.activities.listOwnedBy(userId, { limit: CATALOG_WORKING_SET }),
    );
    return {
      widgets: specs.map((spec) => resolveWidget(spec, workingSet)),
      isEmpty: workingSet.length === 0,
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

  /**
   * Create an activity owned by the current user (defaults private).
   * Punto unico di creazione dell'entity: lo usa anche lo Scheduler quando si
   * aggiunge a un giorno un'attività nuova.
   */
  async create(body: Record<string, unknown>): Promise<DbActivity> {
    const userId = await this.currentUserId();
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "New yume";
    const visibility = parseVisibility(body.visibility) ?? undefined;
    const patch = pickFields(body, ENTITY_FIELDS);
    validateUrls(patch);

    return unwrap(
      await this.dal.activities.create({ created_by: userId, title, visibility, ...patch }),
    );
  }

  /** Update entity-level fields (shared across every day the activity appears on). */
  async update(id: string, body: Record<string, unknown>): Promise<DbActivity> {
    const patch = pickFields(body, ENTITY_PATCH_FIELDS);
    validateUrls(patch);
    if (Object.keys(patch).length === 0) throw badRequest("No valid fields to update");
    return unwrap(await this.dal.activities.update(id, patch));
  }

  /** Remove an activity entity (owner-only; enforced by the route guard + RLS). */
  async remove(id: string): Promise<void> {
    unwrap(await this.dal.activities.delete(id));
  }

  /** Wishlist + platform autocomplete search over the activity entities. */
  search(input: { tripId: string; dayId?: string | null; query?: string }): Promise<ActivitySearchResult> {
    return this.dal.activities.search(input);
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
