-- Módulo Legal / Cobranza: auditoría + reglas de negocio (Supabase/Postgres)
-- Reglas clave:
-- - NO borrar historial (solo insertar)
-- - Events siempre con fecha = now()
-- - Insertar event actualiza cases.fecha_ultima_gestion
-- - Cambios de estado se registran en case_status_history
-- - Prohibir cambios de estado directos (solo vía RPC)
-- - Tareas requieren fecha_limite y se marcan vencidas automáticamente

-- =========================
-- Helpers de rol (profiles)
-- =========================
create or replace function public.current_profile_role()
returns text
language plpgsql
stable
as $$
declare
  v_role text;
begin
  select role::text into v_role from public.profiles where id = auth.uid();
  return coalesce(v_role, '');
end;
$$;

create or replace function public.is_legal_staff()
returns boolean
language sql
stable
as $$
  select lower(public.current_profile_role()) in ('admin', 'abogado', 'abogada');
$$;

-- =========================
-- Constraints e índices
-- =========================
do $$
begin
  -- case_tasks.fecha_limite NO puede ser null
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_tasks_fecha_limite_not_null'
  ) then
    alter table public.case_tasks
      alter column fecha_limite set not null;

    alter table public.case_tasks
      add constraint case_tasks_fecha_limite_not_null check (fecha_limite is not null);
  end if;
exception
  when undefined_table then
    -- Si las tablas aún no existen en este entorno, no fallamos la migración.
    null;
end $$;

create index if not exists idx_cases_id_sistema on public.cases(id_sistema);
create index if not exists idx_case_events_case_id_fecha on public.case_events(case_id, fecha desc);
create index if not exists idx_case_tasks_case_id_estado on public.case_tasks(case_id, estado);
create index if not exists idx_case_status_history_case_id_fecha on public.case_status_history(case_id, fecha desc);

-- =========================
-- Triggers: eventos (fecha, ultima gestion)
-- =========================
create or replace function public.tg_case_events_set_now_and_touch_case()
returns trigger
language plpgsql
as $$
begin
  -- Regla 2: no permitir fecha manual
  new.fecha := now();

  -- Regla 3: insertar event -> actualizar fecha_ultima_gestion
  update public.cases
    set fecha_ultima_gestion = new.fecha,
        updated_at = now()
  where id = new.case_id;

  return new;
end;
$$;

drop trigger if exists trg_case_events_set_now_and_touch_case on public.case_events;
create trigger trg_case_events_set_now_and_touch_case
before insert on public.case_events
for each row
execute function public.tg_case_events_set_now_and_touch_case();

-- =========================
-- Triggers: historial de estado
-- =========================
create or replace function public.tg_cases_guard_and_history()
returns trigger
language plpgsql
as $$
declare
  bypass text;
begin
  if tg_op = 'UPDATE' then
    if new.estado is distinct from old.estado then
      bypass := current_setting('app.bypass_status_guard', true);

      -- Bloqueo duro: no permitir cambios directos de estado
      if bypass is distinct from 'on' then
        raise exception 'Cambio de estado no permitido sin registrar evento (use RPC).';
      end if;

      -- Regla 4: guardar historial automáticamente
      insert into public.case_status_history (
        case_id,
        estado_anterior,
        estado_nuevo,
        usuario_id,
        fecha
      ) values (
        old.id,
        old.estado,
        new.estado,
        auth.uid(),
        now()
      );
    end if;

    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cases_guard_and_history on public.cases;
create trigger trg_cases_guard_and_history
before update on public.cases
for each row
execute function public.tg_cases_guard_and_history();

-- =========================
-- Tareas: marcar vencidas automáticamente
-- =========================
create or replace function public.mark_overdue_case_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.case_tasks
    set estado = 'vencido'
  where estado = 'pendiente'
    and fecha_limite < now();

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- =========================
-- RPC: Crear case (+ evento inicial)
-- =========================
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
  p_imagenes_ids text[] default null
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
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids
  ) values (
    v_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids
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

-- =========================
-- RPC: Registrar evento (y opcionalmente próxima acción)
-- =========================
create or replace function public.rpc_register_case_event(
  p_case_id uuid,
  p_tipo text,
  p_descripcion text,
  p_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null,
  p_proxima_accion text default null,
  p_fecha_proxima_accion timestamptz default null
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
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids
  ) values (
    p_case_id, p_tipo, p_descripcion, p_resultado, auth.uid(), p_documento_id, p_imagenes_ids
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

-- =========================
-- RPC: Cambiar estado (SIEMPRE registra event)
-- =========================
create or replace function public.rpc_change_case_status(
  p_case_id uuid,
  p_estado_nuevo text,
  p_event_tipo text,
  p_event_descripcion text,
  p_proxima_accion text,
  p_fecha_proxima_accion timestamptz,
  p_event_resultado text default null,
  p_documento_id text default null,
  p_imagenes_ids text[] default null
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
    case_id, tipo, descripcion, resultado, usuario_id, documento_id, imagenes_ids
  ) values (
    p_case_id, p_event_tipo, p_event_descripcion, p_event_resultado, auth.uid(), p_documento_id, p_imagenes_ids
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

-- =========================
-- RPC: Crear tarea (y registrar evento)
-- =========================
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
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;
  if p_fecha_limite is null then
    raise exception 'fecha_limite es requerida';
  end if;

  insert into public.case_tasks (
    case_id, tipo, descripcion, fecha_limite, estado, usuario_id, created_at
  ) values (
    p_case_id, p_tipo, p_descripcion, p_fecha_limite, 'pendiente', auth.uid(), now()
  )
  returning id into v_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id
  ) values (
    p_case_id, 'tarea_creada', coalesce(p_descripcion, 'Tarea creada'), null, auth.uid()
  );

  return v_task_id;
end;
$$;

-- =========================
-- RPC: Completar tarea (y registrar evento)
-- =========================
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
begin
  if not public.is_legal_staff() then
    raise exception 'No autorizado';
  end if;

  select case_id into v_case_id
  from public.case_tasks
  where id = p_task_id;

  if v_case_id is null then
    raise exception 'Tarea no encontrada';
  end if;

  update public.case_tasks
    set estado = 'completado',
        completed_at = now()
  where id = p_task_id;

  insert into public.case_events (
    case_id, tipo, descripcion, resultado, usuario_id
  ) values (
    v_case_id, 'tarea_completada', p_event_descripcion, null, auth.uid()
  );
end;
$$;

-- =========================
-- Query útil: Case completo (JSON)
-- =========================
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
                       from public.case_status_history h where h.case_id = p_case_id)
  );
$$;

-- =========================
-- Bonus: casos sin gestión en X días (para alertas)
-- =========================
create or replace function public.rpc_cases_without_gestion(p_days integer)
returns setof public.cases
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.cases c
  where public.is_legal_staff()
    and (c.fecha_ultima_gestion is null or c.fecha_ultima_gestion < now() - make_interval(days => greatest(p_days, 0)));
$$;

-- =========================
-- RLS recomendado (solo Admin/Abogado)
-- =========================
do $$
begin
  perform 1 from pg_class where relname = 'cases' and relnamespace = 'public'::regnamespace;
  alter table public.cases enable row level security;
  alter table public.case_events enable row level security;
  alter table public.case_tasks enable row level security;
  alter table public.case_status_history enable row level security;
exception
  when undefined_table then null;
end $$;

drop policy if exists cases_select_legal_staff on public.cases;
create policy cases_select_legal_staff
on public.cases
for select
using (public.is_legal_staff());

drop policy if exists cases_insert_legal_staff on public.cases;
create policy cases_insert_legal_staff
on public.cases
for insert
with check (public.is_legal_staff());

-- Nota: NO creamos policy UPDATE en cases para forzar uso de RPC (estado y próxima acción).

drop policy if exists case_events_select_legal_staff on public.case_events;
create policy case_events_select_legal_staff
on public.case_events
for select
using (public.is_legal_staff());

drop policy if exists case_events_insert_legal_staff on public.case_events;
create policy case_events_insert_legal_staff
on public.case_events
for insert
with check (public.is_legal_staff());

drop policy if exists case_tasks_select_legal_staff on public.case_tasks;
create policy case_tasks_select_legal_staff
on public.case_tasks
for select
using (public.is_legal_staff());

drop policy if exists case_tasks_insert_legal_staff on public.case_tasks;
create policy case_tasks_insert_legal_staff
on public.case_tasks
for insert
with check (public.is_legal_staff());

drop policy if exists case_tasks_update_legal_staff on public.case_tasks;
create policy case_tasks_update_legal_staff
on public.case_tasks
for update
using (public.is_legal_staff())
with check (public.is_legal_staff());

drop policy if exists case_status_history_select_legal_staff on public.case_status_history;
create policy case_status_history_select_legal_staff
on public.case_status_history
for select
using (public.is_legal_staff());

drop policy if exists case_status_history_insert_legal_staff on public.case_status_history;
create policy case_status_history_insert_legal_staff
on public.case_status_history
for insert
with check (public.is_legal_staff());

