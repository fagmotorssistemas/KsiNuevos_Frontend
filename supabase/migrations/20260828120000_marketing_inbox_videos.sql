-- Bandeja general de material de marketing (sin asignar a vehículo/sección).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-inbox-videos',
  'marketing-inbox-videos',
  false,
  2147483648,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'video/avi'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS allow_all_marketing_inbox_videos ON storage.objects;
CREATE POLICY allow_all_marketing_inbox_videos
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'marketing-inbox-videos')
  WITH CHECK (bucket_id = 'marketing-inbox-videos');

CREATE TABLE IF NOT EXISTS public.marketing_inbox_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_inbox_videos_created_at_idx
  ON public.marketing_inbox_videos (created_at DESC);

ALTER TABLE public.marketing_inbox_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_inbox_videos_select_auth ON public.marketing_inbox_videos;
CREATE POLICY marketing_inbox_videos_select_auth
  ON public.marketing_inbox_videos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS marketing_inbox_videos_insert_auth ON public.marketing_inbox_videos;
CREATE POLICY marketing_inbox_videos_insert_auth
  ON public.marketing_inbox_videos
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS marketing_inbox_videos_update_auth ON public.marketing_inbox_videos;
CREATE POLICY marketing_inbox_videos_update_auth
  ON public.marketing_inbox_videos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS marketing_inbox_videos_delete_auth ON public.marketing_inbox_videos;
CREATE POLICY marketing_inbox_videos_delete_auth
  ON public.marketing_inbox_videos
  FOR DELETE TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_inbox_videos TO authenticated;
