-- Backfill inventory_vehicle_id en reels completados cuyo texto (vehicle_line_* o job_name)
-- coincide con un vehículo del inventario. Varios jobs pueden apuntar al mismo vehículo.
-- Desempate: preferir status disponible, luego created_at más antiguo.

with candidates as (
  select
    j.id as job_id,
    j.vehicle_line_1,
    j.vehicle_line_2,
    j.vehicle_line_4,
    j.job_name
  from public.video_jobs_v2 j
  where j.flow_type is distinct from 'noticiero'
    and j.status = 'completed'
    and j.inventory_vehicle_id is null
),
line_exact as (
  select distinct on (c.job_id)
    c.job_id,
    i.id as inv_id
  from candidates c
  inner join public.inventoryoracle i
    on lower(trim(i.brand)) = lower(trim(c.vehicle_line_1))
   and lower(trim(i.model)) = lower(trim(c.vehicle_line_2))
   and i.year = nullif(trim(c.vehicle_line_4), '')::int
  where c.vehicle_line_1 is not null
    and c.vehicle_line_2 is not null
    and c.vehicle_line_4 ~ '^[0-9]{4}$'
  order by
    c.job_id,
    case when i.status = 'disponible' then 0 else 1 end,
    i.created_at nulls last,
    i.id
),
line_partial as (
  select distinct on (c.job_id)
    c.job_id,
    i.id as inv_id
  from candidates c
  inner join public.inventoryoracle i
    on lower(trim(i.brand)) = lower(trim(c.vehicle_line_1))
   and i.year = nullif(trim(c.vehicle_line_4), '')::int
   and lower(trim(i.model)) like lower(trim(c.vehicle_line_2)) || '%'
  where c.job_id not in (select job_id from line_exact)
    and c.vehicle_line_1 is not null
    and c.vehicle_line_2 is not null
    and c.vehicle_line_4 ~ '^[0-9]{4}$'
  order by
    c.job_id,
    case when i.status = 'disponible' then 0 else 1 end,
    i.created_at nulls last,
    i.id
),
job_name_full as (
  select distinct on (c.job_id)
    c.job_id,
    i.id as inv_id
  from candidates c
  inner join public.inventoryoracle i
    on lower(trim(c.job_name)) = lower(trim(i.brand || ' ' || i.model || ' ' || i.year::text))
  where c.job_id not in (
      select job_id from line_exact
      union
      select job_id from line_partial
    )
    and nullif(trim(c.job_name), '') is not null
  order by
    c.job_id,
    case when i.status = 'disponible' then 0 else 1 end,
    i.created_at nulls last,
    i.id
),
resolved as (
  select job_id, inv_id from line_exact
  union all
  select job_id, inv_id from line_partial
  union all
  select job_id, inv_id from job_name_full
)
update public.video_jobs_v2 j
set inventory_vehicle_id = r.inv_id
from resolved r
where j.id = r.job_id
  and j.inventory_vehicle_id is null;
