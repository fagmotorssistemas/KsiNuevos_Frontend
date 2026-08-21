-- Para el ranking, "con historial" pasa a ser leads gestionados hoy
-- (resumen ejecutivo), de cualquier fecha de ingreso.
-- Juan (estrancados) no recibe pipeline del día: hay que ver lo que hizo, no lo que le llegó.

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
  managed AS (
    SELECT l.assigned_to AS vendedor_id, count(*)::int AS gestionados
    FROM public.leads l
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(l.resume_updated_at) = p_fecha
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
    coalesce(b.backlog_abiertos, 0)
  FROM sellers s
  LEFT JOIN inbound i ON i.vendedor_id = s.vendedor_id
  LEFT JOIN managed m ON m.vendedor_id = s.vendedor_id
  LEFT JOIN backlog b ON b.vendedor_id = s.vendedor_id
$$;
