-- Bucket público dedicado a reels finales (preview UI, descarga, publicación en redes).
-- Los clips raw siguen en raw-videos-v2 (privado).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reels-v2',
  'reels-v2',
  true,
  2147483648,
  ARRAY['video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
