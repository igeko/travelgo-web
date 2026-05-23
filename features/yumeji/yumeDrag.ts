/**
 * features/yumeji/yumeDrag.ts
 * ─────────────────────────────────────────────────────────────────
 * Drag & drop payload for dragging a Yume onto a target (e.g. the day's
 * activity list, to schedule it). Uses a custom MIME type so drop targets
 * can recognize a yume drag during `dragover` (via dataTransfer.types)
 * without reading the data.
 * ─────────────────────────────────────────────────────────────────
 */

export const YUME_DND_MIME = "application/x-travelgo-yume";

export type YumeDragPayload = {
  /** Yume / activity-entity id — used to schedule the existing entity. */
  id: string;
  title: string;
  location?: string | null;
};

/** Write the payload onto a drag event's dataTransfer. */
export function writeYumeDrag(dt: DataTransfer, payload: YumeDragPayload): void {
  dt.setData(YUME_DND_MIME, JSON.stringify(payload));
  dt.setData("text/plain", payload.title); // fallback for non-aware targets
  dt.effectAllowed = "copy";
}

/** True when a drag event carries a yume payload (safe during dragover). */
export function isYumeDrag(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes(YUME_DND_MIME);
}

/** Read the payload on drop. Returns null when absent/malformed. */
export function readYumeDrag(dt: DataTransfer): YumeDragPayload | null {
  const raw = dt.getData(YUME_DND_MIME);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as YumeDragPayload;
    return p && typeof p.id === "string" && typeof p.title === "string" ? p : null;
  } catch {
    return null;
  }
}
