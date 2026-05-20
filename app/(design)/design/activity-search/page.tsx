"use client";

/**
 * Design sketch — Trip Activity Search (autocomplete)
 * URL: /design/activity-search
 *
 * Combobox stile AddressField: input "soft pill" da solo, dropdown
 * flottante in posizione absolute appena sotto, mostrato solo a focus.
 * Navigazione keyboard (↑ ↓ Enter Esc), ARIA combobox/listbox/option,
 * click-outside per chiudere. Riusa SoftField e i token TravelGo.
 *
 * I risultati sono divisi in due sezioni: "Da programmare" sopra,
 * "Già pianificate" sotto con etichetta locale del giorno (es. "Sab 12").
 *
 * Mock statici, no API.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IconSearch,
  IconX,
  IconCalendarTime,
  IconCircleDashed,
  IconMapPin,
} from "@/components/ui/icons";
import { SoftField } from "@/components/ui/SoftField";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type BookingStatus = "todo" | "booked" | "paid";

interface ActivityRow {
  id: string;
  title: string;
  location?: string;
  scheduled: Array<{
    /** ISO "YYYY-MM-DD" */
    date: string;
    time?: string;
    status?: BookingStatus;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Mock data — Tokyo trip
// ─────────────────────────────────────────────────────────────────

const MOCK: ActivityRow[] = [
  {
    id: "a1",
    title: "Tsukiji Outer Market",
    location: "Chuo, Tokyo",
    scheduled: [{ date: "2026-09-12", time: "09:00", status: "booked" }],
  },
  {
    id: "a2",
    title: "teamLab Planets TOKYO",
    location: "Toyosu, Koto",
    scheduled: [{ date: "2026-09-12", time: "10:30", status: "paid" }],
  },
  {
    id: "a3",
    title: "Shibuya Crossing",
    location: "Shibuya, Tokyo",
    scheduled: [{ date: "2026-09-13", time: "14:00", status: "todo" }],
  },
  {
    id: "a4",
    title: "Meiji Shrine",
    location: "Harajuku, Shibuya",
    scheduled: [{ date: "2026-09-13", time: "16:00", status: "todo" }],
  },
  { id: "a5", title: "Senso-ji Temple", location: "Asakusa, Taito", scheduled: [] },
  {
    id: "a6",
    title: "Shinjuku Gyoen",
    location: "Shinjuku, Tokyo",
    scheduled: [
      { date: "2026-09-14", time: "10:00", status: "booked" },
      { date: "2026-09-17", time: "16:00", status: "todo" },
    ],
  },
  {
    id: "a7",
    title: "Omoide Yokocho",
    location: "Shinjuku, Tokyo",
    scheduled: [{ date: "2026-09-15", time: "19:30" }],
  },
  { id: "a8", title: "Tokyo National Museum", location: "Ueno, Taito", scheduled: [] },
  { id: "a9", title: "Akihabara Electric Town", location: "Chiyoda, Tokyo", scheduled: [] },
  {
    id: "a10",
    title: "Tokyo Skytree",
    location: "Sumida, Tokyo",
    scheduled: [{ date: "2026-09-16", time: "20:00", status: "booked" }],
  },
];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function formatDayLabel(iso: string, locale: string = "it"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  const day = date.getDate();
  const wd = weekday.replace(/\.$/, "");
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${day}`;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 rounded-sm not-italic">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

const STATUS_DOT: Record<BookingStatus, string> = {
  todo: "bg-status-todo-fg",
  booked: "bg-status-booked-fg",
  paid: "bg-status-paid-fg",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  todo: "Da fare",
  booked: "Prenotato",
  paid: "Pagato",
};

// ─────────────────────────────────────────────────────────────────
// ActivitySearchField — combobox in stile AddressField
// ─────────────────────────────────────────────────────────────────

type Props = {
  value: ActivityRow | null;
  onChange: (activity: ActivityRow | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /**
   * Se `true`, la tendina è già aperta al mount (senza richiedere focus
   * o digitazione). Resta comunque chiudibile via click-outside / Esc.
   * Utile in contesti embedded come l'add zone di un day editor.
   */
  defaultOpen?: boolean;
};

function ActivitySearchField({
  value,
  onChange,
  placeholder = "Cerca un'attività del viaggio…",
  label,
  className,
  defaultOpen = false,
}: Props) {
  const [inputText, setInputText] = useState(value?.title ?? "");
  // In modalità `defaultOpen` la lista è sempre visibile come pannello inline.
  // In modalità floating l'apertura è guidata da focus/digitazione.
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Sync input quando il parent cambia value
  useEffect(() => {
    setInputText(value?.title ?? "");
  }, [value]);

  // Filtra + raggruppa
  const { toPlan, planned, flat } = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    // Se è già stata selezionata e il testo coincide col titolo, mostra tutto
    const matches =
      q && q !== (value?.title ?? "").toLowerCase()
        ? MOCK.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              (a.location ?? "").toLowerCase().includes(q),
          )
        : MOCK;
    const toPlan = matches.filter((a) => a.scheduled.length === 0);
    const planned = matches.filter((a) => a.scheduled.length > 0);
    const flat = [...toPlan, ...planned];
    return { toPlan, planned, flat };
  }, [inputText, value]);

  // Click outside chiude il dropdown solo in modalità floating
  useEffect(() => {
    if (defaultOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [defaultOpen]);

  // Reset activeIndex quando la lista cambia
  useEffect(() => {
    setActiveIndex(0);
  }, [inputText]);

  const selectActivity = useCallback(
    (a: ActivityRow) => {
      setInputText(a.title);
      setIsOpen(false);
      onChange(a);
    },
    [onChange],
  );

  const handleInputChange = (text: string) => {
    setInputText(text);
    setIsOpen(true);
    if (value && text !== value.title) onChange(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (isOpen && flat[activeIndex]) {
        e.preventDefault();
        selectActivity(flat[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const optionId = (id: string) => `${listboxId}-opt-${id}`;
  const activeOption = flat[activeIndex];

  // ── Input riusato in entrambe le modalità ──────────────────────
  const inputElement = (
    <SoftField
      value={inputText}
      onChange={handleInputChange}
      placeholder={placeholder}
      label={label}
      autoComplete="off"
      inputProps={{
        onFocus: () => setIsOpen(true),
        onKeyDown: handleKeyDown,
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-controls": isOpen ? listboxId : undefined,
        "aria-expanded": isOpen,
        "aria-activedescendant":
          isOpen && activeOption ? optionId(activeOption.id) : undefined,
      }}
    >
      <SoftField.Prefix>
        <IconSearch
          className={cn(
            "transition-colors duration-150",
            value ? "text-primary" : "text-ink-faint",
          )}
        />
      </SoftField.Prefix>
      {inputText && (
        <SoftField.Suffix>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setInputText("");
              onChange(null);
              setIsOpen(true);
            }}
            className="text-ink-faint hover:text-ink p-0.5 transition-colors"
            aria-label="Pulisci ricerca"
          >
            <IconX size={13} />
          </button>
        </SoftField.Suffix>
      )}
    </SoftField>
  );

  // ── Contenuto della lista (riusato in entrambe le modalità) ────
  const listContent = (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Attività del viaggio"
      className="py-1"
    >
      {/* Sezione 1 — Da programmare */}
      {toPlan.length > 0 && (
        <SectionLabel
          label="Da programmare"
          count={toPlan.length}
          tone="neutral"
        />
      )}
      {toPlan.map((a) => {
        const i = flat.indexOf(a);
        return (
          <Option
            key={a.id}
            id={optionId(a.id)}
            item={a}
            query={inputText}
            active={i === activeIndex}
            onSelect={selectActivity}
            onHover={() => setActiveIndex(i)}
          />
        );
      })}

      {/* Sezione 2 — Già pianificate */}
      {planned.length > 0 && (
        <SectionLabel
          label="Già pianificate"
          count={planned.length}
          tone="brand"
        />
      )}
      {planned.map((a) => {
        const i = flat.indexOf(a);
        return (
          <Option
            key={a.id}
            id={optionId(a.id)}
            item={a}
            query={inputText}
            active={i === activeIndex}
            onSelect={selectActivity}
            onHover={() => setActiveIndex(i)}
          />
        );
      })}
    </ul>
  );

  const emptyState = (
    <div className="px-3 py-3 text-mini text-ink-faint italic text-center">
      Nessun risultato per &ldquo;{inputText}&rdquo;
    </div>
  );

  // ── Modalità INLINE PANEL ──────────────────────────────────────
  // Pannello unico: input sopra, lista sotto, separati da un divider.
  // Occupa lo spazio nel layout (no absolute, no shadow di elevazione).
  if (defaultOpen) {
    return (
      <div
        ref={wrapperRef}
        className={cn(
          "w-full bg-surface border border-border rounded-lg overflow-hidden",
          className,
        )}
      >
        <div className="px-3 py-2.5 border-b border-border">{inputElement}</div>
        <div className="max-h-[360px] overflow-y-auto">
          {flat.length > 0
            ? listContent
            : inputText.trim()
              ? emptyState
              : null}
        </div>
      </div>
    );
  }

  // ── Modalità FLOATING ──────────────────────────────────────────
  // Input da solo, dropdown absolute a focus, click-outside per chiudere.
  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {inputElement}

      {isOpen && flat.length > 0 && (
        <div
          className={cn(
            "absolute z-50 top-[calc(100%+6px)] left-0 right-0",
            "bg-surface border border-border rounded-lg overflow-hidden",
            "shadow-[0_4px_24px_rgba(13,44,61,0.10)]",
          )}
        >
          <div className="max-h-[360px] overflow-y-auto">{listContent}</div>
        </div>
      )}

      {isOpen && flat.length === 0 && inputText.trim() && (
        <div
          className={cn(
            "absolute z-50 top-[calc(100%+6px)] left-0 right-0",
            "bg-surface border border-border rounded-lg",
            "shadow-[0_4px_24px_rgba(13,44,61,0.10)]",
          )}
        >
          {emptyState}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SectionLabel — divider tra i gruppi nel dropdown
// ─────────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "neutral" | "brand";
}) {
  return (
    <li
      role="presentation"
      className={cn(
        "sticky top-0 z-10",
        "flex items-center justify-between px-4 py-1.5",
        "text-micro font-bold uppercase tracking-eyebrow-wide",
        // Background sempre opaco così resta leggibile in sticky
        tone === "brand"
          ? "bg-primary-soft text-primary-deep border-b border-primary-border"
          : "bg-surface-soft text-ink-faint border-b border-border",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "normal-case font-medium tracking-normal tabular-nums",
          tone === "brand" ? "text-primary-deep/70" : "text-ink-faint/80",
        )}
      >
        {count}
      </span>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────
// Option — singola voce del listbox
// ─────────────────────────────────────────────────────────────────

function Option({
  id,
  item,
  query,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  item: ActivityRow;
  query: string;
  active: boolean;
  onSelect: (a: ActivityRow) => void;
  onHover: () => void;
}) {
  const isScheduled = item.scheduled.length > 0;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(item);
      }}
      onMouseEnter={onHover}
      className={cn(
        "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer",
        "transition-colors duration-75",
        active && "bg-surface-soft",
      )}
    >
      {/* Marker verticale: brand se pianificato, neutro se wishlist */}
      <span
        aria-hidden
        className={cn(
          "shrink-0 w-[3px] self-stretch rounded-pill mt-0.5",
          isScheduled ? "bg-primary" : "bg-border-strong",
        )}
      />

      <span className="flex flex-col min-w-0 flex-1">
        <span className="text-meta font-medium text-ink leading-snug truncate">
          {highlight(item.title, query)}
        </span>

        {/* Meta line: location · giorni */}
        <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.location && (
            <span className="inline-flex items-center gap-0.5 text-tiny text-ink-soft">
              <IconMapPin size={10} />
              {item.location}
            </span>
          )}

          {item.location && (
            <span aria-hidden className="text-tiny text-ink-faint">
              ·
            </span>
          )}

          {isScheduled ? (
            item.scheduled.map((sch, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-tiny text-primary-deep font-medium"
                title={
                  sch.status
                    ? `${STATUS_LABEL[sch.status]}${sch.time ? ` · ${sch.time}` : ""}`
                    : sch.time
                      ? `Pianificato alle ${sch.time}`
                      : "Già pianificato"
                }
              >
                {sch.status && (
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block w-1.5 h-1.5 rounded-pill",
                      STATUS_DOT[sch.status],
                    )}
                  />
                )}
                <IconCalendarTime size={10} />
                {formatDayLabel(sch.date)}
                {sch.time && (
                  <span className="text-ink-faint font-normal tabular-nums">
                    {sch.time}
                  </span>
                )}
                {i < item.scheduled.length - 1 && (
                  <span className="text-ink-faint">,</span>
                )}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1 text-tiny text-ink-faint italic">
              <IconCircleDashed size={10} />
              Solo in wishlist
            </span>
          )}
        </span>
      </span>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────
// Status legend
// ─────────────────────────────────────────────────────────────────

function StatusLegend() {
  const items: BookingStatus[] = ["todo", "booked", "paid"];
  return (
    <div className="flex items-center gap-3 text-micro text-ink-faint">
      {items.map((s) => (
        <span key={s} className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className={cn("w-1.5 h-1.5 rounded-pill", STATUS_DOT[s])}
          />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Echo — feedback "hai selezionato X" per la pagina demo
// ─────────────────────────────────────────────────────────────────

function Echo({ selected }: { selected: ActivityRow | null }) {
  return (
    <div className="mt-3 rounded-md border border-border bg-surface p-3 text-mini text-ink-soft">
      {selected ? (
        <>
          Hai selezionato{" "}
          <span className="font-semibold text-ink">{selected.title}</span>
          {selected.scheduled.length > 0 ? (
            <>
              {" "}
              — già pianificata su{" "}
              {selected.scheduled.map((s) => formatDayLabel(s.date)).join(", ")}.
            </>
          ) : (
            <> — ancora in wishlist.</>
          )}
        </>
      ) : (
        <span className="text-ink-faint italic">
          Nessuna attività selezionata.
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function ActivitySearchSketch() {
  const [selectedInline, setSelectedInline] = useState<ActivityRow | null>(null);
  const [selectedFloating, setSelectedFloating] = useState<ActivityRow | null>(null);

  return (
    <div className="max-w-[640px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-primary text-tiny font-medium tracking-eyebrow-wide uppercase mb-2">
          Design · activity-search
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3 text-ink">
          Ricerca attività del viaggio
        </h1>
        <p className="text-meta text-ink-soft leading-relaxed">
          Combobox stile <code className="bg-surface-soft px-1 py-0.5 rounded-sm text-mini">AddressField</code>{" "}
          con due modalità: <b className="text-ink font-medium">inline panel</b>{" "}
          (
          <code className="bg-surface-soft px-1 py-0.5 rounded-sm text-mini">
            defaultOpen
          </code>
          ) — pannello unico che occupa lo spazio nel layout, lista sempre
          visibile — e <b className="text-ink font-medium">floating</b> —
          dropdown a popup che si apre su focus. Risultati divisi in{" "}
          <b className="text-ink font-medium">Da programmare</b> /{" "}
          <b className="text-ink font-medium">Già pianificate</b>, etichetta
          locale del giorno (
          <code className="bg-surface-soft px-1 py-0.5 rounded-sm text-mini">Sab 12</code>
          ).
        </p>
      </header>

      {/* Modalità INLINE — defaultOpen */}
      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-primary text-tiny font-bold tracking-eyebrow-wide uppercase">
            Inline panel
          </span>
          <h2 className="text-meta font-semibold text-ink">
            <code className="bg-surface-soft px-1 py-0.5 rounded-sm">
              defaultOpen
            </code>{" "}
            — pannello sempre aperto
          </h2>
        </div>
        <p className="text-mini text-ink-soft leading-relaxed mb-4">
          Tipico uso: add-zone dentro un day editor. La lista è subito visibile
          (carico già qualche risultato), si prende lo spazio sotto l&apos;input,
          niente shadow di elevazione, niente click-outside che la chiuda.
        </p>
        <ActivitySearchField
          value={selectedInline}
          onChange={setSelectedInline}
          defaultOpen
        />
        <Echo selected={selectedInline} />
      </section>

      {/* Modalità FLOATING — popup classico */}
      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-primary text-tiny font-bold tracking-eyebrow-wide uppercase">
            Floating
          </span>
          <h2 className="text-meta font-semibold text-ink">
            Popup a focus (default)
          </h2>
        </div>
        <p className="text-mini text-ink-soft leading-relaxed mb-4">
          Tipico uso: header, toolbar, dialog. L&apos;input è la sola UI visibile;
          la lista si apre come popup absolute a focus o digitazione, con
          shadow, e si chiude al click esterno.
        </p>
        <ActivitySearchField
          value={selectedFloating}
          onChange={setSelectedFloating}
        />
        <Echo selected={selectedFloating} />
      </section>

      <div className="mt-8 rounded-md border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-tiny font-bold uppercase tracking-eyebrow text-ink-faint mb-1">
              Note di design
            </div>
            <p className="text-mini text-ink-soft leading-relaxed">
              Stesso schema dei componenti di input del design system:{" "}
              <code className="bg-surface-soft px-1 py-0.5 rounded-sm">SoftField</code>{" "}
              come trigger, dropdown <code className="bg-surface-soft px-1 py-0.5 rounded-sm">absolute</code>{" "}
              sotto con shadow soft, navigazione tastiera completa, token{" "}
              <code className="bg-surface-soft px-1 py-0.5 rounded-sm">primary</code> /
              <code className="bg-surface-soft px-1 py-0.5 rounded-sm">ink</code> /
              <code className="bg-surface-soft px-1 py-0.5 rounded-sm">status-*</code>.
            </p>
          </div>
          <StatusLegend />
        </div>
      </div>
    </div>
  );
}
