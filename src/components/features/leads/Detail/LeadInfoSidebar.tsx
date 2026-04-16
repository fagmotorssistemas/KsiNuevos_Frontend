import { useState, useEffect, useMemo } from "react";
import { Edit3, Loader2, CheckCircle2, Car, DollarSign, CreditCard, ArrowLeftRight, Gauge, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TextArea, Input } from "./ui-components";
import type { Json } from "@/types/supabase";
import type { LeadWithDetails, TradeInCarRow } from "@/types/leads.types";

// Hemos eliminado la extensión manual de test_drive_done
type LeadWithExtension = LeadWithDetails;

const tradeInConditionLabel = (c: string | null) => {
    if (!c) return null;
    const map: Record<string, string> = {
        excelente: "Excelente",
        bueno: "Bueno",
        regular: "Regular",
        malo: "Malo",
    };
    return map[c] ?? c.charAt(0).toUpperCase() + c.slice(1);
};

const formatTradeInMoney = (n: number | null) => {
    if (n == null || Number.isNaN(Number(n))) return null;
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(n));
};

/** Textos de intercambio / parte de pago guardados en behavior_signals (Kommo, bots, etc.) cuando aún no hay fila en trade_in_cars */
function tradeInLinesFromBehaviorSignals(signals: Json | null | undefined, depth = 0): string[] {
    if (signals == null || depth > 5) return [];
    let root: unknown = signals;
    if (typeof signals === "string") {
        try {
            root = JSON.parse(signals);
        } catch {
            return /\b(intercambio|parte\s*de\s*pago|trade\s*in)\b/i.test(signals) ? [signals.trim()] : [];
        }
    }
    if (typeof root !== "object" || root === null || Array.isArray(root)) return [];

    const lines: string[] = [];
    const o = root as Record<string, unknown>;

    const pushVehicleShape = (val: unknown) => {
        if (!val || typeof val !== "object" || Array.isArray(val)) return;
        const v = val as Record<string, unknown>;
        const brand = v.brand ?? v.marca ?? v.make;
        const model = v.model ?? v.modelo;
        const year = v.year ?? v.anio ?? v.año;
        if (brand || model) {
            lines.push([brand, model, year].filter((x) => x != null && String(x).trim() !== "").map(String).join(" "));
        }
    };

    const directKeys = [
        "trade_in",
        "tradeIn",
        "trade_in_vehicle",
        "vehicle_trade_in",
        "vehiculo_intercambio",
        "vehiculo_entrega",
        "vehiculo_parte_pago",
        "intercambio",
        "parte_de_pago",
        "quiere_intercambiar",
        "has_trade_in",
        "tiene_vehiculo_entrega",
    ];

    for (const key of directKeys) {
        if (!(key in o)) continue;
        const val = o[key];
        if (typeof val === "string" && val.trim()) lines.push(val.trim());
        else if (typeof val === "boolean" && val) lines.push("Cliente indicó interés en entregar vehículo como parte de pago o intercambio.");
        else pushVehicleShape(val);
    }

    const nestKeys = ["custom_fields", "kommo", "crm", "fields", "metadata", "payload"];
    for (const nk of nestKeys) {
        const inner = o[nk];
        if (inner && typeof inner === "object" && !Array.isArray(inner)) {
            lines.push(...tradeInLinesFromBehaviorSignals(inner as Json, depth + 1));
        }
    }

    for (const [k, val] of Object.entries(o)) {
        if (/trade|intercambio|parte|entrega|veh[ií]culo|usado|take.?in/i.test(k)) {
            if (typeof val === "string" && val.trim()) lines.push(`${k}: ${val.trim()}`);
            else pushVehicleShape(val);
        }
    }

    return [...new Set(lines.filter(Boolean))];
}

/** Frases del resumen ejecutivo donde el vendedor/cliente menciona intercambio o parte de pago */
function tradeInLinesFromResume(resume: string | null | undefined): string[] {
    if (!resume?.trim()) return [];
    const chunks = resume.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const keyword =
        /\b(intercambio|parte\s*de\s*pago|trade\s*-?\s*in|entrega(r)?\s+(su|el|tu)\s+veh|veh[ií]culo\s+a\s+cambio|recibir\s+(su|el)\s+usado|dar\s+su\s+auto)\b/i;
    const hits = chunks.filter((c) => keyword.test(c));
    return [...new Set(hits)].slice(0, 5);
}

export function LeadInfoSidebar({ lead }: { lead: LeadWithExtension }) {
    const { supabase } = useAuth();
    
    // --- ESTADOS ---
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // ELIMINADO: Estados de Test Drive (testDriveDone, isUpdatingTestDrive)

    // NUEVO: Estados Financieros Editables
    const [budget, setBudget] = useState((lead as any).presupuesto_cliente?.toString() || "");
    const [wantsFinancing, setWantsFinancing] = useState(lead.financing || false);
    const [isSavingFinance, setIsSavingFinance] = useState(false);
    const [localCars, setLocalCars] = useState(lead.interested_cars || []);

    const [tradeInRows, setTradeInRows] = useState<TradeInCarRow[]>(() => lead.trade_in_cars ?? []);
    const [tradeInLoading, setTradeInLoading] = useState(true);

    const crmTradeLines = useMemo(
        () => tradeInLinesFromBehaviorSignals(lead.behavior_signals),
        [lead.behavior_signals]
    );

    const resumeTradeLines = useMemo(() => tradeInLinesFromResume(lead.resume), [lead.resume]);

    /** Consola: filtra por "trade_in_debug" */
    const TI = "[trade_in_debug]";

    useEffect(() => {
        let cancelled = false;

        const dedupeByRowId = (rows: TradeInCarRow[]) => {
            const m = new Map<number, TradeInCarRow>();
            for (const r of rows) {
                if (r?.id != null) m.set(Number(r.id), r);
            }
            return [...m.values()].sort((a, b) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return ta - tb;
            });
        };

        (async () => {
            setTradeInLoading(true);

            const leadPk = Number(lead.id);
            const kommoId =
                lead.lead_id_kommo != null && !Number.isNaN(Number(lead.lead_id_kommo))
                    ? Number(lead.lead_id_kommo)
                    : null;

            console.info(TI, "LeadInfoSidebar → cargando trade_in_cars", {
                lead_id_interno: leadPk,
                lead_id_kommo: kommoId,
                trade_in_desde_listado: (lead.trade_in_cars ?? []).length,
            });

            let rows: TradeInCarRow[] = [];
            const errors: unknown[] = [];

            // 1) Relación canónica: trade_in_cars.lead_id = leads.id (PK interno)
            console.info(TI, "Paso 1: from('trade_in_cars').eq('lead_id', lead.id)", { lead_id: leadPk });

            const q1 = await supabase
                .from("trade_in_cars")
                .select("*")
                .eq("lead_id", leadPk)
                .order("created_at", { ascending: true });

            if (q1.error) {
                errors.push(q1.error);
                console.warn(TI, "Paso 1: ERROR", {
                    code: q1.error.code,
                    message: q1.error.message,
                    details: q1.error,
                });
            } else {
                console.info(TI, "Paso 1: OK", { filas: q1.data?.length ?? 0, data: q1.data });
            }
            if (q1.data?.length) rows = q1.data;

            // 2) Mismo dato vía embed en leads (útil si RLS permite leer la relación pero no la tabla suelta)
            if (!cancelled && rows.length === 0) {
                console.info(TI, "Paso 2: from('leads').select('id, trade_in_cars(*)').eq('id', …)", { id: leadPk });

                const q2 = await supabase
                    .from("leads")
                    .select("id, trade_in_cars(*)")
                    .eq("id", leadPk)
                    .maybeSingle();

                if (q2.error) {
                    errors.push(q2.error);
                    console.warn(TI, "Paso 2: ERROR", q2.error);
                } else {
                    const embedded = (q2.data as { trade_in_cars?: TradeInCarRow[] | null } | null)?.trade_in_cars;
                    console.info(TI, "Paso 2: OK", {
                        filas_embed: embedded?.length ?? 0,
                        trade_in_cars: embedded,
                    });
                    if (embedded?.length) rows = embedded;
                }
            }

            // 3) Fallback: integraciones que guardaron lead_id_kommo en lead_id (no coincide con PK de leads)
            if (!cancelled && rows.length === 0 && kommoId != null && !Number.isNaN(kommoId) && kommoId !== leadPk) {
                console.info(TI, "Paso 3: from('trade_in_cars').eq('lead_id', lead_id_kommo)", {
                    lead_id_como_kommo: kommoId,
                });

                const q3 = await supabase
                    .from("trade_in_cars")
                    .select("*")
                    .eq("lead_id", kommoId)
                    .order("created_at", { ascending: true });

                if (q3.error) {
                    errors.push(q3.error);
                    console.warn(TI, "Paso 3: ERROR", q3.error);
                } else {
                    console.info(TI, "Paso 3: OK", { filas: q3.data?.length ?? 0, data: q3.data });
                }
                if (q3.data?.length) rows = q3.data;
            }

            if (cancelled) return;

            if (rows.length === 0 && errors.length > 0) {
                console.error(TI, "Sin filas y hubo errores en al menos un paso:", errors);
                console.error("trade_in_cars (todas las estrategias fallaron o sin filas):", errors);
            }

            const finalRows = rows.length > 0 ? dedupeByRowId(rows) : lead.trade_in_cars ?? [];
            console.info(TI, "Resultado final LeadInfoSidebar", {
                filasUsadas: finalRows.length,
                origen: rows.length > 0 ? "consultas" : "embed listado o vacío",
            });

            setTradeInRows(finalRows);
            setTradeInLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [lead.id, lead.lead_id_kommo, supabase]);

    // NUEVO: Fetch para obtener los detalles del inventario si hay inventory_id
    useEffect(() => {
        const fetchInventoryData = async () => {
            if (lead.interested_cars && lead.interested_cars.length > 0) {
                const carsWithInventory = await Promise.all(
                    lead.interested_cars.map(async (car: any) => {
                        if (car.inventory_id) {
                            const { data, error: invErr } = await (supabase as any)
                                .from("inventoryoracle")
                                .select("brand, model, year, color")
                                .eq("id", car.inventory_id)
                                .maybeSingle();

                            if (invErr) {
                                console.warn("[trade_in_debug] inventoryoracle (interested_cars):", invErr.message || invErr);
                            }
                            if (data) {
                                return {
                                    ...car,
                                    brand: data.brand,
                                    model: data.model,
                                    year: data.year,
                                    color_preference: data.color || car.color_preference,
                                };
                            }
                        }
                        return car;
                    })
                );
                setLocalCars(carsWithInventory);
            }
        };

        fetchInventoryData();
    }, [lead.interested_cars, supabase]);

    // Guardar Resumen
    const handleSaveResume = async () => {
        if (resume === lead.resume) return;
        setIsSavingResume(true);
        await supabase.from('leads').update({ resume }).eq('id', lead.id);
        setIsSavingResume(false);
    };

    // ELIMINADO: handleToggleTestDrive

    // NUEVO: Guardar Datos Financieros (Al salir del input o cambiar toggle)
    const handleSaveFinance = async (newBudget?: string, newFinancing?: boolean) => {
        setIsSavingFinance(true);
        
        const budgetToSave = newBudget !== undefined ? String(parseFloat(newBudget) || 0) : String(parseFloat(budget) || 0);
        const financingToSave = newFinancing !== undefined ? newFinancing : wantsFinancing;

        await supabase.from('leads').update({ 
            presupuesto_cliente: budgetToSave,
            financing: financingToSave
        }).eq('id', lead.id);
        
        setIsSavingFinance(false);
    };


    return (
        // CORRECCIÓN VISUAL: Quitamos "md:w-1/3" y usamos "w-full h-full"
        // Ahora llena el contenedor padre del Modal correctamente.
        <div className="w-full h-full bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">
            
            {/* 1. RESUMEN */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Edit3 className="h-3 w-3" /> Resumen Ejecutivo
                    </label>
                    <div className="flex items-center gap-1.5 h-4">
                        {isSavingResume ? (
                            <><Loader2 className="h-3 w-3 animate-spin text-brand-600" /><span className="text-[10px] text-brand-600">Guardando...</span></>
                        ) : (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-slate-400">Guardado</span></>
                        )}
                    </div>
                </div>
                <TextArea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    onBlur={handleSaveResume}
                    placeholder="Estatus actual del cliente..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm min-h-[120px] resize-none focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
            </div>

            {/* 2. TEST DRIVE - SECCIÓN ELIMINADA */}

            {/* 3. VEHÍCULOS */}
            <div className="mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Vehículos de Interés</label>
                {localCars && localCars.length > 0 ? (
                    <div className="space-y-3">
                        {localCars.map((car) => (
                            <div key={car.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Car className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm text-slate-800 block">{car.brand} {car.model}</span>
                                    <span className="text-xs text-slate-500">{car.year} • {car.color_preference || 'Sin color'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-slate-200 text-center">Sin vehículos seleccionados.</p>
                )}
            </div>

            {/* Vehículo en intercambio: tabla trade_in_cars y/o indicadores en behavior_signals (CRM) */}
            {(tradeInLoading ||
                tradeInRows.length > 0 ||
                crmTradeLines.length > 0 ||
                resumeTradeLines.length > 0) && (
                <div className="mb-8">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600" />
                            Parte de pago / intercambio
                        </label>
                        {tradeInLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />}
                    </div>

                    {tradeInRows.length > 0 && (
                    <div className="space-y-3">
                        {tradeInRows.map((ti) => (
                            <div
                                key={ti.id}
                                className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm ring-1 ring-amber-100"
                            >
                                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600" aria-hidden />
                                <div className="pl-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 leading-snug">
                                                {ti.brand} {ti.model}
                                                {ti.year != null ? (
                                                    <span className="font-normal text-slate-600"> · {ti.year}</span>
                                                ) : null}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                                {ti.mileage != null && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-amber-100">
                                                        <Gauge className="h-3 w-3 text-amber-700" />
                                                        {Number(ti.mileage).toLocaleString("es-EC")} km
                                                    </span>
                                                )}
                                                {tradeInConditionLabel(ti.condition) && (
                                                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
                                                        {tradeInConditionLabel(ti.condition)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {formatTradeInMoney(ti.estimated_value) && (
                                        <p className="mt-3 text-xs text-slate-500">
                                            Valor estimado{" "}
                                            <span className="font-semibold text-slate-800">
                                                {formatTradeInMoney(ti.estimated_value)}
                                            </span>
                                        </p>
                                    )}
                                    {ti.notes?.trim() && (
                                        <p className="mt-2 border-t border-amber-100/80 pt-2 text-xs leading-relaxed text-slate-600">
                                            {ti.notes.trim()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    )}

                    {!tradeInLoading && tradeInRows.length === 0 && crmTradeLines.length > 0 && (
                        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm ring-1 ring-amber-100">
                            <div className="flex gap-2 text-xs text-amber-900/90 mb-2">
                                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                <span>
                                    Indicación en CRM (<code className="text-[10px] bg-amber-100/80 px-1 rounded">behavior_signals</code>
                                    ). Sin registro aún en <code className="text-[10px] bg-amber-100/80 px-1 rounded">trade_in_cars</code>.
                                </span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                                {crmTradeLines.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!tradeInLoading && tradeInRows.length === 0 && resumeTradeLines.length > 0 && (
                        <div
                            className={`rounded-xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm ring-1 ring-amber-100 ${crmTradeLines.length > 0 ? "mt-3" : ""}`}
                        >
                            <div className="flex gap-2 text-xs text-amber-900/90 mb-2">
                                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                <span>Mencionado en el resumen ejecutivo (sin ficha en trade_in_cars).</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                                {resumeTradeLines.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                </div>
            )}

            {/* 4. FINANZAS (EDITABLE) */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-3 w-3" /> Detalles Financieros
                    </label>
                    {isSavingFinance && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    {/* Input Presupuesto */}
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Presupuesto ($)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                onBlur={() => handleSaveFinance(budget)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Switch Financiamiento */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700">Solicita Financiamiento</span>
                        </div>
                        <button
                            onClick={() => {
                                const newVal = !wantsFinancing;
                                setWantsFinancing(newVal);
                                handleSaveFinance(undefined, newVal);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${wantsFinancing ? 'bg-blue-500' : 'bg-slate-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${wantsFinancing ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}