import { createClient } from '@supabase/supabase-js';
import { 
    ContratoGPS, 
    RegistroGPSPayload,
    IngresoGPSPayload,
    InventarioGPS,
    ModeloGPS,
    ProveedorGPS,
    ClienteExternoPayload
} from "@/types/rastreadores.types";
import { limpiarTexto, parseMonedaGPS } from "@/utils/rastreo-format";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const rastreadoresService = {
  
  // ==========================================
  // 1. LISTA UNIFICADA (CORREGIDA)
  // ==========================================
  async getListaContratosGPS(): Promise<ContratoGPS[]> {
    try {
        // A. Iniciamos ambas peticiones en paralelo
        // -----------------------------------------
        
        // 1. Petición API Oracle (Solo el listado base)
        const apiListPromise = fetch(`${API_URL}/contratos/list`, { cache: 'no-store' })
            .then(res => res.ok ? res.json() : { data: [] })
            .catch(err => {
                console.error("Error conectando API Autos:", err);
                return { data: [] };
            });

        // 2. Petición Supabase (Clientes Externos)
        const dbPromise = supabase
            .from('dispositivos_rastreo')
            .select(`
                *,
                cliente_externo:clientes_externos(*)
            `)
            .eq('es_venta_externa', true)
            .order('created_at', { ascending: false });

        const [apiResponse, dbResponse] = await Promise.all([apiListPromise, dbPromise]);

        // B. Procesamos la API de Autos (RESTAURO LÓGICA DE DETALLE)
        // -----------------------------------------------------------
        let listaAutos: ContratoGPS[] = [];
        const resumenApi = apiResponse.data || [];

        if (resumenApi.length > 0) {
            // Recorremos el resumen para buscar el detalle completo de cada uno
            // (Necesario porque el listado no trae totRastreador ni datos del vehículo completos)
            const promesasDetalle = resumenApi.map(async (item: any) => {
                try {
                    const id = item.ccoCodigo || item.CCO_CODIGO;
                    if (!id) return null;
                    return await rastreadoresService.getDetalleContratoGPS(id);
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
            clienteExternoId: item.cliente_externo_id
        }));

        // D. Retornamos la lista combinada
        return [...listaExternos, ...listaAutos];

    } catch (error) {
        console.error("❌ Error crítico unificando listas:", error);
        return [];
    }
  },

  // ==========================================
  // 2. OBTENER DETALLE (Solo para Origen 'AUTO')
  // ==========================================
  async getDetalleContratoGPS(id: string): Promise<ContratoGPS | null> {
    try {
        // Validación: Si es un UUID (externo), no consultamos la API
        if (id.length > 20 && id.includes('-') && !id.startsWith('1000')) return null; 

        const res = await fetch(`${API_URL}/contratos/detalle/${id}`);
        if (!res.ok) return null;
        const response = await res.json();
        const data = response.data;
        
        return {
            ccoCodigo: limpiarTexto(data.ccoCodigo),
            notaVenta: limpiarTexto(data.notaVenta),
            nroContrato: limpiarTexto(data.nroContrato) || 'S/N',
            cliente: limpiarTexto(data.facturaNombre || data.cliente),
            ruc: limpiarTexto(data.facturaRuc),
            placa: limpiarTexto(data.placa) || 'S/N',
            marca: limpiarTexto(data.marca),
            modelo: limpiarTexto(data.modelo),
            color: limpiarTexto(data.color),
            anio: limpiarTexto(data.anio),
            fechaInstalacion: limpiarTexto(data.fechaCiudad || data.textoFecha),
            totalRastreador: parseMonedaGPS(data.totRastreador),
            origen: 'AUTO'
        };
    } catch (error) {
        // No logueamos error aquí para no saturar consola si falla uno
        return null;
    }
  },

  // ==========================================
  // 3. GESTIÓN DE INSTALACIONES (CORE)
  // ==========================================
  
  async subirEvidencias(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `gps/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from('evidencias').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
        return data.publicUrl;
      });
      return await Promise.all(uploadPromises);
    } catch (e) { return []; }
  },

  async obtenerPorContrato(notaVenta: string) {
    const { data, error } = await supabase
        .from('dispositivos_rastreo')
        .select('*')
        .eq('nota_venta', limpiarTexto(notaVenta));
    return error ? [] : data;
  },

  async registrar(payload: RegistroGPSPayload) {
    const cleanPayload = {
        ...payload,
        nota_venta: limpiarTexto(payload.nota_venta),
        identificacion_cliente: limpiarTexto(payload.identificacion_cliente),
        imei: limpiarTexto(payload.imei).toUpperCase()
    };
    const { data, error } = await supabase.from('dispositivos_rastreo').insert([cleanPayload]).select();
    return { success: !error, error: error?.message, data };
  },

  async actualizar(id: number, payload: Partial<RegistroGPSPayload>) {
    const { data, error } = await supabase.from('dispositivos_rastreo').update(payload).eq('id', id).select();
    return { success: !error, error: error?.message, data };
  },

  // ==========================================
  // 4. MÓDULO DE INVENTARIO
  // ==========================================
  
  async getModelos(): Promise<ModeloGPS[]> {
    const { data } = await supabase.from('gps_modelos').select('*').order('nombre');
    return data || [];
  },

  async getProveedores(): Promise<ProveedorGPS[]> {
    const { data } = await supabase.from('gps_proveedores').select('*').order('nombre');
    return data || [];
  },

  async getInventarioStock(): Promise<InventarioGPS[]> {
    const { data, error } = await supabase
      .from('gps_inventario')
      .select(`*, modelo:gps_modelos(*), proveedor:gps_proveedores(*)`)
      .eq('estado', 'STOCK')
      .order('created_at', { ascending: false });
      
    if (error) return [];
    
    return (data as any[]).map(item => ({
        ...item,
        modelo: Array.isArray(item.modelo) ? item.modelo[0] : item.modelo,
        proveedor: Array.isArray(item.proveedor) ? item.proveedor[0] : item.proveedor
    })) as InventarioGPS[];
  },

  async ingresarLoteGPS(payloads: IngresoGPSPayload[]) {
     const datosLimpios = payloads.map(p => ({
         ...p,
         imei: p.imei.trim().toUpperCase(),
         factura_compra: p.factura_compra.trim().toUpperCase()
     }));

     const { data, error } = await supabase.from('gps_inventario').insert(datosLimpios).select();
        
    if (error) {
        if (error.code === '23505') return { success: false, error: 'Uno o más IMEIs ya existen.' };
        return { success: false, error: error.message };
    }
    return { success: true, count: data?.length };
  },

  async validarStock(imei: string) {
    const { data, error } = await supabase
      .from('gps_inventario')
      .select(`*, modelo:gps_modelos(*), proveedor:gps_proveedores(*)`)
      .eq('imei', imei)
      .single();

    if (error || !data) return { found: false, data: null };
    if (data.estado !== 'STOCK') return { found: true, status: data.estado, data: null };
    return { found: true, status: 'STOCK', data };
  },

  async registrarInstalacionDesdeStock(payload: RegistroGPSPayload, inventarioId: string) {
    const cleanPayload = {
        ...payload,
        nota_venta: payload.nota_venta ? limpiarTexto(payload.nota_venta) : `SIN-NOTA-${Date.now()}`,
        identificacion_cliente: limpiarTexto(payload.identificacion_cliente),
        imei: limpiarTexto(payload.imei).toUpperCase()
    };

    // 1. Insertar Instalación
    const { data: installData, error: installError } = await supabase
        .from('dispositivos_rastreo')
        .insert([cleanPayload])
        .select()
        .single();

    if (installError) return { success: false, error: installError.message };

    // 2. Dar de baja en inventario
    const { error: stockError } = await supabase
        .from('gps_inventario')
        .update({ 
            estado: 'VENDIDO', 
            ubicacion: `CLIENTE: ${cleanPayload.identificacion_cliente}` 
        })
        .eq('id', inventarioId);

    if (stockError) console.error("Error stock update:", stockError);

    return { success: true, data: installData };
  },

  // ==========================================
  // 5. REGISTRO DE VENTA EXTERNA (A TERCEROS)
  // ==========================================
  async registrarVentaExterna(
      cliente: ClienteExternoPayload, 
      gpsPayload: RegistroGPSPayload,
      stockId: string | null
  ) {
      // 1. Crear o Actualizar Cliente Externo
      const { data: clienteData, error: clienteError } = await supabase
          .from('clientes_externos')
          .upsert({
              identificacion: cliente.identificacion,
              nombre_completo: cliente.nombre,
              telefono: cliente.telefono,
              email: cliente.email,
              // Campos nuevos para vehículo en cliente externo (asegúrate de que existan en tu tabla o usa JSONB)
              placa_vehiculo: cliente.placa,
              marca: cliente.marca,
              modelo: cliente.modelo,
              anio: cliente.anio,
              color: cliente.color
          }, { onConflict: 'identificacion' })
          .select()
          .single();

      if (clienteError) return { success: false, error: clienteError.message };

      // 2. Preparar Payload de Venta Unificada
      const ventaPayload = {
          ...gpsPayload,
          identificacion_cliente: cliente.identificacion,
          cliente_externo_id: clienteData.id,
          es_venta_externa: true,
          nota_venta: `EXT-${Date.now()}` 
      };

      // 3. Registrar usando el flujo de stock o manual
      if (stockId) {
          return await rastreadoresService.registrarInstalacionDesdeStock(ventaPayload, stockId);
      } else {
          return await rastreadoresService.registrar(ventaPayload);
      }
  },
  // Agrega esto dentro del objeto rastreadoresService en src/services/rastreadores.service.ts

  // ==========================================
  // 6. REPORTE FINANCIERO (LÓGICA CORREGIDA)
  // ==========================================
  async getKpisFinancieros() {
    try {
        console.log("💰 Calculando Finanzas...");

        // 1. INVERSIÓN (ACTIVO): Equipos en bodega ('STOCK')
        // Sumamos el costo de compra de lo que NO se ha vendido.
        const { data: stockData, error: stockError } = await supabase
            .from('gps_inventario')
            .select('costo_compra')
            .eq('estado', 'STOCK');

        if (stockError) throw stockError;

        const valorInventario = stockData?.reduce((acc, item) => acc + (Number(item.costo_compra) || 0), 0) || 0;

        // 2. VENTAS (INGRESOS) Y COSTOS (EGRESOS): Equipos instalados
        // Consultamos la tabla de operaciones cerradas
        const { data: ventasData, error: ventasError } = await supabase
            .from('dispositivos_rastreo')
            .select('precio_venta, costo_compra');

        if (ventasError) throw ventasError;

        let ventasTotales = 0; // INGRESOS
        let costosTotales = 0; // EGRESOS (Costo de venta)

        ventasData?.forEach(venta => {
            // Ingreso: Lo que pagó el cliente (totalRastreador)
            ventasTotales += Number(venta.precio_venta) || 0;
            
            // Egreso: Lo que te costó ese equipo específico
            costosTotales += Number(venta.costo_compra) || 0;
        });

        // 3. UTILIDAD (GANANCIA REAL)
        const utilidadBruta = ventasTotales - costosTotales;
        
        // 4. MARGEN (%)
        const margenGlobal = ventasTotales > 0 ? (utilidadBruta / ventasTotales) * 100 : 0;

        console.log(`✅ Finanzas: Inv $${valorInventario} | Ventas $${ventasTotales} | Costos $${costosTotales}`);

        return {
            valorInventario, // Inversión
            ventasTotales,   // Ingresos
            costosTotales,   // Egresos
            utilidadBruta,   // Ganancia Neta
            margenGlobal,
            itemsVendidos: ventasData?.length || 0,
            itemsStock: stockData?.length || 0
        };

    } catch (error) {
        console.error("❌ Error calculando KPIs:", error);
        return null;
    }
  }
};