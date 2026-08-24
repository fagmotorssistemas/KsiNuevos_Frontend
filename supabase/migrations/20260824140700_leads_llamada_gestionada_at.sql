-- Historial de solicitud de llamada: cuándo se cumplió / gestionó.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS llamada_gestionada_at timestamptz;

COMMENT ON COLUMN public.leads.llamada_gestionada_at IS 'Cuándo se marcó como gestionada la solicitud de llamada del cliente.';

CREATE INDEX IF NOT EXISTS leads_llamada_gestionada_at_idx
  ON public.leads (llamada_gestionada_at)
  WHERE llamada_gestionada_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reset_llamada_gestionada_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.quiere_llamada IS TRUE AND OLD.quiere_llamada IS DISTINCT FROM TRUE THEN
    NEW.llamada_gestionada_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reset_llamada_gestionada_on_new_request ON public.leads;
CREATE TRIGGER trg_reset_llamada_gestionada_on_new_request
  BEFORE UPDATE OF quiere_llamada ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION reset_llamada_gestionada_on_new_request();
