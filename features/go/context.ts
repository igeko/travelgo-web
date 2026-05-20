/**
 * features/go/context.ts
 *
 * Builds a compact, human-readable context string for Go (the AI assistant).
 * This is injected into the system prompt so Go knows about the trip
 * without the user having to repeat themselves.
 *
 * Two levels:
 *  - TripInfo     — always available, covers the whole trip + all activities
 *  - GoFocus      — optional, narrows to the current page (day or activity)
 */

import type { DbTrip, DbDay, ActivitySlot } from "@/lib/dal/types";
import type { Activity } from "@/lib/dal/domain";

/* ─────────────────────────────────────────────────────────────────
   Input types
───────────────────────────────────────────────────────────────── */

export type TripInfo = {
  trip: DbTrip;
  days: DbDay[];
  activities: Activity[];  // Now uses merged Activity type with day_id and slot
  /** Number of travelers (from trip_members count). */
  travelersCount?: number;
};

export type GoFocus =
  | { type: "day"; dayNumber: number }
  | { type: "activity"; activityId: string };

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

function formatDate(iso: string | null): string {
  if (!iso) return "?";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "?";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SLOT_ORDER: ActivitySlot[] = ["morning", "afternoon", "evening", "night"];

function slotLabel(slot: ActivitySlot | null): string {
  if (!slot) return "";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

/* ─────────────────────────────────────────────────────────────────
   Main function
───────────────────────────────────────────────────────────────── */

/**
 * Builds the context string injected into Go's system prompt.
 *
 * Example output:
 * ```
 * ## Trip context
 * Trip: Japan · 31 Jul – 20 Aug 2026 · 2 travelers
 * Themes: Nature, Food, Culture
 *
 * Itinerary (21 days, 8 with activities):
 * Day 1 – 31 Jul · Tokyo
 *   Morning: Senso-ji Temple
 *   Evening: Shibuya crossing
 * Day 2 – 1 Aug · Tokyo
 *   Afternoon: TeamLab Borderless
 * Day 4 – 3 Aug · Kyoto
 *   Morning: Fushimi Inari
 *
 * ## Current focus
 * Viewing: Day 4 – Kyoto (3 Aug 2026)
 * ```
 */
export function getGoContext(info: TripInfo, focus?: GoFocus): string {
  const { trip, days, activities, travelersCount } = info;

  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────
  lines.push("## Trip context");

  const dateRange = trip.start_date && trip.end_date
    ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
    : null;

  const travelers = travelersCount
    ? `${travelersCount} traveler${travelersCount !== 1 ? "s" : ""}`
    : null;

  const tripLine = [trip.title, dateRange, travelers].filter(Boolean).join(" · ");
  lines.push(`Trip: ${tripLine}`);

  // Composition
  const adults = trip.adults_count ?? null;
  const children = trip.children_count ?? null;
  if (adults !== null || children !== null) {
    const parts = [];
    if (adults !== null) parts.push(`${adults} adult${adults !== 1 ? "s" : ""}`);
    if (children !== null) parts.push(`${children} child${children !== 1 ? "ren" : ""}`);
    lines.push(`Travelers: ${parts.join(", ")}`);
  }

  // Themes
  if (trip.theme_tags && trip.theme_tags.length > 0) {
    lines.push(`Themes: ${trip.theme_tags.join(", ")}`);
  }
  if (trip.theme_description) {
    lines.push(`Trip style: ${trip.theme_description}`);
  }

  // ── Itinerary ─────────────────────────────────────────────────
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  const daysWithActivities = sortedDays.filter((day) =>
    activities.some((a) => a.day_id === day.id),
  );

  const totalDays = sortedDays.length;

  lines.push("");
  lines.push(`Itinerary (${totalDays} day${totalDays !== 1 ? "s" : ""}):`);

  for (const day of daysWithActivities) {
    const dateStr = day.date ? formatDateShort(day.date) : null;
    const place = day.city ?? day.label ?? null;

    const dayActivities = activities
      .filter((a) => a.day_id === day.id)
      .sort((a, b) => {
        const ai = SLOT_ORDER.indexOf(a.slot as ActivitySlot);
        const bi = SLOT_ORDER.indexOf(b.slot as ActivitySlot);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    const activityList = dayActivities.map((a) => a.title).join(", ");

    const parts = [dateStr, place ? `· ${place}` : null, activityList ? `— ${activityList}` : null];
    lines.push(parts.filter(Boolean).join(" "));
  }

  // ── Focus ─────────────────────────────────────────────────────
  if (focus) {
    lines.push("");
    lines.push("## Current focus");

    if (focus.type === "day") {
      const day = sortedDays.find((d) => d.day_number === focus.dayNumber);
      if (day) {
        const label = day.city ?? day.label ?? `Day ${day.day_number}`;
        const date = day.date ? ` (${formatDate(day.date)})` : "";
        lines.push(`Viewing: Day ${day.day_number} – ${label}${date}`);
      }
    } else if (focus.type === "activity") {
      const act = activities.find((a) => a.id === focus.activityId);
      if (act) {
        const day = sortedDays.find((d) => d.id === act.day_id);
        const dayRef = day ? ` · Day ${day.day_number}` : "";
        lines.push(`Viewing activity: ${act.title}${dayRef}`);
        if (act.location) lines.push(`Location: ${act.location}`);
        if (act.short_desc) lines.push(`About: ${act.short_desc}`);
      }
    }
  }

  return lines.join("\n");
}
