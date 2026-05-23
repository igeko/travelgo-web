-- Migration: replace activities.readonly with a multi-state `visibility`
-- Date: 2026-05-22
-- Purpose:
--   `readonly` (boolean) was the wrong model. Replace it with an extensible
--   `visibility` attribute: 'public' | 'private' | 'shared' (text + CHECK so
--   new states can be added later without an enum migration).
--
--     • private — personal to the creator (default)
--     • shared  — visible to the co-members of specific trips; WHERE it is
--                 shared is recorded in the new `activity_shares` table
--     • public  — (reserved) globally visible
--
--   Scope of THIS migration: database only. The visibility-based RLS /
--   authorization enforcement is intentionally deferred — activities RLS is
--   reverted to the ownership + scheduling rule (no readonly clause).

-- 1. New extensible visibility attribute.
alter table public.activities
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'private', 'shared'));

-- Backfill: scheduled activities lived collaboratively inside a trip → shared;
-- unscheduled ones are personal → private.
update public.activities a
set visibility = case
  when exists (select 1 from public.scheduled_activities s where s.activity_id = a.id)
    then 'shared'
  else 'private'
end;

-- 2. Where a shared activity is shared (which trips).
create table if not exists public.activity_shares (
  activity_id uuid not null references public.activities(id) on delete cascade,
  trip_id     uuid not null references public.trips(id)      on delete cascade,
  shared_at   timestamptz not null default now(),
  primary key (activity_id, trip_id)
);
create index if not exists activity_shares_trip_idx on public.activity_shares (trip_id);

-- Backfill shares from the trips each activity is scheduled in.
insert into public.activity_shares (activity_id, trip_id)
select distinct s.activity_id, d.trip_id
from public.scheduled_activities s
join public.days d on d.id = s.day_id
on conflict do nothing;

-- RLS for the shares table: trip members (and the activity owner) can see a
-- share; only the activity owner, on a trip they belong to, can add/remove it.
alter table public.activity_shares enable row level security;

create policy activity_shares_select on public.activity_shares
  for select using (
    public.is_trip_member(trip_id)
    or exists (select 1 from public.activities a where a.id = activity_id and a.created_by = auth.uid())
  );

create policy activity_shares_insert on public.activity_shares
  for insert with check (
    public.is_trip_member(trip_id)
    and exists (select 1 from public.activities a where a.id = activity_id and a.created_by = auth.uid())
  );

create policy activity_shares_delete on public.activity_shares
  for delete using (
    exists (select 1 from public.activities a where a.id = activity_id and a.created_by = auth.uid())
  );

-- 3. Revert activities UPDATE/DELETE policies off `readonly` (enforcement of
--    visibility is deferred to a later phase). SELECT/INSERT are unchanged.
drop policy if exists activities_update on public.activities;
drop policy if exists activities_delete on public.activities;

create policy activities_update on public.activities
  for update using (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
  )
  with check (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
  );

create policy activities_delete on public.activities
  for delete using (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
  );

-- 4. Drop the replaced column.
alter table public.activities drop column if exists readonly;
