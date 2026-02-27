import { useState } from 'react';
import { toast } from 'sonner';
import { 
    PagoRastreadorInfo, 
    TipoPagoEnum, 
    VentaRastreadorPayload, 
    CuotaRastreadorPayload 
} from '@/types/rastreadores.types';
import { supabase } from '@/services/rastreadores/supabaseClient';

interface CalculoPagoParams {
    monto_rastreador: number;
    totalFinal: number;
    cuota_mensual: number;
    numero_cuotas?: number;
}

export function usePagoRastreador() {
    const [loading, setLoading] = useState(false);

    /**
     * Calcula el porcentaje y distribución del rastreador en las cuotas
     */
    const calcularPagoRastreador = (params: CalculoPagoParams): PagoRastreadorInfo => {
        const { monto_rastreador, totalFinal, cuota_mensual, numero_cuotas } = params;

        // Porcentaje que representa el rastreador del total
        const porcentaje_rastreador = totalFinal > 0 ? monto_rastreador / totalFinal : 0;

        // Valor que corresponde al rastreador en cada cuota mensual
        const valor_rastreador_mensual = cuota_mensual * porcentaje_rastreador;

        return {
            totalFinal,
            monto_rastreador,
            porcentaje_rastreador,
            cuota_mensual,
            valor_rastreador_mensual,
            numero_cuotas_credito: numero_cuotas,
            tipo_pago: TipoPagoEnum.CREDITO
        };
    };

    /**
     * Genera las cuotas del rastreador basándose en las fechas del crédito principal
     */
    const generarCuotasRastreador = (
        valor_rastreador_mensual: number,
        fechasVencimiento: string[]
    ): Array<{ valor: number; fecha_vencimiento: string }> => {
        return fechasVencimiento.map(fecha => ({
            valor: valor_rastreador_mensual,
            fecha_vencimiento: fecha
        }));
    };

    /**
     * Registra una venta de rastreador (CONTADO o CRÉDITO) y sus cuotas
     */
    const registrarVentaRastreador = async (
        dispositivo_id: string,
        payload: VentaRastreadorPayload,
        cuotasData?: Array<{ valor: number; fecha_vencimiento: string }>
    ) => {
        setLoading(true);
        try {
            // Mapeo al enum de la DB: entorno_venta_enum es 'KSI_NUEVOS' | 'EXTERNO'
            const entornoDb = payload.entorno === 'SIN_VEHICULO' ? 'EXTERNO' : 'KSI_NUEVOS';

            // 1. Insert en ventas_rastreador (incluye metodo_pago y url_comprobante_pago si existen columnas)
            const { data: ventaData, error: ventaError } = await supabase
                .from('ventas_rastreador')
                .insert({
                    dispositivo_id: String(payload.dispositivo_id),
                    entorno: entornoDb,
                    tipo_pago: payload.tipo_pago,
                    precio_total: Number(payload.precio_total),
                    abono_inicial: payload.abono_inicial != null ? Number(payload.abono_inicial) : 0,
                    total_financiado: payload.total_financiado != null ? Number(payload.total_financiado) : null,
                    numero_cuotas: payload.numero_cuotas != null ? Number(payload.numero_cuotas) : null,
                    ...(payload.metodo_pago != null && { metodo_pago: String(payload.metodo_pago) }),
                    ...(payload.url_comprobante_pago != null && payload.url_comprobante_pago !== '' && { url_comprobante_pago: payload.url_comprobante_pago })
                })
                .select()
                .single();

            if (ventaError || !ventaData) {
                toast.error('Error al registrar venta de rastreador');
                throw ventaError || new Error('No data returned');
            }

            const venta_id = ventaData.id;

            // 2. Si es crédito, insert en cuotas_rastreador (venta_id, numero_cuota, valor, fecha_vencimiento, estado)
            if (payload.tipo_pago === TipoPagoEnum.CREDITO && cuotasData && cuotasData.length > 0) {
                const cuotasInsert = cuotasData.map((cuota, idx) => ({
                    venta_id,
                    numero_cuota: idx + 1,
                    valor: Math.round(cuota.valor * 100) / 100,
                    fecha_vencimiento: cuota.fecha_vencimiento,
                    estado: 'PENDIENTE' as const
                }));

                const { error: cuotasError } = await supabase
                    .from('cuotas_rastreador')
                    .insert(cuotasInsert);

                if (cuotasError) {
                    toast.error('Error al registrar cuotas del rastreador');
                    throw cuotasError;
                }
            }

            toast.success('Pago de rastreador registrado exitosamente');
            return {
                success: true,
                venta_id,
                tipo_pago: payload.tipo_pago
            };

        } catch (error) {
            console.error('Error en registrarVentaRastreador:', error);
            toast.error('Error registrando pago de rastreador');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        calcularPagoRastreador,
        generarCuotasRastreador,
        registrarVentaRastreador
    };
}
