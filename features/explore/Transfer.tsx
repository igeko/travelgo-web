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

import {
  IconWalk,
  IconBus,
  IconCar,
  IconClock,
  IconChevronRight,
  IconBrandGoogleMaps,
  IconBrandWaze,
  IconX,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type TransferMode = "transit" | "car";
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
 *  costruire i deep-link a Google Maps e Waze. `placeId` (Google) è
 *  opzionale: quando presente arricchisce il link Maps per una
 *  destinazione più precisa (ingresso/entrata del POI vs centroide). */
export type TransferDestination = {
  lat: number;
  lng: number;
  placeId?: string | null;
  /** Nome della destinazione, usato come label nel deep-link Maps. */
  title?: string;
};

const LEG_ICON = { walk: IconWalk, bus: IconBus } as const;

/** Costruisce l'URL deep-link a Google Maps Directions. L'origine è
 *  lasciata libera così Maps usa la posizione corrente dell'utente —
 *  comportamento atteso per "portami là". */
function googleMapsUrl(d: TransferDestination): string {
  const dest = encodeURIComponent(d.title ?? `${d.lat},${d.lng}`);
  const placeQs = d.placeId ? `&destination_place_id=${encodeURIComponent(d.placeId)}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${placeQs}`;
}

/** Waze deep-link. Accetta solo coords (niente placeId), `navigate=yes`
 *  fa partire la navigazione direttamente. */
function wazeUrl(d: TransferDestination): string {
  return `https://www.waze.com/ul?ll=${d.lat}%2C${d.lng}&navigate=yes`;
}

export function Transfer({
  mode = "transit",
  state = "default",
  duration = "46 min",
  legs = [],
  steps = [],
  destination,
  onOpen,
  onClose,
  className,
}: {
  mode?: TransferMode;
  state?: TransferState;
  duration?: string;
  /** Collapsed transit chip strip. */
  legs?: TransferLeg[];
  /** Open transit route detail. */
  steps?: TransferStep[];
  /** Quando il modo è "car" e questa è passata, il pannello aperto mostra
   *  due bottoni Maps/Waze invece del testo placeholder. */
  destination?: TransferDestination;
  onOpen?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const open = state === "open";

  /* Summary row (shared by collapsed + open header) — `dark` flips the
     palette to white for the open navy header. */
  const summary = (dark: boolean) => (
    <div className="flex w-full items-center gap-4 px-6">
      <span
        className={cn(
          "flex w-[54px] shrink-0 items-center gap-1 py-0.5 text-nano",
          dark ? "text-white" : "text-ink-soft",
        )}
      >
        <IconClock size={9} className="shrink-0" />
        {duration}
      </span>

      {mode === "car" ? (
        <IconCar size={14} className={cn("shrink-0", dark ? "text-white" : "text-ink-soft")} />
      ) : (
        <span className="flex flex-1 items-center justify-end gap-1.5">
          {legs.map((leg, i) => {
            const Icon = LEG_ICON[leg.kind];
            return (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <IconChevronRight
                    size={8}
                    className={cn("shrink-0", dark ? "text-white/60" : "text-ink-faint")}
                  />
                ) : null}
                <span
                  className={cn(
                    "flex items-center gap-1 text-nano",
                    leg.kind === "bus"
                      ? dark
                        ? "font-medium text-white"
                        : "font-medium text-ink"
                      : dark
                        ? "text-white"
                        : "text-ink-soft",
                  )}
                >
                  <Icon size={leg.kind === "bus" ? 11 : 8} className="shrink-0" />
                  {leg.label}
                </span>
              </span>
            );
          })}
        </span>
      )}
    </div>
  );

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
          state === "hover" && "bg-surface-soft",
          className,
        )}
      >
        {summary(false)}
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */
  return (
    <div className={cn("flex w-full flex-col gap-[7px] rounded-sm bg-ink p-1", className)}>
      <div className="py-0.5">{summary(true)}</div>

      <div className="flex w-full flex-col gap-2 rounded-sm bg-surface px-4 py-4">
        <div className="flex w-full justify-end">
          <Button size="sm" variant="ghost" iconOnly onClick={onClose} aria-label="Close">
            <IconX />
          </Button>
        </div>

        {mode === "car" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconCar size={20} className="shrink-0 text-ink-soft" />
              <span className="text-micro text-ink-soft">
                {destination
                  ? "Apri la navigazione"
                  : "Aggiungi una destinazione per navigare"}
              </span>
            </div>
            {destination && (
              <div className="flex gap-2">
                <a
                  href={googleMapsUrl(destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm",
                    "border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink",
                    "transition-colors hover:bg-surface-soft",
                  )}
                >
                  <IconBrandGoogleMaps size={14} className="shrink-0" />
                  Google Maps
                </a>
                <a
                  href={wazeUrl(destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm",
                    "border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink",
                    "transition-colors hover:bg-surface-soft",
                  )}
                >
                  <IconBrandWaze size={14} className="shrink-0" />
                  Waze
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {steps.map((step, i) => {
              const Icon = LEG_ICON[step.kind];
              return (
                <div key={i} className="flex w-full items-start gap-2">
                  <Icon size={20} className="mt-0.5 shrink-0 text-ink-soft" />
                  {step.subtitle ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-micro font-medium text-ink">
                        {step.title}
                        {step.place ? <span className="text-ink-soft"> {step.place}</span> : null}
                      </p>
                      <p className="text-micro text-ink-soft">{step.subtitle}</p>
                    </div>
                  ) : (
                    <span className="text-micro text-ink-soft">{step.title}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
