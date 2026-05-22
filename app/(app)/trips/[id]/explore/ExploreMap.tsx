"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Map, type LatLng, type MapMarker } from "@/components/ui/Map";
import { useTripGo, type GoPlace } from "@/features/go/TripGoContext";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { ExploreToolbar } from "@/features/explore/ExploreToolbar";
import { PlaceHoverCard } from "@/features/explore/PlaceHoverCard";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import { EXPLORE_CATEGORY_TREE } from "@/features/explore/categories";
import { iconGlyph, type GlyphCmp } from "@/components/ui/mapPins";
import { api } from "@/lib/client";
import type { AreaPlace } from "@/app/api/places/area-search/route";

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
}: {
  tripId: string;
  center: LatLng;
  zoom: number;
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

  const [goMarkers, setGoMarkers] = useState<MapMarker[]>([]);
  const [categoryMarkers, setCategoryMarkers] = useState<MapMarker[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [center, setCenter] = useState<LatLng>(tripCenter);
  const [zoom, setZoom] = useState<number>(tripZoom);
  const [isMobile, setIsMobile] = useState(false);
  const [cardPixel, setCardPixel] = useState<{ x: number; y: number } | null>(null);

  const restoredRef = useRef(false);
  const interactedRef = useRef(false);
  const goFocusRef = useRef(goFocus);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<{ center: LatLng; radiusMeters: number } | null>(null);
  goFocusRef.current = goFocus;

  // Markers shown on the map = the focus pin (derived from goFocus — a single,
  // self-replacing "manual" pin when it's an ad-hoc click) + Go markers +
  // category results. Later layers win on dup, so a focused Go/category place
  // shows its real marker (icon/glyph) instead of the bare focus pin.
  const allMarkers = useMemo(() => {
    const byKey: Record<string, MapMarker> = {};
    if (goFocus) {
      const k = keyOfPlace(goFocus);
      byKey[k] = { id: k, lat: goFocus.lat, lng: goFocus.lng, title: goFocus.title };
    }
    for (const m of goMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = m;
    for (const m of categoryMarkers) byKey[m.id ?? `${m.lat},${m.lng}`] = m;
    return Object.values(byKey);
  }, [goFocus, goMarkers, categoryMarkers]);

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
        setCategoryMarkers(places.map((p) => ({ id: p.placeId, lat: p.lat, lng: p.lng, title: p.name, glyph })));
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
    const coords = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    setGoFocus({ title: t("pointLabel", { coords }), lat: latlng.lat, lng: latlng.lng });
    openGo();
  };

  // Map → Go: click a Google POI → focus that real place (no ad-hoc pin).
  const handlePoiClick = (placeId: string, latlng: LatLng) => {
    interactedRef.current = true;
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

  // Map → Go: click an existing pin (incl. category result) → focus + open Go.
  // Re-clicking the manual (ad-hoc) pin removes it; normal pins are never deleted.
  const handleMarkerClick = (id: string) => {
    interactedRef.current = true;
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
        selectedMarkerId={goFocus ? keyOfPlace(goFocus) : null}
        onMapClick={handleMapClick}
        onPoiClick={handlePoiClick}
        onMarkerClick={handleMarkerClick}
        onViewportChange={(vp) => { viewportRef.current = vp; }}
        markerCardAnchor={goFocus?.placeId ? { lat: goFocus.lat, lng: goFocus.lng } : null}
        onCardPixelChange={setCardPixel}
        className="h-full w-full rounded-none"
      />

      {/* Place card — plain React element above the map (outside the map DOM, so
          clicking it never triggers a map click), positioned at the pin pixel. */}
      {goFocus?.placeId && cardPixel && (
        <div
          className="absolute"
          // zIndex above Google's internal map panes (~100+) so the card is clickable.
          style={{ left: cardPixel.x, top: cardPixel.y, transform: "translate(-50%, calc(-100% - 48px))", zIndex: 1000 }}
        >
          <PlaceHoverCard
            key={goFocus.placeId}
            placeId={goFocus.placeId}
            fallbackName={goFocus.title}
            onClose={() => setGoFocus(null)}
          />
        </div>
      )}
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
        orientation={isMobile ? "horizontal" : "vertical"}
        className={isMobile ? "absolute inset-x-2 top-2 z-20" : "absolute right-4 top-4 z-20"}
      />
    </div>
  );
}
