# Timeline Readability — redesign della rappresentazione

> Sessione design aperta · sketch: `/design/timeline-readability`
> Componenti reali coinvolti: `features/explore/Timeline.tsx`, `DayBadge.tsx`, `Transfer.tsx`, `ActivityStop.tsx`

## Problema

Il funzionamento della Explore Timeline va bene (drag&drop, zoom giorno,
fuzzy in arrivo); è la **rappresentazione** a non convincere:

1. **Separazione giorni** — i giorni si fondono: il confine è solo il
   DayBadge 36px nella colonna sinistra.
2. **Transfer poco leggibili** — la riga distanza/tempo tra stop è in
   `text-nano` (8px) e si confonde col rumore.
3. **Date troppo piccole** — weekday+data in `text-micro` (10px) dentro
   un quadrato 36px.
4. **Pernottamento a cavallo** — la notte inizia un giorno e finisce il
   successivo, ma oggi è una row duplicata in fondo a ogni giorno
   ("Night 1 of 2"), senza rappresentare lo *span*.

## Vincoli (funzionalità da preservare)

- Drag&drop riordino attività (intra-day e cross-day)
- Zoom sul singolo giorno (expanded: orari per-stop, fuzzy, Today notes)
- Click-to-open editor inline, hover-sync con i pin della mappa
- Fuzzy stops visibili solo nel dettaglio giorno (futuro)
- Vive nell'aside sinistra di explore-next (~380px), in simbiosi con la mappa

## Variante A — Day Card + Night Bridge

- **Giorno = card** con header a tutta larghezza: weekday + data a 16px,
  "Giorno N · K tappe", fill bar. Giorno espanso → header ink.
- **Transfer** = pill bordata su connettore puntinato (icona modalità +
  durata in bold + distanza + legs transit).
- **Notte = card arancione "bridge"** renderizzata TRA due card-giorno,
  con margini negativi: scavalca fisicamente il bordo inferiore del
  giorno di check-in e quello superiore del giorno di check-out.
  Mostra check-in/check-out con le rispettive date.

Pro: separazione massima, il bridge è una metafora diretta dello span.
Contro: più "boxy"; le card aggiungono cromo; il bridge con margini
negativi richiede cura negli stati aperti/drag.

## Variante B — Route Rail + Night Divider

- **Rail di percorso continuo** con nodi-tappa (stile metro map): rinforza
  la natura "itinerario" e la simbiosi con il path in mappa.
- **Data = targa 44px sul rail** (weekday / numero 17px bold / mese) +
  label estesa "Giovedì 6 Agosto · Giorno 2" accanto.
- **Transfer sul segmento**: il tratto di rail tra due nodi diventa
  tratteggiato e l'etichetta (durata bold + km + legs) sta accanto.
- **La notte È il separatore**: banda full-width su token `--color-night`
  (indigo) con luna, nome struttura, "Notte N di M · Mer 5 → Gio 6" e
  `22:00 ─ 🌙 ─ 09:00`. Check-in appartiene visivamente al giorno sopra,
  check-out al giorno sotto. Niente row alloggio duplicata per giorno.

Pro: risolve 1+4 con un solo gesto (ogni giorno inizia dopo una notte);
rail coerente col path della mappa; meno cromo della A.
Contro: per stay multi-notte la struttura compare in più bande (come ora,
ma è una per notte, non una per giorno); la banda night è un pattern
nuovo da introdurre nel design system (token `night` già esiste).

## Note di mappatura sull'implementazione

- Il modello dati non cambia: `accommodation` per-day (resolveAccommodations)
  fornisce già `night_index / nights_total` → una NightBridge/Divider per
  ogni giorno con notte, renderizzata DOPO il giorno invece che dentro.
- Drop target drag&drop: in entrambe le varianti la notte non è sortable
  (come oggi: lodging pinned). In A il bridge va escluso dalle hit-area;
  in B la banda è naturalmente fuori dalla colonna sortable.
- `DayBadge` in B evolve in "date plate" 44px (fill bar integrabile nella
  targa o accanto alla label estesa).
- `Transfer` open-state (dettaglio percorso + Maps/Waze) resta invariato:
  cambia solo la resa collapsed.

## Stato

- [x] Sketch con entrambe le varianti (`/design/timeline-readability`)
- [ ] Scelta variante (o ibrido)
- [ ] Stati mancanti: hover/selected sync mappa, open editor, drag ghost
- [ ] Empty days, multi-notte lunghi, notte senza struttura (overnight flight)
