-- Expediente legal/comercial por vehículo (inventoryoracle)
-- Bucket: inventory-vehicle-documents

-- ---------------------------------------------------------------------------
-- Documentos (PDF / imagen)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  category text NOT NULL DEFAULT 'legal' CHECK (category IN ('legal', 'physical')),
  status text NOT NULL DEFAULT 'falta' CHECK (
    status IN (
      'falta',
      'pendiente',
      'cargado',
      'vigente',
      'vence_pronto',
      'aprobado',
      'sin_reportes',
      'completo'
    )
  ),
  detail_text text,
  expires_at date,
  file_path text,
  file_url text,
  file_name text,
  mime_type text,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventoryoracle_id, doc_type)
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_documents_vehicle_idx
  ON public.inventory_vehicle_documents (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- Multas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  fine_date date,
  location text,
  payer_notes text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagada', 'descontada', 'cancelada')),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_fines_vehicle_idx
  ON public.inventory_vehicle_fines (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- Otras deudas asociadas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  debt_type text NOT NULL CHECK (debt_type IN ('impuesto_predial', 'banco_financiera', 'dinardap', 'otro')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (
    status IN ('al_dia', 'pendiente', 'en_tramite', 'sin_reportes', 'con_deuda')
  ),
  amount numeric(14, 2),
  institution text,
  detail_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventoryoracle_id, debt_type)
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_debts_vehicle_idx
  ON public.inventory_vehicle_debts (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- Propietarios anteriores
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  id_number text,
  from_date date,
  to_date date,
  is_current boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_owners_vehicle_idx
  ON public.inventory_vehicle_owners (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- Eventos (ingreso inventario, revisión docs, consultas, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'otro',
  title text NOT NULL,
  description text,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'activo' CHECK (
    status IN ('activo', 'completado', 'parcial', 'pendiente', 'cancelado')
  ),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_events_vehicle_idx
  ON public.inventory_vehicle_events (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- Notas internas (no visibles al cliente)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_vehicle_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventoryoracle_id uuid NOT NULL REFERENCES public.inventoryoracle (id) ON DELETE CASCADE,
  author_name text NOT NULL,
  note_text text NOT NULL,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_vehicle_internal_notes_vehicle_idx
  ON public.inventory_vehicle_internal_notes (inventoryoracle_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at_inventory_vehicle_legal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_vehicle_documents',
    'inventory_vehicle_fines',
    'inventory_vehicle_debts',
    'inventory_vehicle_owners',
    'inventory_vehicle_events',
    'inventory_vehicle_internal_notes'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s',
      t,
      t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_inventory_vehicle_legal()',
      t,
      t
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS (usuarios autenticados del equipo)
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_vehicle_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_vehicle_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_vehicle_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_vehicle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_vehicle_internal_notes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'inventory_vehicle_documents',
    'inventory_vehicle_fines',
    'inventory_vehicle_debts',
    'inventory_vehicle_owners',
    'inventory_vehicle_events',
    'inventory_vehicle_internal_notes'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_select_auth ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_insert_auth ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_update_auth ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_delete_auth ON public.%I FOR DELETE TO authenticated USING (true)',
      tbl,
      tbl
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-vehicle-documents',
  'inventory-vehicle-documents',
  true,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY inventory_vehicle_documents_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-vehicle-documents');

CREATE POLICY inventory_vehicle_documents_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-vehicle-documents');

CREATE POLICY inventory_vehicle_documents_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inventory-vehicle-documents')
  WITH CHECK (bucket_id = 'inventory-vehicle-documents');

CREATE POLICY inventory_vehicle_documents_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventory-vehicle-documents');
