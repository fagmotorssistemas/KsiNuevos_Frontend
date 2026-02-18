import { DashboardVentasResponse } from "@/types/ventas.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const ventasService = {
    async getDashboard(): Promise<DashboardVentasResponse> {
        const res = await fetch(`${API_URL}/ventas/dashboard`);
        if (!res.ok) throw new Error('Error fetching sales dashboard');
        const response = await res.json();
        return response.data;
    }
};