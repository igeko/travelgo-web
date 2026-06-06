import type { Activity, BlockType, BookingStatus, BridgeData } from "@/lib/dal/domain";
import type { ActivityScheduledInstance } from "@/lib/dal";
import type { PlaceResult } from "@/components/ui/AddressField";
import type { TransportMode } from "@/components/ui/mapTypes";

export type { BlockType, BookingStatus, BridgeData };

/** An activity entity as surfaced by ActivitySearchField (entity + its occurrences). */
export type TripActivityOption = {
  id: string;
  title: string;
  location: string | null;
  /** Days this activity is scheduled on — empty means wishlist-only. */
  scheduled: ActivityScheduledInstance[];
};

/** Un blocco della timeline — è semplicemente un Activity arricchito */
export type TimelineBlock = Activity;

/** Slot a cui appartiene un blocco */
export type SlotKey = "morning" | "afternoon" | "evening" | "night";

export const SLOT_ORDER: SlotKey[] = ["morning", "afternoon", "evening", "night"];

export const SLOT_LABEL: Record<SlotKey, string> = {
  morning:   "Morning",
  afternoon: "Afternoon",
  evening:   "Evening",
  night:     "Night",
};

/**
 * Time-of-day reference colours — single source of truth shared by the day map
 * (ActivityRouteMap markers + legs) and the activity list slot dividers. Deep, saturated
 * hues so thin strokes stay legible over the light basemap and the four slots
 * read at a glance (gold / sky / rose / indigo).
 */
export const SLOT_COLORS: Record<SlotKey, string> = {
  morning:   "#e08a00", // amber — sunrise
  afternoon: "#0284c7", // sky blue — midday
  evening:   "#be185d", // deep rose — sunset
  night:     "#4338ca", // indigo — night
};

/** Raggruppamento per sezione */
export type SlotGroup = {
  slot: SlotKey;
  blocks: TimelineBlock[];
};

/** Stato dell'autocomplete */
export type SearchResult = {
  id: string;
  title: string;
  short_desc: string | null;
  location: string | null;
  hero_image: string | null;
  type: BlockType;
  in_current_day: boolean;
  day_id: string | null;
  trip_id: string;
};

export type SearchResponse = {
  wishlist: SearchResult[];
  platform: SearchResult[];
};

/** Payload per il blocco add composer */
export type NewBlockPayload = {
  title: string;
  type: BlockType;
  slot: SlotKey;
  fuzzy: boolean;
  time?: string;
  instance_note?: string;
  entity_id?: string;
};

/** Payload per il patch istanza (pencil → popover) */
export type InstancePatch = {
  time?: string | null;
  fuzzy?: boolean;
  instance_note?: string | null;
  booking_status?: BookingStatus | null;
  slot?: SlotKey;
};

/* ─────────────────────────────────────────────────────────────────
   Itinerary map — types shared by ActivityRouteMap and its consumers.
   (Used to live in components/ui/RouteMap; relocated here when routing
   was consolidated into the Map primitive.)
───────────────────────────────────────────────────────────────── */

/** Time-of-day slot a stop belongs to. Re-exported alias of `SlotKey` for
 *  the map surface, where "slot" reads more naturally than "key". */
export type RouteSlot = SlotKey;

/**
 * One stop on the itinerary map. Extends `PlaceResult` (pure geometry from
 * the address autocomplete) with the trip-domain semantics needed to render
 * a typed pin and a per-leg-styled route.
 */
export type RouteStop = PlaceResult & {
  /** Stop icon key (STOP_ICONS) — usually `activity.icon`. */
  iconKey?: string | null;
  /** Activity type — fallback icon when `iconKey` is absent. */
  type?: BlockType | null;
  /** Transport used to LEAVE this stop toward the next one. */
  transportOut?: TransportMode | null;
  /** Time-of-day slot — colours the marker and the incoming leg when set. */
  slot?: RouteSlot | null;
};

/**
 * Imperative handle exposed by `ActivityRouteMap`. Lets consumers drive the
 * camera (focus a stop by index, drop an ad-hoc pin at arbitrary coords,
 * or reframe the overview) without prop drilling.
 */
export type RouteMapHandle = {
  /** Pan + zoom onto the stop at `index` (default zoom 16). No-op out of range. */
  focusPoint: (index: number, zoom?: number) => void;
  /**
   * Drop a transient orange ad-hoc pin at arbitrary coordinates and pan/zoom
   * onto it. The pin replaces any prior ad-hoc pin and persists until
   * `fitAll()` is called or the stop set changes.
   */
  focusCoord: (lat: number, lng: number, opts?: { label?: string; zoom?: number }) => void;
  /** Re-frame all stops + route geometry (the default overview). */
  fitAll: () => void;
};
