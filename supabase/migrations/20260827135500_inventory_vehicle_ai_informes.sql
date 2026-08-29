-- Informes IA a nivel de vehículo (todas las secciones).

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_ai_informes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid REFERENCES public.inventoryoracle (id) ON DELETE SET NULL,
  placa text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_ai_informes_placa_created_idx
  ON public.inventory_vehicle_ai_informes (placa, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_vehicle_ai_informes_vehicle_created_idx
  ON public.inventory_vehicle_ai_informes (inventoryoracle_id, created_at DESC)
  WHERE inventoryoracle_id IS NOT NULL;

ALTER TABLE public.inventory_vehicle_ai_informes ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_ai_informes_select_auth
  ON public.inventory_vehicle_ai_informes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY inventory_vehicle_ai_informes_insert_auth
  ON public.inventory_vehicle_ai_informes
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.inventory_vehicle_ai_informes TO authenticated;
