"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"; 

// Servicios y Tipos
import { rastreadoresService } from "@/services/rastreadores.service";
import { ContratoGPS } from "@/types/rastreadores.types";
import { useAuth } from "@/hooks/useAuth";

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
    const { user, profile } = useAuth();
    /** Para vendedores: solo se muestran ventas donde ventas_rastreador.asesor_id = asesorIdFiltro */
    const asesorIdFiltro = useMemo(() =>
        profile?.role === 'vendedor' ? (user?.id ?? null) : null,
        [profile?.role, user?.id]
    );

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

    // Carga de Datos (filtrada por asesor cuando es vendedor)
    const cargarContratos = async () => {
        setLoadingData(true);
        try {
            const data = await rastreadoresService.getListaContratosGPS(asesorIdFiltro);
            setContratos(data);
        } catch (error) {
            console.error(error);
            toast.error("Error conectando con el servidor");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { cargarContratos(); }, [asesorIdFiltro]);

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

    // Cargar historial: venta EXTERNA por cliente_id (no depende de cédula) o por ruc; AUTO por nota_venta
    useEffect(() => {
        if (vista !== 'FORMULARIO' || !seleccionado) {
            setHistorialCliente([]);
            setFechaEntrega('');
            setAsesorId(null);
            return;
        }
        // Al abrir "Nuevo dispositivo" no resetear fecha/asesor para que LinkGPSForm los reciba como iniciales
        if (showNuevoDispositivoForm) return;
        const esExterno = seleccionado.origen === 'EXTERNO';
        const esAuto = seleccionado.origen === 'AUTO';
        // Venta externa: priorizar cliente_id (relación cliente-venta) para que funcione aunque no tenga cédula
        if (esExterno && seleccionado.clienteExternoId) {
            setLoadingHistorial(true);
            rastreadoresService.getGPSPorClienteId(seleccionado.clienteExternoId)
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
            return;
        }
        if (esExterno && seleccionado.ruc?.trim()) {
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
            return;
        }
        if (esAuto && seleccionado.notaVenta?.trim()) {
            setLoadingHistorial(true);
            rastreadoresService.getGPSPorVenta(seleccionado.notaVenta)
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
            return;
        }
        setHistorialCliente([]);
        setFechaEntrega('');
        setAsesorId(null);
    }, [vista, seleccionado, showNuevoDispositivoForm]);

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
                            onNewExternal={handleNuevoExterno}
                            asesorIdFiltro={asesorIdFiltro}
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
                            <FinancieroView asesorIdFiltro={asesorIdFiltro} />
                            <CarteraRastreadoresView asesorIdFiltro={asesorIdFiltro} />
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