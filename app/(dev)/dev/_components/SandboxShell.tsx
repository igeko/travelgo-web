"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sandboxRegistry, type SandboxEntry } from "../registry";

/* ─────────────────────────────────────────────────────────────────
   Context for the right panel (optional slot)
───────────────────────────────────────────────────────────────── */

type RightPanelContextValue = {
  setContent: (node: ReactNode) => void;
};

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

/**
 * Child page → renders this wrapper with its own controls;
 * the content is projected into the right sidebar slot.
 */
export function SandboxRightPanel({ children }: { children: ReactNode }) {
  const ctx = useContext(RightPanelContext);
  useEffect(() => {
    ctx?.setContent(children);
    return () => ctx?.setContent(null);
  }, [ctx, children]);
  return null;
}

/* ─────────────────────────────────────────────────────────────────
   Shell · left sidebar (nav) + main + right sidebar (controls)
   Both sidebars are collapsible. State persisted in localStorage.
───────────────────────────────────────────────────────────────── */

const LS_LEFT = "sandbox:left-open";
const LS_RIGHT = "sandbox:right-open";
const LS_COLLAPSED = "sandbox:collapsed-subgroups";

export function SandboxShell({ children }: { children: ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightContent, setRightContent] = useState<ReactNode>(null);
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Load state from localStorage on mount
  useEffect(() => {
    const left = localStorage.getItem(LS_LEFT);
    const right = localStorage.getItem(LS_RIGHT);
    const collapsed = localStorage.getItem(LS_COLLAPSED);
    if (left !== null) setLeftOpen(left === "1");
    if (right !== null) setRightOpen(right === "1");
    if (collapsed) setCollapsedSubgroups(new Set(JSON.parse(collapsed)));
    setMounted(true);
  }, []);

  // Persist
  useEffect(() => {
    if (mounted) localStorage.setItem(LS_LEFT, leftOpen ? "1" : "0");
  }, [leftOpen, mounted]);
  useEffect(() => {
    if (mounted) localStorage.setItem(LS_RIGHT, rightOpen ? "1" : "0");
  }, [rightOpen, mounted]);
  useEffect(() => {
    if (mounted) localStorage.setItem(LS_COLLAPSED, JSON.stringify([...collapsedSubgroups]));
  }, [collapsedSubgroups, mounted]);

  function toggleSubgroup(key: string) {
    setCollapsedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groups = sandboxRegistry.reduce<Record<string, SandboxEntry[]>>(
    (acc, entry) => {
      (acc[entry.group] ??= []).push(entry);
      return acc;
    },
    {},
  );

  /** Render a flat list of entries, optionally grouped by subgroup with accordion. */
  function renderEntries(group: string, entries: SandboxEntry[]) {
    const noSub = entries.filter((e) => !e.subgroup);
    const subMap = entries
      .filter((e) => e.subgroup)
      .reduce<Record<string, SandboxEntry[]>>((acc, e) => {
        (acc[e.subgroup!] ??= []).push(e);
        return acc;
      }, {});

    return (
      <>
        {noSub.map((entry) => (
          <li key={entry.slug}>
            <NavLink href={`/dev/${entry.slug}`} active={pathname === `/dev/${entry.slug}`}>
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
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                  className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <ul
                className={`flex flex-col pl-2 border-l border-border ml-2 overflow-hidden transition-all duration-200 ${
                  isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                }`}
              >
                {subEntries.map((entry) => (
                  <li key={entry.slug}>
                    <NavLink href={`/dev/${entry.slug}`} active={pathname === `/dev/${entry.slug}`}>
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

  const hasRight = rightContent !== null;

  return (
    <RightPanelContext.Provider value={{ setContent: setRightContent }}>
      <div className="min-h-screen flex bg-bg text-ink">
        {/* LEFT SIDEBAR · component navigation */}
        {leftOpen ? (
          <aside className="w-64 shrink-0 border-r border-border bg-surface sticky top-0 h-screen flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-border">
              <div>
                <Link
                  href="/dev"
                  className="text-sm font-medium tracking-tight text-ink"
                >
                  TravelGo{" "}
                  <span className="text-ink-faint">· sandbox</span>
                </Link>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Components in isolation
                </p>
              </div>
              <CollapseButton
                side="left"
                onClick={() => setLeftOpen(false)}
                title="Close navigation"
              />
            </div>
            <nav className="px-3 py-4 flex flex-col gap-5 overflow-y-auto">
              {Object.entries(groups).map(([group, entries], i) => {
                const isHighlighted = group === "Features" || group === "Admin";
                const prevGroup = Object.keys(groups)[i - 1];
                const needsDivider = isHighlighted && prevGroup;
                return (
                  <div key={group}>
                    {needsDivider && (
                      <div className="mx-2 mb-5 -mt-1 h-px bg-border" />
                    )}
                    <div className={`px-2 pb-2 text-[10px] font-medium tracking-[0.12em] uppercase ${isHighlighted ? "text-orange" : "text-ink-faint"}`}>
                      {group}
                    </div>
                    <ul className="flex flex-col">
                      {renderEntries(group, entries)}
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
            label="Navigation"
          />
        )}

        {/* MAIN */}
        <main className="flex-1 min-w-0">{children}</main>

        {/* RIGHT SIDEBAR · controls (only if the page provides them) */}
        {hasRight &&
          (rightOpen ? (
            <aside className="w-72 shrink-0 border-l border-border bg-surface sticky top-0 h-screen flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">
                  Controls
                </span>
                <CollapseButton
                  side="right"
                  onClick={() => setRightOpen(false)}
                  title="Close controls"
                />
              </div>
              <div className="overflow-y-auto">{rightContent}</div>
            </aside>
          ) : (
            <CollapsedRail
              side="right"
              onClick={() => setRightOpen(true)}
              label="Controls"
            />
          ))}
      </div>
    </RightPanelContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────
   UI helpers
───────────────────────────────────────────────────────────────── */

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-surface-soft text-ink font-medium"
          : "text-ink-soft hover:bg-surface-soft hover:text-ink"
      }`}
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
        {side === "left" ? (
          <path d="M15 6l-6 6l6 6" />
        ) : (
          <path d="M9 6l6 6l-6 6" />
        )}
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
      className={`
        w-9 shrink-0 bg-surface sticky top-0 h-screen flex flex-col items-center justify-start py-4 gap-3
        ${side === "left" ? "border-r border-border" : "border-l border-border"}
        hover:bg-surface-soft transition-colors
      `}
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
        {side === "left" ? (
          <path d="M9 6l6 6l-6 6" />
        ) : (
          <path d="M15 6l-6 6l6 6" />
        )}
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
