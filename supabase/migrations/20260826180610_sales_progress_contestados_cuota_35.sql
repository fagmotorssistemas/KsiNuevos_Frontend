-- Cuota diaria de resúmenes: 35 (diario) / 50 (cartera).
-- Contestar los de hoy no basta: hay que completar la cuota con
-- leads de otros días que siguen sin resumen ejecutivo.

CREATE OR REPLACE FUNCTION public.sales_progress_contestados_cuota(p_fecha date)
RETURNS TABLE (
  vendedor_id uuid,
  ingresados integer,
  contestados integer,
  contestados_hoy integer,
  contestados_cartera integer,
  hoy_sin_resumen integer,
  sin_resumen integer,
  cuota integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') AS start_at,
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') + interval '1 day' AS end_at
  )
  SELECT
    c.vendedor_id,
    count(*) FILTER (
      WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
    )::int AS ingresados,
    count(*) FILTER (
      WHERE public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    )::int AS contestados,
    count(*) FILTER (
      WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
        AND public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    )::int AS contestados_hoy,
    count(*) FILTER (
      WHERE l.created_at < b.start_at
        AND public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    )::int AS contestados_cartera,
    count(*) FILTER (
      WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
        AND coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NULL
    )::int AS hoy_sin_resumen,
    count(*) FILTER (
      WHERE l.created_at < b.start_at
        AND coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NULL
    )::int AS sin_resumen,
    CASE WHEN c.rol = 'estrancado' THEN 50 ELSE 35 END AS cuota
  FROM public.sales_progress_seller_config c
  CROSS JOIN bounds b
  LEFT JOIN public.leads l ON l.assigned_to = c.vendedor_id
  WHERE c.rol <> 'excluido'
  GROUP BY c.vendedor_id, c.rol, c.sort_order
  ORDER BY c.sort_order
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_sin_resumen_events_json(
  p_fecha date,
  p_vendedor_id uuid,
  p_incluir_hoy boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') AS start_at,
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') + interval '1 day' AS end_at
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'occurred_at', x.occurred_at,
        'lead_id', x.lead_id,
        'lead_name', x.lead_name,
        'lead_phone', x.lead_phone,
        'titulo', x.titulo,
        'detalle', x.detalle,
        'recurso', x.recurso
      )
      ORDER BY x.sort_key, x.occurred_at ASC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      l.created_at AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN l.created_at >= b.start_at AND l.created_at < b.end_at
          THEN 'Hoy sin resumen · ' || coalesce(l.status::text, 'nuevo')
        ELSE 'Cartera sin resumen · ' || coalesce(l.status::text, 'nuevo')
      END AS titulo,
      concat_ws(
        ' · ',
        coalesce(l.source::text, 'origen desconocido'),
        to_char(l.created_at AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY')
      ) AS detalle,
      'lead'::text AS recurso,
      CASE
        WHEN l.created_at >= b.start_at AND l.created_at < b.end_at THEN 0
        ELSE 1
      END AS sort_key
    FROM public.leads l
    CROSS JOIN bounds b
    WHERE l.assigned_to = p_vendedor_id
      AND coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
      AND nullif(btrim(coalesce(l.resume, '')), '') IS NULL
      AND (
        (p_incluir_hoy AND l.created_at >= b.start_at AND l.created_at < b.end_at)
        OR l.created_at < b.start_at
      )
    ORDER BY
      CASE
        WHEN l.created_at >= b.start_at AND l.created_at < b.end_at THEN 0
        ELSE 1
      END,
      l.created_at ASC
    LIMIT 80
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
    'asesoria_quedados', coalesce((SELECT asesoria FROM q WHERE vendedor_id = v_seller), 0),
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

CREATE OR REPLACE FUNCTION public.get_sales_progress_events(
  p_fecha date,
  p_vendedor_id uuid,
  p_categoria text
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT v_admin AND p_vendedor_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF p_categoria = 'seguimientos_ia' THEN
    RETURN coalesce(public.sales_progress_ia_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;
  IF p_categoria = 'citas_sin_gestionar' THEN
    RETURN coalesce(public.sales_progress_citas_gestion_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;
  IF p_categoria = 'showroom_sin_gestion' THEN
    RETURN coalesce(public.sales_progress_showroom_sin_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;
  IF p_categoria = 'quedados_faltante' THEN
    RETURN coalesce(public.sales_progress_quedados_events_json(p_vendedor_id, 'faltante'), '[]'::jsonb);
  END IF;
  IF p_categoria = 'quedados_asesoria' THEN
    RETURN coalesce(public.sales_progress_quedados_events_json(p_vendedor_id, 'asesoria'), '[]'::jsonb);
  END IF;
  IF p_categoria = 'quedados_pedidos' THEN
    RETURN coalesce(public.sales_progress_pedidos_events_json(p_vendedor_id), '[]'::jsonb);
  END IF;
  IF p_categoria = 'faltante_sin_salir' THEN
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'faltante'), '[]'::jsonb);
  END IF;
  IF p_categoria = 'asesoria_sin_salir' THEN
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'asesoria'), '[]'::jsonb);
  END IF;
  IF p_categoria = 'sin_resumen' THEN
    RETURN coalesce(public.sales_progress_sin_resumen_events_json(p_fecha, p_vendedor_id, false), '[]'::jsonb);
  END IF;
  IF p_categoria = 'contestados_pendientes' THEN
    RETURN coalesce(public.sales_progress_sin_resumen_events_json(p_fecha, p_vendedor_id, true), '[]'::jsonb);
  END IF;

  RETURN public.get_sales_progress_events_core(p_fecha, p_vendedor_id, p_categoria);
END;
$$;

REVOKE ALL ON FUNCTION public.sales_progress_contestados_cuota(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sales_progress_sin_resumen_events_json(date, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_contestados_cuota(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_sin_resumen_events_json(date, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events(date, uuid, text) TO authenticated;
