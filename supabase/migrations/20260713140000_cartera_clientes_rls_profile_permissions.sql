-- RLS de cartera_clientes alineado a profile_permissions (toggle Mensajes de cartera).

CREATE OR REPLACE FUNCTION public.can_access_mensajes_cartera(p_action text DEFAULT 'read')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_profile_admin()
    OR public.has_any_profile_role(ARRAY['admin', 'finanzas', 'contable']::text[])
    OR EXISTS (
      SELECT 1
      FROM public.profile_permissions pp
      JOIN public.submodules s ON s.id = pp.submodule_id
      WHERE pp.profile_id = auth.uid()
        AND s.slug = 'mensajes-cartera'
        AND (
          (p_action = 'read' AND pp.can_read)
          OR (p_action = 'write' AND pp.can_write)
          OR (p_action = 'delete' AND pp.can_delete)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_mensajes_cartera(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_mensajes_cartera(text) TO authenticated;

DROP POLICY IF EXISTS cartera_clientes_finanzas_all ON public.cartera_clientes;
DROP POLICY IF EXISTS cartera_clientes_mensajes_rbac_all ON public.cartera_clientes;

CREATE POLICY cartera_clientes_mensajes_rbac_all
  ON public.cartera_clientes
  FOR ALL
  TO authenticated
  USING (public.can_access_mensajes_cartera('read'))
  WITH CHECK (public.can_access_mensajes_cartera('write'));
