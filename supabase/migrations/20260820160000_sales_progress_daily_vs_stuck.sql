-- Roles de progreso: 3 vendedores diarios vs encargado de estrancados.
-- Juan Vazquez no se penaliza por el backlog histórico.
-- Ingresos del día se miden por assigned_to + created_at (Ecuador).

CREATE TABLE IF NOT EXISTS public.sales_progress_seller_config (
  vendedor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('diario', 'estrancado', 'excluido')),
  sort_order integer NOT NULL DEFAULT 100
);

COMMENT ON TABLE public.sales_progress_seller_config IS
  'Quién entra al score diario: diario = pipeline del día; estrancado = cartera trabada (sin penalización de sin tocar); excluido = no rankea.';

ALTER TABLE public.sales_progress_seller_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_progress_seller_config_select ON public.sales_progress_seller_config;
CREATE POLICY sales_progress_seller_config_select ON public.sales_progress_seller_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sales_progress_seller_config_admin ON public.sales_progress_seller_config;
CREATE POLICY sales_progress_seller_config_admin ON public.sales_progress_seller_config
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

INSERT INTO public.sales_progress_seller_config (vendedor_id, rol, sort_order)
VALUES
  ('ecce58a4-3962-4f14-970b-b0a0c9873803', 'diario', 10), -- Felipe Cabrera
  ('16a2bf26-6cba-4aa6-8ede-6c0a87a5443c', 'diario', 20), -- Vanessa Reyes
  ('c787d41f-16fb-422d-9b57-f145b941e437', 'diario', 30), -- Xavier Orellana
  ('b374c77b-3516-4d64-a94d-6c33ee49ddbf', 'estrancado', 40), -- Juan Vazquez
  ('920fe992-8f4a-4866-a9b6-02f6009fc7b3', 'excluido', 90) -- FagMotors
ON CONFLICT (vendedor_id) DO UPDATE
SET rol = EXCLUDED.rol, sort_order = EXCLUDED.sort_order;

-- Ingresos del día + leads distintos con historial (interacción) ese día
CREATE OR REPLACE FUNCTION public.sales_progress_day_pipeline_stats(p_fecha date)
RETURNS TABLE (vendedor_id uuid, ingresados integer, con_historial integer, backlog_abiertos integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') AS start_at,
      (p_fecha::timestamp AT TIME ZONE 'America/Guayaquil') + interval '1 day' AS end_at
  ),
  sellers AS (
    SELECT c.vendedor_id
    FROM public.sales_progress_seller_config c
    WHERE c.rol IN ('diario', 'estrancado')
  ),
  inbound AS (
    SELECT l.assigned_to AS vendedor_id, count(*)::int AS ingresados
    FROM public.leads l, bounds b
    WHERE l.assigned_to IS NOT NULL
      AND l.created_at >= b.start_at AND l.created_at < b.end_at
    GROUP BY l.assigned_to
  ),
  touched AS (
    SELECT i.responsible_id AS vendedor_id, count(DISTINCT i.lead_id)::int AS con_historial
    FROM public.interactions i, bounds b
    WHERE i.responsible_id IS NOT NULL
      AND i.created_at >= b.start_at AND i.created_at < b.end_at
      AND (
        nullif(btrim(coalesce(i.content, '')), '') IS NOT NULL
        OR nullif(btrim(coalesce(i.result, '')), '') IS NOT NULL
      )
    GROUP BY i.responsible_id
  ),
  backlog AS (
    SELECT l.assigned_to AS vendedor_id, count(*)::int AS backlog_abiertos
    FROM public.leads l
    WHERE l.assigned_to IS NOT NULL
      AND coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
    GROUP BY l.assigned_to
  )
  SELECT
    s.vendedor_id,
    coalesce(i.ingresados, 0),
    coalesce(t.con_historial, 0),
    coalesce(b.backlog_abiertos, 0)
  FROM sellers s
  LEFT JOIN inbound i ON i.vendedor_id = s.vendedor_id
  LEFT JOIN touched t ON t.vendedor_id = s.vendedor_id
  LEFT JOIN backlog b ON b.vendedor_id = s.vendedor_id
$$;

REVOKE ALL ON FUNCTION public.sales_progress_day_pipeline_stats(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_day_pipeline_stats(date) TO service_role;

-- Sin tocar: SOLO vendedores diarios y SOLO leads recientes (últimos 7 días).
-- No aplica al encargado de estrancados ni al backlog histórico.
CREATE OR REPLACE FUNCTION public.sales_stale_lead_counts()
RETURNS TABLE (vendedor_id uuid, cantidad integer, nombres text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH daily_sellers AS (
    SELECT c.vendedor_id
    FROM public.sales_progress_seller_config c
    WHERE c.rol = 'diario'
  ),
  open_leads AS (
    SELECT
      l.id,
      l.assigned_to,
      l.name,
      GREATEST(
        COALESCE(l.resume_updated_at, l.created_at),
        COALESCE(i.last_at, l.created_at),
        COALESCE(h.last_at, l.created_at)
      ) AS touched_at
    FROM public.leads l
    JOIN daily_sellers d ON d.vendedor_id = l.assigned_to
    LEFT JOIN LATERAL (
      SELECT max(created_at) AS last_at
      FROM public.interactions
      WHERE lead_id = l.id
    ) i ON true
    LEFT JOIN LATERAL (
      SELECT max(recorded_at) AS last_at
      FROM public.lead_status_history
      WHERE lead_id = l.id
    ) h ON true
    WHERE coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
      AND l.created_at >= now() - interval '7 days'
      AND l.created_at < now() - interval '48 hours'
  )
  SELECT
    assigned_to,
    count(*)::int,
    (array_agg(name ORDER BY touched_at ASC))[1:8]
  FROM open_leads
  WHERE touched_at < now() - interval '48 hours'
  GROUP BY assigned_to
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_apply_weights(
  p_fecha date,
  p_include_stale boolean DEFAULT true
)
RETURNS TABLE (
  vendedor_id uuid,
  categoria text,
  label text,
  axis text,
  cantidad integer,
  puntos_brutos numeric,
  puntos numeric,
  cap numeric,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sellers AS (
    SELECT c.vendedor_id AS id, c.rol
    FROM public.sales_progress_seller_config c
    JOIN public.profiles p ON p.id = c.vendedor_id
    WHERE c.rol IN ('diario', 'estrancado')
      AND p.status = 'activo'
  ),
  raw AS (
    SELECT ev.vendedor_id, ev.categoria, sum(ev.cantidad)::int AS cantidad
    FROM public.sales_progress_event_counts(p_fecha) ev
    GROUP BY ev.vendedor_id, ev.categoria
  ),
  stale AS (
    SELECT s.vendedor_id, s.cantidad
    FROM public.sales_stale_lead_counts() s
    WHERE p_include_stale
  ),
  cats AS (
    SELECT w.*
    FROM public.sales_progress_weights w
    WHERE w.active
      AND NOT (w.category = 'stale_leads' AND NOT p_include_stale)
  )
  SELECT
    sel.id,
    w.category,
    w.label,
    w.axis,
    CASE
      WHEN w.category = 'stale_leads' THEN
        CASE WHEN sel.rol = 'diario' THEN coalesce(st.cantidad, 0) ELSE 0 END
      ELSE coalesce(r.cantidad, 0)
    END AS cantidad,
    (
      CASE
        WHEN w.category = 'stale_leads' THEN
          CASE WHEN sel.rol = 'diario' THEN coalesce(st.cantidad, 0) ELSE 0 END
        ELSE coalesce(r.cantidad, 0)
      END
    ) * w.points AS puntos_brutos,
    CASE
      WHEN w.category = 'stale_leads' AND sel.rol IS DISTINCT FROM 'diario' THEN 0
      WHEN w.points >= 0 THEN
        LEAST(
          (
            CASE
              WHEN w.category = 'stale_leads' THEN coalesce(st.cantidad, 0)
              ELSE coalesce(r.cantidad, 0)
            END
          ) * w.points,
          w.daily_cap_points
        )
      ELSE
        GREATEST(
          (
            CASE
              WHEN w.category = 'stale_leads' THEN coalesce(st.cantidad, 0)
              ELSE coalesce(r.cantidad, 0)
            END
          ) * w.points,
          w.daily_cap_points
        )
    END AS puntos,
    w.daily_cap_points,
    w.sort_order
  FROM sellers sel
  CROSS JOIN cats w
  LEFT JOIN raw r
    ON r.vendedor_id = sel.id AND r.categoria = w.category
  LEFT JOIN stale st
    ON st.vendedor_id = sel.id AND w.category = 'stale_leads'
$$;

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
  trend_days AS (
    SELECT (v_fecha - offs)::date AS d
    FROM generate_series(6, 0, -1) AS offs
  ),
  trend AS (
    SELECT
      td.d AS fecha,
      coalesce(sum(s.puntos) FILTER (WHERE s.axis = 'actividad'), 0) AS puntos_actividad,
      coalesce(sum(s.puntos) FILTER (WHERE s.axis = 'avance'), 0) AS puntos_avance,
      coalesce(sum(s.puntos), 0) AS puntos_total
    FROM trend_days td
    LEFT JOIN LATERAL (
      SELECT axis, puntos
      FROM public.sales_progress_apply_weights(td.d, td.d = public.activity_date_now_ecuador())
      WHERE vendedor_id = v_seller
    ) s ON true
    GROUP BY td.d
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
          'puntos_avance', t.puntos_avance
        ) ORDER BY t.fecha
      )
      FROM trend t
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_progress_sellers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'rol', c.rol
      )
      ORDER BY c.sort_order, p.full_name
    )
    FROM public.sales_progress_seller_config c
    JOIN public.profiles p ON p.id = c.vendedor_id
    WHERE p.status = 'activo'
      AND c.rol IN ('diario', 'estrancado')
  ), '[]'::jsonb);
END;
$$;

