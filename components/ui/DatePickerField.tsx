"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SoftField } from "./SoftField";
import { IconChevronLeft, IconChevronRight } from "./icons";

/* ─────────────────────────────────────────────────────────────────
   DatePickerField · custom calendar, no external calendar lib.
   Design mirrors the range picker in create_trip.html.

   TWO MODES — controlled by `mode` prop (default: "single"):

   mode="single"
     value: Date | null
     onChange: (date: Date | null) => void
     Input is editable — user can type a date directly.

   mode="range"
     value: { start: Date | null; end: Date | null }
     onChange: (range: { start: Date | null; end: Date | null }) => void
     Two-click selection: first click = start, second = end.
     Shortcut chips: This weekend · 1 week · 2 weeks.
     Trigger shows "15 Sep → 22 Sep · 7 nights" like the mockup.

   Common props: label, placeholder, disabled, autoFocus, className,
                 displayFormat, fromDate, toDate.
───────────────────────────────────────────────────────────────── */

export type DateDisplayFormat = "short" | "iso" | "long";

export type DateRange = { start: Date | null; end: Date | null };

type SingleProps = {
  mode?: "single";
  value: Date | null;
  onChange: (date: Date | null) => void;
};

type RangeProps = {
  mode: "range";
  value: DateRange;
  onChange: (range: DateRange) => void;
};

type CommonProps = {
  displayFormat?: DateDisplayFormat;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  /** When true the floating label is always visible (not just on hover/focus) */
  labelAlwaysVisible?: boolean;
};

export type DatePickerFieldProps = (SingleProps | RangeProps) & CommonProps;

/* ── Constants ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SHORT_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const DOW = ["M","T","W","T","F","S","S"];

/* ── Helpers ── */
function today0(): Date {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function formatDisplay(d: Date, fmt: DateDisplayFormat): string {
  const day = d.getDate(), month = d.getMonth(), year = d.getFullYear();
  if (fmt==="iso") return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  if (fmt==="long") return `${MONTHS[month]} ${day}, ${year}`;
  return `${day} ${SHORT_MONTHS[month]} ${year}`;
}

function fmtShort(d: Date, showYear = false): string {
  const base = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
  return showYear ? `${base} ${d.getFullYear()}` : base;
}

function needsYear(d: Date | null): boolean {
  if (!d) return false;
  return d.getFullYear() !== today0().getFullYear();
}

function nightsBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatRangeTrigger(start: Date | null, end: Date | null): string {
  if (!start && !end) return "";
  const sy = needsYear(start) || needsYear(end);
  if (start && !end) return `${fmtShort(start, sy)} →`;
  if (start && end) {
    const n = nightsBetween(start, end);
    // if different years, show year on both; otherwise only if ≠ current year
    const diffYear = start.getFullYear() !== end.getFullYear();
    return `${fmtShort(start, sy || diffYear)} → ${fmtShort(end, sy)} · ${n} night${n === 1 ? "" : "s"}`;
  }
  return "";
}

function RangeTriggerContent({ start, end, placeholder }: { start: Date | null; end: Date | null; placeholder: string }) {
  if (!start && !end) {
    return <span className="text-ink-faint">{placeholder}</span>;
  }
  const sy = needsYear(start) || needsYear(end);
  if (start && !end) {
    return <span className="text-ink">{fmtShort(start, sy)} →</span>;
  }
  if (start && end) {
    const n = nightsBetween(start, end);
    const diffYear = start.getFullYear() !== end.getFullYear();
    return (
      <span className="text-ink">
        {fmtShort(start, sy || diffYear)} → {fmtShort(end, sy)}
        <span className="text-ink-faint font-normal"> · {n} night{n === 1 ? "" : "s"}</span>
      </span>
    );
  }
  return null;
}

function parseUserDate(raw: string): Date | null {
  const s = raw.trim(); if (!s) return null;
  const native = new Date(s);
  if (!isNaN(native.getTime())) { native.setHours(0,0,0,0); return native; }
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2])-1, Number(dmy[1]));
    if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); return d; }
  }
  const monthNames = [...MONTHS,...SHORT_MONTHS].map(m=>m.toLowerCase());
  const wordy = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i) || s.match(/^([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})$/i);
  if (wordy) {
    let day: number, monthStr: string, year: number;
    if (/^\d/.test(wordy[1])) { [,day,monthStr,year]=[wordy[0],Number(wordy[1]),wordy[2],Number(wordy[3])]; }
    else { [,monthStr,day,year]=[wordy[0],wordy[1],Number(wordy[2]),Number(wordy[3])]; }
    const mIdx = monthNames.indexOf(monthStr!.toLowerCase());
    if (mIdx>=0) {
      const m = mIdx>=12 ? mIdx-12 : mIdx;
      const d = new Date(year!,m,day!); if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); return d; }
    }
  }
  return null;
}

function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year,month,1);
  const last  = new Date(year,month+1,0);
  const leadingOffset = (first.getDay()+6)%7;
  const days: Date[] = [];
  const prevLast = new Date(year,month,0).getDate();
  for (let i=leadingOffset-1; i>=0; i--) days.push(new Date(year,month-1,prevLast-i));
  for (let d=1; d<=last.getDate(); d++) days.push(new Date(year,month,d));
  const trailing = 42-days.length;
  for (let d=1; d<=trailing; d++) days.push(new Date(year,month+1,d));
  return days;
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
export function DatePickerField(props: DatePickerFieldProps) {
  const {
    displayFormat = "short",
    label,
    placeholder,
    disabled,
    autoFocus,
    className,
    fromDate,
    toDate,
    labelAlwaysVisible,
  } = props;

  const isRange = props.mode === "range";
  const today = today0();

  /* ── Locale placeholder ── */
  const localePlaceholder = (() => {
    try {
      return new Intl.DateTimeFormat(undefined).formatToParts(new Date(2026,9,15))
        .map(p => p.type==="day"?"dd":p.type==="month"?"mm":p.type==="year"?"yyyy":p.value).join("");
    } catch { return "dd/mm/yyyy"; }
  })();
  const effectivePlaceholder = placeholder ?? (isRange ? "Pick your dates" : `e.g. ${localePlaceholder}`);

  /* ── Single state ── */
  const singleValue = !isRange ? (props as SingleProps).value : null;
  const [inputText, setInputText] = useState(singleValue ? formatDisplay(singleValue, displayFormat) : "");

  /* ── Range state ── */
  const rangeValue = isRange ? (props as RangeProps).value : { start: null, end: null };
  // "pending" = user clicked start, waiting for end click
  const [rangePending, setRangePending] = useState<Date | null>(null);
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  /* ── Calendar state ── */
  const [isOpen, setIsOpen] = useState(false);
  const initDate = isRange ? (rangeValue.start ?? today) : (singleValue ?? today);
  const [viewYear, setViewYear]   = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [myPickerOpen, setMyPickerOpen] = useState(false);
  const [myYear, setMyYear] = useState(viewYear);
  // For range: hover highlight
  const [hoverDay, setHoverDay] = useState<Date | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverId  = useId();

  /* ── Sync single inputText when value/format changes ── */
  useEffect(() => {
    if (!isRange) {
      setInputText(singleValue ? formatDisplay(singleValue, displayFormat) : "");
      if (singleValue) { setViewYear(singleValue.getFullYear()); setViewMonth(singleValue.getMonth()); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleValue, displayFormat]);

  /* ── Sync range view to start date ── */
  useEffect(() => {
    if (isRange && rangeValue.start) {
      setViewYear(rangeValue.start.getFullYear());
      setViewMonth(rangeValue.start.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeValue.start]);

  /* ── Click outside ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        if (!isRange) commitInput();
        setIsOpen(false);
        setMyPickerOpen(false);
        setRangePending(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, singleValue, isRange]);

  /* ── Single: commit typed input ── */
  function commitInput() {
    if (isRange) return;
    const onChange = (props as SingleProps).onChange;
    if (!inputText.trim()) { onChange(null); return; }
    const parsed = parseUserDate(inputText);
    if (parsed && !isDisabledDay(parsed)) {
      onChange(parsed);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    } else {
      setInputText(singleValue ? formatDisplay(singleValue, displayFormat) : "");
    }
  }

  /* ── Navigation ── */
  function prevMonth() {
    setMyPickerOpen(false);
    if (viewMonth===0) { setViewYear(y=>y-1); setViewMonth(11); } else setViewMonth(m=>m-1);
  }
  function nextMonth() {
    setMyPickerOpen(false);
    if (viewMonth===11) { setViewYear(y=>y+1); setViewMonth(0); } else setViewMonth(m=>m+1);
  }

  /* ── Day constraints ── */
  function isDisabledDay(d: Date): boolean {
    if (fromDate) { const f=new Date(fromDate); f.setHours(0,0,0,0); if (d<f) return true; }
    if (toDate)   { const t=new Date(toDate);   t.setHours(0,0,0,0); if (d>t) return true; }
    return false;
  }

  /* ── Single: pick day ── */
  function pickDaySingle(d: Date) {
    if (isDisabledDay(d)) return;
    (props as SingleProps).onChange(d);
    setIsOpen(false);
    setMyPickerOpen(false);
  }

  /* ── Range: pick day ── */
  function pickDayRange(d: Date) {
    if (isDisabledDay(d)) return;
    const onChange = (props as RangeProps).onChange;
    const { start, end } = rangeValue;

    if (!rangePending) {
      // No start yet, or range complete → restart
      setRangePending(d);
      onChange({ start: d, end: null });
      setActiveShortcut(null);
    } else {
      // Have pending start
      if (d <= rangePending) {
        // Clicked before or on start → restart
        setRangePending(d);
        onChange({ start: d, end: null });
      } else {
        setRangePending(null);
        onChange({ start: rangePending, end: d });
        setIsOpen(false);
      }
      setActiveShortcut(null);
    }
  }

  /* ── Range shortcuts ── */
  function applyShortcut(id: string) {
    if (!isRange) return;
    const onChange = (props as RangeProps).onChange;
    const base = new Date(today);
    let start: Date, end: Date;

    if (id === "weekend") {
      const dow = base.getDay();
      const daysToSat = (6-dow+7)%7 || 7;
      start = new Date(base.getFullYear(), base.getMonth(), base.getDate()+daysToSat);
      end   = new Date(start); end.setDate(start.getDate()+1);
    } else if (id === "1w") {
      start = new Date(base); end = new Date(base); end.setDate(base.getDate()+7);
    } else {
      start = new Date(base); end = new Date(base); end.setDate(base.getDate()+14);
    }

    setActiveShortcut(id);
    setRangePending(null);
    onChange({ start, end });
    setViewYear(start.getFullYear());
    setViewMonth(start.getMonth());
  }

  /* ── Month/year picker ── */
  function pickMonthYear(month: number) {
    setViewMonth(month); setViewYear(myYear); setMyPickerOpen(false);
  }
  function isDisabledMonth(month: number): boolean {
    if (fromDate) { const l=new Date(myYear,month+1,0); if (l<fromDate) return true; }
    if (toDate)   { const f=new Date(myYear,month,1);   if (f>toDate)   return true; }
    return false;
  }

  /* ── Range: cell state ── */
  function rangeCellState(d: Date): "start"|"end"|"in-range"|"hover-range"|"none" {
    if (!isRange) return "none";
    const { start, end } = rangeValue;

    if (sameDay(d, start) && end) return "start";
    if (sameDay(d, end) && start) return "end";
    if (start && end && d>start && d<end) return "in-range";

    // Pending hover preview
    if (rangePending && !end && hoverDay) {
      if (sameDay(d, rangePending)) return "start";
      if (d>rangePending && d<=hoverDay) return "hover-range";
    }
    if (sameDay(d, start) && !end) return "start";
    return "none";
  }

  const days = calendarDays(viewYear, viewMonth);

  /* ── Trigger display ── */
  const triggerValue = isRange
    ? formatRangeTrigger(rangeValue.start, rangeValue.end)
    : inputText;

  const hasValue = isRange
    ? !!(rangeValue.start || rangeValue.end)
    : !!singleValue;

  /* ── Clear ── */
  function clearAll() {
    if (isRange) {
      (props as RangeProps).onChange({ start: null, end: null });
      setRangePending(null);
      setActiveShortcut(null);
    } else {
      setInputText("");
      (props as SingleProps).onChange(null);
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>

      {/* ── Trigger ── */}
      {isRange ? (
        /* Range: custom button trigger so we can render styled JSX content */
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(o => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); setIsOpen(false); setMyPickerOpen(false); setRangePending(null); }
          }}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          className={cn(
            "group/sf relative flex items-center gap-1.5 w-full px-[18px] py-[10px]",
            "bg-surface-input border border-border rounded-pill text-left",
            "transition-[background,border-color,box-shadow] duration-150",
            "hover:border-border-strong",
            isOpen && "border-orange bg-surface shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          {label && (
            <span className={cn(
              "absolute -top-2 left-4 px-1.5 bg-surface",
              "text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium",
              "pointer-events-none transition-opacity",
              labelAlwaysVisible
                ? "opacity-100"
                : cn("opacity-0 group-hover/sf:opacity-100", isOpen && "opacity-100"),
            )}>
              {label}
            </span>
          )}
          <CalendarIcon className={cn("size-3.5 shrink-0 transition-colors duration-150", hasValue ? "text-orange" : "text-ink-faint")} />
          <span className="flex-1 min-w-0 text-[15px] leading-[1.45]">
            <RangeTriggerContent start={rangeValue.start} end={rangeValue.end} placeholder={effectivePlaceholder} />
          </span>
        </button>
      ) : (
        /* Single: SoftField with editable input */
        <SoftField
          value={inputText}
          onChange={(text) => { setInputText(text); if (!isOpen) setIsOpen(true); }}
          placeholder={effectivePlaceholder}
          label={label}
          labelAlwaysVisible={labelAlwaysVisible}
          disabled={disabled}
          autoComplete="off"
          inputProps={{
            autoFocus,
            onFocus: () => !disabled && setIsOpen(true),
            onBlur: commitInput,
            onKeyDown: (e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setInputText(singleValue ? formatDisplay(singleValue, displayFormat) : "");
                setIsOpen(false); setMyPickerOpen(false);
              }
              if (e.key === "Enter") { e.preventDefault(); commitInput(); setIsOpen(false); }
            },
            "aria-haspopup": "dialog",
            "aria-expanded": isOpen,
            "aria-controls": isOpen ? popoverId : undefined,
            className: "outline-none",
          }}
        >
          <SoftField.Prefix>
            <CalendarIcon className={cn("size-3.5 shrink-0 transition-colors duration-150", hasValue ? "text-orange" : "text-ink-faint")} />
          </SoftField.Prefix>
        </SoftField>
      )}

      {/* ── Dropdown ── */}
      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={isRange ? "Date range picker" : "Date picker"}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-50 top-[calc(100%+6px)] left-0 bg-surface border border-border rounded-xl shadow-[0_4px_24px_rgba(13,44,61,0.10)] p-3 w-[268px]"
        >

          {/* ── Shortcut chips (range only) ── */}
          {isRange && !myPickerOpen && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {[
                { id: "weekend", label: "This weekend" },
                { id: "1w",      label: "1 week" },
                { id: "2w",      label: "2 weeks" },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => applyShortcut(sc.id)}
                  className={cn(
                    "text-micro px-2.5 py-1 rounded-pill border transition-colors font-medium",
                    activeShortcut===sc.id
                      ? "bg-ink text-white border-ink"
                      : "bg-surface-soft border-border text-ink-soft hover:border-border-strong hover:text-ink",
                  )}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Calendar header ── */}
          <div className="flex items-center justify-between mb-1.5">
            <button type="button" onClick={prevMonth} aria-label="Previous month"
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-ink hover:bg-surface-soft transition-colors">
              <IconChevronLeft className="size-3" />
            </button>

            <button type="button"
              onClick={() => { setMyYear(viewYear); setMyPickerOpen(o=>!o); }}
              aria-label="Pick month and year"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-mini font-medium text-ink hover:bg-surface-soft transition-colors">
              <span>{MONTHS[viewMonth]} {viewYear}</span>
              <ChevronTinyIcon className={cn("transition-transform duration-150", myPickerOpen && "rotate-180")} />
            </button>

            <button type="button" onClick={nextMonth} aria-label="Next month"
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-ink hover:bg-surface-soft transition-colors">
              <IconChevronRight className="size-3" />
            </button>
          </div>

          {/* ── Month/year picker overlay ── */}
          {myPickerOpen ? (
            <div className="mt-1">
              <div className="flex items-center justify-between px-1 pb-2">
                <button type="button" onClick={()=>setMyYear(y=>y-1)} aria-label="Previous year"
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-ink hover:bg-surface-soft transition-colors">
                  <IconChevronLeft className="size-3" />
                </button>
                <span className="text-meta font-medium text-ink tabular-nums">{myYear}</span>
                <button type="button" onClick={()=>setMyYear(y=>y+1)} aria-label="Next year"
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-ink hover:bg-surface-soft transition-colors">
                  <IconChevronRight className="size-3" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {SHORT_MONTHS.map((name, i) => {
                  const isCurrent  = i===viewMonth && myYear===viewYear;
                  const isSelected = isRange
                    ? (rangeValue.start && i===rangeValue.start.getMonth() && myYear===rangeValue.start.getFullYear())
                    : (singleValue && i===singleValue.getMonth() && myYear===singleValue.getFullYear());
                  const isDisabledM = isDisabledMonth(i);
                  return (
                    <button key={name} type="button"
                      onClick={() => !isDisabledM && pickMonthYear(i)} disabled={isDisabledM}
                      className={cn(
                        "py-2 rounded-lg text-tiny font-medium text-center transition-colors",
                        isSelected ? "bg-ink text-white"
                          : isCurrent ? "border border-ink-soft text-ink hover:bg-surface-soft"
                          : "text-ink hover:bg-surface-soft",
                        isDisabledM && "opacity-20 pointer-events-none",
                      )}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* ── DOW headers ── */}
              <div className="grid grid-cols-7 mb-0.5">
                {DOW.map((d,i) => (
                  <span key={i} className="text-center text-[9px] tracking-eyebrow uppercase text-ink-faint py-0.5">{d}</span>
                ))}
              </div>

              {/* ── Day grid ── */}
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const isCurrentMonth = d.getMonth()===viewMonth;
                  const isToday        = sameDay(d, today);
                  const isDisabledD    = isDisabledDay(d);

                  // Single mode
                  const isSelectedSingle = !isRange && sameDay(d, singleValue);

                  // Range mode
                  const cs = isRange ? rangeCellState(d) : "none";
                  const isRangeStart   = cs==="start";
                  const isRangeEnd     = cs==="end";
                  const isInRange      = cs==="in-range";
                  const isHoverRange   = cs==="hover-range";
                  const isRangeSingle  = isRange && sameDay(d, rangeValue.start) && !rangeValue.end && !rangePending;

                  const isHighlighted  = isSelectedSingle || isRangeStart || isRangeEnd || isRangeSingle;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative flex items-center justify-center",
                        // in-range background strip (full width, no radius)
                        (isInRange || isHoverRange) && "bg-[rgba(13,44,61,0.07)]",
                        // strip only on right half for start, left half for end
                        isRangeStart && rangeValue.end && "bg-gradient-to-r from-transparent via-transparent to-[rgba(13,44,61,0.07)]",
                        isRangeEnd && "bg-gradient-to-l from-transparent via-transparent to-[rgba(13,44,61,0.07)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => isRange ? pickDayRange(d) : pickDaySingle(d)}
                        onMouseEnter={() => isRange && setHoverDay(d)}
                        onMouseLeave={() => isRange && setHoverDay(null)}
                        disabled={isDisabledD}
                        aria-label={d.toLocaleDateString()}
                        aria-pressed={isHighlighted}
                        className={cn(
                          "aspect-square w-full flex items-center justify-center z-10 relative",
                          "text-tiny font-medium tabular-nums rounded-full transition-colors duration-75",
                          !isHighlighted && !isDisabledD && "hover:bg-surface-soft",
                          !isCurrentMonth && "text-ink-faint",
                          isToday && !isHighlighted && "border border-ink-soft",
                          isHighlighted && "bg-ink text-white",
                          isDisabledD && "opacity-20 pointer-events-none",
                        )}
                      >
                        {d.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border">
                <button type="button" onClick={clearAll}
                  className="text-tiny text-danger-fg hover:underline transition-colors">
                  Clear
                </button>
                <span className="text-tiny text-ink-soft italic font-serif">
                  {isRange
                    ? rangePending
                      ? "Pick end date"
                      : rangeValue.start && rangeValue.end
                        ? `${nightsBetween(rangeValue.start, rangeValue.end)} night${nightsBetween(rangeValue.start,rangeValue.end)===1?"":"s"}`
                        : "Pick start date"
                    : singleValue
                      ? formatDisplay(singleValue, displayFormat)
                      : "Pick a date"
                  }
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Inline SVGs ── */
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function XSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function ChevronTinyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={cn("w-2.5 h-2.5 text-ink-faint", className)}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
