# Transfer — switch modalità per tappa

> Sketch: `/design/transfer-mode`
> Componenti reali: `features/explore/Transfer.tsx` (stato open),
> `features/activity/Timeline/TransitVerifier.tsx`, `lib/client/routes.ts`

## Concetto

Click sulla riga transfer → dettaglio (stato open di Transfer) con uno
**switch modalità** in testa, alla Google: A piedi · Auto · Mezzi · Bici
(pill segmented, icone Tabler walk/car/bus/bike, label da
`Timeline.transport`). Cambiare modalità ricalcola il leg e riscrive il
bridge; la riga collapsed si aggiorna di conseguenza.

## Integrazione TransitVerifier → RouteVerifier

Il corpo del dettaglio è UN SOLO pattern per tutte le modalità: la lista
opzioni del TransitVerifier, generalizzata:

- `RouteVerifier({ mode, origin, destination, departureTime, onApply })`
- **transit** → `api.routes.transit` → N combinazioni (UI attuale del
  verifier: legs walk › linea › walk, partenza, fermate/cambi);
- **car / walk / bike** → `api.routes` compute → 1 opzione (stessa
  OptionRow: durata + distanza + via/nota); per car anche i deep-link
  Maps/Waze già esistenti nel Transfer open.
- Selezione opzione → `onApply(bridge: BridgeData)` (output invariato).

## Persistenza & dati

- Il bridge applicato scrive `bridge_out_json` della tappa di partenza
  (flusso già usato dal verifier nel BridgeEditor). Nessun endpoint nuovo.
- `BridgeData.transport` copre già walk/metro/bus/taxi/bike/car/train.
- Switch su modalità non ancora calcolata → fetch lazy + stato loading;
  cache in memoria per-leg-per-mode (evita refetch a ogni switch).
- `duration_min` aggiornato → il solver `computeDayTimes` ricalcola gli
  orari del giorno da sé.

## Stato

- [x] Sketch (pannello Mezzi con 3 combinazioni + pannello Auto)
- [ ] Porting: switch in Transfer open + RouteVerifier generalizzato
- [ ] Cache per-leg-per-mode, loading states
- [ ] Distanza su BridgeData (`distance_m`, vedi timeline-readability it.10/nota 5)
