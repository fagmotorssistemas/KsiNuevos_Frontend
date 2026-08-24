-- Resultado de asistencia: vino / no vino + motivo y seguimiento
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_attended boolean,
  ADD COLUMN IF NOT EXISTS no_show_reason text,
  ADD COLUMN IF NOT EXISTS no_show_follow_up text;

COMMENT ON COLUMN public.appointments.client_attended IS
  'true = el cliente vino; false = no vino; null = sin registrar';

COMMENT ON COLUMN public.appointments.no_show_reason IS
  'Motivo por el que el cliente no asistió';

COMMENT ON COLUMN public.appointments.no_show_follow_up IS
  'Seguimiento si no vino: llamada o mensaje';

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_show_follow_up_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_show_follow_up_check
  CHECK (no_show_follow_up IS NULL OR no_show_follow_up IN ('llamada', 'mensaje'));
