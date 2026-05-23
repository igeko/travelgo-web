"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { FeedbackModal } from "./FeedbackModal";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { IconMessageReport, IconNotes, IconPencil } from "@/components/ui/icons";
import { useYumejiDrawer } from "@/features/yumeji/YumejiFrame";
import { YumejiGlyph } from "@/features/yumeji/YumejiGlyph";

/* ─────────────────────────────────────────────────────────────────
   AppHeader · two-row sticky header
   Uses CSS container queries (@container) so the mobile layout
   triggers based on the header's own width — not the viewport.
   This lets the sandbox mobile-frame work correctly at 390px.
───────────────────────────────────────────────────────────────── */

export type AppHeaderTab = "trip" | "day-by-day" | "explore" | "budget" | "notes";

export type AppHeaderProps = {
  activeNav?: "trips" | "explore" | "yumeji";
  /** Trip name, e.g. "Japan 2026". When absent the sub-bar is hidden. */
  tripName?: string;
  /** e.g. "Day 4 of 21" */
  tripProgress?: string;
  activeTab?: AppHeaderTab;
  onTabChange?: (tab: AppHeaderTab) => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
  /** When true, shows the debug-mode chip (only if isDev) */
  isDev?: boolean;
  debugMode?: boolean;
  onToggleDebugMode?: () => void;
  onTripActions?: () => void;
  /** Trip ID — used to build sub-tab hrefs */
  tripId?: string;
  /** When true shows the feedback action in the kebab menu */
  isTester?: boolean;
  initials?: string;
  /** Google avatar URL */
  avatarUrl?: string;
  /** Full name for the welcome message */
  fullName?: string;
  /** When true shows the avatar, when false shows the Sign in button */
  isLoggedIn?: boolean;
  className?: string;
};

export function AppHeader({
  activeNav = "trips",
  tripName,
  tripProgress,
  activeTab = "day-by-day",
  onTabChange,
  editMode = false,
  onToggleEditMode,
  isDev = false,
  debugMode = false,
  onToggleDebugMode,
  tripId,
  isTester = false,
  initials = "",
  avatarUrl,
  fullName,
  isLoggedIn = false,
  className,
}: AppHeaderProps) {
  const t = useTranslations("AppHeader");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);
  const hasTripContext = !!tripName;
  const yumeji = useYumejiDrawer();

  const ALL_NAV: { id: AppHeaderProps["activeNav"]; label: string; href: string; authRequired: boolean }[] = [
    { id: "trips",   label: t("nav.myTrips"), href: "/trips",   authRequired: true },
    { id: "explore", label: t("nav.explore"), href: "/explore", authRequired: false },
    { id: "yumeji",  label: t("nav.yumeji"),  href: "/yumeji",  authRequired: true },
  ];

  const SECTION_TABS: { id: AppHeaderTab; label: string; href: (tripId: string) => string }[] = [
    { id: "trip",       label: t("tabs.trip"),      href: (id) => `/trips/${id}/overview` },
    { id: "day-by-day", label: t("tabs.dayByDay"),  href: (id) => `/trips/${id}` },
    { id: "explore",    label: t("tabs.explore"),    href: (id) => `/trips/${id}/explore` },
  ];

  return (
    <div className={cn("sticky top-0 z-50", className)}>
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
              className="text-tiny text-ink-faint font-normal leading-tight"
              style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
            >
              Travel<b className="text-ink font-medium">Go</b>
            </span>
          </Link>

          {/* Main nav — hidden below @sm */}
          <nav className="hidden md:flex items-center gap-[22px] text-meta text-ink-soft">
            {ALL_NAV.filter((item) => !item.authRequired || isLoggedIn).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "no-underline transition-colors whitespace-nowrap",
                  item.id === activeNav
                    ? "text-ink font-medium border-b-2 border-orange pb-0.5"
                    : "hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Account — hidden below @sm */}
          {isLoggedIn ? (
            <div className="hidden md:flex ml-auto items-center gap-2.5 shrink-0">
              {fullName && (
                <span className="text-meta text-ink-soft">
                  {t("greeting", { name: fullName.split(" ")[0] })}
                </span>
              )}
              <LocaleSwitcher variant="chip" />
              <Link href="/profile" aria-label={t("profileLabel")} className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-border transition-all">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName ?? "Avatar"}
                    className="w-[30px] h-[30px] rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-[30px] h-[30px] rounded-full bg-ink flex items-center justify-center text-white text-tiny font-semibold select-none">
                    {initials}
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex ml-auto items-center gap-2.5 shrink-0">
              <LocaleSwitcher variant="chip" />
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-1.5 rounded-pill border border-border text-meta text-ink-soft font-medium no-underline hover:border-border-strong hover:text-ink transition-colors"
              >
                {t("signIn")}
              </Link>
            </div>
          )}

          {/* Hamburger — visible only below @sm */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={drawerOpen}
            className="md:hidden ml-auto w-8 h-8 flex items-center justify-center text-ink bg-transparent border-0 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* ══ MOBILE DRAWER ════════════════════════════════════════ */}
        {drawerOpen && (
          <div className="md:hidden bg-surface border-t border-b border-border px-5 pt-[14px] pb-[18px]">
            {/* Section 1 — main nav */}
            <div>
              <div className="text-micro font-medium tracking-[0.10em] uppercase text-orange mb-2">
                TravelGo
              </div>
              <nav className="flex flex-col">
                {ALL_NAV.filter((item) => !item.authRequired || isLoggedIn).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center px-[6px] py-[10px] rounded-lg text-[14px] no-underline transition-colors",
                      item.id === activeNav
                        ? "text-ink font-medium bg-surface-soft"
                        : "text-ink-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Language switcher */}
            <div className="mt-[14px] pt-[14px] border-t border-border">
              <div className="text-micro font-medium tracking-[0.10em] uppercase text-ink-faint mb-2">
                Language
              </div>
              <LocaleSwitcher variant="full" />
            </div>

            {/* Section 2 — trip tabs */}
            {hasTripContext && (
              <div className="mt-[14px] pt-[14px] border-t border-border">
                <div className="text-micro font-medium tracking-[0.10em] uppercase text-orange mb-2">
                  {t("tripSection", { name: tripName })}
                </div>
                <nav className="flex flex-col">
                  {SECTION_TABS.map((tab) => (
                    tripId ? (
                      <Link
                        key={tab.id}
                        href={tab.href(tripId)}
                        onClick={() => setDrawerOpen(false)}
                        className={cn(
                          "flex items-center px-[6px] py-[10px] rounded-lg text-[14px] no-underline transition-colors",
                          tab.id === activeTab
                            ? "text-ink font-medium bg-surface-soft"
                            : "text-ink-soft",
                        )}
                      >
                        {tab.label}
                      </Link>
                    ) : (
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
                    )
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
              <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                <span className="text-micro font-medium tracking-eyebrow uppercase text-orange truncate">
                  {tripName}
                </span>
                {tripProgress && (
                  <>
                    <span className="text-ink-faint text-mini shrink-0">·</span>
                    <span className="text-mini text-ink-soft whitespace-nowrap shrink-0">{tripProgress}</span>
                  </>
                )}
              </div>

              {/* Section tabs — hidden below @sm */}
              <nav className="hidden md:flex items-center gap-1 ml-auto shrink-0">
                {SECTION_TABS.map((tab) => (
                  tripId ? (
                    <Link
                      key={tab.id}
                      href={tab.href(tripId)}
                      className={cn(
                        "px-3 py-[5px] rounded-pill text-mini font-sans cursor-pointer transition-colors whitespace-nowrap no-underline",
                        tab.id === activeTab
                          ? "bg-ink text-white font-medium"
                          : "bg-transparent text-ink-soft hover:text-ink",
                      )}
                    >
                      {tab.label}
                    </Link>
                  ) : (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange?.(tab.id)}
                      className={cn(
                        "px-3 py-[5px] rounded-pill text-mini font-sans cursor-pointer transition-colors whitespace-nowrap border-0",
                        tab.id === activeTab
                          ? "bg-ink text-white font-medium"
                          : "bg-transparent text-ink-soft hover:text-ink",
                      )}
                    >
                      {tab.label}
                    </button>
                  )
                ))}
              </nav>

              {/* Divider — hidden below @sm */}
              <span aria-hidden className="hidden md:block w-px h-[22px] bg-border shrink-0" />

              {/* ── Action chips ── */}
              <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">

                {/* Edit-state chip — always visible */}
                <button
                  type="button"
                  onClick={onToggleEditMode}
                  aria-pressed={editMode}
                  title={editMode ? t("disableEditMode") : t("enableEditMode")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-[5px] rounded-pill text-mini font-sans cursor-pointer transition-colors whitespace-nowrap border shrink-0",
                    editMode
                      ? "bg-warning-bg text-warning-fg border-warning-border font-medium"
                      : "bg-transparent border-transparent text-ink-soft hover:text-ink",
                  )}
                >
                  <IconPencil size={13} />
                  <span>{t("editMode")}</span>
                </button>

              </div>
              {/* ── end action chips ── */}

              {/* Yume — tab al pari degli altri, con glifo */}
              {yumeji && (
                <button
                  type="button"
                  onClick={yumeji.toggle}
                  aria-pressed={yumeji.isOpen}
                  className={cn(
                    "hidden md:inline-flex items-center gap-1.5 px-3 py-[5px] rounded-pill text-mini font-sans cursor-pointer transition-colors whitespace-nowrap border-0 shrink-0",
                    yumeji.isOpen
                      ? "bg-ink text-white font-medium"
                      : "bg-transparent text-ink-soft hover:text-ink",
                  )}
                >
                  <YumejiGlyph size={13} />
                  Yume
                </button>
              )}

              {/* Actions menu (kebab) — ultima voce: Debug, Feedback, tutti i feedback */}
              {(isDev || isTester) && (
                <div ref={kebabRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setKebabOpen((v) => !v)}
                    aria-label={t("tripActions")}
                    title={t("tripActions")}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <circle cx="12" cy="5"  r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {kebabOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setKebabOpen(false)} />
                      <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[200px] bg-surface border border-border rounded-xl shadow-lg py-1 overflow-hidden">

                        {/* Debug toggle — solo per dev */}
                        {isDev && (
                          <button
                            type="button"
                            onClick={() => { onToggleDebugMode?.(); setKebabOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-meta text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline border-0 bg-transparent cursor-pointer text-left"
                          >
                            <span className={cn("w-[7px] h-[7px] rounded-full shrink-0", debugMode ? "bg-[#7ee8a2]" : "bg-ink-faint")} />
                            <span className="font-mono">{t("debug")}</span>
                          </button>
                        )}

                        {isDev && isTester && <div aria-hidden className="my-1 h-px bg-border" />}

                        {/* Feedback — solo per tester */}
                        {isTester && (
                          <button
                            type="button"
                            onClick={() => { setFeedbackOpen(true); setKebabOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-meta text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline border-0 bg-transparent cursor-pointer text-left"
                          >
                            <IconMessageReport size={15} className="shrink-0" />
                            {t("feedback")}
                          </button>
                        )}

                        {/* Tutti i feedback — solo per tester */}
                        {isTester && (
                          <Link
                            href="/admin/tester-notes"
                            onClick={() => setKebabOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-meta text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline"
                          >
                            <IconNotes size={15} className="shrink-0" />
                            {t("allFeedback")}
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </header>

      {/* Feedback modal — portato fuori dall'header per evitare z-index issues */}
      {feedbackOpen && (
        <FeedbackModal
          tripId={tripId}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}
