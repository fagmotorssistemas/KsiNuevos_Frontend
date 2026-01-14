import { useState, useEffect } from 'react';
import { employeesService } from '@/services/employee.service';
import { DashboardEmpleadosResponse } from '@/types/employees.types';

export const useEmployeesData = () => {
    const [data, setData] = useState<DashboardEmpleadosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await employeesService.getDashboard();
            setData(result);
        } catch (err) {
            console.error(err);
            setError('No se pudo obtener la información de empleados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { 
        data, 
        loading, 
        error, 
        refresh: fetchData 
    };
};