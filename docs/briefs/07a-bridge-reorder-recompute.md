---
title: Bridge recalc su reorder / move tappe
description: Quando una tappa cambia posizione o giorno, i bridge adiacenti diventano stantii. Vanno ricalcolati come fa già `addPlace`.
date: 2026-06-07
status: cantiere
priority: alta
---

# Bridge recalc su reorder / move tappe

## Problema

Oggi `TripService.addPlace` ricalcola correttamente `prev→new` e `new→next` quando si **aggiunge** una tappa (vedi `lib/services/TripService.ts → recomputeBridgesAround`). Ma le altre due mutazioni che spezzano la catena **non** ricalcolano nulla:

- **Reorder within day** (`Scheduler.reorder` / `services.trips.reorderDay`) — cambia `position` di più tappe; i `bridge_*_json` adiacenti restano puntati al vecchio vicino.
- **Move to another day** (`Scheduler.moveToDay` / `services.trips.moveActivity`) — la tappa migra; sia il vecchio giorno (gap da chiudere: prev→next del vecchio vicino) sia il nuovo (spezzatura come in add) hanno bridge stantii.

Risultato visibile: utente trascina una tappa, i transfer mostrati in Timeline/mappa diventano falsi (durata, modalità, geometria sbagliata).

## Scope

Estendere `TripService` con un helper riusabile (`recomputeBridgesForMove` o estensione del `recomputeBridgesAround` esistente) e invocarlo da:

- `reorder` (`reorderDay`): per OGNI tappa che ha cambiato `position`, ricalcolare i suoi bridge `in` e `out`.
- `moveActivity`: ricalcolare il **gap chiuso nel giorno di origine** (vecchio prev → vecchio next) e la **doppia spezzatura nel giorno di destinazione** (nuovo prev → tappa → nuovo next).

Travel mode ereditato dal bridge spezzato, come già fa `addPlace`. Esecuzione in parallelo (`Promise.all`) per minimizzare la latenza.

## Note

- Quando reorderDay coinvolge N tappe, può scatenare fino a 2N call Google. Considera batching o un single fitness pass dopo la mutazione, non per-tappa.
- L'endpoint client `routes.compute` ha già cache 30 giorni in localStorage: se il segmento era già conosciuto, niente call.

## Dipendenze

- Codice già pronto da estendere: `lib/services/TripService.ts → recomputeBridgesAround / computeBridge`.
- Niente migrazioni DB richieste.
