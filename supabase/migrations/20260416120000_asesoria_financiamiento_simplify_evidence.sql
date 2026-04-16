-- Simplificación evidencia asesoría:
-- Guardar URLs directamente en `public.asesoria_financiamiento_gestion`
-- (mantener tabla asesoria_financiamiento_evidencia existente, pero dejar de usarla).

ALTER TABLE public.asesoria_financiamiento_gestion
  ADD COLUMN IF NOT EXISTS pdf_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Bucket público para poder guardar URLs permanentes (getPublicUrl)
-- Nota: si prefieres bucket privado con URLs firmadas, NO pongas esto en true.
UPDATE storage.buckets
SET public = true
WHERE id = 'asesorias-financiamiento';

-- Lectura pública para el bucket (solo este bucket)
DROP POLICY IF EXISTS "AsesoriasFin: public read" ON storage.objects;
CREATE POLICY "AsesoriasFin: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'asesorias-financiamiento');

