-- Ownership of SATJE scraper jobs (one active consulta per user).

CREATE TABLE IF NOT EXISTS public.satje_consultas (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nombre text NOT NULL,
  cedula text,
  placa text,
  ruc text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT satje_consultas_status_chk
    CHECK (status IN ('pendiente', 'en_proceso', 'esperando_captcha', 'completada', 'error'))
);

CREATE INDEX IF NOT EXISTS satje_consultas_user_created_idx
  ON public.satje_consultas (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS satje_consultas_one_active_per_user
  ON public.satje_consultas (user_id)
  WHERE status IN ('pendiente', 'en_proceso', 'esperando_captcha');

ALTER TABLE public.satje_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY satje_consultas_select_own
  ON public.satje_consultas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY satje_consultas_insert_own
  ON public.satje_consultas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY satje_consultas_update_own
  ON public.satje_consultas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.satje_consultas TO authenticated;
