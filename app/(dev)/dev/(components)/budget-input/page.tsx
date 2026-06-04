"use client";

import { useState } from "react";
import {
  BudgetInput,
  type Currency,
} from "@/components/ui/BudgetInput";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

/* Currency presets for the sandbox */
const PRESETS: Record<string, Currency[]> = {
  "eur-jpy": [
    { code: "EUR", symbol: "€" },
    { code: "JPY", symbol: "¥" },
  ],
  "eur-usd-gbp": [
    { code: "EUR", symbol: "€" },
    { code: "USD", symbol: "$" },
    { code: "GBP", symbol: "£" },
  ],
  "eur-only": [{ code: "EUR", symbol: "€" }],
};

type PresetKey = keyof typeof PRESETS;

export default function BudgetInputStories() {
  const [amount, setAmount] = useState<number | undefined>(8400);
  const [currency, setCurrency] = useState("JPY");
  const [presetKey, setPresetKey] = useState<PresetKey>("eur-jpy");
  const [showConversion, setShowConversion] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [placeholder, setPlaceholder] = useState("0");
  const [label, setLabel] = useState("Day budget");

  const currencies = PRESETS[presetKey];

  // If the active preset doesn't include the selected code, snap to the first
  const safeCurrency =
    currencies.find((c) => c.code === currency)?.code ?? currencies[0].code;

  // Fake conversion for the debugger — only when both amount and currency are
  // sensible. The real conversion logic lives in the consumer.
  const conversion =
    showConversion && amount !== undefined && amount > 0
      ? fakeConversion(amount, safeCurrency)
      : undefined;

  const groups: ControlGroup[] = [
    {
      title: "Value",
      controls: [
        {
          kind: "number",
          id: "amount",
          label: "Amount",
          value: amount ?? 0,
          min: 0,
          onChange: (v) => setAmount(v),
        },
        {
          kind: "text",
          id: "placeholder",
          label: "Placeholder",
          value: placeholder,
          placeholder: "0",
          onChange: setPlaceholder,
        },
        {
          kind: "text",
          id: "label",
          label: "Floating label",
          value: label,
          placeholder: "(empty = no label)",
          onChange: setLabel,
        },
      ],
    },
    {
      title: "Currencies",
      controls: [
        {
          kind: "radio",
          id: "preset",
          label: "Available currencies (preset)",
          value: presetKey,
          onChange: (v) => setPresetKey(v as PresetKey),
          options: [
            { value: "eur-jpy", label: "EUR / JPY" },
            { value: "eur-usd-gbp", label: "EUR / USD / GBP" },
            { value: "eur-only", label: "EUR only" },
          ],
        },
        {
          kind: "radio",
          id: "currency",
          label: "Current currency",
          value: safeCurrency,
          onChange: setCurrency,
          options: currencies.map((c) => ({
            value: c.code,
            label: `${c.symbol} ${c.code}`,
          })),
        },
      ],
    },
    {
      title: "Display",
      controls: [
        {
          kind: "toggle",
          id: "conversion",
          label: "Show conversion",
          value: showConversion,
          onChange: setShowConversion,
        },
        {
          kind: "toggle",
          id: "disabled",
          label: "Disabled",
          value: disabled,
          onChange: setDisabled,
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
        title="BudgetInput"
        description="Pill input combining amount and currency. The currency list is fully configurable; clicking the dark pill cycles through it. Width adapts to the container — only a min-width prevents the input from collapsing."
      >
        <StoryFrame
          name="Debugger"
          description="Interactive component. Tweak the controls on the right; click the dark currency pill to cycle. Focus the input to see the orange focus ring."
        >
          <BudgetInput
            amount={amount}
            onAmountChange={setAmount}
            currency={safeCurrency}
            onCurrencyChange={setCurrency}
            currencies={currencies}
            conversion={conversion}
            label={label || undefined}
            placeholder={placeholder}
            disabled={disabled}
          />
        </StoryFrame>

        <StoryFrame
          name="Width adapts to container"
          description="No max-width. The component grows with the parent and only ensures a min-width so the input stays usable."
        >
          <div className="flex flex-col gap-3">
            <div className="w-[220px] border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Container 220px
              </div>
              <BudgetInput
                amount={42}
                onAmountChange={() => {}}
                currency="EUR"
                onCurrencyChange={() => {}}
                currencies={PRESETS["eur-jpy"]}
              />
            </div>
            <div className="w-full border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Full-width container
              </div>
              <BudgetInput
                amount={1280}
                onAmountChange={() => {}}
                currency="EUR"
                onCurrencyChange={() => {}}
                currencies={PRESETS["eur-jpy"]}
                conversion="≈ ¥192,000 · estimated"
              />
            </div>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Single-currency mode"
          description="When `currencies` has a single entry, the pill renders without the chevron and isn't clickable."
        >
          <BudgetInput
            amount={280}
            onAmountChange={() => {}}
            currency="EUR"
            onCurrencyChange={() => {}}
            currencies={PRESETS["eur-only"]}
          />
        </StoryFrame>

        <StoryFrame
          name="Empty state"
          description="amount=undefined renders the placeholder. The consumer is responsible for deciding when to show the component vs. an 'add budget' affordance."
        >
          <BudgetInput
            amount={undefined}
            onAmountChange={() => {}}
            currency="EUR"
            onCurrencyChange={() => {}}
            currencies={PRESETS["eur-jpy"]}
            placeholder="0"
          />
        </StoryFrame>
      </StoryPage>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Throwaway formatter for the sandbox.
   Real conversion lives in the consumer of <BudgetInput>.
───────────────────────────────────────────────────────────────── */
function fakeConversion(amount: number, code: string): string {
  // Hardcoded rates relative to EUR — order of magnitude only
  const ratesToEUR: Record<string, number> = {
    EUR: 1,
    JPY: 1 / 160,
    USD: 0.92,
    GBP: 1.18,
  };
  const eur = amount * (ratesToEUR[code] ?? 1);
  if (code === "EUR") {
    // If already EUR, show approximate JPY as the secondary view
    const jpy = Math.round(eur / ratesToEUR.JPY);
    return `≈ ¥${jpy.toLocaleString("en-US")}`;
  }
  return `≈ €${Math.round(eur).toLocaleString("en-US")}`;
}
