"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `false` during SSR and the first client render, then `true` once the
 * component has hydrated. Use it to gate browser-only output without triggering
 * a synchronous setState inside an effect (hydration-safe via useSyncExternalStore).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
