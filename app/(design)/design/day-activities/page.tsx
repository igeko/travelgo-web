"use client";

/**
 * Day Activities · design sketch
 *
 * Lista densa delle activity di una giornata, terzo elemento del
 * DayEditForm (sotto DayInfoEditForm e LodgingEditForm).
 *
 *   - Riga sola: ora + titolo, niente meta · azioni su hover.
 *   - "+" tra le righe (e in fondo): apre edit-row inline col campo
 *     titolo + autocomplete sulle yume del trip · ultima opzione del
 *     dropdown è "crea nuova yume al volo".
 *   - Drag handle visibile su hover, reorder con drag&drop (qui
 *     accennato: nello sketch lo state è statico).
 *
 * Container editoriale come i pannelli del trip-edit:
 * eyebrow arancio + titolo serif italic + sub serif.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  IconCheck,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   Types and mock data
───────────────────────────────────────────────────────────────── */

type Activity = { id: string; time: string; title: string };

type YumeOption = { id: string; name: string; zone: string; duration: string; price: string; macro: "esplora" | "mangia" | "esperienza"; thumb: string };

const INITIAL_ACTIVITIES: Activity[] = [
  { id: "a1", time: "08:30", title: "Sensō-ji" },
  { id: "a2", time: "10:00", title: "Nakamise street food" },
  { id: "a3", time: "12:30", title: "Sushi Saito · pranzo" },
  { id: "a4", time: "15:00", title: "Ueno Park" },
  { id: "a5", time: "19:00", title: "Cena izakaya" },
];

const YUME_POOL: YumeOption[] = [
  { id: "y1", name: "teamLab Planets",          zone: "Toyosu",   duration: "3h",    price: "€32",  macro: "esplora",    thumb: "linear-gradient(160deg,#a8c5d6,#475565)" },
  { id: "y2", name: "teamLab Borderless",       zone: "Azabudai", duration: "3h",    price: "€30",  macro: "esplora",    thumb: "linear-gradient(160deg,#b8a8c9,#5d4a7a)" },
  { id: "y3", name: "Tea ceremony · Hama-rikyū",zone: "Chuo",     duration: "1h",    price: "€15",  macro: "esperienza", thumb: "linear-gradient(160deg,#cdb2a5,#6a4d3e)" },
  { id: "y4", name: "Tokyo Skytree",            zone: "Sumida",   duration: "1h 30", price: "€25",  macro: "esplora",    thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)" },
  { id: "y5", name: "Yoyogi park",              zone: "Shibuya",  duration: "2h",    price: "€10",  macro: "esplora",    thumb: "linear-gradient(160deg,#9bbf9a,#557a45)" },
  { id: "y6", name: "Golden Gai bars",          zone: "Shinjuku", duration: "2h",    price: "€40",  macro: "mangia",     thumb: "linear-gradient(160deg,#e8c179,#84571c)" },
];

/* ─────────────────────────────────────────────────────────────────
   Mock sub-header
───────────────────────────────────────────────────────────────── */

function Subheader() {
  return (
    <header className="bg-surface border-b border-border px-5 py-2.5 flex items-center gap-3">
      <a href="#" className="text-tiny text-ink-faint hover:text-ink no-underline">‹ Tokyo 2026</a>
      <span className="text-tiny text-ink-muted">/</span>
      <a href="#" className="text-tiny text-ink-faint hover:text-ink no-underline">Day by day</a>
      <span className="text-tiny text-ink-muted">/</span>
      <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">Giorno 3 · sab 30 luglio</span>
      <a href="#" className="ml-auto text-mini text-ink-faint hover:text-ink underline decoration-ink/20 px-2 py-1.5">Annulla</a>
      <button className="bg-orange hover:bg-orange-deep text-white border-0 px-4 py-1.5 rounded-pill text-mini font-medium inline-flex items-center gap-1.5">
        <IconCheck size={13} /> Salva
      </button>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Editorial header (eyebrow + title + sub) — stesso pattern trip-edit
───────────────────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <>
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">{eyebrow}</p>
      <h2 className="font-serif italic text-[22px] text-ink font-medium leading-tight m-0 mt-1">{title}</h2>
      <p className="font-serif italic text-meta text-ink-faint mt-1">{sub}</p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Activity row (read-only)
───────────────────────────────────────────────────────────────── */

function ActivityRow({
  activity,
  dim,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  dim?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative grid grid-cols-[14px_52px_1fr_auto] gap-3 items-center py-2.5",
        "border-b border-border/70 last:border-b-0",
        "hover:bg-ink/[0.02] hover:rounded-md hover:border-transparent",
        "hover:-mx-2.5 hover:px-2.5 transition-[background-color,padding,margin] duration-100",
        dim && "opacity-50",
      )}
    >
      <IconGripVertical size={14} className="text-ink-muted/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="font-mono text-tiny text-ink-faint font-medium">{activity.time}</span>
      <span className="text-meta text-ink">{activity.title}</span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="w-6 h-6 rounded-full text-ink-muted hover:bg-ink/[0.06] hover:text-ink inline-flex items-center justify-center"
          title="Modifica"
        >
          <IconPencil size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-6 h-6 rounded-full text-ink-muted hover:bg-[#d83b3b]/10 hover:text-[#d83b3b] inline-flex items-center justify-center"
          title="Elimina"
        >
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Insertion gap (the "+" between rows)
───────────────────────────────────────────────────────────────── */

function InsertGap({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative h-1.5">
      <span
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-px bg-transparent group-hover:bg-orange/40 transition-colors"
      />
      <button
        type="button"
        onClick={onClick}
        aria-label="Inserisci qui"
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10",
          "w-[22px] h-[22px] rounded-full bg-surface border border-border-strong text-ink-faint",
          "inline-flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 hover:bg-orange hover:text-white hover:border-orange",
          "transition-opacity",
        )}
      >
        <IconPlus size={12} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Edit row (inline form for adding/editing an activity)
───────────────────────────────────────────────────────────────── */

type EditState = {
  time: string;
  title: string;
};

function EditRow({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: EditState;
  onConfirm: (state: EditState, yumeId: string | null) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = useState(initial.time);
  const [title, setTitle] = useState(initial.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const matches = YUME_POOL.filter((y) =>
    y.name.toLowerCase().includes(title.trim().toLowerCase()),
  ).slice(0, 4);

  const hasExact = matches.some((y) => y.name.toLowerCase() === title.trim().toLowerCase());
  const canCreate = title.trim().length > 0 && !hasExact;

  const handleConfirm = () => {
    if (!title.trim()) return;
    const exact = matches.find((y) => y.name.toLowerCase() === title.trim().toLowerCase());
    onConfirm({ time, title: title.trim() }, exact?.id ?? null);
  };

  const pickYume = (y: YumeOption) => {
    onConfirm({ time, title: y.name }, y.id);
  };

  return (
    <div className="relative my-1.5">
      <div
        className={cn(
          "grid grid-cols-[14px_52px_1fr_auto] gap-3 items-center px-3 py-3",
          "-mx-3 bg-orange/[0.06] border border-orange/35 rounded-md",
        )}
      >
        <IconGripVertical size={14} className="text-ink-muted/30" />
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-surface border border-border-strong rounded-md px-2 py-1 font-mono text-tiny text-ink w-full focus:outline focus:outline-2 focus:outline-orange/30 focus:border-orange"
        />
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleConfirm(); }
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          placeholder="Cosa aggiungiamo?"
          className="bg-surface border border-orange rounded-md px-3 py-2 text-meta text-ink w-full outline outline-2 outline-orange/25 placeholder:text-ink-faint"
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-6 h-6 rounded-full text-ink-faint hover:bg-ink/[0.06] hover:text-ink inline-flex items-center justify-center"
            title="Annulla"
          >
            <IconX size={13} />
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!title.trim()}
            className="w-6 h-6 rounded-full bg-orange text-white inline-flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
            title="Conferma"
          >
            <IconCheck size={13} />
          </button>
        </div>
      </div>

      {title.trim().length > 0 && (
        <div className="absolute left-[68px] right-3 top-full mt-1 z-20 bg-surface border border-border-strong rounded-md overflow-hidden shadow-[0_6px_18px_rgba(13,44,61,0.10)]">
          {matches.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[9px] tracking-eyebrow uppercase text-ink-muted font-medium bg-ink/[0.025]">
                {matches.length} {matches.length === 1 ? "yume" : "yume"} per Tokyo · «{title.trim()}»
              </div>
              {matches.map((y, i) => (
                <button
                  key={y.id}
                  type="button"
                  onClick={() => pickYume(y)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-orange/[0.06] text-left",
                    i > 0 && "border-t border-border/60",
                  )}
                >
                  <span
                    aria-hidden
                    className="w-[26px] h-[26px] rounded-md flex-shrink-0"
                    style={{ backgroundImage: y.thumb }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-mini text-ink font-medium m-0">{y.name}</p>
                    <p className="font-serif italic text-[10px] text-ink-muted m-0">{y.zone} · {y.duration} · {y.price}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-pill bg-ink/[0.06] text-ink-soft">{y.macro}</span>
                </button>
              ))}
            </>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 bg-orange/[0.08] cursor-pointer",
                matches.length > 0 && "border-t border-dashed border-orange/30",
              )}
            >
              <span className="w-6 h-6 rounded-full bg-orange text-white inline-flex items-center justify-center">
                <IconPlus size={13} />
              </span>
              <span className="text-mini text-orange-deep font-medium">
                Crea nuova yume:{" "}
                <b className="not-italic font-medium text-ink font-serif italic">«{title.trim()}»</b>
              </span>
              <span className="ml-auto font-serif italic text-[10px] text-ink-muted">↵ invio</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Activity list (the section)
───────────────────────────────────────────────────────────────── */

type Insertion =
  | { kind: "none" }
  | { kind: "after"; index: number }
  | { kind: "edit"; index: number };

function nextTime(prev: string | undefined, next: string | undefined): string {
  if (prev && next) {
    const [ph, pm] = prev.split(":").map(Number);
    const [nh, nm] = next.split(":").map(Number);
    const avg = Math.floor((ph * 60 + pm + nh * 60 + nm) / 2);
    return `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`;
  }
  if (prev) {
    const [h, m] = prev.split(":").map(Number);
    const t = h * 60 + m + 90;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }
  return "09:00";
}

function ActivityList() {
  const [items, setItems] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [insertion, setInsertion] = useState<Insertion>({ kind: "none" });

  const startInsertAfter = (i: number) => setInsertion({ kind: "after", index: i });
  const startEdit = (i: number) => setInsertion({ kind: "edit", index: i });
  const cancel = () => setInsertion({ kind: "none" });

  const confirmInsert = (i: number, state: EditState, _yumeId: string | null) => {
    const newItem: Activity = { id: `a${Date.now()}`, time: state.time, title: state.title };
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(i + 1, 0, newItem);
      return copy;
    });
    setInsertion({ kind: "none" });
  };

  const confirmEdit = (i: number, state: EditState, _yumeId: string | null) => {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, time: state.time, title: state.title } : x)));
    setInsertion({ kind: "none" });
  };

  const removeAt = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const startInsertEnd = () => setInsertion({ kind: "after", index: items.length - 1 });

  const meta =
    items.length === 0
      ? "Nessuna tappa ancora"
      : `${items.length} ${items.length === 1 ? "tappa" : "tappe"} · prima alle ${items[0].time} · ultima alle ${items[items.length - 1].time}`;

  return (
    <div className="bg-surface border border-border rounded-md px-7 py-6">
      <SectionHeader
        eyebrow="Sezione · attività"
        title="Cosa fai oggi."
        sub="Aggiungi, sposta, modifica. Le yume di Tokyo sono già pronte da pescare."
      />

      <div className="flex items-baseline gap-2.5 mt-4 mb-2">
        <span className="text-[9px] tracking-eyebrow uppercase text-orange-deep font-medium">Programma</span>
        <span className="flex-1 h-px bg-border" />
        <span className="font-serif italic text-tiny text-ink-muted">{meta}</span>
      </div>

      <div className="flex flex-col">
        {items.map((item, i) => {
          const isEditing = insertion.kind === "edit" && insertion.index === i;
          const isInsertingAfter = insertion.kind === "after" && insertion.index === i;
          const editingActive = insertion.kind !== "none";

          if (isEditing) {
            return (
              <EditRow
                key={item.id}
                initial={{ time: item.time, title: item.title }}
                onConfirm={(state, yumeId) => confirmEdit(i, state, yumeId)}
                onCancel={cancel}
              />
            );
          }

          return (
            <div key={item.id}>
              <ActivityRow
                activity={item}
                dim={editingActive}
                onEdit={() => startEdit(i)}
                onDelete={() => removeAt(i)}
              />
              {i < items.length - 1 && !editingActive && (
                <InsertGap onClick={() => startInsertAfter(i)} />
              )}
              {isInsertingAfter && (
                <EditRow
                  initial={{
                    time: nextTime(item.time, items[i + 1]?.time),
                    title: "",
                  }}
                  onConfirm={(state, yumeId) => confirmInsert(i, state, yumeId)}
                  onCancel={cancel}
                />
              )}
            </div>
          );
        })}
      </div>

      {insertion.kind === "none" && (
        <button
          type="button"
          onClick={startInsertEnd}
          className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1.5 bg-transparent border-0 text-mini text-orange-deep font-medium rounded-md hover:bg-orange/[0.10] cursor-pointer"
        >
          <IconPlus size={13} /> Aggiungi attività
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Ghost placeholders for the two siblings in DayEditForm
───────────────────────────────────────────────────────────────── */

function Ghost({ label }: { label: string }) {
  return (
    <div className="bg-surface border border-dashed border-border-strong/50 rounded-md px-4 py-3 text-[9px] tracking-eyebrow uppercase text-ink-muted/70 font-medium">
      ↑ {label}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DayActivitiesSketch() {
  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <Subheader />

      <main className="max-w-[760px] mx-auto w-full px-6 py-6 flex flex-col gap-3">
        <Ghost label="DayInfoEditForm · anagrafica" />
        <Ghost label="LodgingEditForm · alloggio" />
        <ActivityList />

        <div className="mt-6 px-4 py-3 bg-orange/[0.06] rounded-md flex items-center gap-3 border border-dashed border-orange/30">
          <IconSparkles size={16} className="text-orange-deep" />
          <p className="m-0 font-serif italic text-mini text-[#6d4923] leading-snug">
            <b className="not-italic font-medium text-orange-deep">Prova · </b>
            passa il mouse sulle righe per vedere le azioni · clicca sul "+" tra due righe · digita "team" per vedere
            l'autocomplete sulle yume · digita un titolo nuovo per la fallback "crea nuova yume".
          </p>
        </div>
      </main>
    </div>
  );
}
