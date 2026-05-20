-- Migration: scheduled_activities instance (timeline) fields
-- Date: 2026-05-20
-- Purpose: give per-day instance metadata a home on scheduled_activities,
-- so the timeline features (block type, fuzzy timing, instance note,
-- booking status, transport bridges) persist instead of living only in the UI.
-- All columns are additive and nullable — reversible via DROP COLUMN.

ALTER TABLE scheduled_activities
  ADD COLUMN IF NOT EXISTS type            text,        -- 'place' | 'move' | 'meal' | 'pause' | 'action'
  ADD COLUMN IF NOT EXISTS fuzzy           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instance_note   text,
  ADD COLUMN IF NOT EXISTS booking_status  text,        -- 'todo' | 'booked' | 'paid'
  ADD COLUMN IF NOT EXISTS bridge_in_json  jsonb,
  ADD COLUMN IF NOT EXISTS bridge_out_json jsonb;
