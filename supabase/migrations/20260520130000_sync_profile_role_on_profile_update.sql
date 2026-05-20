-- Mantener profile_roles alineado cuando cambia profiles.role (enum)

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_slug text;
  rid uuid;
  had_extensiones boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_roles pr
    JOIN public.roles r ON r.id = pr.role_id
    WHERE pr.profile_id = NEW.id
      AND r.slug = 'contable-extensiones'
  ) INTO had_extensiones;

  target_slug := CASE NEW.role::text
    WHEN 'admin' THEN 'admin-sistema'
    WHEN 'vendedor' THEN 'vendedor-estandar'
    WHEN 'marketing' THEN 'marketing-estandar'
    WHEN 'finanzas' THEN 'finanzas-estandar'
    WHEN 'abogado' THEN 'abogado-estandar'
    WHEN 'abogada' THEN 'abogado-estandar'
    WHEN 'taller' THEN 'taller-estandar'
    WHEN 'cliente' THEN 'cliente-portal'
    WHEN 'contable' THEN CASE
      WHEN had_extensiones THEN 'contable-extensiones'
      ELSE 'contable-estandar'
    END
    ELSE 'cliente-portal'
  END;

  SELECT id INTO rid FROM public.roles WHERE slug = target_slug;
  IF rid IS NULL THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.profile_roles WHERE profile_id = NEW.id;

  INSERT INTO public.profile_roles (profile_id, role_id)
  VALUES (NEW.id, rid)
  ON CONFLICT (profile_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_role
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_from_profile();
