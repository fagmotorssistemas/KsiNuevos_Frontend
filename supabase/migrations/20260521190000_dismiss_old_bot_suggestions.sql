-- Descartar sugerencias IA de abril 2026 y anteriores (limpia campos en leads)
UPDATE public.leads
SET time_reference = NULL, day_detected = NULL, hour_detected = NULL
WHERE time_reference IS NOT NULL
  AND time_reference < timestamptz '2026-05-01 05:00:00+00';

UPDATE public.leads
SET time_reference = NULL, day_detected = NULL, hour_detected = NULL
WHERE day_detected IS NOT NULL
  AND day_detected::text ~ '^\d{4}-\d{2}-\d{2}'
  AND (substring(day_detected::text from 1 for 10))::date < '2026-05-01'::date;

UPDATE public.leads
SET time_reference = NULL, day_detected = NULL, hour_detected = NULL
WHERE (time_reference IS NOT NULL OR day_detected IS NOT NULL OR hour_detected IS NOT NULL)
  AND created_at < timestamptz '2026-05-01 05:00:00+00'
  AND (time_reference IS NULL OR time_reference < timestamptz '2026-05-01 05:00:00+00');
