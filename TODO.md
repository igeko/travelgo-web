# TODO

## AI Integrations

- [ ] **ChatGPT Plugin** — sviluppare una App GPT su ChatGPT (Actions + OpenAPI spec) per interagire con i viaggi TravelGo
- [ ] **Claude Connector (MCP Server)** — sviluppare un MCP server per Claude con OAuth Google → Supabase. Tool: `list_trips`, `get_trip`, `get_day_activities`, `create_activity`, `update_day`, `delete_activity`. Thin wrapper sulle API route esistenti. Token salvato localmente, refresh automatico via Supabase.
- [ ] **Gemini Integration** — verificare se esiste un ecosistema di connettori/plugin per Gemini e sviluppare l'integrazione

## DayList

- [ ] Scrollbar migliore per la lista giorni
- [ ] Sistemare meglio lo spazio tra giorni

## Live multi-user (Supabase Realtime)

- [ ] Abilitare Realtime sulle tabelle `trips`, `days`, `activities` da Supabase Studio
- [ ] Hook `useTripRealtime(tripId)` che si iscrive ai `postgres_changes` filtrati per trip e patcha lo stato locale
- [ ] Integrazione in `TripDayView`: gli eventi Realtime aggiornano `localDays` e `activities` invece di refetch
- [ ] Gestire disconnessione/riconnessione (fetch completo dello stato alla riconnessione)
- [ ] Verificare che le RLS policies coprano già il broadcast (Realtime le rispetta)

### Edge case da gestire

- [ ] Utente B sta modificando un'attività che utente A elimina → chiudere il form e mostrare toast "This activity was removed"
- [ ] Utente B salva con dati vecchi mentre A ha già modificato → per ora "last write wins", valutare in futuro un warning "your changes will overwrite recent edits"
- [ ] Connessione persa → indicatore visivo "offline / reconnecting" e refetch completo alla riconnessione
- [ ] Optimistic update + evento Realtime in arrivo per la stessa modifica → evitare flicker (riconoscere che lo stato locale è già aggiornato)
- [ ] Utente B ha la stessa pagina aperta in due tab → evitare loop di eventi
- [ ] Eliminazione del giorno corrente da parte di A mentre B lo sta visualizzando → fallback a un altro giorno + toast

### Da decidere prima di partire

- [ ] Aggiungere colonna `updated_by` (uuid utente) sulle tabelle se vogliamo mostrare "Marco ha modificato Day 4"
- [ ] Mostrare presence/cursori? (= salto a "Livello 4", molto più lavoro — per ora NO)
