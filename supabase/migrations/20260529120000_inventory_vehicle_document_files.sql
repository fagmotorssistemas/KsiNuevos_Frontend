-- Varios archivos por slot de documento (titulo, matricula, etc.)

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.inventory_vehicle_documents (id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_document_files_doc_idx
  ON public.inventory_vehicle_document_files (document_id);

-- Migrar archivos existentes del slot principal
INSERT INTO public.inventory_vehicle_document_files (
  document_id,
  file_path,
  file_url,
  file_name,
  mime_type,
  uploaded_by,
  created_at
)
SELECT
  id,
  file_path,
  file_url,
  COALESCE(file_name, 'documento'),
  mime_type,
  uploaded_by,
  updated_at
FROM public.inventory_vehicle_documents
WHERE file_url IS NOT NULL
  AND file_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_vehicle_document_files f
    WHERE f.document_id = inventory_vehicle_documents.id
  );

ALTER TABLE public.inventory_vehicle_document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_document_files_select_auth
  ON public.inventory_vehicle_document_files FOR SELECT TO authenticated USING (true);

CREATE POLICY inventory_vehicle_document_files_insert_auth
  ON public.inventory_vehicle_document_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY inventory_vehicle_document_files_update_auth
  ON public.inventory_vehicle_document_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY inventory_vehicle_document_files_delete_auth
  ON public.inventory_vehicle_document_files FOR DELETE TO authenticated USING (true);
