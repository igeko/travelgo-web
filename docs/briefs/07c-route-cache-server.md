---
title: Cache server-side dei segmenti Routes tra utenti
description: Amortizzare le call Google ripetute per coppie di placeId identici tra trip/utenti diversi. Ottimizzazione di costo, non funzionale.
date: 2026-06-07
status: cantiere
priority: bassa
---

# Cache server-side dei segmenti Routes tra utenti

## Problema

Oggi ogni `computeBridge` chiama Google Routes API a freddo. La cache localStorage (`lib/client/routeCache.ts`) è per-utente e per-browser → non condivide niente tra sessioni o tra utenti diversi. Due trip a Roma che entrambi vanno *Colosseo → Foro Romano* pagano due call separate.

Routes API costa ~$5/1000 call (basic compute). Con N utenti × M tappe per trip, i segmenti popolari sono ripetuti decine/centinaia di volte.

## Scope (opzionale, futuro)

Una tabella `route_cache` keyed by *(origin_place_id, destination_place_id, mode)*:

```sql
create table public.route_cache (
  origin_place_id      text,
  destination_place_id text,
  mode                 text,       -- 'WALK' | 'DRIVE' | ...
  duration_min         integer not null,
  polyline             text,       -- encoded polyline
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (origin_place_id, destination_place_id, mode)
);

-- TTL implicit: usiamo updated_at per scartare/refresh oltre i 30gg
-- (Google ToS sui lat/lng cached). Non strettamente necessario qui perché
-- non cachiamo lat/lng grezzi ma derived data — valutare.
```

`TripService.computeBridge` controlla la cache prima di chiamare Google; in miss chiama Google e scrive in cache.

## Quando ha senso farlo

NON prima di avere segnale dalla fattura Google. Tipicamente: quando vedi che il `routes:computeRoutes` supera ~$X/mese su Cloud Console. Sotto soglia, l'ingegneria di mantenere la cache (TTL, RLS, refresh, conflitti) non ripaga.

## Note

- Le call non-cacheable restano: Routes con `travelMode: TRANSIT` dipende dall'orario di partenza, NON va in cache.
- I lat/lng-only segments (tappe senza placeId) non sono cacheable a livello server in modo ragionevole (low cardinality di key, rischio mismatch). Tieni la chiave solo su `placeId`.
- La cache localStorage client-side resta utile in parallelo: salta anche il roundtrip HTTP al nostro backend.

## Dipendenze

- Migrazione `route_cache` + RLS (lettura pubblica, scrittura solo da `service_role` via DAL).
- Modifica a `TripService.computeBridge` per check/update cache.
