# Discovery zone · scoperta attività · spec di design

**Ultimo aggiornamento:** 2026-05-18
**Stato:** 🟢 **attivo** — riavviato come "Discovery zone": landing post-creazione trip in stile editoriale Wanderlust-inspired, composta come **sequenza di DiscoveryWidget** pescati da una libreria.
**Sketch React:** `app/(design)/design/discovery/page.tsx` + `discovery.css`
**Doc correlato:** [activities-editor.md](./activities-editor.md) — la Wishlist popolata in Discovery alimenta il Builder e il Day Editor

---

## Direzione visiva · Wanderlust-inspired (2026-05-18)

Catalogo turistico editoriale, **niente UI tecnica** (counter, badge, pill di stato). Linguaggio:

- **Display serif gigante** (Georgia, 32-54px) per titoli di sezione e nomi destinazione
- **Eyebrow uppercase arancio letterspaced** sopra ogni elemento ("GO SUGGESTS", "EATER · FOOD", "TOKYO · CULTURE")
- **Foto dominanti** senza bordi pronunciati, overlay scuro per testo
- **Linee gold/arancio sottili** come section dividers
- **Mix di formati** (4-tile grid, 3-card spread con 1 big, image-left text-right, news inline)
- **Inserti Go**: kanji 五 nei posti dove Wanderlust mette il wordmark gold; **GoChat banner inline scuro** mid-page come "pull editoriale" (al posto del subscribe banner); **GoPanel hint** sottile bottom-bordato gold per richiamare il pannello floating.

Riferimento visivo: [Wanderlust Magazine](https://www.wanderlustmagazine.com/). Mantenuto brand TravelGo (arancio #f47b3a, ink #0d2c3d, surface warm).

---

## Libreria DiscoveryWidget · v1 (12)

Ogni riga della Discovery è un widget atomico. La home si compone come **`WidgetSpec[]`** — manifest editabile per destinazione, stagione, profilo utente, A/B test.

| # | Widget | Texture | Cosa fa |
|---|---|---|---|
| 1 | `HeroDestination` | Apertura | Nome destinazione in serif gigante + foto + CTA + eyebrow "Go suggests" con kanji 五 |
| 2 | `WhyHere` | Essenza | 4 ragioni editoriali (icona + h4 + paragrafo) — "perché questa città" |
| 3 | `RegionTileGrid` | Spaziale | Grid 4×N di quartieri/regioni con foto + label overlay |
| 4 | `PhotoMosaic` | Visivo puro | Grid asimmetrico (1 big + 4 small) stile rivista · save al hover |
| 5 | `GoBanner` | Pull AI | Banner scuro mid-page con orb 五 pulsante + Talk to Go CTA |
| 6 | `EditorsChoice` | Curato | 1 big + N small editorial cards con eyebrow source (Eater · Atlas · Lonely Planet) |
| 7 | `LocalVoices` | Umano | Testimonial italici di altri viaggiatori (quote + avatar + meta + link al loro trip) |
| 8 | `StarterPacks` | Azione | Card image-left + text-right per bundle pronti |
| 9 | `ReadBeforeYouGo` | Lettura | 3 article cards curati (foto + eyebrow source + title + author + read time) |
| 10 | `BeforeYouGo` | Pratico | FAQ accordion (icona + question + answer in italico serif) — domande operative |
| 11 | `TrendingCards` | Now | 3-up cards inline piccole (thumb 72px + eyebrow + title) stile Travel news |
| 12 | `GoPanelHint` | Closure | Riga sottile bordata gold a fondo pagina che richiama il pannello Go floating |

**Candidati per v1.5+**: `ThemeChips`, `MapPreview`, `WanderSleeps` (hotel featured), `Quiz`, `EditorialList`, `InstagramFeed`, `LocalGuides` ("Meet your storytellers"), `NewsletterCTA` (notifiche pre-trip), `DestinationMosaic` (varianti del PhotoMosaic per più destinazioni).

---

## Implementazione · due righe

1. **Composabile**: la pagina `app/(app)/trips/[id]/discover/page.tsx` legge `DiscoveryWidget[]` dal manifest del trip (cached da Supabase, default curato per destinazione + override personalizzato dall'utente o da Go) e mappa ogni elemento al componente della libreria tramite un dispatcher (`DiscoveryRow`).
2. **Stack**: tutti i widget vivono in `features/discovery/widgets/` (un file `.tsx` per widget + un `types.ts` con la discriminated union `WidgetSpec` + un `Registry.ts` che esporta il dispatcher). Lo sketch è in `app/(design)/design/discovery/` con la stessa struttura inline; quando il design è approvato si "promuovono" i widget alla libreria di produzione.

---

## Domande aperte (post-Wanderlust direction)

- **Personalizzazione del manifest**: editabile dall'utente (drag-to-reorder widget) o sempre curato dal sistema?
- **Cache + refresh**: ogni quanto si rigenera il manifest? Quando si invalida (nuovo trip, cambio preferenze, evento stagionale)?
- **Widget AI-generated**: alcuni widget (es. `GoBanner` con domande contestuali, `EditorsChoice` con quote AI-personalized) richiedono AI calls. Quando? Al primo render? On-demand?
- **Sorgenti dati per widget editoriali**: `EditorsChoice` con "Eater" / "Lonely Planet" / "Atlas Obscura" — partnership? Scraping? Curato a mano da editor TravelGo?
- **Multi-language**: i titoli editoriali sono in italiano nel mock ("Mille volti, un solo nome"); in produzione i18n con next-intl?

---

## Changelog

- **2026-05-18** · Apertura come "Safari" — fase di collezione del workflow. Brainstorm in 6 sezioni, 10 domande aperte, parcheggiato.
- **2026-05-18** · **Riaperto come Discovery zone**. Direzione editoriale Wanderlust-inspired adottata dopo confronto con screenshots di [wanderlustmagazine.com](https://www.wanderlustmagazine.com/). Definita libreria di 7 DiscoveryWidget v1 + pattern di composizione via manifest `WidgetSpec[]`. Sketch React in `app/(design)/design/discovery/` (single page con widgets inline + dispatcher + manifest Tokyo). Tutte le sezioni del brainstorm originale Safari (15 sorgenti, 7 modalità di esplorazione, anatomia card scoperta, Wishlist, arricchimento, sharing) restano valide ma diventano widget candidati per v1.5+.
- **2026-05-18** · **Libreria estesa a 12 widget** dopo rilettura del template di riferimento (`design_pvt/_pages/page-01..08.png`, TripGlobe/Tourice). 5 widget nuovi: `WhyHere` (4 ragioni editoriali), `PhotoMosaic` (grid asimmetrico save-on-hover), `LocalVoices` (testimonial di altri viaggiatori), `ReadBeforeYouGo` (curated reading), `BeforeYouGo` (FAQ accordion pratiche). Aggiornato manifest Tokyo a 12 widget con nuovo ritmo: Hero · WhyHere · Regions · PhotoMosaic · GoBanner · Editors · LocalVoices · Packs · ReadBeforeYouGo · BeforeYouGo · Trending · GoHint. Responsive aggiornato per tutti.

---

## Obiettivo

**Safari** è la sezione dell'app dedicata alla **scoperta e raccolta** di attività candidate per un viaggio, **senza** ancora pensare a quando farle. È l'inizio del workflow di pianificazione: prima si esplora e si salva, poi (nel Timeline builder) si organizza.

### Two-phase workflow di pianificazione

1. **Safari · collezione** — l'utente scopre da tante fonti, salva tutto in Wishlist. Niente orari, niente giorni, solo "questo mi interessa".
2. **Timeline builder · programmazione** — l'utente pesca dalla Wishlist, mette nei giorni, l'AI organizza, l'utente rifinisce. (Vedi [activity-timeline.md](./activity-timeline.md).)

Safari e Timeline builder sono **due strumenti distinti** che comunicano via la Wishlist condivisa.

---

## Brainstorm

### 1. Sorgenti di scoperta

Da dove arrivano le attività candidate:

- **Mappa esplorativa** — apri la mappa della destinazione, browse POI per categoria, tap → "Aggiungi a wishlist".
- **Ricerca testuale** — search box principale, autocomplete, filtri (zona, categoria, prezzo, vibe).
- **Import da URL** — incolli articolo di blog / Medium / Substack / Lonely Planet: parser estrae i posti citati e li propone come batch.
- **Import da Instagram** — link a reel o post con location tagged: estrae location.
- **Import da TikTok** — stesso pattern, location tagged in video.
- **Import da Google Maps** — lista salvata o condivisa (Google Maps "saved lists").
- **Import da Pinterest** — board tematica ("Tokyo trip", "Coffee shops Tokyo").
- **Sorgenti curate integrate** — Lonely Planet, Time Out, Atlas Obscura, Eater, Conde Nast Traveler. Native partnership ideale, scraping pulito come fallback.
- **Database TravelGo (community)** — scoperte salvate da altri viaggiatori (anonimizzate, ranked, opt-in al pool).
- **AI Suggest (Go)** — "cosa c'è di interessante a Tokyo per chi ama il design?" → Go propone batch di candidati.
- **Camera scan** — foto di poster / menu / biglietto da visita → OCR + lookup → candidato.
- **Voice memo** — "ricordati il ramen vicino al Senso-ji" → trascritto e diventa candidato fuzzy da rifinire.
- **Reservation systems** — OpenTable, TheFork, Resy: prenotazioni esistenti importate automaticamente.
- **Email / Calendar scan** — integrazione Gmail/Outlook: estrae prenotazioni hotel, voli, ristoranti.
- **Wishlist condivise** — amico ti manda "i miei posti preferiti a Tokyo" come pacchetto importabile.

### 2. Modalità di esplorazione

Come ci si muove dentro Safari:

- **Mappa-first** — la pagina principale è una mappa della destinazione. POI visibili come marker, tap espande card, swipe per accumulare.
- **Lista filtrabile** — view alternativa, tutti i POI accumulati o scoperti, filtri per categoria / zona / prezzo / vibe.
- **Feed curato** — l'app propone scoperte sulla base del viaggio (destinazione, durata, vibe già raccolti).
- **Search box prominente** — barra di ricerca in alto, suggerimenti live.
- **Categorie tematiche** — "cibo", "natura", "shopping", "musei", "viste", "vita notturna", "esperienze locali".
- **Per zona / quartiere** — Asakusa, Shibuya, Shinjuku, Yanesen…
- **Per template di durata** — "se hai 1 giorno", "se hai 3 giorni", "se hai una settimana".
- **Per stagione / momento** — "Tokyo a marzo: hanami", "Notti d'estate", "Pioggia in città".

### 3. Anatomia della "card scoperta"

Cosa contiene un candidato prima di entrare in Wishlist:

- Foto (placeholder se assente)
- Nome
- Categoria principale
- Zona / quartiere
- Distanza dal centro o dal lodging del viaggio
- Rating (Google Places o altra fonte)
- Prezzo medio (€ / €€ / €€€ o range)
- Durata visita suggerita
- Open hours (icona aperto/chiuso ora)
- 1-2 frasi di descrizione (curated o AI-generated)
- Fonte (Lonely Planet, Instagram @user, blog X, Go, community…)
- Stato wishlist (non aggiunto / aggiunto · con icona)
- Azioni: Aggiungi a wishlist · Apri mappa · Vedi più foto · Salva per dopo

### 4. La Wishlist · raccolta e organizzazione

Lato "tu" — quello che hai accumulato:

- **View dedicata** "La mia wishlist" — per-trip e cross-trip? (vedi domanda aperta)
- **Tag personali** — "must-see", "weather permitting", "if-time", "se sono in zona"
- **Categorie auto** + override manuale
- **Note personali** sul singolo item ("amico l'ha consigliato", "vicino all'hotel")
- **Source attribution** — da dove l'ho aggiunto, link cliccabile per tornare alla fonte
- **Marker visivo "già programmato"** se l'item è già in un giorno della timeline
- **Bulk actions** — aggiungi N items a un giorno, rimuovi multipli, sposta tra viaggi
- **Mappa cumulativa** — tutti gli wishlist items sulla mappa, vedi visivamente la distribuzione geografica → utile per la fase Timeline builder
- **Smart grouping** — l'app suggerisce cluster geografici (4 items vicini → "potresti farli stesso giorno")

### 5. Arricchimento automatico

Cose che il sistema fa appena un candidato entra in Wishlist (senza chiedere):

- Geocoding (se manca dalla fonte)
- Foto da Google Places (se non già allegate)
- Open hours, rating, prezzo
- Categorizzazione automatica
- Best time of day to visit (mattina / pomeriggio / sera)
- Durata visita stimata
- Affluenza prevista (se possiamo)
- Travel time dal lodging del viaggio
- Cluster geografico con altri wishlist items
- Deduplicazione (stessa location aggiunta da fonti diverse → merge automatico con source-attribution multipla)

### 6. Sharing / collaborazione

- **Wishlist condivisa** con compagni di viaggio (real-time sync)
- **Voto / commento** su ogni item (in coppia / gruppo)
- **Wishlist pubblica** esportabile (link)
- **Wishlist importabile** da altri utenti TravelGo
- **Wishlist export** in formato standard (JSON, KML per Google Earth?)

---

## Decisioni prese

| # | Decisione | Quando | Stato |
|---|---|---|---|
| — | nessuna ancora · attendiamo le risposte alle domande aperte | — | — |

---

## Domande aperte

- **Mobile-first o desktop-first?** Safari è scoperta — ha senso anche in mobilità (mentre giri la città già sul posto), o è prevalentemente un'esperienza desktop (al PC, settimane prima)?
- **Scope della Wishlist**: per-trip (collego ogni item a un viaggio specifico) o cross-trip (collezione personale che attinge a più viaggi)? O entrambi (default per-trip, con possibilità di "promuovere" un item a cross-trip)?
- **Sorgenti v1**: con cosa partiamo? La lista è lunga (mappa, search, import URL, Instagram, TikTok, Google Maps, Pinterest, Lonely Planet, community, Go, camera, voce, reservation systems, email scan, wishlist condivise). Quali entrano in v1, quali in v2+?
- **Privacy / TOS**: import da Instagram / TikTok / blog tocca i terms of service delle fonti. Quanto va in deep, e con quale fallback se la fonte non è scrappabile?
- **Community Wishlist**: feature di v1 o v2+? Comporta moderation, ranking, privacy.
- **Layout della pagina Safari**: mappa-first (mappa grande + drawer card), grid Pinterest-style, lista verticale, o tre tab navigabili?
- **Sharing / collaborazione**: v1 o v2?
- **AI Suggest in Safari**: l'AI può proporre POI in modo proattivo guardando il profilo di viaggio? O parla solo se chiamata esplicitamente?
- **Source attribution**: come la mostriamo, è "obbligo morale" verso la fonte originale? Embed dell'autore, link, attribution leggera?
- **Conflict di duplicati**: due fonti diverse aggiungono lo stesso ristorante. Merge automatico, segnalazione, o solo display di entrambe?

---

## Avanzamento

### Brainstorm

- [x] Apertura doc e brainstorm iniziale (sorgenti / modalità / card / wishlist / arricchimento / sharing)
- [ ] Risposte alle domande aperte

### Design canvas (Next/React)

- [ ] Mockup pagina Safari (entry point della scoperta)
- [ ] Card scoperta · varianti per fonte (mappa, blog, Instagram, Go suggestion, community)
- [ ] View Wishlist · lista + mappa cumulativa
- [ ] Flow import da URL (paste articolo → preview candidati → seleziona → aggiungi)
- [ ] Flow import da Instagram (paste link → preview → aggiungi)
- [ ] Mockup mobile (se viene scelto mobile-first)
- [ ] Empty state Safari · primo accesso al viaggio
- [ ] Empty state Wishlist · niente di salvato ancora

### Integrazione di prodotto (out of scope sessione design)

- [ ] Schema dati Wishlist (item, source, tags, note, trip association)
- [ ] API endpoints (`/api/wishlist/*`)
- [ ] Integrazione Google Places (search, details, photos)
- [ ] Parser articoli (Mercury Parser, Readability, custom)
- [ ] Integrazione Instagram (oEmbed, scraping fallback)
- [ ] Sistema dedup e merging
- [ ] Sharing infrastructure (link tokens, permissions)
- [ ] Community moderation (se v1)

---

## Idee parcheggiate

Non ancora prioritizzate, non scartate.

- **Camera scan** — OCR di poster / menu / biglietti. Bello ma OCR + lookup è complesso. v2+.
- **Voice memo** — "ricordati X" → trascritto → candidato. v2.
- **Email / Calendar scan** — Gmail integration per reservation pre-esistenti. v2.
- **Reservation systems** — OpenTable, TheFork, Resy. v2.
- **AI Suggest proattivo** — Go propone senza essere chiamata. v2.
- **Community Wishlist con voting / ranking** — TravelGo come database collettivo. v2+.
- **Export KML / GPX** — per chi usa Google Earth o app GPS. v2.

---

## Riferimenti

- **Doc correlato**: [activity-timeline.md](./activity-timeline.md) (Wishlist popolata da Safari → Timeline builder)
- **Componenti UI riusabili**: `components/ui/*` — `AddressField`, `DestinationField`, `Map`, `RouteMap`, `SoftField`, `Button`
- **Feature moduli candidati**: `features/ai-suggest/`, `features/go/`, `features/media/` (per import da fonti visive), `features/trip/`
- **Sketch da creare** (in `app/(design)/design/`, non nel sandbox):
  - `app/(design)/design/safari/page.tsx` — pagina principale di Safari
  - `app/(design)/design/wishlist/page.tsx` — view Wishlist (per-trip e/o cross-trip)
  - `app/(design)/design/import-flow/page.tsx` — flow import da URL / Instagram

---

## Changelog

- **2026-05-18** · Apertura doc. Brainstorm iniziale di Safari come "fase di collezione" del workflow di pianificazione (Safari → Wishlist → Timeline builder). 6 sezioni di brainstorm (sorgenti / modalità / card / wishlist / arricchimento / sharing) + 10 domande aperte.
