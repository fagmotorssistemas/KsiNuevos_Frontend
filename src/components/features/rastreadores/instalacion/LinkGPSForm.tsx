// src/components/rastreadores/instalacion/LinkGPSForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ContratoGPS, RegistroGPSPayload, PagoRastreadorInfo, TipoPagoEnum, MetodoPagoRastreadorEnum, ConcesionariaPayload, ClienteFinalPayload } from "@/types/rastreadores.types";
import { rastreadoresService } from "@/services/rastreadores.service";
import { walletService } from "@/services/wallet.service";
import { useInventarioSIM } from "@/hooks/useInventarioSim";
import { useInstaladores } from "@/hooks/useInstaladores";
import { usePagoRastreador } from "@/hooks/usePagoRastreador";

import { ClienteInfo, TipoCompradorExterno } from "./ClienteInfo";
import { emptyConcesionariaForm, emptyClienteFinal } from "./VentaConcesionariaForm";
import { BuscarStock } from "./BuscarStock";
import { DatosDispositivo } from "./DatosDispositivo";
import { AsignacionSIMInstalador } from "./AsignacionSIMInstalador";
import { EvidenciasSection } from "./EvidenciasSection";
import { HistorialGPS } from "./HistorialGPS";
import { PagoRastreadorModule } from "./PagoRastreadorModule";
import { PagoRastreadorExternoModule } from "./PagoRastreadorExternoModule";

interface LinkGPSFormProps {
    seleccionado: ContratoGPS | null;
    onCancel: () => void;
    onSuccess: () => void;
}

interface NuevoClienteState {
    nombre: string;
    identificacion: string;
    telefono: string;
    email: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: string;
    color: string;
}

export function LinkGPSForm({ seleccionado, onCancel, onSuccess }: LinkGPSFormProps) {
    const isExternal = !seleccionado;

    const { sims } = useInventarioSIM();
    const { instaladores } = useInstaladores();
    const { registrarVentaRastreador, generarCuotasRastreador } = usePagoRastreador();

    const [formLoading, setFormLoading] = useState(false);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const [newClient, setNewClient] = useState<NuevoClienteState>({
        nombre: '', identificacion: '', telefono: '', email: '',
        placa: '', marca: '', modelo: '', anio: '', color: ''
    });

    const [stockItem, setStockItem] = useState<any | null>(null);
    const [historialgps, setHistorialGps] = useState<any[]>([]);
    
    // ✨ Estado para el pago del rastreador (contado/crédito, método y comprobante)
    const [pagoRastreador, setPagoRastreador] = useState<(PagoRastreadorInfo & { tipo_pago: TipoPagoEnum }) | null>(null);
    const [metodoPagoRastreador, setMetodoPagoRastreador] = useState<MetodoPagoRastreadorEnum>(MetodoPagoRastreadorEnum.EFECTIVO);
    const [comprobantePagoRastreadorFile, setComprobantePagoRastreadorFile] = useState<File | null>(null);

    // ✨ Resultado de cartera por nota de venta: sin documento = CONTADO, con documento = CRÉDITO (valores de cuota)
    const [datosCartera, setDatosCartera] = useState<{
        tipoPago: TipoPagoEnum;
        cuotaMensual?: number;
        totalFinal?: number;
        numeroCuotas?: number;
    } | null>(null);
    const [carteraLoading, setCarteraLoading] = useState(false);

    // Venta a concesionaria (solo cuando isExternal)
    const [tipoCompradorExterno, setTipoCompradorExterno] = useState<TipoCompradorExterno>("PERSONA");
    const [concesionariaId, setConcesionariaId] = useState<string | null>(null);
    const [concesionariaForm, setConcesionariaForm] = useState<ConcesionariaPayload>(emptyConcesionariaForm);
    const [clienteFinal, setClienteFinal] = useState<ClienteFinalPayload>(emptyClienteFinal);

    const [form, setForm] = useState({
        imei: '',
        proveedor: '',
        tipoDispositivo: 'Rastreador GPS',
        modelo: '',
        costo: 0,
        pagado: false,
        metodoPago: 'TRANSFERENCIA',
        precioVenta: 0,
        sim_id: '',
        instalador_id: '',
        costo_instalacion: 0
    });

    const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
    const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<string[]>([]);

    // Cargar historial GPS
    useEffect(() => {
        const cargarHistorial = async () => {
            if (!seleccionado && !newClient.identificacion) return;

            setLoadingHistorial(true);
            try {
                const identificacion = seleccionado?.ruc || newClient.identificacion;
                if (identificacion) {
                    const gps = await rastreadoresService.getGPSPorCliente(identificacion);
                    setHistorialGps(gps || []);
                }
            } catch (err) {
                console.error("Error cargando historial GPS:", err);
                setHistorialGps([]);
            } finally {
                setLoadingHistorial(false);
            }
        };

        cargarHistorial();
    }, [seleccionado, newClient.identificacion]);

    // ✨ Cargar tipo de pago y cuota desde CARTERA (por número físico / nota de venta)
    // Lógica: sin documento de cartera = pago al CONTADO; con documento = CRÉDITO (valores desde cartera)
    useEffect(() => {
        const cargarCuotaDesdeCartera = async () => {
            if (!seleccionado || seleccionado.origen === 'EXTERNO') {
                setDatosCartera(null);
                return;
            }

            setCarteraLoading(true);
            setDatosCartera(null);
            try {
                const documento = await walletService.getDocumentoByNumeroFisico(seleccionado.notaVenta);

                if (!documento) {
                    // Solo cuando sale este aviso es que se asume pago al CONTADO
                    console.log("⚠️ No se encontró documento de cartera para nota de venta:", seleccionado.notaVenta);
                    setDatosCartera({ tipoPago: TipoPagoEnum.CONTADO });
                    return;
                }

                const plazoTotal = documento.totalCuotas ?? documento.numeroCuota;
                if (documento.valorOriginal && plazoTotal) {
                    const cuota = documento.valorOriginal;
                    const totalFinanciado = cuota * plazoTotal;
                    setDatosCartera({
                        tipoPago: TipoPagoEnum.CREDITO,
                        cuotaMensual: cuota,
                        totalFinal: totalFinanciado,
                        numeroCuotas: plazoTotal
                    });
                    console.log(`✅ Cuota cargada desde cartera (Nota: ${seleccionado.notaVenta})`);
                    console.log(`   💰 Total financiado: $${totalFinanciado.toFixed(2)} | Cuota: $${cuota.toFixed(2)} | ${plazoTotal} cuotas`);
                } else {
                    setDatosCartera({ tipoPago: TipoPagoEnum.CREDITO });
                }
            } catch (err) {
                console.error("❌ Error cargando cuota desde cartera:", err);
                setDatosCartera(null);
            } finally {
                setCarteraLoading(false);
            }
        };

        cargarCuotaDesdeCartera();
    }, [seleccionado?.ccoCodigo, seleccionado?.notaVenta, seleccionado?.origen]);

    const handleClientChange = (field: keyof NuevoClienteState, value: string) => {
        setNewClient({ ...newClient, [field]: value });
    };

    const handleStockFormUpdate = (updates: any) => {
        setForm(prev => ({ ...prev, ...updates }));
    };

    const handleGuardar = async () => {
        if (!form.imei) return toast.error("IMEI obligatorio");
        if (!form.modelo) return toast.error("Modelo obligatorio");

        if (isExternal) {
            if (tipoCompradorExterno === "PERSONA") {
                if (!newClient.nombre || !newClient.identificacion || !newClient.placa) {
                    return toast.error("Complete nombre, identificación y placa del cliente");
                }
            } else {
                const tieneConcesionaria = concesionariaId || (concesionariaForm.nombre?.trim() && concesionariaForm.ruc?.trim());
                if (!tieneConcesionaria) {
                    return toast.error("Indique la concesionaria (seleccione una existente o complete nombre y RUC)");
                }
            }
            if (!form.precioVenta || form.precioVenta <= 0) {
                return toast.error("Ingrese el precio de venta al cliente");
            }
        }

        setFormLoading(true);
        try {
            // Subir evidencias
            let urlsFinales = [...evidenciasGuardadas];
            if (archivosNuevos.length > 0) {
                const nuevas = await rastreadoresService.subirEvidencias(archivosNuevos);
                urlsFinales = [...urlsFinales, ...nuevas];
            }

            const identificacionCliente = isExternal
                ? (tipoCompradorExterno === "CONCESIONARIA" ? (concesionariaId ? "" : concesionariaForm.ruc) || newClient.identificacion : newClient.identificacion)
                : seleccionado!.ruc;
            const notaVentaGenerada = isExternal
                ? (tipoCompradorExterno === "CONCESIONARIA" ? `EXT-CONC-${Date.now()}` : `EXT-${newClient.identificacion.replace(/\D/g, '')}-${Date.now()}`)
                : seleccionado!.notaVenta;

            const gpsPayload: RegistroGPSPayload = {
                identificacion_cliente: isExternal ? (tipoCompradorExterno === "CONCESIONARIA" ? (concesionariaForm.ruc || newClient.identificacion) : newClient.identificacion) : seleccionado!.ruc,
                nota_venta: notaVentaGenerada,
                imei: form.imei.toUpperCase().trim(),
                modelo: form.modelo,
                tipo_dispositivo: form.tipoDispositivo,
                costo_compra: form.costo,
                precio_venta: isExternal ? form.precioVenta : seleccionado!.totalRastreador,
                proveedor: form.proveedor || 'EXTERNO',
                pagado: form.pagado,
                metodo_pago: form.metodoPago,
                evidencias: urlsFinales,
                sim_id: form.sim_id || undefined,
                instalador_id: form.instalador_id || undefined,
                costo_instalacion: form.costo_instalacion || 0
            };

            let res;

            if (isExternal) {
                const clientePayload = tipoCompradorExterno === "CONCESIONARIA"
                    ? {
                          nombre: concesionariaId ? "" : concesionariaForm.nombre,
                          identificacion: concesionariaId ? "" : concesionariaForm.ruc,
                          telefono: newClient.telefono,
                          email: newClient.email,
                          placa: newClient.placa || "N/A",
                          marca: newClient.marca || "N/A",
                          modelo: newClient.modelo,
                          anio: newClient.anio,
                          color: newClient.color
                      }
                    : newClient;
                const opciones = tipoCompradorExterno === "CONCESIONARIA"
                    ? {
                          esConcesionaria: true,
                          concesionariaId: concesionariaId || undefined,
                          concesionaria: concesionariaId ? undefined : concesionariaForm,
                          clienteFinal: clienteFinal.nombre || clienteFinal.identificacion ? clienteFinal : undefined
                      }
                    : undefined;
                res = await rastreadoresService.registrarVentaExterna(
                    clientePayload,
                    { ...gpsPayload, nota_venta: notaVentaGenerada },
                    stockItem?.id || null,
                    opciones
                );
            } else {
                if (stockItem) {
                    res = await rastreadoresService.registrarInstalacionDesdeStock(gpsPayload, stockItem.id);
                } else {
                    res = await rastreadoresService.registrar(gpsPayload);
                }
            }

            if (res.success) {
                const data = 'data' in res ? res.data : null;
                const dispositivoData = data ? (Array.isArray(data) ? data[0] : data) : null;
                const dispositivo_id = dispositivoData?.id;

                // Registrar pago del rastreador (AUTO o Venta a tercero) → ventas_rastreador + cuotas_rastreador si es crédito
                if (pagoRastreador && dispositivo_id) {
                    try {
                        const precioTotal = isExternal ? form.precioVenta : seleccionado!.totalRastreador;
                        const totalFinanciado = isExternal
                            ? form.precioVenta - (pagoRastreador.abono_inicial ?? 0)
                            : undefined;

                        let urlComprobante: string | null = null;
                        if (comprobantePagoRastreadorFile) {
                            urlComprobante = await rastreadoresService.subirComprobantePago(comprobantePagoRastreadorFile);
                        }

                        let cuotasData: Array<{ valor: number; fecha_vencimiento: string }> | undefined;
                        if (pagoRastreador.tipo_pago === TipoPagoEnum.CREDITO && pagoRastreador.numero_cuotas_credito && pagoRastreador.numero_cuotas_credito > 0 && pagoRastreador.valor_rastreador_mensual > 0) {
                            const hoy = new Date();
                            const fechasVencimiento: string[] = [];
                            for (let i = 1; i <= pagoRastreador.numero_cuotas_credito; i++) {
                                const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, hoy.getDate());
                                fechasVencimiento.push(d.toISOString().slice(0, 10));
                            }
                            cuotasData = generarCuotasRastreador(pagoRastreador.valor_rastreador_mensual, fechasVencimiento);
                        }

                        await registrarVentaRastreador(
                            String(dispositivo_id),
                            {
                                dispositivo_id: String(dispositivo_id),
                                entorno: isExternal ? 'SIN_VEHICULO' : 'CON_VEHICULO',
                                tipo_pago: pagoRastreador.tipo_pago,
                                precio_total: precioTotal,
                                numero_cuotas: pagoRastreador.numero_cuotas_credito ?? undefined,
                                abono_inicial: pagoRastreador.abono_inicial ?? 0,
                                total_financiado: totalFinanciado,
                                metodo_pago: pagoRastreador.metodo_pago_medio ?? metodoPagoRastreador,
                                url_comprobante_pago: urlComprobante
                            },
                            cuotasData
                        );
                        // Sincronizar tipo_pago y plazo en el dispositivo para que la cartera clasifique igual que PagoRastreadorExternoModule
                        await rastreadoresService.actualizarTipoPagoYPlazo(
                            String(dispositivo_id),
                            pagoRastreador.tipo_pago,
                            pagoRastreador.numero_cuotas_credito ?? null
                        );
                    } catch (pagoError) {
                        console.error("Error registrando pago del rastreador:", pagoError);
                        // No bloqueamos el éxito si falla el registro de pago
                    }
                }

                toast.success(isExternal ? "Venta Externa Registrada" : "Vinculación Exitosa");
                onSuccess();
            } else {
                toast.error(res.error || "Error al guardar");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error crítico");
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300 pb-10">
            {/* Header */}
            <div className="mb-6">
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-800 flex items-center gap-2 text-xs font-bold uppercase mb-4 transition-colors">
                    <ArrowLeft size={14} /> Volver al listado
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase">
                        {isExternal ? 'Nueva Venta a Tercero' : 'Vinculación GPS a Auto'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isExternal ? 'Registre los datos del cliente y el dispositivo.' : `Cliente: ${seleccionado?.cliente}`}
                    </p>
                </div>
            </div>

            <div className="space-y-6">

                {/* Cliente Info (persona natural o concesionaria) */}
                <ClienteInfo
                    isExternal={isExternal}
                    seleccionado={seleccionado}
                    newClient={newClient}
                    onClientChange={handleClientChange}
                    tipoComprador={tipoCompradorExterno}
                    onTipoCompradorChange={setTipoCompradorExterno}
                    concesionariaId={concesionariaId}
                    concesionariaForm={concesionariaForm}
                    clienteFinal={clienteFinal}
                    onConcesionariaIdChange={setConcesionariaId}
                    onConcesionariaFormChange={(data) => setConcesionariaForm(prev => ({ ...prev, ...data }))}
                    onClienteFinalChange={(data) => setClienteFinal(prev => ({ ...prev, ...data }))}
                />

                {/* ✨ Módulo de Pago del Rastreador: AUTO (con contrato). Tipo y valores desde cartera: sin doc = CONTADO, con doc = CRÉDITO */}
                {!isExternal && seleccionado && (
                    <PagoRastreadorModule
                        seleccionado={seleccionado}
                        totalRastreador={seleccionado.totalRastreador}
                        onPagoChange={setPagoRastreador}
                        metodoPago={metodoPagoRastreador}
                        comprobanteFile={comprobantePagoRastreadorFile}
                        onMetodoPagoChange={setMetodoPagoRastreador}
                        onComprobantePagoChange={setComprobantePagoRastreadorFile}
                        tipoPagoDesdeCartera={datosCartera?.tipoPago ?? null}
                        datosCreditoDesdeCartera={datosCartera?.cuotaMensual != null ? { cuotaMensual: datosCartera.cuotaMensual, totalFinal: datosCartera.totalFinal!, numeroCuotas: datosCartera.numeroCuotas! } : undefined}
                        carteraLoading={carteraLoading}
                        notaVentaParaAviso={seleccionado.notaVenta}
                    />
                )}

                {/* ✨ Solo en Nueva Venta a Tercero: contado/crédito, meses, método de pago y comprobante */}
                {isExternal && (
                    <PagoRastreadorExternoModule
                        totalRastreador={form.precioVenta}
                        onPagoChange={setPagoRastreador}
                        metodoPago={metodoPagoRastreador}
                        comprobanteFile={comprobantePagoRastreadorFile}
                        onMetodoPagoChange={setMetodoPagoRastreador}
                        onComprobantePagoChange={setComprobantePagoRastreadorFile}
                    />
                )}

                {/* Dispositivo e instalación */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 border-l-4 border-l-[#E11D48]">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Dispositivo e instalación</h3>
                    </div>
                    {formLoading && (
                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="animate-spin text-[#E11D48]" size={32} />
                        </div>
                    )}

                    <div className="p-6 md:p-8 space-y-6">

                        {/* Buscar Stock */}
                        <BuscarStock
                            imei={form.imei}
                            onImeiChange={(value) => setForm({ ...form, imei: value })}
                            onStockFound={setStockItem}
                            onFormUpdate={handleStockFormUpdate}
                            stockItem={stockItem}
                        />

                        {/* Datos Dispositivo */}
                        <DatosDispositivo
                            isExternal={isExternal}
                            seleccionado={seleccionado}
                            stockItem={stockItem}
                            modelo={form.modelo}
                            costo={form.costo}
                            precioVenta={form.precioVenta}
                            onModeloChange={(value) => setForm({ ...form, modelo: value })}
                            onCostoChange={(value) => setForm({ ...form, costo: value })}
                            onPrecioVentaChange={(value) => setForm({ ...form, precioVenta: value })}
                        />

                        {/* SIM e Instalador */}
                        <AsignacionSIMInstalador
                            sims={sims}
                            instaladores={instaladores}
                            simId={form.sim_id}
                            instaladorId={form.instalador_id}
                            costoInstalacion={form.costo_instalacion}
                            onSimChange={(value) => setForm({ ...form, sim_id: value })}
                            onInstaladorChange={(id, costo) => setForm({ ...form, instalador_id: id, costo_instalacion: costo })}
                            onCostoInstalacionChange={(value) => setForm({ ...form, costo_instalacion: value })}
                        />

                        {/* Evidencias */}
                        <EvidenciasSection
                            evidenciasGuardadas={evidenciasGuardadas}
                            archivosNuevos={archivosNuevos}
                            onFileSelect={(files) => setArchivosNuevos(prev => [...prev, ...files])}
                            onRemoveGuardada={(idx) => setEvidenciasGuardadas(p => p.filter((_, i) => i !== idx))}
                            onRemoveNueva={(idx) => setArchivosNuevos(p => p.filter((_, i) => i !== idx))}
                        />

                        {/* Historial GPS */}
                        <HistorialGPS
                            historialgps={historialgps}
                            onHistorialUpdate={(gps) => setHistorialGps(prev => prev.map(g => g.id === gps.id ? gps : g))}
                        />
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                        <button onClick={handleGuardar} disabled={formLoading} className="w-full py-4 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {isExternal ? 'REGISTRAR VENTA Y VINCULAR' : 'CONFIRMAR VINCULACIÓN'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
