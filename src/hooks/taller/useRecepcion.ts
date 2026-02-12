import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useRecepcion() {
    const { supabase, profile } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Buscar si el cliente ya existe por Cédula/RUC
    const buscarCliente = async (cedula: string) => {
        if (!cedula) return null;
        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('taller_clientes')
                .select('*')
                .eq('cedula_ruc', cedula)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 es "No rows found"
                console.error("Error buscando cliente:", error);
            }
            return data;
        } finally {
            setSearchLoading(false);
        }
    };

    // Subir fotos al Bucket 'taller-evidencias'
    const uploadFotos = async (files: File[], placa: string): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${placa}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `recepcion/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('taller-evidencias')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Error subiendo foto:", uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('taller-evidencias')
                .getPublicUrl(filePath);
            
            urls.push(publicUrl);
        }
        return urls;
    };

    // Guardar TODO (Cliente + Orden)
    const crearOrdenIngreso = async (formData: any, fotos: File[]) => {
        setIsLoading(true);
        try {
            // 1. Gestionar Cliente (Crear o Actualizar)
            let clienteId = formData.cliente_id;
            
            const datosCliente = {
                cedula_ruc: formData.cliente_cedula,
                nombre_completo: formData.cliente_nombre,
                telefono: formData.cliente_telefono,
                email: formData.cliente_email, // NUEVO
                direccion: formData.cliente_direccion
            };

            if (clienteId) {
                // Actualizar existente (por si cambió dirección o email)
                await supabase.from('taller_clientes').update(datosCliente).eq('id', clienteId);
            } else {
                // Crear nuevo
                const { data: newClient, error: clientError } = await supabase
                    .from('taller_clientes')
                    .insert([datosCliente])
                    .select()
                    .single();
                
                if (clientError) throw clientError;
                clienteId = newClient.id;
            }

            // 2. Subir Fotos
            const fotoUrls = await uploadFotos(fotos, formData.vehiculo_placa);

            // 3. Crear la Orden
            const { data: orden, error: ordenError } = await supabase
                .from('taller_ordenes')
                .insert([{
                    cliente_id: clienteId,
                    vehiculo_placa: formData.vehiculo_placa.toUpperCase(),
                    vehiculo_marca: formData.vehiculo_marca,
                    vehiculo_modelo: formData.vehiculo_modelo,
                    vehiculo_anio: formData.vehiculo_anio,
                    vehiculo_color: formData.vehiculo_color,
                    vehiculo_vin: formData.vehiculo_vin, // NUEVO
                    kilometraje: formData.kilometraje,
                    nivel_gasolina: formData.nivel_gasolina,
                    fecha_promesa_entrega: formData.fecha_promesa_entrega,
                    checklist_ingreso: formData.checklist,
                    inventario_pertenencias: formData.inventario,
                    observaciones_ingreso: formData.observaciones,
                    fotos_ingreso_urls: fotoUrls,
                    estado: 'recepcion',
                    // registrado_por: profile?.id 
                }])
                .select()
                .single();

            if (ordenError) throw ordenError;

            return { success: true, ordenId: orden.numero_orden };

        } catch (error: any) {
            console.error("Error creando orden:", error);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        buscarCliente,
        crearOrdenIngreso,
        isLoading,
        searchLoading
    };
}