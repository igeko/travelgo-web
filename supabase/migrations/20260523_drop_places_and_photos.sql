-- Remove two unused tables.
--
-- places: a POI cache table that was never wired into the code (no DAL entity,
--   no PlacesTable enum, no query). The app's "Places" functionality is purely
--   the live Google Places proxy under app/api/places; selected place data is
--   stored as columns on activities, not here. Empty at drop time.
--
-- photos: photo-metadata table behind the Media DAL entity. Only ever written
--   (once, by /api/media/import-url) and never read — the gallery/journal-photos
--   feature it was built for was never shipped. The whole Media branch (entity,
--   route, client) is removed alongside this. Image uploads still work via the
--   ImagePicker → Supabase Storage path, which never touched this table.
--   Empty at drop time.

drop table if exists public.places;
drop table if exists public.photos;
