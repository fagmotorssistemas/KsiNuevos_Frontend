import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface Cuenta {
    id: string;
    nombre_cuenta: string;
    saldo_actual: number;
    numero_cuenta: string;
    es_caja_chica: boolean;
}

export interface Transaccion {
    id: string;
    tipo: 'ingreso' | 'gasto_operativo' | 'pago_proveedor' | 'nomina';
    monto: number;
    descripcion: string;
    fecha_transaccion: string;
    comprobante_url: string | null;
    cuenta: { nombre_cuenta: string };
    orden?: { numero_orden: number; vehiculo_placa: string };
    registrado_por?: { full_name: string };
}

export function useFinanzas() {
    const { supabase, profile } = useAuth();
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Cargar Cuentas
            const { data: cuentasData } = await supabase
                .from('taller_cuentas')
                .select('*')
                .order('nombre_cuenta');
            
            if (cuentasData) {
                // CORRECCIÓN AQUÍ: Mapeamos los datos para eliminar los nulls
                const cuentasSeguras: Cuenta[] = cuentasData.map((c: any) => ({
                    id: c.id,
                    nombre_cuenta: c.nombre_cuenta,
                    saldo_actual: c.saldo_actual ?? 0, // Si es null, pone 0
                    numero_cuenta: c.numero_cuenta ?? "", // Si es null, pone texto vacío
                    es_caja_chica: c.es_caja_chica ?? false
                }));
                setCuentas(cuentasSeguras);
            }

            // 2. Cargar Últimos 50 Movimientos
            const { data: transData } = await supabase
                .from('taller_transacciones')
                .select(`
                    *,
                    cuenta:taller_cuentas(nombre_cuenta),
                    orden:taller_ordenes(numero_orden, vehiculo_placa),
                    registrado_por:profiles(full_name)
                `)
                .order('fecha_transaccion', { ascending: false })
                .limit(50);

            if (transData) setTransacciones(transData as any);

        } catch (error) {
            console.error("Error cargando finanzas:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const registrarTransaccion = async (formData: any, file: File | null) => {
        if (!profile?.id) return { success: false, error: "No autorizado" };

        try {
            let comprobanteUrl = null;

            // 1. Subir Foto (si existe)
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

            // 2. Insertar Transacción
            const { error: txError } = await supabase
                .from('taller_transacciones')
                .insert([{
                    cuenta_id: formData.cuenta_id,
                    orden_id: formData.orden_id || null, // Opcional
                    tipo: formData.tipo,
                    monto: formData.monto,
                    descripcion: formData.descripcion,
                    comprobante_url: comprobanteUrl,
                    registrado_por: profile.id
                }]);

            if (txError) throw txError;

            // 3. Actualizar Saldo de la Cuenta (Manual update en backendless)
            // Lógica: Si es Ingreso SUMA, si es Gasto RESTA
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

            await fetchData(); // Recargar todo
            return { success: true };

        } catch (error: any) {
            console.error("Error en transacción:", error);
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        cuentas,
        transacciones,
        isLoading,
        registrarTransaccion,
        refresh: fetchData
    };
}