# Brief — Travel Search UX

## Contesto

TravelGo è un'app di pianificazione viaggi. Oggi la ricerca dei posti è guidata da **Go**, l'assistente AI: l'LLM genera suggerimenti e li aggancia a Google Places via lookup. L'AI sbaglia troppo spesso (posti inesistenti, foto sbagliate, ranking opaco).

Vogliamo invertire il rapporto: **ricerca primaria stile Google Maps, Go come strato di supporto e arricchimento successivo**.

## Obiettivo

Disegnare la UX della ricerca posti per la vista mappa di un viaggio (oggi: pagina `ExploreMap` interna a un trip). L'utente deve poter:

- cercare un posto specifico o una categoria
- vedere risultati reali con foto, rating, orari (dati Google Places)
- agire sul singolo risultato **nel contesto del proprio viaggio**: salvarlo, aggiungerlo a un giorno, chiedere a Go di approfondire

L'esperienza deve essere familiare (paradigmi Google Maps: barra di ricerca sulla mappa, pin sui risultati, lista in pannello/bottom sheet) ma riconoscibilmente **un'app travel, non un clone di Maps**.

## Cosa la rende "travel" e non "Google"

1. **Trip-aware.** La ricerca è ancorata alla destinazione del viaggio, non alla posizione fisica dell'utente. "Ramen" cercato da casa restituisce Tokyo. L'utente può switchare tra "destinazione" e "area visibile sulla mappa".
2. **Primary action ≠ "vedi info".** Su Google la primary è aprire la scheda. Da noi è **"aggiungi al Giorno X"** o **"salva in wishlist"**. Info Google (foto, rating, sito, orari) restano accessibili ma non sono il centro.
3. **Itinerario-aware.** Un posto già pianificato si vede a colpo d'occhio (badge "Giorno 3 · 15:30"). Mostriamo distanza dall'alloggio e dalle attività vicine già in calendario.
4. **Tematico.** I temi del trip (food, arte, natura, famiglia, slow…) biasano filtri di default e ranking. Filtri rapidi a chip.
5. **Modalità Esplora.** Senza query, l'utente può lanciare un "Cose interessanti in questa zona" sul viewport corrente (Nearby Search).
6. **Go come supporto, non sostituto.** Affordance discreta nei risultati: "Perché questi?", "Filtra per atmosfera serale", "Trova qualcosa di simile ma meno turistico". Go raffina e racconta, non genera più i posti.

## Schermate da disegnare

1. Stato vuoto + barra di ricerca sopra la mappa (default centrato sulla destinazione)
2. Autocomplete mentre l'utente digita
3. Risultati di una query libera (es. "ramen") — pin sulla mappa + pannello lista
4. Risultato singolo selezionato (un pin / un place_id) — card dettaglio con foto, rating, orari, distanza dall'alloggio
5. Stato "già pianificato" — come segnaliamo che un posto è già nel trip
6. Modalità "Esplora questa zona" senza query
7. Aggancio a Go — dove e come l'utente lo invoca dai risultati

**Mobile-first**, deve scalare a desktop (la pagina trip è responsive).

## Non-goals

- Non è una ricerca globale del prodotto (no voli, no hotel — solo posti/luoghi)
- Non è un navigatore (no turn-by-turn, no traffico)
- Non vogliamo replicare l'estetica corporate di Google Maps. Il tono è caldo, editoriale, leggermente serif

## Vincoli tecnici e di stile

- Esiste un **design system** con token (`app/globals.css`): brand orange + ink scuro, surface chiare, font Inter + serif per accenti
- Esiste già un componente `Map` (Google Maps JS SDK, stili custom che mostrano attrazioni/parchi/transit ma nascondono i business)
- Esiste già la pagina `ExploreMap` — questa UX la rimpiazza o la estende
- Tutti i dati disponibili lato server: autocomplete, place details, foto, text search, nearby search
- i18n: italiano + inglese

## Domande aperte (libere di esplorare)

- Bottom sheet espandibile o sidebar fissa per la lista risultati?
- Quanti pin di default — top 5, top 10, tutti quelli nel viewport?
- Filtri: chip in cima, drawer, o entrambi a seconda della density?
- L'aggancio a Go è un FAB persistente, una riga nei risultati, o un'azione contestuale sulla card?
- Quando l'utente "salva", è azione one-tap (default al giorno corrente / wishlist) o serve sempre un picker?

## Deliverable atteso

Mockup hi-fi delle 7 schermate, **mobile + desktop**, in Figma. In aggiunta: 2–3 micro-interaction chiave annotate (apertura bottom sheet, swipe tra risultati, "Esplora questa zona", aggancio Go).
