"use client";

import { useState } from "react";
import { Search, Plus, Truck, Edit2, Phone, Mail, Calendar, MapPin } from "lucide-react";
import { useProveedores } from "@/hooks/taller/useProveedores";
import { TallerProveedor } from "@/types/taller";
import { ProveedorFormModal } from "@/components/features/taller/proveedores/ProveedorFormModal";

export default function ProveedoresPage() {
    const { proveedores, isLoading, crearProveedor, actualizarProveedor } = useProveedores();
    const [searchTerm, setSearchTerm] = useState("");

    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TallerProveedor | null>(null);

    // Filtrado
    const filteredItems = proveedores.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
            item.nombre_comercial.toLowerCase().includes(searchLower) ||
            item.ruc?.toLowerCase().includes(searchLower) ||
            item.contacto_nombre?.toLowerCase().includes(searchLower)
        );
    });

    const handleSave = async (data: any) => {
        if (editingItem) {
            await actualizarProveedor(editingItem.id, data);
        } else {
            await crearProveedor(data);
        }
    };

    const handleEdit = (item: TallerProveedor) => {
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
                    <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
                    <p className="text-slate-500">Gestión de proveedores de repuestos y servicios externos.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Proveedor
                </button>
            </div>

            {/* Barra de Búsqueda */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUC o persona de contacto..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid de Cards (Diseño más amigable para proveedores) */}
            {isLoading ? (
                <div className="p-12 flex justify-center text-slate-400">
                    <span className="flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"/> Cargando proveedores...</span>
                </div>
            ) : filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((proveedor) => (
                        <div key={proveedor.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow group relative">
                            {/* Botón Editar flotante */}
                            <button
                                onClick={() => handleEdit(proveedor)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>

                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{proveedor.nombre_comercial}</h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1">{proveedor.ruc || 'Sin RUC'}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase">
                                        {proveedor.categoria}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                {proveedor.contacto_nombre && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 flex justify-center"><div className="h-1.5 w-1.5 rounded-full bg-slate-300" /></div>
                                        <span className="font-medium text-slate-800">{proveedor.contacto_nombre}</span>
                                    </div>
                                )}
                                
                                {proveedor.telefono && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 flex justify-center"><Phone className="h-3.5 w-3.5 text-slate-400" /></div>
                                        <span>{proveedor.telefono}</span>
                                    </div>
                                )}

                                {proveedor.email && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 flex justify-center"><Mail className="h-3.5 w-3.5 text-slate-400" /></div>
                                        <span className="truncate">{proveedor.email}</span>
                                    </div>
                                )}

                                {proveedor.dia_pago_habitual && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                        <div className="w-6 flex justify-center"><Calendar className="h-3.5 w-3.5 text-orange-400" /></div>
                                        <span className="text-orange-600 font-medium text-xs">Pagar el día {proveedor.dia_pago_habitual} de cada mes</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <Truck className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Sin Proveedores</h3>
                    <p className="text-slate-500 mt-1">No se encontraron proveedores registrados.</p>
                </div>
            )}

            {/* Modal */}
            <ProveedorFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                itemToEdit={editingItem}
            />
        </div>
    );
}