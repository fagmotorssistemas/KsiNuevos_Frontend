DROP FUNCTION IF EXISTS public.sales_progress_citas_gestion_events_json(date, uuid);
CREATE FUNCTION public.sales_progress_citas_gestion_events_json(
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
    CROSS JOIN b
    WHERE ap.responsible_id = p_vendedor_id
      AND public.activity_date_from_timestamptz(ap.start_time) BETWEEN b.desde AND b.hasta
      AND ap.status IS DISTINCT FROM 'cancelada'::public.appointment_status
    LIMIT 200
  ) x
$$;

DROP FUNCTION IF EXISTS public.sales_progress_showroom_sin_events_json(date, uuid);
CREATE FUNCTION public.sales_progress_showroom_sin_events_json(
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
    CROSS JOIN b
    WHERE v.salesperson_id = p_vendedor_id
      AND public.activity_date_from_timestamptz(v.created_at) BETWEEN b.desde AND b.hasta
    LIMIT 200
  ) x
$$;

DROP FUNCTION IF EXISTS public.sales_progress_datos_faltantes_events_json(date, uuid);
CREATE FUNCTION public.sales_progress_datos_faltantes_events_json(
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
            AND public.activity_date_from_timestamptz(d2.fecha_solicitud) BETWEEN b.desde AND b.hasta
        ) THEN 'Contestada'
        ELSE 'Llegó · sin contestar'
      END AS titulo,
      left(coalesce(nullif(btrim(d.mensaje_completo), ''), 'Info. faltante'), 280) AS detalle,
      'lead'::text AS recurso
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    CROSS JOIN b
    WHERE l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) BETWEEN b.desde AND b.hasta
    ORDER BY d.lead_id, d.fecha_solicitud DESC
    LIMIT 200
  ) x
$$;

DROP FUNCTION IF EXISTS public.sales_progress_asesoria_events_json(date, uuid);
CREATE FUNCTION public.sales_progress_asesoria_events_json(
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
    SELECT DISTINCT ON (af.lead_id)
      af.fecha_solicitud AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af2
          JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af2.id
          WHERE af2.lead_id = af.lead_id
            AND public.activity_date_from_timestamptz(af2.fecha_solicitud) BETWEEN b.desde AND b.hasta
            AND public.sales_progress_asesoria_gestion_completa(g)
        ) THEN 'Gestión llena · +5'
        ELSE 'Llegó · sin llenar'
      END AS titulo,
      left(coalesce(nullif(btrim(af.mensaje_completo), ''), 'Asesoría de financiamiento'), 280) AS detalle,
      'lead'::text AS recurso
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    CROSS JOIN b
    WHERE l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
    ORDER BY af.lead_id, af.fecha_solicitud DESC
    LIMIT 200
  ) x
$$;

DROP FUNCTION IF EXISTS public.sales_progress_estancados_events_json(date, uuid, text);
CREATE FUNCTION public.sales_progress_estancados_events_json(
  p_fecha date,
  p_vendedor_id uuid,
  p_tipo text,
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
      d.fecha_solicitud AS occurred_at,
      l.id AS lead_id,
      l.name AS lead_name,
      l.phone AS lead_phone,
      'Contestó · sigue en info. faltante'::text AS titulo,
      'Respondió pero no pasó a Resuelto.'::text AS detalle,
      'lead_datos'::text AS recurso
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    CROSS JOIN b
    WHERE p_tipo = 'faltante'
      AND l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) BETWEEN b.desde AND b.hasta
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
    CROSS JOIN b
    WHERE p_tipo = 'asesoria'
      AND l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
      AND coalesce(af.estado::text, 'pendiente') = 'en_proceso'
    LIMIT 200
  ) x
$$;

DROP FUNCTION IF EXISTS public.sales_progress_sin_resumen_events_json(date, uuid, boolean);
CREATE FUNCTION public.sales_progress_sin_resumen_events_json(
  p_fecha date,
  p_vendedor_id uuid,
  p_incluir_hoy boolean DEFAULT false,
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
          THEN 'Periodo sin resumen · ' || coalesce(l.status::text, 'nuevo')
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
    CROSS JOIN b
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

DROP FUNCTION IF EXISTS public.get_sales_progress_events(date, uuid, text);
DROP FUNCTION IF EXISTS public.get_sales_progress_events_core(date, uuid, text);

CREATE FUNCTION public.get_sales_progress_events_core(
  p_fecha date,
  p_vendedor_id uuid,
  p_categoria text,
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
  v_start timestamptz;
  v_end timestamptz;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT v_admin AND p_vendedor_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT c.desde, c.hasta, c.start_at, c.end_at
  INTO v_desde, v_hasta, v_start, v_end
  FROM public.sales_progress_clamp_dates(p_fecha, p_hasta) c;

  IF p_categoria = 'lead_status_change' THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        l.resume_updated_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        'Gestión del periodo'::text AS titulo,
        coalesce(
          (
            SELECT left(nullif(btrim(coalesce(i.content, i.result, '')), ''), 280)
            FROM public.interactions i
            WHERE i.lead_id = l.id
              AND public.activity_date_from_timestamptz(i.created_at) BETWEEN v_desde AND v_hasta
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
        AND public.activity_date_from_timestamptz(l.resume_updated_at) BETWEEN v_desde AND v_hasta
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
        AND public.activity_date_from_timestamptz(i.created_at) BETWEEN v_desde AND v_hasta
        AND (
          nullif(btrim(coalesce(i.content, '')), '') IS NOT NULL
          OR nullif(btrim(coalesce(i.result, '')), '') IS NOT NULL
        )
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'asesoria_advanced' THEN
    result := public.sales_progress_asesoria_events_json(p_fecha, p_vendedor_id, p_hasta);

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
        AND public.activity_date_from_timestamptz(v.created_at) BETWEEN v_desde AND v_hasta
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
      WHERE public.activity_date_from_timestamptz(fg.created_at) BETWEEN v_desde AND v_hasta
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
        'Lead del periodo con cita creada en el periodo'::text AS detalle,
        'agenda'::text AS recurso
      FROM public.leads l
      JOIN LATERAL (
        SELECT ap.created_at, ap.title
        FROM public.appointments ap
        WHERE ap.lead_id = l.id
          AND public.activity_date_from_timestamptz(ap.created_at) BETWEEN v_desde AND v_hasta
        ORDER BY ap.created_at
        LIMIT 1
      ) a ON true
      WHERE l.assigned_to = p_vendedor_id
        AND public.activity_date_from_timestamptz(l.created_at) BETWEEN v_desde AND v_hasta
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
        AND public.activity_date_from_timestamptz(l.created_at) BETWEEN v_desde AND v_hasta
      LIMIT 200
    ) x;

  ELSIF p_categoria = 'datos_faltantes' THEN
    result := public.sales_progress_datos_faltantes_events_json(p_fecha, p_vendedor_id, p_hasta);

  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

CREATE FUNCTION public.get_sales_progress_events(
  p_fecha date,
  p_vendedor_id uuid,
  p_categoria text,
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT v_admin AND p_vendedor_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF p_categoria = 'seguimientos_ia' THEN
    RETURN coalesce(public.sales_progress_ia_events_json(p_fecha, p_vendedor_id, p_hasta), '[]'::jsonb);
  END IF;
  IF p_categoria = 'citas_sin_gestionar' THEN
    RETURN coalesce(public.sales_progress_citas_gestion_events_json(p_fecha, p_vendedor_id, p_hasta), '[]'::jsonb);
  END IF;
  IF p_categoria = 'showroom_sin_gestion' THEN
    RETURN coalesce(public.sales_progress_showroom_sin_events_json(p_fecha, p_vendedor_id, p_hasta), '[]'::jsonb);
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
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'faltante', p_hasta), '[]'::jsonb);
  END IF;
  IF p_categoria = 'asesoria_sin_salir' THEN
    RETURN coalesce(public.sales_progress_estancados_events_json(p_fecha, p_vendedor_id, 'asesoria', p_hasta), '[]'::jsonb);
  END IF;
  IF p_categoria = 'sin_resumen' THEN
    RETURN coalesce(public.sales_progress_sin_resumen_events_json(p_fecha, p_vendedor_id, false, p_hasta), '[]'::jsonb);
  END IF;
  IF p_categoria = 'contestados_pendientes' THEN
    RETURN coalesce(public.sales_progress_sin_resumen_events_json(p_fecha, p_vendedor_id, true, p_hasta), '[]'::jsonb);
  END IF;

  RETURN public.get_sales_progress_events_core(p_fecha, p_vendedor_id, p_categoria, p_hasta);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_progress_events(date, uuid, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_progress_events_core(date, uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_progress_citas_gestion_events_json(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_showroom_sin_events_json(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_datos_faltantes_events_json(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_events_json(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_estancados_events_json(date, uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_sin_resumen_events_json(date, uuid, boolean, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events(date, uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_progress_events_core(date, uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_ia_events_json(date, uuid, date) TO authenticated;
