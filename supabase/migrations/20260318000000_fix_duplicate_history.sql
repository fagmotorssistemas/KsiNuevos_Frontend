-- Limpiar registros duplicados en el historial (mismo caso, mismo estado nuevo en menos de 5 segundos de diferencia)
delete from public.case_status_history a
using public.case_status_history b
where a.case_id = b.case_id 
  and a.estado_nuevo = b.estado_nuevo 
  and a.id > b.id 
  and abs(extract(epoch from (a.fecha - b.fecha))) < 5;

-- Ajustar TODAS las funciones que guardan hora para que utilicen la zona horaria de Guayaquil/Ecuador
-- (GTM-5). Supabase guarda por defecto en UTC (GMT-0), por lo que sin esto hay 5 horas de diferencia.

-- 1. Modificar Trigger de historial de estados (para usar la zona horaria de Guayaquil)
create or replace function public.tg_cases_guard_and_history()
returns trigger
language plpgsql
as $$
declare
  bypass text;
  v_last_estado text;
begin
  if tg_op = 'UPDATE' then
    if new.estado is distinct from old.estado then
      bypass := current_setting('app.bypass_status_guard', true);

      if bypass is distinct from 'on' then
        raise exception 'Cambio de estado no permitido sin registrar evento (use RPC).';
      end if;

      select estado_nuevo into v_last_estado
      from public.case_status_history
      where case_id = new.id
      order by fecha desc
      limit 1;

      if v_last_estado is distinct from new.estado::text then
        insert into public.case_status_history (
          case_id,
          estado_anterior,
          estado_nuevo,
          usuario_id,
          fecha
        ) values (
          old.id,
          old.estado::text,
          new.estado::text,
          auth.uid(),
          (now() at time zone 'America/Guayaquil')
        );
      end if;
    end if;

    new.updated_at := (now() at time zone 'America/Guayaquil');
  end if;

  return new;
end;
$$;

-- 2. Modificar Trigger de eventos
create or replace function public.tg_case_events_set_now_and_touch_case()
returns trigger
language plpgsql
as $$
declare
  v_intencion_pago public.intencion_pago_enum;
  v_contactabilidad public.contactabilidad_enum;
begin
  new.fecha := (now() at time zone 'America/Guayaquil');
  
  v_intencion_pago := null;
  v_contactabilidad := null;

  if new.resultado = 'no_contesta' then
    v_contactabilidad := 'no_contesta'::public.contactabilidad_enum;
    v_intencion_pago := 'nula'::public.intencion_pago_enum; 
  elsif new.resultado = 'contactado' then
    v_contactabilidad := 'contactado'::public.contactabilidad_enum;
  elsif new.resultado = 'promesa_pago' then
    v_intencion_pago := 'alta'::public.intencion_pago_enum;
  elsif new.resultado = 'rechazo' then
    v_intencion_pago := 'baja'::public.intencion_pago_enum;
  end if;

  update public.cases
    set fecha_ultima_gestion = new.fecha,
        contactabilidad = coalesce(v_contactabilidad, contactabilidad),
        intencion_pago = coalesce(v_intencion_pago, intencion_pago),
        updated_at = (now() at time zone 'America/Guayaquil')
  where id = new.case_id;

  return new;
end;
$$;

-- 3. Modificar RPC Crear Caso
create or replace function public.rpc_create_case(
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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_now timestamp;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;
  if p_event_descripcion is null or trim(p_event_descripcion) = '' then raise exception 'descripcion del evento inicial es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  insert into public.cases (
    id_sistema, estado, prioridad, riesgo, abogado_id, proxima_accion, fecha_proxima_accion,
    fecha_inicio, fecha_ultima_gestion, monto_referencia, tipo_proceso, estado_vehiculo,
    objetivo_caso, intencion_pago, contactabilidad, created_at, updated_at
  ) values (
    p_id_sistema, p_estado, p_prioridad, p_riesgo, p_abogado_id, p_proxima_accion, p_fecha_proxima_accion,
    v_now, v_now, p_monto_referencia, p_tipo_proceso, p_estado_vehiculo,
    p_objetivo_caso, p_intencion_pago, p_contactabilidad, v_now, v_now
  ) returning id into v_case_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, fecha
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle, v_now
  );

  insert into public.case_status_history (
    case_id, estado_anterior, estado_nuevo, usuario_id, fecha
  ) values (
    v_case_id, null, p_estado::text, auth.uid(), v_now
  );

  return v_case_id;
end;
$$;

-- 4. Modificar RPC Cambio de Estado
create or replace function public.rpc_change_case_status(
  p_case_id uuid,
  p_estado_nuevo public.estado_caso_enum,
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
declare
  v_now timestamp;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, fecha
  ) values (
    p_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle, v_now
  );

  perform set_config('app.bypass_status_guard', 'on', true);

  update public.cases
    set estado = p_estado_nuevo,
        proxima_accion = p_proxima_accion,
        fecha_proxima_accion = p_fecha_proxima_accion,
        updated_at = v_now
  where id = p_case_id;
end;
$$;

-- 5. Modificar RPC Crear Tarea
create or replace function public.rpc_create_case_task(
  p_case_id uuid,
  p_tipo text,
  p_descripcion text,
  p_fecha_limite timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
  v_now timestamp;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_fecha_limite is null then raise exception 'fecha_limite es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  insert into public.case_tasks (
    case_id, tipo, descripcion, fecha_limite, estado, usuario_id, created_at
  ) values (
    p_case_id, p_tipo, p_descripcion, p_fecha_limite, 'pendiente', auth.uid(), v_now
  ) returning id into v_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, fecha
  ) values (
    p_case_id, 'tarea_creada', coalesce(p_descripcion, 'Tarea creada'), null, auth.uid(), v_now
  );

  return v_task_id;
end;
$$;

-- 6. Modificar RPC Completar Tarea
create or replace function public.rpc_complete_case_task(
  p_task_id uuid,
  p_event_descripcion text default 'Tarea completada'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_now timestamp;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  select case_id into v_case_id
  from public.case_tasks
  where id = p_task_id;

  if v_case_id is null then raise exception 'Tarea no encontrada'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  update public.case_tasks
    set estado = 'completado',
        completed_at = v_now
  where id = p_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, fecha
  ) values (
    v_case_id, 'tarea_completada', p_event_descripcion, null, auth.uid(), v_now
  );
end;
$$;

-- 6.5. Modificar RPC Registrar Evento Regular
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
  v_now timestamp;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, fecha
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_canal, p_detalle, v_now
  ) returning id into v_event_id;

  if p_proxima_accion is not null or p_fecha_proxima_accion is not null then
    if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
    if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;
    
    update public.cases
      set proxima_accion = p_proxima_accion,
          fecha_proxima_accion = p_fecha_proxima_accion,
          updated_at = v_now
    where id = p_case_id;
  end if;

  return v_event_id;
end;
$$;

-- 7. Corregir TODOS los registros anteriores masivamente para que bajen 5 horas
update public.cases set 
  fecha_inicio = fecha_inicio - interval '5 hours', 
  fecha_ultima_gestion = fecha_ultima_gestion - interval '5 hours',
  created_at = created_at - interval '5 hours',
  updated_at = updated_at - interval '5 hours'
where fecha_inicio > '2026-03-01';

update public.case_events set 
  fecha = fecha - interval '5 hours'
where fecha > '2026-03-01';

update public.case_status_history set 
  fecha = fecha - interval '5 hours'
where fecha > '2026-03-01';

update public.case_tasks set 
  created_at = created_at - interval '5 hours',
  completed_at = completed_at - interval '5 hours'
where created_at > '2026-03-01';
