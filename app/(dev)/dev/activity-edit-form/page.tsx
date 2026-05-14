"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import {
  ActivityEditForm,
  type ActivityData,
} from "@/features/activity/ActivityEditForm";
import { ActivityRow } from "@/features/activity/ActivityRow";

export default function ActivityEditFormStories() {
  // ── Debugger controls ──
  const [isNew, setIsNew] = useState(true);
  const [showWithRow, setShowWithRow] = useState(false);

  // ── Last saved output ──
  const [lastSaved, setLastSaved] = useState<ActivityData | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Mode",
      controls: [
        {
          kind: "toggle",
          id: "is-new",
          label: "New activity (hides Delete)",
          value: isNew,
          onChange: setIsNew,
        },
        {
          kind: "toggle",
          id: "show-with-row",
          label: "Show with ActivityRow above",
          value: showWithRow,
          onChange: setShowWithRow,
        },
      ],
    },
  ];

  const prefilled: Partial<ActivityData> = {
    title: "Senso-ji Temple visit",
    description: "Early morning visit before the crowds arrive.",
    status: "booked",
    period: "morning",
    hour: 9,
    minute: 0,
  };

  function handleSave(data: ActivityData) {
    setLastSaved(data);
    setLastAction("saved");
  }

  function handleCancel() {
    setLastAction("cancelled");
  }

  function handleDelete() {
    setLastAction("deleted");
  }

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="ActivityEditForm"
        description="Self-contained edit form for an activity. State is managed internally; the parent receives data only via onSave(). Toggle 'Show with ActivityRow' to see the full in-context layout."
      >
        {/* ── Debugger ── */}
        <StoryFrame
          name="Debugger"
          description="Try adding address/budget, picking a time, cycling the status. The output panel below shows what onSave() would receive."
        >
          <div className="flex flex-col gap-3 w-full max-w-xl">
            {/* Optional: ActivityRow in "in-edit" state above the form */}
            {showWithRow && (
              <ActivityRow
                time="09:00"
                title="Senso-ji Temple visit"
                description="Early morning visit before the crowds arrive."
                status="booked"
                state="selected"
                location="Asakusa, Tokyo"
                pin={2}
              />
            )}

            <ActivityEditForm
              key={`${isNew}`}
              isNew={isNew}
              initialData={isNew ? undefined : prefilled}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />

            {/* Callback output inspector */}
            {(lastSaved || lastAction) && (
              <div className="rounded-lg bg-surface-soft border border-border p-4 text-[12px] font-mono text-ink-soft leading-relaxed">
                <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
                  Last callback
                </div>
                <div className="mb-1">
                  <span className="text-ink-faint">action: </span>
                  <span className="text-ink font-medium">{lastAction}</span>
                </div>
                {lastSaved && lastAction === "saved" && (
                  <>
                    <div><span className="text-ink-faint">title: </span><span className="text-ink">{lastSaved.title || "—"}</span></div>
                    <div><span className="text-ink-faint">description: </span><span className="text-ink">{lastSaved.description || "—"}</span></div>
                    <div><span className="text-ink-faint">status: </span><span className="text-ink">{lastSaved.status ?? "null"}</span></div>
                    <div><span className="text-ink-faint">period: </span><span className="text-ink">{lastSaved.period}</span></div>
                    <div><span className="text-ink-faint">time: </span><span className="text-ink">{lastSaved.hour !== undefined ? `${String(lastSaved.hour).padStart(2,"0")}:${String(lastSaved.minute).padStart(2,"0")}` : "—"}</span></div>
                    <div><span className="text-ink-faint">place: </span><span className="text-ink">{lastSaved.place?.formatted ?? "—"}</span></div>
                    <div><span className="text-ink-faint">budget: </span><span className="text-ink">{lastSaved.budgetAmount !== undefined ? `${lastSaved.budgetAmount} ${lastSaved.budgetCurrency}` : "—"}</span></div>
                  </>
                )}
              </div>
            )}
          </div>
        </StoryFrame>

        {/* ── Pre-filled existing activity ── */}
        <StoryFrame
          name="Edit existing (with ActivityRow)"
          description="How the form looks when editing an existing activity. The row above shows 'in-edit' state as a visual anchor."
        >
          <div className="flex flex-col gap-3 w-full max-w-xl">
            <ActivityRow
              time="09:00"
              title="Senso-ji Temple visit"
              description="Early morning visit before the crowds arrive."
              status="booked"
              state="selected"
              location="Asakusa, Tokyo"
              pin={2}
            />
            <ActivityEditForm
              isNew={false}
              initialData={prefilled}
              onSave={() => {}}
              onCancel={() => {}}
              onDelete={() => {}}
            />
          </div>
        </StoryFrame>

        {/* ── New activity (empty) ── */}
        <StoryFrame
          name="New activity (empty)"
          description="Empty form for creating a new activity. No Delete button."
        >
          <div className="w-full max-w-xl">
            <ActivityEditForm
              isNew
              onSave={() => {}}
              onCancel={() => {}}
            />
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}
