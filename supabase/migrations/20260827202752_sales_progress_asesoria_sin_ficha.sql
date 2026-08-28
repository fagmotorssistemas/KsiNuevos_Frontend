-- Financiamiento quedados = Sin ficha (nunca llenaron asesoria_financiamiento_gestion).
-- El total sigue siendo Todas las fichas de Leads.

CREATE OR REPLACE FUNCTION public.sales_progress_quedados()
RETURNS TABLE (
  vendedor_id uuid,
  faltante integer,
  asesoria integer,
  asesoria_total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT l.assigned_to AS vendedor_id, count(DISTINCT d.lead_id)::int AS n
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND coalesce(d.estado, 'pendiente') IN ('pendiente', 'en_proceso')
    GROUP BY l.assigned_to
  ),
  a AS (
    SELECT
      l.assigned_to AS vendedor_id,
      count(DISTINCT af.lead_id) FILTER (
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af2
          JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af2.id
          WHERE af2.lead_id = af.lead_id
        )
      )::int AS sin_ficha,
      count(DISTINCT af.lead_id)::int AS total
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  ids AS (
    SELECT vendedor_id FROM f
    UNION
    SELECT vendedor_id FROM a
  )
  SELECT
    i.vendedor_id,
    coalesce(f.n, 0),
    coalesce(a.sin_ficha, 0),
    coalesce(a.total, 0)
  FROM ids i
  LEFT JOIN f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a ON a.vendedor_id = i.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_quedados_events_json(
  p_vendedor_id uuid,
  p_tipo text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at ASC NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT *
    FROM (
      SELECT
        d.fecha_solicitud AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        CASE coalesce(d.estado, 'pendiente')
          WHEN 'en_proceso' THEN 'Quedado · en proceso'
          ELSE 'Quedado · pendiente'
        END AS titulo,
        left(coalesce(nullif(btrim(d.mensaje_completo), ''), 'Info. faltante sin resolver'), 280) AS detalle,
        'lead_datos'::text AS recurso
      FROM public.datos_solicitados_clientes d
      JOIN public.leads l ON l.id = d.lead_id
      WHERE p_tipo = 'faltante'
        AND l.assigned_to = p_vendedor_id
        AND coalesce(d.estado, 'pendiente') IN ('pendiente', 'en_proceso')
      UNION ALL
      SELECT
        min(af.fecha_solicitud),
        l.id,
        l.name,
        l.phone,
        'Sin ficha de gestión'::text,
        'Nunca llenaron la ficha de financiamiento'::text,
        'lead_asesoria'::text
      FROM public.asesoria_financiamiento af
      JOIN public.leads l ON l.id = af.lead_id
      WHERE p_tipo = 'asesoria'
        AND l.assigned_to = p_vendedor_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af2
          JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af2.id
          WHERE af2.lead_id = af.lead_id
        )
      GROUP BY l.id, l.name, l.phone
    ) raw
    ORDER BY occurred_at ASC NULLS LAST
    LIMIT 200
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_quedados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados_events_json(uuid, text) TO authenticated;
