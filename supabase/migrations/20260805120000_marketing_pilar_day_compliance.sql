-- Cumplimiento diario del plan de pilares (Guiones V2)
CREATE TABLE IF NOT EXISTS public.marketing_pilar_day_compliance (
  fecha date PRIMARY KEY,
  percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (percent >= 0 AND percent <= 100),
  expected_count integer NOT NULL DEFAULT 0,
  guion_ready_count integer NOT NULL DEFAULT 0,
  video_evidence_count integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_pilar_day_compliance_computed_at_idx
  ON public.marketing_pilar_day_compliance (computed_at DESC);

CREATE OR REPLACE FUNCTION public.set_marketing_pilar_day_compliance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_pilar_day_compliance_updated_at
  ON public.marketing_pilar_day_compliance;
CREATE TRIGGER marketing_pilar_day_compliance_updated_at
  BEFORE UPDATE ON public.marketing_pilar_day_compliance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_marketing_pilar_day_compliance_updated_at();

ALTER TABLE public.marketing_pilar_day_compliance ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_pilar_compliance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) = ANY (ARRAY['admin'::text, 'marketing'::text, 'contable'::text])
  );
$$;

DROP POLICY IF EXISTS read_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance;
CREATE POLICY read_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance
  FOR SELECT
  TO authenticated
  USING (public.can_manage_pilar_compliance());

DROP POLICY IF EXISTS insert_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance;
CREATE POLICY insert_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_pilar_compliance());

DROP POLICY IF EXISTS update_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance;
CREATE POLICY update_marketing_pilar_day_compliance
  ON public.marketing_pilar_day_compliance
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_pilar_compliance())
  WITH CHECK (public.can_manage_pilar_compliance());

GRANT SELECT, INSERT, UPDATE ON public.marketing_pilar_day_compliance TO authenticated;
