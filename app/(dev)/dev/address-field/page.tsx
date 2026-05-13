"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";

export default function AddressFieldStories() {
  // ── Debugger state ──
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [label, setLabel] = useState("");
  const [placeholder, setPlaceholder] = useState("Search address…");
  const [showMapButton, setShowMapButton] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // ── Static story state ──
  const [placeStatic, setPlaceStatic] = useState<PlaceResult | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Content",
      controls: [
        {
          kind: "text",
          id: "label",
          label: "Floating label",
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
              label={label || undefined}
              placeholder={placeholder}
              showMapButton={showMapButton}
              disabled={disabled}
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
                {Object.keys(place.components).length > 0 && (
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
      </StoryPage>
    </>
  );
}
