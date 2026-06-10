"use client";

/**
 * Sandbox · IconPicker
 * URL: /dev/icon-picker
 *
 * Demo del `CategoryIconPicker`: il picker delle icone delle activity
 * (e dei pernottamenti) derivato da EXPLORE_CATEGORY_TREE, stessa
 * fonte della ExploreToolbar.
 *
 * Header mock + popover ancorato sotto al badge per replicare la
 * disposizione vera nel pannello dettaglio. Il sub.id selezionato è
 * mostrato nel right panel.
 */

import { useState } from "react";
import { CategoryIconPicker } from "@/features/activity/IconPicker";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { cn } from "@/lib/cn";

type Mode = "activity" | "lodging";

export default function IconPickerSandboxPage() {
  const [mode, setMode] = useState<Mode>("activity");
  const [selectedId, setSelectedId] = useState<string>("mercati");
  const ActiveIcon = getStopIcon(selectedId);

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">IconPicker</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Popover sul badge icona del pannello dettaglio. Dominio unico:{" "}
          <code className="rounded bg-surface-soft px-1">EXPLORE_CATEGORY_TREE</code>{" "}
          via <code className="rounded bg-surface-soft px-1">useExploreCategories()</code>{" "}
          — la stessa fonte della ExploreToolbar. Vale per activity{" "}
          <em>e</em> pernottamenti: il dominio non cambia con il contesto.
        </p>

        <div className="flex flex-col items-start gap-8">
          {/* Preview "header del dettaglio" con badge icona corrente */}
          <div className="rounded-md bg-ink p-1">
            <div className="flex items-center gap-2 px-1 py-0.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-sm bg-primary text-white",
                )}
              >
                {ActiveIcon ? <ActiveIcon size={15} /> : null}
              </span>
              <span className="truncate text-[14px] text-white">
                {mode === "activity" ? "Mercato Tsukiji" : "Hotel Tavinos Asakusa"}
              </span>
            </div>
          </div>

          {/* Picker — sempre aperto nello sketch sandbox */}
          <CategoryIconPicker selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </main>

      <SandboxRightPanel>
        <div className="flex flex-col gap-6 p-5">
          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Mode (preview only)
            </h3>
            <div className="inline-flex gap-1 rounded-pill bg-surface-soft p-1">
              {(["activity", "lodging"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-pill px-3 py-1 text-mini transition-colors",
                    mode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-2 text-tiny leading-relaxed text-ink-faint">
              Cambia solo il titolo del mock header. Il picker è lo stesso
              perché il dominio è lo stesso.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              State
            </h3>
            <pre className="whitespace-pre-wrap rounded-lg bg-surface-soft p-3 font-mono text-tiny text-ink">
              {JSON.stringify({ selectedId }, null, 2)}
            </pre>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Props (CategoryIconPicker)
            </h3>
            <ul className="flex flex-col gap-2 text-mini text-ink-soft">
              <li>
                <code className="text-ink">selectedId</code> ·{" "}
                <code>string | null | undefined</code>
              </li>
              <li>
                <code className="text-ink">onSelect</code> ·{" "}
                <code>(id: string) =&gt; void</code>
              </li>
              <li>
                <code className="text-ink">className</code> ·{" "}
                <code>string</code> (passato al popover wrapper)
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Persistenza
            </h3>
            <p className="text-mini leading-relaxed text-ink-soft">
              Il valore è persistito su{" "}
              <code className="rounded bg-surface-soft px-1">activities.icon</code>{" "}
              come <code>sub.id</code> di{" "}
              <code className="rounded bg-surface-soft px-1">EXPLORE_CATEGORY_TREE</code>{" "}
              (es. <code>caffe</code>, <code>musei</code>, <code>hotel</code>).
              L&apos;icona della card si risolve via{" "}
              <code className="rounded bg-surface-soft px-1">getStopIcon()</code>{" "}
              che ora passa anche per le sub IDs Explore.
            </p>
          </section>
        </div>
      </SandboxRightPanel>
    </div>
  );
}
