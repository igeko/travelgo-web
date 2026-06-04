"use client";

/**
 * Sandbox · Explore FuzzyStop (interactive)
 * URL: /dev/explore-fuzzy
 */

import { useState } from "react";
import { FuzzyStop, type FuzzyStopState } from "@/features/explore/FuzzyStop";
import { IconCoffee } from "@/components/ui/icons";
import { StatePicker } from "../_components/StatePicker";

const STATES: FuzzyStopState[] = ["default", "hover", "selected", "open"];

const DESCRIPTION =
  "Lorem ipsum is a placeholder text commonly used in design and publishing to demonstrate visual layouts without distracting the reader with meaningful content. It is derived from a corrupted 1st-century BC Latin text by Cicero, heavily altered to become nonsensical.";

export default function ExploreFuzzySandboxPage() {
  const [forced, setForced] = useState<FuzzyStopState>("default");
  const [hovering, setHovering] = useState(false);

  const state: FuzzyStopState = forced === "default" && hovering ? "hover" : forced;

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">FuzzyStop</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Figma <strong>Fuzzy</strong> · sosta a orario fuzzy. Hover col mouse, click per aprire,
          ✕ per chiudere, o forza uno stato qui sotto.
        </p>

        <div className="mb-6">
          <StatePicker label="state" value={forced} options={STATES} onChange={setForced} />
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div
            className="max-w-[300px]"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <FuzzyStop
              title="Caffè Specialty"
              icon={IconCoffee}
              state={state}
              duration="30 minutes"
              timeRange="10:30 → 11:00"
              description={DESCRIPTION}
              address=""
              arrival={{ time: "10:30", date: "Thu, 04 Aug" }}
              departure={{ time: "11:00", date: "Thu, 04 Aug" }}
              onOpen={() => setForced("open")}
              onClose={() => setForced("default")}
              onRemove={() => setForced("default")}
            />
          </div>
        </section>

        <p className="mt-4 text-mini text-ink-faint">
          Stato attivo: <span className="font-medium text-ink-soft">{state}</span>
        </p>
      </main>
    </div>
  );
}
