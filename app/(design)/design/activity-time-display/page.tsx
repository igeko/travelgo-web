"use client";

/**
 * Design sketch — Activity Time Display
 * URL: /design/activity-time-display
 *
 * Riga arrivo / partenza nel pannello Activity.
 * Variante B — due chip affiancate con freccia separatrice.
 *
 * Struttura:
 *   [icon  Arrivo  22:00  Thu 04] → [icon  Partenza  09:00  Fri 05]
 *
 * Ogni chip è cliccabile e apre l'ActivityTimePicker relativo.
 * Stato "active" (bordo arancio + bg warm) quando il picker è aperto.
 *
 * Componente target: features/activity/ActivityTimeChips.tsx (da creare)
 * Usato in: features/activity/ActivityPanel.tsx
 */

import { cn } from "@/lib/cn";
import { IconLogin2, IconLogout2, IconArrowRight } from "@/components/ui/icons";

/* ─── Tipi ────────────────────────────────────────────────────────── */
type TimeField = "arrival" | "departure";

type TimeChipData = {
  field: TimeField;
  hour: number;
  minute: number;
  date: string; // es. "Thu, 04 Aug"
};

type ActivityTimeChipsProps = {
  arrival: TimeChipData;
  departure: TimeChipData;
  /** Quale chip ha il picker aperto (se nessuno: null) */
  activeField?: TimeField | null;
  onChipClick?: (field: TimeField) => void;
};

/* ─── Sub-componente singola chip ─────────────────────────────────── */

type TimeChipProps = {
  data: TimeChipData;
  active?: boolean;
  onClick?: () => void;
};

function TimeChip({ data, active, onClick }: TimeChipProps) {
  const Icon = data.field === "arrival" ? IconLogin2 : IconLogout2;
  const label = data.field === "arrival" ? "Arrivo" : "Partenza";
  const timeStr = `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 flex-1 min-w-0",
        "rounded-lg px-3 py-2 text-left",
        "border transition-colors",
        active
          ? "bg-[#fff8f4] border-primary"
          : "bg-surface-soft border-transparent hover:border-primary/40"
      )}
    >
      <Icon
        size={14}
        className={cn(
          "flex-shrink-0",
          active ? "text-primary" : "text-ink/40"
        )}
        aria-hidden
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] tracking-eyebrow uppercase text-ink/38 leading-none mb-[3px]">
          {label}
        </span>
        <span
          className={cn(
            "text-[15px] font-semibold leading-none",
            active ? "text-primary" : "text-ink"
          )}
        >
          {timeStr}
        </span>
        <span className="text-[10px] text-ink/45 mt-[3px] leading-none truncate">
          {data.date}
        </span>
      </div>
    </button>
  );
}

/* ─── Componente principale ───────────────────────────────────────── */

/**
 * ActivityTimeChips
 *
 * Coppia di chip arrivo → partenza.
 * Le chip si espandono per riempire il contenitore (flex-1 ciascuna).
 */
export function ActivityTimeChips({
  arrival,
  departure,
  activeField,
  onChipClick,
}: ActivityTimeChipsProps) {
  return (
    <div className="flex items-center gap-2">
      <TimeChip
        data={arrival}
        active={activeField === "arrival"}
        onClick={() => onChipClick?.("arrival")}
      />
      <IconArrowRight size={14} className="flex-shrink-0 text-ink/25" aria-hidden />
      <TimeChip
        data={departure}
        active={activeField === "departure"}
        onClick={() => onChipClick?.("departure")}
      />
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * COMPOSIZIONE NEL PANNELLO
 * -------------------------
 * In ActivityPanel.tsx, dopo il campo Address:
 *
 *   <ActivityTimeChips
 *     arrival={{ field: "arrival", hour: 22, minute: 0, date: "Thu, 04 Aug" }}
 *     departure={{ field: "departure", hour: 9, minute: 0, date: "Fri, 05 Aug" }}
 *     activeField={openPicker}         // "arrival" | "departure" | null
 *     onChipClick={(field) => setOpenPicker(field === openPicker ? null : field)}
 *   />
 *   {openPicker && (
 *     <ActivityTimePicker
 *       field={openPicker}
 *       hour={openPicker === "arrival" ? arrival.hour : departure.hour}
 *       minute={openPicker === "arrival" ? arrival.minute : departure.minute}
 *       onConfirm={(h, m) => { save(openPicker, h, m); setOpenPicker(null); }}
 *     />
 *   )}
 *
 * STATO ACTIVE
 * ------------
 * La chip mostra bordo arancio + bg warm (#fff8f4) quando il suo picker
 * è aperto. Nessun altro stato visivo (no hover quando active).
 *
 * DIMENSIONI
 * ----------
 * Le due chip si dividono equamente lo spazio (flex-1).
 * Larghezza minima consigliata contenitore: 240px.
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

const MOCK_ARRIVAL: TimeChipData = {
  field: "arrival",
  hour: 22,
  minute: 0,
  date: "Thu, 04 Aug",
};

const MOCK_DEPARTURE: TimeChipData = {
  field: "departure",
  hour: 9,
  minute: 0,
  date: "Fri, 05 Aug",
};

export default function ActivityTimeDisplayPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-sm mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · activity panel
          </p>
          <h1 className="text-[22px] font-semibold text-ink">
            Activity Time Display
          </h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Chip affiancate arrivo → partenza. Click su una chip apre
            l'ActivityTimePicker relativo.
          </p>
        </div>

        {/* Stati */}
        <section className="space-y-6">

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Default — nessun picker aperto
            </p>
            <ActivityTimeChips
              arrival={MOCK_ARRIVAL}
              departure={MOCK_DEPARTURE}
              activeField={null}
            />
          </div>

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Active — picker arrivo aperto
            </p>
            <ActivityTimeChips
              arrival={MOCK_ARRIVAL}
              departure={MOCK_DEPARTURE}
              activeField="arrival"
            />
          </div>

          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Active — picker partenza aperto
            </p>
            <ActivityTimeChips
              arrival={MOCK_ARRIVAL}
              departure={MOCK_DEPARTURE}
              activeField="departure"
            />
          </div>

          {/* Contesto nel pannello */}
          <div>
            <p className="text-[11px] text-ink/40 uppercase tracking-eyebrow mb-2">
              Nel contesto del pannello
            </p>
            <div className="bg-white rounded-lg border border-border divide-y divide-[rgba(13,44,61,0.08)]">
              {/* Address mock */}
              <div className="flex items-center gap-2 px-3 py-[9px] text-[13px] text-ink/40">
                <span className="text-[15px]">◎</span>
                Address
              </div>
              {/* Time chips */}
              <div className="px-3 py-2">
                <ActivityTimeChips
                  arrival={MOCK_ARRIVAL}
                  departure={MOCK_DEPARTURE}
                  activeField="arrival"
                />
              </div>
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
              { label: "File target", value: "features/activity/ActivityTimeChips.tsx (da creare)" },
              { label: "Usato in", value: "features/activity/ActivityPanel.tsx" },
              { label: "Picker", value: "Abbinare ad ActivityTimePicker.tsx (già in design)" },
              { label: "Active state", value: "bg-[#fff8f4] border-primary su chip + icon/time in text-primary" },
              { label: "Toggle", value: "field === openPicker ? null : field" },
              { label: "Min width", value: "Contenitore minimo 240px" },
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
