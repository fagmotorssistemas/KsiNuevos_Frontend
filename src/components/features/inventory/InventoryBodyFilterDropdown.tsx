'use client'

import { useEffect, useRef, useState } from 'react'
import { Car, CarFront, Check, ChevronDown, MoreHorizontal, Truck } from 'lucide-react'
import {
    INVENTORY_BODY_FILTER_OPTIONS,
    type InventoryBodyCategoryFilter,
} from '@/lib/inventario/inventoryBodyCategory'

const ICONS: Record<InventoryBodyCategoryFilter, typeof Car> = {
    all: Car,
    suv: CarFront,
    camioneta: Truck,
    sedan: Car,
    otros: MoreHorizontal,
}

type Props = {
    value: InventoryBodyCategoryFilter
    onChange: (value: InventoryBodyCategoryFilter) => void
}

export function InventoryBodyFilterDropdown({ value, onChange }: Props) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const selected =
        INVENTORY_BODY_FILTER_OPTIONS.find((option) => option.value === value) ??
        INVENTORY_BODY_FILTER_OPTIONS[0]
    const SelectedIcon = ICONS[selected.value]
    const isActive = value !== 'all'

    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div ref={rootRef} className="relative min-w-[210px]">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((current) => !current)}
                className={`flex h-10 w-full items-center gap-2 rounded-lg border pl-3 pr-2 text-left text-sm font-medium shadow-sm transition-all ${
                    isActive || open
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
            >
                <SelectedIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{selected.label}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open ? (
                <div
                    role="listbox"
                    className="absolute right-0 top-[calc(100%+0.4rem)] z-[90] w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                    {INVENTORY_BODY_FILTER_OPTIONS.map((option) => {
                        const active = option.value === value
                        const Icon = ICONS[option.value]
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                                    active
                                        ? 'bg-indigo-50'
                                        : 'hover:bg-slate-50'
                                }`}
                            >
                                <Icon
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`}
                                />
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={`block text-sm ${
                                            active ? 'font-semibold text-indigo-950' : 'font-medium text-slate-700'
                                        }`}
                                    >
                                        {option.label}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                                        {option.hint}
                                    </span>
                                </span>
                                {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" /> : null}
                            </button>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
