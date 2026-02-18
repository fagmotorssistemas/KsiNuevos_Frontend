"use client";

import { useState } from "react";
import { Plus, Search, Users, Phone, Mail, CreditCard, Edit2, Trash2, Calendar } from "lucide-react";
import { usePersonal } from "@/hooks/taller/usePersonal";
import { TallerPersonal } from "@/types/taller";
import { PersonalFormModal } from "@/components/features/taller/personal/PersonalFormModal";

export default function PersonalPage() {
    const { empleados, candidatos, isLoading, guardarEmpleado, eliminarEmpleado } = usePersonal();
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TallerPersonal | null>(null);

    // Filtrar
    const filtered = empleados.filter(e => 
        e.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: TallerPersonal) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if(confirm("¿Estás seguro de eliminar esta ficha de empleado?")) {
            await eliminarEmpleado(id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Personal y RRHH</h1>
                    <p className="text-slate-500">Gestión de nómina, cargos y datos de empleados.</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Contratar Personal
                </button>
            </div>

            {/* Buscador */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid de Empleados */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-400">Cargando personal...</div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((empleado) => (
                        <div key={empleado.id} className={`bg-white rounded-2xl border-2 p-6 transition-all group relative ${!empleado.activo ? 'border-slate-100 opacity-70 grayscale-[0.5]' : 'border-slate-100 hover:border-blue-200 hover:shadow-lg'}`}>
                            
                            {/* Acciones */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(empleado)} className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(empleado.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Header Card */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${empleado.activo ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {empleado.profile?.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{empleado.profile?.full_name}</h3>
                                    <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide">
                                        {empleado.cargo}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-3 text-sm border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-slate-500 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> Ingreso
                                    </div>
                                    <span className="font-medium text-slate-700">{empleado.fecha_ingreso || '-'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-slate-500 flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Salario
                                    </div>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                        ${empleado.salario_mensual.toLocaleString()}
                                    </span>
                                </div>

                                {empleado.profile?.phone && (
                                    <div className="flex items-center gap-2 text-slate-500 pt-2">
                                        <Phone className="h-4 w-4" /> {empleado.profile.phone}
                                    </div>
                                )}
                                
                                {empleado.datos_bancarios && (
                                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                                            <CreditCard className="h-3 w-3" /> Datos Bancarios
                                        </div>
                                        <p className="text-xs text-slate-600 font-mono leading-relaxed">
                                            {empleado.datos_bancarios}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Status Tag */}
                            {!empleado.activo && (
                                <div className="absolute top-4 left-4 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                    Inactivo
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Sin Personal Registrado</h3>
                    <p className="text-slate-500 mt-1">Comienza contratando usuarios registrados en el sistema.</p>
                </div>
            )}

            <PersonalFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={guardarEmpleado}
                itemToEdit={editingItem}
                candidatos={candidatos}
            />
        </div>
    );
}