-- Estado de conexión por dispositivo en gps_inventario (online, inactivo, offline)
ALTER TABLE public.gps_inventario
  ADD COLUMN IF NOT EXISTS estado_coneccion text NULL
  CHECK (estado_coneccion IS NULL OR estado_coneccion IN ('online', 'inactivo', 'offline'));

COMMENT ON COLUMN public.gps_inventario.estado_coneccion IS 'Estado de conexión del dispositivo: online, inactivo, offline';
