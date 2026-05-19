"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { SUPPORTED_LOCALES, LOCALE_LABELS, LOCALE_COOKIE } from "@/i18n/locales";

type Props = {
  /** "chip" = compact EN/IT label for header row 1; "full" = flag + name for drawer */
  variant?: "chip" | "full";
};

export function LocaleSwitcher({ variant = "chip" }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchLocale(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  }

  if (variant === "full") {
    // Inline row used in mobile drawer
    return (
      <div className="flex items-center gap-2 mt-1">
        {SUPPORTED_LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLocale(l)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-meta border cursor-pointer transition-colors font-sans",
              l === locale
                ? "border-ink bg-ink text-white font-medium"
                : "border-border bg-transparent text-ink-soft hover:border-border-strong hover:text-ink",
            )}
          >
            <span>{LOCALE_LABELS[l].flag}</span>
            {LOCALE_LABELS[l].name}
          </button>
        ))}
      </div>
    );
  }

  // Chip variant — compact dropdown for desktop header
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-mini font-medium text-ink-soft hover:text-ink hover:bg-surface-soft transition-colors border-0 bg-transparent cursor-pointer"
      >
        {/* Globe icon */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="uppercase tracking-[0.05em]">{locale}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0 opacity-60">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] bg-surface border border-border rounded-xl shadow-lg py-1 overflow-hidden">
            {SUPPORTED_LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-meta text-left cursor-pointer border-0 transition-colors font-sans",
                  l === locale
                    ? "text-ink font-medium bg-surface-soft"
                    : "text-ink-soft hover:bg-surface-soft hover:text-ink bg-transparent",
                )}
              >
                <span className="text-[16px]">{LOCALE_LABELS[l].flag}</span>
                {LOCALE_LABELS[l].name}
                {l === locale && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 ml-auto text-orange shrink-0">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
