---
title: Add to Trip — UX/UI brief
description: Componenti visivi e stati da progettare per il flusso di inserimento tappa dall'Explore Next.
date: 2026-06-07
status: draft
---

# Add to Trip — UX/UI brief

## Contesto

Nella pagina Explore Next l'utente cerca luoghi sulla mappa e li aggiunge al piano. L'algoritmo inserisce automaticamente la tappa nella posizione più logica, ma può generare situazioni di warning che devono essere comunicate chiaramente senza bloccare il flusso.

---

## 1. Indicatore di "riempimento giorno" nella Timeline

Ogni giorno nella colonna sinistra deve comunicare quanto è pieno.

**Da progettare:**
- Visualizzazione della % di ore occupate rispetto alle ore disponibili (es. barra orizzontale sottile sotto il titolo del giorno, o fill del badge)
- Stato **quasi pieno** (es. >80% occupato) — segnale visivo soft, colore warning
- Stato **overflow** — il giorno ha attività che sforano mezzanotte. Colore danger (già abbiamo `danger-*` tokens). Badge o bordo del giorno diventa rosso.
- Messaggio inline nel dettaglio del giorno overflow: *"Alcune attività di questo giorno superano la mezzanotte. Controlla gli orari."*

---

## 2. Attività geograficamente incoerente

Un'attività che dista più di 50 km dalle altre dello stesso giorno viene marcata.

**Da progettare:**
- L'attività nella lista del giorno mostra un indicatore danger (icona warning o bordo rosso)
- Il giorno nella Timeline eredita il colore danger se contiene almeno un'attività incoerente
- Tooltip/label sull'attività: *"Questa tappa è molto lontana dalle altre di questo giorno"*

---

## 3. Toast / feedback post-inserimento

Dopo ogni "Add to trip" l'utente deve sapere dove è finita la tappa.

**Da progettare:**
- Toast di conferma: *"Aggiunto al Giorno 4 — dopo Shinjuku Gyoen"*
- Toast warning per duplicato: *"Questo posto è già nel Giorno 2. Aggiungi comunque?"* con azione Conferma / Annulla
- Toast warning per overflow risolto: *"Spostato al Giorno 5 per mancanza di spazio"*
- Toast warning per overflow non risolvibile: *"Il Giorno 5 è già pieno — controlla manualmente"*

---

## 4. Stato "giorno pieno" nel badge giorno

Il badge laterale (THU / FRI / SAT…) oggi è arancione per il giorno selezionato, grigio/neutro per gli altri.

**Nuovi stati da progettare:**
- **Overflow** → danger red, con piccola icona warning
- **Quasi pieno** → warning amber, segnale preventivo
- **Incoerente** → danger red (stesso colore overflow, ma icona diversa — es. pin con slash)

Gli stati si combinano: un giorno può essere sia overflow che incoerente.

---

## 5. Conferma inserimento cross-day (Advanced Feature, design ora)

Quando l'algoritmo di routing rileva che la tappa è "lungo il percorso" su un giorno diverso da quello selezionato, mostra un bottom sheet o card di conferma:

**Da progettare:**
- Card sovrapposta alla mappa: *"Tokyo Ramen si trova lungo il percorso del Giorno 4, tra Shinjuku e Shibuya (+4 min)"*
- CTA primaria: "Inserisci lì"
- CTA secondaria: "Inserisci qui invece" (rispetta selezione corrente)
- Design anche del caso in cui ci siano 2-3 candidati alternativi

> Questa feature è deferred (non implementata ora) ma il design può essere fatto già per non bloccarsi dopo.
