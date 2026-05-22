"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { AppHeader, type AppHeaderTab } from "@/features/app/AppHeader";

export default function AppHeaderStories() {
  const [activeNav,  setActiveNav]  = useState<"trips" | "explore" | "yumeji">("trips");
  const [activeTab,  setActiveTab]  = useState<AppHeaderTab>("day-by-day");
  const [editMode,   setEditMode]   = useState(false);
  const [showTrip,   setShowTrip]   = useState(true);

  const groups: ControlGroup[] = [
    {
      title: "Nav",
      controls: [
        {
          kind: "radio",
          id: "active-nav",
          label: "Active main nav",
          value: activeNav,
          onChange: (v) => setActiveNav(v as typeof activeNav),
          options: [
            { value: "trips",   label: "My trips" },
            { value: "explore", label: "Explore" },
            { value: "yumeji",  label: "Yumeji" },
          ],
        },
      ],
    },
    {
      title: "Trip context",
      controls: [
        {
          kind: "toggle",
          id: "show-trip",
          label: "Show sub-bar",
          value: showTrip,
          onChange: setShowTrip,
        },
        {
          kind: "toggle",
          id: "edit-mode",
          label: "Edit mode",
          value: editMode,
          onChange: setEditMode,
        },
        {
          kind: "radio",
          id: "active-tab",
          label: "Active tab",
          value: activeTab,
          onChange: (v) => setActiveTab(v as AppHeaderTab),
          options: [
            { value: "day-by-day", label: "Day by day" },
            { value: "explore",    label: "Explore" },
            { value: "budget",     label: "Budget" },
            { value: "notes",      label: "Notes" },
          ],
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
        title="AppHeader"
        description="Two-row sticky header: brand + main nav (row 1), trip context + section tabs + edit-state chip (row 2). Row 2 hidden when no trip is active."
      >
        <StoryFrame
          name="Full — with trip context"
          description="Both rows visible. Toggle the sub-bar, edit mode and active tab from the controls panel."
        >
          <div className="-mx-4 -mt-4 rounded-t-lg overflow-hidden border border-border">
            <AppHeader
              activeNav={activeNav}
              tripName={showTrip ? "Japan 2026" : undefined}
              tripProgress={showTrip ? "Day 4 of 21" : undefined}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              editMode={editMode}
              onToggleEditMode={() => setEditMode((v) => !v)}
              initials="ED"
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="No trip context"
          description="Only the main nav row — as seen on the home / explore pages."
        >
          <div className="-mx-4 -mt-4 rounded-t-lg overflow-hidden border border-border">
            <AppHeader activeNav="trips" initials="ED" />
          </div>
        </StoryFrame>

        {/* ── Mobile simulation via iframe ── */}
        <StoryFrame
          name="Mobile · 390px"
          description="Real 390px viewport inside an iframe — hamburger and drawer behave as on a real device."
        >
          <iframe
            src="/dev/app-header/mobile-preview"
            className="mx-auto rounded-lg border border-border block"
            style={{ width: 390, height: 220 }}
            title="AppHeader mobile preview"
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}
