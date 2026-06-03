-- Overlays de marca K-SI en Reels (Shotstack). Todas opcionales; sin default.
ALTER TABLE video_jobs_v2
  ADD COLUMN IF NOT EXISTS show_brand_overlays boolean,
  ADD COLUMN IF NOT EXISTS vehicle_line_1      text,
  ADD COLUMN IF NOT EXISTS vehicle_line_2      text,
  ADD COLUMN IF NOT EXISTS vehicle_line_3      text,
  ADD COLUMN IF NOT EXISTS cta_text            text,
  ADD COLUMN IF NOT EXISTS whatsapp_number     text,
  ADD COLUMN IF NOT EXISTS logo_url            text,
  ADD COLUMN IF NOT EXISTS show_watermark      boolean;
