import { ContratoResumen, ContratoDetalle, CuotaAmortizacion } from "@/types/contratos.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

// --- ADAPTADOR (SOLUCIÓN AL PROBLEMA DE DATOS FALTANTES) ---
// Esta función normaliza la respuesta del backend, buscando tanto la propiedad en camelCase
// como la posible propiedad original de la Base de Datos (SnakeCase o UpperCase).
const adaptarDetalle = (data: any): ContratoDetalle => {
    return {
        // Identificación
        notaVenta: data.notaVenta || data.NOTA_VENTA || '',
        fechaVenta: data.fechaVenta || data.FECHA_VENTA || '',
        nroContrato: data.nroContrato || data.NRO_CONTRATO || '',
        ccoCodigo: data.ccoCodigo || data.CCO_CODIGO_STR || data.CCO_CODIGO || '',

        // Fechas y Lugares (Aquí suelen perderse datos)
        textoFecha: data.textoFecha || data.CCO_FECHA || '',
        textoFechaDado: data.textoFechaDado || data.CCO_FECHA_DADO || '',
        textoFechaCr: data.textoFechaCr || data.CCO_FECHACR || '',
        ciudadContrato: data.ciudadContrato || data.ubicacion || data.UBI_NOMBRE || '',
        ciudadCliente: data.ciudadCliente || data.CIUDAD_CLIENTE || '',

        // Cliente
        cliente: data.cliente || data.CLIENTE || '',
        facturaNombre: data.facturaNombre || data.CFAC_NOMBRE || '',
        facturaRuc: data.facturaRuc || data.CFAC_CED_RUC || '',
        facturaDireccion: data.facturaDireccion || data.CFAC_DIRECCION || '',
        facturaTelefono: data.facturaTelefono || data.CFAC_TELEFONO || '',

        // Vehículo
        sistemaNombre: data.sistemaNombre || data.SIS_NOMBRE || '',
        vehiculo: data.vehiculo || data.vehiculoUsado || data.VEHICULO_USADO || '',
        marca: data.marca || data.MARCA || '',
        modelo: data.modelo || data.MODELO || '',
        tipoVehiculo: data.tipoVehiculo || data.TIPO || '',
        anio: data.anio || data.ANIO || '',
        anioFabricacion: data.anioFabricacion || data.ANIO_DE_FABRICACION || '',
        color: data.color || data.COLOR || '',
        placa: data.placa || data.PLACA || '',
        motor: data.motor || data.MOTOR || '',
        chasis: data.chasis || data.CHASIS || '',

        // Valores (Conversión segura a Number)
        precioVehiculo: Number(data.precioVehiculo || data.DFAC_PRECIO || 0),
        precioVehiculoLetras: data.precioVehiculoLetras || data.DFAC_PRECIO_LETRAS || '',
        gastosAdministrativos: Number(data.gastosAdministrativos || data.GASTOS_ADM || 0),
        precioGastos: Number(data.precioGastos || data.PRECIO_GASTOS || 0),

        // Totales
        totalFinal: data.totalFinal || data.TOTAL_FINAL || data.TOT_TOTAL || '',
        totalLetras: data.totalLetras || data.TOTAL_LETRAS || '',
        totalPagareLetras: data.totalPagareLetras || data.TOTAL_PAGARE_MAS_LETRAS || '',

        // Otros
        formaPago: data.formaPago || data.PAGO_COMPRA || '',
        observaciones: data.observaciones || data.CFAC_OBSERVACIONES || '',
        seguroRastreo: data.seguroRastreo || data.SEGURO_RAS_DIS || '',
        totalSeguro: data.totalSeguro || data.TOT_SEGURO_TRANS || '',
        totalRastreador: data.totalRastreador || data.TOT_RASTREADOR || '',
        vendedor: data.vendedor || data.AGENTE || '',
        
        // Internos
        dfacProducto: Number(data.dfacProducto || data.DFAC_PRODUCTO || 0),
        apoderado: data.apoderado || 'N/A'
    };
};

export const contratosService = {
    // 1. Listado
    async getListaContratos(): Promise<ContratoResumen[]> {
        const res = await fetch(`${API_URL}/contratos/list`);
        if (!res.ok) throw new Error('Error cargando lista de contratos');
        const response = await res.json();
        return response.data || [];
    },

    // 2. Detalle (Usando el adaptador)
    async getDetalleContrato(id: string): Promise<ContratoDetalle> {
        const res = await fetch(`${API_URL}/contratos/detalle/${id}`);
        if (!res.ok) throw new Error('Error cargando detalle del contrato');
        const response = await res.json();
        
        // APLICAMOS EL ADAPTADOR AQUÍ
        return adaptarDetalle(response.data);
    },

    // 3. Amortización
    async getAmortizacion(id: string): Promise<CuotaAmortizacion[]> {
        const res = await fetch(`${API_URL}/contratos/amortizacion/${id}`);
        if (!res.ok) throw new Error('Error cargando amortización');
        const response = await res.json();
        return response.data || [];
    }
};