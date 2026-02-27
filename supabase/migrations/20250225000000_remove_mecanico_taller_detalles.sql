-- Eliminar columna mecanico_asignado_id de taller_detalles_orden
-- Primero se elimina la FK, luego la columna.

ALTER TABLE public.taller_detalles_orden
  DROP CONSTRAINT IF EXISTS taller_detalles_mecanico_fkey;

ALTER TABLE public.taller_detalles_orden
  DROP COLUMN IF EXISTS mecanico_asignado_id;
