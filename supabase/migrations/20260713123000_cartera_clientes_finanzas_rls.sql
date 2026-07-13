-- Permitir a roles de contabilidad leer/actualizar cartera_clientes desde el frontend.
-- Antes estaba como backend-only (RLS sin políticas → 0 filas para authenticated).

ALTER TABLE public.cartera_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cartera_clientes_finanzas_all ON public.cartera_clientes;

CREATE POLICY cartera_clientes_finanzas_all
  ON public.cartera_clientes
  FOR ALL
  TO authenticated
  USING (
    public.has_any_profile_role(
      ARRAY['admin', 'finanzas', 'contable']::text[]
    )
  )
  WITH CHECK (
    public.has_any_profile_role(
      ARRAY['admin', 'finanzas', 'contable']::text[]
    )
  );
