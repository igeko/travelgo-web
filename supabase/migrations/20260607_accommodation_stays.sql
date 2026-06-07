-- ─────────────────────────────────────────────────────────────────
-- accommodation_stays: model lodging as a first-class range entity
--
-- A "stay" is a reservation that spans 1..N consecutive nights at a
-- single Property (an `activities` row). Nights are materialized into
-- accommodation_nights by trigger as a pure function of stay_range
-- and the trip calendar.
--
-- Replaces the legacy days.accommodation_* columns (kept as read-only
-- fallback for now; dropped in a follow-up migration once consumers
-- migrate). Replaces the abandoned `accommodations` + `scheduled_
-- accommodations` scaffold (empty in prod, never used).
-- ─────────────────────────────────────────────────────────────────

create extension if not exists btree_gist;

-- 1. Drop abandoned scaffold (verified empty in prod) ──────────────
drop table if exists public.scheduled_accommodations cascade;
drop table if exists public.accommodations cascade;

-- 2. accommodation_stays: the Reservation ─────────────────────────
create table public.accommodation_stays (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references public.trips(id) on delete cascade,
  activity_id         uuid not null references public.activities(id) on delete restrict,
  created_by          uuid references auth.users(id) on delete set null,

  -- Inclusive lower, exclusive upper. Nights = upper - lower.
  -- A day-use stay is an empty range and produces zero nights.
  stay_range          daterange not null,

  -- Optional real-world clock times (independent from the range itself)
  check_in_time       time,
  check_out_time      time,

  -- Booking lifecycle
  booking_status      text not null default 'todo'
                      check (booking_status in ('todo','booked','paid','cancelled')),
  confirmation_code   text,
  total_cost_amount   numeric,
  total_cost_currency varchar(3)
                      check (total_cost_currency is null or total_cost_currency ~ '^[A-Z]{3}$'),
  paid                boolean not null default false,

  -- Per-stay notes (distinct from Property-level notes on activities)
  instance_note       text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One bed per night per trip: no two stays may overlap. day-use
  -- stays (empty range) are excluded from the constraint via WHERE.
  exclude using gist (
    trip_id with =,
    stay_range with &&
  ) where (not isempty(stay_range))
);

create index idx_stays_trip on public.accommodation_stays(trip_id);
create index idx_stays_activity on public.accommodation_stays(activity_id);
create index idx_stays_range_gist on public.accommodation_stays using gist (stay_range);

-- 3. accommodation_nights: projection of a stay onto a single day ─
create table public.accommodation_nights (
  id            uuid primary key default gen_random_uuid(),
  stay_id       uuid not null references public.accommodation_stays(id) on delete cascade,
  day_id        uuid not null references public.days(id) on delete cascade,

  night_index   smallint not null check (night_index >= 0),
  is_arrival    boolean not null default false,
  is_departure  boolean not null default false,
  position      smallint not null default 0,

  created_at    timestamptz not null default now(),

  unique (stay_id, night_index),
  unique (day_id, stay_id)
);

create index idx_nights_day on public.accommodation_nights(day_id);
create index idx_nights_stay on public.accommodation_nights(stay_id);

-- 4. Trigger: nights follow stay_range as a pure function ─────────
create or replace function public.sync_accommodation_nights()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  d         date;
  i         smallint := 0;
  total     smallint;
  did       uuid;
begin
  delete from public.accommodation_nights where stay_id = new.id;

  if isempty(new.stay_range) then
    return new;  -- day-use: zero nights
  end if;

  total := (upper(new.stay_range) - lower(new.stay_range))::smallint;
  d := lower(new.stay_range);

  while d < upper(new.stay_range) loop
    select id into did
    from public.days
    where trip_id = new.trip_id and date = d;

    if did is null then
      raise exception 'accommodation_stays %: no day in trip % for date %', new.id, new.trip_id, d;
    end if;

    insert into public.accommodation_nights
      (stay_id, day_id, night_index, is_arrival, is_departure)
    values
      (new.id, did, i, i = 0, i = total - 1);

    i := i + 1;
    d := d + 1;
  end loop;

  return new;
end $$;

create trigger trg_sync_accommodation_nights
  after insert or update of stay_range, trip_id
  on public.accommodation_stays
  for each row execute function public.sync_accommodation_nights();

-- 5. Trigger: when a day's date changes, re-sync the trip's stays ─
-- We force a no-op update on stay_range to re-fire the sync trigger.
create or replace function public.resync_stays_on_day_date_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.date is distinct from new.date then
    update public.accommodation_stays
       set stay_range = stay_range,
           updated_at = now()
     where trip_id = new.trip_id;
  end if;
  return new;
end $$;

create trigger trg_resync_stays_on_day_date
  after update of date on public.days
  for each row execute function public.resync_stays_on_day_date_change();

-- 6. RLS policies — match scheduled_activities semantics ──────────
alter table public.accommodation_stays  enable row level security;
alter table public.accommodation_nights enable row level security;

create policy stays_select on public.accommodation_stays for select
  using (public.is_trip_member(trip_id));

create policy stays_insert on public.accommodation_stays for insert
  with check (public.is_trip_editor(trip_id) and (created_by is null or created_by = auth.uid()));

create policy stays_update on public.accommodation_stays for update
  using (public.is_trip_editor(trip_id))
  with check (public.is_trip_editor(trip_id));

create policy stays_delete on public.accommodation_stays for delete
  using (public.is_trip_editor(trip_id));

-- Nights are a derived projection: read-only via API; writes only
-- through the trigger (running as security definer bypasses RLS).
create policy nights_select on public.accommodation_nights for select
  using (exists (
    select 1 from public.accommodation_stays s
    where s.id = stay_id and public.is_trip_member(s.trip_id)
  ));

-- 7. Backfill from legacy days.accommodation_* ────────────────────
-- Strategy:
--   a) Hydrate name/place per day, resolving the use_previous_accommodation
--      chain (a day with flag=true and name=NULL inherits from the prior day).
--   b) Group consecutive days with the same effective key (place_id, or
--      name+address fallback) into runs.
--   c) For each run: ensure an `activities` row exists for that key (we
--      reuse one if a Property with the same place_id already exists for
--      the trip's owner; otherwise we create a fresh one).
--   d) Insert the stay; the trigger materializes the nights.

do $$
declare
  rec record;
  v_activity_id uuid;
  v_trip_owner  uuid;
begin
  for rec in
    with recursive
    -- a) hydrate (resolve use_previous chain across consecutive days)
    base as (
      select d.id, d.trip_id, d.day_number, d.date,
             d.accommodation_name, d.accommodation_address, d.accommodation_url,
             d.accommodation_type, d.accommodation_place_id,
             d.accommodation_lat, d.accommodation_lng,
             d.accommodation_notes,
             d.accommodation_cost_amount, d.accommodation_cost_currency,
             d.accommodation_cost_paid,
             coalesce(d.use_previous_accommodation, false) as use_prev
      from public.days d
    ),
    hydrated as (
      -- recursive: fill name/place via use_previous chain
      select b.id, b.trip_id, b.day_number, b.date,
             b.accommodation_name as eff_name,
             b.accommodation_address as eff_address,
             b.accommodation_url as eff_url,
             b.accommodation_type as eff_type,
             b.accommodation_place_id as eff_place_id,
             b.accommodation_lat as eff_lat,
             b.accommodation_lng as eff_lng,
             b.accommodation_notes as eff_notes,
             b.accommodation_cost_amount as eff_cost_amount,
             b.accommodation_cost_currency as eff_cost_currency,
             b.accommodation_cost_paid as eff_cost_paid
        from base b
       where coalesce(b.use_prev, false) = false
      union all
      select b.id, b.trip_id, b.day_number, b.date,
             coalesce(b.accommodation_name, h.eff_name),
             coalesce(b.accommodation_address, h.eff_address),
             coalesce(b.accommodation_url, h.eff_url),
             coalesce(b.accommodation_type, h.eff_type),
             coalesce(b.accommodation_place_id, h.eff_place_id),
             coalesce(b.accommodation_lat, h.eff_lat),
             coalesce(b.accommodation_lng, h.eff_lng),
             coalesce(b.accommodation_notes, h.eff_notes),
             coalesce(b.accommodation_cost_amount, h.eff_cost_amount),
             coalesce(b.accommodation_cost_currency, h.eff_cost_currency),
             coalesce(b.accommodation_cost_paid, h.eff_cost_paid)
        from base b
        join hydrated h
          on h.trip_id = b.trip_id
         and h.day_number = b.day_number - 1
       where coalesce(b.use_prev, false) = true
    ),
    filtered as (
      select * from hydrated
       where eff_name is not null
         and date is not null
    ),
    -- b) detect consecutive runs sharing the same effective key
    keyed as (
      select *,
             coalesce(eff_place_id,
                      lower(coalesce(eff_name, '') || '|' || coalesce(eff_address, ''))
             ) as eff_key
        from filtered
    ),
    runs as (
      select *,
             row_number() over (partition by trip_id order by day_number)
             - row_number() over (partition by trip_id, eff_key order by day_number) as grp
        from keyed
    ),
    -- c) collapse each run to a single stay
    stays as (
      select trip_id,
             eff_key,
             min(eff_name) as name,
             min(eff_address) as address,
             min(eff_url) as url,
             min(eff_type) as type,
             min(eff_place_id) as place_id,
             min(eff_lat) as lat,
             min(eff_lng) as lng,
             string_agg(distinct eff_notes, E'\n' order by eff_notes) as notes,
             max(eff_cost_amount) as cost_amount,
             max(eff_cost_currency) as cost_currency,
             bool_or(eff_cost_paid) as cost_paid,
             min(date) as check_in,
             max(date) + 1 as check_out
        from runs
       group by trip_id, eff_key, grp
    )
    select * from stays
  loop
    -- Get the trip owner to seed activities.created_by
    select created_by into v_trip_owner from public.trips where id = rec.trip_id;

    -- Try to reuse an existing Property activity with same place_id owned by trip owner
    v_activity_id := null;
    if rec.place_id is not null then
      select id into v_activity_id
        from public.activities
       where location_place_id = rec.place_id
         and created_by is not distinct from v_trip_owner
       limit 1;
    end if;

    -- Otherwise create a new lodging Property activity
    if v_activity_id is null then
      insert into public.activities
        (title, short_desc, category, icon,
         location, location_place_id, location_lat, location_lng,
         url, notes, created_by, visibility)
      values
        (rec.name,
         null,
         'lodging',
         case rec.type
           when 'campground' then 'tent'
           when 'hostel'     then 'building-skyscraper'
           when 'apartment'  then 'building'
           when 'bb'         then 'home'
           when 'ryokan'     then 'home-2'
           else                   'bed'
         end,
         rec.address,
         rec.place_id,
         rec.lat,
         rec.lng,
         rec.url,
         rec.notes,
         v_trip_owner,
         'private')
      returning id into v_activity_id;
    end if;

    -- Insert the stay; trigger materializes nights
    insert into public.accommodation_stays
      (trip_id, activity_id, created_by, stay_range,
       booking_status, total_cost_amount, total_cost_currency, paid)
    values
      (rec.trip_id,
       v_activity_id,
       v_trip_owner,
       daterange(rec.check_in, rec.check_out, '[)'),
       case when rec.cost_paid then 'paid' else 'todo' end,
       rec.cost_amount,
       rec.cost_currency,
       coalesce(rec.cost_paid, false));
  end loop;
end $$;

comment on table public.accommodation_stays is
  'A lodging reservation: range-based, one row per stay, links a trip to a Property (activities row of category lodging).';
comment on table public.accommodation_nights is
  'Projection of accommodation_stays onto days. Maintained by trigger as a pure function of stay_range + trip calendar.';
