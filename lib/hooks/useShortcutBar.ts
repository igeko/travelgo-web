"use client";

import { useLocalStorageState } from "./useLocalStorageState";

/* ─────────────────────────────────────────────────────────────────
   useShortcutBar · shared dismissed-state for the edit-mode shortcut
   hint bar. Persisted in localStorage so a user who closes it keeps it
   closed across sessions. The key is shared between the bar itself
   (TripDayView) and the "show shortcuts" action in the header kebab
   (AppHeader); useLocalStorageState keeps every instance in sync.
───────────────────────────────────────────────────────────────── */

const KEY = "travelgo:shortcut-bar-dismissed";

export function useShortcutBar() {
  const [dismissed, setDismissed] = useLocalStorageState<boolean>(KEY, false);
  return {
    dismissed,
    dismiss: () => setDismissed(true),
    show: () => setDismissed(false),
  };
}
