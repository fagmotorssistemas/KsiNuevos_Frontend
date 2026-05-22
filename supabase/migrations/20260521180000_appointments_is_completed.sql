-- Bandera explícita de cita completada (además de status = 'completada')
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointments.is_completed IS
  'true = ya no debe mostrarse en pendientes de agenda';

CREATE INDEX IF NOT EXISTS idx_appointments_pending_active
  ON public.appointments (responsible_id, start_time)
  WHERE is_completed = false
    AND status IN ('pendiente', 'confirmada', 'reprogramada');

-- Sincronizar filas ya cerradas
UPDATE public.appointments
SET is_completed = true
WHERE status IN ('completada', 'cancelada', 'no_asistio')
  AND is_completed = false;

-- Cierre masivo: abril 2026 y anteriores (antes del 1 de mayo, hora Ecuador)
UPDATE public.appointments
SET
  status = 'completada',
  is_completed = true,
  updated_at = now()
WHERE is_completed = false
  AND status IN ('pendiente', 'confirmada', 'reprogramada')
  AND start_time < timestamptz '2026-05-01 05:00:00+00';

UPDATE public.appointments
SET is_completed = true
WHERE start_time < timestamptz '2026-05-01 05:00:00+00'
  AND is_completed IS DISTINCT FROM true;

-- Cierre masivo: citas con fecha pasada (antes de hoy en America/Guayaquil)
UPDATE public.appointments
SET
  status = 'completada',
  is_completed = true,
  updated_at = now()
WHERE is_completed = false
  AND status IN ('pendiente', 'confirmada', 'reprogramada')
  AND start_time < (
    (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') AT TIME ZONE 'America/Guayaquil')
  );
