-- Quién creó el expediente / orden de taller (usuario logueado al recibir el vehículo).

ALTER TABLE public.taller_ordenes
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS taller_ordenes_created_by_idx
  ON public.taller_ordenes (created_by);

COMMENT ON COLUMN public.taller_ordenes.created_by IS
  'Usuario (profiles) que creó la orden en recepción.';
