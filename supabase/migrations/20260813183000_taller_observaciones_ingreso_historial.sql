-- Historial de observaciones de ingreso: cada guardado genera una entrada.

CREATE TABLE IF NOT EXISTS public.taller_observaciones_ingreso_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL,
  created_by uuid,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taller_obs_ingreso_historial_orden_fkey
    FOREIGN KEY (orden_id) REFERENCES public.taller_ordenes(id) ON DELETE CASCADE,
  CONSTRAINT taller_obs_ingreso_historial_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS taller_obs_ingreso_historial_orden_idx
  ON public.taller_observaciones_ingreso_historial (orden_id, created_at DESC);

ALTER TABLE public.taller_observaciones_ingreso_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taller_obs_ingreso_historial_select ON public.taller_observaciones_ingreso_historial;
DROP POLICY IF EXISTS taller_obs_ingreso_historial_insert ON public.taller_observaciones_ingreso_historial;

CREATE POLICY taller_obs_ingreso_historial_select
  ON public.taller_observaciones_ingreso_historial
  FOR SELECT TO authenticated
  USING (public.can_access_taller_module('read'));

CREATE POLICY taller_obs_ingreso_historial_insert
  ON public.taller_observaciones_ingreso_historial
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_taller_module('write'));

REVOKE ALL ON public.taller_observaciones_ingreso_historial FROM PUBLIC;
GRANT SELECT, INSERT ON public.taller_observaciones_ingreso_historial TO authenticated;
GRANT ALL ON public.taller_observaciones_ingreso_historial TO service_role;
