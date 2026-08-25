-- Vista de jefe: seguimientos IA (lo que mandó el bot), omisiones y tasas X de Y.

CREATE OR REPLACE FUNCTION public.sales_progress_ia_ref_date(l public.leads)
RETURNS date
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN l.time_reference IS NOT NULL THEN public.activity_date_from_timestamptz(l.time_reference)
    WHEN l.day_detected IS NOT NULL THEN l.day_detected
    ELSE public.activity_date_from_timestamptz(l.created_at)
  END
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_lead_is_ia(l public.leads)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT l.time_reference IS NOT NULL
    OR l.day_detected IS NOT NULL
    OR l.hour_detected IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_lead_has_cita(p_lead_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments ap
    WHERE ap.lead_id = p_lead_id
      AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
  )
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_ia_day(p_fecha date)
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
  WITH ia AS (
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
    count(*) FILTER (WHERE i.ref_date = p_fecha)::int AS due,
    count(*) FILTER (WHERE i.ref_date = p_fecha AND c.lead_id IS NOT NULL)::int AS agendadas,
    count(*) FILTER (WHERE i.ref_date = p_fecha AND c.lead_id IS NULL)::int AS pendientes,
    count(*) FILTER (
      WHERE i.ref_date < p_fecha
        AND i.ref_date >= p_fecha - 14
        AND c.lead_id IS NULL
    )::int AS vencidas
  FROM ia i
  LEFT JOIN cited c ON c.lead_id = i.lead_id
  GROUP BY i.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_citas_gestion_day(p_fecha date)
RETURNS TABLE (vendedor_id uuid, due integer, gestionadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ap.responsible_id,
    count(*)::int,
    count(*) FILTER (WHERE public.sales_progress_appointment_managed(ap))::int
  FROM public.appointments ap
  WHERE ap.responsible_id IS NOT NULL
    AND public.activity_date_from_timestamptz(ap.start_time) = p_fecha
    AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
  GROUP BY ap.responsible_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_showroom_gestion_coverage_day(p_fecha date)
RETURNS TABLE (vendedor_id uuid, visitas integer, con_gestion integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.showroom_visits v
  WHERE v.salesperson_id IS NOT NULL
    AND public.activity_date_from_timestamptz(v.created_at) = p_fecha
  GROUP BY v.salesperson_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_ia_events_json(p_fecha date, p_vendedor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      coalesce(l.time_reference, l.created_at) AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN public.sales_progress_lead_has_cita(l.id) THEN 'IA agendada'
        WHEN public.sales_progress_ia_ref_date(l) < p_fecha THEN 'IA vencida · sin agendar'
        ELSE 'IA del bot · sin agendar'
      END AS titulo,
      'El bot mandó este seguimiento. Hay que agendarlo como cita.'::text AS detalle,
      'agenda'::text AS recurso
    FROM public.leads l
    WHERE l.assigned_to = p_vendedor_id
      AND public.sales_progress_lead_is_ia(l)
      AND public.sales_progress_ia_ref_date(l) >= DATE '2026-05-01'
      AND (
        public.sales_progress_ia_ref_date(l) = p_fecha
        OR (
          public.sales_progress_ia_ref_date(l) < p_fecha
          AND public.sales_progress_ia_ref_date(l) >= p_fecha - 14
          AND NOT public.sales_progress_lead_has_cita(l.id)
        )
      )
    LIMIT 200
  ) x
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_citas_gestion_events_json(p_fecha date, p_vendedor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      ap.start_time AS occurred_at,
      ap.lead_id,
      coalesce(l.name, ap.external_client_name, ap.title) AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN public.sales_progress_appointment_managed(ap) THEN 'Cita gestionada'
        ELSE 'Cita sin gestión (vino / no vino)'
      END AS titulo,
      coalesce(ap.notes, ap.no_show_reason, ap.title) AS detalle,
      'agenda'::text AS recurso
    FROM public.appointments ap
    LEFT JOIN public.leads l ON l.id = ap.lead_id
    WHERE ap.responsible_id = p_vendedor_id
      AND public.activity_date_from_timestamptz(ap.start_time) = p_fecha
      AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
    LIMIT 200
  ) x
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_showroom_sin_events_json(p_fecha date, p_vendedor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      v.created_at AS occurred_at,
      NULL::bigint AS lead_id,
      v.client_name AS lead_name,
      v.phone AS lead_phone,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.showroom_visit_gestiones g
          WHERE g.visit_id = v.id AND nullif(btrim(g.content), '') IS NOT NULL
        ) THEN 'Visita con seguimiento'
        ELSE 'Visita sin seguimiento'
      END AS titulo,
      coalesce(nullif(btrim(coalesce(v.observation, '')), ''), 'Registrar la llamada y la nota de seguimiento.') AS detalle,
      'showroom'::text AS recurso
    FROM public.showroom_visits v
    WHERE v.salesperson_id = p_vendedor_id
      AND public.activity_date_from_timestamptz(v.created_at) = p_fecha
    LIMIT 200
  ) x
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_rate_history(p_fecha date, p_days integer DEFAULT 7)
RETURNS TABLE (
  vendedor_id uuid,
  hist_contestados_pct integer,
  hist_cita_pct integer,
  hist_ia_pct integer,
  hist_showroom_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT (p_fecha - offs)::date AS d
    FROM generate_series(1, greatest(p_days, 1)) AS offs
  ),
  sellers AS (
    SELECT c.vendedor_id
    FROM public.sales_progress_seller_config c
    WHERE c.rol IN ('diario', 'estrancado')
  ),
  pipe AS (
    SELECT p.vendedor_id, sum(p.ingresados)::numeric AS ingresados, sum(p.con_historial)::numeric AS contestados
    FROM days d
    CROSS JOIN LATERAL public.sales_progress_day_pipeline_stats(d.d) p
    GROUP BY p.vendedor_id
  ),
  citas AS (
    SELECT c.vendedor_id, sum(c.con_cita)::numeric AS con_cita
    FROM days d
    CROSS JOIN LATERAL public.sales_progress_day_lead_citas(d.d) c
    GROUP BY c.vendedor_id
  ),
  ia AS (
    SELECT i.vendedor_id, sum(i.due)::numeric AS due, sum(i.agendadas)::numeric AS agendadas
    FROM days d
    CROSS JOIN LATERAL public.sales_progress_ia_day(d.d) i
    GROUP BY i.vendedor_id
  ),
  sh AS (
    SELECT s.vendedor_id, sum(s.visitas)::numeric AS visitas, sum(s.con_gestion)::numeric AS con_gestion
    FROM days d
    CROSS JOIN LATERAL public.sales_progress_showroom_gestion_coverage_day(d.d) s
    GROUP BY s.vendedor_id
  )
  SELECT
    s.vendedor_id,
    CASE WHEN coalesce(p.ingresados, 0) <= 0 THEN 0 ELSE round(100.0 * coalesce(p.contestados, 0) / p.ingresados)::int END,
    CASE WHEN coalesce(p.ingresados, 0) <= 0 THEN 0 ELSE round(100.0 * coalesce(c.con_cita, 0) / p.ingresados)::int END,
    CASE WHEN coalesce(i.due, 0) <= 0 THEN 0 ELSE round(100.0 * coalesce(i.agendadas, 0) / i.due)::int END,
    CASE WHEN coalesce(sh.visitas, 0) <= 0 THEN 0 ELSE round(100.0 * coalesce(sh.con_gestion, 0) / sh.visitas)::int END
  FROM sellers s
  LEFT JOIN pipe p ON p.vendedor_id = s.vendedor_id
  LEFT JOIN citas c ON c.vendedor_id = s.vendedor_id
  LEFT JOIN ia i ON i.vendedor_id = s.vendedor_id
  LEFT JOIN sh ON sh.vendedor_id = s.vendedor_id
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
  citas AS (
    SELECT * FROM public.sales_progress_day_lead_citas(v_fecha)
  ),
  faltantes AS (
    SELECT * FROM public.sales_progress_datos_faltantes_day(v_fecha)
  ),
  ia AS (
    SELECT * FROM public.sales_progress_ia_day(v_fecha)
  ),
  citas_g AS (
    SELECT * FROM public.sales_progress_citas_gestion_day(v_fecha)
  ),
  showroom_c AS (
    SELECT * FROM public.sales_progress_showroom_gestion_coverage_day(v_fecha)
  ),
  asesoria AS (
    SELECT * FROM public.sales_progress_asesoria_day(v_fecha)
  ),
  hist AS (
    SELECT * FROM public.sales_progress_rate_history(v_fecha, 7)
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

DO $$
BEGIN
  IF to_regprocedure('public.get_sales_progress_events_core(date,uuid,text)') IS NULL
     AND to_regprocedure('public.get_sales_progress_events(date,uuid,text)') IS NOT NULL THEN
    ALTER FUNCTION public.get_sales_progress_events(date, uuid, text)
      RENAME TO get_sales_progress_events_core;
  END IF;
END $$;

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT v_admin AND p_vendedor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_categoria = 'seguimientos_ia' THEN
    RETURN coalesce(public.sales_progress_ia_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;

  IF p_categoria = 'citas_sin_gestionar' THEN
    RETURN coalesce(public.sales_progress_citas_gestion_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;

  IF p_categoria = 'showroom_sin_gestion' THEN
    RETURN coalesce(public.sales_progress_showroom_sin_events_json(p_fecha, p_vendedor_id), '[]'::jsonb);
  END IF;

  RETURN public.get_sales_progress_events_core(p_fecha, p_vendedor_id, p_categoria);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_ia_ref_date(public.leads) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_lead_is_ia(public.leads) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_lead_has_cita(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_ia_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_citas_gestion_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_showroom_gestion_coverage_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_ia_events_json(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_citas_gestion_events_json(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_showroom_sin_events_json(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_rate_history(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events(date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events_core(date, uuid, text) TO authenticated;


