-- Conteos manuales de reels y posts por vehículo en campaña (los llena marketing, no inventario).

ALTER TABLE public.marketing_campaign_vehicles
  ADD COLUMN IF NOT EXISTS reels_count integer NOT NULL DEFAULT 0 CHECK (reels_count >= 0),
  ADD COLUMN IF NOT EXISTS posts_count integer NOT NULL DEFAULT 0 CHECK (posts_count >= 0);
