import { ContratoGPS } from '@/types/rastreadores.types';
import { limpiarTexto, parseMonedaGPS } from '@/utils/rastreo-format';
import { API_URL, supabase } from './supabaseClient';

export async function getListaContratosGPS(): Promise<ContratoGPS[]> {
    try {
        // A. Iniciamos ambas peticiones en paralelo
        // -----------------------------------------

        // 1. Peticion API Oracle (Solo el listado base)
        const apiListPromise = fetch(`${API_URL}/contratos/list`, { cache: 'no-store' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(err => {
                console.error("Error conectando API Autos:", err);
                return { data: [] };
            });

        // 2. Peticion Supabase: ventas externas (ventas_rastreador + clientes_externos + vehiculos)
        const dbPromise = supabase
            .from('ventas_rastreador')
            .select(`
                id,
                nota_venta,
                precio_total,
                created_at,
                cliente_id,
                concesionaria_id,
                cliente_externo:clientes_externos(nombre_completo, identificacion),
                vehiculo:vehiculos(placa, marca, modelo, anio, color),
                concesionaria:concesionarias(nombre)
            `)
            .eq('es_venta_externa', true)
            .order('created_at', { ascending: false });

        const [apiResponse, dbResponse] = await Promise.all([apiListPromise, dbPromise]);

        // B. Procesamos la API de Autos (RESTAURO LOGICA DE DETALLE)
        // -----------------------------------------------------------
        let listaAutos: ContratoGPS[] = [];
        const resumenApi = apiResponse.data || [];

        if (resumenApi.length > 0) {
            // Recorremos el resumen: detalle completo cuando la API responde; si no, fila mínima desde el listado
            // (Así se muestran todas las notas de venta del cliente, como en "Notas de venta")
            const promesasDetalle = resumenApi.map(async (item: any) => {
                try {
                    const id = item.ccoCodigo || item.CCO_CODIGO;
                    if (!id) return null;
                    const detalle = await getDetalleContratoGPS(id);
                    if (detalle) return detalle;
                    // Detalle falló o API no devolvió: armar ContratoGPS mínimo desde el ítem del listado
                    const notaVenta = limpiarTexto(item.notaVenta || item.NOTA_VENTA || item.nota_venta) || '';
                    const cliente = limpiarTexto(item.clienteNombre || item.CLIENTE || item.cliente || item.facturaNombre || item.cfac_nombre) || 'Cliente';
                    const ruc = limpiarTexto(item.clienteId || item.facturaRuc || item.cfac_ced_ruc) || '';
                    return {
                        ccoCodigo: String(id),
                        notaVenta,
                        nroContrato: item.nroContrato || item.NRO_CONTRATO || 'S/N',
                        cliente,
                        ruc,
                        placa: limpiarTexto(item.placa || item.PLACA) || 'S/N',
                        marca: limpiarTexto(item.marca || item.MARCA) || '',
                        modelo: limpiarTexto(item.modelo || item.MODELO) || '',
                        color: limpiarTexto(item.color || item.COLOR) || '',
                        anio: limpiarTexto(item.anio || item.ANIO) || '',
                        totalRastreador: parseMonedaGPS(item.totRastreador ?? item.tot_rastreador ?? 0),
                        fechaInstalacion: limpiarTexto(item.fechaVenta || item.fechaCiudad || item.textoFecha) || '',
                        origen: 'AUTO' as const
                    } satisfies ContratoGPS;
                } catch (e) {
                    return null;
                }
            });

            const resultadosDetalle = await Promise.all(promesasDetalle);

            // Solo filas con valor de rastreador > 0 (clientes que compraron GPS); excluir notas Oracle sin rastreador
            listaAutos = resultadosDetalle.filter((item): item is ContratoGPS => item !== null && (item.totalRastreador ?? 0) > 0);
        }

        // C. Procesamos ventas externas (ventas_rastreador). Placa/marca/modelo desde vehiculos si existe.
        const listaExternos: ContratoGPS[] = (dbResponse.data || []).map((item: any) => {
            const veh = Array.isArray(item.vehiculo) ? item.vehiculo[0] : item.vehiculo;
            const cliente = Array.isArray(item.cliente_externo) ? item.cliente_externo[0] : item.cliente_externo;
            const conc = Array.isArray(item.concesionaria) ? item.concesionaria[0] : item.concesionaria;
            const nombreConc = conc?.nombre ?? cliente?.nombre_completo ?? null;
            return {
                ccoCodigo: item.id,
                notaVenta: item.nota_venta || 'VENTA-DIRECTA',
                nroContrato: 'S/N',
                cliente: cliente?.nombre_completo || 'Cliente Externo',
                ruc: cliente?.identificacion ?? '',
                placa: veh?.placa ?? 'S/N',
                marca: veh?.marca ?? 'EXTERNO',
                modelo: veh?.modelo ?? '',
                color: veh?.color ?? '',
                anio: veh?.anio ?? '',
                totalRastreador: item.precio_total || 0,
                fechaInstalacion: item.created_at,
                origen: 'EXTERNO',
                clienteExternoId: item.cliente_id,
                esConcesionaria: !!item.concesionaria_id,
                nombreConcesionaria: nombreConc,
                clienteFinalNombre: null,
                clienteFinalIdentificacion: null,
                clienteFinalTelefono: null
            };
        });

        // D. Retornamos solo contratos con valor de GPS > 0 (no mostrar notas sin rastreador)
        const combinada = [...listaExternos, ...listaAutos];
        return combinada.filter((c) => (c.totalRastreador ?? 0) > 0);

    } catch (error) {
        console.error("❌ Error critico unificando listas:", error);
        return [];
    }
}

export async function getDetalleContratoGPS(id: string): Promise<ContratoGPS | null> {
    try {
        // Validacion: Si es un UUID (externo), no consultamos la API
        if (id.length > 20 && id.includes('-') && !id.startsWith('1000')) return null;

        const res = await fetch(`${API_URL}/contratos/detalle/${id}`);
        if (!res.ok) return null;
        const response = await res.json();
        const data = response.data;

        // ✨ Total financiado (Oracle: totalFinal, total_final, TOTAL_FINAL)
        const totalFinalStr = data.totalFinal || data.total_final || data.TOTAL_FINAL || data.total_financiado || data.TOTAL_FINANCIADO || '';
        const totalFinal = parseMonedaGPS(totalFinalStr);

        // ✨ Cuota mensual: viene de Oracle directamente
        const cuotaMensualStr = data.cuotaMensual ?? data.cuota_mensual ?? data.CUOTA_MENSUAL ?? data.valorCuota ?? data.valor_cuota ?? data.cuota ?? data.DFP_MONTO ?? data.DFP_VALOR ?? '';
        let cuotaMensual = parseMonedaGPS(cuotaMensualStr);
        
        // Si no hay cuota directa, calculamos del total y número de cuotas de Oracle
        if (cuotaMensual <= 0 && totalFinal > 0) {
            const numeroCuotas = parseMonedaGPS(data.numeroCuotas ?? data.numero_cuotas ?? data.NUMERO_CUOTAS ?? data.plazo ?? data.PLAZO ?? 0);
            if (numeroCuotas > 0) cuotaMensual = totalFinal / numeroCuotas;
        }

        const placaLimpia = limpiarTexto(data.placa) || 'S/N';

        return {
            ccoCodigo: limpiarTexto(data.ccoCodigo),
            notaVenta: limpiarTexto(data.notaVenta),
            nroContrato: limpiarTexto(data.nroContrato) || 'S/N',
            cliente: limpiarTexto(data.facturaNombre || data.cliente),
            ruc: limpiarTexto(data.facturaRuc),
            placa: placaLimpia,
            marca: limpiarTexto(data.marca),
            modelo: limpiarTexto(data.modelo),
            color: limpiarTexto(data.color),
            anio: limpiarTexto(data.anio),
            fechaInstalacion: limpiarTexto(data.fechaCiudad || data.textoFecha),
            totalRastreador: parseMonedaGPS(data.totRastreador),
            totalFinal: totalFinal,
            cuotaMensual: cuotaMensual > 0 ? cuotaMensual : undefined,
            origen: 'AUTO'
        };
    } catch (error) {
        // No logueamos error aqui para no saturar consola si falla uno
        return null;
    }
}
