"use client";

/**
 * Sandbox · IconPicker
 * URL: /dev/icon-picker
 *
 * Demo del IconPicker in entrambe le modalità: activity (esclude sleep)
 * e lodging (solo sleep). Selezione live mostrata nel pannello destro.
 */

import { useState } from "react";
import { IconPicker, type IconPickerMode } from "@/features/activity/IconPicker";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { cn } from "@/lib/cn";

export default function IconPickerSandboxPage() {
  const [mode, setMode] = useState<IconPickerMode>("activity");
  const [activityIcon, setActivityIcon] = useState<string | null>("coffee");
  const [lodgingIcon, setLodgingIcon] = useState<string | null>("bed");

  const value = mode === "activity" ? activityIcon : lodgingIcon;
  const setValue = mode === "activity" ? setActivityIcon : setLodgingIcon;
  const ActiveIcon = getStopIcon(value);

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">IconPicker</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Popover di scelta icona per activity / pernottamenti. Su{" "}
          <code className="rounded bg-surface-soft px-1">activity</code> la
          categoria <code className="rounded bg-surface-soft px-1">sleep</code>{" "}
          è esclusa; su <code className="rounded bg-surface-soft px-1">lodging</code>{" "}
          è l&apos;unica disponibile.
        </p>

        <div className="flex flex-col items-start gap-8">
          {/* Preview dell'icona corrente in formato badge */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-md",
                mode === "lodging" ? "bg-primary text-white" : "bg-ink text-white",
              )}
            >
              {ActiveIcon ? <ActiveIcon size={20} /> : null}
            </div>
            <div className="text-mini text-ink-soft">
              Icona corrente:{" "}
              <code className="rounded bg-surface-soft px-1 text-ink">
                {value ?? "—"}
              </code>
            </div>
          </div>

          {/* Picker */}
          <IconPicker mode={mode} value={value} onChange={setValue} />
        </div>
      </main>

      <SandboxRightPanel>
        <div className="flex flex-col gap-6 p-5">
          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Mode
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
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              State
            </h3>
            <pre className="whitespace-pre-wrap rounded-lg bg-surface-soft p-3 font-mono text-tiny text-ink">
              {JSON.stringify({ mode, activityIcon, lodgingIcon }, null, 2)}
            </pre>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Props
            </h3>
            <ul className="flex flex-col gap-2 text-mini text-ink-soft">
              <li>
                <code className="text-ink">mode</code> ·{" "}
                <code>&quot;activity&quot; | &quot;lodging&quot;</code>
              </li>
              <li>
                <code className="text-ink">value</code> ·{" "}
                <code>string | null</code>
              </li>
              <li>
                <code className="text-ink">onChange</code> ·{" "}
                <code>(key: string) =&gt; void</code>
              </li>
            </ul>
          </section>
        </div>
      </SandboxRightPanel>
    </div>
  );
}
