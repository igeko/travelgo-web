/**
 * Design sketch — Timeline Readability
 * URL: /design/timeline-readability
 *
 * Due varianti della Explore Timeline che attaccano le 4 perplessità
 * sulla rappresentazione attuale (Timeline.tsx + DayBadge + Transfer):
 *
 *  1. I giorni non si distinguono bene l'uno dall'altro.
 *  2. Le info di distanza/trasferimento tra stop sono poco leggibili
 *     (riga nano-text che si confonde col rumore).
 *  3. Le date dei giorni sono troppo piccole (badge 36px, text-micro).
 *  4. Il pernottamento inizia un giorno e finisce il successivo, ma
 *     oggi è renderizzato come row duplicata in fondo a ogni giorno.
 *
 * Variante A — "Day Card + Night Bridge": ogni giorno è una card con
 * header a tutta larghezza; il pernottamento è una card arancione che
 * SCAVALCA il confine tra due card-giorno.
 *
 * Variante B — "Route Rail + Night Divider": rail di percorso continuo
 * con nodi; la notte È il separatore tra giorni (banda night a tutta
 * larghezza); i transfer vivono sul segmento tratteggiato del rail.
 *
 * Le funzionalità esistenti restano compatibili: drag handle per il
 * riordino, click-to-open, zoom sul giorno (qui Day 2 è mostrato
 * espanso, con fuzzy stop e Today notes), hover-sync con la mappa.
 */

import type { ComponentType } from "react";
import { cn } from "@/lib/cn";
import {
  IconBed,
  IconBus,
  IconCar,
  IconChevronRight,
  IconClock,
  IconCoffee,
  IconGripVertical,
  IconMoon,
  IconMountain,
  IconPlane,
  IconShoppingBag,
  IconBuildingStore,
  IconTent,
  IconTorii,
  IconTree,
  IconWalk,
} from "@/components/ui/icons";

/* ─── Sample data (trip Giappone, come nel Figma) ───────────────── */

type IconCmp = ComponentType<{ size?: number; className?: string }>;

type TransferInfo = {
  mode: "car" | "transit";
  duration: string;
  distance?: string;
  legs?: { kind: "walk" | "bus"; label: string }[];
};

type StopData = {
  title: string;
  icon: IconCmp;
  time?: string;
  fuzzy?: boolean;
  /** Transfer verso lo stop SUCCESSIVO. */
  transferOut?: TransferInfo;
};

type NightData = {
  name: string;
  icon: IconCmp;
  nightIndex: number;
  nightsTotal: number;
  checkIn: string;
  checkOut: string;
  fromLabel: string;
  toLabel: string;
};

type DayData = {
  weekday: string;
  dayNum: number;
  monthShort: string;
  longLabel: string;
  dayNumber: number;
  fillPct: number;
  expanded?: boolean;
  notes?: string;
  stops: StopData[];
  /** Notte che parte da questo giorno e finisce nel successivo. */
  night?: NightData;
};

const DAYS: DayData[] = [
  {
    weekday: "MER",
    dayNum: 5,
    monthShort: "AGO",
    longLabel: "Mercoledì 5 Agosto",
    dayNumber: 1,
    fillPct: 35,
    stops: [
      {
        title: "Haneda Airport Terminal 1-2",
        icon: IconPlane,
        time: "10:30",
        transferOut: {
          mode: "transit",
          duration: "46 min",
          legs: [
            { kind: "walk", label: "8 min" },
            { kind: "bus", label: "105" },
            { kind: "walk", label: "10 min" },
          ],
        },
      },
      { title: "Caffè Specialty", icon: IconCoffee, time: "12:00" },
    ],
    night: {
      name: "Hotel Tavinos Asakusa",
      icon: IconBed,
      nightIndex: 1,
      nightsTotal: 2,
      checkIn: "22:00",
      checkOut: "09:00",
      fromLabel: "Mer 5",
      toLabel: "Gio 6",
    },
  },
  {
    weekday: "GIO",
    dayNum: 6,
    monthShort: "AGO",
    longLabel: "Giovedì 6 Agosto",
    dayNumber: 2,
    fillPct: 60,
    expanded: true,
    notes:
      "Ritiro camper entro le 11:00 — documenti + patente internazionale.\nSpesa grossa da Beisia prima di lasciare la città.",
    stops: [
      {
        title: "Ritiro Camper",
        icon: IconCar,
        time: "10:00",
        transferOut: { mode: "car", duration: "25 min", distance: "18 km" },
      },
      {
        title: "Spesa Beisia Tomisato",
        icon: IconShoppingBag,
        time: "11:30",
      },
      { title: "Konbini Lawson", icon: IconBuildingStore, fuzzy: true },
    ],
    night: {
      name: "Hotel Tavinos Asakusa",
      icon: IconBed,
      nightIndex: 2,
      nightsTotal: 2,
      checkIn: "19:30",
      checkOut: "08:00",
      fromLabel: "Gio 6",
      toLabel: "Ven 7",
    },
  },
  {
    weekday: "VEN",
    dayNum: 7,
    monthShort: "AGO",
    longLabel: "Venerdì 7 Agosto",
    dayNumber: 3,
    fillPct: 85,
    stops: [
      {
        title: "Santuario Toshogu e Rinno-ji",
        icon: IconTorii,
        time: "09:30",
        transferOut: { mode: "car", duration: "12 min", distance: "6 km" },
      },
      {
        title: "Bosco di Cedri",
        icon: IconTree,
        time: "12:00",
        transferOut: { mode: "car", duration: "30 min", distance: "21 km" },
      },
      { title: "Abisso di Kanmangafuchi", icon: IconMountain, time: "15:00" },
    ],
    night: {
      name: "Nikko Daiyagawa Park Auto",
      icon: IconTent,
      nightIndex: 1,
      nightsTotal: 1,
      checkIn: "18:00",
      checkOut: "09:00",
      fromLabel: "Ven 7",
      toLabel: "Sab 8",
    },
  },
];

/* ─── Shared atoms ──────────────────────────────────────────────── */

function StopIcon({
  icon: Icon,
  accent = "ink",
  fuzzy = false,
  size = "md",
}: {
  icon: IconCmp;
  accent?: "ink" | "primary";
  fuzzy?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        size === "md" ? "size-9" : "size-7",
        fuzzy
          ? "border border-dashed border-ink/30 bg-transparent text-ink/45"
          : accent === "primary"
            ? "bg-primary text-white"
            : "bg-ink text-white",
      )}
    >
      <Icon size={size === "md" ? 18 : 14} />
    </span>
  );
}

function Grip() {
  return (
    <IconGripVertical
      size={14}
      className="shrink-0 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
    />
  );
}

function TransferLabel({
  t,
  className,
}: {
  t: TransferInfo;
  className?: string;
}) {
  const ModeIcon = t.mode === "car" ? IconCar : IconBus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-ink-soft",
        className,
      )}
    >
      <ModeIcon size={13} className="shrink-0 text-ink/55" />
      <span className="font-semibold text-ink">{t.duration}</span>
      {t.distance ? (
        <>
          <span className="text-ink-faint">·</span>
          <span>{t.distance}</span>
        </>
      ) : null}
      {t.legs ? (
        <>
          <span className="text-ink-faint">·</span>
          {t.legs.map((leg, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? (
                <IconChevronRight size={8} className="text-ink-faint" />
              ) : null}
              {leg.kind === "walk" ? (
                <IconWalk size={11} className="text-ink/55" />
              ) : (
                <IconBus size={11} className="text-ink/55" />
              )}
              <span className={leg.kind === "bus" ? "font-medium text-ink" : ""}>
                {leg.label}
              </span>
            </span>
          ))}
        </>
      ) : null}
    </span>
  );
}

function FillBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-1 w-12 overflow-hidden rounded-full bg-ink/10",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          pct >= 80 ? "bg-warning-fg" : "bg-ok-fg",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function TodayNotes({ notes }: { notes: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-sm bg-surface-warm/80 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
        Today notes
      </p>
      <p className="whitespace-pre-line text-mini leading-relaxed text-ink">
        {notes}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANTE A — Day Card + Night Bridge
   ═══════════════════════════════════════════════════════════════════ */

function StopRowA({ stop, expanded }: { stop: StopData; expanded?: boolean }) {
  if (stop.fuzzy) {
    return (
      <div className="group flex items-center gap-2.5 rounded-sm px-2 py-1 hover:bg-surface-soft">
        <StopIcon icon={stop.icon} fuzzy size="sm" />
        <span className="flex-1 text-mini text-ink-soft">{stop.title}</span>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
          flessibile
        </span>
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-surface-soft">
      <StopIcon icon={stop.icon} />
      <span className="flex-1 truncate text-meta font-medium text-ink">
        {stop.title}
      </span>
      {expanded && stop.time ? (
        <span className="flex items-center gap-1 text-mini tabular-nums text-ink-soft">
          <IconClock size={11} />
          {stop.time}
        </span>
      ) : null}
      <Grip />
    </div>
  );
}

function TransferRowA({ t }: { t: TransferInfo }) {
  return (
    <div className="ml-[25px] flex items-center border-l-2 border-dotted border-ink/20 py-1.5 pl-4">
      <span className="inline-flex items-center rounded-full border border-border bg-bg px-2.5 py-[3px]">
        <TransferLabel t={t} />
      </span>
    </div>
  );
}

function DayCardA({ day }: { day: DayData }) {
  const expanded = day.expanded === true;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-surface",
        expanded ? "border-ink/30 shadow-sm" : "border-border",
      )}
    >
      {/* Header giorno — a tutta larghezza, data grande. */}
      <header
        className={cn(
          "flex cursor-pointer items-center gap-3 border-b px-4 py-2.5",
          expanded
            ? "border-ink/20 bg-ink text-white"
            : "border-border bg-surface-soft/70 hover:bg-surface-soft",
        )}
      >
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[11px] font-extrabold uppercase tracking-[0.08em]",
              expanded ? "text-primary-tint" : "text-ink/40",
            )}
          >
            {day.weekday}
          </span>
          <span className="text-[16px] font-semibold leading-none">
            {day.dayNum} {day.monthShort.charAt(0) + day.monthShort.slice(1).toLowerCase()}
          </span>
        </span>
        <span className="flex-1" />
        <span
          className={cn(
            "text-[11px]",
            expanded ? "text-white/60" : "text-ink-soft",
          )}
        >
          Giorno {day.dayNumber} · {day.stops.filter((s) => !s.fuzzy).length} tappe
        </span>
        <FillBar pct={day.fillPct} />
      </header>

      {/* Stops + transfer */}
      <div className="flex flex-col px-2 py-2">
        {day.stops
          .filter((s) => expanded || !s.fuzzy)
          .map((stop, i, arr) => (
            <div key={stop.title}>
              <StopRowA stop={stop} expanded={expanded} />
              {stop.transferOut && i < arr.length - 1 ? (
                <TransferRowA t={stop.transferOut} />
              ) : null}
            </div>
          ))}
        {expanded && day.notes ? (
          <div className="px-2 pt-2">
            <TodayNotes notes={day.notes} />
          </div>
        ) : null}
        {/* Spazio extra in fondo: il NightBridge sottostante scavalca qui. */}
        {day.night ? <div className="h-3" /> : null}
      </div>
    </section>
  );
}

function NightBridgeA({ night }: { night: NightData }) {
  const Icon = night.icon;
  return (
    <div className="group relative z-10 mx-4 -my-3 flex cursor-pointer items-center gap-3 rounded-md bg-primary px-4 py-2.5 text-white shadow-sm transition-shadow hover:shadow-md">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/15">
        <IconMoon size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate text-meta font-semibold">
          <Icon size={13} className="shrink-0 opacity-80" />
          {night.name}
        </span>
        <span className="text-[11px] text-white/75">
          Notte {night.nightIndex} di {night.nightsTotal}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-right">
        <span className="flex flex-col items-end">
          <span className="text-[9px] font-medium uppercase tracking-wide text-white/60">
            check-in
          </span>
          <span className="text-mini font-semibold tabular-nums">
            {night.checkIn} <span className="font-normal text-white/75">{night.fromLabel}</span>
          </span>
        </span>
        <IconChevronRight size={12} className="text-white/50" />
        <span className="flex flex-col items-end">
          <span className="text-[9px] font-medium uppercase tracking-wide text-white/60">
            check-out
          </span>
          <span className="text-mini font-semibold tabular-nums">
            {night.checkOut} <span className="font-normal text-white/75">{night.toLabel}</span>
          </span>
        </span>
      </span>
    </div>
  );
}

function VariantA() {
  return (
    <div className="flex flex-col">
      {DAYS.map((day) => (
        <div key={day.dayNumber} className="flex flex-col">
          <DayCardA day={day} />
          {day.night ? <NightBridgeA night={day.night} /> : null}
          <div className="h-3" />
        </div>
      ))}
      {/* Giorno successivo "vuoto" che riceve il check-out dell'ultima notte */}
      <section className="rounded-lg border border-dashed border-border bg-surface/60 px-4 py-3">
        <span className="flex items-baseline gap-2 text-ink/45">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]">
            SAB
          </span>
          <span className="text-[16px] font-semibold leading-none">8 Ago</span>
          <span className="ml-2 text-[11px]">Niente pianificato</span>
        </span>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANTE B — Route Rail + Night Divider
   ═══════════════════════════════════════════════════════════════════ */

const RAIL_COL = "44px";

function RailCell({
  children,
  line = "solid",
}: {
  children?: React.ReactNode;
  line?: "solid" | "dashed" | "none";
}) {
  return (
    <div className="relative flex justify-center self-stretch">
      {line !== "none" ? (
        line === "solid" ? (
          <div className="absolute inset-y-0 w-[3px] rounded-full bg-timeline-rail" />
        ) : (
          <div className="absolute inset-y-0 border-l-2 border-dashed border-ink/20" />
        )
      ) : null}
      {children}
    </div>
  );
}

function DayHeaderB({ day }: { day: DayData }) {
  const expanded = day.expanded === true;
  return (
    <div
      className="grid cursor-pointer items-center gap-x-3"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      {/* Date plate — grande, sul rail */}
      <div className="relative flex justify-center py-1">
        <div className="absolute inset-y-0 w-[3px] rounded-full bg-timeline-rail" />
        <div
          className={cn(
            "relative z-10 flex aspect-square w-11 flex-col items-center justify-center rounded-md border",
            expanded
              ? "border-ink bg-ink text-white"
              : "border-border-strong bg-surface text-ink shadow-xs",
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
      <div className="flex items-center gap-2.5">
        <span className="text-[15px] font-semibold text-ink">
          {day.longLabel}
        </span>
        <span className="text-[11px] text-ink-soft">
          Giorno {day.dayNumber}
        </span>
        <span className="flex-1" />
        <FillBar pct={day.fillPct} />
      </div>
    </div>
  );
}

function StopRowB({ stop, expanded }: { stop: StopData; expanded?: boolean }) {
  return (
    <div
      className="grid items-center gap-x-3"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <RailCell>
        <span
          className={cn(
            "relative z-10 my-2 rounded-full bg-surface",
            stop.fuzzy
              ? "size-2.5 border-2 border-dashed border-ink/40"
              : "size-3 border-[3px] border-ink",
          )}
        />
      </RailCell>
      {stop.fuzzy ? (
        <div className="group flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-surface-soft">
          <StopIcon icon={stop.icon} fuzzy size="sm" />
          <span className="flex-1 text-mini text-ink-soft">{stop.title}</span>
          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            flessibile
          </span>
        </div>
      ) : (
        <div className="group flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-1.5 transition-colors hover:border-border-strong">
          <StopIcon icon={stop.icon} />
          <span className="flex-1 truncate text-meta font-medium text-ink">
            {stop.title}
          </span>
          {expanded && stop.time ? (
            <span className="text-mini tabular-nums text-ink-soft">
              {stop.time}
            </span>
          ) : null}
          <Grip />
        </div>
      )}
    </div>
  );
}

function TransferRowB({ t }: { t: TransferInfo }) {
  return (
    <div
      className="grid items-center gap-x-3"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <RailCell line="dashed">
        <span className="relative z-10 my-1 h-5" />
      </RailCell>
      <div className="py-0.5 pl-1">
        <TransferLabel t={t} />
      </div>
    </div>
  );
}

function NotesRowB({ notes }: { notes: string }) {
  return (
    <div
      className="grid items-stretch gap-x-3"
      style={{ gridTemplateColumns: `${RAIL_COL} minmax(0,1fr)` }}
    >
      <RailCell />
      <div className="py-1">
        <TodayNotes notes={notes} />
      </div>
    </div>
  );
}

/** La notte È il confine tra due giorni: banda scura a tutta larghezza
 *  che interrompe il rail. Check-in appartiene al giorno sopra,
 *  check-out al giorno sotto. */
function NightDividerB({ night }: { night: NightData }) {
  const Icon = night.icon;
  return (
    <div className="group relative my-1.5 cursor-pointer">
      <div className="flex items-center gap-3 rounded-md bg-night px-4 py-2.5 text-white transition-shadow hover:shadow-md">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/12">
          <IconMoon size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 truncate text-meta font-semibold">
            <Icon size={13} className="shrink-0 opacity-80" />
            {night.name}
          </span>
          <span className="text-[11px] text-white/65">
            Notte {night.nightIndex} di {night.nightsTotal} · {night.fromLabel} →{" "}
            {night.toLabel}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          <span className="text-mini font-semibold">{night.checkIn}</span>
          <span className="h-px w-5 bg-white/40" />
          <IconMoon size={11} className="text-white/60" />
          <span className="h-px w-5 bg-white/40" />
          <span className="text-mini font-semibold">{night.checkOut}</span>
        </span>
      </div>
    </div>
  );
}

function VariantB() {
  return (
    <div className="flex flex-col">
      {DAYS.map((day) => {
        const expanded = day.expanded === true;
        const visible = day.stops.filter((s) => expanded || !s.fuzzy);
        return (
          <div key={day.dayNumber} className="flex flex-col">
            <DayHeaderB day={day} />
            <div className={cn("flex flex-col", expanded && "rounded-md bg-surface-soft/40")}>
              {visible.map((stop, i) => (
                <div key={stop.title} className="flex flex-col">
                  <StopRowB stop={stop} expanded={expanded} />
                  {stop.transferOut && i < visible.length - 1 ? (
                    <TransferRowB t={stop.transferOut} />
                  ) : null}
                </div>
              ))}
              {expanded && day.notes ? <NotesRowB notes={day.notes} /> : null}
            </div>
            {day.night ? <NightDividerB night={day.night} /> : null}
          </div>
        );
      })}
      {/* Coda del viaggio */}
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

/* ─── Page ──────────────────────────────────────────────────────── */

const PROBLEMS = [
  "Separazione visiva tra giorni",
  "Leggibilità di distanza/tempo tra stop",
  "Date dei giorni più grandi",
  "Pernottamento a cavallo di due giorni",
];

export default function TimelineReadabilityPage() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <header className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-orange">
          TravelGo · design scratchpad
        </div>
        <h1 className="mb-3 text-[26px] font-medium leading-tight">
          Timeline Readability — due varianti
        </h1>
        <p className="max-w-[680px] text-meta leading-relaxed text-ink-soft">
          Ridisegno della rappresentazione (non del funzionamento) della
          Explore Timeline. Entrambe le varianti rispondono a:{" "}
          {PROBLEMS.join(" · ").toLowerCase()}. Il Giorno 2 è mostrato{" "}
          <strong className="font-semibold text-ink">espanso</strong> (zoom
          giorno: orari per-stop, fuzzy stop, Today notes). Drag handle
          visibile in hover sulle row.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-ink">
              A · Day Card + Night Bridge
            </h2>
            <p className="mt-1 text-mini leading-relaxed text-ink-soft">
              Ogni giorno è una card con header a tutta larghezza (data
              grande). Il pernottamento è una card arancione che{" "}
              <strong className="font-medium text-ink">scavalca il bordo</strong>{" "}
              tra il giorno del check-in e quello del check-out. I transfer
              sono pill su connettore puntinato.
            </p>
          </div>
          <div className="rounded-xl bg-bg p-4">
            <VariantA />
          </div>
        </div>

        <div>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-ink">
              B · Route Rail + Night Divider
            </h2>
            <p className="mt-1 text-mini leading-relaxed text-ink-soft">
              Rail di percorso continuo con nodi-tappa; la data è una targa
              44px sul rail + label estesa. I transfer vivono{" "}
              <strong className="font-medium text-ink">sul segmento</strong>{" "}
              tratteggiato. La notte è il{" "}
              <strong className="font-medium text-ink">separatore stesso</strong>{" "}
              tra due giorni (banda night, check-in sopra / check-out sotto).
            </p>
          </div>
          <div className="rounded-xl bg-bg p-4">
            <VariantB />
          </div>
        </div>
      </div>
    </div>
  );
}
