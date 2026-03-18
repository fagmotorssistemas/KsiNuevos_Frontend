-- 1. Añadir nuevas columnas a la tabla cases (y forzarlas a texto por si antes eran ENUMs restringidos)
alter table public.cases
  add column if not exists tipo_proceso text,
  add column if not exists estado_vehiculo text,
  add column if not exists intencion_pago text,
  add column if not exists contactabilidad text,
  add column if not exists objetivo_caso text;

alter table public.cases
  alter column tipo_proceso type text using tipo_proceso::text,
  alter column estado_vehiculo type text using estado_vehiculo::text,
  alter column intencion_pago type text using intencion_pago::text,
  alter column contactabilidad type text using contactabilidad::text,
  alter column objetivo_caso type text using objetivo_caso::text;

-- 2. Modificar RPC rpc_create_case
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
  p_event_detalle text default null,
  p_tipo_proceso text default null,
  p_estado_vehiculo text default null,
  p_objetivo_caso text default null,
  p_intencion_pago text default null,
  p_contactabilidad text default null
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
  if p_event_descripcion is null or trim(p_event_descripcion) = '' then
    raise exception 'descripcion del evento inicial es requerida';
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
    tipo_proceso,
    estado_vehiculo,
    objetivo_caso,
    intencion_pago,
    contactabilidad,
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
    p_tipo_proceso,
    p_estado_vehiculo,
    p_objetivo_caso,
    p_intencion_pago,
    p_contactabilidad,
    now(),
    now()
  )
  returning id into v_case_id;

  -- Event inicial
  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle
  );

  -- Historial de estado inicial
  insert into public.case_status_history (
    case_id, estado_anterior, estado_nuevo, usuario_id, fecha
  ) values (
    v_case_id, null, p_estado, auth.uid(), now()
  );

  return v_case_id;
end;
$$;


-- 3. Crear Lógica Automática (Trigger)
create or replace function public.tg_case_events_set_now_and_touch_case()
returns trigger
language plpgsql
as $$
declare
  v_intencion_pago text;
  v_contactabilidad text;
begin
  -- Regla 2: no permitir fecha manual
  new.fecha := now();

  -- Procesar lógica de negocio automática
  v_intencion_pago := null;
  v_contactabilidad := null;

  if new.resultado = 'no_contesta' then
    v_contactabilidad := 'no_contesta';
  elsif new.resultado = 'contactado' then
    v_contactabilidad := 'contactado';
  elsif new.resultado = 'promesa_pago' then
    v_intencion_pago := 'alta';
  elsif new.resultado = 'rechazo' then
    v_intencion_pago := 'baja';
  end if;

  -- Regla 3: insertar event -> actualizar fecha_ultima_gestion y lógica de negocio
  update public.cases
    set fecha_ultima_gestion = new.fecha,
        contactabilidad = coalesce(v_contactabilidad, contactabilidad),
        intencion_pago = coalesce(v_intencion_pago, intencion_pago),
        updated_at = now()
  where id = new.case_id;

  return new;
end;
$$;


-- 4. Consultas para Dashboard (RPCs)

-- Casos críticos
create or replace function public.rpc_get_critical_cases()
returns setof public.cases
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.cases c
  where public.is_legal_staff()
    and lower(c.riesgo::text) = 'alto' 
    and lower(c.contactabilidad::text) = 'no_contesta';
$$;

-- Casos por tipo_proceso
create or replace function public.rpc_get_cases_by_process_type()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_agg(row_to_json(t))
  from (
    select tipo_proceso, count(*) as total
    from public.cases
    where public.is_legal_staff()
    group by tipo_proceso
  ) t;
$$;

-- Casos por abogado
create or replace function public.rpc_get_cases_by_lawyer()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_agg(row_to_json(t))
  from (
    select 
      c.abogado_id, 
      p.full_name as abogado_nombre,
      count(*) as total
    from public.cases c
    left join public.profiles p on c.abogado_id = p.id
    where public.is_legal_staff()
    group by c.abogado_id, p.full_name
  ) t;
$$;
