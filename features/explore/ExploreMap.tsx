"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Map, type LatLng, type MapMarker, type RouteSpec } from "@/components/ui/Map";
import { useTripGo, type GoPlace } from "@/features/go/TripGoContext";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { YumejiPinnedColumn, useYumejiDrawer } from "@/features/yumeji/YumejiFrame";
import { cn } from "@/lib/cn";
import { PlaceHoverCard, type SavedPlaceInfo } from "@/features/explore/PlaceHoverCard";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import { EXPLORE_CATEGORY_TREE } from "@/features/explore/categories";
import { iconGlyph, NIGHT, type GlyphCmp } from "@/components/ui/mapPins";
import { IconBed, IconMapPin, IconRoute } from "@/components/ui/icons";
import { getStopIcon } from "@/features/activity/Timeline/stopIcons";
import type { NightWaypoint } from "@/lib/explore/nightRoute";
import { api } from "@/lib/client";
import type { AreaPlace } from "@/app/api/places/area-search/route";

/** Default activity/day image — used by night cards when the stop has none. */
const DEFAULT_ACTIVITY_IMAGE = "/media/day-default-banner.png";

/** Zoom used when (re)opening focused on a single place. */
const FOCUS_ZOOM = 14;

/** Grace period before clearing the focus, so switching cards doesn't flicker. */
const FOCUS_CLEAR_DELAY = 450;

/** Dwell before a category selection fires its area search. */
const SEARCH_DEBOUNCE = 500;

/** sub-category id → Google Text Search term + icon component. */
const SUB_GOOGLE: Record<string, string> = {};
const SUB_ICON: Record<string, GlyphCmp> = {};
for (const macro of EXPLORE_CATEGORY_TREE) {
  for (const sub of macro.subs) {
    SUB_GOOGLE[sub.id] = sub.google;
    SUB_ICON[sub.id] = sub.icon;
  }
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
export function ExploreMap({
  tripId,
  center: tripCenter,
  zoom: tripZoom,
  nightRoute,
  extraMarkers = [],
  viewportInset,
  onExtraMarkerDragEnd,
}: {
  tripId: string;
  center: LatLng;
  zoom: number;
  nightRoute: NightWaypoint[];
  /** Static pins injected by the host (e.g. all trip activities). Rendered as a
   *  base layer — Go/category/night pins win on a key collision. */
  extraMarkers?: MapMarker[];
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
}) {
  const { subscribe, openGo, goFocus, setGoFocus } = useTripGo();
  const t = useTranslations("Explore");
  const categories = useExploreCategories();
  const [lastPlace, setLastPlace] = useLocalStorageState<GoPlace | null>(
    `travelgo-explore-last-${tripId}`,
    null,
  );
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
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [center, setCenter] = useState<LatLng>(tripCenter);
  const [zoom, setZoom] = useState<number>(tripZoom);
  const [isMobile, setIsMobile] = useState(false);
  const yumejiPinned = !!useYumejiDrawer()?.isPinned;

  const restoredRef = useRef(false);
  const interactedRef = useRef(false);
  const goFocusRef = useRef(goFocus);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<{ center: LatLng; radiusMeters: number } | null>(null);
  goFocusRef.current = goFocus;

  // Night-route pins as regular markers with the dedicated "night" variant: this
  // gives them the SAME behaviour as every other pin (click → detail card, focus
  // sent to Go, selection halo). The only difference is they can't be deleted —
  // they're sourced from trip data, so re-clicking just deselects (see below),
  // never removes the pin. The connecting polyline is added via `routes`.
  const nightMarkers = useMemo<MapMarker[]>(() => {
    if (!showNightRoute || nightRoute.length === 0) return [];
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
  }, [showNightRoute, nightRoute]);

  // Coords-key → waypoint, so a clicked night pin resolves to its saved data.
  // (Record, not a JS Map — the `Map` name is the imported component here.)
  const nightById = useMemo(() => {
    const byKey: Record<string, NightWaypoint> = {};
    if (showNightRoute) for (const w of nightRoute) byKey[`${w.lat},${w.lng}`] = w;
    return byKey;
  }, [showNightRoute, nightRoute]);
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

  // Night-route is the only `RouteSpec` Explore draws today. `fitOnLoad: true`
  // mirrors the legacy `routeLayer` behaviour — the camera reframes once when
  // the user toggles the night route on, so the whole route is visible at a
  // glance. Subsequent renders (without identity change) don't refit.
  const routes = useMemo<RouteSpec[]>(
    () =>
      showNightRoute && nightRoute.length >= 2
        ? [{
            id: "night",
            travelMode: "DRIVING",
            points: nightRoute.map((w) => ({ lat: w.lat, lng: w.lng })),
            style: { color: NIGHT, weight: 4, opacity: 0.9 },
            fitOnLoad: true,
            fitPadding: 80,
          }]
        : [],
    [showNightRoute, nightRoute],
  );

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
    const mq = window.matchMedia("(min-width: 640px)");
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
  useEffect(() => {
    const subId = selectedSubIds[0];
    if (!subId) { setCategoryMarkers([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const term = SUB_GOOGLE[subId];
      const vp = viewportRef.current;
      if (!term || !vp) return;
      const glyph = SUB_ICON[subId] ? iconGlyph(`cat:${subId}`, SUB_ICON[subId]) : undefined;
      try {
        const places = await api.places.areaSearch<AreaPlace>(
          term, vp.center.lat, vp.center.lng, vp.radiusMeters,
        );
        // Category area-search can return many dense pins → cluster them.
        // Go and night layers stay regular (low cardinality, semantic).
        setCategoryMarkers(places.map((p) => ({
          id: p.placeId, lat: p.lat, lng: p.lng, title: p.name, glyph,
          clustered: true,
        })));
      } catch {
        /* search failed — keep previous pins */
      }
    }, SEARCH_DEBOUNCE);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [selectedSubIds]);

  // Restore the last focused place once, right after localStorage hydrates —
  // only on a genuine fresh load (skip if the user already interacted).
  useEffect(() => {
    if (restoredRef.current || interactedRef.current || !lastPlace) return;
    restoredRef.current = true;
    setZoom(FOCUS_ZOOM);
    setGoFocus(lastPlace);
  }, [lastPlace, setGoFocus]);

  // Focus changed → pan to it and persist it. The focus pin itself is derived
  // in `allMarkers`, so an ad-hoc click never accumulates into goMarkers — there
  // is always exactly one manual pin, replaced when the focus changes.
  useEffect(() => {
    if (!goFocus) return;
    setCenter({ lat: goFocus.lat, lng: goFocus.lng });
    setLastPlace(goFocus);
  }, [goFocus, setLastPlace]);

  // Map → Go: drop a pin on empty map → focus + open Go. We don't reverse-geocode
  // (Maps key not authorized for Geocoding), so the label is coordinate-based.
  const handleMapClick = (latlng: LatLng) => {
    interactedRef.current = true;
    setNightSelId(null);
    setSearchPlace(null);
    const coords = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    setGoFocus({ title: t("pointLabel", { coords }), lat: latlng.lat, lng: latlng.lng });
    openGo();
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

  return (
    <div className="relative h-full w-full">
      <Map
        center={center}
        zoom={zoom}
        zoomControlPosition="RIGHT_BOTTOM"
        markers={allMarkers}
        // Selection precedence: search hit > night pin > Go focus. Search wins
        // because the user just explicitly picked it from the autocomplete.
        selectedMarkerId={
          searchPlace?.placeId ?? nightSelId ?? (goFocus ? keyOfPlace(goFocus) : null)
        }
        onMapClick={handleMapClick}
        onPoiClick={handlePoiClick}
        onMarkerClick={handleMarkerClick}
        onMarkerDragEnd={handleMarkerDragEnd}
        onViewportChange={(vp) => { viewportRef.current = vp; }}
        viewportInset={viewportInset}
        renderPinCard={(id, close) => {
          // Search-result pin → enriched card with the pre-fetched payload
          // (no second Google round-trip). "Add to trip" is wired in but
          // intentionally a no-op for now — UX scaffolding only.
          if (searchPlace && id === searchPlace.placeId) {
            return (
              <PlaceHoverCard
                key={id}
                initialPlace={searchPlace}
                fallbackName={searchPlace.name}
                onClose={close}
                onAddToTrip={() => {
                  // TODO: wire to the trip add-to-day flow once the host
                  // exposes it. Keeping the prop set so the CTA renders.
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
          return <PlaceHoverCard key={id} placeId={id} fallbackName={m.title ?? t("placeFallback")} onClose={close} />;
        }}
        onMarkerClose={(id) => {
          if (searchPlace && id === searchPlace.placeId) { setSearchPlace(null); return; }
          if (nightById[id]) setNightSelId(null);
          setGoFocus(null);
        }}
        routes={routes}
        className="h-full w-full rounded-none"
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
          interactedRef.current = true;
          setNightSelId(null);
          setGoFocus(null);
          setSearchPlace(place);
          setCenter({ lat: place.lat, lng: place.lng });
          setZoom(FOCUS_ZOOM);
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
          connected in day order). Disabled when the trip has no geolocated stops. */}
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

      {/* Yume — pinned: overlay sopra la mappa (Explore è full-bleed, tutto flotta) */}
      <YumejiPinnedColumn
        floating
        className="hidden md:flex absolute top-3 right-3 bottom-3 w-[340px] z-[1100]"
      />
    </div>
  );
}
