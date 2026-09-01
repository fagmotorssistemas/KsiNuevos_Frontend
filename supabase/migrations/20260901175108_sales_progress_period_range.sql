-- Periodo exclusivo: día, semana (sáb–vie) o mes completo.
-- p_hasta NULL = mismo día que p_fecha (compatibilidad).

CREATE OR REPLACE FUNCTION public.sales_progress_clamp_dates(p_desde date, p_hasta date)
RETURNS TABLE (desde date, hasta date, start_at timestamptz, end_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH t AS (
    SELECT public.activity_date_now_ecuador() AS today
  ),
  n AS (
    SELECT least(coalesce(p_desde, t.today), t.today) AS d0, t.today
    FROM t
  )
  SELECT
    n.d0,
    least(greatest(coalesce(p_hasta, n.d0), n.d0), n.today) AS d1,
    (n.d0::timestamp AT TIME ZONE 'America/Guayaquil'),
    ((least(greatest(coalesce(p_hasta, n.d0), n.d0), n.today) + 1)::timestamp AT TIME ZONE 'America/Guayaquil')
  FROM n;
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_day_pipeline_stats(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, ingresados integer, con_historial integer, backlog_abiertos integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  sellers AS (
    SELECT c.vendedor_id
    FROM public.sales_progress_seller_config c
    WHERE c.rol IN ('diario', 'estrancado')
  ),
  inbound AS (
    SELECT l.assigned_to AS vendedor_id, count(*)::int AS ingresados
    FROM public.leads l, b
    WHERE l.assigned_to IS NOT NULL
      AND l.created_at >= b.start_at AND l.created_at < b.end_at
    GROUP BY l.assigned_to
  ),
  managed AS (
    SELECT l.assigned_to AS vendedor_id, count(*)::int AS gestionados
    FROM public.leads l, b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(l.resume_updated_at) BETWEEN b.desde AND b.hasta
      AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    GROUP BY l.assigned_to
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
    coalesce(m.gestionados, 0),
    coalesce(bk.backlog_abiertos, 0)
  FROM sellers s
  LEFT JOIN inbound i ON i.vendedor_id = s.vendedor_id
  LEFT JOIN managed m ON m.vendedor_id = s.vendedor_id
  LEFT JOIN backlog bk ON bk.vendedor_id = s.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_contestados_cuota(p_desde date, p_hasta date)
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
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  days AS (
    SELECT (b.hasta - b.desde + 1)::int AS n FROM b
  )
  SELECT
    c.vendedor_id,
    count(*) FILTER (
      WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
    )::int AS ingresados,
    count(*) FILTER (
      WHERE public.activity_date_from_timestamptz(l.resume_updated_at) BETWEEN b.desde AND b.hasta
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    )::int AS contestados,
    count(*) FILTER (
      WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
        AND public.activity_date_from_timestamptz(l.resume_updated_at) BETWEEN b.desde AND b.hasta
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
    )::int AS contestados_hoy,
    count(*) FILTER (
      WHERE l.created_at < b.start_at
        AND public.activity_date_from_timestamptz(l.resume_updated_at) BETWEEN b.desde AND b.hasta
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
    (CASE WHEN c.rol = 'estrancado' THEN 50 ELSE 35 END) * days.n AS cuota
  FROM public.sales_progress_seller_config c
  CROSS JOIN b
  CROSS JOIN days
  LEFT JOIN public.leads l ON l.assigned_to = c.vendedor_id
  WHERE c.rol <> 'excluido'
  GROUP BY c.vendedor_id, c.rol, c.sort_order, days.n
  ORDER BY c.sort_order
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_ia_day(p_desde date, p_hasta date)
RETURNS TABLE (
  vendedor_id uuid,
  due integer,
  agendadas integer,
  pendientes integer,
  vencidas integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  ia AS (
    SELECT
      l.assigned_to AS vendedor_id,
      l.id AS lead_id,
      public.sales_progress_ia_ref_date(l) AS ref_date
    FROM public.leads l
    WHERE l.assigned_to IS NOT NULL
      AND public.sales_progress_lead_is_ia(l)
      AND public.sales_progress_ia_ref_date(l) >= DATE '2026-05-01'
  ),
  cited AS (
    SELECT DISTINCT ap.lead_id
    FROM public.appointments ap
    WHERE ap.lead_id IS NOT NULL
      AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
  )
  SELECT
    i.vendedor_id,
    count(*) FILTER (WHERE i.ref_date BETWEEN b.desde AND b.hasta)::int AS due,
    count(*) FILTER (WHERE i.ref_date BETWEEN b.desde AND b.hasta AND c.lead_id IS NOT NULL)::int AS agendadas,
    count(*) FILTER (WHERE i.ref_date BETWEEN b.desde AND b.hasta AND c.lead_id IS NULL)::int AS pendientes,
    count(*) FILTER (
      WHERE i.ref_date < b.desde
        AND i.ref_date >= b.desde - 14
        AND c.lead_id IS NULL
    )::int AS vencidas
  FROM ia i
  CROSS JOIN b
  LEFT JOIN cited c ON c.lead_id = i.lead_id
  GROUP BY i.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_citas_gestion_day(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, due integer, gestionadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  )
  SELECT
    ap.responsible_id,
    count(*)::int,
    count(*) FILTER (WHERE public.sales_progress_appointment_managed(ap))::int
  FROM public.appointments ap, b
  WHERE ap.responsible_id IS NOT NULL
    AND public.activity_date_from_timestamptz(ap.start_time) BETWEEN b.desde AND b.hasta
    AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
  GROUP BY ap.responsible_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_showroom_gestion_coverage_day(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, visitas integer, con_gestion integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  )
  SELECT
    v.salesperson_id,
    count(*)::int,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.showroom_visit_gestiones g
        WHERE g.visit_id = v.id
          AND nullif(btrim(g.content), '') IS NOT NULL
      )
    )::int
  FROM public.showroom_visits v, b
  WHERE v.salesperson_id IS NOT NULL
    AND public.activity_date_from_timestamptz(v.created_at) BETWEEN b.desde AND b.hasta
  GROUP BY v.salesperson_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_day(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, ingresadas integer, llenadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  arrived AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
  ),
  filled AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af.id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
      AND public.sales_progress_asesoria_gestion_completa(g)
  )
  SELECT
    a.vendedor_id,
    count(*)::int AS ingresadas,
    count(f.lead_id)::int AS llenadas
  FROM arrived a
  LEFT JOIN filled f
    ON f.vendedor_id = a.vendedor_id
   AND f.lead_id = a.lead_id
  GROUP BY a.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_datos_faltantes_day(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, ingresadas integer, contestadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  per_lead AS (
    SELECT
      l.assigned_to AS vendedor_id,
      d.lead_id,
      bool_and(public.sales_progress_datos_faltantes_contestada(d)) AS completa
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) BETWEEN b.desde AND b.hasta
    GROUP BY l.assigned_to, d.lead_id
  )
  SELECT
    p.vendedor_id,
    count(*)::int AS ingresadas,
    count(*) FILTER (WHERE p.completa)::int AS contestadas
  FROM per_lead p
  GROUP BY p.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_day_lead_citas(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, con_cita integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  )
  SELECT l.assigned_to, count(DISTINCT l.id)::int
  FROM public.leads l, b
  WHERE l.assigned_to IS NOT NULL
    AND public.activity_date_from_timestamptz(l.created_at) BETWEEN b.desde AND b.hasta
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.lead_id = l.id
        AND public.activity_date_from_timestamptz(a.created_at) BETWEEN b.desde AND b.hasta
    )
  GROUP BY l.assigned_to
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_estancados_day(p_desde date, p_hasta date)
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
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  faltante AS (
    SELECT
      l.assigned_to AS vendedor_id,
      d.lead_id,
      bool_and(public.sales_progress_datos_faltantes_contestada(d)) AS contestada,
      bool_and(coalesce(d.estado, 'pendiente') = 'resuelto') AS resuelto
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) BETWEEN b.desde AND b.hasta
    GROUP BY l.assigned_to, d.lead_id
  ),
  ases AS (
    SELECT
      l.assigned_to AS vendedor_id,
      af.lead_id,
      bool_or(
        coalesce(af.estado::text, 'pendiente') IN ('en_proceso', 'resuelto', 'resuelto_no_aplica')
        OR nullif(btrim(coalesce(af.notas_vendedor, '')), '') IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.asesoria_financiamiento_gestion g
          WHERE g.asesoria_id = af.id
        )
      ) AS respondida,
      bool_and(
        coalesce(af.estado::text, 'pendiente') IN ('resuelto', 'resuelto_no_aplica')
      ) AS resuelto
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
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

CREATE OR REPLACE FUNCTION public.sales_progress_apply_weights(p_desde date, p_hasta date)
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
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  )
  SELECT
    w.vendedor_id,
    w.categoria,
    w.label,
    w.axis,
    sum(w.cantidad)::int,
    sum(w.puntos_brutos),
    sum(w.puntos),
    sum(w.cap),
    min(w.sort_order)
  FROM b
  CROSS JOIN generate_series(b.desde, b.hasta, interval '1 day') AS g(d)
  CROSS JOIN LATERAL public.sales_progress_apply_weights(
    g.d::date,
    g.d::date = public.activity_date_now_ecuador()
  ) w
  GROUP BY w.vendedor_id, w.categoria, w.label, w.axis
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_team_trend(p_desde date, p_hasta date)
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
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  diario AS (
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
    SELECT g.d::date AS d
    FROM b
    CROSS JOIN generate_series(b.desde, b.hasta, interval '1 day') AS g(d)
  )
  SELECT
    td.d,
    coalesce(s.puntos_total, 0),
    coalesce(s.puntos_actividad, 0),
    coalesce(s.puntos_avance, 0),
    ts.n,
    least(
      100,
      round(coalesce(s.puntos_total, 0) / (ts.n * 100.0) * 100)
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

DROP FUNCTION IF EXISTS public.get_sales_daily_progress(date, uuid);

CREATE FUNCTION public.get_sales_daily_progress(
  p_fecha date DEFAULT NULL,
  p_vendedor_id uuid DEFAULT NULL,
  p_hasta date DEFAULT NULL
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
  v_desde date;
  v_hasta date;
  v_seller uuid;
  v_nombre text;
  v_rol text;
  v_today date;
  v_is_today boolean;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT c.desde, c.hasta INTO v_desde, v_hasta
  FROM public.sales_progress_clamp_dates(p_fecha, p_hasta) c;
  v_today := public.activity_date_now_ecuador();
  v_is_today := v_today BETWEEN v_desde AND v_hasta;

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

  SELECT p.full_name, c.rol INTO v_nombre, v_rol
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
    SELECT * FROM public.sales_progress_apply_weights(v_desde, v_hasta)
  ),
  mine AS (
    SELECT * FROM scored WHERE vendedor_id = v_seller
  ),
  pipeline AS (
    SELECT * FROM public.sales_progress_day_pipeline_stats(v_desde, v_hasta)
  ),
  citas AS (
    SELECT * FROM public.sales_progress_day_lead_citas(v_desde, v_hasta)
  ),
  faltantes AS (
    SELECT * FROM public.sales_progress_datos_faltantes_day(v_desde, v_hasta)
  ),
  ia AS (
    SELECT * FROM public.sales_progress_ia_day(v_desde, v_hasta)
  ),
  citas_g AS (
    SELECT * FROM public.sales_progress_citas_gestion_day(v_desde, v_hasta)
  ),
  showroom_c AS (
    SELECT * FROM public.sales_progress_showroom_gestion_coverage_day(v_desde, v_hasta)
  ),
  asesoria AS (
    SELECT * FROM public.sales_progress_asesoria_day(v_desde, v_hasta)
  ),
  hist AS (
    SELECT * FROM public.sales_progress_rate_history(v_hasta, 7)
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
      coalesce(pl.backlog_abiertos, 0) AS backlog_abiertos,
      coalesce(ci.con_cita, 0) AS leads_con_cita,
      coalesce(ia.due, 0) AS ia_due,
      coalesce(ia.agendadas, 0) AS ia_agendadas,
      coalesce(ia.pendientes, 0) AS ia_pendientes,
      coalesce(ia.vencidas, 0) AS ia_vencidas,
      coalesce(cg.due, 0) AS citas_due,
      coalesce(cg.gestionadas, 0) AS citas_gestionadas,
      coalesce(sc.visitas, 0) AS showroom_visitas,
      coalesce(sc.con_gestion, 0) AS showroom_con_gestion,
      coalesce(h.hist_contestados_pct, 0) AS hist_contestados_pct,
      coalesce(h.hist_cita_pct, 0) AS hist_cita_pct,
      coalesce(h.hist_ia_pct, 0) AS hist_ia_pct,
      coalesce(h.hist_showroom_pct, 0) AS hist_showroom_pct
    FROM totals t
    JOIN public.profiles p ON p.id = t.vendedor_id
    LEFT JOIN public.sales_progress_seller_config c ON c.vendedor_id = t.vendedor_id
    LEFT JOIN pipeline pl ON pl.vendedor_id = t.vendedor_id
    LEFT JOIN citas ci ON ci.vendedor_id = t.vendedor_id
    LEFT JOIN ia ON ia.vendedor_id = t.vendedor_id
    LEFT JOIN citas_g cg ON cg.vendedor_id = t.vendedor_id
    LEFT JOIN showroom_c sc ON sc.vendedor_id = t.vendedor_id
    LEFT JOIN hist h ON h.vendedor_id = t.vendedor_id
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
    SELECT * FROM public.sales_progress_team_trend(
      CASE WHEN v_desde = v_hasta THEN v_desde ELSE v_desde END,
      CASE WHEN v_desde = v_hasta THEN v_hasta ELSE v_hasta END
    )
  )
  SELECT jsonb_build_object(
    'fecha', v_hasta,
    'fecha_desde', v_desde,
    'fecha_hasta', v_hasta,
    'vendedor_id', v_seller,
    'vendedor_nombre', coalesce(v_nombre, 'Vendedor'),
    'rol', coalesce(v_rol, 'diario'),
    'es_admin', v_admin,
    'leads_ingresados', coalesce((SELECT ingresados FROM pipeline WHERE vendedor_id = v_seller), 0),
    'leads_con_historial', coalesce((SELECT con_historial FROM pipeline WHERE vendedor_id = v_seller), 0),
    'leads_con_cita', coalesce((SELECT con_cita FROM citas WHERE vendedor_id = v_seller), 0),
    'datos_faltantes_hoy', coalesce((SELECT ingresadas FROM faltantes WHERE vendedor_id = v_seller), 0),
    'datos_faltantes_contestados', coalesce((SELECT contestadas FROM faltantes WHERE vendedor_id = v_seller), 0),
    'ia_due', coalesce((SELECT due FROM ia WHERE vendedor_id = v_seller), 0),
    'ia_agendadas', coalesce((SELECT agendadas FROM ia WHERE vendedor_id = v_seller), 0),
    'ia_pendientes', coalesce((SELECT pendientes FROM ia WHERE vendedor_id = v_seller), 0),
    'ia_vencidas', coalesce((SELECT vencidas FROM ia WHERE vendedor_id = v_seller), 0),
    'citas_due', coalesce((SELECT due FROM citas_g WHERE vendedor_id = v_seller), 0),
    'citas_gestionadas', coalesce((SELECT gestionadas FROM citas_g WHERE vendedor_id = v_seller), 0),
    'showroom_visitas', coalesce((SELECT visitas FROM showroom_c WHERE vendedor_id = v_seller), 0),
    'showroom_con_gestion', coalesce((SELECT con_gestion FROM showroom_c WHERE vendedor_id = v_seller), 0),
    'asesoria_hoy', coalesce((SELECT ingresadas FROM asesoria WHERE vendedor_id = v_seller), 0),
    'asesoria_llenas', coalesce((SELECT llenadas FROM asesoria WHERE vendedor_id = v_seller), 0),
    'hist_contestados_pct', coalesce((SELECT hist_contestados_pct FROM hist WHERE vendedor_id = v_seller), 0),
    'hist_cita_pct', coalesce((SELECT hist_cita_pct FROM hist WHERE vendedor_id = v_seller), 0),
    'hist_ia_pct', coalesce((SELECT hist_ia_pct FROM hist WHERE vendedor_id = v_seller), 0),
    'hist_showroom_pct', coalesce((SELECT hist_showroom_pct FROM hist WHERE vendedor_id = v_seller), 0),
    'backlog_abiertos', coalesce((SELECT backlog_abiertos FROM pipeline WHERE vendedor_id = v_seller), 0),
    'categorias', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'categoria', m.categoria,
        'label', m.label,
        'axis', m.axis,
        'cantidad', m.cantidad,
        'puntos_brutos', m.puntos_brutos,
        'puntos', m.puntos,
        'cap', m.cap
      ) ORDER BY m.sort_order)
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
      SELECT jsonb_agg(jsonb_build_object(
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
        'leads_con_cita', r.leads_con_cita,
        'ia_due', r.ia_due,
        'ia_agendadas', r.ia_agendadas,
        'ia_pendientes', r.ia_pendientes,
        'ia_vencidas', r.ia_vencidas,
        'citas_due', r.citas_due,
        'citas_gestionadas', r.citas_gestionadas,
        'showroom_visitas', r.showroom_visitas,
        'showroom_con_gestion', r.showroom_con_gestion,
        'hist_contestados_pct', r.hist_contestados_pct,
        'hist_cita_pct', r.hist_cita_pct,
        'hist_ia_pct', r.hist_ia_pct,
        'hist_showroom_pct', r.hist_showroom_pct,
        'backlog_abiertos', r.backlog_abiertos
      )
      ORDER BY CASE WHEN r.rol = 'diario' THEN 0 ELSE 1 END, r.puntos_total DESC, r.sort_order)
      FROM ranking r
    ), '[]'::jsonb),
    'tendencia', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'fecha', t.fecha,
        'puntos_total', t.puntos_total,
        'puntos_actividad', t.puntos_actividad,
        'puntos_avance', t.puntos_avance,
        'vendedores', t.vendedores,
        'porcentaje', t.porcentaje
      ) ORDER BY t.fecha)
      FROM trend t
    ), '[]'::jsonb)
  )
  INTO result;

  -- Día suelto: la barra sigue siendo la semana comercial sáb–vie.
  IF v_desde = v_hasta THEN
    SELECT jsonb_set(
      result,
      '{tendencia}',
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'fecha', t.fecha,
          'puntos_total', t.puntos_total,
          'puntos_actividad', t.puntos_actividad,
          'puntos_avance', t.puntos_avance,
          'vendedores', t.vendedores,
          'porcentaje', t.porcentaje
        ) ORDER BY t.fecha)
        FROM public.sales_progress_team_trend(v_hasta) t
      ), '[]'::jsonb)
    )
    INTO result;
  END IF;

  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS public.get_sales_progress_boss_stock(date, uuid);

CREATE FUNCTION public.get_sales_progress_boss_stock(
  p_fecha date DEFAULT NULL,
  p_vendedor_id uuid DEFAULT NULL,
  p_hasta date DEFAULT NULL
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
  v_desde date;
  v_hasta date;
  v_seller uuid;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT c.desde, c.hasta INTO v_desde, v_hasta
  FROM public.sales_progress_clamp_dates(p_fecha, p_hasta) c;

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
  e AS (SELECT * FROM public.sales_progress_estancados_day(v_desde, v_hasta)),
  w AS (SELECT * FROM public.sales_progress_week_coverage(v_hasta)),
  p AS (SELECT * FROM public.sales_progress_pedidos_quedados()),
  cu AS (SELECT * FROM public.sales_progress_contestados_cuota(v_desde, v_hasta))
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

DROP FUNCTION IF EXISTS public.sales_progress_ia_events_json(date, uuid);
CREATE FUNCTION public.sales_progress_ia_events_json(
  p_fecha date,
  p_vendedor_id uuid,
  p_hasta date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_fecha, p_hasta)
  )
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      coalesce(
        l.time_reference,
        CASE
          WHEN l.day_detected IS NOT NULL THEN
            ((l.day_detected::timestamp + coalesce(l.hour_detected, time '12:00')) AT TIME ZONE 'America/Guayaquil')
          ELSE l.created_at
        END
      ) AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN public.sales_progress_lead_has_cita(l.id) THEN 'IA agendada'
        WHEN public.sales_progress_ia_ref_date(l) < b.desde THEN 'IA vencida · sin agendar'
        ELSE 'IA del bot · sin agendar'
      END AS titulo,
      concat_ws(
        ' · ',
        CASE
          WHEN l.time_reference IS NOT NULL THEN
            to_char(l.time_reference AT TIME ZONE 'America/Guayaquil', 'DD/MM HH24:MI')
          WHEN l.day_detected IS NOT NULL THEN
            to_char(l.day_detected, 'DD/MM') || coalesce(' ' || to_char(l.hour_detected, 'HH24:MI'), '')
          WHEN l.hour_detected IS NOT NULL THEN to_char(l.hour_detected, 'HH24:MI')
          ELSE NULL
        END,
        CASE
          WHEN public.sales_progress_lead_has_cita(l.id) THEN 'Ya tiene cita en agenda.'
          ELSE 'El bot lo mandó. Hay que agendarlo como cita.'
        END
      ) AS detalle,
      'agenda'::text AS recurso
    FROM public.leads l
    CROSS JOIN b
    WHERE l.assigned_to = p_vendedor_id
      AND public.sales_progress_lead_is_ia(l)
      AND public.sales_progress_ia_ref_date(l) >= DATE '2026-05-01'
      AND (
        public.sales_progress_ia_ref_date(l) BETWEEN b.desde AND b.hasta
        OR (
          public.sales_progress_ia_ref_date(l) < b.desde
          AND public.sales_progress_ia_ref_date(l) >= b.desde - 14
          AND NOT public.sales_progress_lead_has_cita(l.id)
        )
      )
    LIMIT 200
  ) x
$$;

REVOKE ALL ON FUNCTION public.sales_progress_clamp_dates(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_daily_progress(date, uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_progress_boss_stock(date, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_clamp_dates(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_day_pipeline_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_contestados_cuota(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_ia_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_citas_gestion_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_showroom_gestion_coverage_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_datos_faltantes_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_day_lead_citas(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_estancados_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_apply_weights(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_team_trend(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_daily_progress(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_boss_stock(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_ia_events_json(date, uuid, date) TO authenticated;
