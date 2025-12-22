"use client";

import { useAdminStats } from "@/hooks/useAdminStats";
import { AdminToolbar } from "./AdminToolbar";
import { 
    Users, 
    MessageCircle, 
    MapPin, 
    CalendarCheck, 
    Car, 
    FileText, 
    TrendingUp
} from "lucide-react";

export default function AdminDashboard() {
    const {
        stats,
        isLoading,
        dateFilter,
        setDateFilter,
        customRange,
        setCustomRange,
        reload
    } = useAdminStats();

    // Calcular totales globales para las tarjetas de resumen
    const grandTotals = stats.reduce((acc, curr) => ({
        leads: acc.leads + curr.leads_responded,
        showroom: acc.showroom + curr.showroom_created,
        appointments: acc.appointments + curr.appointments_created,
        requests: acc.requests + curr.requests_created,
        proformas: acc.proformas + curr.proformas_created
    }), { leads: 0, showroom: 0, appointments: 0, requests: 0, proformas: 0 });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Panel de Rendimiento</h1>
                    <p className="text-slate-500 mt-1">
                        Monitoreo de actividad operativa y comercial por responsable.
                    </p>
                </div>
            </div>

            {/* Toolbar y Filtros */}
            <AdminToolbar 
                currentFilter={dateFilter}
                onFilterChange={setDateFilter}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                onRefresh={reload}
                isLoading={isLoading}
            />

            {/* Tarjetas de Resumen (Totales del periodo seleccionado) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={MessageCircle} label="Leads Resp." value={grandTotals.leads} color="text-blue-600" bg="bg-blue-50" />
                <StatCard icon={MapPin} label="Showroom Agend." value={grandTotals.showroom} color="text-purple-600" bg="bg-purple-50" />
                <StatCard icon={CalendarCheck} label="Citas Creadas" value={grandTotals.appointments} color="text-green-600" bg="bg-green-50" />
                <StatCard icon={Car} label="Pedidos Autos" value={grandTotals.requests} color="text-orange-600" bg="bg-orange-50" />
                <StatCard icon={FileText} label="Proformas" value={grandTotals.proformas} color="text-indigo-600" bg="bg-indigo-50" />
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Leads Respondidos</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Showroom (Agend)</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Citas (Creadas)</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Pedidos Autos</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Proformas</th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-900 uppercase tracking-wider text-center bg-slate-100/50">Total Actividad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                // Skeleton loader básico
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                                        <td colSpan={6} className="py-4 px-6"></td>
                                    </tr>
                                ))
                            ) : stats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500">
                                        No hay actividad registrada en este rango de fechas.
                                    </td>
                                </tr>
                            ) : (
                                stats.map((seller) => (
                                    <tr key={seller.profile_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                                                    {seller.full_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-900">{seller.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.leads_responded > 0 ? 'bg-blue-100 text-blue-800' : 'text-slate-400'}`}>
                                                {seller.leads_responded}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.showroom_created > 0 ? 'bg-purple-100 text-purple-800' : 'text-slate-400'}`}>
                                                {seller.showroom_created}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.appointments_created > 0 ? 'bg-green-100 text-green-800' : 'text-slate-400'}`}>
                                                {seller.appointments_created}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.requests_created > 0 ? 'bg-orange-100 text-orange-800' : 'text-slate-400'}`}>
                                                {seller.requests_created}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.proformas_created > 0 ? 'bg-indigo-100 text-indigo-800' : 'text-slate-400'}`}>
                                                {seller.proformas_created}
                                            </span>
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
    );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: number, color: string, bg: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`p-2 rounded-lg ${bg} ${color} mb-2`}>
                <Icon className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            <span className="text-xs text-slate-500 font-medium">{label}</span>
        </div>
    );
}