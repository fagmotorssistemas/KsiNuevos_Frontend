"use client";

import { useState, useEffect } from "react";
import { Loader2, Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VehicleRequest, RequestStatusType } from "@/components/features/requests/constants";
import RequestsHeader from "@/components/features/requests/RequestsHeader";
import RequestsFilter from "@/components/features/requests/RequestsFilter";
import RequestCard from "@/components/features/requests/RequestCard";
import RequestFormModal from "@/components/features/requests/RequestFormModal";


export default function RequestsPage() {
    const { supabase, user } = useAuth();
    
    // Estados
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('pendiente');

    // --- CARGAR DATOS ---
    const fetchRequests = async () => {
        setIsLoading(true);
        let query = supabase
            .from('vehicle_requests')
            .select('*, profiles:requested_by(full_name)')
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            // CORRECCIÓN: 'as any' soluciona el error de tipo.
            // TypeScript se queja porque 'filterStatus' es string, pero la columna 'status' espera un Enum.
            query = query.eq('status', filterStatus as any);
        }

        const { data, error } = await query;
        if (error) console.error("Error cargando pedidos:", error);
        else setRequests(data as any || []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) fetchRequests();
    }, [user, filterStatus]);

    // --- ACCIONES ---
    const handleStatusChange = async (id: number, newStatus: RequestStatusType) => {
        // Optimistic update
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        await supabase.from('vehicle_requests').update({ status: newStatus }).eq('id', id);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta solicitud?")) return;
        setRequests(prev => prev.filter(r => r.id !== id));
        await supabase.from('vehicle_requests').delete().eq('id', id);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <RequestsHeader onNewRequest={() => setIsModalOpen(true)} />

            <RequestsFilter 
                currentFilter={filterStatus} 
                onFilterChange={setFilterStatus} 
            />

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Car className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <h3 className="text-slate-900 font-medium">No hay pedidos en esta categoría</h3>
                    <p className="text-slate-500 text-sm">Crea una nueva solicitud para comenzar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map((req) => (
                        <RequestCard 
                            key={req.id} 
                            request={req} 
                            onStatusChange={handleStatusChange} 
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            )}

            <RequestFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchRequests} 
            />
        </div>
    );
}