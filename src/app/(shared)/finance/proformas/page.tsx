"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FileText,
    Search,
    RefreshCw,
    ExternalLink,
    MessageCircle,
    BadgeDollarSign,
    Plus,
    Car,
    Calendar,
    ChevronRight,
    X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

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

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function initialsFromName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function openWhatsApp(phoneRaw: string | null) {
    if (!phoneRaw) return;
    let phone = phoneRaw.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "593" + phone.substring(1);
    else if (!phone.startsWith("593")) phone = "593" + phone;
    window.open(`https://wa.me/${phone}`, "_blank");
}

function normalizeClientName(name: string) {
    return name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/\s+/g, " ");
}

function normalizeCedula(value: string | null | undefined) {
    return (value || "").replace(/\D/g, "");
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
        const trimmed = value?.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
    }
    return out;
}

type ClientGroup = {
    key: string;
    name: string;
    clientIds: string[];
    phones: string[];
    items: ProformaRow[];
    latestAt: string;
};

function buildClientGroup(key: string, items: ProformaRow[]): ClientGroup {
    const sorted = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
        key,
        name: sorted[0]?.client_name?.trim() || "Sin nombre",
        clientIds: uniqueNonEmpty(sorted.map((item) => item.client_id)),
        phones: uniqueNonEmpty(sorted.map((item) => item.client_phone)),
        items: sorted,
        latestAt: sorted[0]?.created_at || "",
    };
}

function groupProformasByClient(rows: ProformaRow[]): ClientGroup[] {
    const withCedula = new Map<string, ProformaRow[]>();
    const byName = new Map<string, ProformaRow[]>();

    for (const row of rows) {
        const cedula = normalizeCedula(row.client_id);
        if (cedula) {
            const list = withCedula.get(cedula) ?? [];
            list.push(row);
            withCedula.set(cedula, list);
            continue;
        }
        const name = normalizeClientName(row.client_name);
        const list = byName.get(name) ?? [];
        list.push(row);
        byName.set(name, list);
    }

    const groups: ClientGroup[] = [];
    const cedulasByName = new Map<string, string[]>();

    for (const [cedula, items] of withCedula) {
        groups.push(buildClientGroup(`id:${cedula}`, items));
        for (const name of new Set(
            items.map((item) => normalizeClientName(item.client_name)).filter(Boolean)
        )) {
            const list = cedulasByName.get(name) ?? [];
            list.push(cedula);
            cedulasByName.set(name, list);
        }
    }

    for (const [name, items] of byName) {
        const matchingCedulas = cedulasByName.get(name) ?? [];
        if (matchingCedulas.length === 1) {
            const targetIndex = groups.findIndex((group) => group.key === `id:${matchingCedulas[0]}`);
            if (targetIndex >= 0) {
                groups[targetIndex] = buildClientGroup(groups[targetIndex].key, [
                    ...groups[targetIndex].items,
                    ...items,
                ]);
                continue;
            }
        }
        groups.push(buildClientGroup(`name:${name || "sin-nombre"}`, items));
    }

    return groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export default function CreditProformasPage() {
    const { user, profile, isAdminLike } = useAuth();
    const supabase = useMemo(() => createClient(), []);
    const [proformas, setProformas] = useState<ProformaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sellerFilter, setSellerFilter] = useState<string>("all");
    const [pdfFilter, setPdfFilter] = useState<"all" | "with_pdf" | "without_pdf">("all");
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null);

    const canSeeAll = isAdminLike;

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

    const clientGroups = useMemo(() => groupProformasByClient(filtered), [filtered]);

    const selectedGroup = useMemo(
        () => clientGroups.find((group) => group.key === selectedClientKey) ?? null,
        [clientGroups, selectedClientKey]
    );

    useEffect(() => {
        if (selectedClientKey && !selectedGroup) {
            setSelectedClientKey(null);
        }
    }, [selectedClientKey, selectedGroup]);

    useEffect(() => {
        if (!selectedGroup) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSelectedClientKey(null);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [selectedGroup]);

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
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FileText className="h-5 w-5" />
                        </span>
                        Proformas
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {canSeeAll
                            ? "Historial de financiamiento archivado en el sistema"
                            : "Tus proformas de financiamiento archivadas"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchProformas()}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
                        title="Actualizar"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    {canSeeAll && withoutPdfTotal > 0 && (
                        <button
                            type="button"
                            onClick={() => void backfillMissingPdfs()}
                            disabled={isBackfilling}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
                        >
                            {isBackfilling ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            {isBackfilling ? "Generando…" : `Generar ${withoutPdfTotal} PDFs`}
                        </button>
                    )}
                    <Link
                        href="/finance"
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={
                                canSeeAll
                                    ? "Cliente, cédula, vehículo o asesor…"
                                    : "Cliente, cédula o vehículo…"
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                        />
                    </div>

                    <div className="inline-flex w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:w-auto">
                        {(
                            [
                                { id: "all" as const, label: "Todas", count: totalCount },
                                { id: "with_pdf" as const, label: "Con PDF", count: withPdfTotal },
                                { id: "without_pdf" as const, label: "Sin PDF", count: withoutPdfTotal },
                            ]
                        ).map((option) => {
                            const active = pdfFilter === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setPdfFilter(option.id)}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all lg:flex-none ${
                                        active
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {option.label}
                                    <span
                                        className={`tabular-nums ${
                                            active ? "text-blue-600" : "text-slate-400"
                                        }`}
                                    >
                                        {option.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {canSeeAll ? (
                        <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="h-10 w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/15 lg:w-52"
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
                    ) : null}
                </div>

                {(filterLabel || selectedSellerName) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-500">
                            {clientGroups.length} cliente{clientGroups.length === 1 ? "" : "s"}
                            {` · ${filtered.length} consulta${filtered.length === 1 ? "" : "s"}`}
                            {selectedSellerName ? ` · ${selectedSellerName}` : ""}
                            {filterLabel ? ` · ${filterLabel}` : ""}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setPdfFilter("all");
                                setSellerFilter("all");
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <span className="text-sm text-slate-500">Cargando proformas…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-medium text-slate-600">No hay proformas para mostrar</p>
                        <p className="mt-1 text-sm text-slate-400">
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
                                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                <BadgeDollarSign className="h-4 w-4" />
                                Ir al cotizador
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {clientGroups.map((group) => {
                            const vehicles = uniqueNonEmpty(group.items.map((item) => item.vehicle_description));
                            const advisors = uniqueNonEmpty(group.items.map((item) => item.profiles?.full_name));
                            const latest = group.items[0];
                            const vehicleLabel =
                                vehicles.length === 0
                                    ? "Vehículo no especificado"
                                    : vehicles.length === 1
                                      ? vehicles[0]
                                      : `${vehicles.length} vehículos consultados`;
                            const advisorLabel =
                                advisors.length === 0
                                    ? "Sin asesor"
                                    : advisors.length === 1
                                      ? advisors[0]
                                      : "Varios asesores";
                            const phone = group.phones[0] ?? null;

                            return (
                                <div
                                    key={group.key}
                                    onClick={() => setSelectedClientKey(group.key)}
                                    className={`grid cursor-pointer grid-cols-1 gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 lg:items-center lg:gap-5 ${
                                        canSeeAll
                                            ? "lg:grid-cols-[minmax(0,1fr)_6.75rem_9rem_7.5rem_4.5rem]"
                                            : "lg:grid-cols-[minmax(0,1fr)_6.75rem_7.5rem_4.5rem]"
                                    } ${selectedClientKey === group.key ? "bg-blue-50/70" : ""}`}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold tracking-wide text-slate-600">
                                            {initialsFromName(group.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-semibold capitalize text-slate-900">
                                                    {group.name}
                                                </h3>
                                                {group.clientIds[0] ? (
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                                                        {group.clientIds[0]}
                                                    </span>
                                                ) : null}
                                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                                    {group.items.length} consulta{group.items.length === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
                                                <Car className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                <span className="truncate">{vehicleLabel}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pl-[3.25rem] sm:grid-cols-3 lg:contents lg:pl-0">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Última</p>
                                            <p className="mt-0.5 inline-flex items-center gap-1 text-sm capitalize text-slate-600">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                {formatDate(group.latestAt)}
                                            </p>
                                        </div>
                                        {canSeeAll ? (
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Asesor</p>
                                                <p className="mt-0.5 truncate text-sm text-slate-600">{advisorLabel}</p>
                                            </div>
                                        ) : null}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Última cuota</p>
                                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                                                {formatMoney(latest?.monthly_payment)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-1 self-end lg:w-full lg:self-center">
                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center">
                                            {phone ? (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openWhatsApp(phone);
                                                    }}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                                                    title={phone}
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </button>
                                            ) : null}
                                        </span>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isLoading && filtered.length > 0 ? (
                    <div className="border-t border-slate-100 px-4 py-2.5 text-center text-[11px] text-slate-400">
                        {clientGroups.length} cliente{clientGroups.length === 1 ? "" : "s"}
                        {` · ${filtered.length} consulta${filtered.length === 1 ? "" : "s"}`}
                        {proformas.length >= 500 ? " · máx. 500 más recientes" : ""}
                    </div>
                ) : null}
            </div>

            {selectedGroup ? (
                <div className="fixed inset-0 z-[70] flex justify-end">
                    <button
                        type="button"
                        aria-label="Cerrar panel"
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
                        onClick={() => setSelectedClientKey(null)}
                    />
                    <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
                        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold tracking-wide text-blue-700">
                                {initialsFromName(selectedGroup.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate text-lg font-semibold capitalize text-slate-900">
                                    {selectedGroup.name}
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    {selectedGroup.clientIds.map((id) => (
                                        <span key={id} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                            {id}
                                        </span>
                                    ))}
                                    {selectedGroup.phones.map((phone) => (
                                        <span key={phone}>{phone}</span>
                                    ))}
                                    <span className="font-medium text-blue-700">
                                        {selectedGroup.items.length} consulta{selectedGroup.items.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedClientKey(null)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {selectedGroup.phones[0] ? (
                            <div className="border-b border-slate-100 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => openWhatsApp(selectedGroup.phones[0])}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    WhatsApp
                                </button>
                            </div>
                        ) : null}

                        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                            {selectedGroup.items.map((item) => {
                                const sellerName = item.profiles?.full_name || "Sin asesor";
                                return (
                                    <article
                                        key={item.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 text-xs font-medium capitalize text-slate-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(item.created_at)}
                                                </p>
                                                <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-slate-900">
                                                    <Car className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                                    <span>{item.vehicle_description || "Vehículo no especificado"}</span>
                                                </p>
                                            </div>
                                            {item.pdf_url ? (
                                                <a
                                                    href={item.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    Ver PDF
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            ) : (
                                                <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                                    Sin PDF
                                                </span>
                                            )}
                                        </div>

                                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Precio</dt>
                                                <dd className="mt-0.5 tabular-nums text-slate-700">{formatMoney(item.vehicle_price)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Entrada</dt>
                                                <dd className="mt-0.5 tabular-nums text-slate-700">{formatMoney(item.down_payment_amount)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plazo</dt>
                                                <dd className="mt-0.5 text-slate-700">{item.term_months ?? "—"} meses</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cuota</dt>
                                                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{formatMoney(item.monthly_payment)}</dd>
                                            </div>
                                            {canSeeAll ? (
                                                <div className="col-span-2">
                                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Asesor</dt>
                                                    <dd className="mt-0.5 text-slate-700">{sellerName}</dd>
                                                </div>
                                            ) : null}
                                        </dl>
                                    </article>
                                );
                            })}
                        </div>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}
