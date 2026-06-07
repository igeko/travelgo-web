-- Migration: category_durations — default per-category activity duration.
-- Date: 2026-06-07
-- Purpose: support the Add-to-Trip algorithm (brief 06). When a place is added
-- from Explore, its default activity duration is resolved via this table when
-- no per-place hint is available (resolveDuration precedence: Google hint →
-- this table → 60' fallback).
--
-- The `category` key is LOOSE on purpose: an entry may be a Google Place type
-- ("museum", "restaurant"), an explore sub-category id ("hotel", "ostello"),
-- or any other taxonomy we layer on top. The lookup is best-effort — the
-- algorithm tries every candidate key the place provides, in order, and falls
-- back to 60' when none matches.

create table if not exists public.category_durations (
  category     text primary key,
  duration_min integer not null check (duration_min > 0),
  label        text,
  updated_at   timestamptz not null default now()
);

alter table public.category_durations enable row level security;

-- Read: any authenticated user (the algorithm runs server-side after auth).
create policy category_durations_select on public.category_durations
  for select using ((select auth.role()) = 'authenticated');

-- Write: platform admins only (configuration data, not user data).
create policy category_durations_insert on public.category_durations
  for insert with check (is_platform_admin());
create policy category_durations_update on public.category_durations
  for update using (is_platform_admin()) with check (is_platform_admin());
create policy category_durations_delete on public.category_durations
  for delete using (is_platform_admin());

-- Seed: the 5 defaults from brief 06. Keys mirror Google Place types so a
-- place fetched from Google matches without translation.
insert into public.category_durations (category, duration_min, label) values
  ('museum',             120, 'Museum'),
  ('restaurant',          90, 'Restaurant'),
  ('cafe',                30, 'Cafe'),
  ('tourist_attraction',  45, 'Monument / landmark'),
  ('park',                60, 'Park')
on conflict (category) do nothing;
