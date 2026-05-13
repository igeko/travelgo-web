"use client";

import { useEffect, useState } from "react";

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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps&v=weekly`;
  script.async = true;
  script.defer = true;
  script.onload = () => notify("ready");
  script.onerror = () => notify("error");
  document.head.appendChild(script);
}

export function useGoogleMaps(): Status {
  const [status, setStatus] = useState<Status>(_status);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn(
        "[useGoogleMaps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.",
      );
      setStatus("error");
      return;
    }

    // If already ready/error, sync immediately.
    if (_status === "ready" || _status === "error") {
      setStatus(_status);
      return;
    }

    // Subscribe to future changes.
    const handler = (s: Status) => setStatus(s);
    _listeners.add(handler);

    // Kick off loading if not started.
    if (_status === "idle") loadScript(apiKey);
    else setStatus(_status); // loading — just wait

    return () => {
      _listeners.delete(handler);
    };
  }, []);

  return status;
}
