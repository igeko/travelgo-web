---
title: Go Agent — roadmap planning
description: Evoluzione di Go da chat che suggerisce ad agente che compone e ricorda la roadmap del viaggio, integrato con i service dell'app via tool-calling.
date: 2026-05-25
status: draft
---

# Go Agent — roadmap planning

Brief architetturale per far evolvere Go. Obiettivo: Go propone idee di viaggio e **compone la roadmap** dell'intero viaggio o di un singolo giorno, **ricorda l'avanzamento** tra sessioni, ed è **integrato con tutte le funzioni** dell'applicazione. Il flusso di riferimento è `app/(design)/design/trips-new-v5.html` (Blank → Chip-fill → Laconico → Skeleton → Nudge → Day attivo).

## Punto di partenza (oggi)

- **Stateless.** `/api/go/chat` riceve l'array messaggi + un `tripContext` ricostruito al volo da `getGoContext()`. Nessuna persistenza della conversazione: reload = thread perso.
- **Go propone, non agisce.** Restituisce solo testo o `suggestions` JSON. Le azioni le applica l'host tramite il bus eventi (`activity.add`, `place.focus`…). Go non crea giorni, non compone lo scheletro, non scrive sul DB.
- **Router rigido a 3 modi.** Un classifier sceglie `chat` | `suggestions` | `deepdive`. "Componi l'intera roadmap" non entra in nessuno dei tre.
- **L'astrazione LLM non ha tool-calling.** `LlmAdapter` espone solo `chatJson`, `chatStream`, `chatGrounded`.

Conclusione: ciò che serve non è un prompt più ricco, ma il passaggio da "chat che suggerisce" a **agente che agisce tramite tool**.

## Architettura target

### 1. Tool-calling nell'astrazione LLM (fondamenta)

Aggiungere un metodo `chatTools()` a `LlmAdapter`, con schema tool provider-neutral, implementato per OpenAI (function calling nativo) e Gemini (function calling). È il prerequisito di tutto: senza, "integrato con tutte le funzioni" non è realizzabile in modo pulito. Coerente col principio di provider decoupling già adottato in `lib/ai/llm`.

Contratti neutri (in `lib/ai/llm/types.ts`):

```
export type LlmTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ChatToolsOptions = {
  tier: LlmTier;
  messages: LlmMessage[];
  tools: LlmTool[];
  toolChoice?: "auto" | "required" | "none";
};

export type ChatToolsResult = {
  text: string;            // narrazione finale (può essere vuota se solo tool)
  toolCalls: LlmToolCall[];
  provider: LlmProvider;
  model: string;
};
```

Nota: `LlmMessage` va esteso per portare i ruoli `tool` e i `tool_calls` dell'assistant, così il loop può rispedire i risultati al modello.

### 2. Catalogo tool = wrapper sottili sui service esistenti

Ogni tool gira **server-side**, dietro le guard/RLS già esistenti, e rispetta la regola `route → service → DAL`. Nessun tool tocca il DB direttamente: chiama un metodo di service.

| Tool | Scope | Service sottostante | Tipo |
|------|-------|---------------------|------|
| `getTripState` | trip | TripService.getSnapshot | read |
| `setTripMeta` | trip | TripService.update (place/date/travelers/theme) | write |
| `proposeSkeleton` | trip | (nessuna scrittura: ritorna bozza) | compute |
| `applySkeleton` | trip | DayService.bulkCreate | write |
| `addDay` / `updateDay` | day | DayService | write |
| `scheduleActivity` | day | ActivityService + scheduling (stato `proposed`) | write |
| `confirmProposal` | day | scheduling: flip `booking_status` | write |
| `listSuggestions` | trip/day | path grounded già esistente | read |

Si parte da `getTripState` (read-only) per validare il loop, poi si aggiungono i write.

### 3. Due canali d'azione separati

- **Tool (server) = dati.** Mutazioni persistite via service, autorizzate, RLS. *Nuovo.*
- **Eventi (client) = UI.** Pan mappa, apri editor, evidenzia ghost. *Già esiste (`features/go/events.ts`), si mantiene.*

Regola: un tool che cambia i dati può, dopo l'esecuzione, far emettere all'host anche un evento UI (es. `scheduleActivity` → evento `place.focus` sul nuovo pin), ma le due responsabilità restano distinte.

### 4. Tre livelli di memoria

1. **Stato del viaggio (verità).** Già in Postgres (`trips`/`days`/`scheduled_activities`). È *già* l'avanzamento: Go lo rilegge fresco a ogni turno via `getTripState`. Fonte di verità, non si duplica.
2. **Conversazione.** Nuova tabella `go_messages`: il thread sopravvive a reload e ritorno sul viaggio.
3. **Planning state.** JSON in `go_sessions`: fase del flusso v5, entità estratte non ancora confermate, scope corrente (intero viaggio vs singolo giorno), riferimenti alle proposte pendenti.

### 5. Le proposte come righe reali (chiave per "ricordare")

Una proposta di Go = una `scheduled_activities` reale in stato **proposed** (si sfruttano i ghost day + `booking_status` già presenti). Il tool la scrive, la UI la mostra come card dashed "Suggerita da Go", `confirmProposal` fa il flip di stato. Così la "doppia visibilità" del v5 (ghost a sinistra + testo in chat a destra) è gratis, persistente e sopravvive al reload.

## Modello dati (tabelle dedicate)

Persistenza su tabelle dedicate, RLS per membership del viaggio.

### go_sessions

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid pk | |
| trip_id | uuid fk trips | on delete cascade |
| phase | text | blank \| chip_fill \| skeleton \| nudge \| day \| free |
| planning_state | jsonb | entità estratte non confermate, proposte pendenti |
| created_by | uuid fk auth.users | |
| created_at / updated_at | timestamptz | |

Nota su `scope`: **non è una colonna**. Se Go opera sull'intero viaggio o su un singolo giorno è un dato **transitorio**, che cambia turno per turno nella stessa conversazione ed è già nel contesto di request (`GoContext.page` + focus, lo stesso usato per il gating). Persisterlo duplicherebbe stato che vive altrove e rischierebbe di diventare stale. Se servisse ricordare "dove Go stava lavorando" per riprendere, va in `planning_state`, non in una colonna.

Nota su `phase`: in parte **derivabile** dallo stato del viaggio (niente giorni → blank, giorni senza attività → skeleton…). Tenuta perché cattura l'intenzione del flusso v5, ma da rivalutare: se risulta sempre ricostruibile, si può eliminare.

### go_messages

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid pk | |
| session_id | uuid fk go_sessions | on delete cascade |
| trip_id | uuid fk trips | denormalizzato per RLS semplice |
| role | text | user \| assistant \| tool |
| content | text | |
| tool_calls | jsonb | quando assistant richiede tool |
| tool_call_id | text | quando role=tool, lega il risultato |
| created_at | timestamptz | |

RLS: SELECT/INSERT consentiti ai membri del viaggio (stesso pattern delle altre entità trip-scoped). Accesso solo via nuova entità DAL (`lib/dal/entities/Go.ts` o simile) + service, tabelle referenziate via enum in `lib/dal/tables.ts` (mai stringhe).

## Endpoint agent loop

Nuovo `/api/go/agent` (o evoluzione di `/api/go/chat`), wrappato in `route()`, guard `requireTripMember`:

1. Carica `go_session` attiva + ultimi N `go_messages`.
2. Compone i messaggi: system + `getTripState` + history + nuovo messaggio utente.
3. Chiama `chatTools` col catalogo tool ammesso per il contesto corrente (page + focus della request).
4. Se ci sono `toolCalls`: esegue ognuno via service (guarded), accoda i risultati come messaggi `tool`, ripete il loop (cap di iterazioni come guardia di costo).
5. Streamma la narrazione finale; persiste i messaggi; emette gli eventi UI per l'host.

Il classifier attuale e i path `suggestions`/`deepdive` possono restare per le domande leggere oppure essere assorbiti in `listSuggestions`/`getTripState` come tool (decisione aperta sotto).

## Aggiornamento dello stato

`go_sessions` si aggiorna **alla fine di ogni turno, dentro l'agent loop**, nella stessa transazione in cui si persistono i `go_messages`. È il loop a scrivere, non un processo separato.

Regola chiave: **niente riassunto LLM della chat come fonte di stato** (lossy, va in drift). Lo stato è una **proiezione strutturata scritta dai tool in modo deterministico**:

- entità **confermate** (place, date, travelers, theme) → finiscono nella *verità* (il trip) via `setTripMeta`, non in `planning_state`;
- **proposte pendenti** → sono `scheduled_activities` in stato `proposed` (righe reali): si **interrogano**, non si riassumono;
- in `planning_state` resta solo l'effimero non ancora materializzato in riga: entità **estratte ma non confermate**, scritte esplicitamente dal tool che le ha prodotte;
- `phase` → regola di transizione esplicita (eventuale tool `setPhase`) oppure derivata dallo stato del viaggio. Mai da riassunto.

Quando serve davvero una sintesi LLM: **solo per la compattazione** quando `go_messages` diventa lungo (riassumere i turni vecchi per stare nel budget token). È un *contesto* compresso, **separato** da `planning_state` — non ne è la fonte.

## Widget & tool gating

Go è un'istanza sola nell'app, ma **non si offrono tutti i tool a ogni turno**: troppi token, più latenza, peggior selezione del modello. Vanno separati due livelli.

1. **Registry di rendering (frontend)** — `widget-registry.ts` mappa `widget: string` → `{ schema, component }`. Può contenere centinaia di widget: il modello emette solo il discriminante (`GoResponse.widget`) + payload, il frontend risolve il componente. Mai inviato all'LLM, costo prompt zero.
2. **Set offerto all'LLM (per-turn)** — piccolo e filtrato dal contesto. Sostituire `getAllToolDefinitions()` con `getToolDefinitions(ctx)`:

```
// WidgetDefinition: nuovo campo
availableWhen?: (ctx: GoContext) => boolean;  // oppure scopes: Array<"trip"|"day"|"activity"|"wishlist"|"planning">

getToolDefinitions(ctx: GoContext) {
  return [...this.map.values()]
    .filter(d => d.availableWhen?.(ctx) ?? true)
    .map(d => ({ type: d.type, ...d.toolDescription }));
}
```

Il contesto per filtrare esiste già in `GoContext` (`page`, `trigger.source`, fase del planning). Esempio: in pagina Day → `listSuggestions` + `scheduleActivity` + `confirmProposal`; in planning iniziale → `setTripMeta` + `proposeSkeleton` + `applySkeleton`. Idealmente cifra singola di tool per turno. Opzionale: router cheap che sceglie la **famiglia**, poi chiamata focalizzata con solo quegli schemi.

## Context caching

Anche con un set ricco (es. `trips/new`), le definizioni dei tool sono **costanti server-side** (registry): il client non le invia mai. Il costo è che entrano nella chiamata al modello a ogni turno. La leva è il caching del prefisso stabile, **senza configurazioni su dashboard**:

- **OpenAI**: prompt caching automatico sul prefisso ripetuto. Nessun setup.
- **Gemini**: context caching implicito (modelli recenti) o esplicito (oggetto `CachedContent` con TTL, creato da codice).

Regole per massimizzare i cache hit:
- prefisso stabile **per primo** (system prompt + definizioni tool), variabile **in fondo** (trip state, messaggio utente);
- **ordine dei tool fisso** tra i turni;
- gating per fase per ridurre comunque la dimensione del set.

## Nota di sicurezza — niente assistant gestito dal provider

Il system prompt è **già lato server** e l'utente non può cambiarlo (la route lo inietta a ogni chiamata; l'utente manda solo messaggi `user`, e i dati non fidati passano da `wrapUntrusted`). Spostarlo dentro un *assistant* gestito (OpenAI Assistants / agent object con prompt+tool+memoria+thread) **non aggiunge protezione anti-injection** e in più rompe il decoupling (config OpenAI ≠ Gemini, fuori da git → niente diff/review), introduce lock-in stateful (thread sul provider vs `go_sessions`) e tiene i tool fuori dal path con RLS.

La protezione reale nel mondo agentico è l'**executor**: ogni tool gira dietro le guard (`requireTripEditor`…) e la RLS. Anche se un'injection convince Go a chiamare un tool distruttivo, l'esecuzione non può superare i permessi dell'utente. La sicurezza sta nell'esecutore, non in dove è salvato il prompt. Ammesso e consigliato: `system_instruction` / prefisso cacheato (è solo *dove* collochi il testo, comunque definito nel codice).

## Sequenza incrementale

1. **A — Fondamenta.** `chatTools` nel layer LLM (OpenAI + Gemini) + tool read-only `getTripState`. Valida il loop agentico end-to-end senza scrivere sul DB.
2. **B — Persistenza.** Migrazioni `go_sessions` + `go_messages`, entità DAL, service, RLS. La conversazione e il planning state sopravvivono.
3. **C — Tool di scrittura.** `setTripMeta`, `proposeSkeleton`/`applySkeleton`, `scheduleActivity` con proposte come ghost rows, `confirmProposal`.
4. **D — Flusso v5.** Cablare le fasi Blank → Day attivo sopra queste basi, riusando la variante `inline` di GoChatFloat (vedi sotto).

## Vincoli rispettati

- **Provider decoupling**: tool schema neutro, due adapter.
- **Layering**: route → service → DAL; i tool non saltano i livelli.
- **RLS**: ogni mutazione passa dalle guard e dalle policy esistenti.
- **Eventi UI disaccoppiati**: il bus `features/go/events.ts` resta il canale per le reazioni di interfaccia.
- **Fluid AI, no forms**: Go guida, niente form di input; i chip "Your trip" restano editabili ma derivati dallo stato.

## Collegamento allo step già fatto

`GoChatFloat` ha già il prop `variant: "float" | "inline"` (docking in pagina). Lo stato 5 del v5 usa `float`; gli stati 1–4 (narratore in pagina) useranno `inline`. La logica di chat è unica e condivisa tra le due varianti, quindi l'agent loop le serve entrambe senza duplicazione.

## Decisioni ancora aperte

- Mantenere il classifier `chat`/`suggestions`/`deepdive` oppure assorbirlo interamente nei tool.
- Numero massimo di iterazioni del loop agentico e guardia di costo per turno.
- Una sola sessione attiva per viaggio vs più sessioni storiche (la tabella regge entrambe; serve decidere la UX di ripresa).
- Quale gesto attiva la transizione Skeleton → Nudge → Day attivo (click su un day item, o proposta automatica di Go).
