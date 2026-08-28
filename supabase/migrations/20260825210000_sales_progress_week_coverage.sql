-- Misma tasa del anillo (contestados / llegados), semana sábado → viernes hasta la fecha vista.

CREATE OR REPLACE FUNCTION public.sales_progress_week_coverage(p_fecha date)
RETURNS TABLE (
  vendedor_id uuid,
  ingresados integer,
  contestados integer,
  pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_start AS (
    SELECT (p_fecha - ((EXTRACT(DOW FROM p_fecha)::int + 1) % 7))::date AS start
  ),
  days AS (
    SELECT generate_series(ws.start, p_fecha, interval '1 day')::date AS d
    FROM week_start ws
  ),
  pipe AS (
    SELECT
      p.vendedor_id,
      sum(p.ingresados)::int AS ingresados,
      sum(p.con_historial)::int AS contestados
    FROM days d
    CROSS JOIN LATERAL public.sales_progress_day_pipeline_stats(d.d) p
    GROUP BY p.vendedor_id
  )
  SELECT
    p.vendedor_id,
    p.ingresados,
    p.contestados,
    CASE
      WHEN p.ingresados <= 0 THEN 0
      ELSE round(100.0 * p.contestados / p.ingresados)::int
    END
  FROM pipe p
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
  w AS (SELECT * FROM public.sales_progress_week_coverage(v_fecha))
  SELECT jsonb_build_object(
    'faltante_quedados', coalesce((SELECT faltante FROM q WHERE vendedor_id = v_seller), 0),
    'asesoria_quedados', coalesce((SELECT asesoria FROM q WHERE vendedor_id = v_seller), 0),
    'faltante_sin_salir', coalesce((SELECT faltante_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_sin_salir', coalesce((SELECT asesoria_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_respondidas', coalesce((SELECT asesoria_respondidas FROM e WHERE vendedor_id = v_seller), 0),
    'semana_contestados_pct', coalesce((SELECT pct FROM w WHERE vendedor_id = v_seller), 0),
    'semana_ingresados', coalesce((SELECT ingresados FROM w WHERE vendedor_id = v_seller), 0),
    'semana_contestados', coalesce((SELECT contestados FROM w WHERE vendedor_id = v_seller), 0),
    'ranking', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'vendedor_id', coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id),
        'faltante_quedados', coalesce(q.faltante, 0),
        'asesoria_quedados', coalesce(q.asesoria, 0),
        'faltante_sin_salir', coalesce(e.faltante_sin_salir, 0),
        'asesoria_sin_salir', coalesce(e.asesoria_sin_salir, 0),
        'semana_contestados_pct', coalesce(w.pct, 0)
      ))
      FROM q
      FULL OUTER JOIN e ON e.vendedor_id = q.vendedor_id
      FULL OUTER JOIN w ON w.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id)
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_week_coverage(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
