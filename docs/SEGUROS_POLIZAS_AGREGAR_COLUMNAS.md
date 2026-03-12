# Columnas a agregar en `seguros_polizas` (reventa / cliente particular)

La app **Reventa de seguros** (y el flujo **Cliente particular**) guarda en `seguros_polizas` los datos del cliente y del vehículo al registrar una venta. Si tu tabla ya existe pero **no tiene** esas columnas, ejecuta en el **SQL Editor** de Supabase el siguiente bloque.

---

## 1. Columnas que faltan (reventa / cliente particular)

Estas son las que usa el formulario "Registrar venta" (nombre, RUC/CI, teléfono, vehículo, placa, etc.):

| Columna                  | Tipo     | Uso en la app                          |
|--------------------------|----------|----------------------------------------|
| `cliente_nombre`         | `text`   | Nombre completo del cliente            |
| `cliente_identificacion` | `text`   | RUC o cédula                           |
| `cliente_telefono`      | `text`   | Teléfono                               |
| `cliente_email`         | `text`   | Email (opcional)                       |
| `vehiculo_descripcion`  | `text`   | Marca, modelo del vehículo             |
| `vehiculo_placa`        | `text`   | Placa                                   |

Tu tabla ya tiene: `fecha_venta`, `precio_venta`, `nota_venta`, `evidencias`, `observaciones_venta`, `vendido`, `activo`, y `broker_id` (FK a `brokers`).  
La app usa **`broker_id`** (tabla `brokers`); el selector de Broker en Ventas carga los datos desde esa tabla.  
Solo hay que **añadir** las columnas de cliente/vehículo de la tabla de arriba si no existen.

---

## 2. SQL para agregar las columnas

Copia y ejecuta en Supabase (sirve aunque la tabla ya tenga otras columnas como `broker_id`):

```sql
-- Reventa / Cliente particular: datos del cliente y vehículo
alter table public.seguros_polizas
  add column if not exists cliente_nombre text,
  add column if not exists cliente_identificacion text,
  add column if not exists cliente_telefono text,
  add column if not exists cliente_email text,
  add column if not exists vehiculo_descripcion text,
  add column if not exists vehiculo_placa text;
```

- Si alguna columna ya existe, `if not exists` evita error.
- **Broker:** la app usa **`broker_id`** (FK a la tabla `brokers`). El desplegable Broker en “Registrar venta” se llena desde `brokers` (activos) y se guarda el `id`. No hace falta columna de texto `broker`.

---

## 3. Dónde se guarda cada dato del formulario

| Campo del modal "Registrar venta" | Columna en `seguros_polizas`   |
|-----------------------------------|---------------------------------|
| Nombre completo                   | `cliente_nombre`                |
| RUC / CI                          | `cliente_identificacion`        |
| Teléfono                          | `cliente_telefono`             |
| (Email no se muestra en el form)  | `cliente_email`                 |
| Marca, modelo                     | `vehiculo_descripcion`         |
| Placa                             | `vehiculo_placa`               |
| Fecha venta                       | `fecha_venta` (ya la tienes)   |
| Precio venta al cliente           | `precio_venta` (ya la tienes)  |
| Nota de venta                     | `nota_venta` (ya la tienes)   |
| Broker                            | `broker_id` (FK a tabla `brokers`) |
| Observaciones venta               | `observaciones_venta` (ya la tienes) |

Al marcar la póliza como vendida, la app además actualiza `vendido = true`.

---

## 4. Resumen

1. Ejecuta el `alter table` de la sección 2 en el SQL Editor de Supabase.
2. Con eso, los datos del **cliente particular** (y de la reventa en general) se guardan en `seguros_polizas` y el formulario dejará de fallar por columnas inexistentes.
3. No hace falta crear tablas nuevas ni cambiar FKs; solo agregar estas columnas a tu tabla actual.
