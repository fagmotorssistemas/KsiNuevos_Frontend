-- Quedados (stock) + contestó pero no salió de etapa. Vista de jefe.

CREATE OR REPLACE FUNCTION public.sales_progress_quedados()
RETURNS TABLE (vendedor_id uuid, faltante integer, asesoria integer)
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
    SELECT l.assigned_to AS vendedor_id, count(DISTINCT af.lead_id)::int AS n
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND coalesce(af.estado::text, 'pendiente') IN ('pendiente', 'en_proceso')
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
    coalesce(a.n, 0)
  FROM ids i
  LEFT JOIN f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a ON a.vendedor_id = i.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_estancados_day(p_fecha date)
RETURNS TABLE (
  vendedor_id uuid,
  faltante_contestadas integer,
  faltante_sin_salir integer,
  asesoria_respondidas integer,
  asesoria_sin_salir integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH faltante AS (
    SELECT
      l.assigned_to AS vendedor_id,
      d.lead_id,
      bool_and(public.sales_progress_datos_faltantes_contestada(d)) AS contestada,
      bool_and(coalesce(d.estado, 'pendiente') = 'resuelto') AS resuelto
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) = p_fecha
    GROUP BY l.assigned_to, d.lead_id
  ),
  ases AS (
    SELECT
      l.assigned_to AS vendedor_id,
      af.lead_id,
      bool_or(
        coalesce(af.estado::text, 'pendiente') IN ('en_proceso', 'resuelto')
        OR nullif(btrim(coalesce(af.notas_vendedor, '')), '') IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.asesoria_financiamiento_gestion g
          WHERE g.asesoria_id = af.id
        )
      ) AS respondida,
      bool_and(coalesce(af.estado::text, 'pendiente') = 'resuelto') AS resuelto
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
    GROUP BY l.assigned_to, af.lead_id
  ),
  f_agg AS (
    SELECT
      vendedor_id,
      count(*) FILTER (WHERE contestada)::int AS contestadas,
      count(*) FILTER (WHERE contestada AND NOT resuelto)::int AS sin_salir
    FROM faltante
    GROUP BY vendedor_id
  ),
  a_agg AS (
    SELECT
      vendedor_id,
      count(*) FILTER (WHERE respondida)::int AS respondidas,
      count(*) FILTER (WHERE respondida AND NOT resuelto)::int AS sin_salir
    FROM ases
    GROUP BY vendedor_id
  ),
  ids AS (
    SELECT vendedor_id FROM f_agg
    UNION
    SELECT vendedor_id FROM a_agg
  )
  SELECT
    i.vendedor_id,
    coalesce(f.contestadas, 0),
    coalesce(f.sin_salir, 0),
    coalesce(a.respondidas, 0),
    coalesce(a.sin_salir, 0)
  FROM ids i
  LEFT JOIN f_agg f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a_agg a ON a.vendedor_id = i.vendedor_id
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
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at ASC), '[]'::jsonb)
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
        af.fecha_solicitud,
        l.id,
        l.name,
        l.phone,
        CASE coalesce(af.estado::text, 'pendiente')
          WHEN 'en_proceso' THEN 'Quedado · en proceso'
          ELSE 'Quedado · pendiente'
        END,
        left(coalesce(nullif(btrim(af.mensaje_completo), ''), 'Financiamiento sin resolver'), 280),
        'lead_asesoria'::text
      FROM public.asesoria_financiamiento af
      JOIN public.leads l ON l.id = af.lead_id
      WHERE p_tipo = 'asesoria'
        AND l.assigned_to = p_vendedor_id
        AND coalesce(af.estado::text, 'pendiente') IN ('pendiente', 'en_proceso')
    ) raw
    ORDER BY occurred_at ASC NULLS LAST
    LIMIT 80
  ) x
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_estancados_events_json(
  p_fecha date,
  p_vendedor_id uuid,
  p_tipo text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      d.fecha_solicitud AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      'Contestó · sigue en info. faltante'::text AS titulo,
      'Respondió pero no pasó a Resuelto.'::text AS detalle,
      'lead_datos'::text AS recurso
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE p_tipo = 'faltante'
      AND l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) = p_fecha
      AND public.sales_progress_datos_faltantes_contestada(d)
      AND coalesce(d.estado, 'pendiente') IS DISTINCT FROM 'resuelto'
    UNION ALL
    SELECT
      af.fecha_solicitud,
      l.id,
      l.name,
      l.phone,
      'Respondió · sigue en financiamiento',
      'No pasó a Resuelto. Sigue quedado en esa etapa.',
      'lead_asesoria'
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE p_tipo = 'asesoria'
      AND l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
      AND coalesce(af.estado::text, 'pendiente') = 'en_proceso'
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
  e AS (SELECT * FROM public.sales_progress_estancados_day(v_fecha))
  SELECT jsonb_build_object(
    'faltante_quedados', coalesce((SELECT faltante FROM q WHERE vendedor_id = v_seller), 0),
    'asesoria_quedados', coalesce((SELECT asesoria FROM q WHERE vendedor_id = v_seller), 0),
    'faltante_sin_salir', coalesce((SELECT faltante_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_sin_salir', coalesce((SELECT asesoria_sin_salir FROM e WHERE vendedor_id = v_seller), 0),
    'asesoria_respondidas', coalesce((SELECT asesoria_respondidas FROM e WHERE vendedor_id = v_seller), 0),
    'ranking', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'vendedor_id', coalesce(q.vendedor_id, e.vendedor_id),
        'faltante_quedados', coalesce(q.faltante, 0),
        'asesoria_quedados', coalesce(q.asesoria, 0),
        'faltante_sin_salir', coalesce(e.faltante_sin_salir, 0),
        'asesoria_sin_salir', coalesce(e.asesoria_sin_salir, 0)
      ))
      FROM q
      FULL OUTER JOIN e ON e.vendedor_id = q.vendedor_id
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
  IF p_categoria = 'faltante_sin_salir' THEN
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'faltante'), '[]'::jsonb);
  END IF;
  IF p_categoria = 'asesoria_sin_salir' THEN
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'asesoria'), '[]'::jsonb);
  END IF;

  RETURN public.get_sales_progress_events_core(p_fecha, p_vendedor_id, p_categoria);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_quedados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_estancados_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados_events_json(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_estancados_events_json(date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events(date, uuid, text) TO authenticated;
