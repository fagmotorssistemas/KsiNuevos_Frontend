-- 1. Primero, convertir temporalmente las columnas a TEXTO para evitar errores de dependencias al borrar los ENUMs
alter table if exists public.cases 
  alter column tipo_proceso type text using tipo_proceso::text,
  alter column estado_vehiculo type text using estado_vehiculo::text,
  alter column intencion_pago type text using intencion_pago::text,
  alter column contactabilidad type text using contactabilidad::text,
  alter column objetivo_caso type text using objetivo_caso::text,
  alter column estado type text using estado::text;

-- 2. Eliminar funciones dependientes (para poder eliminar los ENUMs si están en uso por ellas)
do $$ 
declare 
  r record;
begin
  for r in (
    select oid::regprocedure as drop_statement 
    from pg_proc 
    where proname in (
      'rpc_create_case', 
      'tg_case_events_set_now_and_touch_case', 
      'rpc_get_critical_cases', 
      'rpc_change_case_status',
      'rpc_register_case_event'
    ) 
    and pronamespace = 'public'::regnamespace
  ) loop
    execute 'drop function if exists ' || r.drop_statement || ' cascade';
  end loop;
end $$;

-- 3. Eliminar los ENUMs por completo (borrón y cuenta nueva)
drop type if exists public.tipo_proceso_enum cascade;
drop type if exists public.estado_vehiculo_enum cascade;
drop type if exists public.objetivo_caso_enum cascade;
drop type if exists public.intencion_pago_enum cascade;
drop type if exists public.contactabilidad_enum cascade;
drop type if exists public.estado_caso_enum cascade;

-- 4. Recrear los ENUMs limpios con todos los valores exactos que necesitamos
create type public.tipo_proceso_enum as enum ('extrajudicial', 'demanda_ejecutiva', 'mediacion', 'judicial');
create type public.estado_vehiculo_enum as enum ('poder_cliente', 'retenido', 'abandonado', 'taller', 'recuperado');
create type public.objetivo_caso_enum as enum ('recuperar_cartera', 'retener_vehiculo', 'renegociar', 'recuperacion');
create type public.intencion_pago_enum as enum ('alta', 'media', 'baja', 'nula');
create type public.contactabilidad_enum as enum ('contactado', 'no_contesta', 'ilocalizable');
create type public.estado_caso_enum as enum ('nuevo', 'gestionando', 'pre_judicial', 'judicial', 'cerrado', 'castigado');

-- 5. Asegurar que las columnas existan en la tabla (por si acaso no existían)
alter table public.cases
  add column if not exists tipo_proceso text,
  add column if not exists estado_vehiculo text,
  add column if not exists intencion_pago text,
  add column if not exists contactabilidad text,
  add column if not exists objetivo_caso text;

-- 6. Volver a convertir las columnas de TEXTO al ENUM respectivo
-- (Usamos condicionales ILIKE por si había datos mal escritos guardados como texto anteriormente)
alter table public.cases
  alter column tipo_proceso type public.tipo_proceso_enum using (
    case 
      when tipo_proceso ilike '%extrajudicial%' then 'extrajudicial'::public.tipo_proceso_enum
      when tipo_proceso ilike '%demanda%' then 'demanda_ejecutiva'::public.tipo_proceso_enum
      when tipo_proceso ilike '%mediacion%' then 'mediacion'::public.tipo_proceso_enum
      when tipo_proceso ilike '%judicial%' then 'judicial'::public.tipo_proceso_enum
      else null
    end
  ),
  alter column estado_vehiculo type public.estado_vehiculo_enum using (
    case
      when estado_vehiculo ilike '%poder%' then 'poder_cliente'::public.estado_vehiculo_enum
      when estado_vehiculo ilike '%retenido%' then 'retenido'::public.estado_vehiculo_enum
      when estado_vehiculo ilike '%abandonado%' then 'abandonado'::public.estado_vehiculo_enum
      when estado_vehiculo ilike '%taller%' then 'taller'::public.estado_vehiculo_enum
      when estado_vehiculo ilike '%recuperado%' then 'recuperado'::public.estado_vehiculo_enum
      else null
    end
  ),
  alter column intencion_pago type public.intencion_pago_enum using (
    case
      when intencion_pago ilike '%alta%' then 'alta'::public.intencion_pago_enum
      when intencion_pago ilike '%media%' then 'media'::public.intencion_pago_enum
      when intencion_pago ilike '%baja%' then 'baja'::public.intencion_pago_enum
      when intencion_pago ilike '%nula%' then 'nula'::public.intencion_pago_enum
      else null
    end
  ),
  alter column contactabilidad type public.contactabilidad_enum using (
    case
      when contactabilidad ilike '%contactado%' then 'contactado'::public.contactabilidad_enum
      when contactabilidad ilike '%no_contesta%' then 'no_contesta'::public.contactabilidad_enum
      when contactabilidad ilike '%ilocalizable%' then 'ilocalizable'::public.contactabilidad_enum
      else null
    end
  ),
  alter column objetivo_caso type public.objetivo_caso_enum using (
    case
      when objetivo_caso ilike '%cartera%' then 'recuperar_cartera'::public.objetivo_caso_enum
      when objetivo_caso ilike '%retener%' then 'retener_vehiculo'::public.objetivo_caso_enum
      when objetivo_caso ilike '%renegociar%' then 'renegociar'::public.objetivo_caso_enum
      when objetivo_caso ilike '%recuperacion%' then 'recuperacion'::public.objetivo_caso_enum
      else null
    end
  ),
  alter column estado type public.estado_caso_enum using (
    case 
      when estado ilike '%nuevo%' then 'nuevo'::public.estado_caso_enum
      when estado ilike '%gestionando%' then 'gestionando'::public.estado_caso_enum
      when estado ilike '%pre_judicial%' then 'pre_judicial'::public.estado_caso_enum
      when estado ilike '%judicial%' then 'judicial'::public.estado_caso_enum
      when estado ilike '%cerrado%' then 'cerrado'::public.estado_caso_enum
      when estado ilike '%castigado%' then 'castigado'::public.estado_caso_enum
      when estado ilike '%revisión%' then 'nuevo'::public.estado_caso_enum
      else 'nuevo'::public.estado_caso_enum 
    end
  );

-- 7. Restaurar el RPC para crear casos
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
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;
  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;
  if p_event_descripcion is null or trim(p_event_descripcion) = '' then raise exception 'descripcion del evento inicial es requerida'; end if;

  insert into public.cases (
    id_sistema, estado, prioridad, riesgo, abogado_id, proxima_accion, fecha_proxima_accion,
    fecha_inicio, fecha_ultima_gestion, monto_referencia, tipo_proceso, estado_vehiculo,
    objetivo_caso, intencion_pago, contactabilidad, created_at, updated_at
  ) values (
    p_id_sistema, p_estado, p_prioridad, p_riesgo, p_abogado_id, p_proxima_accion, p_fecha_proxima_accion,
    now(), now(), p_monto_referencia, p_tipo_proceso, p_estado_vehiculo,
    p_objetivo_caso, p_intencion_pago, p_contactabilidad, now(), now()
  ) returning id into v_case_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle
  );

  insert into public.case_status_history (
    case_id, estado_anterior, estado_nuevo, usuario_id, fecha
  ) values (
    v_case_id, null, p_estado::text, auth.uid(), now()
  );

  return v_case_id;
end;
$$;

-- 8. Restaurar Trigger para eventos
create or replace function public.tg_case_events_set_now_and_touch_case()
returns trigger
language plpgsql
as $$
declare
  v_intencion_pago public.intencion_pago_enum;
  v_contactabilidad public.contactabilidad_enum;
begin
  new.fecha := now();
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
        updated_at = now()
  where id = new.case_id;

  return new;
end;
$$;

drop trigger if exists tg_case_events_set_now_and_touch_case_trigger on public.case_events;
create trigger tg_case_events_set_now_and_touch_case_trigger
  before insert on public.case_events
  for each row
  execute function public.tg_case_events_set_now_and_touch_case();

-- 9. Restaurar RPC Dashboard
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
    and c.contactabilidad = 'no_contesta'::public.contactabilidad_enum;
$$;

-- 10. Restaurar RPC para registrar eventos (necesario tras limpiar funciones)
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
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_canal, p_detalle
  ) returning id into v_event_id;

  if p_proxima_accion is not null or p_fecha_proxima_accion is not null then
    if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
    if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;
    
    update public.cases
      set proxima_accion = p_proxima_accion,
          fecha_proxima_accion = p_fecha_proxima_accion,
          updated_at = now()
    where id = p_case_id;
  end if;

  return v_event_id;
end;
$$;

-- 11. Restaurar RPC para cambiar estado (con enum estricto)
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
begin
  if not public.is_legal_staff() then raise exception 'No autorizado'; end if;

  if p_proxima_accion is null or trim(p_proxima_accion) = '' then raise exception 'proxima_accion es requerida'; end if;
  if p_fecha_proxima_accion is null then raise exception 'fecha_proxima_accion es requerida'; end if;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids, canal, detalle
  ) values (
    p_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids, p_event_canal, p_event_detalle
  );

  perform set_config('app.bypass_status_guard', 'on', true);

  update public.cases
    set estado = p_estado_nuevo,
        proxima_accion = p_proxima_accion,
        fecha_proxima_accion = p_fecha_proxima_accion,
        updated_at = now()
  where id = p_case_id;
end;
$$;
