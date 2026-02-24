"use client";

import { useState, useEffect } from "react";
import { BarChart3, Wrench } from "lucide-react";
import { toast } from "sonner"; 

// Servicios y Tipos
import { rastreadoresService } from "@/services/rastreadores.service";
import { ContratoGPS } from "@/types/rastreadores.types";

// Componentes (Asegúrate que las rutas sean correctas según tu proyecto)
import { RastreadoresSidebar } from "@/components/layout/rastreadores-sidebar";
import { RastreoList } from "@/components/features/rastreadores/dashboard/RastreoList";
import { LinkGPSForm } from "@/components/features/rastreadores/instalacion/LinkGPSForm";
import { InventarioTabs } from "@/components/features/rastreadores/inventario/InventarioTabs";
import { FinancieroView } from "@/components/features/rastreadores/financiero/FinancieroView";
import { InstaladoresView } from "@/components/features/rastreadores/instalador/InstaladoresView";
// Definimos el tipo de vista localmente si no lo exporta el sidebar
type RastreoView = 'DASHBOARD' | 'INVENTARIO' | 'INSTALACION' | 'FORMULARIO' | 'FINANCIERO';

export default function RastreoPage() {
    // Estados
    const [vista, setVista] = useState<RastreoView>('DASHBOARD');
    const [loadingData, setLoadingData] = useState(true);
    const [contratos, setContratos] = useState<ContratoGPS[]>([]);
    const [seleccionado, setSeleccionado] = useState<ContratoGPS | null>(null);

    // Carga de Datos
    const cargarContratos = async () => {
        setLoadingData(true);
        try {
            const data = await rastreadoresService.getListaContratosGPS();
            setContratos(data);
        } catch (error) {
            console.error(error);
            toast.error("Error conectando con el servidor");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { cargarContratos(); }, []);

    // --- HANDLERS CLAVE ---

    // 1. Gestionar un auto existente (Concesionaria)
    const handleGestionarAuto = (item: ContratoGPS) => {
        setSeleccionado(item);
        setVista('FORMULARIO');
    };

    // 2. Crear una venta nueva (Cliente Externo) -> AQUÍ ESTÁ EL TRUCO
    const handleNuevoExterno = () => {
        setSeleccionado(null); // Al ser null, el LinkGPSForm activa el modo "Nuevo Cliente"
        setVista('FORMULARIO');
    };

    // 3. Volver al listado
    const handleVolver = () => {
        setSeleccionado(null);
        setVista('DASHBOARD');
        cargarContratos(); // Recargamos para ver los cambios
    };
    
    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Si tu sidebar usa Links, este componente es visual. 
                Si usa estados, asegúrate de pasarle la prop currentView */}
            <RastreadoresSidebar currentView={vista} onNavigate={setVista} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    
                    {/* VISTA 1: DASHBOARD / LISTA */}
                    {vista === 'DASHBOARD' && (
                        <RastreoList 
                            data={contratos} 
                            loading={loadingData} 
                            onManage={handleGestionarAuto} 
                            onNewExternal={handleNuevoExterno} // Conectamos el botón
                        />
                    )}

                    {/* VISTA 2: FORMULARIO DE INSTALACIÓN/VENTA */}
                    {vista === 'FORMULARIO' && (
                        // Notar que quitamos el "&& seleccionado" para permitir que abra con null
                        <LinkGPSForm 
                            seleccionado={seleccionado} 
                            onCancel={handleVolver} 
                            onSuccess={handleVolver} 
                        />
                    )}

                    {/* VISTA 3: INVENTARIO (BODEGA) */}
                    {vista === 'INVENTARIO' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-6">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Bodega y Stock</h1>
                                <p className="text-sm font-medium text-slate-500">Gestión de dispositivos físicos</p>
                            </div>
                            <InventarioTabs />
                        </div>
                    )}
                    
                    {/* VISTA 4: FINANCIERO */}
                    {vista === 'FINANCIERO' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-50">
                            <div className="p-6 bg-slate-100 rounded-full mb-4">
                                <BarChart3 size={48} className="text-slate-400"/>
                            </div>
                            <h2 className="text-xl font-bold text-slate-600">Módulo Financiero</h2>
                            {/* VISTA 4: FINANCIERO (Aquí estaba el error, ahora renderiza el componente real) */}
                            {vista === 'FINANCIERO' && (
                                <FinancieroView />
                            )}
                        </div>
                    )}
                    {/* VISTA 4: Instaladores */}
                    {vista === 'INSTALACION' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-50">
                            <div className="p-6 bg-slate-100 rounded-full mb-4">
                                <Wrench size={48} className="text-slate-400"/>
                            </div>
                            <InstaladoresView />
                        </div>
                    )}


                </main>
            </div>
        </div>
    );
}