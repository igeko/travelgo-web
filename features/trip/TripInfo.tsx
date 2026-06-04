"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { SoftField } from "@/components/ui/SoftField";
import {
  IconCalendar,
  IconChevronDown,
  IconMapPin,
  IconSparkles,
  IconTicket,
  IconUsers,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   TripInfo · "il biglietto" del viaggio
   Identity card that lives above the DayList. Fills up during the Go
   conversation, is inline-editable without form-feeling, and folds into
   a "torn ticket" when the user wants room for the days.

   Controlled: the parent owns the four field values and which field is
   being edited (`editingField`). Only the in-progress draft is local.
   See app/(design)/design/your-trip-final.html for the visual spec.
───────────────────────────────────────────────────────────────── */

export type TripField = "where" | "when" | "who" | "vibe";

/** Anything editable in the ticket — the four fields plus the trip name. */
export type TripEditTarget = TripField | "name";

/** A Go suggestion shown as a dashed "stamp" under the active field. */
export type TripStamp = { name: string; meta?: string };

/** One condensed item on the collapsed "torn ticket" strip. */
export type TripSummaryItem = { icon: ReactNode; value: string };

export type TripInfoProps = {
  /** Trip name ("Giappone 2026"). null → italic-faint empty headline. */
  tripName: string | null;
  /** Pre-formatted date range ("10 → 19 luglio"). Parent owns the format. */
  dateRange: string | null;
  /** The four field values. null = empty (gentle placeholder takes over). */
  fields: Record<TripField, string | null>;
  /** Per-field placeholder overrides. Defaults come from i18n. */
  placeholders?: Partial<Record<TripField, string>>;
  /** Target currently in editing (controlled): a field or the trip name. null = none. */
  editingField?: TripEditTarget | null;
  /** Go suggestions for the active field, shown as stamps. */
  suggestions?: TripStamp[] | null;
  /** Torn-ticket mode. */
  collapsed?: boolean;
  /**
   * How the collapsed state renders. "horizontal" (default) = the torn-ticket
   * strip. "vertical" = a narrow ticket stub for a slim rail (e.g. a collapsed
   * sidebar) — just the icon, click to re-open.
   */
  collapsedOrientation?: "horizontal" | "vertical";
  /** Condensed items for the collapsed strip (typically 3). */
  summary?: TripSummaryItem[];
  /** Click on a non-editing row or the trip name → promote it to editing. */
  onFieldClick?: (target: TripEditTarget) => void;
  /** Enter, blur (outside click), or stamp click. */
  onCommit?: (target: TripEditTarget, value: string) => void;
  /** Esc. */
  onCancel?: () => void;
  /** Foot "open ticket" or head click while collapsed. */
  onToggleCollapse?: () => void;
  /** Head click while expanded (e.g. navigate to the Go canvas). */
  onHeadClick?: () => void;
  className?: string;
};

const FIELD_ORDER: TripField[] = ["where", "when", "who", "vibe"];

const FIELD_ICON: Record<TripField, ReactNode> = {
  where: <IconMapPin />,
  when: <IconCalendar />,
  who: <IconUsers />,
  vibe: <IconSparkles />,
};

export function TripInfo({
  tripName,
  dateRange,
  fields,
  placeholders,
  editingField = null,
  suggestions,
  collapsed = false,
  collapsedOrientation = "horizontal",
  summary = [],
  onFieldClick,
  onCommit,
  onCancel,
  onToggleCollapse,
  onHeadClick,
  className,
}: TripInfoProps) {
  const t = useTranslations("TripInfo");

  const head = (
    <Head
      eyebrow={t("eyebrow")}
      name={tripName}
      emptyName={t("emptyName")}
      sub={dateRange}
      emptySub={t("emptySub")}
    />
  );

  /* ── Collapsed · vertical ticket stub (slim rail) ── */
  if (collapsed && collapsedOrientation === "vertical") {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={tripName ?? t("eyebrow")}
        title={tripName ?? t("eyebrow")}
        className={cn(
          "group/stub flex items-center justify-center rounded-lg border border-border bg-gradient-to-b from-primary/[0.06] to-transparent py-3.5 transition-colors hover:from-primary/[0.10]",
          className,
        )}
      >
        <span className="text-primary [&>svg]:size-[18px] [&>svg]:[stroke-width:1.75]">
          <IconTicket />
        </span>
      </button>
    );
  }

  /* ── Collapsed · torn ticket ── */
  if (collapsed) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg bg-surface transition-shadow duration-150",
          "cursor-pointer hover:shadow-[0_2px_8px_rgba(13,44,61,0.06)]",
          className,
        )}
        onClick={onToggleCollapse}
      >
        {head}
        {summary.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-[18px] pb-2 pt-2.5 text-[11.5px] text-ink-soft">
            {summary.map((item, i) => (
              <span key={i} className="contents">
                {i > 0 && <span className="text-micro text-ink-faint">·</span>}
                <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <span className="text-primary [&>svg]:size-3 [&>svg]:[stroke-width:1.75]">
                    {item.icon}
                  </span>
                  {item.value}
                </span>
              </span>
            ))}
          </div>
        )}
        <Foot variant="action">
          <span className="[&>svg]:size-3 [&>svg]:[stroke-width:1.75]">
            <IconChevronDown />
          </span>
          {t("openTicket")}
        </Foot>
      </div>
    );
  }

  /* ── Expanded · empty or editing ── */
  const showSuggestions =
    editingField != null && suggestions != null && suggestions.length > 0;

  return (
    <div className={cn("overflow-hidden rounded-lg bg-surface", className)}>
      <div
        className={onHeadClick ? "cursor-pointer" : undefined}
        onClick={onHeadClick}
      >
        <Head
          eyebrow={t("eyebrow")}
          name={tripName}
          emptyName={t("emptyName")}
          sub={dateRange}
          emptySub={t("emptySub")}
          nameEditing={editingField === "name"}
          onNameClick={() => onFieldClick?.("name")}
          onNameCommit={(v) => onCommit?.("name", v)}
          onNameCancel={onCancel}
        />
      </div>

      <div className="px-[18px] py-2">
        {FIELD_ORDER.map((field) => (
          <Row
            key={field}
            field={field}
            icon={FIELD_ICON[field]}
            label={t(`labels.${field}`)}
            value={fields[field]}
            placeholder={placeholders?.[field] ?? t(`placeholders.${field}`)}
            editing={editingField === field}
            onFieldClick={onFieldClick}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        ))}
      </div>

      {showSuggestions && (
        <div className="flex flex-col gap-1.5 px-[18px] pb-3 pt-1">
          <div className="mb-0.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-eyebrow-wide text-primary">
            <span className="size-[5px] rounded-full bg-primary ring-[3px] ring-primary/[0.18]" />
            {t("goSuggests")}
          </div>
          {suggestions!.map((stamp, i) => (
            <button
              key={i}
              type="button"
              // Keep the input focused so its blur-commit doesn't race the stamp.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editingField && onCommit?.(editingField, stamp.name)}
              className={cn(
                "group/stamp rounded-[10px] border border-dashed border-border-strong bg-surface px-3 py-2 text-left",
                "transition-all duration-150 hover:border-solid hover:border-primary hover:bg-primary/[0.04]",
              )}
            >
              <div className="text-[12.5px] font-medium leading-tight text-ink">
                {stamp.name}
              </div>
              {stamp.meta && (
                <div className="mt-0.5 text-micro leading-tight text-ink-soft group-hover/stamp:text-primary-deep">
                  {stamp.meta}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {editingField != null ? (
        <Foot variant="hint">
          <Kbd>Enter</Kbd> {t("hint.save")} · <Kbd>Esc</Kbd> {t("hint.cancel")}
        </Foot>
      ) : (
        <Foot variant="editorial">{t("editorial")}</Foot>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Head · ticket stub (eyebrow + name + dates), shared across states
───────────────────────────────────────────────────────────────── */

function Head({
  eyebrow,
  name,
  emptyName,
  sub,
  emptySub,
  nameEditing = false,
  onNameClick,
  onNameCommit,
  onNameCancel,
}: {
  eyebrow: string;
  name: string | null;
  emptyName: string;
  sub: string | null;
  emptySub: string;
  /** When true the name renders as an inline serif input. */
  nameEditing?: boolean;
  /** Click on the name (read-only) → promote to editing. */
  onNameClick?: () => void;
  onNameCommit?: (value: string) => void;
  onNameCancel?: () => void;
}) {
  const [draft, setDraft] = useState(name ?? "");

  useEffect(() => {
    if (nameEditing) setDraft(name ?? "");
  }, [nameEditing, name]);

  return (
    <div className="relative border-b border-dashed border-border-strong bg-gradient-to-b from-primary/[0.03] to-transparent px-[18px] py-3.5">
      {/* Perforation notches */}
      <span
        className="pointer-events-none absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-bg"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-1.5 -right-1.5 size-3 rounded-full bg-bg"
        aria-hidden="true"
      />
      <p className="m-0 text-micro font-semibold uppercase tracking-eyebrow-wide text-primary">
        {eyebrow}
      </p>
      {nameEditing ? (
        <input
          autoFocus
          aria-label={eyebrow}
          value={draft}
          placeholder={emptyName}
          onChange={(e) => setDraft(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNameCommit?.(draft);
            } else if (e.key === "Escape") {
              onNameCancel?.();
            }
          }}
          onBlur={() => onNameCommit?.(draft)}
          className={cn(
            "m-0 block w-full border-0 bg-transparent p-0 font-serif text-[20px] font-normal leading-tight text-ink caret-primary outline-0",
            "placeholder:italic placeholder:text-ink-faint",
          )}
        />
      ) : onNameClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNameClick();
          }}
          className={cn(
            "m-0 block w-full cursor-text truncate text-left font-serif font-normal leading-tight",
            name ? "text-[20px] text-ink" : "text-[18px] italic text-ink-faint",
          )}
        >
          {name ?? emptyName}
        </button>
      ) : (
        <h3
          className={cn(
            "m-0 truncate font-serif font-normal leading-tight",
            name ? "text-[20px] text-ink" : "text-[18px] italic text-ink-faint",
          )}
        >
          {name ?? emptyName}
        </h3>
      )}
      <p
        className={cn(
          "mt-1 text-tiny",
          sub ? "text-ink-soft" : "italic text-ink-faint",
        )}
      >
        {sub ?? emptySub}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Row · a single field. Static when not editing, SoftField when editing.
   Both renderings share the inline "passport row" geometry so toggling
   editing causes no layout shift.
───────────────────────────────────────────────────────────────── */

function Row({
  field,
  icon,
  label,
  value,
  placeholder,
  editing,
  onFieldClick,
  onCommit,
  onCancel,
}: {
  field: TripField;
  icon: ReactNode;
  label: string;
  value: string | null;
  placeholder: string;
  editing: boolean;
  onFieldClick?: (field: TripField) => void;
  onCommit?: (field: TripField, value: string) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (editing) setDraft(value ?? "");
  }, [editing, value]);

  if (editing) {
    return (
      <div className="border-b border-ink/5 last:border-b-0">
        <SoftField
          variant="inline"
          icon={icon}
          label={label}
          value={draft}
          onChange={setDraft}
          placeholder={placeholder}
          onCommit={(v) => onCommit?.(field, v)}
          onCancel={onCancel}
          inputProps={{ autoFocus: true, "aria-label": label }}
        />
      </div>
    );
  }

  const isEmpty = !value;

  return (
    <button
      type="button"
      onClick={() => onFieldClick?.(field)}
      className="flex w-full cursor-text items-center gap-2.5 border-b border-ink/5 py-2 text-left last:border-b-0"
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center [&>svg]:size-3.5 [&>svg]:[stroke-width:1.75]",
          isEmpty ? "text-ink-faint" : "text-primary",
        )}
      >
        {icon}
      </span>
      <span className="w-[50px] shrink-0 text-micro font-medium uppercase leading-tight tracking-eyebrow text-ink-faint">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12.5px]",
          isEmpty ? "font-normal italic text-ink-faint" : "font-medium text-ink",
        )}
      >
        {value ?? placeholder}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Foot · editorial line / keyboard hint / open-ticket action
───────────────────────────────────────────────────────────────── */

function Foot({
  variant,
  children,
}: {
  variant: "editorial" | "hint" | "action";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-t border-ink/5 bg-ink/[0.02] px-[18px] py-2.5 text-center text-tiny",
        variant === "editorial" && "italic text-ink-faint",
        variant === "hint" && "text-ink-faint",
        variant === "action" &&
          "flex cursor-pointer items-center justify-center gap-1.5 font-medium text-ink-soft transition-colors hover:bg-primary/[0.04] hover:text-primary",
      )}
    >
      {children}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-px rounded-[3px] border border-border bg-surface px-1.5 py-px font-mono text-[10px] text-ink-soft">
      {children}
    </kbd>
  );
}
