# Yumeji · Spec viva

**Sketch di riferimento**: `/design/yumeji` (da creare)
**Promozione di**: `app/(design)/design/wishlist/page.tsx` (wishlist trip-bound, sketch attuale)
**Stile editorial reference**: `app/(design)/design/discovery/page.tsx`
**Ultima sessione**: 2026-05-22

---

## Concept

**Yumeji** (夢路, "il sentiero dei sogni") è la collezione globale di posti, attività e idee di viaggio dell'utente. Promuove la wishlist da trip-bound a **livello account**: gli yume vivono sopra ai trip, accessibili da tutta l'app e filtrabili contestualmente quando si è dentro un trip.

Il glyph 夢 si innesta nel linguaggio visivo del logo TravelGo (五) — stessa famiglia tonale, stessa scelta di radici nipponiche velate.

**Microcopy**:

- Nome esteso (pagina, marketing, settings): **Yumeji**
- Nome operativo (UI dense, pill header): **Yume**
- Singolare: *uno yume*
- Plurale: *i tuoi yume*, *47 yume salvati*
- Verbo UI: *"Salva nei tuoi yume"*

---

## Decisioni

### Dec 1 — Livello account, non trip-bound

Yumeji è una collezione **globale per utente**. Non appartiene a un trip. Un trip può "tirare" yume per costruirsi (drag from drawer, suggerimento di Go) ma l'entità yume resta dell'utente.

**Perché**: l'utente accumula idee nel tempo, indipendentemente dai trip pianificati. Salva qualcosa a Tokyo oggi, magari diventerà un trip nel 2027. La wishlist trip-bound attuale forza una decisione prematura ("a quale trip appartiene?") e disperde lo stesso interesse su trip multipli.

**Coesistenza con il sketch trip-bound esistente**: la pagina `app/(design)/design/wishlist/page.tsx` resta come **vista filtrata** del Yumeji (dentro `/trips/[id]/wishlist`), riusando lo stesso DAL ma applicando il filtro destinazione (vedi Dec 4). Alternativamente, viene assorbita dal drawer Yumeji aperto in trip context — decisione rimandata a feedback sullo sketch.

---

### Dec 2 — Entry point: due porte su due livelli dell'header

L'accesso al Yumeji è separato in **due affordance su due livelli** dell'`AppHeader`:

1. **Link "Yumeji" in Row 1** (nav primaria), dopo `Explore`. Porta alla **pagina dedicata** `/yumeji`. Sempre visibile per utenti loggati, indipendentemente dal trip-context. È il global access alla collezione.
2. **Toggle pin-yumeji in Row 2** (sub-header del trip), all'estrema destra, dopo l'action chip `View mode`/`Edit mode`. Apre/chiude il **drawer destro**. Visibile **solo in trip-context** (quando Row 2 esiste). È il tool operativo di composizione del trip.

```
Row 1: 五 TravelGo   My trips · Explore · Yumeji     🇮🇹 👤
Row 2:    Tokyo 2026 · Day 2 of 5      Tabs        | View mode  ❉
                                                              ↑
                                                              toggle pin-yumeji
```

**Perché due livelli diversi**:

- Row 1 è il livello **app/account**: contiene risorse globali dell'utente (i suoi trip, le sue esplorazioni, la sua collezione yumeji). Il link "Yumeji" è una destinazione, come "My trips".
- Row 2 è il livello **trip/working**: contiene strumenti di composizione del trip corrente (tabs di navigazione interna, edit mode toggle, e ora anche il drawer del Yumeji). Il toggle vive qui perché il drawer ha senso operativo **solo dentro un trip** — serve a tirare yume verso giorni, applicare filtri trip-aware, eseguire drag&drop.

Fuori da un trip, il drawer non serve: la pagina dedicata `/yumeji` è sufficiente per browsing e management. Niente icona sparpagliata in Row 1.

**Perché niente counter**: il numero totale degli yume può essere alto (centinaia o migliaia), non porta informazione utile a colpo d'occhio, ingombra visivamente. Eliminato.

**Nome esteso**: il link nav usa **"Yumeji"** (non "Yume" o "Yume Atlas") — coerente col nome del prodotto. "Yume" resta nei microcopy del drawer (header drawer dice "I tuoi Yume", footer "Apri pagina Yumeji").

**Icona del toggle**: glifo brand custom (vedi Dec 12), non icona Tabler.

**Stati del toggle** (ispirati a `features/day/DayItem.tsx` selected state):

- **Idle** — container 28×28 trasparente, glifo `outline` `currentColor=ink` size 20. Nessun bordo.
- **Hover** — container `bg-surface-soft rounded-md`. Glifo invariato.
- **Selected (drawer aperto)** — **non un button standalone, ma un'area estesa**. Dal punto in cui starebbe l'icona fino al **bordo destro del sub-header**, lo sfondo è `bg-ink` a tutta altezza della Row 2 (continuità visiva col drawer aperto sotto). Dentro: glifo **pieno bianco** size **16** (leggermente più piccolo dell'idle), **barra arancione absolute** a `left-0` (`w-1 h-[20px] bg-orange rounded-r-[2px]`, centered verticalmente). Stesso linguaggio del giorno selezionato nella `DayList`, scalato e ruotato in orizzontale.

**Perché area estesa, non button standalone**: quando il drawer è aperto, la sezione blu del sub-header e il drawer destro formano insieme un blocco continuo che dichiara "stai dentro Yumeji". L'icona-pulsante isolata su sfondo neutro avrebbe rotto questa unità.

L'inversione "outline → pieno" tra idle e selected è funzionale: sopra il fondo `ink` scuro l'outline diventerebbe sottile e illeggibile. La barra arancione fine (`w-1` invece di `w-1.5`) marca il confine tra "regno del sub-header" e "regno del drawer".

---

### Dec 3 — Drawer destro: Hybrid Overlay→Pinned

Il drawer (340–380px) ha **due modalità con stato persistente**:

1. **Overlay (default)**: slide-in da destra con scrim leggero (`rgba(13,44,61,0.04)`), top sotto la Row 1 (e sotto Row 2 se in trip context). Dismiss con Esc o click fuori.
2. **Pinned (opt-in)**: bottone 📌 nell'header del drawer. Diventa parte del flow del layout, main shrink-a da `max-w 1280` a `~900px`. Stato persistito in `localStorage` chiave `travelgo-yumeji-pinned`.

**Auto-pin smart**: alla **prima volta** che l'utente entra in TripDayPage in edit mode, il drawer si auto-pinna. L'utente può sganciare manualmente — la scelta viene salvata.

**Perché**: l'overlay è ottimale per browsing rapido (90% degli accessi); il pinned è essenziale per drag&drop verso `ActivityList`/`Timeline`, perché entrambi devono restare visibili stabilmente. Una modalità unica non copre entrambi i casi.

---

### Dec 4 — Auto-filter geografico per gerarchia 3 livelli

> ⚠️ **Pre-requisito**: la tabella `activities` oggi ha solo `location` (text), `location_place_id` (Google Place ID), `location_lat`, `location_lng`. La gerarchia 3 livelli **non esiste ancora** nello schema. Vedi sezione [Pre-requisiti](#pre-requisiti) per il piano di onboarding di questi campi.

Ogni activity avrà una gerarchia geo: **Nazione → Regione → Città**. Esempi:

- *Italia → Italia → ∅* (campo nazionale, no dettaglio)
- *Italia → Lazio → Roma*
- *Giappone → Kanto → Tokyo*

Quando il drawer o la pagina vengono aperti **dentro un trip** (`/trips/:id/...`), il filtro destinazione si **auto-applica** con priorità città → regione → nazione del trip.

| Livello | Comportamento |
|---|---|
| Default (apertura) | Match `city = trip.city` — il più stretto, focalizzato |
| "Estendi a regione" (chip click) | Aggiunge `region = trip.region` |
| "Tutto il paese" (chip click) | Aggiunge `country_code = trip.country_code` |
| "Tutti" (chip click) | Rimuove ogni filtro geo, vista global |

**Chip header del drawer/pagina**:

```
[Per Tokyo · 5] [Tutti · 47]  ←  default in trip context
[Estendi a Kanto] [Tutto il Giappone]  ←  azioni sul chip primario
```

**Trip hints espliciti** (`trip_hints uuid[]`): se l'utente associa manualmente uno yume a un trip (es. "Aggiungi questo a Tokyo 2026" da pagina yume), compare anche se il match geo fallisce. Utile per attività senza geo (libro turistico, consiglio generico).

---

### Dec 5 — Pagina dedicata editorial à la Discovery

La pagina `/yumeji` riusa il pattern **manifest + widget library** già consolidato in `app/(design)/design/discovery/page.tsx`. La sequenza dei widget è definita da un `WidgetSpec[]` editabile (per stagione, utente, A/B test).

**Library di widget per Yumeji v1**:

- **YumejiHero** — counter ("47 yume · 3 paesi · 12 città"), ultimo aggiunto, mini-map globe con i pin
- **YumejiMap** — mappa full-width con cluster per città/regione, click su cluster → pan + filtro
- **YumejiGrid** — grid masonry à la Pinterest, immagini grandi, hover → preview + actions
- **YumejiClusters** — raggruppamento geografico automatico: *"5 yume a Tokyo · 3 a Lisbona · 2 a Roma"*, accordion
- **YumejiTripSuggestions** — *"Hai 4 yume a Stoccolma · Crea un trip"* → conversion path da yume a trip
- **YumejiFilters** — toolbar persistente (vista grid/list/map, sort, search) — sticky in alto sotto Hero
- **YumejiEditorial** — riuso di `EditorsChoice`/`PhotoMosaic` da Discovery per "Salvati di recente" o "Dimenticati"

**Manifest default**:

```ts
const YUMEJI_MANIFEST: WidgetSpec[] = [
  { type: "YumejiHero" },
  { type: "YumejiFilters" },        // sticky
  { type: "YumejiMap" },             // collassabile
  { type: "YumejiClusters" },        // o YumejiGrid in vista grid
  { type: "YumejiTripSuggestions" }, // mostrato solo se ci sono cluster ≥3 senza trip
  { type: "YumejiEditorial" },       // "Salvati di recente"
];
```

**Vista trip-filtered** (`/trips/:id/wishlist` o variante): stesso manifest, ma:

- Hero usa il titolo del trip ("Per il tuo viaggio a Tokyo")
- TripSuggestions nasconde sé stesso (siamo già in trip)
- Default vista = `grid` (più task-oriented), no map full-width

---

### Dec 6 — Drag&drop targets

La `YumejiCard` (nel drawer e nella pagina) è draggable. Drop targets nell'app:

| Source | Target | Behaviour |
|---|---|---|
| Yume card | Row `ActivityList` in TripDayPage | Popover micro "Inserisci a D2 · orario?" |
| Yume card | Slot vuoto in `Timeline` | Inserimento diretto con orario derivato dallo slot |
| Yume card | `TimelineBlock` esistente | Inserisce come adiacente (prima/dopo, gestito da hit-zone) |
| Yume card | Bin "Programma con Go" (sticky in TripDayPage) | Go propone giorno + orario automaticamente |

**Visual feedback**:

- Drag start: card `scale(0.95)`, `shadow-float`, ghost segue cursore
- Hover su target valido: bordo `var(--color-orange)`, lieve background `var(--color-orange-soft)`
- Hover su target invalido: bordo `var(--color-danger-border)`, cursor `not-allowed`
- Drop OK: snap-in animation + toast "Aggiunto a D2 · 14:30"
- Drop fallito o cancellato: ritorna alla posizione con bounce

**Implementazione**: verificare se `@dnd-kit/core` è già in dipendenze, altrimenti valutare HTML5 DnD nativo con shim per accessibility (keyboard alternative: select yume → "Aggiungi a" → menu giorni).

---

### Dec 7 — Niente source attribution

Lo yume **non traccia** da dove è stato salvato (Discovery / Go / manuale / import). Manteniamo solo `note` opzionale come campo libero ("perché l'ho salvato").

**Perché**: la complessità di tracciare la sorgente non porta valore utente né analytics ad alta priorità nella v1. Semplifica schema, UI, e onboarding. Discovery e Go avranno comunque il bottone "Salva nei tuoi yume", ma il backend non distingue.

**Conseguenze**: lo schema `yumeji_items` non include `source` / `source_ref`. Niente filtro "Source" né nella tassonomia dei chip né in "Altri filtri".

---

### Dec 8 — Soft-delete (archivio)

Lo yume non viene eliminato hard, ma archiviato (`archived_at timestamptz`). Recuperabile da una sezione "Archivio" nella pagina. Quando viene schedulato in un trip e poi il trip viene completato, lo yume **resta** — può rifarsi quel viaggio o ispirarne un altro.

**Perché**: l'utente accumula sogni nel tempo. Cancellarli è un attrito psicologico ("e se domani lo volessi di nuovo?"). L'archivio toglie il visual clutter ma preserva la memoria.

---

### Dec 9 — Struttura piatta, niente collezioni manuali

Nessuna tassonomia esplicita: niente "collezioni" nominate ("Tokyo 2027", "Quando piove"), niente cartelle, niente tag liberi creati dall'utente. La gerarchia è data **solo da filtri automatici** sui campi già presenti dello yume / activity: paese, regione, città, categoria, durata, prezzo, source, data salvataggio, stato (schedulato/da schedulare/archiviato).

**Perché**: il valore dello yumeji è "salvare velocemente senza pensare a dove metterlo". Forzare l'utente a curare collezioni introduce attrito al salvataggio (decisione prematura "in quale lista?") e crea il problema universale "alla fine cucio tutto in *Misto*". I filtri auto coprono il 90% dei casi d'uso (vedi anche `[[project_activity_softfield]]` — stessa filosofia di evitare campi obbligatori non scientifici).

**Conseguenze**:

- Niente UI per creare/editare/eliminare collezioni
- Niente concetto di "in quale collezione lo metto?" al momento del save
- Trip-binding esplicito resta possibile via `trip_hints[]` (Dec 4), ma è una scorciatoia tecnica, non una "collezione" semanticamente
- Future: se l'utente lo chiederà, valutare i **tag liberi** (più leggeri delle collezioni), mai cartelle

---

### Dec 10 — Drawer "List-Style" (pattern DayList)

Il drawer adotta il linguaggio della `features/day/DayList` (`features/day/DayItem.tsx`): **lista verticale con separatori dashed**, niente card-style con border-md. La lista è il pattern già noto dell'utente per il giorno selezionato — il drawer Yumeji parla la stessa lingua.

**Anatomia della riga del drawer**:

```
┌─────────────────────────────────────────────────┐
│ ▭▭  ASAKUSA · 1H · FREE                          │
│     Sensō-ji  [Must]                             │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ ← border-b-dashed
│ ▭▭  TOYOSU · 3H · €32                            │
│     teamLab Planets                              │
└─────────────────────────────────────────────────┘
```

- Layout grid `[40px_1fr]` (thumb · info), **niente chevron** a destra (non porta informazione utile, è clutter)
- **Eyebrow** (riga 1): `text-micro tracking-eyebrow uppercase text-orange font-medium` — combina i dati operativi `Zona · Durata · Prezzo` (replica del pattern `dow` + `dayNumber` nel DayItem, ma orizzontale)
- **Title** (riga 2): `text-meta text-ink font-medium` — il nome dell'attività con badge inline (`Must`, `D2 · 14:30`)
- **Separatore**: `border-b border-dashed border-border last:border-0` (identico DayItem)
- **Hover**: `bg-surface-soft` (identico DayItem)
- **Selected** (futuro, quando supporteremo selezione di una riga): `bg-ink text-white rounded-md my-0.5` + barra arancione absolute `-left-[3px] w-1.5 h-[20px]`. Nello sketch iniziale tutte le righe sono in hover/idle.
- **Drag**: l'intera riga è draggable (no grip handle in v1 — sarà aggiunto in fase di drag&drop più articolata)

**Top bar del drawer**:

```
┌──────────────────────────────────────────┐
│ ❉ I tuoi Yume         📌  ⤢  ✕            │ ← header (border-b-dashed)
│- - - - - - - - - - - - - - - - - - - - -  │
│ 🔍 Cerca nei tuoi yume…                   │ ← SoftField (focus on open)
│- - - - - - - - - - - - - - - - - - - - -  │
│ [Per Tokyo·5] [Tutti·12] [Da sched·8]     │ ← chip filtri
│ [Cibo·3] [Arte·2] [+ Altri filtri]        │
│- - - - - - - - - - - - - - - - - - - - -  │
└──────────────────────────────────────────┘
```

Tutti i separatori orizzontali nel drawer (header, search, chips) sono **dashed**, in continuità col pattern interno della lista.

**Search · SoftField con autofocus**:

- Componente: `<SoftField>` da `@/components/ui/SoftField` (vedi sandbox `/dev/soft-field`)
- Configurazione: `size="sm"`, `type="search"`, `placeholder="Cerca nei tuoi yume…"`
- Slot `<SoftField.Prefix>` con `IconSearch`
- **Focus automatico al mount del drawer** (apertura): `useRef` + `useEffect` che chiama `.focus()` sull'input
- Il SoftField gestisce nativamente l'hover/focus state con il ring arancione `focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]` definito nel componente

**Default chip attivo in trip context**: `Per {city}` + `Da schedulare` entrambi attivi (vedi Dec 11).

**Densità target**: 8–10 righe visibili in viewport (drawer 340×600). Per liste >50 yume, infinite scroll con virtualizzazione.

**Footer**: link `Apri pagina Yumeji` allineato a sinistra, su `bg-surface-soft`, color `text-orange-deep` font-medium. Niente freccetta — è già evidente che porta da qualche parte.

---

### Dec 11 — Tassonomia filtri auto

Visto Dec 9 (struttura piatta, niente collezioni), i filtri auto sono la **spina dorsale** dell'organizzazione. Sono strutturati in famiglie con logica **AND tra famiglie diverse, OR dentro la stessa famiglia**.

#### Famiglie

| # | Famiglia | Visibilità | Membri |
|---|---|---|---|
| A | **Reset** | Chip primario (drawer + pagina) | `Tutti · N` |
| B | **Geo** | Chip primario in trip-context, "Altri filtri" fuori | `Per {city}`, e dropdown vista mondo |
| C | **Stato** | Chip primario | `Da schedulare`, `Schedulati` (opt) |
| D | **Categoria macro** | Chip primario | `Esplora`, `Mangia`, `Dormi` (i 3 di `EXPLORE_CATEGORY_TREE`) |
| D' | **Top sub-categoria** | Chip secondario condizionale | Es. `Caffè · 3` (solo se la sub è dominante nel macro) |
| E | **Caratteristiche** | In "+ Altri filtri" | Durata, Prezzo, Solo Must |
| F | **Tempo** | In "+ Altri filtri" | Ultima settimana / mese / anno |

**Niente Source** (Dec 7): rimosso. **Niente Source filter**.

#### Macro + top sub-categoria

Per ciascuna macro categoria (`Esplora`, `Mangia`, `Dormi`) calcoliamo la sub-categoria con count più alto **nel set utente attuale**. Se:

- `count(topSub) >= 2`
- nessun pareggio con un'altra sub della stessa macro

Allora la mostriamo come **chip secondario alternativo** accanto al macro. Esempio: utente con 5 Mangia di cui 3 caffè + 2 ristoranti → chip `Mangia · 5` + `Caffè · 3`.

I due chip sono **mutuamente esclusivi visivamente nella riga**: cliccare `Caffè` deseleziona `Mangia`, e viceversa. Il chip macro continua a includere tutti i sub; il chip sub focalizza solo su un tipo. Combinazioni più fini (es. "caffè + bar") vivono nel popover "Altri filtri".

#### Popover "+ Altri filtri"

Anchor sotto il chip `+ Altri filtri`. Sezioni accordion:

- **Categorie · sotto-tipi** (checkbox per ogni sub di `EXPLORE_CATEGORY_TREE`)
- **Caratteristiche** (Durata `<1h`/`1-3h`/`3-6h`/`>6h`, Prezzo `Gratis`/`€`/`€€`/`€€€`, `Solo Must`)
- **Salvato** (radio: ultima settimana / mese / anno / tutti)
- **Geo (vista mondo)** — search inline + lista paesi/città con count (visibile sempre, anche fuori da trip-context)
- **`☐ Includi archiviati`** — toggle in fondo

Footer del popover: counter di filtri attivi + bottone `Reset · N`.

#### Default in trip context

Quando il drawer/pagina si apre dentro `/trips/:id/...`, sono attivi di default **due chip insieme**:

- `Per {city} · N` (famiglia Geo)
- `Da schedulare · N` (famiglia Stato)

**Perché**: dentro un trip, il workflow primario è "porto idee a Tokyo nei giorni" — vedere subito i candidati al drag-into-day è il massimo allineamento col task. L'utente che vuole tutta la collezione Tokyo (anche schedulati) clicca via `Da schedulare`. Lo schedulato resta visibile in modo passivo via il chip `Schedulati` (opt).

#### Persistenza

| Vista | Persistenza | Razionale |
|---|---|---|
| Drawer | **Reset a ogni apertura** | Si apre per browsing rapido, stato fresco è meno disorientante |
| Pagina `/yumeji` | Persistito in `localStorage` chiave `travelgo-yumeji-filters` | Sessione di lavoro continuativa |

Il chip geo `Per {city}` non è "persistenza", è auto-applicato sempre se il context è un trip.

#### Empty state filtrato

Quando i filtri producono zero match, in-card sopra l'elenco vuoto:

```
Nessuno yume con questi filtri
[Reset filtri]
```

Con copy che cita il numero di filtri attivi ("Hai 3 filtri attivi che escludono tutto") per aiutare l'utente a capire cosa togliere.

#### Combinatorica

- AND tra famiglie diverse
- OR dentro la stessa famiglia (eccezione: macro/top-sub sono mutuamente esclusivi, vedi sopra)
- `Tutti` è reset, non si combina

---

### Dec 12 — Icona Yumeji: glifo brand custom (pin + sparkle)

Adottato un **glifo brand proprietario** per il toggle del drawer: un map-pin che contiene uno sparkle a 4 punte (stella concava). Comunica "luogo speciale salvato" — pin = geografia, sparkle = desiderio/sogno.

**Asset**:

- `public/yumeji-pin.svg` — versione **piena** (fill solido), usata nello stato **selected** sopra `bg-ink` (currentColor = white)
- `public/yumeji-pin-outline.svg` — versione **outline** (stroke 1.8, sub-paths separati pin+sparkle), usata in **idle/hover** sopra surface (currentColor = ink)

**Dimensioni**:

- Header sub-bar toggle: 15×20px dentro container 28×28
- Card del drawer / pagina (futuri usi): scalabile, viewBox `0 0 24 32` mantiene proporzione 3:4 verticale

**Importazione**:

- Come Next/SVG component (`@/components/ui/icons/YumejiPin.tsx`, da creare): wrap dell'SVG con prop `variant: 'filled' | 'outline'`, `size`, `className`
- In alternativa, `<img src="/yumeji-pin-outline.svg">` per uso quick nello sketch

**Perché niente Tabler**:

- `ti-bookmark` era placeholder generico
- `ti-sparkles` riservato a Go AI
- Il glifo brand è distintivo e supporta meglio l'identità Yumeji come prodotto-nel-prodotto

**Candidati Tabler scartati durante l'esplorazione**:

- `ti-route`, `ti-moon-stars`, `ti-flag`, `ti-layout-sidebar-right` — tutti più generici o non coerenti con la dimensione emotiva del Yumeji

---

## Anatomia

### Header · nav Row 1 + toggle Row 2

```
┌──────────────────────────────────────────────────────────────────┐
│ 五 TravelGo   My trips · Explore · Yumeji          🇮🇹 👤        │  ← Row 1
├──────────────────────────────────────────────────────────────────┤
│ TOKYO 2026 · Day 2 of 5   Tabs   |   ● View mode    [❉]          │  ← Row 2 (solo in trip)
└──────────────────────────────────────────────────────────────────┘
                                                       ↑
                                                       toggle pin-yumeji
                                                       (apre drawer destro)
```

**Row 1 nav** (sempre visibile per utenti loggati):

- Pattern identico agli altri nav item (`<Link>` con underline arancio quando active)
- Posizione: dopo `Explore` (`features/app/AppHeader.tsx` riga 75-80)
- Label: **"Yumeji"** (nome esteso del prodotto)
- href: `/yumeji`

**Row 2 toggle** (visibile solo se `hasTripContext`):

- Posizione: estrema destra del sub-header, dopo l'ultimo action chip (`View mode` o `Edit mode`)
- Stati:
  - **Idle** — button ghost 28×28 `rounded-md` `bg-transparent`, glifo outline (`yumeji-pin-outline.svg`, stroke 1.8) `text-ink` size 20px
  - **Hover** — `bg-surface-soft`
  - **Selected** — **non più un button standalone**: l'area dal punto del toggle al bordo destro del sub-header diventa `bg-ink` a tutta altezza Row 2. Dentro: glifo `yumeji-pin.svg` pieno bianco size **16** (più piccolo); **barra arancione** absolute `left-0 w-1 h-[20px] bg-orange rounded-r-[2px]` (più fine del DayItem, marca il confine col regno blu del drawer)
- Tooltip: "Apri Yumeji" / "Chiudi Yumeji"
- Niente counter, niente badge

**Fuori da trip-context**: Row 2 non c'è → il toggle non è raggiungibile dall'header. L'utente accede al Yumeji solo via il link `Yumeji` in Row 1, che porta alla pagina dedicata.

### Drawer aperto (overlay default)

```
┌─ ⨊ Yumeji ───────────────── 📌 ⤢ ✕ ┐
│ 🔍 Cerca nei tuoi yume...           │
│                                     │
│ [Per Tokyo·5] [Tutti·47]            │
│ [Da schedulare·8] [Cibo·3] [Arte·2] │
│                                     │
│ ▮ ▭ Sensō-ji      Tokyo · 1h        │ ← draggable
│ ▮ ▭ teamLab       Tokyo · 3h        │
│ ▮ ▭ Tsukiji       Tokyo · 2h        │
│ ▮ ▭ Park Güell    Barça · 2h        │
│ ...                                 │
│                                     │
│ Apri pagina Yumeji →                │
└─────────────────────────────────────┘
```

Specs:

- Width 340–380px, `position: fixed; right: 0; top: <below header>`
- Background `var(--color-surface)`, border-left `var(--color-border)`
- Pinned mode: border-left rimosso, parte del flow normale, main shrink
- Search: pill simile alle search box di Discovery
- Chip filtri: pattern già definito in wishlist sketch (`FilterChips`)
- Card compact: thumb 36px + nome + meta + handle drag (visibile su hover)
- Footer: link a `/yumeji`

### Pagina `/yumeji`

```
┌───────────────────────────────────────────────────────────────┐
│ [YumejiHero — 47 yume · 3 paesi · 12 città · ultimo: Sensō-ji]│
│                                                               │
│ [YumejiFilters — grid/list/map · sort · search]               │
│                                                               │
│ ┌─ YumejiMap (full-width) — Tokyo·12 · Lisbon·8 · Roma·5 ──┐ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ [YumejiClusters — accordion per città/regione]                │
│                                                               │
│ [YumejiTripSuggestions — "4 yume a Stoccolma · Crea un trip"] │
│                                                               │
│ [YumejiEditorial — "Salvati di recente" mosaic]               │
└───────────────────────────────────────────────────────────────┘
```

---

## Modello dati

### Tabella `yumeji_items`

```sql
create table yumeji_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  activity_id     uuid not null references activities(id) on delete cascade,
  saved_at        timestamptz not null default now(),
  note            text,
  trip_hints      uuid[] default '{}',
  archived_at     timestamptz,
  unique (user_id, activity_id)
);

create index yumeji_items_user_saved_idx
  on yumeji_items (user_id, saved_at desc) where archived_at is null;

create index yumeji_items_trip_hints_idx
  on yumeji_items using gin (trip_hints);

-- RLS
alter table yumeji_items enable row level security;
create policy "users own their yumeji" on yumeji_items
  for all using (auth.uid() = user_id);
```

**Vincoli**:

- `unique (user_id, activity_id)`: stessa activity una sola volta per utente. Re-save no-op (idempotente).
- `activities` dovrà avere i campi `country_code`, `region`, `city` — **non presenti oggi**, vedi [Pre-requisiti](#pre-requisiti).

### Query base — drawer in trip context

```sql
-- Default: city match
select y.*, a.*
from yumeji_items y
join activities a on a.id = y.activity_id
where y.user_id = $1
  and y.archived_at is null
  and (
    a.city = $trip_city
    or $trip_id = any(y.trip_hints)
  )
order by y.saved_at desc
limit 50;
```

Scope espanso (regione / nazione): si aggiunge `or a.region = $trip_region` o `or a.country_code = $trip_country` al WHERE in base al chip attivo.

### Schedulazione

Drag su un giorno → crea `day_activities` con FK ad `activity_id`. Lo yume **resta** in `yumeji_items` ma la card mostra il badge "D2 · 14:30" via join. Stesso pattern del sketch wishlist attuale.

---

## API

### Server (DAL repository)

```ts
// lib/dal/yumeji.ts
export type YumejiScope = 'city' | 'region' | 'country' | 'all';

export class YumejiRepository {
  list(userId: string, opts?: { search?: string; filters?: YumejiFilters; limit?: number; offset?: number }): Promise<YumejiItem[]>
  listForTrip(userId: string, tripId: string, scope: YumejiScope, opts?: { filters?: YumejiFilters }): Promise<YumejiItem[]>
  add(userId: string, activityId: string, opts?: { note?: string; tripHints?: string[] }): Promise<YumejiItem>
  addBulk(userId: string, activityIds: string[]): Promise<YumejiItem[]>
  setTripHint(itemId: string, tripId: string, on: boolean): Promise<void>
  archive(itemId: string): Promise<void>
  unarchive(itemId: string): Promise<void>
  count(userId: string): Promise<{ total: number; byCountry: Record<string, number>; byCity: Record<string, number>; byMacro: Record<string, number> }>
}
```

### Client (hooks)

```ts
useYumeji()                      // lista globale + count, cached
useYumejiForTrip(tripId, scope)  // lista filtrata trip-aware, default scope='city'
useYume(activityId)              // single item lookup (per pulsante "Salvato/Salva")
useAddYume()                     // mutation
useScheduleYume()                // mutation che crea day_activities (no rimozione dello yume)
useArchiveYume()                 // mutation
```

---

## Componenti React (proposta)

```
features/yumeji/
  YumejiPillTrigger.tsx     # icona + counter nell'AppHeader Row 1
  YumejiDrawer.tsx          # overlay/pinned container, gestisce stato pinned via localStorage
  YumejiDrawerContent.tsx   # search + filters + lista (riusato anche in /trips/[id]/wishlist)
  YumejiCard.tsx            # card completa per pagina (riuso da WishlistCard sketch)
  YumejiCardCompact.tsx     # variante drawer (più piccola)
  YumejiPage.tsx            # pagina dedicata, manifest+widget
  widgets/
    YumejiHero.tsx
    YumejiMap.tsx
    YumejiGrid.tsx
    YumejiClusters.tsx
    YumejiTripSuggestions.tsx
    YumejiFilters.tsx
    YumejiEditorial.tsx
  hooks/
    useYumeji.ts
    useYumejiTripContext.ts  # auto-filter geo per trip corrente
  dnd/
    DragHandle.tsx
    YumejiDropZone.tsx       # wrap per ActivityList/Timeline target
    useYumejiDrop.ts

app/(app)/yumeji/page.tsx            # /yumeji global view
app/(app)/trips/[id]/wishlist/page.tsx  # vista trip-filtered (riuso YumejiDrawerContent in modalità page)
```

---

## i18n

Le chiavi vivono in `messages/{en,it}.json`:

```json
"Yumeji": {
  "name": "Yumeji",
  "shortName": "Yume",
  "tagline": "Il sentiero dei sogni",
  "headerPill": "Yume",
  "headerPillCount": "{count}",
  "drawer.title": "I tuoi yume",
  "drawer.search": "Cerca nei tuoi yume…",
  "drawer.empty.title": "Non hai ancora salvato niente",
  "drawer.empty.cta": "Esplora Discovery",
  "drawer.openPage": "Apri pagina Yumeji",
  "page.title": "Yumeji · Il sentiero dei sogni",
  "page.subtitle": "{count} luoghi, esperienze e idee per i tuoi prossimi viaggi",
  "filter.forDestination": "Per {destination} · {count}",
  "filter.all": "Tutti · {count}",
  "filter.unscheduled": "Da schedulare · {count}",
  "filter.extendToRegion": "Estendi a {region}",
  "filter.extendToCountry": "Tutto {country}",
  "tripSuggestion": "Hai {count} yume a {destination}. Vuoi creare un trip?",
  "schedule.toast": "Aggiunto a D{day} · {time}",
  "save.toast": "Salvato nei tuoi yume",
  "tooltip.firstTime": "Yumeji 夢路 — \"sentiero dei sogni\". I tuoi luoghi salvati da tutto il mondo."
}
```

**Nome non tradotto**: il nome **Yumeji** resta invariato in tutte le locali (come "TravelGo", "Go"). Il significato 夢路 viene mostrato in un tooltip onboarding al primo passaggio sull'icona.

---

## Riusi previsti

- `WishlistCard` da `/design/wishlist` → promuovere a `YumejiCard` in `features/yumeji/`
- `SchedulePopover` da `/design/wishlist` → invariato, riusato come popover di scheduling
- `TripNav` da `/design/wishlist` → estrarre come componente condiviso (era già nei riusi previsti del wishlist sketch)
- `EditorsChoice`, `PhotoMosaic`, `RegionTileGrid` da `/design/discovery` → riadattare per `YumejiEditorial` e fonti visive
- `RouteMap` da `components/ui/Map` → base per `YumejiMap` globale (estensione cluster + filtro)
- Pattern manifest `WidgetSpec[]` da `/design/discovery` → riuso identico per `YumejiPage`

---

## Edge cases & open questions

1. **Yume senza geo** (libro turistico, consiglio generico) — match per trip fallisce. Visibilità: appare sempre in "Tutti", appare in vista trip solo via `trip_hints` esplicito.
2. **Yume salvato da Go** — Go propone già attività nelle sue risposte (`features/go/widget-registry.ts`). Aggiungere bottone "Salva nei tuoi yume" nei widget output rilevanti.
3. **Duplicati activity in DB** — se Discovery propone "Sensō-ji" ma esiste già nello stesso ID, il save referenzia l'esistente. Se è entità nuova, si crea l'activity al momento del save.
4. **Performance lista grande** — utente con 500+ yume: paginazione + infinite scroll nella pagina; prima 50 nel drawer con "Carica altro".
5. **Sync con wishlist trip-bound legacy** — la pagina `/trips/:id/wishlist` resta come vista trip-filtered? O viene assorbita dal drawer? Decidere alla fine del prototipo.
6. **Sharing** — uno yume condiviso (link permalink)? Future scope. La tabella ha già il source `share` come ricevitore.
7. **Onboarding** — primo accesso dopo migration: zero yume. Stato vuoto suggerisce Discovery / "Yumeji starter pack" / "Importa da bookmark browser?".
8. **Glifo icona** — `ti-sparkles` come placeholder; valutare se Tabler ha qualcosa di più "geografico-onirico", o se vale la pena di disegnare un glifo proprietario 夢 in stile coerente con 五.
9. **Accessibilità DnD** — drag&drop con mouse va bene, serve keyboard alternative: focus su yume → menu "Aggiungi a…" → lista giorni del trip corrente.

---

## Stato sketch (2026-05-22)

- [x] Spec viva (questo doc)
- [ ] Sketch `/design/yumeji` con stati stackati:
  - [ ] 1 · Drawer overlay aperto da pagina trip (chip "Per Tokyo" attivo)
  - [ ] 2 · Drawer pinned in TripDayPage (D&D pronto)
  - [ ] 3 · Drag&drop in azione — ghost card sospesa sopra Timeline
  - [ ] 4 · Pagina `/yumeji` global (Hero + Map + Clusters + TripSuggestions)
  - [ ] 5 · Pagina filtered per trip (`/trips/:id/wishlist`)
  - [ ] 6 · Empty state — primo accesso
  - [ ] 7 · Pill header in tutti i contesti (logged, mobile, attivo)
- [ ] Migrazione DB: `yumeji_items` + RLS
- [ ] DAL `lib/dal/yumeji.ts`
- [ ] Componenti `features/yumeji/`
- [ ] Pagina `app/(app)/yumeji/page.tsx`
- [ ] Integrazione `AppHeader.tsx` (pill trigger)
- [ ] Drop zone wrappers in `ActivityList` / `Timeline`
- [ ] Bottone "Salva nei tuoi yume" nei widget Go (`features/go/widget-registry.ts`) e Discovery
- [ ] Microcopy i18n `Yumeji.*` (en, it)
- [ ] Decisione finale su `/trips/:id/wishlist`: assorbita o vista filtered
- [ ] Test drag&drop accessibility (keyboard nav)
- [ ] **Pre-req**: migrazione `activities` con `country_code`, `region`, `city` + backfill da Google Place
- [ ] **Pre-req**: vista `trips` → gerarchia geo (campo o join)

---

## Pre-requisiti

Lo Yumeji dipende da due lavori da fare **prima** dell'implementazione completa.

### Pre-1 · Gerarchia geo su `activities`

La tabella `activities` (vedi `supabase/migrations/20260519_activities_independence.sql`) oggi ha solo:

```
location          text          -- testo libero "Sensō-ji, Asakusa, Tokyo"
location_place_id text          -- Google Place ID
location_lat      numeric
location_lng      numeric
```

Per il match destinazione del Yumeji servono campi strutturati:

```sql
alter table activities
  add column country_code text,     -- ISO 3166-1 alpha-2: 'JP', 'IT'
  add column region       text,     -- es. 'Kanto', 'Lazio'
  add column city         text;     -- es. 'Tokyo', 'Roma'

create index on activities (country_code);
create index on activities (city);
```

**Sorgente dei dati**: parsing del Google Place response (`address_components` ha già `country`, `administrative_area_level_1`, `locality`). Per le activities esistenti, backfill via batch script che chiama Place Details API o reverse-geocoding.

**Decisione aperta**: dove fare il match? Lato Postgres (più semplice, esatto string match) o lato applicazione con normalizzazione (es. "Tokyo" e "東京" matchano)? Per la v1, string match esatto, basta che il backfill sia consistente.

### Pre-2 · Vista trip → gerarchia geo

Il `trips` schema deve esporre `country_code`, `region`, `city` (o un join con la destination principale). Verificare lo schema attuale e aggiungere se mancante. Per trip multi-destinazione (Tokyo + Osaka), la "destination principale" potrebbe essere la prima o serve un campo dedicato — da decidere nel design del trip schema.

---

## Riferimenti incrociati

- Sketch wishlist trip-bound: `app/(design)/design/wishlist/page.tsx`
- Stile editorial reference: `app/(design)/design/discovery/page.tsx`
- AppHeader esistente: `features/app/AppHeader.tsx`
- Design system tokens: `app/globals.css`
- Linguaggio Go (widget registry, prompt): `features/go/widget-registry.ts`, `features/go/prompt.ts`
- Schema activities corrente: `supabase/migrations/20260519_activities_independence.sql`

---

## Prossimi step

1. Validare questa spec (review pass)
2. Costruire sketch in `app/(design)/design/yumeji/page.tsx` con 7 stati stackati (Frame + StateLabel pattern del wishlist sketch)
3. Validare in browser, raccogliere feedback
4. Iterare la spec
5. Pianificare migrazione DB e ordine componenti
6. Implementazione reale
