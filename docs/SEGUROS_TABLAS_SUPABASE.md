# Tablas Supabase – Módulo Seguros

Copia y pega el SQL en el **SQL Editor** de tu proyecto Supabase y ejecuta en el orden indicado. Así tendrás todas las tablas que usa el módulo de seguros.

---

## Orden de ejecución

1. **aseguradoras** (sin dependencias)
2. **seguros_contratos** (pólizas del formulario Dashboard / Gestionar)
3. **seguros_polizas** (compras + reventa; depende de `aseguradoras`)
4. **Renovaciones** (opcional): columnas en `seguros_contratos` y/o tabla `seguros_renovaciones`

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

## 4. Renovaciones (opcional)

La página **Renovaciones** (`/seguros/renovaciones`) lista contratos próximos a vencer (≤ 60 días) y permite buscar cualquier contrato para renovar. Al hacer clic en "Renovar" se abre el formulario de Gestionar para emitir el 2º año.

Si quieres guardar en base de datos que una póliza es renovación de otra y su vigencia:

**Opción A – Añadir columnas a `seguros_contratos`**

```sql
alter table seguros_contratos
  add column if not exists vigencia_desde date,
  add column if not exists vigencia_hasta date,
  add column if not exists renovado_de_nota text;
```

**Opción B – Tabla de historial de renovaciones**

```sql
create table if not exists seguros_renovaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nota_venta_anterior text not null,
  cliente_identificacion text,
  fecha_renovacion date not null default current_date,
  vigencia_desde date,
  vigencia_hasta date,
  nota_venta_nueva text,
  observaciones text
);
create index if not exists idx_seguros_renovaciones_nota_anterior on seguros_renovaciones(nota_venta_anterior);
```

La app de Renovaciones funciona con o sin estas estructuras.

---

## Resumen

| Tabla               | Uso en la app                                                                 |
|---------------------|-------------------------------------------------------------------------------|
| **aseguradoras**    | Catálogo en `/seguros/aseguradoras` y selector en Compras.                    |
| **seguros_contratos** | Pólizas del formulario “Gestionar” (Dashboard seguros).                     |
| **seguros_polizas** | Compras y reventa (`/seguros/compras`, `/seguros/ventas`). |
| Columnas en seguros_contratos | Opcional: vigencia_desde, vigencia_hasta, renovado_de_nota. |
| **seguros_renovaciones** | Opcional: historial de renovaciones. |

Si ya tienes alguna tabla creada, ejecuta solo los bloques que falten. Usa `add column if not exists` y `create table if not exists` para evitar errores.
