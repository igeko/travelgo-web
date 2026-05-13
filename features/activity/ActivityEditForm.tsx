"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SoftField } from "@/components/ui/SoftField";
import { CyclePill, type CycleOption } from "@/components/ui/CyclePill";
import { PeriodBar, DEFAULT_PERIODS, type Period } from "@/components/ui/PeriodBar";
import { BudgetInput, type Currency } from "@/components/ui/BudgetInput";
import { AddressField, type PlaceResult } from "@/components/ui/AddressField";
import { IconTrash, IconX } from "@/components/ui/icons";
import type { ActivityStatus } from "@/components/ui/StatusBadge";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

export type ActivityData = {
  title: string;
  description: string;
  status: ActivityStatus | null;
  /** Period id: "morning" | "afternoon" | "evening" | "night" */
  period: string;
  /** Hour 0–23, undefined = no specific time */
  hour: number | undefined;
  /** Minute (0,5,10,…,55), undefined = no specific time */
  minute: number | undefined;
  /** Address — full PlaceResult if resolved via Google, null if none */
  place: PlaceResult | null;
  /** Budget amount */
  budgetAmount: number | undefined;
  /** Budget currency code */
  budgetCurrency: string;
};

export type ActivityEditFormProps = {
  /** Initial values. If null, the form starts empty (new activity). */
  initialData?: Partial<ActivityData>;
  /** True when editing an existing activity. Shows the Delete button. */
  isNew?: boolean;
  /** Available periods (defaults to morning/afternoon/evening/night) */
  periods?: Period[];
  /** Currencies for BudgetInput */
  currencies?: Currency[];
  /** Called with the full ActivityData when the user presses Save */
  onSave: (data: ActivityData) => void;
  /** Called when the user presses Cancel */
  onCancel: () => void;
  /** Called when the user presses Delete (only rendered when isNew=false) */
  onDelete?: () => void;
  className?: string;
};

/* ─────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS: CycleOption<ActivityStatus | null>[] = [
  { value: null,     label: "Status",      dotColor: "var(--color-ink-faint)" },
  { value: "todo",   label: "To book",     dotColor: "#e24b4a" },
  { value: "booked", label: "Booked",      dotColor: "#ef9f27" },
  { value: "paid",   label: "Paid",        dotColor: "#97c459" },
];

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "USD", symbol: "$" },
];

const ALL_HOURS = [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4];
const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

/* ─────────────────────────────────────────────────────────────────
   ActivityEditForm
───────────────────────────────────────────────────────────────── */

export function ActivityEditForm({
  initialData,
  isNew = true,
  periods = DEFAULT_PERIODS,
  currencies = DEFAULT_CURRENCIES,
  onSave,
  onCancel,
  onDelete,
  className,
}: ActivityEditFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [status, setStatus] = useState<ActivityStatus | null>(initialData?.status ?? null);
  const [period, setPeriod] = useState(initialData?.period ?? periods[0]?.id ?? "morning");
  const [hour, setHour] = useState<number | undefined>(initialData?.hour);
  const [minute, setMinute] = useState<number | undefined>(initialData?.minute);
  const [place, setPlace] = useState<PlaceResult | null>(initialData?.place ?? null);
  const [budgetAmount, setBudgetAmount] = useState<number | undefined>(initialData?.budgetAmount);
  const [budgetCurrency, setBudgetCurrency] = useState(initialData?.budgetCurrency ?? currencies[0]?.code ?? "EUR");

  const [showAddress, setShowAddress] = useState(!!initialData?.place);
  const [showBudget, setShowBudget] = useState(
    initialData?.budgetAmount !== undefined && initialData.budgetAmount > 0
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasTime = hour !== undefined && minute !== undefined;
  const activeTime = hasTime
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : undefined;
  const currentPeriodHours =
    periods.find((p) => p.id === period)?.hours ?? ALL_HOURS;

  function handlePeriodCellClick(id: string) {
    if (id === period) {
      setPickerOpen((v) => !v);
    } else {
      setPeriod(id);
      setPickerOpen(true);
      const newPeriodHours = periods.find((p) => p.id === id)?.hours;
      if (newPeriodHours && hour !== undefined && !newPeriodHours.includes(hour)) {
        setHour(undefined);
        setMinute(undefined);
      }
    }
  }

  function handleClearTime() {
    setHour(undefined);
    setMinute(undefined);
    setPickerOpen(false);
  }

  function handleSave() {
    onSave({ title, description, status, period, hour, minute, place, budgetAmount, budgetCurrency });
  }

  return (
    <div
      className={cn(
        "relative bg-surface border border-border-strong rounded-lg",
        "p-4 flex flex-col gap-3",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute -top-[7px] left-[60px] w-3 h-3 bg-surface border-t border-l border-border-strong rotate-45 z-10"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-ink-soft">
          {isNew ? "New activity" : "Edit activity"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors"
          aria-label="Close without saving"
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title + status */}
      <div className="flex gap-2.5 items-start">
        <div className="flex-1 min-w-0">
          <SoftField value={title} onChange={setTitle} label="Title" placeholder="Activity title" maxLength={80} hideCounter />
        </div>
        <CyclePill value={status} onChange={setStatus} options={STATUS_OPTIONS} className="shrink-0 self-start mt-px" />
      </div>

      {/* Description */}
      <SoftField multiline value={description} onChange={setDescription} label="Description" placeholder="Short description (optional)" maxLength={240} rows={2} />

      {/* Period + time picker */}
      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label="Select period and time"
          className="grid rounded-pill bg-surface border border-border p-0.5 gap-0.5"
          style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)` }}
        >
          {periods.map((p) => {
            const isActive = p.id === period;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodCellClick(p.id)}
                className={cn(
                  "text-center rounded-pill cursor-pointer select-none transition-colors font-sans px-1 py-[5px]",
                  isActive ? "bg-ink text-white" : "text-ink hover:bg-surface-soft",
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-[0.08em]">{p.name}</div>
                {isActive && activeTime ? (
                  <div className="text-[13px] font-medium tabular-nums tracking-[-0.01em] leading-none mt-px">{activeTime}</div>
                ) : (
                  <div className={cn("text-[9px] tabular-nums tracking-[0.04em] mt-px", isActive ? "text-white/55" : "text-ink-faint")}>{p.range}</div>
                )}
              </button>
            );
          })}
        </div>

        {pickerOpen && (
          <div className="bg-surface border border-border rounded-[18px] p-3.5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">Hour</div>
                <div className="grid grid-cols-4 gap-1">
                  {currentPeriodHours.map((h) => (
                    <button key={h} type="button" onClick={() => setHour(h)}
                      className={cn("text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                        h === hour ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft")}>
                      {String(h).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-ink-faint text-center mb-2 font-medium">Minutes</div>
                <div className="grid grid-cols-4 gap-1">
                  {MINUTES.map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setMinute(m); if (hour !== undefined) setPickerOpen(false); }}
                      className={cn("text-center py-2 text-[14px] tabular-nums rounded-pill cursor-pointer select-none transition-colors font-sans",
                        m === minute ? "bg-orange text-white font-medium" : "text-ink hover:bg-surface-soft")}>
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {hasTime && (
              <div className="flex justify-end">
                <button type="button" onClick={handleClearTime}
                  className="text-[11px] text-ink-soft underline underline-offset-2 decoration-ink/20 hover:text-[#9a3015] hover:decoration-[#9a3015] transition-colors">
                  clear time
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional: address */}
      {showAddress && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <AddressField value={place} onChange={setPlace} label="Address" placeholder="Start typing for suggestions…" showMapButton />
          </div>
          <button type="button" onClick={() => { setPlace(null); setShowAddress(false); }} aria-label="Remove address"
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Optional: budget */}
      {showBudget && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <BudgetInput amount={budgetAmount} onAmountChange={setBudgetAmount} currency={budgetCurrency} onCurrencyChange={setBudgetCurrency} currencies={currencies} label="Budget" />
          </div>
          <button type="button" onClick={() => { setBudgetAmount(undefined); setShowBudget(false); }} aria-label="Remove budget"
            className="shrink-0 w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-ink-soft hover:bg-[#fcebeb] hover:text-[#9a3015] transition-colors">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* "+ Add …" links */}
      {(!showAddress || !showBudget) && (
        <div className="flex flex-wrap gap-3.5 items-center py-1 border-t border-dashed border-border mt-0.5">
          {!showAddress && (
            <button type="button" onClick={() => setShowAddress(true)}
              className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              + Add address
            </button>
          )}
          {!showBudget && (
            <button type="button" onClick={() => setShowBudget(true)}
              className="text-[12px] text-orange-deep underline underline-offset-2 decoration-orange-deep/30 hover:decoration-orange-deep transition-colors font-sans">
              + Add budget
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-0.5">
        {!isNew && onDelete ? (
          <Button variant="ghost" tone="danger" iconOnly={false} onClick={onDelete}>
            <IconTrash />
            Delete activity
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button variant="text-only" iconOnly={false} onClick={onCancel}>Cancel</Button>
          <Button variant="solid" tone="neutral" iconOnly={false} onClick={handleSave}>
            {isNew ? "Create activity" : "Save activity"}
          </Button>
        </div>
      </div>
    </div>
  );
}
