"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, User } from "lucide-react";

function sellerInitials(name: string | null | undefined): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function InventorySellerPicker({
    sellers,
    value,
    onChange,
    placeholder = "Seleccionar vendedor…",
}: {
    sellers: { id: string; full_name: string | null }[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = sellers.find((s) => s.id === value);
    const selectedName = selected?.full_name?.trim() || null;

    useEffect(() => {
        if (!open) return;
        const handleOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full min-h-10 px-3 py-2 flex items-center gap-2.5 text-left transition-all outline-none ${
                    open ? "bg-violet-50/60" : "bg-white hover:bg-slate-50/80"
                }`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {selectedName ? (
                    <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200/60">
                            {sellerInitials(selectedName)}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 truncate">
                                {selectedName}
                            </span>
                            <span className="block text-[10px] text-violet-600">Vendedor seleccionado</span>
                        </span>
                    </>
                ) : (
                    <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                            <User className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-xs text-slate-400">{placeholder}</span>
                    </>
                )}
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        open ? "rotate-180 text-violet-500" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute z-30 left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 py-1.5 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                >
                    {sellers.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400 italic">No hay vendedores activos</p>
                    ) : (
                        sellers.map((seller) => {
                            const name = seller.full_name?.trim() || "Sin nombre";
                            const isSelected = seller.id === value;
                            return (
                                <button
                                    key={seller.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(seller.id);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                            ? "bg-violet-50 text-violet-900"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                            isSelected
                                                ? "bg-violet-200 text-violet-800"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {sellerInitials(name === "Sin nombre" ? null : name)}
                                    </span>
                                    <span className="flex-1 text-xs font-medium truncate">{name}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
