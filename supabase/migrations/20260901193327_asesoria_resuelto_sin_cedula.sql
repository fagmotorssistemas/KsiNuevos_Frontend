-- Cédula ya no es obligatoria. Resuelto + notas cierra el caso
-- (cliente no contestó o no dio cédula) y cuenta como atendido.

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
    AND (
      coalesce(g.requiere_garante, false) = false
      OR nullif(btrim(coalesce(g.garante_detalle, '')), '') IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_atendida(
  p_asesoria_id bigint,
  p_estado text,
  p_notas text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    (
      p_estado IN ('resuelto', 'resuelto_no_aplica')
      AND nullif(btrim(coalesce(p_notas, '')), '') IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.asesoria_financiamiento_gestion g
      WHERE g.asesoria_id = p_asesoria_id
        AND public.sales_progress_asesoria_gestion_completa(g)
    );
$$;

CREATE OR REPLACE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS NULL OR NEW.estado::text = 'pendiente' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado::text IN ('resuelto', 'resuelto_no_aplica') THEN
    IF nullif(btrim(coalesce(NEW.notas_vendedor, '')), '') IS NULL THEN
      RAISE EXCEPTION
        'Para pasar a % hay que escribir las notas (no contestó, no dio cédula, u otra constancia).',
        NEW.estado::text
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.estado::text = 'resuelto' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado::text IN ('en_proceso', 'resuelto_no_aplica') THEN
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
        'Para pasar a % hay que llenar la gestión (tipo, si aplica y banco si aplica). Si no hay cédula, marca Resuelto y escribe las notas.',
        NEW.estado::text
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asesoria_estado_requiere_gestion ON public.asesoria_financiamiento;

CREATE TRIGGER trg_asesoria_estado_requiere_gestion
BEFORE INSERT OR UPDATE OF estado, notas_vendedor ON public.asesoria_financiamiento
FOR EACH ROW
EXECUTE FUNCTION public.asesoria_financiamiento_estado_requiere_gestion();

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
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) = p_fecha
      AND public.sales_progress_asesoria_atendida(af.id, af.estado::text, af.notas_vendedor)
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

CREATE OR REPLACE FUNCTION public.sales_progress_asesoria_day(p_desde date, p_hasta date)
RETURNS TABLE (vendedor_id uuid, ingresadas integer, llenadas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH b AS (
    SELECT * FROM public.sales_progress_clamp_dates(p_desde, p_hasta)
  ),
  arrived AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
  ),
  filled AS (
    SELECT DISTINCT l.assigned_to AS vendedor_id, af.lead_id
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    CROSS JOIN b
    WHERE l.assigned_to IS NOT NULL
      AND public.activity_date_from_timestamptz(af.fecha_solicitud) BETWEEN b.desde AND b.hasta
      AND public.sales_progress_asesoria_atendida(af.id, af.estado::text, af.notas_vendedor)
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
        WHEN public.sales_progress_asesoria_atendida(af.id, af.estado::text, af.notas_vendedor)
          THEN 'Gestión llena · +5'
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

CREATE OR REPLACE FUNCTION public.sales_progress_quedados()
RETURNS TABLE (
  vendedor_id uuid,
  faltante integer,
  asesoria integer,
  asesoria_total integer,
  faltante_total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT
      assigned_to AS vendedor_id,
      count(*) FILTER (WHERE with_notes = 0)::int AS sin_respuesta,
      count(*)::int AS total
    FROM (
      SELECT
        l.assigned_to,
        d.lead_id,
        count(*) FILTER (
          WHERE nullif(btrim(coalesce(d.notas_vendedor, '')), '') IS NOT NULL
        ) AS with_notes
      FROM public.datos_solicitados_clientes d
      JOIN public.leads l ON l.id = d.lead_id
      WHERE l.assigned_to IS NOT NULL
      GROUP BY l.assigned_to, d.lead_id
    ) x
    GROUP BY assigned_to
  ),
  a AS (
    SELECT
      l.assigned_to AS vendedor_id,
      count(DISTINCT af.lead_id) FILTER (
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af2
          JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af2.id
          WHERE af2.lead_id = af.lead_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af3
          WHERE af3.lead_id = af.lead_id
            AND af3.estado::text IN ('resuelto', 'resuelto_no_aplica')
        )
      )::int AS sin_ficha,
      count(DISTINCT af.lead_id)::int AS total
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  ids AS (
    SELECT vendedor_id FROM f
    UNION
    SELECT vendedor_id FROM a
  )
  SELECT
    i.vendedor_id,
    coalesce(f.sin_respuesta, 0),
    coalesce(a.sin_ficha, 0),
    coalesce(a.total, 0),
    coalesce(f.total, 0)
  FROM ids i
  LEFT JOIN f ON f.vendedor_id = i.vendedor_id
  LEFT JOIN a ON a.vendedor_id = i.vendedor_id
$$;

CREATE OR REPLACE FUNCTION public.sales_progress_quedados_events_json(
  p_vendedor_id uuid,
  p_tipo text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at ASC NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT *
    FROM (
      SELECT
        min(d.fecha_solicitud) AS occurred_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.phone AS lead_phone,
        'Sin respuesta'::text AS titulo,
        'Ninguna solicitud tiene la respuesta escrita'::text AS detalle,
        'lead_datos'::text AS recurso
      FROM public.datos_solicitados_clientes d
      JOIN public.leads l ON l.id = d.lead_id
      WHERE p_tipo = 'faltante'
        AND l.assigned_to = p_vendedor_id
      GROUP BY l.id, l.name, l.phone
      HAVING count(*) FILTER (
        WHERE nullif(btrim(coalesce(d.notas_vendedor, '')), '') IS NOT NULL
      ) = 0
      UNION ALL
      SELECT
        min(af.fecha_solicitud),
        l.id,
        l.name,
        l.phone,
        'Sin ficha de gestión'::text,
        'Nunca llenaron la ficha de financiamiento'::text,
        'lead_asesoria'::text
      FROM public.asesoria_financiamiento af
      JOIN public.leads l ON l.id = af.lead_id
      WHERE p_tipo = 'asesoria'
        AND l.assigned_to = p_vendedor_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af2
          JOIN public.asesoria_financiamiento_gestion g ON g.asesoria_id = af2.id
          WHERE af2.lead_id = af.lead_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.asesoria_financiamiento af3
          WHERE af3.lead_id = af.lead_id
            AND af3.estado::text IN ('resuelto', 'resuelto_no_aplica')
        )
      GROUP BY l.id, l.name, l.phone
    ) raw
    ORDER BY occurred_at ASC NULLS LAST
    LIMIT 200
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_atendida(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_gestion_completa(public.asesoria_financiamiento_gestion) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_day(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_asesoria_events_json(date, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sales_progress_quedados_events_json(uuid, text) TO authenticated;
