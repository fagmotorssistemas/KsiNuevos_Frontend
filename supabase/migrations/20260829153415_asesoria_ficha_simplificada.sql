-- Ficha de asesoría más corta: ya no se exige detalle, asesor ni monto/plazo.
-- Banco solo si aplica. Resuelto · no aplica cuenta como cerrado.

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_gestion_completa(
  g public.asesoria_financiamiento_gestion
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    nullif(btrim(coalesce(g.tipo::text, '')), '') IS NOT NULL
    AND g.aplica IS NOT NULL
    AND (
      g.aplica = true
      OR nullif(btrim(coalesce(g.motivo_no_aplica, '')), '') IS NOT NULL
    )
    AND (
      g.aplica IS DISTINCT FROM true
      OR nullif(btrim(coalesce(g.banco_deseado, '')), '') IS NOT NULL
    )
    AND nullif(btrim(coalesce(g.cedula, '')), '') IS NOT NULL
    AND (
      coalesce(g.requiere_garante, false) = false
      OR nullif(btrim(coalesce(g.garante_detalle, '')), '') IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado IS NULL OR NEW.estado::text = 'pendiente' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado::text IN ('en_proceso', 'resuelto', 'resuelto_no_aplica') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.asesoria_financiamiento_gestion g
      WHERE g.asesoria_id = NEW.id
        AND public.sales_progress_asesoria_gestion_completa(g)
        AND (
          NEW.estado::text <> 'resuelto_no_aplica'
          OR g.aplica = false
        )
    ) THEN
      RAISE EXCEPTION
        'Para pasar a % hay que llenar la gestión (tipo, si aplica, cédula y banco si aplica).',
        NEW.estado::text
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asesoria_estado_requiere_gestion ON public.asesoria_financiamiento;

CREATE TRIGGER trg_asesoria_estado_requiere_gestion
BEFORE UPDATE OF estado ON public.asesoria_financiamiento
FOR EACH ROW
EXECUTE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion();

CREATE OR REPLACE FUNCTION public.sales_progress_estancados_day(p_fecha date)
RETURNS TABLE (
  vendedor_id uuid,
  faltante_contestadas integer,
  faltante_sin_salir integer,
  asesoria_respondidas integer,
  asesoria_sin_salir integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH faltante AS (
    SELECT
      l.assigned_to AS vendedor_id,
      d.lead_id,
      bool_and(public.sales_progress_datos_faltantes_contestada(d)) AS contestada,
      bool_and(coalesce(d.estado, 'pendiente') = 'resuelto') AS resuelto
    FROM public.datos_solicitados_clientes d
    JOIN public.leads l ON l.id = d.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(d.fecha_solicitud) = p_fecha
    GROUP BY l.assigned_to, d.lead_id
  ),
  ases AS (
    SELECT
      l.assigned_to AS vendedor_id,
      af.lead_id,
      bool_or(
        coalesce(af.estado::text, 'pendiente') IN ('en_proceso', 'resuelto', 'resuelto_no_aplica')
        OR nullif(btrim(coalesce(af.notas_vendedor, '')), '') IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.asesoria_financiamiento_gestion g
          WHERE g.asesoria_id = af.id
        )
      ) AS respondida,
      bool_and(
        coalesce(af.estado::text, 'pendiente') IN ('resuelto', 'resuelto_no_aplica')
      ) AS resuelto
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
    GROUP BY l.assigned_to, af.lead_id
  ),
  f_agg AS (
    SELECT
      vendedor_id,
      count(*) FILTER (WHERE contestada)::int AS contestadas,
      count(*) FILTER (WHERE contestada AND NOT resuelto)::int AS sin_salir
    FROM faltante
    GROUP BY vendedor_id
  ),
  a_agg AS (
    SELECT
      vendedor_id,
      count(*) FILTER (WHERE respondida)::int AS respondidas,
      count(*) FILTER (WHERE respondida AND NOT resuelto)::int AS sin_salir
    FROM ases
    GROUP BY vendedor_id
  ),
  ids AS (
    SELECT vendedor_id FROM f_agg
    UNION
    SELECT vendedor_id FROM a_agg
  )
  SELECT
    i.vendedor_id,
    coalesce(f.contestadas, 0),
    coalesce(f.sin_salir, 0),
    coalesce(a.respondidas, 0),
    coalesce(a.sin_salir, 0)
  FROM ids i
  LEFT JOIN f_agg f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a_agg a ON a.vendedor_id = i.vendedor_id
$$;
