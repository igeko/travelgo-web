"use client";

import { useState } from "react";
import { DayIncipit } from "@/features/day/DayIncipit";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";

const SAMPLE_LEAD =
  "La città si rivela nei dettagli: un tempio nascosto tra i grattacieli, un mercatino che apre all'alba, il rumore ordinato della folla.";

const SAMPLE_NOTE = "Mattina ideale per templi e parchi, shopping e torre nel pomeriggio.";

const SAMPLES = [
  {
    lead: "Una giornata di passeggiate tra vicoli silenziosi, fermandosi nei posti dove la luce cambia all'improvviso.",
    note: "Pomeriggio buono per un tè · cena leggera vicino al fiume.",
  },
  {
    lead: "Mare aperto, scogliera ripida, paesi che si arrampicano. Oggi si va piano, una cosa alla volta.",
    note: "Crema solare e scarpe da scoglio. Ristorante prenotato per le 20.",
  },
  {
    lead: "Un giorno leggero, quasi sospeso nel tempo.",
    note: undefined,
  },
];

export default function DayIncipitStories() {
  const [lead] = useState(SAMPLE_LEAD);
  const [note] = useState(SAMPLE_NOTE);
  const [showNote, setShowNote] = useState(true);

  const groups: ControlGroup[] = [
    {
      title: "Content",
      controls: [
        {
          kind: "toggle",
          id: "show-note",
          label: "Show note",
          value: showNote,
          onChange: setShowNote,
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
        title="DayIncipit"
        description="Voce di Go + riassunto del giorno in un solo blocco: GoAvatar (五) a sinistra, corpo Quote (lead + note) e CTA conversazionale 'Chiedi a me.' con parole rotanti a destra. Unifica Quote e GoLaunchTrigger."
      >
        {/* Live sandbox */}
        <StoryFrame
          name="Interactive"
          description="Toggle the practical note from the controls panel. Hover the CTA to see the underline + arrow."
        >
          <DayIncipit
            lead={lead}
            note={showNote ? note : undefined}
            onAsk={() => alert("onAsk → apri Go nel contesto host")}
          />
        </StoryFrame>

        {/* Copy variants */}
        <StoryFrame
          name="Copy variants"
          description="Stessa anatomia, giornate diverse — con e senza nota pratica."
        >
          <div className="flex flex-col gap-7">
            {SAMPLES.map((s, i) => (
              <DayIncipit key={i} lead={s.lead} note={s.note} />
            ))}
          </div>
        </StoryFrame>

        {/* Developer reference */}
        <DocsFrame>
          <PropsTable rows={[
            { prop: "lead",      type: "string",   required: true, description: "Day summary — rendered in serif italic (Quote body)." },
            { prop: "note",      type: "string",   description: "Optional practical note below the lead." },
            { prop: "words",     type: "string[]", description: "Rotating words for the CTA. Defaults to the 4 DayIncipit i18n strings. Tuned for exactly 4 entries." },
            { prop: "onAsk",     type: "() => void", description: "Called when the 'Ask me.' CTA is clicked — host opens Go." },
            { prop: "className", type: "string",   description: "Extra classes on the outer flex wrapper." },
          ]} />

          <CodeBlock code={`
import { DayIncipit } from "@/features/day/DayIncipit";

<DayIncipit
  lead={day.summary}
  note={day.notes ?? undefined}
  onAsk={() => openGo()}
/>
          `} />
        </DocsFrame>
      </StoryPage>
    </>
  );
}
