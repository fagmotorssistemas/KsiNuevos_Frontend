-- Asesoría financiamiento: evidencias (archivos) asociadas a una gestión

CREATE TABLE IF NOT EXISTS public.asesoria_financiamiento_evidencia (
  id bigserial PRIMARY KEY,
  gestion_id bigint NOT NULL REFERENCES public.asesoria_financiamiento_gestion(id) ON DELETE CASCADE,

  -- Storage reference (storage.objects.name)
  storage_bucket text NOT NULL DEFAULT 'asesorias-financiamiento',
  storage_path text NOT NULL,

  file_name text NULL,
  mime_type text NULL,
  size_bytes bigint NULL,

  created_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT asesoria_fin_evidencia_unique_path UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_af_evidencia_gestion_id ON public.asesoria_financiamiento_evidencia(gestion_id);
CREATE INDEX IF NOT EXISTS idx_af_evidencia_created_at ON public.asesoria_financiamiento_evidencia(created_at DESC);

ALTER TABLE public.asesoria_financiamiento_evidencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Evidencia asesoria: admin o lead asignado" ON public.asesoria_financiamiento_evidencia;
CREATE POLICY "Evidencia asesoria: admin o lead asignado"
ON public.asesoria_financiamiento_evidencia
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.asesoria_financiamiento_gestion g
    JOIN public.asesoria_financiamiento af ON af.id = g.asesoria_id
    JOIN public.leads l ON l.id = af.lead_id
    WHERE g.id = asesoria_financiamiento_evidencia.gestion_id
      AND l.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.asesoria_financiamiento_gestion g
    JOIN public.asesoria_financiamiento af ON af.id = g.asesoria_id
    JOIN public.leads l ON l.id = af.lead_id
    WHERE g.id = asesoria_financiamiento_evidencia.gestion_id
      AND l.assigned_to = auth.uid()
  )
);

-- Bucket para evidencias (no público; acceso via policies sobre storage.objects)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asesorias-financiamiento',
  'asesorias-financiamiento',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Policies para storage.objects: restringir a carpeta del usuario y/o visibilidad por asignación de lead.
-- Nota: storage.objects.name incluye la ruta completa dentro del bucket.

DROP POLICY IF EXISTS "AsesoriasFin: authenticated can upload own folder" ON storage.objects;
CREATE POLICY "AsesoriasFin: authenticated can upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'asesorias-financiamiento'
  AND name LIKE (auth.uid()::text || '/%')
);

DROP POLICY IF EXISTS "AsesoriasFin: can read evidence by assignment" ON storage.objects;
CREATE POLICY "AsesoriasFin: can read evidence by assignment"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'asesorias-financiamiento'
  AND (
    -- Admin
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::public.user_role_enum
    )
    -- Dueño del path (subcarpeta del usuario)
    OR name LIKE (auth.uid()::text || '/%')
    -- O pertenece a evidencia de un lead asignado
    OR EXISTS (
      SELECT 1
      FROM public.asesoria_financiamiento_evidencia e
      JOIN public.asesoria_financiamiento_gestion g ON g.id = e.gestion_id
      JOIN public.asesoria_financiamiento af ON af.id = g.asesoria_id
      JOIN public.leads l ON l.id = af.lead_id
      WHERE e.storage_bucket = 'asesorias-financiamiento'
        AND e.storage_path = storage.objects.name
        AND l.assigned_to = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "AsesoriasFin: can delete own or assigned evidence" ON storage.objects;
CREATE POLICY "AsesoriasFin: can delete own or assigned evidence"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'asesorias-financiamiento'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::public.user_role_enum
    )
    OR name LIKE (auth.uid()::text || '/%')
    OR EXISTS (
      SELECT 1
      FROM public.asesoria_financiamiento_evidencia e
      JOIN public.asesoria_financiamiento_gestion g ON g.id = e.gestion_id
      JOIN public.asesoria_financiamiento af ON af.id = g.asesoria_id
      JOIN public.leads l ON l.id = af.lead_id
      WHERE e.storage_bucket = 'asesorias-financiamiento'
        AND e.storage_path = storage.objects.name
        AND l.assigned_to = auth.uid()
    )
  )
);

