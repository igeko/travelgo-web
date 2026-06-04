"use client";

import { useState } from "react";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";

type Size = "xs" | "sm" | "md";
type Bg = "light" | "surface" | "dark";

const SIZES: Size[] = ["xs", "sm", "md"];
const BGS: { id: Bg; label: string; cls: string }[] = [
  { id: "light",   label: "Light",   cls: "bg-bg" },
  { id: "surface", label: "Surface", cls: "bg-surface" },
  { id: "dark",    label: "Dark",    cls: "bg-ink" },
];

export default function AiSuggestPage() {
  const [size, setSize] = useState<Size>("md");
  const [bg, setBg] = useState<Bg>("light");

  const bgCls = BGS.find((b) => b.id === bg)?.cls ?? "bg-bg";

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel
          groups={[
            {
              title: "Size",
              controls: [
                {
                  kind: "radio",
                  id: "size",
                  label: "Size",
                  options: SIZES.map((s) => ({ value: s, label: s })),
                  value: size,
                  onChange: (v) => setSize(v as Size),
                },
              ],
            },
            {
              title: "Background",
              controls: [
                {
                  kind: "radio",
                  id: "bg",
                  label: "Background",
                  options: BGS.map((b) => ({ value: b.id, label: b.label })),
                  value: bg,
                  onChange: (v) => setBg(v as Bg),
                },
              ],
            },
          ]}
        />
      </SandboxRightPanel>

      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">
            AI
          </div>
          <h1 className="text-2xl font-semibold text-ink">GoAvatar</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Avatar del personaggio Go — cerchio ink con kanji 五 bianco e halo
            arancione pulsante. Puramente decorativo.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Preview
            </div>
            <div className={`rounded-xl p-12 flex items-center justify-center transition-colors ${bgCls}`}>
              <GoAvatar size={size} />
            </div>
          </section>

          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Tutte le size
            </div>
            <div className="rounded-xl border border-border bg-surface p-8 flex items-center gap-10">
              {SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-3">
                  <GoAvatar size={s} />
                  <span className="text-[11px] text-ink-faint font-mono">{s}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Su sfondo scuro
            </div>
            <div className="rounded-xl bg-ink p-8 flex items-center gap-10">
              {SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-3">
                  <GoAvatar size={s} />
                  <span className="text-[11px] text-white/40 font-mono">{s}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
