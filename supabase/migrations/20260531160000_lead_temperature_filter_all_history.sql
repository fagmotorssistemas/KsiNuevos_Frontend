-- Todo el tiempo: cualquier registro en historial con esa temperatura (no solo el último).

CREATE INDEX IF NOT EXISTS idx_lead_temperature_history_temp_lead
  ON public.lead_temperature_history (temperature, lead_id);

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
  WITH from_history AS (
    SELECT DISTINCT h.lead_id
    FROM public.lead_temperature_history h
    WHERE h.temperature = p_temperature
      AND (
        p_campaign_month IS NULL
        OR h.campaign_month = p_campaign_month
      )
  ),
  no_history AS (
    SELECT l.id AS lead_id
    FROM public.leads l
    WHERE l.temperature = p_temperature
      AND NOT EXISTS (
        SELECT 1
        FROM public.lead_temperature_history h
        WHERE h.lead_id = l.id
          AND (
            p_campaign_month IS NULL
            OR h.campaign_month = p_campaign_month
          )
      )
  )
  SELECT from_history.lead_id FROM from_history
  UNION
  SELECT no_history.lead_id FROM no_history;
$$;

COMMENT ON FUNCTION public.lead_ids_for_temperature_filter IS
  'IDs con esa temperatura en el alcance: todo el historial (cualquier mes) o un campaign_month concreto; fallback operativo si no hay fila en historial.';
