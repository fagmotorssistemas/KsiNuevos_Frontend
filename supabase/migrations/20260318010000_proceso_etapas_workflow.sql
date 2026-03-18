-- 1. Crear tabla de proceso_etapas
CREATE TABLE IF NOT EXISTS public.proceso_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_proceso public.tipo_proceso_enum NOT NULL,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Guayaquil'),
    UNIQUE(tipo_proceso, orden)
);

-- Habilitar RLS para proceso_etapas
ALTER TABLE public.proceso_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de etapas para todos los autenticados" 
ON public.proceso_etapas FOR SELECT 
TO authenticated 
USING (true);

-- 2. Insertar etapas por defecto para cada tipo_proceso
INSERT INTO public.proceso_etapas (tipo_proceso, nombre, orden) VALUES
-- EXTRAJUDICIAL
('extrajudicial', 'Contacto Inicial', 1),
('extrajudicial', 'Negociación', 2),
('extrajudicial', 'Seguimiento de Promesa', 3),
('extrajudicial', 'Incumplimiento / Cierre', 4),

-- DEMANDA EJECUTIVA
('demanda_ejecutiva', 'Preparación de Demanda', 1),
('demanda_ejecutiva', 'Presentación y Calificación', 2),
('demanda_ejecutiva', 'Citación', 3),
('demanda_ejecutiva', 'Embargo / Medidas Cautelares', 4),
('demanda_ejecutiva', 'Sentencia y Remate', 5),

-- MEDIACION
('mediacion', 'Solicitud de Mediación', 1),
('mediacion', 'Invitaciones', 2),
('mediacion', 'Audiencia', 3),
('mediacion', 'Acta de Mediación', 4),

-- JUDICIAL (General)
('judicial', 'Demanda', 1),
('judicial', 'Trámite / Pruebas', 2),
('judicial', 'Audiencia', 3),
('judicial', 'Sentencia', 4)
ON CONFLICT (tipo_proceso, orden) DO NOTHING;

-- 3. Añadir etapa_actual_id a cases
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS etapa_actual_id UUID REFERENCES public.proceso_etapas(id);

-- 4. Añadir etapa_id a case_events
ALTER TABLE public.case_events
ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES public.proceso_etapas(id);

-- 5. Actualizar los registros existentes para asignarles la etapa 1 de su respectivo proceso (si no tienen)
DO $$
DECLARE
  r RECORD;
  v_etapa_id UUID;
BEGIN
  FOR r IN SELECT id, tipo_proceso FROM public.cases WHERE etapa_actual_id IS NULL AND tipo_proceso IS NOT NULL LOOP
    SELECT id INTO v_etapa_id FROM public.proceso_etapas WHERE tipo_proceso = r.tipo_proceso AND orden = 1 LIMIT 1;
    IF v_etapa_id IS NOT NULL THEN
      UPDATE public.cases SET etapa_actual_id = v_etapa_id WHERE id = r.id;
      UPDATE public.case_events SET etapa_id = v_etapa_id WHERE case_id = r.id AND etapa_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- 6. Modificar rpc_create_case para asignar la etapa_actual_id automáticamente si viene el tipo_proceso
CREATE OR REPLACE FUNCTION public.rpc_create_case(
  p_id_sistema bigint,
  p_estado public.estado_caso_enum,
  p_prioridad text,
  p_riesgo text,
  p_abogado_id uuid,
  p_proxima_accion text,
  p_fecha_proxima_accion timestamptz,
  p_monto_referencia numeric,
  p_event_tipo text default 'creacion',
  p_event_descripcion text default 'Caso creado',
  p_event_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null,
  p_event_canal text default 'sistema',
  p_event_detalle text default null,
  p_tipo_proceso public.tipo_proceso_enum default null,
  p_estado_vehiculo public.estado_vehiculo_enum default null,
  p_objetivo_caso public.objetivo_caso_enum default null,
  p_intencion_pago public.intencion_pago_enum default null,
  p_contactabilidad public.contactabilidad_enum default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_now timestamptz;
  v_etapa_id uuid;
BEGIN
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;
  if p_event_descripcion is null or trim(p_event_descripcion) = '' then raise exception 'descripcion del evento inicial es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  -- Determinar etapa inicial según tipo de proceso
  if p_tipo_proceso is not null then
    select id into v_etapa_id from public.proceso_etapas where tipo_proceso = p_tipo_proceso order by orden asc limit 1;
  end if;

  insert into public.cases (
    id_sistema, estado, prioridad, riesgo, abogado_id, proxima_accion, fecha_proxima_accion,
    fecha_inicio, fecha_ultima_gestion, monto_referencia, tipo_proceso, estado_vehiculo,
    objetivo_caso, intencion_pago, contactabilidad, etapa_actual_id, created_at, updated_at
  ) values (
    p_id_sistema, p_estado, p_prioridad, p_riesgo, p_abogado_id, p_proxima_accion, p_fecha_proxima_accion,
    v_now, v_now, p_monto_referencia, p_tipo_proceso, p_estado_vehiculo,
    p_objetivo_caso, p_intencion_pago, p_contactabilidad, v_etapa_id, v_now, v_now
  ) returning id into v_case_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, etapa_id, fecha
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle, v_etapa_id, v_now
  );

  insert into public.case_status_history (
    case_id, estado_anterior, estado_nuevo, usuario_id, fecha
  ) values (
    v_case_id, null, p_estado::text, auth.uid(), v_now
  );

  return v_case_id;
END;
$$;

-- 7. Modificar rpc_register_case_event para heredar la etapa actual del caso
CREATE OR REPLACE FUNCTION public.rpc_register_case_event(
  p_case_id uuid,
  p_tipo text,
  p_descripcion text,
  p_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null,
  p_canal text default 'sistema',
  p_detalle text default null,
  p_etapa_id uuid default null -- Opcionalmente se puede pasar para forzar otra etapa
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_now timestamptz;
  v_etapa_id uuid;
BEGIN
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  
  v_now := (now() at time zone 'America/Guayaquil');
  
  -- Si no se pasa etapa_id, tomar la etapa actual del caso
  if p_etapa_id is null then
    select etapa_actual_id into v_etapa_id from public.cases where id = p_case_id;
  else
    v_etapa_id := p_etapa_id;
  end if;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, etapa_id, fecha
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_canal, p_detalle, v_etapa_id, v_now
  ) returning id into v_event_id;

  return v_event_id;
END;
$$;

-- 8. Modificar rpc_change_case_status para permitir cambio de etapa (opcionalmente)
CREATE OR REPLACE FUNCTION public.rpc_change_case_status(
  p_case_id uuid,
  p_estado_nuevo public.estado_caso_enum,
  p_event_descripcion text,
  p_proxima_accion text,
  p_fecha_proxima_accion timestamptz,
  p_etapa_nueva_id uuid default null -- Si se quiere cambiar de etapa junto con el estado
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_actual public.estado_caso_enum;
  v_etapa_actual uuid;
  v_now timestamptz;
BEGIN
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  select estado, etapa_actual_id into v_estado_actual, v_etapa_actual 
  from public.cases 
  where id = p_case_id for update;

  if v_estado_actual is distinct from p_estado_nuevo or (p_etapa_nueva_id is not null and p_etapa_nueva_id is distinct from v_etapa_actual) then
    
    -- Si no hay cambio de etapa explicito, usamos la actual para el evento
    if p_etapa_nueva_id is null then
        p_etapa_nueva_id := v_etapa_actual;
    end if;

    -- Registrar evento del cambio (hereda etapa nueva o actual)
    insert into public.case_events (
      case_id, tipo, descripcion, usuario_id, canal, etapa_id, fecha
    ) values (
      p_case_id, 'sistema', p_event_descripcion, auth.uid(), 'sistema', p_etapa_nueva_id, v_now
    );

    -- Actualizar caso (el trigger de history saltará si el estado cambia)
    -- Temporalmente deshabilitar el guard del trigger si solo se cambia la etapa? 
    -- El trigger tg_cases_guard_and_history verifica bypass, pero nuestro trigger usa app.bypass_status_guard
    set local app.bypass_status_guard = 'on';
    
    update public.cases 
    set 
      estado = p_estado_nuevo,
      etapa_actual_id = p_etapa_nueva_id,
      proxima_accion = p_proxima_accion,
      fecha_proxima_accion = p_fecha_proxima_accion,
      updated_at = v_now
    where id = p_case_id;
  else
    raise exception 'El caso ya se encuentra en ese estado y etapa.';
  end if;
END;
$$;

-- 9. Actualizar rpc_get_case_full para incluir las etapas del proceso
create or replace function public.rpc_get_case_full(p_case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'case', (select to_jsonb(c) from public.cases c where c.id = p_case_id),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.fecha desc), '[]'::jsonb)
               from public.case_events e where e.case_id = p_case_id),
    'tasks_pending', (select coalesce(jsonb_agg(to_jsonb(t) order by t.fecha_limite asc), '[]'::jsonb)
                      from public.case_tasks t
                      where t.case_id = p_case_id and t.estado in ('pendiente','vencido')),
    'status_history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.fecha desc), '[]'::jsonb)
                       from public.case_status_history h where h.case_id = p_case_id),
    'etapas', (select coalesce(jsonb_agg(to_jsonb(p) order by p.orden asc), '[]'::jsonb)
               from public.proceso_etapas p 
               where p.tipo_proceso = (select tipo_proceso from public.cases where id = p_case_id))
  );
$$;
