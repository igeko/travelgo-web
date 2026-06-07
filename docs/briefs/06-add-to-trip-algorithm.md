---
title: Add to Trip — algoritmo di inserimento
description: Logica funzionale per l'inserimento di una tappa dall'Explore Next nel piano di viaggio.
date: 2026-06-07
status: draft
---

# Add to Trip — algoritmo di inserimento

## Descrizione della funzionalità

Dalla pagina Explore Next l'utente cerca luoghi sulla mappa — per categoria o ricerca libera — e li aggiunge al piano di viaggio tramite un'azione "Add to trip" sul place card.

Il flusso si articola in due fasi distinte e sequenziali:

**Fase 1 — Posizionamento nel piano.** Un algoritmo determina dove inserire la nuova tappa nell'itinerario, tenendo conto del contesto di selezione corrente (giorno o attività attiva), degli orari esistenti e della coerenza geografica. Il piano è trattato come un unico itinerario continuo su tutti i giorni: l'algoritmo ragiona sull'intero viaggio, non sui singoli giorni in isolamento. Questa fase è puramente locale, senza chiamate esterne.

**Fase 2 — Aggiornamento del percorso.** Una volta inserita la tappa nella posizione stabilita, Google Routes API ricalcola i bridge di trasporto coinvolti: il segmento tra la tappa precedente e la nuova, e quello tra la nuova e la successiva. L'ordine delle tappe nel piano determina l'ordine del percorso — Google Routes lo esegue, non lo decide.

L'azione è sempre non bloccante: la tappa viene inserita immediatamente e l'utente riceve feedback visivo se il piano risultante presenta problemi (overflow di orario, incoerenza geografica). La correzione è manuale e a discrezione dell'utente.

---

## Regole di posizionamento

Di default la tappa si inserisce **in fondo al piano** — ultima posizione dell'ultimo giorno con attività, o Giorno 1 se il piano è vuoto.

Eccezioni, in ordine di precedenza:

- **Attività selezionata** → inserisce subito dopo quell'attività
- **Giorno selezionato** → inserisce in fondo a quel giorno

> **Advanced Feature (deferred):** rilevamento automatico "lungo il percorso". Se la nuova tappa si trova geograficamente lungo il tragitto tra due stop esistenti (su qualsiasi giorno del viaggio), il sistema suggerisce l'inserimento tra di essi con informazione sul detour aggiunto. L'utente conferma o sceglie posizione alternativa. Implementazione: geometric pre-filter sui polyline cached + calcolo detour via Routes API sui candidati migliori.

---

## Durata di un'attività di default

Ogni tappa inserita da Explore ha una durata stimata, necessaria per il calcolo degli orari e la rilevazione di overflow. La durata si risolve con questa precedenza:

1. **Google Places** — `opening_hours` o `editorial_summary` duration hint, se disponibile per quel place
2. **Mappa per categoria** — tabella su DB (non cablata nel codice), con cache lato servizi. Esempi: museo 120 min · ristorante 90 min · caffè 30 min · monumento 45 min · parco 60 min
3. **Fallback universale** — 60 min

**Accommodation:** trattamento speciale indipendente dalla durata. Check-in generico impostato alle **22:00** (rientro in hotel dopo cena), checkout automatico generato alle **09:00 del giorno successivo**.

---

## Controlli post-posizionamento

Dopo aver determinato la posizione, l'orchestratore esegue i seguenti controlli. Tutti sono non bloccanti: producono warning, non impediscono l'inserimento.

### Overflow di giorno

Verifica se la somma degli orari del giorno — inclusa la nuova tappa — supera la mezzanotte. In caso affermativo, il giorno viene marcato **overflow**. Non si applica nessuna propagazione automatica ad altri giorni: l'utente riorganizza manualmente.

### Incoerenza geografica

Verifica se la nuova tappa dista oltre una soglia configurabile (default: 50 km) dal baricentro delle altre attività dello stesso giorno. In caso affermativo, l'attività viene marcata come **geograficamente incoerente**. Il segnale si propaga al giorno contenitore.

### Duplicato

Verifica se il `placeId` è già presente nel piano. In caso affermativo, viene mostrato un avviso non bloccante con possibilità di confermare comunque l'inserimento.

---

## Incapsulamento funzionale

Ogni funzione ha una sola responsabilità e non conosce lo stato UI. L'orchestratore le chiama in sequenza e aggrega il risultato.

```
resolveDuration(placeType, googleHint?)
  → number (minuti)
  Determina la durata della tappa secondo la precedenza descritta sopra.

resolveInsertPosition(plan, selectedActivityId?, selectedDayId?)
  → { dayId, afterActivityId | null }
  Applica le regole di posizionamento e restituisce la posizione target.

checkTimeOverflow(day, insertAfterIndex, durationMin)
  → { overflows: boolean }
  Verifica se gli orari del giorno sforano mezzanotte dopo l'inserimento.

checkGeographicCoherence(newPlace, dayActivities, thresholdKm)
  → { incoherent: boolean, distanceKm: number }
  Calcola la distanza dal baricentro del giorno.

checkDuplicate(plan, placeId)
  → boolean
  Verifica presenza del place nell'intero piano.

buildActivity(place, category, position, durationMin)
  → Activity (non persistita — solo costruzione dell'oggetto)
  Costruisce l'entità attività pronta per la persistenza.
```

**Orchestratore:**

```
addPlaceToTrip(place, context) → AddResult {
  activity: Activity,
  position: { dayId, afterActivityId },
  warnings: Array<"overflow" | "incoherent" | "duplicate">
}
```

La persistenza è responsabilità del chiamante. L'orchestratore non scrive sul DB.

---

## Ricalcolo percorso (Fase 2)

Dopo la persistenza, il chiamante avvia il ricalcolo dei bridge coinvolti:

- **Bridge A→Nuova**: tra la tappa che precede e la nuova (se esiste una tappa precedente)
- **Bridge Nuova→B**: tra la nuova e la tappa successiva (se esiste)

Il ricalcolo avviene via `/api/routes` (Google Routes API). La modalità di trasporto dei bridge ricalcolati eredita quella del bridge che è stato "spezzato" dall'inserimento, o il default del viaggio se non ne esisteva uno.

---

## Stati risultanti sul piano

| Situazione | Effetto visivo |
|---|---|
| Inserimento OK | Nessuno |
| Giorno in overflow | Giorno colorato **danger**, warning nel dettaglio del giorno |
| Attività geograficamente incoerente | Attività **danger** + giorno **danger** |
| Duplicato | Toast warning non bloccante |
