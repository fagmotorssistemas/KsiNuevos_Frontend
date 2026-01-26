"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useVehicleStats } from "@/hooks/useVehicleStats"; 
import { AdminToolbar } from "@/components/features/admin/AdminToolbar";
import { VehicleStatsView } from "@/components/features/admin/VehicleStatsView"; 
import { createClient } from '@/lib/supabase/client';

import { 
    MessageCircle, 
    MapPin, 
    CalendarCheck, 
    Car, 
    FileText,
    TrendingUp,
    ShieldAlert,
    Users,
    LayoutGrid,
    X,
    ExternalLink,
    Search,
    User,
    Calendar,
    Phone,
    LucideIcon
} from "lucide-react";

// --- INTERFACES ---

interface ProformaWithProfile {
    id: string;
    created_at: string;
    client_name: string;
    client_phone: string | null;
    vehicle_description: string | null;
    pdf_url: string | null;
    created_by: string | null;
    // Ahora profiles es un objeto simple o null
    profiles: {
        full_name: string | null;
        phone: string | null;
    } | null;
}

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: number;
    color: string;
    bg: string;
}

interface ProformasHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- COMPONENTE MODAL DE HISTORIAL DE PROFORMAS ---
function ProformasHistoryModal({ isOpen, onClose }: ProformasHistoryModalProps) {
    const [proformas, setProformas] = useState<ProformaWithProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchProformas();
        }
    }, [isOpen]);

    const fetchProformas = async () => {
        setIsLoading(true);
        
        // AHORA SI FUNCIONARÁ EL JOIN:
        // Solicitamos los campos de la tabla profiles relacionada
        const { data, error } = await supabase
            .from('credit_proformas')
            .select(`
                *,
                profiles (
                    full_name,
                    phone
                )
            `)
            .not('pdf_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50); 

        if (error) {
            console.error("Error cargando proformas:", error);
            setProformas([]);
        } else {
            // TypeScript a veces devuelve 'profiles' como array si la relación no es única,
            // pero con FK debería ser objeto. Hacemos un cast seguro.
            setProformas((data as unknown as ProformaWithProfile[]) || []);
        }
        setIsLoading(false);
    };

    const handleWhatsApp = (phoneRaw: string | null) => {
        if (!phoneRaw) return;
        
        let phone = phoneRaw.replace(/\D/g, '');
        
        if (phone.startsWith('0')) {
            phone = '593' + phone.substring(1);
        } else if (!phone.startsWith('593')) {
            phone = '593' + phone;
        }

        const url = `https://wa.me/${phone}`;
        window.open(url, '_blank');
    };

    const handleOpenPdf = (url: string | null) => {
        if (url) window.open(url, '_blank');
    };

    const filteredProformas = proformas.filter(p => 
        (p.client_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (p.vehicle_description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (p.profiles?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header del Modal */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Historial de Proformas Digitales
                        </h2>
                        <p className="text-xs text-slate-500">Últimos documentos generados</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Buscador */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente, vehículo o asesor..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-slate-500">Cargando documentos...</span>
                        </div>
                    ) : filteredProformas.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            No se encontraron proformas guardadas con PDF.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredProformas.map((item) => {
                                // Aquí obtenemos el nombre desde profiles
                                const sellerName = item.profiles?.full_name || 'Desconocido';
                                const sellerPhone = item.profiles?.phone;

                                return (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        
                                        {/* Info Cliente y Vehículo */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-900 truncate">{item.client_name}</h3>
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">Generada</span>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                                    <Car className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate">{item.vehicle_description || 'Vehículo no especificado'}</span>
                                                </p>
                                                
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(item.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                                    </span>
                                                    
                                                    {/* Nombre del Vendedor */}
                                                    <span className="flex items-center gap-1 font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded" title={`Creado por ${sellerName}`}>
                                                        <User className="h-3 w-3" />
                                                        {sellerName}
                                                    </span>

                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {item.client_phone || 'Sin teléfono'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones de Acción */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            {item.client_phone && (
                                                <button 
                                                    onClick={() => handleWhatsApp(item.client_phone)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                                                    title="Contactar Cliente por WhatsApp"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    <span className="sm:hidden">Cliente</span>
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => handleOpenPdf(item.pdf_url)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-600/20"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span>Ver PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
                    Mostrando los últimos 50 registros
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL (STATS CARD) ---
function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className={`p-2.5 rounded-full ${bg} ${color} mb-3`}>
                <Icon className="h-5 w-5" />
            </div>
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">{label}</span>
        </div>
    );
}

export default function AdminDashboardPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'sellers' | 'vehicles'>('sellers');
    const [inventoryStatus, setInventoryStatus] = useState<string>('disponible');
    
    // Estado para abrir/cerrar el modal de historial
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const {
        stats: sellerStats,
        isLoading: isSellersLoading,
        dateFilter,
        setDateFilter,
        customDate,
        setCustomDate,
        reload: reloadSellers
    } = useAdminStats();

    const {
        inventoryStats,    
        opportunityStats,
        isVehicleLoading,
        reloadVehicles
    } = useVehicleStats(dateFilter, customDate, inventoryStatus);

    const handleReload = () => {
        reloadSellers();
        reloadVehicles();
    };

    const grandTotals = useMemo(() => sellerStats.reduce((acc, curr) => ({
        leads: acc.leads + curr.leads_responded,
        showroom: acc.showroom + curr.showroom_created,
        appointments: acc.appointments + curr.appointments_created,
        requests: acc.requests + curr.requests_created,
        proformas: acc.proformas + curr.proformas_created
    }), { leads: 0, showroom: 0, appointments: 0, requests: 0, proformas: 0 }), [sellerStats]);


    if (
        !isAuthLoading &&
        (!profile ||
        (profile.role !== 'admin' &&
         profile.role !== 'vendedor' &&
         profile.role !== 'marketing'))
    ) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600">
                <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold">Acceso Restringido</h1>
                <p>No tienes permisos para ver el panel administrativo.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">
            
            {/* Modal de Historial */}
            <ProformasHistoryModal 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Resultados</h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-brand-500" />
                        Monitoreo integral de productividad e inventario
                    </p>
                </div>
            </div>

            <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 rounded-xl shadow-sm border border-slate-200/60">
                <AdminToolbar 
                    currentFilter={dateFilter}
                    onFilterChange={setDateFilter}
                    customDate={customDate}
                    onCustomDateChange={setCustomDate}
                    onRefresh={handleReload}
                    isLoading={isSellersLoading || isVehicleLoading}
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-200/50 p-1 rounded-lg">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('sellers')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'sellers' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        Rendimiento Asesores
                    </button>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'vehicles' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Inventario & Demanda
                    </button>
                </div>

                {/* BOTÓN NUEVO: Historial PDFs */}
                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors shadow-sm"
                >
                    <FileText className="h-4 w-4" />
                    Historial Proformas (PDF)
                </button>
            </div>

            <div className="min-h-[400px]">
                
                {activeTab === 'sellers' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatCard icon={MessageCircle} label="Leads Resp." value={grandTotals.leads} color="text-blue-600" bg="bg-blue-50" />
                            <StatCard icon={MapPin} label="Showroom" value={grandTotals.showroom} color="text-purple-600" bg="bg-purple-50" />
                            <StatCard icon={CalendarCheck} label="Citas" value={grandTotals.appointments} color="text-green-600" bg="bg-green-50" />
                            <StatCard icon={Car} label="Pedidos" value={grandTotals.requests} color="text-orange-600" bg="bg-orange-50" />
                            <StatCard icon={FileText} label="Proformas" value={grandTotals.proformas} color="text-indigo-600" bg="bg-indigo-50" />
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-semibold text-slate-800">Desglose por Responsable</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asesor</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Leads Resp.</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Showroom</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Citas</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Pedidos</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Proformas</th>
                                            <th className="py-4 px-6 text-xs font-bold text-slate-800 uppercase tracking-wider text-center bg-slate-100">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isSellersLoading ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td className="py-4 px-6"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                                                    <td colSpan={6} className="py-4 px-6"></td>
                                                </tr>
                                            ))
                                        ) : sellerStats.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-500">
                                                    No hay actividad registrada en este rango de fechas.
                                                </td>
                                            </tr>
                                        ) : (
                                            sellerStats.map((seller) => (
                                                <tr key={seller.profile_id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200 shadow-sm">
                                                                {seller.full_name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-slate-900">{seller.full_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[30px] ${seller.leads_responded > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-300'}`}>{seller.leads_responded}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[30px] ${seller.showroom_created > 0 ? 'bg-purple-100 text-purple-700' : 'text-slate-300'}`}>{seller.showroom_created}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[30px] ${seller.appointments_created > 0 ? 'bg-green-100 text-green-700' : 'text-slate-300'}`}>{seller.appointments_created}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[30px] ${seller.requests_created > 0 ? 'bg-orange-100 text-orange-700' : 'text-slate-300'}`}>{seller.requests_created}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[30px] ${seller.proformas_created > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-300'}`}>{seller.proformas_created}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center bg-slate-50/30 font-bold text-slate-900 border-l border-slate-100 group-hover:bg-slate-100/50">
                                                        {seller.total_activity}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <VehicleStatsView 
                        stats={inventoryStats} 
                        opportunities={opportunityStats}
                        isLoading={isVehicleLoading}
                        statusFilter={inventoryStatus}
                        onStatusFilterChange={setInventoryStatus}
                    />
                )}
            </div>
        </div>
    );
}