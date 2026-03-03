"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner"; 

// Servicios y Tipos
import { rastreadoresService } from "@/services/rastreadores.service";
import { ContratoGPS } from "@/types/rastreadores.types";

// Componentes
import { RastreadoresSidebar } from "@/components/layout/rastreadores-sidebar";
import { RastreoList } from "@/components/features/rastreadores/dashboard/RastreoList";
import { LinkGPSForm } from "@/components/features/rastreadores/instalacion/LinkGPSForm";
import { VistaHistorialCliente } from "@/components/features/rastreadores/instalacion/VistaHistorialCliente";
import { InventarioTabs } from "@/components/features/rastreadores/inventario/InventarioTabs";
import { FinancieroView } from "@/components/features/rastreadores/financiero/FinancieroView";
import { CarteraRastreadoresView } from "@/components/features/rastreadores/cartera/CarteraRastreadoresView";
import { InstaladoresView } from "@/components/features/rastreadores/instalador/InstaladoresView";
import { useAsesores } from "@/hooks/useAsesores";

type RastreoView = 'DASHBOARD' | 'INVENTARIO' | 'INSTALACION' | 'FORMULARIO' | 'FINANCIERO';

export default function RastreoPage() {
    const [vista, setVista] = useState<RastreoView>('DASHBOARD');
    const [loadingData, setLoadingData] = useState(true);
    const [contratos, setContratos] = useState<ContratoGPS[]>([]);
    const [seleccionado, setSeleccionado] = useState<ContratoGPS | null>(null);
    /** Si true, se muestra el formulario "Nuevo dispositivo"; si false, solo historial del cliente */
    const [showNuevoDispositivoForm, setShowNuevoDispositivoForm] = useState(false);
    const [historialCliente, setHistorialCliente] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [fechaEntrega, setFechaEntrega] = useState("");
    const [asesorId, setAsesorId] = useState<string | null>(null);
    const { asesores, isLoading: asesoresLoading } = useAsesores();

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

    // 1. Gestionar un auto existente → primero vista solo historial
    const handleGestionarAuto = (item: ContratoGPS) => {
        setSeleccionado(item);
        setShowNuevoDispositivoForm(false);
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
        setShowNuevoDispositivoForm(false);
        setVista('DASHBOARD');
        cargarContratos();
    };

    // Cargar historial del cliente cuando estamos en vista formulario con cliente seleccionado (solo historial)
    useEffect(() => {
        if (vista !== 'FORMULARIO' || !seleccionado?.ruc || showNuevoDispositivoForm) {
            setHistorialCliente([]);
            setFechaEntrega('');
            setAsesorId(null);
            return;
        }
        setLoadingHistorial(true);
        rastreadoresService.getGPSPorCliente(seleccionado.ruc)
            .then((gps) => {
                setHistorialCliente(gps || []);
                const primeraVenta = gps?.[0];
                if (primeraVenta) {
                    setFechaEntrega(primeraVenta.fecha_entrega ?? '');
                    setAsesorId(primeraVenta.asesor_id ?? null);
                }
            })
            .catch(() => setHistorialCliente([]))
            .finally(() => setLoadingHistorial(false));
    }, [vista, seleccionado?.ruc, showNuevoDispositivoForm]);

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

                    {/* VISTA 2: FORMULARIO — Nueva venta externa (sin cliente) → form directo */}
                    {vista === 'FORMULARIO' && !seleccionado && (
                        <LinkGPSForm
                            seleccionado={null}
                            onCancel={handleVolver}
                            onSuccess={handleVolver}
                        />
                    )}

                    {/* VISTA 2b: Cliente seleccionado — orden de trabajo (historial + Nuevo dispositivo) */}
                    {vista === 'FORMULARIO' && seleccionado && !showNuevoDispositivoForm && (
                        <VistaHistorialCliente
                            seleccionado={seleccionado}
                            historialCliente={historialCliente}
                            loadingHistorial={loadingHistorial}
                            fechaEntrega={fechaEntrega}
                            onFechaEntregaChange={setFechaEntrega}
                            asesorId={asesorId}
                            onAsesorIdChange={setAsesorId}
                            asesores={asesores}
                            asesoresLoading={asesoresLoading}
                            onVolver={handleVolver}
                            onNuevoDispositivo={() => setShowNuevoDispositivoForm(true)}
                            onHistorialUpdate={(gps) => setHistorialCliente(prev => prev.map(p => p.id === gps.id ? gps : p))}
                        />
                    )}

                    {/* VISTA 2c: Formulario "Nuevo dispositivo" (después de clic en + Nuevo dispositivo) */}
                    {vista === 'FORMULARIO' && seleccionado && showNuevoDispositivoForm && (
                        <LinkGPSForm
                            seleccionado={seleccionado}
                            onCancel={() => setShowNuevoDispositivoForm(false)}
                            onSuccess={handleVolver}
                            initialFechaEntrega={fechaEntrega}
                            initialAsesorId={asesorId}
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
                    
                    {/* VISTA CARTERA: rentabilidad + listado crédito/contado */}
                    {vista === 'FINANCIERO' && (
                        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300">
                            <FinancieroView />
                            <CarteraRastreadoresView />
                        </div>
                    )}
                    {/* VISTA 4: Instaladores */}
                    {vista === 'INSTALACION' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <InstaladoresView />
                        </div>
                    )}


                </main>
            </div>
        </div>
    );
}