"use client";

import { useState } from "react";
import { Plus, Loader2, Users, Download } from "lucide-react"; // Agregar Download
import { useAuth } from "@/hooks/useAuth";
import { useClientes } from "@/hooks/contapb/useClientes";
import { ClienteCard } from "@/components/features/contapb/ClienteCard";
import { ClientesToolbar } from "@/components/features/contapb/ClientesToolbar";
import { CreateClienteModal } from "@/components/features/contapb/CreateClienteModal";
import { ClientePB } from "@/hooks/contapb/types";
import { Button } from "@/components/ui/Button"; 
import { exportGlobalCartera } from "@/lib/contapb/exportUtils"; // IMPORTAR
import { toast } from "sonner";

export default function CarteraPage() {
    const { profile, supabase } = useAuth(); // Necesitamos supabase directo aqui
    const canCreate = true; 

    const { 
        clientes, isLoading, totalCount, page, setPage, rowsPerPage,
        filters, sortBy, updateFilter, setSortBy, resetFilters, reload 
    } = useClientes();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false); // Estado para loading del reporte

    // --- FUNCIÓN PARA DESCARGAR TODO ---
    const handleGlobalExport = async () => {
        setIsExporting(true);
        toast.info("Generando reporte global...");
        try {
            // 1. Traer Clientes + Contratos + Cuotas (Query compleja)
            // Nota: Supabase puede limitar filas, si son miles necesitaríamos paginación o backend function.
            // Para < 1000 registros, esto funciona bien.
            
            const { data: contratos, error } = await supabase
                .from('contratospb')
                .select(`
                    *,
                    cliente:clientespb (nombre_completo, identificacion),
                    cuotas:cuotaspb (*)
                `);

            if (error) throw error;

            // 2. Procesar datos para Excel (Aplanar la estructura)
            const reportePlano = contratos.map((c: any) => {
                const totalDeuda = c.cuotas.reduce((sum: number, x: any) => sum + (x.valor_cuota_total || 0), 0);
                const totalPagado = c.cuotas.reduce((sum: number, x: any) => sum + (x.valor_pagado || 0), 0);
                const saldo = totalDeuda - totalPagado;
                
                // Buscar último pago
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

            // 3. Descargar
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
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cartera de Clientes</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestión centralizada de créditos ({totalCount} registros).
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {/* BOTÓN EXPORTAR GLOBAL */}
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

            {/* ... (El resto del return: Toolbar, Grid, Pagination se mantiene IGUAL) ... */}
            <ClientesToolbar 
                filters={filters}
                sortBy={sortBy}
                onFilterChange={updateFilter}
                onSortChange={setSortBy}
                onReset={resetFilters}
                resultsCount={totalCount}
            />

            {/* Grid Content ... */}
            {/* Copia aquí el bloque {isLoading ? ... } que ya tenías */}
            
            {/* (Para abreviar no lo pego todo de nuevo, pero asegúrate de que el resto del return esté aquí) */}
             {isLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col justify-center items-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                    <span className="text-slate-400 font-medium">Cargando cartera...</span>
                </div>
            ) : (
                <>
                    {/* Grid de Tarjetas */}
                    {clientes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                            {clientes.map((cliente) => (
                                <ClienteCard 
                                    key={cliente.id} 
                                    cliente={cliente} 
                                    // onEdit={handleEditCliente} // Si tienes el handler
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                            <Users size={32} className="mx-auto text-slate-300 mb-2"/>
                            <p className="text-slate-500">No se encontraron clientes</p>
                        </div>
                    )}
                    
                    {/* Paginación */}
                    {/* ... código de paginación ... */}
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