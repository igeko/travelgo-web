-- ─────────────────────────────────────────────────────────────────
-- Drift backfill: legacy days.accommodation_* → accommodation_stays
--
-- Il 20260607_accommodation_stays.sql ha fatto un backfill iniziale
-- (step 7). Da allora il pannello lodging della daybyday ha continuato
-- a scrivere sui campi legacy `days.accommodation_*` SENZA propagare
-- alle `accommodation_stays`. Risultato: pernottamenti creati/editati
-- da daybyday non sono visibili da explore-next (che legge solo stays).
--
-- Questa migration replica la logica del backfill iniziale, filtrando
-- via i giorni GIÀ coperti da una notte (idempotente: re-runnarla è
-- un no-op). Dopo questa migration il refactor di TripDayView passa a
-- scrivere direttamente sulle stays, eliminando definitivamente il
-- doppio binario.
-- ─────────────────────────────────────────────────────────────────

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
        -- Skip giorni già coperti da una notte (idempotenza). Un giorno è
        -- "migrato" se esiste già una accommodation_nights su di esso —
        -- non importa se viene dal backfill iniziale o da explore-next.
       where not exists (
         select 1 from public.accommodation_nights an
          where an.day_id = d.id
       )
    ),
    hydrated as (
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
