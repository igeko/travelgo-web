"use client";

import { IconChevronDown } from "./icons";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   BudgetInput · pill input for amount + currency.
   Layout:
     [symbol]  [amount input]  [conversion (opt)]  [currency pill]
   Width adapts to the container; only a min-width prevents
   the input from collapsing.
───────────────────────────────────────────────────────────────── */

export type Currency = {
  /** Currency code, e.g. "EUR", "JPY", "USD" */
  code: string;
  /** Currency symbol, e.g. "€", "¥", "$" */
  symbol: string;
};

export type BudgetInputProps = {
  /** Amount value · number when valid, undefined when empty */
  amount: number | undefined;
  onAmountChange: (value: number | undefined) => void;

  /** Currency code currently selected */
  currency: string;
  /** Called when the user cycles to the next currency */
  onCurrencyChange: (code: string) => void;
  /**
   * Currencies available for cycling. The order defines the cycle order.
   * Clicking the pill moves to the next one (wraps around).
   * Must contain at least one entry.
   */
  currencies: Currency[];

  /** Pre-formatted conversion string (e.g. "≈ ¥4,500" or "≈ €20 · /night") */
  conversion?: string;

  /** Floating label that becomes visible on focus (same pattern as SoftField) */
  label?: string;

  /** Placeholder for the amount input (default "0") */
  placeholder?: string;

  /** Disables the whole control */
  disabled?: boolean;

  /** Extra classes on the pill wrapper */
  className?: string;
};

export function BudgetInput({
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  currencies,
  conversion,
  label,
  placeholder = "0",
  disabled,
  className,
}: BudgetInputProps) {
  if (currencies.length === 0) {
    // Guardrail · we render nothing in this misconfiguration to avoid
    // a confusing UI; the consumer should always pass at least one currency.
    return null;
  }

  // Resolve current currency (fallback to first if `currency` not found)
  const currentIndex = Math.max(
    0,
    currencies.findIndex((c) => c.code === currency),
  );
  const current = currencies[currentIndex];

  const handleCycleCurrency = () => {
    if (disabled || currencies.length <= 1) return;
    const next = currencies[(currentIndex + 1) % currencies.length];
    onCurrencyChange(next.code);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onAmountChange(undefined);
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) onAmountChange(n);
  };

  return (
    <div
      className={cn(
        // `group` so the floating label can react to focus-within on this wrapper
        "group relative flex items-center gap-1.5 rounded-pill px-[18px] py-2",
        "bg-surface-input border border-border",
        // Min-width — enough room for symbol, a 4-digit amount, and the currency pill
        "min-w-[180px]",
        // Interaction states
        "transition-[background,border-color,box-shadow] duration-150",
        "hover:border-border-strong",
        "focus-within:border-orange focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {/* Floating ghost label (only visible when wrapper has focus-within) */}
      {label && (
        <span
          className={cn(
            "absolute -top-2 left-4 px-1.5 bg-surface",
            "text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium",
            "opacity-0 pointer-events-none transition-opacity",
            "group-focus-within:opacity-100",
          )}
        >
          {label}
        </span>
      )}

      {/* Symbol */}
      <span className="text-meta font-medium text-ink-faint tabular-nums shrink-0">
        {current.symbol}
      </span>

      {/* Amount input · "naked" inside the pill */}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={amount ?? ""}
        onChange={handleAmountChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 min-w-0 border-0 outline-0 bg-transparent shadow-none p-0",
          "text-meta font-medium tabular-nums text-ink font-sans",
          "placeholder:text-ink-faint",
          // Remove number spinners for a cleaner look
          "[appearance:textfield]",
          "[&::-webkit-inner-spin-button]:appearance-none",
          "[&::-webkit-outer-spin-button]:appearance-none",
        )}
      />

      {/* Inline conversion (optional) */}
      {conversion && (
        <span className="text-tiny text-ink-faint whitespace-nowrap shrink-0">
          {conversion}
        </span>
      )}

      {/* Currency pill · cycles through `currencies` */}
      <button
        type="button"
        onClick={handleCycleCurrency}
        disabled={disabled || currencies.length <= 1}
        aria-label={`Change currency (current: ${current.code})`}
        title={
          currencies.length > 1
            ? "Click to change currency"
            : `Currency: ${current.code}`
        }
        className={cn(
          "inline-flex items-center gap-[3px] rounded-pill bg-ink text-white shrink-0",
          "pl-[9px] pr-[7px] py-[3px] text-micro font-medium tracking-meta",
          "transition-opacity",
          currencies.length > 1
            ? "cursor-pointer hover:opacity-90"
            : "cursor-default",
        )}
      >
        {current.code}
        {currencies.length > 1 && (
          <IconChevronDown className="w-[10px] h-[10px] opacity-60" />
        )}
      </button>
    </div>
  );
}
