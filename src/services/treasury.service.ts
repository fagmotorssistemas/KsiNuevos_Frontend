import { DetalleTesoreriaResponse } from "@/types/treasury.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const treasuryService = {
    async getDashboard(): Promise<DetalleTesoreriaResponse> {
        const res = await fetch(`${API_URL}/tesoreria/dashboard`);
        if (!res.ok) throw new Error('Error fetching treasury dashboard');
        const response = await res.json();
        return response.data;
    }
};