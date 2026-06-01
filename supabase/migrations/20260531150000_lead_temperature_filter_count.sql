-- Conteo rápido sin devolver miles de IDs al cliente.

CREATE OR REPLACE FUNCTION public.count_leads_for_temperature_filter(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.lead_ids_for_temperature_filter(p_temperature, p_campaign_month);
$$;

GRANT EXECUTE ON FUNCTION public.count_leads_for_temperature_filter(public.lead_temperature, date)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.count_leads_for_temperature_filter(public.lead_temperature, date)
  TO service_role;
