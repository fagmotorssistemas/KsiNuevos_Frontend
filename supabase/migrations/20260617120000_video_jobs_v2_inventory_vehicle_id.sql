-- Relación formal video_jobs_v2 → inventoryoracle (reels por vehículo del inventario).
alter table public.video_jobs_v2
  add column if not exists inventory_vehicle_id uuid
  references public.inventoryoracle (id) on delete set null;

comment on column public.video_jobs_v2.inventory_vehicle_id is
  'Vehículo del inventario asociado al reel (match Assembly, selección manual o guión).';

create index if not exists video_jobs_v2_inventory_vehicle_id_idx
  on public.video_jobs_v2 (inventory_vehicle_id)
  where inventory_vehicle_id is not null;

-- Backfill desde selected_clips.vehicleId (pipeline V2) cuando el UUID existe en inventario.
update public.video_jobs_v2 j
set inventory_vehicle_id = (j.selected_clips->>'vehicleId')::uuid
where j.inventory_vehicle_id is null
  and j.selected_clips is not null
  and coalesce(j.selected_clips->>'_v2_pipeline_input', '') = 'true'
  and nullif(trim(j.selected_clips->>'vehicleId'), '') is not null
  and exists (
    select 1
    from public.inventoryoracle i
    where i.id = (j.selected_clips->>'vehicleId')::uuid
  );
