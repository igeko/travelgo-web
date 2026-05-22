"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  useLocalStorageState,
  type LocalStorageCodec,
} from "@/lib/hooks/useLocalStorageState";
import { DESIGN_HIGHLIGHT_GROUPS } from "../categories";

/* ─────────────────────────────────────────────────────────────────
   Design scratchpad shell · persistent left sidebar (nav) + main.
   Mirrors the (dev)/dev SandboxShell so the two sections feel twinned:
   grouped nav, orange-highlighted groups with leading divider, and
   collapsible subgroups. The sidebar lives in the layout, so navigating
   between sketches never tears it down.
───────────────────────────────────────────────────────────────── */

export type DesignEntry = {
  /** Path relative to /design, e.g. "activities-editor" or "activities-editor/day". */
  slug: string;
  title: string;
  group: string;
  /** Optional subgroup label within a group (accordion). */
  subgroup?: string;
};

const LS_LEFT = "design:left-open";
const LS_COLLAPSED = "design:collapsed-subgroups";

const BOOL_CODEC: LocalStorageCodec<boolean> = {
  parse: (raw) => raw === "1",
  serialize: (value) => (value ? "1" : "0"),
};

const EMPTY_SUBGROUPS: ReadonlySet<string> = new Set<string>();
const SUBGROUPS_CODEC: LocalStorageCodec<Set<string>> = {
  parse: (raw) => new Set<string>(JSON.parse(raw) as string[]),
  serialize: (value) => JSON.stringify([...value]),
};

export function DesignShell({
  entries,
  children,
}: {
  entries: DesignEntry[];
  children: ReactNode;
}) {
  const [leftOpen, setLeftOpen] = useLocalStorageState<boolean>(
    LS_LEFT,
    true,
    BOOL_CODEC,
  );
  const [collapsedSubgroups, setCollapsedSubgroups] = useLocalStorageState<
    Set<string>
  >(LS_COLLAPSED, EMPTY_SUBGROUPS as Set<string>, SUBGROUPS_CODEC);
  const pathname = usePathname();

  function toggleSubgroup(key: string) {
    setCollapsedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groups = entries.reduce<Record<string, DesignEntry[]>>((acc, entry) => {
    (acc[entry.group] ??= []).push(entry);
    return acc;
  }, {});

  /** Render a flat list of entries, optionally grouped by subgroup with accordion. */
  function renderEntries(group: string, groupEntries: DesignEntry[]) {
    const noSub = groupEntries.filter((e) => !e.subgroup);
    const subMap = groupEntries
      .filter((e) => e.subgroup)
      .reduce<Record<string, DesignEntry[]>>((acc, e) => {
        (acc[e.subgroup!] ??= []).push(e);
        return acc;
      }, {});

    return (
      <>
        {noSub.map((entry) => (
          <li key={entry.slug}>
            <NavLink
              href={`/design/${entry.slug}`}
              active={pathname === `/design/${entry.slug}`}
            >
              {entry.title}
            </NavLink>
          </li>
        ))}
        {Object.entries(subMap).map(([subgroup, subEntries]) => {
          const key = `${group}:${subgroup}`;
          const isCollapsed = collapsedSubgroups.has(key);
          return (
            <li key={subgroup}>
              <button
                type="button"
                onClick={() => toggleSubgroup(key)}
                className="w-full flex items-center justify-between px-2 pt-3 pb-1 text-[9px] font-medium tracking-[0.10em] uppercase text-ink-faint hover:text-ink-soft transition-colors cursor-pointer bg-transparent border-0"
              >
                {subgroup}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <ul
                className={cn(
                  "flex flex-col pl-2 border-l border-border ml-2 overflow-hidden transition-all duration-200",
                  isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
                )}
              >
                {subEntries.map((entry) => (
                  <li key={entry.slug}>
                    <NavLink
                      href={`/design/${entry.slug}`}
                      active={pathname === `/design/${entry.slug}`}
                    >
                      {entry.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      {/* LEFT SIDEBAR · sketch navigation */}
      {leftOpen ? (
        <aside className="w-64 shrink-0 border-r border-border bg-surface sticky top-0 h-screen flex flex-col">
          <div className="flex items-center justify-between px-5 py-5 border-b border-border">
            <div>
              <Link
                href="/design"
                className="text-sm font-medium tracking-tight text-ink"
              >
                TravelGo <span className="text-ink-faint">· design</span>
              </Link>
              <p className="mt-1 text-[11px] text-ink-faint">
                Mockups & sketches
              </p>
            </div>
            <CollapseButton
              side="left"
              onClick={() => setLeftOpen(false)}
              title="Close navigation"
            />
          </div>

          {/* Bidirectional link to the component sandbox */}
          <Link
            href="/dev"
            className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-ink-faint"
            >
              <path d="M7 8l-4 4l4 4" />
              <path d="M17 8l4 4l-4 4" />
              <path d="M14 4l-4 16" />
            </svg>
            <span className="flex-1">Dev sandbox</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-ink-faint"
            >
              <path d="M9 6l6 6l-6 6" />
            </svg>
          </Link>

          <nav className="px-3 py-4 flex flex-col gap-5 overflow-y-auto">
            {Object.entries(groups).map(([group, groupEntries], i) => {
              const isHighlighted = DESIGN_HIGHLIGHT_GROUPS.has(group);
              const prevGroup = Object.keys(groups)[i - 1];
              const needsDivider = isHighlighted && prevGroup;
              return (
                <div key={group}>
                  {needsDivider && (
                    <div className="mx-2 mb-5 -mt-1 h-px bg-border" />
                  )}
                  <div
                    className={cn(
                      "px-2 pb-2 text-micro font-medium tracking-eyebrow-wide uppercase",
                      isHighlighted ? "text-orange" : "text-ink-faint",
                    )}
                  >
                    {group}
                  </div>
                  <ul className="flex flex-col">
                    {renderEntries(group, groupEntries)}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>
      ) : (
        <CollapsedRail
          side="left"
          onClick={() => setLeftOpen(true)}
          label="Sketches"
        />
      )}

      {/* MAIN */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   UI helpers
───────────────────────────────────────────────────────────────── */

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-surface-soft text-ink font-medium"
          : "text-ink-soft hover:bg-surface-soft hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

function CollapseButton({
  side,
  onClick,
  title,
}: {
  side: "left" | "right";
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        {side === "left" ? <path d="M15 6l-6 6l6 6" /> : <path d="M9 6l6 6l-6 6" />}
      </svg>
    </button>
  );
}

function CollapsedRail({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Open ${label}`}
      className={cn(
        "w-9 shrink-0 bg-surface sticky top-0 h-screen flex flex-col items-center justify-start py-4 gap-3",
        side === "left" ? "border-r border-border" : "border-l border-border",
        "hover:bg-surface-soft transition-colors",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 text-ink-faint"
      >
        {side === "left" ? <path d="M9 6l6 6l-6 6" /> : <path d="M15 6l-6 6l6 6" />}
      </svg>
      <span
        className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </button>
  );
}
