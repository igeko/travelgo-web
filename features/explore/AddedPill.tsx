"use client";

/**
 * features/explore/AddedPill.tsx
 * ─────────────────────────────────────────────────────────────────
 * Inline auto-dismissing pill anchored top-center of the Explore map.
 * Surfaced after a successful "Add to trip" so the user knows where
 * the place landed; non-blocking, no actions, fades after 3 seconds.
 *
 * Stati:
 *   success           — "Aggiunto al Giorno 4 — dopo Shinjuku Gyoen"
 *   success + warning — adds a compact list of warnings (overflow /
 *                        incoherent / duplicate)
 *   error             — "Couldn't add the place. Try again."
 *
 * Le toast con azione (es. "duplicato — Conferma / Annulla") sono
 * intenzionalmente fuori scope: vivono nel brief UX 06b.
 *
 * Atomic level: organism specifico di Explore (vive in features/, non
 * in components/ui/).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconCheck, IconAlertTriangle, IconLoader2 } from "@/components/ui/icons";

/** Algorithm output flags surfaced to the user. Mirrors AddWarning. */
type AddedWarning = "overflow" | "incoherent" | "duplicate";

export type AddedPillState =
  | { kind: "pending" }
  | {
      kind: "success";
      dayNumber: number;
      /** Title of the activity the new stop landed after — null at day start. */
      afterTitle: string | null;
      warnings: AddedWarning[];
    }
  | { kind: "error" };

const VISIBLE_MS = 3000;

export function AddedPill({
  state,
  onDismiss,
}: {
  state: AddedPillState;
  onDismiss: () => void;
}) {
  const t = useTranslations("Explore");

  // Auto-dismiss only when the request has settled. Pending stays put until
  // success/error arrives — otherwise the user would briefly see "Adding…",
  // a blank, and then the success, which reads as a flicker.
  useEffect(() => {
    if (state.kind === "pending") return;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [state, onDismiss]);

  if (state.kind === "pending") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "absolute left-1/2 top-4 z-[1200] -translate-x-1/2",
          "flex items-center gap-2 rounded-pill border px-3.5 py-2 shadow-float",
          "bg-surface text-ink-soft border-border-strong",
          "text-mini font-medium",
          "animate-in fade-in slide-in-from-top-2 duration-200",
        )}
      >
        <IconLoader2 size={16} className="animate-spin" />
        <span>{t("adding")}</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "absolute left-1/2 top-4 z-[1200] -translate-x-1/2",
          "flex items-center gap-2 rounded-pill border px-3.5 py-2 shadow-float",
          "bg-danger-bg text-danger-fg border-danger-border",
          "text-mini font-medium",
          "animate-in fade-in slide-in-from-top-2 duration-200",
        )}
      >
        <IconAlertTriangle size={16} />
        <span>{t("addToTripError")}</span>
      </div>
    );
  }

  const hasWarnings = state.warnings.length > 0;
  const title = state.afterTitle
    ? `${t("added.title", { n: state.dayNumber })}${t("added.after", { title: state.afterTitle })}`
    : t("added.title", { n: state.dayNumber });

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute left-1/2 top-4 z-[1200] -translate-x-1/2",
        "flex max-w-[420px] items-start gap-2 rounded-pill border px-3.5 py-2 shadow-float",
        hasWarnings
          ? "bg-warning-bg text-warning-fg border-warning-border"
          : "bg-success-bg text-success-fg border-success-border",
        "text-mini font-medium",
        "animate-in fade-in slide-in-from-top-2 duration-200",
      )}
    >
      {hasWarnings ? <IconAlertTriangle size={16} className="mt-0.5 shrink-0" /> : <IconCheck size={16} className="mt-0.5 shrink-0" />}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate">{title}</span>
        {hasWarnings && (
          <span className="text-tiny opacity-80">
            {state.warnings.map((w) => t(`added.warning.${w}`)).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
