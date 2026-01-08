import { 
    ClienteDeudaSummary, 
    ClienteDetalleResponse, 
    KpiCartera, 
    ClienteBusqueda,
    CreditoResumen,
    CuotaAmortizacion 
} from "@/types/wallet.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const walletService = {
    // --- MÉTODOS EXISTENTES ---

    async getKpiResumen(): Promise<KpiCartera> {
        const res = await fetch(`${API_URL}/cartera/kpi`);
        if (!res.ok) throw new Error('Error fetching KPIs');
        const data = await res.json();
        return data.data;
    },

    async getTopDebtors(limit: number = 10): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/top-deudores?limit=${limit}`);
        if (!res.ok) throw new Error('Error fetching top debtors');
        const data = await res.json();
        return data.data;
    },

    async getAllDebtors(limit: number = 100): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/todos-alfabetico?limit=${limit}`);
        if (!res.ok) throw new Error('Error fetching all debtors');
        const data = await res.json();
        return data.data;
    },

    async searchClients(query: string): Promise<ClienteBusqueda[]> {
        const res = await fetch(`${API_URL}/cartera/buscar?q=${query}`);
        if (!res.ok) throw new Error('Error searching clients');
        const data = await res.json();
        return data.data;
    },

    async getClientDetail(id: number): Promise<ClienteDetalleResponse> {
        const res = await fetch(`${API_URL}/cartera/clientes/${id}`);
        if (!res.ok) throw new Error('Error fetching client detail');
        const data = await res.json();
        return data.data;
    },

    // --- NUEVOS MÉTODOS PARA AMORTIZACIÓN ---

    // 6. Obtener lista de créditos de un cliente
    async getClientCredits(clienteId: number): Promise<CreditoResumen[]> {
        const res = await fetch(`${API_URL}/cartera/creditos/${clienteId}`);
        if (!res.ok) throw new Error('Error fetching credits');
        const data = await res.json();
        return data.data;
    },

    // 7. Obtener la tabla detallada de un crédito específico
    async getAmortizationTable(creditId: string): Promise<CuotaAmortizacion[]> {
        // Importante: creditId es un string largo, se pasa directo en la URL
        const res = await fetch(`${API_URL}/cartera/amortizacion/${creditId}`);
        if (!res.ok) throw new Error('Error fetching amortization table');
        const data = await res.json();
        return data.data;
    }
};