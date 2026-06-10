"use client";

/**
 * features/explore/RouteVerifier.tsx
 * ─────────────────────────────────────────────────────────────────
 * Generalizzazione del TransitVerifier (features/activity/Timeline/
 * TransitVerifier.tsx) — un solo componente per tutte le modalità di
 * viaggio supportate dal Transfer open: walk, car, transit.
 *
 * - mode="transit" → /api/routes/transit → N opzioni (UI attuale del
 *   verifier, segments walk › linea › walk + headsign/orari/cambi).
 * - mode="walk"|"car" → /api/routes (compute) → 1 opzione (durata +
 *   distanza). Per "car" mostra anche i deep-link Maps/Waze sotto la
 *   lista quando `destination.placeId` è disponibile.
 *
 * UX (rif. /design/transfer-mode):
 * - Il fetch parte automaticamente al primo render e ad ogni cambio di
 *   `mode` (lo switch ModeSwitch in Transfer è la richiesta).
 * - Click su una OptionRow → SELEZIONE locale (no persist).
 * - Bottone "Usa questa" → `onApply(BridgeData)` → l'host scrive il
 *   bridge_out_json e ricomputa la timeline.
 * - Cache in-memory per la stessa coppia (origin, dest, mode): evita
 *   refetch tornando avanti/indietro fra i mode.
 *
 * Atomic level: organism. Composta dentro Transfer (open state).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBrandGoogleMaps,
  IconBrandWaze,
  IconBus,
  IconCar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconLoader2,
  IconRefresh,
  IconWalk,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import type {
  RideSegment,
  TransitOption,
  TransitSegment,
} from "@/lib/client/routes";
import type { BridgeData } from "@/lib/dal/domain";

export type RouteVerifierMode = "walk" | "car" | "transit";

export type RouteVerifierEndpoint = {
  lat: number;
  lng: number;
  /** Etichetta human-readable (place name) usata dai deep-link Maps. */
  label?: string;
  /** Google Place ID — quando presente, arricchisce il deep-link Maps. */
  placeId?: string | null;
};

type CarOption = { kind: "car"; durationMin: number; distanceMeters: number | null };
type WalkOption = { kind: "walk"; durationMin: number; distanceMeters: number | null };

/** Modello interno unificato per la OptionRow — la stessa UI serve sia
 *  le N opzioni transit sia l'opzione singola walk/car. */
type Option = TransitOption | CarOption | WalkOption;

type Status = "loading" | "error" | "ready";

/* ── In-memory cache (cross-render, same browser session) ─────────── */

type CacheKey = string;
type CacheEntry = {
  status: Status;
  options: Option[];
  error: string | null;
};
const CACHE = new Map<CacheKey, CacheEntry>();

function keyOf(
  mode: RouteVerifierMode,
  origin: RouteVerifierEndpoint,
  destination: RouteVerifierEndpoint,
  departureTime?: string,
): CacheKey {
  return `${mode}|${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${departureTime ?? ""}`;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatKm(distanceMeters: number | null): string | null {
  if (distanceMeters == null) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  const km = distanceMeters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function googleMapsUrl(d: RouteVerifierEndpoint): string {
  const dest = encodeURIComponent(d.label ?? `${d.lat},${d.lng}`);
  const placeQs = d.placeId ? `&destination_place_id=${encodeURIComponent(d.placeId)}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${placeQs}`;
}
function wazeUrl(d: RouteVerifierEndpoint): string {
  return `https://www.waze.com/ul?ll=${d.lat}%2C${d.lng}&navigate=yes`;
}

/* ── Fetcher per modalità ─────────────────────────────────────────── */

async function fetchTransit(
  origin: RouteVerifierEndpoint,
  destination: RouteVerifierEndpoint,
  departureTime?: string,
): Promise<Option[]> {
  const { options } = await api.routes.transit(
    { lat: origin.lat, lng: origin.lng },
    { lat: destination.lat, lng: destination.lng },
    departureTime,
  );
  return options;
}

async function fetchCompute(
  origin: RouteVerifierEndpoint,
  destination: RouteVerifierEndpoint,
  mode: "walk" | "car",
): Promise<Option[]> {
  const travelMode = mode === "car" ? "DRIVING" : "WALKING";
  const res = await api.routes.compute(
    [
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
    ],
    travelMode,
  );
  if (!res.durationSec) return [];
  const durationMin = Math.max(1, Math.round(res.durationSec / 60));
  const distanceMeters = res.distanceMeters ?? null;
  return [{ kind: mode, durationMin, distanceMeters }];
}

/* ── Atomi UI ─────────────────────────────────────────────────────── */

function SegmentIcon({ segment }: { segment: TransitSegment }) {
  if (segment.kind === "walk") return <IconWalk size={13} className="text-ink/55" />;
  return <IconBus size={13} className="text-ink/55" />;
}

function rideLabel(r: RideSegment): string {
  return [r.vehicleLabel, r.line].filter(Boolean).join(" ") || r.transport;
}

/** Note compatto per BridgeData.note (solo segments ride, es. "Bus 105 · 3 fermate"). */
function noteForTransit(option: TransitOption): string {
  return option.segments
    .filter((s): s is RideSegment => s.kind === "ride")
    .map((r) => {
      const label = rideLabel(r);
      const stops = r.stopCount != null ? ` · ${r.stopCount} fermate` : "";
      return `${label}${stops}`;
    })
    .join(" → ");
}

function OptionRow({
  option,
  selected,
  onClick,
}: {
  option: Option;
  selected: boolean;
  onClick: () => void;
}) {
  const isTransit = "segments" in option;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
        selected
          ? "border-ink bg-surface-soft"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5 text-mini text-ink">
          {isTransit ? (
            option.segments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 ? <IconChevronRight size={8} className="text-ink-faint" /> : null}
                <SegmentIcon segment={seg} />
                <span className={cn("font-medium", seg.kind === "walk" && "text-ink/70")}>
                  {seg.kind === "walk" ? `${seg.durationMin} min` : (seg.line ?? rideLabel(seg))}
                </span>
              </span>
            ))
          ) : (
            <span className="flex items-center gap-1">
              {option.kind === "car"
                ? <IconCar size={13} className="text-ink/55" />
                : <IconWalk size={13} className="text-ink/55" />
              }
              <span className="font-medium">{formatKm(option.distanceMeters) ?? "—"}</span>
            </span>
          )}
        </span>
        {isTransit ? (
          <SubLineTransit option={option} />
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-mini font-semibold tabular-nums text-ink">
        <IconClock size={12} className="text-ink-soft" />
        {formatMinutes("durationMin" in option ? option.durationMin : (option as TransitOption).durationMin)}
      </span>
      {selected ? (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
          <IconCheck size={11} />
        </span>
      ) : null}
    </button>
  );
}

function SubLineTransit({ option }: { option: TransitOption }) {
  const firstRide = option.segments.find((s): s is RideSegment => s.kind === "ride");
  if (!firstRide) return null;
  const parts: string[] = [];
  if (firstRide.departureTime) parts.push(firstRide.departureTime);
  if (firstRide.departureStop && firstRide.arrivalStop) {
    parts.push(`${firstRide.departureStop} → ${firstRide.arrivalStop}`);
  }
  const rideCount = option.segments.filter((s) => s.kind === "ride").length;
  if (rideCount > 1) parts.push(`${rideCount - 1} cambi`);
  return parts.length > 0 ? (
    <span className="text-[11px] text-ink-soft">{parts.join(" · ")}</span>
  ) : null;
}

/* ── Component ────────────────────────────────────────────────────── */

export function RouteVerifier({
  mode,
  origin,
  destination,
  departureTime,
  onApply,
  className,
}: {
  mode: RouteVerifierMode;
  origin: RouteVerifierEndpoint;
  destination: RouteVerifierEndpoint;
  departureTime?: string;
  /** Callback invocato al click su "Usa questa" — l'host scrive il
   *  BridgeData (es. PATCH scheduled_activities → bridge_out_json). */
  onApply: (bridge: BridgeData) => void;
  className?: string;
}) {
  // Cache key per (mode, origin, dest, departureTime).
  const cacheKey = useMemo(
    () => keyOf(mode, origin, destination, departureTime),
    [mode, origin.lat, origin.lng, destination.lat, destination.lng, departureTime],
  );

  // Lookup iniziale dalla cache; durante la stessa sessione di pannello
  // aperto, switch tra modalità non causa refetch se già visti.
  const cached = CACHE.get(cacheKey);
  const [status, setStatus] = useState<Status>(cached?.status ?? "loading");
  const [options, setOptions] = useState<Option[]>(cached?.options ?? []);
  const [errorMsg, setErrorMsg] = useState<string | null>(cached?.error ?? null);
  const [selected, setSelected] = useState(0);

  // Anti-race: ogni fetch ha un id; quando la prop cambia rapidamente
  // (es. due click consecutivi sullo switch), solo l'ultimo risultato
  // sovrascrive lo state.
  const fetchIdRef = useRef(0);

  useEffect(() => {
    // Se cached, lo state è già rispecchiato dal lookup iniziale.
    if (cached?.status === "ready" || cached?.status === "error") {
      setStatus(cached.status);
      setOptions(cached.options);
      setErrorMsg(cached.error);
      return;
    }

    let cancelled = false;
    const id = ++fetchIdRef.current;
    setStatus("loading");
    setErrorMsg(null);
    setOptions([]);

    const fetcher =
      mode === "transit"
        ? fetchTransit(origin, destination, departureTime)
        : fetchCompute(origin, destination, mode);

    fetcher
      .then((opts) => {
        if (cancelled || id !== fetchIdRef.current) return;
        if (opts.length === 0) {
          const entry: CacheEntry = { status: "error", options: [], error: "Nessun percorso disponibile" };
          CACHE.set(cacheKey, entry);
          setStatus("error");
          setErrorMsg(entry.error);
          return;
        }
        const entry: CacheEntry = { status: "ready", options: opts, error: null };
        CACHE.set(cacheKey, entry);
        setOptions(opts);
        setSelected(0);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled || id !== fetchIdRef.current) return;
        const entry: CacheEntry = { status: "error", options: [], error: "Errore di rete" };
        CACHE.set(cacheKey, entry);
        setStatus("error");
        setErrorMsg(entry.error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  function retry() {
    CACHE.delete(cacheKey);
    // Forza un refetch invalidando la cache e re-runnando l'effect.
    setStatus("loading");
    fetchIdRef.current++;
    const fetcher =
      mode === "transit"
        ? fetchTransit(origin, destination, departureTime)
        : fetchCompute(origin, destination, mode);
    fetcher
      .then((opts) => {
        if (opts.length === 0) {
          CACHE.set(cacheKey, { status: "error", options: [], error: "Nessun percorso disponibile" });
          setStatus("error");
          setErrorMsg("Nessun percorso disponibile");
          return;
        }
        CACHE.set(cacheKey, { status: "ready", options: opts, error: null });
        setOptions(opts);
        setSelected(0);
        setStatus("ready");
      })
      .catch(() => {
        CACHE.set(cacheKey, { status: "error", options: [], error: "Errore di rete" });
        setStatus("error");
        setErrorMsg("Errore di rete");
      });
  }

  function apply() {
    const opt = options[selected];
    if (!opt) return;
    let bridge: BridgeData;
    if ("segments" in opt) {
      // Transit: usa la prima ride come "rappresentativa" della tratta.
      const firstRide = opt.segments.find((s): s is RideSegment => s.kind === "ride");
      bridge = {
        transport: (firstRide?.transport ?? "bus") as BridgeData["transport"],
        duration_min: opt.durationMin,
        line: firstRide?.line ?? null,
        note: noteForTransit(opt) || null,
        stops: null,
      };
    } else {
      bridge = {
        transport: opt.kind === "car" ? "car" : "walk",
        duration_min: opt.durationMin,
        line: null,
        note: null,
        stops: null,
      };
    }
    onApply(bridge);
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {status === "loading" ? (
        <div className="flex items-center gap-2 py-3 text-mini text-ink-soft">
          <IconLoader2 size={15} className="animate-spin" />
          Calcolo i percorsi…
        </div>
      ) : status === "error" ? (
        <div className="flex items-center justify-between gap-2 py-1">
          <p className="text-mini text-danger-fg">{errorMsg ?? "Errore"}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink"
          >
            <IconRefresh size={12} />
            Riprova
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {options.map((opt, i) => (
              <OptionRow
                key={i}
                option={opt}
                selected={i === selected}
                onClick={() => setSelected(i)}
              />
            ))}
          </div>

          {/* Per car: deep-link Maps/Waze sotto la lista (la lista ha
              un'unica opzione, quindi la coppia di bottoni è sempre
              visibile quando c'è una destination). */}
          {mode === "car" && (
            <div className="flex gap-2">
              <a
                href={googleMapsUrl(destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink transition-colors hover:bg-surface-soft"
              >
                <IconBrandGoogleMaps size={14} className="shrink-0" />
                Google Maps
              </a>
              <a
                href={wazeUrl(destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink transition-colors hover:bg-surface-soft"
              >
                <IconBrandWaze size={14} className="shrink-0" />
                Waze
              </a>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink"
            >
              <IconRefresh size={12} />
              Ricalcola
            </button>
            <button
              type="button"
              onClick={apply}
              className="cursor-pointer rounded-pill bg-primary px-4 py-1.5 text-mini font-medium text-white transition-colors hover:bg-orange-deep"
            >
              Usa questa
            </button>
          </div>
        </>
      )}
    </div>
  );
}
