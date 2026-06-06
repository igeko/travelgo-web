"use client";

import { useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────
   useGoogleMaps · singleton loader for the Google Maps JS SDK.

   Guarantees the <script> tag is injected only once, even across
   React StrictMode double-mounts or multiple <Map> instances on
   the same page.

   Returns:
     "idle"    — not started yet
     "loading" — script injected, waiting for google.maps
     "ready"   — window.google.maps is available
     "error"   — script failed to load
───────────────────────────────────────────────────────────────── */

type Status = "idle" | "loading" | "ready" | "error";

// Module-level singleton so all hook instances share the same state.
let _status: Status = "idle";
const _listeners = new Set<(s: Status) => void>();

function notify(s: Status) {
  _status = s;
  _listeners.forEach((fn) => fn(s));
}

function loadScript(apiKey: string) {
  if (_status !== "idle") return; // already started
  notify("loading");

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker&v=weekly`;
  script.async = true;
  script.defer = true;
  script.onload = () => notify("ready");
  script.onerror = () => notify("error");
  document.head.appendChild(script);
}

function subscribe(onChange: () => void): () => void {
  const handler = () => onChange();
  _listeners.add(handler);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[useGoogleMaps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
    if (_status !== "error") notify("error");
  } else if (_status === "idle") {
    loadScript(apiKey);
  }

  return () => {
    _listeners.delete(handler);
  };
}

export function useGoogleMaps(): Status {
  return useSyncExternalStore(subscribe, () => _status, () => "idle");
}
