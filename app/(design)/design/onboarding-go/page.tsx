"use client";

/**
 * Onboarding Go · design sketch
 *
 * Full-canvas /trips/new dove Go conduce un'intervista strutturata (~8 step)
 * con widget rapidi, mentre a destra la "spine" del viaggio si costruisce
 * in tempo reale. Completata l'intervista, Go genera il piano in streaming
 * (giorni che appaiono uno alla volta) e consegna l'utente alla pagina di
 * edit dedicata, dove Go resta come float per supportare.
 *
 * Stati selezionabili dal ribbon in alto:
 *   1. Empty          — Go si presenta, prima domanda (destinazione)
 *   2. Mid-interview  — destinazione + date salvate, party in compilazione
 *   3. Recap          — tutti i muri portanti raccolti, CTA "Crea il piano"
 *   4. Generating     — streaming dei giorni nella spine
 *   5. Ready          — piano completo, handoff alla pagina di edit
 *
 * Linee di stile fedeli a TravelGo: ink #0d2c3d, orange #f47b3a, serif
 * Georgia per gli accent "destinazione/quote", eyebrow micro uppercase,
 * GoAvatar 五 con halo. Tutto inline, nessuna chiamata reale.
 *
 * Spec viva: docs/design/onboarding-go.md (TODO)
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import {
  IconArrowRight,
  IconArrowUp,
  IconBeer,
  IconBuildingMonument,
  IconCalendar,
  IconCamera,
  IconCheck,
  IconChevronLeft,
  IconCircleCheck,
  IconCircleDashed,
  IconCompass,
  IconHandStop,
  IconLoader2,
  IconMapPin,
  IconMountain,
  IconPencil,
  IconPlaneDeparture,
  IconPlus,
  IconShoppingBag,
  IconSoup,
  IconSparkles,
  IconUsers,
  IconWallet,
  IconWorld,
  IconX,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   Stati del flusso
───────────────────────────────────────────────────────────────── */

type State = "empty" | "interview" | "recap" | "generating" | "ready";

const STATES: { id: State; label: string; eyebrow: string }[] = [
  { id: "empty",      label: "Empty",         eyebrow: "1 · welcome" },
  { id: "interview",  label: "Mid-interview", eyebrow: "2 · party" },
  { id: "recap",      label: "Recap",         eyebrow: "3 · confirm" },
  { id: "generating", label: "Generating",    eyebrow: "4 · streaming" },
  { id: "ready",      label: "Ready",         eyebrow: "5 · handoff" },
];

/* ─────────────────────────────────────────────────────────────────
   Root
───────────────────────────────────────────────────────────────── */

export default function OnboardingGoPage() {
  const [state, setState] = useState<State>("empty");

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <StateSwitcher current={state} onSelect={setState} />
      <SlimHeader />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] gap-6 max-w-[1280px] w-full mx-auto px-6 py-6">
        <ChatColumn state={state} />
        <SpineColumn state={state} />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   State switcher · solo in design, fuori dal mock
───────────────────────────────────────────────────────────────── */

function StateSwitcher({
  current,
  onSelect,
}: {
  current: State;
  onSelect: (s: State) => void;
}) {
  return (
    <div className="bg-ink text-white px-6 py-2.5 flex items-center gap-3 sticky top-0 z-50">
      <span className="text-tiny tracking-eyebrow-wide uppercase text-orange font-medium">
        Design · state
      </span>
      <div className="flex gap-1 flex-wrap">
        {STATES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "px-3 py-1 rounded-pill text-mini transition-colors border-0 cursor-pointer",
              current === s.id
                ? "bg-orange text-white"
                : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <span className="ml-auto text-tiny text-white/50 font-serif italic">
        {STATES.find((s) => s.id === current)?.eyebrow}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Slim header · senza trip context (non c'è ancora un trip)
───────────────────────────────────────────────────────────────── */

function SlimHeader() {
  return (
    <header className="bg-surface border-b border-border px-6 py-3.5 flex items-center gap-5">
      <a
        href="#"
        className="font-serif italic text-lg text-ink flex items-center gap-1.5 no-underline"
      >
        <span className="font-serif">五</span>{" "}
        Travel<b className="font-medium">Go</b>
      </a>
      <span className="text-micro tracking-eyebrow-wide uppercase text-orange-deep font-medium">
        Creating a new trip
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button className="text-mini text-ink-faint hover:text-ink inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer">
          <IconChevronLeft size={14} /> Save & exit
        </button>
        <button
          aria-label="Close"
          className="w-8 h-8 rounded-full border border-border-strong text-ink-soft inline-flex items-center justify-center hover:bg-surface-soft hover:text-ink transition-colors bg-transparent"
        >
          <IconX size={14} />
        </button>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Chat column · sinistra
───────────────────────────────────────────────────────────────── */

function ChatColumn({ state }: { state: State }) {
  return (
    <section className="flex flex-col min-h-[640px]">
      <ChatHead state={state} />
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin">
        {state === "empty" && <ChatEmpty />}
        {state === "interview" && <ChatInterview />}
        {state === "recap" && <ChatRecap />}
        {state === "generating" && <ChatGenerating />}
        {state === "ready" && <ChatReady />}
      </div>
      <ChatInput disabled={state === "generating"} />
    </section>
  );
}

function ChatHead({ state }: { state: State }) {
  const step = stepForState(state);
  return (
    <div
      className="flex items-center gap-2.5 pb-3.5 mb-3.5"
      style={{ borderBottom: "0.5px solid var(--color-border)" }}
    >
      <GoAvatar size="md" pulse />
      <div className="flex-1 min-w-0">
        <div className="text-micro font-medium uppercase tracking-[0.08em] text-orange leading-none">
          Go is helping you plan
        </div>
        <div className="text-tiny text-ink-faint mt-1">
          Step <span className="text-ink font-medium">{step.current}</span> of {step.total} · {step.label}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: step.total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-pill transition-all",
              i < step.current ? "w-4 bg-orange" : "w-2 bg-border-strong",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function stepForState(state: State): { current: number; total: number; label: string } {
  if (state === "empty")      return { current: 1, total: 8, label: "destinazione" };
  if (state === "interview")  return { current: 4, total: 8, label: "party" };
  if (state === "recap")      return { current: 8, total: 8, label: "conferma" };
  if (state === "generating") return { current: 8, total: 8, label: "creando il piano…" };
  return { current: 8, total: 8, label: "piano pronto" };
}

/* ─────────────────────────────────────────────────────────────────
   Chat states
───────────────────────────────────────────────────────────────── */

function ChatEmpty() {
  return (
    <div className="space-y-4">
      <GoMessage>
        Ciao Enrico — sono <b className="font-medium not-italic">Go</b>. Costruiamo
        insieme il tuo prossimo viaggio. Bastano pochi minuti: ti faccio qualche
        domanda e poi ti consegno un piano già pronto da rifinire.
      </GoMessage>
      <GoMessage>
        Partiamo dalla cosa più importante: <b className="font-medium not-italic">dove</b> ti porta la voglia?
      </GoMessage>
      <DestinationWidget />
    </div>
  );
}

function ChatInterview() {
  return (
    <div className="space-y-4">
      <CollapsedTurn summary="1. Destinazione · Tokyo, Giappone" />
      <CollapsedTurn summary="2. Date · 27 lug → 5 ago · 9 notti" />
      <CollapsedTurn summary="3. Vibe · mix tra esplorazione e relax" />
      <GoMessage>
        Tre cose chiare, ottimo. <b className="font-medium not-italic">Con chi</b> viaggi?
        Mi aiuta a calibrare ritmo e suggerimenti.
      </GoMessage>
      <PartyWidget />
    </div>
  );
}

function ChatRecap() {
  return (
    <div className="space-y-4">
      <CollapsedTurn summary="1. Destinazione · Tokyo, Giappone" />
      <CollapsedTurn summary="2. Date · 27 lug → 5 ago · 9 notti" />
      <CollapsedTurn summary="3. Vibe · mix esplorazione + relax" />
      <CollapsedTurn summary="4. Party · 2 adulti, no bimbi" />
      <CollapsedTurn summary="5. Interessi · cibo, fotografia, templi" />
      <CollapsedTurn summary="6. Budget · medio ($$)" />
      <CollapsedTurn summary="7. Vincoli · niente attività prima delle 9" />
      <GoMessage>
        Perfetto, ho tutto quello che mi serve per costruire un primo piano
        cucito su di voi. Confermi e me ne occupo?
      </GoMessage>
      <RecapWidget />
    </div>
  );
}

function ChatGenerating() {
  return (
    <div className="space-y-4">
      <CollapsedTurn summary="Recap confermato · 7 risposte" />
      <GoMessage>
        Sto costruendo il vostro Tokyo. Disegno i giorni uno alla volta — segui
        a destra che prende forma.
      </GoMessage>
      <div className="flex items-center gap-2 ml-10 mt-1">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse"
            style={{ animationDelay: "240ms" }}
          />
        </span>
        <span className="text-tiny font-serif italic text-ink-soft">
          Aggiungo il giorno 5 — Yanaka & caffè di quartiere…
        </span>
      </div>
    </div>
  );
}

function ChatReady() {
  return (
    <div className="space-y-4">
      <CollapsedTurn summary="Recap confermato · 7 risposte" />
      <GoMessage>
        Ecco il vostro <b className="font-medium not-italic">Tokyo</b>: 9 giorni
        bilanciati, un paio di gite fuori porta, niente prima delle 9. Ti
        accompagno alla pagina dove puoi rifinire tutto.
      </GoMessage>
      <div className="ml-10 flex flex-col gap-2">
        <button
          type="button"
          className="self-start inline-flex items-center gap-2 bg-ink hover:bg-ink-hover text-white rounded-pill px-4 py-2.5 text-mini font-medium cursor-pointer border-0 transition-colors"
        >
          Apri il viaggio
          <IconArrowRight size={14} />
        </button>
        <button
          type="button"
          className="self-start text-tiny text-ink-faint hover:text-ink underline underline-offset-2 bg-transparent border-0 cursor-pointer"
        >
          Posso cambiare qualcosa prima?
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Bubbles & rows · fedeli a GoChat.tsx
───────────────────────────────────────────────────────────────── */

function GoMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <GoAvatar size="sm" pulse={false} />
      <div
        className="text-[14px] text-ink leading-[1.55] font-serif italic max-w-[calc(100%-40px)]"
        style={{
          background: "var(--color-surface)",
          border: "0.5px solid var(--color-border)",
          borderRadius: "16px 16px 16px 4px",
          padding: "10px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CollapsedTurn({ summary }: { summary: string }) {
  return (
    <div className="flex items-center gap-2 ml-10 text-tiny text-ink-faint">
      <IconCircleCheck size={14} className="text-success-fg shrink-0" />
      <span className="truncate">{summary}</span>
      <button
        aria-label="Modifica"
        className="ml-auto inline-flex items-center text-ink-faint hover:text-ink bg-transparent border-0 cursor-pointer"
      >
        <IconPencil size={12} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget · DestinationWidget
───────────────────────────────────────────────────────────────── */

function DestinationWidget() {
  return (
    <WidgetCard label="Dove">
      <div
        className="flex items-center gap-2.5 bg-surface-input rounded-pill px-3.5 py-2"
        style={{ border: "0.5px solid var(--color-border-strong)" }}
      >
        <IconMapPin size={14} className="text-ink-faint shrink-0" />
        <span className="text-meta text-ink-faint flex-1">
          Cerca città, regione, o "sorprendimi"…
        </span>
        <IconSparkles size={14} className="text-orange shrink-0" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Tokyo", "Lisbona", "Marrakech", "Islanda", "Andalusia"].map((d) => (
          <Chip key={d}>{d}</Chip>
        ))}
        <Chip variant="dashed">
          <IconSparkles size={11} className="text-orange" />
          Sorprendimi tu
        </Chip>
      </div>

      <p className="text-tiny font-serif italic text-ink-faint mt-3 leading-snug">
        Anche solo un'idea di clima o "estate al mare in Europa" mi basta —
        ti propongo io.
      </p>
    </WidgetCard>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget · PartyWidget
───────────────────────────────────────────────────────────────── */

function PartyWidget() {
  return (
    <WidgetCard label="Con chi">
      <div className="grid grid-cols-2 gap-2">
        <Stepper icon={<IconUsers size={14} />} label="Adulti" value={2} />
        <Stepper icon={<IconUsers size={14} />} label="Bambini" value={0} muted />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>Solo io</Chip>
        <Chip active>Coppia</Chip>
        <Chip>Famiglia</Chip>
        <Chip>Amici (3+)</Chip>
        <Chip>Gruppo organizzato</Chip>
      </div>

      <p className="text-tiny font-serif italic text-ink-faint mt-3">
        Se viaggi con bimbi piccoli adatto ritmo e tappe; con amici alzo
        la voce su cene e nightlife.
      </p>
    </WidgetCard>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget · RecapWidget (stato Recap)
───────────────────────────────────────────────────────────────── */

function RecapWidget() {
  return (
    <WidgetCard label="Conferma">
      <ul className="divide-y divide-border">
        {[
          { icon: <IconMapPin size={13} />,   key: "Destinazione", val: "Tokyo, Giappone" },
          { icon: <IconCalendar size={13} />, key: "Date",         val: "27 lug → 5 ago · 9 notti" },
          { icon: <IconUsers size={13} />,    key: "Party",        val: "2 adulti" },
          { icon: <IconCompass size={13} />,  key: "Vibe",         val: "mix esplorazione + relax" },
          { icon: <IconSparkles size={13} />, key: "Interessi",    val: "cibo · fotografia · templi" },
          { icon: <IconWallet size={13} />,   key: "Budget",       val: "medio ($$)" },
          { icon: <IconHandStop size={13} />, key: "Vincoli",      val: "niente prima delle 9" },
        ].map((r) => (
          <li key={r.key} className="flex items-center gap-2 py-2">
            <span className="text-ink-faint">{r.icon}</span>
            <span className="text-mini text-ink-faint w-[88px]">{r.key}</span>
            <span className="text-mini text-ink flex-1">{r.val}</span>
            <button
              aria-label="Modifica"
              className="text-ink-faint hover:text-ink bg-transparent border-0 cursor-pointer"
            >
              <IconPencil size={12} />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-deep text-white rounded-pill px-4 py-3 text-meta font-medium cursor-pointer border-0 transition-colors"
      >
        <IconSparkles size={14} />
        Crea il mio piano
      </button>
      <p className="text-tiny font-serif italic text-ink-faint text-center mt-2">
        Dura ~10 secondi. Potrai modificare tutto dopo.
      </p>
    </WidgetCard>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget shell · card + label
───────────────────────────────────────────────────────────────── */

function WidgetCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ml-10">
      <div className="text-micro tracking-eyebrow uppercase text-ink-faint font-medium mb-1.5">
        {label}
      </div>
      <div
        className="bg-surface rounded-md p-4"
        style={{ border: "0.5px solid var(--color-border)" }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  variant,
}: {
  children: React.ReactNode;
  active?: boolean;
  variant?: "dashed";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-mini cursor-pointer transition-colors",
        active && "bg-ink text-white",
        !active && variant !== "dashed" && "bg-surface-soft text-ink-soft hover:bg-surface-warm",
        variant === "dashed" && "bg-transparent text-ink-soft hover:bg-surface-warm",
      )}
      style={
        variant === "dashed"
          ? { border: "1px dashed var(--color-border-strong)" }
          : !active
            ? { border: "0.5px solid var(--color-border)" }
            : undefined
      }
    >
      {children}
    </span>
  );
}

function Stepper({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 bg-surface-input",
        muted && "opacity-60",
      )}
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <span className="text-ink-faint">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-tiny text-ink-faint leading-none">{label}</div>
        <div className="text-meta text-ink font-medium mt-0.5">{value}</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          aria-label="Diminuisci"
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-soft bg-transparent border-0 cursor-pointer hover:bg-surface-soft"
          style={{ border: "0.5px solid var(--color-border-strong)" }}
        >
          –
        </button>
        <button
          aria-label="Aumenta"
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-soft bg-transparent border-0 cursor-pointer hover:bg-surface-soft"
          style={{ border: "0.5px solid var(--color-border-strong)" }}
        >
          <IconPlus size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Chat input · libero, sempre disponibile
───────────────────────────────────────────────────────────────── */

function ChatInput({ disabled }: { disabled?: boolean }) {
  return (
    <div className="pt-4 mt-2">
      <div
        className={cn(
          "flex items-center gap-2.5 bg-surface rounded-pill transition-all",
          "focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
          disabled && "opacity-50",
        )}
        style={{
          border: "0.5px solid var(--color-border-strong)",
          padding: "6px 6px 6px 14px",
        }}
      >
        <IconSparkles size={15} className="text-orange shrink-0" />
        <input
          type="text"
          placeholder={
            disabled
              ? "Sto generando il piano…"
              : "Oppure scrivi liberamente — Go capisce."
          }
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-meta text-ink placeholder:text-ink-faint py-1.5 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Invia"
          className={cn(
            "w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 border-0",
            disabled
              ? "bg-surface-soft text-ink-faint cursor-not-allowed"
              : "bg-ink text-ink-faint cursor-pointer",
          )}
        >
          <IconArrowUp size={16} className="text-white" />
        </button>
      </div>
      <p className="text-tiny font-serif italic text-ink-faint mt-2 px-2">
        Premi <span className="text-ink">↵</span> per inviare ·{" "}
        <span className="text-ink">Esc</span> per uscire — il progresso si salva.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine column · destra · costruisce in tempo reale
───────────────────────────────────────────────────────────────── */

function SpineColumn({ state }: { state: State }) {
  return (
    <section className="flex flex-col min-h-[640px]">
      <SpineHead state={state} />
      <div className="flex-1 space-y-3">
        {state === "empty" && <SpineEmpty />}
        {state === "interview" && <SpineInterview />}
        {state === "recap" && <SpineRecap />}
        {state === "generating" && <SpineGenerating />}
        {state === "ready" && <SpineReady />}
      </div>
    </section>
  );
}

function SpineHead({ state }: { state: State }) {
  const labels: Record<State, { eyebrow: string; title: string }> = {
    empty:      { eyebrow: "Il tuo viaggio",         title: "Comincia a prendere forma…" },
    interview:  { eyebrow: "In costruzione",          title: "Tokyo · 9 notti" },
    recap:      { eyebrow: "Pronto per la generazione", title: "Tokyo · 9 notti" },
    generating: { eyebrow: "Sto generando…",          title: "Tokyo · 9 notti" },
    ready:      { eyebrow: "Pronto",                  title: "Tokyo · 9 notti" },
  };
  const l = labels[state];
  return (
    <div className="pb-3.5 mb-3.5" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
      <div className="text-micro tracking-eyebrow-wide uppercase text-orange-deep font-medium">
        {l.eyebrow}
      </div>
      <h2 className="font-serif italic text-[22px] text-ink mt-1 leading-tight">
        {l.title}
      </h2>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine · Empty (placeholder slots)
───────────────────────────────────────────────────────────────── */

function SpineEmpty() {
  return (
    <>
      <div
        className="bg-surface rounded-md p-6 text-center"
        style={{
          border: "1px dashed var(--color-border-strong)",
          background:
            "repeating-linear-gradient(135deg, var(--color-surface) 0 14px, var(--color-surface-soft) 14px 28px)",
        }}
      >
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface text-orange mb-3"
              style={{ border: "0.5px solid var(--color-orange-border)" }}>
          <IconWorld size={22} />
        </span>
        <p className="font-serif italic text-meta text-ink leading-snug">
          Mentre rispondi a Go, qui prende forma il <b className="not-italic font-medium">tuo viaggio</b>.
        </p>
        <p className="text-tiny text-ink-faint mt-1.5">
          Destinazione, date, party, vibe — uno dopo l'altro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <IconMapPin size={14} />,   label: "Destinazione" },
          { icon: <IconCalendar size={14} />, label: "Date" },
          { icon: <IconUsers size={14} />,    label: "Party" },
          { icon: <IconCompass size={14} />,  label: "Vibe & interessi" },
        ].map((s) => (
          <PlaceholderSlot key={s.label} icon={s.icon} label={s.label} />
        ))}
      </div>
    </>
  );
}

function PlaceholderSlot({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="bg-surface rounded-md p-3.5 flex items-center gap-2.5"
      style={{ border: "1px dashed var(--color-border-strong)" }}
    >
      <span className="text-ink-faint">{icon}</span>
      <span className="text-mini text-ink-faint">{label}</span>
      <IconCircleDashed size={14} className="text-border-strong ml-auto" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine · Interview (mid)
───────────────────────────────────────────────────────────────── */

function SpineInterview() {
  return (
    <>
      <SpineDestination />
      <SpineDates />
      <SpineCardActive label="Party" icon={<IconUsers size={14} />}>
        <span className="text-meta font-serif italic text-ink-faint">
          In compilazione…
        </span>
      </SpineCardActive>
      <PlaceholderSlot icon={<IconCompass size={14} />} label="Vibe & interessi" />
      <PlaceholderSlot icon={<IconWallet size={14} />} label="Budget" />
      <PlaceholderSlot icon={<IconHandStop size={14} />} label="Vincoli" />
    </>
  );
}

function SpineDestination() {
  return (
    <div
      className="bg-surface rounded-md p-4 flex items-center gap-3.5"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <span className="w-12 h-12 rounded-full bg-ink text-white inline-flex items-center justify-center go-jp text-[20px]">
        東
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-micro tracking-eyebrow uppercase text-orange-deep font-medium">
          Destinazione
        </div>
        <div className="font-serif italic text-[24px] text-ink leading-none mt-0.5">
          Tokyo
        </div>
        <div className="text-tiny text-ink-faint mt-1 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#d83b3b] inline-block" />
          Giappone · Honshu
        </div>
      </div>
      <button
        aria-label="Modifica"
        className="text-ink-faint hover:text-ink bg-transparent border-0 cursor-pointer"
      >
        <IconPencil size={14} />
      </button>
    </div>
  );
}

function SpineDates() {
  return (
    <div
      className="bg-surface rounded-md p-4"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <IconCalendar size={14} className="text-orange-deep" />
        <span className="text-micro tracking-eyebrow uppercase text-orange-deep font-medium">
          Date
        </span>
        <span className="ml-auto text-tiny text-ink-faint">9 notti</span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <div className="text-tiny tracking-eyebrow uppercase text-ink-faint">From</div>
          <div className="font-serif italic text-[20px] text-ink leading-none mt-0.5">
            27 lug
          </div>
        </div>
        <span className="text-orange-deep mb-1.5">
          <IconArrowRight size={16} />
        </span>
        <div>
          <div className="text-tiny tracking-eyebrow uppercase text-ink-faint">To</div>
          <div className="font-serif italic text-[20px] text-ink leading-none mt-0.5">
            5 ago
          </div>
        </div>
        <span className="ml-auto text-tiny text-ink-faint font-serif italic">
          estate · alta stagione
        </span>
      </div>
    </div>
  );
}

function SpineCardActive({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-orange-soft rounded-md p-4 flex items-center gap-2.5"
      style={{ border: "0.5px solid var(--color-orange-border)" }}
    >
      <span className="text-orange-deep">{icon}</span>
      <span className="text-micro tracking-eyebrow uppercase text-orange-deep font-medium">
        {label}
      </span>
      <span className="text-tiny text-orange-deep font-serif italic ml-1">
        ← step corrente
      </span>
      <div className="ml-auto">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine · Recap (tutti i muri portanti)
───────────────────────────────────────────────────────────────── */

function SpineRecap() {
  return (
    <>
      <SpineDestination />
      <SpineDates />
      <SpineSimpleCard
        icon={<IconUsers size={14} />}
        label="Party"
        value="2 adulti, viaggio in coppia"
      />
      <SpineSimpleCard
        icon={<IconCompass size={14} />}
        label="Vibe"
        value="mix · esplorazione + relax"
      />
      <SpineChipsCard
        icon={<IconSparkles size={14} />}
        label="Interessi"
        chips={[
          { icon: <IconSoup size={11} />, label: "Cibo" },
          { icon: <IconCamera size={11} />, label: "Fotografia" },
          { icon: <IconBuildingMonument size={11} />, label: "Templi" },
          { icon: <IconMountain size={11} />, label: "Natura" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <SpineSimpleCard
          icon={<IconWallet size={14} />}
          label="Budget"
          value="medio · $$"
        />
        <SpineSimpleCard
          icon={<IconHandStop size={14} />}
          label="Vincoli"
          value="non prima delle 9"
        />
      </div>

      <div
        className="rounded-md p-4 mt-2 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, var(--color-orange-soft), var(--color-surface-warm))",
          border: "0.5px solid var(--color-orange-border)",
        }}
      >
        <GoAvatar size="sm" pulse={false} />
        <p className="text-tiny font-serif italic text-ink leading-snug flex-1">
          Pronto a costruire 9 giorni cuciti su di voi. Conferma in chat →
        </p>
        <IconSparkles size={14} className="text-orange shrink-0" />
      </div>
    </>
  );
}

function SpineSimpleCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="bg-surface rounded-md p-3.5"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-ink-faint">{icon}</span>
        <span className="text-micro tracking-eyebrow uppercase text-ink-faint font-medium">
          {label}
        </span>
      </div>
      <div className="text-meta text-ink font-serif italic">{value}</div>
    </div>
  );
}

function SpineChipsCard({
  icon,
  label,
  chips,
}: {
  icon: React.ReactNode;
  label: string;
  chips: { icon: React.ReactNode; label: string }[];
}) {
  return (
    <div
      className="bg-surface rounded-md p-3.5"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-ink-faint">{icon}</span>
        <span className="text-micro tracking-eyebrow uppercase text-ink-faint font-medium">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-mini bg-surface-soft text-ink-soft"
            style={{ border: "0.5px solid var(--color-border)" }}
          >
            {c.icon}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine · Generating (streaming dei giorni)
───────────────────────────────────────────────────────────────── */

function SpineGenerating() {
  return (
    <>
      <SpineRecapSlim />
      <div
        className="rounded-md p-3 flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-orange-soft), var(--color-surface-warm))",
          border: "0.5px solid var(--color-orange-border)",
        }}
      >
        <span className="go-halo inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink text-white go-jp text-[14px]">
          五
        </span>
        <p className="text-tiny font-serif italic text-orange-deep flex-1">
          Sto disegnando il giorno <b className="not-italic font-medium">5</b> di 9 — Yanaka & caffè di quartiere…
        </p>
        <IconLoader2 size={14} className="text-orange-deep animate-spin" />
      </div>

      <div className="space-y-2 mt-2">
        {DAYS.map((d, i) => (
          <DayCard
            key={d.n}
            day={d}
            state={i < 4 ? "done" : i === 4 ? "streaming" : "pending"}
          />
        ))}
      </div>
    </>
  );
}

function SpineRecapSlim() {
  return (
    <div
      className="bg-surface rounded-md px-4 py-3 flex items-center gap-3 flex-wrap"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      <span className="font-serif italic text-meta text-ink">Tokyo</span>
      <span className="text-ink-faint">·</span>
      <span className="text-mini text-ink-faint">9 notti · 2 adulti</span>
      <span className="text-ink-faint">·</span>
      <span className="text-mini text-ink-faint">$$ · niente prima delle 9</span>
      <button
        className="ml-auto text-tiny text-ink-faint hover:text-ink bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"
      >
        <IconPencil size={11} /> recap
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Spine · Ready (piano completo)
───────────────────────────────────────────────────────────────── */

function SpineReady() {
  return (
    <>
      <SpineRecapSlim />
      <div className="space-y-2 mt-2">
        {DAYS.map((d) => (
          <DayCard key={d.n} day={d} state="done" />
        ))}
      </div>

      <div
        className="rounded-md p-4 mt-3 flex items-center gap-3"
        style={{
          background: "var(--color-ink)",
          color: "#fff",
        }}
      >
        <IconPlaneDeparture size={20} className="text-orange shrink-0" />
        <div className="flex-1">
          <div className="font-serif italic text-meta">Pronto al decollo</div>
          <div className="text-tiny text-white/70 mt-0.5">
            Apri la pagina per spostare attività, aggiungere prenotazioni, o chiedere a Go.
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 bg-orange hover:bg-orange-deep text-white rounded-pill px-3.5 py-1.5 text-mini font-medium border-0 cursor-pointer transition-colors"
        >
          Apri
          <IconArrowRight size={13} />
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Day cards · mock 9 giorni Tokyo
───────────────────────────────────────────────────────────────── */

type Day = { n: number; title: string; pills: { icon: React.ReactNode; label: string }[] };

const DAYS: Day[] = [
  { n: 1, title: "Arrivo · soft landing in Shibuya",
    pills: [
      { icon: <IconPlaneDeparture size={10} />, label: "HND 08:50" },
      { icon: <IconSoup size={10} />, label: "Ramen Ichiran" },
    ],
  },
  { n: 2, title: "Asakusa & Skytree",
    pills: [
      { icon: <IconBuildingMonument size={10} />, label: "Sensō-ji" },
      { icon: <IconCamera size={10} />, label: "Sumida walk" },
    ],
  },
  { n: 3, title: "Shinjuku · Shibuya by night",
    pills: [
      { icon: <IconShoppingBag size={10} />, label: "Don Quijote" },
      { icon: <IconBeer size={10} />, label: "Golden Gai" },
    ],
  },
  { n: 4, title: "Day trip · Kamakura",
    pills: [
      { icon: <IconMountain size={10} />, label: "Big Buddha" },
      { icon: <IconCamera size={10} />, label: "Hasedera" },
    ],
  },
  { n: 5, title: "Yanaka & caffè di quartiere",
    pills: [
      { icon: <IconBuildingMonument size={10} />, label: "Nezu shrine" },
      { icon: <IconSoup size={10} />, label: "Kayaba coffee" },
    ],
  },
  { n: 6, title: "—", pills: [] },
  { n: 7, title: "—", pills: [] },
  { n: 8, title: "—", pills: [] },
  { n: 9, title: "—", pills: [] },
];

function DayCard({
  day,
  state,
}: {
  day: Day;
  state: "done" | "streaming" | "pending";
}) {
  if (state === "pending") {
    return (
      <div
        className="bg-surface rounded-md p-3 flex items-center gap-2.5"
        style={{ border: "1px dashed var(--color-border-strong)" }}
      >
        <span className="w-7 h-7 rounded-full bg-surface-soft inline-flex items-center justify-center text-tiny text-ink-faint">
          {day.n}
        </span>
        <span className="text-mini text-ink-faint font-serif italic">
          giorno {day.n} · in coda…
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-surface rounded-md p-3 flex items-start gap-2.5 transition-all",
        state === "streaming" && "go-float-enter",
      )}
      style={{
        border:
          state === "streaming"
            ? "0.5px solid var(--color-orange-border)"
            : "0.5px solid var(--color-border)",
        background:
          state === "streaming" ? "var(--color-orange-soft)" : "var(--color-surface)",
      }}
    >
      <span
        className={cn(
          "w-7 h-7 rounded-full inline-flex items-center justify-center text-tiny font-medium shrink-0",
          state === "streaming"
            ? "bg-orange text-white"
            : "bg-ink text-white",
        )}
      >
        {day.n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-serif italic text-meta text-ink leading-snug">
          {day.title}
          {state === "streaming" && (
            <span className="text-orange ml-1.5 animate-pulse">▋</span>
          )}
        </div>
        {day.pills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {day.pills.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-[10px] bg-surface-soft text-ink-soft"
                style={{ border: "0.5px solid var(--color-border)" }}
              >
                {p.icon}
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {state === "done" && (
        <IconCheck size={14} className="text-success-fg shrink-0 mt-1" />
      )}
    </div>
  );
}
