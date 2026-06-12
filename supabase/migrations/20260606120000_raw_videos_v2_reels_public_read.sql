-- Lectura pública de reels finales en raw-videos-v2 (bucket privado para el resto).
-- Permite preview en UI, descarga y publicación en Instagram/Facebook vía URL estable.
CREATE POLICY raw_videos_v2_reels_public_read
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'raw-videos-v2'
    AND name LIKE 'reels/%'
  );
