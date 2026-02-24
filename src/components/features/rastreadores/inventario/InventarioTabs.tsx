"use client";

import { useState, useEffect } from "react";
import { FormIngresoGPS } from "./FormIngresoGPS";
import { FormIngresoSIM } from "./FormIngresoSIM"; // Asegúrate de tener este componente creado
import { rastreadoresService } from "@/services/rastreadores.service";
import { InventarioGPS } from "@/types/rastreadores.types";
import { useInventarioSIM } from "@/hooks/useInventarioSim";
import { RefreshCw, Box, CreditCard } from "lucide-react";

export function InventarioTabs() {
    // 1. Estado de Navegación
    const [activeTab, setActiveTab] = useState<'GPS' | 'SIMS'>('GPS');
    
    // ==========================================
    // 2. LÓGICA DE GPS
    // ==========================================
    const [inventarioGPS, setInventarioGPS] = useState<InventarioGPS[]>([]);
    
    const loadInventarioGPS = async () => {
        const data = await rastreadoresService.getInventarioStock();
        setInventarioGPS(data);
    };

    useEffect(() => { loadInventarioGPS(); }, []);

    const totalStockGPS = inventarioGPS.length;
    const valorInventarioGPS = inventarioGPS.reduce((acc, curr) => acc + curr.costo_compra, 0);

    // ==========================================
    // 3. LÓGICA DE SIMS (Usando tu nuevo hook)
    // ==========================================
    const { 
        sims, 
        loadSims, 
        totalStock: totalStockSIM, 
        costoTotalMensual 
    } = useInventarioSIM();

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="space-y-6">
            
            {/* Pestañas de Navegación */}
            <div className="flex space-x-2 border-b border-slate-200 pb-4">
                <button 
                    onClick={() => setActiveTab('GPS')}
                    className={`px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === 'GPS' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    <Box size={16} /> Inventario GPS
                </button>
                <button 
                    onClick={() => setActiveTab('SIMS')}
                    className={`px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === 'SIMS' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    <CreditCard size={16} /> Inventario SIMs
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA: Formularios de Ingreso */}
                <div className="lg:col-span-1 space-y-6">
                    {activeTab === 'GPS' ? (
                        <FormIngresoGPS onSuccess={loadInventarioGPS} />
                    ) : (
                        <FormIngresoSIM onSuccess={loadSims} />
                    )}
                </div>

                {/* COLUMNA DERECHA: Listado de Stock y KPIs */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* KPIs Dinámicos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unidades en Stock</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">
                                    {activeTab === 'GPS' ? totalStockGPS : totalStockSIM}
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${activeTab === 'GPS' ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
                                {activeTab === 'GPS' ? <Box size={24}/> : <CreditCard size={24}/>}
                            </div>
                        </div>
                        
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {activeTab === 'GPS' ? 'Valor Inventario' : 'Costo Total Mensual'}
                                </p>
                                <p className="text-3xl font-black text-emerald-600 mt-1">
                                    ${activeTab === 'GPS' ? valorInventarioGPS.toLocaleString() : costoTotalMensual.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <span className="text-xl font-black">$</span>
                            </div>
                        </div>
                    </div>

                    {/* Contenedor de la Tabla */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                Stock Disponible de {activeTab}
                            </h3>
                            <button 
                                onClick={activeTab === 'GPS' ? loadInventarioGPS : loadSims} 
                                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <RefreshCw size={14}/>
                            </button>
                        </div>
                        
                        <div className="max-h-[500px] overflow-y-auto">
                            
                            {/* TABLA DE GPS */}
                            {activeTab === 'GPS' && (
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
                                        {inventarioGPS.length > 0 ? inventarioGPS.map((item) => (
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
                                                    Bodega de GPS Vacía
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* TABLA DE SIMS */}
                            {activeTab === 'SIMS' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-5 py-3">ICCID</th>
                                            <th className="px-5 py-3">Operadora</th>
                                            <th className="px-5 py-3">Número</th>
                                            <th className="px-5 py-3 text-right">Costo Mensual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sims.length > 0 ? sims.map((sim) => (
                                            <tr key={sim.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 font-mono font-medium text-slate-600 tracking-wider text-xs">
                                                    {sim.iccid}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                                        {sim.operadora || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs font-medium text-slate-500">
                                                    {sim.numero || 'Sin asignar'}
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                                                    ${sim.costo_mensual || 0}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                                                    Bodega de SIMs Vacía
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}