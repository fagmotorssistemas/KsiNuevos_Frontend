-- Motivo de exclusión de mensajes automáticos de recuperación de cartera.
-- numero_cambiado = true → no enviar; razon_no_envio explica por qué.

ALTER TABLE public.cartera_clientes
  ADD COLUMN IF NOT EXISTS razon_no_envio text;

COMMENT ON COLUMN public.cartera_clientes.numero_cambiado IS
  'true = no enviar mensajes de recuperación de cartera (número cambiado u otra exclusión).';

COMMENT ON COLUMN public.cartera_clientes.razon_no_envio IS
  'Motivo por el cual no se deben enviar mensajes de recuperación. Usar cuando numero_cambiado = true.';

-- Razón obligatoria cuando el cliente está excluido de mensajes automáticos
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
