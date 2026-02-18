import { DashboardFinanzasResponse } from "@/types/finanzas.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const finanzasService = {
    async getDashboard(): Promise<DashboardFinanzasResponse> {
        const res = await fetch(`${API_URL}/finanzas/dashboard`);
        if (!res.ok) throw new Error('Error al obtener datos financieros');
        const response = await res.json();
        return response.data;
    }
};