-- Migration: Activities ↔ Trip decoupling — Phase 1 (EXPAND, additive & safe)
-- Date: 2026-05-22
-- Purpose:
--   First, reversible step of removing activities.trip_id. The trip link is
--   moving entirely onto scheduled_activities (scheduled_activities → days →
--   trips). An activity becomes an independent, user-owned entity so it can
--   outlive any trip (this is what makes a "yume" = a favourited activity
--   durable across trips).
--
--   This phase is ADDITIVE only: activities.trip_id stays in place, all
--   existing RLS / queries keep working. Nothing breaks. The authorization
--   switch (RLS + guards + DAL) and the trip_id drop happen in later phases,
--   only after this is verified.
--
-- Contents:
--   0. Helper functions to derive trip access from scheduling (used by the
--      Phase 2 RLS — defined now because they are pure additions).
--   1. activities.created_by (the entity owner), backfilled from the trip owner.

-- ──────────────────────────────────────────────────────────────
-- 0. Helper functions — "can the current user reach this activity
--    through a trip it is scheduled in?"
--    SECURITY DEFINER (like is_trip_member) so the inner reads bypass RLS
--    and never recurse. STABLE: same result within a statement.
-- ──────────────────────────────────────────────────────────────

create or replace function public.activity_in_my_trips(act uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select exists (
    select 1
    from public.scheduled_activities s
    join public.days d on d.id = s.day_id
    where s.activity_id = act
      and public.is_trip_member(d.trip_id)
  );
$function$;

create or replace function public.activity_in_my_editable_trips(act uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select exists (
    select 1
    from public.scheduled_activities s
    join public.days d on d.id = s.day_id
    where s.activity_id = act
      and public.is_trip_editor(d.trip_id)
  );
$function$;

-- ──────────────────────────────────────────────────────────────
-- 1. activities.created_by — the entity owner, independent of any trip.
--    Nullable for now (additive); a NOT NULL constraint can be added in a
--    later phase once the create flow always sets it.
-- ──────────────────────────────────────────────────────────────

alter table public.activities
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill from the trip owner (verified: every trip has exactly one owner).
update public.activities a
set created_by = (
  select tm.user_id
  from public.trip_members tm
  where tm.trip_id = a.trip_id
    and tm.role = 'owner'
  limit 1
)
where a.created_by is null
  and a.trip_id is not null;

create index if not exists idx_activities_created_by
  on public.activities (created_by);
