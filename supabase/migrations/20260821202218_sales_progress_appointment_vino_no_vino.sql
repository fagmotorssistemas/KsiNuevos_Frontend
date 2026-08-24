-- Cita completada en progreso: suma si el cliente vino,
-- o si no vino pero el vendedor dejó motivo + seguimiento (llamada/mensaje).

CREATE OR REPLACE FUNCTION public.sales_progress_appointment_managed(ap public.appointments)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(ap.is_completed, false)
    AND (
      (ap.status = 'completada' AND ap.client_attended IS DISTINCT FROM false)
      OR (
        ap.status = 'no_asistio'
        AND ap.client_attended = false
        AND nullif(btrim(coalesce(ap.no_show_reason, '')), '') IS NOT NULL
        AND ap.no_show_follow_up IN ('llamada', 'mensaje')
      )
    );
$$;

COMMENT ON FUNCTION public.sales_progress_appointment_managed(public.appointments) IS
  'true = cita gestionada para progreso: vino, o no vino con motivo y seguimiento.';

CREATE OR REPLACE FUNCTION public.sales_progress_event_counts(p_fecha date)
RETURNS TABLE (vendedor_id uuid, categoria text, cantidad integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      ((p_fecha::text)::date::timestamp AT TIME ZONE 'America/Guayaquil') AS start_at,
      ((p_fecha::text)::date::timestamp AT TIME ZONE 'America/Guayaquil') + interval '1 day' AS end_at
  )
  SELECT l.assigned_to, 'lead_status_change'::text, count(*)::int
  FROM public.leads l
  WHERE l.assigned_to IS NOT NULL
    AND public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
    AND nullif(btrim(coalesce(l.resume, '')), '') IS NOT NULL
  GROUP BY l.assigned_to

  UNION ALL
  SELECT h.changed_by, 'lead_closed'::text, count(*)::int
  FROM public.lead_status_history h, bounds b
  WHERE h.changed_by IS NOT NULL
    AND h.recorded_at >= b.start_at AND h.recorded_at < b.end_at
    AND h.new_status = 'ganado'::public.lead_status
    AND h.old_status IS DISTINCT FROM h.new_status
  GROUP BY h.changed_by

  UNION ALL
  SELECT i.responsible_id, 'lead_interaction'::text, count(*)::int
  FROM public.interactions i
  WHERE i.responsible_id IS NOT NULL
    AND public.activity_date_from_timestamptz(i.created_at) = p_fecha
    AND (
      nullif(btrim(coalesce(i.content, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(i.result, '')), '') IS NOT NULL
    )
  GROUP BY i.responsible_id

  UNION ALL
  SELECT a.changed_by, 'asesoria_advanced'::text, count(*)::int
  FROM public.asesoria_status_history a, bounds b
  WHERE a.changed_by IS NOT NULL
    AND a.recorded_at >= b.start_at AND a.recorded_at < b.end_at
    AND a.new_estado IN ('en_proceso', 'resuelto')
  GROUP BY a.changed_by

  UNION ALL
  SELECT l.assigned_to, 'asesoria_advanced'::text, count(*)::int
  FROM public.asesoria_financiamiento af
  JOIN public.leads l ON l.id = af.lead_id
  CROSS JOIN bounds b
  WHERE l.assigned_to IS NOT NULL
    AND af.fecha_resolucion >= b.start_at AND af.fecha_resolucion < b.end_at
    AND NOT EXISTS (
      SELECT 1
      FROM public.asesoria_status_history h
      WHERE h.asesoria_id = af.id
        AND h.recorded_at >= b.start_at AND h.recorded_at < b.end_at
        AND h.changed_by = l.assigned_to
    )
  GROUP BY l.assigned_to

  UNION ALL
  SELECT ap.responsible_id, 'appointment_completed'::text, count(*)::int
  FROM public.appointments ap, bounds b
  WHERE ap.responsible_id IS NOT NULL
    AND ap.updated_at >= b.start_at AND ap.updated_at < b.end_at
    AND public.sales_progress_appointment_managed(ap)
  GROUP BY ap.responsible_id

  UNION ALL
  SELECT v.salesperson_id, 'showroom_followup'::text, count(*)::int
  FROM public.showroom_visits v
  WHERE v.salesperson_id IS NOT NULL
    AND public.activity_date_from_timestamptz(v.created_at) = p_fecha
  GROUP BY v.salesperson_id

  UNION ALL
  SELECT p.created_by, 'proforma_generated'::text, count(*)::int
  FROM public.credit_proformas p, bounds b
  WHERE p.created_by IS NOT NULL
    AND p.created_at >= b.start_at AND p.created_at < b.end_at
    AND p.pdf_url IS NOT NULL
  GROUP BY p.created_by
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
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        a.recorded_at AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        (coalesce(a.old_estado, '—') || ' → ' || a.new_estado) AS titulo,
        'Asesoría de financiamiento'::text AS detalle,
        'lead'::text AS recurso
      FROM public.asesoria_status_history a
      JOIN public.leads l ON l.id = a.lead_id
      WHERE a.changed_by = p_vendedor_id
        AND a.recorded_at >= v_start AND a.recorded_at < v_end
        AND a.new_estado IN ('en_proceso', 'resuelto')
      UNION ALL
      SELECT
        af.fecha_resolucion,
        l.id,
        l.name,
        l.phone,
        'resuelto'::text,
        'Asesoría resuelta'::text,
        'lead'::text
      FROM public.asesoria_financiamiento af
      JOIN public.leads l ON l.id = af.lead_id
      WHERE l.assigned_to = p_vendedor_id
        AND af.fecha_resolucion >= v_start AND af.fecha_resolucion < v_end
        AND NOT EXISTS (
          SELECT 1 FROM public.asesoria_status_history h
          WHERE h.asesoria_id = af.id
            AND h.recorded_at >= v_start AND h.recorded_at < v_end
            AND h.changed_by = p_vendedor_id
        )
      LIMIT 200
    ) x;

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

  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;