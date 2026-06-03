-- Año / badge en overlays de marca (línea 4).
ALTER TABLE video_jobs_v2
  ADD COLUMN IF NOT EXISTS vehicle_line_4 text;
