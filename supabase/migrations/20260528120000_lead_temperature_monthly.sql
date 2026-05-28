-- Temperatura por lead + mes de campaña (Ecuador).
-- leads.temperature = estado operativo del mes (reinicio mensual a frio).
-- lead_temperature_monthly = historial solo cuando hubo actividad (interested_cars) o migración.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_temperature_monthly (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_month date NOT NULL,
  temperature_peak public.lead_temperature NOT NULL DEFAULT 'frio'::public.lead_temperature,
  states_reached public.lead_temperature[] NOT NULL DEFAULT ARRAY['frio'::public.lead_temperature],
  first_recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_temperature_monthly_lead_month_key UNIQUE (lead_id, campaign_month),
  CONSTRAINT lead_temperature_monthly_campaign_month_first_day CHECK (
    campaign_month = (date_trunc('month', campaign_month::timestamp))::date
  )
);

COMMENT ON TABLE public.lead_temperature_monthly IS
  'Capítulo mensual de temperatura por lead (mes calendario Ecuador). Solo existe si hubo actividad ese mes o migración.';
COMMENT ON COLUMN public.lead_temperature_monthly.campaign_month IS
  'Primer día del mes (YYYY-MM-01) en America/Guayaquil.';
COMMENT ON COLUMN public.lead_temperature_monthly.temperature_peak IS
  'Máxima temperatura alcanzada en ese mes (no baja si el vendedor baja leads.temperature).';

CREATE INDEX IF NOT EXISTS idx_lead_temperature_monthly_lead_id
  ON public.lead_temperature_monthly (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_temperature_monthly_month_peak
  ON public.lead_temperature_monthly (campaign_month, temperature_peak);

CREATE INDEX IF NOT EXISTS idx_lead_temperature_monthly_lead_month
  ON public.lead_temperature_monthly (lead_id, campaign_month DESC);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER para triggers / cron)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_temperature_rank(p_temp public.lead_temperature)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_temp
    WHEN 'frio'::public.lead_temperature THEN 1
    WHEN 'tibio'::public.lead_temperature THEN 2
    WHEN 'caliente'::public.lead_temperature THEN 3
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.lead_temperature_max(
  p_a public.lead_temperature,
  p_b public.lead_temperature
)
RETURNS public.lead_temperature
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.lead_temperature_rank(p_a) >= public.lead_temperature_rank(p_b) THEN p_a
    ELSE p_b
  END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_month_from_timestamptz(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (date_trunc('month', p_ts AT TIME ZONE 'America/Guayaquil'))::date;
$$;

CREATE OR REPLACE FUNCTION public.campaign_month_now_ecuador()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT public.campaign_month_from_timestamptz(now());
$$;

CREATE OR REPLACE FUNCTION public.lead_temperature_append_state(
  p_states public.lead_temperature[],
  p_new public.lead_temperature
)
RETURNS public.lead_temperature[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_new = ANY (COALESCE(p_states, ARRAY[]::public.lead_temperature[])) THEN p_states
    ELSE array_append(COALESCE(p_states, ARRAY[]::public.lead_temperature[]), p_new)
  END;
$$;

-- Abre capítulo del mes (solo si no existe). Llamado al registrar interested_cars.
CREATE OR REPLACE FUNCTION public.lead_temperature_ensure_month_chapter(
  p_lead_id bigint,
  p_activity_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date;
BEGIN
  IF p_lead_id IS NULL THEN
    RETURN;
  END IF;

  v_month := public.campaign_month_from_timestamptz(p_activity_at);

  INSERT INTO public.lead_temperature_monthly (
    lead_id,
    campaign_month,
    temperature_peak,
    states_reached,
    first_recorded_at
  )
  VALUES (
    p_lead_id,
    v_month,
    'frio'::public.lead_temperature,
    ARRAY['frio'::public.lead_temperature],
    COALESCE(p_activity_at, now())
  )
  ON CONFLICT (lead_id, campaign_month) DO NOTHING;
END;
$$;

-- Actualiza pico del mes actual si ya hay capítulo (cambios en leads.temperature).
CREATE OR REPLACE FUNCTION public.lead_temperature_sync_from_lead(p_lead_id bigint, p_new public.lead_temperature)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date;
  v_row public.lead_temperature_monthly%ROWTYPE;
BEGIN
  IF p_lead_id IS NULL OR p_new IS NULL THEN
    RETURN;
  END IF;

  v_month := public.campaign_month_now_ecuador();

  SELECT * INTO v_row
  FROM public.lead_temperature_monthly
  WHERE lead_id = p_lead_id AND campaign_month = v_month
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Sin actividad este mes: no crear fila solo por cambio de temperatura.
    RETURN;
  END IF;

  UPDATE public.lead_temperature_monthly
  SET
    temperature_peak = public.lead_temperature_max(temperature_peak, p_new),
    states_reached = public.lead_temperature_append_state(states_reached, p_new),
    updated_at = now()
  WHERE id = v_row.id;
END;
$$;

-- Reinicio operativo: todos los leads a frio (inicio de mes, pg_cron).
CREATE OR REPLACE FUNCTION public.reset_leads_temperature_monthly()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.leads
  SET temperature = 'frio'::public.lead_temperature
  WHERE temperature IS DISTINCT FROM 'frio'::public.lead_temperature;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_interested_cars_lead_temperature_monthly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lead_temperature_ensure_month_chapter(
    NEW.lead_id,
    COALESCE(NEW.created_at, now())
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interested_cars_lead_temperature_monthly ON public.interested_cars;

CREATE TRIGGER trg_interested_cars_lead_temperature_monthly
  AFTER INSERT ON public.interested_cars
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_interested_cars_lead_temperature_monthly();

CREATE OR REPLACE FUNCTION public.trg_leads_temperature_monthly_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    PERFORM public.lead_temperature_sync_from_lead(NEW.id, NEW.temperature);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_temperature_monthly_sync ON public.leads;

CREATE TRIGGER trg_leads_temperature_monthly_sync
  AFTER UPDATE OF temperature ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_leads_temperature_monthly_sync();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_temperature_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_temperature_monthly_select ON public.lead_temperature_monthly;
CREATE POLICY lead_temperature_monthly_select ON public.lead_temperature_monthly
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_temperature_monthly.lead_id
        AND (l.assigned_to = auth.uid() OR public.is_admin_or_marketing())
    )
  );

DROP POLICY IF EXISTS lead_temperature_monthly_service_role ON public.lead_temperature_monthly;
CREATE POLICY lead_temperature_monthly_service_role ON public.lead_temperature_monthly
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Migración de datos (no borra leads ni interested_cars)
-- 1) Mes de creación del lead + temperatura actual (pico y estados).
-- 2) Meses con interested_cars sin fila: abrir capítulo en frio (actividad histórica).
-- ---------------------------------------------------------------------------
INSERT INTO public.lead_temperature_monthly (
  lead_id,
  campaign_month,
  temperature_peak,
  states_reached,
  first_recorded_at
)
SELECT
  l.id,
  public.campaign_month_from_timestamptz(l.created_at),
  COALESCE(l.temperature, 'frio'::public.lead_temperature),
  ARRAY[COALESCE(l.temperature, 'frio'::public.lead_temperature)]::public.lead_temperature[],
  l.created_at
FROM public.leads l
ON CONFLICT (lead_id, campaign_month) DO UPDATE
SET
  temperature_peak = public.lead_temperature_max(
    lead_temperature_monthly.temperature_peak,
    EXCLUDED.temperature_peak
  ),
  states_reached = public.lead_temperature_append_state(
    lead_temperature_monthly.states_reached,
    EXCLUDED.temperature_peak
  ),
  updated_at = now();

INSERT INTO public.lead_temperature_monthly (
  lead_id,
  campaign_month,
  temperature_peak,
  states_reached,
  first_recorded_at
)
SELECT DISTINCT
  ic.lead_id,
  public.campaign_month_from_timestamptz(ic.created_at),
  'frio'::public.lead_temperature,
  ARRAY['frio'::public.lead_temperature],
  MIN(ic.created_at)
FROM public.interested_cars ic
GROUP BY ic.lead_id, public.campaign_month_from_timestamptz(ic.created_at)
ON CONFLICT (lead_id, campaign_month) DO NOTHING;

-- ---------------------------------------------------------------------------
-- pg_cron: día 1 de cada mes 00:05 America/Guayaquil (= 05:05 UTC)
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid := j.jobid)
    FROM cron.job j
    WHERE j.jobname = 'reset_leads_temperature_monthly';

    PERFORM cron.schedule(
      'reset_leads_temperature_monthly',
      '5 5 1 * *',
      $$SELECT public.reset_leads_temperature_monthly();$$
    );
  END IF;
END;
$cron$;
