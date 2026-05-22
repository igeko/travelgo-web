"use client";

/**
 * Sandbox · YumejiDrawer
 * URL: /dev/yumeji-drawer
 *
 * Drawer "I tuoi Yume" (design v2). Il toggle nell'estrema destra di Row 2 si
 * trasforma nell'header navy del pannello quando si apre; tre stati
 * closed / floating / pinned. Il frame qui sotto (Row 1 + Row 2 + main)
 * riproduce il contesto-trip: in produzione vivrà nell'AppHeader reale.
 *
 * I dati sono mock (features/yumeji/mockData.ts) — il data layer è "parte dati".
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { YumejiDrawer, YumejiToggle, type YumejiDrawerState } from "@/features/yumeji/YumejiDrawer";
import {
  MOCK_YUME_TOKYO,
  MOCK_YUME_ALL,
  type YumeItem,
  type YumeChip,
} from "@/features/yumeji/mockData";
import { SandboxRightPanel } from "../_components/SandboxShell";

type Dataset = "tokyo" | "all" | "empty";

const DATASETS: Record<Dataset, { items: YumeItem[]; chips: YumeChip[] }> = {
  tokyo: {
    items: MOCK_YUME_TOKYO,
    chips: [
      { id: "geo", label: "Per Tokyo", count: 5, active: true },
      { id: "unscheduled", label: "Da schedulare", count: 5, active: true },
    ],
  },
  all: {
    items: MOCK_YUME_ALL,
    chips: [
      { id: "all", label: "Tutti", count: 10, active: true },
      { id: "unscheduled", label: "Da schedulare", count: 8 },
      { id: "explore", label: "Esplora", count: 7 },
      { id: "eat", label: "Mangia", count: 3 },
    ],
  },
  empty: { items: [], chips: [] },
};

export default function YumejiDrawerSandboxPage() {
  const [state, setState] = useState<YumejiDrawerState>("floating");
  const [dataset, setDataset] = useState<Dataset>("tokyo");

  const open = state !== "closed";
  const pinned = state === "pinned";
  const { items, chips } = DATASETS[dataset];

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">YumejiDrawer</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Pannello «I tuoi Yume». Il toggle a destra di Row 2 si{" "}
          <b className="text-ink font-medium">trasforma</b> nell&apos;header navy del drawer
          all&apos;apertura. Tre stati: <code>closed</code>, <code>floating</code> (overlay con
          ombra), <code>pinned</code> (nel flow, il main si restringe · 📌). Esc o click
          sull&apos;header navy chiudono. Dati di prova — il data layer è la prossima fase.
        </p>

        {/* ── Frame demo · Row 1 + (Row 2 + main) | drawer ── */}
        <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
          {/* Row 1 */}
          <div className="flex items-center gap-6 px-5 h-[52px] border-b border-border">
            <span className="flex items-center gap-2.5 shrink-0">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[17px] leading-none"
                style={{
                  background: "var(--color-ink)",
                  fontFamily:
                    '"Hiragino Sans","Yu Gothic","Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif',
                  fontWeight: 500,
                }}
                aria-hidden
              >
                五
              </span>
              <span
                className="text-tiny text-ink-faint leading-tight"
                style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
              >
                Travel<b className="text-ink font-medium">Go</b>
              </span>
            </span>
            <nav className="flex items-center gap-[22px] text-meta text-ink-soft">
              <span className="text-ink font-medium border-b-2 border-orange pb-0.5">My trips</span>
              <span>Explore</span>
              <span>Yumeji</span>
            </nav>
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-pill border border-border-strong text-tiny text-ink-soft">
                IT
              </span>
              <span className="w-[30px] h-[30px] rounded-full bg-surface-soft border border-border" />
            </div>
          </div>

          {/* Cols · positioned container che ospita il drawer assoluto */}
          <div className="relative flex items-stretch bg-bg min-h-[500px]">
            <div
              className={cn(
                "flex-1 min-w-0 flex flex-col transition-[padding] duration-300",
                pinned ? "pr-[340px]" : "pr-0",
              )}
              style={{ transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)" }}
            >
              {/* Row 2 */}
              <div className="flex items-center h-[42px] pl-5 gap-3.5 bg-bg border-b border-border">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-micro font-medium tracking-eyebrow uppercase text-orange truncate">
                    Tokyo 2026
                  </span>
                  <span className="text-ink-faint text-mini">·</span>
                  <span className="text-mini text-ink-soft whitespace-nowrap">Day 2 of 5</span>
                </div>
                <nav className="flex items-center gap-1 ml-auto">
                  {["Trip", "Day-by-day", "Explore", "Notes"].map((tab) => (
                    <span
                      key={tab}
                      className={cn(
                        "px-3 py-[5px] rounded-pill text-mini",
                        tab === "Day-by-day" ? "bg-ink text-white font-medium" : "text-ink-soft",
                      )}
                    >
                      {tab}
                    </span>
                  ))}
                </nav>
                <span aria-hidden className="w-px h-[22px] bg-border" />
                <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-tiny border border-border-strong text-ink-soft whitespace-nowrap">
                  <span className="w-[7px] h-[7px] rounded-full bg-ink-faint" />
                  View mode
                </span>
                {/* Toggle Yume · ultimo chip a destra; nascosto quando il pannello è aperto */}
                <YumejiToggle
                  active={open}
                  onClick={() => setState(open ? "closed" : "floating")}
                  className={cn("mr-2", open && "invisible pointer-events-none")}
                />
              </div>

              {/* Main · contenuto fittizio + scrim quando floating */}
              <div className="relative flex-1 p-5 bg-bg">
                <div className="text-micro uppercase tracking-eyebrow text-ink-faint font-medium">
                  Day 2 · Asakusa
                </div>
                <h2 className="text-[15px] font-medium text-ink mt-1.5 leading-snug max-w-[340px]">
                  Iniziate dall&apos;alba al mercato del pesce — il resto del giorno è bonus.
                </h2>
                <p className="text-mini text-ink-soft mt-1.5 leading-relaxed max-w-[340px]">
                  Una giornata che si apre con sushi all&apos;alba e si chiude in cima alla
                  Skytree. La luce delle prime ore al Tsukiji è l&apos;unica cosa che non potete
                  davvero pianificare.
                </p>
                <div className="mt-4 flex flex-col gap-1.5 max-w-[340px]">
                  {[
                    "08:00 · Mercato Tsukiji",
                    "10:30 · slot libero",
                    "12:30 · Pranzo a Tsukiji",
                    "14:30 · Sumida Park",
                  ].map((s) => (
                    <div
                      key={s}
                      className="bg-surface border border-border rounded-md px-3 py-2 text-mini text-ink"
                    >
                      {s}
                    </div>
                  ))}
                </div>

                {/* Scrim · solo in floating, click-to-close */}
                <button
                  type="button"
                  aria-label="Chiudi pannello Yumeji"
                  onClick={() => setState("closed")}
                  className={cn(
                    "absolute inset-0 border-0 cursor-pointer transition-opacity duration-200",
                    state === "floating" ? "opacity-100" : "opacity-0 pointer-events-none",
                  )}
                  style={{ background: "rgba(13,44,61,0.04)" }}
                  tabIndex={state === "floating" ? 0 : -1}
                />
              </div>
            </div>

            {/* Drawer · assoluto, top-right del container cols */}
            <YumejiDrawer state={state} onStateChange={setState} items={items} chips={chips} />
          </div>
        </div>

        <p className="mt-4 text-mini text-ink-faint leading-relaxed max-w-2xl">
          <b className="text-ink-soft font-medium">Da fare (parte dati)</b> · tabella{" "}
          <code>yumeji_items</code> + RLS, DAL <code>lib/dal/yumeji.ts</code>, hook{" "}
          <code>useYumeji</code>/<code>useYumejiForTrip</code>, filtraggio reale dei chip,
          immagini al posto dei gradienti, drag&amp;drop verso Timeline, microcopy i18n. Spec:
          <code>docs/design/yumeji.md</code>.
        </p>
      </main>

      <SandboxRightPanel>
        <div className="p-4 flex flex-col gap-5">
          <ControlGroup label="Stato">
            <Segmented
              value={state}
              onChange={setState}
              options={[
                { value: "closed", label: "Closed" },
                { value: "floating", label: "Floating" },
                { value: "pinned", label: "Pinned" },
              ]}
            />
          </ControlGroup>

          <ControlGroup label="Dataset">
            <Segmented
              value={dataset}
              onChange={(d) => {
                setDataset(d);
                if (!open) setState("floating");
              }}
              options={[
                { value: "tokyo", label: "Tokyo (trip)" },
                { value: "all", label: "Tutti (global)" },
                { value: "empty", label: "Vuoto" },
              ]}
            />
          </ControlGroup>

          <div className="text-mini text-ink-faint leading-relaxed border-t border-border pt-4">
            <p className="mb-1">
              <b className="text-ink-soft font-medium">closed</b> · solo lo strip-toggle in Row 2.
            </p>
            <p className="mb-1">
              <b className="text-ink-soft font-medium">floating</b> · overlay con ombra, scrim sul
              main, Esc/click-fuori per chiudere.
            </p>
            <p>
              <b className="text-ink-soft font-medium">pinned</b> · 📌 nell&apos;header navy, il main
              si restringe (padding-right 340px).
            </p>
          </div>
        </div>
      </SandboxRightPanel>
    </div>
  );
}

/* ── Controlli sandbox ─────────────────────────────────────────────── */

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "text-left rounded-md px-3 py-1.5 text-sm border transition-colors cursor-pointer",
            value === o.value
              ? "bg-ink border-ink text-white font-medium"
              : "bg-surface border-border text-ink-soft hover:border-border-strong hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
