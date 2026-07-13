-- Razón obligatoria cuando numero_cambiado = true

UPDATE public.cartera_clientes
SET razon_no_envio = 'Sin motivo registrado'
WHERE numero_cambiado = true
  AND (razon_no_envio IS NULL OR btrim(razon_no_envio) = '');

ALTER TABLE public.cartera_clientes
  DROP CONSTRAINT IF EXISTS cartera_clientes_razon_no_envio_chk;

ALTER TABLE public.cartera_clientes
  ADD CONSTRAINT cartera_clientes_razon_no_envio_chk
  CHECK (
    numero_cambiado = false
    OR (razon_no_envio IS NOT NULL AND btrim(razon_no_envio) <> '')
  );
