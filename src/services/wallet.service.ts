import { ClienteDeudaSummary, ClienteDetalleResponse, KpiCartera, ClienteBusqueda } from "@/types/wallet.types";

// Asegúrate de que esta URL base coincida con tu backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

export const walletService = {
    // 1. KPIs
    async getKpiResumen(): Promise<KpiCartera> {
        const res = await fetch(`${API_URL}/cartera/kpi`);
        if (!res.ok) throw new Error('Error fetching KPIs');
        const data = await res.json();
        return data.data;
    },

    // 2. Top Deudores (Vista Riesgo)
    async getTopDebtors(limit: number = 10): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/top-deudores?limit=${limit}`);
        if (!res.ok) throw new Error('Error fetching top debtors');
        const data = await res.json();
        return data.data;
    },

    // 3. Todos los Deudores (Vista Alfabética) - NUEVO
    async getAllDebtors(limit: number = 100): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/todos-alfabetico?limit=${limit}`);
        if (!res.ok) throw new Error('Error fetching all debtors');
        const data = await res.json();
        return data.data;
    },

    // 4. Buscador de Clientes - (ESTA ERA LA QUE FALTABA)
    async searchClients(query: string): Promise<ClienteBusqueda[]> {
        const res = await fetch(`${API_URL}/cartera/buscar?q=${query}`);
        if (!res.ok) throw new Error('Error searching clients');
        const data = await res.json();
        return data.data;
    },

    // 5. Detalle del Cliente
    async getClientDetail(id: number): Promise<ClienteDetalleResponse> {
        const res = await fetch(`${API_URL}/cartera/clientes/${id}`);
        if (!res.ok) throw new Error('Error fetching client detail');
        const data = await res.json();
        return data.data;
    }
};