"use client";

import { useState } from "react";
import { DatePickerField, type DateDisplayFormat, type DateRange } from "@/components/ui/DatePickerField";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";

export default function DatePickerPage() {
  const [mode, setMode] = useState<"single" | "range">("single");
  const [displayFormat, setDisplayFormat] = useState<DateDisplayFormat>("short");
  const [label, setLabel] = useState("Date");
  const [placeholder, setPlaceholder] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [singleValue, setSingleValue] = useState<Date | null>(null);
  const [rangeValue, setRangeValue] = useState<DateRange>({ start: null, end: null });

  const isoDate = (d: Date | null) => d
    ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    : null;

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel
          groups={[
            {
              title: "Mode",
              controls: [
                {
                  kind: "radio",
                  id: "mode",
                  label: "Mode",
                  options: [
                    { value: "single", label: "single" },
                    { value: "range",  label: "range" },
                  ],
                  value: mode,
                  onChange: (v) => setMode(v as "single" | "range"),
                },
              ],
            },
            {
              title: "Props",
              controls: [
                {
                  kind: "text",
                  id: "label",
                  label: "Label",
                  value: label,
                  placeholder: "e.g. Date",
                  onChange: setLabel,
                },
                {
                  kind: "text",
                  id: "placeholder",
                  label: "Placeholder",
                  value: placeholder,
                  placeholder: "auto from locale",
                  onChange: setPlaceholder,
                },
                {
                  kind: "radio",
                  id: "displayFormat",
                  label: "Display format",
                  options: [
                    { value: "short", label: "15 May 2026" },
                    { value: "long",  label: "May 15, 2026" },
                    { value: "iso",   label: "2026-05-15" },
                  ],
                  value: displayFormat,
                  onChange: (v) => setDisplayFormat(v as DateDisplayFormat),
                },
              ],
            },
            {
              title: "State",
              controls: [
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

      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">Fields</div>
          <h1 className="text-2xl font-semibold text-ink">DatePickerField</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Campo data custom con calendario a dropdown. Supporta selezione singola e intervallo (range)
            con shortcut chips. Design ispirato al range picker del mockup create trip.
          </p>
        </div>

        <div className="flex flex-col gap-10 max-w-lg">

          {/* Preview */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Preview · mode={mode}
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
              {mode === "single" ? (
                <DatePickerField
                  mode="single"
                  value={singleValue}
                  onChange={setSingleValue}
                  displayFormat={displayFormat}
                  label={label || undefined}
                  placeholder={placeholder || undefined}
                  disabled={disabled}
                />
              ) : (
                <DatePickerField
                  mode="range"
                  value={rangeValue}
                  onChange={setRangeValue}
                  displayFormat={displayFormat}
                  label={label || undefined}
                  placeholder={placeholder || undefined}
                  disabled={disabled}
                />
              )}

              {/* Value inspector */}
              <div className="text-[11px] font-mono text-ink-faint bg-surface-soft rounded-lg px-3 py-2 whitespace-pre-wrap">
                {mode === "single"
                  ? JSON.stringify({ iso: isoDate(singleValue) }, null, 2)
                  : JSON.stringify({
                      start: isoDate(rangeValue.start),
                      end:   isoDate(rangeValue.end),
                      nights: rangeValue.start && rangeValue.end
                        ? Math.round((rangeValue.end.getTime()-rangeValue.start.getTime())/86_400_000)
                        : null,
                    }, null, 2)}
              </div>
            </div>
          </section>

          {/* Comportamento */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">Comportamento</div>
            <div className="flex flex-col gap-3 text-sm text-ink-soft">
              <div className="flex gap-2.5">
                <span className="shrink-0 font-mono text-[11px] bg-surface-soft text-ink px-2 py-0.5 rounded">single</span>
                <span>Input editabile — scrivi direttamente o clicca nel calendario. Blur/Enter conferma, Escape annulla.</span>
              </div>
              <div className="flex gap-2.5">
                <span className="shrink-0 font-mono text-[11px] bg-surface-soft text-ink px-2 py-0.5 rounded">range</span>
                <span>Due click: primo = start, secondo = end. Hover preview durante la selezione. Shortcuts: This weekend, 1 week, 2 weeks.</span>
              </div>
              <div className="flex gap-2.5">
                <span className="shrink-0 font-mono text-[11px] bg-surface-soft text-ink px-2 py-0.5 rounded">month label</span>
                <span>Click sul mese/anno apre il picker a griglia 4×3 per navigare rapidamente.</span>
              </div>
            </div>
          </section>

          {/* Developer */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">Developer</div>
            <div className="flex flex-col gap-6">

              <div>
                <div className="text-[11px] font-medium text-ink-soft mb-2">Props</div>
                <div className="rounded-lg border border-border overflow-hidden text-[12px]">
                  {[
                    { prop: "mode",          type: '"single" | "range"',                      required: false, description: 'Default: "single"' },
                    { prop: "value",         type: "Date | null  /  DateRange",                required: true,  description: "Controlled value. DateRange = { start, end }" },
                    { prop: "onChange",      type: "(v: Date|null) => void  /  (v: DateRange) => void", required: true, description: "Called on selection or clear" },
                    { prop: "displayFormat", type: '"short" | "long" | "iso"',                 required: false, description: '"short" = 15 May 2026  ·  "long" = May 15, 2026  ·  "iso" = 2026-05-15' },
                    { prop: "label",         type: "string",                                   required: false, description: "Floating label shown on focus" },
                    { prop: "placeholder",   type: "string",                                   required: false, description: "Auto-detected from browser locale if omitted" },
                    { prop: "disabled",      type: "boolean",                                  required: false, description: "Disables the field" },
                    { prop: "fromDate",      type: "Date",                                     required: false, description: "Earliest selectable date" },
                    { prop: "toDate",        type: "Date",                                     required: false, description: "Latest selectable date" },
                    { prop: "autoFocus",     type: "boolean",                                  required: false, description: "Focuses the field on mount" },
                    { prop: "className",     type: "string",                                   required: false, description: "Extra classes on the outer wrapper" },
                  ].map((row, i) => (
                    <div key={row.prop} className={`grid grid-cols-[auto_1fr] gap-x-4 px-3 py-2 ${i%2===0?"bg-surface":"bg-surface-soft"}`}>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-ink font-medium whitespace-nowrap">{row.prop}</span>
                        {row.required && <span className="mt-px text-[9px] font-medium uppercase tracking-wide text-orange bg-orange/10 px-1 rounded shrink-0">req</span>}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-ink-soft truncate">{row.type}</span>
                        <span className="text-ink-faint">{row.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-ink-soft mb-2">Usage</div>
                <pre className="rounded-lg bg-surface-soft border border-border px-4 py-3 text-[11px] font-mono text-ink-soft overflow-x-auto leading-relaxed">{`import { DatePickerField, type DateRange } from "@/components/ui/DatePickerField";

// Single date
<DatePickerField
  value={date}
  onChange={setDate}
  label="Departure"
/>

// Date range (trip dates)
const [range, setRange] = useState<DateRange>({ start: null, end: null });

<DatePickerField
  mode="range"
  value={range}
  onChange={setRange}
  label="Trip dates"
  fromDate={new Date()}
/>`}</pre>
              </div>

            </div>
          </section>

        </div>
      </div>
    </>
  );
}
