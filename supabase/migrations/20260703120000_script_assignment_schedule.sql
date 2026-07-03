-- Reprogramación de grabación de reels por asignación de guión
ALTER TABLE public.script_vehicle_assignments
  ADD COLUMN IF NOT EXISTS fecha_programada date,
  ADD COLUMN IF NOT EXISTS reprogramaciones_count integer NOT NULL DEFAULT 0;

UPDATE public.script_vehicle_assignments
SET fecha_programada = fecha_asignacion
WHERE fecha_programada IS NULL;

ALTER TABLE public.script_vehicle_assignments
  ALTER COLUMN fecha_programada SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.script_assignment_schedule_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.script_vehicle_assignments(id) ON DELETE CASCADE,
  accion text NOT NULL DEFAULT 'reprogramar',
  fecha_origen date NOT NULL,
  fecha_destino date NOT NULL,
  justificacion text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT script_assignment_schedule_log_justificacion_min CHECK (char_length(trim(justificacion)) >= 10)
);

CREATE INDEX IF NOT EXISTS script_assignment_schedule_log_assignment_id_idx
  ON public.script_assignment_schedule_log (assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS script_vehicle_assignments_fecha_programada_idx
  ON public.script_vehicle_assignments (fecha_programada);

COMMENT ON TABLE public.script_assignment_schedule_log IS
  'Auditoría de reprogramaciones manuales de grabación de reels (plan de videos).';

SELECT public._rls_enable_backend_only('public.script_assignment_schedule_log'::regclass);
