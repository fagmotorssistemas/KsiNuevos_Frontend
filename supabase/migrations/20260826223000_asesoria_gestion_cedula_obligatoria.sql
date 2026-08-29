-- Cédula siempre obligatoria para considerar la gestión completa.

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
    AND nullif(btrim(coalesce(g.cedula, '')), '') IS NOT NULL
    AND (
      coalesce(g.requiere_garante, false) = false
      OR nullif(btrim(coalesce(g.garante_detalle, '')), '') IS NOT NULL
    );
$$;
