"use client";

/**
 * Design sketch — Activity Duration Picker
 * URL: /design/activity-duration-picker
 *
 * Popover per impostare la durata di un'attività.
 * Range: 15 minuti → 18 ore.
 *
 * Struttura (coerente con ActivityTimePicker):
 *   - Label "Durata"
 *   - Griglia ore 0–18 (19 celle, 6 per riga + resto)
 *   - Step minuti: :00 | :15 | :30 | :45
 *     (disabilita :00 se ore = 0 — durata minima 15m)
 *   - Button "Conferma · Xh Ym" (solid/neutral/md)
 *
 * Componente target: features/activity/ActivityDurationPicker.tsx (da creare)
 * Usato in: features/activity/ActivityPanel.tsx — riga Durata
 */

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconClock } from "@/components/ui/icons";

/* ─── Tipi ────────────────────────────────────────────────────────── */
type ActivityDurationPickerProps = {
  /** Ore selezionate (0–18) */
  hours: number;
  /** Minuti selezionati (0 | 15 | 30 | 45) */
  minutes: 0 | 15 | 30 | 45;
  onConfirm?: (hours: number, minutes: 0 | 15 | 30 | 45) => void;
};

const MINUTE_STEPS = [0, 15, 30, 45] as const;
const HOURS = Array.from({ length: 19 }, (_, i) => i); // 0–18

/* ─── Helper display ──────────────────────────────────────────────── */
function formatDuration(hours: number, minutes: number): string {
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/* ─── Componente ──────────────────────────────────────────────────── */

/**
 * ActivityDurationPicker
 *
 * Durata minima: 0h 15m.
 * Quando ore = 0, il bottone :00 è disabilitato.
 *
 * Posizionare con:
 *   position: "absolute", top: triggerBottom + 6, left: triggerLeft,
 *   zIndex: z-dropdown (30)
 */
export function ActivityDurationPicker({
  hours,
  minutes,
  onConfirm,
}: ActivityDurationPickerProps) {
  const isMinZero = hours === 0 && minutes === 0;

  return (
    <div className="bg-white rounded-lg border border-border p-3 w-[220px] flex flex-col gap-3">

      {/* Label */}
      <span className="text-[10px] font-semibold tracking-eyebrow uppercase text-ink/40">
        Durata
      </span>

      {/* Griglia ore 0–18 */}
      <div>
        <span className="text-[9px] tracking-eyebrow uppercase text-ink/30 block mb-1">
          Ore
        </span>
        <div className="grid grid-cols-6 gap-[3px]">
          {HOURS.map((h) => (
            <button
              key={h}
              className={cn(
                "py-[5px] text-center text-[12px] rounded transition-colors",
                h === hours
                  ? "bg-ink text-white font-semibold"
                  : "text-ink/55 hover:bg-surface-soft"
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Step minuti */}
      <div>
        <span className="text-[9px] tracking-eyebrow uppercase text-ink/30 block mb-1">
          Minuti
        </span>
        <div className="flex gap-1">
          {MINUTE_STEPS.map((m) => {
            const disabled = hours === 0 && m === 0;
            return (
              <button
                key={m}
                disabled={disabled}
                className={cn(
                  "flex-1 py-[5px] text-center text-[12px] rounded-md transition-colors",
                  m === minutes && !disabled
                    ? "bg-ink text-white font-semibold"
                    : "bg-surface-soft text-ink/55 hover:bg-surface",
                  disabled && "opacity-30 cursor-not-allowed"
                )}
              >
                :{String(m).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conferma */}
      <Button
        variant="solid"
        tone="neutral"
        size="md"
        iconOnly={false}
        disabled={isMinZero}
        className="w-full"
        onClick={() => onConfirm?.(hours, minutes)}
      >
        Conferma · {formatDuration(hours, minutes)}
      </Button>

    </div>
  );
}

/* ─── Riga trigger ────────────────────────────────────────────────── */

type DurationRowProps = {
  hours: number;
  minutes: number;
  active?: boolean;
  onClick?: () => void;
};

export function ActivityDurationRow({
  hours,
  minutes,
  active,
  onClick,
}: DurationRowProps) {
  return (
    <div className="flex items-center gap-2 py-[9px] border-b border-[rgba(13,44,61,0.1)] last:border-0">
      <IconClock size={15} className="text-ink/40 flex-shrink-0" />
      <div className="flex flex-col flex-1">
        <span className="text-[10px] tracking-eyebrow uppercase text-ink/38">
          Durata
        </span>
        <button
          onClick={onClick}
          className={cn(
            "text-[14px] font-semibold text-ink leading-tight w-fit",
            "border-b transition-colors",
            active
              ? "text-primary border-primary"
              : "border-transparent hover:border-primary/50"
          )}
        >
          {formatDuration(hours, minutes)}
        </button>
      </div>
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * DURATA MINIMA
 * -------------
 * 0h + :00 non è valido — disabilitare :00 quando ore = 0.
 * La durata minima selezionabile è 0h 15m.
 *
 * DURATA MASSIMA
 * --------------
 * 18h — copre ferry notturni, drive lunghi, giornate complete.
 * "Full day" convenzionale ≈ 8–10h.
 *
 * FORMATO OUTPUT
 * --------------
 * Salvare come minuti interi: hours * 60 + minutes.
 * Corrisponde al campo `duration_min` su scheduled_activities.
 *
 * CONSISTENZA CON TIME PICKER
 * ----------------------------
 * Stessa struttura visiva (griglia + step + Button):
 *   → ActivityTimePicker per orario arrivo/partenza
 *   → ActivityDurationPicker per la durata
 * Entrambi vanno nel pannello ActivityPanel.tsx.
 *
 * POSIZIONAMENTO
 * --------------
 * Floating assoluto — z-dropdown (30).
 * Chiudere su: Conferma | Escape | useClickOutside.
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

export default function ActivityDurationPickerPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-xl mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · activity panel
          </p>
          <h1 className="text-[22px] font-semibold text-ink">
            Activity Duration Picker
          </h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Popover per impostare la durata di un'attività. Range 15m–18h.
            Stessa struttura del Time Picker per coerenza visiva.
          </p>
        </div>

        {/* Preview stati */}
        <section className="space-y-6">

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              2h 15m (picker aperto)
            </p>
            <div className="bg-white rounded-lg border border-border px-3 max-w-xs">
              <ActivityDurationRow hours={2} minutes={15} active />
            </div>
            <div className="mt-2 max-w-xs">
              <ActivityDurationPicker hours={2} minutes={15} />
            </div>
          </div>

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              0h 15m — durata minima (notare :00 disabilitato)
            </p>
            <div className="mt-2 max-w-xs">
              <ActivityDurationPicker hours={0} minutes={15} />
            </div>
          </div>

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              18h — durata massima
            </p>
            <div className="mt-2 max-w-xs">
              <ActivityDurationPicker hours={18} minutes={0} />
            </div>
          </div>

        </section>

        {/* Note developer */}
        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Note per il developer
          </h2>
          <div className="space-y-3">
            {[
              { label: "File target", value: "features/activity/ActivityDurationPicker.tsx (da creare)" },
              { label: "Trigger", value: "features/activity/ActivityDurationRow.tsx (da creare)" },
              { label: "Usato in", value: "features/activity/ActivityPanel.tsx" },
              { label: "Output", value: "hours * 60 + minutes → duration_min (int)" },
              { label: "Min", value: "0h 15m — :00 disabled quando ore = 0" },
              { label: "Max", value: "18h 00m" },
              { label: "Ore", value: "0–18 (19 celle, 6 colonne)" },
              { label: "Minuti", value: "Step fissi: :00 :15 :30 :45" },
              { label: "Chiusura", value: "Conferma | Escape | useClickOutside" },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-4 text-[13px]">
                <span className="w-36 flex-shrink-0 font-medium text-ink/50">{label}</span>
                <span className="text-ink/80">{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
