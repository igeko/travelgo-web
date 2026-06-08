-- place_cache — cache server-side dei dettagli di Google Places.
--
-- Scopo: evitare di richiamare Places API ad ogni hover sui pin pianificati.
-- TTL 30 giorni, in pieno rispetto delle Google Maps Platform Terms 5.4
-- ("cached content from the Google Maps Service may be retained for up to
-- 30 days").
--
-- L'invalidazione è LAZY sul read: il DAL filtra `updated_at > now() - 30d`
-- prima di servire un hit, quindi le entry expired vengono trattate come
-- miss e ricomputate. Un cron periodico può rimuoverle fisicamente, ma non
-- è strettamente necessario per la correttezza.

create table if not exists public.place_cache (
  place_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists place_cache_updated_at_idx
  on public.place_cache (updated_at);

alter table public.place_cache enable row level security;

-- Read: qualsiasi utente autenticato. Il payload è già pubblico (viene da
-- Google Places), nessun motivo per gating.
create policy place_cache_select on public.place_cache
  for select using ((select auth.role()) = 'authenticated');

-- Write: solo service_role. I route handler `/api/places/enriched` usano
-- serviceDal() per scrivere — l'utente non parla mai direttamente alla
-- tabella, sempre via il proxy server-side che già custodisce la key
-- Google e applica la cache TTL.
-- Niente policy INSERT/UPDATE/DELETE per `authenticated`: tutto bloccato
-- da RLS, riservato a service_role (bypassa RLS).
