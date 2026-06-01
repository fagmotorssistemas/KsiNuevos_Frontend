-- Listado paginado con filtro de ingreso (sin temperatura): misma idea que fetch_leads_board_temperature_page.

CREATE OR REPLACE FUNCTION public.fetch_leads_board_page(
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0,
  p_assigned_to uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_has_budget boolean DEFAULT false,
  p_skip_stats boolean DEFAULT false,
  p_created_from timestamptz DEFAULT NULL,
  p_created_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT l.id, l.updated_at, l.resume
    FROM public.leads l
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
      AND (p_created_from IS NULL OR l.created_at >= p_created_from)
      AND (p_created_to IS NULL OR l.created_at <= p_created_to)
  ),
  stats AS (
    SELECT
      CASE WHEN p_skip_stats THEN NULL::bigint ELSE COUNT(*)::bigint END AS total,
      CASE
        WHEN p_skip_stats THEN NULL::bigint
        ELSE COUNT(*) FILTER (
          WHERE resume IS NOT NULL AND resume <> ''
        )::bigint
      END AS responded
    FROM filtered
  ),
  page_ids AS (
    SELECT f.id
    FROM filtered f
    ORDER BY f.updated_at DESC
    LIMIT GREATEST(p_limit, 0)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT jsonb_build_object(
    'total',
    (SELECT total FROM stats),
    'responded',
    (SELECT responded FROM stats),
    'rows',
    COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(l)
          || jsonb_build_object(
            'interested_cars',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ic.id,
                    'lead_id', ic.lead_id,
                    'inventory_id', ic.inventory_id,
                    'vehicle_uid', ic.vehicle_uid,
                    'created_at', ic.created_at,
                    'updated_at', ic.updated_at,
                    'brand', io.brand,
                    'model', io.model,
                    'year', io.year
                  )
                  ORDER BY ic.id
                )
                FROM public.interested_cars ic
                LEFT JOIN public.inventoryoracle io ON io.id = ic.inventory_id
                WHERE ic.lead_id = l.id
              ),
              '[]'::jsonb
            ),
            'profiles',
            COALESCE(
              (
                SELECT jsonb_build_object('full_name', p.full_name)
                FROM public.profiles p
                WHERE p.id = l.assigned_to
              ),
              jsonb_build_object('full_name', '')
            ),
            'trade_in_cars',
            '[]'::jsonb
          )
          ORDER BY l.updated_at DESC
        )
        FROM public.leads l
        INNER JOIN page_ids pi ON pi.id = l.id
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fetch_leads_board_page(
  int, int, uuid, text, boolean, boolean, timestamptz, timestamptz
) TO authenticated, service_role;
