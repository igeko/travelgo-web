-- Migration: Activities Independence + Day Activities Schedule
-- Date: 2026-05-19
-- Purpose: Separate activities (entità) from day_activities (istanze schedulizzate)

-- ──────────────────────────────────────────────────────────────
-- 1. Backup tabella vecchia (rinomina)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS activities RENAME TO activities_legacy;

-- ──────────────────────────────────────────────────────────────
-- 2. Crea nuova tabella activities (snella, indipendente)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Dati descrittivi immutabili (l'attività come entità)
  title           text NOT NULL,
  short_desc      text,
  details         text,
  category        text,
  icon            text,

  -- Localizzazione
  location        text,
  location_place_id text,
  location_lat    numeric,
  location_lng    numeric,
  coords          point,          -- Postgres point "(lng,lat)"

  -- Media
  hero_image      text,

  -- Metadata
  url             text,

  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. Crea tabella day_activities (istanze schedulizzate)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE day_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  day_id          uuid NOT NULL REFERENCES days(id) ON DELETE CASCADE,

  -- Timing e placement su questo giorno specifico
  slot            text,                     -- 'morning', 'afternoon', 'evening', 'night'
  time            text,                     -- HH:MM opzionale (es "09:00")
  position        integer,                  -- ordine nel giorno per drag-drop

  -- Metadata di istanza (non immutabili)
  notes           text,                     -- note specifiche per questa istanza
  booking         text,                     -- booking specifico per questo giorno
  budget_amount   numeric,
  budget_currency text,
  budget_paid     boolean DEFAULT false,
  budget_category text,

  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),

  UNIQUE(activity_id, day_id)
);

-- ──────────────────────────────────────────────────────────────
-- 4. Migra dati da activities_legacy
-- ──────────────────────────────────────────────────────────────

-- 4a. Inserisci in activities (deduplica per trip/title/location)
INSERT INTO activities (id, trip_id, title, short_desc, details, category, icon,
                       location, location_place_id, location_lat, location_lng,
                       coords, hero_image, url, created_at, updated_at)
SELECT DISTINCT ON (trip_id, title, location)
       id, trip_id, title, short_desc, details, category, icon,
       location, location_place_id, location_lat, location_lng,
       coords, hero_image, url, created_at, updated_at
FROM activities_legacy
ORDER BY trip_id, title, location, created_at;

-- 4b. Crea mapping id_legacy → id_new per il join
CREATE TEMPORARY TABLE activity_id_map AS
SELECT al.id AS legacy_id, a.id AS new_id
FROM activities_legacy al
JOIN activities a ON a.trip_id = al.trip_id
                 AND a.title = al.title
                 AND a.location IS NOT DISTINCT FROM al.location;

-- 4c. Inserisci in day_activities
INSERT INTO day_activities (activity_id, day_id, slot, time, position,
                            notes, booking, budget_amount, budget_currency,
                            budget_paid, budget_category, created_at, updated_at)
SELECT aim.new_id, al.day_id, al.slot, al.time, al.position,
       al.notes, al.booking, al.budget_amount, al.budget_currency,
       al.budget_paid, al.budget_category, al.created_at, al.updated_at
FROM activities_legacy al
JOIN activity_id_map aim ON aim.legacy_id = al.id;

-- ──────────────────────────────────────────────────────────────
-- 5. Migra tabelle correlate (activity_sections, activity_sidebar)
-- ──────────────────────────────────────────────────────────────

-- 5a. activity_sections (rimane legata a activities)
ALTER TABLE activity_sections RENAME COLUMN activity_id TO _legacy_activity_id;
ALTER TABLE activity_sections ADD COLUMN activity_id uuid;

UPDATE activity_sections acs
SET activity_id = aim.new_id
FROM activity_id_map aim
WHERE acs._legacy_activity_id = aim.legacy_id;

ALTER TABLE activity_sections DROP COLUMN _legacy_activity_id;
ALTER TABLE activity_sections ADD CONSTRAINT fk_activity_sections_activity
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- 5b. activity_sidebar (rimane legata a activities)
ALTER TABLE activity_sidebar RENAME COLUMN activity_id TO _legacy_activity_id;
ALTER TABLE activity_sidebar ADD COLUMN activity_id uuid;

UPDATE activity_sidebar abs
SET activity_id = aim.new_id
FROM activity_id_map aim
WHERE abs._legacy_activity_id = aim.legacy_id;

ALTER TABLE activity_sidebar DROP COLUMN _legacy_activity_id;
ALTER TABLE activity_sidebar ADD CONSTRAINT fk_activity_sidebar_activity
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 6. Indici per performance
-- ──────────────────────────────────────────────────────────────
CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_day_activities_activity_id ON day_activities(activity_id);
CREATE INDEX idx_day_activities_day_id ON day_activities(day_id);
CREATE INDEX idx_day_activities_day_slot_position
  ON day_activities(day_id, slot, position);

-- ──────────────────────────────────────────────────────────────
-- 7. Cleanup tabella legacy
-- ──────────────────────────────────────────────────────────────
DROP TABLE activities_legacy;

-- ──────────────────────────────────────────────────────────────
-- 8. RLS policies (se usati)
-- ──────────────────────────────────────────────────────────────
-- NOTA: Aggiungere RLS policies here se la tabella è protetta

-- ──────────────────────────────────────────────────────────────
-- 9. Verifica integrità
-- ──────────────────────────────────────────────────────────────
-- SELECT COUNT(*) as activities_count FROM activities;
-- SELECT COUNT(*) as day_activities_count FROM day_activities;
-- SELECT * FROM day_activities LIMIT 5;
