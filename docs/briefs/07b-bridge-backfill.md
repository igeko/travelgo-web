---
title: Backfill bridge mancanti su trip esistenti
description: Trip importati/legacy hanno `bridge_*_json = null` e mostrano niente transfer. Serve un comando esplicito per popolare.
date: 2026-06-07
status: cantiere
priority: media
---

# Backfill bridge mancanti su trip esistenti

## Problema

Solo le tappe aggiunte tramite `addPlace` (post commit `45cfd02`) hanno i `bridge_*_json` calcolati. Tutto il resto — trip creati prima del wiring, tappe importate manualmente, sequenze migrate — ha `bridge_in_json = bridge_out_json = null`. In Timeline/mappa significa: nessun transfer disegnato tra una tappa e la successiva.

## Scope

Esporre un'azione UTENTE per calcolare on-demand i bridge mancanti di un trip:

- **Endpoint**: `POST /api/trips/[id]/compute-missing-bridges` (con opzionale `?dayId=...` per limitarlo a un giorno solo).
- **Servizio**: nuovo metodo `TripService.computeMissingBridges(tripId, opts?)` che:
  1. Carica lo snapshot.
  2. Per ogni coppia consecutiva `(prev, curr)` dove `prev.bridge_out_json == null` (o `curr.bridge_in_json == null`) e entrambi hanno `lat/lng`, computa il bridge via il `computeBridge` già esistente.
  3. Esegue le scritture in parallelo (`Promise.all`), un round di scrittura per ogni segmento.
  4. Restituisce `{ filled: number, skipped: number }` per il feedback UI.
- **UI**: bottone in qualche surface — probabilmente dentro la Timeline header o nel menù "azioni di giorno" (decidere con UX brief 06b).

## Non-scope

- **Auto-backfill all'apertura del trip**: rischio fattura altissimo (apri un trip → 50 call Google). Esplicitamente off.
- **Backfill su lazy render**: stesso problema, solo distribuito. Off.

## Dipendenze

- Codice di calcolo già esiste: `computeBridge` privato in `TripService`. Esporlo come metodo riusabile o pubblicarlo via helper interno.
- Niente migrazioni DB.
- L'UI dipende dal layout finale della Timeline (potrebbe coordinarsi col brief 06b).
