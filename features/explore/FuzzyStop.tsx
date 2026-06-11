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

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { IconCoffee } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { EditableText } from "@/components/ui/EditableText";
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
  const t = useTranslations("HeroBanner");

  /* ── Collapsed rows ─────────────────────────────────────────── */
  if (state !== "open") {
    const selected = state === "selected";
    const Wrapper = onOpen ? "button" : "div";
    const compact = size === "sm";
    return (
      <Wrapper
        type={onOpen ? "button" : undefined}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center rounded-sm",
          compact ? "gap-1.5 px-1 py-0.5" : "gap-2 p-1",
          onOpen && "cursor-pointer",
          state === "hover" && "bg-surface-soft",
          selected && "bg-ink",
          className,
        )}
      >
        <Icon
          size={compact ? 13 : 16}
          className={cn("shrink-0", selected ? "text-white" : "text-ink-soft")}
        />
        <span
          className={cn(
            "truncate font-medium capitalize",
            compact ? "text-[11px]" : "text-mini",
            selected ? "text-white" : "text-ink-soft",
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
        <Icon size={16} className="shrink-0 text-white" />
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
