"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { IconRefresh, IconSparkles } from "@/components/ui/icons";
import type { Day, Activity } from "@/lib/dal/domain";
import type { DescribeDayActivity } from "@/app/api/ai/describe-day/route";
import { useDayNarrative } from "./useDayNarrative";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

const TRANSPORT_RE = /transfer|metro|treno|bus|taxi|aereo|volo|partenza|arrivo|shuttle|ferry|traghetto/i;

type Props = {
  day: Day;
  activities: Activity[];
  enabled: boolean;
};

/* ─────────────────────────────────────────────────────────────────
   DayMagazine
───────────────────────────────────────────────────────────────── */

export function DayMagazine({ day, activities, enabled }: Props) {
  const t = useTranslations("DayMagazine");
  const sorted = useMemo(
    () =>
      [...activities].sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      }),
    [activities],
  );

  const describeActs = useMemo(
    (): DescribeDayActivity[] =>
      sorted.map((a) => ({
        id:          a.id,
        slot:        a.slot,
        time:        a.time,
        name:        a.title,
        description: a.short_desc,
      })),
    [sorted],
  );

  const { narrative, status, regenerate } = useDayNarrative(day, describeActs, enabled);

  /* Sequential numbering */
  const actNum = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((a, i) => m.set(a.id, i + 1));
    return m;
  }, [sorted]);

  /* Photo floats: activities with hero_image, non-transport, alternating sides */
  const photoFloats = useMemo(() => {
    let counter = 0;
    return sorted
      .filter((a) => a.hero_image && !TRANSPORT_RE.test(a.title))
      .map((a) => ({
        id:   a.id,
        url:  a.hero_image!,
        time: a.time,
        name: a.title,
        num:  actNum.get(a.id) ?? 0,
        side: (counter++ % 2 === 0 ? "right" : "left") as "right" | "left",
      }));
  }, [sorted, actNum]);

  /* Pull-quote attribution — find which activity contains the verbatim text */
  const pullQuoteAct = narrative?.pullQuote
    ? sorted.find((a) => a.short_desc?.includes(narrative.pullQuote!))
    : null;

  /* ── States ── */
  if (activities.length === 0) return <MagFrame><EmptyState message={t("addActivities")} /></MagFrame>;
  if (status === "idle" || status === "loading") return <MagFrame><LoadingShimmer /></MagFrame>;
  if (status === "error") return <MagFrame><ErrorState onRetry={regenerate} retryLabel={t("retry")} /></MagFrame>;

  /* ── Content ── */
  return (
    <MagFrame>
    <div className="relative p-5 sm:px-10 sm:pt-[34px] sm:pb-8">

      {/* Stamp */}
      <div
        className="absolute top-[18px] right-[22px] text-tiny italic flex items-center gap-[5px]"
        style={{ color: "var(--color-ink-faint)" }}
      >
        <IconSparkles size={13} style={{ color: "var(--color-orange)" }} />
        <b className="not-italic font-medium" style={{ color: "var(--color-ink-soft)" }}>Go</b>
        &nbsp;· {t("dayStory")}
      </div>

      {/* Deck — standfirst */}
      {narrative?.deck && (
        <p
          className="text-[20px] italic leading-[1.5] max-w-[580px] mb-[28px] font-normal"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}
        >
          <span
            className="inline-flex items-center gap-[3px] not-italic text-tiny font-medium tracking-meta px-[7px] py-[1px] rounded-pill mr-[8px] align-[3px]"
            style={{ fontFamily: "var(--font-sans)", color: "var(--color-orange)", background: "rgba(244,123,58,0.10)" }}
          >
            <IconSparkles size={11} />
            AI
          </span>
          {narrative.deck}
        </p>
      )}

      {/* Body + floated photos */}
      <div className="overflow-hidden">
        {/* Mobile: full-width photos stacked before prose. Desktop: CSS float into prose. */}
        {photoFloats.map((p) => (
          <figure
            key={p.id}
            className={cn(
              "m-0 w-full mb-[14px] sm:w-[220px]",
              p.side === "right"
                ? "sm:float-right sm:ml-[24px] sm:mb-[16px] sm:mt-[4px] sm:clear-right"
                : "sm:float-left sm:mr-[24px] sm:mb-[16px] sm:mt-[4px] sm:clear-left",
            )}
          >
            <div
              className="h-[200px] sm:h-[150px] rounded-sm bg-cover bg-center"
              style={{ backgroundImage: `url(${p.url})` }}
            />
            <figcaption
              className="text-tiny mt-[6px] flex items-center gap-[6px]"
              style={{ color: "var(--color-ink-faint)" }}
            >
              <span
                className="w-[16px] h-[16px] rounded-full border-[0.5px] flex items-center justify-center text-micro font-medium shrink-0"
                style={{ background: "white", borderColor: "var(--color-border-strong)", color: "var(--color-ink)" }}
              >
                {p.num}
              </span>
              <span className="font-medium truncate flex-1" style={{ color: "var(--color-ink)", fontSize: 12 }}>
                {p.name}
              </span>
              {p.time && (
                <span className="font-mono tabular-nums">{p.time}</span>
              )}
            </figcaption>
          </figure>
        ))}

        {/* Narrative prose */}
        {narrative?.body && (
          <p
            className="text-[15.5px] leading-[1.78] m-0 whitespace-pre-wrap"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            {narrative.body}
          </p>
        )}
      </div>

      {/* Pull quote */}
      {narrative?.pullQuote && (
        <blockquote
          className="text-[21px] italic leading-[1.35] py-[18px] pl-[22px] my-[28px] border-l-2 clear-both"
          style={{
            fontFamily:  "var(--font-serif)",
            color:       "var(--color-orange-deep)",
            borderColor: "var(--color-orange)",
          }}
        >
          "{narrative.pullQuote}"
          {pullQuoteAct && (
            <cite
              className="block text-tiny not-italic tracking-eyebrow uppercase mt-[8px]"
              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-sans)" }}
            >
              — {pullQuoteAct.title}
            </cite>
          )}
        </blockquote>
      )}

      {/* Ornament */}
      <div
        className="text-center text-meta tracking-[0.4em] my-[22px] clear-both select-none"
        style={{ color: "#c4baa3" }}
        aria-hidden
      >
        ✦ ✦ ✦
      </div>

      {/* Itinerary recap */}
      <ItineraryGrid acts={sorted} actNum={actNum} />

      {/* Footer */}
      <div
        className="mt-[18px] flex justify-between items-center text-tiny"
        style={{ color: "var(--color-ink-faint)" }}
      >
        {narrative?.generatedAt && (
          <span>
            Generato il{" "}
            {new Date(narrative.generatedAt).toLocaleDateString("it-IT", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
        <button
          onClick={regenerate}
          className="inline-flex items-center gap-[5px] font-medium cursor-pointer bg-transparent border-0 text-tiny font-[inherit]"
          style={{ color: "var(--color-orange-deep)" }}
        >
          <IconRefresh size={12} />
          Rigenera racconto
        </button>
      </div>
    </div>
    </MagFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MagFrame — outer cream container + inner white paper sheet
   Mirrors .frame > .mag from the design:
     .frame  → cream bg, rounded border
     .mag    → white surface, margin, shadow, orange hairline at top
───────────────────────────────────────────────────────────────── */

function MagFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden sm:rounded-lg sm:border-[0.5px]"
      style={{
        background:  "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow:   "0 1px 2px rgba(13,44,61,0.04), 0 6px 22px rgba(13,44,61,0.05)",
      }}
    >
      {/* Orange hairline — "segnalibro" del foglio */}
      <div
        aria-hidden
        style={{
          position:   "absolute",
          top: 0, left: 0, right: 0,
          height:     2,
          background: "linear-gradient(90deg, transparent 0%, var(--color-orange-border) 50%, transparent 100%)",
          opacity:    0.55,
        }}
      />
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ItineraryGrid
───────────────────────────────────────────────────────────────── */

function ItineraryGrid({ acts, actNum }: { acts: Activity[]; actNum: Map<string, number> }) {
  return (
    <div className="pt-[20px]" style={{ borderTop: "0.5px solid var(--color-border)" }}>
      <h3
        className="text-tiny tracking-[0.14em] uppercase font-medium mb-[14px]"
        style={{ color: "var(--color-ink-faint)" }}
      >
        Itinerario
      </h3>
      <div className="grid grid-cols-2 gap-[9px_22px]">
        {acts.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-[10px] text-meta"
            style={{ color: "var(--color-ink)" }}
          >
            <span
              className="w-[18px] h-[18px] rounded-full border-[0.5px] flex items-center justify-center text-tiny font-medium shrink-0"
              style={{ background: "white", borderColor: "var(--color-border-strong)", color: "var(--color-ink)" }}
            >
              {actNum.get(a.id)}
            </span>
            <span className="font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {a.title}
            </span>
            {a.time && (
              <span className="text-tiny font-mono tabular-nums" style={{ color: "var(--color-ink-faint)" }}>
                {a.time}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   States
───────────────────────────────────────────────────────────────── */

function LoadingShimmer() {
  return (
    <div className="px-4 py-5 sm:px-8 sm:py-7">
      <div className="mb-[22px]">
        <span
          className="text-micro px-[9px] py-[3px] rounded-pill tracking-meta uppercase font-medium inline-flex items-center gap-[4px]"
          style={{ background: "rgba(244,123,58,0.10)", color: "var(--color-orange-deep)" }}
        >
          <IconSparkles size={11} className="animate-spin" style={{ animationDuration: "1.5s" }} />
          Go sta scrivendo…
        </span>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
      {[100, 60].map((w, i) => (
        <div
          key={i}
          className="h-[22px] rounded mb-[8px]"
          style={{
            width: `${w}%`,
            background: "linear-gradient(90deg,#e7e0d2 0%,#f1ebde 50%,#e7e0d2 100%)",
            backgroundSize: "600px 100%",
            animation: "shimmer 1.4s linear infinite",
          }}
        />
      ))}
      <div className="mt-[28px] space-y-[10px]">
        {[100, 95, 88, 100, 72, 90, 100, 60].map((w, i) => (
          <div
            key={i}
            className="h-[16px] rounded"
            style={{
              width: `${w}%`,
              background: "linear-gradient(90deg,#e7e0d2 0%,#f1ebde 50%,#e7e0d2 100%)",
              backgroundSize: "600px 100%",
              animation: "shimmer 1.4s linear infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry, retryLabel }: { onRetry: () => void; retryLabel: string }) {
  return (
    <div className="px-4 py-5 sm:px-8 sm:py-7">
      <div
        className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-md text-mini"
        style={{ background: "#fcebeb", color: "#791f1f" }}
      >
        <span className="text-[16px]">⚠</span>
        <span className="flex-1">Non è stato possibile generare il racconto.</span>
        <button
          onClick={onRetry}
          className="font-medium underline cursor-pointer bg-transparent border-0 text-mini font-[inherit] ml-auto"
          style={{ color: "#791f1f" }}
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-[60px] text-center">
      <div
        className="w-[56px] h-[56px] rounded-full border-[1.5px] border-dashed flex items-center justify-center text-[24px] mx-auto mb-[14px]"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border-strong)", color: "var(--color-ink-faint)" }}
      >
        📖
      </div>
      <p className="text-meta leading-[1.55] max-w-[380px] mx-auto" style={{ color: "var(--color-ink-soft)" }}>
        {message}
      </p>
    </div>
  );
}
