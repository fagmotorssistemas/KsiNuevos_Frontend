import { ContratoResumen, ContratoDetalle, CuotaAmortizacion } from "@/types/contratos.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

export const contratosService = {
    // 1. Obtener solo el listado (Rápido)
    async getListaContratos(): Promise<ContratoResumen[]> {
        const res = await fetch(`${API_URL}/contratos/list`);
        if (!res.ok) throw new Error('Error cargando lista de contratos');
        const response = await res.json();
        return response.data;
    },

    // 2. Obtener detalle de un contrato específico
    async getDetalleContrato(id: string): Promise<ContratoDetalle> {
        const res = await fetch(`${API_URL}/contratos/detalle/${id}`);
        if (!res.ok) throw new Error('Error cargando detalle del contrato');
        const response = await res.json();
        return response.data;
    },

    // 3. Obtener amortización
    async getAmortizacion(id: string): Promise<CuotaAmortizacion[]> {
        const res = await fetch(`${API_URL}/contratos/amortizacion/${id}`);
        if (!res.ok) throw new Error('Error cargando amortización');
        const response = await res.json();
        return response.data;
    }
};