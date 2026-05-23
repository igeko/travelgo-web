"use client";

/**
 * BoardingPass — trip hero shaped like an airline boarding pass.
 *
 * Promotes the `/design/trip-home` sketch into a real component. Structure
 * mirrors the sketch; type, color and spacing come from the design system.
 *
 * Inputs split in two:
 *  • `trip` — facts that live on the persisted trip row. Same schema as the
 *    DB (Pick of DbTrip), so nights / departure date / countdown / travelers /
 *    mood are derived here and stay in sync with what's stored.
 *  • everything else (record locator, origin/destination airports + times,
 *    passenger name, Go quote) is not on the trip — it's computed by the AI /
 *    resolved by the consumer and passed in.
 */

import { useLocale, useTranslations } from "next-intl";
import { IconPlane } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DbTrip } from "@/lib/dal/types";

/** One leg of the journey (origin or destination). */
export type BoardingEndpoint = {
  /** City name, shown large. */
  city: string;
  /** IATA-style airport code, e.g. "FCO". */
  code: string;
  /** Free-form time label, e.g. "13:25" or "08:50 +1". */
  time: string;
};

/** Trip facts reused verbatim from the persisted row — same schema. */
type TripFacts = Pick<
  DbTrip,
  "start_date" | "end_date" | "adults_count" | "children_count" | "theme_tags"
>;

export type BoardingPassProps = {
  /** Trip data — identical schema to the stored trip row. */
  trip: TripFacts;
  /** Record locator / PNR-style code, e.g. "TG-2026-TOK". AI/consumer-provided. */
  recordLocator: string;
  /** Lead passenger display name (not stored on the trip). */
  passengerName: string;
  /** Origin leg — not part of the trip schema. */
  origin: BoardingEndpoint;
  /** Destination leg + country (also outside the trip schema). */
  destination: BoardingEndpoint & {
    country: string;
    /** Flag accent color (data-driven, rendered as a dot). */
    countryColor?: string;
  };
  /** Optional Go one-liner shown on the stub. */
  goQuote?: string;
  /** Today, for the countdown. Injectable for tests; defaults to now. */
  now?: Date;
  className?: string;
};

// ── Date helpers (ISO "YYYY-MM-DD" parsed as local, tz-safe) ──────────

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatTicketDate(iso: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(parseIsoLocal(iso));
  return parts.replace(/\./g, "").toUpperCase();
}

const MS_PER_DAY = 86_400_000;

function diffDays(from: Date, toIso: string): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = parseIsoLocal(toIso);
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function nightsBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((parseIsoLocal(endIso).getTime() - parseIsoLocal(startIso).getTime()) / MS_PER_DAY));
}

// ── Component ─────────────────────────────────────────────────────────

export function BoardingPass({
  trip,
  recordLocator,
  passengerName,
  origin,
  destination,
  goQuote,
  now = new Date(),
  className,
}: BoardingPassProps) {
  const t = useTranslations("BoardingPass");
  const locale = useLocale();

  const { start_date, end_date, adults_count, children_count, theme_tags } = trip;

  const dateLabel = start_date ? formatTicketDate(start_date, locale) : "—";
  const nights = start_date && end_date ? nightsBetween(start_date, end_date) : null;
  const daysToGo = start_date ? Math.max(0, diffDays(now, start_date)) : null;

  const travelers = (adults_count ?? 0) + (children_count ?? 0);
  const extraPax = Math.max(0, travelers - 1);
  const passengerLabel = extraPax > 0 ? `${passengerName} +${extraPax}` : passengerName;

  const mood = theme_tags && theme_tags.length > 0 ? theme_tags.join(" · ") : "—";

  return (
    <section
      className={cn(
        "relative grid grid-cols-1 overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[1fr_30%]",
        className,
      )}
    >
      {/* Perforation between ticket body and stub */}
      <span
        className="pointer-events-none absolute inset-y-0 left-[70%] hidden border-l border-dashed border-border-strong lg:block"
        aria-hidden="true"
      />
      <span className="absolute -top-2 left-[calc(70%-8px)] hidden size-4 rounded-full bg-bg lg:block" aria-hidden="true" />
      <span className="absolute -bottom-2 left-[calc(70%-8px)] hidden size-4 rounded-full bg-bg lg:block" aria-hidden="true" />

      {/* Ticket body */}
      <div className="px-7 py-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-tiny font-medium uppercase tracking-eyebrow-wide text-ink-faint">
            {t("title")} · {recordLocator}
          </span>
          <span className="inline-flex items-center gap-1.5 text-tiny font-medium uppercase tracking-eyebrow text-orange-deep">
            <span
              className={cn("inline-block size-4 rounded-full", !destination.countryColor && "bg-orange")}
              style={destination.countryColor ? { backgroundColor: destination.countryColor } : undefined}
            />
            {destination.country}
          </span>
        </div>

        <div className="mb-5 flex items-end gap-6">
          <div>
            <p className="m-0 text-tiny uppercase tracking-eyebrow text-ink-faint">{t("from")}</p>
            <p className="mb-1 mt-1 font-serif text-[28px] font-medium italic leading-none text-ink">{origin.city}</p>
            <p className="m-0 text-tiny text-ink-faint">{origin.code} · {origin.time}</p>
          </div>
          <span className="mb-1.5 text-orange-deep">
            <IconPlane size={26} />
          </span>
          <div>
            <p className="m-0 text-tiny uppercase tracking-eyebrow text-ink-faint">{t("to")}</p>
            <p className="mb-1 mt-0.5 font-serif text-[50px] font-medium italic leading-[0.95] text-ink">
              {destination.city}
            </p>
            <p className="m-0 text-tiny text-ink-faint">
              {destination.code} · {destination.time} · {destination.country}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 border-t border-dashed border-border pt-4 sm:grid-cols-4">
          <TicketField label={t("passenger")} value={passengerLabel} />
          <TicketField label={t("date")} value={dateLabel} />
          <TicketField label={t("stay")} value={nights != null ? t("nights", { count: nights }) : "—"} />
          <TicketField label={t("mood")} value={mood} />
        </div>
      </div>

      {/* Stub */}
      <div className="flex flex-col items-center justify-center bg-ink px-5 py-5 text-center text-white lg:pl-8">
        <p className="m-0 text-tiny uppercase tracking-eyebrow-wide text-primary-soft">{t("departureIn")}</p>
        <div className="my-1.5 flex items-baseline gap-1.5">
          <span className="font-serif text-[78px] font-medium italic leading-[0.85] text-white">
            {daysToGo ?? "—"}
          </span>
          {daysToGo != null && (
            <span className="font-serif text-meta italic text-white/75">{t("days", { count: daysToGo })}</span>
          )}
        </div>
        {goQuote && (
          <p className="mt-1.5 font-serif text-mini italic leading-snug text-white/75">{goQuote}</p>
        )}
      </div>
    </section>
  );
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-micro font-medium uppercase tracking-meta text-ink-faint">{label}</p>
      <p className="mt-0.5 text-mini font-medium text-ink">{value}</p>
    </div>
  );
}
