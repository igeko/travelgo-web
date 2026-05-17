---
title: API Monitoring
description: Sistema di monitoring per-user delle chiamate API con calcolo costi OpenAI.
date: 2026-05-17
status: ready
---

# API Monitoring

Sistema di tracking delle chiamate API per utente. Serve per ottimizzare e calcolare il costo del servizio per ogni utente.

## Cosa è già fatto

- **Tabella `api_logs`** creata su Supabase (`nxyeelvvzserzlxzente`) con migrazione applicata
- **RLS** configurata: admin leggono tutto, utenti leggono solo i propri log, INSERT solo via service role
- **`lib/monitoring/`** — tre file pronti da copiare nel progetto

## File da copiare

```
outputs/lib/monitoring/cost.ts           → lib/monitoring/cost.ts
outputs/lib/monitoring/log-api-call.ts   → lib/monitoring/log-api-call.ts
outputs/lib/monitoring/index.ts          → lib/monitoring/index.ts
outputs/app/(app)/admin/monitoring/      → app/(app)/admin/monitoring/
```

## Env var richiesta

```
SUPABASE_SERVICE_ROLE_KEY=<Supabase Dashboard → Project Settings → API → service_role>
```

Da aggiungere in `.env.local` e nelle variabili d'ambiente di produzione (Vercel).

## Integrazione route AI — `/api/ai/chat`

Vedi `outputs/patches/api_ai_chat_route.patch.ts` per il diff completo.

Punti chiave:

1. `const _monStart = Date.now()` all'inizio della funzione
2. Accumulare `totalUsage` (prompt + completion tokens) su ogni round del loop OpenAI
3. Prima del `return` finale chiamare:

```ts
import { logApiCall, calcCostUSD } from '@/lib/monitoring';

logApiCall({
  user_id:           user?.id ?? null,
  route:             '/api/ai/chat',
  method:            'POST',
  status_code:       200,
  duration_ms:       Date.now() - _monStart,
  ai_model:          MODEL,
  prompt_tokens:     totalUsage.prompt_tokens,
  completion_tokens: totalUsage.completion_tokens,
  total_tokens:      totalUsage.total_tokens,
  cost_usd:          calcCostUSD(MODEL, totalUsage.prompt_tokens, totalUsage.completion_tokens),
  trip_id:           body.tripId ?? null,
});
```

4. Loggare anche nel `catch` con `status_code: 500`

## Integrazione altre route

**Non usare `withMonitoring()`** — aggiunge latenza per il fetch sessione. Chiamare `logApiCall()` manualmente passando il `user_id` già disponibile:

```ts
logApiCall({
  user_id:     user.id,
  route:       '/api/places',
  method:      req.method,
  status_code: 200,
  duration_ms: Date.now() - start,
});
```

Route da coprire: `/api/places`, `/api/routes`, `/api/trips`, `/api/me`, `/api/go`, `/api/tester-notes`.

## Overhead

| Scenario | Overhead |
|---|---|
| Route AI (logApiCall manuale) | **0ms** |
| Altre route (logApiCall manuale) | **< 1ms** |

Il log è fire-and-forget: non blocca mai la response.

## Admin dashboard

Disponibile su `/admin/monitoring` (solo per utenti in `platform_admins`). Mostra:

- Chiamate totali, AI calls, token consumati, costo stimato (ultimi 30gg)
- Breakdown per route con error rate e timing medio
- Costo AI per utente
- Log recenti con dettaglio token
