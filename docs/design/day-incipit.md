# DayIncipit · Spec viva

**Sketch di riferimento**: `/design/day-incipit`
**Embedding target**: head di `TripDayView` (righe 479-489 attuali)
**Ultima sessione**: 2026-05-21

---

## Decisioni

### Dec 1 — Unione di Quote + GoLaunchTrigger

I due blocchi che oggi vivono separati nella head del Day (`<Quote>` con summary/notes + `<GoLaunchTrigger>` con banner Ask me) si fondono in un unico componente `DayIncipit`. Una sola voce — Go racconta la giornata e in fondo invita alla chat, in linea conversazionale.

**Perché**: l'utente percepiva ridondanza (due "voci di Go" consecutive — una editoriale, una promozionale). Unificare riduce rumore visivo e rende esplicito che la stessa voce che ti ha appena raccontato il giorno è quella che puoi interrogare.

---

### Dec 2 — CTA conversazionale inline, non bottone-banner

La call to action prende la forma di una riga inline sotto la nota pratica, non di un banner separato con bottone pillola.

**Pattern**: `[sparkles] Vuoi trovare [parola che ruota in serif italic]? Chiedi a me. [→]`

**Perché**:
- Continuità tonale con la voce del Quote (serif italic)
- Discoverable senza essere intrusivo
- Niente em-dash, niente pipe, niente "—" — punteggiatura italiana classica

---

### Dec 3 — Animazioni "calme"

Quattro animazioni infinite, tutte lente; nessun nudge periodico (no shake, no bounce, no attention-grab).

| Elemento | Effetto | Durata | Curva |
|---|---|---|---|
| Halo Go avatar | opacity 0.55→1 + scale 1→1.12 | 2.8s | ease-in-out |
| Sparkles twinkle | scale + rotate + opacity | 4.5s | ease-in-out |
| RotatingWords cycle | translateY a step di -22px | 14s totali (~3.5s/word) | cubic-bezier(.65,.05,.36,1) |
| Underline "Chiedi a me." | scaleX 0→1 origin-left | 300ms | cubic-bezier(.4,0,.2,1) — solo hover/focus |
| Arrow slide | translateX 0→4px | 200ms | ease — solo hover/focus |

Tutto rispetta `@media (prefers-reduced-motion: reduce)`: halo, sparkles e rotating words si fermano sulla prima parola.

---

### Dec 4 — Rotating words universali (per ora)

Lista unica, non contestualizzata per giorno/destinazione:

```json
["un posto da visitare", "dove mangiare", "una pausa caffè", "un'idea per stasera"]
```

i18n: chiave `DayIncipit.rotatingWords` in `messages/{en,it}.json`.

**Aperto**: in futuro contestualizzare per tema del giorno (Day "mare" → "dove fare il bagno", "un aperitivo vista mare", ecc.). Decidere chi le genera — statico per tema o AI a partire dal contesto del giorno.

---

### Dec 5 — Componente RotatingWords da estrarre

`RotatingWords` appare in due punti: questo componente + `GoChat > GoTrigger`. Promuoverlo a `components/ui/RotatingWords.tsx` con props `{ words: string[]; durationS?: number; itemHeightPx?: number }`. Aggiungere voce in `app/(dev)/dev/registry.ts` sotto Atoms.

---

### Dec 6 — Quando mostrare la CTA

Attualmente il `GoLaunchTrigger` è condizionato a `!goHasBeenOpened`. Mantenuto: se Go è già stato aperto in questa sessione, la CTA del DayIncipit non si mostra, ma il blocco continua a esistere con avatar + halo + Quote.

**Da validare**: forse la CTA deve sempre essere visibile (la chat può essere richiamata anche dopo). Decisione rimandata a feedback in browser sullo sketch.

---

## Anatomia

```
┌─ Container .flex .items-start .gap-3.5
│
├─ ① GoAvatar 40px (riuso da features/ai-suggest)
│  └─ halo arancio pulsante (gradient radiale, animation 2.8s)
│
└─ Body .flex-1 .border-l-3 .border-orange .pl-3.5
   │
   ├─ ② Lead — serif italic 18px, text-ink, leading 1.45
   │  (era Quote.lead)
   │
   ├─ ③ Note opzionale — sans 13px, text-ink-soft, leading-snug, mt-2
   │  (era Quote.note)
   │
   └─ ④ GoCta button — .group .mt-3 .inline-flex .gap-2
      │
      ├─ Sparkles (twinkle 4.5s)
      ├─ "Vuoi trovare" (serif italic ink)
      ├─ RotatingWords (4 parole, ciclo 14s, serif italic orange-deep)
      ├─ "?"
      ├─ "Chiedi a me." (serif italic ink, underline arancio su hover)
      └─ Arrow (slide 4px su hover, orange-deep)
```

---

## API

```typescript
type DayIncipitProps = {
  /** Lead — racconto del giorno in serif italic (era Quote.lead) */
  summary: string;
  /** Nota pratica opzionale — sans-serif, text-ink-soft (era Quote.note) */
  notes?: string;
  /** Handler aperto chat Go. Se assente, la CTA non è renderizzata. */
  onAskGo?: () => void;
  /** Override delle rotating words. Default: lista universale i18n. */
  words?: string[];
  className?: string;
};
```

**Regole di rendering**:

- `!summary && !notes` → non renderizzare nulla
- `!summary && notes` → renderizza `notes` come lead (fallback corrente di TripDayView)
- `!onAskGo` → omettere `GoCta`, ma mantenere avatar e Quote
- Component è `"use client"` per hover state e keyframes locali

---

## Accessibilità

- L'intera CTA è un `<button type="button">` con `aria-label` completo (es. `"Apri la chat con Go per consigli sul giorno"`)
- Sparkles e arrow sono `aria-hidden`
- `RotatingWords` espone via `aria-label` la lista completa, e marca la `<ul>` interna come `aria-hidden`
- Focus visibile: `focus-visible:ring-2 ring-orange/40 ring-offset-2 ring-offset-bg`
- Tutte le animazioni rispettano `prefers-reduced-motion`

---

## Stato sketch (2026-05-21)

- [x] Sketch `/design/day-incipit` con 4 stati (default, in-context, anatomia, varianti copy)
- [x] Sezione linee guida sviluppatore inline
- [x] Animazioni implementate via keyframes locali
- [ ] Estrazione `RotatingWords` in `components/ui/`
- [ ] Componente reale `features/day/DayIncipit.tsx`
- [ ] Sandbox entry `app/(dev)/dev/day-incipit/` + registry
- [ ] Stringhe i18n `DayIncipit.*`
- [ ] Sostituzione in `TripDayView.tsx` righe 479-489
- [ ] Rimozione `GoLaunchTrigger` se non riusato altrove

---

## Prossimi step

1. Validare sketch in browser → feedback UI
2. Estrarre `RotatingWords` come atomo riusabile (atomo già presente in GoTrigger)
3. Scrivere componente reale `features/day/DayIncipit.tsx`
4. Aggiungere sandbox entry + registry
5. Sostituire blocco in `TripDayView.tsx`
6. Verificare se `GoLaunchTrigger` può essere eliminato
