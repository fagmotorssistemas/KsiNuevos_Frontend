-- Auditoría: registra cada vez que leads.updated_at cambia y qué columnas lo provocaron.

CREATE TABLE IF NOT EXISTS public.leads_updated_at_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  old_updated_at timestamptz,
  new_updated_at timestamptz NOT NULL,
  changed_columns text[] NOT NULL DEFAULT '{}',
  only_mensajes_enviados boolean NOT NULL DEFAULT false,
  auth_uid uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_leads_updated_at_audit_lead_id
  ON public.leads_updated_at_audit (lead_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_updated_at_audit_recorded_at
  ON public.leads_updated_at_audit (recorded_at DESC);

COMMENT ON TABLE public.leads_updated_at_audit IS
  'Log cuando leads.updated_at cambia: columnas tocadas y si fue solo mensajes_enviados (bots).';

CREATE OR REPLACE FUNCTION public.audit_leads_updated_at_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text[];
  only_msg boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(key ORDER BY key), '{}')
  INTO cols
  FROM (
    SELECT key
    FROM jsonb_each(to_jsonb(NEW))
    WHERE key <> 'updated_at'
      AND (to_jsonb(NEW) -> key) IS DISTINCT FROM (to_jsonb(OLD) -> key)
  ) changed;

  only_msg :=
    (to_jsonb(NEW) - 'updated_at' - 'mensajes_enviados')
    IS NOT DISTINCT FROM
    (to_jsonb(OLD) - 'updated_at' - 'mensajes_enviados');

  INSERT INTO public.leads_updated_at_audit (
    lead_id,
    old_updated_at,
    new_updated_at,
    changed_columns,
    only_mensajes_enviados,
    auth_uid
  ) VALUES (
    NEW.id,
    OLD.updated_at,
    NEW.updated_at,
    cols,
    only_msg,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_leads_updated_at ON public.leads;

CREATE TRIGGER trg_audit_leads_updated_at
  AFTER UPDATE OF updated_at ON public.leads
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION public.audit_leads_updated_at_change();

ALTER TABLE public.leads_updated_at_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_updated_at_audit_select_auth ON public.leads_updated_at_audit;

CREATE POLICY leads_updated_at_audit_select_auth ON public.leads_updated_at_audit
  FOR SELECT TO authenticated
  USING (true);
