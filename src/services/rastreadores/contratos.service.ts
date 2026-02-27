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

        // 2. Peticion Supabase (Clientes Externos)
        const dbPromise = supabase
            .from('dispositivos_rastreo')
            .select(`
                *,
                cliente_externo:clientes_externos(*)
            `)
            .eq('es_venta_externa', true)
            .order('created_at', { ascending: false });

        const [apiResponse, dbResponse] = await Promise.all([apiListPromise, dbPromise]);

        // B. Procesamos la API de Autos (RESTAURO LOGICA DE DETALLE)
        // -----------------------------------------------------------
        let listaAutos: ContratoGPS[] = [];
        const resumenApi = apiResponse.data || [];

        if (resumenApi.length > 0) {
            // Recorremos el resumen para buscar el detalle completo de cada uno
            // (Necesario porque el listado no trae totRastreador ni datos del vehiculo completos)
            const promesasDetalle = resumenApi.map(async (item: any) => {
                try {
                    const id = item.ccoCodigo || item.CCO_CODIGO;
                    if (!id) return null;
                    return await getDetalleContratoGPS(id);
                } catch (e) {
                    return null;
                }
            });

            const resultadosDetalle = await Promise.all(promesasDetalle);

            // Filtramos nulos y ventas sin valor de rastreo
            listaAutos = resultadosDetalle.filter((item): item is ContratoGPS =>
                item !== null && item.totalRastreador > 0
            );
        }

        // C. Procesamos Clientes Externos (Supabase)
        // ------------------------------------------
        const listaExternos: ContratoGPS[] = (dbResponse.data || []).map((item: any) => ({
            ccoCodigo: item.id,
            notaVenta: item.nota_venta || 'VENTA-DIRECTA',
            nroContrato: 'S/N', // Campo obligatorio
            cliente: item.cliente_externo?.nombre_completo || 'Cliente Externo',
            ruc: item.identificacion_cliente,
            placa: item.cliente_externo?.placa_vehiculo || 'S/N',
            marca: item.cliente_externo?.marca || 'EXTERNO',
            modelo: item.modelo || '',
            color: item.cliente_externo?.color || '',
            anio: item.cliente_externo?.anio || '',
            totalRastreador: item.precio_venta || 0,
            fechaInstalacion: item.created_at,
            origen: 'EXTERNO',
            clienteExternoId: item.cliente_externo_id,
            esConcesionaria: !!item.es_concesionaria,
            nombreConcesionaria: item.nombre_concesionaria ?? null,
            clienteFinalNombre: item.cliente_final_nombre ?? null,
            clienteFinalIdentificacion: item.cliente_final_identificacion ?? null,
            clienteFinalTelefono: item.cliente_final_telefono ?? null
        }));

        // D. Retornamos la lista combinada
        return [...listaExternos, ...listaAutos];

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
