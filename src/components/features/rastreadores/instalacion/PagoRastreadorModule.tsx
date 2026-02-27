"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Calendar, AlertCircle } from "lucide-react";
import { PagoRastreadorInfo, TipoPagoEnum, ContratoGPS, MetodoPagoRastreadorEnum } from "@/types/rastreadores.types";
import { MetodoPagoYComprobante } from "./MetodoPagoYComprobante";

interface PagoRastreadorModuleProps {
    seleccionado: ContratoGPS;
    totalRastreador: number;
    onPagoChange: (info: PagoRastreadorInfo & { tipo_pago: TipoPagoEnum }) => void;
    metodoPago: MetodoPagoRastreadorEnum;
    comprobanteFile: File | null;
    onMetodoPagoChange: (metodo: MetodoPagoRastreadorEnum) => void;
    onComprobantePagoChange: (file: File | null) => void;
    /** Si viene de cartera: sin documento = CONTADO, con documento = CRÉDITO */
    tipoPagoDesdeCartera?: TipoPagoEnum | null;
    /** Valores de crédito traídos desde cartera (cuota mensual, total financiado, número de cuotas) */
    datosCreditoDesdeCartera?: { cuotaMensual: number; totalFinal: number; numeroCuotas: number };
    carteraLoading?: boolean;
    notaVentaParaAviso?: string;
}

export function PagoRastreadorModule({
    seleccionado,
    totalRastreador,
    onPagoChange,
    metodoPago,
    comprobanteFile,
    onMetodoPagoChange,
    onComprobantePagoChange,
    tipoPagoDesdeCartera = null,
    datosCreditoDesdeCartera,
    carteraLoading = false,
    notaVentaParaAviso
}: PagoRastreadorModuleProps) {
    const [tipoPago, setTipoPago] = useState<TipoPagoEnum>(tipoPagoDesdeCartera ?? TipoPagoEnum.CONTADO);

    // Sincronizar tipo de pago cuando cartera responde: sin doc = CONTADO, con doc = CRÉDITO
    useEffect(() => {
        if (tipoPagoDesdeCartera != null) {
            setTipoPago(tipoPagoDesdeCartera);
        }
    }, [tipoPagoDesdeCartera]);

    const pagoInfo = useMemo((): PagoRastreadorInfo => {
        const cuotaMensual = datosCreditoDesdeCartera?.cuotaMensual ?? seleccionado.cuotaMensual ?? 0;
        const numeroCuotas = datosCreditoDesdeCartera?.numeroCuotas ?? seleccionado.numeroCuotas ?? 0;
        const totalContrato = datosCreditoDesdeCartera?.totalFinal ?? (cuotaMensual > 0 && numeroCuotas > 0 ? cuotaMensual * numeroCuotas : 0);
        const porcentaje_rastreador = totalContrato > 0 ? totalRastreador / totalContrato : 0;
        const valor_rastreador_mensual = numeroCuotas > 0 ? totalRastreador / numeroCuotas : 0;

        return {
            totalFinal: totalContrato,
            monto_rastreador: totalRastreador,
            porcentaje_rastreador,
            cuota_mensual: cuotaMensual,
            valor_rastreador_mensual,
            numero_cuotas_credito: numeroCuotas > 0 ? numeroCuotas : undefined,
            tipo_pago: TipoPagoEnum.CREDITO
        };
    }, [seleccionado.cuotaMensual, seleccionado.numeroCuotas, datosCreditoDesdeCartera, totalRastreador]);

    useEffect(() => {
        onPagoChange({ ...pagoInfo, tipo_pago: tipoPago, metodo_pago_medio: metodoPago });
    }, [pagoInfo, tipoPago, metodoPago, onPagoChange]);

    const porcentajeDisplay = (pagoInfo.porcentaje_rastreador * 100).toFixed(2);

    const mostrarAvisoContado = tipoPagoDesdeCartera === TipoPagoEnum.CONTADO && notaVentaParaAviso;

    return (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Forma de Pago del Rastreador</h3>
                <p className="text-sm text-slate-500">Elige como deseas realizar el pago del GPS</p>
            </div>

            {carteraLoading && (
                <p className="text-sm text-slate-500">Consultando cartera por nota de venta…</p>
            )}

            {mostrarAvisoContado && !carteraLoading && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm">
                        No se encontró documento de cartera para nota de venta: <strong className="font-mono">{notaVentaParaAviso}</strong> → se asume pago al contado.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {[TipoPagoEnum.CONTADO, TipoPagoEnum.CREDITO].map((tipo) => (
                    <button
                        key={tipo}
                        onClick={() => setTipoPago(tipo)}
                        className={`p-4 rounded-xl font-bold transition-all ${
                            tipoPago === tipo
                                ? "bg-slate-900 text-white shadow-lg"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            {tipo === TipoPagoEnum.CONTADO ? (
                                <>
                                    <DollarSign size={18} />
                                    <span>CONTADO</span>
                                </>
                            ) : (
                                <>
                                    <Calendar size={18} />
                                    <span>CREDITO</span>
                                </>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {tipoPago === TipoPagoEnum.CONTADO && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
                    <div className="flex items-start gap-3">
                        <DollarSign className="text-green-600 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 font-semibold">Pago Inmediato</p>
                            <p className="text-2xl font-black text-green-600">
                                  ${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                El cliente paga el valor total del rastreador en una sola cuota
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {tipoPago === TipoPagoEnum.CREDITO && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Distribucion en Cuotas</p>

                        <div className="space-y-3 bg-white rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">
                                    Rastreador representa del total
                                </span>
                                <span className="font-bold text-blue-600 text-lg">
                                    {porcentajeDisplay}%
                                </span>
                            </div>

                            <div className="border-t border-slate-200"></div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">
                                    Cuota mensual del vehiculo
                                </span>
                                <span className="font-semibold text-slate-900">
                                    {pagoInfo.cuota_mensual > 0
                                            ? `$${pagoInfo.cuota_mensual.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : "No disponible"}
                                </span>
                            </div>

                            <div className="border-t border-blue-200"></div>

                            <div className="flex items-center justify-between bg-blue-100 p-3 rounded-lg">
                                <span className="text-sm font-semibold text-blue-900">
                                    Parte del GPS por mes
                                </span>
                                <span className="font-black text-blue-600 text-lg">
                                    {pagoInfo.valor_rastreador_mensual > 0
                                            ? `$${pagoInfo.valor_rastreador_mensual.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : "No disponible"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            <strong>Como funciona?</strong> El rastreador se distribuye proporcionalmente en cada cuota del credito.
                            Si el GPS es el 2% del total, entonces cada cuota incluye ese 2% del rastreador.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-4">
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Total Rastreador</p>
                    <p className="font-black text-slate-900 text-sm">
                            ${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-center border-l border-r border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Total Contrato</p>
                    <p className="font-bold text-slate-700 text-sm">
                            ${pagoInfo.totalFinal.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">% en Cuota</p>
                    <p className="font-bold text-slate-700 text-sm">{porcentajeDisplay}%</p>
                </div>
            </div>

            <MetodoPagoYComprobante
                metodoPago={metodoPago}
                comprobanteFile={comprobanteFile}
                onMetodoChange={onMetodoPagoChange}
                onComprobanteSelect={onComprobantePagoChange}
            />
        </div>
    );
}
