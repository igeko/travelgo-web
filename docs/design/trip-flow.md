# Trip flow · mappa end-to-end e gap UX

**Ultimo aggiornamento:** 2026-05-18
**Stato:** mappa di flusso fatta, 3 buchi rossi da chiudere, 4 decisioni pendenti
**Sketch React:** `app/(design)/design/trip-flow/page.tsx`
**Doc correlati:** [activities-editor.md](./activities-editor.md) · [safari.md](./safari.md)

---

## Happy path

`/trips` → click "Nuovo viaggio" → **Create trip modal** → "Create trip" → **Discovery zone** (esplora, salva in wishlist) → click "Build trip" → **Builder** (hero AI organizza, two-pane workshop) → click "Open" su un giorno → **Day page** (banner + Day Editor embedded) → click sul nome di un blocco → **Activity Detail** (entità).

| Step | URL | Stato | Note |
|---|---|---|---|
| Trips list | `/trips` | ✓ existing | Lista viaggi + CTA "Nuovo viaggio" |
| Create trip modal | overlay | ✓ existing | Destination obbligatorio + opzionali |
| Discovery zone | `/trips/[id]/discover` | ✓ sketch | Landing editoriale composta da DiscoveryWidget. Decisione: NON si atterra su trip overview. |
| Builder | `/trips/[id]/build` | ✓ sketch | 4 stati · trip-level AI distribuisce + workshop |
| Day page | `/trips/[id]/days/[n]` | ~ partial | Day Editor in sketch, pagina ospite legacy |
| Activity Detail | TBD | ⚠ missing | Click sul nome del blocco non porta da nessuna parte |

---

## Side roads

| Voce | URL | Stato | Decisione |
|---|---|---|---|
| Wishlist standalone | `/trips/[id]/wishlist` | partial | Oggi solo sidebar Builder. Pagina dedicata? |
| Map view | `/trips/[id]/map` | missing | Top nav Discovery la cita, mai disegnata |
| Trip overview | legacy `trip.html` | partial | Con Discovery come landing primaria, serve ancora? |
| Day-by-Day overview | legacy `daybyday_responsive.html` | partial | Integrare con Builder o tenere a sé? |

---

## Gap UX · checklist (priorità decrescente)

### 🔴 Missing (sblocca navigazione)

- [ ] **Activity Detail page** — click sul nome del blocco non funziona. Decisione 22 prevede la pagina ma sketch zero.
- [ ] **Map view** — promessa in Discovery top nav. Vista mappa POI con cluster + drawer dettagli da disegnare.
- [ ] **Onboarding · primo trip** — utente nuovo che crea il suo primo viaggio. Coach marks? Tour della Discovery? "Salva 3 cose per iniziare"?

### 🔵 Decisione

- [ ] **Trip overview · kill o riusare?** — la legacy `trip.html` aveva banner + dates + lodging + paesi info. Con Discovery come landing, serve ancora come pagina separata?
- [ ] **Wishlist standalone** — pagina dedicata `/wishlist` aggiunge valore o complica? Oggi vive bene come sidebar + nav voice.
- [ ] **Day-by-Day overview · integrare nel Builder?** — la legacy mostra tutti i giorni in scroll. Il Builder copre 80% del caso. Killare la legacy o ripensarla?
- [ ] **Trip-level controls** — mezzo principale, budget, travelers, tema, date editing. Dove vivono (settings panel, header dropdown, edit-trip page)?

### 🟡 Edge case

- [ ] **Discovery empty · wishlist vuota** — CTA "Build trip" cosa fa? Disabled? Tutorial? Auto-skip al Builder?
- [ ] **Builder · wishlist vuota** — hai cliccato Build prima di salvare. L'hero AI non ha cosa distribuire. Empty state che riporta a Discovery?
- [ ] **AI fallisce a "Organizza trip"** — loading va in errore. Retry? Fallback al workshop manuale? Stesso pattern del Day Editor?
- [ ] **Backtrack · Builder → Discovery** — sono nel Builder e voglio scoprire altre cose. "Discover more" da qualche parte?
- [ ] **Notifiche in-trip** — sciopero, chiusura imprevista, conferma prenotazione. Dove appaiono (banner sticky, bell icon, livello 3 del Day Editor)?

---

## Prossimo passo critico

**Activity Detail page** è il blocco numero uno. Sblocca:
- click sul nome di un blocco (oggi morto)
- "Used in" cross-trip (utile per chi torna in città già visitate)
- promozione di una wishlist entity a un trip diverso
- linking pubblico ("guarda questo posto") in v2+

Sketch da creare in `app/(design)/design/activity-detail/` (sibling di `activities-editor`, NON sotto — è IDENTITY level).

---

## Changelog

- **2026-05-18** · Mappa di flusso completa, 3 missing identificati (Activity Detail, Map view, Onboarding), 4 decisioni pendenti, 5 edge case. Sketch React + tracker MD.
