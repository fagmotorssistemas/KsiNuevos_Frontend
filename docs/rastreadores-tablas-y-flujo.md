# Rastreadores: organización de tablas y flujo de datos

**Importante:** La tabla `dispositivos_rastreo` ya no existe. Toda la información se guarda y se lee desde **ventas_rastreador** y las tablas relacionadas según `src/types/supabase.ts`.

## Esquema (relaciones en BD)

### clientes_externos
- Columnas: `id`, `nombre_completo`, `identificacion`, `telefono`, `email`, `direccion`, `created_at`.
- Placa, marca, modelo, anio, color del vehículo van en **vehiculos** (`vehiculos.cliente_id` → clientes_externos).

### vehiculos
- `cliente_id` → clientes_externos(id). Columnas: `placa`, `marca`, `modelo`, `anio`, `color`.

### gps_inventario
- Columnas: `id`, `imei`, `serie`, `modelo_id`, `proveedor_id`, `costo_compra`, `estado`, `ubicacion`, etc.
- Cada venta referencia un GPS por **gps_id**.

### ventas_rastreador (tabla central)
- **gps_id** → gps_inventario(id)
- **cliente_id** → clientes_externos(id)
- **vehiculo_id** → vehiculos(id) (opcional)
- **instalador_id** → gps_instaladores(id)
- **concesionaria_id** → concesionarias(id) (opcional)
- **asesor_id** → profiles(id)
- Columnas: `entorno`, `tipo_pago`, `precio_total`, `abono_inicial`, `total_financiado`, `numero_cuotas`, `metodo_pago`, `url_comprobante_pago`, `fecha_entrega`, `asesor_id`, `observacion`, `nota_venta`, `es_venta_externa`, `fecha_instalacion`, `costo_instalacion`.

### cuotas_rastreador
- **venta_id** → ventas_rastreador(id). Campos: `numero_cuota`, `valor`, `fecha_vencimiento`, `estado`.

## Flujo de guardado (sin dispositivos_rastreo)

1. **Venta a tercero (externa):**
   - Crear/actualizar **clientes_externos** (nombre_completo, identificacion, telefono, email, direccion).
   - Si hay placa/marca/modelo: crear **vehiculos** (cliente_id, placa, marca, modelo, anio, color).
   - **gps_id:** si hay ítem de stock = id de gps_inventario; si no, se crea una fila en **gps_inventario** (imei, costo_compra, estado VENDIDO).
   - Insertar **ventas_rastreador** (gps_id, cliente_id, vehiculo_id, concesionaria_id si aplica, precio_total, tipo_pago, nota_venta, fecha_entrega, asesor_id, observacion, es_venta_externa = true, etc.).
   - Si es crédito: insertar **cuotas_rastreador**.
   - Si se usó stock: actualizar **gps_inventario** (estado VENDIDO, ubicacion).

2. **Vinculación a auto (no externa):**
   - Obtener **gps_id** (stock o crear en gps_inventario).
   - Insertar **ventas_rastreador** (gps_id, precio_total, tipo_pago, …) y **cuotas_rastreador** si aplica.
   - Actualizar **gps_inventario** si se usó stock.

## Lista y cartera

- **Lista contratos externos:** desde **ventas_rastreador** (es_venta_externa = true) con join a clientes_externos y vehiculos (placa, marca, modelo).
- **Cartera:** solo **ventas_rastreador** (con clientes_externos y gps_inventario) + Oracle para autos.
- **Historial por cliente:** **ventas_rastreador** filtrado por cliente_id (clientes_externos por identificacion) con gps_inventario.

## Resumen
- **Ya no se usa** `dispositivos_rastreo`. Todo se guarda en **ventas_rastreador**, **clientes_externos**, **vehiculos**, **gps_inventario**, **cuotas_rastreador**.
- Nombres de columnas en código = nombres en BD (`gps_id`, `fecha_entrega`, `nombre_completo`, `identificacion`, etc.).
