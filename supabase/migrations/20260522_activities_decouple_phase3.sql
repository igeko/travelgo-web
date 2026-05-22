-- Migration: Activities ↔ Trip decoupling — Phase 3 (CONTRACT) + readonly flag
-- Date: 2026-05-22
-- Purpose:
--   Finish the decoupling: drop activities.trip_id entirely. The trip link
--   now lives only in scheduled_activities (→ days → trips); authorization is
--   ownership (created_by) + scheduling reachability. Also introduce the
--   `readonly` flag: when true, only the creator may edit/delete the entity
--   (trip editors cannot), supporting "editor-authored" activities.
--
--   IRREVERSIBLE step (the column drop) — guarded by a backup snapshot of the
--   id→trip_id mapping in _bak_activities_trip.
--
--   Prerequisite: application code no longer reads/writes activities.trip_id
--   (DAL listByTrip/search/authzContext, ActivityService.create, Trips join,
--   DbActivity type) — shipped together with this migration.

-- 1. New flag: only the creator can mutate when true.
alter table public.activities
  add column if not exists readonly boolean not null default false;

-- 2. Rewrite RLS without the trip_id fallback; enforce `readonly` on writes.
drop policy if exists activities_select on public.activities;
drop policy if exists activities_insert on public.activities;
drop policy if exists activities_update on public.activities;
drop policy if exists activities_delete on public.activities;

-- SELECT: owner OR reachable through a trip I'm a member of. (readonly does
-- not restrict visibility.)
create policy activities_select on public.activities
  for select using (
    created_by = auth.uid()
    or public.activity_in_my_trips(id)
  );

-- INSERT: you can only create activities you own.
create policy activities_insert on public.activities
  for insert with check (created_by = auth.uid());

-- UPDATE: owner always; otherwise an editor of a trip it's scheduled in, but
-- only when the activity is NOT readonly.
create policy activities_update on public.activities
  for update using (
    created_by = auth.uid()
    or (not readonly and public.activity_in_my_editable_trips(id))
  )
  with check (
    created_by = auth.uid()
    or (not readonly and public.activity_in_my_editable_trips(id))
  );

-- DELETE: same rule as UPDATE.
create policy activities_delete on public.activities
  for delete using (
    created_by = auth.uid()
    or (not readonly and public.activity_in_my_editable_trips(id))
  );

-- 3. Backup the id → trip_id mapping before dropping the column (recovery).
create table if not exists public._bak_activities_trip as
  select id, trip_id from public.activities;

-- 4. Drop the legacy column + its index.
drop index if exists public.idx_activities_trip_id;
alter table public.activities drop column if exists trip_id;
