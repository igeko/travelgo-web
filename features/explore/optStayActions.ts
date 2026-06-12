/**
 * features/explore/optStayActions.ts
 * ─────────────────────────────────────────────────────────────────
 * Optimistic in-place mutations for the Stop↔Sleep toggle and the
 * stepper +/- nights. Each action takes the current TimelineDayData[]
 * and returns a new array that anticipates what the server snapshot
 * will look like after the mutation lands. router.refresh() then
 * reconciles to the real shape and the host clears the action.
 *
 * Pure functions, no side effects. Built so a chain of actions can
 * be applied in order (left fold).
 * ─────────────────────────────────────────────────────────────────
 */

import type { TimelineDayData } from "./TimelineV2";
import type { AccommodationDisplay } from "./resolveAccommodations";
import type { Activity } from "@/lib/dal/domain";

export type OptStayAction =
  | { id: string; kind: "convertToSleep"; scheduledId: string }
  | { id: string; kind: "convertToStop";  stayId: string }
  | { id: string; kind: "extend";         stayId: string }
  | { id: string; kind: "reduce";         stayId: string };

/** Apply each action in order, returning the projected days array. */
export function applyOptStayActions(
  days: TimelineDayData[],
  actions: readonly OptStayAction[],
): TimelineDayData[] {
  let out = days;
  for (const a of actions) out = applyOne(out, a);
  return out;
}

function applyOne(days: TimelineDayData[], a: OptStayAction): TimelineDayData[] {
  switch (a.kind) {
    case "convertToSleep": return applyConvertToSleep(days, a.scheduledId);
    case "convertToStop":  return applyConvertToStop(days, a.stayId);
    case "extend":         return applyExtend(days, a.stayId);
    case "reduce":         return applyReduce(days, a.stayId);
  }
}

// ── convertToSleep ─────────────────────────────────────────────────

function applyConvertToSleep(
  days: TimelineDayData[],
  scheduledId: string,
): TimelineDayData[] {
  return days.map((d) => {
    const idx = d.activities.findIndex((act) => act.id === scheduledId);
    if (idx === -1) return d;
    const act = d.activities[idx];
    const newAcc: AccommodationDisplay = {
      name: act.title,
      type: null,
      address: act.location ?? null,
      url: act.url ?? null,
      place_id: act.location_place_id ?? null,
      lat: act.location_lat ?? null,
      lng: act.location_lng ?? null,
      is_arrival: true,
      is_departure: true,
      night_index: 0,
      nights_total: 1,
      stay_id: `opt:${scheduledId}`,
    };
    return {
      ...d,
      activities: d.activities.filter((_, i) => i !== idx),
      accommodation: newAcc,
    };
  });
}

// ── convertToStop ──────────────────────────────────────────────────

function applyConvertToStop(
  days: TimelineDayData[],
  stayId: string,
): TimelineDayData[] {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const checkIn = sorted.find((d) => d.accommodation?.stay_id === stayId);
  if (!checkIn || !checkIn.accommodation) return days;
  const acc = checkIn.accommodation;

  const synthetic: Activity = {
    id: `opt:${stayId}`,
    activity_id: `opt-act:${stayId}`,
    day_id: checkIn.id,
    trip_id: checkIn.trip_id,
    title: acc.name,
    short_desc: null,
    icon: null,
    hero_image: null,
    location: acc.address ?? null,
    location_place_id: acc.place_id ?? null,
    location_lat: acc.lat ?? null,
    location_lng: acc.lng ?? null,
    slot: null,
    time: null,
    position: 0,
    url: acc.url ?? null,
    budget_amount: null,
    budget_currency: null,
    budget_paid: false,
    booking: null,
    place_enriched: null,
    fuzzy: false,
    instance_note: null,
    booking_status: null,
    bridge_in_json: null,
    bridge_out_json: null,
  };

  return days.map((d) => {
    const hasStay = d.accommodation?.stay_id === stayId;
    if (d.id === checkIn.id) {
      return {
        ...d,
        accommodation: null,
        activities: [synthetic, ...d.activities],
      };
    }
    if (hasStay) return { ...d, accommodation: null };
    return d;
  });
}

// ── extend ────────────────────────────────────────────────────────

function applyExtend(
  days: TimelineDayData[],
  stayId: string,
): TimelineDayData[] {
  const stayDays = days.filter((d) => d.accommodation?.stay_id === stayId);
  if (stayDays.length === 0) return days;
  const sortedStay = [...stayDays].sort((a, b) => a.day_number - b.day_number);
  const lastStay = sortedStay[sortedStay.length - 1];
  const oldTotal = lastStay.accommodation!.nights_total;
  const newTotal = oldTotal + 1;

  const allSorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const lastIdx = allSorted.findIndex((d) => d.id === lastStay.id);
  const nextDay = allSorted[lastIdx + 1];
  if (!nextDay) return days;
  const ref = lastStay.accommodation!;

  return days.map((d) => {
    if (d.accommodation?.stay_id === stayId) {
      const wasLast = d.id === lastStay.id;
      return {
        ...d,
        accommodation: {
          ...d.accommodation,
          nights_total: newTotal,
          is_departure: wasLast ? false : d.accommodation.is_departure,
        },
      };
    }
    if (d.id === nextDay.id) {
      return {
        ...d,
        accommodation: {
          ...ref,
          night_index: oldTotal,
          is_arrival: false,
          is_departure: true,
          nights_total: newTotal,
        },
      };
    }
    return d;
  });
}

// ── reduce ────────────────────────────────────────────────────────

function applyReduce(
  days: TimelineDayData[],
  stayId: string,
): TimelineDayData[] {
  const stayDays = days.filter((d) => d.accommodation?.stay_id === stayId);
  if (stayDays.length === 0) return days;
  const sortedStay = [...stayDays].sort((a, b) => a.day_number - b.day_number);
  const lastStay = sortedStay[sortedStay.length - 1];
  const newTotal = lastStay.accommodation!.nights_total - 1;
  const newLast = sortedStay[sortedStay.length - 2] ?? null;

  return days.map((d) => {
    if (d.id === lastStay.id) {
      return { ...d, accommodation: null };
    }
    if (d.accommodation?.stay_id === stayId) {
      return {
        ...d,
        accommodation: {
          ...d.accommodation,
          nights_total: newTotal,
          is_departure: newLast !== null && d.id === newLast.id,
        },
      };
    }
    return d;
  });
}
