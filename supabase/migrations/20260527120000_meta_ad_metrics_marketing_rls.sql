-- Lectura para dashboard marketing (mismo criterio que meta_video_metrics).

CREATE POLICY read_meta_ad_vehicle_metrics_marketing
  ON public.meta_ad_vehicle_metrics
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

CREATE POLICY read_meta_general_campaign_metrics_marketing
  ON public.meta_general_campaign_metrics
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
