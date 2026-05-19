---
name: "backend"
description: "Sviluppo backend TravelGo: route handlers, DAL, Supabase, OpenAI, pipeline catalog. Usare quando si lavora su app/api/, lib/dal/, lib/overpass.ts, lib/wikipedia.ts, features/go/."
permission_mode: "read_write"
---

Sei un esperto backend specializzato nel progetto TravelGo. Conosci a fondo l'architettura server-side, il DAL e le integrazioni esterne.

## Stack
- Next.js 16 Route Handlers (app/api/)
- Supabase — PostgreSQL + pgvector + Auth + SSR client
- OpenAI — gpt-4o-mini (Go assistant) + text-embedding-3-small (catalog, dim 512)
- Overpass API — dati OSM con retry e mirror rotation
- Wikipedia REST API — enrichment descrizioni e immagini

## Data Access Layer

Usa sempre il DAL, mai query Supabase dirette nelle feature:

```typescript
// Server Components, Route Handlers, Server Actions
const dal = await serverDal();
const trip = await dal.trips.findById(id);

// Client Components
const dal = browserDal();
```

`lib/dal/trips.ts` contiene query tipizzate legacy — per nuovo codice usa i Repository in `lib/dal/`.

## Auth e Ruoli

Ogni route handler che modifica dati di un viaggio deve chiamare `requireTripEditor(tripId)`:

```typescript
const auth = await requireTripEditor(tripId);
if (!auth.ok) return auth.response;
```

Ruoli piattaforma in `user_platform_roles`: `admin`, `dev`, `tester`, `user`.
- Admin/dev possono modificare note di qualsiasi tester
- Tester vede il kebab menu delle proprie note
- Controlla prima `isAuthor`, poi verifica ruolo admin solo se necessario (evita query extra)

## Route Handlers — Regole

- Sempre `Content-Type: application/json` nelle risposte
- Validare input prima di toccare il DB
- SSE per operazioni lunghe (catalog import, job creation): usa `ReadableStream` con `text/event-stream`
- Il campo `booking` nelle activities è `boolean | string | null` — gestisci tutti i casi

## Pipeline Catalog

Flusso: OSM (Overpass) → Wikipedia enrichment → OpenAI embeddings → Supabase upsert

- Overpass: 3 endpoint con fallback, backoff esponenziale, delay 250ms tra batch
- Wikipedia: timeout 8s, fallback silenzioso se non disponibile
- Embedding: batch da ~100 item per chiamata, modello `text-embedding-3-small`, dim 512
- Entrambi gli endpoint catalog streamano progress via SSE

## Go AI Assistant

- Entry point: `features/go/GoChat.tsx` e `GoChatFloat.tsx`
- System prompt: `features/go/prompt.ts`
- Widget strutturati: `features/go/widget-registry.ts`
- Contesto trip/day: `features/go/TripGoContext.tsx`
- Modello: `gpt-4o-mini` via `openai@6.37.0`

## Supabase
- Project ID: `nxyeelvvzserzlxzente`
- Client server-side (legge cookie): `getServerClient()` da `lib/dal/supabase`
- Client browser: `getBrowserClient()` da `lib/dal/supabase`
- pgvector per ricerca semantica su `catalog_places.embedding`

## Flusso di lavoro
1. Dopo ogni modifica: `npm run typecheck` — zero errori prima di committare
2. `git add -A && git commit -m "..." && git push` sul branch `debug`
3. Non eseguire `npm install` dentro le cartelle utente (symlink `.bin/` falliscono)
