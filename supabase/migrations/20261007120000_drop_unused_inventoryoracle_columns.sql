-- Columnas de inventoryoracle vacías en todas las filas y sin fuente de datos (ni Oracle ni ASIS).
-- Aplicar solo después de desplegar el frontend que ya no las consulta: si no, la web publicada
-- pide columnas inexistentes y PostgREST rechaza la consulta completa.
-- Los índices idx_ora_slug, idx_ora_features y la restricción inventoryoracle_slug_key se eliminan con sus columnas.

alter table public.inventoryoracle
  drop column if exists accident_history,
  drop column if exists aesthetic_condition,
  drop column if exists mechanical_condition,
  drop column if exists upholstery_type,
  drop column if exists doors_count,
  drop column if exists horse_power,
  drop column if exists cylinder_count,
  drop column if exists drive_type,
  drop column if exists engine_type,
  drop column if exists airbags_count,
  drop column if exists autonomy_km,
  drop column if exists steering_type,
  drop column if exists brake_type,
  drop column if exists brake_assistance,
  drop column if exists video_url,
  drop column if exists is_featured,
  drop column if exists features,
  drop column if exists specs,
  drop column if exists slug,
  drop column if exists marketing_stories_count;
