# Trip Home · Spec viva

**Sketch di riferimento**: `/design/trip-home` (in costruzione)
**Promozione di**: `app/(app)/trips/[id]/overview/page.tsx` (oggi: "Pagina in costruzione")
**Riusa pattern legacy**: `public/design/trip.html` (country-card, spine details)
**Prima sessione**: 2026-05-23

---

## Concept

**Trip Home** è il primo respiro del viaggio. È la pagina che l'utente vede subito dopo aver creato un trip e ogni volta che torna nel contesto del viaggio dal nav globale.

Non è un dashboard di analytics. Non è un editor. È **una porta**: accoglie, informa, e indirizza l'utente verso il suo prossimo passo naturale di pianificazione.

Tre verbi: **accoglie · informa · guida**.

- **Accoglie** con una frase AI-generata che contestualizza il viaggio (destinazione, durata, viaggiatori, tema). Cambia a primo accesso vs ritorni.
- **Informa** con un pannello "Know before you go" (currency, visa, power, weather, language, safety) che è uno dei motivi per cui l'utente apre la trip page anche quando non sta pianificando.
- **Guida** con una via maestra (Go costruisce il viaggio) e affordance secondarie discrete. Non offre tutto: spinge sulla scelta più ricca di valore.

---

## Decisioni

### Dec 1 — URL: la trip root diventa la Home

`/trips/[id]` smette di essere alias del day-by-day e diventa la **Trip Home**.
Day-by-day si sposta sul tab già esistente (`day-by-day`) accessibile come secondo tab del trip.

**Perché**: la frase mentale "dopo create trip atterro qui" deve corrispondere alla root del trip, non a una sottopagina `/overview`. Mantenere `/overview` come URL alternativo crea due verità.

**Migrazione**:
- `app/(app)/trips/[id]/page.tsx` → diventa la Trip Home (renderizza nuovo `TripHomeShell`)
- `app/(app)/trips/[id]/days/page.tsx` (nuovo) → ospita il vecchio `TripDayView`
- `app/(app)/trips/[id]/overview/page.tsx` → 301 redirect a `/trips/[id]`
- `AppHeader.TRIP_TABS`: `trip` punta a `/trips/${id}`, `day-by-day` punta a `/trips/${id}/days`

**Stato**: deciso. Implementazione successiva alla validazione del sketch.

---

### Dec 2 — Un hero AI, non un menu di scelte

L'hero ha **una sola CTA primaria** (`Let Go plan it`) e una CTA secondaria discreta (`Build manually`). Non offriamo "Explore", "Import", "Copy from another trip" come card hero.

**Perché**:
- Explore e Yumeji (wishlist globale) sono già esposti dall'`AppHeader` su due livelli (nav globale Row 1 + sub-nav Row 2 + drawer Yumeji). Replicarli sulla home crea ridondanza e diluisce il segnale.
- Per la maggioranza degli utenti, "fammelo costruire" è la via di minor frizione e maggior valore percepito.
- Power user che preferisce esplorare prima sa già dove andare (tab Explore del trip, o `/explore` globale).
- `Build manually` resta come escape hatch per chi sa esattamente cosa vuole.

**Cosa NON facciamo**:
- Niente card hero per Explore o Wishlist.
- Niente CTA "Import from another trip" come hero (rimandato a fase 2; eventualmente vivrà dentro l'AI build come "want to start from one of your past trips?").

---

### Dec 3 — Stesso layout per primo accesso e ritorni, contenuto adattivo

Una sola pagina. La differenza tra `days.length === 0` e `days.length > 0` si esprime nel **contenuto**, non nello scheletro.

**Perché**: due varianti distinte costano doppio in design e codice, e fanno sembrare la pagina diversa allo stesso utente dopo 30 secondi (dopo che Go ha generato i giorni). L'utente deve sentire di essere "nello stesso posto", ma più avanti nel suo percorso.

**Cosa cambia tra i due stati**:

| Elemento                | First access (days=0)                                  | Returning (days>0)                                       |
|-------------------------|--------------------------------------------------------|----------------------------------------------------------|
| Hero microcopy          | "Tokyo è una tela bianca. Posso disegnartelo?"         | "Bentornato. Day 3 si sta delineando — riprendi?"        |
| CTA primaria            | `Let Go plan it`                                        | `Continue planning` (porta al day-by-day sul prossimo giorno aperto) |
| CTA secondaria          | `Build manually` (link discreto)                       | `Replan with Go` (link discreto)                         |
| Resume chip (sopra CTA) | nascosto                                                | visibile, mostra "Day {n} · {nextActivity}"              |
| Trip details (spine)    | molti slot vuoti con `+ Add`                            | slot riempiti, edit-on-hover                             |
| Know before you go      | identico                                                | identico                                                 |
| "Your trip so far"      | nascosto                                                | visibile, mostra summary numerico + next-up              |

---

### Dec 4 — Three-pane layout: Hero · Spine + Country card · Recap

La pagina si compone di tre blocchi verticali:

```
┌──────────────────────────────────────────────────────────────┐
│  HERO                                                          │
│  Welcome + frase AI + CTA primaria                            │
└──────────────────────────────────────────────────────────────┘
┌────────────────────────────┬─────────────────────────────────┐
│  TRIP DETAILS (spine)       │  KNOW BEFORE YOU GO              │
│  Dates · Travelers · Lodging│  Tab-strip: Currency · Visa ·    │
│  · Budget · Theme · Notes   │  Power · Weather · Language ·    │
│                              │  Safety                          │
│  edit-on-hover (pencil)     │  Active pane mostra contenuto    │
│  + Add per slot vuoti       │  + GO TIP contestuale            │
└────────────────────────────┴─────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  YOUR TRIP SO FAR (only returning)                            │
│  Numeri (giorni · attività · yume) + next-up + link day-by-day│
└──────────────────────────────────────────────────────────────┘
```

**Grid**: due colonne `0.85fr 1.55fr` (spine più stretta, country card più larga) — stesso ratio della legacy `trip.html`. Mobile: stack verticale.

**Perché spine a sinistra**: l'occhio scende prima sui dati strutturati (anche perché molti sono editabili), poi salta a destra sulla card "Know" che è più ricca e ha più variazione visiva interna (tab strip).

---

### Dec 5 — La frase AI dell'hero è generata, ma vincolata

Il microcopy dell'hero **non è statico**: è composto da Go a partire da un template + slot dinamici. Ma per garantire coerenza tonale e velocità di rendering, NON è una chiamata LLM live a ogni page load.

**Strategia**:
- Template versionati in `lib/go/trip-home-microcopy.ts`.
- Slot dinamici: `{name}`, `{destination}`, `{nights}`, `{travelers}`, `{theme}`, `{daysScheduled}`, `{daysMissing}`, `{nextDayDate}`, `{nextActivity}`.
- Selezione del template via funzione pura (deterministica su stato del trip → no flicker tra refresh).
- Una variante "LLM-deluxe" (chiamata reale) **solo al primissimo render dopo create trip**, cachata in `trip.welcome_copy` o simile.

**Esempi di template (it/en)**:

First access, no dates set:
- it: "Hai scelto {destination}. Quando partite?"
- en: "{destination} it is. When do you leave?"

First access, with dates:
- it: "{destination}. {nights} notti, {travelers}. Posso disegnarti un primo itinerario in tre minuti — partendo da qualche domanda. Ti va?"
- en: "{destination}. {nights} nights, {travelers}. I can draft a first itinerary in three minutes — starting from a few questions. Shall we?"

Returning, partial plan:
- it: "Bentornato. {daysScheduled} di {nightsPlusOne} giorni pronti. {nextDayDate} è il prossimo da chiudere."
- en: "Welcome back. {daysScheduled} of {nightsPlusOne} days drafted. {nextDayDate} is next up."

Returning, full plan:
- it: "Itinerario completo. Vuoi rivederlo insieme prima di partire?"
- en: "Itinerary's all there. Want to review it together before you leave?"

---

### Dec 6 — Country card: tab strip con 6 widget, riusa pattern legacy

La card "Know before you go" è la promozione del `country-card` di `public/design/trip.html` (4 widget) estesa a **6 widget**:

1. **Currency** — codice + simbolo, exchange rate vs valuta utente, **mini-converter** bidirezionale, GO TIP ("cash still king in small izakaya")
2. **Visa** — status contestuale alla cittadinanza utente ("No visa for IT passport · 90 days max"), link approfondimento (Farnesina/State Dept)
3. **Power** — tipo presa (A/B/C/…), voltaggio, adattatore necessario sì/no, illustrazione
4. **Weather** — clima medio per il mese del viaggio: temp min/max, prob pioggia, raccomandazioni vestiti
5. **Language** — lingua ufficiale + 5 frasi essenziali (saluto, grazie, scusi, quanto costa, dov'è il bagno) con pronuncia
6. **Safety** — livello generale (Farnesina), numeri emergenza locali (police, ambulance, embassy), water tap-safe sì/no

**Tab strip** orizzontale in alto, pane attivo sotto. Pane può avere altezze diverse (la card si adatta).
Default tab attivo: **Currency**.

**Dipendenze dati**:
- Currency: API exchange rate (cachare 1h)
- Weather: lookup mensile statico per `country` + `month` (no API live)
- Visa / Power / Language / Safety: tabella statica in repo (`lib/country-info/*.ts`), aggiornata manualmente
- Tutto richiede `trip.destination.country` ben modellato (oggi: PlaceResult ha country, ma da verificare se è codice ISO)

**Stato vuoto**: se la destinazione non ha un country mappabile (es. multi-paese, regione vaga), la card mostra un messaggio "Add a destination to see country info" + link a edit destinazione.

---

### Dec 7 — Spine details: edit inline, no settings page

Tutti i dati nella spine sono **editabili inline**, pattern come la legacy: pencil compare su hover, click apre editor compatto sul posto.

**Righe**:
- 📅 **Dates** (start → end · n notti) | edit → DatePicker range
- 👥 **Travelers** (X adults · Y children) | edit → stepper
- 🏨 **Lodging** (nome hotel + zona, o "Not set yet") | edit → autocomplete places
- 💰 **Budget** (range o "Not set yet") | edit → BudgetInput esistente
- 🎨 **Theme** (chips dei temi scelti) | edit → toggle chips
- 📝 **Notes** (testo libero short, "Useful reminder: visas, packing…") | edit → textarea

**Perché niente settings page**: i dati del trip sono pochi, editarli sul posto è più veloce e mantiene il contesto. Coerente con il pattern di edit inline del builder.

**Eccezione**: cambio di destinazione è destructive (invalida country info, eventualmente day-photos). Per ora non offrirlo qui — fa nel menu trip-actions in AppHeader (eventualmente).

---

### Dec 8 — "Your trip so far": tre numeri e un next-up

Quando ci sono giorni, sotto le due colonne compare un blocco di recap:

```
YOUR TRIP SO FAR
9 days drafted · 12 activities · 5 yume saved
Next up: Day 2 (Tomorrow) — Tsukiji + Ginza
[Continue planning →]
```

- **3 numeri**: giorni pianificati, attività totali, yume salvati per questo trip (filtro geografico Yumeji)
- **Next-up**: il primo giorno futuro (rispetto a today) che ha attività, mostra label umano (Tomorrow / In 3 days / Day 7) + 2-3 attività headline
- **CTA**: porta al tab day-by-day sul giorno next-up

**Quando nasconderlo**: `days.length === 0` o `activities.length === 0`.

---

## Anatomia dettagliata

### Hero

```
┌────────────────────────────────────────────────────────────┐
│  [Go avatar] WELCOME, ENRICO                                │
│                                                              │
│  "Tokyo. Nove notti, due viaggiatori. Posso disegnarti      │
│   un primo itinerario in tre minuti."                       │
│                                                              │
│  [● Let Go plan it]   o  Build manually                    │
└────────────────────────────────────────────────────────────┘
```

- Background: `bg-surface` con bordo dashed soft
- Avatar Go con animazione pulse halo (riusa `.go-avatar` legacy)
- Nome utente in eyebrow (`text-orange micro uppercase tracking-eyebrow`)
- Frase AI: `font-serif italic text-[18px]/[22px] text-ink leading-snug`
- CTA primaria: `bg-orange text-white rounded-pill px-5 py-2.5` con icona rocket
- CTA secondaria: `text-ink-soft underline decoration-ink/20`

### Resume chip (returning only)

Sopra le CTA, compare:
```
[ ↻ Day 2 · Tomorrow — Tsukiji + Ginza ]
```
- Pill compatta `bg-surface-soft border border-border-strong`
- Click: salta direttamente al day-by-day sul giorno

### Trip details spine

Riusa il pattern `spine-row` della legacy:
- Icona circolare `bg-orange-soft text-orange-deep` a sinistra
- Eyebrow key uppercase micro
- Valore primario meta
- Sub-valore serif italic ink-faint
- Pencil edit on hover

### Country card

- Pannello `bg-surface border border-border rounded-md`
- Header con eyebrow "KNOW BEFORE YOU GO" + sub microcopy ("Last updated: …")
- Tab strip orizzontale (`flex border-b border-border`)
- Pane attivo sotto, padding generoso (`p-5`)

### Your trip so far

- Pannello su background `bg-bg` (non surface, per dare contrasto verticale)
- Numbers in serif size grande
- Next-up come card piccola con thumb attività

---

## Stati

1. **First access (immediatamente dopo create)** — `days=0`, ogni slot della spine semi-vuoto
2. **First access tornato dopo qualche tempo** — `days=0` ma utente ha settato dati (lodging, budget). Hero invariato.
3. **AI in-flight** — utente ha cliccato "Let Go plan it". Hero diventa loading state ("Sto pensando al tuo viaggio…"), spine e country card restano interattivi.
4. **AI completato** — `days>0`, hero passa a returning microcopy. "Your trip so far" appare.
5. **Returning, plan parziale** — `days>0` ma alcuni giorni vuoti. Microcopy "X di Y pronti".
6. **Returning, plan completo** — tutti i giorni hanno attività. Microcopy "Itinerario completo, riveder?"
7. **Trip in viaggio** (today tra start e end) — hero diventa "Today is Day 3. Goodbye Tsukiji, hello Ginza." → link diretto al day attivo.
8. **Trip concluso** (end < today) — hero diventa "Tokyo è dietro le spalle. Vuoi rivedere il diario o duplicarlo?"

Stati 7-8: fuori scope sessione corrente, da raccogliere come future work nel sketch.

---

## Open questions

- **Cittadinanza utente per visa**: dove la chiediamo? Profilo? Inferred da locale? Settings primo accesso?
- **Currency utente di base**: oggi probabilmente € hardcoded. Diventa setting profilo o inferred da locale?
- **LLM-deluxe per welcome copy**: ne vale il costo per il primo render? O i template deterministici sono sufficienti?
- **"Replan with Go" su returning**: destructive (sovrascrive i giorni esistenti) o additive (riempie solo i giorni vuoti)?
- **Hero in modalità AI in-flight**: progress bar o stato indeterminato? Esperienza migliore è "Go pensa ad alta voce" (stream di righe) — riusare GoChat in inline-mode?
- **Notifications / alert** (sciopero, chiusura imprevista) — la Trip Home è il posto giusto per mostrarle, o vivono altrove? (rimandato a sessione dedicata)

---

## Gap dipendenti

Per implementare la Trip Home end-to-end servono:

- [ ] Tabella `country_info` (visa, power, language phrasebook, safety, emergency numbers) — manuale, ~30 paesi top per cominciare
- [ ] Tabella `country_weather_monthly` (avg temp min/max, rain probability) — derivabile da open data
- [ ] Endpoint `/api/currency/rate?from=&to=` con cache 1h
- [ ] Field `user.country_of_citizenship` per visa lookup contestuale
- [ ] Field `user.base_currency` (o derivato da locale)
- [ ] Helper `getNextOpenDay(trip, today)` per resume chip
- [ ] Migrazione URL: spostare day-by-day da `/trips/[id]` a `/trips/[id]/days`, redirect `/overview` → root
