"use client";

/**
 * YumejiFrame · infrastruttura "di cornice" del pannello Yumeji (v2).
 *
 * Montato una volta in app/(app)/layout.tsx. Tiene lo stato del pannello
 * (closed/floating/pinned) e i DATI (collezione yume dell'utente loggato),
 * esposti via `useYumejiDrawer()` (null-safe).
 *
 *  - floating · YumejiFrame rende il pannello come overlay flottante sopra tutto.
 *  - pinned   · il pannello NON è reso qui: lo montano le pagine nel proprio
 *               layout (terza colonna day-by-day / colonna affianco alla mappa
 *               Explore) tramite <YumejiPinnedColumn>, leggendo gli stessi dati.
 *
 * Raggiungibile solo in trip-context (toggle = tab nel sub-header + gating sul
 * pathname). I dati sono la collezione dell'utente (GET /api/yumes) caricata
 * pigramente all'apertura; ricerca server-side + endless scroll. L'auto-filtro
 * per destinazione/trip è una fase successiva.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { api, type Yume } from "@/lib/client";
import { YumejiPanel } from "./YumejiPanel";
import type { YumeScheduleFilter } from "./YumeList";
import { yumeToListItem } from "./toListItem";
import type { YumeListItem } from "./mockData";

const LS_PINNED = "travelgo-yumeji-pinned";
const LS_AUTOPINNED = "travelgo-yumeji-autopinned";
const PAGE = 24;
/** All'apertura il pannello mostra ciò che resta da pianificare nel trip. */
const DEFAULT_FILTER: YumeScheduleFilter = "unscheduled";

export type YumejiState = "closed" | "floating" | "pinned";

/** Dati della collezione, condivisi tra overlay floating e colonna pinned. */
export type YumeCollection = {
  items: YumeListItem[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (q: string) => void;
  /** Filtro schedulazione nel trip corrente (server-side). */
  scheduleFilter: YumeScheduleFilter;
  onScheduleFilterChange: (f: YumeScheduleFilter) => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
};

type YumejiContextValue = {
  state: YumejiState;
  isOpen: boolean;
  isPinned: boolean;
  toggle: () => void;
  togglePin: () => void;
  close: () => void;
  /** Auto-pin alla prima volta in edit mode dentro un trip (Dec 3). */
  autoPinFirstEdit: () => void;
  /**
   * Le sezioni che possono ospitare la colonna pinned si registrano qui (una
   * <YumejiPinnedColumn> nel loro layout). Se nessuna è montata, il pannello
   * aperto ripiega sul floating, così compare comunque in qualsiasi sezione —
   * anche nuove — senza cablaggio. Ritorna la funzione di de-registrazione.
   */
  registerPinnedSlot: () => () => void;
  /** Vero se la sezione corrente ospita la colonna pinned. */
  hasPinnedSlot: boolean;
  /** Collezione yume (caricata all'apertura). */
  data: YumeCollection;
};

const YumejiContext = createContext<YumejiContextValue | null>(null);

/** Null-safe: ritorna null fuori dal provider. */
export function useYumejiDrawer(): YumejiContextValue | null {
  return useContext(YumejiContext);
}

/** Traduce il filtro UI nel parametro `scheduled` dell'API. */
function scheduledParam(f: YumeScheduleFilter): boolean | undefined {
  return f === "all" ? undefined : f === "scheduled";
}

/**
 * Carica e pagina la collezione dell'utente; ricerca + filtro schedulazione
 * server-side. Il filtro "schedulato/da pianificare" è relativo a `tripId`
 * (il viaggio nel cui contesto è aperto il pannello).
 */
function useYumeCollection(active: boolean, tripId: string | undefined): YumeCollection {
  const [raw, setRaw] = useState<Yume[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<YumeScheduleFilter>(DEFAULT_FILTER);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const searchTimer = useRef<number | null>(null);

  const fetchFirst = useCallback(
    async (q: string, f: YumeScheduleFilter, silent: boolean) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const page = await api.yumes.list({
          q: q.trim() || undefined,
          scheduled: scheduledParam(f),
          tripId,
          limit: PAGE,
          offset: 0,
        });
        setRaw(page.items);
        setHasMore(page.hasMore);
        setLoadedOnce(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore nel caricamento");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tripId],
  );

  // Caricamento pigro alla prima apertura del pannello (differito così il
  // setState non avviene sincrono nel corpo dell'effect).
  useEffect(() => {
    if (!active || loadedOnce) return;
    const id = window.setTimeout(() => void fetchFirst("", DEFAULT_FILTER, false), 0);
    return () => window.clearTimeout(id);
  }, [active, loadedOnce, fetchFirst]);

  const onSearchChange = useCallback(
    (q: string) => {
      setSearch(q);
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      searchTimer.current = window.setTimeout(() => void fetchFirst(q, filter, true), 300);
    },
    [fetchFirst, filter],
  );

  // Cambio filtro → ricarica subito dalla prima pagina (no debounce).
  const onScheduleFilterChange = useCallback(
    (f: YumeScheduleFilter) => {
      setFilter(f);
      void fetchFirst(search, f, false);
    },
    [fetchFirst, search],
  );

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await api.yumes.list({
        q: search.trim() || undefined,
        scheduled: scheduledParam(filter),
        tripId,
        limit: PAGE,
        offset: raw.length,
      });
      setRaw((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento");
    } finally {
      setLoadingMore(false);
    }
  }, [search, filter, tripId, raw.length]);

  const items = useMemo(() => raw.map(yumeToListItem), [raw]);

  return {
    items,
    loading,
    error,
    search,
    onSearchChange,
    scheduleFilter: filter,
    onScheduleFilterChange,
    hasMore,
    loadingMore,
    loadMore,
  };
}

export function YumejiFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tripId = pathname?.match(/^\/trips\/([^/]+)/)?.[1];
  const inTrip = !!tripId;

  const [open, setOpen] = useState(false);
  const [pinnedPref, setPinnedPref] = useLocalStorageState<boolean>(LS_PINNED, false);

  // Quante colonne pinned sono montate dalla sezione corrente (0 → nessuna).
  const [pinnedSlots, setPinnedSlots] = useState(0);
  const registerPinnedSlot = useCallback(() => {
    setPinnedSlots((n) => n + 1);
    return () => setPinnedSlots((n) => Math.max(0, n - 1));
  }, []);
  const hasPinnedSlot = pinnedSlots > 0;

  const state: YumejiState = !inTrip || !open ? "closed" : pinnedPref ? "pinned" : "floating";
  const isOpen = state !== "closed";
  // È "pinned" solo se la sezione corrente ha davvero una colonna che lo ospita.
  const isPinned = state === "pinned" && hasPinnedSlot;
  // Floating quando esplicito, oppure come fallback se il pin non ha una colonna
  // dove ancorarsi (sezione senza slot → il pannello compare comunque).
  const showFloating = isOpen && (state === "floating" || !hasPinnedSlot);

  const data = useYumeCollection(isOpen, tripId);

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
    registerPinnedSlot,
    hasPinnedSlot,
    data,
  };

  return (
    <YumejiContext.Provider value={ctx}>
      {children}

      {/* Floating · overlay flottante sopra tutto, sotto l'header (Row 1+2 = 94px).
          z alto: la card della mappa Explore è inline a z-index:1000.
          Mostrato anche come fallback quando il pin non ha una colonna. */}
      {showFloating && (
        <div className="hidden md:block fixed top-[102px] right-4 bottom-4 w-[340px] z-[1100]">
          <YumejiPanel
            items={data.items}
            loading={data.loading}
            searchValue={data.search}
            onSearchChange={data.onSearchChange}
            scheduleFilter={data.scheduleFilter}
            onScheduleFilterChange={data.onScheduleFilterChange}
            hasMore={data.hasMore}
            loadingMore={data.loadingMore}
            onLoadMore={data.loadMore}
            floating
            showOwner
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
 * stato è `pinned`; usa gli stessi dati del context.
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

  // Registra questa sezione come "ospita la colonna pinned" finché è montata,
  // a prescindere dallo stato pinned/floating: così YumejiFrame sa che qui il
  // pin ha dove ancorarsi (e altrove ripiega sul floating). L'effect gira anche
  // quando il componente rende null, perché resta montato nell'albero.
  const register = yumeji?.registerPinnedSlot;
  useEffect(() => register?.(), [register]);

  if (!yumeji?.isPinned) return null;
  const { data } = yumeji;
  // Niente X nella colonna pinned: si chiude dal tab Yume o sganciando (pin).
  return (
    <YumejiPanel
      items={data.items}
      loading={data.loading}
      searchValue={data.search}
      onSearchChange={data.onSearchChange}
      scheduleFilter={data.scheduleFilter}
      onScheduleFilterChange={data.onScheduleFilterChange}
      hasMore={data.hasMore}
      loadingMore={data.loadingMore}
      onLoadMore={data.loadMore}
      pinned
      floating={floating}
      showOwner
      onTogglePin={yumeji.togglePin}
      className={className}
    />
  );
}
