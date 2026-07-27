-- set_updated_at() was overwritten with leads-only resume logic, but the same
-- function is also used by showroom_visits, vehicle_requests, video_scripts, etc.
-- Gate resume logic behind TG_TABLE_NAME = 'leads' and keep a generic path for others.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'leads' THEN
    -- Solo el resumen ejecutivo (resume) mueve updated_at.
    -- mensajes_enviados (bots) y demás campos no alteran updated_at.
    IF (to_jsonb(NEW) - 'updated_at' - 'mensajes_enviados' - 'resume_updated_at')
       IS NOT DISTINCT FROM
       (to_jsonb(OLD) - 'updated_at' - 'mensajes_enviados' - 'resume_updated_at') THEN
      NEW.updated_at := OLD.updated_at;
      RETURN NEW;
    END IF;

    IF NEW.resume IS DISTINCT FROM OLD.resume THEN
      NEW.updated_at := now();
      NEW.resume_updated_at := now();
    ELSE
      NEW.updated_at := OLD.updated_at;
    END IF;

    RETURN NEW;
  END IF;

  -- Tablas genéricas (showroom_visits, vehicle_requests, videos, ...)
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
