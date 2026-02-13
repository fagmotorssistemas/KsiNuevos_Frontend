import { Wallet, TrendingUp, Package, ArrowUpRight, DollarSign, AlertCircle } from "lucide-react";

interface FinancialKPIsProps {
    data: {
        valorInventario: number;
        ventasTotales: number;
        costosTotales: number;
        utilidadBruta: number;
        margenGlobal: number;
        itemsVendidos: number;
        itemsStock: number;
    } | null;
    loading: boolean;
}

export function FinancialKPIs({ data, loading }: FinancialKPIsProps) {
    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Calculando finanzas...</div>;
    if (!data) return <div className="p-10 text-center text-red-400">Error cargando datos financieros</div>;

    return (
        <div className="space-y-6">
            {/* TARJETA PRINCIPAL: UTILIDAD */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1 rounded-lg w-fit text-xs uppercase tracking-wider">
                            <ArrowUpRight size={14} /> 
                            Margen Global: {data.margenGlobal.toFixed(1)}%
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-1">Utilidad Neta Real</p>
                        <h2 className="text-5xl font-black tracking-tight">${data.utilidadBruta.toLocaleString()}</h2>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="p-3 bg-white/10 rounded-2xl inline-flex mb-2">
                            <Wallet size={32} className="text-white"/>
                        </div>
                        <p className="text-xs text-slate-400">Ganancia libre tras costos</p>
                    </div>
                </div>
            </div>

            {/* GRILLA SECUNDARIA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. VENTAS (INGRESOS) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Vendido</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">${data.ventasTotales.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20}/></div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold flex gap-1">
                        <span className="text-slate-900">{data.itemsVendidos}</span> dispositivos instalados
                    </p>
                </div>

                {/* 2. COSTOS (GASTOS) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Mercadería</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">${data.costosTotales.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><DollarSign size={20}/></div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">Costo de equipos vendidos</p>
                </div>

                {/* 3. STOCK (ACTIVO) */}
                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-amber-700/60 uppercase tracking-wider">Valor en Bodega</p>
                            <h3 className="text-2xl font-black text-amber-900 mt-1">${data.valorInventario.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-white text-amber-600 rounded-lg shadow-sm"><Package size={20}/></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-amber-800 font-bold">
                            <span className="text-amber-950">{data.itemsStock}</span> unidades en stock
                        </p>
                        {data.itemsStock < 5 && (
                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <AlertCircle size={8}/> BAJO
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}