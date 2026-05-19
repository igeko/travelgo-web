import type { Activity, BlockType, BookingStatus, BridgeData } from "@/lib/dal/trips";

export type { BlockType, BookingStatus, BridgeData };

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
