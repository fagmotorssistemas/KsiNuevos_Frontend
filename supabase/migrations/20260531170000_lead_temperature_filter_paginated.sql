-- Paginación y conteos en servidor (sin volcar miles de IDs al cliente).

CREATE OR REPLACE FUNCTION public.count_leads_for_temperature_filter(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_has_budget boolean DEFAULT false
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.leads l
  INNER JOIN public.lead_ids_for_temperature_filter(p_temperature, p_campaign_month) f
    ON f.lead_id = l.id
  WHERE (p_assigned_to IS NULL OR l.assigned_to = p_assigned_to)
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (
      NOT p_has_budget
      OR (
        l.presupuesto_cliente IS NOT NULL
        AND TRIM(l.presupuesto_cliente) <> ''
        AND COALESCE(NULLIF(TRIM(l.presupuesto_cliente), '')::numeric, 0) > 0
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.count_responded_for_temperature_filter(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_has_budget boolean DEFAULT false
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.leads l
  INNER JOIN public.lead_ids_for_temperature_filter(p_temperature, p_campaign_month) f
    ON f.lead_id = l.id
  WHERE l.resume IS NOT NULL
    AND l.resume <> ''
    AND (p_assigned_to IS NULL OR l.assigned_to = p_assigned_to)
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (
      NOT p_has_budget
      OR (
        l.presupuesto_cliente IS NOT NULL
        AND TRIM(l.presupuesto_cliente) <> ''
        AND COALESCE(NULLIF(TRIM(l.presupuesto_cliente), '')::numeric, 0) > 0
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.paginated_lead_ids_for_temperature_filter(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL,
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0,
  p_assigned_to uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_has_budget boolean DEFAULT false
)
RETURNS TABLE(lead_id bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT l.id AS lead_id
  FROM public.leads l
  INNER JOIN public.lead_ids_for_temperature_filter(p_temperature, p_campaign_month) f
    ON f.lead_id = l.id
  WHERE (p_assigned_to IS NULL OR l.assigned_to = p_assigned_to)
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (
      NOT p_has_budget
      OR (
        l.presupuesto_cliente IS NOT NULL
        AND TRIM(l.presupuesto_cliente) <> ''
        AND COALESCE(NULLIF(TRIM(l.presupuesto_cliente), '')::numeric, 0) > 0
      )
    )
  ORDER BY l.updated_at DESC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.paginated_lead_ids_for_temperature_filter(
  public.lead_temperature, date, int, int, uuid, text, boolean
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.count_responded_for_temperature_filter(
  public.lead_temperature, date, uuid, text, boolean
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.count_leads_for_temperature_filter(
  public.lead_temperature, date, uuid, text, boolean
) TO authenticated, service_role;
