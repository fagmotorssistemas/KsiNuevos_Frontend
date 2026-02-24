// src/components/rastreadores/instalacion/LinkGPSForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { 
    Loader2, Save, ArrowLeft, Paperclip, 
    Trash2, Plus, Search, CheckCircle2, AlertTriangle, 
    User, Car, Smartphone, History, Clock, AlertCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { ContratoGPS, RegistroGPSPayload } from "@/types/rastreadores.types";
import { rastreadoresService } from "@/services/rastreadores.service";
import { useInventarioSIM } from "@/hooks/useInventarioSim";
import { useInstaladores } from "@/hooks/useInstaladores";

// Estados disponibles para GPS
const ESTADOS_GPS = [
    { value: 'PENDIENTE_INSTALACION', label: 'Pendiente Instalación', icon: Clock, color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    { value: 'INSTALADO', label: 'Instalado', icon: CheckCircle2, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { value: 'ACTIVO', label: 'Activo', icon: CheckCircle2, color: 'bg-green-50 text-green-700 border-green-100' },
    { value: 'SUSPENDIDO', label: 'Suspendido', icon: AlertCircle, color: 'bg-orange-50 text-orange-700 border-orange-100' },
    { value: 'RETIRADO', label: 'Retirado', icon: XCircle, color: 'bg-red-50 text-red-700 border-red-100' }
] as const;

interface LinkGPSFormProps {
    seleccionado: ContratoGPS | null; // Puede ser null si es cliente nuevo
    onCancel: () => void;
    onSuccess: () => void;
}

// Estado para el formulario de cliente nuevo
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
    // Determinar si es flujo externo (no hay cliente seleccionado de la lista)
    const isExternal = !seleccionado;

    // Hooks para cargar SIMs e Instaladores disponibles
    const { sims } = useInventarioSIM();
    const { instaladores } = useInstaladores();

    const [formLoading, setFormLoading] = useState(false);
    const [validatingStock, setValidatingStock] = useState(false);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    
    // Estado para datos de Cliente Nuevo (Solo se usa si isExternal es true)
    const [newClient, setNewClient] = useState<NuevoClienteState>({
        nombre: '', identificacion: '', telefono: '', email: '',
        placa: '', marca: '', modelo: '', anio: '', color: ''
    });
    
    // Estado para controlar si el producto viene de bodega
    const [stockItem, setStockItem] = useState<any | null>(null);

    // Historial de GPSs comprados
    const [historialgps, setHistorialGps] = useState<any[]>([]);

    // Estados seleccionados para cada GPS
    const [estadosSeleccionados, setEstadosSeleccionados] = useState<{[key: string]: string}>({});
    
    // ID del GPS siendo guardado
    const [guardandoGPSId, setGuardandoGPSId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado del GPS
    const [form, setForm] = useState({
        imei: '',
        proveedor: '', 
        tipoDispositivo: 'Rastreador GPS',
        modelo: '', 
        costo: 0,
        pagado: false,
        metodoPago: 'TRANSFERENCIA',
        precioVenta: 0, // Nuevo campo para definir precio en venta externa
        sim_id: '',
        instalador_id: '',
        costo_instalacion: 0
    });

    const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
    const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<string[]>([]);

    // Cargar historial de GPS cuando monta o cambia seleccionado
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

    // --- 1. MANEJO DE ARCHIVOS ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setArchivosNuevos(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    // --- 2. ACTUALIZAR ESTADO DEL GPS ---
    const handleActualizarEstado = async (gpsId: string) => {
        const nuevoEstado = estadosSeleccionados[gpsId];
        if (!nuevoEstado) return toast.error("Seleccione un estado");

        setGuardandoGPSId(gpsId);
        try {
            const res = await rastreadoresService.actualizarEstadoGPS(gpsId, nuevoEstado);
            if (res.success) {
                // Actualizar el historial localmente
                setHistorialGps(prev => prev.map(gps => 
                    gps.id === gpsId ? {...gps, estado: nuevoEstado} : gps
                ));
                toast.success("Estado actualizado correctamente");
            } else {
                toast.error("Error al actualizar estado");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error crítico al actualizar");
        } finally {
            setGuardandoGPSId(null);
        }
    };

    // --- 3. GUARDADO FINAL ---
    const handleCheckStock = async () => {
        if (!form.imei || form.imei.length < 5) return toast.error("Ingrese un IMEI válido para buscar");
        
        setValidatingStock(true);
        try {
            const res = await rastreadoresService.validarStock(form.imei.trim());
            
            if (res.found && res.status === 'STOCK' && res.data) {
                const item = res.data;
                setStockItem(item);
                
                setForm(prev => ({
                    ...prev,
                    modelo: item.modelo?.nombre || 'Desconocido',
                    proveedor: item.proveedor?.nombre || 'Bodega',
                    costo: item.costo_compra,
                    imei: item.imei
                }));
                toast.success("Dispositivo encontrado en Stock");
            } else if (res.found && res.status !== 'STOCK') {
                toast.warning(`Este IMEI ya figura como ${res.status}`);
                setStockItem(null);
            } else {
                toast.error("IMEI no encontrado en Bodega. ¿Es un equipo externo?");
                setStockItem(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al validar stock");
        } finally {
            setValidatingStock(false);
        }
    };

    // --- 3. GUARDADO FINAL ---
    const handleGuardar = async () => {
        // Validaciones Generales
        if (!form.imei) return toast.error("IMEI obligatorio");
        if (!form.modelo) return toast.error("Modelo obligatorio");

        // Validaciones Específicas para Cliente Externo
        if (isExternal) {
            if (!newClient.nombre || !newClient.identificacion || !newClient.placa) {
                return toast.error("Complete nombre, identificación y placa del cliente");
            }
            if (!form.precioVenta || form.precioVenta <= 0) {
                return toast.error("Ingrese el precio de venta al cliente");
            }
        }

        setFormLoading(true);
        try {
            // A. Subir Evidencias
            let urlsFinales = [...evidenciasGuardadas];
            if (archivosNuevos.length > 0) {
                const nuevas = await rastreadoresService.subirEvidencias(archivosNuevos);
                urlsFinales = [...urlsFinales, ...nuevas];
            }

            // B. Preparar Payload Base
            // IMPORTANTE: nota_venta VINCULA el GPS con la venta/cliente
            // Para clientes externos: Generar ID único basado en cliente + timestamp
            // Para clientes auto: Usar el número de venta existente
            const notaVentaGenerada = isExternal 
                ? `EXT-${newClient.identificacion.replace(/\D/g, '')}-${Date.now()}`
                : seleccionado!.notaVenta;

            const gpsPayload: RegistroGPSPayload = {
                identificacion_cliente: isExternal ? newClient.identificacion : seleccionado!.ruc,
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

            // C. Decidir Flujo de Guardado
            if (isExternal) {
                // FLUJO A: CLIENTE NUEVO / EXTERNO
                res = await rastreadoresService.registrarVentaExterna(
                    newClient,
                    gpsPayload,
                    stockItem?.id || null
                );
            } else {
                // FLUJO B: CLIENTE EXISTENTE (AUTO)
                if (stockItem) {
                    res = await rastreadoresService.registrarInstalacionDesdeStock(gpsPayload, stockItem.id);
                } else {
                    res = await rastreadoresService.registrar(gpsPayload); // Manual/Legacy
                }
            }

            if (res.success) {
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
                    <ArrowLeft size={14}/> Volver al listado
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
                
                {/* --- SECCIÓN 1: DATOS DEL CLIENTE --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <User size={16} className="text-slate-400"/>
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Información del Cliente</h3>
                    </div>
                    
                    <div className="p-6">
                        {isExternal ? (
                            // FORMULARIO DE EDICIÓN (CLIENTE NUEVO)
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Identificación (RUC/Cédula)</label>
                                    <input type="text" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                        value={newClient.identificacion} onChange={e => setNewClient({...newClient, identificacion: e.target.value})} placeholder="Ej: 010..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</label>
                                    <input type="text" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                                        value={newClient.nombre} onChange={e => setNewClient({...newClient, nombre: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Teléfono / Celular</label>
                                    <input type="text" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 outline-none" 
                                        value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                                    <input type="email" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 outline-none" 
                                        value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                </div>
                                
                                {/* Datos Vehículo en el mismo bloque para simplificar visualmente */}
                                <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Car size={10}/> Placa</label>
                                        <input type="text" className="w-full p-2.5 bg-yellow-50/50 rounded-lg border border-yellow-200 text-sm font-black text-slate-900 outline-none uppercase tracking-wider" 
                                            value={newClient.placa} onChange={e => setNewClient({...newClient, placa: e.target.value.toUpperCase()})} placeholder="AAA-0000" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Marca</label>
                                        <input type="text" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 outline-none uppercase" 
                                            value={newClient.marca} onChange={e => setNewClient({...newClient, marca: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Modelo</label>
                                        <input type="text" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 outline-none uppercase" 
                                            value={newClient.modelo} onChange={e => setNewClient({...newClient, modelo: e.target.value.toUpperCase()})} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // MODO LECTURA (CLIENTE AUTO)
                            <div className="flex items-center gap-6">
                                <div className="bg-slate-100 border-2 border-slate-200 px-4 py-3 rounded-xl text-center shadow-sm">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase leading-none mb-1">PLACA</span>
                                    <span className="block text-2xl font-black text-slate-900 font-mono leading-none">{seleccionado?.placa}</span>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-slate-900 uppercase">{seleccionado?.cliente}</h4>
                                    <p className="text-xs font-bold text-slate-500 uppercase flex gap-2">
                                        <span>RUC: {seleccionado?.ruc}</span>
                                        <span>•</span>
                                        <span>{seleccionado?.marca} {seleccionado?.modelo}</span>
                                    </p>
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-md">
                                        <span className="opacity-50">Nota Venta:</span>
                                        <span className="font-mono">{seleccionado?.notaVenta}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- SECCIÓN 2: DISPOSITIVO (STOCK) --- */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                    {formLoading && (
                        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    )}
                    
                    <div className="p-6 md:p-8 space-y-6">
                        
                        {/* Buscador Stock */}
                        <div className={`p-5 rounded-xl border ${stockItem ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {stockItem ? 'Dispositivo Seleccionado (De Bodega)' : 'Buscar Dispositivo en Bodega'}
                                </label>
                                {stockItem && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 size={12}/> Stock Verificado</span>}
                            </div>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={form.imei}
                                    onChange={e => {
                                        setForm({...form, imei: e.target.value});
                                        if(stockItem) setStockItem(null);
                                    }}
                                    className="flex-1 p-3 bg-white border border-transparent rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 tracking-widest placeholder:tracking-normal shadow-sm"
                                    placeholder="Escanear IMEI aquí..."
                                />
                                <button 
                                    onClick={handleCheckStock}
                                    disabled={validatingStock}
                                    className="bg-slate-900 text-white px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                    {validatingStock ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
                                </button>
                            </div>
                            {!stockItem && form.imei.length > 5 && (
                                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                    <AlertTriangle size={12}/> Sugerencia: Pulse la lupa para validar stock.
                                </p>
                            )}
                        </div>

                        {/* Datos Técnicos y Financieros */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modelo GPS</label>
                                <input 
                                    type="text" 
                                    value={form.modelo}
                                    onChange={e => setForm({...form, modelo: e.target.value})}
                                    disabled={!!stockItem}
                                    className={`w-full p-3 rounded-xl text-sm font-bold outline-none border uppercase ${stockItem ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-900 border-transparent focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder="Ej: FMC-920"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Compra ($)</label>
                                    <input 
                                        type="number" 
                                        value={form.costo}
                                        onChange={e => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                                        disabled={!!stockItem}
                                        className={`w-full p-3 rounded-xl text-sm font-bold outline-none border text-right ${stockItem ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-900 border-transparent focus:ring-2 focus:ring-blue-500'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Precio Venta ($)</label>
                                    {isExternal ? (
                                        <input 
                                            type="number" 
                                            value={form.precioVenta}
                                            onChange={e => setForm({...form, precioVenta: parseFloat(e.target.value) || 0})}
                                            className="w-full p-3 rounded-xl text-sm font-black outline-none border bg-blue-50 text-blue-700 border-blue-100 focus:ring-2 focus:ring-blue-500 text-right"
                                        />
                                    ) : (
                                        <div className="w-full p-3 rounded-xl text-sm font-black bg-slate-100 text-slate-500 border border-slate-200 text-right">
                                            ${seleccionado?.totalRastreador}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sección SIM e Instalador */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                            {/* Selección de SIM */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Smartphone size={12}/> Tarjeta SIM
                                </label>
                                <select 
                                    value={form.sim_id}
                                    onChange={e => setForm({...form, sim_id: e.target.value})}
                                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sin SIM asignada</option>
                                    {sims.filter(s => s.estado === 'STOCK').map(sim => (
                                        <option key={sim.id} value={sim.id}>
                                            {sim.numero || sim.iccid} - {sim.operadora} (${sim.costo_mensual}/mes)
                                        </option>
                                    ))}
                                </select>
                                {form.sim_id && (
                                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={10}/> SIM seleccionada
                                    </p>
                                )}
                            </div>

                            {/* Selección de Instalador y Costo (CORREGIDO) */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Instalador (Ocupa 2 de 3 columnas) */}
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Instalador
                                    </label>
                                    <select 
                                        value={form.instalador_id}
                                        onChange={e => {
                                            const selectedInstalador = instaladores.find(inst => inst.id === e.target.value);
                                            setForm({
                                                ...form, 
                                                instalador_id: e.target.value,
                                                costo_instalacion: selectedInstalador?.valor_por_instalacion || 0
                                            });
                                        }}
                                        className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-transparent focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {instaladores.filter(inst => inst.activo).map(instalador => (
                                            <option key={instalador.id} value={instalador.id}>
                                                {instalador.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Costo de Instalación (Ocupa 1 de 3 columnas) */}
                                <div className="space-y-2 col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Costo Inst.
                                    </label>
                                    <input 
                                        type="number" 
                                        value={form.costo_instalacion}
                                        onChange={e => setForm({...form, costo_instalacion: parseFloat(e.target.value) || 0})}
                                        className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-transparent focus:ring-2 focus:ring-blue-500 text-right"
                                        placeholder="$0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Evidencias */}
                        <div className="space-y-3 pt-4 border-t border-slate-50">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Paperclip size={12}/> Evidencias de Instalación</label>
                                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-blue-600 uppercase hover:underline flex items-center gap-1"><Plus size={12}/> Agregar</button>
                            </div>
                            {evidenciasGuardadas.map((url, idx) => (
                                <div key={`old-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                    <span className="text-xs font-bold text-slate-600 truncate">Evidencia #{idx+1}</span>
                                    <button onClick={() => setEvidenciasGuardadas(p => p.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {archivosNuevos.map((file, idx) => (
                                 <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <span className="text-xs font-bold text-blue-800 truncate">{file.name}</span>
                                    <button onClick={() => setArchivosNuevos(p => p.filter((_,i)=>i!==idx))} className="text-blue-400 hover:text-red-500"><Trash2 size={14}/></button>
                                 </div>
                            ))}
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        </div>

                        {/* HISTORIAL DE GPS COMPRADOS */}
                        {historialgps.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <History size={16} className="text-slate-400"/>
                                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">GPS Comprados (Historial)</h4>
                                    <span className="ml-auto text-[10px] font-bold text-slate-500">{historialgps.length} dispositivo(s)</span>
                                </div>
                                <div className="space-y-3">
                                    {historialgps.map((gps) => {
                                        const estadoActual = estadosSeleccionados[gps.id] || gps.estado || 'PENDIENTE_INSTALACION';
                                        const configEstado = ESTADOS_GPS.find(e => e.value === estadoActual);
                                        
                                        return (
                                            <div key={gps.id} className="p-3 bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-100 rounded-lg">
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Info GPS */}
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <Smartphone size={16} className="text-blue-700"/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-black text-slate-900 uppercase">
                                                                {gps.modelo || 'GPS Sin Modelo'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-mono mt-1">IMEI: {gps.imei}</div>
                                                            <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                                                                <span>Costo: ${gps.costo_compra?.toLocaleString() || '0'}</span>
                                                                <span>•</span>
                                                                <span>Venta: ${gps.precio_venta?.toLocaleString() || '0'}</span>
                                                            </div>
                                                            {/* SIM e Instalador */}
                                                            <div className="mt-2 pt-2 border-t border-slate-200 flex gap-3 text-[10px] flex-wrap">
                                                                {gps.sim_id && gps.gps_sims && (
                                                                    <span className="badge bg-cyan-50 text-cyan-700 px-2 py-1 rounded font-bold">
                                                                        SIM: {gps.gps_sims.numero || gps.gps_sims.iccid}
                                                                    </span>
                                                                )}
                                                                {gps.instalador_id && gps.gps_instaladores && (
                                                                    <span className="badge bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                                                                        Inst: {gps.gps_instaladores.nombre} (${gps.costo_instalacion?.toLocaleString() || '0'})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Estado y Acciones */}
                                                    <div className="text-right flex flex-col gap-2">
                                                        {/* Pago */}
                                                       
                                                        
                                                        {/* Selector de Estado */}
                                                        <div className="flex gap-1">
                                                            <select 
                                                                value={estadoActual}
                                                                onChange={e => setEstadosSeleccionados({...estadosSeleccionados, [gps.id]: e.target.value})}
                                                                className={`text-[10px] font-black px-2 py-1 rounded-md uppercase border ${configEstado?.color} outline-none`}
                                                            >
                                                                {ESTADOS_GPS.map(estado => (
                                                                    <option key={estado.value} value={estado.value}>
                                                                        {estado.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button 
                                                                onClick={() => handleActualizarEstado(gps.id)}
                                                                disabled={guardandoGPSId === gps.id}
                                                                className="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-black uppercase disabled:opacity-50 transition-all"
                                                            >
                                                                {guardandoGPSId === gps.id ? <Loader2 className="animate-spin" size={12}/> : 'Guardar'}
                                                            </button>
                                                        </div>

                                                        {/* Fecha */}
                                                        <div className="text-[9px] text-slate-400">
                                                            {gps.created_at ? new Date(gps.created_at).toLocaleDateString() : 'S/F'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <button onClick={handleGuardar} disabled={formLoading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                            {isExternal ? 'REGISTRAR VENTA Y VINCULAR' : 'CONFIRMAR VINCULACIÓN'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}