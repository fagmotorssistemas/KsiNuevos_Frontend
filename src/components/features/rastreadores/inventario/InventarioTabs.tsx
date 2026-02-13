"use client";

import { useState, useEffect } from "react";
import { FormIngresoGPS } from "./FormIngresoGPS";
import { rastreadoresService } from "@/services/rastreadores.service";
import { InventarioGPS } from "@/types/rastreadores.types";
import { Search, RefreshCw, Box } from "lucide-react";

export function InventarioTabs() {
    const [activeTab, setActiveTab] = useState<'GPS' | 'SIMS'>('GPS');
    const [inventario, setInventario] = useState<InventarioGPS[]>([]);
    
    // Carga de datos
    const loadInventario = async () => {
        const data = await rastreadoresService.getInventarioStock();
        setInventario(data);
    };

    useEffect(() => { loadInventario(); }, []);

    // KPIs simples calculados al vuelo
    const totalStock = inventario.length;
    const valorInventario = inventario.reduce((acc, curr) => acc + curr.costo_compra, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Formularios de Ingreso */}
            <div className="lg:col-span-1 space-y-6">
                <FormIngresoGPS onSuccess={loadInventario} />
                
                {/* Aquí pondremos el FormIngresoSIM luego */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-center opacity-60">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ingreso de SIMs</p>
                    <p className="text-[10px] text-slate-400 mt-1">Próximamente</p>
                </div>
            </div>

            {/* Columna Derecha: Listado de Stock */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* KPIs Rápidos */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unidades en Stock</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">{totalStock}</p>
                        </div>
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><Box size={24}/></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor Inventario</p>
                            <p className="text-3xl font-black text-emerald-600 mt-1">${valorInventario.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><span className="text-xl font-black">$</span></div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Stock Disponible</h3>
                        <button onClick={loadInventario} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors">
                            <RefreshCw size={14}/>
                        </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-5 py-3">Modelo</th>
                                    <th className="px-5 py-3">IMEI</th>
                                    <th className="px-5 py-3">Proveedor</th>
                                    <th className="px-5 py-3 text-right">Costo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {inventario.length > 0 ? inventario.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-bold text-slate-700">{item.modelo.nombre}</div>
                                            <div className="text-[10px] text-slate-400">{item.modelo.marca}</div>
                                        </td>
                                        <td className="px-5 py-3 font-mono font-medium text-slate-600 tracking-wider text-xs">
                                            {item.imei}
                                        </td>
                                        <td className="px-5 py-3 text-xs font-medium text-slate-500">
                                            {item.proveedor.nombre}
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                                            ${item.costo_compra}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                                            Bodega Vacía
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}