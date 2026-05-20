"use client";

/**
 * Sandbox · TabSwitcher component demo
 * URL: /dev/tabs
 *
 * Static demo of the TabSwitcher component with interactive examples.
 */

import { useState } from "react";
import { TabSwitcher } from "@/components/ui/TabSwitcher";

const DEMO_TABS = [
  { key: "lista", label: "Lista" },
  { key: "timeline", label: "Timeline" },
  { key: "racconto", label: "Racconto" },
];

const COLORS_TABS = [
  { key: "color1", label: "Rosso" },
  { key: "color2", label: "Blu" },
  { key: "color3", label: "Verde" },
];

export default function TabSwitcherDemo() {
  const [activeView, setActiveView] = useState("timeline");
  const [activeColor, setActiveColor] = useState("color1");

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ink mb-2">TabSwitcher</h1>
        <p className="text-ink-soft mb-8">
          Allineato al sistema Button: size (sm/md/lg), variant, tone
        </p>

        {/* Example 1: Sizes */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Esempio 1: Sizes</h2>
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-3">
                Size: sm
              </label>
              <TabSwitcher
                value={activeView}
                onChange={setActiveView}
                tabs={DEMO_TABS}
                size="sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-3">
                Size: md (default)
              </label>
              <TabSwitcher
                value={activeView}
                onChange={setActiveView}
                tabs={DEMO_TABS}
                size="md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-3">
                Size: lg
              </label>
              <TabSwitcher
                value={activeView}
                onChange={setActiveView}
                tabs={DEMO_TABS}
                size="lg"
              />
            </div>
          </div>
        </section>

        {/* Example 2: Basic view toggle */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Esempio 2: View Toggle (md)</h2>
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-ink-soft">Seleziona vista:</span>
              <TabSwitcher
                value={activeView}
                onChange={setActiveView}
                tabs={DEMO_TABS}
                size="md"
              />
            </div>

            {/* Content preview */}
            <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-sm text-ink-faint italic">
                Vista attiva: <span className="font-mono font-semibold text-ink">{activeView}</span>
              </p>
              <p className="text-xs text-ink-soft mt-2">
                {activeView === "lista" &&
                  "Mostra il giorno come lista piatta di attività"}
                {activeView === "timeline" &&
                  "Mostra il giorno come timeline oraria con spine"}
                {activeView === "racconto" &&
                  "Mostra il giorno come racconto narrativo"}
              </p>
            </div>
          </div>
        </section>

        {/* Example 3: Color selection */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Esempio 3: Scelta colore (md)</h2>
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-ink-soft">Seleziona colore:</span>
              <TabSwitcher
                value={activeColor}
                onChange={setActiveColor}
                tabs={COLORS_TABS}
                size="md"
              />
            </div>

            {/* Color preview */}
            <div
              className="w-full h-24 rounded-lg border-2 border-zinc-200 transition-all duration-200"
              style={{
                backgroundColor:
                  activeColor === "color1"
                    ? "#ff6b6b"
                    : activeColor === "color2"
                      ? "#4c6ef5"
                      : "#40c057",
              }}
            />
            <p className="text-xs text-ink-soft mt-3 text-center">
              {activeColor === "color1" && "Colore: Rosso (#ff6b6b)"}
              {activeColor === "color2" && "Colore: Blu (#4c6ef5)"}
              {activeColor === "color3" && "Colore: Verde (#40c057)"}
            </p>
          </div>
        </section>

        {/* Props documentation */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">Props (allineati al Button)</h2>
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6">
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-mono text-ink font-semibold">value</span>
                <span className="text-ink-soft ml-2">— chiave della tab attiva</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">onChange</span>
                <span className="text-ink-soft ml-2">— callback quando cambia la selezione</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">tabs</span>
                <span className="text-ink-soft ml-2">— array di {"{key, label}"}</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">size</span>
                <span className="text-ink-soft ml-2">— sm | md (default) | lg</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">variant</span>
                <span className="text-ink-soft ml-2">— outline (default) | solid | ghost</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">tone</span>
                <span className="text-ink-soft ml-2">— neutral (default) | danger | warning | success</span>
              </div>
              <div>
                <span className="font-mono text-ink font-semibold">className</span>
                <span className="text-ink-soft ml-2">— classe CSS opzionale</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
