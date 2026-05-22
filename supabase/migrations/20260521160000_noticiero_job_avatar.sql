-- Avatar y voz HeyGen elegidos por el usuario al crear el job
ALTER TABLE public.noticiero_jobs
  ADD COLUMN IF NOT EXISTS heygen_avatar_id text,
  ADD COLUMN IF NOT EXISTS heygen_voice_id text;

COMMENT ON COLUMN public.noticiero_jobs.heygen_avatar_id IS 'ID HeyGen del presentador (catálogo fijo del módulo noticiero)';
COMMENT ON COLUMN public.noticiero_jobs.heygen_voice_id IS 'ID HeyGen de la voz emparejada al presentador';
