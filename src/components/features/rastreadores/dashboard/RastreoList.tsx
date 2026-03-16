"use client";
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Building2, Users, User, Store, Plus, Smartphone, AlertCircle, CheckCircle, Clock, XCircle, Trash2, ChevronDown } from "lucide-react";
import { ContratoGPS } from "@/types/rastreadores.types";
import { rastreadoresService } from "@/services/rastreadores.service";
import { RastreoStats } from "./RastreoStats";

// Mapeo de estados con colores e iconos
const ESTADO_CONFIG = {
    'PENDIENTE_INSTALACION': { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Clock, label: 'Pendiente', bgIcon: 'bg-yellow-100' },
    'INSTALADO': { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: CheckCircle, label: 'Instalado', bgIcon: 'bg-blue-100' },
    'ACTIVO': { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle, label: 'Activo', bgIcon: 'bg-green-100' },
    'SUSPENDIDO': { color: 'bg-orange-50 text-orange-700 border-orange-100', icon: AlertCircle, label: 'Suspendido', bgIcon: 'bg-orange-100' },
    'RETIRADO': { color: 'bg-red-50 text-red-700 border-red-100', icon: Trash2, label: 'Retirado', bgIcon: 'bg-red-100' }
} as const;

const CONEXION_CONFIG = {
    online: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Online' },
    inactivo: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Inactivo' },
    offline: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Offline' }
} as const;

interface RastreoListProps {
    data: ContratoGPS[];
    loading: boolean;
    onManage: (item: ContratoGPS) => void;
    onNewExternal: () => void;
    /** Si se pasa (vendedor), solo se cargan ventas con ventas_rastreador.asesor_id = asesorIdFiltro */
    asesorIdFiltro?: string | null;
}

type FiltroOrigen = 'TODOS' | 'AUTO' | 'EXTERNO' | 'EXTERNO_CLIENTE' | 'EXTERNO_CONCESIONARIA';

const EXTERNO_OPCIONES: { id: FiltroOrigen; label: string; icon: typeof User }[] = [
    { id: 'EXTERNO', label: 'Todos externos', icon: Users },
    { id: 'EXTERNO_CLIENTE', label: 'Solo cliente', icon: User },
    { id: 'EXTERNO_CONCESIONARIA', label: 'Solo concesionaria', icon: Store },
];

export function RastreoList({ data, loading, onManage, onNewExternal, asesorIdFiltro }: RastreoListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>('TODOS');
    const [externosOpen, setExternosOpen] = useState(false);
    const externosRef = useRef<HTMLDivElement>(null);
    const [gpsMap, setGpsMap] = useState<Map<string, any>>(new Map());
    const [refreshKey, setRefreshKey] = useState(0);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (externosRef.current && !externosRef.current.contains(e.target as Node)) setExternosOpen(false);
        }
        if (externosOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [externosOpen]);

    // Función para recargar el mapa de GPS (filtrado por asesor cuando es vendedor)
    const cargarGPS = async () => {
        try {
            const ventasConGPS = await rastreadoresService.obtenerVentasConGPS('TODOS', asesorIdFiltro);
            const mapa = new Map();
            
            ventasConGPS.forEach(gps => {
                if (gps.nota_venta) {
                    mapa.set(gps.nota_venta, gps);
                }
            });
            
            setGpsMap(mapa);
        } catch (err) {
            console.error("Error cargando GPS map:", err);
        }
    };

    // Cargar GPSs vinculados al montar (y cuando cambia el filtro por asesor)
    useEffect(() => {
        cargarGPS();
    }, [data, refreshKey, asesorIdFiltro]);

    // Auto-refrescar cada 5 segundos para detectar cambios en tiempo real
    useEffect(() => {
        const intervalo = setInterval(() => {
            cargarGPS();
        }, 5000);

        return () => clearInterval(intervalo);
    }, [asesorIdFiltro]);

    const searchLower = searchTerm.trim().toLowerCase();
    const filteredData = data.filter(c => {
        const gps = gpsMap.get(c.notaVenta);
        const matchesSearch = searchLower === "" ||
            c.cliente.toLowerCase().includes(searchLower) ||
            c.ruc.includes(searchTerm.trim()) ||
            c.placa.toLowerCase().includes(searchLower) ||
            (gps && (
                (gps.imei && String(gps.imei).toLowerCase().includes(searchLower)) ||
                (gps.modelo && String(gps.modelo).toLowerCase().includes(searchLower))
            ));
        let matchesOrigen = true;
        if (filtroOrigen === 'AUTO') matchesOrigen = c.origen === 'AUTO';
        else if (filtroOrigen === 'EXTERNO') matchesOrigen = c.origen === 'EXTERNO';
        else if (filtroOrigen === 'EXTERNO_CLIENTE') matchesOrigen = c.origen === 'EXTERNO' && !c.esConcesionaria;
        else if (filtroOrigen === 'EXTERNO_CONCESIONARIA') matchesOrigen = c.origen === 'EXTERNO' && !!c.esConcesionaria;
        return matchesSearch && matchesOrigen;
    });

    const totalRecaudado = filteredData.reduce((acc, curr) => acc + curr.totalRastreador, 0);
    const esExterno = filtroOrigen === 'EXTERNO' || filtroOrigen === 'EXTERNO_CLIENTE' || filtroOrigen === 'EXTERNO_CONCESIONARIA';
    const labelExternos = EXTERNO_OPCIONES.find(o => o.id === filtroOrigen)?.label ?? 'Externos';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header: Título y Acciones */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                        Gestión de Rastreo
                    </h1>
                    <p className="text-sm font-medium text-slate-500">
                        Control de instalaciones y monitoreo GPS
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* BOTÓN NUEVA VENTA EXTERNA */}
                    <button 
                        onClick={onNewExternal}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus size={16} /> Nueva Venta
                    </button>

                    {/* Filtros: Todos · K-si · Externos (dropdown: todos / cliente / concesionaria) */}
                    <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap items-center gap-0.5 font-bold text-xs uppercase shadow-inner">
                        <button type="button" onClick={() => setFiltroOrigen('TODOS')} className={`px-3 py-2 rounded-lg transition-all ${filtroOrigen === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
                        <button type="button" onClick={() => setFiltroOrigen('AUTO')} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${filtroOrigen === 'AUTO' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Building2 size={12}/> K-si</button>
                        <div className="relative" ref={externosRef}>
                            <button
                                type="button"
                                onClick={() => setExternosOpen((o) => !o)}
                                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${esExterno ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Users size={12} />
                                <span className="normal-case">{labelExternos}</span>
                                <ChevronDown size={14} className={`transition-transform ${externosOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {externosOpen && (
                                <div className="absolute top-full left-0 mt-1 py-1 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                                    {EXTERNO_OPCIONES.map((opt) => {
                                        const Icon = opt.icon;
                                        const active = filtroOrigen === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setFiltroOrigen(opt.id);
                                                    setExternosOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left flex items-center gap-2 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                <Icon size={14} />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <RastreoStats totalDispositivos={filteredData.length} totalRecaudado={totalRecaudado} />

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar cliente, placa, RUC, dispositivo o IMEI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 transition-shadow focus:shadow-md"
                />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Origen</th>
                                <th className="px-6 py-4">Cliente / Nota</th>
                                <th className="px-6 py-4">Vehículo</th>
                                <th className="px-6 py-4">Instalación</th>
                                <th className="px-6 py-4">Conexión</th>
                                <th className="px-6 py-4 text-right">Valor Venta</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400 animate-pulse font-bold">Cargando datos...</td></tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item) => {
                                    const gpsVinculado = gpsMap.get(item.notaVenta);
                                    return (
                                        <tr key={item.ccoCodigo} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                {item.origen === 'AUTO' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100"><Building2 size={10}/> K-SI</span>
                                                ) : item.esConcesionaria ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-100"><Store size={10}/> Conc.</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100"><User size={10}/> Cliente</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 uppercase">{item.cliente}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{item.ruc}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 uppercase">{item.marca} {item.modelo}</div>
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 font-black uppercase mt-1 inline-block">{item.placa}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {gpsVinculado ? (
                                                    // Estado del dispositivo (Pendiente / Instalado / Activo...)
                                                    (() => {
                                                        const estado = gpsVinculado.estado || 'PENDIENTE_INSTALACION';
                                                        const config = ESTADO_CONFIG[estado as keyof typeof ESTADO_CONFIG] || ESTADO_CONFIG['PENDIENTE_INSTALACION'];
                                                        const IconoEstado = config.icon;
                                                        return (
                                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black border w-fit ${config.color}`}>
                                                                <div className={`p-1 rounded ${config.bgIcon}`}>
                                                                    <IconoEstado size={10} />
                                                                </div>
                                                                {config.label}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-[10px] font-black border border-yellow-100">
                                                        <Smartphone size={12}/> Sin GPS
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {gpsVinculado ? (
                                                    // Conexión: Online / Inactivo / Offline
                                                    (() => {
                                                        const conexion = (gpsVinculado.estado_coneccion ?? 'offline') as keyof typeof CONEXION_CONFIG;
                                                        const conf = CONEXION_CONFIG[conexion] ?? CONEXION_CONFIG.offline;
                                                        return (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase border w-fit ${conf.color}`}>
                                                                {conf.label}
                                                            </span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase border w-fit ${CONEXION_CONFIG.inactivo.color}`}>
                                                        {CONEXION_CONFIG.inactivo.label}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono font-black text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">${item.totalRastreador.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => onManage(item)} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95">
                                                    <MapPin size={14} /> Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase">No se encontraron resultados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}