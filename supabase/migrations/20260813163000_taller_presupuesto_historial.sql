-- Historial append-only de cambios de presupuesto de taller.
-- No hay UPDATE/DELETE para authenticated: los errores se corrigen con un nuevo edit.

CREATE TABLE IF NOT EXISTS public.taller_presupuesto_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL,
  changed_by uuid,
  action text NOT NULL CHECK (action IN ('agregar', 'editar')),
  descripcion text,
  precio_unitario numeric,
  cantidad numeric,
  descripcion_anterior text,
  precio_unitario_anterior numeric,
  total_antes numeric,
  total_despues numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taller_presupuesto_historial_orden_fkey
    FOREIGN KEY (orden_id) REFERENCES public.taller_ordenes(id) ON DELETE CASCADE,
  CONSTRAINT taller_presupuesto_historial_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS taller_presupuesto_historial_orden_idx
  ON public.taller_presupuesto_historial (orden_id, created_at DESC);

ALTER TABLE public.taller_presupuesto_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taller_presupuesto_historial_select ON public.taller_presupuesto_historial;
DROP POLICY IF EXISTS taller_presupuesto_historial_insert ON public.taller_presupuesto_historial;

CREATE POLICY taller_presupuesto_historial_select
  ON public.taller_presupuesto_historial
  FOR SELECT TO authenticated
  USING (public.can_access_taller_module('read'));

CREATE POLICY taller_presupuesto_historial_insert
  ON public.taller_presupuesto_historial
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_taller_module('write'));

REVOKE ALL ON public.taller_presupuesto_historial FROM PUBLIC;
GRANT SELECT, INSERT ON public.taller_presupuesto_historial TO authenticated;
GRANT ALL ON public.taller_presupuesto_historial TO service_role;
