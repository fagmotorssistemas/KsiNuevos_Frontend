import { DashboardCobrosResponse } from "@/types/cobros.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const cobrosService = {
    async getDashboard(): Promise<DashboardCobrosResponse> {
        const res = await fetch(`${API_URL}/cobros/dashboard`);
        if (!res.ok) throw new Error('Error fetching collections dashboard');
        const response = await res.json();
        return response.data;
    }
};