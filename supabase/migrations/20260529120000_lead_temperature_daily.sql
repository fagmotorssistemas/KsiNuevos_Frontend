-- Misma lógica que lead_temperature_monthly, grano = día (Ecuador).
-- lead_temperature_daily: historial por lead + fecha (solo si hubo actividad ese día).
-- lead_temperature_monthly: se mantiene; se actualiza por rollup desde los días del mes.

-- ---------------------------------------------------------------------------
-- Tabla diaria
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_temperature_daily (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  temperature_peak public.lead_temperature NOT NULL DEFAULT 'frio'::public.lead_temperature,
  states_reached public.lead_temperature[] NOT NULL DEFAULT ARRAY['frio'::public.lead_temperature],
  first_recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_temperature_daily_lead_day_key UNIQUE (lead_id, activity_date)
);

COMMENT ON TABLE public.lead_temperature_daily IS
  'Temperatura por lead y día (America/Guayaquil). Solo existe si hubo actividad ese día (interested_cars) o migración.';
COMMENT ON COLUMN public.lead_temperature_daily.activity_date IS
  'Día calendario en Ecuador (YYYY-MM-DD).';

CREATE INDEX IF NOT EXISTS idx_lead_temperature_daily_lead_id
  ON public.lead_temperature_daily (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_temperature_daily_date_peak
  ON public.lead_temperature_daily (activity_date, temperature_peak);

CREATE INDEX IF NOT EXISTS idx_lead_temperature_daily_lead_date
  ON public.lead_temperature_daily (lead_id, activity_date DESC);

-- ---------------------------------------------------------------------------
-- Helpers día
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activity_date_from_timestamptz(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (p_ts AT TIME ZONE 'America/Guayaquil')::date;
$$;

CREATE OR REPLACE FUNCTION public.activity_date_now_ecuador()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT public.activity_date_from_timestamptz(now());
$$;

-- Abre capítulo del día (solo si no existe).
CREATE OR REPLACE FUNCTION public.lead_temperature_ensure_day_chapter(
  p_lead_id bigint,
  p_activity_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
BEGIN
  IF p_lead_id IS NULL THEN
    RETURN;
  END IF;

  v_day := public.activity_date_from_timestamptz(p_activity_at);

  INSERT INTO public.lead_temperature_daily (
    lead_id,
    activity_date,
    temperature_peak,
    states_reached,
    first_recorded_at
  )
  VALUES (
    p_lead_id,
    v_day,
    'frio'::public.lead_temperature,
    ARRAY['frio'::public.lead_temperature],
    COALESCE(p_activity_at, now())
  )
  ON CONFLICT (lead_id, activity_date) DO NOTHING;
END;
$$;

-- Actualiza pico del día si ya hay capítulo (cambios en leads.temperature).
CREATE OR REPLACE FUNCTION public.lead_temperature_sync_day_from_lead(
  p_lead_id bigint,
  p_new public.lead_temperature
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_row public.lead_temperature_daily%ROWTYPE;
BEGIN
  IF p_lead_id IS NULL OR p_new IS NULL THEN
    RETURN;
  END IF;

  v_day := public.activity_date_now_ecuador();

  SELECT * INTO v_row
  FROM public.lead_temperature_daily
  WHERE lead_id = p_lead_id AND activity_date = v_day
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.lead_temperature_daily
  SET
    temperature_peak = public.lead_temperature_max(temperature_peak, p_new),
    states_reached = public.lead_temperature_append_state(states_reached, p_new),
    updated_at = now()
  WHERE id = v_row.id;
END;
$$;

-- Rollup: mes desde días del mismo mes calendario.
CREATE OR REPLACE FUNCTION public.lead_temperature_rollup_month(
  p_lead_id bigint,
  p_activity_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date;
  v_peak public.lead_temperature;
  v_states public.lead_temperature[];
  v_first timestamptz;
BEGIN
  IF p_lead_id IS NULL OR p_activity_date IS NULL THEN
    RETURN;
  END IF;

  v_month := (date_trunc('month', p_activity_date::timestamp))::date;

  SELECT
    d.temperature_peak,
    d.states_reached,
    d.first_recorded_at
  INTO v_peak, v_states, v_first
  FROM public.lead_temperature_daily d
  WHERE d.lead_id = p_lead_id
    AND (date_trunc('month', d.activity_date::timestamp))::date = v_month
  ORDER BY public.lead_temperature_rank(d.temperature_peak) DESC, d.activity_date DESC
  LIMIT 1;

  IF v_peak IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    (
      SELECT array_agg(s ORDER BY public.lead_temperature_rank(s))
      FROM (
        SELECT DISTINCT unnest(d2.states_reached) AS s
        FROM public.lead_temperature_daily d2
        WHERE d2.lead_id = p_lead_id
          AND (date_trunc('month', d2.activity_date::timestamp))::date = v_month
      ) u
    ),
    ARRAY[v_peak]::public.lead_temperature[]
  )
  INTO v_states;

  INSERT INTO public.lead_temperature_monthly (
    lead_id,
    campaign_month,
    temperature_peak,
    states_reached,
    first_recorded_at
  )
  VALUES (p_lead_id, v_month, v_peak, v_states, COALESCE(v_first, now()))
  ON CONFLICT (lead_id, campaign_month) DO UPDATE
  SET
    temperature_peak = EXCLUDED.temperature_peak,
    states_reached = EXCLUDED.states_reached,
    updated_at = now();
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers (reemplazan lógica solo-mensual en interested_cars / leads)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_interested_cars_lead_temperature_daily()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_at timestamptz;
  v_day date;
BEGIN
  v_at := COALESCE(NEW.created_at, now());
  v_day := public.activity_date_from_timestamptz(v_at);
  PERFORM public.lead_temperature_ensure_day_chapter(NEW.lead_id, v_at);
  PERFORM public.lead_temperature_rollup_month(NEW.lead_id, v_day);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interested_cars_lead_temperature_monthly ON public.interested_cars;
DROP TRIGGER IF EXISTS trg_interested_cars_lead_temperature_daily ON public.interested_cars;

CREATE TRIGGER trg_interested_cars_lead_temperature_daily
  AFTER INSERT ON public.interested_cars
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_interested_cars_lead_temperature_daily();

CREATE OR REPLACE FUNCTION public.trg_leads_temperature_daily_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    PERFORM public.lead_temperature_sync_day_from_lead(NEW.id, NEW.temperature);
    v_day := public.activity_date_now_ecuador();
    PERFORM public.lead_temperature_rollup_month(NEW.id, v_day);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_temperature_monthly_sync ON public.leads;

CREATE TRIGGER trg_leads_temperature_daily_sync
  AFTER UPDATE OF temperature ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_leads_temperature_daily_sync();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_temperature_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_temperature_daily_select ON public.lead_temperature_daily;
CREATE POLICY lead_temperature_daily_select ON public.lead_temperature_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_temperature_daily.lead_id
        AND (l.assigned_to = auth.uid() OR public.is_admin_or_marketing())
    )
  );

DROP POLICY IF EXISTS lead_temperature_daily_service_role ON public.lead_temperature_daily;
CREATE POLICY lead_temperature_daily_service_role ON public.lead_temperature_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Migración datos (no borra tablas existentes)
-- ---------------------------------------------------------------------------
INSERT INTO public.lead_temperature_daily (
  lead_id,
  activity_date,
  temperature_peak,
  states_reached,
  first_recorded_at
)
SELECT
  l.id,
  public.activity_date_from_timestamptz(l.created_at),
  COALESCE(l.temperature, 'frio'::public.lead_temperature),
  ARRAY[COALESCE(l.temperature, 'frio'::public.lead_temperature)]::public.lead_temperature[],
  l.created_at
FROM public.leads l
ON CONFLICT (lead_id, activity_date) DO UPDATE
SET
  temperature_peak = public.lead_temperature_max(
    lead_temperature_daily.temperature_peak,
    EXCLUDED.temperature_peak
  ),
  states_reached = public.lead_temperature_append_state(
    lead_temperature_daily.states_reached,
    EXCLUDED.temperature_peak
  ),
  updated_at = now();

INSERT INTO public.lead_temperature_daily (
  lead_id,
  activity_date,
  temperature_peak,
  states_reached,
  first_recorded_at
)
SELECT
  ic.lead_id,
  public.activity_date_from_timestamptz(ic.created_at),
  'frio'::public.lead_temperature,
  ARRAY['frio'::public.lead_temperature],
  MIN(ic.created_at)
FROM public.interested_cars ic
GROUP BY ic.lead_id, public.activity_date_from_timestamptz(ic.created_at)
ON CONFLICT (lead_id, activity_date) DO NOTHING;

-- Recalcular mensual desde días
DO $rollup$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT lead_id, (date_trunc('month', activity_date::timestamp))::date AS campaign_month
    FROM public.lead_temperature_daily
  LOOP
    PERFORM public.lead_temperature_rollup_month(r.lead_id, r.campaign_month);
  END LOOP;
END;
$rollup$;
