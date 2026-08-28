-- Pedidos pendientes como cola de "en qué nos quedamos".
-- Lo vendido no entra aquí: esa cifra vive aparte en el tablero.

CREATE OR REPLACE FUNCTION public.sales_progress_pedidos_quedados()
RETURNS TABLE (vendedor_id uuid, pedidos integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.requested_by AS vendedor_id,
    count(*)::int AS pedidos
  FROM public.vehicle_requests r
  WHERE r.requested_by IS NOT NULL
    AND r.status = 'pendiente'::public.request_status
  GROUP BY r.requested_by
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_pedidos_events_json(p_vendedor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at ASC), '[]'::jsonb)
  FROM (
    SELECT
      coalesce(r.created_at, now()) AS occurred_at,
      r.lead_id,
      coalesce(
        nullif(btrim(r.client_name), ''),
        nullif(btrim(r.brand || ' ' || r.model), ''),
        'Pedido'
      ) AS lead_name,
      r.client_phone AS lead_phone,
      'Pedido pendiente'::text AS titulo,
      left(
        concat_ws(
          ' · ',
          nullif(btrim(r.brand || ' ' || r.model), ''),
          CASE WHEN r.year_min IS NOT NULL OR r.year_max IS NOT NULL
            THEN concat(coalesce(r.year_min::text, '?'), '–', coalesce(r.year_max::text, '?'))
            ELSE NULL
          END,
          nullif(btrim(coalesce(r.notes, '')), '')
        ),
        280
      ) AS detalle,
      'pedidos'::text AS recurso
    FROM public.vehicle_requests r
    WHERE r.requested_by = p_vendedor_id
      AND r.status = 'pendiente'::public.request_status
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
  p AS (SELECT * FROM public.sales_progress_pedidos_quedados())
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
    'ranking', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'vendedor_id', coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id, p.vendedor_id),
        'faltante_quedados', coalesce(q.faltante, 0),
        'asesoria_quedados', coalesce(q.asesoria, 0),
        'pedidos_quedados', coalesce(p.pedidos, 0),
        'faltante_sin_salir', coalesce(e.faltante_sin_salir, 0),
        'asesoria_sin_salir', coalesce(e.asesoria_sin_salir, 0),
        'semana_contestados_pct', coalesce(w.pct, 0)
      ))
      FROM q
      FULL OUTER JOIN e ON e.vendedor_id = q.vendedor_id
      FULL OUTER JOIN w ON w.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id)
      FULL OUTER JOIN p ON p.vendedor_id = coalesce(q.vendedor_id, e.vendedor_id, w.vendedor_id)
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

  RETURN public.get_sales_progress_events_core(p_fecha, p_vendedor_id, p_categoria);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_pedidos_quedados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_pedidos_events_json(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events(date, uuid, text) TO authenticated;
