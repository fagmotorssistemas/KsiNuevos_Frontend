-- Enlaza jobs de Reel con el guión estructurado de marketing (guion_escenas).
alter table public.video_jobs_v2
  add column if not exists video_script_id uuid references public.video_scripts (id) on delete set null;

create index if not exists video_jobs_v2_video_script_id_idx
  on public.video_jobs_v2 (video_script_id)
  where video_script_id is not null;

comment on column public.video_jobs_v2.video_script_id is
  'Guión de marketing detectado o asignado; subtítulos usan texto_pantalla con tiempos de AssemblyAI.';
