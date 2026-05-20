"use client";

import { useSyncExternalStore } from "react";

export type OS = "mac" | "windows" | "linux" | "unknown";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const p = navigator.platform ?? "";
  const ua = navigator.userAgent ?? "";
  if (p.startsWith("Mac") || ua.includes("Mac OS")) return "mac";
  if (p.startsWith("Win") || ua.includes("Windows")) return "windows";
  if (p.startsWith("Linux") || ua.includes("Linux")) return "linux";
  return "unknown";
}

const subscribe = () => () => {};

export function useOS(): OS {
  return useSyncExternalStore(subscribe, detectOS, () => "unknown");
}

/**
 * Returns the modifier key label for Alt shortcuts.
 * Mac → "⌥"  (Option)
 * Others → "Alt+"
 */
export function useAltLabel(): string {
  const os = useOS();
  return os === "mac" ? "⌥" : "Alt+";
}
