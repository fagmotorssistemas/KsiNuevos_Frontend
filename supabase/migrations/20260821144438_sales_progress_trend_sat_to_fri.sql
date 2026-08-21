-- Tendencia: semana sábado → viernes de la fecha vista (no 7 días corridos).

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
  week_start AS (
    SELECT (p_fecha - ((EXTRACT(DOW FROM p_fecha)::int + 1) % 7))::date AS start
  ),
  trend_days AS (
    SELECT (ws.start + offs)::date AS d
    FROM week_start ws
    CROSS JOIN generate_series(0, 6) AS offs
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
