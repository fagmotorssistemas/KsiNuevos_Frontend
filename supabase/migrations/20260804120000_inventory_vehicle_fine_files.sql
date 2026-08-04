-- Adjuntos (PDF / imagen) por multa

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_fine_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_id uuid NOT NULL REFERENCES public.inventory_vehicle_fines (id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_fine_files_fine_idx
  ON public.inventory_vehicle_fine_files (fine_id);

ALTER TABLE public.inventory_vehicle_fine_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_vehicle_fine_files_select_auth
  ON public.inventory_vehicle_fine_files FOR SELECT TO authenticated USING (true);

CREATE POLICY inventory_vehicle_fine_files_insert_auth
  ON public.inventory_vehicle_fine_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY inventory_vehicle_fine_files_update_auth
  ON public.inventory_vehicle_fine_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY inventory_vehicle_fine_files_delete_auth
  ON public.inventory_vehicle_fine_files FOR DELETE TO authenticated USING (true);
