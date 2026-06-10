"use client";

import { useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────
   useGoogleMaps · singleton loader for the Google Maps JS SDK.

   Usa il bootstrap loader ufficiale (`importLibrary` installata
   sincronamente, script lazy-loaded alla prima chiamata): idempotente
   per design — sopravvive a HMR e a React StrictMode senza il warning
   "Google Maps JavaScript API multiple times".

   Returns:
     "idle"    — not started yet
     "loading" — script injected, waiting for google.maps
     "ready"   — window.google.maps è pronto (Map, Marker, Polyline, …)
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

// Bootstrap loader ufficiale di Google (https://developers.google.com
// /maps/documentation/javascript/load-maps-js-api#dynamic-library-import).
// Installa `google.maps.importLibrary` sincronamente; lo script vero e
// proprio è scaricato al primo `importLibrary(...)`. Lo snippet è
// idempotente: chiamarlo due volte non rilancia il fetch.
function installBootstrap(apiKey: string) {
  type ImportLibraryFn = (name: string, ...args: unknown[]) => Promise<unknown>;
  type MapsNs = {
    importLibrary?: ImportLibraryFn;
    __ib__?: (value: unknown) => void;
  };
  type GlobalGoogle = { maps?: MapsNs };

  const win = window as unknown as { google?: GlobalGoogle };
  if (win.google?.maps?.importLibrary) return; // già installato

  const opts = { key: apiKey, v: "weekly" } as const;
  const PKG = "The Google Maps JavaScript API";
  const CALLBACK = "__ib__";
  const google: GlobalGoogle = (win.google = win.google ?? {});
  const maps: MapsNs = (google.maps = google.maps ?? {});
  const queued = new Set<string>();
  let bootPromise: Promise<unknown> | undefined;

  const load = () => {
    if (bootPromise) return bootPromise;
    bootPromise = new Promise<unknown>((resolve, reject) => {
      const params = new URLSearchParams();
      params.set("libraries", [...queued].join(","));
      for (const [k, v] of Object.entries(opts)) {
        params.set(k.replace(/[A-Z]/g, (ch) => "_" + ch.toLowerCase()), String(v));
      }
      params.set("callback", `google.maps.${CALLBACK}`);
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
      script.onerror = () => {
        bootPromise = undefined;
        reject(new Error(PKG + " could not load."));
      };
      script.nonce = document.querySelector("script[nonce]")?.getAttribute("nonce") ?? "";
      maps[CALLBACK] = resolve;
      document.head.appendChild(script);
    });
    return bootPromise;
  };

  if (maps.importLibrary) {
    console.warn(PKG + " only loaded once. Ignoring:", opts);
    return;
  }
  const importLibrary: ImportLibraryFn = (name, ...args) => {
    queued.add(name);
    return load().then(() => maps.importLibrary!(name, ...args));
  };
  maps.importLibrary = importLibrary;
}

function loadLibraries() {
  if (_status === "ready" || _status === "loading") return;
  notify("loading");
  Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ])
    .then(() => notify("ready"))
    .catch(() => notify("error"));
}

function subscribe(onChange: () => void): () => void {
  const handler = () => onChange();
  _listeners.add(handler);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[useGoogleMaps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
    if (_status !== "error") notify("error");
  } else if (_status === "idle") {
    installBootstrap(apiKey);
    loadLibraries();
  }

  return () => {
    _listeners.delete(handler);
  };
}

export function useGoogleMaps(): Status {
  return useSyncExternalStore(subscribe, () => _status, () => "idle");
}
