"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Map, type LatLng, type MapHandle, type MapMarker, type RouteSpec } from "@/components/ui/Map";
import { useTripGo, type GoPlace } from "@/features/go/TripGoContext";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { YumejiPinnedColumn, useYumejiDrawer } from "@/features/yumeji/YumejiFrame";
import { cn } from "@/lib/cn";
import { PlaceHoverCard, type SavedPlaceInfo } from "@/features/explore/PlaceHoverCard";
import { AddedPill } from "@/features/explore/AddedPill";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import { EXPLORE_CATEGORY_TREE, EXPLORE_SUB_TO_ICON_KEY } from "@/features/explore/categories";
import {
  iconGlyph,
  NIGHT,
  type GlyphCmp,
  type CategoryPinKind,
} from "@/components/ui/mapPins";
import { IconBed, IconMapPin, IconRoute } from "@/components/ui/icons";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";
import type { AreaPlace } from "@/app/api/places/area-search/route";

/**
 * Payload that the CTA "Add to trip" forwards upward. The shell — not the
 * map — owns the network call, optimistic state and feedback pill, so the
 * map just describes WHAT to add and where it came from (categories).
 */
export type AddToTripRequest = {
  placeId: string | null;
  title: string;
  lat: number;
  lng: number;
  categories?: string[];
  /** STOP_ICONS key da salvare su `activities.icon` (es. "coffee", "museum").
   *  Valorizzato quando il pin proviene da una sub-category ExploreToolbar. */
  icon?: string;
  /** Quando true, la scheduled activity viene creata senza orario
   *  (`fuzzy: true`). Sceltabile dalla voce "Flessibile" dello split
   *  button "Aggiungi al viaggio" in PlaceHoverCard. */
  fuzzy?: boolean;
  /** Quando true, il place viene aggiunto come pernottamento (lo slot e
   *  l'orario di default vengono fissati dall'algoritmo add-to-trip).
   *  Sceltabile dalla voce "Pernottamento" dello split button. */
  isAccommodation?: boolean;
};

/** Default activity/day image — used by night cards when the stop has none. */
const DEFAULT_ACTIVITY_IMAGE = "/media/day-default-banner.png";

/** Grace period before clearing the focus, so switching cards doesn't flicker. */
const FOCUS_CLEAR_DELAY = 450;

/** Dwell before a category selection fires its area search. */
const SEARCH_DEBOUNCE = 500;

/** sub-category id → Google Text Search term + icon component. */
const SUB_GOOGLE: Record<string, string> = {};
const SUB_ICON: Record<string, GlyphCmp> = {};
/** sub-category id → macro id (dormi / mangia / esplora). */
const SUB_MACRO: Record<string, string> = {};
for (const macro of EXPLORE_CATEGORY_TREE) {
  for (const sub of macro.subs) {
    SUB_GOOGLE[sub.id] = sub.google;
    SUB_ICON[sub.id] = sub.icon;
    SUB_MACRO[sub.id] = macro.id;
  }
}

/** Map a macro id to the pin colour kind per /design/category-pins. The
 *  GLYPH on the pin comes from the sub-category (sub.icon), so the user
 *  reads the specific kind of place at a glance — colour = macro, icon =
 *  sub. Defaults to "explore" when the macro is unknown. */
const MACRO_KIND: Record<string, CategoryPinKind> = {
  mangia:  "eat",
  dormi:   "sleep",
  esplora: "explore",
};
function pinForSub(subId: string): { kind: CategoryPinKind; glyph: string } {
  const kind = MACRO_KIND[SUB_MACRO[subId]] ?? "explore";
  const SubIcon = SUB_ICON[subId];
  const glyph = SubIcon ? iconGlyph(`cat-sub:${subId}`, SubIcon) : "";
  return { kind, glyph };
}

/** Marker key for a place — placeId when known, else its coordinates. */
const keyOfPlace = (p: GoPlace) => p.placeId ?? `${p.lat},${p.lng}`;

/** Reconstruct a GoPlace from a clicked marker (id is its key). */
function placeFromMarker(m: MapMarker, id: string, fallbackTitle: string): GoPlace {
  const coordsKey = `${m.lat},${m.lng}`;
  return { title: m.title ?? fallbackTitle, lat: m.lat, lng: m.lng, placeId: id === coordsKey ? undefined : id };
}

/**
 * Fullpage Explore map. Bidirectional Go integration + category toolbar:
 *  - Go → map: places.found → markers; place.opened/closed → focus.
 *  - map → Go: clicking a pin (incl. category results) or dropping one sets the
 *    Go "focus" and opens Go, so the user can ask about it.
 *  - toolbar → map: selecting a category runs a Google search within the visible
 *    area (debounced) and drops the result pins.
 */
export const ExploreMap = forwardRef<MapHandle, {
  tripId: string;
  center: LatLng;
  zoom: number;
  nightRoute: NightWaypoint[];
  /** Static pins injected by the host (e.g. all trip activities). Rendered as a
   *  base layer — Go/category/night pins win on a key collision. */
  extraMarkers?: MapMarker[];
  /** Id pin da evidenziare come hovered (proveniente dalla Timeline). Si
   *  comporta come il mouseover sul pin: scala 1.25× per i roadmap. */
  hoveredPinId?: string | null;
  /**
   * Pixel offset of the visible viewport relative to the map container — set it
   * when an overlapping panel (e.g. a left-side timeline) covers part of the
   * map. Propagated to the underlying `Map` so the category area-search stays
   * centred on the visible area.
   */
  viewportInset?: { left?: number; right?: number; top?: number; bottom?: number };
  /**
   * Fired when a host-provided `extraMarkers` pin is released after a drag.
   * Only fires for `extraMarkers` ids — search/goFocus/Go/category pins are
   * owned and updated by ExploreMap itself. The host must fold the new latlng
   * into its own state, otherwise the marker snaps back on the next reconcile.
   */
  onExtraMarkerDragEnd?: (id: string, latlng: LatLng) => void;
  /**
   * Fired when the user hits "Add to trip" on a PlaceHoverCard. The host
   * owns the network call, optimistic state, selection context (day /
   * activity) and the feedback pill. ExploreMap closes the card locally
   * before this fires, so the host can proceed without worrying about
   * double-fires.
   */
  onAddToTripRequest?: (request: AddToTripRequest) => void;
  /**
   * Mostra l'overlay "Percorso notti" (toggle in basso a destra + pin
   * notte + polyline). Default true per la Explore legacy; Explore Next
   * la passa `false` perché la Timeline a sinistra copre già la stessa
   * informazione (alloggi giorno-per-giorno) rendendola ridondante.
   */
  enableNightRoute?: boolean;
  /**
   * RouteSpec aggiuntive iniettate dal host — es. il percorso tra le
   * tappe di un giorno (Explore Next). Vengono mergiate con la route
   * interna del night-route (quando abilitata) e passate alla `Map`
   * come un singolo array. Default `[]`.
   */
  extraRoutes?: RouteSpec[];
  /**
   * Forwardato a `Map`: una sola fit-to-all della camera al primo
   * render con contenuto disponibile, niente refit successivi. Default
   * `false`. Vedi `Map.fitAllOnMount` per le note complete.
   */
  fitAllOnMount?: boolean;
  /**
   * Id della tappa dell'itinerario attualmente selezionata dal host
   * (es. ExploreNextShell tiene la sync col row aperto in Timeline).
   * Quando questo id matcha un `extraMarkers.id`, il pin riceve lo
   * stato selected (bordo bianco + scala hover). Vince sui pin Google /
   * search / night per il `selectedMarkerId` finale.
   */
  selectedItineraryId?: string | null;
  /**
   * Fired quando l'utente clicca un pin appartenente a `extraMarkers`
   * (cioè dell'itinerario). L'host può sincronizzare la Timeline. Per i
   * pin Google / search / night usa i propri canali esistenti — questa
   * callback NON spara per quelli.
   */
  onItineraryPinClick?: (id: string) => void;
  /**
   * Hover su un pin dell'itinerario. Emette l'id su mouseover e `null`
   * su mouseout. L'host (Explore Timeline) lo usa per evidenziare la row
   * corrispondente in lista senza aprirla. Filtrato agli `extraMarkers`
   * — pin Google / search / night non lo triggerano.
   */
  onItineraryPinHover?: (id: string | null) => void;
}>(({
  tripId,
  center: tripCenter,
  zoom: tripZoom,
  nightRoute,
  extraMarkers = [],
  hoveredPinId = null,
  viewportInset,
  onExtraMarkerDragEnd,
  onAddToTripRequest,
  enableNightRoute = true,
  extraRoutes = [],
  fitAllOnMount = false,
  selectedItineraryId = null,
  onItineraryPinClick,
  onItineraryPinHover,
}, ref) => {
  const { subscribe, openGo, goFocus, setGoFocus } = useTripGo();
  const t = useTranslations("Explore");
  const categories = useExploreCategories();
  const [pinnedSubIds, setPinnedSubIds] = useLocalStorageState<string[]>(
    `travelgo-explore-pins-${tripId}`,
    [],
  );
  const [showNightRoute, setShowNightRoute] = useLocalStorageState<boolean>(
    `travelgo-explore-nightroute-${tripId}`,
    false,
  );
  // Selected night pin (by coords key) — drives the saved-info card, kept apart
  // from `goFocus` so it never triggers the Google PlaceHoverCard.
  const [nightSelId, setNightSelId] = useState<string | null>(null);
  // Single search-result pin (toolbar autocomplete → enriched fetch). Stays
  // separate from `goFocus` so picking a search hit does NOT open the Go panel —
  // a search is a passive lookup, not a conversation kick-off. The full
  // `PlaceEnriched` object is kept here so the hover card can render via
  // `initialPlace` (no second Google round-trip).
  const [searchPlace, setSearchPlace] = useState<PlaceEnriched | null>(null);

  const [goMarkers, setGoMarkers] = useState<MapMarker[]>([]);
  const [categoryMarkers, setCategoryMarkers] = useState<MapMarker[]>([]);
  // markerId (placeId) → sub-category id, popolata insieme ai categoryMarkers.
  // Serve a propagare l'icona della sub al payload "Add to trip" quando l'utente
  // pinna un risultato di categoria. Plain object perché `Map` è ombreggiato
  // dall'import del componente <Map/> in questo file.
  const categorySubByMarkerId = useRef<Record<string, string>>({});
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  // "Search <category> near here" action bubble — appears when the user
  // clicks an empty patch of the map with a category selected. Cleared on
  // execute, on category deselection, or on a second empty-map click.
  const [nearHerePrompt, setNearHerePrompt] = useState<{ lat: number; lng: number } | null>(null);
  // Sub-category id currently in-flight (auto-search after a toolbar click,
  // or explicit near-here search). Drives the "Cerco …" feedback pill so
  // the user sees something happen between click and results arriving.
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng>(tripCenter);
  // Zoom è "set-once": l'inizializzazione viene dal trip, poi resta interamente
  // in mano all'utente (auto-zoom disabilitato — vedi note più sotto). Niente
  // setter — se servirà un cambio di zoom programmatico useremo l'imperativo
  // di Map (`mapHandle.fitAll` / `focusCoord`) dietro un trigger esplicito.
  const [zoom] = useState<number>(tripZoom);
  const [isMobile, setIsMobile] = useState(false);
  const yumejiPinned = !!useYumejiDrawer()?.isPinned;

  const interactedRef = useRef(false);
  const goFocusRef = useRef(goFocus);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<{ center: LatLng; radiusMeters: number } | null>(null);
  goFocusRef.current = goFocus;
  // Mapping degli id dei marker extra (itinerario) per il forwarding click.
  // Set di stringhe ricavato da `extraMarkers` — sincronizzato sotto.
  const extraMarkerIdsRef = useRef<Set<string>>(new Set());
  extraMarkerIdsRef.current = useMemo(
    () => new Set(extraMarkers.map((m) => m.id ?? `${m.lat},${m.lng}`)),
    [extraMarkers],
  );

  // Ref locale sull'imperative handle del Map sottostante — usato sia per il
  // forwarding (useImperativeHandle qui sotto) sia per chiamate locali
  // (fitBounds sui risultati della category-search).
  const mapRef = useRef<MapHandle | null>(null);

  // Esporta gli imperativi del Map sottostante
  // attraverso ExploreMap come proxy → l'host (ExploreNextShell) può chiamare
  // panToMarker / fitMarkers / fitAll senza accoppiarsi al Map direttamente.
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current?.getMap() ?? null,
    fitBounds: (b, p) => mapRef.current?.fitBounds(b, p),
    focusCoord: (lat, lng, opts) => mapRef.current?.focusCoord(lat, lng, opts),
    clearAdHoc: () => mapRef.current?.clearAdHoc(),
    hasAdHocFocus: () => mapRef.current?.hasAdHocFocus() ?? false,
    fitAll: (opts) => mapRef.current?.fitAll(opts),
    panToMarker: (id) => mapRef.current?.panToMarker(id),
    fitMarkers: (ids, opts) => mapRef.current?.fitMarkers(ids, opts),
  }), []);

  // Night-route pins as regular markers with the dedicated "night" variant: this
  // gives them the SAME behaviour as every other pin (click → detail card, focus
  // sent to Go, selection halo). The only difference is they can't be deleted —
  // they're sourced from trip data, so re-clicking just deselects (see below),
  // never removes the pin. The connecting polyline is added via `routes`.
  const nightMarkers = useMemo<MapMarker[]>(() => {
    if (!enableNightRoute || !showNightRoute || nightRoute.length === 0) return [];
    return nightRoute.map((w) => {
      let glyph: string;
      if (w.kind === "lastActivity") {
        const Cmp = w.iconKey ? getStopIcon(w.iconKey) : null;
        glyph = Cmp ? iconGlyph(`stop:${w.iconKey}`, Cmp) : iconGlyph("night:pin", IconMapPin);
      } else {
        glyph = iconGlyph("night:bed", IconBed);
      }
      return {
        id: `${w.lat},${w.lng}`,
        lat: w.lat,
        lng: w.lng,
        title: w.title,
        glyph,
        variant: "night" as const,
      };
    });
  }, [enableNightRoute, showNightRoute, nightRoute]);

  // Coords-key → waypoint, so a clicked night pin resolves to its saved data.
  // (Record, not a JS Map — the `Map` name is the imported component here.)
  const nightById = useMemo(() => {
    const byKey: Record<string, NightWaypoint> = {};
    if (enableNightRoute && showNightRoute) for (const w of nightRoute) byKey[`${w.lat},${w.lng}`] = w;
    return byKey;
  }, [enableNightRoute, showNightRoute, nightRoute]);
  // Build the shared place card's "saved" payload from a night waypoint.
  const nightSavedFor = (nw: NightWaypoint): SavedPlaceInfo => ({
    name: nw.title,
    image: nw.image ?? DEFAULT_ACTIVITY_IMAGE,
    description: nw.description,
    address: nw.address,
    time: nw.time,
    dayLabel:
      nw.dayNumbers.length > 1
        ? t("days", { from: nw.dayNumbers[0], to: nw.dayNumbers[nw.dayNumbers.length - 1] })
        : t("day", { n: nw.dayNumbers[0] }),
    typeLabel: nw.accommodationType,
    url: nw.url,
  });

  // Routes disegnate sulla mappa = night-route (quando abilitata + on) +
  // qualsiasi `extraRoutes` iniettata dall'host (es. il percorso fra le
  // tappe di un giorno in Explore Next). Auto-fit disabilitato per tutte:
  // lo zoom resta deciso dall'utente; reintrodurremo un fit-to-route
  // esplicito (es. bottone "centra percorso") quando deciderete dove.
  const routes = useMemo<RouteSpec[]>(() => {
    const out: RouteSpec[] = [];
    if (enableNightRoute && showNightRoute && nightRoute.length >= 2) {
      out.push({
        id: "night",
        travelMode: "DRIVING",
        points: nightRoute.map((w) => ({ lat: w.lat, lng: w.lng })),
        style: { color: NIGHT, weight: 4, opacity: 0.9 },
      });
    }
    out.push(...extraRoutes);
    return out;
  }, [enableNightRoute, showNightRoute, nightRoute, extraRoutes]);

  // Search-result pin — a bare ad-hoc pin keyed by the Google placeId. Sits in
  // the topmost layer so it visually wins over any other pin at the same point.
  // Draggable: the user can reposition the search hit anywhere on the map.
  const searchMarker = useMemo<MapMarker | null>(() => {
    if (!searchPlace) return null;
    return {
      id: searchPlace.placeId,
      lat: searchPlace.lat,
      lng: searchPlace.lng,
      title: searchPlace.name,
      draggable: true,
    };
  }, [searchPlace]);

  // Markers shown on the map = the focus pin (derived from goFocus — a single,
  // self-replacing "manual" pin when it's an ad-hoc click) + Go markers +
  // category results + night-route pins + the single search-result pin.
  // Later layers win on dup, so a focused place shows its real marker
  // (icon/glyph) instead of the bare focus pin.
  //
  // Drag policy: every pin ExploreMap owns is draggable (search, goFocus, Go
  // suggestions, category results). Night-route pins stay fixed — they're
  // derived from immutable trip data and would rubber-band on the next
  // reconcile. `extraMarkers` respect the host's own `draggable` field.
  const allMarkers = useMemo(() => {
    const byKey: Record<string, MapMarker> = {};
    for (const m of extraMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = m;
    if (goFocus) {
      const k = keyOfPlace(goFocus);
      byKey[k] = { id: k, lat: goFocus.lat, lng: goFocus.lng, title: goFocus.title, draggable: true };
    }
    for (const m of goMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = { ...m, draggable: true };
    for (const m of categoryMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = { ...m, draggable: true };
    for (const m of nightMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = m;
    if (searchMarker) byKey[searchMarker.id ?? `${searchMarker.lat},${searchMarker.lng}`] = searchMarker;
    return Object.values(byKey);
  }, [extraMarkers, goFocus, goMarkers, categoryMarkers, nightMarkers, searchMarker]);

  useEffect(() => {
    // Soglia: stessa del layout side-by-side in ExploreNextShell (lg=1024).
    // Sotto lg il MobileSheet è attivo e la mappa è full-bleed → la toolbar
    // sta in HORIZONTAL in alto; da lg in su la toolbar verticale a destra.
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsMobile(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Go events → map.
  useEffect(() => {
    const unsubFound = subscribe("places.found", ({ places }) => {
      setGoMarkers((prev) => {
        const byKey: Record<string, MapMarker> = {};
        for (const m of prev) byKey[m.id ?? `${m.lat},${m.lng}`] = m;
        for (const p of places) {
          const key = p.placeId ?? `${p.lat},${p.lng}`;
          byKey[key] = { id: key, lat: p.lat, lng: p.lng, title: p.title };
        }
        return Object.values(byKey);
      });
    });
    const unsubOpened = subscribe("place.opened", ({ place }) => {
      if (clearTimer.current) { clearTimeout(clearTimer.current); clearTimer.current = null; }
      setGoFocus(place);
    });
    const unsubClosed = subscribe("place.closed", ({ placeId }) => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        clearTimer.current = null;
        const f = goFocusRef.current;
        if (f && keyOfPlace(f) === placeId) setGoFocus(null);
      }, FOCUS_CLEAR_DELAY);
    });
    return () => {
      unsubFound(); unsubOpened(); unsubClosed();
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [subscribe, setGoFocus]);

  // Toolbar → Google area search (debounced). Selecting a category searches the
  // visible viewport; deselecting clears the result pins.
  //
  // Fallback: se l'utente seleziona una categoria prima che il primo `idle`
  // event di Google Maps abbia popolato `viewportRef`, usiamo il centro
  // corrente + 5 km come riserva — meglio cercare in un'area approssimata
  // che restare senza alcun feedback.
  useEffect(() => {
    const subId = selectedSubIds[0];
    if (!subId) {
      setCategoryMarkers([]);
      categorySubByMarkerId.current = {};
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const term = SUB_GOOGLE[subId];
      if (!term) return;
      const vp = viewportRef.current ?? { center, radiusMeters: 5000 };
      const pin = pinForSub(subId);
      setSearchingFor(subId);
      try {
        const places = await api.places.areaSearch<AreaPlace>(
          term, vp.center.lat, vp.center.lng, vp.radiusMeters,
        );
        // Category area-search can return many dense pins → cluster them.
        // Go and night layers stay regular (low cardinality, semantic).
        const nextMarkers = places.map((p) => ({
          id: p.placeId, lat: p.lat, lng: p.lng, title: p.name,
          glyph: pin.glyph,
          categoryKind: pin.kind,
          clustered: true,
        }));
        const subMap: Record<string, string> = {};
        for (const p of places) subMap[p.placeId] = subId;
        categorySubByMarkerId.current = subMap;
        setCategoryMarkers(nextMarkers);
      } catch (err) {
        console.error("[ExploreMap] category area-search failed:", err);
      } finally {
        setSearchingFor(null);
      }
    }, SEARCH_DEBOUNCE);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    // `center` letto on-fire dal setTimeout; non vogliamo che un pan rilanci
    // la search, quindi resta fuori dalle deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubIds]);

  // Quando arrivano i risultati di categoria, fitBounds sui pin così l'utente
  // li vede tutti in un colpo. maxZoom limita lo zoom-in eccessivo quando i
  // risultati sono concentrati in pochi metri. Non scattiamo nulla se l'array
  // è vuoto (es. la categoria è stata deselezionata) o se il viewport
  // contiene un solo pin (lo `fitBounds` su 1 punto azzera lo zoom).
  useEffect(() => {
    if (categoryMarkers.length === 0) return;
    const handle = mapRef.current;
    if (!handle) return;
    const bounds = new google.maps.LatLngBounds();
    for (const m of categoryMarkers) bounds.extend({ lat: m.lat, lng: m.lng });
    handle.fitBounds(bounds, 80);
    // Cap dopo l'idle: evitiamo di chiudere lo zoom troppo da vicino quando
    // i risultati sono molto vicini tra loro.
    const map = handle.getMap();
    if (map) {
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z != null && z > 16) map.setZoom(16);
      });
    }
  }, [categoryMarkers]);

  // Focus changed → pan to it. La mappa NON ricorda più l'ultimo pin
  // attivo tra una sessione e l'altra: all'apertura non c'è alcun pin
  // pre-selezionato. La selezione esiste solo a seguito di una vera
  // interazione (click su un marker, search hit, drop di un pin).
  useEffect(() => {
    if (!goFocus) return;
    setCenter({ lat: goFocus.lat, lng: goFocus.lng });
  }, [goFocus]);

  // Map → Go: drop a pin on empty map → focus + open Go. We don't reverse-geocode
  // (Maps key not authorized for Geocoding), so the label is coordinate-based.
  //
  // Special case: if a category is selected in the toolbar, the click does NOT
  // open Go — it primes the "Search <category> near here" action bubble at the
  // click point. The user has to confirm by clicking the bubble; clicking again
  // on the map dismisses it and resumes the Go path on the next click.
  const handleMapClick = (latlng: LatLng) => {
    interactedRef.current = true;
    setNightSelId(null);
    setSearchPlace(null);

    if (selectedSubIds.length > 0) {
      // Toggle: a second empty-map click dismisses an existing prompt.
      if (nearHerePrompt) {
        setNearHerePrompt(null);
        return;
      }
      setNearHerePrompt({ lat: latlng.lat, lng: latlng.lng });
      return;
    }

    const coords = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    setGoFocus({ title: t("pointLabel", { coords }), lat: latlng.lat, lng: latlng.lng });
    openGo();
  };

  // Clear the bubble whenever the category selection changes (deselect or pick
  // a different category) — its label would be stale otherwise. Pattern:
  // "adjusting state when props change" — compare against the previous render
  // and reset in-render, avoiding a cascading effect.
  const [lastSelectedSubIds, setLastSelectedSubIds] = useState(selectedSubIds);
  if (selectedSubIds !== lastSelectedSubIds) {
    setLastSelectedSubIds(selectedSubIds);
    if (nearHerePrompt !== null) setNearHerePrompt(null);
  }

  // Escape dismisses the action card. Listener only active while the card
  // is up, so we don't interfere with other shortcuts.
  useEffect(() => {
    if (!nearHerePrompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNearHerePrompt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearHerePrompt]);

  // Execute the area search centred on the bubble's anchor and dismiss it.
  // Mirrors the auto-search effect but with an explicit origin instead of the
  // current viewport centre.
  const runNearHereSearch = async () => {
    const sel = selectedSubIds[0];
    const pt = nearHerePrompt;
    if (!sel || !pt) return;
    const term = SUB_GOOGLE[sel];
    if (!term) return;
    const pin = pinForSub(sel);
    const radius = viewportRef.current?.radiusMeters ?? 5000;
    setNearHerePrompt(null);
    setSearchingFor(sel);
    try {
      const places = await api.places.areaSearch<AreaPlace>(term, pt.lat, pt.lng, radius);
      setCategoryMarkers(places.map((p) => ({
        id: p.placeId, lat: p.lat, lng: p.lng, title: p.name,
        glyph: pin.glyph,
        categoryKind: pin.kind,
        clustered: true,
      })));
    } catch (err) {
      console.error("[ExploreMap] near-here search failed:", err);
    } finally {
      setSearchingFor(null);
    }
  };

  // Map → Go: click a Google POI → focus that real place (no ad-hoc pin).
  const handlePoiClick = (placeId: string, latlng: LatLng) => {
    interactedRef.current = true;
    setNightSelId(null);
    setSearchPlace(null);
    const fallback = t("placeFallback");
    // Focus immediately at the click point; refine the label with the place name.
    setGoFocus({ title: fallback, lat: latlng.lat, lng: latlng.lng, placeId });
    openGo();
    api.places
      .details<{ name?: string; lat?: number; lng?: number }>(placeId)
      .then((p) => {
        if (p) setGoFocus({ title: p.name || fallback, lat: p.lat ?? latlng.lat, lng: p.lng ?? latlng.lng, placeId });
      })
      .catch(() => { /* keep the optimistic focus */ });
  };

  // Drag&drop: when the user releases a pin at a new position, fold the latlng
  // into the layer that owns the marker. We check layers in the SAME priority
  // order as `allMarkers` (later layers override earlier on key collisions),
  // so a search-pin id at the same key always resolves to `searchPlace`. Night
  // pins aren't draggable; `extraMarkers` are forwarded to the host.
  const handleMarkerDragEnd = (id: string, latlng: LatLng) => {
    interactedRef.current = true;
    if (searchPlace && id === searchPlace.placeId) {
      setSearchPlace({ ...searchPlace, lat: latlng.lat, lng: latlng.lng });
      return;
    }
    if (goFocus && keyOfPlace(goFocus) === id) {
      setGoFocus({ ...goFocus, lat: latlng.lat, lng: latlng.lng });
      return;
    }
    const inCategory = categoryMarkers.some((m) => (m.id ?? `${m.lat},${m.lng}`) === id);
    if (inCategory) {
      setCategoryMarkers((prev) =>
        prev.map((m) =>
          (m.id ?? `${m.lat},${m.lng}`) === id ? { ...m, lat: latlng.lat, lng: latlng.lng } : m,
        ),
      );
      return;
    }
    const inGo = goMarkers.some((m) => (m.id ?? `${m.lat},${m.lng}`) === id);
    if (inGo) {
      setGoMarkers((prev) =>
        prev.map((m) =>
          (m.id ?? `${m.lat},${m.lng}`) === id ? { ...m, lat: latlng.lat, lng: latlng.lng } : m,
        ),
      );
      return;
    }
    // Not a layer ExploreMap owns → must be a host `extraMarkers` pin.
    onExtraMarkerDragEnd?.(id, latlng);
  };

  // Map → Go: click an existing pin (incl. category result) → focus + open Go.
  // Re-clicking the manual (ad-hoc) pin removes it; normal pins are never deleted.
  const handleMarkerClick = (id: string) => {
    interactedRef.current = true;
    // Itinerario: se l'id appartiene a `extraMarkers` lo segnaliamo subito al
    // host e usciamo. Niente goFocus, niente card Google — la sync con la
    // Timeline è la sola conseguenza dell'interazione. Per riselezione (re-
    // click sullo stesso) ci pensa l'host (toggle off settando null).
    //
    // Spegniamo i tre canali "selected standard" (search hit, night pin,
    // Go focus / manual pin): nella precedenza più sotto vincono su
    // `selectedItineraryId`, quindi se uno di loro è attivo cliccare uno
    // stop pin non lo evidenziava. Reset locale → l'itinerary id resta
    // l'unico canale in gioco e il pin diventa effettivamente selezionato.
    if (extraMarkerIdsRef.current.has(id)) {
      setSearchPlace(null);
      setNightSelId(null);
      setGoFocus(null);
      onItineraryPinClick?.(id);
      return;
    }
    // Search-result pin (toolbar autocomplete): toggle off on re-click, never
    // opens Go — a search hit is a passive lookup, the hover card carries the
    // info and the only side-effect is "Add to trip" once the user opts in.
    if (searchPlace && id === searchPlace.placeId) {
      setSearchPlace(null);
      return;
    }
    // Night-route pin: show its saved-info card (no Google lookup) and send the
    // place to Go, like every other pin. Toggle on re-click — never deletes, the
    // pin is sourced from trip data.
    const nightWp = nightById[id];
    if (nightWp) {
      if (nightSelId === id) { setNightSelId(null); setGoFocus(null); return; }
      setNightSelId(id);
      // No placeId → Go gets the place context but the card stays saved-mode.
      setGoFocus({ title: nightWp.title, lat: nightWp.lat, lng: nightWp.lng });
      openGo();
      return;
    }
    setNightSelId(null);
    setSearchPlace(null);
    const inGo = goMarkers.some((m) => (m.id ?? `${m.lat},${m.lng}`) === id);
    const inCategory = categoryMarkers.some((m) => (m.id ?? `${m.lat},${m.lng}`) === id);
    const isManualPin = goFocus != null && keyOfPlace(goFocus) === id && !inGo && !inCategory;
    if (isManualPin) { setGoFocus(null); return; }
    const m = allMarkers.find((mk) => mk.id === id);
    if (!m) return;
    setGoFocus(placeFromMarker(m, id, t("placeFallback")));
    openGo();
  };

  // Hover filtrato agli itinerary pin: il Map spara su ogni mouseover/out,
  // ma solo gli `extraMarkers` interessano l'host (la Timeline a sinistra).
  // Su out (`id === null`) propaghiamo sempre per chiudere l'highlight, anche
  // se l'hover-in precedente era su un pin non-itinerario (l'host valuta il
  // proprio stato e ignora il `null` se non aveva un hover attivo).
  const handleMarkerHover = (id: string | null) => {
    if (id !== null && !extraMarkerIdsRef.current.has(id)) return;
    onItineraryPinHover?.(id);
  };

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        center={center}
        zoom={zoom}
        zoomControlPosition="RIGHT_BOTTOM"
        markers={allMarkers}
        hoveredMarkerId={hoveredPinId}
        // Selection precedence: search hit > night pin > Go focus > itinerary.
        // Itinerary va per ultimo perché ha un diverso "look" (no halo overlay,
        // bordo bianco + scala hover) — quando un pin è itinerario sopra agli
        // altri canali, lo vediamo direttamente lui senza confondersi con il
        // selected-standard.
        selectedMarkerId={
          searchPlace?.placeId
            ?? nightSelId
            ?? (goFocus ? keyOfPlace(goFocus) : null)
            ?? selectedItineraryId
        }
        onMapClick={handleMapClick}
        onPoiClick={handlePoiClick}
        onMarkerClick={handleMarkerClick}
        onMarkerHover={handleMarkerHover}
        onMarkerDragEnd={handleMarkerDragEnd}
        onViewportChange={(vp) => { viewportRef.current = vp; }}
        viewportInset={viewportInset}
        renderPinCard={(id, close) => {
          // Search-result pin → enriched card with the pre-fetched payload
          // (no second Google round-trip). "Add to trip" posts to the
          // server-side orchestrator and closes the card on success.
          if (searchPlace && id === searchPlace.placeId) {
            return (
              <PlaceHoverCard
                key={id}
                initialPlace={searchPlace}
                fallbackName={searchPlace.name}
                onClose={close}
                onAddToTrip={(place, opts) => {
                  // Close FIRST, then forward upward. The host (ExploreNextShell)
                  // shows the pending pill and runs the network call; the card
                  // going away is the user-facing acknowledgement.
                  close();
                  onAddToTripRequest?.({
                    placeId: searchPlace.placeId,
                    title: place?.name ?? searchPlace.name,
                    lat: place?.lat ?? searchPlace.lat,
                    lng: place?.lng ?? searchPlace.lng,
                    categories: place?.types ?? searchPlace.types,
                    fuzzy: opts?.fuzzy,
                    isAccommodation: opts?.isAccommodation,
                  });
                }}
              />
            );
          }
          // Night pin → saved trip data; Google place → enriched card; manual
          // coordinate-only pin → no card.
          const nw = nightById[id];
          if (nw) {
            return <PlaceHoverCard saved={nightSavedFor(nw)} fallbackName={nw.title} onClose={close} />;
          }
          const m = allMarkers.find((mk) => mk.id === id);
          if (!m || id === `${m.lat},${m.lng}`) return null;
          // Itinerary pins (roadmap) are already in the trip — hide the
          // "Add to trip" CTA. Search/Go/category pins keep the action.
          const isItineraryPin = m.variant === "roadmap";
          return (
            <PlaceHoverCard
              key={id}
              placeId={id}
              fallbackName={m.title ?? t("placeFallback")}
              onClose={close}
              onAddToTrip={
                isItineraryPin
                  ? undefined
                  : (place, opts) => {
                      close();
                      const subId = categorySubByMarkerId.current[id];
                      const subIcon = subId ? EXPLORE_SUB_TO_ICON_KEY[subId] : undefined;
                      onAddToTripRequest?.({
                        placeId: id,
                        title: place?.name ?? m.title ?? t("placeFallback"),
                        lat: place?.lat ?? m.lat,
                        lng: place?.lng ?? m.lng,
                        categories: place?.types,
                        icon: subIcon,
                        fuzzy: opts?.fuzzy,
                        isAccommodation: opts?.isAccommodation,
                      });
                    }
              }
            />
          );
        }}
        onMarkerClose={(id) => {
          // Closing the card (X button) must NEVER destroy the pin — Map
          // handles the visual hide via its own dismiss state. Here we only
          // touch state whose sole purpose is the card itself: night pins use
          // an explicit selection id; clearing it turns off the halo so the
          // saved-mode card doesn't immediately re-anchor on hover.
          if (nightById[id]) setNightSelId(null);
          // searchPlace / goFocus / category / Go: pin stays, no state change
          // — re-hover or re-click brings the card back via Map's dismiss reset.
        }}
        routes={routes}
        fitAllOnMount={fitAllOnMount}
        className="h-full w-full rounded-none"
        actionBubble={
          nearHerePrompt && selectedSubIds[0]
            ? (() => {
                const pin = pinForSub(selectedSubIds[0]);
                return {
                  lat: nearHerePrompt.lat,
                  lng: nearHerePrompt.lng,
                  category: pin.kind,
                  glyph: pin.glyph,
                  title: t("searchNearHere", {
                    category: SUB_GOOGLE[selectedSubIds[0]] ?? selectedSubIds[0],
                  }),
                  subtitle: t("searchNearHereSubtitle"),
                  ctaLabel: t("searchCta"),
                  onSearch: runNearHereSearch,
                  onDismiss: () => {
                    // X = dismiss bubble + deseleziona la categoria nella
                    // toolbar (richiesta esplicita: la X spegne tutto).
                    setNearHerePrompt(null);
                    setSelectedSubIds([]);
                  },
                };
              })()
            : null
        }
      />

      <ExploreToolbar
        categories={categories}
        selectedSubIds={selectedSubIds}
        onSelectionChange={setSelectedSubIds}
        selectionMode="single"
        pinnedSubIds={pinnedSubIds}
        onTogglePin={(subId) =>
          setPinnedSubIds((prev) =>
            prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId],
          )
        }
        onSelectPlace={(place) => {
          // Single search-result pin layer — distinct from `categoryMarkers`
          // (which is plural, area-scoped) and `goFocus` (which would open the
          // Go panel). Toolbar already fetched the enriched payload, so we
          // stash it whole and PlaceHoverCard renders without a second
          // round-trip. Other selections are cleared so only the search hit
          // shows the active halo + card.
          // Pan al risultato ma niente cambio di zoom: l'utente decide il
          // livello di dettaglio. Vedi nota sopra sull'auto-zoom disabilitato.
          interactedRef.current = true;
          setNightSelId(null);
          setGoFocus(null);
          setSearchPlace(place);
          setCenter({ lat: place.lat, lng: place.lng });
        }}
        orientation={isMobile ? "horizontal" : "vertical"}
        className={
          isMobile
            ? "absolute inset-x-2 top-2 z-20"
            : cn(
                "absolute top-4 z-20 transition-[right] duration-300",
                // Quando Yume è pinned in overlay, la toolbar si sposta a sinistra
                // per restare a filo del pannello.
                yumejiPinned ? "right-[360px]" : "right-4",
              )
        }
      />

      {/* Night-route toggle — dedicated overlay (sleep spots + last activities,
          connected in day order). Disabled when the trip has no geolocated stops.
          Hidden quando il host non vuole l'overlay (es. Explore Next, dove la
          Timeline a sinistra già copre la stessa informazione). */}
      {enableNightRoute && (
        <button
          type="button"
          onClick={() => { setShowNightRoute((v) => !v); setNightSelId(null); }}
          disabled={nightRoute.length === 0}
          aria-pressed={showNightRoute}
          className={cn(
            "absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-pill px-3.5 py-2",
            "text-mini font-medium shadow-md transition-colors",
            nightRoute.length === 0 && "opacity-50 pointer-events-none",
            showNightRoute
              ? "bg-night text-white"
              : "bg-surface text-ink-soft hover:text-ink",
          )}
        >
          <IconRoute size={16} />
          {t("nightRoute")}
        </button>
      )}

      {/* Yume — pinned: overlay sopra la mappa (Explore è full-bleed, tutto flotta).
          Soglia lg (1024): sotto lg il MobileSheet è attivo e Yume con z-[1100]
          coprirebbe i suoi contenuti — meglio nasconderlo finché non c'è davvero
          spazio reale a destra del pannello Timeline. */}
      <YumejiPinnedColumn
        floating
        className="hidden lg:flex absolute top-3 right-3 bottom-3 w-[340px] z-[1100]"
      />

      {/* "Cerco …" pill — feedback per il toolbar↔mappa: dal click sulla
          categoria fino all'arrivo dei risultati. Si smonta da sola quando
          searchingFor torna null. */}
      {searchingFor ? (
        <AddedPill
          state={{ kind: "searching", label: searchingFor }}
          onDismiss={() => setSearchingFor(null)}
        />
      ) : null}
    </div>
  );
});
ExploreMap.displayName = "ExploreMap";
