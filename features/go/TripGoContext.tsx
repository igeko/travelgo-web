"use client";

/**
 * TripGoContext — rende Go persistente su tutte le pagine del viaggio.
 *
 * Monta GoChatFloat una volta sola nel layout del trip.
 * Le pagine figlie usano useTripGo() per:
 *  - aprire/chiudere il panel
 *  - aggiornare il tripContext (cambia giorno, cambia sezione)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { GoChatFloat } from "./GoChatFloat";

/* ─────────────────────────────────────────────────────────────────
   Context
───────────────────────────────────────────────────────────────── */

type TripGoContextValue = {
  openGo: () => void;
  closeGo: () => void;
  setTripContext: (ctx: string) => void;
  isOpen: boolean;
  /** true dal primo openGo() in poi — anche quando il panel è minimizzato */
  hasBeenOpened: boolean;
};

const TripGoContext = createContext<TripGoContextValue | null>(null);

export function useTripGo(): TripGoContextValue {
  const ctx = useContext(TripGoContext);
  if (!ctx) throw new Error("useTripGo must be used inside TripGoProvider");
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────────────────── */

export function TripGoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [tripContext, setTripContextState] = useState<string | undefined>(undefined);

  const openGo = useCallback(() => { setOpen(true); setHasBeenOpened(true); }, []);
  const closeGo = useCallback(() => setOpen(false), []);
  const setTripContext = useCallback((ctx: string) => setTripContextState(ctx), []);

  return (
    <TripGoContext.Provider value={{ openGo, closeGo, setTripContext, isOpen: open, hasBeenOpened }}>
      {children}
      <GoChatFloat
        open={open}
        onClose={closeGo}
        tripContext={tripContext}
      />
    </TripGoContext.Provider>
  );
}
