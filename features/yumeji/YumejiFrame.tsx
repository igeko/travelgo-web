"use client";

/**
 * YumejiFrame · infrastruttura "di cornice" del pannello Yumeji (v2).
 *
 * Montato una volta in app/(app)/layout.tsx. Tiene lo stato del pannello
 * (closed/floating/pinned) e lo espone via `useYumejiDrawer()` (null-safe).
 *
 *  - floating · YumejiFrame rende il pannello come overlay flottante sopra tutto.
 *  - pinned   · il pannello NON è reso qui: lo montano le pagine nel proprio
 *               layout (terza colonna day-by-day, colonna affianco alla mappa
 *               Explore) tramite <YumejiPinnedColumn>.
 *
 * Raggiungibile solo in trip-context (toggle = tab nel sub-header + gating sul
 * pathname). Dati ancora mock — il data layer reale è la fase successiva.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { YumejiPanel } from "./YumejiPanel";
import { MOCK_YUME_TOKYO, MOCK_TRIP_CHIPS } from "./mockData";

const LS_PINNED = "travelgo-yumeji-pinned";
const LS_AUTOPINNED = "travelgo-yumeji-autopinned";

export type YumejiState = "closed" | "floating" | "pinned";

type YumejiContextValue = {
  state: YumejiState;
  isOpen: boolean;
  isPinned: boolean;
  toggle: () => void;
  togglePin: () => void;
  close: () => void;
  /** Auto-pin alla prima volta in edit mode dentro un trip (Dec 3). */
  autoPinFirstEdit: () => void;
};

const YumejiContext = createContext<YumejiContextValue | null>(null);

/** Null-safe: ritorna null fuori dal provider. */
export function useYumejiDrawer(): YumejiContextValue | null {
  return useContext(YumejiContext);
}

export function YumejiFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inTrip = /^\/trips\/[^/]+/.test(pathname ?? "");

  const [open, setOpen] = useState(false);
  const [pinnedPref, setPinnedPref] = useLocalStorageState<boolean>(LS_PINNED, false);

  const state: YumejiState = !inTrip || !open ? "closed" : pinnedPref ? "pinned" : "floating";
  const isOpen = state !== "closed";
  const isPinned = state === "pinned";

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const togglePin = useCallback(() => setPinnedPref((p) => !p), [setPinnedPref]);
  const close = useCallback(() => setOpen(false), []);

  const autoPinFirstEdit = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LS_AUTOPINNED)) return;
    window.localStorage.setItem(LS_AUTOPINNED, "1");
    setPinnedPref(true);
    setOpen(true);
  }, [setPinnedPref]);

  // Esc chiude quando aperto.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const ctx: YumejiContextValue = {
    state,
    isOpen,
    isPinned,
    toggle,
    togglePin,
    close,
    autoPinFirstEdit,
  };

  return (
    <YumejiContext.Provider value={ctx}>
      {children}

      {/* Floating · overlay flottante sopra tutto, sotto l'header (Row 1+2 = 94px).
          z alto: la card della mappa Explore è inline a z-index:1000. */}
      {state === "floating" && (
        <div className="hidden md:block fixed top-[102px] right-4 bottom-4 w-[340px] z-[1100]">
          <YumejiPanel
            items={MOCK_YUME_TOKYO}
            chips={MOCK_TRIP_CHIPS}
            floating
            onTogglePin={togglePin}
            onClose={close}
            autoFocusSearch
            className="h-full"
          />
        </div>
      )}
    </YumejiContext.Provider>
  );
}

/**
 * Pannello pinned · da montare nel layout di pagina. Si rende solo quando lo
 * stato è `pinned`; altrimenti null.
 *
 *  - day-by-day → colonna nel grid (floating omesso, niente ombra).
 *  - Explore    → overlay sopra la mappa (floating → ombra), posizionato via
 *    className (absolute) dall'host.
 */
export function YumejiPinnedColumn({
  className,
  floating = false,
}: {
  className?: string;
  floating?: boolean;
}) {
  const yumeji = useYumejiDrawer();
  if (!yumeji?.isPinned) return null;
  // Niente X nella colonna pinned: si chiude dal tab Yume o sganciando (pin).
  return (
    <YumejiPanel
      items={MOCK_YUME_TOKYO}
      chips={MOCK_TRIP_CHIPS}
      pinned
      floating={floating}
      onTogglePin={yumeji.togglePin}
      className={className}
    />
  );
}
