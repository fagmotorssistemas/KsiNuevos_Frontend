-- Detalle de Seguimientos IA alineado a Agenda: fecha/hora que mandó el bot.

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
        WHEN public.sales_progress_ia_ref_date(l) < p_fecha THEN 'IA vencida · sin agendar'
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

GRANT EXECUTE ON FUNCTION public.sales_progress_ia_events_json(date, uuid) TO authenticated;
