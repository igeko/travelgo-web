"use client";

/**
 * GoPanel · orchestratore del sistema Go widget.
 *
 * Flusso:
 *   idle
 *     → click trigger
 *   step1_loading
 *     → chiamata API (step=1): Go saluta + quick-reply
 *   step1_done  (balloon testo + widget quick-reply)
 *     → utente sceglie un'opzione
 *   step2_loading
 *     → chiamata API (step=2, userChoice): risultati
 *   step2_done  (balloon testo + widget suggestions/carousel/confirm)
 *     → utente interagisce col widget
 *   closed / dismiss
 */

// Registra tutti i widget — side effect intenzionale
import "./widgets/index";

import { useCallback, useReducer } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { GoWidgetRenderer } from "./GoWidgetRenderer";
import type { GoAction, GoContext, GoResponse } from "./types";

/* ── Tipi ── */

type GoBalloon = { text: string };

type GoPanelStep =
  | { name: "idle" }
  | { name: "step1_loading" }
  | { name: "step1_done"; balloon: GoBalloon; widget: GoResponse }
  | { name: "step2_loading"; balloon: GoBalloon; prevWidget: GoResponse }
  | { name: "step2_done"; balloon1: GoBalloon; balloon2: GoBalloon; widget: GoResponse }
  | { name: "error"; message: string };

type GoPanelState = {
  isOpen: boolean;
  step: GoPanelStep;
};

type GoPanelAction =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "STEP1_SUCCESS"; balloon: GoBalloon; widget: GoResponse }
  | { type: "STEP1_ERROR"; message: string }
  | { type: "QUICK_REPLY_CHOSEN"; prevBalloon: GoBalloon; prevWidget: GoResponse }
  | { type: "STEP2_SUCCESS"; balloon: GoBalloon; widget: GoResponse }
  | { type: "STEP2_ERROR"; message: string }
  | { type: "DISMISS" };

function reducer(state: GoPanelState, action: GoPanelAction): GoPanelState {
  switch (action.type) {
    case "OPEN":
      return { isOpen: true, step: { name: "step1_loading" } };
    case "CLOSE":
    case "DISMISS":
      return { isOpen: false, step: { name: "idle" } };
    case "STEP1_SUCCESS":
      return { ...state, step: { name: "step1_done", balloon: action.balloon, widget: action.widget } };
    case "STEP1_ERROR":
      return { ...state, step: { name: "error", message: action.message } };
    case "QUICK_REPLY_CHOSEN":
      return { ...state, step: { name: "step2_loading", balloon: action.prevBalloon, prevWidget: action.prevWidget } };
    case "STEP2_SUCCESS":
      if (state.step.name !== "step2_loading") return state;
      return { ...state, step: { name: "step2_done", balloon1: state.step.balloon, balloon2: action.balloon, widget: action.widget } };
    case "STEP2_ERROR":
      return { ...state, step: { name: "error", message: action.message } };
    default:
      return state;
  }
}

const initialState: GoPanelState = { isOpen: false, step: { name: "idle" } };

/* ── Risposta API — testo + widget ── */

type GoApiResponse = {
  text: string;
  widget: GoResponse;
};

/* ── Props ── */

export type GoPanelProps = {
  context: GoContext;
  triggerLabel?: string;
  triggerSub?: string;
  onAction?: (action: GoAction) => void;
  /**
   * Override della fetch verso /api/go.
   * Usato dalla sandbox per il debug panel.
   */
  fetchFn?: (context: GoContext, step: 1 | 2, userChoice?: string) => Promise<GoApiResponse>;
  className?: string;
};

/* ── Fetch default ── */

async function defaultFetch(
  context: GoContext,
  step: 1 | 2,
  userChoice?: string,
): Promise<GoApiResponse> {
  return api.go.legacy<GoApiResponse>({ context, step, userChoice });
}

/* ── Componente ── */

export function GoPanel({
  context,
  triggerLabel,
  triggerSub = "Due parole da te, qualche idea da me.",
  onAction,
  fetchFn,
  className,
}: GoPanelProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const doFetch = fetchFn ?? defaultFetch;

  /* Step 1 — saluto + quick-reply */
  const handleOpen = useCallback(async () => {
    dispatch({ type: "OPEN" });
    try {
      const data = await doFetch(context, 1);
      dispatch({ type: "STEP1_SUCCESS", balloon: { text: data.text }, widget: data.widget });
    } catch (err) {
      dispatch({ type: "STEP1_ERROR", message: err instanceof Error ? err.message : "Errore" });
    }
  }, [context, doFetch]);

  /* Step 2 — risultati dopo scelta quick-reply */
  const handleQuickReply = useCallback(
    async (choiceLabel: string) => {
      if (state.step.name !== "step1_done") return;
      const { balloon, widget } = state.step;
      dispatch({ type: "QUICK_REPLY_CHOSEN", prevBalloon: balloon, prevWidget: widget });
      try {
        const data = await doFetch(context, 2, choiceLabel);
        dispatch({ type: "STEP2_SUCCESS", balloon: { text: data.text }, widget: data.widget });
      } catch (err) {
        dispatch({ type: "STEP2_ERROR", message: err instanceof Error ? err.message : "Errore" });
      }
    },
    [state.step, context, doFetch],
  );

  /* Azioni widget */
  const handleAction = useCallback(
    (action: GoAction) => {
      // quick-reply: la scelta "select" diventa il secondo step
      if (
        action.kind === "select" &&
        state.step.name === "step1_done" &&
        state.step.widget.widget === "quick-reply"
      ) {
        void handleQuickReply(action.label);
        return;
      }
      onAction?.(action);
      if (action.kind !== "confirm" || action.value === true) {
        dispatch({ type: "DISMISS" });
      }
    },
    [state.step, handleQuickReply, onAction],
  );

  const handleDismiss = useCallback(() => dispatch({ type: "DISMISS" }), []);

  /* ── Render trigger ── */
  if (!state.isOpen) {
    return (
      <GoTriggerBanner
        label={triggerLabel}
        sub={triggerSub}
        onClick={handleOpen}
        className={className}
      />
    );
  }

  /* ── Render pannello aperto ── */
  const { step } = state;

  return (
    <div className={cn("border border-border rounded-xl overflow-hidden bg-surface", className)}>
      {/* Header */}
      <PanelHeader onClose={handleDismiss} />

      {/* Body */}
      <div className="px-4 py-4 flex flex-col gap-3">

        {step.name === "step1_loading" && <LoadingSkeleton />}

        {step.name === "step1_done" && (
          <>
            <GoBalloonEl text={step.balloon.text} />
            <GoWidgetRenderer response={step.widget} onAction={handleAction} onDismiss={handleDismiss} />
          </>
        )}

        {step.name === "step2_loading" && (
          <>
            <GoBalloonEl text={step.balloon.text} />
            <LoadingSkeleton />
          </>
        )}

        {step.name === "step2_done" && (
          <>
            <GoBalloonEl text={step.balloon1.text} />
            <GoBalloonEl text={step.balloon2.text} />
            <GoWidgetRenderer response={step.widget} onAction={handleAction} onDismiss={handleDismiss} />
          </>
        )}

        {step.name === "error" && (
          <div className="text-mini text-ink-soft font-serif italic py-2">
            Qualcosa è andato storto.{" "}
            <button type="button" className="underline text-orange" onClick={handleOpen}>
              Riprova
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sotto-componenti
───────────────────────────────────────────────────────────────── */

const ROTATING_WORDS = [
  "un posto da vedere?",
  "un food spot?",
  "un'idea per oggi?",
  "qualcosa di insolito?",
];

function GoTriggerBanner({
  label,
  sub,
  onClick,
  className,
}: {
  label?: string;
  sub: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl w-full text-left",
        "flex items-center gap-3 px-3.5 py-3 cursor-pointer bg-transparent",
        className,
      )}
    >
      {/* Sweep luminoso */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-xl go-sweep"
        style={{
          background:
            "linear-gradient(100deg, transparent 30%, rgba(244,123,58,0.18) 50%, transparent 70%)",
        }}
      />

      <span className="relative z-[2] shrink-0">
        <GoAvatar size="md" />
      </span>

      <div className="relative z-[2] flex-1 min-w-0">
        <div className="text-micro font-medium uppercase tracking-[0.08em] text-orange leading-none mb-0.5">
          Go
        </div>
        {label ? (
          <div className="text-[14px] font-medium text-ink">{label}</div>
        ) : (
          <div className="text-[14px] font-medium text-ink overflow-hidden">
            Vuoi trovare{" "}
            <span className="inline-block h-[20px] overflow-hidden align-[-4px] min-w-[145px]">
              <span
                className="flex flex-col go-words-rotate"
                aria-hidden="true"
              >
                {ROTATING_WORDS.map((w) => (
                  <span
                    key={w}
                    className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap"
                  >
                    {w}
                  </span>
                ))}
                {/* Duplicato per loop continuo */}
                <span className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap">
                  {ROTATING_WORDS[0]}
                </span>
              </span>
            </span>
          </div>
        )}
        <div className="text-tiny font-serif italic text-ink-soft mt-0.5">{sub}</div>
      </div>

      {/* Bottone dark con sparkle arancione — fedele al design HTML */}
      <span className="relative z-[2] inline-flex items-center gap-1.5 bg-ink hover:bg-ink-hover text-white rounded-pill text-mini font-medium shrink-0 pl-3 pr-4 py-2 transition-colors">
        <SparkleIcon className="text-orange" />
        Ask me
      </span>
    </button>
  );
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 border-b border-border"
      style={{
        background:
          "linear-gradient(180deg, var(--color-orange-soft) 0%, var(--color-surface) 100%)",
      }}
    >
      <GoAvatar size="sm" />
      <span className="text-tiny font-medium uppercase tracking-[0.08em] text-orange flex-1">
        Go
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi"
        className="w-6 h-6 rounded-full text-ink-soft border border-border-strong inline-flex items-center justify-center hover:bg-surface-soft hover:text-ink transition-colors"
      >
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <line x1="2" y1="2" x2="10" y2="10" />
          <line x1="10" y1="2" x2="2" y2="10" />
        </svg>
      </button>
    </div>
  );
}

function GoBalloonEl({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 items-start">
      <GoAvatar size="sm" />
      <div
        className="bg-surface-soft border border-border px-3.5 py-2.5 text-meta text-ink leading-snug max-w-[85%]"
        style={{ borderRadius: "16px 16px 16px 4px" }}
      >
        {text}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse pl-[34px]">
      <div className="h-8 bg-surface-soft rounded-2xl w-4/5" />
      <div className="flex gap-2 mt-1">
        <div className="h-8 bg-surface-soft rounded-pill w-28" />
        <div className="h-8 bg-surface-soft rounded-pill w-32" />
        <div className="h-8 bg-surface-soft rounded-pill w-24" />
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      className={cn("w-3.5 h-3.5", className)}
      fill="currentColor"
    >
      <path d="M7 0 L8.2 5.1 L13 7 L8.2 8.9 L7 14 L5.8 8.9 L1 7 L5.8 5.1 Z" />
    </svg>
  );
}
