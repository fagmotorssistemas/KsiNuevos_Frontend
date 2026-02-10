"use client";

import Link from "next/link";
import {
    Car,
    AlertTriangle,
    TrendingUp,
    Clock,
    Plus,
    Wrench,
    FileText,
    ChevronRight
} from "lucide-react";
import { useTallerMetrics } from "@/hooks/taller/useTallerMetrics";
import { KpiCard } from "@/components/features/taller/KpiCard";
import { useAuth } from "@/hooks/useAuth";

export default function TallerPage() {
    const { profile } = useAuth();
    const { metrics, isLoading } = useTallerMetrics();

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* Header de Bienvenida */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}. Aquí tienes el resumen de hoy.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/taller/recepcion"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Orden
                    </Link>
                </div>
            </div>

            {/* Grid de KPIs */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Vehículos en Planta"
                        value={metrics.vehiculosEnPlanta}
                        icon={Car}
                        color="bg-blue-600"
                        subtitle="En proceso de reparación"
                    />
                    <KpiCard
                        title="Por Entregar"
                        value={metrics.entregasPendientes}
                        icon={Clock}
                        color="bg-amber-500"
                        subtitle="Trabajos terminados"
                    />
                    <KpiCard
                        title="Alertas Stock"
                        value={metrics.alertasStock}
                        icon={AlertTriangle}
                        color="bg-red-500"
                        subtitle="Materiales bajo mínimo"
                    />
                    <KpiCard
                        title="Ingresos Mes"
                        value={`$${metrics.ingresosMes.toLocaleString('en-US')}`}
                        icon={TrendingUp}
                        color="bg-emerald-600"
                        subtitle="Facturación acumulada"
                    />
                </div>
            )}

            {/* Sección de Accesos Rápidos y Actividad */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Panel Principal: Accesos Rápidos */}
                <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-slate-400" />
                        Gestión Operativa
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/taller/recepcion" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                            </div>
                            <h4 className="font-bold text-slate-800">Recepción de Vehículo</h4>
                            <p className="text-xs text-slate-500 mt-1">Crear orden de trabajo, checklist y fotos.</p>
                        </Link>

                        <Link href="/taller/inventario" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-100 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                                    <Wrench className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-purple-500" />
                            </div>
                            <h4 className="font-bold text-slate-800">Inventario y Herramientas</h4>
                            <p className="text-xs text-slate-500 mt-1">Gestionar stock, compras y asignaciones.</p>
                        </Link>

                        <Link href="/taller/trabajos" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-100 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500" />
                            </div>
                            <h4 className="font-bold text-slate-800">Tablero de Trabajos</h4>
                            <p className="text-xs text-slate-500 mt-1">Ver flujo de autos (Kanban) y estados.</p>
                        </Link>

                        <Link href="/taller/finanzas" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500" />
                            </div>
                            <h4 className="font-bold text-slate-800">Caja y Finanzas</h4>
                            <p className="text-xs text-slate-500 mt-1">Registrar pagos, gastos y nómina.</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}