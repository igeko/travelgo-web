"use client";

/**
 * TripGoContext — rende Go persistente su tutte le pagine del viaggio.
 *
 * Monta GoChatFloat una volta sola nel layout del trip.
 * Le pagine figlie usano useTripGo() per:
 *  - aprire/chiudere il panel
 *  - aggiornare il tripContext (cambia giorno, cambia sezione)
 *  - aprire il panel con un messaggio pre-caricato (openGoWith)
 *  - registrare l'editor attivo per ricevere "Applica all'attività"
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { GoChatFloat } from "./GoChatFloat";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

export type GoApplyData = {
  title: string;
  description: string;
};

export type AddToDayPayload = {
  title: string;
  description: string;
  slot: string;
  location?: string;
  locationPlaceId?: string;
  locationLat?: number;
  locationLng?: number;
};

type TripGoContextValue = {
  openGo: () => void;
  /** Apre il panel e invia subito un messaggio (sopprime il greeting). */
  openGoWith: (message: string, activityId?: string) => void;
  closeGo: () => void;
  setTripContext: (ctx: string) => void;
  isOpen: boolean;
  /** true dal primo openGo() in poi — anche quando il panel è minimizzato */
  hasBeenOpened: boolean;
  /**
   * Registra il form attivo: Go mostrerà "Applica all'attività" solo quando
   * l'ID dell'editor corrisponde all'ID passato a openGoWith.
   */
  registerActiveEdit: (id: string, cb: (data: GoApplyData) => void) => void;
  unregisterActiveEdit: () => void;
  /** Registra il handler per "Add to day" dal componente pagina corrente. */
  registerAddToDay: (cb: (payload: AddToDayPayload) => void) => void;
  unregisterAddToDay: () => void;
};

const TripGoContext = createContext<TripGoContextValue | null>(null);

const NOOP_CONTEXT: TripGoContextValue = {
  openGo: () => {},
  openGoWith: () => {},
  closeGo: () => {},
  setTripContext: () => {},
  isOpen: false,
  hasBeenOpened: false,
  registerActiveEdit: () => {},
  unregisterActiveEdit: () => {},
  registerAddToDay: () => {},
  unregisterAddToDay: () => {},
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
  const [open, setOpen]                         = useState(false);
  const [hasBeenOpened, setHasBeenOpened]       = useState(false);
  const [tripContext, setTripContextState]       = useState<string | undefined>(undefined);
  const [pendingMessage, setPendingMessage]      = useState<string | undefined>(undefined);

  /** ID dell'attività per cui è stata aperta la conversazione corrente */
  const [goOpenedForActivityId, setGoOpenedForActivityId] = useState<string | null>(null);
  /** ID dell'editor attualmente aperto + callback per riempire i campi */
  const [activeEditId, setActiveEditId]         = useState<string | null>(null);
  const activeEditCallbackRef                   = useRef<((data: GoApplyData) => void) | null>(null);
  const addToDayCallbackRef                     = useRef<((payload: AddToDayPayload) => void) | null>(null);

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

  const registerActiveEdit = useCallback((id: string, cb: (data: GoApplyData) => void) => {
    setActiveEditId(id);
    activeEditCallbackRef.current = cb;
  }, []);

  const unregisterActiveEdit = useCallback(() => {
    setActiveEditId(null);
    activeEditCallbackRef.current = null;
    // Non resettiamo goOpenedForActivityId — la conversazione resta valida
  }, []);

  /** true solo quando l'editor aperto corrisponde all'attività cercata in Go */
  const activeEditMatch =
    goOpenedForActivityId !== null &&
    activeEditId !== null &&
    goOpenedForActivityId === activeEditId;

  const handleApplyToActivity = useCallback((data: GoApplyData) => {
    activeEditCallbackRef.current?.(data);
  }, []);

  const registerAddToDay = useCallback((cb: (payload: AddToDayPayload) => void) => {
    addToDayCallbackRef.current = cb;
  }, []);

  const unregisterAddToDay = useCallback(() => {
    addToDayCallbackRef.current = null;
  }, []);

  const handleAddToDay = useCallback((payload: AddToDayPayload) => {
    addToDayCallbackRef.current?.(payload);
  }, []);

  return (
    <TripGoContext.Provider value={{
      openGo, openGoWith, closeGo, setTripContext, isOpen: open, hasBeenOpened,
      registerActiveEdit, unregisterActiveEdit,
      registerAddToDay, unregisterAddToDay,
    }}>
      {children}
      <GoChatFloat
        open={open}
        onClose={closeGo}
        tripContext={tripContext}
        pendingMessage={pendingMessage}
        onPendingMessageConsumed={() => setPendingMessage(undefined)}
        activeEditMatch={activeEditMatch}
        onApplyToActivity={handleApplyToActivity}
        onAddToDay={handleAddToDay}
      />
    </TripGoContext.Provider>
  );
}
