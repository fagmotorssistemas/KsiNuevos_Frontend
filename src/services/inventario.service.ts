import { DashboardInventarioResponse, DetalleVehiculoResponse } from "@/types/inventario.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

export const inventarioService = {
    // Método existente para el Dashboard general
    async getDashboard(): Promise<DashboardInventarioResponse> {
        const res = await fetch(`${API_URL}/inventario/dashboard`);
        if (!res.ok) throw new Error('Error fetching inventory dashboard');
        const response = await res.json();
        return response.data;
    },

    // NUEVO MÉTODO: Obtener historial detallado por placa
    async getDetalleVehiculo(placa: string): Promise<DetalleVehiculoResponse> {
        const res = await fetch(`${API_URL}/inventario/detalle/${placa}`);
        if (!res.ok) throw new Error('Error fetching vehicle details');
        const response = await res.json();
        return response.data;
    }
};