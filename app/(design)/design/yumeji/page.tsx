"use client";

/**
 * Yumeji · design sketch
 *
 * Stati stackati che convalidano le decisioni della spec viva
 * `docs/design/yumeji.md`:
 *
 *   1. Header · due porte (Row 1 link + Row 2 toggle pin), 5 micro-stati
 *   2. Drawer overlay in trip context · chip "Per Tokyo · 5" + "Da schedulare · 5"
 *      attivi di default (Dec 11)
 *   3. Drawer pinned + drag&drop in azione · ghost card su Timeline
 *   4. Drawer global (fuori trip context)
 *   5. Empty state · primo accesso da trip
 *
 * Pattern list-style ispirato a `features/day/DayList.tsx` (Dec 10):
 *   separatori dashed, grid 40px/1fr, selected = bg-ink + barra arancione.
 *   Search field via `<SoftField>` (Dec 10), focus automatico on open.
 *
 * Tutto inline per agilità. Pagina dedicata `/yumeji` ancora TBD nella spec.
 */

import { useEffect, useRef, useState } from "react";
import { SoftField } from "@/components/ui/SoftField";
import { IconSearch, IconX, IconPin, IconArrowsMaximize } from "@/components/ui/icons";

type Yume = {
  id: string;
  name: string;
  zone: string;
  country: string;
  duration: string;
  price: string;
  thumb: string;
  category: string;
  macro: "Esplora" | "Mangia" | "Dormi";
  priority: "must" | null;
  scheduledDay: string | null;
  scheduledTime?: string;
};

const YUME_TOKYO: Yume[] = [
  { id: "sensoji",  name: "Sensō-ji",         zone: "Asakusa",  country: "Giappone", duration: "1h",    price: "free", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", category: "ti-building-arch", macro: "Esplora", priority: "must", scheduledDay: null },
  { id: "teamlab",  name: "teamLab Planets",  zone: "Toyosu",   country: "Giappone", duration: "3h",    price: "€32",  thumb: "linear-gradient(160deg,#a8c5d6,#475565)", category: "ti-palette",        macro: "Esplora", priority: null,   scheduledDay: null },
  { id: "tsukiji",  name: "Mercato Tsukiji",  zone: "Chuo",     country: "Giappone", duration: "2h",    price: "€20",  thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", category: "ti-fish",           macro: "Mangia",  priority: "must", scheduledDay: "D2", scheduledTime: "08:00" },
  { id: "goldengai",name: "Golden Gai bars",  zone: "Shinjuku", country: "Giappone", duration: "2h",    price: "€40",  thumb: "linear-gradient(160deg,#e8c179,#84571c)", category: "ti-glass",          macro: "Mangia",  priority: null,   scheduledDay: null },
  { id: "yoyogi",   name: "Yoyogi park",      zone: "Shibuya",  country: "Giappone", duration: "2h",    price: "€10",  thumb: "linear-gradient(160deg,#9bbf9a,#557a45)", category: "ti-tree",           macro: "Esplora", priority: null,   scheduledDay: null },
  { id: "skytree",  name: "Tokyo Skytree",    zone: "Sumida",   country: "Giappone", duration: "1h 30", price: "€25",  thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)", category: "ti-tower",          macro: "Esplora", priority: null,   scheduledDay: null },
  { id: "ginza",    name: "Caffè a Ginza",    zone: "Chuo",     country: "Giappone", duration: "45min", price: "€8",   thumb: "linear-gradient(160deg,#cdb2a5,#6a4d3e)", category: "ti-coffee",         macro: "Mangia",  priority: null,   scheduledDay: "D3", scheduledTime: "10:00" },
];

const YUME_GLOBAL: Yume[] = [
  { id: "guell",    name: "Park Güell",       zone: "Barcellona",  country: "Spagna",   duration: "2h", price: "€25", thumb: "linear-gradient(160deg,#b8a8c9,#5d4a7a)", category: "ti-building-monument", macro: "Esplora", priority: null,   scheduledDay: null },
  { id: "coloss",   name: "Colosseo",         zone: "Roma",        country: "Italia",   duration: "2h", price: "€18", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", category: "ti-building-monument", macro: "Esplora", priority: "must", scheduledDay: null },
  { id: "sintra",   name: "Palácio Sintra",   zone: "Sintra",      country: "Portogallo",duration: "3h", price: "€20", thumb: "linear-gradient(160deg,#a8d6d2,#5f9e9a)", category: "ti-building-castle",   macro: "Esplora", priority: null,   scheduledDay: null },
  { id: "trastev",  name: "Cena a Trastevere",zone: "Roma",        country: "Italia",   duration: "2h", price: "€35", thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", category: "ti-tools-kitchen",     macro: "Mangia",  priority: null,   scheduledDay: null },
];

const ALL_YUME = [...YUME_TOKYO, ...YUME_GLOBAL];

/* ─────────────────────────────────────────────────────────────────
   Stato sketch · primitives
───────────────────────────────────────────────────────────────── */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg rounded-xl border border-border overflow-hidden">
      {children}
    </div>
  );
}

function StateLabel({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1.5">
      <span className="w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-medium inline-flex items-center justify-center">
        {num}
      </span>
      <span className="text-[11px] uppercase tracking-[0.10em] font-medium text-ink-soft">
        <b className="text-ink">{title}</b>
        <span className="text-ink-faint normal-case tracking-normal"> · {desc}</span>
      </span>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex justify-center items-center gap-1.5 text-ink-faint text-[11px] py-1">
      <i className="ti ti-arrow-down text-[14px]" />
      <span>{label}</span>
    </div>
  );
}

function Thumb({ gradient, size = 32 }: { gradient: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, backgroundImage: gradient }}
      className="rounded-md shrink-0 bg-cover bg-center"
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   AppHeader mock — Row 1 nav (con "Yumeji") + Row 2 toggle pin-yumeji
───────────────────────────────────────────────────────────────── */

/**
 * Glifo brand Yumeji-pin · inline SVG.
 * Asset reali: public/yumeji-pin.svg (filled) e public/yumeji-pin-outline.svg.
 */
function YumejiPinFilled({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 32"
      width={size * 0.75}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0Zm0 4.5c.2 0 .38.12.46.31l1.18 2.93a4 4 0 0 0 2.62 2.62l2.93 1.18a.5.5 0 0 1 0 .92l-2.93 1.18a4 4 0 0 0-2.62 2.62l-1.18 2.93a.5.5 0 0 1-.92 0l-1.18-2.93a4 4 0 0 0-2.62-2.62L4.81 12.46a.5.5 0 0 1 0-.92l2.93-1.18a4 4 0 0 0 2.62-2.62l1.18-2.93A.5.5 0 0 1 12 4.5Z"
      />
    </svg>
  );
}

function YumejiPinOutline({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="-1 -1 26 34"
      width={size * 0.78}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0Z" />
      <path d="M12 4.5c.2 0 .38.12.46.31l1.18 2.93a4 4 0 0 0 2.62 2.62l2.93 1.18a.5.5 0 0 1 0 .92l-2.93 1.18a4 4 0 0 0-2.62 2.62l-1.18 2.93a.5.5 0 0 1-.92 0l-1.18-2.93a4 4 0 0 0-2.62-2.62L4.81 12.46a.5.5 0 0 1 0-.92l2.93-1.18a4 4 0 0 0 2.62-2.62l1.18-2.93A.5.5 0 0 1 12 4.5Z" />
    </svg>
  );
}

/**
 * Toggle pin-yumeji nel sub-header (stati idle/hover · standalone button).
 * Per il selected, vedi YumejiToggleArea: l'area si "espande" fino al bordo
 * destro del sub-header con bg-ink + barra arancione absolute.
 */
function YumejiToggle({
  state = "idle",
}: {
  state?: "idle" | "hover";
}) {
  return (
    <span
      className={`inline-flex items-center justify-center w-[28px] h-[28px] rounded-md text-ink ${
        state === "hover" ? "bg-surface-soft" : "bg-transparent"
      }`}
      title="Apri Yumeji"
    >
      <YumejiPinOutline size={20} />
    </span>
  );
}

/**
 * Area destra del sub-header che ospita il toggle.
 * Quando selected, si estende dall'icona al bordo destro con bg-ink
 * (continuità visiva col drawer aperto), barra arancione fine a left:0,
 * glifo pieno bianco rimpicciolito.
 */
function YumejiToggleArea({
  state = "idle",
}: {
  state: "idle" | "hover" | "selected";
}) {
  if (state === "selected") {
    return (
      <span className="self-stretch inline-flex items-center bg-ink text-white relative pl-3 pr-5">
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[20px] bg-orange rounded-r-[2px]"
        />
        <span title="Chiudi Yumeji" className="inline-flex items-center justify-center">
          <YumejiPinFilled size={16} />
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center pr-5">
      <YumejiToggle state={state} />
    </span>
  );
}

function AppHeaderMock({
  yumejiNavActive = false,
  yumejiToggleState = "idle",
  withTripBar = false,
  tripName,
  tripProgress,
}: {
  yumejiNavActive?: boolean;
  yumejiToggleState?: "idle" | "hover" | "selected";
  withTripBar?: boolean;
  tripName?: string;
  tripProgress?: string;
}) {
  return (
    <header className="bg-surface border-b border-border">
      {/* Row 1 · brand + nav + account */}
      <div className="flex items-center gap-6 px-5 h-[52px]">
        {/* Brand */}
        <span className="flex items-center gap-2.5 shrink-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[17px] leading-none"
            style={{
              background: "var(--color-ink)",
              fontFamily: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif',
              fontWeight: 500,
            }}
            aria-hidden
          >
            五
          </span>
          <span
            className="text-tiny text-ink-faint font-normal leading-tight"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            Travel<b className="text-ink font-medium">Go</b>
          </span>
        </span>

        {/* Nav · My trips · Explore · Yumeji */}
        <nav className="flex items-center gap-[22px] text-meta text-ink-soft">
          <span className="text-ink font-medium border-b-2 border-orange pb-0.5">My trips</span>
          <span>Explore</span>
          <span className={yumejiNavActive ? "text-ink font-medium border-b-2 border-orange pb-0.5" : ""}>
            Yumeji
          </span>
        </nav>

        {/* Right side · locale + avatar */}
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-pill border border-border text-tiny text-ink-soft"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            IT
          </span>
          <span className="w-[30px] h-[30px] rounded-full bg-surface-soft border border-border" />
        </div>
      </div>

      {/* Row 2 · trip sub-bar — host del toggle Yumeji */}
      {withTripBar && (
        <div className="bg-bg border-t border-b border-border">
          <div className="flex items-center pl-5 h-[42px] gap-3.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-micro font-medium tracking-eyebrow uppercase text-orange truncate">
                {tripName}
              </span>
              {tripProgress && (
                <>
                  <span className="text-ink-faint text-mini">·</span>
                  <span className="text-mini text-ink-soft">{tripProgress}</span>
                </>
              )}
            </div>
            <nav className="flex items-center gap-1 ml-auto">
              {["Trip", "Day-by-day", "Explore", "Notes"].map((tab) => (
                <span
                  key={tab}
                  className={
                    tab === "Day-by-day"
                      ? "px-3 py-[5px] rounded-pill text-mini bg-ink text-white font-medium"
                      : "px-3 py-[5px] rounded-pill text-mini text-ink-soft"
                  }
                >
                  {tab}
                </span>
              ))}
            </nav>
            <span className="w-px h-[22px] bg-border" />
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-tiny border border-border text-ink-soft">
              <span className="w-[7px] h-[7px] rounded-full bg-ink-faint" />
              View mode
            </span>
            <YumejiToggleArea state={yumejiToggleState} />
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Yume drawer · List-style (pattern DayList)
───────────────────────────────────────────────────────────────── */

function YumeRow({ item }: { item: Yume }) {
  const isScheduled = !!item.scheduledDay;
  return (
    <li className="list-none border-b border-dashed border-border last:border-0">
      <button
        type="button"
        className="grid w-full items-center text-left grid-cols-[40px_1fr] gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-surface-soft"
      >
        <Thumb gradient={item.thumb} size={40} />
        <div className="min-w-0">
          <div className="text-micro tracking-eyebrow uppercase text-orange font-medium truncate">
            {item.zone} · {item.duration} · {item.price}
          </div>
          <div className="text-meta text-ink truncate inline-flex items-center gap-1.5 mt-0.5">
            <span className="font-medium">{item.name}</span>
            {item.priority === "must" && !isScheduled && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-pill font-medium uppercase tracking-[0.04em] shrink-0"
                style={{ background: "var(--color-orange-soft)", color: "var(--color-orange-deep)" }}
              >
                Must
              </span>
            )}
            {isScheduled && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-pill font-medium tracking-[0.04em] shrink-0"
                style={{ background: "var(--color-status-paid-bg)", color: "var(--color-status-paid-fg)" }}
              >
                {item.scheduledDay} · {item.scheduledTime}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function YumeFilterChip({
  label,
  count,
  active = false,
}: {
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <span
      className={
        active
          ? "text-[10px] px-2 py-1 rounded-pill bg-ink text-white font-medium"
          : "text-[10px] px-2 py-1 rounded-pill bg-surface border border-border text-ink-soft"
      }
    >
      {label}
      {count !== undefined && <span className={active ? "opacity-80 ml-0.5" : "ml-0.5"}>· {count}</span>}
    </span>
  );
}

function YumeDrawer({
  mode = "overlay",
  title = "I tuoi Yume",
  chips,
  items,
  showFooter = true,
  emptyMessage,
  autoFocusSearch = false,
}: {
  mode?: "overlay" | "pinned";
  title?: string;
  chips: { label: string; count?: number; active?: boolean }[];
  items: Yume[];
  showFooter?: boolean;
  emptyMessage?: string;
  /** Quando true, mette il focus sul campo di ricerca al mount (apertura del drawer) */
  autoFocusSearch?: boolean;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // In runtime: il focus al campo si applica all'apertura del drawer.
  // Nello sketch, lo applichiamo on mount solo al primo drawer (stato 2)
  // tramite la prop autoFocusSearch — altrimenti il focus rimbalzerebbe tra
  // i 4 drawer stackati a load.
  useEffect(() => {
    if (autoFocusSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [autoFocusSearch]);

  return (
    <div
      className={`w-[340px] shrink-0 bg-surface ${mode === "overlay" ? "border-l border-border" : "border border-border rounded-xl overflow-hidden"} flex flex-col`}
      style={mode === "overlay" ? {} : { boxShadow: "var(--shadow-float)" }}
    >
      {/* Drawer header */}
      <div className="flex items-center px-3.5 py-2.5 border-b border-dashed border-border">
        <span className="text-meta font-medium text-ink inline-flex items-center gap-1.5">
          <span style={{ color: "var(--color-orange-deep)" }} className="inline-flex items-center">
            <YumejiPinFilled size={14} />
          </span>
          {title}
        </span>
        <span className="ml-auto inline-flex items-center gap-2.5 text-ink-faint">
          <IconPin
            size={14}
            className={mode === "pinned" ? "rotate-45" : ""}
            style={mode === "pinned" ? { color: "var(--color-orange-deep)" } : undefined}
            aria-hidden
          />
          <IconArrowsMaximize size={14} aria-hidden />
          <IconX size={14} aria-hidden />
        </span>
      </div>

      {/* Search · SoftField */}
      <div className="px-3.5 pt-2.5 pb-2 border-b border-dashed border-border">
        <SoftField
          ref={searchRef as React.Ref<HTMLInputElement>}
          value={search}
          onChange={setSearch}
          placeholder="Cerca nei tuoi yume…"
          size="sm"
          type="search"
        >
          <SoftField.Prefix>
            <IconSearch />
          </SoftField.Prefix>
        </SoftField>
      </div>

      {/* Chip filters */}
      <div className="px-3.5 py-2.5 border-b border-dashed border-border flex flex-wrap gap-1">
        {chips.map((c, i) => (
          <YumeFilterChip key={i} label={c.label} count={c.count} active={c.active} />
        ))}
        {chips.length > 0 && (
          <span className="text-[10px] px-2 py-1 rounded-pill bg-surface border border-border text-ink-soft inline-flex items-center gap-1">
            <i className="ti ti-plus text-[10px]" />
            Altri filtri
          </span>
        )}
      </div>

      {/* List or empty */}
      <div className="flex-1 overflow-hidden">
        {emptyMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4">
            <span style={{ color: "var(--color-orange)" }} className="inline-flex">
              <YumejiPinOutline size={32} />
            </span>
            <p className="text-meta font-medium text-ink mt-2 mb-1">Niente da mostrare</p>
            <p className="text-mini text-ink-faint max-w-[240px] leading-snug">{emptyMessage}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-mini text-orange-deep font-medium">
              Esplora con Discovery
            </span>
          </div>
        ) : (
          <ol className="m-0 p-0 py-0.5 list-none">
            {items.map((it) => (
              <YumeRow key={it.id} item={it} />
            ))}
          </ol>
        )}
      </div>

      {/* Footer link */}
      {showFooter && (
        <div className="border-t border-dashed border-border px-3.5 py-2 text-mini text-orange-deep font-medium bg-surface-soft cursor-pointer">
          Apri pagina Yumeji
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mock Timeline (drop target — solo per stato 3)
───────────────────────────────────────────────────────────────── */

function TimelineMock({ withDropHighlight = false }: { withDropHighlight?: boolean }) {
  const slots = [
    { time: "08:00", item: "Mercato Tsukiji", thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)" },
    { time: "10:30", item: null, isDropTarget: withDropHighlight },
    { time: "12:30", item: "Pranzo a Tsukiji", thumb: "linear-gradient(160deg,#cdb2a5,#6a4d3e)" },
    { time: "14:30", item: "Sumida Park", thumb: "linear-gradient(160deg,#9bbf9a,#557a45)" },
    { time: "20:00", item: "Skytree", thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)" },
  ];
  return (
    <div className="flex-1 px-5 py-4 bg-bg overflow-hidden">
      <div className="text-[10px] uppercase tracking-[0.10em] text-ink-faint font-medium mb-3">
        Day 2 · Asakusa
      </div>
      <div className="flex flex-col gap-2">
        {slots.map((s, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <span className="w-[44px] text-[11px] text-ink-faint pt-1.5 tabular-nums">{s.time}</span>
            {s.item ? (
              <div className="flex-1 bg-surface border border-border rounded-md px-3 py-2 flex items-center gap-2.5">
                <span
                  style={{ width: 28, height: 28, backgroundImage: s.thumb }}
                  className="rounded shrink-0 bg-cover"
                />
                <span className="text-[12px] text-ink font-medium">{s.item}</span>
              </div>
            ) : (
              <div
                className={`flex-1 rounded-md px-3 py-2 text-[11px] inline-flex items-center justify-center gap-1.5 ${
                  s.isDropTarget
                    ? "text-orange-deep font-medium"
                    : "text-ink-faint"
                }`}
                style={
                  s.isDropTarget
                    ? {
                        background: "var(--color-orange-soft)",
                        border: "1.5px dashed var(--color-orange)",
                      }
                    : {
                        border: "1px dashed var(--color-border-strong)",
                        background: "transparent",
                      }
                }
              >
                {s.isDropTarget ? (
                  <>
                    <i className="ti ti-crosshair text-[13px]" />
                    Rilascia qui · Sensō-ji
                  </>
                ) : (
                  <>+ slot libero</>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Drag ghost — usato in stato 3, fluttuante sopra il main
───────────────────────────────────────────────────────────────── */

function DragGhost({ item, top, left }: { item: Yume; top: number; left: number }) {
  return (
    <div
      className="absolute z-10 bg-surface rounded-md px-2.5 py-2 flex items-center gap-2.5 text-[11.5px] pointer-events-none"
      style={{
        top,
        left,
        boxShadow: "var(--shadow-float)",
        transform: "scale(0.95) rotate(-1deg)",
        border: "1px solid var(--color-orange-border)",
        background: "var(--color-surface)",
        width: 280,
      }}
    >
      <Thumb gradient={item.thumb} size={32} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-ink truncate">{item.name}</div>
        <div className="text-[10px] text-ink-faint truncate">
          {item.zone} · {item.duration}
        </div>
      </div>
      <i className="ti ti-grip-vertical text-[14px] text-orange-deep" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · 5 stati stackati
───────────────────────────────────────────────────────────────── */

export default function YumejiSketch() {
  const tokyoUnscheduled = YUME_TOKYO.filter((i) => !i.scheduledDay);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-3.5">
      <header className="mb-2">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">
          Sketch
        </div>
        <h1 className="text-[22px] font-medium leading-tight">Yumeji · il sentiero dei sogni</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          Collezione globale di luoghi e attività salvati a livello utente. Promossa da{" "}
          <a className="text-orange-deep hover:underline" href="/design/wishlist">
            /design/wishlist
          </a>{" "}
          (trip-bound) a livello account, con auto-filter geo dentro un trip. Drawer destro come quick-access ovunque,
          pagina dedicata <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">/yumeji</code>{" "}
          per browsing e composizione (TBD).
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/yumeji">
              docs/design/yumeji.md
            </a>
          </span>
        </p>
      </header>

      {/* ═══ STATO 1 · Header · entry point ══════════════════════════════ */}
      <div>
        <StateLabel
          num={1}
          title="Header · due porte"
          desc="Row 1 'Yumeji' → pagina · Row 2 toggle pin → drawer · 4 micro-stati"
        />
        <Frame>
          <AppHeaderMock />
          <div className="bg-surface-soft px-5 py-2 text-[10.5px] text-ink-faint uppercase tracking-[0.08em]">
            Fuori trip-context · Row 2 nascosta · link "Yumeji" in nav, niente toggle
          </div>
          <AppHeaderMock yumejiNavActive />
          <div className="bg-surface-soft px-5 py-2 text-[10.5px] text-ink-faint uppercase tracking-[0.08em]">
            Su pagina /yumeji · link "Yumeji" attivo con underline arancio
          </div>
          <AppHeaderMock
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 2 of 5"
            yumejiToggleState="idle"
          />
          <div className="bg-surface-soft px-5 py-2 text-[10.5px] text-ink-faint uppercase tracking-[0.08em]">
            Dentro trip · toggle pin-yumeji idle (ghost, outline ink) tutto a destra dopo View mode
          </div>
          <AppHeaderMock
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 2 of 5"
            yumejiToggleState="hover"
          />
          <div className="bg-surface-soft px-5 py-2 text-[10.5px] text-ink-faint uppercase tracking-[0.08em]">
            Hover · bg surface-soft
          </div>
          <AppHeaderMock
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 2 of 5"
            yumejiToggleState="selected"
          />
          <div className="bg-surface-soft px-5 py-2 text-[10.5px] text-ink-faint uppercase tracking-[0.08em]">
            Selected (drawer aperto) · bg-ink, glifo pieno bianco, barra arancione a sinistra (pattern DayItem)
          </div>
        </Frame>
        <div className="mt-2 px-1.5 text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Due livelli</b> · Row 1 host del link nav <code className="bg-surface-soft px-1 py-0.5 rounded">Yumeji</code> (porta alla pagina); Row 2 host del toggle pin-yumeji (apre il drawer, visibile solo in trip-context). <b className="text-ink-soft font-medium">Selected state</b> ispirato a <code className="bg-surface-soft px-1 py-0.5 rounded">features/day/DayItem.tsx</code> · niente counter.
        </div>
      </div>

      <Arrow label="click sul toggle pin-yumeji nel sub-header del trip Tokyo" />

      {/* ═══ STATO 2 · Drawer overlay aperto in trip context ════════════ */}
      <div>
        <StateLabel
          num={2}
          title="Drawer overlay · in trip context"
          desc="default: chip 'Per Tokyo · 5' + 'Da schedulare · 5' entrambi attivi (Dec 11)"
        />
        <Frame>
          <AppHeaderMock
            yumejiToggleState="selected"
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 2 of 5"
          />
          <div className="flex relative" style={{ minHeight: 520 }}>
            {/* Main shrunken con scrim leggero */}
            <div className="flex-1 px-5 py-5 bg-bg" style={{ background: "var(--color-bg)" }}>
              <div className="text-[10px] uppercase tracking-[0.10em] text-ink-faint font-medium mb-2">
                Day 2 · Asakusa
              </div>
              <div className="text-[14px] font-medium text-ink leading-snug">
                Iniziate dall'alba al mercato del pesce — il resto del giorno è bonus.
              </div>
              <div className="text-[11.5px] text-ink-soft mt-2 leading-relaxed max-w-[420px]">
                Una giornata che si apre con sushi all'alba e si chiude in cima alla Skytree. La luce delle prime ore al
                Tsukiji è l'unica cosa che non potete davvero pianificare.
              </div>
              {/* Mini activity list to show context */}
              <div className="mt-5 flex flex-col gap-1.5">
                {["08:00 · Mercato Tsukiji", "10:30 · slot libero", "12:30 · Pranzo a Tsukiji", "14:30 · Sumida Park"].map((s) => (
                  <div
                    key={s}
                    className="bg-surface border border-border rounded-md px-3 py-2 text-[12px] text-ink"
                  >
                    {s}
                  </div>
                ))}
              </div>
              {/* Scrim */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "rgba(13,44,61,0.04)" }}
              />
            </div>
            {/* Drawer overlay · autoFocus al search on mount */}
            <YumeDrawer
              mode="overlay"
              autoFocusSearch
              chips={[
                { label: "Per Tokyo", count: 5, active: true },
                { label: "Tutti", count: 11 },
                { label: "Da schedulare", count: 5, active: true },
                { label: "Esplora", count: 4 },
                { label: "Mangia", count: 3 },
              ]}
              items={tokyoUnscheduled}
            />
          </div>
        </Frame>
        <div className="mt-2 px-1.5 text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Default in trip-context</b> · <code className="bg-surface-soft px-1 py-0.5 rounded">Per Tokyo · 5</code> + <code className="bg-surface-soft px-1 py-0.5 rounded">Da schedulare · 5</code> entrambi attivi → l'utente vede subito i candidati al drag-into-day per il trip corrente. <b className="text-ink-soft font-medium">Scrim leggero</b> sul main · drawer overlay dismiss con Esc o click fuori.
        </div>
      </div>

      <Arrow label="utente clicca 📌 sul drawer header → entra in modalità pinned per il drag&drop" />

      {/* ═══ STATO 3 · Drawer pinned + drag in azione ════════════════════ */}
      <div>
        <StateLabel
          num={3}
          title="Drawer pinned + drag&drop"
          desc="main shrinkato · drawer parte del flow · ghost card su Timeline"
        />
        <Frame>
          <AppHeaderMock
            yumejiToggleState="selected"
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 2 of 5"
          />
          <div className="flex relative" style={{ minHeight: 540 }}>
            <TimelineMock withDropHighlight />
            <YumeDrawer
              mode="pinned"
              chips={[
                { label: "Per Tokyo", count: 5, active: true },
                { label: "Tutti", count: 11 },
                { label: "Da schedulare", count: 5, active: true },
              ]}
              items={tokyoUnscheduled.map((it) =>
                it.id === "sensoji" ? { ...it, name: it.name } : it,
              )}
            />
            {/* Ghost card */}
            <DragGhost item={YUME_TOKYO[0]} top={195} left={210} />
          </div>
        </Frame>
        <div className="mt-2 px-1.5 text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Modalità pinned</b> · main shrink-a, drawer parte del flow normale, niente scrim. <b className="text-ink-soft font-medium">Slot drop target</b> evidenziato con bordo dashed orange + microcopy "Rilascia qui · Sensō-ji". <b className="text-ink-soft font-medium">Ghost card</b> fluttua col cursore (scale 0.95, rotate -1°, shadow-float).
        </div>
      </div>

      <Arrow label="utente apre il drawer fuori da un trip" />

      {/* ═══ STATO 4 · Drawer global (fuori trip context) ════════════════ */}
      <div>
        <StateLabel
          num={4}
          title="Drawer global · fuori trip context"
          desc="niente chip geo trip-aware · vista mondo · filtri per macro categoria"
        />
        <Frame>
          <AppHeaderMock yumejiNavActive />
          <div className="flex relative" style={{ minHeight: 480 }}>
            <div className="flex-1 px-5 py-5 bg-bg">
              <div className="text-[10px] uppercase tracking-[0.10em] text-ink-faint font-medium mb-2">
                My trips
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-[460px]">
                {["Tokyo 2026", "Roma weekend", "Lisbona estate", "+ Nuovo trip"].map((t) => (
                  <div
                    key={t}
                    className="bg-surface border border-border rounded-md px-3 py-3 text-[12px] text-ink"
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "rgba(13,44,61,0.04)" }}
              />
            </div>
            <YumeDrawer
              mode="overlay"
              chips={[
                { label: "Tutti", count: 11, active: true },
                { label: "Da schedulare", count: 9 },
                { label: "Esplora", count: 7 },
                { label: "Mangia", count: 3 },
                { label: "Dormi", count: 1 },
              ]}
              items={[...ALL_YUME].slice(0, 6)}
            />
          </div>
        </Frame>
        <div className="mt-2 px-1.5 text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Fuori da trip-context</b> · niente chip <code className="bg-surface-soft px-1 py-0.5 rounded">Per Tokyo</code>. Default <code className="bg-surface-soft px-1 py-0.5 rounded">Tutti</code> attivo. Macro categorie ordinate per count. Geo (vista mondo) accessibile via <code className="bg-surface-soft px-1 py-0.5 rounded">+ Altri filtri</code>.
        </div>
      </div>

      <Arrow label="primo accesso · zero yume salvati" />

      {/* ═══ STATO 5 · Empty state ════════════════════════════════════════ */}
      <div>
        <StateLabel num={5} title="Empty state · primo accesso da trip" desc="utente apre il drawer per la prima volta, zero yume salvati" />
        <Frame>
          <AppHeaderMock
            yumejiToggleState="selected"
            withTripBar
            tripName="Tokyo 2026"
            tripProgress="Day 1 of 5"
          />
          <div className="flex relative" style={{ minHeight: 400 }}>
            <div className="flex-1 px-5 py-5 bg-bg">
              <div className="text-[10px] uppercase tracking-[0.10em] text-ink-faint font-medium mb-2">Day 1 · Asakusa</div>
              <div className="text-[14px] text-ink font-medium leading-snug">Benvenuto a Tokyo, Enrico</div>
              <div className="text-[11.5px] text-ink-soft mt-1.5 max-w-[420px] leading-relaxed">
                Il primo giorno si apre piano. Apri Yumeji per salvare le idee che troverai in Discovery e portarle qui nei giorni.
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "rgba(13,44,61,0.04)" }}
              />
            </div>
            <YumeDrawer
              mode="overlay"
              chips={[]}
              items={[]}
              emptyMessage="Non hai ancora salvato luoghi nei tuoi yume. Esplora Discovery, salva quello che ti incuriosisce. Quando avrai un trip, i tuoi yume si filtreranno automaticamente per destinazione."
              showFooter={false}
            />
          </div>
        </Frame>
        <div className="mt-2 px-1.5 text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Empty state</b> · niente chip, niente search "vuota" · solo l'illustrazione, la copy che spiega il valore e il CTA a Discovery. <b className="text-ink-soft font-medium">Header</b> mostra l'icona senza badge counter (Dec 2).
        </div>
      </div>

      {/* ═══ TBD · Pagina dedicata /yumeji ═══════════════════════════════ */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">TBD</div>
        <h2 className="text-[16px] font-medium leading-tight mb-2">Pagina dedicata <code className="bg-surface-soft px-1 py-0.5 rounded text-[13px]">/yumeji</code></h2>
        <p className="text-[12.5px] text-ink-soft leading-relaxed max-w-[680px]">
          Ancora aperta nella spec — editorial à la <a href="/design/discovery" className="text-orange-deep hover:underline">Discovery</a> con manifest+widget (Hero, Map, Clusters, TripSuggestions, Editorial, Filters). Da disegnare nella prossima iterazione, quando avremo deciso il bilanciamento <b className="text-ink font-medium">map-centric</b> vs <b className="text-ink font-medium">editorial-puro</b>.
        </p>
      </div>

      <footer className="mt-6 pt-4 border-t border-border text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Decisioni convalidate da questo sketch</b> · Dec 2 (nav semplificata + due affordance), Dec 3 (drawer hybrid overlay→pinned), Dec 4 (auto-filter geo gerarchia 3 livelli), Dec 6 (drag&drop su slot), Dec 10 (drawer V1 Card Stack), Dec 11 (tassonomia filtri, default trip-context), Dec 12 (icona <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">ti-bookmark</code> placeholder).
        <br />
        <span className="mt-1.5 inline-block">
          <b className="text-ink-soft font-medium">Aperte</b> · pagina <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">/yumeji</code>, stato schedulato (click su card "D2 · 8:00"), drag&drop micro-interactions (target invalido, drop fallito, keyboard fallback), empty state per filtri vuoti.
        </span>
      </footer>
    </div>
  );
}
