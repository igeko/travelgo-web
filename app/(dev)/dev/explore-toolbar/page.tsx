"use client";

/**
 * Sandbox · ExploreToolbar
 * URL: /dev/explore-toolbar
 *
 * Vertical macro rail + inline sub-category chip row. Single/multiple select
 * (toggle off), pinning promotes a sub into the rail. The component is
 * presentation only — every selection / pin is emitted through callbacks and
 * logged here.
 *
 * Categories come from the language-agnostic tree resolved through
 * `useExploreCategories()` (labels from the ExploreCategories i18n namespace).
 */

import { useState } from "react";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { cn } from "@/lib/cn";

type LogEntry = { id: number; text: string };

export default function ExploreToolbarSandboxPage() {
  const categories = useExploreCategories();
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [pinnedSubIds, setPinnedSubIds] = useState<string[]>(["caffe"]);
  const [selectionMode, setSelectionMode] = useState<"single" | "multiple">("multiple");
  const [showSettings, setShowSettings] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);

  function pushLog(text: string) {
    setLog((prev) => [{ id: Date.now() + Math.random(), text }, ...prev].slice(0, 12));
  }

  function handleSelectionChange(next: string[]) {
    setSelectedSubIds(next);
    pushLog(`onSelectionChange([${next.join(", ")}])`);
  }

  function handleTogglePin(subId: string) {
    setPinnedSubIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId],
    );
    pushLog(`onTogglePin("${subId}")`);
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">ExploreToolbar</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Rail verticale di macro-categorie. Click su una macro → riga di chip
          con le sotto-categorie (sempre in alto, a sinistra del rail).
          Selezione multipla o singola (prop <code>selectionMode</code>), con
          toggle-off. L&apos;icona pin su ogni chip promuove la sotto-categoria
          nel rail. Il componente non esegue side-effect: emette tutto via
          callback.
        </p>

        {/* Stage — desktop, vertical rail anchored top-right */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-ink">Desktop · vertical</h2>
          <p className="mb-3 text-tiny text-ink-soft">
            Rail verticale ancorato in alto a destra; chip row a sinistra.
          </p>
          <div className="relative h-[460px] w-full overflow-hidden rounded-lg border border-border bg-surface-soft">
            <FauxMap />
            <span className="absolute left-4 top-4 rounded-pill bg-surface px-3 py-1 text-tiny text-ink-soft">
              area mappa (placeholder)
            </span>

            <ExploreToolbar
              className="absolute right-4 top-4 z-10"
              categories={categories}
              selectedSubIds={selectedSubIds}
              onSelectionChange={handleSelectionChange}
              selectionMode={selectionMode}
              showSettings={showSettings}
              pinnedSubIds={pinnedSubIds}
              onTogglePin={handleTogglePin}
              onSettingsClick={() => pushLog("onSettingsClick()")}
            />
          </div>
        </section>

        {/* Stage — mobile, horizontal bar on top + sub row below */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-ink">Mobile · horizontal</h2>
          <p className="mb-3 text-tiny text-ink-soft">
            Barra macro orizzontale in cima, riga sotto-categorie impilata sotto.
            Stesso stato della vista desktop.
          </p>
          <div
            className="relative mx-auto h-[560px] w-full max-w-[300px] overflow-hidden rounded-[28px] border-[6px] border-ink bg-surface-soft"
          >
            <FauxMap />
            <ExploreToolbar
              orientation="horizontal"
              className="absolute inset-x-2 top-2 z-10"
              categories={categories}
              selectedSubIds={selectedSubIds}
              onSelectionChange={handleSelectionChange}
              selectionMode={selectionMode}
              showSettings={showSettings}
              pinnedSubIds={pinnedSubIds}
              onTogglePin={handleTogglePin}
              onSettingsClick={() => pushLog("onSettingsClick()")}
            />
          </div>
        </section>
      </main>

      <SandboxRightPanel>
        <div className="flex flex-col gap-6 p-5">
          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              selectionMode
            </h3>
            <div className="inline-flex gap-1 rounded-pill bg-surface-soft p-1">
              {(["multiple", "single"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectionMode(mode)}
                  className={cn(
                    "rounded-pill px-3 py-1 text-mini transition-colors",
                    selectionMode === mode
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:text-ink",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              showSettings
            </h3>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-pressed={showSettings}
              className={cn(
                "rounded-pill px-3 py-1 text-mini transition-colors",
                showSettings ? "bg-ink text-white" : "bg-surface-soft text-ink-soft hover:text-ink",
              )}
            >
              {showSettings ? "true" : "false"}
            </button>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              State
            </h3>
            <dl className="space-y-1.5 text-mini">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">selectedSubIds</dt>
                <dd className="text-right font-mono text-ink">
                  [{selectedSubIds.join(", ")}]
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">pinnedSubIds</dt>
                <dd className="text-right font-mono text-ink">
                  [{pinnedSubIds.join(", ")}]
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Event log
            </h3>
            {log.length === 0 ? (
              <p className="text-tiny italic text-ink-faint">
                Interagisci con la toolbar…
              </p>
            ) : (
              <ul className="space-y-1">
                {log.map((entry, i) => (
                  <li
                    key={entry.id}
                    className={cn(
                      "rounded-sm bg-surface-soft px-2 py-1 font-mono text-tiny",
                      i === 0 ? "text-ink" : "text-ink-soft",
                    )}
                  >
                    {entry.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SandboxRightPanel>
    </div>
  );
}

function FauxMap() {
  return (
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
      aria-hidden
    />
  );
}
