"use client";

import { useState } from "react";
import { StoryPage, StoryFrame } from "../_components/StoryFrame";
import { TimeField } from "@/components/ui/TimeField";

export default function TimeFieldStories() {
  const [a, setA] = useState<string | null>("09:30");
  const [b, setB] = useState<string | null>(null);

  return (
    <StoryPage
      title="TimeField"
      description="Time picker compatto (HH:MM) · pill trigger + popover con griglia ore/minuti, stesso linguaggio visivo del picker di PeriodBar. Controllato: value 'HH:MM' | null."
    >
      <StoryFrame name="Con valore" description="Clicca per aprire la griglia. Scegli ora poi minuti; «clear time» azzera.">
        <div className="flex items-center gap-4">
          <TimeField value={a} onChange={setA} />
          <span className="text-mini text-ink-faint font-mono">value: {a ?? "null"}</span>
        </div>
      </StoryFrame>

      <StoryFrame name="Vuoto" description="Stato senza orario impostato.">
        <div className="flex items-center gap-4">
          <TimeField value={b} onChange={setB} />
          <span className="text-mini text-ink-faint font-mono">value: {b ?? "null"}</span>
        </div>
      </StoryFrame>
    </StoryPage>
  );
}
