-- RBAC simplificado: un permiso = acceso al submódulo (can_read; write/delete se sincronizan).
-- Reasigna permisos por rol según módulos de negocio acordados.

CREATE OR REPLACE FUNCTION public._grant_access(
  p_role_slug text,
  p_submodule_slugs text[],
  p_access boolean
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
    VALUES (rid, sid, p_access, p_access, p_access)
    ON CONFLICT (role_id, submodule_id) DO UPDATE SET
      can_read = EXCLUDED.can_read,
      can_write = EXCLUDED.can_write,
      can_delete = EXCLUDED.can_delete;
  END LOOP;
END;
$$;

-- Limpiar permisos de roles de sistema (no admin-sistema) y re-aplicar
DELETE FROM public.role_permissions rp
USING public.roles r
WHERE rp.role_id = r.id
  AND r.slug IN (
    'vendedor-estandar',
    'marketing-estandar',
    'finanzas-estandar',
    'contable-estandar',
    'contable-extensiones',
    'contable-limitado-notas',
    'abogado-estandar',
    'taller-estandar',
    'cliente-portal'
  );

-- Submódulos por módulo (catálogo)
-- ventas
SELECT public._grant_access('vendedor-estandar', ARRAY[
  'leads-pipeline','inventario-vehiculos','proformas-credito','solicitudes-web','visitas-showroom','tareas-ventas'
], true);
-- gps / rastreadores
SELECT public._grant_access('vendedor-estandar', ARRAY[
  'inventario-gps','ventas-rastreador','cuotas-rastreador','sims'
], true);

-- finanzas: contabilidad + legal + rastreador + seguros
SELECT public._grant_access('finanzas-estandar', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera',
  'casos','eventos-caso','tareas-caso','etapas-proceso',
  'inventario-gps','ventas-rastreador','cuotas-rastreador','sims',
  'polizas','aseguradoras','brokers'
], true);

-- contable estándar: contabilidad + rastreadores (sin taller ni pólizas app)
SELECT public._grant_access('contable-estandar', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera',
  'inventario-gps','ventas-rastreador','cuotas-rastreador','sims'
], true);

-- contable extensiones: lo anterior + taller + seguros pólizas
SELECT public._grant_access('contable-extensiones', ARRAY[
  'cartera-clientes','cartera-manual','cuotas-pb','contratos-pb','asesoria-financiamiento','notas-de-ventas',
  'dashboard-finanzas','empleados-finanzas','tesoreria','reporte-ventas','movimientos-financiamiento',
  'cobros','pagos','inventario-finanzas','comprobantes','billing-finanzas','seguros-cartera',
  'inventario-gps','ventas-rastreador','cuotas-rastreador','sims',
  'ordenes-trabajo','clientes-taller','inventario-taller','proveedores','gastos-pagos','personal-taller',
  'polizas','aseguradoras','brokers'
], true);

-- contable limitado
SELECT public._grant_access('contable-limitado-notas', ARRAY[
  'notas-de-ventas','contratos-pb'
], true);

-- marketing: marketing + ventas + monitoreo (sin scraper)
SELECT public._grant_access('marketing-estandar', ARRAY[
  'publicaciones-sociales','video-automation','blog-posts','metricas-campana','plan-videos',
  'leads-pipeline','inventario-vehiculos','proformas-credito','solicitudes-web','visitas-showroom','tareas-ventas',
  'monitoreo-reportes'
], true);

-- taller
SELECT public._grant_access('taller-estandar', ARRAY[
  'ordenes-trabajo','clientes-taller','inventario-taller','proveedores','gastos-pagos','personal-taller'
], true);

-- abogado: contabilidad (cartera) + legal
SELECT public._grant_access('abogado-estandar', ARRAY[
  'cartera-clientes','cartera-manual','dashboard-finanzas',
  'casos','eventos-caso','tareas-caso','etapas-proceso'
], true);

SELECT public._grant_access('cliente-portal', ARRAY[]::text[], false);

-- admin-sistema: todos los submódulos con acceso
INSERT INTO public.role_permissions (role_id, submodule_id, can_read, can_write, can_delete)
SELECT r.id, s.id, true, true, true
FROM public.roles r
CROSS JOIN public.submodules s
WHERE r.slug = 'admin-sistema'
ON CONFLICT (role_id, submodule_id) DO UPDATE SET
  can_read = true,
  can_write = true,
  can_delete = true;

-- Sincronizar profile_roles desde profiles.role (idempotente)
INSERT INTO public.profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.slug = CASE p.role::text
  WHEN 'admin' THEN 'admin-sistema'
  WHEN 'vendedor' THEN 'vendedor-estandar'
  WHEN 'marketing' THEN 'marketing-estandar'
  WHEN 'finanzas' THEN 'finanzas-estandar'
  WHEN 'abogado' THEN 'abogado-estandar'
  WHEN 'abogada' THEN 'abogado-estandar'
  WHEN 'taller' THEN 'taller-estandar'
  WHEN 'cliente' THEN 'cliente-portal'
  WHEN 'contable' THEN 'contable-estandar'
  ELSE 'cliente-portal'
END
ON CONFLICT (profile_id, role_id) DO NOTHING;

DROP FUNCTION IF EXISTS public._grant_access(text, text[], boolean);
