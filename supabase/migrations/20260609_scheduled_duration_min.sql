-- Durata in minuti per l'istanza schedulata di un'activity.
-- Coppia con `time` (ora di arrivo) per calcolare la partenza nel timeline UI.
-- Null = fallback su default per category (lib/dal/entities/CategoryDurations).
ALTER TABLE public.scheduled_activities
  ADD COLUMN IF NOT EXISTS duration_min int;

COMMENT ON COLUMN public.scheduled_activities.duration_min IS
  'Durata in minuti dell''istanza schedulata. Null = fallback su default per category. Coppia con `time` (ora di arrivo) per calcolare la partenza nel timeline UI.';
