"use client";

import { useState, useEffect } from "react";
import { X, Save, Package, Loader2 } from "lucide-react";
import type { InventarioItem } from "@/types/taller"; // <--- Importación corregida

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: any) => Promise<any>;
    itemToEdit?: InventarioItem | null;
}

export function InventoryModal({ isOpen, onClose, onSave, itemToEdit }: InventoryModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: "",
        codigo_interno: "",
        tipo: "material",
        unidad_medida: "unidad",
        stock_actual: 0,
        stock_minimo: 5,
        costo_promedio: 0,
        ubicacion_bodega: ""
    });

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                nombre: itemToEdit.nombre,
                codigo_interno: itemToEdit.codigo_interno || "",
                tipo: itemToEdit.tipo,
                unidad_medida: itemToEdit.unidad_medida,
                stock_actual: itemToEdit.stock_actual,
                stock_minimo: itemToEdit.stock_minimo,
                costo_promedio: itemToEdit.costo_promedio,
                ubicacion_bodega: itemToEdit.ubicacion_bodega || ""
            });
        } else {
            // Reset para nuevo item
            setFormData({
                nombre: "",
                codigo_interno: "",
                tipo: "material",
                unidad_medida: "unidad",
                stock_actual: 0,
                stock_minimo: 5,
                costo_promedio: 0,
                ubicacion_bodega: ""
            });
        }
    }, [itemToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(formData);
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        {itemToEdit ? "Editar Producto" : "Nuevo Producto"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del Item</label>
                            <input 
                                required
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Lija de Agua #1000"
                                value={formData.nombre}
                                onChange={e => setFormData({...formData, nombre: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Código Interno</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="COD-001"
                                value={formData.codigo_interno}
                                onChange={e => setFormData({...formData, codigo_interno: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.tipo}
                                onChange={e => setFormData({...formData, tipo: e.target.value})}
                            >
                                <option value="material">Material (Consumible)</option>
                                <option value="herramienta">Herramienta (Activo)</option>
                                <option value="repuesto">Repuesto</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stock Inicial</label>
                            <input 
                                type="number" 
                                min="0"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.stock_actual}
                                onChange={e => setFormData({...formData, stock_actual: Number(e.target.value)})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stock Mínimo (Alerta)</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.stock_minimo}
                                onChange={e => setFormData({...formData, stock_minimo: Number(e.target.value)})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Costo Unitario ($)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.costo_promedio}
                                onChange={e => setFormData({...formData, costo_promedio: Number(e.target.value)})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unidad Medida</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.unidad_medida}
                                onChange={e => setFormData({...formData, unidad_medida: e.target.value})}
                            >
                                <option value="unidad">Unidad</option>
                                <option value="litro">Litro</option>
                                <option value="galon">Galón</option>
                                <option value="metro">Metro</option>
                                <option value="kit">Kit</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}