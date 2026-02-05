// src/components/features/contracts/pages/TestApoderados.ts
import { contratosService } from "@/services/contratos.service";

export const ejecutarTestApoderados = async () => {
    console.clear();
    console.log("🚀 INICIANDO TEST DE APODERADOS...");
    console.log("1. Obteniendo lista completa de contratos...");

    try {
        const lista = await contratosService.getListaContratos();
        console.log(`📋 Se encontraron ${lista.length} contratos. Analizando uno por uno...`);
        console.log("⚠️ ESTO PUEDE TARDAR UNOS MINUTOS. NO CIERRES LA VENTANA.");

        const sinApoderado = [];
        const conApoderado = [];
        const errores = [];

        // Recorremos secuencialmente para no matar el servidor con 100 peticiones simultáneas
        for (let i = 0; i < lista.length; i++) {
            const item = lista[i];
            const progreso = Math.round(((i + 1) / lista.length) * 100);
            
            // Log discreto para ver progreso
            console.log(`[${progreso}%] Revisando: ${item.notaVenta} (${item.clienteNombre})...`);

            try {
                // Llamamos al detalle tal como lo hace el sistema real
                const detalle = await contratosService.getDetalleContrato(item.ccoCodigo);

                // Validamos si tiene apoderado válido
                // Basado en tu repositorio, los valores "malos" son 'N/A', null, o strings de error
                const apoderado = detalle.apoderado;
                const tieneApoderado = apoderado && 
                                       apoderado !== 'N/A' && 
                                       !apoderado.includes('No registrado') && 
                                       !apoderado.includes('Error');

                if (!tieneApoderado) {
                    console.warn(`❌ SIN APODERADO: ${item.notaVenta} - ${item.clienteNombre}`);
                    sinApoderado.push({
                        nota: item.notaVenta,
                        cliente: item.clienteNombre,
                        estado: apoderado // Para ver si dice "N/A" o "Compra Directa"
                    });
                } else {
                    conApoderado.push(item.notaVenta);
                }

            } catch (error) {
                console.error(`🔥 ERROR en ${item.notaVenta}:`, error);
                errores.push({ nota: item.notaVenta, error: error });
            }
        }

        console.log("\n\n================ RESULTADOS DEL TEST ================");
        console.log(`✅ Con Apoderado: ${conApoderado.length}`);
        console.log(`❌ Sin Apoderado: ${sinApoderado.length}`);
        console.log(`🔥 Errores: ${errores.length}`);
        console.log("=====================================================");

        if (sinApoderado.length > 0) {
            console.log("LISTA DE CONTRATOS SIN APODERADO (Copia esto):");
            console.table(sinApoderado);
        }

    } catch (err) {
        console.error("Error crítico ejecutando el test:", err);
    }
};