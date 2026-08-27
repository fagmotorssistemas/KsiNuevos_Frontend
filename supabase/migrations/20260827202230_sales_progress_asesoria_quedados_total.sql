-- Financiamiento quedados = pendiente/en proceso.
-- El total de fichas (incluye resuelto) es el "Todos" de Leads, no el montón abierto.

DROP FUNCTION IF EXISTS public.sales_progress_quedados();

CREATE FUNCTION public.sales_progress_quedados()
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
        WHERE coalesce(af.estado::text, 'pendiente') IN ('pendiente', 'en_proceso')
      )::int AS abiertos,
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
    coalesce(a.abiertos, 0),
    coalesce(a.total, 0)
  FROM ids i
  LEFT JOIN f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a ON a.vendedor_id = i.vendedor_id
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
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
