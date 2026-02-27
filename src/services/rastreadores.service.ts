import { getConcesionarias, crearOActualizarConcesionaria, getConcesionariaByRuc } from './rastreadores/concesionarias.service';
import { getDetalleContratoGPS, getListaContratosGPS } from './rastreadores/contratos.service';
import { getCarteraRastreadores } from './rastreadores/cartera-rastreadores.service';
import { getKpisFinancieros } from './rastreadores/financiero.service';
import {
    actualizar,
    actualizarTipoPagoYPlazo,
    obtenerPorContrato,
    registrar,
    registrarInstalacionDesdeStock,
    subirEvidencias,
    subirComprobantePago
} from './rastreadores/instalaciones.service';
import {
    getInventarioSims,
    getInventarioStock,
    getModelos,
    getProveedores,
    ingresarLoteGPS,
    insertarSIM,
    validarStock
} from './rastreadores/inventario.service';
import { registrarVentaExterna } from './rastreadores/ventas-externas.service';
import {
    actualizarEstadoGPS,
    actualizarVinculacionGPS,
    getGPSPorCliente,
    getGPSPorVenta,
    obtenerVentasConGPS
} from './rastreadores/vinculacion.service';

export { supabase } from './rastreadores/supabaseClient';

export const rastreadoresService = {
    getListaContratosGPS,
    getDetalleContratoGPS,
    getConcesionarias,
    crearOActualizarConcesionaria,
    getConcesionariaByRuc,
    subirEvidencias,
    subirComprobantePago,
    obtenerPorContrato,
    registrar,
    actualizar,
    actualizarTipoPagoYPlazo,
    getModelos,
    getProveedores,
    getInventarioStock,
    ingresarLoteGPS,
    validarStock,
    registrarInstalacionDesdeStock,
    registrarVentaExterna,
    getCarteraRastreadores,
    getKpisFinancieros,
    getInventarioSims,
    insertarSIM,
    getGPSPorVenta,
    getGPSPorCliente,
    actualizarVinculacionGPS,
    obtenerVentasConGPS,
    actualizarEstadoGPS
};