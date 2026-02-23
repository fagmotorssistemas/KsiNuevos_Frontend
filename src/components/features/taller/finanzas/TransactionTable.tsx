import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, FileText, Car, Search, Filter, Info, X, ClipboardList, User, Phone } from "lucide-react";
import type { Transaccion } from "@/hooks/taller/useFinanzas";

interface TransactionTableProps {
    transacciones: Transaccion[];
}

export function TransactionTable({ transacciones }: TransactionTableProps) {
    const [search, setSearch] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState("todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [ordenModal, setOrdenModal] = useState<Transaccion['orden'] | null>(null);

    const tiposEgreso = Array.from(new Set(transacciones.map(t => t.tipo))).filter(t => t !== 'ingreso');

    const transaccionesFiltradas = transacciones.filter(tx => {
        const textMatch = 
            tx.descripcion.toLowerCase().includes(search.toLowerCase()) || 
            (tx.cuenta?.nombre_cuenta || "").toLowerCase().includes(search.toLowerCase());
        
        let typeMatch = false;
        if (tipoFiltro === "todos") typeMatch = true;
        else if (tipoFiltro === "egresos") typeMatch = tx.tipo !== "ingreso"; 
        else typeMatch = tx.tipo === tipoFiltro; 
        
        const txDate = new Date(tx.fecha_transaccion);
        const dateFromMatch = !dateFrom || txDate >= new Date(dateFrom);
        const dateToMatch = !dateTo || txDate <= new Date(dateTo + 'T23:59:59');

        return textMatch && typeMatch && dateFromMatch && dateToMatch;
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            
            <div className="p-5 border-b border-slate-100 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Filter className="h-5 w-5 text-slate-400" />
                        Historial de Movimientos
                    </h3>
                    <span className="text-sm text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                        {transaccionesFiltradas.length} resultados
                    </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por concepto o cuenta..." 
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 outline-none bg-slate-50 transition-shadow"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <select 
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 outline-none bg-slate-50 cursor-pointer text-slate-700"
                            value={tipoFiltro}
                            onChange={(e) => setTipoFiltro(e.target.value)}
                        >
                            <option value="todos">Todos los Movimientos</option>
                            <option value="ingreso">Solo Ingresos (+)</option>
                            <option value="egresos">Todos los Egresos (-)</option>
                            
                            {tiposEgreso.length > 0 && <optgroup label="Egresos Específicos">
                                {tiposEgreso.map(tipo => (
                                    <option key={tipo} value={tipo}>
                                        Filtro: {tipo.replace(/_/g, ' ').toUpperCase()}
                                    </option>
                                ))}
                            </optgroup>}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            className="w-full px-2 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-400 outline-none bg-slate-50 text-slate-600"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            title="Fecha Desde"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date" 
                            className="w-full px-2 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-400 outline-none bg-slate-50 text-slate-600"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            title="Fecha Hasta"
                        />
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Tipo / Fecha</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Cuenta</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-center">Recibo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transaccionesFiltradas.length > 0 ? (
                            transaccionesFiltradas.map((tx) => {
                                const esIngreso = tx.tipo === 'ingreso';
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg border ${esIngreso ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-100 border-slate-200 text-red-500'}`}>
                                                    {esIngreso ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 capitalize text-[13px]">{tx.tipo.replace(/_/g, ' ')}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {new Date(tx.fecha_transaccion).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-800 font-medium text-sm">{tx.descripcion}</p>
                                            {tx.orden && (
                                                <button 
                                                    onClick={() => setOrdenModal(tx.orden!)}
                                                    className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1.5 bg-slate-100 hover:bg-slate-200 w-fit px-2 py-1 rounded font-medium border border-slate-200 transition-colors cursor-pointer"
                                                    title="Ver información de esta orden"
                                                >
                                                    <Car className="h-3 w-3 text-slate-400" />
                                                    {tx.orden.vehiculo_marca} {tx.orden.vehiculo_modelo} ({tx.orden.vehiculo_placa})
                                                    <Info className="h-3 w-3 text-slate-400 ml-1" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 bg-white px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200 whitespace-nowrap">
                                                {tx.cuenta?.nombre_cuenta}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold text-sm ${esIngreso ? 'text-slate-800' : 'text-slate-500'}`}>
                                                {esIngreso ? '+' : '-'}${tx.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {tx.comprobante_url ? (
                                                <a 
                                                    href={tx.comprobante_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                                    title="Ver Comprobante Original"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-400">
                                    <Search className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                                    No se encontraron movimientos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE INFORMACIÓN DE ORDEN (DISEÑO LIMPIO) */}
            {ordenModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-slate-500" />
                                Detalles de la Orden
                            </h3>
                            <button onClick={() => setOrdenModal(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vehículo</span>
                                <div className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                    <Car className="h-5 w-5 text-slate-400" />
                                    {ordenModal.vehiculo_marca || 'N/A'} {ordenModal.vehiculo_modelo || 'N/A'}
                                </div>
                                <div className="mt-1.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded w-fit border border-slate-200">
                                    Placa: {ordenModal.vehiculo_placa}
                                </div>
                            </div>
                            
                            <div className="h-px bg-slate-100 w-full" />
                            
                            {/* Información del Cliente Agregada */}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Propietario / Cliente</span>
                                <div className="space-y-1.5">
                                    <p className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                        <User className="h-4 w-4 text-slate-400" /> 
                                        {ordenModal.cliente?.nombre_completo || 'Cliente no registrado'}
                                    </p>
                                    {ordenModal.cliente?.telefono && (
                                        <p className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="h-4 w-4 text-slate-400" /> 
                                            {ordenModal.cliente.telefono}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />
                            
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado en Taller</span>
                                <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                    {ordenModal.estado?.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => setOrdenModal(null)} className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}