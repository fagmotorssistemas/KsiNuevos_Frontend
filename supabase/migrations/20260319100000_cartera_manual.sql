-- Cartera manual: obligaciones fuera de Oracle + vínculo opcional a cases legal

-- =========================
-- Quién puede ver/editar cartera manual (misma idea que contabilidad + legal)
-- =========================
create or replace function public.is_cartera_manual_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, '')) in (
        'admin', 'finanzas', 'contable', 'abogado', 'abogada'
      )
  );
$$;

-- =========================
-- Tabla principal (una fila = una obligación / expediente manual)
-- =========================
create table if not exists public.cartera_manual (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  identificacion text,
  telefono_1 text,
  telefono_2 text,
  email text,
  direccion text,
  vehiculo_marca text,
  vehiculo_modelo text,
  vehiculo_anio text,
  vehiculo_placa text,
  fecha_venta date,
  monto_original numeric(14, 2),
  saldo_actual numeric(14, 2) not null default 0,
  valor_cuota numeric(14, 2),
  numero_cuotas_total integer,
  numero_cuotas_pagadas integer not null default 0,
  frecuencia_pago text,
  proximo_vencimiento date,
  dias_mora integer not null default 0,
  estado_operacion text not null default 'vigente'
    constraint cartera_manual_estado_operacion_check
      check (estado_operacion in ('vigente', 'regularizado', 'judicial', 'castigado', 'cerrado')),
  notas_internas text,
  activo boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cartera_manual_nombre on public.cartera_manual (nombre_completo);
create index if not exists idx_cartera_manual_saldo on public.cartera_manual (saldo_actual desc);
create index if not exists idx_cartera_manual_activo on public.cartera_manual (activo);
create index if not exists idx_cartera_manual_proximo_vencimiento on public.cartera_manual (proximo_vencimiento);

comment on table public.cartera_manual is 'Obligaciones de cobro registradas manualmente (sin Oracle).';

-- =========================
-- RLS cartera_manual
-- =========================
alter table public.cartera_manual enable row level security;

drop policy if exists cartera_manual_select_staff on public.cartera_manual;
create policy cartera_manual_select_staff
on public.cartera_manual
for select
using (public.is_cartera_manual_staff());

drop policy if exists cartera_manual_insert_staff on public.cartera_manual;
create policy cartera_manual_insert_staff
on public.cartera_manual
for insert
with check (public.is_cartera_manual_staff());

drop policy if exists cartera_manual_update_staff on public.cartera_manual;
create policy cartera_manual_update_staff
on public.cartera_manual
for update
using (public.is_cartera_manual_staff())
with check (public.is_cartera_manual_staff());

drop policy if exists cartera_manual_delete_staff on public.cartera_manual;
create policy cartera_manual_delete_staff
on public.cartera_manual
for delete
using (public.is_cartera_manual_staff());

-- =========================
-- cases: id_sistema opcional + cartera_manual_id (exactamente uno de los dos)
-- =========================
alter table public.cases alter column id_sistema drop not null;

alter table public.cases
  add column if not exists cartera_manual_id uuid references public.cartera_manual (id) on delete restrict;

create index if not exists idx_cases_cartera_manual_id on public.cases (cartera_manual_id);

-- Eliminar filas inválidas no debería ocurrir; el check aplica a filas nuevas/actualizadas.
alter table public.cases drop constraint if exists cases_origen_cartera_check;
alter table public.cases
  add constraint cases_origen_cartera_check check (
    (
      id_sistema is not null
      and cartera_manual_id is null
    )
    or (
      id_sistema is null
      and cartera_manual_id is not null
    )
  );

comment on column public.cases.cartera_manual_id is 'Obligación en cartera_manual cuando el caso no viene de Oracle (id_sistema).';

-- =========================
-- rpc_create_case: p_id_sistema opcional + p_cartera_manual_id
-- (cuerpo alineado con 20260318010000_proceso_etapas_workflow.sql)
-- =========================
create or replace function public.rpc_create_case(
  p_id_sistema bigint default null,
  p_estado public.estado_caso_enum default null,
  p_prioridad text default null,
  p_riesgo text default null,
  p_abogado_id uuid default null,
  p_proxima_accion text default null,
  p_fecha_proxima_accion timestamptz default null,
  p_monto_referencia numeric default null,
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
  p_contactabilidad public.contactabilidad_enum default null,
  p_cartera_manual_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_now timestamptz;
  v_etapa_id uuid;
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  if (p_id_sistema is null and p_cartera_manual_id is null) then
    raise exception 'Debe indicar id_sistema (Oracle) o cartera_manual_id';
  end if;
  if (p_id_sistema is not null and p_cartera_manual_id is not null) then
    raise exception 'No puede indicar ambos id_sistema y cartera_manual_id';
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

  if p_estado is null then
    raise exception 'estado es requerido';
  end if;

  v_now := (now() at time zone 'America/Guayaquil');

  if p_tipo_proceso is not null then
    select id into v_etapa_id
    from public.proceso_etapas
    where tipo_proceso = p_tipo_proceso
    order by orden asc
    limit 1;
  end if;

  insert into public.cases (
    id_sistema,
    cartera_manual_id,
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
    etapa_actual_id,
    created_at,
    updated_at
  ) values (
    p_id_sistema,
    p_cartera_manual_id,
    p_estado,
    p_prioridad,
    p_riesgo,
    p_abogado_id,
    p_proxima_accion,
    p_fecha_proxima_accion,
    v_now,
    v_now,
    p_monto_referencia,
    p_tipo_proceso,
    p_estado_vehiculo,
    p_objetivo_caso,
    p_intencion_pago,
    p_contactabilidad,
    v_etapa_id,
    v_now,
    v_now
  )
  returning id into v_case_id;

  insert into public.case_events (
    case_id,
    tipo,
    descripcion,
    resultado,
    usuario_id,
    documento_id,
    imagenes_ids,
    canal,
    detalle,
    etapa_id,
    fecha
  ) values (
    v_case_id,
    p_event_tipo,
    p_event_descripcion,
    p_event_resultado,
    auth.uid(),
    p_documento_id,
    p_imagenes_ids,
    p_event_canal,
    p_event_detalle,
    v_etapa_id,
    v_now
  );

  insert into public.case_status_history (
    case_id,
    estado_anterior,
    estado_nuevo,
    usuario_id,
    fecha
  ) values (
    v_case_id,
    null,
    p_estado::text,
    auth.uid(),
    v_now
  );

  return v_case_id;
end;
$$;
