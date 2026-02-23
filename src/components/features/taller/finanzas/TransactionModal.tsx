"use client";

import { useState, useEffect } from "react";
import { X, Save, DollarSign, Upload, Loader2, Search } from "lucide-react";
import type { Cuenta } from "@/types/taller"; 
import { useAuth } from "@/hooks/useAuth";

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
    
    // Estado del formulario
    const [tipo, setTipo] = useState('ingreso');
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [ordenId, setOrdenId] = useState(''); 
    const [file, setFile] = useState<File | null>(null);

    // Estado para buscar órdenes
    const [ordenesActivas, setOrdenesActivas] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (cuentas.length > 0 && !cuentaId) {
                setCuentaId(cuentas[0].id);
            }
            cargarOrdenesActivas();
            
            // Si el modal se abre para cobrar una orden específica (Cuentas por Cobrar)
            if (defaultOrdenId) setOrdenId(defaultOrdenId);
            if (defaultTipo) setTipo(defaultTipo);
        } else {
            // Reset state al cerrar
            setMonto('');
            setDescripcion('');
            setFile(null);
            setOrdenId('');
            setTipo('ingreso');
        }
    }, [isOpen, cuentas, defaultOrdenId, defaultTipo]);

    const cargarOrdenesActivas = async () => {
        // Mejorado: Obtenemos las órdenes recientes que NO estén totalmente pagadas 
        // para asegurar que las cuentas por cobrar aparezcan en el select.
        const { data } = await supabase
            .from('taller_ordenes')
            .select('id, numero_orden, vehiculo_placa, vehiculo_modelo')
            .neq('estado_contable', 'pagado')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (data) setOrdenesActivas(data);
    };

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

                    {/* Asignar a Orden (Opcional) */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-2">
                            <Search className="h-3 w-3" /> Vincular a Orden {tipo === 'ingreso' ? '(Necesario para cobros)' : '(Opcional)'}
                        </label>
                        <select 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                            value={ordenId}
                            onChange={(e) => setOrdenId(e.target.value)}
                        >
                            <option value="">-- Sin vinculación --</option>
                            {ordenesActivas.map(o => (
                                <option key={o.id} value={o.id}>
                                    #{o.numero_orden} - {o.vehiculo_modelo} ({o.vehiculo_placa})
                                </option>
                            ))}
                        </select>
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