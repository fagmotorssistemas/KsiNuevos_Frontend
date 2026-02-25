"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Save, DollarSign, Upload, Loader2, Search } from "lucide-react";
import type { Cuenta } from "@/types/taller";
import { useAuth } from "@/hooks/useAuth";

type OrdenOption = { id: string; numero_orden: number; vehiculo_placa: string; vehiculo_marca: string | null; vehiculo_modelo: string | null };

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cuentas: Cuenta[];
    onSave: (data: any, file: File | null) => Promise<any>;
    defaultOrdenId?: string;
    defaultTipo?: string;
}

export function TransactionModal({ isOpen, onClose, cuentas, onSave, defaultOrdenId, defaultTipo }: TransactionModalProps) {
    const { supabase } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const [tipo, setTipo] = useState('ingreso');
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [ordenId, setOrdenId] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const [ordenesRecientes, setOrdenesRecientes] = useState<OrdenOption[]>([]);
    const [ordenesBusqueda, setOrdenesBusqueda] = useState<OrdenOption[]>([]);
    const [searchOrden, setSearchOrden] = useState('');
    const [buscandoOrden, setBuscandoOrden] = useState(false);

    const cargarUltimasOrdenes = useCallback(async () => {
        const { data } = await supabase
            .from('taller_ordenes')
            .select('id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo')
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setOrdenesRecientes(data as OrdenOption[]);
    }, [supabase]);

    const asegurarOrdenPorDefecto = useCallback(async (id: string) => {
        const { data } = await supabase
            .from('taller_ordenes')
            .select('id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo')
            .eq('id', id)
            .single();
        if (data)
            setOrdenesRecientes(prev => prev.some(o => o.id === id) ? prev : [data as OrdenOption, ...prev]);
    }, [supabase]);

    useEffect(() => {
        if (!isOpen) return;
        if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id);
        cargarUltimasOrdenes();
        if (defaultOrdenId) {
            setOrdenId(defaultOrdenId);
            asegurarOrdenPorDefecto(defaultOrdenId);
        }
        if (defaultTipo) setTipo(defaultTipo);
    }, [isOpen, cuentas, defaultOrdenId, defaultTipo, cargarUltimasOrdenes, asegurarOrdenPorDefecto]);

    useEffect(() => {
        if (!isOpen) return;
        setSearchOrden('');
        setOrdenesBusqueda([]);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !searchOrden.trim()) {
            setOrdenesBusqueda([]);
            setBuscandoOrden(false);
            return;
        }
        const term = searchOrden.trim().replace(/%/g, '');
        const num = Number(term);
        const incluirNumero = !isNaN(num) && String(num) === term;
        setBuscandoOrden(true);
        const t = setTimeout(async () => {
            const orClause = incluirNumero
                ? `vehiculo_placa.ilike.%${term}%,vehiculo_marca.ilike.%${term}%,vehiculo_modelo.ilike.%${term}%,numero_orden.eq.${num}`
                : `vehiculo_placa.ilike.%${term}%,vehiculo_marca.ilike.%${term}%,vehiculo_modelo.ilike.%${term}%`;
            const { data } = await supabase
                .from('taller_ordenes')
                .select('id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo')
                .or(orClause)
                .order('created_at', { ascending: false })
                .limit(25);
            setOrdenesBusqueda((data ?? []) as OrdenOption[]);
            setBuscandoOrden(false);
        }, 300);
        return () => clearTimeout(t);
    }, [isOpen, searchOrden, supabase]);

    const ordenesParaLista = searchOrden.trim() ? ordenesBusqueda : ordenesRecientes;
    const ordenSeleccionadaEnLista = ordenId && ordenesParaLista.some(o => o.id === ordenId);

    const [ordenSeleccionadaInfo, setOrdenSeleccionadaInfo] = useState<OrdenOption | null>(null);
    useEffect(() => {
        if (!ordenId || ordenSeleccionadaEnLista) {
            setOrdenSeleccionadaInfo(null);
            return;
        }
        supabase
            .from('taller_ordenes')
            .select('id, numero_orden, vehiculo_placa, vehiculo_marca, vehiculo_modelo')
            .eq('id', ordenId)
            .single()
            .then(({ data }) => { if (data) setOrdenSeleccionadaInfo(data as OrdenOption); });
    }, [ordenId, ordenSeleccionadaEnLista, supabase]);

    const opcionesSelect = ordenSeleccionadaInfo && !ordenesParaLista.some(o => o.id === ordenSeleccionadaInfo.id)
        ? [ordenSeleccionadaInfo, ...ordenesParaLista]
        : ordenesParaLista;

    const labelOrden = (o: OrdenOption) => `#${o.numero_orden} - ${[o.vehiculo_marca, o.vehiculo_modelo].filter(Boolean).join(' ')} (${o.vehiculo_placa})`;

    const [ordenDropdownAbierto, setOrdenDropdownAbierto] = useState(false);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenOption | null>(null);
    const ordenComboboxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ordenId && opcionesSelect.length > 0) {
            const found = opcionesSelect.find(o => o.id === ordenId);
            setOrdenSeleccionada(found ?? ordenSeleccionadaInfo ?? null);
        } else {
            setOrdenSeleccionada(null);
        }
    }, [ordenId, opcionesSelect, ordenSeleccionadaInfo]);

    const valorInputOrden = ordenDropdownAbierto ? searchOrden : (ordenSeleccionada ? labelOrden(ordenSeleccionada) : searchOrden);

    const alCambiarInputOrden = (value: string) => {
        setSearchOrden(value);
        setOrdenDropdownAbierto(true);
        if (ordenId) {
            setOrdenId('');
        }
    };

    const alSeleccionarOrden = (o: OrdenOption) => {
        setOrdenId(o.id);
        setOrdenSeleccionada(o);
        setSearchOrden('');
        setOrdenDropdownAbierto(false);
    };

    const alLimpiarOrden = () => {
        setOrdenId('');
        setOrdenSeleccionada(null);
        setSearchOrden('');
        setOrdenDropdownAbierto(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ordenComboboxRef.current && !ordenComboboxRef.current.contains(e.target as Node)) {
                setOrdenDropdownAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setMonto('');
            setDescripcion('');
            setFile(null);
            setOrdenId('');
            setTipo('ingreso');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        await onSave({
            tipo,
            monto: parseFloat(monto),
            descripcion,
            cuenta_id: cuentaId,
            orden_id: ordenId || null
        }, file);

        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        Registrar Movimiento
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    
                    {/* Selector de Tipo */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setTipo('ingreso')}
                            className={`py-2 text-sm font-bold rounded-lg transition-all ${tipo === 'ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ingreso (Cobro)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipo('gasto_operativo')}
                            className={`py-2 text-sm font-bold rounded-lg transition-all ${tipo !== 'ingreso' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Egreso (Gasto)
                        </button>
                    </div>

                    {/* Subtipos de Gasto (Solo si no es ingreso) */}
                    {tipo !== 'ingreso' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo de Egreso</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white font-medium"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                            >
                                <option value="gasto_operativo">Gasto Operativo (Luz, Agua, Arriendo)</option>
                                <option value="pago_proveedor">Pago a Proveedores (Materiales)</option>
                                <option value="nomina">Pago de Nómina (Sueldos)</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Monto ($)</label>
                            <input 
                                required
                                type="number" 
                                min="0.01" 
                                step="0.01"
                                className={`w-full px-3 py-2 rounded-lg border-2 focus:ring-0 outline-none font-mono font-bold text-lg ${tipo === 'ingreso' ? 'border-emerald-100 focus:border-emerald-500 text-emerald-700' : 'border-slate-200 focus:border-red-500'}`}
                                placeholder="0.00"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cuenta Afectada</label>
                            <select 
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                value={cuentaId}
                                onChange={(e) => setCuentaId(e.target.value)}
                            >
                                {cuentas.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre_cuenta}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descripción / Concepto</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={tipo === 'ingreso' ? "Ej: Abono o Pago total reparación..." : "Ej: Pago de refacciones..."}
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />
                    </div>

                    {/* Vincular a Orden: combobox único (escribes y se filtran las opciones) */}
                    <div ref={ordenComboboxRef} className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-2">
                            <Search className="h-3 w-3" /> Vincular a Orden {tipo === 'ingreso' ? '(Necesario para cobros)' : '(Opcional)'}
                        </label>
                        <div className="flex rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                            <input
                                type="text"
                                placeholder="Escribe placa, marca o modelo para buscar..."
                                className="flex-1 min-w-0 px-3 py-2 rounded-l-lg outline-none text-sm"
                                value={valorInputOrden}
                                onChange={(e) => alCambiarInputOrden(e.target.value)}
                                onFocus={() => setOrdenDropdownAbierto(true)}
                            />
                            {ordenSeleccionada && (
                                <button
                                    type="button"
                                    onClick={alLimpiarOrden}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-r-lg shrink-0"
                                    title="Quitar vinculación"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {ordenDropdownAbierto && (
                            <div className="absolute z-10 w-full mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                {buscandoOrden && searchOrden.trim() ? (
                                    <div className="px-3 py-4 text-center text-sm text-slate-500">Buscando...</div>
                                ) : searchOrden.trim() && opcionesSelect.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-slate-500">Sin resultados</div>
                                ) : opcionesSelect.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-slate-500">Escribe para buscar una orden</div>
                                ) : (
                                    opcionesSelect.map(o => (
                                        <button
                                            key={o.id}
                                            type="button"
                                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${ordenId === o.id ? 'bg-blue-50 text-blue-800 font-medium' : 'text-slate-700'}`}
                                            onClick={() => alSeleccionarOrden(o)}
                                        >
                                            {labelOrden(o)}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Subir Comprobante */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Comprobante / Recibo</label>
                        <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                            <Upload className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600 truncate">
                                {file ? file.name : "Adjuntar imagen (JPG, PNG, PDF)"}
                            </span>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                className="hidden" 
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Registrar {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}