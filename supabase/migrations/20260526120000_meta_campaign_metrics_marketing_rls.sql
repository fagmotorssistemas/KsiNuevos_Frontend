-- meta_campaign_metrics: RLS estaba activo sin política SELECT (dashboard veía 0 filas).
-- Misma regla que meta_video_metrics (admin, marketing, contable).

CREATE POLICY read_meta_campaign_metrics_marketing
  ON public.meta_campaign_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(p.role::text) = ANY (ARRAY['admin'::text, 'marketing'::text, 'contable'::text])
    )
  );
