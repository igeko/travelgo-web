"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { RouteMap, type TravelMode } from "@/components/ui/RouteMap";
import type { PlaceResult } from "@/components/ui/AddressField";

/* ── Demo points — Tokyo itinerary ─────────────────────────────── */
const TOKYO_POINTS: PlaceResult[] = [
  {
    formatted: "Senso-ji Temple, Asakusa, Tokyo",
    name: "Senso-ji Temple",
    placeId: "ChIJ8T1GpMGOGGARDYGSgpooDWw",
    lat: 35.7147, lng: 139.7967,
    components: { locality: "Tokyo", country: "Japan" },
  },
  {
    formatted: "Ueno Park, Ueno, Tokyo",
    name: "Ueno Park",
    placeId: "ChIJIfBAsjuOGGARfRBVyq3aZhY",
    lat: 35.7141, lng: 139.7741,
    components: { locality: "Tokyo", country: "Japan" },
  },
  {
    formatted: "Akihabara, Tokyo",
    name: "Akihabara",
    placeId: "ChITR9NHqbuOGGARLhFTkZFTkZE",
    lat: 35.7022, lng: 139.7741,
    components: { locality: "Tokyo", country: "Japan" },
  },
  {
    formatted: "Tsukiji Outer Market, Tokyo",
    name: "Tsukiji Market",
    placeId: "ChIJU8KGqTuLGGARu5d5AQ-RUzE",
    lat: 35.6654, lng: 139.7707,
    components: { locality: "Tokyo", country: "Japan" },
  },
  {
    formatted: "teamLab Borderless, Azabudai Hills, Tokyo",
    name: "teamLab Borderless",
    placeId: "ChIJrTLr-GyuEmsRBfy61i59si0",
    lat: 35.6572, lng: 139.7394,
    components: { locality: "Tokyo", country: "Japan" },
  },
];

const POINT_COUNT_OPTIONS = [2, 3, 4, 5];

export default function RouteMapStories() {
  const [pointCount, setPointCount] = useState(3);
  const [travelMode, setTravelMode] = useState<TravelMode>("WALKING");
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [height, setHeight] = useState(400);
  const [showList, setShowList] = useState(false);
  const [zoomControl, setZoomControl] = useState(true);
  const [fullscreenControl, setFullscreenControl] = useState(false);
  const [mapTypeControl, setMapTypeControl] = useState(false);
  const [streetViewControl, setStreetViewControl] = useState(false);
  const [scaleControl, setScaleControl] = useState(false);

  const activePoints = TOKYO_POINTS.slice(0, pointCount);

  const groups: ControlGroup[] = [
    {
      title: "Points",
      controls: [
        {
          kind: "radio",
          id: "point-count",
          label: "Number of stops",
          value: String(pointCount),
          onChange: (v) => setPointCount(Number(v)),
          options: POINT_COUNT_OPTIONS.map((n) => ({
            value: String(n),
            label: String(n),
          })),
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
      ],
    },
    {
      title: "Routing",
      controls: [
        {
          kind: "radio",
          id: "travel-mode",
          label: "Travel mode",
          value: travelMode,
          onChange: (v) => setTravelMode(v as TravelMode),
          options: [
            { value: "WALKING",   label: "Walking" },
            { value: "DRIVING",   label: "Driving" },
            { value: "BICYCLING", label: "Bicycling" },
            { value: "TRANSIT",   label: "Transit" },
          ],
        },
      ],
    },
    {
      title: "Size",
      controls: [
        {
          kind: "number",
          id: "height",
          label: "Height (px)",
          value: height,
          min: 200,
          max: 700,
          onChange: setHeight,
        },
        {
          kind: "toggle",
          id: "show-list",
          label: "Show stop list",
          value: showList,
          onChange: setShowList,
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
        title="RouteMap"
        description="Google Maps with numbered orange markers and a Directions API route. Points are PlaceResult objects — same type returned by AddressField. Adjusts bounds automatically to fit all stops."
      >
        {/* ── Debugger ── */}
        <StoryFrame
          name="Debugger"
          description="Tokyo itinerary: Senso-ji → Ueno → Akihabara → Tsukiji → teamLab. Add/remove stops and switch travel mode from the controls panel."
        >
          <div className="flex flex-col gap-4 w-full">
            <RouteMap
              points={activePoints}
              travelMode={travelMode}
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

            {/* Stop list — optional */}
            {showList && (
              <ol className="flex flex-col gap-1.5">
                {activePoints.map((p, i) => (
                  <li key={p.placeId} className="flex items-center gap-2.5 text-[13px]">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-orange text-white text-[10px] font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-ink font-medium">{p.name}</span>
                    <span className="text-ink-faint text-[11px] truncate">{p.formatted}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
