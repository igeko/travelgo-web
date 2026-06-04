"use client";

import { useState } from "react";
import { Quote, type QuoteAccent, type QuoteSize } from "@/components/ui/Quote";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";

const SAMPLE_LEAD =
  "Una giornata di passeggiate dal cuore aristocratico di Edo al porto: dalle boutique di Ginza al mercato del pesce di Tsukiji, fermandoci nei giardini di Hama-Rikyū prima del tramonto.";

const SAMPLE_NOTE = "Si cammina parecchio — scarpe comode e una bottiglia d'acqua.";

export default function QuoteStories() {
  const [lead]    = useState(SAMPLE_LEAD);
  const [note]    = useState(SAMPLE_NOTE);
  const [accent,  setAccent]  = useState<QuoteAccent>("orange");
  const [size,    setSize]    = useState<QuoteSize>("md");
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
    {
      title: "Style",
      controls: [
        {
          kind: "radio",
          id: "accent",
          label: "Accent color",
          value: accent,
          onChange: (v) => setAccent(v as QuoteAccent),
          options: [
            { value: "orange", label: "Orange" },
            { value: "lime",   label: "Lime" },
            { value: "ink",    label: "Ink" },
          ],
        },
        {
          kind: "radio",
          id: "size",
          label: "Size",
          value: size,
          onChange: (v) => setSize(v as QuoteSize),
          options: [
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
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
        title="Quote"
        description="Blockquote with a colored left border. Lead text in serif italic, optional practical note below. Used for day summaries and journal excerpts."
      >
        {/* Live sandbox */}
        <StoryFrame
          name="Interactive"
          description="Adjust accent, size and note visibility from the controls panel."
        >
          <Quote
            lead={lead}
            note={showNote ? note : undefined}
            accent={accent}
            size={size}
          />
        </StoryFrame>

        {/* Accent variants */}
        <StoryFrame
          name="Accent variants"
          description="Orange (default) · Lime · Ink"
        >
          <div className="flex flex-col gap-6">
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} accent="orange" />
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} accent="lime" />
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} accent="ink" />
          </div>
        </StoryFrame>

        {/* Size variants */}
        <StoryFrame
          name="Size variants"
          description="sm · md (default) · lg"
        >
          <div className="flex flex-col gap-6">
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} size="sm" />
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} size="md" />
            <Quote lead={SAMPLE_LEAD} note={SAMPLE_NOTE} size="lg" />
          </div>
        </StoryFrame>

        {/* Lead only */}
        <StoryFrame
          name="Lead only"
          description="Without the practical note — e.g. for short journal entries."
        >
          <Quote lead="Una giornata leggera, quasi sospesa nel tempo." />
        </StoryFrame>

        {/* Developer reference */}
        <DocsFrame>
          <PropsTable rows={[
            { prop: "lead",      type: "string",                          required: true,  description: "Main quote text — rendered in serif italic." },
            { prop: "note",      type: "string",                          description: "Optional secondary line below the lead (e.g. practical reminder, attribution)." },
            { prop: "accent",    type: '"orange" | "lime" | "ink"',       defaultValue: '"orange"', description: "Left border accent color." },
            { prop: "size",      type: '"sm" | "md" | "lg"',              defaultValue: '"md"',     description: "Text size preset. sm=15px · md=18px · lg=22px." },
            { prop: "className", type: "string",                          description: "Extra classes applied to the <blockquote> element." },
          ]} />

          <CodeBlock code={`
import { Quote } from "@/components/ui/Quote";

// Minimal — lead only
<Quote lead="Una giornata leggera, quasi sospesa nel tempo." />

// With practical note
<Quote
  lead="Una giornata di passeggiate dal cuore aristocratico di Edo al porto."
  note="Si cammina parecchio — scarpe comode e una bottiglia d'acqua."
/>

// Custom accent and size
<Quote
  lead="Il Fuji visto dall'alba, avvolto nella nebbia."
  accent="lime"
  size="lg"
/>
          `} />
        </DocsFrame>
      </StoryPage>
    </>
  );
}
