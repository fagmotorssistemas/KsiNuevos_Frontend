"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { getMonthOptions } from "@/hooks/accounting/useMarcaciones";

interface MarcacionMonthPickerProps {
    value: string;
    onChange: (yearMonth: string) => void;
}

export function MarcacionMonthPicker({ value, onChange }: MarcacionMonthPickerProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const options = getMonthOptions();
    const selected = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative min-w-0 flex-1">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{selected?.label ?? "Elegir mes"}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {options.map((option) => {
                        const isActive = option.value === value;
                        return (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                        isActive
                                            ? "bg-slate-100 font-semibold text-slate-900"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    {option.label}
                                    {isActive && <Check className="h-4 w-4 text-slate-700" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
