-- Solo el resumen ejecutivo (resume) mueve updated_at = fecha de última gestión.
-- mensajes_enviados (bots) y demás campos no alteran updated_at.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    RETURN NEW;
  END IF;

  -- Cambio únicamente de mensajes_enviados (u otros campos sin resume)
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
END;
$function$;

-- Recuperar updated_at = última vez que realmente se guardó resume (auditoría)
UPDATE public.leads l
SET
  updated_at = sub.last_at,
  resume_updated_at = sub.last_at
FROM (
  SELECT lead_id, MAX(recorded_at) AS last_at
  FROM public.leads_updated_at_audit
  WHERE 'resume' = ANY(changed_columns)
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id;

DROP TRIGGER IF EXISTS trg_set_leads_resume_updated_at ON public.leads;
DROP FUNCTION IF EXISTS public.set_leads_resume_updated_at();
