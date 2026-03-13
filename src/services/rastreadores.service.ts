import { getConcesionarias, crearOActualizarConcesionaria, getConcesionariaByRuc } from './rastreadores/concesionarias.service';
import { getDetalleContratoGPS, getListaContratosGPS } from './rastreadores/contratos.service';
import { getCarteraRastreadores } from './rastreadores/cartera-rastreadores.service';
import { getKpisFinancieros } from './rastreadores/financiero.service';
import {
    actualizarTipoPagoYPlazo,
    crearGpsEnInventario,
    obtenerPorContrato,
    subirEvidencias,
    subirEvidenciasRastreadorBucket,
    subirComprobantePago
} from './rastreadores/instalaciones.service';
import {
    actualizarItemInventarioGPS,
    createModelo,
    createProveedor,
    getInventarioCompleto,
    buscarInventarioPorImei as buscarInventarioPorImeiDesdeInventario,
    getInventarioSims,
    getInventarioStock,
    getModelos,
    getProveedores,
    getSimByGpsId,
    ingresarLoteGPS,
    insertarSIM,
    linkOrUpdateSimForGps,
    validarStock
} from './rastreadores/inventario.service';
import { registrarVentaExterna } from './rastreadores/ventas-externas.service';
import {
    actualizarEstadoGPS,
    actualizarVinculacionGPS,
    getGPSPorCliente,
    getGPSPorClienteId,
    getGPSPorVenta,
    obtenerVentasConGPS,
    agregarEvidenciasVenta
} from './rastreadores/vinculacion.service';

export { supabase } from './rastreadores/supabaseClient';

export const rastreadoresService = {
    getListaContratosGPS,
    getDetalleContratoGPS,
    getConcesionarias,
    crearOActualizarConcesionaria,
    getConcesionariaByRuc,
    subirEvidencias,
    subirEvidenciasRastreadorBucket,
    subirComprobantePago,
    obtenerPorContrato,
    actualizarTipoPagoYPlazo,
    crearGpsEnInventario,
    getModelos,
    getProveedores,
    createProveedor,
    createModelo,
    getInventarioStock,
    getInventarioCompleto,
    buscarInventarioPorImeiDesdeInventario,
    actualizarItemInventarioGPS,
    ingresarLoteGPS,
    getSimByGpsId,
    linkOrUpdateSimForGps,
    validarStock,
    registrarVentaExterna,
    getCarteraRastreadores,
    getKpisFinancieros,
    getInventarioSims,
    insertarSIM,
    getGPSPorVenta,
    getGPSPorCliente,
    getGPSPorClienteId,
    actualizarVinculacionGPS,
    obtenerVentasConGPS,
    actualizarEstadoGPS,
    agregarEvidenciasVenta
};