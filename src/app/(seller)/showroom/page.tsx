"use client";

import { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ShowroomVisit } from "./constants";
import ShowroomHeader from "./ShowroomHeader"; // Usaremos un header simple inline o archivo separado si prefieres, aqui lo haré inline para simplificar la importación si no creamos el archivo 2
import ShowroomToolbar from "./ShowroomToolbar";
import ShowroomCard from "./ShowroomCard";
import VisitFormModal from "./VisitFormModal";

// Subcomponente Header simple para mantener los 6 archivos principales
const Header = ({ onNew }: { onNew: () => void }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-slate-700" />
                Showroom & Tráfico
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestión de visitas, walk-ins y actividad diaria de vendedores.</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-95">
            <Plus className="h-4 w-4" /> Registrar Visita
        </button>
    </div>
);

export default function ShowroomPage() {
    const { supabase, user } = useAuth();
    
    // Estados de Datos
    const [visits, setVisits] = useState<ShowroomVisit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salespersons, setSalespersons] = useState<any[]>([]);
    
    // Estados UI
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("today");
    const [selectedSalesperson, setSelectedSalesperson] = useState("all");

    // Verificar si es admin (lógica simple, ajustar según tu sistema de roles real)
    // Asumiremos que si el email contiene "admin" o el rol en metadata es admin
    const isAdmin = true; // CAMBIAR ESTO CON TU LÓGICA REAL: user?.user_metadata?.role === 'admin'

    // --- CARGAR VENDEDORES (Para filtro Admin) ---
    useEffect(() => {
        if (isAdmin) {
            const fetchSalespersons = async () => {
                const { data } = await supabase.from('profiles').select('id, full_name');
                if (data) setSalespersons(data);
            };
            fetchSalespersons();
        }
    }, [isAdmin]);

    // --- CARGAR VISITAS ---
    const fetchVisits = async () => {
        setIsLoading(true);
        
        let query = supabase
            .from('showroom_visits')
            .select(`
                *,
                inventory (id, brand, model, year, price),
                profiles (full_name, email)
            `)
            .order('visit_start', { ascending: false });

        // 1. Filtro de Texto (Buscador)
        if (searchTerm) {
            // Nota: Para buscar en relaciones (inventory.brand) se requiere lógica más compleja en Supabase
            // O un filtro en cliente. Aquí haremos filtro básico por nombre de cliente.
            query = query.ilike('client_name', `%${searchTerm}%`);
        }

        // 2. Filtro de Fecha
        const now = new Date();
        if (dateFilter === 'today') {
            const today = now.toISOString().split('T')[0];
            query = query.gte('visit_start', `${today}T00:00:00`);
        } else if (dateFilter === 'yesterday') {
            const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
            query = query.gte('visit_start', `${yesterday}T00:00:00`).lt('visit_start', `${yesterday}T23:59:59`);
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
            query = query.gte('visit_start', weekAgo);
        } else if (dateFilter === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('visit_start', firstDay);
        }

        // 3. Filtro de Responsable
        if (isAdmin) {
            if (selectedSalesperson !== 'all') {
                query = query.eq('salesperson_id', selectedSalesperson);
            }
        } else {
            // Si NO es admin, forzar ver solo sus propios registros
            if (user) query = query.eq('salesperson_id', user.id);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error cargando showroom:", error);
        } else {
            setVisits(data as any || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) fetchVisits();
    }, [user, dateFilter, selectedSalesperson, searchTerm]); // Recargar cuando cambian filtros

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Header onNew={() => setIsModalOpen(true)} />

            <ShowroomToolbar 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                adminView={isAdmin}
                salespersons={salespersons}
                selectedSalesperson={selectedSalesperson}
                onSalespersonChange={setSelectedSalesperson}
            />

            {isLoading ? (
                <div className="py-20 flex justify-center text-slate-400">Cargando actividad...</div>
            ) : visits.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">No hay visitas registradas con estos filtros.</p>
                    <button onClick={() => setDateFilter('all')} className="text-sm text-blue-600 hover:underline mt-2">Ver todo el historial</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visits.map(visit => (
                        <ShowroomCard key={visit.id} visit={visit} />
                    ))}
                </div>
            )}

            <VisitFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchVisits}
            />
        </div>
    );
}