// src/services/contratos.service.ts
import { ContratoResumen, ContratoDetalle, CuotaAmortizacion, CuotaAdicional } from "@/types/contratos.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

// --- HELPER DE EXTRACCIÓN ---
const extraerTipoReal = (bloqueTexto: string, fallback: string): string => {
    if (!bloqueTexto) return fallback;
    const match = bloqueTexto.match(/(?:^|\r\n|\n)Tipo\s+(?!-|Matricula)(.*)/);
    return match ? match[1].trim() : fallback;
};

const adaptarResumen = (data: any): ContratoResumen => {
    return {
        notaVenta: data.notaVenta || data.NOTA_VENTA || data.nota_venta || '',
        fechaVenta: data.fechaVenta || data.FECHA_VENTA || data.fecha_venta || '',
        clienteId: data.clienteId || data.CLIENTE_ID || data.cfac_ced_ruc || '',
        clienteNombre: data.clienteNombre || data.CLIENTE || data.cfac_nombre || '',
        ccoCodigo: data.ccoCodigo || data.CCO_CODIGO || '',
        ccoEmpresa: Number(data.ccoEmpresa || data.CCO_EMPRESA || 0)
    };
};

const adaptarDetalle = (data: any): ContratoDetalle => {
    const datosBloque = data.datosVehiculo || data.DATOS_VEHICULO || data.datos_vehiculo || '';
    const tipoOriginal = data.tipoVehiculo || data.TIPO || data.tipo || '';

    return {
        // --- Identificación ---
        notaVenta: data.notaVenta || data.NOTA_VENTA || data.nota_venta || '',
        fechaVenta: data.fechaVenta || data.FECHA_VENTA || data.fecha_venta || '',
        
        // --- Fecha Completa ---
        fechaVentaFull: data.fechaVentaFull || data.FECHA_VENTA_FULL || data.fechaVenta,

        nroContrato: data.nroContrato || data.NRO_CONTRATO || data.nro_contrato || '',
        ccoCodigo: data.ccoCodigo || data.CCO_CODIGO || data.cco_codigo || '',

        // --- Fechas y Lugares ---
        textoFecha: data.textoFecha || data.CCO_FECHA || data.cco_fecha || '',
        textoFechaDado: data.textoFechaDado || data.ccoFechaDado || data.CCO_FECHA_DADO || data.cco_fecha_dado || '',
        textoFechaCr: data.textoFechaCr || data.ccoFechaCr || data.CCO_FECHACR || data.cco_fechacr || '',
        fechaCiudad: data.fechaCiudad || data.ccoFechaCi || data.CCO_FECHA_CI || data.cco_fecha_ci || '',
        fechaCorta: data.fechaCorta || data.ccoFecha1 || data.CCO_FECHA1 || data.cco_fecha1 || '',
        ciudadContrato: data.ciudadContrato || data.ubicacion || data.UBI_NOMBRE || data.ubi_nombre || '',
        ciudadCliente: data.ciudadCliente || data.CIUDAD_CLIENTE || data.ciudad_cliente || '',

        // --- Cliente ---
        cliente: data.cliente || data.CLIENTE || data.cliente || '',
        facturaNombre: data.facturaNombre || data.CFAC_NOMBRE || data.cfac_nombre || '',
        facturaRuc: data.facturaRuc || data.CFAC_CED_RUC || data.cfac_ced_ruc || '',
        facturaDireccion: data.facturaDireccion || data.CFAC_DIRECCION || data.cfac_direccion || '',
        facturaTelefono: data.facturaTelefono || data.CFAC_TELEFONO || data.cfac_telefono || '',

        // --- Vehículo ---
        sistemaNombre: data.sistemaNombre || data.SIS_NOMBRE || data.sis_nombre || '',
        vehiculo: data.vehiculo || data.VEHICULO || '',
        vehiculoUsadoTexto: data.vehiculoUsadoTexto || data.vehiculoUsado || data.VEHICULO_USADO || data.vehiculo_usado || '',
        marca: data.marca || data.MARCA || data.marca || '',
        modelo: data.modelo || data.MODELO || data.modelo || '',
        tipoVehiculo: extraerTipoReal(datosBloque, tipoOriginal),
        
        anio: data.anio || data.ANIO || data.anio || '',
        anioFabricacion: data.anioFabricacion || data.anioDeFabricacion || data.ANIO_DE_FABRICACION || data.anio_de_fabricacion || '',
        color: data.color || data.COLOR || data.color || '',
        placa: data.placa || data.PLACA || data.placa || '',
        motor: data.motor || data.MOTOR || data.motor || '',
        chasis: data.chasis || data.CHASIS || data.chasis || '',
        datosVehiculo: datosBloque,

        // --- Valores Económicos ---
        precioVehiculo: Number(data.precioVehiculo || data.DFAC_PRECIO || data.dfac_precio || 0),
        precioVehiculoLetras: data.precioVehiculoLetras || data.dfacPrecioLetras || data.DFAC_PRECIO_LETRAS || data.dfac_precio_letras || '',
        precioVehiculoMasLetras: data.precioVehiculoMasLetras || data.dfacPrecioMasLetras || data.DFAC_PRECIO_MAS_LETRAS || data.dfac_precio_mas_letras || '',
        
        gastosAdministrativos: Number(data.gastosAdministrativos || data.GASTOS_ADM || data.gastos_adm || 0),
        precioGastos: Number(data.precioGastos || data.PRECIO_GASTOS || data.precio_gastos || 0),
        precioGastosLetras: data.precioGastosLetras || data.PRECIO_GASTOS_LETRAS || data.precio_gastos_letras || '',

        // --- Totales ---
        totalFinal: data.totalFinal || data.totTotal || data.TOTAL_FINAL || data.TOT_TOTAL || data.tot_total || '',
        totalLetras: data.totalLetras || data.TOTAL_LETRAS || data.total_letras || '',
        totalPagareLetras: data.totalPagareLetras || data.totalPagareMasLetras || data.TOTAL_PAGARE_MAS_LETRAS || data.total_pagare_mas_letras || '',

        // --- Otros ---
        formaPago: data.formaPago || data.PAGO_COMPRA || data.pago_compra || '',
        observaciones: data.observaciones || data.CFAC_OBSERVACIONES || data.cfac_observaciones || '',
        seguroRastreo: data.seguroRastreo || data.seguroRasDis || data.SEGURO_RAS_DIS || data.seguro_ras_dis || '',
        totalSeguro: data.totalSeguro || data.totSeguroTrans || data.TOT_SEGURO_TRANS || data.tot_seguro_trans || '',
        totalRastreador: data.totalRastreador || data.totRastreador || data.TOT_RASTREADOR || data.tot_rastreador || '',
        vendedor: data.vendedor || data.AGENTE || data.agente || '',
        
        // --- Internos ---
        dfacProducto: Number(data.dfacProducto || data.DFAC_PRODUCTO || data.dfac_producto || 0),
        apoderado: data.apoderado || 'N/A',

        // --- PAGOS Y CUOTAS ADICIONALES ---
        montoVehiculoUsado: Number(data.montoVehiculoUsado || 0),
        letrasVehiculoUsado: data.letrasVehiculoUsado || '',
        montoCuotaAdicional: Number(data.montoCuotaAdicional || 0),
        letrasCuotaAdicional: data.letrasCuotaAdicional || '',
        
        // MAPEAMOS LA LISTA DEL BACKEND AL FORMATO DEL FRONTEND
        listaCuotasAdicionales: (data.listaCuotasAdicionales || []).map((ca: any): CuotaAdicional => ({
            monto: Number(ca.monto || 0),
            letras: ca.letras || '',
            fecha: ca.fecha || '' // Se puede omitir si Page6 usa la fecha de venta
        }))
    };
};

export const contratosService = {
    async getListaContratos(): Promise<ContratoResumen[]> {
        const res = await fetch(`${API_URL}/contratos/list`);
        if (!res.ok) throw new Error('Error cargando lista de contratos');
        const response = await res.json();
        const listaRaw = response.data || [];
        return listaRaw.map((item: any) => adaptarResumen(item));
    },

    async getDetalleContrato(id: string): Promise<ContratoDetalle> {
        const res = await fetch(`${API_URL}/contratos/detalle/${id}`);
        if (!res.ok) throw new Error('Error cargando detalle del contrato');
        const response = await res.json();
        return adaptarDetalle(response.data);
    },

    async getAmortizacion(id: string): Promise<CuotaAmortizacion[]> {
        const res = await fetch(`${API_URL}/contratos/amortizacion/${id}`);
        if (!res.ok) throw new Error('Error cargando amortización');
        const response = await res.json();
        return response.data || [];
    }
};