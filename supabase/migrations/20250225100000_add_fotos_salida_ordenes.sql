-- Columna para URLs de fotos de evidencia de salida del vehículo
ALTER TABLE public.taller_ordenes
  ADD COLUMN IF NOT EXISTS fotos_salida_urls text[] NULL DEFAULT '{}';

COMMENT ON COLUMN public.taller_ordenes.fotos_salida_urls IS 'URLs de fotos de evidencia de cómo quedó el vehículo al salir (después del trabajo).';

-- Bucket para evidencia de salida (fotos del vehículo terminado)
-- Si ya existe, el INSERT fallará sin afectar la migración; créalo desde Dashboard si prefieres.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'taller-evidencias-salida',
  'taller-evidencias-salida',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket taller-evidencias-salida (evitar error si ya existen)
DROP POLICY IF EXISTS "Authenticated can upload evidencia salida" ON storage.objects;
CREATE POLICY "Authenticated can upload evidencia salida"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'taller-evidencias-salida');

DROP POLICY IF EXISTS "Public read evidencia salida" ON storage.objects;
CREATE POLICY "Public read evidencia salida"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'taller-evidencias-salida');

DROP POLICY IF EXISTS "Authenticated can delete evidencia salida" ON storage.objects;
CREATE POLICY "Authenticated can delete evidencia salida"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'taller-evidencias-salida');
