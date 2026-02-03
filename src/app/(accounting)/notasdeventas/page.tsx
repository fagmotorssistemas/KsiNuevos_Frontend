"use client";

import { useState } from "react";
import { RefreshCw, ScrollText, Search, Eye } from "lucide-react";
import { useContratosData } from "@/hooks/useContratosData";
import { ContratoDetails } from "@/components/features/contracts/ContratoDetails";
import { ContratoResumen } from "@/types/contratos.types";

export default function ContratosPage() {
    const { contratos, loading, refresh } = useContratosData();
    const [selectedContrato, setSelectedContrato] = useState<ContratoResumen | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtrado en cliente (CORREGIDO con manejo seguro de nulos)
    const filteredContratos = contratos.filter(c => 
        (c.clienteNombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.notaVenta?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.clienteId?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Notas de venta
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <ScrollText className="h-3.5 w-3.5 text-red-500" />
                        Base de datos de notas de ventas (Vista KSI_NOTAS_CONTRATO_V)
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Buscar cliente"
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Refrescar
                    </button>
                </div>
            </div>

            {/* Tabla Listado (Solo Resumen) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-32">Nota Venta</th>
                                <th className="px-6 py-4 w-16">Fecha</th>
                                <th className="px-6 py-4 w-32">Cliente</th>
                                <th className="px-6 py-4 text-center w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={4} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredContratos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        No hay contratos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredContratos.map((c) => (
                                    <tr key={c.ccoCodigo} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                                            {c.notaVenta}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {c.fechaVenta}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{c.clienteNombre}</span>
                                                <span className="text-xs text-slate-400">ID: {c.clienteId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedContrato(c)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-black hover:bg-gray-600 rounded-lg transition-colors"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Ver Ficha
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                    Mostrando {filteredContratos.length} registros
                </div>
            </div>

            {/* Modal de Detalle (Carga bajo demanda) */}
            {selectedContrato && (
                <ContratoDetails 
                    contratoId={selectedContrato.ccoCodigo}
                    initialData={{
                        nota: selectedContrato.notaVenta,
                        cliente: selectedContrato.clienteNombre
                    }}
                    onClose={() => setSelectedContrato(null)} 
                />
            )}

        </div>
    );
}