-- Historial de solicitudes de llamada: solicitud, aplazamiento y gestión.

CREATE TABLE IF NOT EXISTS public.lead_llamada_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('solicitud', 'aplazada', 'gestionada')),
  razon text,
  programado_hasta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS lead_llamada_eventos_created_at_idx
  ON public.lead_llamada_eventos (created_at DESC);

CREATE INDEX IF NOT EXISTS lead_llamada_eventos_lead_id_idx
  ON public.lead_llamada_eventos (lead_id, created_at DESC);

ALTER TABLE public.lead_llamada_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_llamada_eventos_all ON public.lead_llamada_eventos;
CREATE POLICY lead_llamada_eventos_all
  ON public.lead_llamada_eventos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.lead_llamada_eventos TO authenticated;

CREATE OR REPLACE FUNCTION public.log_lead_llamada_solicitud()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.quiere_llamada IS TRUE AND (TG_OP = 'INSERT' OR OLD.quiere_llamada IS DISTINCT FROM TRUE) THEN
    INSERT INTO public.lead_llamada_eventos (lead_id, tipo)
    VALUES (NEW.id, 'solicitud');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_lead_llamada_solicitud ON public.leads;
CREATE TRIGGER trg_log_lead_llamada_solicitud
  AFTER INSERT OR UPDATE OF quiere_llamada ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_llamada_solicitud();

UPDATE public.leads l
SET llamada_gestionada_at = i.created_at
FROM public.interactions i
WHERE i.lead_id = l.id
  AND i.content = 'EL CLIENTE SOLICITA LLAMADA — gestionada'
  AND l.llamada_gestionada_at IS NULL;

INSERT INTO public.lead_llamada_eventos (lead_id, tipo, created_at, created_by)
SELECT i.lead_id, 'gestionada', i.created_at, i.responsible_id
FROM public.interactions i
WHERE i.content = 'EL CLIENTE SOLICITA LLAMADA — gestionada'
  AND NOT EXISTS (
    SELECT 1
    FROM public.lead_llamada_eventos e
    WHERE e.lead_id = i.lead_id
      AND e.tipo = 'gestionada'
      AND e.created_at = i.created_at
  );
