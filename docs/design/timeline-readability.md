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

## Iterazione 2 (2026-06-10)

**Scelta la Variante B.** Aggiornamenti:

- **Niente indigo**: la banda notte passa da `--color-night` a `ink` +
  luna/icona struttura in `primary-tint` — gli stessi toni del day badge
  selected dell'Explore. Il token `night` resta inutilizzato qui.
- **Demo over-map**: lo sketch ora replica il layout reale di
  ExploreNextShell (aside `absolute left-4 top-4 w-[360px] shadow-float`)
  sopra una mock-map SVG (pattern di /design/day-layout). Pin numerati
  arancio per le tappe; pin quadrato ink con luna per i pernottamenti
  (coerente con la banda notte nella lista).
- Variante A archiviata in fondo alla pagina per riferimento.

## Iterazione 3 (2026-06-10) — feedback Enrico

1. **Niente nodi sul rail** — solo linea continua: i pallini creavano
   problemi di allineamento/implementazione. Il rail resta il filo
   conduttore, le tappe sono card accostate.
2. **Selezione giorno più marcata** — rail ink scuro lungo TUTTO il
   giorno (header → ultima row) + `bg-surface-soft` pieno (non /40) +
   `ring-1 ring-ink/10` sul blocco contenuti.
3. **Stati open/editor** — aggiunti gli editor inline (mock statici del
   componente Figma "Activity"): header ink con icona+titolo+X, card
   bianca con toggle Sleep/Stop, durata sosta, descrizione, address,
   coppia orari grandi (arrivo/partenza o check-in/check-out), stepper
   notti per il pernottamento, Rimuovi. Aperti nello sketch: "Spesa
   Beisia" (stop) e "Notte 1 Hotel Tavinos" (sleep).
4. **Banda notte cronologica verticale** — check-in in alto (appartiene
   al giorno sopra, data a destra), nome+notte N di M al centro,
   check-out in basso separato da hairline `white/15`: "→ Gio 6" sta
   sempre dalla parte del secondo giorno.
5. **Transfer completi** — aggiunti i leg mancanti: ultima attività →
   pernottamento (`transferOut` dell'ultima stop) e check-out → prima
   attività del giorno dopo (`incomingTransfer` del giorno, = il
   Transfer incoming cross-day già supportato da Timeline.tsx).

Variante A rimossa dallo sketch (resta documentata qui sopra).

## Iterazione 4 (2026-06-10) — V2 DayList-inspired

V1 (Route Rail + Night Divider, it.3) **congelata** come riferimento —
piace anche perché riusa molti componenti. Si lavora a una **V2** ispirata
a colori/forme della DayList (`/dev/day-list`, `features/day/DayItem.tsx`):

- **Righe flat** su griglia `[50px | 1fr | 14px]` (la griglia di DayItem),
  niente card bordate: separatori a **tratteggio** (`border-dashed
  border-border`) come tra le row della DayList.
- **Header giorno = DayItem**: colonna data 50px (DOW micro uppercase +
  numero `text-lg font-semibold`), **eyebrow zona arancio** micro
  uppercase ("Tokyo → Chiba"), label estesa + conteggio tappe, chevron ›.
- **Selezione giorno** = il linguaggio selected di DayItem: riga ink
  arrotondata, eyebrow → `primary-tint`, chevron ruotato, e **barretta
  arancio laterale** (`-left-[3px] w-1.5 bg-orange rounded-[3px]`)
  estesa a tutto il blocco del giorno espanso; contenuti su
  `bg-surface-soft/60`.
- **Transfer dentro i separatori**: la riga tratteggiata tra due tappe
  ospita la label (trattino corto · label · tratteggio che riempie).
- **Orari in zoom giorno**: la colonna data 50px delle row tappe ospita
  l'orario (allineato sotto il numero del giorno).
- **Notte**: riga ink stile "DayItem selected" con moon nella colonna
  data, eyebrow "Notte N di M" in primary-tint, layout cronologico
  invariato (check-in sopra / check-out sotto col giorno dopo).

File: `shared.tsx` (dati + atomi + editor + mock map), `v1.tsx`
(congelata), `v2.tsx` (attiva), `page.tsx` (entrambe over-map).

## Iterazione 5 (2026-06-10) — V2 cancellata, feedback su V1

La V2 DayList-inspired è stata **cancellata** (file v2.tsx rimosso); si
itera sulla V1. Tre feedback:

1. **Affordance espansione giorno** — prima non si capiva che il giorno
   fosse selezionabile/espandibile. Ora: chevron-down SEMPRE visibile a
   destra dell'header (ruota 180° da aperto), hover bg-surface-soft
   sulla riga, bordo della targa data che si scurisce in hover. Niente
   affordance hover-only (regola touch).
2. **Niente bg ink sulla notte** — in tutta l'app il blu ink è il
   linguaggio della SELEZIONE. La banda notte passa a `surface-warm` +
   `border-primary-border` (hover → border-primary), testi ink/ink-soft,
   "Notte N di M" in `primary-deep`. L'editor open resta con header ink
   (lì ink = stato open/selected, coerente con ActivityStop).
3. **Una sola icona** — via la luna: resta solo il tipo pernottamento
   (letto/tenda…) in badge quadrato arancio (`StopIcon accent=primary`),
   lo stesso linguaggio delle lodging row dell'app. Anche nell'header
   dell'editor e nel pin mappa (quadrato arancio con glifo letto).

## Stato

- [x] Sketch con entrambe le varianti (`/design/timeline-readability`)
- [x] Scelta variante → **B** (Route Rail + Night Divider)
- [x] Recolor banda notte su palette standard (ink + primary-tint)
- [x] Demo nel pannello flottante sopra la mappa
- [ ] Stati mancanti: hover/selected sync mappa, open editor, drag ghost
- [ ] Empty days, multi-notte lunghi, notte senza struttura (overnight flight)
- [ ] Porting su `features/explore/Timeline.tsx` + `DayBadge` + `Transfer`
