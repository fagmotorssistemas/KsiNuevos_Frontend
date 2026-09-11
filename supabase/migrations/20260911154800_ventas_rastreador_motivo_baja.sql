-- Motivo de baja: retiro real vs confusión de IMEI (mismo dispositivo, no suma venta).

ALTER TABLE public.ventas_rastreador
  ADD COLUMN IF NOT EXISTS motivo_baja text;

ALTER TABLE public.ventas_rastreador
  DROP CONSTRAINT IF EXISTS ventas_rastreador_motivo_baja_check;

ALTER TABLE public.ventas_rastreador
  ADD CONSTRAINT ventas_rastreador_motivo_baja_check
  CHECK (
    motivo_baja IS NULL
    OR motivo_baja = ANY (ARRAY['RETIRO'::text, 'CONFUSION'::text])
  );

COMMENT ON COLUMN public.ventas_rastreador.motivo_baja IS
  'RETIRO: se quitó el aparato. CONFUSION: IMEI mal registrado; es el mismo dispositivo y el precio no debe sumar como otra venta.';
