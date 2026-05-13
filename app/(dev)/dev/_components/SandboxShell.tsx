"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
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

export function SandboxShell({ children }: { children: ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightContent, setRightContent] = useState<ReactNode>(null);
  const [mounted, setMounted] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const left = localStorage.getItem(LS_LEFT);
    const right = localStorage.getItem(LS_RIGHT);
    if (left !== null) setLeftOpen(left === "1");
    if (right !== null) setRightOpen(right === "1");
    setMounted(true);
  }, []);

  // Persist
  useEffect(() => {
    if (mounted) localStorage.setItem(LS_LEFT, leftOpen ? "1" : "0");
  }, [leftOpen, mounted]);
  useEffect(() => {
    if (mounted) localStorage.setItem(LS_RIGHT, rightOpen ? "1" : "0");
  }, [rightOpen, mounted]);

  const groups = sandboxRegistry.reduce<Record<string, SandboxEntry[]>>(
    (acc, entry) => {
      (acc[entry.group] ??= []).push(entry);
      return acc;
    },
    {},
  );

  /** Render a flat list of entries, optionally grouped by subgroup. */
  function renderEntries(entries: SandboxEntry[]) {
    // Split into: entries without subgroup, then grouped by subgroup (in order)
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
            <Link
              href={`/dev/${entry.slug}`}
              className="block rounded-md px-2 py-1.5 text-sm text-ink hover:bg-surface-soft transition-colors"
            >
              {entry.title}
            </Link>
          </li>
        ))}
        {Object.entries(subMap).map(([subgroup, subEntries]) => (
          <li key={subgroup}>
            <div className="px-2 pt-3 pb-1 text-[9px] font-medium tracking-[0.10em] uppercase text-ink-faint/70">
              {subgroup}
            </div>
            <ul className="flex flex-col pl-2 border-l border-border ml-2">
              {subEntries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/dev/${entry.slug}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-ink hover:bg-surface-soft transition-colors"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
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
                const isFeatures = group === "Features";
                const prevGroup = Object.keys(groups)[i - 1];
                const needsDivider = isFeatures && prevGroup;
                return (
                  <div key={group}>
                    {/* Divider before Features — signals transition from design system to app layer */}
                    {needsDivider && (
                      <div className="mx-2 mb-5 -mt-1 h-px bg-border" />
                    )}
                    <div className={`px-2 pb-2 text-[10px] font-medium tracking-[0.12em] uppercase ${isFeatures ? "text-orange" : "text-ink-faint"}`}>
                      {group}
                    </div>
                    <ul className="flex flex-col">
                      {renderEntries(entries)}
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
