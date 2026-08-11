"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FileText,
    Search,
    RefreshCw,
    ExternalLink,
    Phone,
    User,
    Calendar,
    Car,
    MessageCircle,
    BadgeDollarSign,
    Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { isAppAdminRole, type PermissionContext } from "@/lib/permissions";

type ProformaRow = {
    id: string;
    created_at: string;
    client_name: string;
    client_id: string | null;
    client_phone: string | null;
    vehicle_description: string | null;
    vehicle_price: number | null;
    down_payment_amount: number | null;
    term_months: number | null;
    monthly_payment: number | null;
    interest_rate: number | null;
    status: string | null;
    pdf_url: string | null;
    created_by: string | null;
    profiles: {
        full_name: string | null;
        phone: string | null;
    } | null;
};

function formatMoney(value: number | null | undefined) {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function openWhatsApp(phoneRaw: string | null) {
    if (!phoneRaw) return;
    let phone = phoneRaw.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "593" + phone.substring(1);
    else if (!phone.startsWith("593")) phone = "593" + phone;
    window.open(`https://wa.me/${phone}`, "_blank");
}

export default function CreditProformasPage() {
    const { user, profile, permissionMap } = useAuth();
    const supabase = useMemo(() => createClient(), []);
    const [proformas, setProformas] = useState<ProformaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sellerFilter, setSellerFilter] = useState<string>("all");
    const [pdfFilter, setPdfFilter] = useState<"all" | "with_pdf" | "without_pdf">("all");
    const [isBackfilling, setIsBackfilling] = useState(false);

    const permCtx: PermissionContext = useMemo(
        () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
        [profile?.role, permissionMap]
    );
    const canSeeAll = isAppAdminRole(permCtx);

    const fetchProformas = useCallback(async () => {
        if (!user?.id) {
            setProformas([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let query = supabase
            .from("credit_proformas")
            .select(
                `
                id,
                created_at,
                client_name,
                client_id,
                client_phone,
                vehicle_description,
                vehicle_price,
                down_payment_amount,
                term_months,
                monthly_payment,
                interest_rate,
                status,
                pdf_url,
                created_by,
                profiles (
                    full_name,
                    phone
                )
            `
            )
            .order("created_at", { ascending: false })
            .limit(500);

        // Vendedores: solo las suyas. Admin: carga todas y filtra por select.
        if (!canSeeAll) {
            query = query.eq("created_by", user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error cargando proformas:", error);
            setProformas([]);
        } else {
            setProformas((data as unknown as ProformaRow[]) || []);
        }
        setIsLoading(false);
    }, [supabase, user?.id, canSeeAll]);

    const backfillMissingPdfs = useCallback(async () => {
        if (!canSeeAll || isBackfilling) return;
        const confirmed = window.confirm(
            "Se generarán PDFs a partir de los datos guardados para las proformas sin archivo. ¿Continuar?"
        );
        if (!confirmed) return;

        setIsBackfilling(true);
        try {
            let totalOk = 0;
            let totalFailed = 0;
            let rounds = 0;
            // Varias pasadas por si hay más del batch
            while (rounds < 10) {
                rounds++;
                const res = await fetch("/api/finance/proformas/backfill-pdfs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ limit: 50 }),
                });
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error || "Error al generar PDFs");
                }
                totalOk += json.ok || 0;
                totalFailed += json.failed || 0;
                if (!json.processed || json.processed === 0 || !json.remainingHint) break;
            }
            alert(`PDFs generados: ${totalOk}. Fallidos: ${totalFailed}.`);
            await fetchProformas();
            setPdfFilter("with_pdf");
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : "No se pudieron generar los PDFs");
        } finally {
            setIsBackfilling(false);
        }
    }, [canSeeAll, isBackfilling, fetchProformas]);

    useEffect(() => {
        void fetchProformas();
    }, [fetchProformas]);

    const sellers = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of proformas) {
            if (!p.created_by) continue;
            const name = p.profiles?.full_name?.trim() || "Sin nombre";
            if (!map.has(p.created_by)) map.set(p.created_by, name);
        }
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, "es"));
    }, [proformas]);

    const sellerScoped = useMemo(() => {
        if (!canSeeAll || sellerFilter === "all") return proformas;
        return proformas.filter((p) => p.created_by === sellerFilter);
    }, [proformas, canSeeAll, sellerFilter]);

    const totalCount = sellerScoped.length;
    const withPdfTotal = useMemo(
        () => sellerScoped.filter((p) => !!p.pdf_url).length,
        [sellerScoped]
    );
    const withoutPdfTotal = totalCount - withPdfTotal;

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return sellerScoped.filter((p) => {
            const hasPdf = !!p.pdf_url;
            if (pdfFilter === "with_pdf" && !hasPdf) return false;
            if (pdfFilter === "without_pdf" && hasPdf) return false;

            if (!q) return true;
            const haystack = [
                p.client_name,
                p.client_id,
                p.client_phone,
                p.vehicle_description,
                p.profiles?.full_name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [sellerScoped, searchTerm, pdfFilter]);

    const filterLabel =
        pdfFilter === "with_pdf"
            ? "con PDF"
            : pdfFilter === "without_pdf"
              ? "sin PDF"
              : null;

    const selectedSellerName =
        sellerFilter === "all"
            ? null
            : sellers.find((s) => s.id === sellerFilter)?.name || "Vendedor";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="h-6 w-6 text-blue-600" />
                        Proformas guardadas
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {canSeeAll
                            ? "Historial de proformas de financiamiento archivadas en el sistema"
                            : "Tus proformas de financiamiento archivadas en el sistema"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchProformas()}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    {canSeeAll && withoutPdfTotal > 0 && (
                        <button
                            type="button"
                            onClick={() => void backfillMissingPdfs()}
                            disabled={isBackfilling}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-60"
                        >
                            {isBackfilling ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            {isBackfilling
                                ? "Generando PDFs..."
                                : `Generar ${withoutPdfTotal} PDFs faltantes`}
                        </button>
                    )}
                    <Link
                        href="/finance"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva proforma
                    </Link>
                </div>
            </div>

            <div className={`grid grid-cols-2 ${canSeeAll ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}>
                <button
                    type="button"
                    onClick={() => setPdfFilter("all")}
                    className={`text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                        pdfFilter === "all"
                            ? "border-slate-900 ring-2 ring-slate-900/10"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Todas
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
                    <p className="text-xs text-slate-400 mt-1">Clic para ver todas</p>
                </button>

                <button
                    type="button"
                    onClick={() => setPdfFilter("with_pdf")}
                    className={`text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                        pdfFilter === "with_pdf"
                            ? "border-blue-600 ring-2 ring-blue-600/15"
                            : "border-slate-200 hover:border-blue-200"
                    }`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Con PDF
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{withPdfTotal}</p>
                    <p className="text-xs text-slate-400 mt-1">Clic para filtrar</p>
                </button>

                <button
                    type="button"
                    onClick={() => setPdfFilter("without_pdf")}
                    className={`text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                        pdfFilter === "without_pdf"
                            ? "border-amber-500 ring-2 ring-amber-500/20"
                            : "border-slate-200 hover:border-amber-200"
                    }`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Sin PDF
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{withoutPdfTotal}</p>
                    <p className="text-xs text-slate-400 mt-1">Clic para filtrar</p>
                </button>

                {canSeeAll && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                            Vendedor
                        </p>
                        <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="all">Todos los vendedores</option>
                            {user?.id && (
                                <option value={user.id}>Yo ({profile?.full_name || "mi usuario"})</option>
                            )}
                            {sellers
                                .filter((s) => s.id !== user?.id)
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 space-y-3">
                    {(filterLabel || selectedSellerName) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                            <p className="text-sm text-slate-600">
                                {selectedSellerName && (
                                    <>
                                        Vendedor:{" "}
                                        <span className="font-semibold text-slate-900">{selectedSellerName}</span>
                                    </>
                                )}
                                {selectedSellerName && filterLabel ? " · " : null}
                                {filterLabel && (
                                    <>
                                        Solo{" "}
                                        <span className="font-semibold text-slate-900">{filterLabel}</span>
                                    </>
                                )}
                                {" · "}
                                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setPdfFilter("all");
                                    setSellerFilter("all");
                                }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                                Quitar filtros
                            </button>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={
                                canSeeAll
                                    ? "Buscar por cliente, cédula, vehículo o asesor..."
                                    : "Buscar por cliente, cédula o vehículo..."
                            }
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-500">Cargando proformas...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">No hay proformas para mostrar</p>
                        <p className="text-sm text-slate-400 mt-1">
                            {pdfFilter === "without_pdf"
                                ? "No hay proformas sin PDF con el filtro actual"
                                : "Genera una desde Financiamiento con Guardar + PDF e Imprimir"}
                        </p>
                        {pdfFilter !== "all" ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setPdfFilter("all");
                                    setSellerFilter("all");
                                }}
                                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                Ver todas
                            </button>
                        ) : (
                            <Link
                                href="/finance"
                                className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                <BadgeDollarSign className="h-4 w-4" />
                                Ir al cotizador
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map((item) => {
                            const sellerName = item.profiles?.full_name || "Sin asesor";
                            return (
                                <div
                                    key={item.id}
                                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row gap-4 lg:items-center justify-between"
                                >
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-slate-900 truncate">
                                                {item.client_name}
                                            </h3>
                                            {item.client_id && (
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    CI/RUC {item.client_id}
                                                </span>
                                            )}
                                            <span
                                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide ${
                                                    item.pdf_url
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                                {item.pdf_url ? "PDF guardado" : "Sin PDF"}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-600 flex items-center gap-2 min-w-0">
                                            <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                                {item.vehicle_description || "Vehículo no especificado"}
                                            </span>
                                        </p>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(item.created_at).toLocaleDateString("es-EC", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1 font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                <User className="h-3 w-3" />
                                                {sellerName}
                                            </span>
                                            {item.client_phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {item.client_phone}
                                                </span>
                                            )}
                                            <span>
                                                Entrada {formatMoney(item.down_payment_amount)} ·{" "}
                                                {item.term_months ?? "—"} meses · Cuota{" "}
                                                {formatMoney(item.monthly_payment)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full lg:w-auto">
                                        {item.client_phone && (
                                            <button
                                                type="button"
                                                onClick={() => openWhatsApp(item.client_phone)}
                                                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                WhatsApp
                                            </button>
                                        )}
                                        {item.pdf_url ? (
                                            <a
                                                href={item.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Ver PDF
                                            </a>
                                        ) : (
                                            <span className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium">
                                                Sin PDF
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isLoading && filtered.length > 0 && (
                    <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
                        Mostrando {filtered.length} proforma{filtered.length === 1 ? "" : "s"}
                        {filterLabel ? ` ${filterLabel}` : ""}
                        {proformas.length >= 500 ? " (máx. 500 más recientes)" : ""}
                    </div>
                )}
            </div>
        </div>
    );
}
