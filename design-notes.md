# Design notes — TravelGo

> Documento di handoff per il designer. Cattura le regole non scritte dello stile:
> cose che non si deducono leggendo il codice. La fonte di verità tecnica dei token
> resta `app/globals.css`.

## ★ Principio primario (vince su tutto)

**L'utente configura il proprio viaggio in modo fluido, guidato dall'AI — non
compilando moduli.** Quando una scelta di design è in conflitto con qualunque altra
regola di questo documento, vince questo principio.

- **Niente form di input esplicite.** Niente schermate di campi da riempire,
  niente wizard a step, niente "salva" finali. La configurazione emerge dalla
  conversazione con Go e da gesti diretti (tap, drag, selezione), non da un modulo.
- **Fluido, semplice, pulito.** Ogni interazione deve sembrare un passo naturale,
  non un compito. L'AI propone, l'utente conferma o ritocca.
- **Pochi controlli, scelti con cura.** Non mille opzioni/funzioni/toggle. Si decide
  con intenzione *cosa mostrare sempre*: solo l'essenziale resta a vista.
- **Se qualcosa fa rumore, si toglie — o si nasconde ma resta accessibile.** Il
  default è il minimo indispensabile; il resto si rivela on-demand (progressive
  disclosure), mai imposto. Meglio nascondere che affollare.
- **Test di ogni elemento**: "serve qui e ora, o è rumore?" Se non guadagna il suo
  posto a vista, va nascosto o rimosso.

## Voice & aesthetic

- **Cos'è TravelGo**: un planner di viaggi collaborativo. Costruisci l'itinerario giorno
  per giorno (drag & drop di attività e "yume" = idee/sogni di viaggio), con mappe,
  note e prenotazioni in un'unica vista. C'è un assistente AI conversazionale ("Go")
  che vive in un pannello flottante. Strumento personale, non enterprise: deve sembrare
  un **quaderno di viaggio curato**, non una dashboard B2B.
- **Tono visivo**: caldo, editoriale, calmo. Palette neutra crema + inchiostro
  teal-navy profondo, con l'arancio come unico accento vivo. Niente blu da SaaS
  generico, niente freddezza corporate. Tanto respiro, gerarchia tipografica chiara,
  densità media.
- **Tocco distintivo**: leggero motivo giapponese (concetto "yume / yumeji", font JP
  dedicato per accenti). Va dosato — è un sapore, non un tema.
- **Riferimenti che ci piacciono**: Linear (rigore, hairline, calma), Notion
  (densità leggibile), Airbnb/editorial travel (calore, foto, serif occasionale).
- **Riferimenti da evitare**: Material Design classico (ombre pesanti, ripple),
  gradient viola/neon, dashboard analitiche fredde, blu Bootstrap.

## Regole d'oro

- **Density**: comfortable, tendente al compatto nelle liste (itinerario, attività).
  Mai spacious/landing-y dentro l'app.
- **Palette** (token in `globals.css`, mai hex hardcoded):
  - Sfondo crema `#f1efe8`, superfici bianco/`#f5f3ee`.
  - Testo "ink" teal-navy `#0d2c3d` (+ soft `#5b6b78`, faint `#8a98a3`).
  - Primary arancio `#f47b3a`, accento lime `#e6f254`.
- **Bordi**: hairline 1px, bassissimo contrasto (navy all'8% di opacità). Lo "strong"
  è 18%. I bordi separano, non decorano.
- **Radius**: bottoni e chip **sempre pill** (999px); card 8–14px. **Mai > 14px.**
- **Motion**: minimale e funzionale (solo feedback ed entrate gentili, 150–280ms).
  Tutto in CSS puro, niente framer-motion. **Eccezione "Go"**: l'assistente AI può
  essere più espressivo (alone pulsante, wobble, sweep). Tutto rispetta
  `prefers-reduced-motion`.
- **Color usage**: l'arancio primary si usa **solo** per la CTA principale e accenti
  puntuali (stato attivo, hover di highlight). Non per superfici ampie. Il "solid"
  di default dei bottoni è **ink** (teal-navy), non arancio.
- **Tipografia**: system font stack (`-apple-system`…); serif (Georgia) disponibile
  per accenti editoriali. Heading con tracking stretto; scala semantica
  micro/tiny/mini/meta (10–13px) per metadati e label.

## Pattern ricorrenti

- **Empty state**: minimale — testo breve centrato, niente illustrazioni. Le zone
  droppabili mostrano un outline arancio tratteggiato su hover/drag-over. Tono del
  copy gentile e incoraggiante, non istruzioni secche.
- **Loading**: progressivo e discreto — la sezione che carica va in `opacity` ridotta
  + non interattiva, oppure un semplice "loading" testuale / sentinel per
  l'infinite-scroll. Niente spinner invadenti. (Spazio per introdurre skeleton coerenti
  se servono.)
- **Error**: oggi quasi tutto è **ottimistico e silenzioso** (update immediato, rollback
  dello stato in caso di fallimento, nessuna notifica). **Non esiste ancora un sistema
  di toast** — se il design lo introduce, definirlo come pattern dedicato.
- **Feedback / conferme**: via modale (`FeedbackModal`), non toast.

## Cosa NON fare mai

- Niente hex/rgba hardcoded: se manca un colore, si aggiunge un token in `@theme`.
- Niente dark mode (l'app è light-only by design).
- Niente gradient viola/neon; nessun gradient su superfici ampie dentro l'app.
- Niente border-radius > 14px; niente bottoni squadrati (i bottoni sono pill).
- Niente ombre pesanti/drop-shadow generiche: l'unica elevazione è `shadow-float`
  per i pannelli flottanti (Go, toolbar mappa).
- Niente arancio come colore di sfondo dominante — resta accento.
- Niente emoji nella UF di prodotto.
- Niente affordance solo-hover senza fallback touch (`opacity-0 group-hover` →
  usare `opacity-30 group-hover:opacity-100 focus-within:…`).

## ⚠️ Incoerenza nota da risolvere

La **landing marketing** (`app/(marketing)/page.tsx`) usa un hero con gradient
**azzurro→indaco** (`from-sky-600 to-indigo-600`) e sfondo `sky-50`. Questo **stona**
con la palette calda dell'app vera (crema + teal + arancio). Da allineare: la landing
dovrebbe parlare la stessa lingua visiva del prodotto. Punto da decidere insieme.
