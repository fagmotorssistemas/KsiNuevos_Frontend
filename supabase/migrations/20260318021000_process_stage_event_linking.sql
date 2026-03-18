-- Vincula explícitamente eventos y tareas a la etapa actual del proceso.
-- Esto evita mezclar bitácora entre procesos distintos.

alter table public.case_tasks
  add column if not exists etapa_id uuid references public.proceso_etapas(id);

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
  v_now timestamptz;
  v_etapa_id uuid;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  select etapa_actual_id
    into v_etapa_id
  from public.cases
  where id = p_case_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle, etapa_id, fecha
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_canal, p_detalle, v_etapa_id, v_now
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
  v_now timestamptz;
  v_etapa_id uuid;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_fecha_limite is null then raise exception 'fecha_limite es requerida'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  select etapa_actual_id
    into v_etapa_id
  from public.cases
  where id = p_case_id;

  insert into public.case_tasks (
    case_id, tipo, descripcion, fecha_limite, estado, usuario_id, created_at, etapa_id
  ) values (
    p_case_id, p_tipo, p_descripcion, p_fecha_limite, 'pendiente', auth.uid(), v_now, v_etapa_id
  ) returning id into v_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, canal, etapa_id, fecha
  ) values (
    p_case_id, 'tarea_creada', coalesce(p_descripcion, 'Tarea creada'), null, auth.uid(), 'sistema', v_etapa_id, v_now
  );

  return v_task_id;
end;
$$;

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
  v_now timestamptz;
  v_etapa_id uuid;
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  select case_id, etapa_id
    into v_case_id, v_etapa_id
  from public.case_tasks
  where id = p_task_id;

  if v_case_id is null then raise exception 'Tarea no encontrada'; end if;

  v_now := (now() at time zone 'America/Guayaquil');

  update public.case_tasks
    set estado = 'completado',
        completed_at = v_now
  where id = p_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, canal, etapa_id, fecha
  ) values (
    v_case_id, 'tarea_completada', p_event_descripcion, null, auth.uid(), 'sistema', v_etapa_id, v_now
  );
end;
$$;
