-- Permisos efectivos = solo profile_permissions (por usuario).
-- role_permissions queda como plantilla al asignar / cambiar perfil.

CREATE OR REPLACE FUNCTION public.seed_profile_permissions_from_role(
  p_profile_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden inicializar permisos de usuario';
  END IF;

  DELETE FROM public.profile_permissions WHERE profile_id = p_profile_id;

  INSERT INTO public.profile_permissions (profile_id, submodule_id, can_read, can_write, can_delete)
  SELECT
    p_profile_id,
    rp.submodule_id,
    rp.can_read,
    rp.can_write,
    rp.can_delete
  FROM public.role_permissions rp
  WHERE rp.role_id = p_role_id;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_profile_permissions_from_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_profile_permissions_from_role(uuid, uuid) TO authenticated;

-- Asegurar fila por submódulo sin pisar personalizaciones ya guardadas
INSERT INTO public.profile_permissions (profile_id, submodule_id, can_read, can_write, can_delete)
SELECT
  pr.profile_id,
  rp.submodule_id,
  rp.can_read,
  rp.can_write,
  rp.can_delete
FROM public.profile_roles pr
JOIN public.role_permissions rp ON rp.role_id = pr.role_id
ON CONFLICT (profile_id, submodule_id) DO NOTHING;

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
    pp.can_read,
    pp.can_write,
    pp.can_delete
  FROM public.profile_permissions pp
  JOIN public.submodules s ON s.id = pp.submodule_id
  WHERE pp.profile_id = auth.uid()
    AND (pp.can_read OR pp.can_write OR pp.can_delete);
$$;

REVOKE ALL ON FUNCTION public.get_my_effective_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_effective_permissions() TO authenticated;
