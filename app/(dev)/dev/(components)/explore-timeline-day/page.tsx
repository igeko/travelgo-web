"use client";

/**
 * Sandbox · Explore TimelineDay (interactive)
 * URL: /dev/explore-timeline-day
 */

import { useState } from "react";
import { TimelineDay, type TimelineDayState } from "@/features/explore/TimelineDay";
import { StatePicker } from "../_components/StatePicker";

const STATES: TimelineDayState[] = ["default", "hover", "selected", "first"];

export default function ExploreTimelineDaySandboxPage() {
  const [forced, setForced] = useState<TimelineDayState>("default");
  const [hovering, setHovering] = useState(false);

  // Real hover only overrides the resting "default" state.
  const state: TimelineDayState = forced === "default" && hovering ? "hover" : forced;

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">TimelineDay</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Figma <strong>Timeline-Day</strong> · spina verticale del giorno. Passa il mouse
          sulla spina o forza uno stato qui sotto.
        </p>

        <div className="mb-6">
          <StatePicker label="state" value={forced} options={STATES} onChange={setForced} />
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div
            className="h-[200px] w-fit"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <TimelineDay weekday="WED" date="5 Ago" state={state} times={["11:00", "13:00"]} />
          </div>
        </section>

        {/* Static reference — all states side by side */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-ink">All states</h2>
          <div className="flex gap-10 rounded-lg border border-border bg-surface p-6">
            {STATES.map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <span className="text-micro uppercase tracking-eyebrow text-ink-faint">{s}</span>
                <div className="h-[200px]">
                  <TimelineDay weekday="WED" date="5 Ago" state={s} times={["11:00", "13:00"]} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-4 text-mini text-ink-faint">
          Stato attivo: <span className="font-medium text-ink-soft">{state}</span>
        </p>
      </main>
    </div>
  );
}
