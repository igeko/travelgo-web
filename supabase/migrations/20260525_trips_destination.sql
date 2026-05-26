-- Distinct destination/place for a trip, separate from its name (title).
-- Powers the TripInfo "WHERE" field; the trip name stays in `title`.
alter table public.trips add column if not exists destination text;
