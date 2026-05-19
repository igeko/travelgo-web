# ActivityTimeline — Day Editor · Spec viva

**Sketch di riferimento**: `/design/activities-editor/day`  
**Embedding target**: sezione "Day itinerary" dentro `TripDayView` (sostituisce `<Itinerary>`)  
**Ultima sessione**: 2026-05-19

---

## Decisioni architetturali

### Dec 15 — Data model: extend `activities`, non nuova tabella

Si estende la tabella `activities` esistente con le colonne mancanti invece di creare `timeline_blocks`.  
Motivazione: backward-compat con API esistenti, zero migrazione dati, `activities` = block instance (concetto rinominato).

Colonne da aggiungere:
```sql
ALTER TABLE activities ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'place'
  CHECK (type IN ('place','move','meal','pause','action'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS fuzzy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS instance_note TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS booking_status TEXT
  CHECK (booking_status IN ('todo','booked','paid'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS bridge_in_json JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS bridge_out_json JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES activities(id);
```

`entity_id`: puntatore all'attività "originale" nella wishlist/DB community. NULL = blocco free-form/fuzzy.

---

### Dec 16 — View default: Timeline (spine view)

Il toggle `Lista | Timeline | Racconto` ha **Timeline come default**.  
Lista = vista compatta flat (da progettare dopo).  
Racconto = vista narrativa (da progettare dopo).

---

### Dec 17 — Bridge = block di tipo `move`

Il bridge (spostamento tra due luoghi) è un blocco di tipo `move` nella timeline, non un'entità separata.  
I dettagli del trasporto (mezzo, durata, linea, fermate, nota) sono serializzati in `bridge_in_json`/`bridge_out_json` del blocco precedente/successivo, oppure come campi del blocco `move` stesso.

**Scelta implementativa**: il blocco `move` porta in sé tutti i dati del trasporto (non split tra in/out).

---

### Dec 18 — Fuzzy flag

Un blocco fuzzy:
- Non ha location precisa (o ha orario approssimativo)
- Visualizzato con bordo tratteggiato, icona generica, titolo in italic uppercase
- Dot sulla spine: grigio invece di arancio
- `fuzzy = TRUE` in DB; `entity_id` può essere NULL o non-NULL

---

### Dec 19 — Auto-save inline, niente footer/toggle edit

Il Day Editor non ha:
- Day banner proprio (ereditato da `HeroBanner` della pagina ospite)
- Edit toggle — è sempre in modalità edit quando l'utente è owner
- Sticky footer con save button — ogni modifica si auto-salva con debounce 800ms

---

### Dec 24 — Sections: Morning / Afternoon / Evening / Night

Derivate dallo slot (`slot` column esistente). I divider sono decorativi con:
- Label arancio uppercase
- Linea orizzontale `bg-orange/20`
- Counter "N att"
- La spine verticale **attraversa** il divider senza interruzione

---

### Dec 25 — Add affordance: visibile solo su hover

La zona add tra blocchi è invisible di default. Hover su quella zona rivela:
- Cerchio arancio `+` sulla spine
- Due CTA: `+ blocco` (arancio, opens free-form composer) · `+ attività` (ghost, opens autocomplete)

L'affordance appare dopo ogni blocco (place/meal/pause/action), **non** dopo bridge e **non** adiacente a un section divider.

---

### Dec 26 — Instance popover vs Entity detail

**Pencil** → popover di istanza: time, fuzzy flag, instance_note, booking_status  
**Click sul nome** → naviga ad Activity Detail (entità, `/activities/[id]`)

Il popover NON tocca campi entità (nome, descrizione, location, foto). Quelli si editano nell'Activity Detail.

---

### Dec 27 — AI "Organizza questo giorno" → day-level only

Il bottone arancio in toolbar riordina i blocchi del **giorno corrente** (orari, sequenza logica, ponti).  
NON tocca altri giorni — quello è il trip-level AI nel Builder.  
Endpoint: `POST /api/days/[id]/ai-organize` → gpt-4o-mini, prompt nel file `features/go/prompt.ts`.

---

## API da implementare

| Metodo | Path | Scopo |
|--------|------|-------|
| GET | `/api/days/[id]/blocks` | Timeline del giorno (ordinata per slot+position) |
| POST | `/api/days/[id]/blocks` | Aggiungi blocco (free-form o da entity_id) |
| PATCH | `/api/blocks/[id]` | Edit istanza (time, fuzzy, instance_note, booking_status) |
| DELETE | `/api/blocks/[id]` | Rimuovi dal giorno (entità resta in wishlist) |
| PATCH | `/api/blocks/[id]/bridge` | Edit dati ponte (mezzo, durata, linea, nota) |
| POST | `/api/days/[id]/ai-organize` | AI riordino day-level |
| GET | `/api/activities/search?trip_id=X&q=tsukiji` | Autocomplete 2-gruppi (wishlist + platform) |
| POST | `/api/activities` | Crea da autocomplete + auto-add wishlist |

---

## Component layout (features/)

```
features/
  day-timeline/
    ActivityTimeline.tsx       ← componente principale, sostituisce <Itinerary>
    TimelineBlock.tsx          ← blocco singolo (place/meal/pause/action/move)
    BridgeCard.tsx             ← bridge espandibile
    AddAffordance.tsx          ← zona + tra blocchi
    ActivityAutocomplete.tsx   ← dropdown 2-gruppi
    BlockComposer.tsx          ← form free-form new block
    InstancePopover.tsx        ← popover edit istanza
    useTimeline.ts             ← stato locale + optimistic updates + auto-save
    types.ts                   ← Block, Bridge, Section types
```

---

## Stato sketch (2026-05-19)

- [x] Route group `(design)` creato
- [x] Sketch `/design/activities-editor/day` con mock Tokyo
- [x] Toolbar completa (eyebrow, Show map, Organize this day, view toggle)
- [x] Spine view con sezioni Morning/Afternoon/Evening
- [x] Blocchi tipizzati (place/meal/pause/action) con variante fuzzy
- [x] Bridge chiuso e espanso (7 mezzi, durata, linea, note)
- [x] Hover actions (pencil, trash, drag handle)
- [x] InstancePopover (time, fuzzy, nota, booking_status)
- [x] AddAffordance tra blocchi
- [x] BlockComposer free-form con type chip
- [x] ActivityAutocomplete 2 gruppi + highlight + crea nuovo
- [ ] Drag & drop (da implementare con @dnd-kit)
- [ ] Vista Lista
- [ ] Vista Racconto

## Prossimo step

1. Validare lo sketch in browser → feedback UI
2. Migration Supabase (Dec 15 columns)
3. DAL types + API routes
4. Feature component reale in `features/day-timeline/`
5. Embedding in `TripDayView`
