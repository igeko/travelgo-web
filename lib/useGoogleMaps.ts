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
  // `loading=async` segnala esplicitamente al loader che lo script viene
  // caricato in modo asincrono — Google lo richiede per evitare il warning
  // "loaded directly without loading=async" in console (https://goo.gle
  // /js-api-loading). `async`/`defer` sull'elemento restano comunque
  // necessari per il browser.
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker&v=weekly&loading=async`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    // Con `loading=async` l'evento onload espone solo `google.maps.importLibrary`:
    // i costruttori (`Map`, `Marker`, `Polyline`, …) non sono ancora globali.
    // Pre-importiamo qui le librerie usate dal codice, così quando notifichiamo
    // "ready" tutti i `new google.maps.*` sincroni funzionano come col loader
    // legacy senza dover toccare ogni call site.
    google.maps
      .importLibrary("maps")
      .then(() => google.maps.importLibrary("marker"))
      .then(() => notify("ready"))
      .catch(() => notify("error"));
  };
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
