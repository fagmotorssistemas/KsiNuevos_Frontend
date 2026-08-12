-- Saltos de pasos del pipeline formal (Gestión Legal).
-- Schema real: cases / case_events (no legal_cases).
-- El progreso completado sigue inferiéndose de case_events.tipo
-- (no existe case_step_progress en este proyecto).

CREATE TABLE IF NOT EXISTS public.case_step_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  step_saltado VARCHAR(50) NOT NULL,
  step_ejecutado VARCHAR(50) NOT NULL,
  motivo VARCHAR(50) NOT NULL
    CHECK (motivo IN ('ya_hecho_antes', 'caso_urgente', 'cliente_inubicable', 'otro')),
  detalle_texto TEXT,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_step_skips_otro_detalle_chk
    CHECK (motivo <> 'otro' OR (detalle_texto IS NOT NULL AND length(trim(detalle_texto)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_case_step_skips_case_id
  ON public.case_step_skips (case_id);

CREATE INDEX IF NOT EXISTS idx_case_step_skips_created_at
  ON public.case_step_skips (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_step_skips_usuario_motivo
  ON public.case_step_skips (usuario_id, motivo);

ALTER TABLE public.case_step_skips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_step_skips_select_legal_staff ON public.case_step_skips;
CREATE POLICY case_step_skips_select_legal_staff
  ON public.case_step_skips
  FOR SELECT
  TO authenticated
  USING (public.is_legal_staff());

DROP POLICY IF EXISTS case_step_skips_insert_legal_staff ON public.case_step_skips;
CREATE POLICY case_step_skips_insert_legal_staff
  ON public.case_step_skips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_legal_staff()
    AND usuario_id = auth.uid()
  );

COMMENT ON TABLE public.case_step_skips IS
  'Auditoría de saltos de pasos formales (soft-skip). Bifurcación 4A/4B sigue con bloqueo duro por poder.';
