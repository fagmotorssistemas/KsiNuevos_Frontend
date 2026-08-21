-- Tendencia 7 días = promedio del equipo diario como % de un día perfecto (100 pts c/u).
-- Tope 100%. Juan (estrancado) no entra en esta barra.

CREATE OR REPLACE FUNCTION public.sales_progress_team_trend(p_fecha date)
RETURNS TABLE (
  fecha date,
  puntos_total numeric,
  puntos_actividad numeric,
  puntos_avance numeric,
  vendedores integer,
  porcentaje numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH diario AS (
    SELECT c.vendedor_id
    FROM public.sales_progress_seller_config c
    JOIN public.profiles p ON p.id = c.vendedor_id
    WHERE c.rol = 'diario'
      AND p.status = 'activo'
  ),
  team_size AS (
    SELECT greatest(count(*)::int, 1) AS n FROM diario
  ),
  trend_days AS (
    SELECT (p_fecha - offs)::date AS d
    FROM generate_series(6, 0, -1) AS offs
  )
  SELECT
    td.d,
    coalesce(s.puntos_total, 0),
    coalesce(s.puntos_actividad, 0),
    coalesce(s.puntos_avance, 0),
    ts.n,
    least(
      100,
      round(
        coalesce(s.puntos_total, 0) / (ts.n * 100.0) * 100
      )
    )
  FROM trend_days td
  CROSS JOIN team_size ts
  LEFT JOIN LATERAL (
    SELECT
      coalesce(sum(w.puntos) FILTER (WHERE w.axis = 'actividad'), 0) AS puntos_actividad,
      coalesce(sum(w.puntos) FILTER (WHERE w.axis = 'avance'), 0) AS puntos_avance,
      coalesce(sum(w.puntos), 0) AS puntos_total
    FROM public.sales_progress_apply_weights(
      td.d,
      td.d = public.activity_date_now_ecuador()
    ) w
    JOIN diario d ON d.vendedor_id = w.vendedor_id
  ) s ON true
$$;

REVOKE ALL ON FUNCTION public.sales_progress_team_trend(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_team_trend(date) TO service_role;

CREATE OR REPLACE FUNCTION public.get_sales_daily_progress(
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
  v_nombre text;
  v_rol text;
  v_is_today boolean;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_fecha := coalesce(p_fecha, public.activity_date_now_ecuador());
  v_is_today := v_fecha = public.activity_date_now_ecuador();

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

  SELECT p.full_name, c.rol
  INTO v_nombre, v_rol
  FROM public.profiles p
  LEFT JOIN public.sales_progress_seller_config c ON c.vendedor_id = p.id
  WHERE p.id = v_seller;

  IF v_nombre IS NULL THEN
    SELECT p.full_name, c.rol INTO v_nombre, v_rol
    FROM public.profiles p
    LEFT JOIN public.sales_progress_seller_config c ON c.vendedor_id = p.id
    WHERE p.id = v_uid;
    v_seller := v_uid;
  END IF;

  WITH scored AS (
    SELECT * FROM public.sales_progress_apply_weights(v_fecha, v_is_today)
  ),
  mine AS (
    SELECT * FROM scored WHERE vendedor_id = v_seller
  ),
  pipeline AS (
    SELECT * FROM public.sales_progress_day_pipeline_stats(v_fecha)
  ),
  totals AS (
    SELECT
      s.vendedor_id,
      coalesce(sum(s.puntos) FILTER (WHERE s.axis = 'actividad'), 0) AS puntos_actividad,
      coalesce(sum(s.puntos) FILTER (WHERE s.axis = 'avance'), 0) AS puntos_avance,
      coalesce(sum(s.puntos) FILTER (WHERE s.axis = 'penalizacion'), 0) AS puntos_penalizacion,
      coalesce(sum(s.puntos), 0) AS puntos_total,
      coalesce(sum(s.cantidad) FILTER (WHERE s.categoria = 'stale_leads'), 0)::int AS stale_leads
    FROM scored s
    GROUP BY s.vendedor_id
  ),
  ranking AS (
    SELECT
      t.vendedor_id,
      p.full_name AS nombre,
      coalesce(c.rol, 'diario') AS rol,
      c.sort_order,
      t.puntos_actividad,
      t.puntos_avance,
      t.puntos_penalizacion,
      t.puntos_total,
      t.stale_leads,
      coalesce(pl.ingresados, 0) AS leads_ingresados,
      coalesce(pl.con_historial, 0) AS leads_con_historial,
      coalesce(pl.backlog_abiertos, 0) AS backlog_abiertos
    FROM totals t
    JOIN public.profiles p ON p.id = t.vendedor_id
    LEFT JOIN public.sales_progress_seller_config c ON c.vendedor_id = t.vendedor_id
    LEFT JOIN pipeline pl ON pl.vendedor_id = t.vendedor_id
  ),
  avg_team AS (
    SELECT coalesce(avg(puntos_total) FILTER (WHERE rol = 'diario'), 0) AS promedio
    FROM ranking
  ),
  stale_names AS (
    SELECT coalesce(nombres, ARRAY[]::text[]) AS nombres, cantidad
    FROM public.sales_stale_lead_counts()
    WHERE vendedor_id = v_seller
      AND v_is_today
      AND coalesce(v_rol, '') = 'diario'
  ),
  trend AS (
    SELECT * FROM public.sales_progress_team_trend(v_fecha)
  )
  SELECT jsonb_build_object(
    'fecha', v_fecha,
    'vendedor_id', v_seller,
    'vendedor_nombre', coalesce(v_nombre, 'Vendedor'),
    'rol', coalesce(v_rol, 'diario'),
    'es_admin', v_admin,
    'leads_ingresados', coalesce((SELECT ingresados FROM pipeline WHERE vendedor_id = v_seller), 0),
    'leads_con_historial', coalesce((SELECT con_historial FROM pipeline WHERE vendedor_id = v_seller), 0),
    'backlog_abiertos', coalesce((SELECT backlog_abiertos FROM pipeline WHERE vendedor_id = v_seller), 0),
    'categorias', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'categoria', m.categoria,
          'label', m.label,
          'axis', m.axis,
          'cantidad', m.cantidad,
          'puntos_brutos', m.puntos_brutos,
          'puntos', m.puntos,
          'cap', m.cap
        ) ORDER BY m.sort_order
      )
      FROM mine m
      WHERE NOT (m.categoria = 'stale_leads' AND coalesce(v_rol, '') = 'estrancado')
    ), '[]'::jsonb),
    'puntos_actividad', coalesce((SELECT puntos_actividad FROM totals WHERE vendedor_id = v_seller), 0),
    'puntos_avance', coalesce((SELECT puntos_avance FROM totals WHERE vendedor_id = v_seller), 0),
    'puntos_penalizacion', coalesce((SELECT puntos_penalizacion FROM totals WHERE vendedor_id = v_seller), 0),
    'puntos_total', coalesce((SELECT puntos_total FROM totals WHERE vendedor_id = v_seller), 0),
    'stale_leads', coalesce((SELECT cantidad FROM stale_names), 0),
    'stale_lead_names', coalesce((SELECT to_jsonb(nombres) FROM stale_names), '[]'::jsonb),
    'promedio_equipo', (SELECT round(promedio, 1) FROM avg_team),
    'ranking', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'vendedor_id', r.vendedor_id,
          'nombre', r.nombre,
          'rol', r.rol,
          'puntos_total', r.puntos_total,
          'puntos_actividad', r.puntos_actividad,
          'puntos_avance', r.puntos_avance,
          'puntos_penalizacion', r.puntos_penalizacion,
          'stale_leads', r.stale_leads,
          'leads_ingresados', r.leads_ingresados,
          'leads_con_historial', r.leads_con_historial,
          'backlog_abiertos', r.backlog_abiertos
        )
        ORDER BY CASE WHEN r.rol = 'diario' THEN 0 ELSE 1 END, r.puntos_total DESC, r.sort_order
      )
      FROM ranking r
    ), '[]'::jsonb),
    'tendencia', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'fecha', t.fecha,
          'puntos_total', t.puntos_total,
          'puntos_actividad', t.puntos_actividad,
          'puntos_avance', t.puntos_avance,
          'vendedores', t.vendedores,
          'porcentaje', t.porcentaje
        ) ORDER BY t.fecha
      )
      FROM trend t
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;
