# Migrazione Overpass → Wikidata

## Cambio effettuato

Sostituito il client Overpass API con un nuovo client Wikidata SPARQL per risolvere i problemi di rate limiting (HTTP 429).

## File modificati

### Nuovo file
- **`lib/wikidata.ts`** — Implementazione completa di Wikidata SPARQL API

### File aggiornati
1. **`app/api/catalog/jobs/route.ts`**
   - Cambio import: `@/lib/overpass` → `@/lib/wikidata`
   - Cambio tipo: `OverpassRetryEvent` → `WikidataRetryEvent`
   - Callback retry aggiornato (endpoint è sempre `wikidata.org`)

2. **`app/api/catalog/import/route.ts`**
   - Cambio import: `@/lib/overpass` → `@/lib/wikidata`
   - Commenti aggiornati (Wikidata invece di Overpass)
   - Attribution cambiata in header SSE

3. **`app/api/catalog/preview/route.ts`**
   - Cambio import: `@/lib/overpass` → `@/lib/wikidata`
   - Attribution risposta cambiata: `"© OpenStreetMap contributors (ODbL)"` → `"Wikidata (CC0)"`

4. **`app/(app)/admin/catalog/page.tsx`**
   - Cambio import: `OSM_PRESETS` → `WIKIDATA_PRESETS`
   - Sostituzione globale di riferimenti a `OSM_PRESETS` → `WIKIDATA_PRESETS`
   - Messaggi UI aggiornati ("Interrogo Overpass" → "Interrogo Wikidata")
   - Attribution footer: "© OpenStreetMap contributors (ODbL)" → "Wikidata (CC0)"
   - Label categoria: "Categorie OSM" → "Categorie"

## Interfaccia mantenuta identica

### Funzioni esportate
- `searchPlaces(params)` — identica firma
- `countPlaces(params)` — identica firma
- `buildEmbedText(place, description)` — identica firma

### Tipi pubblici
- `PlaceBasic` — identica struttura (solo `osmId` da number a string per QID Wikidata)
- Presets array con stessi id e label

## Differenze implementative

### Nominatim per geolocalizzazione
Wikidata non ha ricerca geografica per nome come Overpass. Invece:
1. Nominatim API converte nome città → coordinate (es. "Japan" → lat/lon)
2. SPARQL query usa `wikibase:around` con coordinate + raggio in km
3. Raggio calcolato automaticamente dalle bounds

### QID vs OSM tags
Wikidata items hanno QID (es. Q570116 per "tourist attraction") invece di tag OSM. Mappatura:
- **attractions** — Q570116, Q33506 (museum), Q15401994 (gallery), Q3305941 (artwork)
- **historic** — Q23413 (castle), Q4989906 (monument), Q715883 (ruins), ecc.
- **religion** — Q6387583 (temple), Q207694 (shrine), Q2977 (cathedral), Q44613 (monastery)
- **nature** — Q54050 (peak), Q34038 (waterfall), Q40080 (beach), Q35509 (cave), Q476700 (hot spring)
- **parks** — Q22698 (park), Q1976370 (garden), Q3946161 (nature reserve)
- **entertainment** — Q1128057 (theme park), Q43191 (zoo), Q27676 (aquarium)

### Coordinate da WKT
SPARQL restituisce coordinate nel formato WKT Point (es. `"Point(9.1776 48.7347)"`), parsed nel codice.

## Vantaggi della migrazione

✅ Server Wikidata è stabile e non ha rate limiting come Overpass
✅ Dati da Wikidata hanno alta qualità e link a Wikipedia/descrizioni
✅ CC0 licenza è compatibile con qualunque uso commerciale
✅ SPARQL è più flessibile per query future

## Note di deployment

- Non richiede API key
- Nominatim (OSM) per geolocalizzazione è gratuito e stabile
- Due endpoint pubblici: Wikidata SPARQL + Nominatim
- Timeout: 120s per SPARQL, 10s per Nominatim
- Retry logic: 3 tentativi con backoff esponenziale
