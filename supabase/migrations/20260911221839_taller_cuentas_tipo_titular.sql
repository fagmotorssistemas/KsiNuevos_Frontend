-- Datos bancarios de cuentas del taller: tipo (ahorro/corriente) y titular.
-- nombre_cuenta pasa a usarse como entidad financiera; numero_cuenta es el número de cuenta.

ALTER TABLE public.taller_cuentas
  ADD COLUMN IF NOT EXISTS tipo_cuenta text,
  ADD COLUMN IF NOT EXISTS nombre_titular text;

ALTER TABLE public.taller_cuentas
  DROP CONSTRAINT IF EXISTS taller_cuentas_tipo_cuenta_check;

ALTER TABLE public.taller_cuentas
  ADD CONSTRAINT taller_cuentas_tipo_cuenta_check
  CHECK (tipo_cuenta IS NULL OR tipo_cuenta IN ('ahorro', 'corriente'));

COMMENT ON COLUMN public.taller_cuentas.tipo_cuenta IS
  'Tipo de cuenta bancaria: ahorro o corriente. Nulo para caja chica.';
COMMENT ON COLUMN public.taller_cuentas.nombre_titular IS
  'Nombre del titular de la cuenta bancaria.';
COMMENT ON COLUMN public.taller_cuentas.nombre_cuenta IS
  'Entidad financiera (banco) o nombre de la caja chica.';
COMMENT ON COLUMN public.taller_cuentas.numero_cuenta IS
  'Número de cuenta bancaria. Obligatorio en UI para cuentas que no son caja chica.';
