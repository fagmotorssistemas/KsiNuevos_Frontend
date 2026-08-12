-- Personal de taller como ficha independiente (sin requerir cuenta/login en profiles).
-- profile_id queda opcional por si en el futuro se vincula a un usuario del sistema.

ALTER TABLE public.taller_personal
  ADD COLUMN IF NOT EXISTS nombre_completo text,
  ADD COLUMN IF NOT EXISTS telefono text;

-- Backfill desde profiles cuando exista ficha ligada a un usuario
UPDATE public.taller_personal tp
SET
  nombre_completo = COALESCE(tp.nombre_completo, p.full_name),
  telefono = COALESCE(tp.telefono, p.phone)
FROM public.profiles p
WHERE tp.profile_id = p.id
  AND (tp.nombre_completo IS NULL OR tp.telefono IS NULL);

-- Filas sin nombre (no deberían existir, pero por seguridad)
UPDATE public.taller_personal
SET nombre_completo = COALESCE(nombre_completo, 'Sin nombre')
WHERE nombre_completo IS NULL OR btrim(nombre_completo) = '';

ALTER TABLE public.taller_personal
  ALTER COLUMN nombre_completo SET NOT NULL;

COMMENT ON COLUMN public.taller_personal.nombre_completo IS
  'Nombre del personal del taller (no requiere cuenta en profiles).';
COMMENT ON COLUMN public.taller_personal.telefono IS
  'Teléfono de contacto del personal.';
COMMENT ON COLUMN public.taller_personal.profile_id IS
  'Opcional: vínculo a un usuario del sistema si alguna vez necesita login.';
