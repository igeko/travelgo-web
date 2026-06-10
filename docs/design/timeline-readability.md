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

## Iterazione 6 (2026-06-10) — colore pernottamento

Valutate 4 proposte (in chat, mock con token reali): 1 bianco come le
activity · 2 surface-warm (it.5) · 3 primary-soft · 4 primary pieno.

**Scelta la 1 — bianco.** La card notte usa `bg-surface` +
`border-border` (hover `border-border-strong`), identica alle stop card.
A distinguerla: struttura a 3 righe (check-in / nome / check-out),
badge quadrato arancio col tipo struttura, "Notte N di M" in ink-soft.
Pin mappa resta quadrato arancio.

## Iterazione 7 (2026-06-10) — proposta mobile

Pattern riusato da `/design/explore-mobile-states` (mappa full canvas +
bottom sheet a 3 stati), Timeline V1 dentro lo sheet:

- **Day strip**: le targhe-data della V1 (ridotte a 40px) in scroll
  orizzontale, sticky in cima allo sheet in TUTTI gli stati. È il
  day-selector mobile: tap → giorno selezionato, pin/path filtrati,
  sheet a full col giorno espanso.
- **peek**: handle + day strip + riga "Ora" (prossimo leg: transfer +
  destinazione) + input Go sticky.
- **half**: itinerario V1 collapsed (giorni chiusi, transfer nei
  separatori, card notte bianca tra i giorni).
- **full**: zoom giorno — header ink, rail ink, orari, fuzzy, notes;
  la strip resta per saltare tra giorni.
- **Touch**: grip sempre visibile a bassa opacità (regola no
  hover-only), row ≥36-44px, drag con long-press 200ms (TouchSensor
  già configurato in Timeline.tsx).

File: `mobile.tsx` (gallery 3 phone frame in fondo alla pagina sketch).

## Iterazione 8 (2026-06-10) — card notte su navy "stay"

Dopo la bianca (it.6) e le varianti primary (4a-4d, valutate in chat),
scelta una direzione nuova da screenshot di Enrico: **navy #1a3a4f con
riquadro icona arancione**.

- Nuovo token in `@theme`: `--color-stay: #1a3a4f` + `--color-stay-hover:
  #22465c`. NON si riusa `ink-hover` (semantica sbagliata: è lo stato
  hover di ink) né `night` (#4338ca indigo, già usato da ExploreMap/
  PlaceHoverCard per il night-route layer).
- Card: `bg-stay` testo bianco, hover `bg-stay-hover`; riquadro icona
  `bg-primary` col solo tipo struttura (niente luna); "Notte N di M"
  white/70; hairline white/18; struttura 3 righe cronologiche invariata.
- Distinguo dalla selezione (`ink`): tonalità più chiara + badge arancio
  + forma a 3 righe. Verificato side-by-side con un giorno espanso.
- Allineata anche la card notte mobile (`mobile.tsx`). Pin mappa resta
  quadrato arancio.

## Iterazione 9 (2026-06-10) — stay soft (6d)

Provate 4 schiariture del navy #1a3a4f (6a-6d in chat). **Scelta la 6d**:
stessa tonalità (h≈204) ribaltata in chiaro.

- Token aggiornati in `@theme`: `--color-stay: #dce8f1`,
  `--color-stay-hover: #cfdfeb`, nuovo `--color-stay-text: #44708c`
  (label/meta sulla superficie stay).
- Card: `bg-stay`, testo ink (nome semibold, orari semibold), label
  check-in/check-out/date/"Notte N di M" in `text-stay-text`, hairline
  `border-ink/15`, riquadro icona `bg-primary` invariato.
- Zero conflitto col blu selezione; il badge arancio resta l'àncora.

## Iterazione 10 (2026-06-10) — transfer solo a giorno selezionato

I tempi di percorrenza si mostrano SOLO quando il giorno è selezionato
(coerente con la regola degli orari per-stop). Giorno collapsed →
segmento tratteggiato muto: il leg si intuisce ma non pesa.

**Eccezione leg lunghi**: i trasferimenti ≥1h (soglia da condividere
come costante, su `duration_min` ≥ 60) mostrano icona+durata anche da
collapsed — un leg di 2h+ ridisegna la giornata e va visto a colpo
d'occhio nel browse del viaggio. Da espanso: label completa (durata +
distanza + legs); lo stato open del Transfer è raggiungibile solo da lì.

Applicato anche al mobile (half = muto/solo lunghi, full = completo).

## Iterazione 11 (2026-06-10) — icon-picker negli editor

Cambiare icona dal dettaglio di activity/accommodation. Due binari:

- **Activity**: il badge icona nell'header dell'editor diventa trigger
  (icona + chevron-down sempre visibile, hover bg) → popover ancorato
  (`z-dropdown`, shadow-float) con griglia 6 colonne del set fisso
  `STOP_ICONS` (24 chiavi, `features/activity/Timeline/stopIcons.tsx`);
  la chiave scelta va in `activity.icon` (entity-level →
  `ActivityService.updateEntity`, come l'address). Selezionata =
  `bg-ink`; tooltip = label i18n `Timeline.stopIcons.<key>`; chiusura
  su selezione / Esc / click-out. Niente search (24 icone, 4 righe).
- **Accommodation**: NIENTE icona libera — si sceglie il TIPO struttura
  (`accommodation.type`: hotel/campground/apartment/ryokan) con una
  riga di 4 chip icona+label nell'editor sleep; l'icona segue via
  `accommodationIcon(type)`, che resta l'unica fonte.

Mock statici in `shared.tsx`: `IconPickerTrigger`, `IconPickerGrid`
(aperto nell'editor di Spesa Beisia), `StayTypePicker` (nell'editor
della Notte 1).

### It.11b — scelta proposta A "Sezioni" (su 3 valutate in chat)

- **Picker flottante** (popover `z-dropdown`, `shadow-float`, ancorato
  al badge icona nell'header dell'editor) che sovrasta il corpo.
- **Icone = categorie ExploreToolbar**: tutte le sub di
  `EXPLORE_CATEGORY_TREE` (16), raggruppate per macro Dormi/Mangia/
  Esplora con eyebrow icona+label. Un solo tap; tooltip = label i18n
  `ExploreCategories.*`. Selezionata `bg-ink`, celle `bg-surface-soft`.
- **Trigger SENZA chevron**: il cambio icona avviene nel dettaglio, il
  badge icona è tappabile così com'è (hover bg).
- **Nota dati**: `activity.icon` oggi salva chiavi `STOP_ICONS`
  (`coffee`, `shop`…), non gli id categoria (`caffe`, `mercati`…) —
  serve mappa di conversione o migrazione delle chiavi esistenti.
- Mock aggiornato: `IconPickerPanel` in `shared.tsx` (sostituisce
  `IconPickerGrid`).

## Iterazione 12 (2026-06-10) — NightCard semplificata

La card a 3 righe era troppo ricca. Collapsed → **una sola riga, come
le activity card**: riquadro icona arancio (tipo struttura) + nome
(`text-meta font-medium text-ink`) + "Notte N di M" (`text-stay-text`),
superficie `bg-stay`, hover `bg-stay-hover`.

Check-in/check-out (orari + date) si spostano SOLO nel dettaglio —
l'editor li ha già (TimePair "check-in / check-out"). Lo span sui due
giorni resta raccontato dalla posizione della card (TRA un giorno e il
successivo) e dalla superficie stay, non più dalle righe orarie.

Aggiornati: `NightDivider` (v1), `MNight` (mobile), blocco 6 DevNotes.

## Iterazione 13 (2026-06-10) — transfer SEMPRE nascosti collapsed

Rivisitata l'eccezione "leg ≥1h" di it.10: in pratica creava confusione
("perché vedo gli spostamenti in alcuni giorni e in altri no?") e
rompeva l'invariante semplice "collapsed = colonna pulita di tappe".

**Regola finale**: i Transfer (incoming cross-day + activity↔activity
intra-day) sono renderizzati ESCLUSIVAMENTE a giorno espanso. Nessuna
eccezione per durata. Implementazione: `TimelineV2.buildItems` filtra a
monte, niente spacer muted — lo spazio verticale si compatta davvero.

I leg lunghi non spariscono dall'app: bastano un click sul giorno per
vederli (con tutte le informazioni: distanza, modalità, legs transit,
deep-link Maps/Waze). Il browse veloce vede solo le tappe.

Costante `LONG_LEG_MIN` rimossa dal codice.

## Iterazione 13 (2026-06-10) — note del giorno: stato vuoto

Gap segnalato: il giorno espanso mostra le note quando ci sono, ma un
giorno senza note non aveva l'affordance per aggiungerle.

Nel giorno espanso il blocco note ora c'è SEMPRE, stessa posizione
(sotto le tappe, sopra la notte):

- **compilato** → TodayNotes con pencil (soft, piena in hover);
- **vuoto** → riga tratteggiata ghost "Aggiungi note al giorno"
  (IconNotes, hover warm) → tap apre l'editing;
- **editing** → textarea inline nel blocco warm (`ring-primary-border`),
  Invio salva su `days.notes` (PATCH del giorno), Esc annulla.

Componenti mock: `TodayNotesEmpty`, `TodayNotesEditing` in shared.tsx;
galleria dei 3 stati in pagina (il giorno espanso del hero ha già note).
Applicato anche al mobile (full state).

## Iterazione 14 (2026-06-10) — editor full-bleed (focus mode)

Domanda di Enrico: ottimizzare lo spazio tra la colonna del giorno e la
colonna destra? Sì, ma SOLO per lo stato aperto:

- **Collapsed**: la colonna giorno resta — è l'orientamento della lista
  (targhe, rail, allineamento card). Non si tocca.
- **Open (editor attività/notte)**: focus mode — l'editor esce dalla
  griglia `[44px | 1fr]` e occupa tutta la larghezza del pannello; il
  rail si interrompe dietro e riprende sotto. ~50px recuperati su 360
  (+16% di larghezza utile) per chip ARRIVO/PARTENZA (niente più date
  troncate), durata e descrizione. Il NightEditor era già full-bleed:
  ora vale per entrambi.

Porting: in Timeline.tsx la row aperta passa a `gridColumn: "1 / -1"`
(la colonna 1 del giorno è già `gridRow: 1 / lastRow+1`, quindi serve
sospendere il rail dietro l'editor o portare l'editor su un layer sopra
con bg pieno — scelta implementativa libera, l'effetto visivo è "rail
coperto").

## Iterazione 15 (2026-06-10) — notte come le activity, solo bordo

Esplorazioni intermedie (in chat, scartate o parcheggiate):
- **Via 6 (notte nel day header) SCARTATA** — perde il leg ultima
  tappa → alloggio e la semantica "la notte chiude la giornata"
  (l'accommodation si segna sul giorno in cui si va a letto).
- Vie 7a-7d (anti-ripetizione su stay lunghi) e artifici 8a-8d (legare
  la card ai due giorni): parcheggiate, da riprendere se la resa attuale
  non basta sui multi-notte.

**Scelta attuale (it.15b)**: la NightCard prende ALTEZZA e anatomia
delle activity card (icona 36px, stessi padding) ma resta a **tutta
larghezza**, tra un giorno e il successivo — attraversa anche la
colonna del rail: è il separatore-notte, e lo span sui due giorni è
raccontato proprio da questo. **Solo bordo, niente bg, stesso colore
delle targhe giorno** (it.15c):

- card: `rounded-md border border-border-strong bg-transparent`, hover
  `border-ink/40` (identico alla targa data) — notte e giorni parlano
  la stessa lingua di contorno; niente token `stay-border` (valutato e
  rimosso);
- badge arancio tipo struttura, nome ink, "Notte N di M" stay-text;
- posizione invariata (in fondo al giorno, dopo il transfer di rientro)
  → il leg ultima tappa → alloggio resta sempre rappresentabile.

Nota porting: rimuovere `bg-stay`/`bg-stay-hover` dalla card (i token
restano per usi futuri, es. fasce multi-notte 7b).

## Stato

- [x] Sketch con entrambe le varianti (`/design/timeline-readability`)
- [x] Scelta variante → **B** (Route Rail + Night Divider)
- [x] Recolor banda notte su palette standard (ink + primary-tint)
- [x] Demo nel pannello flottante sopra la mappa
- [ ] Stati mancanti: hover/selected sync mappa, open editor, drag ghost
- [ ] Empty days, multi-notte lunghi, notte senza struttura (overnight flight)
- [ ] Porting su `features/explore/Timeline.tsx` + `DayBadge` + `Transfer`
