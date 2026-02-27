import { 
    ClienteDeudaSummary, 
    ClienteDetalleResponse, 
    KpiCartera, 
    ClienteBusqueda,
    CreditoResumen,
    CuotaAmortizacion,
    DetalleDocumento 
} from "@/types/wallet.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cartera.ksinuevos.com/api';

export const walletService = {

    async getKpiResumen(): Promise<KpiCartera> {
        const res = await fetch(`${API_URL}/cartera/kpi`);
        if (!res.ok) throw new Error('Error fetching KPIs');
        const data = await res.json();
        return data.data;
    },

    async getTopDebtors(limit: number = 1000): Promise<ClienteDeudaSummary[]> {
        const res = await fetch(`${API_URL}/cartera/top-deudores?limit=${limit}`);
        if (!res.ok) throw new Error('Error fetching top debtors');
        const data = await res.json();
        return data.data;
    },

    async getAllDebtors(limit: number = 1000): Promise<ClienteDeudaSummary[]> {
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

    // --- MÉTODOS PARA AMORTIZACIÓN (CORREGIDOS) ---

    // 1. Obtener lista de créditos (Tarjetas)
    async getClientCredits(clienteId: number): Promise<CreditoResumen[]> {
        const res = await fetch(`${API_URL}/cartera/creditos/${clienteId}`);
        if (!res.ok) throw new Error('Error fetching credits');
        const data = await res.json();
        return data.data;
    },

    // 2. Obtener la tabla detallada (AHORA CON DOBLE LLAVE)
    // El backend necesita clientId Y creditId para ser preciso
    async getAmortizationTable(clientId: number, creditId: string): Promise<CuotaAmortizacion[]> {
        const res = await fetch(`${API_URL}/cartera/amortizacion/${clientId}/${creditId}`);
        if (!res.ok) throw new Error('Error fetching amortization table');
        const data = await res.json();
        return data.data;
    },

    // ✨ NUEVO: Buscar documento por número físico (nota de venta) - OPTIMIZADO
    async getDocumentoByNumeroFisico(numeroFisico: string): Promise<DetalleDocumento | null> {
        try {
            const res = await fetch(`${API_URL}/cartera/documento/fisico/${numeroFisico}`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Error fetching documento by numero fisico');
            }
            const data = await res.json();
            return data.data;
        } catch (error) {
            console.error('Error buscando documento por número físico:', error);
            return null;
        }
    }
};