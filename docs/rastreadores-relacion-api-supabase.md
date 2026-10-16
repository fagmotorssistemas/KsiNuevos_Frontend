# Rastreadores: relación entre la API (Oracle) y Supabase

## Resumen

La llave que une la API (Oracle) con Supabase es la **nota de venta** (`nota_venta`, por ejemplo `NV-001-001-0000136`). Oracle no conoce el GPS y Supabase no guarda el contrato del auto. El frontend descarga las dos fuentes por separado y las cruza en el navegador comparando ese texto.

## Las dos fuentes

| Fuente | Qué aporta | Dónde se consulta |
|---|---|---|
| API Oracle (`API_URL/contratos/list` y `/contratos/detalle/:id`) | Ventas K-SI: cliente, RUC, vehículo, nota de venta, `totRastreador`, cuotas | `src/services/rastreadores/contratos.service.ts` |
| Supabase `ventas_rastreador` | GPS vendido o instalado: `gps_id`, estado, instalador, precio, asesor y `nota_venta` | `src/services/rastreadores/vinculacion.service.ts`, `src/services/rastreadores/cartera-rastreadores.service.ts` |

En Supabase, `ventas_rastreador` se relaciona con otras tablas mediante claves foráneas reales, que se resuelven con joins de PostgREST:

- `gps_id` → `gps_inventario`, de donde salen el IMEI, el costo de compra y el estado de conexión.
- `cliente_id` → `clientes_externos`.
- `vehiculos` y `concesionarias`, solo para las ventas externas.
- `es_venta_externa` indica si la venta es de K-SI (`false`) o externa (`true`).

Entre Oracle y Supabase **no existe una clave foránea**. La relación es solo el texto de `nota_venta`.

## Pantalla "Gestión de Rastreo"

### 1. Se arma la lista de contratos

Lo hace `getListaContratosGPS` (`contratos.service.ts`), con dos consultas en paralelo:

- **AUTO (K-SI):** se pide `/contratos/list` a Oracle y, por cada contrato, su detalle (`/contratos/detalle/:id`). Solo se conservan los que tienen `totalRastreador > 0`.
- **EXTERNO:** se consulta `ventas_rastreador` con `es_venta_externa = true`. El cliente y el vehículo salen de Supabase.
- Si el usuario es vendedor, un contrato AUTO de Oracle solo aparece si su `nota_venta` existe en `ventas_rastreador` con `asesor_id` igual al suyo.

```ts
// Vendedor: Oracle solo si esa nota_venta está en Supabase con asesor_id = él
if (asesorId && notasAsesorRes.data?.length) {
    const setNotasAsesor = new Set(
        notasAsesorRes.data
            .map((r) => limpiarTexto(r.nota_venta))
            .filter(Boolean)
    );
    listaAutos = listaAutos.filter((c) => setNotasAsesor.has(limpiarTexto(c.notaVenta) ?? ''));
}
```

### 2. Se cargan los GPS vinculados

`obtenerVentasConGPS` (`vinculacion.service.ts`) lee todo `ventas_rastreador` junto con `gps_inventario`, `clientes_externos`, `gps_instaladores` y `vehiculos`. `RastreoList` la vuelve a consultar cada 5 segundos.

### 3. Se cruzan los datos en `RastreoList`

`src/components/features/rastreadores/dashboard/RastreoList.tsx` construye un mapa de GPS indexado por nota de venta. La nota se normaliza dos veces:

- `notaKey`: en minúsculas.
- `notaLoose`: además sin espacios, guiones ni puntos. Así `NV-001-001-0000136` coincide con `nv0010010000136`.

Para las ventas externas también se cruza por `cliente_id`.

```ts
const gpsForContrato = (c: ContratoGPS): GpsVentaRow[] => {
    // ...
    pushAll(gpsByNota.get(notaKey(c.notaVenta)) ?? []);
    const loose = notaLoose(c.notaVenta);
    if (loose && loose !== notaKey(c.notaVenta)) {
        pushAll(gpsByNota.get(loose) ?? []);
    }
    if (c.clienteExternoId) pushAll(gpsByCliente.get(c.clienteExternoId) ?? []);
    return list;
};
```

Si hay varios GPS para el mismo contrato, `pickGpsForDisplay` muestra el primero cuyo estado no sea `BAJA` ni `STOCK`.

### De dónde sale cada columna de la tabla

| Columna | Origen |
|---|---|
| Origen (K-SI / Cliente / Concesionaria) | `origen` del contrato: AUTO viene de Oracle, EXTERNO de Supabase |
| Cliente / Nota | AUTO: Oracle (`facturaNombre`, `facturaRuc`). EXTERNO: `clientes_externos` |
| Vehículo | AUTO: Oracle (`marca`, `modelo`, `placa`). EXTERNO: `vehiculos` |
| Fecha venta | AUTO: Oracle (`fechaVenta`). EXTERNO: `fecha_entrega` |
| Instalación | Supabase: `ventas_rastreador.estado_dispositivo` o `gps_inventario.estado` del GPS que coincidió. Si no hay coincidencia, muestra "Sin GPS" |
| Conexión | Supabase: `gps_inventario.estado_coneccion`. Si no hay GPS, muestra "Inactivo" |
| Valor Venta | AUTO: `totRastreador` de Oracle. EXTERNO: `precio_total` |

## Pantalla "Finanzas" y la cartera

### KPIs (`getKpisFinancieros`, `financiero.service.ts`)

- **Inversión en stock:** suma de `gps_inventario.costo_compra` con `estado = 'STOCK'`.
- **Total vendido:** suma de `precio_total` de `getCarteraRastreadores`. Esa lista junta **todas** las filas de `ventas_rastreador` con **todos** los contratos AUTO de Oracle que tienen rastreador.
- **Costo de mercadería:** suma de `gps_inventario.costo_compra` de las ventas en `ventas_rastreador` (excluye `motivo_baja = 'CONFUSION'`).
- **Utilidad neta:** `vendido - costo`.
- **Margen global:** `utilidad / vendido * 100`.

### Cartera (`CarteraRastreadoresView`)

Por cada ítem con `nota_venta`, busca el documento en el backend contable (`walletService.getDocumentoByNumeroFisico`) para obtener el plazo y la cuota. Con eso:

- `cuotaRastreadorMensual = precioGPS / plazoTotal`
- `montoPagadoRastreador = (numeroCuota - 1) * cuotaRastreadorMensual`
- `montoPorCobrarRastreador = precioGPS - montoPagadoRastreador`

Si el ítem no tiene nota de venta, o no se encuentra el documento en la cartera, se trata como **CONTADO**.

## Dos problemas probables en los números

1. **Ventas K-SI contadas dos veces.** `getCarteraRastreadores` no filtra por `es_venta_externa`, así que incluye las filas AUTO de `ventas_rastreador`. Además agrega los mismos contratos AUTO desde Oracle, sin quitar duplicados por nota de venta. Una venta K-SI con GPS vinculado suma dos veces. Eso explicaría que Finanzas diga **134 dispositivos y $64,602**, mientras que Gestión de Rastreo dice **95 dispositivos y $40,457**.
2. **Margen inflado.** El costo solo existe para las ventas que tienen un GPS vinculado en Supabase. Los contratos de Oracle sin GPS vinculado suman ingreso pero no costo, y eso empuja el margen a **92.4%**.

