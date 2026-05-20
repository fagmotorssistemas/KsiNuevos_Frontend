-- Permisos por usuario (perfil): overrides sobre el rol de catálogo.
-- Editar en /admin/permisos → pestaña Usuarios NO debe cambiar role_permissions.

CREATE TABLE IF NOT EXISTS public.profile_permissions (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submodule_id uuid NOT NULL REFERENCES public.submodules(id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, submodule_id)
);

CREATE INDEX IF NOT EXISTS profile_permissions_profile_id_idx
  ON public.profile_permissions (profile_id);

ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_permissions_select_own_or_admin ON public.profile_permissions;
CREATE POLICY profile_permissions_select_own_or_admin ON public.profile_permissions
  FOR SELECT TO authenticated
  USING (public.is_profile_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS profile_permissions_write_admin ON public.profile_permissions;
CREATE POLICY profile_permissions_write_admin ON public.profile_permissions
  FOR ALL TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_permissions TO authenticated;

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
  WITH role_base AS (
    SELECT
      s.slug,
      s.id AS submodule_id,
      bool_or(rp.can_read) AS role_read,
      bool_or(rp.can_write) AS role_write,
      bool_or(rp.can_delete) AS role_delete
    FROM public.profile_roles pr
    JOIN public.role_permissions rp ON rp.role_id = pr.role_id
    JOIN public.submodules s ON s.id = rp.submodule_id
    WHERE pr.profile_id = auth.uid()
    GROUP BY s.slug, s.id
  )
  SELECT
    rb.slug AS submodule_slug,
    COALESCE(pp.can_read, rb.role_read) AS can_read,
    COALESCE(pp.can_write, rb.role_write) AS can_write,
    COALESCE(pp.can_delete, rb.role_delete) AS can_delete
  FROM role_base rb
  LEFT JOIN public.profile_permissions pp
    ON pp.profile_id = auth.uid()
   AND pp.submodule_id = rb.submodule_id

  UNION ALL

  SELECT
    s.slug,
    pp.can_read,
    pp.can_write,
    pp.can_delete
  FROM public.profile_permissions pp
  JOIN public.submodules s ON s.id = pp.submodule_id
  WHERE pp.profile_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM role_base rb WHERE rb.submodule_id = pp.submodule_id
    )
    AND (pp.can_read OR pp.can_write OR pp.can_delete);
$$;

REVOKE ALL ON FUNCTION public.get_my_effective_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_effective_permissions() TO authenticated;
