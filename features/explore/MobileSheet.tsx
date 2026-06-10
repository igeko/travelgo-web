"use client";

/**
 * features/explore/MobileSheet.tsx
 * ─────────────────────────────────────────────────────────────────
 * Bottom sheet con drag-to-snap a tre stati:
 *  - peek (~80px): solo drag handle + prima riga sticky del contenuto
 *  - half (50% del parent): vista parziale
 *  - full (88% del parent): vista quasi completa
 *
 * Il drag sulla grip handle aggiorna in tempo reale lo `style.height`;
 * al rilascio, snap allo stato target più vicino (animazione `height` ~
 * 240ms ease-out). Durante il drag la transition è disabilitata.
 *
 * Il componente NON si autoposiziona: viene renderizzato come
 * `absolute inset-x-0 bottom-0` dentro un container `position: relative`.
 * Il parent gli dà `lg:hidden` se serve mostrare solo sotto un breakpoint.
 *
 * Comunica al parent l'altezza corrente via `onHeightChange` per chi deve
 * adeguarsi (es. `viewportInset.bottom` della mappa Explore).
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type MobileSheetState = "peek" | "half" | "full";

/** Altezza in px del peek — pensata per drag handle + day strip sticky. */
const PEEK_PX = 80;
/** Frazioni dell'altezza del container per half/full. */
const HALF_FRAC = 0.5;
const FULL_FRAC = 0.88;
/** Distanza minima in px per considerare il gesto un drag (vs tap). */
const DRAG_THRESHOLD_PX = 4;

function heightForState(state: MobileSheetState, container: number): number {
  if (state === "peek") return PEEK_PX;
  if (state === "half") return Math.max(PEEK_PX, Math.round(container * HALF_FRAC));
  return Math.max(PEEK_PX, Math.round(container * FULL_FRAC));
}

/** Trova lo stato la cui altezza è più vicina a `h`. */
function snapStateFor(h: number, container: number): MobileSheetState {
  const candidates: { state: MobileSheetState; h: number }[] = [
    { state: "peek", h: heightForState("peek", container) },
    { state: "half", h: heightForState("half", container) },
    { state: "full", h: heightForState("full", container) },
  ];
  return candidates.reduce((best, c) =>
    Math.abs(c.h - h) < Math.abs(best.h - h) ? c : best,
  ).state;
}

export function MobileSheet({
  defaultState = "half",
  state,
  onStateChange,
  onHeightChange,
  children,
  className,
}: {
  /** Stato iniziale quando il componente è uncontrolled. Default "half". */
  defaultState?: MobileSheetState;
  /** Stato controllato dal parent (opzionale). */
  state?: MobileSheetState;
  /** Notifica del cambio stato (snap dopo drag o tap sulla grip). */
  onStateChange?: (next: MobileSheetState) => void;
  /** Notifica dell'altezza corrente in px (incluso il drag in corso). */
  onHeightChange?: (height: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const [internalState, setInternalState] = useState<MobileSheetState>(defaultState);
  const sheetState = state ?? internalState;
  const setSheetState = useCallback(
    (next: MobileSheetState) => {
      if (state === undefined) setInternalState(next);
      onStateChange?.(next);
    },
    [state, onStateChange],
  );

  // Drag state — `null` quando non in drag. Una ref complementare conserva
  // i valori iniziali del gesto, una `useState` traccia l'altezza live per
  // forzare il re-render.
  const dragOrigin = useRef<{ y: number; h: number } | null>(null);
  const [liveH, setLiveH] = useState<number | null>(null);

  // Misura del container parent (positioned ancestor). useLayoutEffect per
  // evitare un primo paint a 0px.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const parent = sheet.parentElement;
    if (!parent) return;
    const measure = () => setContainerH(parent.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Altezza effettiva renderizzata: liveH durante il drag, altrimenti
  // l'altezza dello stato target.
  const renderH =
    containerH === 0
      ? 0
      : liveH !== null
        ? liveH
        : heightForState(sheetState, containerH);

  // Notifica del valore corrente al parent. Usiamo una ref del callback
  // per non rilanciare l'effect quando il parent ricrea la funzione.
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;
  useEffect(() => {
    onHeightChangeRef.current?.(renderH);
  }, [renderH]);

  // ── Drag handlers ─────────────────────────────────────────────
  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (containerH === 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = {
      y: e.clientY,
      h: heightForState(sheetState, containerH),
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    const dy = e.clientY - origin.y;
    if (liveH === null && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    const minH = PEEK_PX;
    const maxH = Math.round(containerH * 0.95);
    const next = Math.max(minH, Math.min(maxH, origin.h - dy));
    setLiveH(next);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* il pointer potrebbe essere già stato rilasciato */
    }
    if (!origin) return;
    const dragged = liveH !== null;
    setLiveH(null);
    if (!dragged) {
      // Tap sulla grip senza drag: cicla peek → half → full → half → peek
      // (toggle "compatto") per chi non vuole trascinare.
      const next: MobileSheetState =
        sheetState === "peek" ? "half" : sheetState === "half" ? "full" : "half";
      setSheetState(next);
      return;
    }
    setSheetState(snapStateFor(liveH ?? origin.h, containerH));
  };

  const handlePointerCancel = () => {
    dragOrigin.current = null;
    setLiveH(null);
  };

  return (
    <div
      ref={sheetRef}
      style={containerH > 0 ? { height: `${renderH}px` } : undefined}
      data-mobile-sheet-state={sheetState}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-lg border-t border-border-strong bg-surface shadow-float",
        // Animazione height: solo se non stiamo trascinando.
        liveH === null && "transition-[height] duration-[240ms] ease-out",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Trascina per cambiare altezza del pannello"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="flex shrink-0 cursor-grab touch-none justify-center pb-1.5 pt-2 active:cursor-grabbing"
      >
        <span className="h-1 w-9 rounded-pill bg-ink/25" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
