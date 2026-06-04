"use client";

import { useState } from "react";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";

export default function AddressFieldStories() {
  // ── Debugger state ──
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [variant, setVariant] = useState<"pill" | "inline">("pill");
  const [label, setLabel] = useState("");
  const [placeholder, setPlaceholder] = useState("Search address…");
  const [showMapButton, setShowMapButton] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(false);
  const [labelAlwaysVisible, setLabelAlwaysVisible] = useState(false);

  // ── Static story state ──
  const [placeStatic, setPlaceStatic] = useState<PlaceResult | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Layout",
      controls: [
        {
          kind: "radio",
          id: "variant",
          label: "Variant",
          value: variant,
          onChange: (v) => setVariant(v as "pill" | "inline"),
          options: [
            { value: "pill", label: "pill (default)" },
            { value: "inline", label: "inline · passport row" },
          ],
        },
      ],
    },
    {
      title: "Content",
      controls: [
        {
          kind: "text",
          id: "label",
          label: variant === "inline" ? "Eyebrow label" : "Floating label",
          value: label,
          placeholder: "(empty = no label)",
          onChange: setLabel,
        },
        {
          kind: "text",
          id: "placeholder",
          label: "Placeholder",
          value: placeholder,
          onChange: setPlaceholder,
        },
      ],
    },
    {
      title: "Options",
      controls: [
        {
          kind: "toggle",
          id: "show-map-button",
          label: "Show map button",
          value: showMapButton,
          onChange: setShowMapButton,
        },
        {
          kind: "toggle",
          id: "disabled",
          label: "Disabled",
          value: disabled,
          onChange: setDisabled,
        },
        {
          kind: "toggle",
          id: "error",
          label: "Error (inline)",
          value: error,
          onChange: setError,
        },
        {
          kind: "toggle",
          id: "labelAlwaysVisible",
          label: "Label always visible (pill)",
          value: labelAlwaysVisible,
          onChange: setLabelAlwaysVisible,
        },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="AddressField"
        description="SoftField with Google Places autocomplete. Calls /api/places/autocomplete while typing (debounced 300 ms), then fetches full details (lat/lng, components) on selection."
      >
        {/* ── Debugger ── */}
        <StoryFrame
          name="Debugger"
          description="Live — type to trigger autocomplete. Pin turns red when a valid place is selected."
        >
          <div className="flex flex-col gap-6 w-full max-w-md">
            <AddressField
              value={place}
              onChange={setPlace}
              variant={variant}
              label={label || undefined}
              labelAlwaysVisible={labelAlwaysVisible}
              placeholder={placeholder}
              showMapButton={showMapButton}
              disabled={disabled}
              error={error}
              errorMessage={
                error ? (
                  <>
                    non trovo questo indirizzo ·{" "}
                    <b className="not-italic font-medium underline cursor-pointer">
                      chiedi a Go
                    </b>
                  </>
                ) : undefined
              }
            />

            {/* PlaceResult inspector */}
            {place ? (
              <div className="rounded-lg bg-surface-soft border border-border p-4 text-[12px] font-mono text-ink-soft leading-relaxed">
                <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
                  PlaceResult
                </div>
                <div>
                  <span className="text-ink-faint">formatted: </span>
                  <span className="text-ink">{place.formatted}</span>
                </div>
                <div>
                  <span className="text-ink-faint">name: </span>
                  <span className="text-ink">{place.name}</span>
                </div>
                <div>
                  <span className="text-ink-faint">placeId: </span>
                  <span className="text-ink">{place.placeId}</span>
                </div>
                <div>
                  <span className="text-ink-faint">lat: </span>
                  <span className="text-ink">{place.lat}</span>
                </div>
                <div>
                  <span className="text-ink-faint">lng: </span>
                  <span className="text-ink">{place.lng}</span>
                </div>
                {place.components && Object.keys(place.components).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-ink-faint mb-1">components:</div>
                    {Object.entries(place.components).map(([k, v]) => (
                      <div key={k} className="pl-2">
                        <span className="text-ink-faint">{k}: </span>
                        <span className="text-ink">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[12px] text-ink-faint italic">
                No place selected yet.
              </div>
            )}
          </div>
        </StoryFrame>

        {/* ── In a form context ── */}
        <StoryFrame
          name="Inside a form"
          description="Typical usage in a day-edit form, with label and map button enabled."
        >
          <div className="w-full max-w-md">
            <AddressField
              value={placeStatic}
              onChange={setPlaceStatic}
              label="Location"
              placeholder="Search a place…"
              showMapButton
            />
          </div>
        </StoryFrame>

        {/* ── Inline variant ── */}
        <StoryFrame
          name="Inline variant · passport row"
          description="`variant='inline'` drops the pill chrome: map pin + eyebrow label + inline value, like a passport line. The autocomplete dropdown still anchors to the row. `error` tints the value and shows a micro-message below."
        >
          <InlineDemo />
        </StoryFrame>

        {/* ── Disabled ── */}
        <StoryFrame
          name="Disabled"
          description="Disabled with a pre-filled value. Pin is red because a valid PlaceResult is present."
        >
          <div className="w-full max-w-md">
            <AddressField
              value={{
                formatted: "Tokyo, Japan",
                name: "Tokyo",
                placeId: "ChIJ51cu8IcbXWARiRtXIothbyY",
                lat: 35.6762,
                lng: 139.6503,
                components: { country: "Japan", locality: "Tokyo" },
              }}
              onChange={() => {}}
              showMapButton
              disabled
            />
          </div>
        </StoryFrame>
        {/* Developer reference */}
        <DocsFrame>
          {/* AddressFieldProps */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint mb-3">AddressFieldProps</p>
            <PropsTable rows={[
              { prop: "value",         type: "PlaceResult | null",  required: true,  description: "Currently selected place. Pass null when nothing is selected." },
              { prop: "onChange",      type: "(place: PlaceResult | null) => void", required: true, description: "Called with the full PlaceResult after the user selects a suggestion, or null when the field is cleared." },
              { prop: "placeholder",   type: "string",              defaultValue: '"Search address…"', description: "Input placeholder text." },
              { prop: "variant",       type: '"pill" | "inline"',   defaultValue: '"pill"', description: 'Forwarded to SoftField. "inline" drops the pill chrome (passport-row look) with the pin as the leading icon and label as the eyebrow.' },
              { prop: "label",         type: "string",              description: "Floating label (pill) / eyebrow label (inline), passed through to SoftField." },
              { prop: "disabled",      type: "boolean",             description: "Disables the input and suppresses autocomplete." },
              { prop: "error",         type: "boolean",             description: "Inline variant — tints the value to signal an unresolved address." },
              { prop: "errorMessage",  type: "ReactNode",           description: "Inline variant — micro-message rendered below the row (may contain links)." },
              { prop: "showMapButton", type: "boolean",             defaultValue: "false", description: "Shows a 'map' button in the suffix slot. Visual only — wire onClick via SoftField.Suffix if needed." },
              { prop: "className",     type: "string",              description: "Extra classes on the outer wrapper div." },
            ]} />
          </div>

          {/* PlaceResult */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint mb-3">PlaceResult — returned by onChange</p>
            <PropsTable rows={[
              { prop: "formatted",   type: "string",              description: 'Human-readable full address from Google (e.g. "Shinjuku, Tokyo, Japan").' },
              { prop: "name",        type: "string",              description: 'Place name for establishments (e.g. "Shinjuku Gyoen"). Falls back to the first part of the formatted address.' },
              { prop: "placeId",     type: "string",              description: "Google place_id — stable identifier, safe to store in the DB." },
              { prop: "lat",         type: "number",              description: "Latitude (WGS 84)." },
              { prop: "lng",         type: "number",              description: "Longitude (WGS 84)." },
              { prop: "components",  type: "Record<string, string>", description: "Flat map of address_component types → long_name. Common keys: locality, administrative_area_level_1, country, postal_code." },
            ]} />
          </div>

          <CodeBlock code={`
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";

// Controlled — parent owns the PlaceResult
const [place, setPlace] = useState<PlaceResult | null>(null);

<AddressField
  value={place}
  onChange={setPlace}
  label="Location"
  placeholder="Search a place…"
/>

// With map button
<AddressField
  value={place}
  onChange={setPlace}
  label="Address"
  showMapButton
/>

// Reading the result
if (place) {
  console.log(place.placeId);       // "ChIJ51cu8IcbXWARiRtXIothbyY"
  console.log(place.lat, place.lng); // 35.6762, 139.6503
  console.log(place.components.country);   // "Japan"
  console.log(place.components.locality);  // "Tokyo"
}
          `} />
        </DocsFrame>
      </StoryPage>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Inline demo · the inline variant in its own (own-state) frame
───────────────────────────────────────────────────────────────── */
function InlineDemo() {
  const [a, setA] = useState<PlaceResult | null>(null);
  const [b, setB] = useState<PlaceResult | null>(null);

  return (
    <div className="flex flex-col gap-1 w-full max-w-[380px]">
      <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mt-1">
        icon + label
      </div>
      <AddressField
        variant="inline"
        value={a}
        onChange={setA}
        label="Where"
        placeholder="una città, un indirizzo…"
      />

      <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mt-3">
        error
      </div>
      <AddressField
        variant="inline"
        value={b}
        onChange={setB}
        label="Where"
        placeholder="una città, un indirizzo…"
        error
        errorMessage={
          <>
            non trovo questo indirizzo ·{" "}
            <b className="not-italic font-medium underline cursor-pointer">
              chiedi a Go
            </b>
          </>
        }
      />
    </div>
  );
}
