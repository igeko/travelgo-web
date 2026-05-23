-- Migration: enforce activity visibility on read access
-- Date: 2026-05-22
-- Purpose:
--   Wire the `visibility` attribute into the activities SELECT policy. Read
--   access is now granted when ANY of:
--     • created_by = auth.uid()            — the owner
--     • visibility = 'public'              — any authenticated user
--     • activity_in_my_trips(id)           — scheduled in a trip I'm a member
--                                            of (itinerary collaboration)
--     • activity_shared_with_me(id)        — visibility 'shared' AND shared
--                                            with a trip I'm a member of
--   (Write policies are unchanged: visibility governs read reach, not editing.)

-- Helper: is this activity shared with a trip the current user belongs to?
-- SECURITY DEFINER (like is_trip_member) → bypasses RLS, no recursion.
create or replace function public.activity_shared_with_me(act uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select exists (
    select 1
    from public.activity_shares sh
    where sh.activity_id = act
      and public.is_trip_member(sh.trip_id)
  );
$function$;

-- Rewrite the SELECT policy to honour visibility.
drop policy if exists activities_select on public.activities;

create policy activities_select on public.activities
  for select using (
    created_by = auth.uid()
    or visibility = 'public'
    or public.activity_in_my_trips(id)
    or public.activity_shared_with_me(id)
  );
