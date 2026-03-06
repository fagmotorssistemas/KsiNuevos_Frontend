-- Tabla aseguradoras para el módulo de seguros
create table if not exists aseguradoras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ruc text,
  telefono text,
  email text,
  direccion text,

  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,

  porcentaje_base_seguro numeric(5,2),

  trabaja_con_gps boolean default false,
  activa boolean default true,

  observaciones text,
  created_at timestamp with time zone default now()
);

-- Índices útiles
create index if not exists idx_aseguradoras_activa on aseguradoras(activa);
create index if not exists idx_aseguradoras_nombre on aseguradoras(nombre);

-- RLS (opcional): permitir lectura/escritura según tu política
-- alter table aseguradoras enable row level security;
-- create policy "Allow all for authenticated" on aseguradoras for all using (auth.role() = 'authenticated');
