-- Gestión Legal vive en Cartera (/wallet). Quien tenga permiso de cartera
-- (o módulo legal) debe ver/escribir cases + case_events como el admin.
-- Antes is_legal_staff() solo miraba rol fijo (admin/abogado/finanzas)
-- y bloqueaba a usuarias con permiso RBAC (ej. Laura en cartera-clientes).

CREATE OR REPLACE FUNCTION public.is_legal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_profile_admin()
    OR lower(public.current_profile_role()) IN (
      'admin', 'abogado', 'abogada', 'finanzas', 'contable'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profile_permissions pp
      JOIN public.submodules s ON s.id = pp.submodule_id
      WHERE pp.profile_id = auth.uid()
        AND s.slug IN ('cartera-clientes', 'cartera-manual')
        AND (pp.can_read OR pp.can_write)
    )
    OR EXISTS (
      SELECT 1
      FROM public.profile_permissions pp
      JOIN public.submodules s ON s.id = pp.submodule_id
      JOIN public.modules m ON m.id = s.module_id
      WHERE pp.profile_id = auth.uid()
        AND m.slug = 'legal'
        AND (pp.can_read OR pp.can_write)
    );
$$;

REVOKE ALL ON FUNCTION public.is_legal_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_legal_staff() TO authenticated;

COMMENT ON FUNCTION public.is_legal_staff() IS
  'Acceso a cases/case_events: roles legales/finanzas O permiso RBAC cartera-clientes/cartera-manual O módulo legal.';
