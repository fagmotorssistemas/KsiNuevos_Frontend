"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, FilePlus, Car, Plus } from "lucide-react";

import { useClienteDetail } from "@/hooks/contapb/useClienteDetail";
import { ClienteHeader } from "@/components/features/contapb/ClienteHeader";
import { CreateContratoModal } from "@/components/features/contapb/CreateContratoModal";
import { AmortizationTable } from "@/components/features/contapb/AmortizationTable"; 
import { Button } from "@/components/ui/Button";

export default function ClienteDetailPage() {
    const params = useParams();
    const clienteId = params?.id as string;

    // Obtenemos la función 'reload' del hook
    const { cliente, contratos, loading, error, reload } = useClienteDetail(clienteId);

    const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);
    const [isCreateContratoOpen, setIsCreateContratoOpen] = useState(false);

    useEffect(() => {
        if (contratos.length > 0 && !selectedContratoId) {
            setSelectedContratoId(contratos[0].id);
        }
    }, [contratos, selectedContratoId]);

    const handleCreateContratoSuccess = () => {
        reload(); 
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !cliente) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Error cargando cliente</h2>
                <p className="text-gray-500">{error || "No se encontró el cliente"}</p>
                <Button onClick={reload} className="mt-4">Reintentar</Button>
            </div>
        );
    }

    const contratoActivo = contratos.find(c => c.id === selectedContratoId);

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-20 font-sans">

            {/* 1. Header del Cliente CON RELOAD CONECTADO */}
            <ClienteHeader 
                cliente={cliente} 
                onRefresh={reload} // <--- ESTA ES LA CLAVE PARA QUE FUNCIONE LA EDICIÓN
            />

            {/* 2. Área de Contratos */}
            {contratos.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <Car size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Este cliente no tiene contratos activos</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Para empezar a registrar cobros y generar tablas de amortización, primero debes registrar un vehículo o contrato.
                    </p>
                    <Button
                        onClick={() => setIsCreateContratoOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                    >
                        <FilePlus size={18} />
                        Crear Primer Contrato
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 flex-1 w-full sm:w-auto">
                            {contratos.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedContratoId(c.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedContratoId === c.id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {c.alias_vehiculo || c.numero_contrato || 'Contrato sin nombre'}
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateContratoOpen(true)}
                            className="gap-2 text-slate-600 shrink-0 bg-white hover:bg-slate-50"
                        >
                            <Plus size={16} />
                            Nuevo Contrato
                        </Button>
                    </div>

                    {contratoActivo && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                        <Car size={20} className="text-slate-400" />
                                        {contratoActivo.alias_vehiculo || 'Detalle del Contrato'}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-mono mt-1 pl-7">
                                        {contratoActivo.marca && <span className="uppercase">{contratoActivo.marca} • </span>}
                                        {contratoActivo.placa && <span className="uppercase font-bold bg-slate-200 px-1 rounded mx-1">{contratoActivo.placa}</span>}
                                        <span className="text-slate-400 ml-1">#{contratoActivo.numero_contrato || 'S/N'}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="h-9 text-xs">
                                        Configurar
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 overflow-x-auto">
                                {contratoActivo.cuotas.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 m-4 flex flex-col items-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                            <FilePlus className="text-slate-300" size={24} />
                                        </div>
                                        <p className="mb-2 font-medium text-slate-600">No hay cuotas registradas</p>
                                        <p className="text-sm mb-6 max-w-xs mx-auto">
                                            Empieza agregando filas manualmente con el botón "Fila Normal" dentro de la tabla vacía que se generará al empezar.
                                        </p>
                                        <AmortizationTable
                                            contrato={contratoActivo}
                                            cliente={cliente}
                                            onRefresh={reload}
                                        />
                                    </div>
                                ) : (
                                    <AmortizationTable
                                        contrato={contratoActivo}
                                        cliente={cliente}
                                        onRefresh={reload}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isCreateContratoOpen && (
                <CreateContratoModal
                    clienteId={clienteId}
                    onClose={() => setIsCreateContratoOpen(false)}
                    onSuccess={handleCreateContratoSuccess}
                />
            )}
        </div>
    );
}