-- Permite la categoría UI "consulta" (informes ANT/EMOV/CTE/AMT/SRI)
ALTER TABLE public.inventory_vehicle_documents
  DROP CONSTRAINT IF EXISTS inventory_vehicle_documents_category_check;

ALTER TABLE public.inventory_vehicle_documents
  ADD CONSTRAINT inventory_vehicle_documents_category_check
  CHECK (category IN ('legal', 'physical', 'consulta'));
