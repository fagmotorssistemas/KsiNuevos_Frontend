"use client";
import { useState } from "react";
import { Search, MapPin, Building2, Users, Plus } from "lucide-react"; // <--- Importamos Plus
import { ContratoGPS } from "@/types/rastreadores.types";
import { RastreoStats } from "./RastreoStats";

interface RastreoListProps {
    data: ContratoGPS[];
    loading: boolean;
    onManage: (item: ContratoGPS) => void;
    onNewExternal: () => void; // <--- NUEVA PROP
}

export function RastreoList({ data, loading, onManage, onNewExternal }: RastreoListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | 'AUTO' | 'EXTERNO'>('TODOS');

    const filteredData = data.filter(c => {
        const matchesSearch = 
            c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ruc.includes(searchTerm) ||
            c.placa.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesOrigen = filtroOrigen === 'TODOS' ? true : c.origen === filtroOrigen;
        return matchesSearch && matchesOrigen;
    });

    const totalRecaudado = filteredData.reduce((acc, curr) => acc + curr.totalRastreador, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header: Título y Acciones */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                        Gestión de Rastreo
                    </h1>
                    <p className="text-sm font-medium text-slate-500">
                        Control de instalaciones y monitoreo GPS
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* BOTÓN NUEVA VENTA EXTERNA */}
                    <button 
                        onClick={onNewExternal}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus size={16} /> Nueva Venta
                    </button>

                    {/* FILTROS (TABS) */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center font-bold text-xs uppercase shadow-inner">
                        <button onClick={() => setFiltroOrigen('TODOS')} className={`px-4 py-2 rounded-lg transition-all ${filtroOrigen === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Todos</button>
                        <button onClick={() => setFiltroOrigen('AUTO')} className={`px-4 py-2 rounded-lg transition-all flex gap-1 ${filtroOrigen === 'AUTO' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400'}`}><Building2 size={14}/> K-si</button>
                        <button onClick={() => setFiltroOrigen('EXTERNO')} className={`px-4 py-2 rounded-lg transition-all flex gap-1 ${filtroOrigen === 'EXTERNO' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}><Users size={14}/> Ext</button>
                    </div>
                </div>
            </div>

            <RastreoStats totalDispositivos={filteredData.length} totalRecaudado={totalRecaudado} />

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar cliente, placa o RUC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 transition-shadow focus:shadow-md"
                />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Origen</th>
                                <th className="px-6 py-4">Cliente / Nota</th>
                                <th className="px-6 py-4">Vehículo</th>
                                <th className="px-6 py-4 text-right">Valor Venta</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 animate-pulse font-bold">Cargando datos...</td></tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.ccoCodigo} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {item.origen === 'AUTO' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100"><Building2 size={10}/> K-SI</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100"><Users size={10}/> EXT</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 uppercase">{item.cliente}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{item.ruc}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 uppercase">{item.marca} {item.modelo}</div>
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 font-black uppercase mt-1 inline-block">{item.placa}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-black text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">${item.totalRastreador.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => onManage(item)} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95">
                                                <MapPin size={14} /> Gestionar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase">No se encontraron resultados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}