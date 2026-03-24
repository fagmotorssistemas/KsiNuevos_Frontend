-- Extiende cartera_manual con datos de garante
alter table public.cartera_manual
  add column if not exists garante_nombre text,
  add column if not exists garante_identificacion text,
  add column if not exists garante_telefono text,
  add column if not exists garante_direccion text;

create table if not exists public.cartera_manual_delete_requests (
  id uuid primary key default gen_random_uuid(),
  cartera_manual_id uuid not null references public.cartera_manual (id) on delete cascade,
  motivo text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada')),
  requested_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists uq_cartera_manual_delete_request_pending
  on public.cartera_manual_delete_requests (cartera_manual_id)
  where estado = 'pendiente';

create index if not exists idx_cartera_manual_delete_requests_estado
  on public.cartera_manual_delete_requests (estado, created_at desc);

alter table public.cartera_manual_delete_requests enable row level security;

drop policy if exists cartera_manual_delete_req_select_staff on public.cartera_manual_delete_requests;
create policy cartera_manual_delete_req_select_staff
on public.cartera_manual_delete_requests
for select
using (public.is_cartera_manual_staff());

drop policy if exists cartera_manual_delete_req_insert_abogado on public.cartera_manual_delete_requests;
create policy cartera_manual_delete_req_insert_abogado
on public.cartera_manual_delete_requests
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, '')) in ('admin', 'abogado', 'abogada')
  )
  and requested_by = auth.uid()
  and estado = 'pendiente'
);

drop policy if exists cartera_manual_delete_req_update_admin on public.cartera_manual_delete_requests;
create policy cartera_manual_delete_req_update_admin
on public.cartera_manual_delete_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, '')) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, '')) = 'admin'
  )
);
