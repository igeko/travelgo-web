"use client";

/**
 * features/go/events.ts
 * ─────────────────────────────────────────────────────────────────
 * The Go → host event standard.
 *
 * Go never owns a side-effect or UI. When something happens in the chat
 * (a list of places is found, a card is opened, "add to day" is clicked…)
 * Go *emits a typed event*. The host page subscribes to the events it cares
 * about via `useTripGo().subscribe(type, handler)` and decides what to do
 * (render markers, pan a map, add an activity, fill a form…).
 *
 * Two directions, kept separate:
 *  - commands (host → Go): imperative methods on the context
 *    (openGo, setTripContext, setGoPosition, setActiveEdit).
 *  - events (Go → host): this catalog, delivered through the bus.
 *
 * Persistent state (accumulated markers, current selection) is owned by the
 * consumer, derived from these transient events — so it survives remounts.
 * ─────────────────────────────────────────────────────────────────
 */

import { createContext, useContext } from "react";

/** A geocoded place Go can point at on a map. */
export type GoPlace = {
  title: string;
  lat: number;
  lng: number;
  placeId?: string;
};

/** Payload to add a suggestion as an activity to the current day. */
export type AddToDayPayload = {
  title: string;
  description: string;
  slot: string;
  location?: string;
  locationPlaceId?: string;
  locationLat?: number;
  locationLng?: number;
};

/** Data to fill into the active activity edit form. */
export type GoApplyData = {
  title: string;
  description: string;
};

/**
 * The catalog of events Go emits toward the host page. Add new interactions
 * here (one variant), then `subscribe` to them in the consumer — no new
 * register/unregister boilerplate, no prop threading.
 */
export type GoEvent =
  | { type: "places.found"; places: GoPlace[] }          // a suggestions list arrived (geocoded)
  | { type: "place.focus"; place: GoPlace }              // one-shot: pan/zoom onto a place
  | { type: "place.opened"; place: GoPlace }             // a place card became selected (self-contained)
  | { type: "place.closed"; placeId: string }            // the selected place was deselected
  | { type: "activity.add"; payload: AddToDayPayload }   // add suggestion to the current day
  | { type: "activity.apply"; data: GoApplyData };       // apply suggestion to the active edit form

export type GoEventType = GoEvent["type"];
export type GoEventOf<T extends GoEventType> = Extract<GoEvent, { type: T }>;
export type GoEmit = (event: GoEvent) => void;

/**
 * Emitter exposed to the chat subtree. `listens(type)` reports whether the
 * host currently subscribes to that event, so optional UI (e.g. a "show on
 * map" button) can hide itself on pages with no consumer.
 */
export type GoEmitter = {
  emit: GoEmit;
  listens: (type: GoEventType) => boolean;
};

const NOOP_EMITTER: GoEmitter = { emit: () => {}, listens: () => false };

/**
 * Local emitter context, provided by GoChatFloat to its own subtree so deep
 * children (SuggestionCard) emit without prop threading. No-op outside a chat.
 */
const GoEmitContext = createContext<GoEmitter>(NOOP_EMITTER);
export const GoEmitProvider = GoEmitContext.Provider;

export function useGoEmit(): GoEmitter {
  return useContext(GoEmitContext);
}
