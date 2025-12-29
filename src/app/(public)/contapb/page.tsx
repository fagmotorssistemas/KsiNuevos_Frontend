"use client";

import { useState } from "react";
import { Plus, Loader2, Users, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClientes } from "@/hooks/contapb/useClientes";
import { ClienteCard } from "@/components/features/contapb/ClienteCard";
import { ClientesToolbar } from "@/components/features/contapb/ClientesToolbar";
import { CreateClienteModal } from "@/components/features/contapb/CreateClienteModal";
import { Button } from "@/components/ui/Button"; 
import { exportGlobalCartera } from "@/lib/contapb/exportUtils";
import { toast } from "sonner";

export default function CarteraPage() {
    const { supabase } = useAuth();
    const canCreate = true; 

    const { 
        clientes, isLoading, totalCount, page, setPage, rowsPerPage,
        filters, sortBy, updateFilter, setSortBy, resetFilters, reload,
        deleteCliente // <--- IMPORTANTE: Importamos la función delete
    } = useClientes();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleGlobalExport = async () => {
        setIsExporting(true);
        toast.info("Generando reporte global...");
        try {
            const { data: contratos, error } = await supabase
                .from('contratospb')
                .select(`
                    *,
                    cliente:clientespb (nombre_completo, identificacion, calificacion_cliente),
                    cuotas:cuotaspb (*)
                `);

            if (error) throw error;

            const reportePlano = contratos.map((c: any) => {
                const totalDeuda = c.cuotas.reduce((sum: number, x: any) => sum + (x.valor_cuota_total || 0), 0);
                const totalPagado = c.cuotas.reduce((sum: number, x: any) => sum + (x.valor_pagado || 0), 0);
                const saldo = totalDeuda - totalPagado;
                
                const pagos = c.cuotas.filter((x:any) => x.fecha_pago_realizado).sort((a:any,b:any) => new Date(b.fecha_pago_realizado).getTime() - new Date(a.fecha_pago_realizado).getTime());
                const ultimoPago = pagos.length > 0 ? pagos[0].fecha_pago_realizado : 'N/A';

                return {
                    'Cliente': c.cliente?.nombre_completo,
                    'ID Cliente': c.cliente?.identificacion,
                    'Contrato': c.numero_contrato,
                    'Vehículo': c.alias_vehiculo,
                    'Placa': c.placa,
                    'Estado Contrato': c.estado,
                    'Total Contrato': totalDeuda,
                    'Total Pagado': totalPagado,
                    'Saldo Pendiente': saldo,
                    'Último Pago': ultimoPago,
                    'Calificación': c.cliente?.calificacion_cliente || ''
                };
            });

            exportGlobalCartera(reportePlano);
            toast.success("Reporte descargado");

        } catch (err) {
            console.error(err);
            toast.error("Error al exportar cartera");
        } finally {
            setIsExporting(false);
        }
    };

    const handleCreateSuccess = () => reload();

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cartera de Clientes</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestión centralizada de créditos ({totalCount} registros).
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <Button 
                        variant="outline"
                        onClick={handleGlobalExport}
                        disabled={isExporting}
                        className="bg-white text-green-700 border-green-200 hover:bg-green-50 gap-2 shadow-sm"
                    >
                        {isExporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
                        Reporte General
                    </Button>

                    {canCreate && (
                        <Button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo Cliente
                        </Button>
                    )}
                </div>
            </div>

            <ClientesToolbar 
                filters={filters}
                sortBy={sortBy}
                onFilterChange={updateFilter}
                onSortChange={setSortBy}
                onReset={resetFilters}
                resultsCount={totalCount}
            />

             {isLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col justify-center items-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                    <span className="text-slate-400 font-medium">Cargando cartera...</span>
                </div>
            ) : (
                <>
                    {clientes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                            {clientes.map((cliente) => (
                                <ClienteCard 
                                    key={cliente.id} 
                                    cliente={cliente} 
                                    // CONECTAMOS LA FUNCIÓN DELETE AQUÍ
                                    onDelete={deleteCliente}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                            <Users size={32} className="mx-auto text-slate-300 mb-2"/>
                            <p className="text-slate-500">No se encontraron clientes</p>
                        </div>
                    )}
                </>
            )}

            {isCreateModalOpen && (
                <CreateClienteModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
}