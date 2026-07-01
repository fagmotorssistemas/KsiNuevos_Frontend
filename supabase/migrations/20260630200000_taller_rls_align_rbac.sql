-- Taller: RLS alineado a profile_permissions del módulo (misma regla que la UI / middleware).

CREATE OR REPLACE FUNCTION public.can_access_taller_module(p_action text DEFAULT 'read')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_profile_admin()
    OR public.has_any_profile_role(ARRAY['taller']::text[])
    OR EXISTS (
      SELECT 1
      FROM public.profile_permissions pp
      JOIN public.submodules s ON s.id = pp.submodule_id
      JOIN public.modules m ON m.id = s.module_id
      WHERE pp.profile_id = auth.uid()
        AND m.slug = 'taller'
        AND (
          (p_action = 'read' AND pp.can_read)
          OR (p_action = 'write' AND pp.can_write)
          OR (p_action = 'delete' AND pp.can_delete)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_taller_module(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_taller_module(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._rls_apply_taller_rbac(p_table regclass, p_policy_prefix text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t text := p_table::text;
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_staff_all', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy_prefix || '_rbac_all', t);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO authenticated USING (public.can_access_taller_module(''read'')) WITH CHECK (public.can_access_taller_module(''write''))',
    p_policy_prefix || '_rbac_all',
    t
  );
END;
$$;

SELECT public._rls_apply_taller_rbac('public.taller_clientes'::regclass, 'taller_clientes');
SELECT public._rls_apply_taller_rbac('public.taller_personal'::regclass, 'taller_personal');
SELECT public._rls_apply_taller_rbac('public.taller_cuentas'::regclass, 'taller_cuentas');
SELECT public._rls_apply_taller_rbac('public.taller_transacciones'::regclass, 'taller_transacciones');
SELECT public._rls_apply_taller_rbac('public.taller_gastos_fijos'::regclass, 'taller_gastos_fijos');
SELECT public._rls_apply_taller_rbac('public.taller_gastos_pagos'::regclass, 'taller_gastos_pagos');
SELECT public._rls_apply_taller_rbac('public.taller_ordenes'::regclass, 'taller_ordenes');
SELECT public._rls_apply_taller_rbac('public.taller_proveedores'::regclass, 'taller_proveedores');
SELECT public._rls_apply_taller_rbac('public.taller_servicios_catalogo'::regclass, 'taller_servicios_catalogo');
SELECT public._rls_apply_taller_rbac('public.taller_consumos_materiales'::regclass, 'taller_consumos_materiales');
SELECT public._rls_apply_taller_rbac('public.taller_detalles_orden'::regclass, 'taller_detalles_orden');
SELECT public._rls_apply_taller_rbac('public.taller_inventario_items'::regclass, 'taller_inventario_items');

DROP FUNCTION IF EXISTS public._rls_apply_taller_rbac(regclass, text);
