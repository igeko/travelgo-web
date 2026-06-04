"use client";

/**
 * Sandbox · YumejiPanel (v2)
 * URL: /dev/yumeji-panel
 *
 * Pannello "I tuoi Yume" v2 in contenitore stile lista-giorni. Mostra i tre
 * contesti di montaggio:
 *   A · standalone   B · floating overlay
 *   C · pinned come colonna nel day-by-day
 *   D · pinned affiancato alla mappa Explore (la toolbar verticale si sposta)
 *
 * Dati mock (features/yumeji/mockData.ts) — il data layer è la fase successiva.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { YumejiPanel } from "@/features/yumeji/YumejiPanel";
import { MOCK_YUMES, type YumeChip } from "@/features/yumeji/mockData";
import { SandboxRightPanel } from "../_components/SandboxShell";

const CHIPS: YumeChip[] = [
  { id: "geo", label: "Per Tokyo", count: 5, active: true },
  { id: "unscheduled", label: "Da schedulare", count: 5, active: true },
];

function Label({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-medium">
        {n}
      </span>
      <span className="text-tiny uppercase tracking-eyebrow-wide">
        <b className="text-ink">{title}</b>
        <span className="text-ink-faint normal-case tracking-normal"> · {desc}</span>
      </span>
    </div>
  );
}

/** Riga di tab del sub-header per mostrare Yume come item al pari degli altri. */
function SubHeaderTabs({ active }: { active: "explore" | "yume" }) {
  const tabs: { id: string; label: string }[] = [
    { id: "trip", label: "Viaggio" },
    { id: "day", label: "Giorno per giorno" },
    { id: "explore", label: "Esplora" },
    { id: "yume", label: "Yume" },
  ];
  return (
    <div className="flex items-center gap-1 px-4 h-[42px] bg-bg border-b border-border">
      {tabs.map((t) => (
        <span
          key={t.id}
          className={cn(
            "px-3 py-[5px] rounded-pill text-mini",
            t.id === active ? "bg-ink text-white font-medium" : "text-ink-soft",
          )}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

export default function YumejiPanelSandbox() {
  const [floating, setFloating] = useState(true);
  const [pinned, setPinned] = useState(false);

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">YumejiPanel · v2</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Stesso contenuto del drawer, ma in contenitore stile{" "}
          <b className="text-ink font-medium">lista-giorni</b> (bordo, header eyebrow + titolo). Il
          toggle nel sub-header è un tab al pari di Viaggio/Esplora; floating sopra tutto, pinned si
          prende lo spazio in pagina.
        </p>

        {/* A · standalone */}
        <section className="mb-10">
          <Label n="A" title="Standalone" desc="contenitore base, altezza vincolata" />
          <div className="h-[460px] max-w-[340px]">
            <YumejiPanel
              items={MOCK_YUMES}
              chips={CHIPS}
              pinned={pinned}
              onTogglePin={() => setPinned((v) => !v)}
              onClose={() => {}}
              className="h-full"
            />
          </div>
        </section>

        {/* B · floating overlay */}
        <section className="mb-10">
          <Label n="B" title="Floating" desc="overlay sopra il contenuto, con ombra" />
          <div className="relative rounded-xl border border-border overflow-hidden bg-surface">
            <SubHeaderTabs active="yume" />
            <div className="relative h-[420px] bg-bg p-5">
              <div className="text-micro uppercase tracking-eyebrow text-ink-faint font-medium">
                Giorno 2 · Asakusa
              </div>
              <p className="text-mini text-ink-soft mt-2 max-w-[360px] leading-relaxed">
                Contenuto della pagina sotto. Il pannello flotta in alto a destra con un&apos;ombra,
                senza spostare il layout.
              </p>
              <div className="absolute top-3 right-3 bottom-3 w-[340px]">
                <YumejiPanel
                  items={MOCK_YUMES}
                  chips={CHIPS}
                  floating
                  onClose={() => {}}
                  onTogglePin={() => {}}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* C · pinned · colonna day-by-day */}
        <section className="mb-10">
          <Label n="C" title="Pinned · day-by-day" desc="terza colonna a destra (260 · 1fr · 340)" />
          <div className="rounded-xl border border-border overflow-hidden bg-surface">
            <SubHeaderTabs active="yume" />
            <div className="grid gap-[18px] p-5 bg-bg [grid-template-columns:200px_1fr_340px] h-[460px]">
              <div className="bg-surface rounded-lg border border-border p-3 text-mini text-ink-soft">
                <div className="text-micro uppercase tracking-eyebrow text-ink-soft mb-1">Itinerario</div>
                <div className="font-semibold text-ink text-[15px] mb-3">Giorno per giorno</div>
                Lista giorni…
              </div>
              <div className="bg-surface rounded-lg border border-border p-4 text-mini text-ink-soft">
                Contenuto del giorno (timeline / attività)…
              </div>
              <YumejiPanel
                items={MOCK_YUMES}
                chips={CHIPS}
                pinned
                onTogglePin={() => {}}
                className="h-full"
              />
            </div>
          </div>
        </section>

        {/* D · pinned · mappa Explore (overlay full-bleed) */}
        <section>
          <Label n="D" title="Pinned · Explore" desc="overlay sopra la mappa; la toolbar verticale si sposta a sinistra" />
          <div className="rounded-xl border border-border overflow-hidden bg-surface">
            <SubHeaderTabs active="yume" />
            {/* Explore è full-bleed: tutto flotta sopra la mappa */}
            <div className="relative h-[460px] bg-surface-soft">
              <div className="absolute inset-0 flex items-center justify-center text-mini text-ink-faint">
                Mappa
              </div>
              {/* toolbar verticale spostata a sinistra del pannello */}
              <div className="absolute right-[360px] top-4 flex flex-col gap-2 rounded-pill bg-surface border border-border shadow-sm p-1.5">
                {["▤", "☕", "◎", "⌂", "✦"].map((g, i) => (
                  <span key={i} className="w-7 h-7 inline-flex items-center justify-center text-ink-soft text-[13px]">
                    {g}
                  </span>
                ))}
              </div>
              {/* pannello in overlay, stesso container card + ombra (floating) */}
              <YumejiPanel
                items={MOCK_YUMES}
                chips={CHIPS}
                pinned
                floating
                onTogglePin={() => {}}
                className="absolute top-3 right-3 bottom-3 w-[340px]"
              />
            </div>
          </div>
        </section>
      </main>

      <SandboxRightPanel>
        <div className="p-4 flex flex-col gap-5">
          <div>
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">
              Sezione A
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin attivo (icona)
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" checked={floating} onChange={(e) => setFloating(e.target.checked)} />
              (riservato)
            </label>
          </div>
          <p className="text-mini text-ink-faint leading-relaxed border-t border-border pt-4">
            Contenitore in stile aside DayList. In <b className="text-ink-soft font-medium">floating</b> ha
            l&apos;ombra; in <b className="text-ink-soft font-medium">pinned</b> è una colonna del layout.
          </p>
        </div>
      </SandboxRightPanel>
    </div>
  );
}
