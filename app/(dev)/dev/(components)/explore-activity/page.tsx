"use client";

/**
 * Sandbox · Explore ActivityStop (interactive)
 * URL: /dev/explore-activity
 */

import { useState } from "react";
import { ActivityStop, type ActivityStopState, type LodgingMode } from "@/features/explore/ActivityStop";
import { IconCar } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { StatePicker } from "../_components/StatePicker";

const STATES: ActivityStopState[] = ["default", "hover", "selected", "open"];

const DESCRIPTION =
  "Lorem ipsum is a placeholder text commonly used in design and publishing to demonstrate visual layouts without distracting the reader with meaningful content. It is derived from a corrupted 1st-century BC Latin text by Cicero, heavily altered to become nonsensical.";

export default function ExploreActivitySandboxPage() {
  const [forced, setForced] = useState<ActivityStopState>("default");
  const [hovering, setHovering] = useState(false);
  const [mode, setMode] = useState<LodgingMode>("sleep");
  const [nights, setNights] = useState(3);
  const [nightIndex, setNightIndex] = useState(0);

  // Real hover only matters while collapsed in the resting state.
  const state: ActivityStopState = forced === "default" && hovering ? "hover" : forced;

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">ActivityStop</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Figma <strong>Activity</strong> · sosta tipo alloggio. Passa il mouse per l’hover,
          clicca la riga per aprire la card, la ✕ per richiuderla, oppure forza uno stato qui sotto.
        </p>

        <div className="mb-6">
          <StatePicker label="state" value={forced} options={STATES} onChange={setForced} />
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div
            className="max-w-[320px]"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <ActivityStop
              title="Ritiro Camper"
              icon={IconCar}
              state={state}
              mode={mode}
              onModeChange={setMode}
              nights={nights}
              nightIndex={nightIndex}
              onNightsChange={(next) => {
                setNights(next);
                if (next > 0 && nightIndex > next - 1) setNightIndex(next - 1);
              }}
              dateRange="Thu 04 → Sat 06"
              description={DESCRIPTION}
              arrival={{ time: "22:00", date: "Thu, 04 Aug" }}
              departure={{ time: "09:00", date: "Wed, 05 Aug" }}
              onOpen={() => setForced("open")}
              onClose={() => setForced("default")}
              onRemove={() => setForced("default")}
            />
          </div>

          {/* Sandbox-only: pick which night within the stay is being shown. */}
          {nights > 1 ? (
            <div className="mt-4 flex items-center gap-2 text-mini text-ink-soft">
              <span>nightIndex:</span>
              {Array.from({ length: nights }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNightIndex(i)}
                  className={cn(
                    "rounded-pill border px-2 py-0.5 text-tiny",
                    nightIndex === i
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-transparent text-ink-soft",
                  )}
                >
                  N{i + 1}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <p className="mt-4 text-mini text-ink-faint">
          Stato attivo: <span className="font-medium text-ink-soft">{state}</span> · modo{" "}
          <span className="font-medium text-ink-soft">{mode}</span> · notte{" "}
          <span className="font-medium text-ink-soft">{nightIndex + 1}</span> di {nights}
        </p>
      </main>
    </div>
  );
}
