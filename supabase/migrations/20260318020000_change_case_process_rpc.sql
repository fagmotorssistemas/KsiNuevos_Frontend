create or replace function public.rpc_change_case_process(
  p_case_id uuid,
  p_tipo_proceso public.tipo_proceso_enum,
  p_objetivo_caso public.objetivo_caso_enum,
  p_estado_vehiculo public.estado_vehiculo_enum,
  p_intencion_pago public.intencion_pago_enum default null,
  p_contactabilidad public.contactabilidad_enum default null,
  p_proxima_accion text default null,
  p_fecha_proxima_accion timestamptz default null,
  p_event_descripcion text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
  v_current_process public.tipo_proceso_enum;
  v_next_stage_id uuid;
  v_description text;
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  v_now := (now() at time zone 'America/Guayaquil');

  select tipo_proceso
    into v_current_process
  from public.cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'Caso no encontrado';
  end if;

  if v_current_process is not distinct from p_tipo_proceso then
    raise exception 'El caso ya está en ese tipo de proceso';
  end if;

  if p_proxima_accion is null or trim(p_proxima_accion) = '' then
    raise exception 'proxima_accion es requerida';
  end if;
  if p_fecha_proxima_accion is null then
    raise exception 'fecha_proxima_accion es requerida';
  end if;
  if p_event_descripcion is null or trim(p_event_descripcion) = '' then
    raise exception 'descripcion del cambio de proceso es requerida';
  end if;

  select id
    into v_next_stage_id
  from public.proceso_etapas
  where tipo_proceso = p_tipo_proceso
  order by orden asc
  limit 1;

  if v_next_stage_id is null then
    raise exception 'No existen etapas configuradas para el tipo de proceso %', p_tipo_proceso;
  end if;

  update public.cases
  set
    tipo_proceso = p_tipo_proceso,
    objetivo_caso = p_objetivo_caso,
    estado_vehiculo = p_estado_vehiculo,
    intencion_pago = p_intencion_pago,
    contactabilidad = p_contactabilidad,
    proxima_accion = p_proxima_accion,
    fecha_proxima_accion = p_fecha_proxima_accion,
    etapa_actual_id = v_next_stage_id,
    fecha_ultima_gestion = v_now,
    updated_at = v_now
  where id = p_case_id;

  v_description := trim(p_event_descripcion);

  insert into public.case_events (
    case_id,
    tipo,
    descripcion,
    usuario_id,
    canal,
    etapa_id,
    fecha
  ) values (
    p_case_id,
    'sistema',
    v_description,
    auth.uid(),
    'sistema',
    v_next_stage_id,
    v_now
  );
end;
$$;
