# Tablas Supabase – Módulo Seguros

Copia y pega el SQL en el **SQL Editor** de tu proyecto Supabase y ejecuta en el orden indicado. Así tendrás todas las tablas que usa el módulo de seguros.

---

## Orden de ejecución

1. **aseguradoras** (sin dependencias)
2. **seguros_contratos** (pólizas del formulario Dashboard / Gestionar)
3. **seguros_polizas** (compras a aseguradora + reventa al cliente; depende de `aseguradoras`)

---

## 1. Tabla `aseguradoras`

Catálogo de aseguradoras (MAPFRE, CHUBB, etc.). Usada en **Aseguradoras** y en **Compras a aseguradoras**.

```sql
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

create index if not exists idx_aseguradoras_activa on aseguradoras(activa);
create index if not exists idx_aseguradoras_nombre on aseguradoras(nombre);
```

---

## 2. Tabla `seguros_contratos`

Pólizas registradas desde el Dashboard de seguros (formulario “Gestionar” por nota de venta). Guarda broker, aseguradora, costo, precio venta y evidencias.

```sql
-- Pólizas emitidas (formulario Gestionar en Dashboard seguros)
create table if not exists seguros_contratos (
  id bigserial primary key,
  identificacion_cliente text not null,
  nota_venta text not null,
  broker text not null,
  aseguradora text not null,
  tipo_seguro text,
  costo_seguro numeric(12,2),
  precio_venta numeric(12,2),
  evidencias text[] default '{}',
  registrado_por text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_seguros_contratos_nota_venta on seguros_contratos(nota_venta);
```

---

## 3. Tabla `seguros_polizas`

Fichas de **compra a la aseguradora** (costo, certificado, vigencia) y de **reventa al cliente** (precio venta, cliente, vehículo). Una misma fila puede tener solo compra (`vendido = false`) o compra + venta (`vendido = true`).

**Debe ejecutarse después de `aseguradoras`** (hay FK a `aseguradoras.id`).

```sql
-- Fichas: 1) Compra a aseguradora  2) Reventa al cliente
create table if not exists seguros_polizas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  referencia text,
  numero_certificado text,

  -- Compra a la aseguradora
  aseguradora_id uuid references aseguradoras(id) on delete set null,
  fecha_compra date,
  costo_compra numeric(12,2) not null default 0,
  factura_aseguradora text,
  vigencia_desde date,
  vigencia_hasta date,
  plan_tipo text,
  observaciones_compra text,

  -- Reventa al cliente
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

  vendido boolean default false,
  activo boolean default true
);

create index if not exists idx_seguros_polizas_aseguradora on seguros_polizas(aseguradora_id);
create index if not exists idx_seguros_polizas_fecha_compra on seguros_polizas(fecha_compra);
create index if not exists idx_seguros_polizas_fecha_venta on seguros_polizas(fecha_venta);
create index if not exists idx_seguros_polizas_nota_venta on seguros_polizas(nota_venta);
create index if not exists idx_seguros_polizas_vendido on seguros_polizas(vendido);
```

---

## Resumen

| Tabla               | Uso en la app                                                                 |
|---------------------|-------------------------------------------------------------------------------|
| **aseguradoras**    | Catálogo en `/seguros/aseguradoras` y selector en Compras.                    |
| **seguros_contratos** | Pólizas del formulario “Gestionar” (Dashboard seguros).                     |
| **seguros_polizas** | Compras a aseguradora y reventa al cliente (`/seguros/compras`, `/seguros/ventas`). |

Si ya tienes alguna tabla creada, puedes ejecutar solo los bloques que falten. `create table if not exists` evita errores si la tabla ya existe.
