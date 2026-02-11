// src/app/(seller)/contracts/page.tsx
"use client";

import { useState } from "react";
import { RefreshCw, FileText, Search } from "lucide-react";
import { useContratosData } from "@/hooks/useContratosData";
import { ContractViewer } from "@/components/features/contracts/print/ContractViewer";

export default function ContratosPage() {
    const { contratos, loading, refresh } = useContratosData();
    const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtrado seguro
    const filteredContratos = contratos.filter(c => 
        (c.clienteNombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.clienteId?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            
            {/* Cabecera simplificada */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Generación de Contratos
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Seleccione un cliente para generar e imprimir su contrato.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Listado Simplificado */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Cliente / Razón Social</th>
                            <th className="px-6 py-4 w-48">Identificación</th>
                            <th className="px-6 py-4 w-40 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i}><td colSpan={3} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div></td></tr>
                            ))
                        ) : filteredContratos.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No se encontraron resultados</td></tr>
                        ) : (
                            filteredContratos.map((c) => (
                                <tr key={c.ccoCodigo} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {c.clienteNombre}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono">
                                        {c.clienteId}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedContratoId(c.ccoCodigo)}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm active:scale-95"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            CONTRATO
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Visor de Contrato */}
            {selectedContratoId && (
                <ContractViewer 
                    contratoId={selectedContratoId}
                    onClose={() => setSelectedContratoId(null)} 
                />
            )}
        </div>
    );
}