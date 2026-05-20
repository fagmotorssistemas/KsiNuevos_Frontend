-- Bucket raw-videos-v2: hasta 2 GB por clip (requiere límite global de Storage ≥ tamaño del clip).
-- El límite global del proyecto se ajusta en Supabase Dashboard → Storage (recomendado 500 MB–2 GB).
UPDATE storage.buckets
SET
  file_size_limit = 2147483648,
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/avi',
    'video/webm',
    'video/x-matroska',
    'video/x-msvideo',
    'application/pdf'
  ]::text[]
WHERE id = 'raw-videos-v2';
