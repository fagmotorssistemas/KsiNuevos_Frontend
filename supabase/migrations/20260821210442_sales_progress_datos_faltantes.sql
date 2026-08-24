-- Info. faltante del día: tasa contestadas / llegadas.
-- Contestó = escribió nota y pasó de Pendiente. 1 de 1 = bien. Si llegó y no contestó = 0.

CREATE OR REPLACE FUNCTION public.sales_progress_datos_faltantes_contestada(
  d public.datos_solicitados_clientes
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    nullif(btrim(coalesce(d.notas_vendedor, '')), '') IS NOT NULL
    AND coalesce(d.estado, 'pendiente') IN ('en_proceso', 'resuelto');
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_datos_faltantes_day(p_fecha date)
RETURNS TABLE (vendedor_id uuid, ingresadas integer, contestadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_lead AS (
    SELECT
      l.assigned_to AS vendedor_id,
      d.lead_id,
      bool_and(public.sales_progress_datos_faltantes_contestada(d)) AS completa
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) = p_fecha
    GROUP BY l.assigned_to, d.lead_id
  )
  SELECT
    p.vendedor_id,
    count(*)::int AS ingresadas,
    count(*) FILTER (WHERE p.completa)::int AS contestadas
  FROM per_lead p
  GROUP BY p.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_datos_faltantes_events_json(
  p_fecha date,
  p_vendedor_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT DISTINCT ON (d.lead_id)
      d.fecha_solicitud AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN (
          SELECT bool_and(public.sales_progress_datos_faltantes_contestada(d2))
          FROM public.datos_solicitados_clientes d2
          WHERE d2.lead_id = d.lead_id
            AND public.activity_date_from_timestamptz(d2.fecha_solicitud) = p_fecha
        ) THEN 'Contestada'
        ELSE 'Llegó · sin contestar'
      END AS titulo,
      left(coalesce(nullif(btrim(d.mensaje_completo), ''), 'Info. faltante'), 280) AS detalle,
      'lead'::text AS recurso
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) = p_fecha
    ORDER BY d.lead_id, d.fecha_solicitud DESC
    LIMIT 200
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_datos_faltantes_contestada(public.datos_solicitados_clientes) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sales_progress_datos_faltantes_day(date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sales_progress_datos_faltantes_events_json(date, uuid) TO anon, authenticated, service_role;
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
      coalesce(ci.con_cita, 0) AS leads_con_cita
    FROM totals t
    JOIN public.profiles p ON p.id = t.vendedor_id
    LEFT JOIN public.sales_progress_seller_config c ON c.vendedor_id = t.vendedor_id
    LEFT JOIN pipeline pl ON pl.vendedor_id = t.vendedor_id
    LEFT JOIN citas ci ON ci.vendedor_id = t.vendedor_id
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
  v_start timestamptz;
  v_end timestamptz;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT v_admin AND p_vendedor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_start := ((p_fecha::text)::date::timestamp AT TIME ZONE 'America/Guayaquil');
  v_end := v_start + interval '1 day';

  IF p_categoria = 'lead_status_change' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        l.resume_updated_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        'Gestión del día'::text AS titulo,
        coalesce(
          (
            SELECT left(nullif(btrim(coalesce(i.content, i.result, '')), ''), 280)
            FROM public.interactions i
            WHERE i.lead_id = l.id
              AND public.activity_date_from_timestamptz(i.created_at) = p_fecha
              AND (
                nullif(btrim(coalesce(i.content, '')), '') IS NOT NULL
                OR nullif(btrim(coalesce(i.result, '')), '') IS NOT NULL
              )
            ORDER BY i.created_at DESC
            LIMIT 1
          ),
          left(btrim(l.resume), 280)
        ) AS detalle,
        'lead'::text AS recurso
      FROM public.leads l
      WHERE l.assigned_to = p_vendedor_id
        AND public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
        AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'lead_closed' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        h.recorded_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        (coalesce(h.old_status::text, '—') || ' → ' || h.new_status::text) AS titulo,
        'Lead ganado'::text AS detalle,
        'lead'::text AS recurso
      FROM public.lead_status_history h
      JOIN public.leads l ON l.id = h.lead_id
      WHERE h.changed_by = p_vendedor_id
        AND h.recorded_at >= v_start AND h.recorded_at < v_end
        AND h.new_status = 'ganado'::public.lead_status
        AND h.old_status IS DISTINCT FROM h.new_status
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'lead_interaction' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        i.created_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        (i.type::text || coalesce(' · ' || i.result, '')) AS titulo,
        nullif(btrim(coalesce(i.content, '')), '') AS detalle,
        'lead'::text AS recurso
      FROM public.interactions i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.responsible_id = p_vendedor_id
        AND public.activity_date_from_timestamptz(i.created_at) = p_fecha
        AND (
          nullif(btrim(coalesce(i.content, '')), '') IS NOT NULL
          OR nullif(btrim(coalesce(i.result, '')), '') IS NOT NULL
        )
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'asesoria_advanced' THEN
    result := public.sales_progress_asesoria_events_json(p_fecha, p_vendedor_id);


  ELSIF p_categoria = 'appointment_completed' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        ap.updated_at AS occurred_at,
        ap.lead_id,
        coalesce(l.name, ap.external_client_name, ap.title) AS lead_name,
        l.phone AS lead_phone,
        CASE
          WHEN ap.client_attended IS DISTINCT FROM false THEN coalesce(ap.title, 'Cita') || ' · Vino'
          ELSE coalesce(ap.title, 'Cita') || ' · No vino'
        END AS titulo,
        CASE
          WHEN ap.client_attended IS DISTINCT FROM false THEN
            coalesce(nullif(btrim(ap.notes), ''), 'Cliente vino')
          ELSE
            concat_ws(
              chr(10),
              'Motivo: ' || btrim(ap.no_show_reason),
              CASE ap.no_show_follow_up
                WHEN 'llamada' THEN 'Se llamó para saber el porqué'
                WHEN 'mensaje' THEN 'Se dejó un mensaje'
                ELSE NULL
              END
            )
        END AS detalle,
        'agenda'::text AS recurso
      FROM public.appointments ap
      LEFT JOIN public.leads l ON l.id = ap.lead_id
      WHERE ap.responsible_id = p_vendedor_id
        AND ap.updated_at >= v_start AND ap.updated_at < v_end
        AND public.sales_progress_appointment_managed(ap)
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'showroom_followup' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        v.created_at AS occurred_at,
        NULL::bigint AS lead_id,
        v.client_name AS lead_name,
        v.phone AS lead_phone,
        'Visita showroom'::text AS titulo,
        coalesce(
          nullif(left(string_agg(g.content, ' · ' ORDER BY g.created_at), 280), ''),
          nullif(btrim(coalesce(v.observation, '')), ''),
          'Visita registrada'
        ) AS detalle,
        'showroom'::text AS recurso
      FROM public.showroom_visits v
      LEFT JOIN public.showroom_visit_gestiones g ON g.visit_id = v.id
      WHERE v.salesperson_id = p_vendedor_id
        AND public.activity_date_from_timestamptz(v.created_at) = p_fecha
      GROUP BY v.id, v.created_at, v.client_name, v.phone, v.observation
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'showroom_gestion' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        fg.created_at AS occurred_at,
        NULL::bigint AS lead_id,
        fg.client_name AS lead_name,
        fg.phone AS lead_phone,
        CASE
          WHEN fg.delay_days <= 0 THEN 'Seguimiento mismo día · +3'
          WHEN fg.delay_days = 1 THEN 'Seguimiento al día siguiente · +2'
          ELSE 'Seguimiento a los 2+ días · +1'
        END AS titulo,
        left(fg.content, 280) AS detalle,
        'showroom'::text AS recurso
      FROM (
        SELECT DISTINCT ON (g.visit_id)
          g.created_at,
          g.content,
          g.author_id,
          v.salesperson_id,
          v.client_name,
          v.phone,
          (
            public.activity_date_from_timestamptz(g.created_at)
            - public.activity_date_from_timestamptz(v.created_at)
          ) AS delay_days
        FROM public.showroom_visit_gestiones g
        JOIN public.showroom_visits v ON v.id = g.visit_id
        WHERE nullif(btrim(g.content), '') IS NOT NULL
        ORDER BY g.visit_id, g.created_at
      ) fg
      WHERE public.activity_date_from_timestamptz(fg.created_at) = p_fecha
        AND coalesce(fg.author_id, fg.salesperson_id) = p_vendedor_id
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'leads_to_cita' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        a.created_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        coalesce(nullif(btrim(a.title), ''), 'Cita creada') AS titulo,
        'Lead de hoy con cita creada hoy'::text AS detalle,
        'agenda'::text AS recurso
      FROM public.leads l
      JOIN LATERAL (
        SELECT ap.created_at, ap.title
        FROM public.appointments ap
        WHERE ap.lead_id = l.id
          AND public.activity_date_from_timestamptz(ap.created_at) = p_fecha
        ORDER BY ap.created_at
        LIMIT 1
      ) a ON true
      WHERE l.assigned_to = p_vendedor_id
        AND public.activity_date_from_timestamptz(l.created_at) = p_fecha
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'proforma_generated' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        p.created_at AS occurred_at,
        NULL::bigint AS lead_id,
        p.client_name AS lead_name,
        p.client_phone AS lead_phone,
        coalesce(p.vehicle_description, 'Proforma') AS titulo,
        ('PDF · $' || coalesce(p.monthly_payment::text, '—')) AS detalle,
        'proforma'::text AS recurso
      FROM public.credit_proformas p
      WHERE p.created_by = p_vendedor_id
        AND p.created_at >= v_start AND p.created_at < v_end
        AND p.pdf_url IS NOT NULL
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'stale_leads' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at ASC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        GREATEST(
          COALESCE(l.resume_updated_at, l.created_at),
          COALESCE(i.last_at, l.created_at),
          COALESCE(h.last_at, l.created_at)
        ) AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        ('Estado: ' || coalesce(l.status::text, '—')) AS titulo,
        'Lead reciente sin tocar > 48h'::text AS detalle,
        'lead'::text AS recurso
      FROM public.leads l
      LEFT JOIN LATERAL (
        SELECT max(created_at) AS last_at FROM public.interactions WHERE lead_id = l.id
      ) i ON true
      LEFT JOIN LATERAL (
        SELECT max(recorded_at) AS last_at FROM public.lead_status_history WHERE lead_id = l.id
      ) h ON true
      WHERE l.assigned_to = p_vendedor_id
        AND coalesce(l.status::text, '') NOT IN ('ganado', 'perdido')
        AND l.created_at >= now() - interval '7 days'
        AND l.created_at < now() - interval '48 hours'
        AND GREATEST(
          COALESCE(l.resume_updated_at, l.created_at),
          COALESCE(i.last_at, l.created_at),
          COALESCE(h.last_at, l.created_at)
        ) < now() - interval '48 hours'
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'leads_ingresados' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        l.created_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        ('Ingreso · ' || coalesce(l.status::text, 'nuevo')) AS titulo,
        coalesce(l.source::text, 'origen desconocido') AS detalle,
        'lead'::text AS recurso
      FROM public.leads l
      WHERE l.assigned_to = p_vendedor_id
        AND public.activity_date_from_timestamptz(l.created_at) = p_fecha
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'datos_faltantes' THEN
    result := public.sales_progress_datos_faltantes_events_json(p_fecha, p_vendedor_id);

  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;