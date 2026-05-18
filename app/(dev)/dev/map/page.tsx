"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { Map } from "@/components/ui/Map";

const PRESETS = [
  { label: "Tokyo",  lat: 35.6762, lng: 139.6503 },
  { label: "Kyoto",  lat: 35.0116, lng: 135.7681 },
  { label: "Osaka",  lat: 34.6937, lng: 135.5023 },
  { label: "Rome",   lat: 41.9028, lng: 12.4964  },
  { label: "Paris",  lat: 48.8566, lng:  2.3522  },
];

export default function MapStories() {
  const [presetLabel, setPresetLabel] = useState("Tokyo");
  const [zoom, setZoom] = useState(13);
  const [height, setHeight] = useState(320);
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [zoomControl, setZoomControl] = useState(true);
  const [fullscreenControl, setFullscreenControl] = useState(false);
  const [mapTypeControl, setMapTypeControl] = useState(false);
  const [streetViewControl, setStreetViewControl] = useState(false);
  const [scaleControl, setScaleControl] = useState(false);

  const preset = PRESETS.find((p) => p.label === presetLabel) ?? PRESETS[0];

  const groups: ControlGroup[] = [
    {
      title: "Location",
      controls: [
        {
          kind: "radio",
          id: "preset",
          label: "City preset",
          value: presetLabel,
          onChange: setPresetLabel,
          options: PRESETS.map((p) => ({ value: p.label, label: p.label })),
        },
      ],
    },
    {
      title: "Map",
      controls: [
        {
          kind: "radio",
          id: "map-type",
          label: "Map type",
          value: mapTypeId,
          onChange: (v) => setMapTypeId(v as typeof mapTypeId),
          options: [
            { value: "roadmap",   label: "Roadmap" },
            { value: "satellite", label: "Satellite" },
            { value: "hybrid",    label: "Hybrid" },
            { value: "terrain",   label: "Terrain" },
          ],
        },
        {
          kind: "number",
          id: "zoom",
          label: "Zoom",
          value: zoom,
          min: 1,
          max: 20,
          onChange: setZoom,
        },
        {
          kind: "number",
          id: "height",
          label: "Height (px)",
          value: height,
          min: 100,
          max: 600,
          onChange: setHeight,
        },
      ],
    },
    {
      title: "Controls",
      controls: [
        {
          kind: "toggle",
          id: "zoom-control",
          label: "Zoom",
          value: zoomControl,
          onChange: setZoomControl,
        },
        {
          kind: "toggle",
          id: "fullscreen-control",
          label: "Fullscreen",
          value: fullscreenControl,
          onChange: setFullscreenControl,
        },
        {
          kind: "toggle",
          id: "maptype-control",
          label: "Map type",
          value: mapTypeControl,
          onChange: setMapTypeControl,
        },
        {
          kind: "toggle",
          id: "streetview-control",
          label: "Street View",
          value: streetViewControl,
          onChange: setStreetViewControl,
        },
        {
          kind: "toggle",
          id: "scale-control",
          label: "Scale bar",
          value: scaleControl,
          onChange: setScaleControl,
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
        title="Map"
        description="Google Maps JS SDK wrapper. Fills its container — the consumer sets width/height via className. Pans smoothly when center changes."
      >
        <StoryFrame
          name="Debugger"
          description="Switch city to see the map pan. Adjust zoom, height and UI controls from the panel."
        >
          <Map
            center={{ lat: preset.lat, lng: preset.lng }}
            zoom={zoom}
            mapTypeId={mapTypeId}
            className="w-full"
            style={{ height }}
            controls={{
              zoomControl,
              fullscreenControl,
              mapTypeControl,
              streetViewControl,
              scaleControl,
            }}
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
