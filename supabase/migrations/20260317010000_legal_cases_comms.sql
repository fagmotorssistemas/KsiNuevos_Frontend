-- Añadir soporte para canal y detalle en case_events

-- 1. Crear ENUMs de forma segura (si ya existen no falla)
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'tipo_evento_enum') then
    create type tipo_evento_enum as enum ('llamada', 'mensaje', 'nota', 'notificacion', 'sistema', 'creacion', 'tarea_creada', 'tarea_completada');
  end if;

  if not exists (select 1 from pg_type where typname = 'canal_enum') then
    create type canal_enum as enum ('telefono', 'whatsapp', 'email', 'presencial', 'sistema');
  end if;
end $$;

-- 2. Añadir campos a case_events
alter table public.case_events
  add column if not exists canal text, -- idealmente canal_enum, pero usamos text por compatibilidad de tipos
  add column if not exists detalle text;

-- (Opcional) Podemos forzar la restricción tipo/canal con un check si queremos, 
-- pero text es más flexible y evitamos romper la migración anterior.

-- 3. Actualizar RPC rpc_create_case
create or replace function public.rpc_create_case(
  p_id_sistema bigint,
  p_estado text,
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
  p_event_detalle text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  if p_proxima_accion is null or trim(p_proxima_accion) = '' then
    raise exception 'proxima_accion es requerida';
  end if;
  if p_fecha_proxima_accion is null then
    raise exception 'fecha_proxima_accion es requerida';
  end if;

  insert into public.cases (
    id_sistema,
    estado,
    prioridad,
    riesgo,
    abogado_id,
    proxima_accion,
    fecha_proxima_accion,
    fecha_inicio,
    fecha_ultima_gestion,
    monto_referencia,
    created_at,
    updated_at
  ) values (
    p_id_sistema,
    p_estado,
    p_prioridad,
    p_riesgo,
    p_abogado_id,
    p_proxima_accion,
    p_fecha_proxima_accion,
    now(),
    now(),
    p_monto_referencia,
    now(),
    now()
  )
  returning id into v_case_id;

  -- Event inicial (cumple regla 1 y 2 y 3 por trigger)
  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle
  );

  -- Historial de estado inicial (sin necesidad de update)
  insert into public.case_status_history (
    case_id, estado_anterior, estado_nuevo, usuario_id, fecha
  ) values (
    v_case_id, null, p_estado, auth.uid(), now()
  );

  return v_case_id;
end;
$$;


-- 4. Actualizar RPC rpc_register_case_event
create or replace function public.rpc_register_case_event(
  p_case_id uuid,
  p_tipo text,
  p_descripcion text,
  p_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null,
  p_proxima_accion text default null,
  p_fecha_proxima_accion timestamptz default null,
  p_canal text default null,
  p_detalle text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_canal, p_detalle
  )
  returning id into v_event_id;

  if p_proxima_accion is not null or p_fecha_proxima_accion is not null then
    if p_proxima_accion is null or trim(p_proxima_accion) = '' then
      raise exception 'proxima_accion es requerida si se actualiza próxima acción';
    end if;
    if p_fecha_proxima_accion is null then
      raise exception 'fecha_proxima_accion es requerida si se actualiza próxima acción';
    end if;
    update public.cases
      set proxima_accion = p_proxima_accion,
          fecha_proxima_accion = p_fecha_proxima_accion,
          updated_at = now()
    where id = p_case_id;
  end if;

  return v_event_id;
end;
$$;


-- 5. Actualizar RPC rpc_change_case_status
create or replace function public.rpc_change_case_status(
  p_case_id uuid,
  p_estado_nuevo text,
  p_event_tipo text,
  p_event_descripcion text,
  p_proxima_accion text,
  p_fecha_proxima_accion timestamptz,
  p_event_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null,
  p_event_canal text default null,
  p_event_detalle text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  -- Regla 5: siempre debe haber próxima acción
  if p_proxima_accion is null or trim(p_proxima_accion) = '' then
    raise exception 'proxima_accion es requerida';
  end if;
  if p_fecha_proxima_accion is null then
    raise exception 'fecha_proxima_accion es requerida';
  end if;

  -- Regla 1: registrar evento SIEMPRE
  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    p_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle
  );

  -- Habilitamos bypass solo en esta transacción para permitir update de estado
  perform set_config('app.bypass_status_guard', 'on', true);

  update public.cases
    set estado = p_estado_nuevo,
        proxima_accion = p_proxima_accion,
        fecha_proxima_accion = p_fecha_proxima_accion,
        updated_at = now()
  where id = p_case_id;
end;
$$;
