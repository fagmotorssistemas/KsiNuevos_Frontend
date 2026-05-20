-- Admin: leer todos los perfiles y RPC de panel RBAC

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_profile_admin() OR id = auth.uid());

DROP POLICY IF EXISTS profile_roles_select_admin ON public.profile_roles;
CREATE POLICY profile_roles_select_admin ON public.profile_roles
  FOR SELECT TO authenticated
  USING (public.is_profile_admin() OR profile_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_rbac_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT jsonb_build_object(
    'modules',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'name', m.name,
          'slug', m.slug,
          'sort_order', m.sort_order,
          'submodules', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'module_id', s.module_id,
                'name', s.name,
                'slug', s.slug,
                'sort_order', s.sort_order
              ) ORDER BY s.sort_order
            )
            FROM public.submodules s
            WHERE s.module_id = m.id
          ), '[]'::jsonb)
        ) ORDER BY m.sort_order
      )
      FROM public.modules m
    ), '[]'::jsonb),
    'roles',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'slug', r.slug,
          'name', r.name,
          'base_role', r.base_role,
          'description', r.description,
          'active_permissions', (
            SELECT count(*)::int
            FROM public.role_permissions rp
            WHERE rp.role_id = r.id AND rp.can_read = true
          ),
          'user_count', (
            SELECT count(*)::int
            FROM public.profile_roles pr
            WHERE pr.role_id = r.id
          )
        ) ORDER BY r.base_role, r.name
      )
      FROM public.roles r
    ), '[]'::jsonb),
    'users',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', (SELECT u.email FROM auth.users u WHERE u.id = p.id),
          'phone', p.phone,
          'role', p.role,
          'status', p.status,
          'catalog_roles', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('id', r.id, 'slug', r.slug, 'name', r.name, 'base_role', r.base_role)
            )
            FROM public.profile_roles pr
            JOIN public.roles r ON r.id = pr.role_id
            WHERE pr.profile_id = p.id
          ), '[]'::jsonb)
        ) ORDER BY p.full_name NULLS LAST
      )
      FROM public.profiles p
      WHERE p.role IS DISTINCT FROM 'cliente'::public.user_role_enum
    ), '[]'::jsonb),
    'stats', jsonb_build_object(
      'departments', (SELECT count(DISTINCT base_role)::int FROM public.roles),
      'roles', (SELECT count(*)::int FROM public.roles),
      'modules', (SELECT count(*)::int FROM public.modules),
      'active_permissions', (
        SELECT count(*)::int FROM public.role_permissions WHERE can_read = true
      ),
      'staff_users', (
        SELECT count(*)::int FROM public.profiles
        WHERE role IS DISTINCT FROM 'cliente'::public.user_role_enum
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_rbac_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_rbac_dashboard() TO authenticated;
