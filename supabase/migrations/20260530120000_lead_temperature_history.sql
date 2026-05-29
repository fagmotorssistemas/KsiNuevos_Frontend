-- Rediseño: una sola tabla de historial mensual por cambio de temperatura en leads.
-- NO modifica datos de leads (solo SELECT en backfill + trigger AFTER UPDATE observador).

-- ---------------------------------------------------------------------------
-- Paso 1 — Eliminar triggers viejos
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_interested_cars_lead_temperature_daily ON public.interested_cars;
DROP TRIGGER IF EXISTS trg_leads_temperature_daily_sync ON public.leads;
DROP TRIGGER IF EXISTS trg_interested_cars_lead_temperature_monthly ON public.interested_cars;
DROP TRIGGER IF EXISTS trg_leads_temperature_monthly_sync ON public.leads;

-- ---------------------------------------------------------------------------
-- Paso 2 — Eliminar funciones viejas (y helpers de triggers obsoletos)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.trg_interested_cars_lead_temperature_daily() CASCADE;
DROP FUNCTION IF EXISTS public.trg_leads_temperature_daily_sync() CASCADE;
DROP FUNCTION IF EXISTS public.trg_interested_cars_lead_temperature_monthly() CASCADE;
DROP FUNCTION IF EXISTS public.trg_leads_temperature_monthly_sync() CASCADE;

DROP FUNCTION IF EXISTS public.lead_temperature_ensure_day_chapter(bigint, timestamptz);
DROP FUNCTION IF EXISTS public.lead_temperature_sync_day_from_lead(bigint, public.lead_temperature);
DROP FUNCTION IF EXISTS public.lead_temperature_rollup_month(bigint, date);

DROP FUNCTION IF EXISTS public.lead_temperature_ensure_month_chapter(bigint, timestamptz);
DROP FUNCTION IF EXISTS public.lead_temperature_sync_from_lead(bigint, public.lead_temperature);

-- ---------------------------------------------------------------------------
-- Paso 3 — Nueva tabla lead_temperature_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_temperature_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_month date NOT NULL,
  temperature public.lead_temperature NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_temperature_history_lead_month_key UNIQUE (lead_id, campaign_month),
  CONSTRAINT lead_temperature_history_campaign_month_first_day CHECK (
    campaign_month = (date_trunc('month', campaign_month::timestamp))::date
  )
);

COMMENT ON TABLE public.lead_temperature_history IS
  'Historial mensual de temperatura por lead. Una fila por lead+mes cuando hubo cambio (o backfill inicial).';
COMMENT ON COLUMN public.lead_temperature_history.campaign_month IS
  'Primer día del mes calendario Ecuador (YYYY-MM-01).';
COMMENT ON COLUMN public.lead_temperature_history.temperature IS
  'Última temperatura registrada ese mes tras un cambio en leads.temperature.';

CREATE INDEX IF NOT EXISTS idx_lead_temperature_history_month_temp
  ON public.lead_temperature_history (campaign_month, temperature);

CREATE INDEX IF NOT EXISTS idx_lead_temperature_history_lead_month
  ON public.lead_temperature_history (lead_id, campaign_month DESC);

ALTER TABLE public.lead_temperature_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_temperature_history_select ON public.lead_temperature_history;
CREATE POLICY lead_temperature_history_select ON public.lead_temperature_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_temperature_history.lead_id
        AND (l.assigned_to = auth.uid() OR public.is_admin_or_marketing())
    )
  );

DROP POLICY IF EXISTS lead_temperature_history_service_role ON public.lead_temperature_history;
CREATE POLICY lead_temperature_history_service_role ON public.lead_temperature_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Paso 4 — Backfill desde leads (SOLO SELECT, no modifica leads)
-- ---------------------------------------------------------------------------
INSERT INTO public.lead_temperature_history (lead_id, campaign_month, temperature, recorded_at)
SELECT
  l.id,
  (date_trunc('month', l.created_at AT TIME ZONE 'America/Guayaquil'))::date,
  COALESCE(l.temperature, 'frio'::public.lead_temperature),
  l.created_at
FROM public.leads l
ON CONFLICT (lead_id, campaign_month) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Paso 5 — Eliminar tablas viejas (después del backfill)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.lead_temperature_daily CASCADE;
DROP TABLE IF EXISTS public.lead_temperature_monthly CASCADE;

-- ---------------------------------------------------------------------------
-- Paso 6 — Trigger nuevo en leads (AFTER UPDATE, solo observa cambios)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_leads_temperature_history_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    v_month := (date_trunc('month', now() AT TIME ZONE 'America/Guayaquil'))::date;

    INSERT INTO public.lead_temperature_history (
      lead_id,
      campaign_month,
      temperature,
      recorded_at
    )
    VALUES (
      NEW.id,
      v_month,
      NEW.temperature,
      now()
    )
    ON CONFLICT (lead_id, campaign_month) DO UPDATE
    SET
      temperature = EXCLUDED.temperature,
      recorded_at = EXCLUDED.recorded_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_temperature_history_sync ON public.leads;

CREATE TRIGGER trg_leads_temperature_history_sync
  AFTER UPDATE OF temperature ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_leads_temperature_history_sync();
