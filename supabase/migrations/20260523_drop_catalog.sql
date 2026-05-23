-- Remove the Catalog import pipeline.
-- The feature (admin OSM/Wikipedia ingestion into catalog_places with embeddings)
-- was write-only: nothing ever read these tables. Both were empty at drop time.
-- catalog_places.import_job_id references import_jobs, so drop places first.

drop table if exists public.catalog_places;
drop table if exists public.import_jobs;
