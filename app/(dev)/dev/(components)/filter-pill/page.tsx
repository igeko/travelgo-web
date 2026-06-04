"use client";

/**
 * Sandbox · FilterPill component demo
 * URL: /dev/filter-pill
 */

import { useState } from "react";
import { FilterPill } from "@/components/ui/FilterPill";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";

type Size = "sm" | "md" | "lg";
type Tone = "neutral" | "danger" | "warning" | "success";

const SIZES: Size[] = ["sm", "md", "lg"];
const TONES: Tone[] = ["neutral", "danger", "warning", "success"];

const STATUS_OPTIONS = [
  { key: "all",      label: "All" },
  { key: "todo",     label: "To do" },
  { key: "booked",   label: "Booked" },
  { key: "paid",     label: "Paid" },
];

export default function FilterPillSandboxPage() {
  const [size, setSize] = useState<Size>("md");
  const [tone, setTone] = useState<Tone>("neutral");
  const [active, setActive] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [status, setStatus] = useState<string>("all");

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ink mb-2">FilterPill</h1>
        <p className="text-ink-soft mb-8 text-sm">
          Filter / toggle pill — usata nelle admin pages per filtri attivabili.
          Allineata al sistema Button: size (sm/md/lg) + tone semantici.
        </p>

        {/* Live preview from controls */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Live preview</h2>
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-wrap gap-2 items-center">
            <FilterPill
              size={size}
              tone={tone}
              active={active}
              disabled={disabled}
              onClick={() => setActive((v) => !v)}
            >
              Filter pill
            </FilterPill>
            <FilterPill
              size={size}
              tone={tone}
              active={!active}
              disabled={disabled}
              onClick={() => setActive((v) => !v)}
            >
              Other state
            </FilterPill>
          </div>
        </section>

        {/* Sizes matrix */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Sizes</h2>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            {SIZES.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-mini text-ink-faint font-mono w-8">{s}</span>
                <FilterPill size={s} active={false}>Inactive</FilterPill>
                <FilterPill size={s} active>Active</FilterPill>
              </div>
            ))}
          </div>
        </section>

        {/* Tones */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Tones</h2>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            {TONES.map((t) => (
              <div key={t} className="flex items-center gap-3 flex-wrap">
                <span className="text-mini text-ink-faint font-mono w-16">{t}</span>
                <FilterPill tone={t} active={false}>Inactive</FilterPill>
                <FilterPill tone={t} active>Active</FilterPill>
              </div>
            ))}
          </div>
        </section>

        {/* Real-world example */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-ink mb-4">Example: status filter</h2>
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.key}
                size="sm"
                active={status === opt.key}
                onClick={() => setStatus(opt.key)}
              >
                {opt.label}
              </FilterPill>
            ))}
          </div>
        </section>
      </main>

      <SandboxRightPanel>
        <ControlsPanel
          groups={[
            {
              title: "Variants",
              controls: [
                {
                  kind: "radio",
                  id: "size",
                  label: "Size",
                  options: SIZES.map((s) => ({ value: s, label: s })),
                  value: size,
                  onChange: (v) => setSize(v as Size),
                },
                {
                  kind: "radio",
                  id: "tone",
                  label: "Tone",
                  options: TONES.map((t) => ({ value: t, label: t })),
                  value: tone,
                  onChange: (v) => setTone(v as Tone),
                },
              ],
            },
            {
              title: "State",
              controls: [
                {
                  kind: "toggle",
                  id: "active",
                  label: "Active",
                  value: active,
                  onChange: setActive,
                },
                {
                  kind: "toggle",
                  id: "disabled",
                  label: "Disabled",
                  value: disabled,
                  onChange: setDisabled,
                },
              ],
            },
          ]}
        />
      </SandboxRightPanel>
    </div>
  );
}
