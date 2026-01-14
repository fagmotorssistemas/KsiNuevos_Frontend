import { DashboardEmpleadosResponse } from "@/types/employees.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.117:3005/api';

export const employeesService = {
    async getDashboard(): Promise<DashboardEmpleadosResponse> {
        const res = await fetch(`${API_URL}/empleados/dashboard`);
        if (!res.ok) throw new Error('Error fetching employees dashboard');
        const response = await res.json();
        return response.data;
    }
};