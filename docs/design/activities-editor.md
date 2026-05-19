# Activities Editor · spec di design

**Ultimo aggiornamento:** 2026-05-18
**Stato:** Activities Editor (Builder + Day) con scope v1 definito · separazione entità/istanza · **2 AI moments** distinti (trip-level nel Builder, day-level nel Day Editor) · Day Editor embedded · activity autocomplete + 2 affordance · 27 decisioni · sketch React in `app/(design)/design/activities-editor/`
**Snapshot HTML frozen (display Spine):** `public/design/timeline-spine.html`
**Doc correlato:** [safari.md](./safari.md) — Safari/Scoperta, la fase di collezione che alimenta la Wishlist
**Sketch React:**

- Overview: `/design/activities-editor` → `app/(design)/design/activities-editor/page.tsx`
- Builder (ASSIGNMENT): `/design/activities-editor/builder` → `.../activities-editor/builder/page.tsx`
- Day editor (SCHEDULING): `/design/activities-editor/day` → `.../activities-editor/day/page.tsx`
- Activity Detail (IDENTITY) — TBD, non ancora creato

---

## Obiettivo

Progettare l'**Activities Editor**: la famiglia di strumenti con cui l'utente compone e affina la timeline di un viaggio. Lavora a livello di **istanza** (un'attività in uno specifico giorno) — non di **entità** (Sensō-ji come "thing", con i suoi dettagli generali).

La timeline finale (vista in consumption) è una **timeline verticale** con LIVE block sticky on top, pensata per l'utente "in viaggio" che vuole solo seguire le istruzioni senza decidere.

Il viaggiatore prepara tutto il cronoprogramma prima di partire. In vacanza l'app si limita a dirgli **cosa sta facendo ora**, **cosa segue**, e **come arrivarci**.

### Tre livelli (gerarchia · drill-down)

- **Builder** · ASSIGNMENT level — quale attività in quale giorno. Two-pane, wishlist sx + giorni dx. Drag dalla wishlist, AI organize, swap tra giorni.
- **Day editor** · SCHEDULING level — quando, in che ordine, con quali ponti. Inline edit di un singolo giorno. Time, fuzzy flag, note di istanza, bridges.
- **Activity Detail** · IDENTITY level — il "posto" come entità (nome, foto, indirizzo, descrizione, ore d'apertura). **Pagina separata**, raggiungibile dal click sul nome di un'attività. Non ancora disegnata.

Il problema ha due facce dentro questo doc:

- **Display** — come la timeline appare al viaggiatore. Layout, stati, contesto.
- **Creazione assistita** — come il viaggiatore *costruisce* la timeline (prep o live), supportato da automazioni e AI quando serve.

Condividono il modello atomico dei blocchi: deciso una volta, vale per entrambi.

### Tipi di sessione che lo strumento deve servire

- **Pianificazione lenta** — settimane prima, al PC, sessione lunga e profonda.
- **Pianificazione veloce** — il giorno prima o la mattina stessa, mobile, tocchi rapidi.
- **Adattamento live** — siamo in viaggio, qualcosa salta, si ribilancia al volo.

---

## Modello concettuale · entità vs istanza

**Insight chiave (2026-05-18):** un'attività ha due vite distinte.

### Entità (il posto come "thing")

`Sensō-ji` è un tempio a Tokyo. Esiste nel mondo. Ha proprietà che non cambiano da viaggio a viaggio:

- Nome, foto, indirizzo geocoded
- Descrizione lunga ("Il tempio è dedicato alla dea Kannon ed è stato costruito nel 7 secolo. La leggenda racconta che la statua della dea per cui fu costruito il tempio venne pescata nelle acque del Sumida-gawa...")
- Ore d'apertura, last entry
- Categoria, tag, rating
- Sito, telefono, link prenotazione
- Source attribution (Lonely Planet, blog X, Go suggest, manualmente)

Una entità vive **nella Wishlist** (raccolta personale) e potenzialmente nel **database community** di TravelGo (futuro).

### Istanza (l'attività nella timeline)

`Sensō-ji alle 08:00 del giorno 2 di Tokyo Aug 2026` è una **istanza** della entità. Proprietà specifiche di questa visita:

- `entity_id` → riferimento all'entità (oppure null per blocchi free-form tipo "uscita albergo" o "giro intorno all'hotel")
- `day_id`, `position` nel giorno
- `time`, `duration_override` (può differire dalla durata suggerita dall'entità)
- `fuzzy: true|false` (vedi decisione 10)
- `instance_note` ("Foto con calma, vedi i negozietti di Nakamise" — note che valgono solo per questa visita)
- `booking_status` (todo / booked / paid)
- `booking_ref` (numero biglietto)
- `bridge_in`, `bridge_out` (modo + tempo + linea verso/dal blocco adiacente)

### Implicazioni UX

| Voglio modificare… | Vado in… |
|---|---|
| Quando faccio Sensō-ji nel mio viaggio | Day editor (SCHEDULING) |
| Se è fuzzy o preciso | Day editor (SCHEDULING) |
| La sua posizione nel giorno | Day editor (drag) o Builder (swap tra giorni) |
| Il ponte che ci porta | Day editor (bridge editor inline) |
| Il nome del posto, l'indirizzo, la descrizione lunga, la foto | **Activity Detail (IDENTITY, pagina separata)** |
| Le note specifiche per questo viaggio | Day editor (pencil su blocco → instance popover) |
| Quale giorno del viaggio | Builder (drag dalla wishlist a un giorno diverso) |

I blocchi **free-form senza entità** (uscita albergo, "giro intorno all'hotel", "fai check-out", "preleva yen") vivono solo come istanza: nascono nella timeline e non vanno in wishlist. Non hanno una pagina detail perché non c'è un'entità sotto.

---

## Suddivisione delle responsabilità di editing

Matrice esaustiva di **cosa si fa dove**, per evitare di sparpagliare funzionalità e generare confusione.

| Funzionalità | Builder | Day editor | Activity Detail |
|---|---|---|---|
| Drag dalla wishlist a un giorno | ✓ | — | — |
| Spostare un'attività da un giorno a un altro | ✓ (drag) | — (escape "Apri nel builder") | — |
| AI organize l'intero viaggio (trip-level: distribuisce wishlist nei giorni + prima passata orari) | ✓ (hero CTA al primo open) | — | — |
| AI organize this day (day-level: rifinisce orari, ordine, ponti di un singolo giorno) | — | ✓ (toolbar "Organize this day") | — |
| Aggiungere un blocco free-form (fuzzy o no) | — | ✓ (`+ aggiungi blocco` hover-reveal) | — |
| Riordinare blocchi dentro un giorno | — | ✓ (drag handle) | — |
| Editare orario / durata / fuzzy flag di una istanza | — | ✓ (pencil → instance popover) | — |
| Editare note specifiche del viaggio | — | ✓ (pencil → instance popover) | — |
| Editare ponte (mezzo, tempo, linea, libero) | — | ✓ (click sul bridge → inline expand) | — |
| Rimuovere un'attività dal giorno | — | ✓ (trash) · entità resta in wishlist | — |
| Eliminare definitivamente un'entità dalla wishlist | ✓ (wishlist context menu) | — | ✓ ("Delete activity") |
| Cambiare nome, foto, indirizzo del posto | — | — | ✓ |
| Editare la descrizione lunga del posto | — | — | ✓ |
| Vedere in quali giorni di quali viaggi è usata | — | — | ✓ (lista "Used in") |
| Aprire la pagina di una attività | ✓ (click su nome) | ✓ (click su nome blocco) | — |

### Drill-down naturale

`Builder (trip)` → click su giorno → `Day editor` → click su nome blocco → `Activity Detail (entità)`.

A ogni livello: scope più stretto, dettaglio maggiore, escape per tornare sopra.

### Implicazione importante sul "pencil"

Il pencil nel day editor **non apre la pagina entità**. Apre un piccolo popover/inline form con SOLO i campi di istanza (time, fuzzy, instance_note, booking_status). Per modificare i campi entità (nome, descrizione lunga, foto), si clicca sul **nome del blocco** — quel click naviga ad Activity Detail.

---

## Roadmap · v1 / v1.5 / v2+

Prima cut della scope. Iterabile man mano che le decisioni maturano.

### v1 · scope minimo del primo rilascio

**Display**
- Spine timeline verticale, LIVE block sticky on top (decisioni 3, 5)
- Blocchi atomici: Luogo, Spostamento (come ponti), Pasto, Pausa, Azione operativa (decisione 1)
- Ponti chiusi (minimum info) + espandibili al click (decisione 2)
- Past collapsato, divider Now, pull quote da note utente
- Affluenza prevista + notifiche importanti (decisione 4)
- Blocchi fuzzy con visual distinto (decisione 10)
- Pill stati: `booked` / `paid` / `todo` / `last entry`

**Creazione (Timeline builder)**
- Flusso ibrido: hero CTA al primo open → loading AI → workshop con banner (decisione 12)
- Two-pane permanente: wishlist a sinistra, giorni a destra (decisione 13)
- Drag manuale dalla wishlist + AI per-day "riempi" / "rigenera" (decisione 14)
- Mezzo principale trip-level + auto-bridge via Google Directions (decisione 8)
- Wishlist data model da zero (decisione 9) — versione minima sufficiente per il builder
- AI semi-autopilota: organizza dopo collezione, editing manuale sempre possibile (decisione 7)

**Day editor**
- View ↔ Edit toggle inline, stesso view (decisione 15)
- Affordance pencil/trash/drag handle per blocco (decisione 16)
- `+ aggiungi blocco` hover-reveal con composer inline + type chips (decisione 17)
- Bridge editor inline con selettore mezzo e tempo libero (decisione 18)
- Auto-save + sticky footer Done/Cancel
- Escape "Apri nel builder" (decisione 19)

**Safari (assunto popolato, parcheggiato il design — decisione 11)**
- Versione minima funzionale per popolare la Wishlist: almeno **search + autocomplete Google Places** + **AI Go suggest**.
- Tutto il resto rimandato (vedi [safari.md](./safari.md)).

### v1.5 · piccoli wins post-v1

- **Safari MVP completo**: + import URL (parser blog/articolo) + view mappa esplorativa.
- **Conflict detection** in edit/builder: warning rosso quando open hours collidono o tempistiche non reggono.
- **Mobile layout** completo (oggi `min-h-screen` ma layout dei due pannelli stretti vanno ripensati).
- **Multi-utente trip**: wishlist sincronizzata tra compagni di viaggio.
- **Beat narrativo** come sesto tipo atomico (oggi out v1).
- **Auto-cluster geografico**: il builder propone "Day 3 sono tutti vicini, ridistribuisco?".

### v2+ · parcheggiati

**Contesto ambientale (display)**
- Meteo per fascia oraria
- Sunrise / sunset / golden hour
- Light condition per le foto
- Calendario locale (festività, mercati settimanali)

**Layer pratico-tattico**
- Frase locale del momento ("kore wo kudasai")
- Etichetta culturale (togliere scarpe, no foto, no mancia)
- Mezzo di pagamento atteso (cash only / IC / carta)
- QR prenotazione direttamente sul blocco
- Bagno / acqua / wifi più vicino
- Backup plan pioggia / coda

**Layer meta**
- Energia del giorno (leggero / medio / denso)
- Reminder sottili (idratazione, ricarica)
- Stato budget giornaliero
- Microstoria Go inline (deck + intermezzi nel day view)
- Foto-momento (bucket veloce per le foto del blocco appena vissuto)

**Safari avanzato**
- Import da Instagram / TikTok / Pinterest / Google Maps
- Database community TravelGo (ranked, moderated)
- Camera scan (OCR poster/menu/biglietti)
- Voice memo input
- Email/calendar scan (Gmail/Outlook integration)
- Reservation systems (OpenTable, TheFork, Resy)

**Creazione avanzata**
- Slash commands (`/luogo`, `/pranzo`, `/azione`)
- Voice input ("Go aggiungi pausa caffè dopo Senso-ji")
- Stress test (simulazione tempi reali con buffer)
- Match my vibe (preferenze utente raccolte e applicate)
- Template di giorno (Classic Tokyo, Rest day, ecc.)
- AI proattiva (Go propone senza essere chiamata)
- Cross-day drag (sposta blocco da Day 2 a Day 4 senza riaprire il builder)
- Wishlist export/import (JSON, KML)

---

## A · Brainstorm display (5 livelli)

### Livello 1 — Blocchi atomici della timeline

Ogni riga della timeline è uno di questi tipi:

- **Luogo** — visita a un posto specifico (tempio, ristorante, museo, viewpoint).
- **Spostamento** — il "come ci arrivo" da A a B. Trattato a parte (vedi decisione 2).
- **Pasto** — colazione, pranzo, cena, aperitivo, snack. Può essere preciso ("Daikokuya") o aperto ("trova un tachigui ramen qui intorno").
- **Pausa / esplorazione libera** — "wander Yanaka", "tempo libero", "siediti al parco a leggere".
- **Azione operativa** — "preleva yen", "check-out", "compra IC card", "ritira biglietti al konbini".
- ~~**Beat narrativo**~~ — *out of scope v1.* Momenti emotivi puri tipo "guarda l'alba" o "scrivi a te del futuro".

### Livello 2 — Stati / proprietà di ogni blocco

- Orario (puntuale o fascia)
- Durata stimata
- Specificità: preciso vs flessibile
- Stato prenotazione: `todo` / `booked` / `paid` / `done`
- Stato real-time: `upcoming` / `now` / `done` / `skipped` / `late`
- Costo previsto
- Foto / link / mappa
- Note utente verbatim (come oggi)
- Open hours + warning "last entry"
- Dipendenze a cascata (se ritardi su uno, gli orari dopo slittano)

### Livello 3 — Contesto ambientale (selezione v1)

- ✅ **Affluenza prevista** in quella fascia (low / medium / high)
- ✅ **Notifiche importanti** (sciopero treni, chiusura imprevista, evento speciale, allerta)
- ⏸️ Meteo per fascia oraria — *out v1*
- ⏸️ Sunrise / sunset — *out v1*
- ⏸️ Light condition foto — *out v1*
- ⏸️ Calendario locale / festività / mercati settimanali — *out v1*

### Livello 4 — Layer pratico-tattico (decisione rimandata)

Idee da valutare per v1.5 / v2:

- Frase locale del momento ("kore wo kudasai" al banco)
- Etichetta culturale ("togliere le scarpe", "no foto qui", "no mancia")
- Mezzo di pagamento atteso (cash only / IC card / carta ok)
- QR code prenotazione direttamente sul blocco
- Bagno / acqua / wifi più vicino
- Backup plan se piove o se c'è coda

### Livello 5 — Layer meta / accompagnamento

- ✅ **"What now?" / blocco LIVE sticky in cima** (vedi decisione 3)
- ⏸️ Energia del giorno (leggero / medio / denso)
- ⏸️ Reminder sottili (idratazione, ricarica telefono)
- ⏸️ Stato budget giornaliero (speso / previsto / restante)
- ⏸️ Microstoria di Go (deck riassunto del giorno, può venire dal Day Magazine già pensato)
- ⏸️ Foto-momento (bucket veloce per le foto del blocco appena vissuto)

---

## B · Brainstorm creazione assistita (5 dimensioni)

### 1. Sorgenti di un blocco

Da dove arrivano gli eventi che finiscono in timeline:

- **Wishlist** — posti accumulati durante la fase prep (o prima ancora di sapere il giorno). Drag dalla wishlist alla timeline.
- **Ricerca di un posto** — autocomplete Google Places. "Senso-ji" → click → blocco.
- **AI Suggest** — chiedo a Go: "qualcosa di iconico ad Asakusa la mattina presto". Card → accetto → entra in timeline. Pattern già esistente nel progetto.
- **Template di giorno** — bundle pronti ("Classic Tokyo · day 1", "Rest day", "Day trip da X") che parto a personalizzare.
- **Duplica giorno** — copio Day 2 → scheletro di Day 5.
- **Da rotta sulla mappa** — disegno un percorso, il sistema propone i POI lungo quella rotta.
- **Feed curated** — "Top esperienze a Tokyo", swipe-like, salva o aggiungi al giorno.
- **Manuale puro** — nome + orario, senza lookup. Per "uscita albergo" e note operative simili.
- **Voce** — "Go, aggiungi una pausa caffè dopo Sensoji". Niente da scrivere.

### 2. Modalità di composizione

Come compongo mentre costruisco:

- **Inline composer** — alla fine della timeline, "+" persistente apre menu compatto (Cerca · Wishlist · AI · Manuale). Stile Notion "/".
- **Slash commands** — `/luogo Senso-ji`, `/cammina 8 min`, `/pranzo flessibile`, `/azione ritira biglietti`. Power user.
- **Two-pane workshop** — Timeline a sinistra (drop target), sorgenti a destra (wishlist + ricerca + chat Go + mappa, tab-switch). Drag&drop da destra a sinistra.
- **Chat-first** — Tutta la creazione passa da Go: descrivo cosa voglio, propone, accetto / modifico. Conversazionale.
- **Swipe da feed** — Tinder-style: AI mostra una card alla volta, swipe sì/no → accumulo in timeline.
- **Mappa-first** — Apro la mappa, tap-tap sui POI, ognuno aggiunge a timeline.
- **Drag in batch** — Multi-select sulla wishlist, drop tutti in un giorno → AI ordina e tempora.

### 3. Automazioni "silenziose"

Cose che il sistema fa senza chiedere:

- **Auto-time** — dato l'orario di start e durate stimate (Google Places + euristica), riempie orari a cascata.
- **Auto-bridge** — tra A e B, calcola modo + durata + linea (Google Directions). Riempie il ponte da solo.
- **Auto-mealtime** — vede 6 ore senza pasto, suggerisce slot lunch/dinner come placeholder flessibile.
- **Auto-cluster geografico** — 5 posti in ordine sparso → riordinamento per minimizzare spostamenti.
- **Conflict detection** — Senso-ji chiude alle 17, ce l'ho a 17:30 → warning rosso.
- **Energy meter** — 10 attività → tag "denso" + suggerimento di alleggerire.
- **Open-hours math** — last entry, lunch break locali, giorni di chiusura.
- **Insert buffer** — fra due attività pesanti, suggerisce 30 min di pausa.

### 4. AI helpers espliciti

Cosa chiedo a Go quando voglio una mano:

- **"Riempi i buchi"** — date 2-3 ancore, Go propone il resto del giorno.
- **"Scrivi i ponti"** — per ogni spostamento, Go scrive indicazioni operative (linea, fermate, uscita giusta).
- **"Bilanciami il giorno"** — dato un draft, Go suggerisce rimozioni / aggiunte / riordinamenti.
- **"Sostituisci con simile"** — non mi piace X? Alternative con motivazione.
- **"Cosa manca?"** — Go scansiona il giorno vs cose iconiche della zona e segnala omissioni rilevanti.
- **"Match my vibe"** — dato lo storico, suggerisce attività coerenti col gusto raccolto.
- **"Stress test"** — "regge davvero o sei stretto?" — simulazione tempi reali con buffer prudenti.
- **"Storia veloce del giorno"** — chiusa la composizione, Go scrive deck + intermezzi del Day Magazine.

### 5. Friction points da evitare

- Form modali lunghi (la composizione deve essere conversazionale o drag-based).
- Far digitare cose che il sistema può inferire (orari, durate, mezzo, indirizzo).
- Aspettare l'AI per cose che si fanno meglio a mano (un singolo "uscita albergo" non serve AI).
- Sovraccarico di "decisioni di sistema" — "vuoi che riordini geograficamente?" ogni volta.
- Perdere il lavoro: tutto auto-salva + storico modifiche per disfare.
- Voler perfezione subito: ok lasciare blocchi vaghi ("pranzo qui intorno") e rifinire dopo.

---

## Decisioni prese

| # | Area | Decisione | Quando | Stato |
|---|---|---|---|---|
| 1 | display | **Atomi v1**: Luogo, Spostamento, Pasto, Pausa / esplorazione libera, Azione operativa. Beat narrativo fuori. | 2026-05-18 | ✓ |
| 2 | display | **Spostamenti come ponti** sottili tra blocchi. Chiusi mostrano il minimo (es. *"Metro · 1 ogni X min"*). Espandibili al click per dettagli (linea, fermate, costo, tempo a piedi all'imbocco). | 2026-05-18 | ✓ |
| 3 | display | **Timeline verticale** che scorre, con il **blocco LIVE sempre in cima** (sticky / pinned). L'utente sa subito dove si trova nel giorno. | 2026-05-18 | ✓ |
| 4 | display | **Contesto livello 3 v1**: solo **affluenza** e **notifiche importanti**. Meteo, sunset, calendario locale rimandati. | 2026-05-18 | ✓ |
| 5 | display | **Direzione visiva: Proposta A "Spine"**. Spina verticale continua a sinistra, eventi come nodi appesi, ponti come tratteggi della stessa linea, ponti espansi con tratteggio arancio, notifiche con tratto rosso. LIVE card con bordo arancio + glow soft. Past collapsato. Snapshot frozen in `public/design/timeline-spine.html`. | 2026-05-18 | ✓ |
| 6 | creazione | **Sorgente primaria = Wishlist**, alimentata da una nuova sezione dell'app **Safari/Scoperta**. **Workflow a 2 fasi**: (1) Safari = collezione libera senza pensare al quando · (2) Timeline builder = programmazione, l'utente pesca dalla wishlist e mette nei giorni. Vedi [safari.md](./safari.md) per il design di Safari. | 2026-05-18 | ✓ |
| 7 | creazione | **AI semi-autopilota**: dopo che l'utente ha collezionato wishlist e le ha assegnate a un giorno, l'AI organizza (orari, ordine, ponti). L'**editing manuale** resta sempre possibile dopo. | 2026-05-18 | ✓ |
| 8 | creazione | **Spostamenti auto-calcolati** in background (Google Directions). All'utente si chiede solo il **mezzo principale del viaggio** (auto / camper / a piedi / bici / moto / mezzi pubblici) come setting trip-level. L'AI usa quel default per ogni ponte, con override per-bridge se serve. | 2026-05-18 | ✓ |
| 9 | creazione | **Wishlist da costruire da zero** — non esiste un modulo wishlist nel progetto, lo disegniamo come parte di Safari (vedi [safari.md](./safari.md)). | 2026-05-18 | ✓ |
| 10 | display + creazione | **Blocchi fuzzy ammessi in v1**. Esempi: "12:30 · Pranzo (zona Senso-ji)", "14:00–17:00 · Wander in Yanesen", "19:00 · Aperitivo a Shibuya". Visual: bordo tratteggiato, icona generica, range orario, label "decidi sul posto". Possono evolvere sul posto in blocchi precisi (scegli il ristorante → si concretizza). Auto-bridge li gestisce usando il centroide della zona come waypoint, o salta il bridge esatto se troppo vago. | 2026-05-18 | ✓ |
| 11 | scope | **Safari parcheggiato** — diamo per scontato che la Wishlist sia già popolata. Lavoriamo sul Timeline builder con wishlist mock. Il design di Safari verrà ripreso dopo. | 2026-05-18 | ✓ |
| 12 | creazione | **Flusso ibrido AI → Workshop**. Al **primo open** del Timeline builder (trip vuoto) viene mostrato un hero CTA "Organizza il mio viaggio"; click → loading di 2-4 s con progresso visibile → atterraggio nel **two-pane workshop** con banner arancio "Organizzato da Go · rivedi quello che vuoi". A ogni **ritorno successivo** si entra direttamente nel workshop, senza banner né hero. | 2026-05-18 | ✓ |
| 13 | creazione | **Form factor Timeline builder = pagina dedicata**, layout fisso a due pannelli (Wishlist sx · Giorni dx). Non è un overlay sulla day view, ha bisogno del proprio spazio. La day view consulta solo (vista display); il builder è un'altra pagina, raggiungibile da una CTA "Pianifica trip" in cima al day view o dal trip overview. | 2026-05-18 | ✓ |
| 14 | creazione | **AI re-trigger granulare per-day**. Su ciascun giorno: bottone "AI riempi" (arancio pieno) per giorni vuoti, "rigenera" (arancio outline) per giorni già popolati. Niente bottone primario "Ri-organizza tutto" — destabilizzante. Eventuale "Ricomincia da capo" rimandato a un menu secondario. | 2026-05-18 | ✓ |
| 15 | day editor | **View ↔ Edit transition = same view, toggle in alto**. Pill "Edit day" diventa "Editing" cliccata, abilita le affordance inline (pencil/trash su blocchi, ponti clickabili, + Add tra blocchi). Auto-save + sticky footer con "Done" / "Cancel". No modale, no pagina separata. | 2026-05-18 | ✓ |
| 16 | day editor | **Affordance inline per editing**: pencil + trash a destra di ogni blocco (visibili in edit mode), drag handle sinistra al hover, ponte clickabile espande inline. Stile uniforme con pattern già scelti (image picker popover, HeroBanner edit). | 2026-05-18 | ✓ |
| 17 | day editor | **Composer fuzzy hover-reveal**: l'affordance "+ aggiungi blocco" è **invisibile di default**, appare al hover nel gap tra due blocchi come **piccolo cerchio + sulla spina** + hairline arancia + microcopy "aggiungi blocco". Click apre il composer inline con type-chip (Luogo / Spostamento / Pasto / Pausa / Azione). Niente zona = blocco fuzzy. CSS-only, niente JS richiesto. | 2026-05-18 | ✓ |
| 18 | day editor | **Bridge editor inline**: click sul ponte → si espande con card arancio bordata. Contiene: chip mezzo (a piedi / metro / treno / bus / taxi / bici / auto), tempo (auto Directions, override), linea/fermate per transit, note libera, link "Marca come tempo libero" (rimuove il ponte → buffer). | 2026-05-18 | ✓ |
| 19 | day editor | **Escape al builder**: pill secondaria "Apri nel builder" in cima al day view porta al two-pane workshop con questo giorno pre-selezionato. Per riorganizzazioni grosse (drag dalla wishlist, swap tra giorni) — non si fanno bene inline. | 2026-05-18 | ✓ |
| 20 | architettura | **Root "Activities Editor"** raggruppa Builder + Day editor sotto `/design/activities-editor/`. È la famiglia di strumenti che lavora a livello **istanza** (un'attività in un giorno). **Activity Detail** è una pagina **separata** (livello entità) raggiungibile dal drill-down. | 2026-05-18 | ✓ |
| 21 | architettura | **Modello entità vs istanza**. Wishlist contiene **entità** (Sensō-ji come "posto nel mondo" con nome, foto, indirizzo, descrizione lunga, hours). Timeline contiene **istanze** (Sensō-ji alle 08:00 del giorno 2 con time, fuzzy, note di istanza, ponte, booking). Le istanze hanno FK opzionale all'entità (null = blocco free-form tipo "uscita albergo"). Vedi sezione "Modello concettuale" sopra. | 2026-05-18 | ✓ |
| 22 | architettura | **Matrice responsabilità editing**: Builder = ASSIGNMENT (quale attività in quale giorno) · Day editor = SCHEDULING (quando, come, ponti, note di istanza) · Activity Detail = IDENTITY (entità: nome, foto, descrizione lunga, hours, indirizzo). Drill-down naturale Builder → Day → Activity Detail. Vedi sezione "Suddivisione delle responsabilità" sopra. | 2026-05-18 | ✓ |
| 23 | day editor | **Due affordance diverse per due intenti diversi**: pencil su blocco → popover di **istanza** (time, fuzzy, note di istanza, booking_status); click sul **nome** del blocco → naviga ad **Activity Detail** (entità). Niente confusione su "dove edito cosa". | 2026-05-18 | ✓ |
| 24 | architettura | ~~AI vive solo nel Day Editor~~ → **rivisto in decisione 27**: due AI moments distinti, uno trip-level (Builder) e uno day-level (Day Editor). | 2026-05-18 | ↻ revisionata |
| 25 | architettura | **Day Editor embedded nella pagina giorno**. La pagina giorno fornisce il chrome (banner foto, lodging, deck, intro Go, ecc.). Il Day Editor è solo la sezione "Day itinerary": toolbar (Lista \| Racconto · Show map · AI organize · + Add activity) + timeline editabile. Niente day banner, niente edit toggle, niente sticky footer Done/Cancel nello sketch — quel chrome appartiene alla pagina ospite. | 2026-05-18 | ✓ |
| 26 | day editor | **Add zone con 2 affordance distinte** (hover-reveal): "**+ aggiungi blocco**" (arancio) = composer fuzzy/free-form (Luogo · Spostamento · Pasto · Pausa · Azione); "**+ aggiungi attività**" (ink-soft) = **activity autocomplete inline** che cerca in 2 gruppi (nella wishlist del viaggio + nella piattaforma TravelGo), con highlighting del termine cercato e fallback **"Crea {testo} come nuova attività"** che aggiunge anche alla wishlist. Toggle vista a 3 stati: **Lista \| Timeline \| Racconto** (Timeline = spine view). | 2026-05-18 | ✓ |
| 27 | architettura | **Due AI moments distinti** (revisione della 24). **Trip-level AI** nel Builder = "Organizza il mio viaggio" — hero CTA al primo open (wishlist popolata, giorni vuoti), distribuisce le attività nei giorni + prima passata di orari, restituisce un workshop popolato con banner "Organizzato da Go". Visibile solo al primo open o dopo reset. **Day-level AI** nel Day Editor = "Organize this day" — rifinisce un singolo giorno (orari, ordine, ponti) on demand, non tocca gli altri. Sono due AI con scope diverso: trip-level = dove vanno le cose, day-level = come si incastrano in un giorno. Tutto rimane editabile manualmente in entrambi i contesti. | 2026-05-18 | ✓ |

---

## Domande aperte

### Display

- **Specificità flessibile**: blocchi tipo *"trova un ramen qui intorno"* — placeholder grafico diverso da un blocco preciso? Riempimento on-the-fly tramite Place search?
- **Live block fuori dal giorno corrente**: cosa mostra la timeline quando il giorno è futuro o passato? Solo timeline pura senza pinned?
- **Integrazione con il toggle Lista / Racconto**: la timeline è una **terza vista** (toggle a 3 stati: Lista · Timeline · Racconto), oppure **sostituisce la Lista attuale**?
- **Mobile**: timeline verticale funziona, ma i ponti come si comportano in viewport stretto? Stessa altezza e click per espandere, o auto-collapsano in linea singola?
- **Dipendenze a cascata**: se il blocco LIVE ritarda di 30 min, ricalcolo automatico degli orari successivi o solo warning?
- **Affluenza**: da dove la prendiamo? Google Places `currentOpeningHours.weekdayDescriptions` non ce l'ha. Serve `populartimes` API o euristica nostra?

### Creazione assistita

- **Mezzo principale del viaggio**: dove si imposta — al momento della creazione del viaggio (single source for the trip), all'apertura del Timeline builder, o per giorno (un giorno auto, un giorno mezzi pubblici)?
- **Wishlist vuota al primo open**: cosa mostra l'hero? Direttamente "Vai a Safari" come empty state, o un mini-onboarding al workflow?
- **2+ persone in viaggio**: l'AI considera preferenze multiple? Wishlist condivisa già implicita?
- **Cambio mid-trip della wishlist**: se aggiungo wishlist items dopo che l'AI ha già organizzato, dove vanno? Lasciate non-incastrate, AI rigenera spontaneo, o suggerimento "ti propongo dove metterle"?

---

## Avanzamento implementazione

### Brainstorm e decisioni base

- [x] Tipologie di blocco identificate (5 livelli)
- [x] Decisione atomi v1
- [x] Decisione spostamenti come ponti
- [x] Decisione orientamento (verticale + live on top)
- [x] Selezione contesto livello 3
- [x] Brainstorm creazione assistita (sorgenti / modalità / automazioni / AI / friction)
- [ ] Risposte alle 6 domande sulla creazione

### Design display (canvas Next/React)

- [x] Schizzo del layout principale: live card + ponti + blocchi (Proposta A "Spine" approvata · snapshot in `public/design/timeline-spine.html`)
- [ ] Mockup base in `app/(design)/design/activity-timeline/page.tsx`
- [ ] Variante per ciascun tipo di blocco (Luogo / Pasto / Pausa / Azione operativa)
- [ ] Stati real-time per blocco (`upcoming`, `now`, `done`, `skipped`, `late`)
- [ ] Stati prenotazione (`todo`, `booked`, `paid`, `done`)
- [ ] Ponte chiuso · 4 mezzi (a piedi, metro, treno, taxi/auto)
- [ ] Ponte espanso · dettagli completi
- [ ] Live card sticky · comportamento allo scroll
- [ ] Notifica importante · come compare nella timeline
- [ ] Indicatore affluenza · placement e visual
- [ ] Layout mobile

### Design creazione (canvas Next/React)

- [x] Schizzo del flow principale di creazione (ibrido AI → Workshop · 4 stati: hero / loading / workshop con banner / workshop normale)
- [x] Sketch React in `app/(design)/design/activity-timeline-builder/page.tsx` (4 stati stackati)
- [ ] Variante "pianificazione lenta" (desktop, sessione lunga)
- [ ] Variante "pianificazione veloce" (mobile, tocchi rapidi)
- [ ] Variante "adattamento live" (in viaggio, ribilanciamento)
- [ ] Stato del lavoro in corso (autosave + history)
- [ ] AI helpers · come si invocano, dove appaiono i risultati
- [ ] Empty state · onboarding alla prima creazione
- [ ] Stato "AI ha riempito, rivedi" (post-autopilota)
- [ ] Conflict warnings · come compaiono nella composizione

### Decisioni ulteriori da prendere

- [ ] Layer 4 (pratico-tattico): cosa entra in v1?
- [ ] Layer 5 (meta): energia / budget / microstoria — quali in v1?
- [ ] Toggle vista: 2 o 3 modalità?
- [ ] Sorgente primaria di creazione
- [ ] Autopilota vs copilota
- [ ] Audit della wishlist esistente

### Integrazione di prodotto (out of scope sessione design)

- [ ] Componenti finali in `features/day/` o `features/activity/`
- [ ] Schema dati per ponti / azioni operative (estensione attuale `activity`?)
- [ ] API per affluenza
- [ ] Sistema notifiche importanti
- [ ] Auto-bridge via Google Directions
- [ ] Auto-time via Google Places visit duration estimates
- [ ] Wishlist data model (se non esiste o va esteso)
- [ ] Storico modifiche / undo
- [ ] AI endpoints (`/api/ai/suggest-day`, `/api/ai/fill-gaps`, ecc.)
- [ ] Template di giorno (data model + autoring)

---

## Idee parcheggiate

Non ancora prioritizzate, non scartate. Le riprendiamo quando arriva il momento.

- **Voce** — input vocale "Go, aggiungi pausa caffè dopo Senso-ji". Bello, complica però la build. v2.
- **Mappa-first composer** — apri la mappa della zona, tap-tap. Visuale, da valutare se compete o complementa.
- **Swipe feed** — Tinder-style per accumulare attività. Divertente, può essere divisivo come pattern.
- **Stress test** — "regge davvero?" — utile ma richiede simulazione tempi real-world solida.
- **Match my vibe** — richiede uno schema "preferenze utente" raccolto nei giorni precedenti. v2.
- **Beat narrativo** — blocco di puro mood ("guarda l'alba"). Out v1, valutabile in v2.

---

## File e riferimenti

- **Mockup canvas display (da creare)**: `app/(design)/design/activity-timeline/page.tsx`
- **Mockup canvas creazione (da creare)**: `app/(design)/design/activity-timeline-builder/page.tsx`
- **Index degli sketch**: `/design` (auto-listing di `app/(design)/design/`)
- **Layout sketch**: `app/(design)/design/layout.tsx` (gated dev-only)
- **Riferimento canvas dei componenti maturi (non per design in iterazione)**: `app/(dev)/dev/` con `registry.ts` e `SandboxShell`/`StoryFrame`/`ControlsPanel`
- **Componenti UI riusabili**: `components/ui/*` — `AddressField` (Places autocomplete), `DestinationField`, `DatePickerField`, `Map`, `RouteMap`, `SoftField`, `Button`
- **Feature moduli candidati**: `features/day/`, `features/activity/`, `features/ai-suggest/`, `features/go/`
- **Snapshot HTML frozen**: `public/design/timeline-spine.html`
- **Design precedenti correlati**:
  - `public/design/day_view.html` (lista attuale)
  - `public/design/day-magazine.html` (vista racconto alternativa)
  - `public/design/ai_suggest.html` (legacy AI Suggest)

---

## Changelog

- **2026-05-18** · Apertura doc. Brainstorm display (5 livelli), decisioni 1-4 prese.
- **2026-05-18** · Confrontate due direzioni visive (A "Spine" vs B "Stacked cards"). Approvata Proposta A. Snapshot HTML frozen in `public/design/timeline-spine.html`.
- **2026-05-18** · Aperto brainstorm creazione assistita (sorgenti / modalità composizione / automazioni / AI helpers / friction). Inizialmente in doc separato `activity-timeline-creation.md`; **mergiato qui** per evitare duplicazione e drift — display e creazione sono lo stesso problema, due angolazioni.
- **2026-05-18** · Decisioni 6-9 prese (workflow Safari → Timeline builder · AI semi-autopilota · spostamenti auto-calcolati con mezzo trip-level · Wishlist da zero). Aperto doc separato [safari.md](./safari.md) per la sezione Safari.
- **2026-05-18** · Decisione 10: **blocchi fuzzy ammessi in v1** (planning più realistico, possono evolvere sul posto). Decisione 11: **Safari parcheggiato**, lavoriamo sul Timeline builder assumendo Wishlist popolata. Restano due domande aperte sulla creazione: form factor del Timeline builder, dove si setta il mezzo.
- **2026-05-18** · Confrontate due direzioni per il Timeline builder (1 · "AI big bang" full-screen vs 2 · "Two-pane workshop"). Scelto **ibrido**: Decisione 12 (flusso AI → Workshop con loading e banner di transizione), Decisione 13 (form factor = pagina dedicata two-pane permanente), Decisione 14 (AI re-trigger granulare per-day, niente "ri-organizza tutto" primario). Resta aperta la domanda del mezzo + nuove domande emerse (wishlist vuota al primo open, 2+ persone, cambio mid-trip della wishlist).
- **2026-05-18** · Cambiato workflow di design: gli sketch React vivono ora in **`app/(design)/design/<slug>/`** (route group dedicato, gated dev-only), NON nel sandbox `(dev)/dev/`. Motivo: il sandbox è per componenti maturi vetrinati con registry, i design in iterazione sono ephemerali e cambiano spesso. Primo sketch creato: `app/(design)/design/activity-timeline-builder/page.tsx` con i 4 stati (hero / loading / workshop banner / workshop normale).
- **2026-05-18** · **Day editor inline** definito (decisioni 15-19): toggle View ↔ Edit nella stessa view, pencil/trash/drag affordance per blocco, ponte clickabile espande inline con selettore mezzo, `+ aggiungi blocco` **hover-reveal** sulla spina (cerchio arancio + hairline + microcopy, invisibile di default), composer fuzzy inline con type-chip (Pausa senza zona = blocco fuzzy), bottom bar sticky con auto-save + Done. Escape "Apri nel builder" come bridge esplicito al two-pane workshop.
- **2026-05-18** · Aggiunta sezione **Roadmap v1 / v1.5 / v2+** in cima al doc per congelare lo scope del primo rilascio. v1 contiene tutto il display Spine + Timeline builder ibrido + Day editor inline + Safari MVP minimo (search + AI Go). v1.5: Safari completo, conflict detection, mobile, multi-utente. v2+: contesto ambientale (meteo/sunset/calendario), layer pratico (frasi locali/QR/backup), layer meta (energia/budget/storia), Safari avanzato (Instagram/community/camera/voce), slash commands, voice input, stress test, match-my-vibe, template, AI proattiva.
- **2026-05-18** · **Refactor strutturale** (3 task in un colpo):
  1. **Root "Activities Editor"**: doc rinominato `activity-timeline.md` → `activities-editor.md`, sketch React spostati sotto `app/(design)/design/activities-editor/{builder,day}/`, overview a `/design/activities-editor`. (Decisione 20)
  2. **Suddivisione responsabilità di editing** in matrice esaustiva: Builder = ASSIGNMENT, Day editor = SCHEDULING, Activity Detail = IDENTITY. Niente più funzionalità sparse tra Builder e Day editor. (Decisione 22)
  3. **Modello entità vs istanza**: Wishlist = entità (Sensō-ji come "posto nel mondo"), Timeline = istanze (Sensō-ji alle 08:00 del giorno 2). Pencil su blocco apre instance popover, click sul nome naviga ad Activity Detail. (Decisioni 21, 23)
  Activity Detail (IDENTITY level) ancora da disegnare — è il prossimo passo.
- **2026-05-18** · **Recupero della "creazione del viaggio"** (decisione 27, revisione di 24): il trip-level AI moment era stato eliminato per errore quando avevamo deciso "AI solo nel Day Editor". In realtà i due AI moments sono distinti per scope: trip-level (Builder, distribuzione wishlist → giorni) vs day-level (Day Editor, organizzazione di un singolo giorno). Recuperati i 4 stati del Builder (hero CTA → loading → workshop con banner → workshop normale). Decisione 24 marcata come revisionata.
- **2026-05-18** · **Import da Claude Design** (decisione 26): sketch del Day Editor rifinito esternamente in Claude Design e re-importato in `app/(design)/design/activities-editor/day/`. Novità strutturali:
  - **2 affordance distinte** sull'add-zone hover-reveal: "+ aggiungi blocco" (composer fuzzy/free-form) e "+ aggiungi attività" (autocomplete inline).
  - **ActivityAutocomplete** nuovo componente: input arancio bordato + dropdown a 2 gruppi (wishlist viaggio · piattaforma TravelGo) + highlighting `<mark>` + fallback "Crea nuova attività".
  - **Toggle a 3 stati** Lista \| Timeline \| Racconto (Timeline = vista spine).
  - **Block-row containerless** di default, hover → white card con orange glow shadow. Icone con halo che mascherano la spine line.
  - **Fuzzy block** in stile uppercase piccolo (più "loose placeholder" feel).
  - **Spine continua** tra sezioni (Morning/Afternoon/Evening), con `.spine--first` e `.spine--last` per gli estremi.
  - **Tabler webfont** aggiornato a 3.21.0 nel layout `/design/`.
  - **General Sans** font caricato da Fontshare nel layout `/design/` per estetica modern grotesk (scoped solo agli sketch design, non al prodotto).
- **2026-05-18** · **Affinamento responsabilità** (decisioni 24-25):
  - **AI vive nel Day Editor, non nel Builder** (decisione 24). Builder torna puro assignment manuale (drag wishlist ↔ giorni). Day Editor prende AI organize this day in toolbar.
  - **Day Editor embedded nella pagina giorno** (decisione 25). Rimosso dal sketch tutto il chrome che apparterrebbe alla pagina ospite (day banner, edit toggle pill, sticky footer). Aggiunta toolbar in stile screenshot reale (Lista \| Racconto · Show map · AI organize · + Add) + section divider Morning/Afternoon/Evening.
  - Builder sketch riscritto: rimossi hero CTA "Organizza con AI", loading, banner "Organizzato da Go", pulsanti AI riempi/rigenera per giorno. Resta wishlist sx + day cards dx con preview compatta + link "Open" per saltare alla pagina giorno (Day Editor embedded).
  Matrice responsabilità aggiornata di conseguenza.
