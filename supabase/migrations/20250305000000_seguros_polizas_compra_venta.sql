-- Fichas: 1) Compra a aseguradora  2) Reventa al cliente
-- Una misma póliza tiene datos de compra (costo) y de venta (precio al cliente)

create table if not exists seguros_polizas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Referencia interna (nota venta, orden, etc.)
  referencia text,
  numero_certificado text,

  -- ========== ESCENARIO 1: COMPRA A LA ASEGURADORA ==========
  aseguradora_id uuid references aseguradoras(id) on delete set null,
  fecha_compra date,
  costo_compra numeric(12,2) not null default 0,
  factura_aseguradora text,
  vigencia_desde date,
  vigencia_hasta date,
  plan_tipo text,
  observaciones_compra text,

  -- ========== ESCENARIO 2: REVENTA AL CLIENTE ==========
  cliente_nombre text,
  cliente_identificacion text,
  cliente_telefono text,
  cliente_email text,
  vehiculo_descripcion text,
  vehiculo_placa text,
  fecha_venta date,
  precio_venta numeric(12,2) not null default 0,
  nota_venta text,
  broker text,
  evidencias text[] default '{}',
  observaciones_venta text,

  -- Estado
  vendido boolean default false,
  activo boolean default true
);

create index if not exists idx_seguros_polizas_aseguradora on seguros_polizas(aseguradora_id);
create index if not exists idx_seguros_polizas_fecha_compra on seguros_polizas(fecha_compra);
create index if not exists idx_seguros_polizas_fecha_venta on seguros_polizas(fecha_venta);
create index if not exists idx_seguros_polizas_nota_venta on seguros_polizas(nota_venta);
create index if not exists idx_seguros_polizas_vendido on seguros_polizas(vendido);

comment on table seguros_polizas is 'Fichas: compra a aseguradora (costo) y reventa al cliente (precio venta)';
