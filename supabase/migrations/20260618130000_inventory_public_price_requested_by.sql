-- Vendedor que solicitó un precio público promocional (distinto al interno fijo).

ALTER TABLE public.inventoryoracle
  ADD COLUMN IF NOT EXISTS public_price_requested_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventoryoracle.public_price_requested_by IS
  'Perfil del vendedor que solicitó el precio público promocional.';
