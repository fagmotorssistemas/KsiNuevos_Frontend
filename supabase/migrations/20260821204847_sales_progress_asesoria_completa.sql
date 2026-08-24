-- Asesoría avanzada: cuenta gestiones LLENAS (no solo estado).
-- % del día = llenas / llegadas. Un cliente = 1. Sin tope: sigue sumando al llegar.

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_gestion_completa(
  g public.asesoria_financiamiento_gestion
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    nullif(btrim(coalesce(g.tipo::text, '')), '') IS NOT NULL
    AND nullif(btrim(coalesce(g.gestion_detalle, '')), '') IS NOT NULL
    AND g.aplica IS NOT NULL
    AND (
      g.aplica = true
      OR nullif(btrim(coalesce(g.motivo_no_aplica, '')), '') IS NOT NULL
    )
    AND (
      g.aplica IS DISTINCT FROM true
      OR (g.monto_aprobable_max IS NOT NULL AND g.plazo_meses_max IS NOT NULL)
    )
    AND nullif(btrim(coalesce(g.banco_deseado, '')), '') IS NOT NULL
    AND nullif(btrim(coalesce(g.asesor_contactado_nombre, '')), '') IS NOT NULL
    AND nullif(btrim(coalesce(g.asesor_contactado_telefono, '')), '') IS NOT NULL
    AND (
      coalesce(g.se_solicito_cedula, false) = false
      OR nullif(btrim(coalesce(g.cedula, '')), '') IS NOT NULL
    )
    AND (
      coalesce(g.requiere_garante, false) = false
      OR nullif(btrim(coalesce(g.garante_detalle, '')), '') IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_day(p_fecha date)
RETURNS TABLE (vendedor_id uuid, ingresadas integer, llenadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH arrived AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
  ),
  filled AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af.id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
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

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_events_json(
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
            AND public.activity_date_from_timestamptz(af2.fecha_solicitud) = p_fecha
            AND public.sales_progress_asesoria_gestion_completa(g)
        ) THEN 'Gestión llena · +5'
        ELSE 'Llegó · sin llenar'
      END AS titulo,
      left(coalesce(nullif(btrim(af.mensaje_completo), ''), 'Asesoría de financiamiento'), 280) AS detalle,
      'lead'::text AS recurso
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to = p_vendedor_id
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
    ORDER BY af.lead_id, af.fecha_solicitud DESC
    LIMIT 200
  ) x
$$;

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
  SELECT d.vendedor_id, 'asesoria_advanced'::text, d.llenadas
  FROM public.sales_progress_asesoria_day(p_fecha) d
  WHERE d.llenadas > 0

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
  gestion AS (
    SELECT g.vendedor_id, g.cantidad, g.puntos
    FROM public.sales_progress_showroom_gestion_day(p_fecha) g
  ),
  asesoria AS (
    SELECT a.vendedor_id, a.ingresadas, a.llenadas
    FROM public.sales_progress_asesoria_day(p_fecha) a
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
      WHEN w.category = 'showroom_gestion' THEN coalesce(g.cantidad, 0)
      WHEN w.category = 'asesoria_advanced' THEN coalesce(a.llenadas, 0)
      ELSE coalesce(r.cantidad, 0)
    END AS cantidad,
    CASE
      WHEN w.category = 'showroom_gestion' THEN coalesce(g.puntos, 0)::numeric
      WHEN w.category = 'asesoria_advanced' THEN coalesce(a.llenadas, 0) * w.points
      ELSE (
        CASE
          WHEN w.category = 'stale_leads' THEN
            CASE WHEN sel.rol = 'diario' THEN coalesce(st.cantidad, 0) ELSE 0 END
          ELSE coalesce(r.cantidad, 0)
        END
      ) * w.points
    END AS puntos_brutos,
    CASE
      WHEN w.category = 'stale_leads' AND sel.rol IS DISTINCT FROM 'diario' THEN 0
      WHEN w.category = 'showroom_gestion' THEN
        LEAST(coalesce(g.puntos, 0)::numeric, w.daily_cap_points)
      WHEN w.category = 'asesoria_advanced' THEN
        coalesce(a.llenadas, 0) * w.points
      WHEN w.points >= 0 THEN
        LEAST(
          (
            CASE
              WHEN w.category = 'stale_leads' THEN coalesce(st.cantidad, 0)
              ELSE coalesce(r.cantidad, 0)
            END
          ) * w.points,
          CASE
            WHEN w.category = 'lead_status_change' AND sel.rol = 'estrancado' THEN 50
            ELSE w.daily_cap_points
          END
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
    CASE
      WHEN w.category = 'lead_status_change' AND sel.rol = 'estrancado' THEN 50
      WHEN w.category = 'asesoria_advanced' THEN coalesce(a.ingresadas, 0)
      ELSE w.daily_cap_points
    END,
    w.sort_order
  FROM sellers sel
  CROSS JOIN cats w
  LEFT JOIN raw r
    ON r.vendedor_id = sel.id AND r.categoria = w.category
  LEFT JOIN gestion g
    ON g.vendedor_id = sel.id AND w.category = 'showroom_gestion'
  LEFT JOIN asesoria a
    ON a.vendedor_id = sel.id AND w.category = 'asesoria_advanced'
  LEFT JOIN stale st
    ON st.vendedor_id = sel.id AND w.category = 'stale_leads'
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_gestion_completa(public.asesoria_financiamiento_gestion) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_day(date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_events_json(date, uuid) TO anon, authenticated, service_role;

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

  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;