/**
 * Design sketch — Day Rail States
 * URL: /design/day-rail-states
 *
 * Stato approvato del badge giorno nel DayRail (modalità compact).
 * Sostituisce il vecchio accent-bar laterale arancione con una fill bar
 * superiore che comunica il riempimento del giorno.
 *
 * Struttura verticale del badge:
 *   [doppia barretta]  ← solo primo/ultimo giorno
 *   [fill bar 4px]     ← sempre presente, colore = stato
 *   [gap 3px]
 *   [badge 36×36]      ← corner radius varia per primo/ultimo
 *   [stub]             ← area grigia sotto; in overflow mostra icona
 *   [doppia barretta]  ← solo ultimo giorno
 *
 * Componente da modificare: features/day/DayItem.tsx (compact mode)
 * Props nuove da aggiungere: fillPct, overflow, isFirst, isLast
 */

import { cn } from "@/lib/cn";
import { IconClockExclamation } from "@/components/ui/icons";

/* ─── Tipi ───────────────────────────────────────────────────────── */
type BadgeState = "normal" | "selected" | "overflow";

type DayBadgeProps = {
  dow: string;
  dayNumber: number;
  state?: BadgeState;
  /** 0–100 — percentuale ore occupate rispetto alle ore disponibili del giorno */
  fillPct?: number;
  isFirst?: boolean;
  isLast?: boolean;
};

/* ─── Colore fill bar in base allo stato ─────────────────────────── */
function fillColor(state: BadgeState, fillPct: number): string {
  if (state === "overflow") return "bg-danger-fg";
  if (fillPct >= 80) return "bg-warning-fg";
  return "bg-[#639922]"; // ok-green — non ancora tokenizzato
}

/* ─── Thin accent bar (per la doppia barretta) ───────────────────── */
function AccentBar() {
  return <div className="w-9 h-1 bg-ink/15" />;
}

/* ─── Fill bar ───────────────────────────────────────────────────── */
function FillBar({ state, fillPct }: { state: BadgeState; fillPct: number }) {
  const effective = state === "overflow" ? 100 : fillPct;
  return (
    <div className="w-9 h-1 bg-surface-soft overflow-hidden">
      <div
        className={cn("h-full", fillColor(state, fillPct))}
        style={{ width: `${effective}%` }}
      />
    </div>
  );
}

/* ─── DayBadge ───────────────────────────────────────────────────── */
function DayBadge({
  dow,
  dayNumber,
  state = "normal",
  fillPct = 0,
  isFirst = false,
  isLast = false,
}: DayBadgeProps) {
  const badgeRadius =
    isFirst ? "rounded-t-none rounded-b" :
    isLast  ? "rounded-b-none rounded-t" :
    "rounded";

  const badgeBg =
    state === "selected" ? "bg-ink" :
    state === "overflow" ? "bg-danger-bg border border-danger-border" :
    "bg-surface-soft";

  const dowColor =
    state === "selected" ? "text-white/50" :
    state === "overflow" ? "text-danger-fg" :
    "text-ink/40";

  const numColor =
    state === "selected" ? "text-white" :
    state === "overflow" ? "text-danger-fg" :
    "text-ink";

  const stubBg =
    state === "overflow" ? "bg-danger-bg" : "bg-surface-soft";

  const stubRadius = isLast ? "rounded-none" : "rounded-b";

  return (
    <div className="flex flex-col items-center w-9">
      {/* Doppia barretta superiore — solo primo giorno */}
      {isFirst && (
        <>
          <AccentBar />
          <div className="h-0.5" />
        </>
      )}

      {/* Fill bar */}
      <FillBar state={state} fillPct={fillPct} />
      <div className="h-[3px]" />

      {/* Badge */}
      <div
        className={cn(
          "w-9 h-9 flex flex-col items-center justify-center gap-px",
          badgeBg,
          badgeRadius,
        )}
      >
        <span className={cn("text-[9px] font-medium tracking-[0.04em] uppercase leading-none", dowColor)}>
          {dow}
        </span>
        <span className={cn("text-[15px] font-medium leading-none", numColor)}>
          {dayNumber}
        </span>
      </div>

      {/* Stub */}
      <div className={cn("w-9 mt-0.5 flex items-center justify-center", stubBg, stubRadius, "min-h-[44px]")}>
        {state === "overflow" && (
          <IconClockExclamation className="w-3.5 h-3.5 text-danger-fg" />
        )}
      </div>

      {/* Doppia barretta inferiore — solo ultimo giorno */}
      {isLast && (
        <>
          <div className="h-0.5" />
          <AccentBar />
        </>
      )}
    </div>
  );
}

/* ─── Pagina ─────────────────────────────────────────────────────── */
export default function DayRailStatesPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">

      {/* Header */}
      <header className="mb-10">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Day Rail · compact mode
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3 tracking-[-0.01em]">
          Day badge states
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[640px]">
          Redesign del badge giorno in modalità compatta. La fill bar superiore
          sostituisce l&apos;accent-bar laterale arancione e comunica il
          riempimento del giorno. Tre stati: <strong className="font-medium text-ink">normale</strong>,{" "}
          <strong className="font-medium text-ink">selezionato</strong>,{" "}
          <strong className="font-medium text-ink">overflow</strong>. Primo e
          ultimo giorno hanno angoli squadrati e doppia barretta come
          terminatori visivi.
        </p>
      </header>

      {/* ── 3 stati ── */}
      <section className="mb-12">
        <SectionLabel>3 stati</SectionLabel>
        <div className="flex gap-10 flex-wrap items-start">
          <BadgeWithLabel label="Normale" sub="fillPct < 80">
            <DayBadge dow="THU" dayNumber={6} state="normal" fillPct={45} />
          </BadgeWithLabel>
          <BadgeWithLabel label="Selezionato" sub="selected={true}">
            <DayBadge dow="FRI" dayNumber={7} state="selected" fillPct={60} />
          </BadgeWithLabel>
          <BadgeWithLabel label="Overflow" sub="overflow={true}">
            <DayBadge dow="SAT" dayNumber={8} state="overflow" fillPct={100} />
          </BadgeWithLabel>
        </div>
      </section>

      {/* ── Fill bar ── */}
      <section className="mb-12">
        <SectionLabel>Fill bar — gradazione colore</SectionLabel>
        <p className="text-[12px] text-ink-soft mb-4 max-w-[480px]">
          Il colore cambia in base alla percentuale di ore occupate.
          Sotto 80% verde, oltre 80% amber, overflow rosso.
        </p>
        <div className="flex gap-10 flex-wrap items-start">
          <BadgeWithLabel label="40%" sub="ok">
            <DayBadge dow="MON" dayNumber={3} state="normal" fillPct={40} />
          </BadgeWithLabel>
          <BadgeWithLabel label="82%" sub="quasi pieno">
            <DayBadge dow="TUE" dayNumber={4} state="normal" fillPct={82} />
          </BadgeWithLabel>
          <BadgeWithLabel label="100%" sub="overflow">
            <DayBadge dow="WED" dayNumber={5} state="overflow" fillPct={100} />
          </BadgeWithLabel>
        </div>
      </section>

      {/* ── Primo e ultimo ── */}
      <section className="mb-12">
        <SectionLabel>Primo e ultimo giorno</SectionLabel>
        <p className="text-[12px] text-ink-soft mb-4 max-w-[480px]">
          Gli angoli superiori del primo giorno sono squadrati (radius 0),
          quelli inferiori dell&apos;ultimo anche. La doppia barretta agisce
          come terminatore visivo della colonna.
        </p>
        <div className="flex gap-1 items-start">
          <BadgeWithLabel label="primo" sub="isFirst">
            <DayBadge dow="WED" dayNumber={5} state="normal" fillPct={20} isFirst />
          </BadgeWithLabel>
          <BadgeWithLabel label="">
            <DayBadge dow="THU" dayNumber={6} state="normal" fillPct={55} />
          </BadgeWithLabel>
          <BadgeWithLabel label="">
            <DayBadge dow="FRI" dayNumber={7} state="selected" fillPct={60} />
          </BadgeWithLabel>
          <BadgeWithLabel label="">
            <DayBadge dow="SAT" dayNumber={8} state="overflow" fillPct={100} />
          </BadgeWithLabel>
          <BadgeWithLabel label="">
            <DayBadge dow="SUN" dayNumber={9} state="normal" fillPct={35} />
          </BadgeWithLabel>
          <BadgeWithLabel label="ultimo" sub="isLast">
            <DayBadge dow="MON" dayNumber={10} state="normal" fillPct={15} isLast />
          </BadgeWithLabel>
        </div>
      </section>

      {/* ── Dev notes ── */}
      <section className="border-t border-border pt-8">
        <SectionLabel>Note per lo sviluppatore</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <DevCard title="Componente target" file="features/day/DayItem.tsx">
            <p>Modificare il <code>compact</code> mode. Le props nuove da aggiungere:</p>
            <CodeBlock>{`// Props da aggiungere a DayItemProps
fillPct?: number        // 0–100
overflow?: boolean
isFirst?: boolean
isLast?: boolean`}</CodeBlock>
          </DevCard>

          <DevCard title="Fill bar" file="features/day/DayItem.tsx">
            <p>Sostituisce il vecchio accent-bar laterale arancione. Colori:</p>
            <CodeBlock>{`overflow  → bg-danger-fg  (piena 100%)
>= 80%   → bg-warning-fg
< 80%    → bg-[#639922]  // token da aggiungere`}</CodeBlock>
            <p className="mt-2 text-[11px] text-ink-faint">
              Il token <code>ok-green</code> / <code>--color-ok</code> è da aggiungere
              a <code>app/globals.css</code>.
            </p>
          </DevCard>

          <DevCard title="Badge radius" file="features/day/DayItem.tsx">
            <CodeBlock>{`isFirst → rounded-t-none rounded-b
isLast  → rounded-b-none rounded-t
default → rounded`}</CodeBlock>
          </DevCard>

          <DevCard title="Stub / area sotto" file="features/day/DayItem.tsx">
            <p>Area sotto il badge (altezza min 44px):</p>
            <CodeBlock>{`overflow → bg-danger-bg + <IconClockExclamation>
isLast   → rounded-none (bottom)
default  → bg-surface-soft rounded-b`}</CodeBlock>
          </DevCard>

          <DevCard title="Doppia barretta" file="features/day/DayItem.tsx">
            <CodeBlock>{`// Sopra (isFirst) e sotto (isLast)
<div className="w-9 h-1 bg-ink/15" />
<div className="h-0.5" />   {/* gap tra le due */}
<FillBar ... />`}</CodeBlock>
          </DevCard>

          <DevCard title="Sorgente fillPct" file="features/day/DayRail.tsx">
            <p>
              Calcolare <code>fillPct</code> in <code>DayRail</code> o nel
              componente padre passando le attività del giorno. Formula:
            </p>
            <CodeBlock>{`const totalMinutes = activities.reduce(
  (s, a) => s + (a.duration_min ?? 45), 0
);
const fillPct = Math.min(
  100, Math.round(totalMinutes / 600 * 100)
); // 600 min = 10h disponibili`}</CodeBlock>
          </DevCard>

        </div>
      </section>

    </div>
  );
}

/* ─── Helper UI ──────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-4">
      {children}
    </div>
  );
}

function BadgeWithLabel({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      {label && (
        <div className="text-center">
          <div className="text-[11px] font-medium text-ink">{label}</div>
          {sub && <div className="text-[10px] text-ink-faint font-mono">{sub}</div>}
        </div>
      )}
    </div>
  );
}

function DevCard({
  title,
  file,
  children,
}: {
  title: string;
  file: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-2">
      <div>
        <div className="text-[12px] font-medium text-ink">{title}</div>
        <div className="text-[10px] text-orange font-mono">{file}</div>
      </div>
      <div className="text-[12px] text-ink-soft leading-relaxed [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-ink [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:rounded-sm">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-[11px] font-mono text-ink bg-surface-soft rounded px-3 py-2 leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}
