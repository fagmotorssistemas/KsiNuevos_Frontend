-- Hasta dos imágenes destacadas por vehículo; pueden estar en el mismo creativo.

ALTER TABLE public.inventory_vehicle_creatives
  ADD COLUMN IF NOT EXISTS featured_image_urls text[] NOT NULL DEFAULT '{}';

UPDATE public.inventory_vehicle_creatives
SET featured_image_urls = ARRAY[featured_image_url]
WHERE featured_image_url IS NOT NULL
  AND cardinality(featured_image_urls) = 0;

COMMENT ON COLUMN public.inventory_vehicle_creatives.featured_image_urls IS
  'URLs destacadas de este creativo. La app permite hasta dos destacadas entre los creativos del vehículo.';
