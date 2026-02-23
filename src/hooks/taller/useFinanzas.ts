import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Cuenta, TransaccionFinanciera, CuentaPorCobrar } from "@/types/taller";

export type Transaccion = TransaccionFinanciera;

export function useFinanzas() {
    const { supabase, profile } = useAuth();
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Cargar Cuentas
            const { data: cuentasData } = await supabase
                .from('taller_cuentas')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (cuentasData) {
                const cuentasSeguras: Cuenta[] = cuentasData.map((c: any) => ({
                    id: c.id,
                    nombre_cuenta: c.nombre_cuenta,
                    saldo_actual: c.saldo_actual ?? 0, 
                    numero_cuenta: c.numero_cuenta ?? "", 
                    es_caja_chica: c.es_caja_chica ?? false
                }));
                setCuentas(cuentasSeguras);
            }

            // 2. Cargar Movimientos (Con datos de cliente integrados para el modal)
            const { data: transData } = await supabase
                .from('taller_transacciones')
                .select(`
                    *,
                    cuenta:taller_cuentas(nombre_cuenta),
                    orden:taller_ordenes(id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo, estado, cliente:taller_clientes(nombre_completo, telefono)),
                    registrado_por:profiles(full_name)
                `)
                .order('fecha_transaccion', { ascending: false })
                .limit(100);

            if (transData) setTransacciones(transData as unknown as Transaccion[]);

            // 3. Cargar Cuentas por Cobrar (Extrae detalles para Presupuesto y transacciones para Gastado/Pagado)
            const { data: deudasData } = await supabase
                .from('taller_ordenes')
                .select(`
                    id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo, estado_contable, fecha_ingreso,
                    cliente:taller_clientes(nombre_completo, telefono),
                    transacciones:taller_transacciones(monto, tipo, fecha_transaccion, descripcion),
                    detalles:taller_detalles_orden(total)
                `)
                .in('estado_contable', ['pendiente', 'facturado'])
                .order('fecha_ingreso', { ascending: false });

            if (deudasData) {
                const cuentasPendientes = deudasData.map((orden: any) => {
                    // Calculamos Presupuesto desde los detalles
                    const presupuesto = orden.detalles
                        ?.reduce((acc: number, d: any) => acc + Number(d.total), 0) || 0;

                    // Calculamos ingresos
                    const pagado = orden.transacciones
                        ?.filter((t: any) => t.tipo === 'ingreso')
                        .reduce((acc: number, t: any) => acc + Number(t.monto), 0) || 0;
                    
                    // Calculamos egresos
                    const gastado = orden.transacciones
                        ?.filter((t: any) => t.tipo !== 'ingreso')
                        .reduce((acc: number, t: any) => acc + Number(t.monto), 0) || 0;
                    
                    // El saldo nunca es negativo para los cálculos visuales, si pagó de más, debe 0.
                    const saldo_pendiente = Math.max(0, presupuesto - pagado);
                    
                    return {
                        id: orden.id,
                        numero_orden: orden.numero_orden,
                        vehiculo_placa: orden.vehiculo_placa,
                        vehiculo_marca: orden.vehiculo_marca || 'Vehículo',
                        vehiculo_modelo: orden.vehiculo_modelo || 'General',
                        estado_contable: orden.estado_contable,
                        fecha_ingreso: orden.fecha_ingreso,
                        cliente: orden.cliente,
                        transacciones: orden.transacciones,
                        presupuesto: presupuesto,
                        total_pagado: pagado,
                        total_gastado: gastado,
                        saldo_pendiente: saldo_pendiente
                    };
                }); 

                setCuentasPorCobrar(cuentasPendientes);
            }

        } catch (error) {
            console.error("Error cargando finanzas:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const crearCuenta = async (datosCuenta: any) => {
        try {
            const { error } = await supabase
                .from('taller_cuentas')
                .insert([{
                    nombre_cuenta: datosCuenta.nombre_cuenta,
                    numero_cuenta: datosCuenta.numero_cuenta,
                    saldo_actual: datosCuenta.saldo_actual,
                    es_caja_chica: datosCuenta.es_caja_chica
                }]);

            if (error) throw error;
            await fetchData(); 
            return { success: true };
        } catch (error: any) {
            console.error("Error creando cuenta:", error);
            return { success: false, error: error.message };
        }
    };

    const registrarTransaccion = async (formData: any, file: File | null) => {
        if (!profile?.id) return { success: false, error: "No autorizado" };

        try {
            let comprobanteUrl = null;
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `finanzas/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('taller-evidencias')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('taller-evidencias')
                    .getPublicUrl(fileName);
                
                comprobanteUrl = data.publicUrl;
            }

            const { error: txError } = await supabase
                .from('taller_transacciones')
                .insert([{
                    cuenta_id: formData.cuenta_id,
                    orden_id: formData.orden_id || null, 
                    tipo: formData.tipo,
                    monto: formData.monto,
                    descripcion: formData.descripcion,
                    comprobante_url: comprobanteUrl,
                    registrado_por: profile.id
                }]);

            if (txError) throw txError;

            const cuentaActual = cuentas.find(c => c.id === formData.cuenta_id);
            if (cuentaActual) {
                const esIngreso = formData.tipo === 'ingreso';
                const nuevoSaldo = esIngreso 
                    ? cuentaActual.saldo_actual + Number(formData.monto)
                    : cuentaActual.saldo_actual - Number(formData.monto);

                await supabase
                    .from('taller_cuentas')
                    .update({ saldo_actual: nuevoSaldo })
                    .eq('id', formData.cuenta_id);
            }

            await fetchData(); 
            return { success: true };
        } catch (error: any) {
            console.error("Error en transacción:", error);
            return { success: false, error: error.message };
        }
    };

    const marcarOrdenComoPagada = async (ordenId: string) => {
        try {
            const { error } = await supabase
                .from('taller_ordenes')
                .update({ estado_contable: 'pagado' })
                .eq('id', ordenId);
            
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error("Error actualizando orden:", err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        cuentas,
        transacciones,
        cuentasPorCobrar,
        isLoading,
        registrarTransaccion,
        crearCuenta, 
        marcarOrdenComoPagada, // <-- Nueva función
        refresh: fetchData
    };
}