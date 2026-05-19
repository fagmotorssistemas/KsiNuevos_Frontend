-- RBAC granular: módulos, submódulos, roles asignables, permisos y asignación por perfil.
-- Reemplaza can_access_taller / can_access_seguros por profile_roles + role_permissions.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.submodules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (module_id, slug)
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  base_role text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_base_role_chk CHECK (
    base_role IN (
      'admin',
      'vendedor',
      'cliente',
      'marketing',
      'finanzas',
      'contable',
      'abogado',
      'taller'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  submodule_id uuid NOT NULL REFERENCES public.submodules (id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (role_id, submodule_id)
);

CREATE TABLE IF NOT EXISTS public.profile_roles (
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, role_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS role_permissions_submodule_id_idx ON public.role_permissions (submodule_id);
CREATE INDEX IF NOT EXISTS profile_roles_role_id_idx ON public.profile_roles (role_id);
CREATE INDEX IF NOT EXISTS submodules_module_id_idx ON public.submodules (module_id);

-- ---------------------------------------------------------------------------
-- Datos: módulos y submódulos
-- ---------------------------------------------------------------------------

INSERT INTO public.modules (name, slug, sort_order) VALUES
  ('Ventas', 'ventas', 10),
  ('Taller', 'taller', 20),
  ('Finanzas', 'finanzas', 30),
  ('GPS / Rastreadores', 'gps', 40),
  ('Legal', 'legal', 50),
  ('Seguros', 'seguros', 60),
  ('Marketing', 'marketing', 70),
  ('Admin', 'admin', 80)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.submodules (module_id, name, slug, sort_order)
SELECT m.id, v.name, v.slug, v.ord
FROM public.modules m
JOIN (VALUES
  ('ventas', 'Leads y pipeline', 'leads-pipeline', 1),
  ('ventas', 'Inventario de vehículos', 'inventario-vehiculos', 2),
  ('ventas', 'Proformas de crédito', 'proformas-credito', 3),
  ('ventas', 'Solicitudes web', 'solicitudes-web', 4),
  ('ventas', 'Visitas showroom', 'visitas-showroom', 5),
  ('ventas', 'Tareas', 'tareas-ventas', 6),
  ('taller', 'Órdenes de trabajo', 'ordenes-trabajo', 1),
  ('taller', 'Clientes taller', 'clientes-taller', 2),
  ('taller', 'Inventario taller', 'inventario-taller', 3),
  ('taller', 'Proveedores', 'proveedores', 4),
  ('taller', 'Gastos y pagos', 'gastos-pagos', 5),
  ('taller', 'Personal', 'personal-taller', 6),
  ('finanzas', 'Cartera de clientes', 'cartera-clientes', 1),
  ('finanzas', 'Cartera manual', 'cartera-manual', 2),
  ('finanzas', 'Cuotas (PB)', 'cuotas-pb', 3),
  ('finanzas', 'Contratos (PB)', 'contratos-pb', 4),
  ('finanzas', 'Asesoría financiamiento', 'asesoria-financiamiento', 5),
  ('finanzas', 'Notas de ventas', 'notas-de-ventas', 6),
  ('finanzas', 'Dashboard', 'dashboard-finanzas', 7),
  ('finanzas', 'Personal', 'empleados-finanzas', 8),
  ('finanzas', 'Tesorería', 'tesoreria', 9),
  ('finanzas', 'Reporte de ventas', 'reporte-ventas', 10),
  ('finanzas', 'Movimientos / financiamiento', 'movimientos-financiamiento', 11),
  ('finanzas', 'Cobros', 'cobros', 12),
  ('finanzas', 'Pagos', 'pagos', 13),
  ('finanzas', 'Inventario (contable)', 'inventario-finanzas', 14),
  ('finanzas', 'Comprobantes', 'comprobantes', 15),
  ('finanzas', 'Facturación', 'billing-finanzas', 16),
  ('finanzas', 'Seguros (cartera)', 'seguros-cartera', 17),
  ('gps', 'Inventario GPS', 'inventario-gps', 1),
  ('gps', 'Ventas rastreador', 'ventas-rastreador', 2),
  ('gps', 'Cuotas rastreador', 'cuotas-rastreador', 3),
  ('gps', 'SIMs', 'sims', 4),
  ('legal', 'Casos', 'casos', 1),
  ('legal', 'Eventos de caso', 'eventos-caso', 2),
  ('legal', 'Tareas de caso', 'tareas-caso', 3),
  ('legal', 'Etapas de proceso', 'etapas-proceso', 4),
  ('seguros', 'Pólizas', 'polizas', 1),
  ('seguros', 'Aseguradoras', 'aseguradoras', 2),
  ('seguros', 'Brokers', 'brokers', 3),
  ('marketing', 'Publicaciones sociales', 'publicaciones-sociales', 1),
  ('marketing', 'Video automation', 'video-automation', 2),
  ('marketing', 'Blog posts', 'blog-posts', 3),
  ('marketing', 'Métricas de campaña', 'metricas-campana', 4),
  ('marketing', 'Plan de videos', 'plan-videos', 5),
  ('marketing', 'Scraper', 'scraper-marketing', 6),
  ('admin', 'Gestión de usuarios', 'gestion-usuarios', 1),
  ('admin', 'Agentes / prompts IA', 'agentes-prompts-ia', 2),
  ('admin', 'Configuración', 'configuracion', 3),
  ('admin', 'Permisos y roles', 'permisos-roles', 4),
  ('admin', 'Plantillas de documentos', 'plantillas-documentos', 5),
  ('admin', 'Monitoreo y reportes (panel)', 'monitoreo-reportes', 6),
  ('admin', 'Auditoría módulos Taller / Seguros', 'auditoria-modulos', 7),
  ('admin', 'Incidentes y soporte', 'incidentes-soporte', 8),
  ('admin', 'Copias de seguridad / exportación', 'backup-exportacion', 9),
  ('admin', 'API y webhooks', 'api-webhooks', 10)
) AS v(ms, name, slug, ord) ON m.slug = v.ms
ON CONFLICT (module_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Roles de sistema (slug estable para backfill)
-- ---------------------------------------------------------------------------

INSERT INTO public.roles (slug, name, base_role, description) VALUES
  ('admin-sistema', 'Administrador del sistema', 'admin', 'Acceso total vía permisos.'),
  ('vendedor-estandar', 'Vendedor estándar', 'vendedor', 'Módulo ventas y GPS.'),
  ('marketing-estandar', 'Marketing estándar', 'marketing', 'Módulo marketing.'),
  ('finanzas-estandar', 'Finanzas estándar', 'finanzas', 'Finanzas, seguros cartera y legal operativo.'),
  ('contable-estandar', 'Contador (finanzas)', 'contable', 'Finanzas sin taller ni módulo seguros pólizas.'),
  ('contable-extensiones', 'Contador (finanzas + taller/seguros)', 'contable', 'Finanzas + taller + seguros según submódulos.'),
  ('contable-limitado-notas', 'Contador (notas y contratos)', 'contable', 'Solo notas de ventas y contratos PB.'),
  ('abogado-estandar', 'Legal estándar', 'abogado', 'Legal + cartera lectura acotada.'),
  ('taller-estandar', 'Taller estándar', 'taller', 'Solo módulo taller.'),
  ('cliente-portal', 'Cliente portal', 'cliente', 'Sin permisos internos.')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Permisos: función auxiliar para rellenar por rol
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._grant_role_submodules(
  p_role_slug text,
  p_submodule_slugs text[],
  p_read boolean,
  p_write boolean,
  p_delete boolean
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rid uuid;
  s text;
  sid uuid;
BEGIN
  SELECT id INTO rid FROM public.roles WHERE slug = p_role_slug;
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado: %', p_role_slug;
  END IF;
  FOREACH s IN ARRAY p_submodule_slugs LOOP
    SELECT id INTO sid FROM public.submodules WHERE slug = s;
    IF sid IS NULL THEN
      RAISE WARNING 'Submódulo omitido (no existe slug): %', s;
      CONTINUE;
    END IF;
    INSERT INTO public.role_permissions (role_id, submodule_id, can_read, can_write, can_delete)
    VALUES (rid, sid, p_read, p_write, p_delete)
    ON CONFLICT (role_id, submodule_id) DO UPDATE SET
      can_read = EXCLUDED.can_read OR public.role_permissions.can_read,
      can_write = EXCLUDED.can_write OR public.role_permissions.can_write,
      can_delete = EXCLUDED.can_delete OR public.role_permissions.can_delete;
  END LOOP;
END;
$$;

-- Admin: todo
SELECT public._grant_role_submodules(
  'admin-sistema',
  ARRAY(SELECT slug FROM public.submodules),
  true, true, true
);

-- Vendedor: ventas + GPS + scraper (rastreadores)
SELECT public._grant_role_submodules('vendedor-estandar', ARRAY[
  'leads-pipeline','inventario-vehiculos','proformas-credito','solicitudes-web','visitas-showroom','tareas-ventas',
  'inventario-gps','ventas-rastreador','cuotas-rastreador','sims'
], true, true, true);

-- Marketing
SELECT public._grant_role_submodules('marketing-estandar', ARRAY[
  'publicaciones-sociales','video-automation','blog-posts','metricas-campana','plan-videos','scraper-marketing'
], true, true, true);

-- Finanzas: finanzas + seguros + legal (compatibilidad con rutas /legal para rol finanzas)
SELECT public._grant_role_submodules('finanzas-estandar', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera',
  'polizas','aseguradoras','brokers',
  'casos','eventos-caso','tareas-caso','etapas-proceso'
], true, true, true);

-- Contable estándar: todo finanzas, sin taller ni seguros (pólizas)
SELECT public._grant_role_submodules('contable-estandar', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera'
], true, true, true);

-- Contable extensiones: finanzas + taller + seguros
SELECT public._grant_role_submodules('contable-extensiones', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera',
  'ordenes-trabajo','clientes-taller','inventario-taller','proveedores','gastos-pagos','personal-taller',
  'polizas','aseguradoras','brokers'
], true, true, true);

-- Contable limitado (reemplaza lista de UUIDs en env): solo notas + contratos PB
SELECT public._grant_role_submodules('contable-limitado-notas', ARRAY[
  'notas-de-ventas','contratos-pb'
], true, true, false);

-- Abogado: legal + cartera oracle/manual lectura/escritura acotada (+ dashboard por layout contable)
SELECT public._grant_role_submodules('abogado-estandar', ARRAY[
  'casos','eventos-caso','tareas-caso','etapas-proceso',
  'cartera-clientes','cartera-manual','dashboard-finanzas'
], true, true, false);

-- Taller
SELECT public._grant_role_submodules('taller-estandar', ARRAY[
  'ordenes-trabajo','clientes-taller','inventario-taller','proveedores','gastos-pagos','personal-taller'
], true, true, true);

-- Cliente: sin permisos internos
SELECT public._grant_role_submodules('cliente-portal', ARRAY[]::text[], false, false, false);

DROP FUNCTION IF EXISTS public._grant_role_submodules(text, text[], boolean, boolean, boolean);

-- ---------------------------------------------------------------------------
-- Asignar rol por perfil (una fila por usuario)
-- ---------------------------------------------------------------------------

INSERT INTO public.profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.slug = CASE p.role::text
  WHEN 'admin' THEN 'admin-sistema'
  WHEN 'vendedor' THEN 'vendedor-estandar'
  WHEN 'marketing' THEN 'marketing-estandar'
  WHEN 'finanzas' THEN 'finanzas-estandar'
  WHEN 'abogado' THEN 'abogado-estandar'
  WHEN 'taller' THEN 'taller-estandar'
  WHEN 'cliente' THEN 'cliente-portal'
  WHEN 'contable' THEN CASE
    WHEN p.can_access_taller OR p.can_access_seguros THEN 'contable-extensiones'
    ELSE 'contable-estandar'
  END
  ELSE 'cliente-portal'
END
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RPC: permisos efectivos del usuario autenticado (OR entre roles asignados)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_effective_permissions()
RETURNS TABLE (
  submodule_slug text,
  can_read boolean,
  can_write boolean,
  can_delete boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.slug AS submodule_slug,
    bool_or(rp.can_read) AS can_read,
    bool_or(rp.can_write) AS can_write,
    bool_or(rp.can_delete) AS can_delete
  FROM public.profile_roles pr
  JOIN public.role_permissions rp ON rp.role_id = pr.role_id
  JOIN public.submodules s ON s.id = rp.submodule_id
  WHERE pr.profile_id = auth.uid()
  GROUP BY s.slug;
$$;

REVOKE ALL ON FUNCTION public.get_my_effective_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_effective_permissions() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;

-- Admin vía profiles.role
CREATE OR REPLACE FUNCTION public.is_profile_admin()
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
      AND p.role = 'admin'::public.user_role_enum
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;

-- modules
DROP POLICY IF EXISTS modules_select_auth ON public.modules;
CREATE POLICY modules_select_auth ON public.modules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS modules_write_admin ON public.modules;
CREATE POLICY modules_write_admin ON public.modules
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

-- submodules
DROP POLICY IF EXISTS submodules_select_auth ON public.submodules;
CREATE POLICY submodules_select_auth ON public.submodules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS submodules_write_admin ON public.submodules;
CREATE POLICY submodules_write_admin ON public.submodules
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

-- roles
DROP POLICY IF EXISTS roles_select_auth ON public.roles;
CREATE POLICY roles_select_auth ON public.roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS roles_write_admin ON public.roles;
CREATE POLICY roles_write_admin ON public.roles
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

-- role_permissions: lectura si el rol está asignado al usuario o admin
DROP POLICY IF EXISTS role_permissions_select_own_or_admin ON public.role_permissions;
CREATE POLICY role_permissions_select_own_or_admin ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_profile_admin()
    OR EXISTS (
      SELECT 1 FROM public.profile_roles pr
      WHERE pr.profile_id = auth.uid()
        AND pr.role_id = role_permissions.role_id
    )
  );

DROP POLICY IF EXISTS role_permissions_write_admin ON public.role_permissions;
CREATE POLICY role_permissions_write_admin ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

-- profile_roles
DROP POLICY IF EXISTS profile_roles_select_own_or_admin ON public.profile_roles;
CREATE POLICY profile_roles_select_own_or_admin ON public.profile_roles
  FOR SELECT TO authenticated
  USING (public.is_profile_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS profile_roles_write_admin ON public.profile_roles;
CREATE POLICY profile_roles_write_admin ON public.profile_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_profile_admin());

DROP POLICY IF EXISTS profile_roles_delete_admin ON public.profile_roles;
CREATE POLICY profile_roles_delete_admin ON public.profile_roles
  FOR DELETE TO authenticated
  USING (public.is_profile_admin());

-- ---------------------------------------------------------------------------
-- Grants API
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.submodules TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.profile_roles TO authenticated;

-- ---------------------------------------------------------------------------
-- Quitar columnas legacy de profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP COLUMN IF EXISTS can_access_taller;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS can_access_seguros;
