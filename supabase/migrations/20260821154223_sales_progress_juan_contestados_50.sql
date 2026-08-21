-- Juan (estrancado): tope 50 leads contestados. El resto del equipo sigue en 40.

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
      ELSE w.daily_cap_points
    END,
    w.sort_order
  FROM sellers sel
  CROSS JOIN cats w
  LEFT JOIN raw r
    ON r.vendedor_id = sel.id AND r.categoria = w.category
  LEFT JOIN stale st
    ON st.vendedor_id = sel.id AND w.category = 'stale_leads'
$$;
