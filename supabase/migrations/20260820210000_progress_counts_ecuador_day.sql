-- Conteos por calendario Ecuador (activity_date), sin mezclar otros días.

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
  ),
  closed AS (
    SELECT unnest(ARRAY[
      'ganado'::public.lead_status,
      'perdido'::public.lead_status
    ]) AS st
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
    AND h.new_status IN (SELECT st FROM closed)
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
    AND ap.status = 'completada'
    AND coalesce(ap.is_completed, false) = true
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
