/**
 * app/api/go/agent/_tools.ts
 * ─────────────────────────────────────────────────────────────────
 * Go agent tool catalog (Step A). Each tool is a thin wrapper over a
 * service — it never touches the DB directly and runs under the caller's
 * RLS (serverServices uses the request session). `tripId` always comes
 * from the authorized request context, never from the model's arguments.
 *
 * Step A ships a single read-only tool (`getTripState`) to validate the
 * agent loop end-to-end. Write tools land in Step C.
 * ─────────────────────────────────────────────────────────────────
 */

import type { LlmTool } from "@/lib/ai/llm";
import { serverServices, type UpdateTripPatch } from "@/lib/services";
import { badRequest } from "@/lib/api/errors";
import { searchEnrichedPlace } from "@/lib/maps/places";

export type ToolContext = { tripId: string };
export type ToolRunner = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
/** Resolves whether a proposed call must be confirmed. May depend on the
 *  current trip state, so it can be async. */
export type ConfirmPredicate = (args: Record<string, unknown>, ctx: ToolContext) => boolean | Promise<boolean>;
export type GoTool = {
  def: LlmTool;
  run: ToolRunner;
  /** When truthy, the loop does NOT execute the call — it returns it as a
   *  pending action for the user to confirm in the UI. A function lets a tool
   *  decide per-call (e.g. setTripMeta gates only when overwriting existing
   *  data, and applies freely when filling blanks). */
  requiresConfirm?: boolean | ConfirmPredicate;
  /** Human-readable summary of the proposed change, shown in the confirm card. */
  summary?: (args: Record<string, unknown>) => string;
};

/** Resolve a tool's `requiresConfirm` (static boolean or per-call predicate). */
export async function toolNeedsConfirm(tool: GoTool, args: Record<string, unknown>, ctx: ToolContext): Promise<boolean> {
  const rc = tool.requiresConfirm;
  return typeof rc === "function" ? rc(args, ctx) : Boolean(rc);
}

const getTripState: GoTool = {
  def: {
    name: "getTripState",
    description:
      "Returns the current trip state: title, dates and the list of days — each with its city/zone, focus and ALL the activities already planned (id, title, slot, time). Use it when you need to know what the trip looks like right now — so you don't re-propose activities that already exist — before proposing or changing anything. Each activity's `id` is the handle to edit it with updateActivities.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  run: async (_args, ctx) => {
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    return {
      title: snap.trip.title,
      startDate: snap.trip.start_date,
      endDate: snap.trip.end_date,
      dayCount: snap.days.length,
      days: snap.days.map((d) => ({
        n: d.day_number,
        date: d.date,
        city: d.city,
        label: d.label,
        activityCount: d.activities.length,
        activities: d.activities.map((a) => ({
          id: a.id,
          title: a.title,
          slot: a.slot,
          time: a.time,
        })),
      })),
    };
  },
};

const setTripMeta: GoTool = {
  def: {
    name: "setTripMeta",
    description:
      "Set or update the trip's base facts. Pass only the fields you want to change. " +
      "Days are generated automatically from the date range.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Trip name, can be evocative (e.g. 'Norway with the family')." },
        destination: { type: "string", description: "Place/destination, concise (e.g. 'Norway', 'Japan · Tokyo + Kyoto'). Distinct from the name." },
        startDate: { type: "string", description: "Start date YYYY-MM-DD (future). ALWAYS pass it together with endDate." },
        endDate: { type: "string", description: "End date YYYY-MM-DD (future). ALWAYS pass it together with startDate, otherwise the days are not generated." },
        adults: { type: "integer", description: "Number of adults travelling. Use this for the travel companions (e.g. a couple → 2)." },
        children: { type: "integer", description: "Number of children travelling." },
        themeTags: { type: "array", items: { type: "string" }, description: "Style/interests only (e.g. ['food','nature']). NEVER dates or travelers." },
        themeDescription: { type: "string", description: "Free description of the trip's style. NEVER dates or travelers." },
      },
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const patch: UpdateTripPatch = {};
    if (typeof args.title === "string") patch.title = args.title;
    if (typeof args.destination === "string") patch.destination = args.destination;
    if (typeof args.startDate === "string") patch.start_date = args.startDate;
    if (typeof args.endDate === "string") patch.end_date = args.endDate;
    if (typeof args.adults === "number") patch.adults_count = args.adults;
    if (typeof args.children === "number") patch.children_count = args.children;
    if (Array.isArray(args.themeTags)) patch.theme_tags = args.themeTags.filter((t): t is string => typeof t === "string");
    if (typeof args.themeDescription === "string") patch.theme_description = args.themeDescription;

    const services = await serverServices();
    const trip = await services.trips.update(ctx.tripId, patch);
    return {
      ok: true,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      adults: trip.adults_count,
      children: trip.children_count,
    };
  },
  // Not confirm-gated: trip meta (name, destination, dates, travelers, theme)
  // is plain text that doesn't need a widget. The agent applies it directly and
  // tells the user in words — including when it changes an existing value.
};

const setItinerary: GoTool = {
  def: {
    name: "setItinerary",
    description:
      "Define the trip's legs by assigning a city/zone to days. Each leg covers a day range (startDay..endDay, 1-based, inclusive) and writes the zone to every day it covers. Use it to populate the skeleton once the dates are set.",
    parameters: {
      type: "object",
      properties: {
        legs: {
          type: "array",
          description: "The legs, in chronological order.",
          items: {
            type: "object",
            properties: {
              startDay: { type: "integer", description: "First day of the leg (1 = first day of the trip)." },
              endDay: { type: "integer", description: "Last day of the leg, inclusive. Equal to startDay for a single-day leg." },
              place: { type: "string", description: "City or zone of the leg (e.g. 'Tokyo', 'Hakone')." },
              focus: { type: "string", description: "Short focus for the first day of the leg (optional, e.g. 'Asakusa · Senso-ji'). Do NOT use it for single events like flights or transfers." },
            },
            required: ["startDay", "endDay", "place"],
            additionalProperties: false,
          },
        },
      },
      required: ["legs"],
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const legs = Array.isArray(args.legs) ? args.legs : [];
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    const idByNumber = new Map(snap.days.map((d) => [d.day_number, d.id]));

    let daysUpdated = 0;
    const applied: { day: number; place: string }[] = [];
    for (const raw of legs) {
      if (typeof raw !== "object" || raw === null) continue;
      const leg = raw as Record<string, unknown>;
      const start = typeof leg.startDay === "number" ? leg.startDay : NaN;
      const end = typeof leg.endDay === "number" ? leg.endDay : start;
      const place = typeof leg.place === "string" ? leg.place.trim() : "";
      const focus = typeof leg.focus === "string" ? leg.focus.trim() || null : null;
      if (!place || !Number.isFinite(start)) continue;
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let n = lo; n <= hi; n++) {
        const dayId = idByNumber.get(n);
        if (!dayId) continue;
        // The zone (city) covers every day of the leg, but the focus note is
        // day-specific — apply it only to the first day so it doesn't bleed
        // identically across the whole range.
        await services.trips.updateDay(dayId, { city: place, label: n === lo ? focus : null });
        daysUpdated++;
        applied.push({ day: n, place });
      }
    }
    return { ok: true, daysUpdated, applied };
  },
  requiresConfirm: true,
  summary: (args) => {
    const legs = Array.isArray(args.legs) ? (args.legs as Record<string, unknown>[]) : [];
    const parts = legs.map((l) => {
      const s = Number(l.startDay);
      const e = Number(l.endDay ?? l.startDay);
      const place = typeof l.place === "string" ? l.place : "?";
      return e > s ? `${place} (days ${s}–${e})` : `${place} (day ${s})`;
    });
    return `Legs: ${parts.join(", ")}`;
  },
};

const addActivities: GoTool = {
  def: {
    name: "addActivities",
    description:
      "Add activities to the trip's days. Use it to populate days with a few focused activities per slot, after the legs are defined. Don't overfill: 1-3 key things per day.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "The activities to add.",
          items: {
            type: "object",
            properties: {
              day: { type: "integer", description: "Day number (1 = first day of the trip)." },
              title: { type: "string", description: "Activity name (e.g. 'Senso-ji at sunset')." },
              slot: { type: "string", enum: ["morning", "afternoon", "evening", "night"], description: "Time slot." },
              time: { type: "string", description: "Time in HH:MM format (optional)." },
              category: { type: "string", enum: ["culture", "food", "nature", "experience", "transport", "stay"], description: "Category (optional)." },
              description: { type: "string", description: "Short description / why (optional)." },
            },
            required: ["day", "title", "slot"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const items = Array.isArray(args.items) ? args.items : [];
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    const idByNumber = new Map(snap.days.map((d) => [d.day_number, d.id]));
    const cityByNumber = new Map(snap.days.map((d) => [d.day_number, d.city]));
    const destination = snap.trip.destination ?? null;

    // Collect the valid items first, then geocode them all in parallel — every
    // activity carries its coordinates so it can be placed on the map. The
    // day's city (or the trip destination) disambiguates the place lookup.
    const valid: { it: Record<string, unknown>; day: number; title: string; dayId: string }[] = [];
    for (const raw of items) {
      if (typeof raw !== "object" || raw === null) continue;
      const it = raw as Record<string, unknown>;
      const day = typeof it.day === "number" ? it.day : NaN;
      const title = typeof it.title === "string" ? it.title.trim() : "";
      const dayId = idByNumber.get(day);
      if (!dayId || !title) continue;
      valid.push({ it, day, title, dayId });
    }

    const places = await Promise.all(
      valid.map(({ title, day }) => {
        const hint = cityByNumber.get(day) || destination || "";
        return searchEnrichedPlace(hint ? `${title}, ${hint}` : title);
      }),
    );

    let added = 0;
    const result: { day: number; title: string }[] = [];
    for (let k = 0; k < valid.length; k++) {
      const { it, day, title, dayId } = valid[k];
      const place = places[k];
      await services.trips.schedule(dayId, {
        title,
        short_desc: typeof it.description === "string" ? it.description : undefined,
        category: typeof it.category === "string" ? it.category : undefined,
        slot: typeof it.slot === "string" ? it.slot : undefined,
        time: typeof it.time === "string" ? it.time : undefined,
        // Geocoded location (best-effort) → puts the activity on the map, and
        // the first Google Places photo as its hero image.
        ...(place
          ? {
              location: place.address || place.name || undefined,
              location_place_id: place.placeId,
              location_lat: place.lat,
              location_lng: place.lng,
              ...(place.photoRefs[0]
                ? { hero_image: `/api/places/photo?ref=${encodeURIComponent(place.photoRefs[0])}&maxwidth=800` }
                : {}),
            }
          : {}),
      });
      added++;
      result.push({ day, title });
    }
    return { ok: true, added, items: result };
  },
  requiresConfirm: true,
  summary: (args) => {
    const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
    const parts = items.slice(0, 8).map((i) => `${typeof i.title === "string" ? i.title : "?"} (d${Number(i.day)})`);
    const more = items.length > 8 ? ` +${items.length - 8}` : "";
    return `${items.length} activities: ${parts.join(", ")}${more}`;
  },
};

const updateActivities: GoTool = {
  def: {
    name: "updateActivities",
    description:
      "Edit one or more activities that ALREADY exist on the trip's days. Pass one item per activity, identified by its `id` (the activity id from getTripState). Include only the fields you want to change — everything else is left untouched. Use it to refine times, descriptions, links, images, budget, slot, category, and to MOVE an activity to a different day (set `day` to the target day number). Call getTripState first to get the ids.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "The edits to apply, one object per activity.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Activity id to edit (from getTripState). Required." },
              day: { type: "integer", description: "Move the activity to this day number (1-based). Omit to keep it on its current day." },
              title: { type: "string", description: "New name (optional)." },
              description: { type: "string", description: "Short description / why (optional)." },
              details: { type: "string", description: "Longer free-text details (optional)." },
              slot: { type: "string", enum: ["morning", "afternoon", "evening", "night"], description: "Time slot (optional)." },
              time: { type: "string", description: "Time in HH:MM format (optional). Pass an empty string to clear it." },
              category: { type: "string", enum: ["culture", "food", "nature", "experience", "transport", "stay"], description: "Category (optional)." },
              location: { type: "string", description: "Place/address text (optional)." },
              image: { type: "string", description: "Hero image URL (optional). Only an explicit URL — do not invent one." },
              link: { type: "string", description: "Reference URL, e.g. booking or official site (optional)." },
              budgetAmount: { type: "number", description: "Budget amount (optional)." },
              budgetCurrency: { type: "string", description: "Budget currency code, e.g. EUR (optional)." },
            },
            required: ["id"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const items = Array.isArray(args.items) ? args.items : [];
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    // Scope to THIS trip: the model can only edit activities that actually
    // exist (ids it doesn't know are silently skipped — never trust a model id).
    // Track each instance's entity id and current day so we can detect a move.
    const instanceInfo = new Map(
      snap.days.flatMap((d) => d.activities.map((a) => [a.id, { activityId: a.activity_id, dayNumber: d.day_number }] as const)),
    );
    const dayIdByNumber = new Map(snap.days.map((d) => [d.day_number, d.id] as const));
    const nextPositionFor = (dayNumber: number): number => {
      const day = snap.days.find((d) => d.day_number === dayNumber);
      const positions = day ? day.activities.map((a) => a.position ?? 0) : [];
      return (positions.length ? Math.max(...positions) : 0) + 1;
    };

    let updated = 0;
    const result: { id: string; fields: string[] }[] = [];
    const unknownIds: string[] = [];
    for (const raw of items) {
      if (typeof raw !== "object" || raw === null) continue;
      const it = raw as Record<string, unknown>;
      const id = typeof it.id === "string" ? it.id : "";
      const info = instanceInfo.get(id);
      if (!info) {
        if (id) unknownIds.push(id);
        continue;
      }

      // Entity fields (activities table → YumeService).
      const entityPatch: Record<string, unknown> = {};
      if (typeof it.title === "string") entityPatch.title = it.title;
      if (typeof it.description === "string") entityPatch.short_desc = it.description;
      if (typeof it.details === "string") entityPatch.details = it.details;
      if (typeof it.category === "string") entityPatch.category = it.category;
      if (typeof it.location === "string") entityPatch.location = it.location;
      if (typeof it.image === "string") entityPatch.hero_image = it.image;
      if (typeof it.link === "string") entityPatch.url = it.link;
      if (typeof it.budgetAmount === "number") entityPatch.budget_amount = it.budgetAmount;
      if (typeof it.budgetCurrency === "string") entityPatch.budget_currency = it.budgetCurrency;

      // Instance/timeline fields.
      const instancePatch: Record<string, unknown> = {};
      if (typeof it.slot === "string") instancePatch.slot = it.slot;
      if (typeof it.time === "string") instancePatch.time = it.time;

      // Is this a MOVE to another day?
      const targetDay = typeof it.day === "number" ? it.day : null;
      const isMove = targetDay != null && targetDay !== info.dayNumber && dayIdByNumber.has(targetDay);

      const changed: string[] = [];
      if (Object.keys(entityPatch).length > 0) {
        await services.yumes.update(info.activityId, entityPatch);
        changed.push(...Object.keys(entityPatch));
      }
      if (isMove) {
        // Move the occurrence to the target day; carry any slot/time and append
        // it after the existing activities of that day.
        await services.trips.moveActivity(id, dayIdByNumber.get(targetDay)!, {
          ...instancePatch,
          position: nextPositionFor(targetDay),
        });
        changed.push("day", ...Object.keys(instancePatch));
      } else if (Object.keys(instancePatch).length > 0) {
        await services.trips.updateInstance(id, instancePatch);
        changed.push(...Object.keys(instancePatch));
      }
      if (changed.length > 0) {
        updated++;
        result.push({ id, fields: changed });
      }
    }
    // Fail loudly when nothing could be applied — otherwise the confirm card
    // reports "done" while the trip is unchanged (the cause here: the model
    // invented an activity id instead of using one from getTripState).
    if (items.length > 0 && updated === 0) {
      throw badRequest(
        unknownIds.length
          ? `No matching activities: these ids aren't on this trip (${unknownIds.slice(0, 3).join(", ")}${unknownIds.length > 3 ? "…" : ""}). Call getTripState for the current ids and retry.`
          : "Nothing to apply: the ids or target day weren't valid. Call getTripState for the current ids and retry.",
      );
    }
    return { ok: true, updated, items: result, ...(unknownIds.length ? { unknownIds } : {}) };
  },
  requiresConfirm: true,
  summary: (args) => {
    const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
    const parts = items.slice(0, 6).map((i) => {
      const label = typeof i.title === "string" && i.title ? i.title : `#${String(i.id ?? "?").slice(0, 6)}`;
      const move = typeof i.day === "number" ? ` → g${i.day}` : "";
      const rest = Object.keys(i).filter((k) => k !== "id" && k !== "day");
      return `${label}${move}${rest.length ? ` (${rest.join(", ")})` : ""}`;
    });
    const more = items.length > 6 ? ` +${items.length - 6}` : "";
    return `${items.length} edit${items.length !== 1 ? "s" : ""}: ${parts.join("; ")}${more}`;
  },
};

/** The full catalog, keyed by tool name. */
export const GO_TOOLS: Record<string, GoTool> = { getTripState, setTripMeta, setItinerary, addActivities, updateActivities };

/** Tool definitions offered to the model. (Step B+: gate by context.) */
export function toolDefs(): LlmTool[] {
  return Object.values(GO_TOOLS).map((t) => t.def);
}
