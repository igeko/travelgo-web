"use client";

import { useRef, useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { Button } from "@/components/ui/Button";
import { ActivityRouteMap } from "@/features/activity/ActivityRouteMap";
import type { RouteStop, RouteMapHandle } from "@/features/activity/types";
import type { TravelMode } from "@/components/ui/Map";

/* ── Demo points — Tokyo itinerary ─────────────────────────────── */
const TOKYO_POINTS: RouteStop[] = [
  {
    formatted: "Senso-ji Temple, Asakusa, Tokyo",
    name: "Senso-ji Temple",
    placeId: "ChIJ8T1GpMGOGGARDYGSgpooDWw",
    lat: 35.7147, lng: 139.7967,
    components: { locality: "Tokyo", country: "Japan" },
    iconKey: "monument", transportOut: "metro", slot: "morning",
  },
  {
    formatted: "Ueno Park, Ueno, Tokyo",
    name: "Ueno Park",
    placeId: "ChIJIfBAsjuOGGARfRBVyq3aZhY",
    lat: 35.7141, lng: 139.7741,
    components: { locality: "Tokyo", country: "Japan" },
    iconKey: "park", transportOut: "walk", slot: "morning",
  },
  {
    formatted: "Akihabara, Tokyo",
    name: "Akihabara",
    placeId: "ChITR9NHqbuOGGARLhFTkZFTkZE",
    lat: 35.7022, lng: 139.7741,
    components: { locality: "Tokyo", country: "Japan" },
    iconKey: "shop", transportOut: "bus", slot: "afternoon",
  },
  {
    formatted: "Tsukiji Outer Market, Tokyo",
    name: "Tsukiji Market",
    placeId: "ChIJU8KGqTuLGGARu5d5AQ-RUzE",
    lat: 35.6654, lng: 139.7707,
    components: { locality: "Tokyo", country: "Japan" },
    iconKey: "food", transportOut: "taxi", slot: "evening",
  },
  {
    formatted: "teamLab Borderless, Azabudai Hills, Tokyo",
    name: "teamLab Borderless",
    placeId: "ChIJrTLr-GyuEmsRBfy61i59si0",
    lat: 35.6572, lng: 139.7394,
    components: { locality: "Tokyo", country: "Japan" },
    iconKey: "ticket", slot: "night",
  },
];

const POINT_COUNT_OPTIONS = [2, 3, 4, 5];

export default function ActivityRouteMapStories() {
  const mapRef = useRef<RouteMapHandle>(null);
  const [pointCount, setPointCount] = useState(3);
  const [typedLegs, setTypedLegs] = useState(true);
  const [travelMode, setTravelMode] = useState<TravelMode>("WALKING");
  const [showStopsBar, setShowStopsBar] = useState(true);

  const activePoints = TOKYO_POINTS.slice(0, pointCount).map((p) =>
    typedLegs ? p : { ...p, transportOut: null },
  );

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
          options: POINT_COUNT_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
        },
      ],
    },
    {
      title: "Routing",
      controls: [
        {
          kind: "toggle",
          id: "typed-legs",
          label: "Typed legs (per-transport)",
          value: typedLegs,
          onChange: setTypedLegs,
        },
        {
          kind: "radio",
          id: "travel-mode",
          label: "Travel mode (fallback)",
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
      title: "Layout",
      controls: [
        {
          kind: "toggle",
          id: "stops-bar",
          label: "Show stops bar",
          value: showStopsBar,
          onChange: setShowStopsBar,
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
        title="ActivityRouteMap"
        description="The day's map system — `<Map />` basemap + stop markers (variant 'stop', coloured by slot) + a `RouteSpec` derived from each stop's `transportOut`. Routing primitives now live in Map.tsx; this component composes them for the itinerary case."
      >
        <StoryFrame
          name="Debugger"
          description="Tokyo itinerary: Senso-ji → Ueno → Akihabara → Tsukiji → teamLab. Toggle typed legs and travel mode from the controls panel; drive the camera with the imperative buttons below."
        >
          <div className="flex flex-col gap-4 w-full">
            <ActivityRouteMap
              ref={mapRef}
              points={activePoints}
              travelMode={travelMode}
              showStopsBar={showStopsBar}
              mapClassName="h-[400px]"
            />

            {/* Imperative handle demo — drive the camera from outside */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-mini text-ink-soft mr-1">focusPoint:</span>
              {activePoints.map((p, i) => (
                <Button
                  key={p.placeId}
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  onClick={() => mapRef.current?.focusPoint(i)}
                >
                  {p.name}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                tone="neutral"
                onClick={() => mapRef.current?.focusCoord(35.6586, 139.7454, { label: "Tokyo Tower (ad-hoc)" })}
              >
                focusCoord (off-route pin)
              </Button>
              <Button
                size="sm"
                variant="solid"
                tone="neutral"
                className="ml-auto"
                onClick={() => mapRef.current?.fitAll()}
              >
                fitAll
              </Button>
            </div>
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
