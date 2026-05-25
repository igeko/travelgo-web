-- Go agent persistence (Brief 04, Step B)
-- Two trip-scoped, per-user tables:
--   go_sessions  — one planning session per (trip, user): phase + planning_state.
--   go_messages  — the conversation thread (user / assistant / tool), with tool calls.
-- RLS: owner (user_id = auth.uid()) AND trip membership (is_trip_member helper).

create table if not exists public.go_sessions (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  phase          text not null default 'blank',
  planning_state jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.go_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.go_sessions(id) on delete cascade,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant', 'tool')),
  content      text not null default '',
  -- assistant turn: the requested tool calls ({id,name,arguments,signature}).
  tool_calls   jsonb,
  -- tool turn: which call this answers + the tool name (provider round-trip).
  tool_call_id text,
  name         text,
  created_at   timestamptz not null default now()
);

create index if not exists go_sessions_trip_user_idx on public.go_sessions (trip_id, user_id);
create index if not exists go_messages_session_idx   on public.go_messages (session_id, created_at);

alter table public.go_sessions enable row level security;
alter table public.go_messages enable row level security;

-- ── go_sessions: session owner who is also a trip member ──
create policy go_sessions_select on public.go_sessions for select
  using (user_id = (select auth.uid()) and is_trip_member(trip_id));
create policy go_sessions_insert on public.go_sessions for insert
  with check (user_id = (select auth.uid()) and is_trip_member(trip_id));
create policy go_sessions_update on public.go_sessions for update
  using (user_id = (select auth.uid()) and is_trip_member(trip_id))
  with check (user_id = (select auth.uid()) and is_trip_member(trip_id));
create policy go_sessions_delete on public.go_sessions for delete
  using (user_id = (select auth.uid()) and is_trip_member(trip_id));

-- ── go_messages: scoped through the owning session ──
create policy go_messages_select on public.go_messages for select
  using (exists (
    select 1 from public.go_sessions s
    where s.id = session_id and s.user_id = (select auth.uid()) and is_trip_member(s.trip_id)
  ));
create policy go_messages_insert on public.go_messages for insert
  with check (exists (
    select 1 from public.go_sessions s
    where s.id = session_id and s.user_id = (select auth.uid()) and is_trip_member(s.trip_id)
  ));
create policy go_messages_delete on public.go_messages for delete
  using (exists (
    select 1 from public.go_sessions s
    where s.id = session_id and s.user_id = (select auth.uid()) and is_trip_member(s.trip_id)
  ));
