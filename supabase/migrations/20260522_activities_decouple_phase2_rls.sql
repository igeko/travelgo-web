-- Migration: Activities ↔ Trip decoupling — Phase 2 (authorization switch)
-- Date: 2026-05-22
-- Purpose:
--   Move activity authorization off activities.trip_id and onto ownership
--   (created_by) + scheduling reachability (activity_in_my_*_trips). The
--   trip_id column STAYS (and keeps its NOT NULL) — it is only kept as a
--   transitional fallback in the policies so that NO existing access is
--   removed. Phase 3 will drop the trip_id clauses and the column.
--
--   Net authorization change vs Phase 1:
--     • SELECT/UPDATE/DELETE: strict SUPERSET of the old policies
--       (old trip-member/editor access still granted via the trip_id
--       fallback, PLUS new owner + scheduling access). No regression.
--     • INSERT: now gated on `created_by = auth.uid()` instead of
--       `is_trip_editor(trip_id)`. Creating an activity entity no longer
--       requires trip editorship; scheduling it into a trip is still
--       guarded (requireDayEditor + scheduled_activities), so the
--       trip-mutation boundary is unchanged.

-- Replace the four trip_id-based policies.
drop policy if exists activities_member_select on public.activities;
drop policy if exists activities_editor_insert on public.activities;
drop policy if exists activities_editor_update on public.activities;
drop policy if exists activities_editor_delete on public.activities;

-- SELECT: owner OR scheduled in a trip I'm a member of OR (transitional) the
-- legacy trip I'm a member of.
create policy activities_select on public.activities
  for select using (
    created_by = auth.uid()
    or public.activity_in_my_trips(id)
    or (trip_id is not null and public.is_trip_member(trip_id))
  );

-- INSERT: you can only create activities you own.
create policy activities_insert on public.activities
  for insert with check (created_by = auth.uid());

-- UPDATE: owner OR editor of a trip it's scheduled in OR (transitional)
-- editor of the legacy trip.
create policy activities_update on public.activities
  for update using (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
    or (trip_id is not null and public.is_trip_editor(trip_id))
  )
  with check (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
    or (trip_id is not null and public.is_trip_editor(trip_id))
  );

-- DELETE: same rule as UPDATE.
create policy activities_delete on public.activities
  for delete using (
    created_by = auth.uid()
    or public.activity_in_my_editable_trips(id)
    or (trip_id is not null and public.is_trip_editor(trip_id))
  );
