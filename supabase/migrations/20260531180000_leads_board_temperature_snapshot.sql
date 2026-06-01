-- Un solo viaje a BD: total + respondidos + IDs de página (sin repetir lead_ids_for_temperature_filter 3 veces).

CREATE OR REPLACE FUNCTION public.leads_board_temperature_snapshot(
  p_temperature public.lead_temperature,
  p_campaign_month date DEFAULT NULL,
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0,
  p_assigned_to uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_has_budget boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH history_matches AS (
    SELECT DISTINCT h.lead_id
    FROM public.lead_temperature_history h
    WHERE h.temperature = p_temperature
      AND (
        p_campaign_month IS NULL
        OR h.campaign_month = p_campaign_month
      )
  ),
  fallback_matches AS (
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
  ),
  matched AS (
    SELECT lead_id FROM history_matches
    UNION
    SELECT lead_id FROM fallback_matches
  ),
  filtered AS (
    SELECT l.id, l.updated_at, l.resume
    FROM public.leads l
    INNER JOIN matched m ON m.lead_id = l.id
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
  ),
  page_rows AS (
    SELECT f.id, f.updated_at
    FROM filtered f
    ORDER BY f.updated_at DESC
    LIMIT GREATEST(p_limit, 0)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'total',
    (SELECT COUNT(*)::bigint FROM filtered),
    'responded',
    (
      SELECT COUNT(*)::bigint
      FROM filtered f
      WHERE f.resume IS NOT NULL AND f.resume <> ''
    ),
    'lead_ids',
    COALESCE(
      (SELECT jsonb_agg(p.id ORDER BY p.updated_at DESC) FROM page_rows p),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.leads_board_temperature_snapshot IS
  'Tablero leads: conteos + IDs paginados con filtro de temperatura en una sola consulta.';

GRANT EXECUTE ON FUNCTION public.leads_board_temperature_snapshot(
  public.lead_temperature, date, int, int, uuid, text, boolean
) TO authenticated, service_role;
