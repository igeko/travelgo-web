"use client";

import { useState } from "react";
import {
  TripInfo,
  type TripField,
  type TripEditTarget,
  type TripStamp,
} from "@/features/trip/TripInfo";
import { IconMapPin, IconSparkles, IconUsers } from "@/components/ui/icons";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

type Fields = Record<TripField, string | null>;

const SUGGESTIONS: Record<TripField, TripStamp[]> = {
  where: [
    { name: "Giappone · solo Tokyo", meta: "megalopoli · quartieri" },
    { name: "Giappone · Tokyo + natura", meta: "città + Alpi + onsen" },
    { name: "Giappone · Kansai", meta: "Kyoto · Osaka · Nara" },
  ],
  when: [
    { name: "10 → 19 luglio", meta: "10 notti · alta stagione" },
    { name: "Prima metà di maggio", meta: "clima mite · meno folla" },
  ],
  who: [
    { name: "2 · couple", meta: "viaggio di coppia" },
    { name: "Famiglia · 2+2", meta: "con bambini" },
  ],
  vibe: [
    { name: "foodie · low-walk · natura", meta: "cibo + ritmo lento" },
    { name: "città · cultura · notturna", meta: "musei + nightlife" },
  ],
};

export default function TripInfoStories() {
  return (
    <StoryPage
      title="TripInfo"
      description="«Il biglietto» del viaggio. Card identità sopra la DayList: si compila parlando con Go, è inline-editabile senza form-feeling (righe = SoftField variant='inline'), e si chiude come biglietto strappato. Componente controlled."
    >
      <StoryFrame
        name="Live · empty → edit → collapsed"
        description="Clicca una riga per editarla: solo la label diventa arancio + caret. Enter/blur salva, Esc annulla, click su uno stamp committa il suggerimento. Il toggle in basso chiude il biglietto."
      >
        <LiveDemo />
      </StoryFrame>

      <StoryFrame
        name="Empty"
        description="Pre-conversazione: nome italic faint, placeholder gentili, footer editoriale."
      >
        <div className="max-w-[300px]">
          <TripInfo
            tripName={null}
            dateRange={null}
            fields={{ where: null, when: null, who: null, vibe: null }}
          />
        </div>
      </StoryFrame>

      <StoryFrame
        name="Edit · Where attivo con suggerimenti"
        description="Campo Where in editing con gli stamp di Go sotto la lista e il foot con le scorciatoie."
      >
        <div className="max-w-[300px]">
          <TripInfo
            tripName="Giappone 2026"
            dateRange="10 → 19 luglio"
            fields={{
              where: "Giappone",
              when: "10 → 19 luglio",
              who: "2 · couple",
              vibe: "foodie · low-walk · natura",
            }}
            editingField="where"
            suggestions={SUGGESTIONS.where}
          />
        </div>
      </StoryFrame>

      <StoryFrame
        name="Collapsed · biglietto strappato"
        description="Testata intatta + riga inline condensata. Tutta la card è cliccabile per riaprire."
      >
        <div className="max-w-[300px]">
          <TripInfo
            tripName="Giappone 2026"
            dateRange="10 → 19 luglio"
            fields={{
              where: "Giappone",
              when: "10 → 19 luglio",
              who: "2 · couple",
              vibe: "foodie · natura",
            }}
            collapsed
            summary={[
              { icon: <IconMapPin />, value: "4 zone" },
              { icon: <IconUsers />, value: "2 traveler" },
              { icon: <IconSparkles />, value: "foodie · natura" },
            ]}
          />
        </div>
      </StoryFrame>
    </StoryPage>
  );
}

function LiveDemo() {
  const [fields, setFields] = useState<Fields>({
    where: null,
    when: null,
    who: null,
    vibe: null,
  });
  const [tripName, setTripName] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<TripEditTarget | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const groups: ControlGroup[] = [
    {
      title: "State",
      controls: [
        {
          kind: "toggle",
          id: "collapsed",
          label: "Collapsed",
          value: collapsed,
          onChange: setCollapsed,
        },
        {
          kind: "custom",
          id: "reset",
          label: "Reset fields",
          render: () => (
            <button
              type="button"
              onClick={() => {
                setFields({ where: null, when: null, who: null, vibe: null });
                setTripName(null);
                setEditingField(null);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-mini text-ink hover:bg-surface-soft"
            >
              Reset
            </button>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <div className="max-w-[300px]">
        <TripInfo
          tripName={tripName}
          dateRange={fields.when}
          fields={fields}
          editingField={editingField}
          suggestions={
            editingField && editingField !== "name"
              ? SUGGESTIONS[editingField]
              : null
          }
          collapsed={collapsed}
          summary={[
            { icon: <IconMapPin />, value: fields.where ?? "—" },
            { icon: <IconUsers />, value: fields.who ?? "—" },
            { icon: <IconSparkles />, value: fields.vibe ?? "—" },
          ]}
          onFieldClick={setEditingField}
          onCommit={(target, value) => {
            if (target === "name") setTripName(value || null);
            else setFields((prev) => ({ ...prev, [target]: value || null }));
            setEditingField(null);
          }}
          onCancel={() => setEditingField(null)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>
    </>
  );
}
