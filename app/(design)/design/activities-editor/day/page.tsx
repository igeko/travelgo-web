"use client";

/**
 * Design sketch — ActivityTimeline · Day Editor
 * URL: /design/activities-editor/day
 *
 * Dati mock statici, nessuna API, nessun DB.
 * Serve per validare visivamente la UI prima di toccare il data model.
 *
 * Decisioni spec: docs/design/activities-editor.md (dec. 15-19, 24-27)
 */

import { useState } from "react";
import {
  IconGripVertical,
  IconPencil,
  IconTrash,
  IconPlus,
  IconMap,
  IconSparkles,
  IconMapPin,
  IconChevronRight,
  IconX,
  IconCheck,
  IconCircleDashed,
  IconBookmark,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type BlockType = "place" | "meal" | "pause" | "action" | "move";
type Transport = "walk" | "metro" | "bus" | "taxi" | "bike" | "car" | "train";
type BookingStatus = "todo" | "booked" | "paid";
type View = "lista" | "timeline" | "racconto";

interface Section {
  kind: "section";
  id: string;
  label: string;
  count: number;
}

interface Block {
  kind: "block";
  id: string;
  type: BlockType;
  time?: string;
  name: string;
  location?: string;
  fuzzy?: boolean;
  status?: BookingStatus;
  instanceNote?: string;
}

interface Bridge {
  kind: "bridge";
  id: string;
  transport: Transport;
  duration: number;
  line?: string;
  stops?: string;
}

type TimelineItem = Section | Block | Bridge;

// ─────────────────────────────────────────────────────────────────
// Mock data — giorno a Tokyo
// ─────────────────────────────────────────────────────────────────

const MOCK: TimelineItem[] = [
  { kind: "section", id: "s-morning", label: "Morning", count: 3 },

  { kind: "block", id: "b1", type: "place", time: "09:00", name: "Tsukiji Outer Market", location: "Tsukiji, Chuo, Tokyo", status: "booked" },
  { kind: "bridge", id: "br1", transport: "walk", duration: 12 },

  { kind: "block", id: "b2", type: "place", time: "10:30", name: "teamLab Planets TOKYO", location: "Toyosu, Koto, Tokyo", status: "paid" },
  { kind: "bridge", id: "br2", transport: "metro", duration: 8, line: "Hibiya Line", stops: "Shin-Toyosu → Shibuya" },

  { kind: "block", id: "b3", type: "meal", time: "12:30", name: "PRANZO · ICHIRAN RAMEN", fuzzy: true },

  { kind: "section", id: "s-afternoon", label: "Afternoon", count: 3 },

  { kind: "block", id: "b4", type: "place", time: "14:00", name: "Shibuya Crossing", location: "Shibuya, Tokyo", status: "todo" },
  { kind: "bridge", id: "br3", transport: "walk", duration: 5 },

  { kind: "block", id: "b5", type: "pause", name: "PAUSA CAFFÈ", fuzzy: true },
  { kind: "bridge", id: "br4", transport: "taxi", duration: 20 },

  { kind: "block", id: "b6", type: "place", time: "16:00", name: "Meiji Shrine", location: "Harajuku, Shibuya, Tokyo", status: "todo" },

  { kind: "section", id: "s-evening", label: "Evening", count: 2 },

  { kind: "block", id: "b7", type: "place", time: "19:30", name: "Omoide Yokocho", location: "Shinjuku, Tokyo" },
  { kind: "bridge", id: "br5", transport: "walk", duration: 3 },

  { kind: "block", id: "b8", type: "action", time: "21:00", name: "PRENOTA CENA YAKINIKU", fuzzy: true, instanceNote: "Verifica disponibilità sabato sera" },
];

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const TRANSPORT_EMOJI: Record<Transport, string> = {
  walk: "🚶", metro: "🚇", bus: "🚌", taxi: "🚕", bike: "🚴", car: "🚗", train: "🚆",
};
const TRANSPORT_LABEL: Record<Transport, string> = {
  walk: "A piedi", metro: "Metro", bus: "Bus", taxi: "Taxi", bike: "Bici", car: "Auto", train: "Treno",
};

const TYPE_EMOJI: Record<BlockType, string> = {
  place: "📍", meal: "🍽️", pause: "☕", action: "✅", move: "↔️",
};
const TYPE_LABEL: Record<BlockType, string> = {
  place: "Luogo", meal: "Pasto", pause: "Pausa", action: "Azione", move: "Spostamento",
};

// Usa solo classi Tailwind standard — evita custom tokens per i badge tipo
const TYPE_BG: Record<BlockType, string> = {
  place:  "bg-sky-50 text-sky-600 border-sky-200",
  meal:   "bg-amber-50 text-amber-600 border-amber-200",
  pause:  "bg-emerald-50 text-emerald-600 border-emerald-200",
  action: "bg-violet-50 text-violet-600 border-violet-200",
  move:   "bg-orange-50 text-orange-600 border-orange-200",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  todo:   "bg-zinc-100 text-zinc-500",
  booked: "bg-sky-50 text-sky-600",
  paid:   "bg-emerald-50 text-emerald-600",
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  todo: "Da fare", booked: "Prenotato", paid: "Pagato",
};
const STATUS_ICON: Record<BookingStatus, React.ReactNode> = {
  todo:   <IconCircleDashed size={10} />,
  booked: <IconBookmark size={10} />,
  paid:   <IconCheck size={10} />,
};

// Spine geometry (px values → tailwind arbitrary where needed)
const SPINE_LEFT = 52; // px da sinistra del container
const TIME_W    = 46; // larghezza colonna time

// ─────────────────────────────────────────────────────────────────
// SectionDivider
// ─────────────────────────────────────────────────────────────────

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex items-center gap-3 py-3 mt-2 first:mt-0"
      style={{ paddingLeft: SPINE_LEFT + 16 }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-[1.5px] bg-orange/20 rounded-full" />
      <span className="text-[10px] text-ink-faint uppercase tracking-[0.10em] shrink-0">
        {count} att
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BridgeRow
// ─────────────────────────────────────────────────────────────────

const ALL_TRANSPORTS: Transport[] = ["walk", "metro", "bus", "taxi", "bike", "car", "train"];

function BridgeRow({
  bridge,
  isExpanded,
  onToggle,
}: {
  bridge: Bridge;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [selectedTransport, setSelectedTransport] = useState<Transport>(bridge.transport);
  const [durationVal, setDurationVal] = useState(String(bridge.duration));
  const [noteVal, setNoteVal] = useState(bridge.stops ?? "");

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="group flex items-center gap-2 w-full text-left rounded-lg mx-1 px-2 py-1.5 hover:bg-surface-soft transition-colors"
        style={{ paddingLeft: SPINE_LEFT + 14 }}
      >
        <span className="text-base leading-none">{TRANSPORT_EMOJI[selectedTransport]}</span>
        <span className="text-[12px] text-ink-soft">
          {TRANSPORT_LABEL[selectedTransport]} · {durationVal} min
        </span>
        {bridge.line && (
          <span className="text-[11px] text-ink-faint">· {bridge.line}</span>
        )}
        <IconChevronRight
          size={12}
          className="text-ink-faint ml-auto opacity-0 group-hover:opacity-60 transition-opacity"
        />
      </button>
    );
  }

  return (
    <div
      className="mx-1 my-1.5 rounded-xl border-2 border-orange/35 bg-orange/[0.03] p-4"
      style={{ marginLeft: SPINE_LEFT - 4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange">
          Spostamento
        </span>
        <button onClick={onToggle} className="text-ink-faint hover:text-ink transition-colors">
          <IconX size={14} />
        </button>
      </div>

      {/* Transport chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {ALL_TRANSPORTS.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTransport(t)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
              selectedTransport === t
                ? "bg-orange text-white border-orange shadow-sm"
                : "bg-white text-ink-soft border-zinc-200 hover:border-orange/50 hover:text-ink"
            )}
          >
            <span>{TRANSPORT_EMOJI[t]}</span>
            <span>{TRANSPORT_LABEL[t]}</span>
          </button>
        ))}
      </div>

      {/* Duration + line */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
            Durata
          </label>
          <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-3 py-2 bg-white focus-within:border-orange/50 transition-colors">
            <input
              type="number"
              value={durationVal}
              onChange={(e) => setDurationVal(e.target.value)}
              className="w-full text-[13px] text-ink outline-none bg-transparent"
              min={1}
            />
            <span className="text-[12px] text-ink-faint shrink-0">min</span>
          </div>
        </div>
        {bridge.line && (
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
              Linea
            </label>
            <div className="border border-zinc-200 rounded-lg px-3 py-2 bg-white text-[13px] text-ink">
              {bridge.line}
            </div>
          </div>
        )}
      </div>

      {/* Note + fermate */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          Fermate / nota libera
        </label>
        <input
          type="text"
          value={noteVal}
          onChange={(e) => setNoteVal(e.target.value)}
          placeholder="es. Toyosu → Shibuya"
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white"
        />
      </div>

      {/* Azioni */}
      <div className="flex items-center justify-between">
        <button className="text-[11px] text-orange font-medium hover:underline">
          Apri in Mappe →
        </button>
        <button className="text-[11px] text-ink-faint hover:text-ink underline transition-colors">
          Rimuovi ponte (converti in buffer)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// InstancePopover — edit orario, fuzzy, nota, booking_status
// ─────────────────────────────────────────────────────────────────

function InstancePopover({
  block,
  onClose,
}: {
  block: Block;
  onClose: () => void;
}) {
  const [time, setTime] = useState(block.time ?? "");
  const [fuzzy, setFuzzy] = useState(!!block.fuzzy);
  const [note, setNote] = useState(block.instanceNote ?? "");
  const [status, setStatus] = useState<BookingStatus | undefined>(block.status);

  return (
    <div className="mt-1 mb-2 mx-1 rounded-xl border border-zinc-200 bg-white shadow-lg p-4"
      style={{ marginLeft: SPINE_LEFT - 4 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-ink">Modifica istanza</span>
        <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors">
          <IconX size={14} />
        </button>
      </div>

      {/* Time */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          Orario
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-orange/50 transition-colors bg-white"
        />
      </div>

      {/* Fuzzy toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-ink-soft">Orario approssimativo (fuzzy)</span>
        <button
          onClick={() => setFuzzy((v) => !v)}
          className={cn(
            "relative w-9 h-5 rounded-full border-2 transition-colors",
            fuzzy ? "bg-orange border-orange" : "bg-zinc-100 border-zinc-300"
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform",
              fuzzy ? "translate-x-[18px]" : "translate-x-[2px]"
            )}
          />
        </button>
      </div>

      {/* Nota istanza */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">
          Nota istanza
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note specifiche per questo giorno…"
          rows={2}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors bg-white resize-none"
        />
      </div>

      {/* Booking status */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1.5">
          Stato prenotazione
        </label>
        <div className="flex gap-1.5">
          {(["todo", "booked", "paid"] as BookingStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                status === s
                  ? "bg-orange text-white border-orange"
                  : "bg-white text-ink-soft border-zinc-200 hover:border-orange/30"
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-orange text-white rounded-lg py-2 text-[13px] font-semibold hover:bg-orange/90 transition-colors"
      >
        Salva modifiche
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AddAffordance — zona tra blocchi
// ─────────────────────────────────────────────────────────────────

function AddAffordance({
  visible,
  onAddBlock,
  onAddActivity,
}: {
  visible: boolean;
  onAddBlock: () => void;
  onAddActivity: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 transition-all duration-200 overflow-hidden",
        visible ? "opacity-100 h-8 my-0.5" : "opacity-0 h-0"
      )}
      style={{ paddingLeft: SPINE_LEFT + 10 }}
    >
      {/* Dot on spine */}
      <div
        className="absolute flex items-center justify-center w-[14px] h-[14px] rounded-full bg-orange shadow-sm z-10"
        style={{ left: SPINE_LEFT - 7, top: "50%", transform: "translateY(-50%)" }}
      >
        <IconPlus size={9} className="text-white" />
      </div>

      <button
        onClick={onAddBlock}
        className="inline-flex items-center gap-1 bg-orange text-white text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-orange/90 transition-colors shadow-sm"
      >
        <IconPlus size={9} />
        blocco
      </button>

      <button
        onClick={onAddActivity}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft bg-white border border-zinc-200 px-2.5 py-1 rounded-full hover:border-orange/50 hover:text-ink transition-colors"
      >
        <IconPlus size={9} />
        attività
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AddComposer — block free-form o activity autocomplete
// ─────────────────────────────────────────────────────────────────

const MOCK_WISHLIST = [
  { id: "w1", name: "Senso-ji Temple", badge: "D3" },
  { id: "w2", name: "Akihabara Electric Town", badge: null },
  { id: "w3", name: "Ueno Park", badge: "D4" },
];
const MOCK_PLATFORM = [
  { id: "p1", name: "Shibuya Sky Observatory" },
  { id: "p2", name: "Robot Restaurant Shinjuku" },
  { id: "p3", name: "Hamarikyu Gardens" },
];

function BlockComposer({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState<BlockType>("place");
  const [title, setTitle] = useState("");

  return (
    <div
      className="mx-1 my-1 rounded-xl border-2 border-orange/40 bg-white shadow-sm p-3"
      style={{ marginLeft: SPINE_LEFT - 4 }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold text-ink">Nuovo blocco</span>
        <div className="flex gap-1 flex-wrap ml-1">
          {(["place", "meal", "pause", "action"] as BlockType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors",
                selectedType === t
                  ? "bg-orange text-white border-orange"
                  : "text-ink-soft border-zinc-200 hover:border-orange/40"
              )}
            >
              <span>{TYPE_EMOJI[t]}</span>
              <span>{TYPE_LABEL[t]}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-ink-faint hover:text-ink ml-auto shrink-0">
          <IconX size={13} />
        </button>
      </div>

      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Descrivi il ${TYPE_LABEL[selectedType].toLowerCase()}…`}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint outline-none focus:border-orange/50 transition-colors"
      />
      {!title && (
        <p className="mt-1.5 text-[11px] text-ink-faint italic">
          Nessuna location → blocco fuzzy automatico
        </p>
      )}
    </div>
  );
}

function ActivityComposer({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");

  const filteredW = MOCK_WISHLIST.filter(
    (x) => !query || x.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredP = MOCK_PLATFORM.filter(
    (x) => !query || x.name.toLowerCase().includes(query.toLowerCase())
  );

  function highlight(text: string) {
    if (!query) return <>{text}</>;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-orange/20 rounded-sm not-italic">{text.slice(i, i + query.length)}</mark>
        {text.slice(i + query.length)}
      </>
    );
  }

  return (
    <div
      className="mx-1 my-1 rounded-xl border-2 border-orange/40 bg-white shadow-sm overflow-hidden"
      style={{ marginLeft: SPINE_LEFT - 4 }}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100">
        <IconMapPin size={14} className="text-orange shrink-0" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca attività…"
          className="flex-1 text-[13px] text-ink placeholder:text-ink-faint outline-none bg-transparent"
        />
        <button onClick={onClose} className="text-ink-faint hover:text-ink shrink-0">
          <IconX size={13} />
        </button>
      </div>

      {/* Gruppo 1: wishlist */}
      {filteredW.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-ink-faint bg-zinc-50 border-b border-zinc-100">
            Nella wishlist
          </div>
          {filteredW.map((item) => (
            <button
              key={item.id}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors border-b border-zinc-50"
            >
              <span className="text-sm leading-none">📍</span>
              <span className="flex-1 text-[13px] text-ink">{highlight(item.name)}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold text-orange bg-orange/10 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </>
      )}

      {/* Gruppo 2: piattaforma */}
      {filteredP.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-ink-faint bg-zinc-50 border-b border-zinc-100">
            Su TravelGo
          </div>
          {filteredP.map((item) => (
            <button
              key={item.id}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors border-b border-zinc-50"
            >
              <span className="text-sm leading-none">🔍</span>
              <span className="flex-1 text-[13px] text-ink">{highlight(item.name)}</span>
            </button>
          ))}
        </>
      )}

      {/* Crea nuova */}
      {query && (
        <div className="px-3 py-2.5">
          <button className="text-[12px] font-medium text-orange hover:underline">
            + Crea &ldquo;{query}&rdquo; come nuova attività
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BlockCard
// ─────────────────────────────────────────────────────────────────

function BlockCard({
  block,
  popoverOpen,
  onTogglePopover,
  onDelete,
}: {
  block: Block;
  popoverOpen: boolean;
  onTogglePopover: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFuzzy = !!block.fuzzy;
  const showActions = hovered || popoverOpen;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row */}
      <div className="relative flex items-start py-2 pr-1" style={{ paddingLeft: SPINE_LEFT + 12 }}>
        {/* Time */}
        <div
          className="absolute top-[12px] text-right"
          style={{ left: 0, width: TIME_W }}
        >
          {block.time ? (
            <span className="text-[11px] font-mono text-ink-soft tabular-nums">{block.time}</span>
          ) : (
            <span className="text-[11px] text-ink-faint opacity-40">—</span>
          )}
        </div>

        {/* Spine dot */}
        <div
          className={cn(
            "absolute top-[14px] w-[12px] h-[12px] rounded-full border-2 border-white z-10",
            isFuzzy ? "bg-zinc-300" : "bg-orange"
          )}
          style={{ left: SPINE_LEFT - 6 }}
        />

        {/* Card */}
        <div
          className={cn(
            "flex-1 min-w-0 rounded-[var(--radius-md)] px-3 py-2.5 border transition-all duration-150",
            isFuzzy
              ? "border-dashed border-zinc-300 bg-zinc-50/60"
              : "border-zinc-200 bg-white",
            (hovered || popoverOpen) && !isFuzzy && "border-orange/30 shadow-sm",
            (hovered || popoverOpen) && isFuzzy && "border-orange/30"
          )}
        >
          {/* Type badge + name */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[3px] rounded-[5px] border mt-[1px]",
                TYPE_BG[block.type]
              )}
            >
              <span>{TYPE_EMOJI[block.type]}</span>
              <span className="uppercase tracking-[0.05em]">{TYPE_LABEL[block.type]}</span>
            </span>

            {/* Name (click → Activity Detail) */}
            <button
              className={cn(
                "flex-1 min-w-0 text-left leading-snug transition-colors",
                isFuzzy
                  ? "text-[11px] font-semibold italic uppercase tracking-[0.06em] text-ink-soft"
                  : "text-[14px] font-semibold text-ink hover:text-orange"
              )}
            >
              {block.name}
            </button>

            {/* Booking status badge */}
            {block.status && (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[3px] rounded-full mt-[1px]",
                  STATUS_STYLE[block.status]
                )}
              >
                {STATUS_ICON[block.status]}
                {STATUS_LABEL[block.status]}
              </span>
            )}
          </div>

          {/* Location */}
          {block.location && (
            <div className="flex items-center gap-1 mt-1.5">
              <IconMapPin size={11} className="text-ink-faint shrink-0" />
              <span className="text-[11px] text-ink-soft truncate">{block.location}</span>
            </div>
          )}

          {/* Instance note */}
          {block.instanceNote && (
            <p className="mt-1.5 text-[11px] text-ink-faint italic">{block.instanceNote}</p>
          )}
        </div>

        {/* Hover actions */}
        <div
          className={cn(
            "flex items-center gap-0.5 pl-1.5 self-center shrink-0 transition-opacity duration-100",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={onTogglePopover}
            title="Modifica istanza"
            className={cn(
              "p-1.5 rounded-[6px] text-ink-faint hover:text-ink transition-colors",
              popoverOpen ? "bg-orange/10 text-orange" : "hover:bg-zinc-100"
            )}
          >
            <IconPencil size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Rimuovi dal giorno"
            className="p-1.5 rounded-[6px] text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <IconTrash size={14} />
          </button>
          <div
            title="Riordina"
            className="p-1.5 rounded-[6px] text-ink-faint hover:bg-zinc-100 cursor-grab transition-colors"
          >
            <IconGripVertical size={14} />
          </div>
        </div>
      </div>

      {/* Popover inline */}
      {popoverOpen && (
        <InstancePopover block={block} onClose={onTogglePopover} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Toolbar
// ─────────────────────────────────────────────────────────────────

function Toolbar({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
  const VIEWS: { key: View; label: string }[] = [
    { key: "lista", label: "Lista" },
    { key: "timeline", label: "Timeline" },
    { key: "racconto", label: "Racconto" },
  ];

  return (
    <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
      {/* Eyebrow */}
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        Day itinerary
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Show map */}
        <button className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
          <IconMap size={14} />
          Show map
        </button>

        {/* AI organize — day level */}
        <button className="inline-flex items-center gap-1.5 bg-orange text-white text-[12px] font-semibold px-3 py-1.5 rounded-full hover:bg-orange/90 transition-colors shadow-sm">
          <IconSparkles size={13} />
          Organizza questo giorno
        </button>

        {/* View toggle */}
        <div className="flex items-center bg-zinc-100 rounded-full border border-zinc-200 p-[3px] gap-[2px]">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150",
                view === key
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────

type AddState = { afterId: string; mode: "block" | "activity" } | null;

export default function ActivitiesEditorDaySketch() {
  const [view, setView] = useState<View>("timeline");
  const [timeline, setTimeline] = useState<TimelineItem[]>(MOCK);
  const [expandedBridges, setExpandedBridges] = useState<Set<string>>(new Set());
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [hoveredAdd, setHoveredAdd] = useState<string | null>(null);
  const [addState, setAddState] = useState<AddState>(null);

  function toggleBridge(id: string) {
    setExpandedBridges((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePopover(id: string) {
    setOpenPopover((prev) => (prev === id ? null : id));
  }

  function deleteBlock(id: string) {
    setTimeline((prev) => prev.filter((item) => item.id !== id));
  }

  function closeAdd() {
    setAddState(null);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Design badge */}
      <div className="fixed top-3 right-3 z-50 bg-orange/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.10em] shadow-md pointer-events-none">
        Design sketch
      </div>

      <main className="max-w-[700px] mx-auto px-5 py-10">
        <Toolbar view={view} onViewChange={setView} />

        {/* ── Lista placeholder ── */}
        {view === "lista" && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
            <p className="text-[13px] text-ink-faint italic">Vista Lista — da progettare</p>
          </div>
        )}

        {/* ── Racconto placeholder ── */}
        {view === "racconto" && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
            <p className="text-[13px] text-ink-faint italic">Vista Racconto — da progettare</p>
          </div>
        )}

        {/* ── Timeline (spine) ── */}
        {view === "timeline" && (
          <div className="relative">
            {/* Spine verticale — continua attraverso tutte le sezioni */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-orange/15 rounded-full pointer-events-none"
              style={{ left: SPINE_LEFT }}
            />

            {timeline.map((item, idx) => {
              const nextItem = timeline[idx + 1];
              // Mostra add affordance dopo ogni blocco (non dopo bridge, non dopo section,
              // e non se il prossimo item è una section)
              const showAddSlot =
                item.kind === "block" &&
                nextItem &&
                nextItem.kind !== "section";
              const addId = `add-${item.id}`;

              return (
                <div key={item.id}>
                  {/* ── Section divider ── */}
                  {item.kind === "section" && (
                    <SectionDivider label={item.label} count={item.count} />
                  )}

                  {/* ── Block ── */}
                  {item.kind === "block" && (
                    <BlockCard
                      block={item}
                      popoverOpen={openPopover === item.id}
                      onTogglePopover={() => togglePopover(item.id)}
                      onDelete={() => deleteBlock(item.id)}
                    />
                  )}

                  {/* ── Bridge ── */}
                  {item.kind === "bridge" && (
                    <BridgeRow
                      bridge={item}
                      isExpanded={expandedBridges.has(item.id)}
                      onToggle={() => toggleBridge(item.id)}
                    />
                  )}

                  {/* ── Add affordance (tra blocchi) ── */}
                  {showAddSlot && (
                    <div
                      onMouseEnter={() => setHoveredAdd(addId)}
                      onMouseLeave={() => setHoveredAdd(null)}
                    >
                      {addState?.afterId === item.id ? (
                        addState.mode === "block" ? (
                          <BlockComposer onClose={closeAdd} />
                        ) : (
                          <ActivityComposer onClose={closeAdd} />
                        )
                      ) : (
                        <AddAffordance
                          visible={hoveredAdd === addId}
                          onAddBlock={() => setAddState({ afterId: item.id, mode: "block" })}
                          onAddActivity={() => setAddState({ afterId: item.id, mode: "activity" })}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add alla fine della timeline */}
            <div
              className="mt-2"
              onMouseEnter={() => setHoveredAdd("end")}
              onMouseLeave={() => setHoveredAdd(null)}
            >
              {addState?.afterId === "end" ? (
                addState.mode === "block" ? (
                  <BlockComposer onClose={closeAdd} />
                ) : (
                  <ActivityComposer onClose={closeAdd} />
                )
              ) : (
                <AddAffordance
                  visible={hoveredAdd === "end"}
                  onAddBlock={() => setAddState({ afterId: "end", mode: "block" })}
                  onAddActivity={() => setAddState({ afterId: "end", mode: "activity" })}
                />
              )}
            </div>
          </div>
        )}

        {/* Legenda interazioni */}
        <div className="mt-12 pt-6 border-t border-zinc-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint mb-3">
            Interazioni sketch
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-ink-soft">
            <span>🖱 Hover blocco → azioni (✏️ 🗑 ⠿)</span>
            <span>✏️ Pencil → popover istanza (orario, fuzzy, nota, status)</span>
            <span>🗑 Trash → rimuove dal giorno</span>
            <span>🔀 Bridge → click per espandere card</span>
            <span>➕ Hover tra blocchi → add affordance</span>
            <span>🎛 Toggle Lista | Timeline | Racconto</span>
          </div>
        </div>
      </main>
    </div>
  );
}
