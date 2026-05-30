-- Registro de actividad por slot de documento (auditoría admin)

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_document_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.inventory_vehicle_documents (id) ON DELETE CASCADE,
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  action text NOT NULL CHECK (
    action IN ('upload', 'delete_file', 'update_meta', 'update_status')
  ),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_name text,
  file_name text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_document_activity_doc_idx
  ON public.inventory_vehicle_document_activity (document_id, created_at DESC);

ALTER TABLE public.inventory_vehicle_document_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_document_activity_select_admin
  ON public.inventory_vehicle_document_activity FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY inventory_vehicle_document_activity_insert_auth
  ON public.inventory_vehicle_document_activity FOR INSERT TO authenticated
  WITH CHECK (true);
