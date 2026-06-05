---
title: Explore (next) — mappa interattiva + category search
description: Cablare ExploreNextShell alla mappa full-feature, abilitare la ricerca per categoria via ExploreToolbar, risolvere il calcolo viewport con il pannello, e portare i pin a una singola fonte di verità.
date: 2026-06-05
status: draft
---

# Explore (next) — mappa interattiva + category search

## Punto di partenza

`ExploreNextShell` monta `RouteMap` a sfondo pieno ma senza alcuna integrazione:

```tsx
// ExploreNextShell.tsx — stato attuale
<RouteMap points={[]} className="absolute inset-0 rounded-none" />
```

La vecchia pagina `explore/` ha già tutto il necessario:

- **`ExploreMap.tsx`** — wrappa `Map`, gestisce Go events, category search via
  `api/places/area-search`, layer marker multipli (Go, categoria, night route,
  extra).
- **`api/places/area-search`** — Google Places Text Search biased a
  `center + radius`, restituisce fino a 20 `AreaPlace`.
- **`Map.tsx`** — base con `onViewportChange` che emette `{ center, radiusMeters }`
  (distanza centro → angolo NE = cerchio circoscritto al viewport), `markers[]`,
  `renderPinCard`, hover/select.

Tre problemi da risolvere prima di collegare i pezzi:

1. **Panel offset**: `Map.onViewportChange` calcola il centro sull'intero container,
   ignorando i ~376 px del pannello sinistro. Il cerchio di ricerca è spostato a
   sinistra rispetto a quello che l'utente vede.
2. **Pin variant mancante**: `Map` usa solo `makeAdHocPin` (dot). Gli stop
   dell'itinerario devono renderizzarsi come pin teardrop (`makePinIcon`). Oggi
   devono essere passati via `extraMarkers`, ma il tipo iconico è sbagliato.
3. **Clustering**: `api/places/area-search` restituisce max 20 risultati per call,
   ma nelle zone dense (Tokyo centro) si possono accumulare più batch o più
   categorie aperte: servono >80 marker. Il DOM crolla senza clustering.

---

## Architettura target

```
mapPins.ts          ← SVG builders, unica fonte di verità per tutti i pin
Map.tsx             ← base: init mappa, lifecycle marker, hover/select, viewport
  │  variant "stop" → makePinIcon  (teardrop con ruolo/slot)
  │  variant "night" → makeNightPin (già presente)
  │  default → makeAdHocPin          (dot, Go + category results)
  │  clustering → MarkerClusterer per i marker con clustered: true
  │  MapHandle → getMap() + fitBounds()
  │
  ├── RouteMap.tsx        ← wrapper: RouteStop[] → MapMarker[stop], polyline via getMap()
  └── ExploreMap.tsx      ← consumer: 3 layer (itinerary, Go, categoria), toolbar, Go bus
        usato da ExploreNextShell
```

---

## Step 1 — `Map`: `viewportInset` per compensare il pannello

### Problema

Il listener `idle` calcola il centro come media di NE/SW:

```ts
const center = { lat: (ne.lat() + sw.lat()) / 2, lng: (ne.lng() + sw.lng()) / 2 };
```

Questo è il centro del container DOM, non dell'area visibile all'utente.

### Fix

Aggiungere `viewportInset` a `MapProps`:

```ts
export type MapProps = {
  // …esistente…
  /**
   * Pixel offset dell'area visibile rispetto al container mappa.
   * Usare quando UI panels coprono una porzione della mappa.
   * Il centro viewport emesso da onViewportChange viene corretto di conseguenza.
   */
  viewportInset?: { left?: number; right?: number; top?: number; bottom?: number };
};
```

Nel listener `idle`, ricavare il bounds corretto:

```ts
mapRef.current.addListener("idle", () => {
  const cb = onViewportChangeRef.current;
  if (!cb || !mapRef.current) return;
  const b = mapRef.current.getBounds();
  if (!b) return;

  const inset = viewportInsetRef.current ?? {};
  const mapDiv = mapRef.current.getDiv();
  const mapW = mapDiv.offsetWidth;
  const mapH = mapDiv.offsetHeight;

  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  const lngPerPx = (ne.lng() - sw.lng()) / mapW;
  const latPerPx = (ne.lat() - sw.lat()) / mapH;

  // Bounds dell'area visibile (esclude i panel)
  const visWest  = sw.lng() + lngPerPx * (inset.left   ?? 0);
  const visEast  = ne.lng() - lngPerPx * (inset.right  ?? 0);
  const visSouth = sw.lat() + latPerPx * (inset.bottom ?? 0);
  const visNorth = ne.lat() - latPerPx * (inset.top    ?? 0);

  const center = {
    lat: (visSouth + visNorth) / 2,
    lng: (visWest  + visEast)  / 2,
  };
  // Raggio = distanza centro → angolo NE del rettangolo visibile
  cb({ center, radiusMeters: metersBetween(center, { lat: visNorth, lng: visEast }) });
});
```

Tenere `viewportInset` in un ref per evitare re-bind del listener:

```ts
const viewportInsetRef = useRef(viewportInset);
viewportInsetRef.current = viewportInset;
```

### Uso in ExploreNextShell

Il pannello sinistro misura `w-[360px]` + `left-4` (16 px) = **376 px**. Leggere
la larghezza reale dal DOM è più robusto di un valore hardcoded:

```tsx
const panelRef = useRef<HTMLElement>(null);
const [panelWidth, setPanelWidth] = useState(0);

useEffect(() => {
  if (!panelRef.current) return;
  const ro = new ResizeObserver(() =>
    setPanelWidth(panelRef.current?.offsetWidth ?? 0)
  );
  ro.observe(panelRef.current);
  return () => ro.disconnect();
}, []);

// Poi nella mappa:
<ExploreMap … viewportInset={{ left: panelWidth }} />
```

---

## Step 2 — `Map`: variant `"stop"` + `MapHandle`

### `MapMarker` — aggiungere il variant stop

```ts
export type MapMarker = {
  lat: number;
  lng: number;
  title?: string;
  id?: string;
  glyph?: string;
  /**
   * "stop"  → teardrop makePinIcon (itinerario giornata).
   *            Richiede `stopRole` e opzionalmente `slot`.
   * "night" → badge circolare indigo (già presente).
   * default → dot makeAdHocPin (Go, risultati categoria).
   */
  variant?: "stop" | "night";
  /** Solo per variant "stop": ruolo nella sequenza giornata. */
  stopRole?: StopRole;
  /** Solo per variant "stop": time-of-day slot (colore del pin). */
  slot?: RouteSlot;
};
```

Nel ciclo di styling dei marker (già presente in Map):

```ts
if (m.variant === "stop") {
  const color = m.slot ? SLOT_COLORS[m.slot] : INK;
  marker.setIcon(makePinIcon(m.stopRole ?? "mid", m.glyph ?? "", color));
  marker.setZIndex(isSelected ? 1000 : 5);
} else if (m.variant === "night") {
  // …invariato…
} else {
  // adHoc — invariato
}
```

Import da aggiungere in `Map.tsx`:

```ts
import { makePinIcon, type StopRole } from "./mapPins";
import { SLOT_COLORS, type SlotKey as RouteSlot } from "@/features/activity/types";
```

### `MapHandle`

Esporre l'istanza `google.maps.Map` tramite ref imperativo per consentire ai
wrapper (RouteMap) di disegnare polyline senza duplicare il codice di init:

```ts
export type MapHandle = {
  /** Istanza Maps SDK — usare solo per operazioni non coperte dai props (es. Polyline). */
  getMap: () => google.maps.Map | null;
  fitBounds: (bounds: google.maps.LatLngBounds, padding?: number | google.maps.Padding) => void;
};
```

```tsx
export const Map = forwardRef<MapHandle, MapProps>(function Map(props, ref) {
  // …
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    fitBounds: (bounds, padding) => mapRef.current?.fitBounds(bounds, padding),
  }), []);
  // …
});
```

---

## Step 3 — Clustering per i risultati categoria

### Installazione

```bash
# Eseguire fuori dalla cartella utente (vedi CLAUDE.md — npm install nel mount fallisce)
npm install @googlemaps/markerclusterer
```

### Integrazione in `Map`

Aggiungere `clustered?: boolean` a `MapMarker`. Map gestisce un `MarkerClusterer`
separato per i marker con `clustered: true`:

```ts
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const clustererRef = useRef<MarkerClusterer | null>(null);
const clusteredMarkersRef = useRef<google.maps.Marker[]>([]);
```

Nel ciclo di reconcile marker, separare i due insiemi:

```ts
const regular: google.maps.Marker[] = [];
const clustered: google.maps.Marker[] = [];

for (const m of desired) {
  // …crea marker come oggi…
  if (m.clustered) clustered.push(marker);
  else regular.push(marker);
}

// Gestione clusterer
if (clustered.length > 0) {
  clustererRef.current ??= new MarkerClusterer({ map });
  clustererRef.current.clearMarkers();
  clustererRef.current.addMarkers(clustered);
} else {
  clustererRef.current?.clearMarkers();
}
clusteredMarkersRef.current = clustered;
```

Cleanup su unmount:

```ts
useEffect(() => () => {
  clustererRef.current?.clearMarkers();
}, []);
```

### Uso in `ExploreMap`

I risultati categoria possono essere molti e densi → `clustered: true`:

```ts
setCategoryMarkers(places.map((p) => ({
  id: p.placeId,
  lat: p.lat,
  lng: p.lng,
  title: p.name,
  glyph,
  clustered: true,   // ← nuovo
})));
```

Go markers e night pins **non** sono clustered (sono pochi, semantici).

---

## Step 4 — `ExploreNextShell`: cablare `ExploreMap`

### Spostare `ExploreMap` in `features/explore/`

`app/(app)/trips/[id]/explore/ExploreMap.tsx` è domain UI, non route component.
Spostarlo in `features/explore/ExploreMap.tsx` così può essere condiviso da
entrambe le route (`explore/` e `explore-next/`).

Aggiornare l'import nella vecchia route:

```ts
// app/(app)/trips/[id]/explore/page.tsx (o il suo shell)
import { ExploreMap } from "@/features/explore/ExploreMap";
```

### Aggiungere `viewportInset` a `ExploreMap`

```ts
export function ExploreMap({
  tripId,
  center: tripCenter,
  zoom: tripZoom,
  nightRoute,
  extraMarkers = [],
  viewportInset,          // ← nuovo
}: {
  // …
  viewportInset?: { left?: number; right?: number };
}) {
  // …
  // Passare a Map:
  <Map … viewportInset={viewportInset} … />
}
```

### `ExploreNextShell` — versione cablata

```tsx
export function ExploreNextShell({ days, tripId, center, zoom, nightRoute }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(376); // default sicuro

  useEffect(() => {
    if (!panelRef.current) return;
    const ro = new ResizeObserver(() =>
      setPanelWidth(panelRef.current?.offsetWidth ?? 376)
    );
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, []);

  // Marker itinerario del giorno selezionato
  const itineraryMarkers = useMemo<MapMarker[]>(() =>
    selectedDayStops.map((stop, i, arr) => ({
      id: stop.id,
      lat: stop.lat,
      lng: stop.lng,
      title: stop.name,
      glyph: resolveGlyph(stop),
      variant: "stop" as const,
      stopRole: i === 0 ? "start" : i === arr.length - 1 ? "end" : "mid",
      slot: stop.slot ?? undefined,
    })),
  [selectedDayStops]);

  return (
    <div className="relative h-full w-full">
      <ExploreMap
        tripId={tripId}
        center={center}
        zoom={zoom}
        nightRoute={nightRoute}
        extraMarkers={itineraryMarkers}
        viewportInset={{ left: panelWidth }}
        className="absolute inset-0"
      />

      <aside
        ref={panelRef}
        className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline days={days} onSelectDay={setSelectedDay} />
        </div>
      </aside>
    </div>
  );
}
```

Note:
- `ExploreMap` gestisce autonomamente `ExploreToolbar` (già inclusa nel suo render),
  quindi `ExploreNextShell` non deve montarla separatamente.
- `selectedDayStops` viene derivato da `days` in base al giorno selezionato nella
  `Timeline`. Aggiungere `onSelectDay` a `Timeline` se non esiste.
- `resolveGlyph` è già in `RouteMap.tsx` — spostarlo in un modulo condiviso
  (es. `features/activity/resolveGlyph.ts`) così sia RouteMap che ExploreNextShell
  lo usano senza duplicare.

---

## Step 5 — RouteMap → wrapper di Map (deferred)

Non bloccante per ExploreNextShell. Fare come cleanup separato.

RouteMap oggi duplica l'inizializzazione mappa e gestisce i marker inline.
Con `MapHandle.getMap()` disponibile, il refactor è meccanico:

1. Sostituire il container + init map con `<Map ref={mapHandle} markers={stopMarkers} … />`
2. `stopMarkers` = `RouteStop[]` → `MapMarker[]` con `variant: "stop"`
3. Le polyline continuano a creare `google.maps.Polyline` direttamente:
   `new google.maps.Polyline({ path, map: mapHandle.current?.getMap(), … })`
4. `fitBounds` usa `mapHandle.current?.fitBounds(bounds, padding)`
5. L'handle imperativo di RouteMap (`focusPoint`, `focusCoord`, `fitAll`) rimane
   invariato per i consumer.

---

## Checklist implementazione

- [ ] `Map`: aggiungere `viewportInset` prop + correzione calcolo centro in `idle`
- [ ] `Map`: aggiungere `variant: "stop"` a `MapMarker` con `stopRole` / `slot`
- [ ] `Map`: aggiungere `MapHandle` con `getMap()` + `fitBounds()`
- [ ] `Map`: integrare `@googlemaps/markerclusterer` per marker con `clustered: true`
- [ ] `mapPins.ts`: nessuna modifica — già corretto
- [ ] Spostare `ExploreMap` in `features/explore/ExploreMap.tsx`
- [ ] `ExploreMap`: aggiungere prop `viewportInset`; passarla a `Map`
- [ ] `ExploreMap`: marker categoria → `clustered: true`
- [ ] Estrarre `resolveGlyph` da `RouteMap.tsx` in `features/activity/resolveGlyph.ts`
- [ ] `ExploreNextShell`: cablare `ExploreMap` + ResizeObserver per `panelWidth`
- [ ] `Timeline`: aggiungere `onSelectDay` callback se mancante
- [ ] `npm run typecheck` senza errori dopo ogni step
- [ ] (deferred) RouteMap → wrapper di Map via `MapHandle.getMap()`
