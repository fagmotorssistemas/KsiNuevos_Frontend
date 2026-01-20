"use client";

import { useState } from "react";
import { RefreshCw, ScrollText, Search, Eye } from "lucide-react";
import { useContratosData } from "@/hooks/useContratosData";
import { ContratoDetails } from "@/components/features/contracts/ContratoDetails";
import { ContratoDetalle } from "@/types/contratos.types";

export default function ContratosPage() {
    const { contratos, loading, refresh } = useContratosData();
    const [selectedContrato, setSelectedContrato] = useState<ContratoDetalle | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtrado simple en cliente
    const filteredContratos = contratos.filter(c => 
        c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.notaVenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.placa?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Gestión de Contratos
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <ScrollText className="h-3.5 w-3.5 text-blue-500" />
                        Base de datos de contratos, vehículos y tablas de amortización
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Buscar cliente, nota o placa..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Tabla Maestra */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Fecha / Nota</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Vehículo</th>
                                <th className="px-6 py-4 text-right">Monto Total</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                // Skeleton loader
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredContratos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron contratos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredContratos.map((c) => (
                                    <tr key={c.ccoCodigo} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{c.notaVenta}</span>
                                                <span className="text-xs text-slate-500">{c.fechaVenta}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col max-w-[250px]">
                                                <span className="font-medium text-slate-700 truncate" title={c.cliente}>{c.cliente}</span>
                                                <span className="text-xs text-slate-500">RUC: {c.facturaRuc}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 font-medium">{c.marca} {c.modelo}</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    {c.anio} • <span className="uppercase bg-slate-100 px-1 rounded">{c.placa || 'S/P'}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                            {c.totalFinal}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedContrato(c)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group-hover:shadow-sm border border-transparent group-hover:border-blue-100"
                                                title="Ver Ficha Completa y Amortización"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                    Mostrando {filteredContratos.length} contratos
                </div>
            </div>

            {/* Modal de Detalle */}
            {selectedContrato && (
                <ContratoDetails 
                    contrato={selectedContrato} 
                    onClose={() => setSelectedContrato(null)} 
                />
            )}

        </div>
    );
}