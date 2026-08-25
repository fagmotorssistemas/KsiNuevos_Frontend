"use client";

import { useMemo, useState } from "react";
import {
    Tag,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    Users,
    Award,
    Layers,
} from "lucide-react";
import type { VentaVehiculo } from "@/types/ventas.types";
import {
    MONTH_COUNT_OPTIONS,
    buildSalesComparison,
    type BreakdownRow,
    type CompareMonth,
    type MonthCount,
    type MonthTotals,
} from "@/lib/ventas/sales-comparison";

type BreakdownTab = "agent" | "brand" | "type";

function cleanMonthLabel(label: string) {
    return label.replace(/\.$/, "");
}

function DeltaBadge({ abs, pct }: { abs: number | null; pct: number | null }) {
    if (abs == null) {
        return <span className="text-xs text-slate-400">—</span>;
    }

    if (abs === 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                <Minus className="h-3 w-3" />
                Sin cambio
            </span>
        );
    }

    const up = abs > 0;
    const units = Math.abs(abs);
    let text: string;

    if (pct == null) {
        text = `Empezó (+${units})`;
    } else if (pct <= -100) {
        text = `Cayó a 0 (−${units})`;
    } else {
        text = `${up ? "Subió" : "Bajó"} ${units}`;
    }

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
        >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {text}
        </span>
    );
}

function MonthCard({
    item,
    maxUnits,
    cutoffDay,
    compact,
}: {
    item: MonthTotals;
    maxUnits: number;
    cutoffDay: number;
    compact?: boolean;
}) {
    const width = maxUnits > 0 ? Math.max(8, (item.units / maxUnits) * 100) : 8;
    const monthName = cleanMonthLabel(item.month.shortLabel);

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border shadow-sm ${
                compact ? "p-4" : "p-5"
            } ${
                item.month.isCurrent
                    ? "border-red-200 bg-gradient-to-br from-red-50 via-white to-white"
                    : "border-slate-200 bg-white"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {item.month.label}
                    </p>
                    {item.month.isCurrent ? (
                        <span className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            En curso
                        </span>
                    ) : (
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Completo
                        </span>
                    )}
                </div>
                <DeltaBadge abs={item.deltaAbs} pct={item.deltaPct} />
            </div>

            <p className={`mt-3 font-black tracking-tight text-slate-900 ${compact ? "text-3xl" : "text-4xl"}`}>
                {item.units}
            </p>
            {compact ? null : item.month.isCurrent ? (
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    Entregas de {monthName} hasta hoy (día {cutoffDay}).
                </p>
            ) : (
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    Todas las entregas de {monthName}.
                </p>
            )}

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full ${item.month.isCurrent ? "bg-red-500" : "bg-slate-800"}`}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

function BreakdownTable({
    rows,
    months,
    emptyLabel,
}: {
    rows: BreakdownRow[];
    months: CompareMonth[];
    emptyLabel: string;
}) {
    if (rows.length === 0) {
        return <p className="px-1 py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-3">Nombre</th>
                        {months.map((month) => (
                            <th key={month.key} className="px-3 py-3 text-right capitalize">
                                {month.shortLabel}
                                {month.isCurrent ? (
                                    <span className="ml-1 font-medium normal-case text-red-500">*</span>
                                ) : null}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.slice(0, 12).map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50/80">
                            <td className="px-3 py-3 font-medium capitalize text-slate-800">{row.label}</td>
                            {row.values.map((value, index) => (
                                <td
                                    key={`${row.key}-${index}`}
                                    className={`px-3 py-3 text-right tabular-nums ${
                                        months[index]?.isCurrent ? "font-bold text-slate-900" : "text-slate-600"
                                    }`}
                                >
                                    {value}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface SalesComparisonViewProps {
    ventas: VentaVehiculo[];
    loading: boolean;
    brands: string[];
}

export function SalesComparisonView({ ventas, loading, brands }: SalesComparisonViewProps) {
    const [monthCount, setMonthCount] = useState<MonthCount>(3);
    const [brand, setBrand] = useState("all");
    const [tab, setTab] = useState<BreakdownTab>("brand");

    const comparison = useMemo(
        () =>
            buildSalesComparison(ventas, monthCount, {
                brand,
                salesperson: "all",
            }),
        [ventas, monthCount, brand]
    );

    const hasCurrentMonth = comparison.totals.some((item) => item.month.isCurrent);
    const compactCards = monthCount >= 6;

    const maxUnits = Math.max(1, ...comparison.totals.map((item) => item.units));
    const tableRows =
        tab === "agent" ? comparison.byAgent : tab === "brand" ? comparison.byBrand : comparison.byType;

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            Meses a comparar
                        </p>
                        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                            {MONTH_COUNT_OPTIONS.map((count) => {
                                const active = monthCount === count;
                                return (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => setMonthCount(count)}
                                        className={`min-w-[2.25rem] rounded-lg px-2.5 py-2 text-sm font-semibold transition-all ${
                                            active
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        {count}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="min-w-[220px]">
                        <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            <Tag className="h-3.5 w-3.5" />
                            Marca
                        </label>
                        <select
                            value={brand}
                            onChange={(event) => setBrand(event.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                        >
                            <option value="all">Todas las marcas</option>
                            {brands.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Comparas los últimos <strong>{monthCount} meses</strong>. Los cerrados salen completos;
                    {hasCurrentMonth
                        ? ` el mes en curso cuenta hasta hoy (día ${comparison.cutoffDay}).`
                        : null}
                </p>
            </div>

            <div
                className={`grid grid-cols-2 gap-3 ${
                    monthCount <= 3
                        ? "md:grid-cols-3"
                        : monthCount === 4
                          ? "md:grid-cols-2 lg:grid-cols-4"
                          : "md:grid-cols-3 lg:grid-cols-4"
                }`}
            >
                {comparison.totals.map((item) => (
                    <MonthCard
                        key={item.month.key}
                        item={item}
                        maxUnits={maxUnits}
                        cutoffDay={comparison.cutoffDay}
                        compact={compactCards}
                    />
                ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800">Entregas por mes</h3>
                </div>
                <div className="flex items-end gap-3 sm:gap-5">
                    {comparison.totals.map((item) => {
                        const height = maxUnits > 0 ? Math.max(12, (item.units / maxUnits) * 140) : 12;
                        return (
                            <div key={item.month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">{item.units}</span>
                                <div
                                    className={`w-full max-w-[72px] rounded-t-xl ${
                                        item.month.isCurrent ? "bg-red-500" : "bg-slate-800"
                                    }`}
                                    style={{ height }}
                                />
                                <span className="text-[11px] font-semibold capitalize text-slate-500">
                                    {item.month.shortLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-bold text-slate-800">¿Quién y qué se movió?</h3>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {(
                            [
                                { id: "brand", label: "Marcas", icon: Award },
                                { id: "agent", label: "Vendedores", icon: Users },
                                { id: "type", label: "Tipo", icon: Layers },
                            ] as const
                        ).map((option) => {
                            const active = tab === option.id;
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTab(option.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        active
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <BreakdownTable
                    rows={tableRows}
                    months={comparison.months}
                    emptyLabel="No hay entregas en este recorte."
                />
                <p className="mt-3 text-[11px] text-slate-400">
                    * El mes en curso va hasta el día {comparison.cutoffDay}. Los meses anteriores son completos.
                </p>
            </div>
        </div>
    );
}
