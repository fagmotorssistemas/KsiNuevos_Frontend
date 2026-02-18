"use client";

import { useState } from "react";
import { Search, Plus, AlertTriangle, Edit2, Package } from "lucide-react";
import { useInventario } from "@/hooks/taller/useInventario";
import { InventarioItem } from "@/types/taller"; // <--- Importación corregida
import { InventoryModal } from "@/components/features/taller/inventario/InventoryModal";

export default function InventarioPage() {
    const { items, isLoading, crearItem, actualizarItem } = useInventario();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<'todos' | 'bajo_stock'>('todos');

    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);

    // Filtrado
    const filteredItems = items.filter(item => {
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterType === 'bajo_stock') {
            return matchesSearch && (item.stock_actual <= item.stock_minimo);
        }
        return matchesSearch;
    });

    const handleSave = async (data: any) => {
        if (editingItem) {
            await actualizarItem(editingItem.id, data);
        } else {
            await crearItem(data);
        }
    };

    const handleEdit = (item: InventarioItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Inventario de Taller</h1>
                    <p className="text-slate-500">Gestión de materiales, herramientas y alertas de stock.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Producto
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('todos')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('bajo_stock')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === 'bajo_stock' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <AlertTriangle className="h-4 w-4" />
                        Stock Bajo
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center text-slate-400">
                        Cargando inventario...
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Stock</th>
                                    <th className="px-6 py-4">Costo</th>
                                    <th className="px-6 py-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => {
                                    const isLowStock = item.stock_actual <= item.stock_minimo;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${isLowStock ? 'bg-red-100 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                        <Package className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{item.nombre}</p>
                                                        <p className="text-xs text-slate-400 font-mono">{item.codigo_interno || 'S/N'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                    ${item.tipo === 'material' ? 'bg-blue-50 text-blue-600' :
                                                        item.tipo === 'herramienta' ? 'bg-purple-50 text-purple-600' :
                                                            'bg-slate-100 text-slate-600'}`
                                                }>
                                                    {item.tipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                                        {item.stock_actual} {item.unidad_medida}
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Stock Crítico"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">Min: {item.stock_minimo}</p>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-600">
                                                ${item.costo_promedio.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-16 text-center">
                        <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                            <Package className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Inventario vacío</h3>
                        <p className="text-slate-500 mt-1">No se encontraron productos con esos filtros.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <InventoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                itemToEdit={editingItem}
            />
        </div>
    );
}