-- Info. faltante quedados = Sin respuesta (ninguna solicitud tiene notas),
-- igual que los chips de Leads. El total es "Todos".

DROP FUNCTION IF EXISTS public.sales_progress_quedados();

CREATE FUNCTION public.sales_progress_quedados()
RETURNS TABLE (
  vendedor_id uuid,
  faltante integer,
  asesoria integer,
  asesoria_total integer,
  faltante_total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT
      assigned_to AS vendedor_id,
      count(*) FILTER (WHERE with_notes = 0)::int AS sin_respuesta,
      count(*)::int AS total
    FROM (
      SELECT
        l.assigned_to,
        d.lead_id,
        count(*) FILTER (
          WHERE nullif(btrim(coalesce(d.notas_vendedor, '')), '') IS NOT NULL
        ) AS with_notes
      FROM public.datos_solicitados_clientes d
      JOIN public.leads l ON l.id = d.lead_id
      WHERE l.assigned_to IS NOT NULL
      GROUP BY l.assigned_to, d.lead_id
    ) x
    GROUP BY assigned_to
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
    coalesce(f.sin_respuesta, 0),
    coalesce(a.sin_ficha, 0),
    coalesce(a.total, 0),
    coalesce(f.total, 0)
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
        min(d.fecha_solicitud) AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        'Sin respuesta'::text AS titulo,
        'Ninguna solicitud tiene la respuesta escrita'::text AS detalle,
        'lead_datos'::text AS recurso
      FROM public.datos_solicitados_clientes d
      JOIN public.leads l ON l.id = d.lead_id
      WHERE p_tipo = 'faltante'
        AND l.assigned_to = p_vendedor_id
      GROUP BY l.id, l.name, l.phone
      HAVING count(*) FILTER (
        WHERE nullif(btrim(coalesce(d.notas_vendedor, '')), '') IS NOT NULL
      ) = 0
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

CREATE OR REPLACE FUNCTION public.get_sales_progress_boss_stock(
  p_fecha date DEFAULT NULL,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_profile_admin();
  v_fecha date;
  v_seller uuid;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  v_fecha := coalesce(p_fecha, public.activity_date_now_ecuador());

  IF v_admin THEN
    v_seller := coalesce(
      p_vendedor_id,
      (
        SELECT c.vendedor_id
        FROM public.sales_progress_seller_config c
        WHERE c.rol = 'diario'
        ORDER BY c.sort_order
        LIMIT 1
      ),
      v_uid
    );
  ELSE
    v_seller := v_uid;
  END IF;

  WITH q AS (SELECT * FROM public.sales_progress_quedados()),
  e AS (SELECT * FROM public.sales_progress_estancados_day(v_fecha)),
  w AS (SELECT * FROM public.sales_progress_week_coverage(v_fecha)),
  p AS (SELECT * FROM public.sales_progress_pedidos_quedados()),
  cu AS (SELECT * FROM public.sales_progress_contestados_cuota(v_fecha))
  SELECT jsonb_build_object(
    'faltante_quedados', coalesce((SELECT faltante FROM q WHERE vendedor_id = v_seller), 0),
    'faltante_total', coalesce((SELECT faltante_total FROM q WHERE vendedor_id = v_seller), 0),
    'asesoria_quedados', coalesce((SELECT asesoria FROM q WHERE vendedor_id = v_seller), 0),
    'asesoria_total', coalesce((SELECT asesoria_total FROM q WHERE vendedor_id = v_seller), 0),
    'pedidos_quedados', coalesce((SELECT pedidos FROM p WHERE vendedor_id = v_seller), 0),
    'faltante_sin_salir', coalesce((SELECT faltante_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_sin_salir', coalesce((SELECT asesoria_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_respondidas', coalesce((SELECT asesoria_respondidas FROM e WHERE vendedor_id = v_seller), 0),
    'semana_contestados_pct', coalesce((SELECT pct FROM w WHERE vendedor_id = v_seller), 0),
    'semana_ingresados', coalesce((SELECT ingresados FROM w WHERE vendedor_id = v_seller), 0),
    'semana_contestados', coalesce((SELECT contestados FROM w WHERE vendedor_id = v_seller), 0),
    'contestados_cuota', coalesce((SELECT cuota FROM cu WHERE vendedor_id = v_seller), 35),
    'contestados_hoy', coalesce((SELECT contestados_hoy FROM cu WHERE vendedor_id = v_seller), 0),
    'contestados_cartera', coalesce((SELECT contestados_cartera FROM cu WHERE vendedor_id = v_seller), 0),
    'hoy_sin_resumen', coalesce((SELECT hoy_sin_resumen FROM cu WHERE vendedor_id = v_seller), 0),
    'sin_resumen', coalesce((SELECT sin_resumen FROM cu WHERE vendedor_id = v_seller), 0),
    'ranking', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'vendedor_id', coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id, p.vendedor_id, cu.vendedor_id),
        'faltante_quedados', coalesce(q.faltante, 0),
        'faltante_total', coalesce(q.faltante_total, 0),
        'asesoria_quedados', coalesce(q.asesoria, 0),
        'asesoria_total', coalesce(q.asesoria_total, 0),
        'pedidos_quedados', coalesce(p.pedidos, 0),
        'faltante_sin_salir', coalesce(e.faltante_sin_salir, 0),
        'asesoria_sin_salir', coalesce(e.asesoria_sin_salir, 0),
        'semana_contestados_pct', coalesce(w.pct, 0),
        'contestados_cuota', coalesce(cu.cuota, 35),
        'contestados_hoy', coalesce(cu.contestados_hoy, 0),
        'contestados_cartera', coalesce(cu.contestados_cartera, 0),
        'hoy_sin_resumen', coalesce(cu.hoy_sin_resumen, 0),
        'sin_resumen', coalesce(cu.sin_resumen, 0)
      ))
      FROM q
      FULL OUTER JOIN e ON e.vendedor_id = q.vendedor_id
      FULL OUTER JOIN w ON w.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id)
      FULL OUTER JOIN p ON p.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id)
      FULL OUTER JOIN cu ON cu.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id, p.vendedor_id)
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_progress_quedados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados_events_json(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
