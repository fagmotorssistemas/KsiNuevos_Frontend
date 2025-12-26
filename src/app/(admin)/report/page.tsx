"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useVehicleStats } from "@/hooks/useVehicleStats"; 
import { AdminToolbar } from "@/components/features/admin/AdminToolbar";
import { VehicleStatsView } from "@/components/features/admin/VehicleStatsView"; 

import { 
    MessageCircle, 
    MapPin, 
    CalendarCheck, 
    Car, 
    FileText,
    TrendingUp,
    ShieldAlert,
    Users,
    LayoutGrid
} from "lucide-react";

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: number, color: string, bg: string }) {
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


    // 🔥 ÚNICO CAMBIO: ahora marketing también entra
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

            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg w-fit">
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
                                        {/* resto igual */}
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
