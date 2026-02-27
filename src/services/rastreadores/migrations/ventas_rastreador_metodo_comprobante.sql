-- =============================================================================
-- 1. MÉTODO DE PAGO Y COMPROBANTE (ventas_rastreador) - OPCIÓN B CON ENUM
-- =============================================================================

CREATE TYPE public.metodo_pago_rastreador_enum AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'CHEQUE');

ALTER TABLE public.ventas_rastreador
  ADD COLUMN IF NOT EXISTS metodo_pago public.metodo_pago_rastreador_enum NULL,
  ADD COLUMN IF NOT EXISTS url_comprobante_pago text NULL;

COMMENT ON COLUMN public.ventas_rastreador.url_comprobante_pago IS 'URL del comprobante (foto cheque, captura transferencia, comprobante depósito)';


-- =============================================================================
-- 2. VENTA A CONCESIONARIA: tabla concesionarias + columnas cliente final
-- =============================================================================

-- Tabla de concesionarias (a quién le vendemos nosotros)
CREATE TABLE IF NOT EXISTS public.concesionarias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ruc text NOT NULL,
  direccion text NULL,
  telefono text NULL,
  email text NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT concesionarias_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS concesionarias_ruc_key ON public.concesionarias (ruc);

COMMENT ON TABLE public.concesionarias IS 'Concesionarias o puntos de venta a los que se vende rastreadores (B2B)';

-- En dispositivos_rastreo ya pueden existir es_concesionaria y nombre_concesionaria.
-- Añadimos FK a concesionarias y datos del cliente final (a quién venderá la concesionaria).
ALTER TABLE public.dispositivos_rastreo
  ADD COLUMN IF NOT EXISTS concesionaria_id uuid NULL,
  ADD COLUMN IF NOT EXISTS cliente_final_nombre text NULL,
  ADD COLUMN IF NOT EXISTS cliente_final_identificacion text NULL,
  ADD COLUMN IF NOT EXISTS cliente_final_telefono text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_dispositivo_concesionaria'
  ) THEN
    ALTER TABLE public.dispositivos_rastreo
      ADD CONSTRAINT fk_dispositivo_concesionaria
      FOREIGN KEY (concesionaria_id) REFERENCES public.concesionarias (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.dispositivos_rastreo.concesionaria_id IS 'Venta a concesionaria: referencia a concesionarias';
COMMENT ON COLUMN public.dispositivos_rastreo.cliente_final_nombre IS 'Nombre del cliente final a quien la concesionaria venderá el equipo';
COMMENT ON COLUMN public.dispositivos_rastreo.cliente_final_identificacion IS 'Cédula/RUC del cliente final';
COMMENT ON COLUMN public.dispositivos_rastreo.cliente_final_telefono IS 'Teléfono del cliente final';
