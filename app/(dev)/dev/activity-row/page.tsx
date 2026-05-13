"use client";

import { useState } from "react";
import { ActivityRow } from "@/features/activity/ActivityRow";
import { SlotStation } from "@/features/activity/SlotStation";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";
import type { ActivityRowState } from "@/features/activity/ActivityRow";
import type { ActivityStatus } from "@/components/ui/StatusBadge";

type StatusOption = ActivityStatus | "none";

export default function ActivityRowStories() {
  // Debugger state
  const [state, setState] = useState<ActivityRowState>("default");
  const [status, setStatus] = useState<StatusOption>("booked");
  const [showDescription, setShowDescription] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showCost, setShowCost] = useState(true);

  const groups: ControlGroup[] = [
    {
      title: "State",
      controls: [
        {
          kind: "radio",
          id: "state",
          label: "Visual state",
          value: state,
          onChange: (v) => setState(v as ActivityRowState),
          options: [
            { value: "default", label: "Default" },
            { value: "now", label: "Now" },
            { value: "selected", label: "Selected" },
            { value: "in-edit", label: "In edit" },
          ],
        },
      ],
    },
    {
      title: "Booking",
      controls: [
        {
          kind: "radio",
          id: "status",
          label: "Status badge",
          value: status,
          onChange: (v) => setStatus(v as StatusOption),
          options: [
            { value: "none", label: "None" },
            { value: "todo", label: "To book" },
            { value: "booked", label: "Booked" },
            { value: "paid", label: "Paid" },
          ],
        },
      ],
    },
    {
      title: "Optional fields",
      controls: [
        {
          kind: "toggle",
          id: "desc",
          label: "Description",
          value: showDescription,
          onChange: setShowDescription,
        },
        {
          kind: "toggle",
          id: "loc",
          label: "Location + pin",
          value: showLocation,
          onChange: setShowLocation,
        },
        {
          kind: "toggle",
          id: "cost",
          label: "Cost",
          value: showCost,
          onChange: setShowCost,
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
        title="ActivityRow"
        description="Daily timeline activity row. Use the controls on the right to switch state/status and toggle optional fields. Hover behavior is tested directly with the mouse."
      >
        <StoryFrame
          name="Debugger"
          description="Interactive row. Tweak controls on the right to see the component react in real time."
        >
          <ActivityRow
            time="12:30"
            title="Sushi and kaisen-don at Tsukiji"
            description={
              showDescription
                ? "At Tsukiji outer market you sit at the counter of a kaisen-don — rice and the day's raw fish. The Sushi Dai family has served the same breakfast since 1970."
                : undefined
            }
            pin={showLocation ? 3 : undefined}
            location={showLocation ? "Tsukiji, Tokyo" : undefined}
            cost={showCost ? "¥3,200" : undefined}
            costApprox={showCost ? "≈ €20" : undefined}
            status={status === "none" ? undefined : status}
            state={state}
          />
        </StoryFrame>

        <StoryFrame
          name="Composition · sample timeline"
          description="Multiple rows in sequence with SlotStation as separators — faithful design reproduction. Static, independent from the controls."
        >
          <div className="flex flex-col">
            <SlotStation label="Morning" count={3} />
            <ActivityRow
              time="09:00"
              title="Kabukiza visit"
              description="Tokyo's main kabuki theater. The exterior with its curtains is already worth a stop; anyone wanting in can buy a single-act ticket at the side box office."
              pin={1}
              location="Higashi-Ginza"
              cost="¥1,800"
              costApprox="≈ €11"
              status="paid"
            />
            <ActivityRow
              time="10:30"
              title="A walk through Ginza"
              description="From historic architecture to luxury boutiques. 5 stops in 2.4 km — from the Wako clock to the jellyfish-facade Louis Vuitton."
              pin={2}
              location="Ginza, Tokyo"
            />
            <ActivityRow
              time="12:30"
              title="Sushi and kaisen-don at Tsukiji"
              description="At Tsukiji outer market you sit at the counter of a kaisen-don — rice and the day's raw fish."
              pin={3}
              location="Tsukiji, Tokyo"
              cost="¥3,200"
              costApprox="≈ €20"
              status="booked"
              state="now"
            />
            <SlotStation label="Afternoon" count={1} />
            <ActivityRow
              time="15:00"
              title="Hama-Rikyu garden"
              description="The Tokugawa clan's oasis in the heart of the city — a pond with a floating tea house, peonies, and a harbor view few tourists discover."
              pin={4}
              location="Shiodome, Tokyo"
              cost="¥300"
              costApprox="≈ €2"
              status="todo"
            />
            <SlotStation label="Evening" count={1} />
            <ActivityRow
              time="19:30"
              title="Dinner in Roppongi"
              description="Robatayaki and neighborhood bars — the area lights up after sunset, between tiny izakayas and discreet upper-floor cocktail bars."
              pin={5}
              location="Roppongi, Tokyo"
              cost="¥6,500"
              costApprox="≈ €40"
              status="booked"
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
