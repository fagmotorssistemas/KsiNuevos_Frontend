"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
    ShieldCheck, Loader2, RefreshCw,
    Calendar, DollarSign, AlertTriangle, Users, ShoppingCart, Store, Briefcase, ChevronRight
} from "lucide-react";

import { useSegurosCartera } from "@/hooks/useSegurosCartera";
import { formatDinero } from "@/utils/format";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { KpiCard } from "@/components/features/taller/KpiCard";
import { SegurosPolizaForm } from "@/components/features/seguros/SegurosPolizaForm";

function SegurosPageContent() {
    const searchParams = useSearchParams();
    const [vista, setVista] = useState<'LISTA' | 'FORMULARIO'>('LISTA');
    const {
        seguros,
        loading: loadingData,
        enrichedData,
        cargar: cargarSeguros,
        creditos,
        contados,
        conAlertaRenovacion,
    } = useSegurosCartera();

    const [seleccionado, setSeleccionado] = useState<{
        notaId: string;
        ruc: string;
        cliente: string;
        fecha: string;
        precio: number;
    } | null>(null);

    const totalCantidad = seguros.length;
    const totalRecaudado = seguros.reduce((acc, item) => acc + item.valores.total, 0);

    // Abrir formulario si se llegó con ?nota=XXX (ej. enlace externo)
    useEffect(() => {
        const nota = searchParams.get("nota");
        if (!nota || loadingData || seguros.length === 0) return;
        const item = seguros.find((s) => s.referencia === nota);
        if (item) {
            setSeleccionado({
                notaId: item.referencia,
                ruc: item.cliente.identificacion,
                cliente: item.cliente.nombre,
                fecha: item.fechaEmision,
                precio: item.valores.seguro,
            });
            setVista("FORMULARIO");
        }
    }, [searchParams, loadingData, seguros]);

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SegurosSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    
                    {/* --- VISTA: LISTA (SOLO KPIs - Panel de control) --- */}
                    {vista === 'LISTA' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Seguros Vehiculares</h1>
                                    <p className="text-slate-500 mt-1">Panel de control de pólizas emitidas (seguro 1 año)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={cargarSeguros}
                                    disabled={loadingData}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
                                >
                                    <RefreshCw size={18} className={loadingData ? "animate-spin" : ""} />
                                    Actualizar
                                </button>
                            </div>

                            {/* Grid de KPIs (estilo Taller) */}
                            {loadingData ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KpiCard
                                        title="Pólizas activas"
                                        value={totalCantidad}
                                        icon={ShieldCheck}
                                        color="bg-emerald-600"
                                        subtitle="Emitidas (1 año)"
                                    />
                                    <KpiCard
                                        title="Total recaudado"
                                        value={formatDinero(totalRecaudado)}
                                        icon={DollarSign}
                                        color="bg-emerald-600"
                                        subtitle="Ventas seguros"
                                    />
                                    <KpiCard
                                        title="A crédito"
                                        value={creditos.length}
                                        icon={Calendar}
                                        color="bg-rose-500"
                                        subtitle="Cuenta por cobrar"
                                    />
                                    <KpiCard
                                        title="Al contado"
                                        value={contados.length}
                                        icon={DollarSign}
                                        color="bg-slate-600"
                                        subtitle="Pago único"
                                    />
                                    {conAlertaRenovacion.length > 0 && (
                                        <KpiCard
                                            title="Por renovar 2º año"
                                            value={conAlertaRenovacion.length}
                                            icon={AlertTriangle}
                                            color="bg-amber-500"
                                            subtitle="Próximas a vencer"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Gestión Operativa - accesos rápidos (estilo Taller) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-slate-400" />
                                        Gestión Operativa
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Link href="/seguros/clientes" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Cartera de Clientes</h4>
                                            <p className="text-xs text-slate-500 mt-1">Pólizas por cliente, crédito/contado y gestión.</p>
                                        </Link>
                                        <Link href="/seguros/compras" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                                                    <ShoppingCart className="h-6 w-6" />
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Compras a aseguradoras</h4>
                                            <p className="text-xs text-slate-500 mt-1">Compras de pólizas a aseguradoras.</p>
                                        </Link>
                                        <Link href="/seguros/ventas" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-100 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                                                    <Store className="h-6 w-6" />
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Reventa de seguros</h4>
                                            <p className="text-xs text-slate-500 mt-1">Ventas y emisión de pólizas.</p>
                                        </Link>
                                        <Link href="/seguros/renovaciones" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-rose-50 hover:border-rose-100 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-rose-600 group-hover:scale-110 transition-transform">
                                                    <RefreshCw className="h-6 w-6" />
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-rose-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Renovaciones</h4>
                                            <p className="text-xs text-slate-500 mt-1">Pólizas por vencer y segundo año.</p>
                                        </Link>
                                        <Link href="/seguros/aseguradoras" className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-slate-600 group-hover:scale-110 transition-transform">
                                                    <Briefcase className="h-6 w-6" />
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Aseguradoras</h4>
                                            <p className="text-xs text-slate-500 mt-1">Catálogo de aseguradoras.</p>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- VISTA: FORMULARIO (GESTIÓN) --- */}
                    {vista === 'FORMULARIO' && seleccionado && (
                        <SegurosPolizaForm
                            seleccionado={seleccionado}
                            onClose={() => { setVista('LISTA'); setSeleccionado(null); }}
                            onSuccess={() => cargarSeguros()}
                            backLabel="Volver al listado"
                        />
                    )}

                </main>
            </div>
        </div>
    );
}

export default function SegurosPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-gray-50 items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        }>
            <SegurosPageContent />
        </Suspense>
    );
}