import { createClient } from '@/lib/supabase/client';
import { VehiculoInventario } from "@/types/inventario.types";

const supabase = createClient();

// --- 0. HELPER: CONVERTIR A MINÚSCULAS ---
const safeLower = (text: string | number | null | undefined) => {
  if (!text) return null;
  return String(text).trim().toLowerCase();
};

// --- 0.1 HELPER NUEVO: CONVERTIR A MAYÚSCULAS (Solo para la Placa) ---
const safeUpper = (text: string | number | null | undefined) => {
  if (!text) return null;
  return String(text).trim().toUpperCase();
};

// --- 1. FUNCIÓN LIMPIEZA DE FECHAS (Sin cambios) ---
const parseOracleDate = (dateStr: any): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  let clean = dateStr.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const meses: { [key: string]: string } = {
    'ene': '01', 'jan': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'aug': '08', 'sep': '09', 
    'set': '09', 'oct': '10', 'nov': '11', 'dic': '12', 'dec': '12'
  };
  try {
    clean = clean.replace('.', ''); 
    const parts = clean.split(/[-/]/); 
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      let month = parts[1];
      const year = parts[2];
      if (isNaN(Number(month))) { month = meses[month] || '01'; } 
      else { month = month.padStart(2, '0'); }
      return `${year}-${month}-${day}`;
    }
  } catch (e) { console.warn("⚠️ Fecha inválida:", dateStr); }
  return null; 
};

export const syncService = {
  
  async syncOracleToSupabase(oracleData: VehiculoInventario[]) {
    if (!oracleData || oracleData.length === 0) return;

    // --- 2. MAPEO DE DATOS ---
    const rawPayload = oracleData.map((v) => {
      const statusCalculado = v.stock > 0 ? 'disponible' : 'vendido';
      const yearClean = parseInt(v.anioModelo) || new Date().getFullYear();

      return {
        // APLICAMOS safeLower A TODO, MENOS A LA PLACA
        vin: safeLower(v.chasis),  
        oracle_id: v.proId?.toString(),
        
        plate: safeUpper(v.placa), // <--- AQUÍ ESTÁ EL CAMBIO (MAYÚSCULAS)
        
        brand: safeLower(v.marca),
        model: safeLower(v.modelo),
        
        year: yearClean, 
        
        color: safeLower(v.color),
        version: safeLower(v.version),
        stock: v.stock, 
        
        engine_number: safeLower(v.motor),
        engine_displacement: safeLower(v.cilindraje),
        fuel_type: safeLower(v.combustible),
        type_body: safeLower(v.tipo),
        country_origin: safeLower(v.paisOrigen),
        tonnage: safeLower(v.tonelaje),
        passenger_capacity: safeLower(v.capacidad),
        wheels_count: safeLower(v.nroLlantas),
        axles_count: safeLower(v.nroEjes),
        
        registration_year: safeLower(v.anioMatricula),
        registration_place: safeLower(v.lugarMatricula),
        supplier: safeLower(v.proveedor),
        
        purchase_date: parseOracleDate(v.fechaCompra), 
        status: statusCalculado,
        updated_at: new Date().toISOString(),
      };
    });

    // --- 3. DETECCIÓN Y REPORTE DE DUPLICADOS (INTACTO) ---
    const uniqueMap = new Map();
    const listaDuplicados: any[] = []; 

    rawPayload.forEach(item => {
        if (!item.vin) return; 

        // Si el mapa YA tiene este chasis, significa que es repetido
        if (uniqueMap.has(item.vin)) {
            listaDuplicados.push({
                chasis: item.vin,
                placa: item.plate, // Saldrá en mayúsculas en el reporte
                modelo: item.model,
                msg: 'DUPLICADO DESCARTADO'
            });
        }
        
        // Guardamos (esto asegura que solo quede 1 versión del auto)
        uniqueMap.set(item.vin, item);
    });

    const finalPayload = Array.from(uniqueMap.values());

    // --- 4. IMPRIMIR REPORTE EN CONSOLA (INTACTO) ---
    if (listaDuplicados.length > 0) {
        console.group("🚨 ALERTA: Oracle envió datos duplicados");
        console.warn(`Se eliminaron ${listaDuplicados.length} registros repetidos para evitar errores.`);
        console.table(listaDuplicados); 
        console.groupEnd();
    } else {
        console.log("✨ Data limpia: No llegaron duplicados.");
    }

    try {
      // --- 5. ENVÍO SEGURO (Upsert) ---
      const { error } = await supabase
        .from('inventoryoracle')
        .upsert(finalPayload, { 
          onConflict: 'vin',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("❌ Error Supabase Sync:", error.message);
      } else {
        console.log(`✅ Sincronización OK: ${finalPayload.length} autos guardados.`);
      }
    } catch (err) {
      console.error("❌ Error crítico sync:", err);
    }
  }
};