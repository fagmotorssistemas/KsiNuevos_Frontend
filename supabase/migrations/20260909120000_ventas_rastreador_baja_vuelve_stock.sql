-- Baja de rastreador: la venta queda como historial y el GPS vuelve a stock
-- para poder usarlo en otra venta.

ALTER TABLE public.ventas_rastreador
  ADD COLUMN IF NOT EXISTS estado_dispositivo text;

ALTER TABLE public.ventas_rastreador
  DROP CONSTRAINT IF EXISTS ventas_rastreador_estado_dispositivo_check;

ALTER TABLE public.ventas_rastreador
  ADD CONSTRAINT ventas_rastreador_estado_dispositivo_check
  CHECK (
    estado_dispositivo IS NULL
    OR estado_dispositivo = ANY (ARRAY['STOCK'::text, 'VENDIDO'::text, 'RMA'::text, 'BAJA'::text, 'INSTALADO'::text])
  );

COMMENT ON COLUMN public.ventas_rastreador.estado_dispositivo IS
  'Estado del dispositivo en esta venta. BAJA = retirado del cliente; la venta permanece como historial y el GPS puede reutilizarse.';

UPDATE public.ventas_rastreador v
SET estado_dispositivo = COALESCE(gi.estado, 'VENDIDO')
FROM public.gps_inventario gi
WHERE v.gps_id = gi.id
  AND v.estado_dispositivo IS NULL;

-- Si el GPS ya está en STOCK, esta venta se trata como baja histórica.
UPDATE public.ventas_rastreador v
SET estado_dispositivo = 'BAJA'
FROM public.gps_inventario gi
WHERE v.gps_id = gi.id
  AND gi.estado = 'STOCK'
  AND COALESCE(v.estado_dispositivo, '') <> 'BAJA';

-- Dispositivos dados de baja vuelven a stock.
UPDATE public.gps_inventario gi
SET estado = 'STOCK'
WHERE gi.estado = 'BAJA'
  AND EXISTS (
    SELECT 1
    FROM public.ventas_rastreador v
    WHERE v.gps_id = gi.id
      AND v.estado_dispositivo = 'BAJA'
  );

ALTER TABLE public.ventas_rastreador
  DROP CONSTRAINT IF EXISTS unique_gps_por_venta;

DROP INDEX IF EXISTS unique_gps_por_venta;

CREATE UNIQUE INDEX IF NOT EXISTS unique_gps_por_venta_activa
  ON public.ventas_rastreador (gps_id)
  WHERE gps_id IS NOT NULL
    AND COALESCE(estado_dispositivo, '') NOT IN ('BAJA', 'STOCK');
