-- Segundo pase: job_name con año al final y match único en inventario (ej. Beetle 2019, Wingle 7 2021).

with job_only as (
  select
    id,
    lower(regexp_replace(trim(job_name), '\s+', ' ', 'g')) as jn
  from public.video_jobs_v2
  where flow_type is distinct from 'noticiero'
    and status = 'completed'
    and inventory_vehicle_id is null
    and job_name is not null
    and vehicle_line_1 is null
),
matches as (
  select
    jo.id as job_id,
    i.id as inv_id,
    count(*) over (partition by jo.id) as cnt
  from job_only jo
  inner join public.inventoryoracle i on (
    (
      jo.jn ~ ' [0-9]{4}$'
      and jo.jn = lower(regexp_replace(trim(i.model), '\s+', ' ', 'g') || ' ' || i.year::text)
    )
    or (
      jo.jn ~ ' [0-9]{4}$'
      and jo.jn = lower(regexp_replace(trim(i.brand || ' ' || i.model), '\s+', ' ', 'g') || ' ' || i.year::text)
    )
    or (
      jo.jn like '%wingle%7%'
      and lower(i.model) like '%wingle%7%'
      and i.year = (regexp_match(jo.jn, '([0-9]{4})$'))[1]::int
    )
    or (
      jo.jn like '%beetle%'
      and lower(i.model) like '%beetle%'
      and i.year = (regexp_match(jo.jn, '([0-9]{4})$'))[1]::int
    )
  )
),
resolved as (
  select distinct on (job_id) job_id, inv_id
  from matches
  where cnt = 1
  order by job_id, inv_id
)
update public.video_jobs_v2 j
set inventory_vehicle_id = r.inv_id
from resolved r
where j.id = r.job_id
  and j.inventory_vehicle_id is null;
