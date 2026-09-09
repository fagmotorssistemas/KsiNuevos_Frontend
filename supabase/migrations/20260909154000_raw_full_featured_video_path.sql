-- Un video destacado por carpeta; la app limita a uno por vehículo.

ALTER TABLE public.raw_full_video_folders
  ADD COLUMN IF NOT EXISTS featured_video_path text;

COMMENT ON COLUMN public.raw_full_video_folders.featured_video_path IS
  'Ruta del video destacado en esta carpeta. Solo uno por carpeta; si hay vehículo, la app deja uno solo entre sus carpetas.';
