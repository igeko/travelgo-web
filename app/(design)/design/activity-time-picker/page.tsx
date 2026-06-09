"use client";

/**
 * Design sketch — Activity Time Picker
 * URL: /design/activity-time-picker
 *
 * Popover per modificare l'ora di arrivo o partenza di un'attività.
 * Si apre cliccando sul valore nella riga stile "Address" del pannello Activity.
 *
 * Struttura:
 *   - Label (es. "Ora di arrivo")
 *   - Griglia ore 06–23 (18 celle, 6 per riga)
 *   - Step minuti: :00 | :15 | :30 | :45
 *   - Button "Conferma" (solid/neutral/md)
 *
 * Componente target: features/activity/ActivityTimePicker.tsx (da creare)
 * Usato in: features/activity/ActivityPanel.tsx — riga Arrivo / Partenza
 */

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconLogin2, IconLogout2 } from "@/components/ui/icons";

/* ─── Tipi ────────────────────────────────────────────────────────── */
type TimeField = "arrival" | "departure";

type ActivityTimePickerProps = {
  field: TimeField;
  hour: number;   // 0–23
  minute: number; // 0 | 15 | 30 | 45
  onConfirm?: (hour: number, minute: number) => void;
  onCancel?: () => void;
};

const MINUTE_STEPS = [0, 15, 30, 45] as const;
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06–23

/* ─── Componente ──────────────────────────────────────────────────── */

/**
 * ActivityTimePicker
 *
 * Popover floating. Posizionare con:
 *   position: "absolute", top: triggerBottom + 6, left: triggerLeft,
 *   zIndex: z-dropdown
 *
 * Lo stato (selectedHour, selectedMinute) è locale — viene propagato
 * solo al click su "Conferma" tramite onConfirm(hour, minute).
 */
export function ActivityTimePicker({
  field,
  hour,
  minute,
  onConfirm,
  onCancel,
}: ActivityTimePickerProps) {
  const label = field === "arrival" ? "Ora di arrivo" : "Ora di partenza";

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-border",
        "p-3 w-[220px]",
        "flex flex-col gap-3"
      )}
    >
      {/* Label */}
      <span className="text-[10px] font-semibold tracking-eyebrow uppercase text-ink/40">
        {label}
      </span>

      {/* Griglia ore */}
      <div>
        <span className="text-[9px] tracking-eyebrow uppercase text-ink/30 block mb-1">
          Ora
        </span>
        <div className="grid grid-cols-6 gap-[3px]">
          {HOURS.map((h) => (
            <button
              key={h}
              className={cn(
                "py-[5px] text-center text-[12px] rounded",
                "transition-colors",
                h === hour
                  ? "bg-ink text-white font-semibold"
                  : "text-ink/55 hover:bg-surface-soft"
              )}
            >
              {String(h).padStart(2, "0")}
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
          {MINUTE_STEPS.map((m) => (
            <button
              key={m}
              className={cn(
                "flex-1 py-[5px] text-center text-[12px] rounded-md",
                "transition-colors",
                m === minute
                  ? "bg-ink text-white font-semibold"
                  : "bg-surface-soft text-ink/55 hover:bg-surface"
              )}
            >
              :{String(m).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      {/* Conferma */}
      <Button
        variant="solid"
        tone="neutral"
        size="md"
        iconOnly={false}
        className="w-full"
        onClick={() => onConfirm?.(hour, minute)}
      >
        Conferma
      </Button>
    </div>
  );
}

/* ─── Riga trigger (stile Address) ───────────────────────────────── */

type TimeRowProps = {
  field: TimeField;
  hour: number;
  minute: number;
  date: string;
  active?: boolean;
  onClick?: () => void;
};

export function ActivityTimeRow({
  field,
  hour,
  minute,
  date,
  active,
  onClick,
}: TimeRowProps) {
  const Icon = field === "arrival" ? IconLogin2 : IconLogout2;
  const label = field === "arrival" ? "Arrivo" : "Partenza";
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 py-[9px] border-b border-[rgba(13,44,61,0.1)] last:border-0">
      <Icon size={15} className="text-ink/40 flex-shrink-0" />
      <div className="flex items-baseline gap-2 flex-1">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-eyebrow uppercase text-ink/38">
            {label}
          </span>
          <button
            onClick={onClick}
            className={cn(
              "text-[14px] font-semibold text-ink leading-tight",
              "border-b transition-colors",
              active
                ? "text-primary border-primary"
                : "border-transparent hover:border-primary/50"
            )}
          >
            {timeStr}
          </button>
        </div>
        <span className="text-[12px] text-ink/20">·</span>
        <div className="flex flex-col">
          <span className="text-[10px] tracking-eyebrow uppercase text-ink/38">
            Data
          </span>
          <span className="text-[13px] font-medium text-ink">{date}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * APERTURA / CHIUSURA
 * -------------------
 * Gestire con useState: { open: boolean; field: TimeField | null }
 * Chiudere su: Conferma | Escape | click fuori (useClickOutside)
 *
 * STATO
 * -----
 * Tenere selectedHour e selectedMinute come stato locale nel picker.
 * Inizializzare con i valori attuali dell'attività.
 * Propagare al parent solo su Conferma.
 *
 * POSIZIONAMENTO
 * --------------
 * Il picker è un floating div assoluto — usare un ref sul trigger
 * per calcolare top/left. Considerare overflow viewport (flip top/bottom).
 * z-index: z-dropdown (30).
 *
 * ORE DISPONIBILI
 * ---------------
 * Il range 06–23 è il default. Per attività notturne o multi-day
 * valutare di espandere a 00–23.
 *
 * MINUTI
 * ------
 * Step fissi :00 :15 :30 :45 — nessun input libero per semplicità.
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

export default function ActivityTimePickerPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-xl mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · activity panel
          </p>
          <h1 className="text-[22px] font-semibold text-ink">
            Activity Time Picker
          </h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Popover per modificare arrivo e partenza di un'attività.
            Griglia ore + step minuti fissi + conferma.
          </p>
        </div>

        {/* Preview: riga trigger + picker aperto */}
        <section className="space-y-6">

          {/* Arrivo */}
          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Picker arrivo (aperto)
            </p>
            <div className="bg-white rounded-lg border border-border px-3 max-w-xs">
              <ActivityTimeRow
                field="arrival"
                hour={22}
                minute={0}
                date="Thu, 04 Aug"
                active
              />
              <ActivityTimeRow
                field="departure"
                hour={9}
                minute={0}
                date="Fri, 05 Aug"
              />
            </div>
            <div className="mt-2 max-w-xs">
              <ActivityTimePicker field="arrival" hour={22} minute={0} />
            </div>
          </div>

          {/* Partenza */}
          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Picker partenza (aperto)
            </p>
            <div className="bg-white rounded-lg border border-border px-3 max-w-xs">
              <ActivityTimeRow
                field="arrival"
                hour={22}
                minute={0}
                date="Thu, 04 Aug"
              />
              <ActivityTimeRow
                field="departure"
                hour={9}
                minute={0}
                date="Fri, 05 Aug"
                active
              />
            </div>
            <div className="mt-2 max-w-xs">
              <ActivityTimePicker field="departure" hour={9} minute={0} />
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
              { label: "File target", value: "features/activity/ActivityTimePicker.tsx (da creare)" },
              { label: "Trigger", value: "features/activity/ActivityTimeRow.tsx (da creare)" },
              { label: "Usato in", value: "features/activity/ActivityPanel.tsx" },
              { label: "Posizione", value: "Floating assoluto — calcolare da ref trigger, z-dropdown" },
              { label: "Chiusura", value: "Conferma | Escape | useClickOutside" },
              { label: "Ore", value: "06–23 (18 celle, 6 colonne)" },
              { label: "Minuti", value: "Step fissi: :00 :15 :30 :45" },
              { label: "Button", value: "<Button variant='solid' tone='neutral' size='md'>" },
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
