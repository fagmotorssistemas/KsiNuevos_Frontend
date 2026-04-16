-- Asesoría financiamiento: historial de gestiones realizadas (llamada/mensaje/personal)
-- Extiende el modelo sin tocar la tabla base `public.asesoria_financiamiento`.

-- 1) Enum tipo de gestión
DO $$
BEGIN
  CREATE TYPE public.tipo_gestion_financiamiento AS ENUM ('llamada', 'mensaje', 'personal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Tabla de gestiones
CREATE TABLE IF NOT EXISTS public.asesoria_financiamiento_gestion (
  id bigserial PRIMARY KEY,
  asesoria_id bigint NOT NULL REFERENCES public.asesoria_financiamiento(id) ON DELETE CASCADE,
  tipo public.tipo_gestion_financiamiento NOT NULL,

  -- Datos solicitados / recibidos
  se_solicito_cedula boolean NOT NULL DEFAULT false,
  cedula text NULL,
  banco_deseado text NULL,

  -- Evidencia de contacto con asesor/banco
  asesor_contactado_nombre text NULL,
  asesor_contactado_telefono text NULL,

  -- Qué gestión se hizo / respuesta del banco
  gestion_detalle text NULL,

  -- Resultado (aplica / no aplica)
  aplica boolean NULL,
  motivo_no_aplica text NULL,

  -- Garantes (opcional)
  requiere_garante boolean NOT NULL DEFAULT false,
  garante_detalle text NULL,

  -- Hasta dónde puede llegar (si aplica)
  monto_aprobable_max numeric NULL,
  plazo_meses_max integer NULL,

  created_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_af_gestion_asesoria_id ON public.asesoria_financiamiento_gestion(asesoria_id);
CREATE INDEX IF NOT EXISTS idx_af_gestion_created_at ON public.asesoria_financiamiento_gestion(created_at DESC);

-- 3) RLS
ALTER TABLE public.asesoria_financiamiento_gestion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion asesoria: admin o lead asignado" ON public.asesoria_financiamiento_gestion;
CREATE POLICY "Gestion asesoria: admin o lead asignado"
ON public.asesoria_financiamiento_gestion
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE af.id = asesoria_financiamiento_gestion.asesoria_id
      AND l.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.asesoria_financiamiento af
    JOIN public.leads l ON l.id = af.lead_id
    WHERE af.id = asesoria_financiamiento_gestion.asesoria_id
      AND l.assigned_to = auth.uid()
  )
);

