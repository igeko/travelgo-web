"use client";

import { useEffect, useRef } from "react";

export type Shortcut = {
  key: string;
  alt?: boolean;
  enabled?: boolean;
  onTrigger: () => void;
};

/**
 * Registers multiple keyboard shortcuts with a single window listener.
 * - Alt defaults to true.
 * - Ignores events fired inside input/textarea/select.
 * - Uses refs so callbacks are always fresh without re-registering.
 */
export function useShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Escape is always allowed — it should dismiss forms even when a field is focused.
      const isEscape = e.code === "Escape";
      const tag = (e.target as HTMLElement)?.tagName;
      if (!isEscape && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")) return;
      if (!isEscape && (e.target as HTMLElement)?.isContentEditable) return;

      for (const s of shortcutsRef.current) {
        const needsAlt = s.alt ?? true;
        if (s.enabled === false) continue;
        if (needsAlt && !e.altKey) continue;
        if (!needsAlt && e.altKey) continue;
        // On Mac, Option+key produces special chars (å, ´, ¬…) so e.key won't match.
        // Use e.code ("KeyA", "KeyE", "Escape") which is layout-independent.
        const code = e.code.toLowerCase();
        const expected = s.key.toLowerCase();
        const matches =
          code === `key${expected}` ||   // letter keys: "KeyA" matches "a"
          code === expected ||            // special keys: "escape" matches "Escape"
          e.key.toLowerCase() === expected; // fallback for digits / symbols
        if (!matches) continue;
        e.preventDefault();
        s.onTrigger();
        break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // registrato una volta sola
}
