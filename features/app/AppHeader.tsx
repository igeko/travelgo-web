"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   AppHeader · two-row sticky header
   Uses CSS container queries (@container) so the mobile layout
   triggers based on the header's own width — not the viewport.
   This lets the sandbox mobile-frame work correctly at 390px.
───────────────────────────────────────────────────────────────── */

export type AppHeaderTab = "day-by-day" | "map" | "budget" | "notes";

export type AppHeaderProps = {
  activeNav?: "trips" | "explore" | "guides" | "budget";
  /** Trip name, e.g. "Japan 2026". When absent the sub-bar is hidden. */
  tripName?: string;
  /** e.g. "Day 4 of 21" */
  tripProgress?: string;
  activeTab?: AppHeaderTab;
  onTabChange?: (tab: AppHeaderTab) => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
  onTripActions?: () => void;
  initials?: string;
  className?: string;
};

const MAIN_NAV: { id: AppHeaderProps["activeNav"]; label: string }[] = [
  { id: "trips",   label: "My trips" },
  { id: "explore", label: "Explore" },
  { id: "guides",  label: "Guides" },
  { id: "budget",  label: "Budget" },
];

const SECTION_TABS: { id: AppHeaderTab; label: string }[] = [
  { id: "day-by-day", label: "Day by day" },
  { id: "map",        label: "Map" },
  { id: "budget",     label: "Budget" },
  { id: "notes",      label: "Notes" },
];

export function AppHeader({
  activeNav = "trips",
  tripName,
  tripProgress,
  activeTab = "day-by-day",
  onTabChange,
  editMode = false,
  onToggleEditMode,
  onTripActions,
  initials = "ED",
  className,
}: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasTripContext = !!tripName;

  return (
    /* @container root — all responsive classes use @sm: (520px) */
    <div className={cn("@container sticky top-0 z-50", className)}>
      <header className="bg-surface border-b border-border">

        {/* ══ ROW 1 · brand + nav + account ════════════════════════ */}
        <div className="flex items-center gap-6 px-5 h-[52px] max-w-[1280px] mx-auto">

          {/* Brand */}
          <Link
            href="/"
            aria-label="TravelGo · home"
            className="flex items-center gap-[10px] shrink-0 no-underline text-inherit"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[17px] leading-none select-none"
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
              className="text-[11px] text-ink-faint font-normal leading-tight"
              style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
            >
              Travel<b className="text-ink font-medium">Go</b>
            </span>
          </Link>

          {/* Main nav — hidden below @sm */}
          <nav className="hidden @sm:flex items-center gap-[22px] text-[13px] text-ink-soft">
            {MAIN_NAV.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "cursor-pointer transition-colors whitespace-nowrap",
                  item.id === activeNav
                    ? "text-ink font-medium border-b-2 border-orange pb-0.5"
                    : "hover:text-ink",
                )}
              >
                {item.label}
              </span>
            ))}
          </nav>

          {/* Account avatar — hidden below @sm */}
          <div className="hidden @sm:flex ml-auto w-[30px] h-[30px] rounded-full bg-ink items-center justify-center text-white text-[11px] font-semibold shrink-0 select-none">
            {initials}
          </div>

          {/* Hamburger — visible only below @sm */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={drawerOpen}
            className="@sm:hidden ml-auto w-8 h-8 flex items-center justify-center text-ink bg-transparent border-0 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* ══ MOBILE DRAWER ════════════════════════════════════════ */}
        {drawerOpen && (
          <div className="@sm:hidden bg-surface border-t border-b border-border px-5 pt-[14px] pb-[18px]">
            {/* Section 1 — main nav */}
            <div>
              <div className="text-[10px] font-medium tracking-[0.10em] uppercase text-orange mb-2">
                TravelGo
              </div>
              <nav className="flex flex-col">
                {MAIN_NAV.map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "flex items-center px-[6px] py-[10px] rounded-lg text-[14px] cursor-pointer transition-colors",
                      item.id === activeNav
                        ? "text-ink font-medium bg-surface-soft"
                        : "text-ink-soft",
                    )}
                  >
                    {item.label}
                  </span>
                ))}
              </nav>
            </div>

            {/* Section 2 — trip tabs */}
            {hasTripContext && (
              <div className="mt-[14px] pt-[14px] border-t border-border">
                <div className="text-[10px] font-medium tracking-[0.10em] uppercase text-orange mb-2">
                  Trip · {tripName}
                </div>
                <nav className="flex flex-col">
                  {SECTION_TABS.map((tab) => (
                    <span
                      key={tab.id}
                      onClick={() => { onTabChange?.(tab.id); setDrawerOpen(false); }}
                      className={cn(
                        "flex items-center px-[6px] py-[10px] rounded-lg text-[14px] cursor-pointer transition-colors",
                        tab.id === activeTab
                          ? "text-ink font-medium bg-surface-soft"
                          : "text-ink-soft",
                      )}
                    >
                      {tab.label}
                    </span>
                  ))}
                </nav>
              </div>
            )}
          </div>
        )}

        {/* ══ ROW 2 · trip sub-bar ══════════════════════════════════ */}
        {hasTripContext && (
          <div className="bg-bg border-t border-b border-border">
            <div className="flex items-center px-5 h-[42px] max-w-[1280px] mx-auto gap-3.5">

              {/* Trip name + progress */}
              <div className="flex items-baseline gap-1.5 min-w-0 shrink-0">
                <span className="text-[10px] font-medium tracking-[0.06em] uppercase text-orange">
                  {tripName}
                </span>
                {tripProgress && (
                  <>
                    <span className="text-ink-faint text-[12px]">·</span>
                    <span className="text-[12px] text-ink-soft whitespace-nowrap">{tripProgress}</span>
                  </>
                )}
              </div>

              {/* Section tabs — hidden below @sm */}
              <nav className="hidden @sm:flex items-center gap-1 ml-auto shrink-0">
                {SECTION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange?.(tab.id)}
                    className={cn(
                      "px-3 py-[5px] rounded-pill text-[12px] font-sans cursor-pointer transition-colors whitespace-nowrap border-0",
                      tab.id === activeTab
                        ? "bg-ink text-white font-medium"
                        : "bg-transparent text-ink-soft hover:text-ink",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Divider — hidden below @sm */}
              <span aria-hidden className="hidden @sm:block w-px h-[22px] bg-border shrink-0" />

              {/* Edit-state chip — always visible */}
              <button
                type="button"
                onClick={onToggleEditMode}
                title={editMode ? "Switch to view mode" : "Switch to edit mode"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] border cursor-pointer transition-colors shrink-0 font-sans @sm:ml-0 ml-auto",
                  editMode
                    ? "bg-orange border-orange text-white font-medium"
                    : "bg-transparent border-border text-ink-soft hover:border-border-strong",
                )}
              >
                <span className={cn("w-[7px] h-[7px] rounded-full shrink-0", editMode ? "bg-white" : "bg-ink-faint")} />
                <span>{editMode ? "Editing" : "View"}</span>
              </button>

              {/* Kebab — always visible */}
              <button
                type="button"
                onClick={onTripActions}
                aria-label="Trip actions"
                title="Trip actions"
                className="w-7 h-7 flex items-center justify-center rounded-md text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer border-0 bg-transparent shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <circle cx="12" cy="5"  r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

            </div>
          </div>
        )}

      </header>
    </div>
  );
}
