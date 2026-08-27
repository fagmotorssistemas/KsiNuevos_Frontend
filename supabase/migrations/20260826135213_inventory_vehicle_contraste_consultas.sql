-- Historial de consultas de contraste oficial (EcuadorAPI) por placa.

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_contraste_consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  inventoryoracle_id uuid REFERENCES public.inventoryoracle (id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  staff_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  coinciden integer NOT NULL DEFAULT 0,
  diferencias integer NOT NULL DEFAULT 0,
  sin_verificar integer NOT NULL DEFAULT 0,
  estado_general text NOT NULL,
  consulted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  consulted_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_vehicle_contraste_consultas_estado_chk
    CHECK (estado_general IN ('alineado', 'revision_requerida', 'sin_verificar'))
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_contraste_consultas_placa_created_idx
  ON public.inventory_vehicle_contraste_consultas (placa, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_vehicle_contraste_consultas_vehicle_created_idx
  ON public.inventory_vehicle_contraste_consultas (inventoryoracle_id, created_at DESC)
  WHERE inventoryoracle_id IS NOT NULL;

ALTER TABLE public.inventory_vehicle_contraste_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_contraste_consultas_select_auth
  ON public.inventory_vehicle_contraste_consultas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY inventory_vehicle_contraste_consultas_insert_auth
  ON public.inventory_vehicle_contraste_consultas
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.inventory_vehicle_contraste_consultas TO authenticated;
