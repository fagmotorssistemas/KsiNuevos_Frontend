-- admin_programacion ve Ventas como admin (leads, citas, tablas staff),
-- pero NO es is_profile_admin() (panel de permisos sigue bloqueado).

CREATE OR REPLACE FUNCTION public.is_admin_or_marketing()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'marketing', 'admin_programacion')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_roles_staff()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT ARRAY[
    'admin',
    'admin_programacion',
    'vendedor',
    'marketing',
    'finanzas',
    'contable',
    'abogado',
    'taller'
  ]::text[];
$function$;

CREATE OR REPLACE FUNCTION public.has_any_profile_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(p.role::text) = ANY (p_roles)
        OR (
          lower(p.role::text) = 'admin_programacion'
          AND 'admin' = ANY (p_roles)
        )
      )
  );
$function$;
