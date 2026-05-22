-- Checklist de publicación por canal (Patio Tuerca, marketplace, web, ficha técnica)
ALTER TABLE public.inventoryoracle
  ADD COLUMN IF NOT EXISTS listing_checklist jsonb NOT NULL DEFAULT '{
    "patio_tuerca": false,
    "marketplace": false,
    "pagina_web": false,
    "ficha_tecnica": false
  }'::jsonb;

COMMENT ON COLUMN public.inventoryoracle.listing_checklist IS
  'Checklist: fotos/datos publicados por canal (patio_tuerca, marketplace, pagina_web, ficha_tecnica)';
