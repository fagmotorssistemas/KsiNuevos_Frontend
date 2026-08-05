-- Actualizar constraint flow_type para permitir 'raw_full'
ALTER TABLE public.video_jobs_v2 DROP CONSTRAINT IF EXISTS video_jobs_v2_flow_type_check;

ALTER TABLE public.video_jobs_v2 
  ADD CONSTRAINT video_jobs_v2_flow_type_check 
  CHECK (flow_type IN ('single', 'multiple', 'noticiero', 'raw_full'));
