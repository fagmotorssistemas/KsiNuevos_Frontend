alter table public.video_jobs_v2
  add column if not exists is_featured boolean not null default false;

comment on column public.video_jobs_v2.is_featured is
  'Reel destacado del vehículo: solo uno por inventory_vehicle_id.';

create unique index if not exists video_jobs_v2_one_featured_per_vehicle_idx
  on public.video_jobs_v2 (inventory_vehicle_id)
  where is_featured = true and inventory_vehicle_id is not null;
