"use client";

import { useState, useEffect } from "react";
import { X, Wrench, Package, Clock, User, Loader2, Plus } from "lucide-react";
import { useOrdenes } from "@/hooks/taller/useOrdenes"; // Hook solo para lógica
import { OrdenTrabajo, ConsumoMaterial } from "@/types/taller"; // Tipos desde archivo central
import { useInventario } from "@/hooks/taller/useInventario";

interface WorkOrderModalProps {
    orden: OrdenTrabajo | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
}

export function WorkOrderModal({ orden, isOpen, onClose, onStatusChange }: WorkOrderModalProps) {
    const { items: inventario } = useInventario();
    const { registrarConsumo, fetchConsumosOrden } = useOrdenes();
    
    const [activeTab, setActiveTab] = useState<'info' | 'materiales'>('info');
    const [consumos, setConsumos] = useState<ConsumoMaterial[]>([]);
    
    const [selectedItem, setSelectedItem] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);

    useEffect(() => {
        if (orden && isOpen) {
            loadConsumos();
        }
    }, [orden, isOpen]);

    const loadConsumos = async () => {
        if (!orden) return;
        const data = await fetchConsumosOrden(orden.id);
        // @ts-ignore
        setConsumos(data);
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orden || !selectedItem) return;

        setIsAddingMaterial(true);
        const result = await registrarConsumo(orden.id, selectedItem, cantidad);
        
        if (result.success) {
            await loadConsumos();
            setSelectedItem("");
            setCantidad(1);
        } else {
            alert("Error registrando material");
        }
        setIsAddingMaterial(false);
    };

    if (!isOpen || !orden) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">ORDEN #{orden.numero_orden}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{orden.estado.replace('_', ' ')}</span>
                        </div>
                        <h2 className="font-bold text-xl text-slate-900">{orden.vehiculo_marca} {orden.vehiculo_modelo} <span className="text-slate-400 font-normal">({orden.vehiculo_placa})</span></h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-6">
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Wrench className="h-4 w-4" /> Información General
                    </button>
                    <button 
                        onClick={() => setActiveTab('materiales')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'materiales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Package className="h-4 w-4" /> Materiales Usados
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    
                    {activeTab === 'info' ? (
                        <div className="space-y-6">
                            {/* Datos Cliente y Auto */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <User className="h-3 w-3" /> Cliente
                                    </h3>
                                    <p className="font-bold text-slate-800 text-lg">{orden.cliente?.nombre_completo}</p>
                                    <p className="text-slate-500">{orden.cliente?.telefono}</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> Tiempos
                                    </h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">Fecha Ingreso:</span>
                                        <span className="font-medium text-slate-800">{new Date(orden.fecha_ingreso).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-slate-500 text-sm">Días en Taller:</span>
                                        <span className="font-bold text-blue-600">
                                            {Math.floor((new Date().getTime() - new Date(orden.fecha_ingreso).getTime()) / (1000 * 3600 * 24))} días
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Observaciones de Ingreso</h3>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {orden.observaciones_ingreso || "Ninguna observación registrada."}
                                </p>
                            </div>

                            {/* Cambio de Estado Rápido */}
                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                <h3 className="text-sm font-bold text-blue-800 mb-3">Mover Etapa</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['en_cola', 'en_proceso', 'control_calidad', 'terminado'].map((estado) => (
                                        <button
                                            key={estado}
                                            onClick={() => {
                                                onStatusChange(orden.id, estado);
                                                onClose();
                                            }}
                                            disabled={orden.estado === estado}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                                orden.estado === estado 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-100'
                                            }`}
                                        >
                                            {estado.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Botón Imprimir (NUEVO) */}
                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={() => window.print()} 
                                    className="text-slate-500 hover:text-slate-800 text-sm font-bold underline decoration-slate-300 underline-offset-4"
                                >
                                    Imprimir Orden / PDF
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Formulario Agregar Material */}
                            <form onSubmit={handleAddMaterial} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Producto / Material</label>
                                    <select 
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={selectedItem}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                    >
                                        <option value="">Seleccionar material...</option>
                                        {inventario.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre} (Stock: {item.stock_actual})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cant.</label>
                                    <input 
                                        type="number" 
                                        min="0.1" 
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(parseFloat(e.target.value))}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isAddingMaterial}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 h-10"
                                >
                                    {isAddingMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Registrar
                                </button>
                            </form>

                            {/* Lista de Consumos */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Material</th>
                                            <th className="px-4 py-3">Cantidad</th>
                                            <th className="px-4 py-3">Registrado Por</th>
                                            <th className="px-4 py-3">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {consumos.length > 0 ? (
                                            consumos.map((consumo) => (
                                                <tr key={consumo.id}>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{consumo.item?.nombre}</td>
                                                    <td className="px-4 py-3">{consumo.cantidad} {consumo.item?.unidad_medida}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">{consumo.registrado_por?.full_name}</td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {new Date(consumo.fecha_consumo).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                    No se han registrado consumos aún.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}