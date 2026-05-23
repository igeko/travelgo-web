"use client";

/**
 * lib/hooks/useDebugMode.ts
 * ─────────────────────────────────────────────────────────────────
 * Persisted, app-wide debug toggle (localStorage). Lets the AppHeader
 * kebab toggle and the Explore debug panel share one source of truth
 * across pages and tabs — unlike per-page useState, which resets on
 * navigation.
 * ─────────────────────────────────────────────────────────────────
 */

import { useCallback, useSyncExternalStore } from "react";

const KEY = "travelgo-debug";
const EVENT = "travelgo-debug-change";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

function subscribe(cb: () => void): () => void {
  // Same-tab updates fire a custom event; cross-tab via the storage event.
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setDebugMode(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}

/** `[debug, toggle]` — reactive across components, persisted across pages. */
export function useDebugMode(): [boolean, () => void] {
  const debug = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => setDebugMode(!read()), []);
  return [debug, toggle];
}
