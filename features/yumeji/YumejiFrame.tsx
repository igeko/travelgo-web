"use client";

/**
 * YumejiFrame · infrastruttura "di cornice" del drawer Yumeji.
 *
 * Montato una volta in app/(app)/layout.tsx, sopra tutte le pagine dell'app.
 * Tiene lo stato del drawer (closed/floating/pinned), lo rende come overlay
 * fixed a destra sotto Row 1, e restringe il contenuto quando pinned.
 *
 * Il drawer è raggiungibile solo in trip-context (toggle in Row 2 + gating sul
 * pathname): fuori da un trip l'accesso alla collezione è la pagina /yumeji.
 *
 * Lo stato è esposto via `useYumejiDrawer()` — null-safe: l'hook ritorna null
 * se non c'è provider (AppHeader è usato anche fuori dall'area app).
 *
 * Dati ancora mock (mockData.ts) — il data layer reale è la fase successiva.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { YumejiDrawer, type YumejiDrawerState } from "./YumejiDrawer";
import { MOCK_YUME_TOKYO, type YumeChip } from "./mockData";

const EASE = "cubic-bezier(.2,.7,.2,1)";
const ROW1_H = 52; // altezza di Row 1 dell'AppHeader (px)
const ROW2_H = 42; // altezza di Row 2 (sub-header) dell'AppHeader (px)
// z espliciti alti: la card della mappa Explore è inline a z-index:1000 (sopra
// ogni token z-* semantico, max 60), quindi il drawer deve stare ancora sopra.
const Z_SCRIM = 1090;
const Z_DRAWER = 1100;
const LS_PINNED = "travelgo-yumeji-pinned";
const LS_AUTOPINNED = "travelgo-yumeji-autopinned";

type YumejiContextValue = {
  state: YumejiDrawerState;
  isOpen: boolean;
  isPinned: boolean;
  toggle: () => void;
  /** Auto-pin alla prima volta in edit mode dentro un trip (Dec 3). */
  autoPinFirstEdit: () => void;
};

const YumejiContext = createContext<YumejiContextValue | null>(null);

/** Null-safe: ritorna null fuori dal provider. */
export function useYumejiDrawer(): YumejiContextValue | null {
  return useContext(YumejiContext);
}

// Chip mock per la vista trip-context (il filtraggio reale è parte dati).
const TRIP_CHIPS: YumeChip[] = [
  { id: "geo", label: "Per Tokyo", count: 5, active: true },
  { id: "unscheduled", label: "Da schedulare", count: 5, active: true },
];

export function YumejiFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inTrip = /^\/trips\/[^/]+/.test(pathname ?? "");

  const [open, setOpen] = useState(false);
  const [pinnedPref, setPinnedPref] = useLocalStorageState<boolean>(LS_PINNED, false);

  // Stato effettivo: chiuso fuori dai trip; altrimenti deriva da open + pinnedPref.
  const state: YumejiDrawerState = !inTrip || !open ? "closed" : pinnedPref ? "pinned" : "floating";
  const isOpen = state !== "closed";
  const isPinned = state === "pinned";

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const autoPinFirstEdit = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LS_AUTOPINNED)) return;
    window.localStorage.setItem(LS_AUTOPINNED, "1");
    setPinnedPref(true);
    setOpen(true);
  }, [setPinnedPref]);

  // Richieste di transizione dal drawer (toggle pin / chiusura header / Esc).
  const handleStateChange = useCallback(
    (next: YumejiDrawerState) => {
      if (next === "closed") setOpen(false);
      else if (next === "pinned") {
        setPinnedPref(true);
        setOpen(true);
      } else {
        setPinnedPref(false);
        setOpen(true);
      }
    },
    [setPinnedPref],
  );

  const ctx: YumejiContextValue = { state, isOpen, isPinned, toggle, autoPinFirstEdit };

  return (
    <YumejiContext.Provider value={ctx}>
      {/* Wrapper del contenuto · quando pinned si restringe a destra (il contenuto
          sotto l'header scorre). Row 1 resta full-width grazie al margine negativo
          compensativo applicato all'AppHeader (vedi `yumeji.isPinned` lì). */}
      <div
        className={cn(
          "min-h-screen flex flex-col bg-bg transition-[padding] duration-300",
          isPinned && "md:pr-[340px]",
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        {children}
      </div>

      {/* Scrim · solo floating, sotto il sub-header (Row 2 resta cliccabile), click-fuori chiude */}
      {state === "floating" && (
        <button
          type="button"
          aria-label="Chiudi pannello Yumeji"
          onClick={toggle}
          className="hidden md:block fixed left-0 right-0 bottom-0 border-0 cursor-default"
          style={{ top: ROW1_H + ROW2_H, zIndex: Z_SCRIM, background: "rgba(13,44,61,0.04)" }}
        />
      )}

      {/* Clip container del drawer · sotto Row 1, a destra; overflow nasconde lo slide */}
      <div
        className="hidden md:block fixed right-0 bottom-0 w-[340px] overflow-hidden pointer-events-none"
        style={{ top: ROW1_H, zIndex: Z_DRAWER }}
      >
        <YumejiDrawer
          state={state}
          onStateChange={handleStateChange}
          items={MOCK_YUME_TOKYO}
          chips={TRIP_CHIPS}
        />
      </div>
    </YumejiContext.Provider>
  );
}
