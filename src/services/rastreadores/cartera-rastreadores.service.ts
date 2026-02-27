import { supabase } from './supabaseClient';
import { getListaContratosGPS } from './contratos.service';

export interface ItemCarteraRastreador {
    id: string;
    tipo_pago: 'CONTADO' | 'CREDITO';
    precio_total: number;
    total_financiado: number | null;
    numero_cuotas: number | null;
    created_at: string | null;
    // Datos del dispositivo/cliente
    nota_venta: string | null;
    identificacion_cliente: string | null;
    cliente_nombre: string | null;
    nombre_concesionaria: string | null;
    modelo: string | null;
    imei: string | null;
    // Crédito: cuenta por cobrar
    proxima_cuota_fecha: string | null;
    proxima_cuota_valor: number | null;
    dias_para_cobro: number | null; // días hasta próxima cuota (negativo = vencido)
    total_por_cobrar: number;
    cuotas_pendientes: number;
    // Contado: ingreso contable (si existe en backend se puede ampliar)
    ingreso_registrado: boolean | null;
}

/** Misma lógica que PagoRastreadorExternoModule: crédito si tipo CREDITO o si tiene plazo/cuotas. */
function esCredito(tipoPago: string | null | undefined, plazoCredito?: number | null): boolean {
    if (String(tipoPago || '').toUpperCase() === 'CREDITO') return true;
    if (plazoCredito != null && Number(plazoCredito) > 0) return true;
    return false;
}

/**
 * Fuentes de datos para la Cartera (alineadas con la lista principal):
 * 1. Supabase ventas_rastreador: ventas con tipo CONTADO/CRÉDITO y cuotas.
 * 2. Supabase dispositivos_rastreo con precio_venta (tipo como en PagoRastreadorExternoModule: crédito si tipo_pago CREDITO o plazo_credito > 0).
 * 3. Backend (Oracle): lista de contratos AUTO con totalRastreador (misma fuente que RastreoList).
 */
export async function getCarteraRastreadores(): Promise<ItemCarteraRastreador[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    try {
        // 1) Ventas ya registradas en Supabase (ventas_rastreador)
        const { data: ventas, error: ventasError } = await supabase
            .from('ventas_rastreador')
            .select(`
                id,
                tipo_pago,
                precio_total,
                total_financiado,
                numero_cuotas,
                created_at,
                dispositivo_id,
                dispositivos_rastreo(
                    nota_venta,
                    identificacion_cliente,
                    cliente_nombre,
                    nombre_concesionaria,
                    modelo,
                    imei
                )
            `)
            .order('created_at', { ascending: false });

        if (ventasError) throw ventasError;

        // 2) Dispositivos vendidos en Supabase que NO tienen fila en ventas_rastreador (clasificación como PagoRastreadorExternoModule: crédito si tipo_pago CREDITO o plazo_credito > 0)
        const { data: dispositivosSinVenta, error: dispError } = await supabase
            .from('dispositivos_rastreo')
            .select('id, nota_venta, identificacion_cliente, cliente_nombre, nombre_concesionaria, modelo, imei, precio_venta, tipo_pago, plazo_credito, created_at')
            .not('precio_venta', 'is', null)
            .gt('precio_venta', 0)
            .order('created_at', { ascending: false });

        if (dispError) throw dispError;

        // 3) Lista del backend (Oracle) — misma fuente que RastreoList
        let contratosOracle: Awaited<ReturnType<typeof getListaContratosGPS>> = [];
        try {
            contratosOracle = await getListaContratosGPS();
        } catch (e) {
            console.warn('Cartera: no se pudo cargar lista Oracle:', e);
        }

        const dispositivoIdsConVenta = new Set((ventas ?? []).map((v: any) => v.dispositivo_id));
        const resultados: ItemCarteraRastreador[] = [];

        // --- Procesar ventas_rastreador (fuente 1) ---
        for (const v of ventas ?? []) {
            const rawDisp = (v as any).dispositivos_rastreo ?? (v as any).dispositivo;
            const disp = Array.isArray(rawDisp) ? rawDisp[0] : rawDisp;
            const nota_venta = disp?.nota_venta ?? null;
            const identificacion_cliente = disp?.identificacion_cliente ?? null;
            const cliente_nombre = disp?.cliente_nombre ?? null;
            const nombre_concesionaria = disp?.nombre_concesionaria ?? null;
            const modelo = disp?.modelo ?? null;
            const imei = disp?.imei ?? null;

            if (esCredito(v.tipo_pago) && v.id) {
                const { data: cuotas, error: cuotasError } = await supabase
                    .from('cuotas_rastreador')
                    .select('numero_cuota, valor, fecha_vencimiento, estado')
                    .eq('venta_id', v.id)
                    .eq('estado', 'PENDIENTE')
                    .order('fecha_vencimiento', { ascending: true });

                if (cuotasError) {
                    resultados.push({
                        id: v.id,
                        tipo_pago: 'CREDITO',
                        precio_total: Number(v.precio_total),
                        total_financiado: v.total_financiado != null ? Number(v.total_financiado) : null,
                        numero_cuotas: v.numero_cuotas ?? null,
                        created_at: v.created_at,
                        nota_venta,
                        identificacion_cliente,
                        cliente_nombre,
                        nombre_concesionaria,
                        modelo,
                        imei,
                        proxima_cuota_fecha: null,
                        proxima_cuota_valor: null,
                        dias_para_cobro: null,
                        total_por_cobrar: 0,
                        cuotas_pendientes: 0,
                        ingreso_registrado: null
                    });
                    continue;
                }

                const pendientes = cuotas ?? [];
                const totalPorCobrar = pendientes.reduce((sum, c) => sum + Number(c.valor), 0);
                const primera = pendientes[0];
                let diasParaCobro: number | null = null;
                if (primera?.fecha_vencimiento) {
                    const ven = new Date(primera.fecha_vencimiento);
                    ven.setHours(0, 0, 0, 0);
                    diasParaCobro = Math.ceil((ven.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                }

                resultados.push({
                    id: v.id,
                    tipo_pago: 'CREDITO',
                    precio_total: Number(v.precio_total),
                    total_financiado: v.total_financiado != null ? Number(v.total_financiado) : null,
                    numero_cuotas: v.numero_cuotas ?? null,
                    created_at: v.created_at,
                    nota_venta,
                    identificacion_cliente,
                    cliente_nombre,
                    nombre_concesionaria,
                    modelo,
                    imei,
                    proxima_cuota_fecha: primera?.fecha_vencimiento ?? null,
                    proxima_cuota_valor: primera ? Number(primera.valor) : null,
                    dias_para_cobro: diasParaCobro,
                    total_por_cobrar: totalPorCobrar,
                    cuotas_pendientes: pendientes.length,
                    ingreso_registrado: null
                });
            } else {
                resultados.push({
                    id: v.id,
                    tipo_pago: 'CONTADO',
                    precio_total: Number(v.precio_total),
                    total_financiado: null,
                    numero_cuotas: null,
                    created_at: v.created_at,
                    nota_venta,
                    identificacion_cliente,
                    cliente_nombre,
                    nombre_concesionaria,
                    modelo,
                    imei,
                    proxima_cuota_fecha: null,
                    proxima_cuota_valor: null,
                    dias_para_cobro: null,
                    total_por_cobrar: 0,
                    cuotas_pendientes: 0,
                    ingreso_registrado: null
                });
            }
        }

        // --- Dispositivos con precio_venta sin registro en ventas_rastreador (fuente 2). Crédito = tipo_pago CREDITO o plazo_credito > 0 (como PagoRastreadorExternoModule) ---
        for (const d of dispositivosSinVenta ?? []) {
            if (dispositivoIdsConVenta.has(d.id)) continue;
            const precio = Number(d.precio_venta) || 0;
            if (precio <= 0) continue;
            const plazoNum = d.plazo_credito != null ? Number(d.plazo_credito) : 0;
            const tipoPago = esCredito(d.tipo_pago, d.plazo_credito) ? 'CREDITO' : 'CONTADO';
            const numeroCuotas = tipoPago === 'CREDITO' && plazoNum > 0 ? plazoNum : null;
            resultados.push({
                id: `disp-${d.id}`,
                tipo_pago: tipoPago,
                precio_total: precio,
                total_financiado: tipoPago === 'CREDITO' ? precio : null,
                numero_cuotas: numeroCuotas,
                created_at: d.created_at,
                nota_venta: d.nota_venta ?? null,
                identificacion_cliente: d.identificacion_cliente ?? null,
                cliente_nombre: d.cliente_nombre ?? null,
                nombre_concesionaria: d.nombre_concesionaria ?? null,
                modelo: d.modelo ?? null,
                imei: d.imei ?? null,
                proxima_cuota_fecha: null,
                proxima_cuota_valor: null,
                dias_para_cobro: null,
                total_por_cobrar: tipoPago === 'CREDITO' ? precio : 0,
                cuotas_pendientes: numeroCuotas ?? 0,
                ingreso_registrado: tipoPago === 'CONTADO' ? false : null
            });
        }

        // --- Ventas Oracle (AUTO) — misma lista que RastreoList (fuente 3) ---
        const autos = contratosOracle.filter((c) => c.origen === 'AUTO');
        for (const c of autos) {
            if (!c.totalRastreador || c.totalRastreador <= 0) continue;
            const tipoPago = (c.numeroCuotas && c.numeroCuotas > 0) ? 'CREDITO' : 'CONTADO';
            const totalPorCobrar = tipoPago === 'CREDITO' && (c.totalFinal ?? 0) > 0 ? (c.totalFinal ?? 0) : 0;
            resultados.push({
                id: `oracle-${c.ccoCodigo}`,
                tipo_pago: tipoPago,
                precio_total: c.totalRastreador,
                total_financiado: c.totalFinal ?? null,
                numero_cuotas: c.numeroCuotas ?? null,
                created_at: c.fechaInstalacion ?? null,
                nota_venta: c.notaVenta ?? null,
                identificacion_cliente: c.ruc ?? null,
                cliente_nombre: c.cliente ?? null,
                nombre_concesionaria: null,
                modelo: c.modelo ?? null,
                imei: null,
                proxima_cuota_fecha: null,
                proxima_cuota_valor: c.cuotaMensual ?? null,
                dias_para_cobro: null,
                total_por_cobrar: totalPorCobrar,
                cuotas_pendientes: c.numeroCuotas ?? 0,
                ingreso_registrado: tipoPago === 'CONTADO' ? false : null
            });
        }

        // Ordenar por fecha (más recientes primero); items sin fecha al final
        resultados.sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b.created_at ? new Date(b.created_at).getTime() : 0;
            return db - da;
        });

        return resultados;
    } catch (error) {
        console.error('Error getCarteraRastreadores:', error);
        return [];
    }
}
