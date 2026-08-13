-- Observaciones previas a aperturar un caso legal (secundarias; no bloquean apertura).
-- Se ligan al cliente Oracle o a cartera_manual cuando aún no existe `cases`.

CREATE TABLE IF NOT EXISTS public.legal_precase_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sistema BIGINT,
  cartera_manual_id UUID REFERENCES public.cartera_manual(id) ON DELETE CASCADE,
  observacion TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_precase_notes_contexto_chk CHECK (
    (id_sistema IS NOT NULL AND cartera_manual_id IS NULL)
    OR (id_sistema IS NULL AND cartera_manual_id IS NOT NULL)
  ),
  CONSTRAINT legal_precase_notes_obs_chk CHECK (length(trim(observacion)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_legal_precase_notes_id_sistema
  ON public.legal_precase_notes (id_sistema, created_at DESC)
  WHERE id_sistema IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_precase_notes_cartera_manual
  ON public.legal_precase_notes (cartera_manual_id, created_at DESC)
  WHERE cartera_manual_id IS NOT NULL;

ALTER TABLE public.legal_precase_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_precase_notes_select ON public.legal_precase_notes;
CREATE POLICY legal_precase_notes_select
  ON public.legal_precase_notes
  FOR SELECT
  TO authenticated
  USING (public.is_legal_staff());

DROP POLICY IF EXISTS legal_precase_notes_insert ON public.legal_precase_notes;
CREATE POLICY legal_precase_notes_insert
  ON public.legal_precase_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_legal_staff()
    AND usuario_id = auth.uid()
  );

COMMENT ON TABLE public.legal_precase_notes IS
  'Notas/observaciones antes de aperturar caso legal. No bloquean la apertura.';
