import { DataLoadResponse, CuotaAmortizacion } from "@/types/contratos.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

export const contratosService = {
    // Carga masiva inicial
    async getAllData(): Promise<DataLoadResponse> {
        const res = await fetch(`${API_URL}/contratos/data-load`);
        if (!res.ok) throw new Error('Error cargando datos de contratos');
        const response = await res.json();
        return response.data;
    },

    // Carga bajo demanda de la tabla de pagos
    async getAmortizacion(id: string): Promise<CuotaAmortizacion[]> {
        // El ID viaja tal cual (string gigante) en la URL
        const res = await fetch(`${API_URL}/contratos/amortizacion/${id}`);
        if (!res.ok) throw new Error('Error cargando amortización');
        const response = await res.json();
        return response.data;
    }
};