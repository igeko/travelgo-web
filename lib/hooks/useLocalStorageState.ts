"use client";

import { useCallback, useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────
   useLocalStorageState · hydration-safe persisted state.

   Reads/writes localStorage through useSyncExternalStore so the value
   stays in sync without a synchronous setState inside an effect (which
   would trigger cascading renders / fail react-hooks/set-state-in-effect).

   SSR and the first client render always return `fallback`; the stored
   value is adopted right after hydration. Updates propagate to every
   hook instance sharing the same key, and across tabs via the `storage`
   event.
───────────────────────────────────────────────────────────────── */

export type LocalStorageCodec<T> = {
  parse: (raw: string) => T;
  serialize: (value: T) => string;
};

const jsonCodec: LocalStorageCodec<unknown> = {
  parse: (raw) => JSON.parse(raw),
  serialize: (value) => JSON.stringify(value),
};

const listeners = new Map<string, Set<() => void>>();
// Cache the parsed value per key so getSnapshot returns a stable reference
// (required by useSyncExternalStore to avoid infinite re-render loops).
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();
// Server / first-render fallback, kept stable per key.
const serverCache = new Map<string, unknown>();

function emit(key: string) {
  snapshotCache.delete(key);
  listeners.get(key)?.forEach((cb) => cb());
}

export function useLocalStorageState<T>(
  key: string,
  fallback: T,
  codec: LocalStorageCodec<T> = jsonCodec as LocalStorageCodec<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) emit(key);
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set!.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    const raw = localStorage.getItem(key);
    const cached = snapshotCache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    let value: T;
    if (raw === null) {
      value = fallback;
    } else {
      try {
        value = codec.parse(raw);
      } catch {
        value = fallback;
      }
    }
    snapshotCache.set(key, { raw, value });
    return value;
  }, [key, fallback, codec]);

  const getServerSnapshot = useCallback((): T => {
    if (!serverCache.has(key)) serverCache.set(key, fallback);
    return serverCache.get(key) as T;
  }, [key, fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = getSnapshot();
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      try {
        localStorage.setItem(key, codec.serialize(resolved));
      } catch {
        // Quota exceeded or private browsing — ignore.
      }
      emit(key);
    },
    [key, codec, getSnapshot],
  );

  return [value, setValue];
}
