-- Reportes de IA (OpenAI) por archivo de documento de vehículo.

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_document_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.inventory_vehicle_document_files (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.inventory_vehicle_documents (id) ON DELETE CASCADE,
  inventoryoracle_id uuid REFERENCES public.inventoryoracle (id) ON DELETE SET NULL,
  doc_type text NOT NULL,
  placa text,
  model text NOT NULL,
  summary text NOT NULL,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality text NOT NULL,
  matches_plate boolean,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_vehicle_document_ai_reports_quality_chk
    CHECK (quality IN ('ok', 'blurry', 'cropped', 'wrong_document', 'unreadable'))
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_document_ai_reports_file_created_idx
  ON public.inventory_vehicle_document_ai_reports (file_id, created_at DESC);

ALTER TABLE public.inventory_vehicle_document_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_document_ai_reports_select_auth
  ON public.inventory_vehicle_document_ai_reports
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY inventory_vehicle_document_ai_reports_insert_auth
  ON public.inventory_vehicle_document_ai_reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.inventory_vehicle_document_ai_reports TO authenticated;
