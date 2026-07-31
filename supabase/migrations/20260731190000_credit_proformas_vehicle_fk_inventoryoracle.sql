-- Proformas apuntaban a inventory (legado); el cotizador usa inventoryoracle.
-- Autos solo en inventoryoracle hacían fallar el INSERT por FK.

UPDATE public.credit_proformas cp
SET vehicle_id = NULL
WHERE vehicle_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.inventoryoracle o WHERE o.id = cp.vehicle_id
  );

ALTER TABLE public.credit_proformas
  DROP CONSTRAINT IF EXISTS credit_proformas_vehicle_id_fkey;

ALTER TABLE public.credit_proformas
  ADD CONSTRAINT credit_proformas_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.inventoryoracle(id)
  ON DELETE SET NULL;
