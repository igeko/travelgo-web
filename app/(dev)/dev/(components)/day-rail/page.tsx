"use client";

import { useState } from "react";
import { DayRail } from "@/features/day/DayRail";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import type { Day } from "@/lib/dal/domain";

function mkDay(n: number, date: string, city: string | null, label: string | null): Day {
  return {
    id: `d${n}`,
    trip_id: "trip-001",
    day_number: n,
    date,
    city,
    label,
    day_type: null,
    accommodation_name: null,
    accommodation_address: null,
    accommodation_url: null,
    accommodation_type: null,
    accommodation_place_id: null,
    accommodation_lat: null,
    accommodation_lng: null,
    show_map: false,
    notes: null,
    summary: null,
    image_url: null,
    narrative: null,
  };
}

const DAYS: Day[] = [
  mkDay(1, "2026-07-31", "Tokyo", "Arrivo · Asakusa"),
  mkDay(2, "2026-08-01", "Tokyo", "Yanaka · Ueno"),
  mkDay(3, "2026-08-02", "Tokyo", "Shibuya"),
  mkDay(4, "2026-08-03", "Hakone", "Onsen · Fuji"),
  mkDay(5, "2026-08-04", "Kyoto", "Gion"),
  mkDay(6, "2026-08-05", "Kyoto", null),
  mkDay(7, "2026-08-06", null, null),
];

const START = "2026-07-31";
const END = "2026-08-06";

export default function DayRailStories() {
  const [selFull, setSelFull] = useState("d4");
  const [selLabel, setSelLabel] = useState("d2");
  const [selCollapsed, setSelCollapsed] = useState("d4");
  const [collapsed, setCollapsed] = useState(true);

  return (
    <StoryPage
      title="DayRail"
      description="La sidebar dei giorni condivisa tra la trip day page e /trips/new. Controllata: il parent fornisce days, selectedDayId, onSelect. Stesso componente, niente markup duplicato."
    >
      <StoryFrame
        name="Header full"
        description="Header completo (Itinerary + Day by day + summary), come nella trip day page."
      >
        <div className="w-[320px]">
          <DayRail
            days={DAYS}
            selectedDayId={selFull}
            onSelect={setSelFull}
            startDate={START}
            endDate={END}
          />
        </div>
      </StoryFrame>

      <StoryFrame
        name="Header label"
        description={'Header ridotto alla sola eyebrow ITINERARY (header="label") — usato in /trips/new.'}
      >
        <div className="w-[320px]">
          <DayRail
            days={DAYS}
            selectedDayId={selLabel}
            onSelect={setSelLabel}
            startDate={START}
            endDate={END}
            header="label"
          />
        </div>
      </StoryFrame>

      <StoryFrame
        name="Collapsible"
        description="Con toggle di collapse (compact). Clicca la chevron per comprimere/espandere."
      >
        <div className="w-[320px]">
          <DayRail
            days={DAYS}
            selectedDayId={selCollapsed}
            onSelect={setSelCollapsed}
            startDate={START}
            endDate={END}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </div>
      </StoryFrame>
    </StoryPage>
  );
}
