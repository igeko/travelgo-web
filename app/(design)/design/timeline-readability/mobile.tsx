/**
 * timeline-readability/mobile.tsx — proposta mobile della Timeline V1.
 *
 * Pattern: quello già approvato in /design/explore-mobile-states —
 * mappa full canvas + bottom sheet a tre stati. La Timeline vive nello
 * sheet; la STRIP ORIZZONTALE delle targhe-data (la stessa targa 44px
 * della V1, ridotta) è sticky in cima allo sheet in tutti gli stati e
 * fa da day-selector: tap su una targa → giorno selezionato, pin/path
 * filtrati in mappa, sheet che sale a full col giorno espanso.
 *
 *  - peek: mappa libera; handle + day strip + prossimo leg ("Ora").
 *  - half: itinerario collapsed (giorni chiusi, notti, transfer).
 *  - full: zoom giorno (Gio 6 espanso: orari, fuzzy, notes) — la strip
 *    resta per saltare tra giorni.
 *
 * Adattamenti touch: grip sempre visibile a bassa opacità (niente
 * hover-only), row ≥44px, long-press 200ms per il drag (TouchSensor
 * già configurato così in Timeline.tsx).
 */

import { cn } from "@/lib/cn";
import {
  IconChevronDown,
  IconGripVertical,
  IconSparkles,
} from "@/components/ui/icons";
import {
  DAYS,
  StopIcon,
  TransferLabel,
  TodayNotes,
  type DayData,
  type NightData,
  type StopData,
  type TransferInfo,
} from "./shared";

type SheetState = "peek" | "half" | "full";

/* ─── Day strip — targhe data in scroll orizzontale ─────────────── */

function DayPlate({ day, selected }: { day: DayData; selected: boolean }) {
  return (
    <span
      className={cn(
        "flex aspect-square w-10 shrink-0 flex-col items-center justify-center rounded-md border",
        selected
          ? "border-ink bg-ink text-white"
          : "border-border-strong bg-surface text-ink",
      )}
    >
      <span
        className={cn(
          "text-[8px] font-extrabold uppercase leading-none tracking-wide",
          selected ? "text-primary-tint" : "text-ink/45",
        )}
      >
        {day.weekday}
      </span>
      <span className="mt-px text-[15px] font-bold leading-none">{day.dayNum}</span>
      <span
        className={cn(
          "text-[7px] font-medium uppercase leading-none",
          selected ? "text-white/60" : "text-ink/40",
        )}
      >
        {day.monthShort}
      </span>
    </span>
  );
}

function DayStrip({ selectedDay }: { selectedDay: number | null }) {
  return (
    <div className="flex items-center gap-1.5 overflow-hidden px-3 py-1.5">
      {DAYS.map((d) => (
        <DayPlate key={d.dayNumber} day={d} selected={selectedDay === d.dayNumber} />
      ))}
      {/* giorni successivi accennati (scroll orizzontale) */}
      <span className="flex aspect-square w-10 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-border text-ink-faint">
        <span className="text-[8px] font-extrabold uppercase leading-none">SAB</span>
        <span className="mt-px text-[15px] font-bold leading-none">8</span>
        <span className="text-[7px] font-medium uppercase leading-none">AGO</span>
      </span>
    </div>
  );
}

/* ─── Row compatte (riprendono la V1 a scala ridotta) ───────────── */

const M_GRID = { gridTemplateColumns: "30px minmax(0,1fr)" } as const;

function MRail({ dashed = false, tone = "default" as "default" | "selected" }) {
  return (
    <div className="relative flex justify-center self-stretch">
      {dashed ? (
        <div
          className={cn(
            "absolute inset-y-0 border-l-2 border-dashed",
            tone === "selected" ? "border-ink/50" : "border-ink/20",
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            tone === "selected" ? "bg-ink" : "bg-timeline-rail",
          )}
        />
      )}
    </div>
  );
}

function MDayHeader({ day, expanded }: { day: DayData; expanded?: boolean }) {
  return (
    <div className="grid items-center gap-x-2" style={M_GRID}>
      <div className="relative flex justify-center py-0.5">
        <div
          className={cn(
            "absolute inset-y-0 w-[3px] rounded-full",
            expanded ? "bg-ink" : "bg-timeline-rail",
          )}
        />
        <span
          className={cn(
            "relative z-10 flex aspect-square w-[30px] flex-col items-center justify-center rounded-sm border",
            expanded
              ? "border-ink bg-ink text-white"
              : "border-border-strong bg-surface text-ink",
          )}
        >
          <span
            className={cn(
              "text-[7px] font-extrabold uppercase leading-none",
              expanded ? "text-primary-tint" : "text-ink/45",
            )}
          >
            {day.weekday}
          </span>
          <span className="text-[13px] font-bold leading-none">{day.dayNum}</span>
        </span>
      </div>
      <div className="flex min-h-[30px] items-center gap-1.5">
        <span className="truncate text-[12px] font-semibold text-ink">
          {day.longLabel}
        </span>
        <span className="flex-1" />
        <IconChevronDown
          size={13}
          className={cn("shrink-0 text-ink-faint", expanded && "rotate-180 text-ink")}
        />
      </div>
    </div>
  );
}

function MStopRow({
  stop,
  expanded,
  tone,
}: {
  stop: StopData;
  expanded?: boolean;
  tone?: "default" | "selected";
}) {
  if (stop.fuzzy) {
    return (
      <div className="grid items-center gap-x-2" style={M_GRID}>
        <MRail tone={tone} />
        <div className="flex min-h-[28px] items-center gap-1.5 px-1">
          <StopIcon icon={stop.icon} fuzzy size="sm" />
          <span className="flex-1 truncate text-[11px] text-ink-soft">{stop.title}</span>
          <span className="shrink-0 rounded-full bg-surface-soft px-1.5 py-0.5 text-[8px] font-medium uppercase text-ink-faint">
            fless.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="grid items-center gap-x-2 py-0.5" style={M_GRID}>
      <MRail tone={tone} />
      {/* touch: grip SEMPRE visibile a bassa opacità */}
      <div className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border bg-surface px-1.5">
        <StopIcon icon={stop.icon} size="sm" />
        <span className="flex-1 truncate text-[12px] font-medium text-ink">
          {stop.title}
        </span>
        {expanded && stop.time ? (
          <span className="shrink-0 text-[10px] tabular-nums text-ink-soft">
            {stop.time}
          </span>
        ) : null}
        <IconGripVertical size={12} className="shrink-0 text-ink-faint opacity-40" />
      </div>
    </div>
  );
}

function MTransfer({
  t,
  tone,
  expanded = false,
}: {
  t: TransferInfo;
  tone?: "default" | "selected";
  expanded?: boolean;
}) {
  const longLeg = /\d+\s*h/.test(t.duration);
  if (!expanded && !longLeg) {
    return (
      <div className="grid items-center gap-x-2" style={M_GRID}>
        <MRail dashed tone={tone} />
        <div className="h-2.5" />
      </div>
    );
  }
  return (
    <div className="grid items-center gap-x-2" style={M_GRID}>
      <MRail dashed tone={tone} />
      <div className="origin-left scale-[0.92] py-1">
        <TransferLabel t={expanded ? t : { mode: t.mode, duration: t.duration }} />
      </div>
    </div>
  );
}

function MNight({ night }: { night: NightData }) {
  return (
    <div className="my-1 flex min-h-[36px] items-center gap-1.5 rounded-md bg-stay px-2 py-1">
      <StopIcon icon={night.icon} accent="primary" size="sm" />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
        {night.name}
      </span>
      <span className="shrink-0 text-[9px] text-stay-text">
        {night.nightIndex}/{night.nightsTotal}
      </span>
    </div>
  );
}

/* ─── Contenuti dello sheet per stato ───────────────────────────── */

function GoInput() {
  return (
    <div className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-pill border border-border bg-surface-input px-3">
      <IconSparkles size={14} className="shrink-0 text-primary" />
      <span className="text-[12px] text-ink-faint">Scrivi a Go…</span>
    </div>
  );
}

function SheetPeek() {
  const next = DAYS[1];
  return (
    <>
      <DayStrip selectedDay={null} />
      {/* "Ora": il prossimo leg dell'itinerario, a colpo d'occhio */}
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-surface-soft px-2.5 py-1.5">
        <span className="text-[9px] font-medium uppercase tracking-wide text-primary-deep">
          Ora
        </span>
        <span className="origin-left scale-[0.92]">
          <TransferLabel t={next.incomingTransfer!} />
        </span>
        <span className="ml-auto truncate text-[11px] font-medium text-ink">
          → {next.stops[0].title}
        </span>
      </div>
      <GoInput />
    </>
  );
}

function SheetHalf() {
  return (
    <>
      <DayStrip selectedDay={null} />
      <div className="flex-1 overflow-hidden px-3 pb-1">
        {DAYS.slice(0, 2).map((day) => {
          const visible = day.stops.filter((s) => !s.fuzzy);
          return (
            <div key={day.dayNumber}>
              <MDayHeader day={day} />
              {visible.map((stop, i) => (
                <div key={stop.title}>
                  <MStopRow stop={stop} />
                  {stop.transferOut && i < visible.length - 1 ? (
                    <MTransfer t={stop.transferOut} />
                  ) : null}
                </div>
              ))}
              {day.night ? <MNight night={day.night} /> : null}
            </div>
          );
        })}
      </div>
      <GoInput />
    </>
  );
}

function SheetFull() {
  const day = DAYS[1];
  const visible = day.stops;
  return (
    <>
      <DayStrip selectedDay={day.dayNumber} />
      <div className="flex-1 overflow-hidden px-3 pb-1">
        <MDayHeader day={day} expanded />
        <div className="rounded-md bg-surface-soft ring-1 ring-ink/10">
          {day.incomingTransfer ? (
            <MTransfer t={day.incomingTransfer} tone="selected" expanded />
          ) : null}
          {visible.map((stop) => (
            <div key={stop.title}>
              <MStopRow stop={stop} expanded tone="selected" />
              {stop.transferOut && !stop.fuzzy ? (
                <MTransfer t={stop.transferOut} tone="selected" expanded />
              ) : null}
            </div>
          ))}
          {day.notes ? (
            <div className="grid items-stretch gap-x-2" style={M_GRID}>
              <MRail tone="selected" />
              <div className="origin-top-left scale-[0.95] py-1 pr-1">
                <TodayNotes notes={day.notes} />
              </div>
            </div>
          ) : null}
        </div>
        {day.night ? <MNight night={day.night} /> : null}
      </div>
      <GoInput />
    </>
  );
}

/* ─── Phone frame ───────────────────────────────────────────────── */

function PhoneMap() {
  return (
    <svg
      viewBox="0 0 300 620"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="300" height="620" fill="#e8e3d8" />
      <g stroke="#d4cdbd" strokeWidth="0.5">
        {Array.from({ length: 18 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 35} x2="300" y2={i * 35} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={i * 35} y1="0" x2={i * 35} y2="620" />
        ))}
      </g>
      <path d="M 150 0 Q 170 120 155 240 Q 145 360 170 480 L 175 620" stroke="#a8c4d6" strokeWidth="12" fill="none" opacity="0.55" />
      <path d="M 0 150 Q 100 165 200 145 T 300 130" stroke="#c8bfa8" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M 0 320 Q 130 300 300 330" stroke="#c8bfa8" strokeWidth="2" fill="none" opacity="0.7" />
      <polyline
        points="60,420 120,330 185,260 230,180"
        stroke="var(--color-orange)"
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="4 3"
        opacity="0.8"
      />
      <circle cx="60" cy="420" r="10" fill="var(--color-orange)" stroke="white" strokeWidth="2.5" />
      <text x="60" y="423.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="white">1</text>
      <circle cx="120" cy="330" r="10" fill="var(--color-orange)" stroke="white" strokeWidth="2.5" />
      <text x="120" y="333.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="white">2</text>
      <rect x="174" y="249" width="22" height="22" rx="6" fill="var(--color-primary)" stroke="white" strokeWidth="2.5" />
      <rect x="180" y="259" width="10" height="4" rx="1.5" fill="white" />
      <rect x="180" y="255" width="4" height="3" rx="1.5" fill="white" />
      <circle cx="230" cy="180" r="10" fill="var(--color-orange)" stroke="white" strokeWidth="2.5" />
      <text x="230" y="183.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="white">3</text>
    </svg>
  );
}

function PhoneFrame({ state }: { state: SheetState }) {
  const sheetH = state === "peek" ? "176px" : state === "half" ? "54%" : "88%";
  return (
    <div
      className="relative w-full max-w-[300px] rounded-[28px] bg-[#1a1410] p-[6px] shadow-float"
      style={{ aspectRatio: "300 / 620" }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-[10px] z-50 h-[18px] w-[70px] -translate-x-1/2 rounded-[10px] bg-[#1a1410]"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#efede5]">
        <PhoneMap />
        <div className="absolute right-2 top-7 text-[8px] italic text-ink-faint/70">
          design mock
        </div>
        {/* Bottom sheet */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[18px] border-t border-border-strong bg-surface shadow-float"
          style={{ height: sheetH }}
        >
          <div className="flex justify-center pb-0.5 pt-2">
            <span className="h-1 w-9 rounded-pill bg-ink/15" />
          </div>
          {state === "peek" ? <SheetPeek /> : state === "half" ? <SheetHalf /> : <SheetFull />}
        </div>
      </div>
    </div>
  );
}

/* ─── Gallery ───────────────────────────────────────────────────── */

const FRAMES: { state: SheetState; title: string; note: string }[] = [
  {
    state: "peek",
    title: "Peek · mappa libera",
    note: "Day strip (le targhe della V1) sticky + riga \"Ora\" col prossimo leg. Tap su una targa → giorno selezionato e sheet a full.",
  },
  {
    state: "half",
    title: "Half · itinerario",
    note: "La V1 collapsed nello sheet: giorni chiusi, transfer nei separatori, card notte bianca tra i giorni. La mappa resta navigabile.",
  },
  {
    state: "full",
    title: "Full · zoom giorno",
    note: "Giorno espanso (rail ink + bg pieno): orari, fuzzy, Today notes. La strip resta in alto per saltare tra giorni. Drag con long-press 200ms.",
  },
];

export function MobileGallery() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
      {FRAMES.map((f) => (
        <div key={f.state} className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center text-center">
            <span className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              {f.state}
            </span>
            <h3 className="text-[15px] font-medium leading-tight text-ink">{f.title}</h3>
          </div>
          <PhoneFrame state={f.state} />
          <p className="max-w-[270px] text-center text-[12px] leading-[1.5] text-ink-soft">
            {f.note}
          </p>
        </div>
      ))}
    </div>
  );
}
