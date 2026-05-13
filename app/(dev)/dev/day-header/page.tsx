"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { DayHeader } from "@/components/day-header/DayHeader";

const SAMPLE_IMAGES = [
  { label: "Nature", url: "/imgs/day-banner-nature.png" },
  { label: "City", url: "/imgs/day-banner-city.png" },
  { label: "None", url: "" },
];

const LODGING_PRESETS = [
  {
    label: "Hotel",
    value: {
      emoji: "🏨",
      name: "Hoshinoya Tōkyō",
      address: "Chiyoda-ku, Otemachi 1-9-1",
      href: "https://hoshinoya.com/tokyo",
    },
  },
  {
    label: "Ryokan",
    value: {
      emoji: "🏯",
      name: "Arashiyama Bショ Bamboo Villa",
      address: "Arashiyama, Kyoto",
      href: "",
    },
  },
  {
    label: "No address",
    value: {
      emoji: "🛏",
      name: "Airbnb Shinjuku",
      address: "",
      href: "https://airbnb.com",
    },
  },
];

export default function DayHeaderStories() {
  const [showEdit, setShowEdit] = useState(true);
  const [showNav, setShowNav] = useState(true);
  const [showLodging, setShowLodging] = useState(true);
  const [lodgingPreset, setLodgingPreset] = useState("Hotel");
  const [imagePreset, setImagePreset] = useState("Nature");
  const [dayNum, setDayNum] = useState(4);
  const [activityCount, setActivityCount] = useState(5);

  const imageUrl = SAMPLE_IMAGES.find((i) => i.label === imagePreset)?.url ?? "";
  const lodgingData = LODGING_PRESETS.find((l) => l.label === lodgingPreset)?.value;

  const groups: ControlGroup[] = [
    {
      title: "Hero",
      controls: [
        {
          kind: "radio",
          id: "image-preset",
          label: "Background image",
          value: imagePreset,
          onChange: setImagePreset,
          options: SAMPLE_IMAGES.map((i) => ({ value: i.label, label: i.label })),
        },
        {
          kind: "number",
          id: "day-num",
          label: "Day number",
          value: dayNum,
          min: 1,
          max: 30,
          onChange: setDayNum,
        },
        {
          kind: "number",
          id: "activity-count",
          label: "Activity count",
          value: activityCount,
          min: 0,
          max: 20,
          onChange: setActivityCount,
        },
        {
          kind: "toggle",
          id: "show-edit",
          label: "Pencil handle",
          value: showEdit,
          onChange: setShowEdit,
        },
        {
          kind: "toggle",
          id: "show-nav",
          label: "Prev / Next nav",
          value: showNav,
          onChange: setShowNav,
        },
      ],
    },
    {
      title: "Lodging",
      controls: [
        {
          kind: "toggle",
          id: "show-lodging",
          label: "Show banner",
          value: showLodging,
          onChange: setShowLodging,
        },
        {
          kind: "radio",
          id: "lodging-preset",
          label: "Preset",
          value: lodgingPreset,
          onChange: setLodgingPreset,
          options: LODGING_PRESETS.map((l) => ({ value: l.label, label: l.label })),
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
        title="DayHeader"
        description="Full-bleed day hero with gradient overlay, numbered eyebrow, title, subtitle and optional lodging banner. Pencil handle and prev/next nav are hidden when callbacks are not provided."
      >
        {/* ── Debugger ── */}
        <StoryFrame
          name="Debugger"
          description="Toggle lodging, pencil handle and navigation from the controls panel."
        >
          <DayHeader
            eyebrow={`Giorno ${dayNum} · Lunedì 3 ago 2026`}
            title="Monte Fuji"
            subtitle="Escursione tra i 5 laghi"
            meta={`${activityCount} attività`}
            imageUrl={imageUrl}
            editMode={showEdit}
            onPrev={showNav ? () => alert("Prev") : undefined}
            onNext={showNav ? () => alert("Next") : undefined}
            subBanner={showLodging && lodgingData ? { name: lodgingData.name, detail: lodgingData.address, href: lodgingData.href || undefined } : undefined}
            className="w-full"
          />
        </StoryFrame>

        {/* ── No image ── */}
        <StoryFrame
          name="No image"
          description="Falls back to solid ink background when imageUrl is omitted."
        >
          <DayHeader
            eyebrow="Giorno 1 · Sabato 31 lug 2026"
            title="Tokyo"
            subtitle="Arrivo e orientamento"
            meta="3 attività"
            editMode
            onPrev={() => {}}
            onNext={() => {}}
            className="w-full"
          />
        </StoryFrame>

        {/* ── No title, no lodging ── */}
        <StoryFrame
          name="Minimal"
          description="No place, no subtitle, no nav, no lodging — minimal variant."
        >
          <DayHeader
            eyebrow="Giorno 7 · Venerdì 6 ago 2026"
            title=""
            meta="0 attività"
            className="w-full"
          />
        </StoryFrame>

        {/* ── With lodging, no CTA ── */}
        <StoryFrame
          name="Lodging without CTA"
          description="Lodging banner without href — no 'Apri' button rendered."
        >
          <DayHeader
            eyebrow="Giorno 2 · Domenica 1 ago 2026"
            title="Kyoto"
            subtitle="Giornata al tempio"
            meta="4 attività"
            imageUrl={imageUrl}
            subBanner={{ emoji: "🏯", name: "Ryokan Arashiyama", detail: "Nishikyo-ku, Kyoto" }}
            className="w-full"
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
