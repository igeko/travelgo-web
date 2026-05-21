# TravelGo — Architettura Catalogo Posti

## Panoramica

TravelGo utilizza una pipeline di import multi-sorgente per costruire un catalogo di posti turistici. Il sistema combina:

- **OpenStreetMap** (via Overpass API) — Coordinate geografiche e classificazione
- **Wikipedia** — Descrizioni testuali, immagini, URL
- **OpenAI Embeddings** — Rappresentazioni vettoriali per ricerca semantica
- **Supabase** — Database con support per vector search

---

## 1. Architettura Dati

### Tabella `catalog_places`

```
id              UUID (PK)
name            TEXT
country         TEXT
country_code    VARCHAR(2)
city            TEXT
address         TEXT
category        TEXT              # da OSM (es. "attraction", "religion")
kinds           TEXT[]            # tag principali (es. ["temple", "historic"])
description     TEXT              # da Wikipedia (max 500 char)
rating          FLOAT             # futuro: da Google Places o Tripadvisor
cover_image     TEXT              # URL immagine Wikimedia
lat             FLOAT8
lng             FLOAT8
source          TEXT              # "osm", "google_places", ecc.
source_id       TEXT              # id esterno (es. "node/12345")
wikidata        TEXT              # QID da Wikidata (es. "Q744550")
wikipedia       TEXT              # URL Wikipedia
embedding       vector(512)       # OpenAI text-embedding-3-small
embedded_at     TIMESTAMP
import_job_id   UUID (FK)         # per tracciare provenienza
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Tabella `import_jobs`

```
id              UUID (PK)
status          TEXT              # 'pending', 'running', 'paused', 'done', 'error'
filters         JSONB             # { location, presetIds, notableOnly, enrichWiki }
batch_size      INT               # elementi per batch (def. 500)
auto_continue   BOOLEAN
import_offset   INT               # offset del prossimo batch
total_found     INT               # risultati totali da Overpass
total_saved     INT               # inseriti in DB
total_embedded  INT               # con embedding calcolato
created_by      UUID (FK)         # admin che ha creato
created_at      TIMESTAMP
started_at      TIMESTAMP
completed_at    TIMESTAMP
```

---

## 2. Pipeline Import

### Fase 1: Conteggio (Job Creation)

```
POST /api/catalog/jobs
├─ Validazione auth (admin only)
├─ Parse: location, presetIds, notableOnly, enrichWiki
├─ countPlaces(location, presetIds, notableOnly)
│  ├─ Build query Overpass
│  ├─ Retry logic con backoff esponenziale
│  └─ Ritorna count totale
└─ Crea job con status='pending'
```

Flusso SSE per il client:
- `{ type: 'retry', attempt, maxRetries, waitMs, endpoint }` — Retry con rate limiting
- `{ type: 'done', job, count }` — Job creato
- `{ type: 'error', message }` — Fallito

### Fase 2: Import Batch (Streaming)

```
POST /api/catalog/import
├─ Validazione auth
├─ Carica job da DB
├─ Segna status='running'
├─ Per ogni batch:
│  ├─ Fetch da Overpass: offset + batchSize
│  ├─ Per ogni posto:
│  │  ├─ enrichFromWiki({ wikipediaTag, wikidataId })
│  │  │  ├─ Fetch Wikipedia summary (descrizione, foto)
│  │  │  └─ Fetch Wikidata P18 (miglior immagine)
│  │  ├─ Upsert in catalog_places
│  │  └─ Aggiungi a buffer embedding
│  ├─ Batch embedding (OpenAI):
│  │  ├─ Accumula ~100 posti
│  │  └─ Chiama text-embedding-3-small
│  ├─ Update embedding nel DB
│  └─ SSE: { type: 'progress', saved, embedded, message }
├─ Aggiorna import_offset, total_saved, total_embedded
├─ Se completato: status='done', altrimenti='paused'
└─ SSE: { type: 'done', complete }
```

---

## 3. Enrichment

### Wikipedia Enrichment (`lib/wikipedia.ts`)

**Flusso:**
1. Parse OSM tag `wikipedia` (es. "en:Senso-ji" → lang='en', title='Senso-ji')
2. Fetch Wikipedia REST API `/api/rest_v1/page/summary/{title}`
   - Estrai: `summary.extract` (descrizione)
   - Url: `summary.content_urls.desktop.page`
   - Immagine: `summary.thumbnail.source` (fallback)
3. Se ha QID Wikidata, fetch P18 (immagine principale)
   - Wikidata API → filename
   - Construct Wikimedia thumbnail URL (MD5 hash)
4. Return: `{ description, coverImage, wikipedia }`

**Rate limiting:** No rate limit esplicito, fetch con timeout 8s

### Future: OpenAI Web Search

Placeholder in `lib/enrichment.ts` per:
- Cercare info turistiche specifiche (orari, tariffe, etc.)
- Integrare con tool OpenAI quando disponibile
- Fallback: regex pattern matching su risultati generici

---

## 4. Embedding & Semantic Search

### Generazione Embedding

```typescript
// Testo combinato per embedding
buildEmbedText(place, description) →
  "${name} | ${category} | ${description}"

// Chunk in batch da ~100 posti
openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: [text1, text2, ...],
  dimensions: 512
})

// Save in DB
catalog_places.update({
  embedding: vector,
  embedded_at: now()
})
```

### Ricerca Semantica

```sql
SELECT *
FROM catalog_places
ORDER BY embedding <-> query_embedding
LIMIT 10
```

Requires: pgvector extension in Supabase

---

## 5. Region Presets (`lib/region-presets.ts`)

Template preconfiguratori per import rapidi:

```typescript
interface RegionPreset {
  id: string;
  name: string;                    // "🇯🇵 Giappone - Completo"
  description: string;
  location: string;                // "Japan", "Tokyo", "Rome"
  presetIds: string[];             // OSM categorie
  batchSize: number;
  notableOnly: boolean;
  enrichWiki: boolean;
  autoContinue: boolean;
  dataQuality: {
    expectedResults: number;
    notes: string[];
  };
}
```

**Presets inclusi:**
- 🇯🇵 Giappone (completo, Tokyo, Kyoto)
- 🇮🇹 Italia (completo, Roma)
- 🇪🇸 Spagna
- 🇩🇪 Germania
- 🇫🇷 Francia (completo, Parigi)
- 🇬🇧 UK (Londra)
- 🇺🇸 USA (New York City)

---

## 6. Status Monitoring

### `/api/overpass/status`

Controlla lo stato di tutti i mirror Overpass in parallelo:

```typescript
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

// Per ogni endpoint:
fetch(`${endpoint}/status`)
  .match(/(\d+)\s+slots? available/)
  .slots = parseInt(match[1])

// Ritorna:
{
  timestamp: ISO8601,
  best: { endpoint, slots, available, status },
  all: [{ endpoint, slots, statusUrl }]
}
```

**UI Polling:** 30 secondi (previene ban 429)

---

## 7. Data Quality Validation (`lib/data-quality.ts`)

Analizza qualità dei dati importati:

```typescript
analyzeDataQuality(places) → {
  totalPlaces,
  withDescription: #,           // % con Wikipedia
  withImages: #,
  withEmbedding: #,
  withWikipedia: #,
  geoSpread: { minLat, maxLat, minLng, maxLng, center },
  categories: { "attraction": 500, "historic": 300, ... },
  scores: {
    enrichment: %,              // % con descrizione
    completeness: %,            // % con desc + img + embedding
    geographic: %,              // spread geografico
  },
  metrics: {
    avgDescriptionLength,
    avgDescriptionWords,
    duplicates,
    missingCoords,
  }
}
```

---

## 8. Admin UI (`app/(app)/admin/catalog/page.tsx`)

### Componenti

1. **Overpass Status Monitor**
   - Status real-time (ready/busy/error)
   - Slot disponibili per endpoint migliore
   - Lista di tutti gli endpoint con loro status
   - Polling ogni 30 secondi

2. **Region Presets** (nuovo)
   - Quick select da REGION_PRESETS
   - Auto-popola location, categorie, opzioni

3. **Filter Panel**
   - Location input (es. "Japan", "Tokyo")
   - OSM Category toggle (attractions, historic, religion, etc.)
   - Options:
     - Batch size (100-2000)
     - Solo posti notevoli (Wikipedia/Wikidata only)
     - Enrich da Wikipedia (toggle)
     - Auto-continue (toggle)

4. **Job List**
   - Status badge (pending/running/paused/done/error)
   - Stats: Total found, Importati, Embedded
   - Progress bar
   - Actions: Start/Resume, Stop, Delete

### Flow Utente

```
1. Seleziona preset (es. "🇯🇵 Giappone - Kyoto")
   ↓
2. Clicca "Crea Task"
   → Conta posti su Overpass (SSE con retry events)
   → Job in status='pending'
   ↓
3. Clicca "Avvia Import"
   → Batch processing (SSE progress)
   → Enrich da Wiki
   → Embed con OpenAI
   → Salva in DB
   ↓
4. Job completo o messo in pausa
   → Se auto_continue=true: riprendi automaticamente
   → Altrimenti: "Riprendi" button visibile
```

---

## 9. Flusso Dati Completo

```
┌─────────────────┐
│ Admin UI        │
│ Preset: "Japan" │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ POST /api/catalog/jobs          │
│ countPlaces (Overpass)          │
│ → total_found: 8500             │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ Import Job created (pending)    │
│ import_jobs table               │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ POST /api/catalog/import        │
│ Batch 1: offset=0, limit=500    │
└────────┬────────────────────────┘
         │
         ├─→ searchPlaces (Overpass)
         │   ↓
         │   PlaceBasic[] (500 items)
         │
         ├─→ enrichFromWiki
         │   ├─ Wikipedia REST API
         │   └─ Wikidata P18
         │   ↓
         │   { description, coverImage, wikipedia }
         │
         ├─→ upsert catalog_places (500)
         │
         ├─→ buildEmbedText
         │   ↓
         │   "Senso-ji | historic | Senso-ji is a Buddhist temple..."
         │
         ├─→ OpenAI embeddings.create
         │   ↓
         │   vector(512)
         │
         └─→ update catalog_places.embedding
             ↓
             SSE: { type: 'progress' }

... continua batch 2, 3, ... fino a completamento ...

         ↓
┌─────────────────────────────────┐
│ Job completo (status='done')    │
│ total_saved: 8500               │
│ total_embedded: 8500            │
└─────────────────────────────────┘
```

---

## 10. Future Enhancements

- [ ] **OSM Dump Import** — Geofabrik per dati locali completi
- [ ] **JNTO Integration** — Japan National Tourism Org data
- [ ] **Google Places** — Valutazioni, orari apertura, foto
- [ ] **Multiple Enrichment Sources** — Tripadvisor, TripAdvisor, Tabelog
- [ ] **Rate Limiting Strategy** — Prevent bans, exponential backoff
- [ ] **Bulk Operations** — Import multi-paese in parallelo
- [ ] **Data Versioning** — Track changes over time
- [ ] **Webhook Alerts** — Notify when import completes

---

## 11. File Structure

```
lib/
├─ overpass.ts              # Overpass API client
├─ wikipedia.ts             # Wikipedia enrichment
├─ enrichment.ts            # Multi-source enrichment (future)
├─ region-presets.ts        # Region templates
└─ data-quality.ts          # Quality validation

app/api/
├─ overpass/
│  └─ status/route.ts       # Status monitoring endpoint
└─ catalog/
   ├─ jobs/route.ts         # Job CRUD + creation (SSE)
   ├─ import/route.ts       # Batch import (SSE)
   └─ preview/route.ts      # Preview before import

app/(app)/admin/
└─ catalog/
   └─ page.tsx              # Admin UI
```

---

## 12. Rate Limiting & Robustness

### Overpass API

- **Adaptive retry logic:** Exponential backoff (2^attempt seconds)
- **Mirror rotation:** 3 endpoints, auto-select best one
- **Status checking:** Every 30s to avoid bans
- **Slot awareness:** Respects "N slots available" advertised state

### Wikipedia

- **Timeout:** 8 second per request
- **Safe fetch:** No exceptions, returns null on error
- **Fallback:** Skip enrichment if unavailable

### OpenAI

- **Batch embedding:** Group ~100 items per API call
- **Error handling:** Log warnings, continue if single batch fails
- **Dimensions:** 512 (text-embedding-3-small)

---

## 13. Attribution & Compliance

All data includes proper attribution:

- **OSM:** "© OpenStreetMap contributors (ODbL)"
- **Wikipedia:** "Wikipedia contributors" + CC BY-SA 4.0 notice
- **Wikidata:** "Wikimedia Commons" + CC0 notice
- **Wikimedia:** Licensing varies, thumbnails typically CC/PD

See `catalog_places.wikipedia` URL for full license text per item.

---

## Licenza Dati

Specifiche per il TravelGo catalogo:

| Fonte       | Licenza   | Uso         | Attribuzione |
|-------------|-----------|-------------|--------------|
| OSM         | ODbL 1.0  | Commerciale | Obbligatoria |
| Wikipedia   | CC BY-SA  | Commerciale | Obbligatoria |
| Wikidata    | CC0       | Qualsiasi   | Consigliata  |
| Wikimedia   | Varia     | Varia       | Per item     |

---
