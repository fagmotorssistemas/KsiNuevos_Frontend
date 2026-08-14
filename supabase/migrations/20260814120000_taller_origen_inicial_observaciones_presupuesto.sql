-- Origen inmutable de observaciones (al crear la orden) y precio inicial de cada ítem de presupuesto.
-- El historial de cambios se puede borrar; el origen no.

ALTER TABLE public.taller_ordenes
  ADD COLUMN IF NOT EXISTS observaciones_ingreso_inicial text;

ALTER TABLE public.taller_detalles_orden
  ADD COLUMN IF NOT EXISTS precio_unitario_inicial numeric;

ALTER TABLE public.taller_observaciones_ingreso_historial
  ADD COLUMN IF NOT EXISTS es_inicial boolean NOT NULL DEFAULT false;

-- Backfill: el valor actual pasa a ser el origen de las carpetas ya existentes.
UPDATE public.taller_ordenes
SET observaciones_ingreso_inicial = observaciones_ingreso
WHERE observaciones_ingreso_inicial IS NULL;

UPDATE public.taller_detalles_orden
SET precio_unitario_inicial = COALESCE(precio_unitario, 0)
WHERE precio_unitario_inicial IS NULL;

-- La nube más antigua de cada orden queda marcada como inicial (no se puede borrar).
UPDATE public.taller_observaciones_ingreso_historial h
SET es_inicial = true
WHERE h.id IN (
  SELECT DISTINCT ON (orden_id) id
  FROM public.taller_observaciones_ingreso_historial
  ORDER BY orden_id, created_at ASC
);

INSERT INTO public.taller_observaciones_ingreso_historial (orden_id, created_by, texto, es_inicial)
SELECT o.id, o.created_by, o.observaciones_ingreso_inicial, true
FROM public.taller_ordenes o
WHERE o.observaciones_ingreso_inicial IS NOT NULL
  AND btrim(o.observaciones_ingreso_inicial) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.taller_observaciones_ingreso_historial h
    WHERE h.orden_id = o.id
      AND h.es_inicial = true
  );

-- Copiar origen en INSERT si no vino; no permitir pisarlo después de seteado.
CREATE OR REPLACE FUNCTION public.taller_ordenes_lock_origen_ingreso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.observaciones_ingreso_inicial IS NULL THEN
      NEW.observaciones_ingreso_inicial := NEW.observaciones_ingreso;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.observaciones_ingreso_inicial IS NOT NULL THEN
    NEW.observaciones_ingreso_inicial := OLD.observaciones_ingreso_inicial;
  ELSIF NEW.observaciones_ingreso_inicial IS NULL THEN
    NEW.observaciones_ingreso_inicial := NEW.observaciones_ingreso;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_taller_ordenes_lock_origen_ingreso ON public.taller_ordenes;
CREATE TRIGGER trg_taller_ordenes_lock_origen_ingreso
  BEFORE INSERT OR UPDATE ON public.taller_ordenes
  FOR EACH ROW
  EXECUTE FUNCTION public.taller_ordenes_lock_origen_ingreso();

CREATE OR REPLACE FUNCTION public.taller_detalles_lock_precio_inicial()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.precio_unitario_inicial IS NULL THEN
      NEW.precio_unitario_inicial := COALESCE(NEW.precio_unitario, 0);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.precio_unitario_inicial IS NOT NULL THEN
    NEW.precio_unitario_inicial := OLD.precio_unitario_inicial;
  ELSIF NEW.precio_unitario_inicial IS NULL THEN
    NEW.precio_unitario_inicial := COALESCE(NEW.precio_unitario, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_taller_detalles_lock_precio_inicial ON public.taller_detalles_orden;
CREATE TRIGGER trg_taller_detalles_lock_precio_inicial
  BEFORE INSERT OR UPDATE ON public.taller_detalles_orden
  FOR EACH ROW
  EXECUTE FUNCTION public.taller_detalles_lock_precio_inicial();

-- Admin puede borrar historial de observaciones, excepto el origen.
DROP POLICY IF EXISTS taller_obs_ingreso_historial_delete ON public.taller_observaciones_ingreso_historial;
CREATE POLICY taller_obs_ingreso_historial_delete
  ON public.taller_observaciones_ingreso_historial
  FOR DELETE TO authenticated
  USING (public.is_profile_admin() AND es_inicial IS NOT TRUE);

-- Admin puede borrar solo ediciones de presupuesto, no el alta del ítem.
DROP POLICY IF EXISTS taller_presupuesto_historial_delete ON public.taller_presupuesto_historial;
CREATE POLICY taller_presupuesto_historial_delete
  ON public.taller_presupuesto_historial
  FOR DELETE TO authenticated
  USING (public.is_profile_admin() AND action = 'editar');
