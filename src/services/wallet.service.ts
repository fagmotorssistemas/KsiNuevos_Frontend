import {
    KpiCartera,
    ClienteDeudaSummary,
    ClienteDetalleResponse,
    ClienteBusqueda
} from '@/types/wallet.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const walletService = {
    // 1. Obtener KPIs
    async getKpis(): Promise<KpiCartera> {
        const res = await fetch(`${API_URL}/cartera/kpi`);
        if (!res.ok) throw new Error('Error al obtener KPIs');
        const json = await res.json();
        return json.data;
    },

    // 2. Obtener Top Deudores
    async getTopDebtors(limit = 10): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/top-deudores?limit=${limit}`);
        if (!res.ok) throw new Error('Error al obtener Top Deudores');
        const json = await res.json();
        return json.data;
    },

    // 3. Buscar Clientes
    async searchClients(query: string): Promise<ClienteBusqueda[]> {
        if (!query || query.length < 3) return [];
        const res = await fetch(`${API_URL}/cartera/buscar?q=${query}`);
        if (!res.ok) throw new Error('Error buscando clientes');
        const json = await res.json();
        return json.data;
    },

    // 4. Obtener Detalle de Cliente
    async getClientDetail(id: number): Promise<ClienteDetalleResponse> {
        const res = await fetch(`${API_URL}/cartera/clientes/${id}`);
        if (!res.ok) throw new Error('Error obteniendo detalle');
        const json = await res.json();
        return json.data;
    }
};