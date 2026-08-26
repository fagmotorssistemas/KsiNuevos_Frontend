-- En proceso / Resuelto solo si hay una gestión completa (tipo, detalle, aplica, banco, asesor).
-- No toca filas ya guardadas: solo bloquea el CAMBIO de estado.

CREATE OR REPLACE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado IS NULL OR NEW.estado::text = 'pendiente' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado::text IN ('en_proceso', 'resuelto') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.asesoria_financiamiento_gestion g
      WHERE g.asesoria_id = NEW.id
        AND public.sales_progress_asesoria_gestion_completa(g)
    ) THEN
      RAISE EXCEPTION
        'Para pasar a % hay que llenar la gestión completa (tipo, detalle, si aplica, banco y asesor).',
        NEW.estado::text
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asesoria_estado_requiere_gestion ON public.asesoria_financiamiento;

CREATE TRIGGER trg_asesoria_estado_requiere_gestion
BEFORE UPDATE OF estado ON public.asesoria_financiamiento
FOR EACH ROW
EXECUTE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion();
