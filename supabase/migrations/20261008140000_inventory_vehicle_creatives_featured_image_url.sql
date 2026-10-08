-- Una imagen destacada por creativo; la app limita a una por vehículo.

ALTER TABLE public.inventory_vehicle_creatives
  ADD COLUMN IF NOT EXISTS featured_image_url text;

COMMENT ON COLUMN public.inventory_vehicle_creatives.featured_image_url IS
  'URL de la imagen destacada de este creativo. La app deja una sola destacada entre los creativos del vehículo.';
