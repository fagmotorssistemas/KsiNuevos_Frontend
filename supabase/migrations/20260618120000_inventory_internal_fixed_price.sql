-- Precio interno fijo + promo pública con reversión automática (solo disponibles).

ALTER TABLE public.inventoryoracle
  ADD COLUMN IF NOT EXISTS internal_fixed_price double precision,
  ADD COLUMN IF NOT EXISTS internal_fixed_price_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_price_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_price_change_reason text,
  ADD COLUMN IF NOT EXISTS public_price_reverts_at timestamptz;

COMMENT ON COLUMN public.inventoryoracle.internal_fixed_price IS
  'Precio interno de referencia (ventas). Se fija una vez; no es el precio promocional público.';
COMMENT ON COLUMN public.inventoryoracle.price IS
  'Precio público (web/cliente). Puede ser promocional y revertir al interno fijo.';

-- Backfill: copiar precio público al interno fijo (sin borrar price).
UPDATE public.inventoryoracle
SET
  internal_fixed_price = price,
  internal_fixed_price_set_at = COALESCE(internal_fixed_price_set_at, updated_at, created_at, now())
WHERE price IS NOT NULL
  AND price > 0
  AND internal_fixed_price IS NULL;

-- Alinear público = interno (mismo valor) y limpiar promos huérfanas en migración inicial.
UPDATE public.inventoryoracle
SET
  price = internal_fixed_price,
  public_price_changed_at = NULL,
  public_price_change_reason = NULL,
  public_price_reverts_at = NULL
WHERE internal_fixed_price IS NOT NULL
  AND internal_fixed_price > 0
  AND price IS DISTINCT FROM internal_fixed_price;

CREATE TABLE IF NOT EXISTS public.inventory_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  price_type text NOT NULL CHECK (price_type IN ('internal', 'public', 'auto_revert')),
  old_price double precision,
  new_price double precision,
  reason text,
  changed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_price_history_vehicle
  ON public.inventory_price_history (inventoryoracle_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventoryoracle_public_price_reverts
  ON public.inventoryoracle (public_price_reverts_at)
  WHERE public_price_reverts_at IS NOT NULL;
