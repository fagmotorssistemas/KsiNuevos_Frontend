-- Aplicado vía Supabase MCP (proyecto KsiNuevos_Web). Reproducible en otros entornos.
-- Flujo publicación redes (VIDEOS V2)

ALTER TABLE public.video_jobs_v2
  ADD COLUMN IF NOT EXISTS social_publish_stage text;

DO $$ BEGIN
  ALTER TABLE public.video_jobs_v2
    ADD CONSTRAINT video_jobs_v2_social_publish_stage_check
    CHECK (
      social_publish_stage IS NULL
      OR social_publish_stage IN ('generado', 'aprobado', 'programado', 'publicado', 'fallido')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.video_jobs_v2
SET social_publish_stage = 'generado'
WHERE status = 'completed' AND social_publish_stage IS NULL;

CREATE OR REPLACE FUNCTION public.update_video_publishing_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.video_publishing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.video_jobs_v2(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.inventoryoracle(id) ON DELETE SET NULL,
  caption text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  platforms text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_publishing_queue_status_check
    CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
  CONSTRAINT video_publishing_queue_platforms_nonempty
    CHECK (array_length(platforms, 1) IS NOT NULL AND array_length(platforms, 1) >= 1)
);

CREATE INDEX IF NOT EXISTS video_publishing_queue_due_pending_idx
  ON public.video_publishing_queue (scheduled_at)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_video_publishing_queue_updated_at ON public.video_publishing_queue;
CREATE TRIGGER trg_video_publishing_queue_updated_at
  BEFORE UPDATE ON public.video_publishing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_publishing_queue_updated_at();

CREATE TABLE IF NOT EXISTS public.video_publishing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.video_publishing_queue(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text NOT NULL,
  platform_post_id text,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_publishing_results_platform_check
    CHECK (platform IN ('instagram', 'facebook')),
  CONSTRAINT video_publishing_results_status_check
    CHECK (status IN ('published', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS video_publishing_results_queue_platform_uidx
  ON public.video_publishing_results (queue_id, platform);

ALTER TABLE public.video_publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_publishing_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_video_publishing_queue ON public.video_publishing_queue;
CREATE POLICY allow_all_video_publishing_queue
  ON public.video_publishing_queue FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_video_publishing_results ON public.video_publishing_results;
CREATE POLICY allow_all_video_publishing_results
  ON public.video_publishing_results FOR ALL
  USING (true) WITH CHECK (true);
