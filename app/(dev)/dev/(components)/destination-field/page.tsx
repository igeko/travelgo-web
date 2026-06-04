"use client";

import { useState } from "react";
import { DestinationField, type PlaceTypes } from "@/components/ui/DestinationField";
import type { PlaceResult } from "@/components/ui/AddressField";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel } from "../_components/ControlsPanel";

const ALL_PLACE_TYPES: { value: PlaceTypes; label: string }[] = [
  { value: "(regions)", label: "(regions)" },
  { value: "(cities)", label: "(cities)" },
  { value: "country", label: "country" },
  { value: "geocode", label: "geocode" },
  { value: "address", label: "address" },
  { value: "establishment", label: "establishment" },
  { value: "locality", label: "locality" },
  { value: "administrative_area_level_1", label: "admin_area_1" },
  { value: "administrative_area_level_2", label: "admin_area_2" },
];

export default function DestinationFieldPage() {
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [selectedTypes, setSelectedTypes] = useState<PlaceTypes[]>(["(regions)"]);
  const [singleValue, setSingleValue] = useState<PlaceResult | null>(null);
  const [multiValue, setMultiValue] = useState<PlaceResult[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [labelAlwaysVisible, setLabelAlwaysVisible] = useState(false);
  const [label, setLabel] = useState("Destination");
  const [placeholder, setPlaceholder] = useState("Where would you like to go?");

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
                    { value: "multiple", label: "multiple" },
                  ],
                  value: mode,
                  onChange: (v) => setMode(v as "single" | "multiple"),
                },
              ],
            },
            {
              title: "Place Types",
              controls: [
                {
                  kind: "multiselect",
                  id: "placeTypes",
                  label: "Types",
                  options: ALL_PLACE_TYPES,
                  value: selectedTypes,
                  min: 1,
                  onChange: (v) => {
                    setSelectedTypes(v as PlaceTypes[]);
                    setSingleValue(null);
                    setMultiValue([]);
                  },
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
                  placeholder: "e.g. Destination",
                  onChange: setLabel,
                },
                {
                  kind: "text",
                  id: "placeholder",
                  label: "Placeholder",
                  value: placeholder,
                  placeholder: "e.g. Where would you like to go?",
                  onChange: setPlaceholder,
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
                {
                  kind: "toggle",
                  id: "labelAlwaysVisible",
                  label: "Label always visible",
                  value: labelAlwaysVisible,
                  onChange: setLabelAlwaysVisible,
                },
              ],
            },
          ]}
        />
      </SandboxRightPanel>

      <div className="px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">
            Fields
          </div>
          <h1 className="text-2xl font-semibold text-ink">DestinationField</h1>
          <p className="mt-2 text-sm text-ink-soft max-w-prose">
            Autocomplete per destinazioni di viaggio. Supporta selezione singola (chip che disabilita l&apos;input) e multipla (chip accumulabili).
          </p>
        </div>

        <div className="flex flex-col gap-10 max-w-lg">

          {/* Live preview */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Preview · mode={mode} · placeTypes=[{selectedTypes.join(", ")}]
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
              {mode === "single" ? (
                <DestinationField
                  mode="single"
                  value={singleValue}
                  onChange={setSingleValue}
                  placeholder={placeholder || undefined}
                  label={label || undefined}
                  labelAlwaysVisible={labelAlwaysVisible}
                  placeTypes={selectedTypes}
                  disabled={disabled}
                />
              ) : (
                <DestinationField
                  mode="multiple"
                  value={multiValue}
                  onChange={setMultiValue}
                  placeholder={placeholder || undefined}
                  label={label || undefined}
                  labelAlwaysVisible={labelAlwaysVisible}
                  placeTypes={selectedTypes}
                  disabled={disabled}
                />
              )}

              {/* Value inspector */}
              <div className="text-[11px] font-mono text-ink-faint bg-surface-soft rounded-lg px-3 py-2 whitespace-pre-wrap break-all">
                {mode === "single"
                  ? singleValue
                    ? JSON.stringify({ name: singleValue.name, formatted: singleValue.formatted, placeId: singleValue.placeId }, null, 2)
                    : "null"
                  : multiValue.length
                  ? JSON.stringify(multiValue.map((p) => ({ name: p.name, formatted: p.formatted })), null, 2)
                  : "[]"}
              </div>
            </div>
          </section>

          {/* Both modes side by side description */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Comportamento
            </div>
            <div className="flex flex-col gap-3 text-sm text-ink-soft">
              <div className="flex gap-2.5">
                <span className="shrink-0 font-mono text-[11px] bg-surface-soft text-ink px-2 py-0.5 rounded">single</span>
                <span>Una sola destinazione. Dopo la selezione appare il chip; l&apos;input resta attivo per cercare un&apos;altra. Rimuovendo il chip si riparte.</span>
              </div>
              <div className="flex gap-2.5">
                <span className="shrink-0 font-mono text-[11px] bg-surface-soft text-ink px-2 py-0.5 rounded">multiple</span>
                <span>Più destinazioni. I chip si accumulano, l&apos;input rimane attivo. Duplicati ignorati automaticamente.</span>
              </div>
            </div>
          </section>

          {/* Developer reference */}
          <section>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint mb-3">
              Developer
            </div>
            <div className="flex flex-col gap-6">

              {/* Props table */}
              <div>
                <div className="text-[11px] font-medium text-ink-soft mb-2">Props</div>
                <div className="rounded-lg border border-border overflow-hidden text-[12px]">
                  {[
                    { prop: "mode", type: '"single" | "multiple"', required: true, description: "Selection mode" },
                    { prop: "value", type: "PlaceResult | null  /  PlaceResult[]", required: true, description: "Controlled value — null or [] when empty" },
                    { prop: "onChange", type: "(v) => void", required: true, description: "Called on selection or chip removal" },
                    { prop: "placeTypes", type: "PlaceTypes | PlaceTypes[]", required: false, description: 'Google Places filter. Default: "(regions)"' },
                    { prop: "label", type: "string", required: false, description: "Floating label shown on focus" },
                    { prop: "placeholder", type: "string", required: false, description: 'Input hint. Default: "Search destination…"' },
                    { prop: "disabled", type: "boolean", required: false, description: "Disables the field and chip remove buttons" },
                    { prop: "autoFocus", type: "boolean", required: false, description: "Focuses the input on mount" },
                    { prop: "className", type: "string", required: false, description: "Extra classes on the outer wrapper" },
                  ].map((row, i) => (
                    <div
                      key={row.prop}
                      className={`grid grid-cols-[auto_1fr] gap-x-4 px-3 py-2 ${i % 2 === 0 ? "bg-surface" : "bg-surface-soft"}`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="font-mono text-ink font-medium whitespace-nowrap">{row.prop}</span>
                        {row.required && (
                          <span className="mt-px text-[9px] font-medium uppercase tracking-wide text-orange bg-orange/10 px-1 rounded shrink-0">req</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-ink-soft truncate">{row.type}</span>
                        <span className="text-ink-faint">{row.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PlaceTypes reference */}
              <div>
                <div className="text-[11px] font-medium text-ink-soft mb-2">PlaceTypes</div>
                <div className="rounded-lg border border-border overflow-hidden text-[12px]">
                  {[
                    { value: "(regions)", note: "Cities, regions, countries — best for travel (default)" },
                    { value: "(cities)", note: "Cities and localities only" },
                    { value: "country", note: "Countries only" },
                    { value: "geocode", note: "Any geographic location" },
                    { value: "address", note: "Precise street addresses" },
                    { value: "establishment", note: "Businesses, POIs, landmarks" },
                    { value: "locality", note: "Cities / municipalities" },
                    { value: "administrative_area_level_1", note: "States, provinces, regions" },
                    { value: "administrative_area_level_2", note: "Counties, districts" },
                  ].map((row, i) => (
                    <div
                      key={row.value}
                      className={`grid grid-cols-[auto_1fr] gap-x-4 px-3 py-2 ${i % 2 === 0 ? "bg-surface" : "bg-surface-soft"}`}
                    >
                      <span className="font-mono text-ink whitespace-nowrap">{row.value}</span>
                      <span className="text-ink-faint">{row.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code examples */}
              <div>
                <div className="text-[11px] font-medium text-ink-soft mb-2">Usage</div>
                <pre className="rounded-lg bg-surface-soft border border-border px-4 py-3 text-[11px] font-mono text-ink-soft overflow-x-auto leading-relaxed">{`// Single mode
<DestinationField
  mode="single"
  value={place}
  onChange={setPlace}
  label="Destination"
  placeholder="Where would you like to go?"
/>

// Multiple mode with type filter
<DestinationField
  mode="multiple"
  value={places}
  onChange={setPlaces}
  placeTypes={["locality", "administrative_area_level_1"]}
  label="Destinations"
/>`}</pre>
              </div>

            </div>
          </section>

        </div>
      </div>
    </>
  );
}
