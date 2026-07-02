-- Flags manuales de contenido pendiente por vehículo en campaña

ALTER TABLE public.marketing_campaign_vehicles
  ADD COLUMN IF NOT EXISTS needs_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_photos boolean NOT NULL DEFAULT false;
