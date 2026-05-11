-- Permisos opcionales para rol contable: acceso a Taller y Seguros (además de contabilidad).
-- Auditoría de cambios relevantes en esos módulos (insert desde app con sesión del usuario).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_taller boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_seguros boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.can_access_taller IS
  'Si role=contable, permite rutas /taller/* y enlaces de navegación.';
COMMENT ON COLUMN public.profiles.can_access_seguros IS
  'Si role=contable, permite rutas /seguros/* y enlaces de navegación.';

CREATE TABLE IF NOT EXISTS public.module_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('taller', 'seguros')),
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL,
  entity_id text,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS module_audit_log_module_created_idx
  ON public.module_audit_log (module, created_at DESC);

CREATE INDEX IF NOT EXISTS module_audit_log_user_created_idx
  ON public.module_audit_log (user_id, created_at DESC);

ALTER TABLE public.module_audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.module_audit_log TO authenticated;

-- Inserción: solo el propio usuario autenticado (evita suplantar user_id).
DROP POLICY IF EXISTS module_audit_log_insert_own ON public.module_audit_log;
CREATE POLICY module_audit_log_insert_own ON public.module_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lectura: el autor o administradores.
DROP POLICY IF EXISTS module_audit_log_select_own_or_admin ON public.module_audit_log;
CREATE POLICY module_audit_log_select_own_or_admin ON public.module_audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role_enum
    )
  );
