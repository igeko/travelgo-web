/**
 * timeline-readability/shared.tsx — dati di esempio + atomi condivisi
 * fra le versioni V1 (Route Rail + Night Divider) e V2 (DayList-inspired).
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
  IconMapPin,
  IconMinus,
  IconMountain,
  IconPlane,
  IconPlus,
  IconShoppingBag,
  IconBuildingStore,
  IconTent,
  IconTorii,
  IconTree,
  IconTrash,
  IconWalk,
  IconX,
} from "@/components/ui/icons";
import { EXPLORE_CATEGORY_TREE } from "@/features/explore/categories";

/* ─── Tipi ──────────────────────────────────────────────────────── */

export type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type TransferInfo = {
  mode: "car" | "transit";
  duration: string;
  distance?: string;
  legs?: { kind: "walk" | "bus"; label: string }[];
};

export type StopData = {
  title: string;
  icon: IconCmp;
  time?: string;
  /** Stato open: renderizza l'editor inline (statico nello sketch). */
  open?: boolean;
  fuzzy?: boolean;
  description?: string;
  address?: string;
  duration?: string;
  timeRange?: string;
  /** Posizione del pin sulla mock-map (viewBox 600×400). */
  pin?: { x: number; y: number };
  /** Transfer verso lo stop SUCCESSIVO (o verso il pernottamento se ultimo). */
  transferOut?: TransferInfo;
};

export type NightData = {
  name: string;
  icon: IconCmp;
  nightIndex: number;
  nightsTotal: number;
  checkIn: string;
  checkOut: string;
  fromLabel: string;
  toLabel: string;
  open?: boolean;
  address?: string;
  pin?: { x: number; y: number };
};

export type DayData = {
  weekday: string;
  dayNum: number;
  monthShort: string;
  longLabel: string;
  dayNumber: number;
  /** Zona/regione del giorno — eyebrow arancio in stile DayList. */
  zone: string;
  fillPct: number;
  expanded?: boolean;
  notes?: string;
  /** Transfer in ingresso: dal pernottamento precedente alla prima tappa. */
  incomingTransfer?: TransferInfo;
  stops: StopData[];
  /** Notte che parte da questo giorno e finisce nel successivo. */
  night?: NightData;
};

/* ─── Sample data (trip Giappone, come nel Figma) ───────────────── */

export const DAYS: DayData[] = [
  {
    weekday: "MER",
    dayNum: 5,
    monthShort: "AGO",
    longLabel: "Mercoledì 5 Agosto",
    dayNumber: 1,
    zone: "Tokyo · Asakusa",
    fillPct: 35,
    stops: [
      {
        title: "Haneda Airport Terminal 1-2",
        icon: IconPlane,
        time: "10:30",
        pin: { x: 120, y: 320 },
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
      {
        title: "Caffè Specialty",
        icon: IconCoffee,
        time: "12:00",
        pin: { x: 250, y: 240 },
        transferOut: {
          mode: "transit",
          duration: "15 min",
          legs: [{ kind: "walk", label: "15 min" }],
        },
      },
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
      open: true,
      address: "Asakusa 2-2-5, Taito City, Tokyo",
      pin: { x: 360, y: 180 },
    },
  },
  {
    weekday: "GIO",
    dayNum: 6,
    monthShort: "AGO",
    longLabel: "Giovedì 6 Agosto",
    dayNumber: 2,
    zone: "Tokyo → Chiba",
    fillPct: 60,
    expanded: true,
    notes:
      "Ritiro camper entro le 11:00 — documenti + patente internazionale.\nSpesa grossa da Beisia prima di lasciare la città.",
    incomingTransfer: {
      mode: "transit",
      duration: "35 min",
      legs: [
        { kind: "walk", label: "6 min" },
        { kind: "bus", label: "42" },
      ],
    },
    stops: [
      {
        title: "Ritiro Camper",
        icon: IconCar,
        time: "10:00",
        pin: { x: 420, y: 140 },
        transferOut: { mode: "car", duration: "25 min", distance: "18 km" },
      },
      {
        title: "Spesa Beisia Tomisato",
        icon: IconShoppingBag,
        time: "11:30",
        open: true,
        description:
          "Supermercato grande vicino all'uscita autostradale — scorte per i primi 3 giorni di camper.",
        address: "Tomisato, Chiba 286-0201",
        duration: "45m",
        timeRange: "11:30 → 12:15",
        pin: { x: 500, y: 110 },
        transferOut: { mode: "car", duration: "40 min", distance: "32 km" },
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
      pin: { x: 360, y: 180 },
    },
  },
  {
    weekday: "VEN",
    dayNum: 7,
    monthShort: "AGO",
    longLabel: "Venerdì 7 Agosto",
    dayNumber: 3,
    zone: "Nikko",
    fillPct: 85,
    incomingTransfer: { mode: "car", duration: "2h 10m", distance: "140 km" },
    stops: [
      {
        title: "Santuario Toshogu e Rinno-ji",
        icon: IconTorii,
        time: "09:30",
        pin: { x: 470, y: 60 },
        transferOut: { mode: "car", duration: "12 min", distance: "6 km" },
      },
      {
        title: "Bosco di Cedri",
        icon: IconTree,
        time: "12:00",
        pin: { x: 530, y: 40 },
        transferOut: { mode: "car", duration: "30 min", distance: "21 km" },
      },
      {
        title: "Abisso di Kanmangafuchi",
        icon: IconMountain,
        time: "15:00",
        pin: { x: 560, y: 90 },
        transferOut: { mode: "car", duration: "8 min", distance: "4 km" },
      },
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
      pin: { x: 540, y: 140 },
    },
  },
];

/* ─── Atomi condivisi ───────────────────────────────────────────── */

export function StopIcon({
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

export function Grip() {
  return (
    <IconGripVertical
      size={14}
      className="shrink-0 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
    />
  );
}

export function TransferLabel({
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
        "inline-flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft",
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

export function FillBar({ pct, className }: { pct: number; className?: string }) {
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

export function TodayNotes({ notes }: { notes: string }) {
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

/* ─── Editor atoms (mock statici del componente Figma "Activity") ── */

function SleepStopToggle({ active }: { active: "sleep" | "stop" }) {
  return (
    <div className="flex w-fit gap-0.5 rounded-pill bg-surface-soft p-0.5">
      {(
        [
          { key: "sleep", label: "Sleep", icon: IconBed },
          { key: "stop", label: "Stop", icon: IconMapPin },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <span
          key={key}
          className={cn(
            "flex items-center gap-1.5 rounded-pill px-3 py-1 text-mini font-medium",
            active === key ? "bg-ink text-white" : "text-ink-soft",
          )}
        >
          <Icon size={13} />
          {label}
        </span>
      ))}
    </div>
  );
}

function AddressLine({ address }: { address: string }) {
  return (
    <div className="flex items-center gap-2 border-y border-border py-2.5">
      <IconMapPin size={14} className="shrink-0 text-ink-soft" />
      <span className="truncate text-mini text-ink">{address}</span>
    </div>
  );
}

function TimePair({
  leftLabel,
  leftTime,
  leftDate,
  rightLabel,
  rightTime,
  rightDate,
}: {
  leftLabel: string;
  leftTime: string;
  leftDate: string;
  rightLabel: string;
  rightTime: string;
  rightDate: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: leftLabel, time: leftTime, date: leftDate },
        { label: rightLabel, time: rightTime, date: rightDate },
      ].map((c) => (
        <div key={c.label} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            <IconClock size={10} />
            {c.label}
          </span>
          <span className="text-[18px] font-semibold tabular-nums leading-none text-ink">
            {c.time}
          </span>
          <span className="text-[11px] text-ink-soft">{c.date}</span>
        </div>
      ))}
    </div>
  );
}

function RemoveButton() {
  return (
    <span className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-danger-border py-1.5 text-mini font-medium text-danger-deep hover:bg-danger-bg">
      <IconTrash size={13} />
      Rimuovi
    </span>
  );
}

/* ─── Icon picker (mock statico, proposta A "Sezioni") ──────────── */

/** Trigger: il badge icona nell'header dell'editor è tappabile così
 *  com'è — NIENTE chevron (il cambio icona avviene nel dettaglio,
 *  l'affordance è l'hover/press del badge stesso). */
export function IconPickerTrigger({
  icon: Icon,
  dark = true,
}: {
  icon: IconCmp;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 cursor-pointer items-center rounded-sm px-1 py-0.5",
        dark ? "hover:bg-white/10" : "hover:bg-surface-soft",
      )}
      role="button"
      aria-label="Cambia icona"
    >
      <Icon size={15} className="shrink-0" />
    </span>
  );
}

/** Popover flottante a SEZIONI — il dominio è SEMPRE quello della
 *  ExploreToolbar: derivato da EXPLORE_CATEGORY_TREE, nessuna lista
 *  hardcoded (una categoria nuova compare qui automaticamente).
 *  Versione generalizzata + demo interattiva: /design/icon-picker. */
export function IconPickerPanel({ selected }: { selected: IconCmp }) {
  return (
    <div className="w-[252px] rounded-md border border-border-strong bg-surface p-2.5 shadow-float">
      {EXPLORE_CATEGORY_TREE.map((macro, i) => {
        const MacroIcon = macro.icon;
        return (
          <div key={macro.id} className={cn(i > 0 && "mt-2.5")}>
            <p className="mb-1 flex items-center gap-1.5 px-0.5 text-[9px] font-medium uppercase tracking-eyebrow text-ink-faint">
              <MacroIcon size={12} />
              {macro.id}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {macro.subs.map((sub) => {
                const Icon = sub.icon;
                const isSel = Icon === selected;
                return (
                  <span
                    key={sub.id}
                    role="button"
                    title={sub.id}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-md",
                      isSel
                        ? "bg-ink text-white"
                        : "bg-surface-soft text-ink-soft hover:bg-ink/10 hover:text-ink",
                    )}
                  >
                    <Icon size={16} />
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Per gli alloggi NON si sceglie un'icona libera: si sceglie il TIPO
 *  struttura (accommodation.type) e l'icona segue (accommodationIcon). */
export function StayTypePicker({ selected }: { selected: IconCmp }) {
  const types: { key: string; label: string; Icon: IconCmp }[] = [
    { key: "hotel", label: "Hotel", Icon: IconBed },
    { key: "campground", label: "Campeggio", Icon: IconTent },
    { key: "apartment", label: "Appartam.", Icon: IconBuildingStore },
    { key: "ryokan", label: "Ryokan", Icon: IconTorii },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {types.map(({ key, label, Icon }) => {
        const isSel = Icon === selected;
        return (
          <span
            key={key}
            role="button"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-0.5 rounded-md border px-1 py-1.5",
              isSel
                ? "border-ink bg-ink text-white"
                : "border-border text-ink-soft hover:bg-surface-soft",
            )}
          >
            <Icon size={16} />
            <span className="text-[9px] font-medium">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Editor inline di un'attività (stato open del componente "Activity"). */
export function StopEditor({ stop }: { stop: StopData }) {
  const Icon = stop.icon;
  return (
    <div className="relative flex flex-col gap-1 rounded-md bg-ink p-1">
      <div className="flex items-center gap-2 px-2 py-1.5 text-white">
        <IconPickerTrigger icon={Icon} />
        <span className="flex-1 truncate text-meta font-semibold">
          {stop.title}
        </span>
        <IconX size={14} className="shrink-0 cursor-pointer text-white/60 hover:text-white" />
      </div>
      {/* Picker FLOTTANTE aperto (mock statico): popover ancorato al
          badge icona, z-dropdown, sovrasta il corpo dell'editor.
          Chiusura su selezione / Esc / click-out. */}
      <div className="absolute left-1.5 top-9 z-dropdown">
        <IconPickerPanel selected={Icon} />
      </div>
      <div className="flex flex-col gap-3 rounded-sm bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <SleepStopToggle active="stop" />
          {stop.duration ? (
            <span className="flex items-center gap-1 text-mini text-ink-soft">
              <IconClock size={12} />
              Sosta di <span className="font-semibold text-primary">{stop.duration}</span>
            </span>
          ) : null}
        </div>
        {stop.description ? (
          <p className="text-mini leading-relaxed text-ink-soft">
            {stop.description}
          </p>
        ) : null}
        {stop.address ? <AddressLine address={stop.address} /> : null}
        {stop.timeRange ? (
          <TimePair
            leftLabel="arrivo"
            leftTime={stop.timeRange.split(" → ")[0]}
            leftDate="Gio 06 Ago"
            rightLabel="partenza"
            rightTime={stop.timeRange.split(" → ")[1]}
            rightDate="Gio 06 Ago"
          />
        ) : null}
        <RemoveButton />
      </div>
    </div>
  );
}

/** Editor inline del pernottamento (stato open, mode sleep). */
export function NightEditor({ night }: { night: NightData }) {
  const Icon = night.icon;
  return (
    <div className="flex flex-col gap-1 rounded-md bg-ink p-1">
      <div className="flex items-center gap-2 px-2 py-1.5 text-white">
        <Icon size={15} className="shrink-0 text-primary-tint" />
        <span className="flex-1 truncate text-meta font-semibold">
          {night.name}
        </span>
        <IconX size={14} className="shrink-0 cursor-pointer text-white/60 hover:text-white" />
      </div>
      <div className="flex flex-col gap-3 rounded-sm bg-surface p-3">
        <SleepStopToggle active="sleep" />
        {/* Tipo struttura: l'icona dell'alloggio segue il type, niente
            icon-picker libero (accommodationIcon resta la fonte). */}
        <StayTypePicker selected={Icon} />
        <div className="flex items-center gap-3">
          <span className="text-mini text-ink">
            <span className="text-[18px] font-semibold tabular-nums">
              {night.nightsTotal}
            </span>{" "}
            notti · Notte {night.nightIndex} di {night.nightsTotal}
          </span>
          <span className="flex-1" />
          <span className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-border text-ink-soft hover:bg-surface-soft">
            <IconPlus size={12} />
          </span>
          <span className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-border text-ink-soft hover:bg-surface-soft">
            <IconMinus size={12} />
          </span>
        </div>
        {night.address ? <AddressLine address={night.address} /> : null}
        <TimePair
          leftLabel="check-in"
          leftTime={night.checkIn}
          leftDate={night.fromLabel}
          rightLabel="check-out"
          rightTime={night.checkOut}
          rightDate={night.toLabel}
        />
        <RemoveButton />
      </div>
    </div>
  );
}

/* ─── Mock map (pattern di /design/day-layout — not a real map) ──── */

export function MockMap() {
  const pins: { x: number; y: number; n?: number; night?: boolean }[] = [];
  let n = 0;
  for (const d of DAYS) {
    for (const s of d.stops) {
      if (s.pin && !s.fuzzy) pins.push({ ...s.pin, n: ++n });
    }
    if (d.night?.pin && !pins.some((p) => p.night && p.x === d.night?.pin?.x)) {
      pins.push({ ...d.night.pin, night: true });
    }
  }
  const path = pins.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div className="relative h-full w-full bg-[#e8e3d8]">
      <svg
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <rect x="0" y="0" width="600" height="400" fill="#e8e3d8" />
        <g stroke="#d4cdbd" strokeWidth="0.5">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 35} x2="600" y2={i * 35} />
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <line key={`v${i}`} x1={i * 35} y1="0" x2={i * 35} y2="400" />
          ))}
        </g>
        <g stroke="#c8bfa8" strokeWidth="2" fill="none" opacity="0.7">
          <path d="M 0 140 Q 200 170 400 130 T 600 100" />
          <path d="M 0 280 Q 250 240 500 290" />
          <path d="M 300 0 Q 320 200 280 400" />
        </g>
        <path
          d="M 360 0 Q 380 80 370 160 Q 360 240 390 320 L 395 400"
          stroke="#a8c4d6"
          strokeWidth="14"
          fill="none"
          opacity="0.55"
        />
        <g fontFamily="Georgia, serif" fill="#8a7e63" opacity="0.5">
          <text x="395" y="155" fontSize="13" fontStyle="italic">Asakusa</text>
          <text x="265" y="165" fontSize="12" fontStyle="italic">Yanaka</text>
          <text x="480" y="200" fontSize="13" fontStyle="italic">Sumida</text>
          <text x="120" y="300" fontSize="13" fontStyle="italic">Haneda</text>
          <text x="500" y="25" fontSize="13" fontStyle="italic">Nikko</text>
        </g>
        <polyline
          points={path}
          stroke="var(--color-orange)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="4 3"
          opacity="0.75"
        />
        {pins.map((p, i) =>
          p.night ? (
            // Pin pernottamento: quadrato arancio (lodging accent) — si
            // distingue dai pin numerati per forma, non per colore estraneo.
            <g key={i}>
              <rect
                x={p.x - 11}
                y={p.y - 11}
                width="22"
                height="22"
                rx="6"
                fill="var(--color-primary)"
                stroke="white"
                strokeWidth="2.5"
              />
              <rect x={p.x - 5} y={p.y - 1} width="10" height="4" rx="1.5" fill="white" />
              <rect x={p.x - 5} y={p.y - 4} width="4" height="3" rx="1.5" fill="white" />
            </g>
          ) : (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="11"
                fill="var(--color-orange)"
                stroke="white"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="white"
              >
                {p.n}
              </text>
            </g>
          ),
        )}
      </svg>
      <div className="absolute bottom-2 left-2 text-[9px] italic text-ink-faint/70">
        design mock · not a real map
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col rounded-md border border-border bg-white text-ink shadow">
        <button className="flex size-7 items-center justify-center border-b border-border hover:bg-surface-soft">
          <IconPlus size={13} />
        </button>
        <button className="flex size-7 items-center justify-center hover:bg-surface-soft">
          <IconMinus size={13} />
        </button>
      </div>
    </div>
  );
}
