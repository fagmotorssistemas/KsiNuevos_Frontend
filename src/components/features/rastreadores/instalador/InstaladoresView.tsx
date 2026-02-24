"use client";

import { useInstaladores } from "@/hooks/useInstaladores";
import { FormNuevoInstalador } from "./FormNuevoInstalador";
import { Users, Wrench, RefreshCw, UserCheck, UserX } from "lucide-react";
import { instaladoresService } from "@/services/instaladores.service";

export function InstaladoresView() {
    const { instaladores, loadInstaladores, activos, inactivos } = useInstaladores();

    const handleToggleActivo = async (id: string, estadoActual: boolean) => {
        await instaladoresService.toggleActivo(id, estadoActual);
        loadInstaladores(); 
    };

    return (
        <div className="space-y-8">
            {/* Encabezado Principal */}
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-5">
                <div className="p-3 bg-black text-white rounded-xl shadow-md">
                    <Wrench size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tight">Módulo de Instaladores</h1>
                    <p className="text-sm text-slate-900 font-bold mt-1">Gestiona el directorio de técnicos y sus tarifas base.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-1 space-y-6">
                    <FormNuevoInstalador onSuccess={loadInstaladores} />
                    
                    {/* KPIs Rápidos - Textos Negros */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-md text-center">
                            <p className="text-xs font-black text-black uppercase tracking-wider">Activos</p>
                            <p className="text-4xl font-black text-emerald-600 mt-2">{activos}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-md text-center">
                            <p className="text-xs font-black text-black uppercase tracking-wider">Inactivos</p>
                            <p className="text-4xl font-black text-rose-600 mt-2">{inactivos}</p>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Listado */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
                        
                        {/* Cabecera de la Tabla */}
                        <div className="p-5 border-b-2 border-slate-200 flex justify-between items-center bg-slate-100">
                            <div className="flex items-center gap-3 text-black">
                                <Users size={20} className="text-black"/>
                                <h3 className="text-sm font-black text-black uppercase tracking-wider">Directorio Activo</h3>
                            </div>
                            <button 
                                onClick={loadInstaladores} 
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border-2 border-transparent hover:border-slate-300"
                            >
                                <RefreshCw size={16}/>
                                Actualizar
                            </button>
                        </div>
                        
                        <div className="max-h-[550px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-200 text-xs uppercase font-black text-black tracking-wider sticky top-0 z-10 border-b-2 border-slate-300">
                                    <tr>
                                        <th className="px-6 py-4">Técnico</th>
                                        <th className="px-6 py-4">Contacto</th>
                                        <th className="px-6 py-4 text-right">Tarifa Base</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100">
                                    {instaladores.length > 0 ? instaladores.map((inst) => (
                                        <tr key={inst.id} className={`hover:bg-slate-50 transition-colors ${!inst.activo ? 'bg-slate-100 opacity-80' : ''}`}>
                                            <td className="px-6 py-5">
                                                <div className="font-black text-black text-base">
                                                    {inst.nombre}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-slate-900 text-sm">
                                                {inst.telefono || 'Sin número'}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-black text-lg">
                                                ${inst.valor_por_instalacion}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <button 
                                                    onClick={() => handleToggleActivo(inst.id, inst.activo)}
                                                    className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg transition-all border-2 ${
                                                        inst.activo 
                                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200' 
                                                        : 'bg-rose-100 text-rose-900 border-rose-400 hover:bg-rose-200'
                                                    }`}
                                                >
                                                    {inst.activo ? 'ACTIVO' : 'INACTIVO'}
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-black text-sm font-black uppercase tracking-wider">
                                                No hay instaladores registrados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}