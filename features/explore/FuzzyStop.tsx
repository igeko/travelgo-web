"use client";

/**
 * features/explore/FuzzyStop.tsx
 * ─────────────────────────────────────────────────────────────────
 * Figma "Fuzzy" — a fuzzy-time stop in the Explore timeline (e.g. a
 * coffee break). Variante leggera di ActivityStop: la riga collapsed
 * è un piccolo glyph + label; quando aperta, condivide lo STESSO
 * ordine di blocchi della card aperta di ActivityStop (mode="stop"):
 *   1. InlineActivityTime — chip arrivo/partenza + riga durata + picker
 *   2. Descrizione editabile (EditableText) o paragrafo read-only
 *   3. AddressField inline (con backfill /api/places/details)
 *
 * Il titolo nell'header è editabile (StopEditorCard `onTitleCommit`)
 * esattamente come per ActivityStop quando il consumer passa il
 * callback.
 *
 * States: default · hover · selected (navy) · open.
 *
 * Atomic level: organism. Composes StopEditorCard + EditableText +
 * AddressField + InlineActivityTime.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { IconCoffee } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { EditableText } from "@/components/ui/EditableText";
import { CategoryIconPicker } from "@/features/activity/IconPicker";
import { StopEditorCard } from "./StopEditorCard";
import { InlineActivityTime, type ClockHM } from "./InlineActivityTime";
import { type ActivityTime } from "./ArrivalDeparture";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type FuzzyStopState = "default" | "hover" | "selected" | "open";
/** Scala visiva del collapsed (vedi `ActivityStopSize`). */
export type FuzzyStopSize = "md" | "sm";

export function FuzzyStop({
  title,
  icon: Icon = IconCoffee,
  iconKey = null,
  onIconChange,
  state = "default",
  description,
  onTitleCommit,
  onShortDescCommit,
  // Address: stesso pattern di ActivityStop (4 primitivi → PlaceResult
  // memoizzato, evitano re-sync mentre l'utente digita).
  addressLocation = null,
  addressPlaceId = null,
  addressLat = null,
  addressLng = null,
  onAddressChange,
  // Tempi calcolati dal solver + handler di commit per i picker.
  arrivalHM,
  departureHM,
  arrivalDateLabel,
  departureDateLabel,
  durationMin,
  onArrivalChange,
  onDepartureChange,
  onDurationChange,
  onOpen,
  onClose,
  onRemove,
  size = "md",
  className,
}: {
  title: string;
  icon?: IconCmp;
  /** Chiave dell'icona corrente (es. "coffee"). Quando settata col
   *  callback `onIconChange`, lo StopIconBadge nell'header open diventa
   *  trigger del CategoryIconPicker. */
  iconKey?: string | null;
  onIconChange?: (iconKey: string) => void;
  state?: FuzzyStopState;
  description?: string;
  /** Editor inline del titolo nell'header (StopEditorCard). */
  onTitleCommit?: (next: string) => void | Promise<void>;
  /** Editor inline della descrizione (short_desc). */
  onShortDescCommit?: (next: string) => void | Promise<void>;
  /** Address come 4 primitivi (NON un oggetto PlaceResult composto): il
   *  PlaceResult viene sintetizzato via useMemo, così AddressField non
   *  rifire il sync effect ad ogni render del parent. */
  addressLocation?: string | null;
  addressPlaceId?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  onAddressChange?: (place: PlaceResult | null) => void;
  /** Tempi calcolati dal solver (cascade): valori in HH:mm numerico,
   *  identici a quelli usati da `ActivityStop` open per le chip di
   *  arrivo/partenza/durata. */
  arrivalHM?: ClockHM;
  departureHM?: ClockHM;
  arrivalDateLabel?: string;
  departureDateLabel?: string;
  durationMin?: number;
  onArrivalChange?: (hm: ClockHM) => void;
  onDepartureChange?: (hm: ClockHM) => void;
  onDurationChange?: (durationMin: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onRemove?: () => void;
  /** Scala visiva del collapsed. Default "md". */
  size?: FuzzyStopSize;
  className?: string;
}) {
  // Namespace "Explore": titlePlaceholder / descriptionPlaceholder vivono
  // qui, esattamente come per ActivityStop (sibling component). Il vecchio
  // "HeroBanner" era un residuo che lanciava MISSING_MESSAGE.
  const t = useTranslations("Explore");

  /* ── Collapsed rows ─────────────────────────────────────────── */
  if (state !== "open") {
    // Marcatore unificato lista↔mappa (/design/timeline-readability it.17):
    // cerchio tratteggiato col glifo della categoria. Hover (mouse) e
    // selected (sync da hoveredRowId mappa) condividono la stessa resa
    // ink-fill, così non c'è dissonanza fra le due provenienze di
    // "evidenziato". Compact (mobile): stesso badge, solo padding row
    // più stretto.
    const filled = state === "selected" || state === "hover";
    const Wrapper = onOpen ? "button" : "div";
    const compact = size === "sm";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          // text-left esplicito: quando Wrapper è <button> il default
          // browser è text-align:center, che faceva centrare il titolo
          // dentro lo span flex-1 invece di farlo iniziare subito dopo
          // il badge icona.
          //
          // Padding/min-h/gap allineati a ActivityStop collapsed:
          //   - pl-1 (4px) → left edge del badge fuzzy combacia col
          //     left edge del StopIconBadge delle activity (allineamento
          //     verticale del marcatore nella timeline);
          //   - min-h-8 (32px) → stessa altezza row delle activity;
          //   - gap-2 (8px) badge↔titolo, identico al gap interno di
          //     ActivityStop.
          // Il badge circolare resta 26px per spec it.17, quindi il suo
          // bordo destro sporge ~2px rispetto allo StopIconBadge 24px:
          // l'allineamento di riferimento è sul LEFT EDGE.
          "group flex w-full items-center rounded-sm pl-1 text-left",
          compact ? "min-h-8 gap-2 pr-3" : "min-h-8 gap-2 pr-3.5",
          onOpen && "cursor-pointer",
          !filled && "hover:bg-surface-warm",
          className,
        )}
      >
        <span
          className={cn(
            // Bordo SOLIDO navy ink (brand) + transizione colors all'hover/
            // filled → fill ink, icona bianca. Identica resa del pin sulla
            // mappa (makeFuzzyPin) → identità 1:1 row↔pin.
            "flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-solid border-ink transition-colors",
            filled
              ? "bg-ink text-white"
              : "bg-surface text-ink group-hover:bg-ink group-hover:text-white",
          )}
        >
          <Icon size={13} className="shrink-0" />
        </span>
        <span
          className={cn(
            "flex-1 truncate text-mini",
            filled ? "text-ink" : "text-ink-soft",
          )}
        >
          {title}
        </span>
      </Wrapper>
    );
  }

  /* ── Open ───────────────────────────────────────────────────── */

  // Address backfill (stesso pattern di ActivityStop): se l'attività ha
  // solo place_id ma il testo formattato è NULL, lo recuperiamo via
  // /api/places/details (cache server 24h) così l'AddressField mostra
  // qualcosa di leggibile invece del placeholder vuoto.
  // Hook condizionale → React richiede che gli hook siano nella stessa
  // sequenza, quindi questo blocco vive sotto il return collapsed (ok
  // perché collapsed termina con `return Wrapper`).
  return (
    <OpenFuzzyStop
      title={title}
      icon={Icon}
      iconKey={iconKey}
      onIconChange={onIconChange}
      description={description}
      onTitleCommit={onTitleCommit}
      onShortDescCommit={onShortDescCommit}
      addressLocation={addressLocation}
      addressPlaceId={addressPlaceId}
      addressLat={addressLat}
      addressLng={addressLng}
      onAddressChange={onAddressChange}
      arrivalHM={arrivalHM}
      departureHM={departureHM}
      arrivalDateLabel={arrivalDateLabel}
      departureDateLabel={departureDateLabel}
      durationMin={durationMin}
      onArrivalChange={onArrivalChange}
      onDepartureChange={onDepartureChange}
      onDurationChange={onDurationChange}
      onClose={onClose}
      onRemove={onRemove}
      className={className}
      t={t}
    />
  );
}

/** Sotto-componente per lo stato OPEN: serve a rispettare l'invariante
 *  React degli hooks (collapsed vs open hanno diversi hook). Il blocco
 *  open ha lo state per il fetched address + il useMemo per PlaceResult. */
function OpenFuzzyStop({
  title,
  icon: Icon,
  iconKey,
  onIconChange,
  description,
  onTitleCommit,
  onShortDescCommit,
  addressLocation,
  addressPlaceId,
  addressLat,
  addressLng,
  onAddressChange,
  arrivalHM,
  departureHM,
  arrivalDateLabel,
  departureDateLabel,
  durationMin,
  onArrivalChange,
  onDepartureChange,
  onDurationChange,
  onClose,
  onRemove,
  className,
  t,
}: {
  title: string;
  icon: IconCmp;
  iconKey?: string | null;
  onIconChange?: (iconKey: string) => void;
  description?: string;
  onTitleCommit?: (next: string) => void | Promise<void>;
  onShortDescCommit?: (next: string) => void | Promise<void>;
  addressLocation: string | null;
  addressPlaceId: string | null;
  addressLat: number | null;
  addressLng: number | null;
  onAddressChange?: (place: PlaceResult | null) => void;
  arrivalHM?: ClockHM;
  departureHM?: ClockHM;
  arrivalDateLabel?: string;
  departureDateLabel?: string;
  durationMin?: number;
  onArrivalChange?: (hm: ClockHM) => void;
  onDepartureChange?: (hm: ClockHM) => void;
  onDurationChange?: (durationMin: number) => void;
  onClose?: () => void;
  onRemove?: () => void;
  className?: string;
  t: ReturnType<typeof useTranslations>;
}) {
  // IconPicker open state — gemellato al pattern di ActivityStop. Lo
  // ricreiamo qui (anziché reidratarlo dal parent) per non far perdere
  // al click-outside l'isolamento del popover.
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!iconPickerOpen) return;
    function onPointerDown(e: PointerEvent) {
      const node = iconPopoverRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setIconPickerOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [iconPickerOpen]);

  const [fetchedFormatted, setFetchedFormatted] = useState<string | null>(null);
  useEffect(() => {
    if (addressLocation) return;
    if (!addressPlaceId) return;
    if (fetchedFormatted) return;
    let cancelled = false;
    api.places
      .details<{ formatted?: string }>(addressPlaceId)
      .then((p) => {
        if (!cancelled && p?.formatted) setFetchedFormatted(p.formatted);
      })
      .catch(() => {
        /* silent — keep placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, [addressLocation, addressPlaceId, fetchedFormatted]);

  const addressValue = useMemo<PlaceResult | null>(() => {
    const effectiveLocation = addressLocation || fetchedFormatted;
    if (
      !effectiveLocation &&
      !addressPlaceId &&
      addressLat == null &&
      addressLng == null
    ) {
      return null;
    }
    return {
      formatted: effectiveLocation ?? "",
      name: effectiveLocation ?? "",
      placeId: addressPlaceId ?? "",
      lat: addressLat ?? 0,
      lng: addressLng ?? 0,
    };
  }, [addressLocation, fetchedFormatted, addressPlaceId, addressLat, addressLng]);

  return (
    <div className={cn("flex w-full flex-col gap-1 rounded-sm bg-ink p-1", className)}>
      <div className="flex items-center gap-2 px-1 py-0.5">
        {onIconChange ? (
          <div ref={iconPopoverRef} className="relative">
            <button
              type="button"
              aria-label="Cambia icona"
              aria-expanded={iconPickerOpen}
              onClick={() => setIconPickerOpen((v) => !v)}
              className={cn(
                "flex cursor-pointer items-center rounded-sm p-0.5 outline-none transition-colors",
                "hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary",
                iconPickerOpen && "bg-white/10",
              )}
            >
              <Icon size={16} className="shrink-0 text-white" />
            </button>
            {iconPickerOpen ? (
              <div className="absolute left-0 top-full z-dropdown mt-2">
                <CategoryIconPicker
                  selectedId={iconKey ?? null}
                  onSelect={(id) => {
                    onIconChange(id);
                    setIconPickerOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Icon size={16} className="shrink-0 text-white" />
        )}
        <span className="truncate text-mini font-medium capitalize text-white">{title}</span>
      </div>

      <StopEditorCard
        icon={Icon}
        title={title}
        onTitleCommit={onTitleCommit}
        titlePlaceholder={t("titlePlaceholder")}
        onClose={onClose}
        onRemove={onRemove}
      >
        {/* 1. Chip arrivo/partenza + durata (stesso ordine di ActivityStop stop). */}
        <InlineActivityTime
          arrivalHM={arrivalHM}
          departureHM={departureHM}
          arrivalDateLabel={arrivalDateLabel}
          departureDateLabel={departureDateLabel}
          durationMin={durationMin}
          onArrivalChange={onArrivalChange}
          onDepartureChange={onDepartureChange}
          onDurationChange={onDurationChange}
        />

        {/* 2. Descrizione: editabile quando il consumer passa onShortDescCommit,
            altrimenti read-only paragrafo. */}
        {onShortDescCommit ? (
          <EditableText
            value={description ?? ""}
            onCommit={onShortDescCommit}
            placeholder={t("descriptionPlaceholder")}
            multiline
            rows={2}
            inputClassName="text-mini text-ink"
          />
        ) : description ? (
          <p className="w-full text-mini text-ink">{description}</p>
        ) : null}

        {/* 3. AddressField inline — picker per aggiungere/cambiare indirizzo. */}
        <AddressField
          value={addressValue}
          onChange={(place) => onAddressChange?.(place)}
          variant="inline"
          placeholder="Address"
          className="border-b border-ink"
        />
      </StopEditorCard>
    </div>
  );
}

// Re-export per non rompere import esistenti (sandbox / Timeline legacy).
export type { ActivityTime };
