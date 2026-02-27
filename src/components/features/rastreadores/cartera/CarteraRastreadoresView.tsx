"use client";

import { useEffect, useState } from "react";
import { Wallet, RefreshCw, Calendar, DollarSign, FileText } from "lucide-react";
import { rastreadoresService } from "@/services/rastreadores.service";
import { walletService } from "@/services/wallet.service";
import type { ItemCarteraRastreador } from "@/services/rastreadores/cartera-rastreadores.service";

function formatFecha(f: string | null): string {
    if (!f) return "—";
    try {
        return new Date(f).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return "—";
    }
}

function formatMoney(n: number): string {
    return new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function CarteraRastreadoresView() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ItemCarteraRastreador[]>([]);
    const [enrichedData, setEnrichedData] = useState<Map<string, { 
        porcentajeRastreador: number;
        cuotaRastreadorMensual: number;
        totalContrato: number;
        numeroCuotas: number;
        fechaVencimiento: string | null;
        diasParaCobro: number | null;
        montoPagadoRastreador: number;
        montoPorCobrarRastreador: number;
    }>>(new Map());
    const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CREDITO' | 'CONTADO'>('TODOS');

    const load = async () => {
        setLoading(true);
        try {
            const data = await rastreadoresService.getCarteraRastreadores();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // ✨ Enriquecer datos con cuota mensual y plazo desde cartera
    useEffect(() => {
        const enrichItems = async () => {
            const newEnrichedData = new Map();
            
            for (const item of items) {
                // Si NO tiene nota de venta, es CONTADO (pago completo)
                if (!item.nota_venta) {
                    continue; // Sin nota de venta, no hay crédito que calcular
                }

                // Si tiene nota de venta, buscar en cartera
                try {
                    const documento = await walletService.getDocumentoByNumeroFisico(item.nota_venta);
                    
                    if (!documento) {
                        console.warn(`⚠️ No se encontró documento para nota: ${item.nota_venta}`);
                        continue;
                    }
                    
                    const plazoTotal = documento.totalCuotas ?? documento.numeroCuota ?? 0;
                    const cuotaMensualVehiculo = documento.valorOriginal ?? 0;
                    const precioGPS = item.precio_total ?? 0;
                    
                    // Validar que tengamos datos válidos
                    if (plazoTotal <= 0 || cuotaMensualVehiculo <= 0 || precioGPS <= 0) {
                        continue;
                    }
                    
                    const totalContrato = cuotaMensualVehiculo * plazoTotal;
                    const porcentajeRastreador = precioGPS / totalContrato;
                    const cuotaRastreadorMensual = precioGPS / plazoTotal;
                    
                    // Calcular cuánto se ha pagado del rastreador
                    // Si está en cuota 3, significa que pagó 2 cuotas (3 - 1)
                    const cuotasCompletadas = Math.max(0, (documento.numeroCuota ?? 1) - 1);
                    const montoPagadoRastreador = Math.max(0, cuotasCompletadas * cuotaRastreadorMensual);
                    
                    // Calcular cuánto falta por cobrar del rastreador
                    const montoPorCobrarRastreador = Math.max(0, precioGPS - montoPagadoRastreador);
                    
                    // Calcular días para cobro (desde hoy hasta fecha de vencimiento)
                    let diasParaCobro: number | null = null;
                    if (documento.fechaVencimiento) {
                        try {
                            // Fecha actual en Ecuador (UTC-5)
                            const hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            
                            // Fecha de vencimiento
                            const fechaVenc = new Date(documento.fechaVencimiento);
                            fechaVenc.setHours(0, 0, 0, 0);
                            
                            // Calcular diferencia en días
                            const diffTime = fechaVenc.getTime() - hoy.getTime();
                            diasParaCobro = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        } catch (e) {
                            // Error silencioso en cálculo de días
                        }
                    }
                    
                    newEnrichedData.set(item.id, {
                        porcentajeRastreador,
                        cuotaRastreadorMensual,
                        totalContrato,
                        numeroCuotas: plazoTotal,
                        fechaVencimiento: documento.fechaVencimiento ?? null,
                        diasParaCobro,
                        montoPagadoRastreador,
                        montoPorCobrarRastreador
                    });
                } catch (err) {
                    console.error(`❌ Error enriqueciendo item ${item.id} (nota: ${item.nota_venta}):`, err);
                }
            }
            
            setEnrichedData(newEnrichedData);
        };

        if (items.length > 0) {
            enrichItems();
        }
    }, [items]);

    // Determinar tipo basado en si se encontró documento en cartera
    // Crédito = tiene nota_venta Y se encontró en cartera (está en enrichedData)
    // Contado = no tiene nota_venta O no se encontró en cartera
    const creditos = items.filter((i) => i.nota_venta && i.nota_venta.trim() !== "" && enrichedData.has(i.id));
    const contados = items.filter((i) => !i.nota_venta || i.nota_venta.trim() === "" || !enrichedData.has(i.id));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Wallet size={26} className="text-[#E11D48]" />
                        Cartera de rastreadores
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Cuentas por cobrar (crédito) e ingresos por registrar (contado)
                    </p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Actualizar
                </button>
            </div>

            {!loading && items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                        {[
                            { id: 'TODOS' as const, label: 'Todos' },
                            { id: 'CREDITO' as const, label: 'Crédito' },
                            { id: 'CONTADO' as const, label: 'Contado' },
                        ].map((opt) => {
                            const isActive = filtroTipo === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setFiltroTipo(opt.id)}
                                    className={[
                                        "px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full transition-all",
                                        isActive
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-900",
                                    ].join(" ")}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                            <Calendar size={11} />
                            <strong className="font-black">{creditos.length}</strong> a crédito
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <DollarSign size={11} />
                            <strong className="font-black">{contados.length}</strong> al contado
                        </span>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-slate-400">
                    <RefreshCw size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium">Cargando cartera...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
                    <Wallet size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No hay ventas registradas aún</p>
                    <p className="text-xs text-slate-400 mt-1">Las ventas a crédito y contado aparecerán aquí</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente / Nota</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Dispositivo</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Precio total</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Financiamiento GPS</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Próx. venc.</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Días para cobro</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Por cobrar</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Ingreso contable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    // Es CRÉDITO solo si tiene nota_venta Y se encontró el documento en cartera
                                    const esCredito = row.nota_venta && row.nota_venta.trim() !== "" && enrichedData.has(row.id);

                                    if (filtroTipo === 'CREDITO' && !esCredito) return null;
                                    if (filtroTipo === 'CONTADO' && esCredito) return null;
                                    
                                    return (
                                    <tr
                                        key={row.id}
                                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                                                    esCredito
                                                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                                }`}
                                            >
                                                {esCredito ? (
                                                    <>
                                                        <Calendar size={12} />
                                                        Crédito
                                                    </>
                                                ) : (
                                                    <>
                                                        <DollarSign size={12} />
                                                        Contado
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {row.nombre_concesionaria || row.cliente_nombre || row.identificacion_cliente || "—"}
                                                </span>
                                                {row.nota_venta && (
                                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                                        <FileText size={10} />
                                                        {row.nota_venta}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5 text-sm">
                                                {row.modelo && <span className="font-semibold text-slate-800">{row.modelo}</span>}
                                                {row.imei && (
                                                    <span className="text-xs text-slate-500 font-mono">{row.imei}</span>
                                                )}
                                                {!row.modelo && !row.imei && "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                            ${formatMoney(row.precio_total)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {enrichedData.has(row.id) ? (
                                                <span className="font-bold text-slate-900">
                                                    ${formatMoney(enrichedData.get(row.id)!.cuotaRastreadorMensual)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                                                    <DollarSign size={11} />
                                                    PAGO ÚNICO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {esCredito && enrichedData.has(row.id) && enrichedData.get(row.id)?.fechaVencimiento ? (
                                                <span className="flex items-center gap-1">
                                                    {formatFecha(enrichedData.get(row.id)!.fechaVencimiento)}
                                                </span>
                                            ) : esCredito && row.proxima_cuota_fecha ? (
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    {formatFecha(row.proxima_cuota_fecha)}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(() => {
                                                const dataEnriquecida = enrichedData.get(row.id);
                                                const diasCobro = dataEnriquecida?.diasParaCobro;
                                                
                                                if (esCredito && diasCobro != null) {
                                                    return (
                                                        <span
                                                            className={`inline-flex font-bold text-sm px-2 py-1 rounded-lg ${
                                                                diasCobro < 0
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : diasCobro <= 7
                                                                    ? "bg-amber-100 text-amber-800"
                                                                    : "bg-slate-100 text-slate-700"
                                                            }`}
                                                        >
                                                            {diasCobro < 0
                                                                ? `${Math.abs(diasCobro)} días vencido`
                                                                : diasCobro === 0
                                                                ? "Hoy"
                                                                : `${diasCobro} días`}
                                                        </span>
                                                    );
                                                } else if (esCredito && row.dias_para_cobro != null) {
                                                    return (
                                                        <span className="inline-flex font-bold text-sm px-2 py-1 rounded-lg text-slate-400 border border-slate-200">
                                                            {row.dias_para_cobro < 0
                                                                ? `${Math.abs(row.dias_para_cobro)} días vencido`
                                                                : row.dias_para_cobro === 0
                                                                ? "Hoy"
                                                                : `${row.dias_para_cobro} días`}
                                                        </span>
                                                    );
                                                }
                                                return "—";
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {esCredito && enrichedData.has(row.id) ? (() => {
                                                const data = enrichedData.get(row.id);
                                                const monto = data?.montoPorCobrarRastreador;
                                                
                                                if (monto != null && !isNaN(monto) && monto > 0) {
                                                    return (
                                                        <span className="font-black text-rose-600">
                                                            ${formatMoney(monto)}
                                                        </span>
                                                    );
                                                }
                                                return <span className="text-slate-400">—</span>;
                                            })() : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {!esCredito ? (
                                                row.ingreso_registrado === true ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        Registrado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        Pendiente de registro
                                                    </span>
                                                )
                                            ) : enrichedData.has(row.id) ? (() => {
                                                const data = enrichedData.get(row.id);
                                                const monto = data?.montoPagadoRastreador;
                                                
                                                if (monto != null && !isNaN(monto) && monto > 0) {
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-slate-900">
                                                                ${formatMoney(monto)}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                Pagado del GPS
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return <span className="text-slate-400">—</span>;
                                            })() : (
                                                "—"
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                            <strong className="text-slate-700">{creditos.length}</strong> a crédito (cuenta por cobrar)
                            <span className="mx-2">·</span>
                            <strong className="text-slate-700">{contados.length}</strong> al contado
                        </span>
                        <span>
                            Total GPS por cobrar:{" "}
                            <strong className="text-rose-600">
                                ${formatMoney(
                                    creditos.reduce((sum, item) => {
                                        const data = enrichedData.get(item.id);
                                        return sum + (data?.montoPorCobrarRastreador ?? 0);
                                    }, 0)
                                )}
                            </strong>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
