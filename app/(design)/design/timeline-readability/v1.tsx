/**
 * timeline-readability/v1.tsx — V1 "Route Rail + Night Divider" (it.3).
 * Congelata come riferimento: rail continuo senza nodi, targa data 44px,
 * selezione giorno = rail ink + bg pieno, banda notte cronologica.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown } from "@/components/ui/icons";
import {
  DAYS,
  FillBar,
  Grip,
  NightEditor,
  StopEditor,
  StopIcon,
  TodayNotes,
  TransferLabel,
  type DayData,
  type NightData,
  type StopData,
  type TransferInfo,
} from "./shared";

const RAIL_COL = "44px";

function RailCell({
  line = "solid",
  tone = "default",
}: {
  line?: "solid" | "dashed" | "none";
  tone?: "default" | "selected";
}) {
  return (
    <div className="relative flex justify-center self-stretch">
      {line === "solid" ? (
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            tone === "selected" ? "bg-ink" : "bg-timeline-rail",
          )}
        />
      ) : line === "dashed" ? (
        <div
          className={cn(
            "absolute inset-y-0 border-l-2 border-dashed",
            tone === "selected" ? "border-ink/50" : "border-ink/20",
          )}
        />
      ) : null}
    </div>
  );
}

function Row({
  rail,
  tone,
  children,
  className,
}: {
  rail: "solid" | "dashed" | "none";
  tone?: "default" | "selected";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("grid items-center gap-x-3", className)}
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <RailCell line={rail} tone={tone} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function DayHeader({ day }: { day: DayData }) {
  const expanded = day.expanded === true;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      className="group/day grid w-full cursor-pointer items-center gap-x-3 text-left"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <div className="relative flex justify-center py-1">
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            expanded ? "bg-ink" : "bg-timeline-rail",
          )}
        />
        <div
          className={cn(
            "relative z-10 flex aspect-square w-11 flex-col items-center justify-center rounded-md border transition-colors",
            expanded
              ? "border-ink bg-ink text-white"
              : "border-border-strong bg-surface text-ink shadow-xs group-hover/day:border-ink/40",
          )}
        >
          <span
            className={cn(
              "text-[9px] font-extrabold uppercase leading-none tracking-wide",
              expanded ? "text-primary-tint" : "text-ink/45",
            )}
          >
            {day.weekday}
          </span>
          <span className="mt-0.5 text-[17px] font-bold leading-none">
            {day.dayNum}
          </span>
          <span
            className={cn(
              "text-[8px] font-medium uppercase leading-none",
              expanded ? "text-white/60" : "text-ink/40",
            )}
          >
            {day.monthShort}
          </span>
        </div>
      </div>
      {/* Affordance espansione: hover bg sulla riga + chevron che ruota.
          Il chevron è sempre visibile (niente hover-only, touch fallback). */}
      <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors group-hover/day:bg-surface-soft">
        <span className="truncate text-[15px] font-semibold text-ink">
          {day.longLabel}
        </span>
        <span className="shrink-0 text-[11px] text-ink-soft">
          G{day.dayNumber}
        </span>
        <span className="flex-1" />
        <FillBar pct={day.fillPct} className="shrink-0" />
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-ink-faint transition-transform group-hover/day:text-ink",
            expanded && "rotate-180 text-ink",
          )}
        />
      </div>
    </button>
  );
}

function StopRow({
  stop,
  expanded,
  tone,
}: {
  stop: StopData;
  expanded?: boolean;
  tone?: "default" | "selected";
}) {
  if (stop.open) {
    return (
      <Row rail="solid" tone={tone} className="py-1">
        <StopEditor stop={stop} />
      </Row>
    );
  }
  if (stop.fuzzy) {
    return (
      <Row rail="solid" tone={tone}>
        <div className="group flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-surface-soft">
          <StopIcon icon={stop.icon} fuzzy size="sm" />
          <span className="flex-1 truncate text-mini text-ink-soft">
            {stop.title}
          </span>
          <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            flessibile
          </span>
        </div>
      </Row>
    );
  }
  return (
    <Row rail="solid" tone={tone} className="py-0.5">
      <div className="group flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-1.5 transition-colors hover:border-border-strong">
        <StopIcon icon={stop.icon} />
        <span className="flex-1 truncate text-meta font-medium text-ink">
          {stop.title}
        </span>
        {expanded && stop.time ? (
          <span className="shrink-0 text-mini tabular-nums text-ink-soft">
            {stop.time}
          </span>
        ) : null}
        <Grip />
      </div>
    </Row>
  );
}

function TransferRow({
  t,
  tone,
}: {
  t: TransferInfo;
  tone?: "default" | "selected";
}) {
  return (
    <Row rail="dashed" tone={tone}>
      <div className="py-1.5 pl-1">
        <TransferLabel t={t} />
      </div>
    </Row>
  );
}

/** Banda notte — it.6: BIANCA come le activity (proposta 1). Stessa
 *  superficie e bordo delle stop card (surface + border, hover
 *  border-strong); a distinguerla restano la struttura a 3 righe
 *  (check-in / nome / check-out) e il badge arancio col SOLO tipo
 *  pernottamento (niente luna). Il blu ink resta alla selezione. */
function NightDivider({ night }: { night: NightData }) {
  if (night.open) {
    return (
      <div className="my-1.5">
        <NightEditor night={night} />
      </div>
    );
  }
  return (
    <div className="group my-1.5 cursor-pointer">
      <div className="flex flex-col rounded-md border border-border bg-surface px-3.5 py-2 transition-colors hover:border-border-strong">
        {/* check-in — appartiene al giorno sopra */}
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span className="tabular-nums">
            <span className="font-semibold text-ink">{night.checkIn}</span> · check-in
          </span>
          <span>{night.fromLabel}</span>
        </div>
        {/* nome struttura — solo l'icona del tipo, badge arancio lodging */}
        <div className="flex items-center gap-2.5 py-1.5">
          <StopIcon icon={night.icon} accent="primary" size="sm" />
          <span className="min-w-0 flex-1 truncate text-meta font-semibold text-ink">
            {night.name}
          </span>
          <span className="shrink-0 text-[11px] text-ink-soft">
            Notte {night.nightIndex} di {night.nightsTotal}
          </span>
        </div>
        {/* check-out — sempre dalla parte del giorno dopo */}
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-[11px] text-ink-soft">
          <span className="tabular-nums">
            <span className="font-semibold text-ink">{night.checkOut}</span> · check-out
          </span>
          <span>{night.toLabel}</span>
        </div>
      </div>
    </div>
  );
}

export function TimelineV1() {
  return (
    <div className="flex flex-col">
      {DAYS.map((day) => {
        const expanded = day.expanded === true;
        const tone = expanded ? ("selected" as const) : ("default" as const);
        const visible = day.stops.filter((s) => expanded || !s.fuzzy);
        return (
          <div key={day.dayNumber} className="flex flex-col">
            <DayHeader day={day} />
            <div
              className={cn(
                "flex flex-col",
                expanded && "rounded-md bg-surface-soft ring-1 ring-ink/10",
              )}
            >
              {day.incomingTransfer ? (
                <TransferRow t={day.incomingTransfer} tone={tone} />
              ) : null}
              {visible.map((stop) => (
                <div key={stop.title} className="flex flex-col">
                  <StopRow stop={stop} expanded={expanded} tone={tone} />
                  {stop.transferOut && !stop.fuzzy ? (
                    <TransferRow t={stop.transferOut} tone={tone} />
                  ) : null}
                </div>
              ))}
              {expanded && day.notes ? (
                <Row rail="solid" tone={tone} className="items-stretch">
                  <div className="py-1">
                    <TodayNotes notes={day.notes} />
                  </div>
                </Row>
              ) : null}
            </div>
            {day.night ? <NightDivider night={day.night} /> : null}
          </div>
        );
      })}
      <div
        className="grid items-center gap-x-3"
        style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
      >
        <div className="flex justify-center py-1">
          <div className="h-1 w-9 bg-ink/15" />
        </div>
        <span className="text-[11px] text-ink-faint">Fine viaggio</span>
      </div>
    </div>
  );
}
