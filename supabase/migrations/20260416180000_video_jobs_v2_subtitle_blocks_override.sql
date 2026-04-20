-- Subtítulos editados manualmente (corrección AssemblyAI) para re-renders sin re-transcribir.
alter table public.video_jobs_v2
  add column if not exists subtitle_blocks_override jsonb null;

comment on column public.video_jobs_v2.subtitle_blocks_override is
  'Bloques de subtítulo (misma forma que SubtitleBlock[] en código). Si no es null, el re-render usa estos textos/tiempos en lugar de recalcular desde segment_map.';
