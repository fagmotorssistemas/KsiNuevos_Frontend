-- En proceso / Resuelto en info. faltante solo si hay respuesta (notas_vendedor).
-- No toca filas ya guardadas: solo bloquea el CAMBIO de estado.

CREATE OR REPLACE FUNCTION public.datos_solicitados_estado_requiere_notas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS NULL OR NEW.estado::text = 'pendiente' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado::text IN ('en_proceso', 'resuelto') THEN
    IF nullif(btrim(coalesce(NEW.notas_vendedor, '')), '') IS NULL THEN
      RAISE EXCEPTION
        'Para pasar a % hay que escribir la respuesta o las notas internas.',
        NEW.estado::text
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_datos_estado_requiere_notas ON public.datos_solicitados_clientes;

CREATE TRIGGER trg_datos_estado_requiere_notas
BEFORE INSERT OR UPDATE OF estado, notas_vendedor ON public.datos_solicitados_clientes
FOR EACH ROW
EXECUTE FUNCTION public.datos_solicitados_estado_requiere_notas();
