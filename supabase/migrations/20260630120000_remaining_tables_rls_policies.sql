-- RLS para ~57 tablas restantes, alineado al acceso real del frontend Next.js.
-- Patrones:
--   • Catálogo web público: SELECT anon/authenticated en inventory(inventoryoracle) disponibles
--   • Staff por módulo: políticas authenticated con has_any_profile_role(...)
--   • Solo backend/automation: RLS activo sin políticas (service_role / n8n)

-- ---------------------------------------------------------------------------
-- Funciones helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rls_roles_staff()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'admin', 'vendedor', 'marketing', 'finanzas', 'contable', 'abogado', 'taller'
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_gps()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'vendedor', 'finanzas', 'contable']::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_taller()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'taller']::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_seguros()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'finanzas', 'contable']::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_marketing()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'marketing', 'contable']::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_scraper()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'marketing']::text[];
$$;

CREATE OR REPLACE FUNCTION public.rls_roles_ventas()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin', 'vendedor', 'marketing', 'finanzas', 'contable']::text[];
$$;

CREATE OR REPLACE FUNCTION public.has_any_profile_role(p_roles text[])
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
      AND lower(p.role::text) = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_profile_role(public.rls_roles_staff());
$$;

CREATE OR REPLACE FUNCTION public.is_public_catalog_vehicle(p_status public.car_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(p_status::text) = 'disponible';
$$;

REVOKE ALL ON FUNCTION public.rls_roles_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_gps() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_taller() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_seguros() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_marketing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_scraper() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_roles_ventas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_profile_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_public_catalog_vehicle(public.car_status) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rls_roles_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_gps() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_taller() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_seguros() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_marketing() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_scraper() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_roles_ventas() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_any_profile_role(text[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_public_catalog_vehicle(public.car_status) TO authenticated, anon;

-- Macro: políticas CRUD staff por roles
CREATE OR REPLACE FUNCTION public._rls_apply_staff_crud(
  p_table regclass,
  p_policy_prefix text,
  p_roles text[]
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t text := p_table::text;
  roles_literal text;
BEGIN
  SELECT string_agg(quote_literal(r), ', ')
    INTO roles_literal
  FROM unnest(p_roles) AS r;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_select', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_insert', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_update', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_delete', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_all', t);

  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO authenticated USING (public.has_any_profile_role(ARRAY[%s]::text[])) WITH CHECK (public.has_any_profile_role(ARRAY[%s]::text[]))',
    p_policy_prefix || '_all',
    t,
    roles_literal,
    roles_literal
  );
END;
$$;

-- Macro: solo RLS (backend / service_role)
CREATE OR REPLACE FUNCTION public._rls_enable_backend_only(p_table regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table::text);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grupo 3 — Catálogo / inventario (web pública + staff)
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventoryoracle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventoryoracle_select_public_catalog ON public.inventoryoracle;
DROP POLICY IF EXISTS inventoryoracle_staff_all ON public.inventoryoracle;

CREATE POLICY inventoryoracle_select_public_catalog
  ON public.inventoryoracle
  FOR SELECT
  TO anon, authenticated
  USING (public.is_public_catalog_vehicle(status));

CREATE POLICY inventoryoracle_staff_all
  ON public.inventoryoracle
  FOR ALL
  TO authenticated
  USING (public.is_authenticated_staff())
  WITH CHECK (public.is_authenticated_staff());

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_select_public_catalog ON public.inventory;
DROP POLICY IF EXISTS inventory_staff_all ON public.inventory;

CREATE POLICY inventory_select_public_catalog
  ON public.inventory
  FOR SELECT
  TO anon, authenticated
  USING (public.is_public_catalog_vehicle(status));

CREATE POLICY inventory_staff_all
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (public.is_authenticated_staff())
  WITH CHECK (public.is_authenticated_staff());

ALTER TABLE public.inventory_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_price_history_staff_all ON public.inventory_price_history;

CREATE POLICY inventory_price_history_staff_all
  ON public.inventory_price_history
  FOR ALL
  TO authenticated
  USING (public.is_authenticated_staff())
  WITH CHECK (public.is_authenticated_staff());

SELECT public._rls_apply_staff_crud('public.scraper_vehicles'::regclass, 'scraper_vehicles_staff', public.rls_roles_scraper());
SELECT public._rls_apply_staff_crud('public.scraper_vehicle_price_statistics'::regclass, 'scraper_vehicle_price_statistics_staff', public.rls_roles_scraper());
SELECT public._rls_apply_staff_crud('public.vehiculos'::regclass, 'vehiculos_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.concesionarias'::regclass, 'concesionarias_staff', public.rls_roles_gps());

SELECT public._rls_enable_backend_only('public.inventory_auto_publication'::regclass);
SELECT public._rls_enable_backend_only('public.scraper_sellers'::regclass);

-- ---------------------------------------------------------------------------
-- Grupo 1 — Datos críticos clientes / financieros
-- ---------------------------------------------------------------------------

SELECT public._rls_apply_staff_crud('public.clientes_externos'::regclass, 'clientes_externos_staff', public.rls_roles_gps());
SELECT public._rls_enable_backend_only('public.cartera_clientes'::regclass);
SELECT public._rls_apply_staff_crud('public.datos_solicitados_clientes'::regclass, 'datos_solicitados_clientes_staff', public.rls_roles_ventas());
SELECT public._rls_apply_staff_crud('public.taller_clientes'::regclass, 'taller_clientes_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_personal'::regclass, 'taller_personal_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_cuentas'::regclass, 'taller_cuentas_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_transacciones'::regclass, 'taller_transacciones_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_gastos_fijos'::regclass, 'taller_gastos_fijos_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_gastos_pagos'::regclass, 'taller_gastos_pagos_staff', public.rls_roles_taller());

ALTER TABLE public.credit_proformas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_proformas_staff_all ON public.credit_proformas;
CREATE POLICY credit_proformas_staff_all
  ON public.credit_proformas
  FOR ALL
  TO authenticated
  USING (public.has_any_profile_role(ARRAY['admin', 'vendedor', 'finanzas', 'contable']::text[]))
  WITH CHECK (public.has_any_profile_role(ARRAY['admin', 'vendedor', 'finanzas', 'contable']::text[]));

SELECT public._rls_apply_staff_crud('public.seguros_polizas'::regclass, 'seguros_polizas_staff', public.rls_roles_seguros());
SELECT public._rls_apply_staff_crud('public.asesoria_financiamiento'::regclass, 'asesoria_financiamiento_staff', public.rls_roles_ventas());
SELECT public._rls_apply_staff_crud('public.cuotas_rastreador'::regclass, 'cuotas_rastreador_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.ventas_rastreador'::regclass, 'ventas_rastreador_staff', public.rls_roles_gps());

-- ---------------------------------------------------------------------------
-- Grupo 2 — Operación interna / automatización
-- ---------------------------------------------------------------------------

SELECT public._rls_enable_backend_only('public.inventoryoracle_embeddings'::regclass);
SELECT public._rls_enable_backend_only('public.agent_prompts'::regclass);
SELECT public._rls_enable_backend_only('public.n8n_chat_histories'::regclass);
SELECT public._rls_enable_backend_only('public.pipeline_runs'::regclass);
SELECT public._rls_enable_backend_only('public.ctwa_clicks'::regclass);
SELECT public._rls_enable_backend_only('public.generated_artifacts'::regclass);
SELECT public._rls_enable_backend_only('public.templates'::regclass);
SELECT public._rls_enable_backend_only('public.script_vehicle_assignments_archive'::regclass);
SELECT public._rls_enable_backend_only('public.video_scripts_archive'::regclass);
SELECT public._rls_enable_backend_only('public.noticiero_config'::regclass);
SELECT public._rls_enable_backend_only('public.noticiero_history'::regclass);

ALTER TABLE public.capi_event_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capi_event_sync_log_marketing_select ON public.capi_event_sync_log;
CREATE POLICY capi_event_sync_log_marketing_select
  ON public.capi_event_sync_log
  FOR SELECT
  TO authenticated
  USING (public.has_any_profile_role(public.rls_roles_marketing()));

SELECT public._rls_apply_staff_crud('public.lead_recovery'::regclass, 'lead_recovery_staff', public.rls_roles_ventas());

-- meta_ad_vehicle_metrics: política existente (20260527120000)
ALTER TABLE public.meta_ad_vehicle_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_meta_ad_vehicle_metrics_marketing ON public.meta_ad_vehicle_metrics;
CREATE POLICY read_meta_ad_vehicle_metrics_marketing
  ON public.meta_ad_vehicle_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_any_profile_role(public.rls_roles_marketing()));

ALTER TABLE public.meta_ad_pause_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_meta_ad_pause_log_marketing ON public.meta_ad_pause_log;
CREATE POLICY read_meta_ad_pause_log_marketing
  ON public.meta_ad_pause_log
  FOR SELECT
  TO authenticated
  USING (public.has_any_profile_role(public.rls_roles_marketing()));

-- ---------------------------------------------------------------------------
-- Grupo 4 — GPS / talleres / aseguradoras
-- ---------------------------------------------------------------------------

SELECT public._rls_apply_staff_crud('public.gps_modelos'::regclass, 'gps_modelos_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.gps_inventario'::regclass, 'gps_inventario_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.gps_proveedores'::regclass, 'gps_proveedores_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.gps_sims'::regclass, 'gps_sims_staff', public.rls_roles_gps());
SELECT public._rls_apply_staff_crud('public.gps_instaladores'::regclass, 'gps_instaladores_staff', public.rls_roles_gps());

SELECT public._rls_apply_staff_crud('public.taller_ordenes'::regclass, 'taller_ordenes_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_proveedores'::regclass, 'taller_proveedores_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_servicios_catalogo'::regclass, 'taller_servicios_catalogo_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_consumos_materiales'::regclass, 'taller_consumos_materiales_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_detalles_orden'::regclass, 'taller_detalles_orden_staff', public.rls_roles_taller());
SELECT public._rls_apply_staff_crud('public.taller_inventario_items'::regclass, 'taller_inventario_items_staff', public.rls_roles_taller());

SELECT public._rls_apply_staff_crud('public.aseguradoras'::regclass, 'aseguradoras_staff', public.rls_roles_seguros());
SELECT public._rls_apply_staff_crud('public.brokers'::regclass, 'brokers_staff', public.rls_roles_seguros());

-- ---------------------------------------------------------------------------
-- Grupo 5 — Marketing / contenido social
-- ---------------------------------------------------------------------------

SELECT public._rls_apply_staff_crud('public.informative_posts'::regclass, 'informative_posts_staff', public.rls_roles_marketing());
SELECT public._rls_apply_staff_crud('public.interested_cars'::regclass, 'interested_cars_staff', public.rls_roles_ventas());
SELECT public._rls_enable_backend_only('public.social_weekly_publication'::regclass);

-- Limpiar helpers internos de migración
DROP FUNCTION IF EXISTS public._rls_apply_staff_crud(regclass, text, text[]);
DROP FUNCTION IF EXISTS public._rls_enable_backend_only(regclass);

-- Políticas legacy que anulaban las nuevas (RLS es OR entre políticas)
DROP POLICY IF EXISTS "Gestionar Inventario" ON public.inventory;
DROP POLICY IF EXISTS "Ver Inventario" ON public.inventory;
DROP POLICY IF EXISTS "Usuarios crean proformas" ON public.credit_proformas;
DROP POLICY IF EXISTS "Usuarios ven sus propias proformas" ON public.credit_proformas;
