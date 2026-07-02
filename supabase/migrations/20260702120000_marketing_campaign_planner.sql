-- Planificador de campañas de marketing (grupos de vehículos por mes/categoría)

CREATE TABLE IF NOT EXISTS public.marketing_campaign_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_category text,
  campaign_month text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaign_groups_month_idx
  ON public.marketing_campaign_groups (campaign_month, sort_order);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.marketing_campaign_groups(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.inventoryoracle(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  video_status text NOT NULL DEFAULT 'pending'
    CHECK (video_status IN ('pending', 'done', 'needs_another')),
  price_snapshot double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_vehicles_group_inventory_unique UNIQUE (group_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_vehicles_group_idx
  ON public.marketing_campaign_vehicles (group_id, sort_order);

CREATE INDEX IF NOT EXISTS marketing_campaign_vehicles_inventory_idx
  ON public.marketing_campaign_vehicles (inventory_id);

CREATE OR REPLACE FUNCTION public.set_marketing_campaign_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_campaign_groups_updated_at ON public.marketing_campaign_groups;
CREATE TRIGGER marketing_campaign_groups_updated_at
  BEFORE UPDATE ON public.marketing_campaign_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_marketing_campaign_groups_updated_at();

ALTER TABLE public.marketing_campaign_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_vehicles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_marketing_campaigns()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role::text) = ANY (ARRAY['admin'::text, 'marketing'::text, 'contable'::text])
  );
$$;

CREATE POLICY read_marketing_campaign_groups
  ON public.marketing_campaign_groups
  FOR SELECT
  TO authenticated
  USING (public.can_manage_marketing_campaigns());

CREATE POLICY insert_marketing_campaign_groups
  ON public.marketing_campaign_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_marketing_campaigns());

CREATE POLICY update_marketing_campaign_groups
  ON public.marketing_campaign_groups
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_marketing_campaigns())
  WITH CHECK (public.can_manage_marketing_campaigns());

CREATE POLICY delete_marketing_campaign_groups
  ON public.marketing_campaign_groups
  FOR DELETE
  TO authenticated
  USING (public.can_manage_marketing_campaigns());

CREATE POLICY read_marketing_campaign_vehicles
  ON public.marketing_campaign_vehicles
  FOR SELECT
  TO authenticated
  USING (public.can_manage_marketing_campaigns());

CREATE POLICY insert_marketing_campaign_vehicles
  ON public.marketing_campaign_vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_marketing_campaigns());

CREATE POLICY update_marketing_campaign_vehicles
  ON public.marketing_campaign_vehicles
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_marketing_campaigns())
  WITH CHECK (public.can_manage_marketing_campaigns());

CREATE POLICY delete_marketing_campaign_vehicles
  ON public.marketing_campaign_vehicles
  FOR DELETE
  TO authenticated
  USING (public.can_manage_marketing_campaigns());
