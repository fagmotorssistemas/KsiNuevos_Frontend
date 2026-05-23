-- Gestión de hoy = solo cuando se guarda el resumen ejecutivo (resume), no cualquier updated_at.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS resume_updated_at timestamptz;

COMMENT ON COLUMN public.leads.resume_updated_at IS
  'Última vez que se guardó o modificó resume (resumen ejecutivo). Base de Gestión de Hoy.';

-- Backfill solo desde auditoría (cambios reales de resume). El resto se llena al guardar resumen.
UPDATE public.leads l
SET resume_updated_at = sub.last_at
FROM (
  SELECT lead_id, MAX(recorded_at) AS last_at
  FROM public.leads_updated_at_audit
  WHERE 'resume' = ANY(changed_columns)
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id
  AND l.resume_updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_leads_resume_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.resume IS DISTINCT FROM OLD.resume THEN
    NEW.resume_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_leads_resume_updated_at ON public.leads;

CREATE TRIGGER trg_set_leads_resume_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leads_resume_updated_at();
