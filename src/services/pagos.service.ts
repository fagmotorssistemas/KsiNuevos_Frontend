import { DashboardPagosResponse } from "@/types/pagos.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const pagosService = {
    async getDashboard(): Promise<DashboardPagosResponse> {
        const res = await fetch(`${API_URL}/pagos/dashboard`);
        if (!res.ok) throw new Error('Error fetching payments dashboard');
        const response = await res.json();
        return response.data;
    }
};