-- Filtro rápido de temperatura para tablero de leads (DISTINCT ON en servidor).
-- Evita paginar lead_temperature_history completo desde el cliente.

CREATE INDEX IF NOT EXISTS idx_lead_temperature_history_lead_recorded_desc
  ON public.lead_temperature_history (lead_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_temperature
  ON public.leads (temperature);

COMMENT ON INDEX idx_lead_temperature_history_lead_recorded_desc IS
  'Última temperatura por lead (DISTINCT ON lead_id ORDER BY recorded_at DESC).';

CREATE OR REPLACE FUNCTION public.lead_ids_for_temperature_filter(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL
)
RETURNS TABLE(lead_id bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      h.lead_id,
      h.temperature,
      h.recorded_at
    FROM public.lead_temperature_history h
    WHERE p_campaign_month IS NULL
       OR h.campaign_month = p_campaign_month
  ),
  effective AS (
    SELECT DISTINCT ON (s.lead_id)
      s.lead_id,
      s.temperature
    FROM scoped s
    ORDER BY s.lead_id, s.recorded_at DESC
  ),
  from_history AS (
    SELECT e.lead_id
    FROM effective e
    WHERE e.temperature = p_temperature
  ),
  no_history AS (
    SELECT l.id AS lead_id
    FROM public.leads l
    WHERE l.temperature = p_temperature
      AND NOT EXISTS (
        SELECT 1
        FROM scoped s
        WHERE s.lead_id = l.id
      )
  )
  SELECT from_history.lead_id FROM from_history
  UNION
  SELECT no_history.lead_id FROM no_history;
$$;

COMMENT ON FUNCTION public.lead_ids_for_temperature_filter IS
  'IDs de leads cuya temperatura efectiva coincide: último registro en historial del alcance (mes o todo el tiempo) + fallback operativo sin historial.';

GRANT EXECUTE ON FUNCTION public.lead_ids_for_temperature_filter(public.lead_temperature, date)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.lead_ids_for_temperature_filter(public.lead_temperature, date)
  TO service_role;
