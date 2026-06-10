/**
 * Design sketch — Transfer mode switch
 * URL: /design/transfer-mode
 *
 * Click sulla riga transfer → si apre il dettaglio (stato open di
 * Transfer.tsx) che guadagna uno SWITCH MODALITÀ in testa, alla Google:
 * A piedi · Auto · Mezzi · Bici. Cambiare modalità ricalcola il leg e
 * riscrive il bridge (durata/distanza/steps).
 *
 * Integrazione TransitVerifier: per "Mezzi" il corpo È il verifier
 * (lista di combinazioni, selezione → applica). La proposta di porting
 * lo GENERALIZZA in RouteVerifier(mode): transit → N opzioni
 * (api.routes.transit), car/walk/bike → 1 opzione (api.routes compute)
 * con lo stesso pannello: stessa lista, lunghezza diversa.
 *
 * Mock statici: pannello con "Mezzi" attivo (3 combinazioni, una
 * selezionata) e pannello con "Auto" attivo (opzione singola + deep
 * link Maps/Waze).
 */

import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  IconBike,
  IconBus,
  IconCar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconBrandGoogleMaps,
  IconBrandWaze,
  IconRefresh,
  IconTrain,
  IconWalk,
  IconX,
} from "@/components/ui/icons";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

/* ─── Mode switch (alla Google) ─────────────────────────────────── */

const MODES: { key: string; label: string; icon: IconCmp }[] = [
  { key: "walk", label: "A piedi", icon: IconWalk },
  { key: "car", label: "Auto", icon: IconCar },
  { key: "transit", label: "Mezzi", icon: IconBus },
  { key: "bike", label: "Bici", icon: IconBike },
];

function ModeSwitch({ active }: { active: string }) {
  return (
    <div className="flex gap-0.5 rounded-pill bg-surface-soft p-0.5">
      {MODES.map(({ key, label, icon: Icon }) => (
        <span
          key={key}
          role="tab"
          aria-selected={key === active}
          title={label}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill px-2 py-1.5 text-mini font-medium transition-colors",
            key === active
              ? "bg-ink text-white"
              : "text-ink-soft hover:bg-surface-warm hover:text-ink",
          )}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </span>
      ))}
    </div>
  );
}

/* ─── Option row (lista del RouteVerifier) ──────────────────────── */

type Leg = { icon: IconCmp; label: string };

function OptionRow({
  duration,
  legs,
  sub,
  selected = false,
}: {
  duration: string;
  legs: Leg[];
  sub?: string;
  selected?: boolean;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
        selected
          ? "border-ink bg-surface-soft"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5 text-mini text-ink">
          {legs.map((leg, i) => {
            const Icon = leg.icon;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 ? (
                  <IconChevronRight size={8} className="text-ink-faint" />
                ) : null}
                <Icon size={13} className="text-ink/55" />
                <span className="font-medium">{leg.label}</span>
              </span>
            );
          })}
        </span>
        {sub ? <span className="text-[11px] text-ink-soft">{sub}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-mini font-semibold tabular-nums text-ink">
        <IconClock size={12} className="text-ink-soft" />
        {duration}
      </span>
      {selected ? (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
          <IconCheck size={11} />
        </span>
      ) : null}
    </div>
  );
}

/* ─── Pannello dettaglio Transfer ───────────────────────────────── */

function Panel({
  mode,
  duration,
  distance,
  legs,
  children,
}: {
  mode: string;
  duration: string;
  distance?: string;
  legs?: Leg[];
  children: ReactNode;
}) {
  const ModeIcon = MODES.find((m) => m.key === mode)?.icon ?? IconCar;
  return (
    <div className="flex w-[340px] flex-col gap-[7px] rounded-sm bg-ink p-1">
      {/* Header scuro = SOLO info di viaggio (niente tratta: il contesto
          è già dato dalle due tappe sopra/sotto la riga transfer):
          modalità + durata + distanza + legs della combinazione attiva. */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/80">
        <ModeIcon size={13} className="shrink-0" />
        <span className="font-semibold text-white">{duration}</span>
        {distance ? (
          <>
            <span className="text-white/50">·</span>
            <span>{distance}</span>
          </>
        ) : null}
        {legs ? (
          <>
            <span className="text-white/50">·</span>
            {legs.map((leg, i) => {
              const Icon = leg.icon;
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 ? (
                    <IconChevronRight size={8} className="text-white/50" />
                  ) : null}
                  <Icon size={12} className="text-white/80" />
                  <span className="font-medium text-white">{leg.label}</span>
                </span>
              );
            })}
          </>
        ) : null}
        <span className="flex-1" />
        <IconX size={13} className="shrink-0 cursor-pointer text-white/60 hover:text-white" />
      </div>
      <div className="flex w-full flex-col gap-2.5 rounded-sm bg-surface p-3">
        <ModeSwitch active={mode} />
        {children}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function TransferModePage() {
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <header className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-orange">
          TravelGo · design scratchpad
        </div>
        <h1 className="mb-3 text-[26px] font-medium leading-tight">
          Transfer — switch modalità per tappa
        </h1>
        <p className="max-w-[680px] text-meta leading-relaxed text-ink-soft">
          Click sulla riga transfer → dettaglio con switch{" "}
          <strong className="font-semibold text-ink">A piedi · Auto · Mezzi · Bici</strong>{" "}
          (le opzioni di Google). Il corpo è lo stesso pattern per ogni
          modalità — la lista opzioni del{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">TransitVerifier</code>{" "}
          generalizzato: Mezzi → N combinazioni, Auto/Piedi/Bici → 1 opzione.
          Selezione → il bridge si riscrive e la riga collapsed si aggiorna.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Mezzi — il TransitVerifier dentro il dettaglio
          </h2>
          <Panel
            mode="transit"
            duration="46 min"
            legs={[
              { icon: IconWalk, label: "8 min" },
              { icon: IconBus, label: "105" },
              { icon: IconWalk, label: "10 min" },
            ]}
          >
            <div className="flex flex-col gap-1.5">
              <OptionRow
                selected
                duration="46 min"
                legs={[
                  { icon: IconWalk, label: "8 min" },
                  { icon: IconBus, label: "105" },
                  { icon: IconWalk, label: "10 min" },
                ]}
                sub="10:39 · Colosseo (Mb) → Plebiscito · 3 fermate"
              />
              <OptionRow
                duration="52 min"
                legs={[
                  { icon: IconWalk, label: "12 min" },
                  { icon: IconTrain, label: "Ginza Line" },
                ]}
                sub="10:45 · ogni 6 min"
              />
              <OptionRow
                duration="58 min"
                legs={[
                  { icon: IconBus, label: "42" },
                  { icon: IconBus, label: "105" },
                ]}
                sub="10:36 · 1 cambio"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex cursor-pointer items-center gap-1 text-[11px] text-ink-soft hover:text-ink">
                <IconRefresh size={12} />
                Ricalcola
              </span>
              <span className="cursor-pointer rounded-pill bg-primary px-4 py-1.5 text-mini font-medium text-white hover:bg-orange-deep">
                Usa questa
              </span>
            </div>
          </Panel>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Auto — opzione singola + navigazione
          </h2>
          <Panel mode="car" duration="40 min" distance="32 km">
            <div className="flex flex-col gap-1.5">
              <OptionRow
                selected
                duration="40 min"
                legs={[{ icon: IconCar, label: "32 km" }]}
                sub="via Higashi-Kanto Expressway · traffico normale"
              />
            </div>
            <div className="flex gap-2">
              <span className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink hover:bg-surface-soft">
                <IconBrandGoogleMaps size={14} className="shrink-0" />
                Google Maps
              </span>
              <span className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink hover:bg-surface-soft">
                <IconBrandWaze size={14} className="shrink-0" />
                Waze
              </span>
            </div>
          </Panel>
          <p className="max-w-[340px] text-[12px] leading-relaxed text-ink-soft">
            A piedi e Bici: stesso pannello con 1 opzione (durata +
            distanza), senza deep-link. Lo switch su una modalità non
            ancora calcolata mostra lo stato loading del verifier.
          </p>
        </section>
      </div>

      {/* Note per lo sviluppo */}
      <section className="mt-12 rounded-md border border-border bg-surface p-4">
        <p className="mb-1.5 text-meta font-semibold text-ink">
          Note per il porting
        </p>
        <div className="flex flex-col gap-1.5 text-mini leading-relaxed text-ink-soft [&_code]:rounded [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:text-[11px] [&_code]:text-ink">
          <p>
            1 · <code>Transfer.tsx</code> (stato open): aggiungere lo
            switch modalità in testa al corpo bianco; il summary scuro
            resta. 2 · Generalizzare <code>TransitVerifier</code> →{" "}
            <code>RouteVerifier</code> con prop{" "}
            <code>mode: &quot;walk&quot; | &quot;car&quot; | &quot;transit&quot; | &quot;bike&quot;</code>:
            transit → <code>api.routes.transit</code> (N opzioni, UI
            attuale); car/walk/bike → <code>api.routes</code> compute (1
            opzione, stessa OptionRow). <code>onApply(bridge)</code> resta
            l&apos;unico output. 3 · Persistenza: il bridge applicato
            scrive <code>bridge_out_json</code> della tappa di partenza
            (PATCH scheduled, flusso già esistente del verifier);{" "}
            <code>BridgeData.transport</code> copre già
            walk/metro/bus/taxi/bike/car/train — nessuna migrazione. 4 ·
            La riga collapsed si aggiorna da sé (legge il bridge). 5 ·
            Switch su modalità non calcolata → fetch lazy con loading;
            cache per-leg-per-mode in memoria per non rifetchare a ogni
            switch. 6 · i18n: label modalità in{" "}
            <code>Timeline.transport</code> (namespace già esistente).
          </p>
        </div>
      </section>
    </div>
  );
}
