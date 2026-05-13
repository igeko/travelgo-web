"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import {
  HeroBanner,
  type HeroBannerData,
  type HeroBannerType,
  type HeroBannerSubBanner,
  type HeroBannerSubBannerData,
} from "@/features/day/HeroBanner";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "",          label: "None (default)" },
  { value: "City",      label: "City" },
  { value: "Nature",    label: "Nature" },
  { value: "Roadtrip",  label: "Roadtrip" },
  { value: "Beach",     label: "Beach" },
  { value: "Village",   label: "Village" },
  { value: "Rest",      label: "Rest" },
];

const INITIAL_LODGING: HeroBannerSubBanner = {
  type: "Hotel",
  emoji: "🏨",
  label: "Staying at",
  name: "Hoshinoya Tōkyō",
  detail: "Chiyoda-ku, Otemachi 1-9-1",
  href: "https://hoshinoya.com/tokyo",
};

export default function HeroBannerStories() {
  /* Simulates parent state */
  const [title,    setTitle]    = useState("Escursione al Monte Fuji");
  const [subtitle, setSubtitle] = useState("Monte Fuji");
  const [heroType, setHeroType] = useState<string>("Nature");
  const [editMode,    setEditMode]    = useState(true);
  const [showNav,     setShowNav]     = useState(true);
  const [showLodging, setShowLodging] = useState(true);
  const [lodging, setLodging] = useState<HeroBannerSubBanner>(INITIAL_LODGING);

  const [lastHeroSave,    setLastHeroSave]    = useState<HeroBannerData | null>(null);
  const [lastLodgingSave, setLastLodgingSave] = useState<HeroBannerSubBannerData | null>(null);

  function handleSaveHero(data: HeroBannerData) {
    setTitle(data.title);
    setSubtitle(data.subtitle ?? "");
    if (data.type) setHeroType(data.type);
    setLastHeroSave(data);
  }

  function handleSaveLodging(data: HeroBannerSubBannerData) {
    setLodging(data);
    setLastLodgingSave(data);
  }

  const groups: ControlGroup[] = [
    {
      title: "Hero",
      controls: [
        {
          kind: "toggle",
          id: "edit-mode",
          label: "Edit mode",
          value: editMode,
          onChange: setEditMode,
        },
        {
          kind: "radio",
          id: "hero-type",
          label: "Day type (drives banner image)",
          value: heroType,
          onChange: setHeroType,
          options: TYPE_OPTIONS,
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
          label: "Show sub-banner",
          value: showLodging,
          onChange: setShowLodging,
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
        title="HeroBanner"
        description="Full-bleed hero with inline edit forms for the hero and the lodging sub-banner. Click the pencil handles to open each accordion."
      >
        {/* ── Fully editable ── */}
        <StoryFrame
          name="Fully editable"
          description="Hero pencil edits zone/place/type. Lodging pencil edits type, name, address, link, budget."
        >
          <div className="flex flex-col gap-3 w-full">
            <HeroBanner
              eyebrow="Day 4"
              title={title}
              subtitle={subtitle}
              meta="August 3, 2026 · 5 activities"
              type={heroType as HeroBannerType || undefined}
              editMode={editMode}
              onSave={handleSaveHero}
              onPrev={showNav ? () => {} : undefined}
              onNext={showNav ? () => {} : undefined}
              subBanner={showLodging ? lodging : undefined}
              onSaveLodging={showLodging ? handleSaveLodging : undefined}
              onRemoveLodging={showLodging ? () => setShowLodging(false) : undefined}
              className="w-full"
            />
            {(lastHeroSave || lastLodgingSave) && (
              <div className="flex flex-col gap-1">
                {lastHeroSave && (
                  <div className="text-[11px] text-ink-faint bg-surface-soft rounded-lg px-3 py-2 font-mono">
                    onSave (hero) → {JSON.stringify(lastHeroSave)}
                  </div>
                )}
                {lastLodgingSave && (
                  <div className="text-[11px] text-ink-faint bg-surface-soft rounded-lg px-3 py-2 font-mono">
                    onSaveLodging → {JSON.stringify(lastLodgingSave)}
                  </div>
                )}
              </div>
            )}
          </div>
        </StoryFrame>

        {/* ── Read-only · City ── */}
        <StoryFrame
          name="Read-only · City"
          description="No editMode — no pencil handles. Type drives the background image."
        >
          <HeroBanner
            eyebrow="Day 1"
            title="Arrival in Tokyo"
            subtitle="Tokyo"
            meta="July 31, 2026 · 3 activities"
            type="City"
            onPrev={() => {}}
            onNext={() => {}}
            subBanner={INITIAL_LODGING}
            className="w-full"
          />
        </StoryFrame>

        {/* ── Minimal ── */}
        <StoryFrame
          name="Minimal"
          description="Title only — no type, shows the default banner image."
        >
          <HeroBanner title="Unnamed day" className="w-full" />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
