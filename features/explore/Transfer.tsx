"use client";

/**
 * features/explore/Transfer.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Transfer" — the thin connector between two stops that shows
 * how you get from one to the next. Two modes:
 *  - transit → total duration + a multimodal chip strip (walk → line → walk)
 *  - car     → total duration + a car glyph
 *
 * States: default · hover · open. Opened, a navy summary row sits above
 * a white card detailing the route (per-leg steps for transit, a
 * placeholder for car).
 *
 * Atomic level: organism.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  IconWalk,
  IconBus,
  IconCar,
  IconChevronRight,
  IconX,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { RouteVerifier, type RouteVerifierEndpoint, type RouteVerifierMode } from "./RouteVerifier";
import type { BridgeData } from "@/lib/dal/domain";


export type TransferMode = "transit" | "car" | "walk";
export type TransferState = "default" | "hover" | "open";

export type TransferLeg = { kind: "walk" | "bus"; label: string };
export type TransferStep = {
  kind: "walk" | "bus";
  /** Primary line, e.g. "A piedi 8 minuti" or "Autobus 105 ·". */
  title: string;
  /** Inline continuation of the title in a softer ink (e.g. the stop name). */
  place?: string;
  /** Secondary line, e.g. "10:39 · Colosseo → Plebiscito · 3 fermate". */
  subtitle?: string;
};

/** Destinazione del leg, usata dal pannello aperto in modalità car per
 *  costruire i deep-link a Google Maps e Waze. Alias di
 *  `RouteVerifierEndpoint` — stessi campi, stesso uso (RouteVerifier li
 *  consuma direttamente). */
export type TransferDestination = RouteVerifierEndpoint;

const LEG_ICON = { walk: IconWalk, bus: IconBus } as const;

/* ── Mode switch (rif. /design/transfer-mode) ──────────────────────── */
const MODE_OPTIONS: { key: TransferMode; label: string; icon: typeof IconWalk }[] = [
  { key: "walk",    label: "A piedi", icon: IconWalk },
  { key: "car",     label: "Auto",    icon: IconCar },
  { key: "transit", label: "Mezzi",   icon: IconBus },
];

function ModeSwitch({
  active,
  onChange,
}: {
  active: TransferMode;
  onChange: (next: TransferMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Modalità di trasporto"
      className="flex gap-0.5 rounded-pill bg-surface-soft p-0.5"
    >
      {MODE_OPTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={key === active}
          onClick={() => onChange(key)}
          title={label}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill px-2 py-1.5 text-mini font-medium transition-colors",
            key === active
              ? "bg-ink text-white"
              : "text-ink-soft hover:bg-surface-warm hover:text-ink",
          )}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** TransferMode → RouteVerifierMode. La Transfer.mode legacy includeva
 *  solo "transit"/"car"; ora aggiungiamo "walk" e mappiamo 1:1. */
function toRouteMode(m: TransferMode): RouteVerifierMode {
  return m === "car" ? "car" : m === "walk" ? "walk" : "transit";
}

export function Transfer({
  mode = "transit",
  state = "default",
  duration = "46 min",
  distance,
  muted = false,
  legs = [],
  origin,
  destination,
  departureTime,
  onApply,
  onOpen,
  onClose,
  className,
}: {
  mode?: TransferMode;
  state?: TransferState;
  duration?: string;
  /** Distanza formattata (es. "32 km"). Renderizzata dopo la durata
   *  quando presente — in attesa di `distance_m` su BridgeData. */
  distance?: string;
  /**
   * Giorno NON selezionato (/design/timeline-readability it.10): il
   * transfer si riduce a uno spacer muto non interattivo — i tempi di
   * percorrenza si mostrano solo a giorno espanso. L'host (Timeline)
   * decide, incl. l'eccezione leg lunghi ≥60 min che restano visibili.
   * Ignorato quando state="open".
   */
  muted?: boolean;
  /** Collapsed transit chip strip. */
  legs?: TransferLeg[];
  /**
   * @deprecated Legacy: lista di "step" precomputati per l'open state.
   * Oggi l'open state si pilota dal `RouteVerifier` (vedi `origin` /
   * `destination` / `onApply`). Manteniamo la prop solo come no-op per
   * non rompere i caller in flight; rimossa quando tutti migrano.
   */
  steps?: TransferStep[];
  /**
   * Open-state dependencies (rif. /design/transfer-mode). Quando presenti
   * insieme a `onApply`, il body dell'open ospita il ModeSwitch +
   * RouteVerifier interattivo: lo switch ricomputa il leg, il bottone
   * "Usa questa" applica il bridge tramite `onApply`.
   *
   * Quando uno qualsiasi manca, l'open state mostra solo il summary
   * navy + il vecchio fallback per car (deep-link Maps/Waze) — utile
   * a sandbox / situazioni in cui l'host non ha ancora wire-up.
   */
  origin?: RouteVerifierEndpoint;
  destination?: RouteVerifierEndpoint;
  departureTime?: string;
  /** Callback dell'apply: l'host scrive BridgeData su
   *  scheduled_activities.bridge_out_json (PATCH instance) e ricarica
   *  la timeline. La modalità riflette quello che l'utente ha scelto. */
  onApply?: (bridge: BridgeData) => void;
  onOpen?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const open = state === "open";
  // Stato locale del ModeSwitch: parte dalla `mode` corrente del bridge
  // salvato; lo switch lo cambia senza notificare l'host (sarà l'apply a
  // persistere). Re-sync su `mode` quando l'host passa una nuova prop.
  const [localMode, setLocalMode] = useState<TransferMode>(mode);
  const [lastMode, setLastMode] = useState<TransferMode>(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setLocalMode(mode);
  }
  const ModeIcon = localMode === "car" ? IconCar : localMode === "walk" ? IconWalk : IconBus;

  /* Summary row (shared by collapsed + open header) — `dark` flips the
     palette to white for the open navy header.
     Resa /design/timeline-readability it.3+: tutto left-aligned, icona
     modalità 13px + durata 11px semibold + (distanza) + legs transit
     walk › linea › walk. Niente più text-nano (8px, illeggibile). */
  const summary = (dark: boolean) => (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 px-2.5 text-[11px]",
        dark ? "text-white/80" : "text-ink-soft",
      )}
    >
      <ModeIcon
        size={13}
        className={cn("shrink-0", dark ? "text-white/80" : "text-ink/55")}
      />
      <span className={cn("font-semibold", dark ? "text-white" : "text-ink")}>
        {duration}
      </span>
      {distance ? (
        <>
          <span className={dark ? "text-white/50" : "text-ink-faint"}>·</span>
          <span>{distance}</span>
        </>
      ) : null}
      {mode === "transit" && legs.length > 0 ? (
        <>
          <span className={dark ? "text-white/50" : "text-ink-faint"}>·</span>
          {legs.map((leg, i) => {
            const Icon = LEG_ICON[leg.kind];
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 ? (
                  <IconChevronRight
                    size={8}
                    className={cn("shrink-0", dark ? "text-white/60" : "text-ink-faint")}
                  />
                ) : null}
                <Icon
                  size={11}
                  className={cn("shrink-0", dark ? "text-white/80" : "text-ink/55")}
                />
                <span
                  className={cn(
                    leg.kind === "bus" &&
                      (dark ? "font-medium text-white" : "font-medium text-ink"),
                  )}
                >
                  {leg.label}
                </span>
              </span>
            );
          })}
        </>
      ) : null}
    </div>
  );

  /* ── Muted (giorno non selezionato) ─────────────────────────── */
  if (!open && muted) {
    return <div aria-hidden className={cn("h-3 w-full", className)} />;
  }

  /* ── Collapsed ──────────────────────────────────────────────── */
  if (!open) {
    const Wrapper = onOpen ? "button" : "div";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "flex min-h-[22px] w-full items-center rounded-sm py-1",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-warm",
          className,
        )}
      >
        {summary(false)}
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */
  // Modalità interattiva (rif. /design/transfer-mode): richiede coords
  // origin + destination + callback onApply. Sandbox e v1 deprecata che
  // non li passano cadono nel fallback statico ("steps" precalcolati).
  const canVerify = !!origin && !!destination && !!onApply;

  // Wrapper sicuro per onApply nello switch: setta lo state locale, poi
  // il RouteVerifier (rimontato col nuovo cacheKey) fetcha le opzioni
  // della nuova modalità. L'apply scrive il bridge + chiude (host).
  const handleApply = (bridge: BridgeData) => {
    onApply?.(bridge);
  };

  return (
    <div className={cn("flex w-full flex-col gap-[7px] rounded-sm bg-ink p-1", className)}>
      {/* Header navy: summary del bridge corrente + close. */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1">{summary(true)}</div>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 text-white/70 hover:text-white"
        >
          <IconX />
        </Button>
      </div>

      <div className="flex w-full flex-col gap-2.5 rounded-sm bg-surface px-3 py-3">
        {/* ModeSwitch sempre visibile in open: l'utente deve poter cambiare
            modalità (a livello UI) anche quando il consumer non ha passato
            le coords o l'apply. Senza canVerify il cambio resta locale —
            l'apply persistente serve canVerify=true. */}
        <ModeSwitch active={localMode} onChange={setLocalMode} />
        {canVerify ? (
          <RouteVerifier
            mode={toRouteMode(localMode)}
            origin={origin}
            destination={destination}
            departureTime={departureTime}
            onApply={handleApply}
          />
        ) : (
          // Fallback statico per sandbox / v1 che non passano le coords:
          // mostriamo i precomputati `legs` come strip read-only.
          <div className="flex flex-col gap-2 py-1">
            {legs.length === 0 ? (
              <p className="text-mini text-ink-soft">Nessun dato di percorso disponibile.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-mini text-ink">
                {legs.map((leg, i) => {
                  const Icon = LEG_ICON[leg.kind];
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 ? <IconChevronRight size={8} className="text-ink-faint" /> : null}
                      <Icon size={13} className="text-ink/55" />
                      <span className="font-medium">{leg.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
