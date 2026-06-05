"use client";

/**
 * TripGoContext — rende Go persistente su tutte le pagine del viaggio.
 *
 * Monta GoChatFloat una volta sola nel layout del trip ed espone:
 *  - comandi (host → Go): openGo / openGoWith / closeGo / setTripContext /
 *    setGoPosition / setActiveEdit.
 *  - un event bus (Go → host): emit() interno + subscribe(type, handler) per i
 *    consumer. Vedi features/go/events.ts per il catalogo eventi.
 *
 * Lo stato persistente (marker accumulati, selezione corrente) lo possiede il
 * consumer, derivandolo dagli eventi → sopravvive ai remount.
 */

import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GoChatFloat, type GoChatPosition } from "./GoChatFloat";
import type { GoEvent, GoEventType, GoEventOf, GoPlace } from "./events";

// Re-export per i consumer (i tipi vivono nel catalogo eventi).
export type { GoPlace, AddToDayPayload, GoApplyData, GoEvent, GoEventType } from "./events";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

type Unsubscribe = () => void;

type TripGoContextValue = {
  /* ── Comandi (host → Go) ── */
  openGo: () => void;
  /** Apre il panel e invia subito un messaggio (sopprime il greeting). */
  openGoWith: (message: string, activityId?: string) => void;
  closeGo: () => void;
  setTripContext: (ctx: string) => void;
  /** Imposta l'ancora orizzontale del float ("left" | "center" | "right"). */
  setGoPosition: (position: GoChatPosition) => void;
  /** Larghezza del panel in modalità "wide" (default 650). */
  setGoWideWidth: (px: number) => void;
  /**
   * Dichiara quale editor attività è aperto (o null). Go mostra "Applica
   * all'attività" solo quando combacia con l'attività passata a openGoWith.
   */
  setActiveEdit: (id: string | null) => void;
  /** true quando l'editor aperto corrisponde all'attività cercata in Go. */
  activeEditMatch: boolean;
  /**
   * Posto attualmente messo a fuoco sulla mappa (Mappa → Go). Go lo conosce e
   * scopa le risposte su di esso ("cosa c'è qui?"). null = nessun focus.
   */
  goFocus: GoPlace | null;
  setGoFocus: (place: GoPlace | null) => void;
  isOpen: boolean;
  /** true dal primo openGo() in poi — anche quando il panel è minimizzato */
  hasBeenOpened: boolean;

  /* ── Event bus (Go → host) ── */
  /** Sottoscrive un tipo di evento. Ritorna la funzione di unsubscribe. */
  subscribe: <T extends GoEventType>(type: T, handler: (event: GoEventOf<T>) => void) => Unsubscribe;
};

const TripGoContext = createContext<TripGoContextValue | null>(null);

const NOOP_CONTEXT: TripGoContextValue = {
  openGo: () => {},
  openGoWith: () => {},
  closeGo: () => {},
  setTripContext: () => {},
  setGoPosition: () => {},
  setGoWideWidth: () => {},
  setActiveEdit: () => {},
  activeEditMatch: false,
  goFocus: null,
  setGoFocus: () => {},
  isOpen: false,
  hasBeenOpened: false,
  subscribe: () => () => {},
};

export function useTripGo(): TripGoContextValue {
  const ctx = useContext(TripGoContext);
  // Outside TripGoProvider (e.g. sandbox, tests): return silent no-ops
  return ctx ?? NOOP_CONTEXT;
}

/* ─────────────────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────────────────── */

export function TripGoProvider({ children }: { children: ReactNode }) {
  // Su /explore-next la chat di Go è disabilitata: il contesto resta montato
  // (i consumer come ExploreMap.useTripGo continuano a compilare), ma il
  // GoChatFloat non viene renderizzato.
  const pathname = usePathname();
  const hideFloat = pathname?.includes("/explore-next") ?? false;

  const [open, setOpen]                         = useState(false);
  const [hasBeenOpened, setHasBeenOpened]       = useState(false);
  const [tripContext, setTripContextState]       = useState<string | undefined>(undefined);
  const [pendingMessage, setPendingMessage]      = useState<string | undefined>(undefined);
  const [goPosition, setGoPositionState]         = useState<GoChatPosition>("right");
  const [goWideWidth, setGoWideWidthState]       = useState(650);

  /** ID dell'attività per cui è stata aperta la conversazione corrente */
  const [goOpenedForActivityId, setGoOpenedForActivityId] = useState<string | null>(null);
  /** ID dell'editor attualmente aperto */
  const [activeEditId, setActiveEditId]         = useState<string | null>(null);
  /** Posto messo a fuoco sulla mappa (Mappa → Go) */
  const [goFocus, setGoFocusState]              = useState<GoPlace | null>(null);

  const openGo = useCallback(() => {
    setOpen(true);
    setHasBeenOpened(true);
  }, []);

  const openGoWith = useCallback((message: string, activityId?: string) => {
    setPendingMessage(message);
    setGoOpenedForActivityId(activityId ?? null);
    setOpen(true);
    setHasBeenOpened(true);
  }, []);

  const closeGo = useCallback(() => setOpen(false), []);
  const setTripContext = useCallback((ctx: string) => setTripContextState(ctx), []);
  const setGoPosition = useCallback((position: GoChatPosition) => setGoPositionState(position), []);
  const setGoWideWidth = useCallback((px: number) => setGoWideWidthState(px), []);
  const setActiveEdit = useCallback((id: string | null) => setActiveEditId(id), []);
  const setGoFocus = useCallback((place: GoPlace | null) => setGoFocusState(place), []);

  /** true solo quando l'editor aperto corrisponde all'attività cercata in Go */
  const activeEditMatch =
    goOpenedForActivityId !== null &&
    activeEditId !== null &&
    goOpenedForActivityId === activeEditId;

  /* ── Event bus ── */
  const handlers = useRef<Partial<Record<GoEventType, Set<(e: GoEvent) => void>>>>({});
  // Tipi attualmente sottoscritti — stato reattivo, così il chat può nascondere
  // azioni opzionali (es. "Mostra in mappa") sulle pagine senza consumer.
  const [listeningTypes, setListeningTypes] = useState<Set<GoEventType>>(new Set());

  // refreshListening è deferito a un microtask e bailout-aware:
  // - microtask: il classico pattern di un consumer (effect cleanup → re-subscribe)
  //   chiama subscribe/unsubscribe due volte in sequenza sincrona. Coalescendo
  //   in un'unica setState evitiamo lo stato intermedio "set vuoto" che farebbe
  //   ri-renderizzare il Provider e propagarsi a tutti i consumer (loop infinito
  //   quando una dep dell'effect è instabile a monte, es. callback inline).
  // - bailout: se i tipi non sono cambiati, restituiamo lo stesso Set così
  //   React esce dal re-render via Object.is.
  const refreshScheduled = useRef(false);
  const refreshListening = useCallback(() => {
    if (refreshScheduled.current) return;
    refreshScheduled.current = true;
    queueMicrotask(() => {
      refreshScheduled.current = false;
      setListeningTypes((prev) => {
        const next = new Set<GoEventType>();
        for (const t of Object.keys(handlers.current) as GoEventType[]) {
          if ((handlers.current[t]?.size ?? 0) > 0) next.add(t);
        }
        if (prev.size === next.size) {
          let same = true;
          for (const t of prev) {
            if (!next.has(t)) { same = false; break; }
          }
          if (same) return prev;
        }
        return next;
      });
    });
  }, []);

  const subscribe = useCallback(
    <T extends GoEventType>(type: T, handler: (event: GoEventOf<T>) => void): Unsubscribe => {
      const set = (handlers.current[type] ??= new Set());
      set.add(handler as (e: GoEvent) => void);
      refreshListening();
      return () => {
        handlers.current[type]?.delete(handler as (e: GoEvent) => void);
        refreshListening();
      };
    },
    [refreshListening],
  );

  const emit = useCallback((event: GoEvent) => {
    handlers.current[event.type]?.forEach((h) => h(event));
  }, []);

  const contextValue = useMemo<TripGoContextValue>(
    () => ({
      openGo, openGoWith, closeGo, setTripContext, setGoPosition, setGoWideWidth,
      setActiveEdit, activeEditMatch, goFocus, setGoFocus, isOpen: open, hasBeenOpened,
      subscribe,
    }),
    [
      openGo, openGoWith, closeGo, setTripContext, setGoPosition, setGoWideWidth,
      setActiveEdit, activeEditMatch, goFocus, setGoFocus, open, hasBeenOpened,
      subscribe,
    ],
  );

  return (
    <TripGoContext.Provider value={contextValue}>
      {children}
      {!hideFloat && (
        <GoChatFloat
          open={open}
          onClose={closeGo}
          position={goPosition}
          wideWidth={goWideWidth}
          tripContext={tripContext}
          pendingMessage={pendingMessage}
          onPendingMessageConsumed={() => setPendingMessage(undefined)}
          activeEditMatch={activeEditMatch}
          focus={goFocus}
          onClearFocus={() => setGoFocus(null)}
          onEvent={emit}
          listeningTypes={listeningTypes}
        />
      )}
    </TripGoContext.Provider>
  );
}
